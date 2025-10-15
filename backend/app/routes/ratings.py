from flask import Blueprint, request, jsonify, session
from ..services.ratings_storage import get_ratings_storage
import logging

logger = logging.getLogger(__name__)
ratings_bp = Blueprint('ratings', __name__)

def _get_user_id():
    """Get user ID from session (using Spotify user ID if available)"""
    # For now, use a simple session-based user ID
    # In production, this should use actual user authentication
    if 'user_id' not in session:
        session['user_id'] = session.get('spotify_user_id', 'anonymous')
    return session['user_id']

@ratings_bp.route('/rate', methods=['POST'])
def rate_song():
    """Rate a song"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        rating = data.get('rating')
        song_data = data.get('song')

        if rating is None:
            return jsonify({
                'success': False,
                'error': 'Rating value required'
            }), 400

        if not song_data:
            return jsonify({
                'success': False,
                'error': 'Song data required'
            }), 400

        # Validate rating range
        try:
            rating = float(rating)
            if not 0.0 <= rating <= 10.0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'error': 'Rating must be a number between 0.0 and 10.0'
            }), 400

        user_id = _get_user_id()
        storage = get_ratings_storage()

        rating_entry = storage.add_rating(user_id, song_data, rating)

        return jsonify({
            'success': True,
            'rating': rating_entry
        })

    except Exception as e:
        logger.error(f"Error rating song: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ratings_bp.route('/my-ratings', methods=['GET'])
def get_my_ratings():
    """Get all ratings for the current user"""
    try:
        user_id = _get_user_id()
        sort_by = request.args.get('sort', 'title')

        # Validate sort parameter
        valid_sorts = ['title', 'artist', 'rating', 'date']
        if sort_by not in valid_sorts:
            sort_by = 'title'

        storage = get_ratings_storage()
        ratings = storage.get_all_ratings(user_id, sort_by)
        stats = storage.get_stats(user_id)

        return jsonify({
            'success': True,
            'ratings': ratings,
            'stats': stats,
            'sort_by': sort_by
        })

    except Exception as e:
        logger.error(f"Error getting ratings: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ratings_bp.route('/rating/<song_id>', methods=['GET'])
def get_song_rating(song_id):
    """Get rating for a specific song"""
    try:
        user_id = _get_user_id()
        storage = get_ratings_storage()

        rating = storage.get_rating(user_id, song_id)

        if rating:
            return jsonify({
                'success': True,
                'rating': rating
            })
        else:
            return jsonify({
                'success': False,
                'error': 'No rating found for this song'
            }), 404

    except Exception as e:
        logger.error(f"Error getting song rating: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ratings_bp.route('/rating/<song_id>', methods=['DELETE'])
def delete_song_rating(song_id):
    """Delete a rating for a specific song"""
    try:
        user_id = _get_user_id()
        storage = get_ratings_storage()

        success = storage.delete_rating(user_id, song_id)

        if success:
            return jsonify({
                'success': True,
                'message': 'Rating deleted'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'No rating found for this song'
            }), 404

    except Exception as e:
        logger.error(f"Error deleting rating: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ratings_bp.route('/stats', methods=['GET'])
def get_rating_stats():
    """Get rating statistics for the current user"""
    try:
        user_id = _get_user_id()
        storage = get_ratings_storage()

        stats = storage.get_stats(user_id)

        return jsonify({
            'success': True,
            'stats': stats
        })

    except Exception as e:
        logger.error(f"Error getting rating stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
