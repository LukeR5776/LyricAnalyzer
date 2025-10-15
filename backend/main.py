from app import create_app
import os
import logging
import json
import socket

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def find_available_port(preferred_port, host='localhost'):
    """Find an available port, starting with the preferred port"""
    port = preferred_port
    max_attempts = 10

    for attempt in range(max_attempts):
        try:
            # Try to bind to the port
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            sock.bind((host, port))
            sock.close()
            return port
        except OSError:
            # Port is busy, try next one
            print(f"Port {port} is busy, trying {port + 1}...")
            port += 1

    raise RuntimeError(f"Could not find available port after {max_attempts} attempts")

def write_port_config(port, host='localhost'):
    """Write the port configuration to a JSON file for frontend to read"""
    config_path = os.path.join(os.path.dirname(__file__), 'port-config.json')
    config = {
        'port': port,
        'host': host,
        'url': f'http://{host}:{port}'
    }

    try:
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        print(f"Port configuration written to: {config_path}")
    except Exception as e:
        print(f"Warning: Could not write port config: {e}")

def main():
    """Main entry point for the application"""
    app = create_app()

    # Get configuration from environment
    host = os.getenv('HOST', 'localhost')
    preferred_port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

    # Only write port config on first run (not on Flask debug restarts)
    # Check if we're in the reloader process
    is_reloader = os.environ.get('WERKZEUG_RUN_MAIN') == 'true'

    if not is_reloader:
        # Find an available port (only on first run)
        port = find_available_port(preferred_port, host)

        if port != preferred_port:
            print(f"Warning: Preferred port {preferred_port} was busy, using port {port} instead")

        # Write port configuration for frontend
        write_port_config(port, host)

        # Store the actual port in environment for reloader process
        os.environ['ACTUAL_PORT'] = str(port)
    else:
        # On reloader restart, use the stored port
        port = int(os.environ.get('ACTUAL_PORT', preferred_port))

    print(f"Starting Lyrica API server...")
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