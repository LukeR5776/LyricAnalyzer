from flask import Blueprint, request, jsonify, session
from ..services.genius_client import get_genius_client
from .spotify import get_spotify_client
import logging
import time

logger = logging.getLogger(__name__)
lyrics_bp = Blueprint('lyrics', __name__)

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

        # Get lyrics and annotations
        lyrics = genius_client.get_lyrics_with_lyricsgenius(artists[0], track['name'])
        annotations = genius_client.get_song_annotations(genius_match['id'])

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

        # Get lyrics and annotations
        lyrics = genius_client.get_lyrics_with_lyricsgenius(artist, title)
        annotations = genius_client.get_song_annotations(genius_match['id'])

        return jsonify({
            'success': True,
            'search_query': {
                'artist': artist,
                'title': title
            },
            'genius_match': genius_match,
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

        # Get lyrics
        lyrics = genius_client.get_lyrics_with_lyricsgenius(
            song_details['artist'],
            song_details['title']
        )

        # Get annotations
        annotations = genius_client.get_song_annotations(genius_song_id)

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