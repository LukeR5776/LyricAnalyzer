from flask import Blueprint, request, jsonify, session
from ..services.genius_client import get_genius_client
from .spotify import get_spotify_client
import logging
import time
import re

logger = logging.getLogger(__name__)
lyrics_bp = Blueprint('lyrics', __name__)

def _extract_lyrics_from_annotations(annotations):
    """Extract lyrics from annotation fragments as a fallback when full lyrics aren't available"""
    if not annotations:
        return None

    # Collect all unique fragments
    fragments = []
    seen = set()

    for annotation in annotations:
        fragment = annotation.get('fragment', '').strip()
        if fragment and fragment not in seen:
            fragments.append(fragment)
            seen.add(fragment)

    if not fragments:
        return None

    # Join fragments with newlines
    return '\n'.join(fragments)

def _calculate_line_numbers(annotations, lyrics):
    """Calculate which line number each annotation corresponds to in the lyrics"""
    if not lyrics or not annotations:
        return annotations

    # Split lyrics into lines for line-by-line matching
    lyrics_lines = [line.strip() for line in lyrics.split('\n') if line.strip()]
    lyrics_lines_lower = [line.lower() for line in lyrics_lines]

    logger.info(f"Calculating line numbers for {len(annotations)} annotations against {len(lyrics_lines)} lyric lines")

    for annotation in annotations:
        line_number = -1

        # Get the annotation text to match (prefer range.content over fragment)
        annotation_text = None
        if 'range' in annotation and annotation['range'] and 'content' in annotation['range']:
            annotation_text = annotation['range']['content'].strip()
        elif annotation.get('fragment'):
            annotation_text = annotation['fragment'].strip()

        if not annotation_text:
            annotation['lyrics_line_number'] = -1
            annotation['line_match_method'] = 'no_text'
            continue

        # Normalize for matching
        annotation_text_lower = annotation_text.lower().strip()

        # Strategy 1: Find exact line match
        for i, line in enumerate(lyrics_lines_lower):
            if line == annotation_text_lower:
                line_number = i + 1  # 1-based line numbers
                break

        # Strategy 2: Find line that contains the annotation text
        if line_number == -1:
            for i, line in enumerate(lyrics_lines_lower):
                if annotation_text_lower in line and len(annotation_text_lower) > 5:
                    line_number = i + 1
                    break

        # Strategy 3: Find line where annotation text contains the line (for longer annotations)
        if line_number == -1:
            for i, line in enumerate(lyrics_lines_lower):
                if line in annotation_text_lower and len(line) > 5:
                    line_number = i + 1
                    break

        annotation['lyrics_line_number'] = line_number
        annotation['line_match_method'] = 'matched' if line_number != -1 else 'failed'

        if line_number != -1:
            logger.debug(f"Matched annotation to line {line_number}: '{annotation_text[:50]}...'")

    return annotations

@lyrics_bp.route('/current')
def get_current_lyrics():
    """Get lyrics and annotations for currently playing Spotify track"""
    try:
        # Get Spotify client
        sp = get_spotify_client()
        if not sp:
            return jsonify({
                'success': False,
                'error': 'Not authenticated with Spotify'
            }), 401

        # Get currently playing track
        current_track = sp.current_user_playing_track()
        if not current_track or not current_track.get('item'):
            return jsonify({
                'success': False,
                'error': 'No track currently playing'
            }), 404

        track = current_track['item']
        artists = [artist['name'] for artist in track['artists']]

        # Get Genius client
        genius_client = get_genius_client()
        if not genius_client:
            return jsonify({
                'success': False,
                'error': 'Genius client not configured'
            }), 500

        # Find matching song on Genius
        spotify_track_data = {
            'name': track['name'],
            'artists': artists,
            'album': {'name': track['album']['name']}
        }

        genius_match = genius_client.find_best_match(spotify_track_data)
        if not genius_match:
            return jsonify({
                'success': False,
                'error': 'No matching song found on Genius',
                'spotify_track': {
                    'name': track['name'],
                    'artists': artists,
                    'album': track['album']['name']
                }
            }), 404

        # Get detailed song information, lyrics and annotations
        song_details = genius_client.get_song_details(genius_match['id'])

        # Get lyrics using LyricsGenius scraping - pass the matched song URL for reliability
        lyrics = genius_client.get_lyrics_with_lyricsgenius(
            artists[0],
            track['name'],
            song_url=genius_match.get('url')
        )
        annotations = genius_client.get_song_annotations(genius_match['id'])

        # Fallback: if lyrics failed but we have annotations, extract from fragments
        if not lyrics and annotations:
            logger.info("Full lyrics not available, extracting from annotation fragments")
            lyrics = _extract_lyrics_from_annotations(annotations)
            if lyrics:
                logger.info(f"Extracted {len(lyrics)} characters from {len(annotations)} annotations")

        # Calculate line numbers for annotations
        if lyrics and annotations:
            annotations = _calculate_line_numbers(annotations, lyrics)

        return jsonify({
            'success': True,
            'spotify_track': {
                'id': track['id'],
                'name': track['name'],
                'artists': artists,
                'album': track['album']['name'],
                'progress_ms': current_track.get('progress_ms', 0),
                'duration_ms': track['duration_ms'],
                'is_playing': current_track.get('is_playing', False)
            },
            'genius_match': genius_match,
            'song_details': song_details,
            'lyrics': lyrics if lyrics else "Lyrics not available",
            'annotations': annotations,
            'annotation_count': len(annotations)
        })

    except Exception as e:
        logger.error(f"Error in get_current_lyrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lyrics_bp.route('/search')
def search_and_get_lyrics():
    """Search for a specific song and get its lyrics and annotations"""
    try:
        artist = request.args.get('artist')
        title = request.args.get('title')

        if not artist or not title:
            return jsonify({
                'success': False,
                'error': 'Both artist and title parameters required'
            }), 400

        genius_client = get_genius_client()
        if not genius_client:
            return jsonify({
                'success': False,
                'error': 'Genius client not configured'
            }), 500

        # Search for the song
        spotify_track_data = {
            'name': title,
            'artists': [artist]
        }

        genius_match = genius_client.find_best_match(spotify_track_data)
        if not genius_match:
            return jsonify({
                'success': False,
                'error': 'No matching song found on Genius'
            }), 404

        # Get detailed song information, lyrics and annotations
        song_details = genius_client.get_song_details(genius_match['id'])

        # Get lyrics using LyricsGenius scraping - pass the matched song URL for reliability
        lyrics = genius_client.get_lyrics_with_lyricsgenius(
            artist,
            title,
            song_url=genius_match.get('url')
        )
        annotations = genius_client.get_song_annotations(genius_match['id'])

        # Fallback: if lyrics failed but we have annotations, extract from fragments
        if not lyrics and annotations:
            logger.info("Full lyrics not available, extracting from annotation fragments")
            lyrics = _extract_lyrics_from_annotations(annotations)
            if lyrics:
                logger.info(f"Extracted {len(lyrics)} characters from {len(annotations)} annotations")

        # Calculate line numbers for annotations
        if lyrics and annotations:
            annotations = _calculate_line_numbers(annotations, lyrics)

        return jsonify({
            'success': True,
            'search_query': {
                'artist': artist,
                'title': title
            },
            'genius_match': genius_match,
            'song_details': song_details,
            'lyrics': lyrics if lyrics else "Lyrics not available",
            'annotations': annotations,
            'annotation_count': len(annotations)
        })

    except Exception as e:
        logger.error(f"Error in search_and_get_lyrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lyrics_bp.route('/by-id/<int:genius_song_id>')
def get_lyrics_by_genius_id(genius_song_id):
    """Get lyrics and annotations for a specific Genius song ID"""
    try:
        genius_client = get_genius_client()
        if not genius_client:
            return jsonify({
                'success': False,
                'error': 'Genius client not configured'
            }), 500

        # Get song details
        song_details = genius_client.get_song_details(genius_song_id)
        if not song_details:
            return jsonify({
                'success': False,
                'error': 'Song not found'
            }), 404

        # Get lyrics using LyricsGenius scraping - pass the song URL for reliability
        lyrics = genius_client.get_lyrics_with_lyricsgenius(
            song_details['artist'],
            song_details['title'],
            song_url=song_details.get('url')
        )

        # Get annotations
        annotations = genius_client.get_song_annotations(genius_song_id)

        # Fallback: if lyrics failed but we have annotations, extract from fragments
        if not lyrics and annotations:
            logger.info("Full lyrics not available, extracting from annotation fragments")
            lyrics = _extract_lyrics_from_annotations(annotations)
            if lyrics:
                logger.info(f"Extracted {len(lyrics)} characters from {len(annotations)} annotations")

        # Calculate line numbers for annotations
        if lyrics and annotations:
            annotations = _calculate_line_numbers(annotations, lyrics)

        return jsonify({
            'success': True,
            'song': song_details,
            'lyrics': lyrics if lyrics else "Lyrics not available",
            'annotations': annotations,
            'annotation_count': len(annotations)
        })

    except Exception as e:
        logger.error(f"Error in get_lyrics_by_genius_id: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lyrics_bp.route('/sync')
def sync_current_track():
    """Get synchronized lyrics with playback position for current track"""
    try:
        # Get current track lyrics and annotations
        current_lyrics_response = get_current_lyrics()

        if current_lyrics_response.status_code != 200:
            return current_lyrics_response

        data = current_lyrics_response.get_json()

        if not data.get('success'):
            return current_lyrics_response

        # Add playback synchronization info
        spotify_track = data['spotify_track']
        progress_ms = spotify_track.get('progress_ms', 0)
        duration_ms = spotify_track.get('duration_ms', 0)

        # Calculate progress percentage
        progress_percent = (progress_ms / duration_ms * 100) if duration_ms > 0 else 0

        # Add sync info to response
        data['sync_info'] = {
            'progress_ms': progress_ms,
            'duration_ms': duration_ms,
            'progress_percent': round(progress_percent, 2),
            'is_playing': spotify_track.get('is_playing', False),
            'timestamp': int(time.time() * 1000)  # Current timestamp in ms
        }

        return jsonify(data)

    except Exception as e:
        logger.error(f"Error in sync_current_track: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lyrics_bp.route('/debug-lyrics')
def debug_lyrics():
    """Debug endpoint to test lyrics retrieval specifically"""
    try:
        artist = request.args.get('artist')
        title = request.args.get('title')

        if not artist or not title:
            return jsonify({
                'success': False,
                'error': 'Both artist and title parameters required'
            }), 400

        genius_client = get_genius_client()
        if not genius_client:
            return jsonify({
                'success': False,
                'error': 'Genius client not configured'
            }), 500

        # Set debug logging temporarily
        genius_logger = logging.getLogger('app.services.genius_client')
        original_level = genius_logger.level
        genius_logger.setLevel(logging.DEBUG)

        try:
            # Test lyrics retrieval directly
            lyrics_result = genius_client.get_lyrics_with_lyricsgenius(artist, title)

            return jsonify({
                'success': True,
                'input': {
                    'artist': artist,
                    'title': title
                },
                'lyrics_result': lyrics_result,
                'lyrics_length': len(lyrics_result) if lyrics_result else 0,
                'has_lyrics': bool(lyrics_result),
                'debug_info': f"Lyrics retrieval {'successful' if lyrics_result else 'failed'}"
            })

        finally:
            # Restore original logging level
            genius_logger.setLevel(original_level)

    except Exception as e:
        logger.error(f"Error in debug_lyrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@lyrics_bp.route('/debug')
def debug_matching():
    """Debug endpoint to test song matching with detailed logs"""
    try:
        artist = request.args.get('artist')
        title = request.args.get('title')

        if not artist or not title:
            return jsonify({
                'success': False,
                'error': 'Both artist and title parameters required'
            }), 400

        genius_client = get_genius_client()
        if not genius_client:
            return jsonify({
                'success': False,
                'error': 'Genius client not configured'
            }), 500

        # Set debug logging temporarily
        genius_logger = logging.getLogger('app.services.genius_client')
        original_level = genius_logger.level
        genius_logger.setLevel(logging.DEBUG)

        try:
            # Create test spotify track data
            spotify_track_data = {
                'name': title,
                'artists': [artist]
            }

            # Test the matching
            genius_match = genius_client.find_best_match(spotify_track_data)

            # Also get raw search results for the first query
            raw_results = genius_client.search_songs(f"{artist} {title}", limit=10)

            return jsonify({
                'success': True,
                'input': {
                    'artist': artist,
                    'title': title
                },
                'genius_match': genius_match,
                'raw_search_results': raw_results[:5],  # Limit to first 5 for readability
                'normalized_artist': genius_client._normalize_artist_name(artist),
                'cleaned_title': genius_client._clean_song_title(title)
            })

        finally:
            # Restore original logging level
            genius_logger.setLevel(original_level)

    except Exception as e:
        logger.error(f"Error in debug_matching: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500