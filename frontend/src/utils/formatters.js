// Utility functions for formatting data

export const formatDuration = (ms) => {
  if (!ms || ms < 0) return '0:00';

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const formatProgressPercent = (progress, duration) => {
  if (!duration || duration <= 0) return 0;
  return Math.min(Math.max((progress / duration) * 100, 0), 100);
};

export const stripHtmlTags = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
};

export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const formatNumber = (num) => {
  if (!num) return '0';

  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }

  return num.toString();
};

export const getArtistString = (artists) => {
  if (!artists || !Array.isArray(artists)) return 'Unknown Artist';
  return artists.join(', ');
};

export const normalizeSearchTerm = (term) => {
  return term
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
};

export const getImageUrl = (images, size = 'medium') => {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return null;
  }

  // Spotify image sizes are typically ordered from largest to smallest
  switch (size) {
    case 'large':
      return images[0]?.url;
    case 'medium':
      return images[Math.floor(images.length / 2)]?.url || images[0]?.url;
    case 'small':
      return images[images.length - 1]?.url;
    default:
      return images[0]?.url;
  }
};