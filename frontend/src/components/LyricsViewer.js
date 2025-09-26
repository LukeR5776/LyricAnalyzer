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
import { OpenInNew, MusicNote, Info, Album } from '@mui/icons-material';
import AnnotationViewer from './AnnotationViewer';
import AboutViewer from './AboutViewer';

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

  // Format and display lyrics with better handling
  const formatLyricsDisplay = (lyrics) => {
    // Handle null, undefined, or explicit "not available" messages
    if (!lyrics ||
        lyrics === "Lyrics not available" ||
        lyrics.toLowerCase().includes("visit genius.com") ||
        lyrics.toLowerCase().includes("go to genius.com")) {
      return {
        content: "Lyrics not currently available",
        isUnavailable: true,
        message: "We're having trouble retrieving the full lyrics right now. The annotations below may still provide valuable insights into this song's meaning."
      };
    }

    // Check if we have substantial lyrics content
    if (lyrics.length > 100) {
      return {
        content: lyrics,
        isUnavailable: false,
        message: null
      };
    }

    // Handle short/placeholder content
    return {
      content: "Lyrics preview not available",
      isUnavailable: true,
      message: "The full lyrics are available on Genius.com. Click 'View on Genius' above to see them, or explore the annotations below for insights into this song."
    };
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
          <Tab label="About" icon={<Album />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 0 && (
          <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            {(() => {
              const lyricsInfo = formatLyricsDisplay(lyricsData.lyrics);
              return (
                <>
                  <Typography
                    variant="body1"
                    sx={{
                      whiteSpace: 'pre-line',
                      lineHeight: 1.8,
                      color: lyricsInfo.isUnavailable ? 'text.secondary' : 'text.primary',
                      fontStyle: lyricsInfo.isUnavailable ? 'italic' : 'normal'
                    }}
                  >
                    {lyricsInfo.content}
                  </Typography>

                  {lyricsInfo.message && (
                    <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1} border={1} borderColor="grey.200">
                      <Typography variant="body2" color="text.secondary">
                        <Info sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                        {lyricsInfo.message}
                      </Typography>
                      {lyricsData.genius_match?.url && (
                        <Box mt={1}>
                          <Link
                            component="button"
                            variant="body2"
                            onClick={openGeniusPage}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                          >
                            <OpenInNew fontSize="small" />
                            Open full lyrics on Genius.com
                          </Link>
                        </Box>
                      )}
                    </Box>
                  )}

                  {!lyricsInfo.isUnavailable && (
                    <Box mt={3} p={2} bgcolor="background.paper" borderRadius={1}>
                      <Typography variant="caption" color="text.secondary">
                        💡 Full song analysis and annotations are available in the Annotations tab above.
                      </Typography>
                    </Box>
                  )}
                </>
              );
            })()}
          </Box>
        )}

        {activeTab === 1 && (
          <AnnotationViewer annotations={lyricsData.annotations || []} />
        )}

        {activeTab === 2 && (
          <AboutViewer
            songDetails={lyricsData.song_details}
            geniusMatch={lyricsData.genius_match}
          />
        )}
      </Box>
    </Paper>
  );
};

export default LyricsViewer;