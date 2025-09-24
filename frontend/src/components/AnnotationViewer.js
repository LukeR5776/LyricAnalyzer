import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Link,
  Stack,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  OpenInNew,
  ThumbUp,
  Verified,
  Person
} from '@mui/icons-material';

const AnnotationViewer = ({ annotations }) => {
  const [expanded, setExpanded] = useState(false);

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const openAnnotationUrl = (url) => {
    if (url && window.electronAPI) {
      window.electronAPI.openExternal(url);
    }
  };

  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  };

  if (!annotations || annotations.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No annotations available for this song.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Annotations are user-contributed explanations of lyrics on Genius.com
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Stack spacing={2}>
        {annotations.map((annotation, index) => (
          <Accordion
            key={annotation.id || index}
            expanded={expanded === `panel${index}`}
            onChange={handleAccordionChange(`panel${index}`)}
            elevation={2}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              sx={{ bgcolor: 'background.default' }}
            >
              <Box sx={{ width: '100%' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    "{annotation.fragment || 'Lyric annotation'}"
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="center">
                    {annotation.verified && (
                      <Chip
                        size="small"
                        icon={<Verified />}
                        label="Verified"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    {annotation.votes_total > 0 && (
                      <Chip
                        size="small"
                        icon={<ThumbUp />}
                        label={annotation.votes_total}
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </Box>

                {annotation.authors && annotation.authors.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    by {annotation.authors.map(author => author.name || author.login).join(', ')}
                  </Typography>
                )}
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Stack spacing={2}>
                {/* Annotation Content */}
                <Box>
                  <Typography variant="body2" paragraph>
                    {stripHtml(annotation.body) || 'No explanation available.'}
                  </Typography>

                  {annotation.body && annotation.body.includes('<') && (
                    <Typography variant="caption" color="text.secondary">
                      Note: Rich formatting available on Genius.com
                    </Typography>
                  )}
                </Box>

                <Divider />

                {/* Authors */}
                {annotation.authors && annotation.authors.length > 0 && (
                  <Box>
                    <Typography variant="caption" fontWeight="bold" gutterBottom>
                      Contributors:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {annotation.authors.slice(0, 3).map((author, authorIndex) => (
                        <Chip
                          key={authorIndex}
                          size="small"
                          avatar={
                            author.avatar ? (
                              <Avatar src={author.avatar.tiny?.url} sx={{ width: 20, height: 20 }}>
                                <Person fontSize="small" />
                              </Avatar>
                            ) : (
                              <Avatar sx={{ width: 20, height: 20 }}>
                                <Person fontSize="small" />
                              </Avatar>
                            )
                          }
                          label={author.name || author.login || 'Anonymous'}
                          variant="outlined"
                        />
                      ))}
                      {annotation.authors.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{annotation.authors.length - 3} more
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                )}

                {/* Cosigners */}
                {annotation.cosigned_by && annotation.cosigned_by.length > 0 && (
                  <Box>
                    <Typography variant="caption" fontWeight="bold" gutterBottom>
                      Cosigned by:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {annotation.cosigned_by.slice(0, 3).map((cosigner, cosignerIndex) => (
                        <Chip
                          key={cosignerIndex}
                          size="small"
                          label={cosigner.name || cosigner.login || 'User'}
                          color="secondary"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Actions */}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    {annotation.votes_total > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {annotation.votes_total} vote{annotation.votes_total !== 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Box>

                  {annotation.url && (
                    <Button
                      size="small"
                      endIcon={<OpenInNew />}
                      onClick={() => openAnnotationUrl(annotation.url)}
                    >
                      View on Genius
                    </Button>
                  )}
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}

        {/* Footer */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" align="center" display="block">
            Annotations are community-contributed explanations from Genius.com users.
            Visit Genius.com to contribute your own insights!
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default AnnotationViewer;