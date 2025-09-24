import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // Important for session cookies
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data);
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
  async getCurrentTrack() {
    const response = await api.get('/spotify/current-track');
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
};

export default apiService;