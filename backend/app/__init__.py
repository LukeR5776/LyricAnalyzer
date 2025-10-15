from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['SPOTIFY_CLIENT_ID'] = os.getenv('SPOTIFY_CLIENT_ID')
    app.config['SPOTIFY_CLIENT_SECRET'] = os.getenv('SPOTIFY_CLIENT_SECRET')
    app.config['SPOTIFY_REDIRECT_URI'] = os.getenv('SPOTIFY_REDIRECT_URI')
    app.config['GENIUS_ACCESS_TOKEN'] = os.getenv('GENIUS_ACCESS_TOKEN')

    # Session configuration for proper cookie handling
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_DOMAIN'] = None  # Allow cookies on all subdomains/IPs
    app.config['SESSION_COOKIE_PATH'] = '/'
    app.config['SESSION_PERMANENT'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)

    # Enable CORS with proper configuration for credentials and cross-origin requests
    # Support common frontend ports (3000-3003) and backend ports (5000-5003) to handle port conflicts
    allowed_origins = [
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3001", "http://127.0.0.1:3001",
        "http://localhost:3002", "http://127.0.0.1:3002",
        "http://localhost:3003", "http://127.0.0.1:3003",
        "http://localhost:5000", "http://127.0.0.1:5000",
        "http://localhost:5001", "http://127.0.0.1:5001",
        "http://localhost:5002", "http://127.0.0.1:5002",
        "http://localhost:5003", "http://127.0.0.1:5003"
    ]

    CORS(app,
         resources={r"/*": {
             "origins": allowed_origins,
             "supports_credentials": True,
             "allow_headers": ["Content-Type", "Authorization"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "expose_headers": ["Content-Type", "Authorization"]
         }})

    # Rate limiting with higher limits for auth endpoints
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["500 per day", "200 per hour"]
    )

    # Register blueprints
    from .routes.health import health_bp
    from .routes.auth import auth_bp
    from .routes.spotify import spotify_bp
    from .routes.genius import genius_bp
    from .routes.lyrics import lyrics_bp
    from .routes.ratings import ratings_bp

    # Make limiter available to blueprints
    app.limiter = limiter

    # Health check endpoint (no prefix, no rate limit)
    app.register_blueprint(health_bp)

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(spotify_bp, url_prefix='/spotify')
    app.register_blueprint(genius_bp, url_prefix='/genius')
    app.register_blueprint(lyrics_bp, url_prefix='/lyrics')
    app.register_blueprint(ratings_bp, url_prefix='/ratings')

    return app