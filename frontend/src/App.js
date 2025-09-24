import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Box } from '@mui/material';
import { AuthProvider, useAuth } from './services/AuthContext';
import LoginPage from './components/LoginPage';
import MainDashboard from './components/MainDashboard';
import LyricsViewer from './components/LyricsViewer';
import SettingsPage from './components/SettingsPage';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Typography variant="h4">Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Lyrics Scraper
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Spotify + Genius Integration
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
        {!isAuthenticated ? (
          <LoginPage />
        ) : (
          <Routes>
            <Route path="/" element={<MainDashboard />} />
            <Route path="/lyrics" element={<LyricsViewer />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        )}
      </Container>
    </Box>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;