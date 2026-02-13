"""
Insight Service
Generates natural language insights based on cost forecasts and trends.
"""

from typing import Dict, List

def generate_insights(global_forecast: Dict, service_forecasts: List[Dict]) -> List[str]:
    """
    Generate a list of insight strings based on forecast data.
    """
    insights = []
    
    # Global Trend Insight
    if global_forecast.get('trend') == 'increasing':
        increase_pct = _calculate_growth(global_forecast)
        insights.append(f"⚠️ Overall cloud spend is projected to increase by {increase_pct}% in the next period.")
    elif global_forecast.get('trend') == 'decreasing':
        decrease_pct = _calculate_growth(global_forecast)
        insights.append(f"✅ Good news: Overall spend is trending downwards by {decrease_pct}%.")
    else:
        insights.append("ℹ️ Cloud spend is relatively stable.")

    # Service-specific Insights
    sorted_services = sorted(
        service_forecasts, 
        key=lambda x: x.get('total_predicted_cost', 0), 
        reverse=True
    )
    
    # Top spender insight
    if sorted_services:
        top_svc = sorted_services[0]
        insights.append(f"🏆 {top_svc['service_name']} remains your highest cost driver, projected to cost ${top_svc['total_predicted_cost']:,.2f}.")

    # Risky Service Insight (High Growth)
    for svc in sorted_services:
        if svc.get('trend') == 'increasing':
            growth = _calculate_growth(svc)
            if growth > 15: # Threshold for "significant" growth
                insights.append(f"🚨 Attention: {svc['service_name']} costs are spiking ({growth}% growth expected).")
                break # Just one major alert is enough usually

    return insights

def _calculate_growth(data: Dict) -> int:
    """
    Calculate simple growth percentage from first to last point of forecast.
    """
    try:
        points = data.get('forecast', [])
        if not points or len(points) < 2:
            return 0
            
        start_val = points[0]['predicted_cost']
        end_val = points[-1]['predicted_cost']
        
        if start_val == 0: return 100 if end_val > 0 else 0
        
        pct = ((end_val - start_val) / start_val) * 100
        return round(abs(pct))
    except:
        return 0
