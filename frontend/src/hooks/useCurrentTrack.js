import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService';

export const useCurrentTrack = (autoRefresh = true, refreshInterval = 10000) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCurrentTrack = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getCurrentTrack();

      if (response.success && response.playing) {
        setCurrentTrack(response.track);
      } else {
        setCurrentTrack(null);
      }
    } catch (err) {
      console.error('Error fetching current track:', err);
      setError(err.message || 'Failed to fetch current track');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchCurrentTrack, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchCurrentTrack]);

  // Initial fetch
  useEffect(() => {
    fetchCurrentTrack();
  }, [fetchCurrentTrack]);

  return {
    currentTrack,
    loading,
    error,
    refetch: fetchCurrentTrack
  };
};