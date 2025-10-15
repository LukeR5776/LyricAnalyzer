import React, { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  Avatar,
  LinearProgress,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import { PlayArrow, Pause, Album } from '@mui/icons-material';
import RatingStars from './RatingStars';
import apiService from '../services/apiService';

const CurrentTrackCard = ({ track, onRefresh, autoRefresh, onAutoRefreshChange }) => {
  const [currentRating, setCurrentRating] = useState(0);
  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = track.duration_ms > 0
    ? (track.progress_ms / track.duration_ms) * 100
    : 0;

  // Load existing rating when track changes
  useEffect(() => {
    const loadRating = async () => {
      if (!track?.id) return;

      try {
        const response = await apiService.getSongRating(track.id);
        if (response.success && response.rating) {
          setCurrentRating(response.rating.rating);
        } else {
          setCurrentRating(0);
        }
      } catch (error) {
        // No rating exists, that's okay
        setCurrentRating(0);
      }
    };

    loadRating();
  }, [track?.id]);

  const handleRating = async (rating) => {
    try {
      const songData = {
        spotify_id: track.id,
        genius_id: track.genius_id,
        title: track.name,
        artist: track.artists.join(', '),
        album: track.album?.name || track.album,
        image_url: track.album?.images?.[0]?.url
      };

      await apiService.rateSong(songData, rating);
      setCurrentRating(rating);
    } catch (error) {
      console.error('Error saving rating:', error);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Now Playing
      </Typography>

      <Stack spacing={3}>
        {/* Track Info */}
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            variant="rounded"
            sx={{
              width: 80,
              height: 80,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '2px solid rgba(255,255,255,0.1)'
            }}
            src={track.album?.images?.[0]?.url}
          >
            <Album sx={{ fontSize: 40, color: 'grey.400' }} />
          </Avatar>

          <Box flex={1} minWidth={0}>
            <Typography variant="subtitle1" noWrap>
              {track.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {track.artists.join(', ')}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {track.album?.name || track.album}
            </Typography>
          </Box>
        </Box>

        {/* Playback Status */}
        <Box>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              {track.is_playing ? (
                <PlayArrow color="primary" />
              ) : (
                <Pause color="disabled" />
              )}
              <Typography variant="body2">
                {track.is_playing ? 'Playing' : 'Paused'}
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary">
              {formatDuration(track.progress_ms)} / {formatDuration(track.duration_ms)}
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        {/* Track Stats */}
        <Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {track.popularity && (
              <Chip
                size="small"
                label={`${track.popularity}% popular`}
                variant="outlined"
              />
            )}
            {track.explicit && (
              <Chip
                size="small"
                label="Explicit"
                color="warning"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>

        <Divider />

        {/* Rating */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Rate this song
          </Typography>
          <RatingStars
            rating={currentRating}
            onRate={handleRating}
            size="medium"
          />
        </Box>

        {/* Auto-refresh Control */}
        <FormControlLabel
          control={
            <Switch
              checked={autoRefresh}
              onChange={(e) => onAutoRefreshChange(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="caption">
              Auto-refresh every 30s
            </Typography>
          }
        />
      </Stack>
    </Paper>
  );
};

export default CurrentTrackCard;