from flask import Blueprint, request, jsonify, session, current_app
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

spotify_bp = Blueprint('spotify', __name__)

def get_spotify_client():
    """Get authenticated Spotify client"""
    token_info = session.get('spotify_token')
    if not token_info:
        return None

    # Check if token needs refresh
    sp_oauth = SpotifyOAuth(
        client_id=current_app.config['SPOTIFY_CLIENT_ID'],
        client_secret=current_app.config['SPOTIFY_CLIENT_SECRET'],
        redirect_uri=current_app.config['SPOTIFY_REDIRECT_URI'],
        scope="user-read-currently-playing user-read-playback-state"
    )

    if sp_oauth.is_token_expired(token_info):
        token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
        session['spotify_token'] = token_info

    return spotipy.Spotify(auth=token_info['access_token'])

@spotify_bp.route('/current-track')
def get_current_track():
    """Get currently playing track"""
    try:
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
                'success': True,
                'playing': False,
                'message': 'No track currently playing'
            })

        track = current_track['item']
        artists = [artist['name'] for artist in track['artists']]

        return jsonify({
            'success': True,
            'playing': True,
            'track': {
                'id': track['id'],
                'name': track['name'],
                'artists': artists,
                'album': track['album']['name'],
                'duration_ms': track['duration_ms'],
                'progress_ms': current_track.get('progress_ms', 0),
                'is_playing': current_track.get('is_playing', False),
                'external_urls': track.get('external_urls', {}),
                'preview_url': track.get('preview_url'),
                'popularity': track.get('popularity', 0)
            }
        })

    except spotipy.exceptions.SpotifyException as e:
        return jsonify({
            'success': False,
            'error': f'Spotify API error: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@spotify_bp.route('/playback-state')
def get_playback_state():
    """Get current playback state"""
    try:
        sp = get_spotify_client()
        if not sp:
            return jsonify({
                'success': False,
                'error': 'Not authenticated with Spotify'
            }), 401

        playback = sp.current_playback()

        if not playback:
            return jsonify({
                'success': True,
                'active': False,
                'message': 'No active playback'
            })

        return jsonify({
            'success': True,
            'active': True,
            'device': {
                'id': playback['device']['id'],
                'name': playback['device']['name'],
                'type': playback['device']['type'],
                'volume_percent': playback['device']['volume_percent']
            },
            'repeat_state': playback['repeat_state'],
            'shuffle_state': playback['shuffle_state'],
            'is_playing': playback['is_playing'],
            'progress_ms': playback.get('progress_ms', 0)
        })

    except spotipy.exceptions.SpotifyException as e:
        return jsonify({
            'success': False,
            'error': f'Spotify API error: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@spotify_bp.route('/user-profile')
def get_user_profile():
    """Get current user's profile"""
    try:
        sp = get_spotify_client()
        if not sp:
            return jsonify({
                'success': False,
                'error': 'Not authenticated with Spotify'
            }), 401

        user = sp.current_user()

        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'display_name': user.get('display_name'),
                'email': user.get('email'),
                'country': user.get('country'),
                'followers': user.get('followers', {}).get('total', 0),
                'images': user.get('images', []),
                'product': user.get('product')
            }
        })

    except spotipy.exceptions.SpotifyException as e:
        return jsonify({
            'success': False,
            'error': f'Spotify API error: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@spotify_bp.route('/search')
def search_tracks():
    """Search for tracks on Spotify"""
    try:
        query = request.args.get('q')
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query parameter required'
            }), 400

        limit = min(int(request.args.get('limit', 10)), 50)
        track_type = request.args.get('type', 'track')

        sp = get_spotify_client()
        if not sp:
            return jsonify({
                'success': False,
                'error': 'Not authenticated with Spotify'
            }), 401

        results = sp.search(q=query, limit=limit, type=track_type)

        tracks = []
        for track in results['tracks']['items']:
            artists = [artist['name'] for artist in track['artists']]
            tracks.append({
                'id': track['id'],
                'name': track['name'],
                'artists': artists,
                'album': track['album']['name'],
                'duration_ms': track['duration_ms'],
                'popularity': track.get('popularity', 0),
                'preview_url': track.get('preview_url'),
                'external_urls': track.get('external_urls', {})
            })

        return jsonify({
            'success': True,
            'tracks': tracks,
            'total': results['tracks']['total']
        })

    except spotipy.exceptions.SpotifyException as e:
        return jsonify({
            'success': False,
            'error': f'Spotify API error: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500