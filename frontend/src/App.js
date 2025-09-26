import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Box, ThemeProvider } from '@mui/material';
import { AuthProvider, useAuth } from './services/AuthContext';
import theme from './theme';
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
        <Toolbar sx={{ justifyContent: 'center' }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontFamily: '"Lilita One", cursive',
              fontWeight: 400,
              fontSize: '1.75rem',
              color: '#fff',
              letterSpacing: '0.02em',
              textAlign: 'center'
            }}
          >
            LYRICA
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
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;