import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Stack,
  Divider,
  Link
} from '@mui/material';
import { OpenInNew, Info } from '@mui/icons-material';
import { useAuth } from '../services/AuthContext';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const [autoRefresh, setAutoRefresh] = useState(
    localStorage.getItem('autoRefresh') !== 'false'
  );
  const [showNotifications, setShowNotifications] = useState(
    localStorage.getItem('showNotifications') !== 'false'
  );

  const handleAutoRefreshChange = (event) => {
    const value = event.target.checked;
    setAutoRefresh(value);
    localStorage.setItem('autoRefresh', value);
  };

  const handleNotificationsChange = (event) => {
    const value = event.target.checked;
    setShowNotifications(value);
    localStorage.setItem('showNotifications', value);
  };

  const openSpotifyDashboard = () => {
    if (window.electronAPI) {
      window.electronAPI.openExternal('https://developer.spotify.com/dashboard/applications');
    }
  };

  const openGeniusAPI = () => {
    if (window.electronAPI) {
      window.electronAPI.openExternal('https://genius.com/api-clients');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Stack spacing={3}>
        {/* User Info */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Account Information
          </Typography>

          {user && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Spotify Account
                </Typography>
                <Typography variant="body1">
                  {user.display_name || user.id}
                </Typography>
                {user.email && (
                  <Typography variant="caption" color="text.secondary">
                    {user.email}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Subscription
                </Typography>
                <Typography variant="body1">
                  {user.product || 'Free'}
                  {user.product === 'premium' && ' ✓'}
                </Typography>
              </Box>

              {user.product !== 'premium' && (
                <Alert severity="warning">
                  A Spotify Premium subscription is recommended for the best experience.
                  Some features may be limited with a free account.
                </Alert>
              )}

              <Box>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={logout}
                >
                  Disconnect Spotify Account
                </Button>
              </Box>
            </Stack>
          )}
        </Paper>

        {/* App Settings */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Application Settings
          </Typography>

          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={handleAutoRefreshChange}
                />
              }
              label="Auto-refresh current track"
            />
            <Typography variant="caption" color="text.secondary">
              Automatically check for track changes every 10 seconds
            </Typography>

            <Divider />

            <FormControlLabel
              control={
                <Switch
                  checked={showNotifications}
                  onChange={handleNotificationsChange}
                />
              }
              label="Show desktop notifications"
            />
            <Typography variant="caption" color="text.secondary">
              Display notifications when new lyrics are found
            </Typography>
          </Stack>
        </Paper>

        {/* API Information */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            API Information
          </Typography>

          <Stack spacing={2}>
            <Alert severity="info" icon={<Info />}>
              This app uses the Spotify Web API and Genius API to provide lyrics and annotations.
              All data is fetched in real-time and not stored permanently.
            </Alert>

            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Spotify Web API</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" paragraph>
                Used to detect your currently playing music. Only reads playback state -
                no music files are accessed or stored.
              </Typography>
              <Link
                component="button"
                variant="body2"
                onClick={openSpotifyDashboard}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                Spotify Developer Dashboard
                <OpenInNew fontSize="small" />
              </Link>
            </Box>

            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Genius API</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" paragraph>
                Used to fetch song lyrics and user-contributed annotations explaining
                the meaning behind lyrics.
              </Typography>
              <Link
                component="button"
                variant="body2"
                onClick={openGeniusAPI}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                Genius API Documentation
                <OpenInNew fontSize="small" />
              </Link>
            </Box>
          </Stack>
        </Paper>

        {/* About */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            About LYRICA
          </Typography>

          <Typography variant="body2" paragraph>
            Version 1.0.0
          </Typography>

          <Typography variant="body2" color="text.secondary" paragraph>
            A desktop application that integrates Spotify with Genius.com to provide
            real-time lyrics and annotations for your music. Built with Electron,
            React, and Python.
          </Typography>

          <Typography variant="caption" color="text.secondary">
            This application respects copyright laws and only displays lyrics previews.
            Full lyrics are available on Genius.com.
          </Typography>
        </Paper>
      </Stack>
    </Box>
  );
};

export default SettingsPage;