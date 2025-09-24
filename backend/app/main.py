from flask import Flask
import os
import sys
import logging

# Add the parent directory to the path so we can import the app module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def main():
    """Main entry point for the application"""
    app = create_app()

    # Get configuration from environment
    host = os.getenv('HOST', 'localhost')
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

    print(f"Starting Lyrics Scraper API server...")
    print(f"Server running at: http://{host}:{port}")
    print(f"Debug mode: {debug}")
    print("\nAvailable endpoints:")
    print("  Auth: /auth/spotify/login, /auth/spotify/callback, /auth/spotify/status")
    print("  Spotify: /spotify/current-track, /spotify/playback-state")
    print("  Genius: /genius/search, /genius/song/<id>")
    print("  Lyrics: /lyrics/current, /lyrics/search, /lyrics/sync")

    app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    main()