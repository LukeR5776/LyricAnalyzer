import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from './apiService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    initializeAndCheckAuth();
  }, []);

  const initializeAndCheckAuth = async () => {
    try {
      // Initialize API service first to detect backend port
      await apiService.initialize();
      // Then check auth status
      await checkAuthStatus();
    } catch (error) {
      console.error('Error initializing API service:', error);
      setLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await apiService.checkSpotifyAuth();
      if (response.success && response.authenticated) {
        setIsAuthenticated(true);
        // Get user profile
        const userResponse = await apiService.getUserProfile();
        if (userResponse.success) {
          setUser(userResponse.user);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      setLoading(true);
      const response = await apiService.initiateSpotifyLogin();

      if (response.success && response.auth_url) {
        console.log('Opening Spotify auth URL:', response.auth_url);

        // Open auth URL in external browser
        if (window.electronAPI) {
          await window.electronAPI.openExternal(response.auth_url);
        } else {
          // Fallback for web version
          window.open(response.auth_url, '_blank');
        }

        // Start intelligent polling for auth completion
        startAuthPolling(response.state);
      } else {
        setLoading(false);
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      throw error;
    }
  };

  const startAuthPolling = (state) => {
    console.log('Starting auth polling with state:', state);
    let attempts = 0;
    const maxAttempts = 90; // Poll for 3 minutes max (90 * 2 seconds)

    const poll = async () => {
      try {
        attempts++;
        console.log(`Auth polling attempt ${attempts}/${maxAttempts}`);

        // First try to claim auth using the state parameter
        try {
          const claimResponse = await apiService.claimSpotifyAuth(state);
          if (claimResponse.success && claimResponse.authenticated) {
            console.log('Authentication claimed successfully!');
            setIsAuthenticated(true);
            setLoading(false);

            // Get user profile
            try {
              const userResponse = await apiService.getUserProfile();
              if (userResponse.success) {
                setUser(userResponse.user);
              }
            } catch (profileError) {
              console.warn('Could not fetch user profile:', profileError);
            }

            return; // Stop polling
          }
        } catch (claimError) {
          // If claiming fails, fall back to regular status check
          console.log('Claim attempt failed, trying status check:', claimError.message);
        }

        // Fallback: check regular auth status
        const response = await apiService.checkSpotifyAuth();

        if (response.success && response.authenticated) {
          console.log('Authentication successful via status check!');
          setIsAuthenticated(true);
          setLoading(false);

          // Get user profile
          try {
            const userResponse = await apiService.getUserProfile();
            if (userResponse.success) {
              setUser(userResponse.user);
            }
          } catch (profileError) {
            console.warn('Could not fetch user profile:', profileError);
          }

          return; // Stop polling
        }

        // Continue polling if not authenticated and haven't exceeded max attempts
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          console.log('Auth polling timeout - maximum attempts reached');
          setLoading(false);
        }

      } catch (error) {
        console.error('Error during auth polling:', error);

        // Continue polling on error (might be temporary network issue)
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setLoading(false);
        }
      }
    };

    // Start polling immediately
    poll();
  };

  const logout = async () => {
    try {
      await apiService.logoutSpotify();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout locally even if API call fails
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const refreshAuth = async () => {
    try {
      const response = await apiService.refreshSpotifyToken();
      if (response.success) {
        setIsAuthenticated(true);
        return true;
      } else {
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }
  };

  const value = {
    isAuthenticated,
    loading,
    user,
    login,
    logout,
    refreshAuth,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};