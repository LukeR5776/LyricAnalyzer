from flask import Blueprint, jsonify
import time

health_bp = Blueprint('health', __name__)

# Startup time for uptime calculation
START_TIME = time.time()

@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Simple health check endpoint that doesn't require authentication or complex CORS.
    Used by frontend for backend detection.
    """
    uptime = time.time() - START_TIME
    return jsonify({
        'status': 'healthy',
        'uptime_seconds': round(uptime, 2),
        'service': 'Lyrica Backend API'
    }), 200

@health_bp.route('/ping', methods=['GET'])
def ping():
    """Ultra-simple ping endpoint"""
    return 'pong', 200
