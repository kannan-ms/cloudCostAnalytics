"""
Anomaly Detection Service - Rule-Based Cost Anomaly Detection
Detects cost spikes, new services, and continuous increases without ML
"""

from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from bson import ObjectId
from database import get_collection, Collections
from models import Anomaly


def delete_all_anomalies_for_user(user_id: str) -> bool:
    """
    Delete all anomalies for a specific user.
    """
    try:
        anomalies_collection = get_collection(Collections.ANOMALIES)
        anomalies_collection.delete_many({"user_id": ObjectId(user_id)})
        return True
    except Exception as e:
        print(f"Error clearing user anomalies: {e}")
        return False


def get_reference_date(user_id: str) -> datetime:
    """
    Get the reference date for anomaly detection.
    Uses the latest date in the user's data, or current time if no data exists.
    """
    try:
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        latest = costs_collection.find_one(
            {"user_id": ObjectId(user_id)},
            sort=[("usage_start_date", -1)]
        )
        
        if latest and "usage_start_date" in latest:
            date_val = latest["usage_start_date"]
            if isinstance(date_val, str):
                # Handle simplified ISO format (YYYY-MM-DD) or full ISO
                if "T" in date_val:
                    return datetime.fromisoformat(date_val.replace("Z", "+00:00"))
                else:
                    return datetime.fromisoformat(date_val)
            elif isinstance(date_val, datetime):
                return date_val
    except Exception as e:
        print(f"Error getting reference date: {e}")
        
    return datetime.utcnow()


def calculate_service_average(user_id: str, service_name: str, days: int = 30, reference_date: datetime = None) -> float:
    """
    Calculate average cost for a service over the last N days.
    """
    costs_collection = get_collection(Collections.CLOUD_COSTS)
    
    if reference_date is None:
        reference_date = get_reference_date(user_id)
    
    end_date = reference_date
    start_date = end_date - timedelta(days=days)
    
    # Ensure we compare using datetime objects, not strings
    
    pipeline = [
        {
            "$match": {
                "user_id": ObjectId(user_id),
                "service_name": service_name,
                "usage_start_date": {"$gte": start_date, "$lte": end_date}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_cost": {"$sum": "$cost"},
                "count": {"$sum": 1}
            }
        }
    ]
    
    result = list(costs_collection.aggregate(pipeline))
    
    if result and result[0]['count'] > 0:
        return result[0]['total_cost'] / result[0]['count']
    
    return 0.0


def detect_cost_spike(user_id: str, threshold_multiplier: float = 1.4) -> List[Dict]:
    """
    Detect cost spikes (current cost > threshold × average cost).
    """
    anomalies = []
    costs_collection = get_collection(Collections.CLOUD_COSTS)
    
    # Use data-driven reference date
    reference_date = get_reference_date(user_id)
    
    # Get recent costs (last 30 days from reference date) to scan the full potential period
    recent_date = reference_date - timedelta(days=30)
    
    recent_costs = list(costs_collection.find({
        "user_id": ObjectId(user_id),
        "usage_start_date": {"$gte": recent_date}
    }))
    
    # Group by service
    service_costs = {}
    for cost in recent_costs:
        service = cost['service_name']
        if service not in service_costs:
            service_costs[service] = []
        service_costs[service].append(cost)
    
    # Check each service
    for service, costs in service_costs.items():
        # Calculate average for this service using the data we already fetched
        # This avoids N database queries
        total_service_cost = sum(c['cost'] for c in costs)
        avg_cost = total_service_cost / len(costs) if costs else 0
        
        if avg_cost == 0:
            continue
        
        # Check each recent cost entry
        for cost_entry in costs:
            current_cost = cost_entry['cost']
            
            # Detect spike
            if current_cost > (avg_cost * threshold_multiplier):
                deviation = ((current_cost - avg_cost) / avg_cost) * 100
                
                # Determine severity
                if current_cost > (avg_cost * 3):
                    severity = "high"
                elif current_cost > (avg_cost * 2.5):
                    severity = "medium"
                else:
                    severity = "low"
                
                anomaly = {
                    "user_id": user_id,
                    "cost_id": str(cost_entry['_id']),
                    "service_name": service,
                    "detected_value": current_cost,
                    "expected_value": avg_cost,
                    "threshold": avg_cost * threshold_multiplier,
                    "deviation_percentage": round(deviation, 2),
                    "severity": severity,
                    "type": "cost_spike",
                    "message": f"Cost spike detected for {service}: ${current_cost:.2f} (expected: ${avg_cost:.2f}, {deviation:.1f}% increase)",
                    "recommendation": generate_spike_recommendation(service, current_cost, avg_cost),
                    "detected_at": cost_entry['usage_start_date'],
                    "region": cost_entry.get('region', 'N/A'),
                    "resource_id": cost_entry.get('resource_id', 'N/A')
                }
                
                anomalies.append(anomaly)
    
    return anomalies


def detect_new_services(user_id: str, lookback_days: int = 60) -> List[Dict]:
    """
    Detect newly appeared services that weren't used before.
    """
    anomalies = []
    costs_collection = get_collection(Collections.CLOUD_COSTS)
    
    reference_date = get_reference_date(user_id)
    
    # Get recent services (last 7 days)
    recent_date = reference_date - timedelta(days=7)
    recent_services = costs_collection.distinct("service_name", {
        "user_id": ObjectId(user_id),
        "usage_start_date": {"$gte": recent_date}
    })
    
    # Get historical services (before last 7 days)
    historical_date = reference_date - timedelta(days=lookback_days)
    historical_services = set(costs_collection.distinct("service_name", {
        "user_id": ObjectId(user_id),
        "usage_start_date": {"$gte": historical_date, "$lt": recent_date}
    }))
    
    # Find new services
    new_services = [s for s in recent_services if s not in historical_services]
    
    # Get cost details for new services
    for service in new_services:
        cost_entries = list(costs_collection.find({
            "user_id": ObjectId(user_id),
            "service_name": service,
            "usage_start_date": {"$gte": recent_date}
        }).sort("usage_start_date", 1))
        
        if cost_entries:
            total_cost = sum(c['cost'] for c in cost_entries)
            
            anomaly = {
                "user_id": user_id,
                "cost_id": str(cost_entries[0]['_id']),
                "service_name": service,
                "detected_value": total_cost,
                "expected_value": 0,
                "threshold": 0,
                "deviation_percentage": 100.0,
                "severity": "medium" if total_cost > 100 else "low",
                "type": "new_service",
                "message": f"New service detected: {service} with total cost ${total_cost:.2f}",
                "recommendation": generate_new_service_recommendation(service, total_cost),
                "detected_at": cost_entries[0]['usage_start_date'],
                "region": cost_entries[0].get('region', 'N/A'),
                "resource_id": cost_entries[0].get('resource_id', 'N/A')
            }
            
            anomalies.append(anomaly)
    
    return anomalies


def detect_continuous_increase(user_id: str, days: int = 3) -> List[Dict]:
    """
    Detect services with continuous cost increases over N consecutive days.
    """
    anomalies = []
    costs_collection = get_collection(Collections.CLOUD_COSTS)
    
    reference_date = get_reference_date(user_id)
    
    # Get costs for the last 30 days
    recent_date = reference_date - timedelta(days=30)
    
    # Group by service and date  
    pipeline = [
        {
            "$match": {
                "user_id": ObjectId(user_id),
                "usage_start_date": {"$gte": recent_date}
            }
        },
        {
            "$group": {
                "_id": {
                    "service": "$service_name",
                    "date": "$usage_start_date"
                },
                "total_cost": {"$sum": "$cost"}
            }
        },
        {
            "$sort": {"_id.service": 1, "_id.date": 1}
        }
    ]
    
    results = list(costs_collection.aggregate(pipeline))
    
    # Group by service
    service_daily_costs = {}
    for r in results:
        service = r['_id']['service']
        date = r['_id']['date']
        cost = r['total_cost']
        
        if service not in service_daily_costs:
            service_daily_costs[service] = []
        service_daily_costs[service].append((date, cost))
    
    # Check for continuous increases
    for service, daily_costs in service_daily_costs.items():
        if len(daily_costs) < days:
            continue
        
        # Check each window of N days
        for i in range(len(daily_costs) - days + 1):
            window = daily_costs[i:i+days]
            
            # Check if costs are increasing
            is_increasing = all(window[j][1] < window[j+1][1] for j in range(len(window)-1))
            
            if is_increasing:
                first_cost = window[0][1]
                last_cost = window[-1][1]
                increase_pct = ((last_cost - first_cost) / first_cost) * 100 if first_cost > 0 else 0
                
                # Only report significant increases
                if increase_pct > 10:
                    severity = "high" if increase_pct > 50 else "medium" if increase_pct > 25 else "low"
                    
                    anomaly = {
                        "user_id": user_id,
                        "cost_id": "",
                        "service_name": service,
                        "detected_value": last_cost,
                        "expected_value": first_cost,
                        "threshold": first_cost * 1.1,
                        "deviation_percentage": round(increase_pct, 2),
                        "severity": severity,
                        "type": "continuous_increase",
                        "message": f"Continuous cost increase for {service}: ${first_cost:.2f} → ${last_cost:.2f} over {days} days ({increase_pct:.1f}% increase)",
                        "recommendation": generate_continuous_increase_recommendation(service, increase_pct),
                        "detected_at": window[-1][0],
                        "region": "N/A",
                        "resource_id": "N/A"
                    }
                    
                    anomalies.append(anomaly)
                    break  # Only report once per service
    
    return anomalies


def generate_spike_recommendation(service: str, current_cost: float, avg_cost: float) -> str:
    """Generate recommendation for cost spike."""
    increase = current_cost - avg_cost
    
    recommendations = [
        f"Investigate {service} for unexpected usage increase",
        f"Check for new resources or increased capacity in {service}",
        f"Review recent changes in {service} configuration",
        f"Consider shutting down unused {service} resources",
        f"Verify if the ${increase:.2f} increase is expected"
    ]
    
    return " | ".join(recommendations)


def generate_new_service_recommendation(service: str, cost: float) -> str:
    """Generate recommendation for new service."""
    return f"New service {service} detected with ${cost:.2f} cost. Verify if this service is required and properly configured. Review resource allocation and cost optimization options."


def generate_continuous_increase_recommendation(service: str, increase_pct: float) -> str:
    """Generate recommendation for continuous increase."""
    return f"{service} costs have been increasing continuously ({increase_pct:.1f}%). Investigate usage patterns, check for resource scaling issues, and consider cost optimization strategies."


def run_anomaly_detection_for_user(user_id: str) -> Tuple[bool, any]:
    """
    Run all anomaly detection rules and store results.
    
    Args:
        user_id: User's ID
    
    Returns:
        (success, results_or_error)
    """
    try:
        all_anomalies = []
        
        # Run all detection rules
        spike_anomalies = detect_cost_spike(user_id, threshold_multiplier=1.4)
        new_service_anomalies = detect_new_services(user_id)
        continuous_increase_anomalies = detect_continuous_increase(user_id, days=3)
        
        all_anomalies.extend(spike_anomalies)
        all_anomalies.extend(new_service_anomalies)
        all_anomalies.extend(continuous_increase_anomalies)
        
        # Store anomalies in database
        anomalies_collection = get_collection(Collections.ANOMALIES)
        
        # Reference date for deduplication check window
        reference_date = get_reference_date(user_id)
        dedup_start_date = reference_date - timedelta(days=7)
        
        # 1. Fetch existing anomalies in bulk to avoid N queries
        existing_anomalies = list(anomalies_collection.find({
            "user_id": ObjectId(user_id),
            "status": {"$in": ["new", "acknowledged"]},
            "detected_at": {"$gte": dedup_start_date}
        }, {"service_name": 1, "type": 1}))
        
        # Create a set of (service_name, type) for fast lookup
        existing_keys = set((a['service_name'], a['type']) for a in existing_anomalies)

        documents_to_insert = []
        
        for anomaly in all_anomalies:
            # Check if similar anomaly already exists (deduplication)
            key = (anomaly['service_name'], anomaly['type'])
            
            if key not in existing_keys:
                anomaly_doc = Anomaly.create_document(
                    user_id=anomaly['user_id'],
                    cost_id=anomaly['cost_id'] or "000000000000000000000000",
                    service_name=anomaly['service_name'],
                    detected_value=anomaly['detected_value'],
                    expected_value=anomaly['expected_value'],
                    threshold=anomaly['threshold'],
                    severity=anomaly['severity'],
                    message=anomaly['message'],
                    detected_at=anomaly.get('detected_at')
                )
                
                # Add extra fields
                anomaly_doc['type'] = anomaly['type']
                anomaly_doc['recommendation'] = anomaly['recommendation']
                anomaly_doc['region'] = anomaly['region']
                anomaly_doc['resource_id'] = anomaly['resource_id']
                
                documents_to_insert.append(anomaly_doc)
                # Add to set to prevent duplicates within the same batch
                existing_keys.add(key)
        
        stored_count = 0
        if documents_to_insert:
            result = anomalies_collection.insert_many(documents_to_insert)
            stored_count = len(result.inserted_ids)
        
        return True, {
            "total_detected": len(all_anomalies),
            "stored": stored_count,
            "anomalies": all_anomalies,
            "breakdown": {
                "cost_spikes": len(spike_anomalies),
                "new_services": len(new_service_anomalies),
                "continuous_increases": len(continuous_increase_anomalies)
            }
        }
        
    except Exception as e:
        return False, f"Error running anomaly detection: {str(e)}"


def get_user_anomalies(
    user_id: str,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50
) -> Tuple[bool, any]:
    """
    Get anomalies for a user with optional filtering.
    
    Args:
        user_id: User's ID
        status: Filter by status (new, acknowledged, resolved, ignored)
        severity: Filter by severity (low, medium, high)
        limit: Maximum number of results
    
    Returns:
        (success, anomalies_or_error)
    """
    try:
        anomalies_collection = get_collection(Collections.ANOMALIES)
        
        query = {"user_id": ObjectId(user_id)}
        
        if status:
            query["status"] = status
        if severity:
            query["severity"] = severity
        
        anomalies = list(anomalies_collection.find(query).sort("detected_at", -1).limit(limit))
        
        # Convert to JSON-serializable format
        for anomaly in anomalies:
            anomaly['_id'] = str(anomaly['_id'])
            anomaly['user_id'] = str(anomaly['user_id'])
            if isinstance(anomaly.get('cost_id'), ObjectId):
                anomaly['cost_id'] = str(anomaly['cost_id'])
            anomaly['detected_at'] = anomaly['detected_at'].isoformat()
            if anomaly.get('acknowledged_at'):
                anomaly['acknowledged_at'] = anomaly['acknowledged_at'].isoformat()
            if anomaly.get('resolved_at'):
                anomaly['resolved_at'] = anomaly['resolved_at'].isoformat()
        
        return True, {"anomalies": anomalies, "count": len(anomalies)}
        
    except Exception as e:
        return False, f"Error retrieving anomalies: {str(e)}"


def update_anomaly_status(
    user_id: str,
    anomaly_id: str,
    status: str
) -> Tuple[bool, any]:
    """
    Update anomaly status.
    
    Args:
        user_id: User's ID
        anomaly_id: Anomaly ID
        status: New status (acknowledged, resolved, ignored)
    
    Returns:
        (success, message)
    """
    try:
        anomalies_collection = get_collection(Collections.ANOMALIES)
        
        update_fields = {"status": status, "updated_at": datetime.utcnow()}
        
        if status == "acknowledged":
            update_fields["acknowledged_at"] = datetime.utcnow()
        elif status == "resolved":
            update_fields["resolved_at"] = datetime.utcnow()
        
        result = anomalies_collection.update_one(
            {"_id": ObjectId(anomaly_id), "user_id": ObjectId(user_id)},
            {"$set": update_fields}
        )
        
        if result.modified_count == 0:
            return False, "Anomaly not found or no changes made"
        
        return True, f"Anomaly status updated to {status}"
        
    except Exception as e:
        return False, f"Error updating anomaly: {str(e)}"

# Alias for backward compatibility or external calls expecting this name
run_anomaly_detection = run_anomaly_detection_for_user
