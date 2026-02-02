"""
Cloud Cost Behaviour Analytics and Anomaly Detection API
Main Flask application entry point with MongoDB Atlas integration.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from database import Database, create_indexes
from routes.auth_routes import auth_routes
from routes.cost_routes import cost_routes
from routes.anomaly_routes import anomaly_routes
from services.simple_cost_trends import parse_and_store_csv, get_monthly_cost_trends


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
        print(" Failed to connect to MongoDB Atlas")
        print("Please check your MONGODB_URI in .env file")
    
    # Enable CORS (include both /api/* and upload endpoint)
    CORS(app, resources={
        r"/api/*": {
            "origins": config.CORS_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        },
        r"/upload-cost-data": {
            "origins": config.CORS_ORIGINS,
            "methods": ["POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Register blueprints (routes)
    app.register_blueprint(auth_routes)
    app.register_blueprint(cost_routes)
    app.register_blueprint(anomaly_routes)
    
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

    @app.route('/upload-cost-data', methods=['POST'])
    def upload_cost_data():
        """
        CSV upload endpoint for simple cost trends.

        Requirements:
        - Accepts a CSV file upload
        - Validates required columns:
          provider, service_name, cost, usage_start_date, usage_end_date
        - Validates date format YYYY-MM-DD
        - Validates cost is numeric
        - Stores raw rows in `cost_records` collection
        """
        if 'file' not in request.files:
            return jsonify({"error": "No file part in request. Use form-data with key 'file'."}), 400

        file = request.files['file']

        success, payload = parse_and_store_csv(file)
        if not success:
            return jsonify(payload), 400

        return jsonify({
            "success": True,
            **payload
        }), 201

    @app.route('/api/cost-trends', methods=['GET'])
    def cost_trends():
        """
        Get monthly cost trends based on data in `cost_records`.

        Response format:
        {
            "labels": ["2024-01", "2024-02", ...],
            "values": [15420, 17890, ...]
        }

        Handles empty datasets gracefully by returning empty arrays.
        """
        trends = get_monthly_cost_trends()
        return jsonify(trends), 200
    
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
    
    print(" Server starting on http://localhost:5000")
    
    try:
        app.run(
            host='127.0.0.1',
            port=5000,
            debug=True,
            use_reloader=True,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n\n Server stopped")
    except Exception as e:
        print(f"\n Server error: {e}")
    finally:
        Database.close()
