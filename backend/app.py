"""
Cloud Cost Behaviour Analytics and Anomaly Detection API
Main Flask application entry point with MongoDB Atlas integration.
"""

import logging

# Suppress unnecessary logs but keep ERROR level visible
logging.basicConfig(level=logging.WARNING)
logging.getLogger('prophet').setLevel(logging.CRITICAL)
logging.getLogger('prophet.plot').setLevel(logging.CRITICAL)
logging.getLogger('werkzeug').setLevel(logging.WARNING)
logging.getLogger('database').setLevel(logging.CRITICAL)
logging.getLogger('__main__').setLevel(logging.WARNING)

from dotenv import load_dotenv

# Load environment variables before importing Config
load_dotenv()

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database import Database, create_indexes
from routes.auth_routes import auth_routes
from routes.cost_routes import cost_routes
from routes.anomaly_routes import anomaly_routes
from routes.forecast_routes import forecast_routes
from routes.report_routes import report_routes

logger = logging.getLogger(__name__)


def create_app(config=Config):
    """
    Application factory pattern.
    Creates and configures the Flask application.
    """
    app = Flask(__name__)
    
    app.config.from_object(config)
    
    # Initialize MongoDB connection
    if Database.initialize():
        create_indexes()
    else:
        logger.error("Failed to connect to MongoDB Atlas. Check MONGODB_URI in .env")
    
    # Enable CORS (include both /api/* and upload endpoint)
    CORS(app, resources={
        r"/api/*": {
            "origins": config.CORS_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Disposition", "Content-Type"]
        },
        r"/upload-cost-data": {
            "origins": config.CORS_ORIGINS,
            "methods": ["POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Disposition", "Content-Type"]
        }
    })
    
    # Register blueprints (routes)
    app.register_blueprint(auth_routes)
    app.register_blueprint(cost_routes)
    app.register_blueprint(anomaly_routes)
    app.register_blueprint(forecast_routes)
    app.register_blueprint(report_routes)
    from routes.budget_routes import budget_routes
    app.register_blueprint(budget_routes)
    from routes.ingestion_routes import ingestion_routes
    app.register_blueprint(ingestion_routes)
    
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
                'GET /api/auth/me',
                'POST /api/costs/ingest',
                'POST /api/costs/ingest/bulk',
                'POST /api/costs/upload',
                'GET /api/costs/upload/template',
                'GET /api/costs',
                'GET /api/costs/summary'
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
    import warnings
    warnings.filterwarnings('ignore')
    
    try:
        app = create_app()
        
        print("Server starting on http://127.0.0.1:5000")

        # On Windows, Flask debug mode can hang. Use production mode for reliability.
        # The server will still reload route changes since use_reloader is handled internally.
        app.run(
            host='127.0.0.1',
            port=5000,
            debug=False,  # Disable Flask debug mode to avoid Windows hanging issues
            use_reloader=False,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\nServer stopped")
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
    finally:
        Database.close()
