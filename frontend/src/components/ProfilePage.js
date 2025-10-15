import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Divider
} from '@mui/material';
import { Sort, MusicNote, Delete } from '@mui/icons-material';
import apiService from '../services/apiService';
import RatingStars from './RatingStars';
import LyricsViewer from './LyricsViewer';

const ProfilePage = () => {
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState(null);
  const [sortBy, setSortBy] = useState('title');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [lyricsData, setLyricsData] = useState(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  useEffect(() => {
    fetchRatings();
  }, [sortBy]);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getMyRatings(sortBy);

      if (response.success) {
        setRatings(response.ratings);
        setStats(response.stats);
      }
    } catch (err) {
      setError('Failed to load ratings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSongClick = async (rating) => {
    setSelectedSong(rating);
    setLoadingLyrics(true);
    setLyricsData(null);

    try {
      // Try to get lyrics by Genius ID if available
      if (rating.song.genius_id) {
        const response = await apiService.getLyricsByGeniusId(rating.song.genius_id);
        if (response.success) {
          setLyricsData(response);
        }
      } else {
        // Fall back to searching by artist and title
        const response = await apiService.getCurrentLyrics();
        if (response.success) {
          setLyricsData(response);
        }
      }
    } catch (err) {
      console.error('Error loading lyrics:', err);
    } finally {
      setLoadingLyrics(false);
    }
  };

  const handleDeleteRating = async (songId, event) => {
    event.stopPropagation();

    try {
      await apiService.deleteSongRating(songId);
      fetchRatings(); // Refresh the list

      // Clear selected song if it was deleted
      if (selectedSong?.song?.spotify_id === songId) {
        setSelectedSong(null);
        setLyricsData(null);
      }
    } catch (err) {
      console.error('Error deleting rating:', err);
    }
  };

  const handleBackToList = () => {
    setSelectedSong(null);
    setLyricsData(null);
  };

  if (selectedSong && lyricsData) {
    return (
      <Box>
        <Button onClick={handleBackToList} sx={{ mb: 2 }}>
          ← Back to My Ratings
        </Button>
        <LyricsViewer lyricsData={lyricsData} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          My Ratings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and manage your song ratings
        </Typography>
      </Box>

      {/* Stats */}
      {stats && stats.total_ratings > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Your Stats
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            <Box>
              <Typography variant="h4" color="primary">
                {stats.total_ratings}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Ratings
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="h4" color="primary">
                {stats.average_rating.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Rating
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="h4" color="success.main">
                {stats.highest_rating.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Highest
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="h4" color="warning.main">
                {stats.lowest_rating.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lowest
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value)}
            startAdornment={<Sort sx={{ mr: 1, color: 'action.active' }} />}
          >
            <MenuItem value="title">Song Title (A-Z)</MenuItem>
            <MenuItem value="artist">Artist (A-Z)</MenuItem>
            <MenuItem value="rating">Rating (High to Low)</MenuItem>
            <MenuItem value="date">Recently Rated</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary">
          {ratings.length} song{ratings.length !== 1 ? 's' : ''} rated
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!loading && ratings.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <MusicNote sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Ratings Yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start rating songs to see them here!
          </Typography>
        </Paper>
      )}

      {/* Ratings Grid */}
      {!loading && ratings.length > 0 && (
        <Grid container spacing={2}>
          {ratings.map((rating) => (
            <Grid item xs={12} sm={6} md={4} key={rating.song.spotify_id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardActionArea onClick={() => handleSongClick(rating)} sx={{ flexGrow: 1 }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={rating.song.image_url || '/placeholder-album.png'}
                    alt={rating.song.title}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent>
                    <Typography variant="subtitle1" noWrap gutterBottom>
                      {rating.song.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap gutterBottom>
                      {rating.song.artist}
                    </Typography>
                    {rating.song.album && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {rating.song.album}
                      </Typography>
                    )}

                    <Box mt={2}>
                      <RatingStars
                        rating={rating.rating}
                        readonly={true}
                        size="small"
                      />
                    </Box>

                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      Rated {new Date(rating.updated_at).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </CardActionArea>

                <Box sx={{ p: 1, pt: 0 }}>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={(e) => handleDeleteRating(rating.song.spotify_id, e)}
                    fullWidth
                  >
                    Delete Rating
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Loading Lyrics Overlay */}
      {selectedSong && loadingLyrics && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bgcolor="rgba(0,0,0,0.5)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={9999}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default ProfilePage;
