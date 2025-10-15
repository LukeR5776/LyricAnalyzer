# LyricAnalyzer - Spotify + Genius Integration

An application that integrates with Spotify and Genius.com to allow users to quickly analyze the meaning of song lyrics through Genius's online annotations, helping users understand the deeper meaning behind lyrics as they listen to their music.

## Features

- Real-time Spotify playback monitoring
- Automatic lyrics fetching from Genius
- Interactive annotation display
- Cross-platform desktop application (Electron)
- OAuth authentication with Spotify
- Rate-limited API calls to respect service limits

## Architecture

- **Backend**: Python Flask API with Spotify and Genius integration
- **Frontend**: Electron + React desktop application
- **Authentication**: OAuth 2.0 with claim-based session handling
- **Data**: Session-based storage with rate-limited API calls

## Quick Start

### Easy Start (Recommended)
```bash
./start.sh
```
This will automatically start both backend and frontend with proper port configuration.

### Manual Setup

#### Backend
```bash
cd backend
pip install -r requirements.txt
PORT=5001 python3 main.py
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

> **Note**: The backend and frontend now automatically detect and sync ports at runtime, so you don't need to manually configure ports anymore!

## API Keys Required

- Spotify Client ID and Secret
- Genius API Access Token

See [setup.md](setup.md) for detailed configuration instructions.

## Project Structure

```
├── backend/           # Python Flask API
│   ├── app/          # Application code
│   └── tests/        # Unit tests
├── frontend/         # Electron + React app
└── docs/            # Documentation
```