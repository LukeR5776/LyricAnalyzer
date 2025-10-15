import json
import os
from typing import Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class RatingsStorage:
    """Simple JSON-based storage for song ratings"""

    def __init__(self, storage_path: str = None):
        if storage_path is None:
            # Default to storing in backend/data directory
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            data_dir = os.path.join(backend_dir, 'data')
            os.makedirs(data_dir, exist_ok=True)
            storage_path = os.path.join(data_dir, 'ratings.json')

        self.storage_path = storage_path
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        """Create the ratings file if it doesn't exist"""
        if not os.path.exists(self.storage_path):
            with open(self.storage_path, 'w') as f:
                json.dump({}, f)
            logger.info(f"Created ratings storage file at {self.storage_path}")

    def _load_ratings(self) -> Dict:
        """Load all ratings from storage"""
        try:
            with open(self.storage_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading ratings: {e}")
            return {}

    def _save_ratings(self, ratings: Dict):
        """Save ratings to storage"""
        try:
            with open(self.storage_path, 'w') as f:
                json.dump(ratings, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving ratings: {e}")

    def add_rating(self, user_id: str, song_data: Dict, rating: float) -> Dict:
        """
        Add or update a rating for a song

        Args:
            user_id: Unique identifier for the user
            song_data: Dictionary containing song info (spotify_id, title, artist, etc.)
            rating: Rating value (0.0-10.0)

        Returns:
            The saved rating entry
        """
        if not 0.0 <= rating <= 10.0:
            raise ValueError("Rating must be between 0.0 and 10.0")

        ratings = self._load_ratings()

        # Create user ratings dict if it doesn't exist
        if user_id not in ratings:
            ratings[user_id] = {}

        # Use Spotify ID as the unique key for songs
        song_key = song_data.get('spotify_id', song_data.get('id'))

        rating_entry = {
            'rating': rating,
            'song': {
                'spotify_id': song_data.get('spotify_id', song_data.get('id')),
                'genius_id': song_data.get('genius_id'),
                'title': song_data.get('title'),
                'artist': song_data.get('artist'),
                'album': song_data.get('album'),
                'image_url': song_data.get('image_url')
            },
            'rated_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }

        # Check if updating existing rating
        if song_key in ratings[user_id]:
            rating_entry['rated_at'] = ratings[user_id][song_key].get('rated_at', rating_entry['rated_at'])

        ratings[user_id][song_key] = rating_entry
        self._save_ratings(ratings)

        logger.info(f"Saved rating {rating} for song {song_data.get('title')} by user {user_id}")
        return rating_entry

    def get_rating(self, user_id: str, song_id: str) -> Optional[Dict]:
        """Get a specific rating for a song"""
        ratings = self._load_ratings()
        user_ratings = ratings.get(user_id, {})
        return user_ratings.get(song_id)

    def get_all_ratings(self, user_id: str, sort_by: str = 'title') -> List[Dict]:
        """
        Get all ratings for a user

        Args:
            user_id: User identifier
            sort_by: Sort method - 'title', 'artist', 'rating', 'date'

        Returns:
            List of rating entries sorted by the specified field
        """
        ratings = self._load_ratings()
        user_ratings = ratings.get(user_id, {})

        # Convert to list
        ratings_list = list(user_ratings.values())

        # Sort based on the requested field
        if sort_by == 'title':
            ratings_list.sort(key=lambda x: x['song']['title'].lower())
        elif sort_by == 'artist':
            ratings_list.sort(key=lambda x: x['song']['artist'].lower())
        elif sort_by == 'rating':
            ratings_list.sort(key=lambda x: x['rating'], reverse=True)
        elif sort_by == 'date':
            ratings_list.sort(key=lambda x: x['updated_at'], reverse=True)

        return ratings_list

    def delete_rating(self, user_id: str, song_id: str) -> bool:
        """Delete a rating"""
        ratings = self._load_ratings()

        if user_id in ratings and song_id in ratings[user_id]:
            del ratings[user_id][song_id]
            self._save_ratings(ratings)
            logger.info(f"Deleted rating for song {song_id} by user {user_id}")
            return True

        return False

    def get_stats(self, user_id: str) -> Dict:
        """Get rating statistics for a user"""
        user_ratings = self.get_all_ratings(user_id)

        if not user_ratings:
            return {
                'total_ratings': 0,
                'average_rating': 0.0,
                'highest_rating': 0.0,
                'lowest_rating': 0.0
            }

        ratings_values = [r['rating'] for r in user_ratings]

        return {
            'total_ratings': len(user_ratings),
            'average_rating': round(sum(ratings_values) / len(ratings_values), 1),
            'highest_rating': max(ratings_values),
            'lowest_rating': min(ratings_values)
        }


# Global instance
_ratings_storage = None

def get_ratings_storage() -> RatingsStorage:
    """Get the global ratings storage instance"""
    global _ratings_storage
    if _ratings_storage is None:
        _ratings_storage = RatingsStorage()
    return _ratings_storage
