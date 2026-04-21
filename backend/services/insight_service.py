"""
Insight Service - Smart Cost Insights
Generates natural language insights based on cost forecasts, trends, and detailed analysis.

Features:
- Time period comparison (current vs previous)
- Insight detection (increase, decrease, spikes)
- Root cause approximation (region analysis)
- Severity scoring and sorting
- Edge case handling
"""

from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

# Constants
MIN_PERCENTAGE_CHANGE = 15  # Percentage threshold for insights

# Currency-specific thresholds and symbols
CURRENCY_CONFIG = {
    'USD': {'symbol': '$', 'min_cost_difference': 5, 'spike_threshold': 200},
    'EUR': {'symbol': '€', 'min_cost_difference': 5, 'spike_threshold': 180},
    'GBP': {'symbol': '£', 'min_cost_difference': 4, 'spike_threshold': 160},
    'INR': {'symbol': '₹', 'min_cost_difference': 100, 'spike_threshold': 5000},
    'JPY': {'symbol': '¥', 'min_cost_difference': 500, 'spike_threshold': 50000},
    'CNY': {'symbol': '¥', 'min_cost_difference': 30, 'spike_threshold': 1500},
}

MIN_COST_AMOUNT = 10        # Ignore costs below this threshold
SPIKE_MULTIPLIER = 1.5      # Cost spike = average * SPIKE_MULTIPLIER
TOP_INSIGHTS_LIMIT = 3      # Return top N insights


def get_currency_config(currency: str = 'USD') -> Dict:
    """Get currency-specific configuration (symbol and thresholds)."""
    return CURRENCY_CONFIG.get(currency.upper(), CURRENCY_CONFIG['USD'])


def detect_cost_currency(cost_data: List[Dict]) -> str:
    """
    Detect the currency from cost records.
    Returns the most common currency in the dataset, defaults to 'USD'.
    """
    if not cost_data:
        return 'USD'
    
    currencies = [record.get('currency', 'USD') for record in cost_data if record.get('currency')]
    if not currencies:
        return 'USD'
    
    # Get most common currency
    from collections import Counter
    currency_counts = Counter(currencies)
    most_common_currency = currency_counts.most_common(1)[0][0]
    
    return most_common_currency.upper()


# ───────────────────────────────────────────────────────────────────────────
# LEGACY FUNCTIONS (Maintained for backward compatibility)
# ───────────────────────────────────────────────────────────────────────────

def generate_insights(global_forecast: Dict, service_forecasts: List[Dict]) -> List[str]:
    """
    Legacy function: Generate insights from forecast data.
    Maintained for backward compatibility.
    """
    insights = []
    
    # Global Trend Insight
    if global_forecast.get('trend') == 'increasing':
        increase_pct = _calculate_growth(global_forecast)
        insights.append(f" Overall cloud spend is projected to increase by {increase_pct}% in the next period.")
    elif global_forecast.get('trend') == 'decreasing':
        decrease_pct = _calculate_growth(global_forecast)
        insights.append(f" Good news: Overall spend is trending downwards by {decrease_pct}%.")
    else:
        insights.append(" Cloud spend is relatively stable.")

    # Service-specific Insights
    sorted_services = sorted(
        service_forecasts, 
        key=lambda x: x.get('total_predicted_cost', 0), 
        reverse=True
    )
    
    # Top spender insight
    if sorted_services:
        top_svc = sorted_services[0]
        insights.append(f" {top_svc['service_name']} remains your highest cost driver, projected to cost ${top_svc['total_predicted_cost']:,.2f}.")

    # Risky Service Insight (High Growth)
    for svc in sorted_services:
        if svc.get('trend') == 'increasing':
            growth = _calculate_growth(svc)
            if growth > 15: # Threshold for "significant" growth
                insights.append(f" Attention: {svc['service_name']} costs are spiking ({growth}% growth expected).")
                break # Just one major alert is enough usually

    return insights

def _calculate_growth(data: Dict) -> int:
    """
    Calculate simple growth percentage from first to last point of forecast.
    Legacy function.
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


# ───────────────────────────────────────────────────────────────────────────
# SMART COST INSIGHTS - TIME COMPARISON LOGIC
# ───────────────────────────────────────────────────────────────────────────

def calculate_period_cost(costs_data: List[Dict], service: Optional[str] = None) -> float:
    """
    Calculate total cost for a period, optionally filtered by service.
    
    Args:
        costs_data: List of cost records with 'cost' and optional 'service' fields
        service: Filter by specific service (optional)
    
    Returns:
        Total cost for the period
    """
    total = 0.0
    for record in costs_data:
        if record.get('cost') is None:
            continue
        
        if service and record.get('service', '').lower() != service.lower():
            continue
        
        try:
            total += float(record['cost'])
        except (ValueError, TypeError):
            logger.warning(f"Invalid cost value: {record.get('cost')}")
            continue
    
    return total


def get_percentage_change(current: float, previous: float) -> float:
    """
    Calculate percentage change between two values.
    Handles division by zero.
    
    Formula: ((current - previous) / previous) * 100
    
    Args:
        current: Current period value
        previous: Previous period value
    
    Returns:
        Percentage change (can be negative for decreases)
    """
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    
    return ((current - previous) / previous) * 100


def split_into_periods(cost_data: List[Dict], days: int) -> Tuple[List[Dict], List[Dict]]:
    """
    Split cost data into current and previous periods of equal length.
    
    Args:
        cost_data: Sorted list of cost records with 'date' field (YYYY-MM-DD)
        days: Number of days in each period
    
    Returns:
        Tuple of (current_period_data, previous_period_data)
    """
    if not cost_data or len(cost_data) < 2:
        return cost_data, []
    
    try:
        # Parse dates to find the split point
        dates = sorted(set(record.get('date') for record in cost_data if record.get('date')))
        
        if len(dates) < days:
            return cost_data, []
        
        split_index = len(dates) - days
        split_date = dates[split_index]
        
        current = [r for r in cost_data if r.get('date', '') >= split_date]
        previous = [r for r in cost_data if r.get('date', '') < split_date and 
                   r.get('date', '') >= dates[max(0, split_index - days)]]
        
        return current, previous
    except Exception as e:
        logger.error(f"Error splitting periods: {e}")
        return cost_data, []


# ───────────────────────────────────────────────────────────────────────────
# SMART COST INSIGHTS - SPIKE DETECTION
# ───────────────────────────────────────────────────────────────────────────

def detect_spikes(cost_data: List[Dict], service: Optional[str] = None) -> List[Dict]:
    """
    Detect cost spikes in daily data.
    Spike = any day where cost > (average * SPIKE_MULTIPLIER)
    
    Args:
        cost_data: List of daily cost records with 'date' and 'cost' fields
        service: Filter by specific service (optional)
    
    Returns:
        List of spike records with date, service, cost, and average
    """
    spikes = []
    
    # Filter by service if provided
    filtered_data = cost_data
    if service:
        filtered_data = [r for r in cost_data if r.get('service', '').lower() == service.lower()]
    
    if not filtered_data or len(filtered_data) < 3:
        return spikes
    
    # Calculate average cost (excluding the highest outlier for robustness)
    costs = [float(r.get('cost', 0)) for r in filtered_data 
             if r.get('cost') is not None and float(r.get('cost', 0)) >= MIN_COST_AMOUNT]
    
    if not costs:
        return spikes
    
    # Use median instead of mean for better outlier resistance
    costs_sorted = sorted(costs)
    average = sum(costs_sorted[:-1]) / len(costs_sorted[:-1]) if len(costs_sorted) > 1 else costs_sorted[0]
    spike_threshold = average * SPIKE_MULTIPLIER
    
    # Find spikes
    for record in filtered_data:
        cost = float(record.get('cost', 0))
        if cost >= spike_threshold:
            spikes.append({
                'date': record.get('date'),
                'service': record.get('service', 'Unknown'),
                'cost': cost,
                'average': average,
                'excess': cost - average
            })
    
    return sorted(spikes, key=lambda x: x['cost'], reverse=True)


# ───────────────────────────────────────────────────────────────────────────
# SMART COST INSIGHTS - ROOT CAUSE APPROXIMATION
# ───────────────────────────────────────────────────────────────────────────

def analyze_region_contribution(current_data: List[Dict], previous_data: List[Dict], 
                               service: str) -> Tuple[Optional[str], float]:
    """
    Analyze which region contributed most to cost change for a service.
    
    Args:
        current_data: Current period cost records
        previous_data: Previous period cost records
        service: Service name to analyze
    
    Returns:
        Tuple of (top_region, contribution_percentage)
    """
    current_by_region = defaultdict(float)
    previous_by_region = defaultdict(float)
    
    for record in current_data:
        if record.get('service', '').lower() == service.lower():
            region = record.get('region', 'unknown')
            current_by_region[region] += float(record.get('cost', 0))
    
    for record in previous_data:
        if record.get('service', '').lower() == service.lower():
            region = record.get('region', 'unknown')
            previous_by_region[region] += float(record.get('cost', 0))
    
    if not current_by_region:
        return None, 0.0
    
    # Find region with largest increase
    max_increase = 0
    top_region = None
    
    for region in current_by_region:
        current = current_by_region[region]
        previous = previous_by_region.get(region, 0)
        increase = current - previous
        
        if increase > max_increase:
            max_increase = increase
            top_region = region
    
    # Calculate contribution percentage
    total_change = sum(current_by_region.values()) - sum(previous_by_region.values())
    if total_change == 0:
        return top_region, 0.0
    
    contribution = (max_increase / abs(total_change)) * 100 if total_change != 0 else 0
    
    return top_region, contribution


def get_root_cause(current_data: List[Dict], previous_data: List[Dict], 
                   service: str, change_type: str) -> str:
    """
    Generate root cause explanation based on available data.
    
    Args:
        current_data: Current period data
        previous_data: Previous period data
        service: Service name
        change_type: 'increase', 'decrease', or 'spike'
    
    Returns:
        Root cause explanation string
    """
    if change_type == 'increase':
        region, _ = analyze_region_contribution(current_data, previous_data, service)
        if region and region.lower() != 'unknown':
            return f"mainly driven by {region}"
        return "likely due to increased usage or new resources"
    
    elif change_type == 'decrease':
        return "due to reduced usage or removed resources"
    
    elif change_type == 'spike':
        return "temporary spike detected in usage"
    
    return "cost change detected"


# ───────────────────────────────────────────────────────────────────────────
# SMART COST INSIGHTS - SEVERITY & CONFIDENCE
# ───────────────────────────────────────────────────────────────────────────

def calculate_severity(percentage_change: float, cost_difference: float) -> str:
    """
    Calculate severity level based on percentage change and cost difference.
    
    Rules:
    - > 50% change → high
    - 20–50% → medium
    - <20% → low
    
    Args:
        percentage_change: Percentage change value (can be negative)
        cost_difference: Absolute cost difference
    
    Returns:
        'high', 'medium', or 'low'
    """
    abs_percentage = abs(percentage_change)
    
    if abs_percentage > 50 or cost_difference > 500:
        return 'high'
    elif abs_percentage >= 20 or cost_difference > 200:
        return 'medium'
    else:
        return 'low'


def calculate_confidence_score(data_points: int, consistency: float) -> float:
    """
    Calculate confidence score based on data availability and consistency.
    
    Factors:
    - Number of data points (more = higher confidence)
    - Consistency of measurements (less variance = higher confidence)
    
    Args:
        data_points: Number of records in the period
        consistency: Coefficient of variation (0-1, lower is better)
    
    Returns:
        Confidence score (0-100)
    """
    # Base confidence on data points
    point_score = min(data_points / 30 * 100, 80)
    
    # Adjust for consistency
    consistency_score = max(0, (1 - min(consistency, 1)) * 20)
    
    return min(point_score + consistency_score, 100)


# ───────────────────────────────────────────────────────────────────────────
# SMART COST INSIGHTS - MAIN GENERATION ENGINE
# ───────────────────────────────────────────────────────────────────────────

def generate_smart_insights(cost_data: List[Dict], period_days: int = 7, currency: str = None) -> List[Dict]:
    """
    Generate comprehensive cost insights from cost data.
    
    Main Function: Orchestrates all insight generation.
    
    Args:
        cost_data: List of cost records with date, service, region, cost fields
        period_days: Number of days for period comparison (default: 7)
        currency: Currency code (USD, EUR, GBP, INR, etc.). If None, auto-detect from data.
    
    Returns:
        List of insight dictionaries with type, service, message, severity, confidence
    """
    insights = []
    
    if not cost_data or len(cost_data) < 2:
        return insights
    
    # Auto-detect currency if not provided
    if not currency:
        currency = detect_cost_currency(cost_data)
    
    currency_config = get_currency_config(currency)
    min_cost_difference = currency_config['min_cost_difference']
    
    try:
        # Split data into periods
        current_data, previous_data = split_into_periods(cost_data, period_days)
        
        if not current_data or not previous_data:
            # Fall back to spike detection only
            return _detect_spike_insights(current_data, currency)
        
        # Get unique services
        services = set(r.get('service', 'Unknown') for r in cost_data if r.get('service'))
        
        # Generate comparison insights for each service
        for service in services:
            if service.lower() == 'unknown':
                continue
            
            current_cost = calculate_period_cost(current_data, service)
            previous_cost = calculate_period_cost(previous_data, service)
            
            # Skip if costs too small
            if current_cost < MIN_COST_AMOUNT and previous_cost < MIN_COST_AMOUNT:
                continue
            
            # Skip if no change
            if current_cost == previous_cost:
                continue
            
            # Calculate metrics
            percentage_change = get_percentage_change(current_cost, previous_cost)
            cost_difference = current_cost - previous_cost
            
            # Check if insight threshold met (use currency-specific threshold)
            if abs(percentage_change) < MIN_PERCENTAGE_CHANGE and abs(cost_difference) < min_cost_difference:
                continue
            
            # Determine insight type
            if cost_difference > 0:
                insight_type = 'increase'
                message_template = f"{service} cost increased by {{pct}}% compared to previous {period_days} days"
            else:
                insight_type = 'decrease'
                message_template = f"{service} cost decreased by {{pct}}% compared to previous {period_days} days"
            
            # Get root cause
            root_cause = get_root_cause(current_data, previous_data, service, insight_type)
            
            # Build message
            message = message_template.format(pct=abs(round(percentage_change, 1)))
            if root_cause:
                message += f", {root_cause}"
            
            # Calculate confidence
            data_count = len(current_data) + len(previous_data)
            costs_current = [float(r.get('cost', 0)) for r in current_data 
                           if r.get('service', '').lower() == service.lower() and r.get('cost')]
            if costs_current and len(costs_current) > 1:
                avg_cost = sum(costs_current) / len(costs_current)
                variance = sum((c - avg_cost) ** 2 for c in costs_current) / len(costs_current)
                consistency = (variance ** 0.5) / avg_cost if avg_cost > 0 else 1
            else:
                consistency = 0.5
            
            confidence = calculate_confidence_score(data_count, consistency)
            
            # Create insight
            insight = {
                'type': insight_type,
                'service': service,
                'message': message,
                'severity': calculate_severity(percentage_change, abs(cost_difference)),
                'confidence': round(confidence, 1),
                'current_cost': round(current_cost, 2),
                'previous_cost': round(previous_cost, 2),
                'percentage_change': round(percentage_change, 2),
                'cost_difference': round(cost_difference, 2),
                'period_days': period_days,
                'currency': currency
            }
            
            insights.append(insight)
        
        # Add spike insights
        spike_insights = _detect_spike_insights(current_data, currency)
        insights.extend(spike_insights)
        
    except Exception as e:
        logger.error(f"Error generating smart insights: {e}")
        return []
    
    # Sort by severity and impact
    severity_order = {'high': 0, 'medium': 1, 'low': 2}
    insights.sort(
        key=lambda x: (
            severity_order.get(x['severity'], 3),
            -abs(x.get('cost_difference', 0)),
            -x.get('confidence', 0)
        )
    )
    
    # Return top insights
    return insights[:TOP_INSIGHTS_LIMIT]


def _detect_spike_insights(cost_data: List[Dict], currency: str = 'USD') -> List[Dict]:
    """
    Helper function to detect spike insights from cost data.
    
    Args:
        cost_data: Cost records with date, service, cost fields
        currency: Currency code for formatting (default: USD)
    
    Returns:
        List of spike insights
    """
    spikes = []
    currency_config = get_currency_config(currency)
    currency_symbol = currency_config['symbol']
    spike_threshold = currency_config['spike_threshold']
    
    services = set(r.get('service', 'Unknown') for r in cost_data if r.get('service'))
    
    for service in services:
        if service.lower() == 'unknown':
            continue
        
        detected_spikes = detect_spikes(cost_data, service)
        
        for spike in detected_spikes[:1]:  # Only top spike per service
            spike_date = spike.get('date', 'Unknown')
            excess_cost = spike.get('excess', 0)
            
            message = f"Cost spike detected on {spike_date} for {service}: {currency_symbol}{round(excess_cost, 2)} higher than average"
            
            insight = {
                'type': 'spike',
                'service': service,
                'message': message,
                'severity': 'high' if excess_cost > spike_threshold else 'medium',
                'confidence': 85.0,
                'spike_date': spike_date,
                'spike_cost': round(spike.get('cost', 0), 2),
                'average_cost': round(spike.get('average', 0), 2),
                'excess': round(excess_cost, 2),
                'currency': currency
            }
            
            spikes.append(insight)
    
    return spikes


# ───────────────────────────────────────────────────────────────────────────
# SMART COST INSIGHTS - OUTPUT FORMATTING
# ───────────────────────────────────────────────────────────────────────────

def format_insights(insights: List[Dict], format_type: str = 'json') -> List[Dict]:
    """
    Format insights for output/display.
    
    Args:
        insights: List of generated insights
        format_type: Output format ('json', 'summary')
    
    Returns:
        Formatted insights
    """
    if format_type == 'summary':
        return [
            {
                'type': i['type'],
                'service': i['service'],
                'message': i['message'],
                'severity': i['severity']
            }
            for i in insights
        ]
    
    return insights


def get_insights_summary(insights: List[Dict]) -> Dict:
    """
    Get summary statistics of insights.
    
    Args:
        insights: List of insights
    
    Returns:
        Summary dictionary - FRONTEND FORMAT
    """
    severity_counts = defaultdict(int)
    type_counts = defaultdict(int)
    total_cost_impact = 0
    
    for insight in insights:
        severity_counts[insight.get('severity', 'low')] += 1
        type_counts[insight.get('type', 'unknown')] += 1
        total_cost_impact += abs(insight.get('cost_difference', 0))
    
    # Format for frontend: individual severity keys
    return {
        'total_insights': len(insights),
        'high_severity': severity_counts.get('high', 0),
        'medium_severity': severity_counts.get('medium', 0),
        'low_severity': severity_counts.get('low', 0),
        'total_cost_impact': round(total_cost_impact, 2)
    }
