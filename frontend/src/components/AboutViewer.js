import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Stack,
  Divider,
  Grid,
  Link
} from '@mui/material';
import {
  Album,
  Person,
  DateRange,
  MusicNote,
  OpenInNew,
  Info
} from '@mui/icons-material';

const AboutViewer = ({ songDetails, geniusMatch }) => {
  // Function to safely render description content (HTML or plain text)
  const renderDescription = (description) => {
    if (!description) return null;

    // Check for malformed JSON/DOM content (like what we see in the screenshot)
    const isMalformedContent = description.includes("{'tag':") ||
                              description.includes('"tag":') ||
                              description.includes('children":') ||
                              description.includes("'children':");

    if (isMalformedContent) {
      // If this looks like malformed DOM/JSON, show a fallback message
      return (
        <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, fontStyle: 'italic' }}>
          <Typography variant="body2" color="text.secondary">
            Song description is available on Genius but could not be formatted properly.
            Please visit the Genius page for full details.
          </Typography>
        </Box>
      );
    }

    // Check if the description contains HTML tags
    const hasHTMLTags = /<[^>]*>/g.test(description);

    if (hasHTMLTags) {
      // For HTML content, create a simple sanitized version
      // Remove script tags and dangerous attributes, but keep basic formatting
      const sanitizedHTML = description
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
        .replace(/on\w+='[^']*'/gi, ''); // Remove event handlers with single quotes

      return (
        <Box
          dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
          sx={{
            '& p': { mb: 1 },
            '& a': { color: 'primary.main', textDecoration: 'none' },
            '& a:hover': { textDecoration: 'underline' },
            '& strong': { fontWeight: 'bold' },
            '& em': { fontStyle: 'italic' }
          }}
        />
      );
    } else {
      // For plain text, just return as is
      return description;
    }
  };

  if (!songDetails) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No song information available.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Song details could not be retrieved from Genius.
        </Typography>
      </Box>
    );
  }

  const formatArtistList = (artists) => {
    if (!artists || artists.length === 0) return 'Not available';
    return artists.map(artist => artist.name || artist).join(', ');
  };

  const openLink = (url) => {
    if (url && window.electronAPI) {
      window.electronAPI.openExternal(url);
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Song Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar
                variant="rounded"
                sx={{ width: 120, height: 120 }}
                src={songDetails.song_art_image_url}
              >
                <Album sx={{ fontSize: 60 }} />
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h5" gutterBottom>
                {songDetails.title_with_featured || songDetails.title}
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                by {songDetails.artist}
              </Typography>
              {songDetails.release_date_for_display && (
                <Chip
                  icon={<DateRange />}
                  label={`Released: ${songDetails.release_date_for_display}`}
                  variant="outlined"
                  sx={{ mr: 1, mb: 1 }}
                />
              )}
              {songDetails.stats?.pageviews && (
                <Chip
                  icon={<Info />}
                  label={`${songDetails.stats.pageviews.toLocaleString()} views`}
                  variant="outlined"
                  sx={{ mr: 1, mb: 1 }}
                />
              )}
              {geniusMatch?.url && (
                <Box sx={{ mt: 2 }}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => openLink(geniusMatch.url)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    View full page on Genius
                    <OpenInNew fontSize="small" />
                  </Link>
                </Box>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Song Description */}
      {songDetails.description && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              About This Song
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
              {renderDescription(songDetails.description)}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Album Information */}
      {songDetails.album && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Album Information
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                variant="rounded"
                src={songDetails.album.cover_art_url}
                sx={{ width: 60, height: 60 }}
              >
                <Album />
              </Avatar>
              <Box>
                <Typography variant="subtitle1">
                  {songDetails.album.name}
                </Typography>
                {songDetails.album.release_date_for_display && (
                  <Typography variant="body2" color="text.secondary">
                    Released: {songDetails.album.release_date_for_display}
                  </Typography>
                )}
                {songDetails.album.artist && (
                  <Typography variant="body2" color="text.secondary">
                    by {songDetails.album.artist.name}
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Credits */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Credits
          </Typography>
          <Stack spacing={2}>
            {/* Primary Artist */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Primary Artist
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar
                  src={songDetails.primary_artist?.image_url}
                  sx={{ width: 32, height: 32 }}
                >
                  <Person />
                </Avatar>
                <Typography variant="body1">
                  {songDetails.primary_artist?.name || songDetails.artist}
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Featured Artists */}
            {songDetails.featured_artists && songDetails.featured_artists.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Featured Artists
                </Typography>
                <Typography variant="body1">
                  {formatArtistList(songDetails.featured_artists)}
                </Typography>
              </Box>
            )}

            {/* Producers */}
            {songDetails.producer_artists && songDetails.producer_artists.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Producers
                </Typography>
                <Typography variant="body1">
                  {formatArtistList(songDetails.producer_artists)}
                </Typography>
              </Box>
            )}

            {/* Writers */}
            {songDetails.writer_artists && songDetails.writer_artists.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Writers
                </Typography>
                <Typography variant="body1">
                  {formatArtistList(songDetails.writer_artists)}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Additional Stats */}
      {songDetails.stats && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Statistics
            </Typography>
            <Grid container spacing={2}>
              {songDetails.stats.pageviews && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Page Views
                  </Typography>
                  <Typography variant="h6">
                    {songDetails.stats.pageviews.toLocaleString()}
                  </Typography>
                </Grid>
              )}
              {songDetails.stats.annotation_count && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Annotations
                  </Typography>
                  <Typography variant="h6">
                    {songDetails.stats.annotation_count}
                  </Typography>
                </Grid>
              )}
              {songDetails.stats.contributors_count && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Contributors
                  </Typography>
                  <Typography variant="h6">
                    {songDetails.stats.contributors_count}
                  </Typography>
                </Grid>
              )}
              {songDetails.stats.unreviewed_annotations && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Pending Annotations
                  </Typography>
                  <Typography variant="h6">
                    {songDetails.stats.unreviewed_annotations}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AboutViewer;