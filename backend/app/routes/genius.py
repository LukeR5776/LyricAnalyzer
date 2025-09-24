from flask import Blueprint, request, jsonify
from ..services.genius_client import get_genius_client
import logging

logger = logging.getLogger(__name__)
genius_bp = Blueprint('genius', __name__)

@genius_bp.route('/search')
def search_songs():
    """Search for songs on Genius"""
    try:
        query = request.args.get('q')
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query parameter required'
            }), 400

        limit = min(int(request.args.get('limit', 10)), 50)

        genius_client = get_genius_client()
        if not genius_client:
            return jsonify({
                'success': False,
                'error': 'Genius client not configured'
            }), 500

        songs = genius_client.search_songs(query, limit)

        return jsonify({
            'success': True,
            'songs': songs,
            'count': len(songs)
        })

    except Exception as e:
        logger.error(f"Error in search_songs: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@genius_bp.route('/song/<int:song_id>')
def get_song_details(song_id):
    """Get detailed information about a song"""
    try:
        genius_client = get_genius_client()
        if not genius_client:
            return jsonify({
                'success': False,
                'error': 'Genius client not configured'
            }), 500

        song = genius_client.get_song_details(song_id)

        if not song:
            return jsonify({
                'success': False,
                'error': 'Song not found'
            }), 404

        return jsonify({
            'success': True,
            'song': song
        })

    except Exception as e:
        logger.error(f"Error in get_song_details: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@genius_bp.route('/song/<int:song_id>/annotations')
def get_song_annotations(song_id):
    """Get annotations for a song"""
    try:
        genius_client = get_genius_client()
        if not genius_client:
            return jsonify({
                'success': False,
                'error': 'Genius client not configured'
            }), 500

        annotations = genius_client.get_song_annotations(song_id)

        return jsonify({
            'success': True,
            'annotations': annotations,
            'count': len(annotations)
        })

    except Exception as e:
        logger.error(f"Error in get_song_annotations: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@genius_bp.route('/lyrics')
def get_lyrics():
    """Get lyrics for a song"""
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

        lyrics = genius_client.get_lyrics_with_lyricsgenius(artist, title)

        if not lyrics:
            return jsonify({
                'success': False,
                'error': 'Lyrics not found'
            }), 404

        return jsonify({
            'success': True,
            'lyrics': lyrics,
            'artist': artist,
            'title': title
        })

    except Exception as e:
        logger.error(f"Error in get_lyrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@genius_bp.route('/match-spotify')
def match_spotify_track():
    """Find best Genius match for a Spotify track"""
    try:
        # Expect Spotify track data in the request
        track_name = request.args.get('track_name')
        artist_name = request.args.get('artist_name')
        album_name = request.args.get('album_name')

        if not track_name or not artist_name:
            return jsonify({
                'success': False,
                'error': 'track_name and artist_name parameters required'
            }), 400

        # Create Spotify track object
        spotify_track = {
            'name': track_name,
            'artists': [artist_name],
            'album': {'name': album_name} if album_name else None
        }

        genius_client = get_genius_client()
        if not genius_client:
            return jsonify({
                'success': False,
                'error': 'Genius client not configured'
            }), 500

        match = genius_client.find_best_match(spotify_track)

        if not match:
            return jsonify({
                'success': False,
                'error': 'No suitable match found on Genius'
            }), 404

        return jsonify({
            'success': True,
            'match': match,
            'spotify_track': {
                'name': track_name,
                'artist': artist_name,
                'album': album_name
            }
        })

    except Exception as e:
        logger.error(f"Error in match_spotify_track: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500