# Lyrics Scraper - Spotify + Genius Integration

A tool that integrates with Spotify and Genius.com to display online annotations for song lyrics, helping users understand the meaning behind lyrics as they listen to their music.

## Features

- Real-time Spotify playback monitoring
- Automatic lyrics fetching from Genius
- Interactive annotation display
- Cross-platform desktop application

## Architecture

- **Backend**: Python Flask API with Spotify and Genius integration
- **Frontend**: Electron + React desktop application
- **Data**: SQLite caching with rate-limited API calls

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
python app/main.py
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## API Keys Required

- Spotify Client ID and Secret
- Genius API Access Token

## Project Structure

```
├── backend/           # Python Flask API
│   ├── app/          # Application code
│   └── tests/        # Unit tests
├── frontend/         # Electron + React app
└── docs/            # Documentation
```