import axios from 'axios';

// Dynamic port configuration - tries multiple common backend ports
const POSSIBLE_PORTS = [5001, 5000, 5002, 5003];
let API_BASE_URL = 'http://localhost:5001'; // Default fallback
let isInitialized = false;
let initializationPromise = null;

// Error types for better debugging
const ErrorType = {
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  CORS: 'CORS',
  TIMEOUT: 'TIMEOUT',
  NETWORK: 'NETWORK',
  OTHER: 'OTHER'
};

// Classify error types
const classifyError = (error) => {
  if (error.name === 'AbortError') return ErrorType.TIMEOUT;
  if (error.message.includes('Failed to fetch')) return ErrorType.CONNECTION_REFUSED;
  if (error.message.includes('CORS')) return ErrorType.CORS;
  if (error.message.includes('NetworkError')) return ErrorType.NETWORK;
  return ErrorType.OTHER;
};

// Function to detect which port the backend is running on
const detectBackendPort = async () => {
  console.log('🔍 Detecting backend port...');
  const results = [];

  for (const port of POSSIBLE_PORTS) {
    try {
      // Try the simple health endpoint first (no CORS complexity)
      const healthUrl = `http://localhost:${port}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      // ANY response means server is running (even 404 or 500)
      if (response) {
        const status = response.status;
        results.push({ port, status: 'found', httpStatus: status });

        // If we got a good response, use this port
        if (status >= 200 && status < 500) {
          API_BASE_URL = `http://localhost:${port}`;
          console.log(`✓ Backend detected on port ${port} (HTTP ${status})`);
          return API_BASE_URL;
        }
      }
    } catch (error) {
      const errorType = classifyError(error);
      results.push({ port, status: 'error', errorType, message: error.message });

      // CORS error means server EXISTS but has CORS issues
      // This is actually a SUCCESS for detection purposes!
      if (errorType === ErrorType.CORS) {
        console.log(`⚠️ Port ${port}: Server found but has CORS policy (${error.message})`);
        API_BASE_URL = `http://localhost:${port}`;
        console.log(`✓ Using port ${port} despite CORS warning`);
        return API_BASE_URL;
      }

      // Log other errors for debugging
      if (errorType !== ErrorType.CONNECTION_REFUSED) {
        console.log(`Port ${port}: ${errorType} - ${error.message}`);
      }
    }
  }

  // Show summary
  console.warn('⚠️ Could not detect backend port. Results:');
  results.forEach(r => {
    if (r.status === 'found') {
      console.log(`  Port ${r.port}: HTTP ${r.httpStatus}`);
    } else {
      console.log(`  Port ${r.port}: ${r.errorType}`);
    }
  });
  console.warn(`Using default port ${POSSIBLE_PORTS[0]}`);

  return API_BASE_URL;
};

// Initialize API service - must be called before using API
const initializeApiService = async () => {
  if (isInitialized) {
    return API_BASE_URL;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = detectBackendPort().then(url => {
    API_BASE_URL = url;
    api.defaults.baseURL = url;
    isInitialized = true;
    console.log(`✓ API service initialized: ${url}`);
    return url;
  });

  return initializationPromise;
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // Important for session cookies
});

// Request interceptor - ensure initialization before requests
api.interceptors.request.use(
  async (config) => {
    // Ensure API service is initialized before making requests
    await initializeApiService();
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✓ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    // Enhanced error logging
    if (error.response) {
      // Server responded with error status
      console.error(`✗ API Error ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error('✗ Network Error: No response from server', {
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
    } else {
      // Error in request setup
      console.error('✗ Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

const apiService = {
  // Authentication endpoints
  async initiateSpotifyLogin() {
    const response = await api.get('/auth/spotify/login');
    return response.data;
  },

  async checkSpotifyAuth() {
    const response = await api.get('/auth/spotify/status');
    return response.data;
  },

  async refreshSpotifyToken() {
    const response = await api.get('/auth/spotify/refresh');
    return response.data;
  },

  async logoutSpotify() {
    const response = await api.get('/auth/spotify/logout');
    return response.data;
  },

  async exchangeAuthCode(code, state) {
    const response = await api.post('/auth/spotify/exchange', {
      code,
      state
    });
    return response.data;
  },

  async claimSpotifyAuth(state) {
    const response = await api.post('/auth/spotify/claim', {
      state
    });
    return response.data;
  },

  // Spotify endpoints
  async getCurrentTrack(forceRefresh = false) {
    const response = await api.get('/spotify/current-track', {
      params: forceRefresh ? { force_refresh: 'true' } : {}
    });
    return response.data;
  },

  async getPlaybackState() {
    const response = await api.get('/spotify/playback-state');
    return response.data;
  },

  async getUserProfile() {
    const response = await api.get('/spotify/user-profile');
    return response.data;
  },

  async searchSpotifyTracks(query, limit = 10) {
    const response = await api.get('/spotify/search', {
      params: { q: query, limit }
    });
    return response.data;
  },

  // Genius endpoints
  async searchGeniusSongs(query, limit = 10) {
    const response = await api.get('/genius/search', {
      params: { q: query, limit }
    });
    return response.data;
  },

  async getGeniusSongDetails(songId) {
    const response = await api.get(`/genius/song/${songId}`);
    return response.data;
  },

  async getGeniusSongAnnotations(songId) {
    const response = await api.get(`/genius/song/${songId}/annotations`);
    return response.data;
  },

  async getGeniusLyrics(artist, title) {
    const response = await api.get('/genius/lyrics', {
      params: { artist, title }
    });
    return response.data;
  },

  async matchSpotifyToGenius(trackName, artistName, albumName = null) {
    const response = await api.get('/genius/match-spotify', {
      params: { track_name: trackName, artist_name: artistName, album_name: albumName }
    });
    return response.data;
  },

  // Combined lyrics endpoints
  async getCurrentLyrics() {
    const response = await api.get('/lyrics/current');
    return response.data;
  },

  async searchLyrics(artist, title) {
    const response = await api.get('/lyrics/search', {
      params: { artist, title }
    });
    return response.data;
  },

  async getLyricsByGeniusId(geniusId) {
    const response = await api.get(`/lyrics/by-id/${geniusId}`);
    return response.data;
  },

  async getSyncedCurrentTrack() {
    const response = await api.get('/lyrics/sync');
    return response.data;
  },

  // Ratings endpoints
  async rateSong(songData, rating) {
    const response = await api.post('/ratings/rate', {
      song: songData,
      rating: rating
    });
    return response.data;
  },

  async getMyRatings(sortBy = 'title') {
    const response = await api.get('/ratings/my-ratings', {
      params: { sort: sortBy }
    });
    return response.data;
  },

  async getSongRating(songId) {
    const response = await api.get(`/ratings/rating/${songId}`);
    return response.data;
  },

  async deleteSongRating(songId) {
    const response = await api.delete(`/ratings/rating/${songId}`);
    return response.data;
  },

  async getRatingStats() {
    const response = await api.get('/ratings/stats');
    return response.data;
  },

  // Exposed initialization function for manual control
  initialize: initializeApiService,
};

export default apiService;