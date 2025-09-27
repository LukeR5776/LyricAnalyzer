import requests
import time
import lyricsgenius
from typing import Dict, List, Optional, Any
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class RateLimitedGeniusClient:
    """Rate-limited Genius API client with caching"""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.genius = lyricsgenius.Genius(
            access_token,
            verbose=False,
            remove_section_headers=True,
            skip_non_songs=True,
            excluded_terms=["(Remix)", "(Live)"],
            timeout=30,  # Increased timeout
            retries=3,   # Add retries
            sleep_time=0.5  # Add delay between requests
        )

        # Try to improve request headers to avoid being blocked
        try:
            if hasattr(self.genius, '_session'):
                self.genius._session.headers.update({
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                })
            elif hasattr(self.genius, 'session'):
                self.genius.session.headers.update({
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                })
        except Exception as e:
            logger.warning(f"Could not set custom headers: {e}")
            # Continue without custom headers

        # Rate limiting - Genius allows 1000 requests per day
        self.requests_per_minute = 10
        self.last_request_time = 0
        self.request_count = 0
        self.minute_start = time.time()

        # Base API URL
        self.base_url = "https://api.genius.com"

        # Headers for direct API calls
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "User-Agent": "LyricsScraper/1.0"
        }

    def _wait_if_needed(self):
        """Implement rate limiting"""
        current_time = time.time()

        # Reset counter every minute
        if current_time - self.minute_start >= 60:
            self.request_count = 0
            self.minute_start = current_time

        # Check if we've hit the rate limit
        if self.request_count >= self.requests_per_minute:
            sleep_time = 60 - (current_time - self.minute_start)
            if sleep_time > 0:
                logger.info(f"Rate limit reached, sleeping for {sleep_time:.2f} seconds")
                time.sleep(sleep_time)
                self.request_count = 0
                self.minute_start = time.time()

        # Ensure minimum delay between requests
        time_since_last = current_time - self.last_request_time
        if time_since_last < 0.1:  # 100ms minimum between requests
            time.sleep(0.1 - time_since_last)

        self.request_count += 1
        self.last_request_time = time.time()

    def search_songs(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for songs on Genius"""
        self._wait_if_needed()

        try:
            url = f"{self.base_url}/search"
            params = {
                "q": query,
                "per_page": min(limit, 50)  # Genius max is 50
            }

            logger.debug(f"Making Genius API request: {url} with params: {params}")
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            logger.debug(f"Genius API response status: {response.status_code}")

            response.raise_for_status()

            data = response.json()
            logger.debug(f"Genius API response data keys: {list(data.keys())}")

            hits = data.get("response", {}).get("hits", [])
            logger.debug(f"Found {len(hits)} hits from Genius API")

            songs = []

            for hit in hits:
                result = hit.get("result", {})
                # Check both _type (old API) and type (new API format)
                if result.get("_type") == "song" or hit.get("type") == "song":
                    songs.append({
                        "id": result.get("id"),
                        "title": result.get("title"),
                        "artist": result.get("primary_artist", {}).get("name"),
                        "url": result.get("url"),
                        "lyrics_state": result.get("lyrics_state"),
                        "song_art_image_url": result.get("song_art_image_url"),
                        "release_date_for_display": result.get("release_date_for_display"),
                        "stats": result.get("stats", {}),
                        "primary_artist": {
                            "id": result.get("primary_artist", {}).get("id"),
                            "name": result.get("primary_artist", {}).get("name"),
                            "url": result.get("primary_artist", {}).get("url"),
                            "image_url": result.get("primary_artist", {}).get("image_url")
                        }
                    })

            logger.debug(f"Parsed {len(songs)} songs from {len(hits)} hits")
            return songs

        except requests.exceptions.RequestException as e:
            logger.error(f"Error searching Genius: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in search_songs: {str(e)}")
            return []

    def get_song_details(self, song_id: int) -> Optional[Dict[str, Any]]:
        """Get detailed information about a song"""
        self._wait_if_needed()

        try:
            url = f"{self.base_url}/songs/{song_id}"

            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()

            data = response.json()
            song = data.get("response", {}).get("song", {})

            if not song:
                return None

            return {
                "id": song.get("id"),
                "title": song.get("title"),
                "title_with_featured": song.get("title_with_featured"),
                "artist": song.get("primary_artist", {}).get("name"),
                "url": song.get("url"),
                "path": song.get("path"),
                "lyrics_state": song.get("lyrics_state"),
                "song_art_image_url": song.get("song_art_image_url"),
                "release_date_for_display": song.get("release_date_for_display"),
                "description": self._extract_description(song.get("description", {})),
                "stats": song.get("stats", {}),
                "album": song.get("album"),
                "featured_artists": song.get("featured_artists", []),
                "producer_artists": song.get("producer_artists", []),
                "writer_artists": song.get("writer_artists", []),
                "primary_artist": {
                    "id": song.get("primary_artist", {}).get("id"),
                    "name": song.get("primary_artist", {}).get("name"),
                    "url": song.get("primary_artist", {}).get("url"),
                    "image_url": song.get("primary_artist", {}).get("image_url")
                }
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting song details: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_song_details: {str(e)}")
            return None

    def get_song_annotations(self, song_id: int) -> List[Dict[str, Any]]:
        """Get annotations for a song"""
        self._wait_if_needed()

        try:
            url = f"{self.base_url}/referents"
            params = {
                "song_id": song_id,
                "per_page": 50,
                "text_format": "html"
            }

            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            referents = data.get("response", {}).get("referents", [])

            annotations = []
            for referent in referents:
                for annotation in referent.get("annotations", []):
                    annotations.append({
                        "id": annotation.get("id"),
                        "body": annotation.get("body", {}).get("html"),
                        "fragment": referent.get("fragment"),
                        "range": referent.get("range"),
                        "url": annotation.get("url"),
                        "verified": annotation.get("verified"),
                        "cosigned_by": annotation.get("cosigned_by", []),
                        "votes_total": annotation.get("votes_total", 0),
                        "authors": annotation.get("authors", [])
                    })

            return annotations

        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting annotations: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in get_song_annotations: {str(e)}")
            return []

    def get_lyrics_with_lyricsgenius(self, artist: str, title: str) -> Optional[str]:
        """Get lyrics using the lyricsgenius library (includes scraping)"""
        self._wait_if_needed()

        try:
            # Clean up the search query
            clean_title = self._clean_song_title(title)
            clean_artist = self._clean_artist_name(artist)

            logger.info(f"Searching lyrics for: {clean_artist} - {clean_title}")

            # Try to get the song with multiple approaches
            song = None

            # First attempt: search by title and artist
            try:
                song = self.genius.search_song(clean_title, clean_artist)
                logger.debug(f"First search attempt result: {song.title if song else 'No song found'}")
            except Exception as search_error:
                logger.warning(f"First search attempt failed: {str(search_error)}")

            # Second attempt: search by title only if first failed
            if not song:
                try:
                    logger.debug("Trying search by title only")
                    song = self.genius.search_song(clean_title)
                    logger.debug(f"Title-only search result: {song.title if song else 'No song found'}")
                except Exception as search_error:
                    logger.warning(f"Title-only search failed: {str(search_error)}")

            if song and song.lyrics:
                # Check if we got actual lyrics or a placeholder
                lyrics_content = song.lyrics.strip()
                logger.debug(f"Retrieved lyrics length: {len(lyrics_content)} characters")
                logger.debug(f"Lyrics preview: {lyrics_content[:200]}...")

                # Check for common placeholder patterns
                placeholder_patterns = [
                    "visit genius.com",
                    "go to genius.com",
                    "view lyrics on genius",
                    "lyrics not available",
                    "instrumental"
                ]

                lyrics_lower = lyrics_content.lower()
                is_placeholder = any(pattern in lyrics_lower for pattern in placeholder_patterns)

                if is_placeholder:
                    logger.warning(f"Detected placeholder lyrics: {lyrics_content[:100]}")
                    return None

                if len(lyrics_content) > 50:  # Reasonable minimum for actual lyrics
                    logger.info(f"Successfully retrieved lyrics ({len(lyrics_content)} chars)")
                    return lyrics_content
                else:
                    logger.warning(f"Lyrics too short, likely placeholder: {lyrics_content}")
                    return None

            logger.warning(f"No lyrics found for: {clean_artist} - {clean_title}")
            return None

        except Exception as e:
            logger.error(f"Error getting lyrics with lyricsgenius: {str(e)}")
            return None

    def _clean_song_title(self, title: str) -> str:
        """Clean song title for better matching"""
        # Remove common additions that might interfere with matching
        removals = [
            " - Remastered",
            " (Remastered)",
            " - Original Mix",
            " (Original Mix)",
            " (Explicit)",
            " (Clean)",
            " [Explicit]",
            " [Clean]"
        ]

        clean_title = title
        for removal in removals:
            clean_title = clean_title.replace(removal, "")

        return clean_title.strip()

    def _clean_artist_name(self, artist: str) -> str:
        """Clean artist name for better matching"""
        # Handle featured artists
        if " feat." in artist:
            artist = artist.split(" feat.")[0]
        elif " ft." in artist:
            artist = artist.split(" ft.")[0]
        elif " featuring" in artist:
            artist = artist.split(" featuring")[0]

        return artist.strip()

    def _normalize_artist_name(self, artist: str) -> str:
        """Normalize artist name for better matching with stylized names"""
        normalized = self._clean_artist_name(artist)

        # Handle common number-to-letter substitutions
        substitutions = {
            '4': 'a',  # d4vd -> davd (closer to "david")
            '3': 'e',  # Tr3vor -> Trevor
            '1': 'l',  # P1nk -> Plnk (closer to Pink)
            '0': 'o',  # G0d -> God
            '5': 's',  # 5econd -> Second
            '7': 't',  # 7ime -> Time
        }

        # Apply substitutions for better matching
        for num, letter in substitutions.items():
            if num in normalized.lower():
                normalized = normalized.lower().replace(num, letter)

        # Also try expanding common abbreviations
        normalized = normalized.replace('&', 'and')
        normalized = normalized.replace('+', 'and')

        return normalized.strip()

    def find_best_match(self, spotify_track: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find the best matching song on Genius for a Spotify track"""
        artist = spotify_track.get("artists", [""])[0]
        title = spotify_track.get("name", "")

        if not artist or not title:
            return None

        logger.info(f"Searching for match: '{title}' by '{artist}'")

        # Normalize artist name for better matching
        normalized_artist = self._normalize_artist_name(artist)
        normalized_title = self._clean_song_title(title)

        # Try different search strategies with more variations
        search_queries = [
            f"{artist} {title}",
            f"{title} {artist}",
            f"{normalized_artist} {normalized_title}",
            f"{normalized_title} {normalized_artist}",
            title,  # Sometimes artist name in query hurts matching
            normalized_title,
            f'"{title}" {artist}',  # Quoted title for exact matching
            f"{artist} - {title}",  # With dash separator
        ]

        best_match = None
        best_score = 0.0

        for i, query in enumerate(search_queries):
            logger.debug(f"Search attempt {i+1}: '{query}'")
            songs = self.search_songs(query, limit=10)  # Increased limit

            if not songs:
                logger.debug(f"No results for query: '{query}'")
                continue

            for song in songs:
                # Calculate match score
                score = self._calculate_match_score(spotify_track, song)

                logger.debug(f"  Candidate: '{song.get('title', '')}' by '{song.get('artist', '')}' (score: {score:.3f})")

                if score > best_score:
                    best_score = score
                    best_match = song

                # Lower threshold - accept good matches sooner
                if score > 0.6:  # Lowered from 0.8 to 0.6
                    logger.info(f"Found good match: '{song['title']}' by '{song['artist']}' (score: {score:.3f}) using query: '{query}'")
                    return song

        # If we found a decent match but not above threshold, use it anyway
        if best_match and best_score > 0.4:
            logger.info(f"Using best available match: '{best_match['title']}' by '{best_match['artist']}' (score: {best_score:.3f})")
            return best_match

        logger.warning(f"No good match found for: '{title}' by '{artist}' (best score: {best_score:.3f})")
        return None

    def _calculate_match_score(self, spotify_track: Dict[str, Any], genius_song: Dict[str, Any]) -> float:
        """Calculate similarity score between Spotify and Genius tracks"""
        spotify_title = spotify_track.get("name", "").lower()
        spotify_artist = spotify_track.get("artists", [""])[0].lower()

        genius_title = genius_song.get("title", "").lower()
        genius_artist = genius_song.get("artist", "").lower()

        # Simple similarity scoring
        title_score = self._string_similarity(spotify_title, genius_title)
        artist_score = self._string_similarity(spotify_artist, genius_artist)

        # Weighted average (title is more important)
        return (title_score * 0.7) + (artist_score * 0.3)

    def _string_similarity(self, s1: str, s2: str) -> float:
        """Calculate string similarity with improved matching"""
        if not s1 or not s2:
            return 0.0

        # Normalize strings
        s1 = s1.lower().strip()
        s2 = s2.lower().strip()

        if s1 == s2:
            return 1.0

        # Check if one is substring of the other
        if s1 in s2 or s2 in s1:
            return 0.9

        # Remove common punctuation for better matching
        for char in [',', '.', '!', '?', '(', ')', '[', ']', '-', '_']:
            s1 = s1.replace(char, ' ')
            s2 = s2.replace(char, ' ')

        # Simple word overlap scoring
        words1 = set(w for w in s1.split() if w)
        words2 = set(w for w in s2.split() if w)

        if not words1 or not words2:
            return 0.0

        intersection = words1.intersection(words2)
        union = words1.union(words2)

        jaccard_score = len(intersection) / len(union) if union else 0.0

        # Bonus for partial word matches (e.g., "romantic" matches "romantics")
        partial_matches = 0
        for w1 in words1:
            for w2 in words2:
                if len(w1) > 3 and len(w2) > 3:  # Only for longer words
                    if w1.startswith(w2[:3]) or w2.startswith(w1[:3]):
                        partial_matches += 1
                        break

        # Add partial match bonus (up to 0.2 additional points)
        partial_bonus = min(0.2, partial_matches * 0.1)

        return min(1.0, jaccard_score + partial_bonus)

    def _extract_description(self, description_obj: Dict[str, Any]) -> Optional[str]:
        """Extract description with format priority: plain > html (avoid DOM)"""
        if not description_obj:
            logger.debug("No description object available")
            return None

        # Log available formats for debugging
        available_formats = list(description_obj.keys())
        logger.debug(f"Available description formats: {available_formats}")

        # Try plain text first (most reliable format)
        if 'plain' in description_obj and description_obj['plain']:
            plain_content = description_obj['plain'].strip()
            logger.debug(f"Using plain description (length: {len(plain_content)})")
            logger.debug(f"Plain description preview: {plain_content[:200]}...")
            return plain_content

        # Fall back to HTML format (needs processing)
        if 'html' in description_obj and description_obj['html']:
            html_content = description_obj['html'].strip()
            logger.debug(f"Using HTML description (length: {len(html_content)})")
            logger.debug(f"HTML description preview: {html_content[:200]}...")
            return html_content

        # Try to extract text from DOM structure if available
        if 'dom' in description_obj and description_obj['dom']:
            dom_content = self._extract_text_from_dom(description_obj['dom'])
            if dom_content:
                logger.debug(f"Using extracted DOM text (length: {len(dom_content)})")
                return dom_content

        logger.debug("No usable description format found")
        return None

    def _extract_text_from_dom(self, dom_obj) -> Optional[str]:
        """Extract plain text from DOM structure"""
        if not dom_obj:
            return None

        try:
            # If dom_obj is a list, process each element
            if isinstance(dom_obj, list):
                text_parts = []
                for item in dom_obj:
                    text = self._extract_text_from_dom(item)
                    if text:
                        text_parts.append(text)
                return ' '.join(text_parts) if text_parts else None

            # If dom_obj is a dict with children, extract from children
            elif isinstance(dom_obj, dict):
                if 'children' in dom_obj:
                    return self._extract_text_from_dom(dom_obj['children'])
                elif 'tag' in dom_obj and dom_obj['tag'] == 'p' and 'children' in dom_obj:
                    # Handle paragraph tags specifically
                    return self._extract_text_from_dom(dom_obj['children'])
                else:
                    # Return the object as string if it's simple text
                    return str(dom_obj) if isinstance(dom_obj, str) else None

            # If it's a string, return as is
            elif isinstance(dom_obj, str):
                return dom_obj.strip()

        except Exception as e:
            logger.warning(f"Error extracting text from DOM: {str(e)}")

        return None


def get_genius_client() -> Optional[RateLimitedGeniusClient]:
    """Get a configured Genius client"""
    access_token = current_app.config.get('GENIUS_ACCESS_TOKEN')
    if not access_token:
        logger.error("No Genius access token configured")
        return None

    return RateLimitedGeniusClient(access_token)