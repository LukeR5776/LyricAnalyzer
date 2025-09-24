from flask import Blueprint, request, jsonify, session, current_app, redirect
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import uuid
import logging
import time

auth_bp = Blueprint('auth', __name__)

def get_spotify_oauth():
    """Create Spotify OAuth object with current app config"""
    return SpotifyOAuth(
        client_id=current_app.config['SPOTIFY_CLIENT_ID'],
        client_secret=current_app.config['SPOTIFY_CLIENT_SECRET'],
        redirect_uri=current_app.config['SPOTIFY_REDIRECT_URI'],
        scope="user-read-currently-playing user-read-playback-state",
        cache_handler=None  # We'll handle tokens manually
    )

@auth_bp.route('/spotify/login')
def spotify_login():
    """Initiate Spotify OAuth flow"""
    try:
        sp_oauth = get_spotify_oauth()

        # Generate a random state for security
        state = str(uuid.uuid4())
        session['oauth_state'] = state

        # Debug logging
        current_app.logger.info(f"DEBUG LOGIN: Setting state in session: {state}")
        current_app.logger.info(f"DEBUG LOGIN: Session ID: {session.get('_id', 'No session ID')}")
        current_app.logger.info(f"DEBUG LOGIN: Session contents: {dict(session)}")

        auth_url = sp_oauth.get_authorize_url(state=state)

        return jsonify({
            'success': True,
            'auth_url': auth_url,
            'state': state
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@auth_bp.route('/spotify/callback')
def spotify_callback():
    """Handle Spotify OAuth callback and process tokens directly"""
    try:
        # Get OAuth parameters
        code = request.args.get('code')
        state = request.args.get('state')
        error = request.args.get('error')

        current_app.logger.info(f"DEBUG OAUTH CALLBACK: code={bool(code)}, state={state}, error={error}")

        if error:
            current_app.logger.error(f"OAuth error: {error}")
            return f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authentication Error</title>
                <style>
                    body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; text-align: center; }}
                    .error {{ color: #d73a49; }}
                </style>
            </head>
            <body>
                <h2 class="error">Authentication Error</h2>
                <p>An error occurred during authentication: {error}</p>
                <p>You can close this window and try again in the app.</p>
            </body>
            </html>
            """, 400

        if not code:
            current_app.logger.error("No authorization code received")
            return f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authentication Error</title>
                <style>
                    body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; text-align: center; }}
                    .error {{ color: #d73a49; }}
                </style>
            </head>
            <body>
                <h2 class="error">Authentication Error</h2>
                <p>No authorization code received from Spotify.</p>
                <p>You can close this window and try again in the app.</p>
            </body>
            </html>
            """, 400

        # Exchange code for tokens directly
        sp_oauth = get_spotify_oauth()
        token_info = sp_oauth.get_access_token(code)

        if not token_info:
            current_app.logger.error("Failed to exchange code for tokens")
            return f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authentication Error</title>
                <style>
                    body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; text-align: center; }}
                    .error {{ color: #d73a49; }}
                </style>
            </head>
            <body>
                <h2 class="error">Authentication Failed</h2>
                <p>Failed to exchange authorization code for access tokens.</p>
                <p>You can close this window and try again in the app.</p>
            </body>
            </html>
            """, 400

        # Store tokens in a temporary global cache accessible across sessions
        # This solves the session context mismatch between browser and Electron
        if not hasattr(current_app, '_auth_cache'):
            current_app._auth_cache = {}

        # Store with state as key so any session can retrieve it
        current_app._auth_cache[state] = {
            'spotify_token': token_info,
            'completed': True,
            'timestamp': time.time()
        }

        # Also store in regular session for immediate use (browser context)
        session['spotify_token'] = token_info

        current_app.logger.info(f"Stored auth in global cache with state: {state}")

        current_app.logger.info(f"Successfully authenticated and stored tokens. State: {state}")

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authentication Successful!</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    margin: 40px;
                    text-align: center;
                    background: linear-gradient(135deg, #1db954, #1ed760);
                    color: white;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }}
                .success {{ color: #fff; font-size: 24px; margin-bottom: 20px; }}
                .message {{ font-size: 16px; opacity: 0.9; }}
                .close-btn {{
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 25px;
                    margin-top: 20px;
                    cursor: pointer;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="success">✓ Authentication Successful!</div>
            <div class="message">You have successfully connected your Spotify account.</div>
            <div class="message">You can now close this window and return to the app.</div>
            <button class="close-btn" onclick="window.close()">Close Window</button>
            <script>
                // Auto-close after 3 seconds
                setTimeout(() => window.close(), 3000);
            </script>
        </body>
        </html>
        """

    except Exception as e:
        current_app.logger.error(f"OAuth callback error: {str(e)}")
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authentication Error</title>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; text-align: center; }}
                .error {{ color: #d73a49; }}
            </style>
        </head>
        <body>
            <h2 class="error">Authentication Error</h2>
            <p>An unexpected error occurred: {str(e)}</p>
            <p>You can close this window and try again in the app.</p>
        </body>
        </html>
        """, 500

@auth_bp.route('/spotify/exchange', methods=['POST'])
def spotify_exchange():
    """Exchange authorization code for tokens (called from Electron app)"""
    try:
        data = request.get_json()
        code = data.get('code')
        state = data.get('state')

        if not code:
            return jsonify({
                'success': False,
                'error': 'No authorization code provided'
            }), 400

        current_app.logger.info(f"Exchanging code for tokens: code={bool(code)}, state={state}")

        # Exchange code for tokens
        sp_oauth = get_spotify_oauth()
        token_info = sp_oauth.get_access_token(code)

        if not token_info:
            return jsonify({
                'success': False,
                'error': 'Failed to get access token'
            }), 400

        # Store token info in session (now that we're back in Electron's context)
        session['spotify_token'] = token_info

        current_app.logger.info("Successfully exchanged code for tokens and stored in session")

        return jsonify({
            'success': True,
            'message': 'Successfully authenticated with Spotify',
            'expires_at': token_info.get('expires_at')
        })

    except Exception as e:
        current_app.logger.error(f"Token exchange error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@auth_bp.route('/spotify/claim', methods=['POST'])
def spotify_claim():
    """Claim completed authentication tokens using state parameter"""
    try:
        data = request.get_json()
        state = data.get('state')

        if not state:
            return jsonify({
                'success': False,
                'error': 'State parameter required'
            }), 400

        # Check if auth is completed for this state
        if not hasattr(current_app, '_auth_cache'):
            current_app._auth_cache = {}

        auth_data = current_app._auth_cache.get(state)

        if not auth_data:
            return jsonify({
                'success': False,
                'authenticated': False,
                'message': 'No completed authentication found for this state'
            })

        # Check if auth is recent (within 10 minutes)
        if time.time() - auth_data['timestamp'] > 600:
            # Clean up expired auth
            del current_app._auth_cache[state]
            return jsonify({
                'success': False,
                'authenticated': False,
                'message': 'Authentication expired'
            })

        # Move the token to this session
        session['spotify_token'] = auth_data['spotify_token']

        # Clean up the temporary auth cache
        del current_app._auth_cache[state]

        current_app.logger.info(f"Successfully claimed auth for state: {state}")

        return jsonify({
            'success': True,
            'authenticated': True,
            'message': 'Authentication claimed successfully',
            'expires_at': auth_data['spotify_token'].get('expires_at')
        })

    except Exception as e:
        current_app.logger.error(f"Auth claim error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@auth_bp.route('/spotify/refresh')
def spotify_refresh():
    """Refresh Spotify access token"""
    try:
        token_info = session.get('spotify_token')
        if not token_info:
            return jsonify({
                'success': False,
                'error': 'No token found'
            }), 401

        sp_oauth = get_spotify_oauth()

        # Check if token needs refresh
        if sp_oauth.is_token_expired(token_info):
            token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
            session['spotify_token'] = token_info

        return jsonify({
            'success': True,
            'expires_at': token_info.get('expires_at')
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@auth_bp.route('/spotify/status')
def spotify_status():
    """Check Spotify authentication status"""
    try:
        token_info = session.get('spotify_token')
        if not token_info:
            return jsonify({
                'authenticated': False,
                'message': 'No Spotify token found'
            })

        sp_oauth = get_spotify_oauth()

        # Check if token is expired
        if sp_oauth.is_token_expired(token_info):
            return jsonify({
                'authenticated': False,
                'message': 'Token expired',
                'expired': True
            })

        return jsonify({
            'authenticated': True,
            'expires_at': token_info.get('expires_at')
        })

    except Exception as e:
        return jsonify({
            'authenticated': False,
            'error': str(e)
        }), 500

@auth_bp.route('/spotify/logout')
def spotify_logout():
    """Logout from Spotify"""
    session.pop('spotify_token', None)
    session.pop('oauth_state', None)

    return jsonify({
        'success': True,
        'message': 'Successfully logged out from Spotify'
    })