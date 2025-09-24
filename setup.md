# Setup Instructions for Lyrics Scraper

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn
- Spotify Developer Account
- Genius API Access

## API Setup

### 1. Spotify API Setup
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Note your Client ID and Client Secret
4. Add `http://localhost:8080/callback` to Redirect URIs
5. Save your app

### 2. Genius API Setup
1. Go to [Genius API](https://genius.com/api-clients)
2. Create a new API client
3. Note your Access Token

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create environment file:
```bash
cp .env.example .env
```

5. Edit `.env` file with your API credentials:
```env
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:8080/callback
GENIUS_ACCESS_TOKEN=your_genius_access_token_here
SECRET_KEY=your_secret_key_here
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Development Mode

1. Start the backend API:
```bash
cd backend
python app/main.py
```

2. In a new terminal, start the frontend:
```bash
cd frontend
npm run electron-dev
```

### Production Build

1. Build the React app:
```bash
cd frontend
npm run build
```

2. Build the Electron app:
```bash
npm run dist
```

## Usage

1. Launch the application
2. Click "Connect Spotify" and authorize in your browser
3. Start playing music in Spotify
4. View lyrics and annotations in real-time!

## Troubleshooting

### Common Issues

**"No Spotify token found"**
- Make sure you've completed the OAuth flow
- Check that your redirect URI matches exactly

**"No matching song found on Genius"**
- Some songs may not be available on Genius
- Try playing a more popular/mainstream song

**"Rate limit exceeded"**
- The app respects API rate limits
- Wait a moment and try again

**Backend won't start**
- Make sure you've installed Python dependencies
- Check that your `.env` file is configured correctly
- Verify Python 3.8+ is installed

**Frontend won't start**
- Make sure you've run `npm install`
- Check that Node.js 16+ is installed
- Try deleting `node_modules` and running `npm install` again

### Debug Mode

To enable debug mode:
1. Set `FLASK_DEBUG=True` in your `.env` file
2. The backend will provide more detailed error messages

### Port Issues

If port 5000 is in use:
1. Change `PORT=5000` in your `.env` file to another port
2. Update the `API_BASE_URL` in `frontend/src/services/apiService.js`

## Features

- ✅ Real-time Spotify track detection
- ✅ Automatic lyrics fetching from Genius
- ✅ Interactive annotation viewer
- ✅ Rate-limited API calls
- ✅ Cross-platform desktop app
- ✅ Dark theme UI
- ✅ Auto-refresh functionality

## Limitations

- Requires Spotify Premium for best experience
- Full lyrics display respects copyright (shows previews only)
- Some songs may not have annotations available
- Rate limited by Spotify and Genius APIs