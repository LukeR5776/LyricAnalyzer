import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Stack
} from '@mui/material';
import { Login as LoginIcon, MusicNote } from '@mui/icons-material';
import { useAuth } from '../services/AuthContext';

const LoginPage = () => {
  const { login, loading } = useAuth();
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    try {
      setError(null);
      await login();
    } catch (err) {
      setError(err.message || 'Failed to initiate login');
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="80vh"
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 500,
          width: '100%',
          textAlign: 'center'
        }}
      >
        <Stack spacing={3}>
          <Box>
            <MusicNote sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Welcome to Lyrics Scraper
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Discover the meaning behind your favorite songs with real-time
              lyrics and annotations from Genius.com as you listen on Spotify.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box>
            <Typography variant="h6" gutterBottom>
              Get Started
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Connect your Spotify account to start viewing lyrics and
              annotations for your currently playing music.
            </Typography>

            <Button
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
              onClick={handleLogin}
              disabled={loading}
              sx={{
                mt: 2,
                minWidth: 200,
                backgroundColor: '#1db954',
                '&:hover': {
                  backgroundColor: '#1ed760'
                }
              }}
            >
              {loading ? 'Connecting...' : 'Connect Spotify'}
            </Button>
          </Box>

          {loading && (
            <Alert severity="info">
              <Typography variant="body2">
                Please complete the authorization in your browser, then return to this app.
              </Typography>
            </Alert>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary">
              This app requires a Spotify Premium account for full functionality.
              We only access your currently playing track - no music is stored or downloaded.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default LoginPage;