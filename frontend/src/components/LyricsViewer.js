import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Tabs,
  Tab,
  Divider,
  Chip,
  Link
} from '@mui/material';
import { OpenInNew, MusicNote, Info } from '@mui/icons-material';
import AnnotationViewer from './AnnotationViewer';

const LyricsViewer = ({ lyricsData }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const openGeniusPage = () => {
    if (lyricsData.genius_match?.url && window.electronAPI) {
      window.electronAPI.openExternal(lyricsData.genius_match.url);
    }
  };

  // Note: We're not displaying full lyrics to respect copyright
  const formatLyricsPreview = (lyrics) => {
    if (!lyrics || lyrics === "Lyrics not available") {
      return "Lyrics not available for this track.";
    }

    // Show just a preview or indication that lyrics are available
    return "Lyrics are available on Genius.com. Click 'View on Genius' to see the full lyrics.";
  };

  return (
    <Paper sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">
              {lyricsData.genius_match?.title || 'Lyrics & Annotations'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              by {lyricsData.genius_match?.artist}
            </Typography>
          </Box>

          {lyricsData.genius_match?.url && (
            <Link
              component="button"
              variant="body2"
              onClick={openGeniusPage}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              View on Genius
              <OpenInNew fontSize="small" />
            </Link>
          )}
        </Box>

        {/* Stats */}
        <Box mt={1}>
          <Chip
            size="small"
            icon={<Info />}
            label={`${lyricsData.annotation_count || 0} annotations`}
            variant="outlined"
            sx={{ mr: 1 }}
          />
          {lyricsData.genius_match?.stats?.pageviews && (
            <Chip
              size="small"
              label={`${lyricsData.genius_match.stats.pageviews} views`}
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Lyrics" icon={<MusicNote />} iconPosition="start" />
          <Tab
            label={`Annotations (${lyricsData.annotation_count || 0})`}
            icon={<Info />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 0 && (
          <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
              {formatLyricsPreview(lyricsData.lyrics)}
            </Typography>

            {lyricsData.lyrics && lyricsData.lyrics !== "Lyrics not available" && (
              <Box mt={3} p={2} bgcolor="background.paper" borderRadius={1}>
                <Typography variant="caption" color="text.secondary">
                  Note: Full lyrics are available on Genius.com. This preview respects copyright restrictions.
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <AnnotationViewer annotations={lyricsData.annotations || []} />
        )}
      </Box>
    </Paper>
  );
};

export default LyricsViewer;