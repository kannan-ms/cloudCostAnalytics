"""
Recommendations Routes - REST API endpoints for cost optimization suggestions and smart insights
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
from config import Config
from services import user_service, recommendation_service, cost_service
from services.insight_service import generate_smart_insights, get_insights_summary, format_insights, detect_cost_currency

recommendations_routes = Blueprint('recommendations', __name__, url_prefix='/api/recommendations')


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401
        try:
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITHM])
            current_user_id = payload['user_id']
            user = user_service.get_user_by_id(current_user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 401
            return f(current_user_id, *args, **kwargs)
        except Exception as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
    return decorated


@recommendations_routes.route('', methods=['GET'])
@token_required
def get_recommendations(current_user_id):
    """
    Get cost optimization recommendations for the user.
    GET /api/recommendations
    """
    try:
        recs = recommendation_service.RecommendationService.generate_recommendations(current_user_id)
        return jsonify({
            'success': True,
            'recommendations': recs,
            'count': len(recs)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to generate recommendations: {str(e)}'}), 500


# ── Smart Cost Insights Endpoint ──────────────────────────────────────────
@recommendations_routes.route('/smart-insights', methods=['GET'])
@token_required
def get_smart_insights(current_user_id):
    """
    Get smart cost insights with root cause analysis.
    
    GET /api/recommendations/smart-insights
    
    Query Parameters:
    - period_days: Number of days for comparison (default: 7)
    - format: Output format ('full' or 'summary', default: 'full')
    - limit: Max insights to return (default: 3)
    
    Response:
    {
        "success": true,
        "insights": [
            {
                "type": "increase",
                "service": "EC2",
                "message": "EC2 cost increased by 32% compared to last 7 days, mainly driven by us-east-1",
                "severity": "high",
                "confidence": 92.5,
                "current_cost": 450.50,
                "previous_cost": 341.21,
                "percentage_change": 32.0,
                "cost_difference": 109.29
            }
        ],
        "summary": {
            "total_insights": 3,
            "by_severity": {"high": 1, "medium": 2},
            "by_type": {"increase": 2, "spike": 1},
            "total_cost_impact": 245.67
        }
    }
    """
    try:
        period_days = int(request.args.get('period_days', 7))
        format_type = request.args.get('format', 'full')
        
        # Validate period_days
        if period_days < 1 or period_days > 90:
            return jsonify({'error': 'period_days must be between 1 and 90'}), 400
        
        # Fetch user's cost data
        cost_data = cost_service.get_user_cost_data(current_user_id, days=period_days * 2)
        
        if not cost_data:
            return jsonify({
                'success': True,
                'insights': [],
                'summary': {
                    'total_insights': 0,
                    'message': 'No cost data available for analysis'
                }
            }), 200
        
        # Detect currency from cost data
        currency = detect_cost_currency(cost_data)
        
        # Generate insights with detected currency
        insights = generate_smart_insights(cost_data, period_days=period_days, currency=currency)
        
        # Format output
        if format_type == 'summary':
            insights = format_insights(insights, format_type='summary')
        
        # Get summary
        summary = get_insights_summary(insights)
        summary['period_days'] = period_days
        
        return jsonify({
            'success': True,
            'insights': insights,
            'summary': summary
        }), 200
        
    except ValueError:
        return jsonify({'error': 'Invalid parameter: period_days must be an integer'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to generate insights: {str(e)}'}), 500


# ── Insights Endpoint (POST) ─────────────────────────────────────────────
@recommendations_routes.route('/insights', methods=['POST'])
@token_required
def get_insights(current_user_id):
    """
    Get cost insights with time period comparison.
    Frontend uses this endpoint: api.getInsights(days)
    
    POST /api/recommendations/insights
    
    Body:
    {
        "days": 30  # Optional, defaults to 30
    }
    
    Response:
    {
        "success": true,
        "insights": [...],
        "summary": {
            "total_insights": 3,
            "high_severity": 1,
            "medium_severity": 1,
            "low_severity": 1
        }
    }
    """
    try:
        # Parse request
        data = request.get_json() or {}
        days = data.get('days', 30)
        
        # Validate days parameter
        if not isinstance(days, int):
            try:
                days = int(days)
            except (ValueError, TypeError):
                return jsonify({'error': 'days must be an integer between 1 and 90'}), 400
        
        if days < 1 or days > 90:
            return jsonify({'error': 'days must be an integer between 1 and 90'}), 400
        
        # Fetch 2x days for proper period splitting (current vs previous)
        cost_data = cost_service.get_user_cost_data(current_user_id, days=days * 2)
        
        # Handle no data case
        if not cost_data or len(cost_data) == 0:
            return jsonify({
                'success': True,
                'insights': [],
                'summary': {
                    'total_insights': 0,
                    'high_severity': 0,
                    'medium_severity': 0,
                    'low_severity': 0,
                    'message': 'No cost data available for this period'
                }
            }), 200
        
        # Detect currency from cost data
        currency = detect_cost_currency(cost_data)
        
        # Generate insights with period = days (splits 2x data into 2 periods of 'days' each)
        try:
            insights = generate_smart_insights(cost_data, period_days=days, currency=currency)
        except Exception as e:
            import logging
            logging.error(f"Error in generate_smart_insights: {str(e)}", exc_info=True)
            insights = []
        
        # Get summary
        try:
            summary = get_insights_summary(insights)
        except Exception as e:
            import logging
            logging.error(f"Error in get_insights_summary: {str(e)}", exc_info=True)
            summary = {
                'total_insights': len(insights),
                'high_severity': 0,
                'medium_severity': 0,
                'low_severity': 0
            }
        
        return jsonify({
            'success': True,
            'insights': insights,
            'summary': summary
        }), 200
        
    except Exception as e:
        import logging
        logging.error(f"Error in get_insights endpoint: {str(e)}", exc_info=True)
        return jsonify({
            'error': f'Failed to generate insights: {str(e)}',
            'success': False
        }), 500


@recommendations_routes.route('/smart-insights/spike-detection', methods=['GET'])
@token_required
def detect_cost_spikes(current_user_id):
    """
    Detect cost spikes for specific service or all services.
    
    GET /api/recommendations/smart-insights/spike-detection
    
    Query Parameters:
    - service: Specific service to analyze (optional)
    - days: Days to analyze (default: 30)
    
    Response:
    {
        "success": true,
        "spikes": [
            {
                "date": "2024-04-04",
                "service": "RDS",
                "spike_cost": 450.50,
                "average_cost": 300.25,
                "excess": 150.25
            }
        ],
        "total_spikes": 1
    }
    """
    try:
        service = request.args.get('service')
        days = int(request.args.get('days', 30))
        
        if days < 1 or days > 90:
            return jsonify({'error': 'days must be between 1 and 90'}), 400
        
        # Fetch cost data
        cost_data = cost_service.get_user_cost_data(current_user_id, days=days)
        
        if not cost_data:
            return jsonify({
                'success': True,
                'spikes': [],
                'total_spikes': 0
            }), 200
        
        # Generate insights to get spike data
        from services.insight_service import detect_spikes
        
        if service:
            spikes = detect_spikes(cost_data, service=service)
        else:
            # Get spikes for all services
            all_spikes = []
            services = set(r.get('service', 'Unknown') for r in cost_data if r.get('service'))
            for svc in services:
                all_spikes.extend(detect_spikes(cost_data, service=svc))
            spikes = sorted(all_spikes, key=lambda x: x['excess'], reverse=True)
        
        # Format response
        spike_insights = [
            {
                'date': spike['date'],
                'service': spike['service'],
                'spike_cost': round(spike['cost'], 2),
                'average_cost': round(spike['average'], 2),
                'excess': round(spike['excess'], 2),
                'severity': 'high' if spike['excess'] > 200 else 'medium'
            }
            for spike in spikes
        ]
        
        return jsonify({
            'success': True,
            'spikes': spike_insights,
            'total_spikes': len(spike_insights)
        }), 200
        
    except ValueError:
        return jsonify({'error': 'Invalid parameter: days must be an integer'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to detect spikes: {str(e)}'}), 500
