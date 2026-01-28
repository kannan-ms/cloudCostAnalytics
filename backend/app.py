"""
Cloud Cost Behaviour Analytics and Anomaly Detection API
Main Flask application entry point with MongoDB Atlas integration.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database import Database, create_indexes
from routes.auth_routes import auth_routes
from routes.cost_routes import cost_routes


def create_app(config=Config):
    """
    Application factory pattern.
    Creates and configures the Flask application.
    """
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config)
    
    # Initialize MongoDB connection
    if Database.initialize():
        create_indexes()
    else:
        print("❌ Failed to connect to MongoDB Atlas")
        print("Please check your MONGODB_URI in .env file")
    
    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": config.CORS_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Register blueprints (routes)
    app.register_blueprint(auth_routes)
    app.register_blueprint(cost_routes)
    
    # Root endpoint
    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            'application': 'Cloud Cost Behaviour Analytics and Anomaly Detection',
            'version': '1.0.0',
            'status': 'running',
            'database': 'MongoDB Atlas',
            'api_base': '/api',
            'endpoints': {
                'health': '/api/health',
                'auth': {
                    'register': '/api/auth/register',
                    'login': '/api/auth/login',
                    'verify': '/api/auth/verify',
                    'me': '/api/auth/me'
                }
            }
        }), 200
    
    @app.route('/api', methods=['GET'])
    def api_root():
        return jsonify({
            'message': 'Cloud Cost Analytics API',
            'database': 'MongoDB Atlas',
            'available_endpoints': [
                'GET /api/health',
                'POST /api/auth/register',
                'POST /api/auth/login',
                'GET /api/auth/verify',
                'GET /api/auth/me'
            ]
        }), 200
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Health check endpoint to verify API and database status."""
        from datetime import datetime
        try:
            # Check database connection
            db = Database.get_db()
            db.command('ping')
            db_status = 'connected'
        except Exception as e:
            db_status = f'disconnected: {str(e)}'
        
        return jsonify({
            'status': 'healthy',
            'database': db_status,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource does not exist',
            'status': 404
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'status': 500
        }), 500
    
    return app


if __name__ == '__main__':
    import logging
    import os
    
    # Suppress werkzeug logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    app = create_app()
    
    print("\n" + "="*60)
    print("🚀 Server starting on http://localhost:5000")
    print("="*60)
    print("Press CTRL+C to stop the server")
    print("="*60 + "\n")
    
    try:
        app.run(
            host='127.0.0.1',
            port=5000,
            debug=False,
            use_reloader=False,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n\n✅ Server stopped")
    except Exception as e:
        print(f"\n❌ Server error: {e}")
    finally:
        Database.close()
