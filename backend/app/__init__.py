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
    CORS(app,
         resources={r"/*": {
             "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
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
    from .routes.auth import auth_bp
    from .routes.spotify import spotify_bp
    from .routes.genius import genius_bp
    from .routes.lyrics import lyrics_bp

    # Make limiter available to blueprints
    app.limiter = limiter

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(spotify_bp, url_prefix='/spotify')
    app.register_blueprint(genius_bp, url_prefix='/genius')
    app.register_blueprint(lyrics_bp, url_prefix='/lyrics')

    return app