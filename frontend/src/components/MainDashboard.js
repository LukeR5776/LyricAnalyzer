import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import { Refresh as RefreshIcon, MusicNote } from '@mui/icons-material';
import { useAuth } from '../services/AuthContext';
import apiService from '../services/apiService';
import CurrentTrackCard from './CurrentTrackCard';
import LyricsViewer from './LyricsViewer';

const MainDashboard = () => {
  const { user, logout } = useAuth();
  const [currentTrack, setCurrentTrack] = useState(null);
  const [lyricsData, setLyricsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh current track every 10 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchCurrentTrack, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Initial load
  useEffect(() => {
    fetchCurrentTrack();
  }, []);

  const fetchCurrentTrack = async () => {
    try {
      setError(null);
      const response = await apiService.getCurrentTrack();

      if (response.success && response.playing) {
        setCurrentTrack(response.track);

        // If track changed, fetch new lyrics
        if (!lyricsData || lyricsData.spotify_track?.id !== response.track.id) {
          fetchCurrentLyrics();
        }
      } else {
        setCurrentTrack(null);
        setLyricsData(null);
      }
    } catch (err) {
      console.error('Error fetching current track:', err);
      if (!currentTrack) { // Only show error if no track is currently loaded
        setError('Failed to get current track. Make sure Spotify is playing music.');
      }
    }
  };

  const fetchCurrentLyrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getCurrentLyrics();

      if (response.success) {
        setLyricsData(response);
      } else {
        setLyricsData(null);
        setError(response.error || 'Failed to get lyrics for current track');
      }
    } catch (err) {
      console.error('Error fetching lyrics:', err);
      setLyricsData(null);
      setError('Failed to get lyrics. The song might not be available on Genius.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchCurrentTrack();
    if (currentTrack) {
      fetchCurrentLyrics();
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Dashboard
          </Typography>
          {user && (
            <Typography variant="body2" color="text.secondary">
              Welcome back, {user.display_name || user.id}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={logout}
          >
            Logout
          </Button>
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {/* No Track Playing */}
      {!currentTrack && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <MusicNote sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Music Playing
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Start playing music on Spotify to see lyrics and annotations here.
          </Typography>
          <Button
            variant="contained"
            onClick={fetchCurrentTrack}
            startIcon={<RefreshIcon />}
          >
            Check for Music
          </Button>
        </Paper>
      )}

      {/* Current Track and Lyrics */}
      {currentTrack && (
        <Grid container spacing={3}>
          {/* Current Track Info */}
          <Grid item xs={12} md={4}>
            <CurrentTrackCard
              track={currentTrack}
              onRefresh={handleRefresh}
              autoRefresh={autoRefresh}
              onAutoRefreshChange={setAutoRefresh}
            />
          </Grid>

          {/* Lyrics and Annotations */}
          <Grid item xs={12} md={8}>
            {lyricsData ? (
              <LyricsViewer lyricsData={lyricsData} />
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Loading Lyrics...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Searching for lyrics and annotations on Genius
                </Typography>
                <CircularProgress sx={{ mt: 2 }} />
              </Paper>
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default MainDashboard;