import time
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class SpotifyCacheService:
    """Simple in-memory cache for Spotify API responses"""

    def __init__(self):
        self.cache = {}
        self.cache_duration = 45  # Cache for 45 seconds
        self.last_request_time = {}
        self.min_request_interval = 5  # Minimum 5 seconds between requests

    def _get_cache_key(self, user_id: str, endpoint: str) -> str:
        """Generate cache key for user and endpoint"""
        return f"{user_id}:{endpoint}"

    def _is_cache_valid(self, cache_entry: Dict) -> bool:
        """Check if cache entry is still valid"""
        if not cache_entry:
            return False

        cache_time = cache_entry.get('timestamp', 0)
        return time.time() - cache_time < self.cache_duration

    def _should_throttle_request(self, user_id: str, endpoint: str) -> bool:
        """Check if we should throttle the request to prevent rate limiting"""
        key = self._get_cache_key(user_id, endpoint)
        last_time = self.last_request_time.get(key, 0)
        return time.time() - last_time < self.min_request_interval

    def get_cached_response(self, user_id: str, endpoint: str) -> Optional[Dict[Any, Any]]:
        """Get cached response if valid"""
        key = self._get_cache_key(user_id, endpoint)
        cache_entry = self.cache.get(key)

        if self._is_cache_valid(cache_entry):
            logger.debug(f"Cache hit for {key}")
            return cache_entry['data']

        return None

    def cache_response(self, user_id: str, endpoint: str, data: Dict[Any, Any]):
        """Cache the response data"""
        key = self._get_cache_key(user_id, endpoint)

        self.cache[key] = {
            'data': data,
            'timestamp': time.time()
        }

        # Update last request time
        self.last_request_time[key] = time.time()

        logger.debug(f"Cached response for {key}")

    def should_skip_request(self, user_id: str, endpoint: str) -> tuple[bool, Optional[Dict[Any, Any]]]:
        """
        Check if request should be skipped due to caching or throttling
        Returns (should_skip, cached_data)
        """
        # First check cache
        cached_data = self.get_cached_response(user_id, endpoint)
        if cached_data:
            return True, cached_data

        # Check if we should throttle
        if self._should_throttle_request(user_id, endpoint):
            logger.info(f"Throttling request for {user_id}:{endpoint}")
            # Return the last cached data even if expired, rather than hitting API
            key = self._get_cache_key(user_id, endpoint)
            cache_entry = self.cache.get(key)
            if cache_entry:
                return True, cache_entry['data']

        return False, None

    def clear_user_cache(self, user_id: str):
        """Clear all cache entries for a user"""
        keys_to_remove = [key for key in self.cache.keys() if key.startswith(f"{user_id}:")]
        for key in keys_to_remove:
            del self.cache[key]
            self.last_request_time.pop(key, None)

        logger.info(f"Cleared cache for user {user_id}")

    def cleanup_old_entries(self):
        """Clean up expired cache entries"""
        current_time = time.time()
        expired_keys = []

        for key, entry in self.cache.items():
            if current_time - entry['timestamp'] > self.cache_duration * 2:  # Clean up after 2x cache duration
                expired_keys.append(key)

        for key in expired_keys:
            del self.cache[key]
            self.last_request_time.pop(key, None)

        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")

# Global cache instance
spotify_cache = SpotifyCacheService()