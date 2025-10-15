import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Box, ThemeProvider, Button, Stack } from '@mui/material';
import { Home, Person, Settings } from '@mui/icons-material';
import { AuthProvider, useAuth } from './services/AuthContext';
import theme from './theme';
import LoginPage from './components/LoginPage';
import MainDashboard from './components/MainDashboard';
import LyricsViewer from './components/LyricsViewer';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const navItems = [
    { path: '/', label: 'Home', icon: <Home /> },
    { path: '/profile', label: 'My Ratings', icon: <Person /> },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ width: 150 }}>
            {isAuthenticated && (
              <Stack direction="row" spacing={1}>
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    color="inherit"
                    startIcon={item.icon}
                    onClick={() => navigate(item.path)}
                    sx={{
                      opacity: location.pathname === item.path ? 1 : 0.7,
                      borderBottom: location.pathname === item.path ? '2px solid white' : 'none'
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            )}
          </Box>

          <Typography
            variant="h6"
            component="div"
            sx={{
              fontFamily: '"Lilita One", cursive',
              fontWeight: 400,
              fontSize: '2rem',
              color: '#fff',
              letterSpacing: '0.02em',
              textAlign: 'center'
            }}
          >
            LYRICA
          </Typography>

          <Box sx={{ width: 150 }} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
        {!isAuthenticated ? (
          <LoginPage />
        ) : (
          <Routes>
            <Route path="/" element={<MainDashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
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