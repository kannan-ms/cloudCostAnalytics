"""
Cost Service - Handle cloud cost data ingestion, validation, and retrieval
Production-quality service layer for cost management
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from bson import ObjectId
from database import get_collection, Collections
from config import Config


# Valid cloud providers
VALID_PROVIDERS = ['AWS', 'Azure', 'GCP', 'Other']

# Valid currencies
VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CNY']


def validate_cost_data(data: Dict) -> Tuple[bool, Optional[str]]:
    """
    Validate cost record data.
    
    Returns:
        (is_valid, error_message)
    """
    # Required fields
    required_fields = [
        'provider', 'service_name', 'cost', 
        'usage_start_date', 'usage_end_date'
    ]
    
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == '':
            return False, f"Field '{field}' is required"
    
    # Validate provider
    if data['provider'] not in VALID_PROVIDERS:
        return False, f"Provider must be one of: {', '.join(VALID_PROVIDERS)}"
    
    # Validate cost
    try:
        cost = float(data['cost'])
        if cost < 0:
            return False, "Cost must be greater than or equal to 0"
    except (ValueError, TypeError):
        return False, "Cost must be a valid number"
    
    # Validate usage_quantity if provided
    if 'usage_quantity' in data and data['usage_quantity'] is not None:
        try:
            usage_qty = float(data['usage_quantity'])
            if usage_qty < 0:
                return False, "Usage quantity must be greater than or equal to 0"
        except (ValueError, TypeError):
            return False, "Usage quantity must be a valid number"
    
    # Validate dates
    try:
        if isinstance(data['usage_start_date'], str):
            start_date = datetime.fromisoformat(data['usage_start_date'].replace('Z', '+00:00'))
        else:
            start_date = data['usage_start_date']
            
        if isinstance(data['usage_end_date'], str):
            end_date = datetime.fromisoformat(data['usage_end_date'].replace('Z', '+00:00'))
        else:
            end_date = data['usage_end_date']
        
        # Convert to naive datetime for comparison
        if start_date.tzinfo:
            start_date = start_date.replace(tzinfo=None)
        if end_date.tzinfo:
            end_date = end_date.replace(tzinfo=None)
        
        if start_date > end_date:
            return False, "usage_start_date must be before or equal to usage_end_date"
        
        # Don't allow future dates
        if start_date > datetime.utcnow():
            return False, "usage_start_date cannot be in the future"
            
    except (ValueError, TypeError) as e:
        return False, f"Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SS): {str(e)}"
    
    # Validate currency if provided
    currency = data.get('currency', 'USD')
    if currency not in VALID_CURRENCIES:
        return False, f"Currency must be one of: {', '.join(VALID_CURRENCIES)}"
    
    # Validate service_name
    if len(data['service_name'].strip()) < 1:
        return False, "Service name cannot be empty"
    
    if len(data['service_name']) > 200:
        return False, "Service name is too long (max 200 characters)"
    
    return True, None


def create_cost_record(user_id: str, cost_data: Dict) -> Tuple[bool, any]:
    """
    Create a new cost record after validation.
    
    Args:
        user_id: Authenticated user's ID
        cost_data: Dictionary containing cost information
    
    Returns:
        (success, record_id_or_error_message)
    """
    # Validate data
    is_valid, error = validate_cost_data(cost_data)
    if not is_valid:
        return False, error
    
    try:
        # Parse dates
        if isinstance(cost_data['usage_start_date'], str):
            usage_start_date = datetime.fromisoformat(cost_data['usage_start_date'].replace('Z', '+00:00'))
        else:
            usage_start_date = cost_data['usage_start_date']
            
        if isinstance(cost_data['usage_end_date'], str):
            usage_end_date = datetime.fromisoformat(cost_data['usage_end_date'].replace('Z', '+00:00'))
        else:
            usage_end_date = cost_data['usage_end_date']
        
        # Create document
        document = {
            "user_id": ObjectId(user_id),
            "provider": cost_data['provider'],
            "cloud_account_id": cost_data.get('cloud_account_id', ''),
            "service_name": cost_data['service_name'].strip(),
            "resource_id": cost_data.get('resource_id', ''),
            "region": cost_data.get('region', 'us-east-1'),
            "usage_quantity": float(cost_data.get('usage_quantity', 0)) if cost_data.get('usage_quantity') else 0,
            "usage_unit": cost_data.get('usage_unit', ''),
            "cost": float(cost_data['cost']),
            "currency": cost_data.get('currency', 'USD'),
            "usage_start_date": usage_start_date,
            "usage_end_date": usage_end_date,
            "billing_period": usage_start_date.strftime("%Y-%m"),
            "tags": cost_data.get('tags', {}),
            "metadata": cost_data.get('metadata', {}),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert into database
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        result = costs_collection.insert_one(document)
        
        return True, str(result.inserted_id)
        
    except Exception as e:
        return False, f"Error creating cost record: {str(e)}"


def bulk_ingest_costs(user_id: str, cost_records: List[Dict]) -> Tuple[bool, Dict]:
    """
    Bulk ingest multiple cost records.
    
    Args:
        user_id: Authenticated user's ID
        cost_records: List of cost data dictionaries
    
    Returns:
        (success, result_summary)
    """
    if not cost_records or len(cost_records) == 0:
        return False, {"error": "No cost records provided"}
    
    if len(cost_records) > 1000:
        return False, {"error": "Cannot ingest more than 1000 records at once"}
    
    success_count = 0
    error_count = 0
    errors = []
    inserted_ids = []
    
    for idx, record in enumerate(cost_records):
        success, result = create_cost_record(user_id, record)
        if success:
            success_count += 1
            inserted_ids.append(result)
        else:
            error_count += 1
            errors.append({
                "record_index": idx,
                "error": result
            })
    
    return True, {
        "total_records": len(cost_records),
        "success_count": success_count,
        "error_count": error_count,
        "inserted_ids": inserted_ids,
        "errors": errors[:10]  # Return first 10 errors only
    }


def get_costs(
    user_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    provider: Optional[str] = None,
    service_name: Optional[str] = None,
    region: Optional[str] = None,
    page: int = 1,
    page_size: int = None,
    sort_by: str = 'usage_start_date',
    sort_order: str = 'desc'
) -> Tuple[bool, any]:
    """
    Retrieve cost records with filtering, pagination, and sorting.
    
    Args:
        user_id: User's ID
        start_date: Filter by start date (usage_start_date >=)
        end_date: Filter by end date (usage_end_date <=)
        provider: Filter by provider
        service_name: Filter by service name
        region: Filter by region
        page: Page number (1-indexed)
        page_size: Number of records per page
        sort_by: Field to sort by
        sort_order: 'asc' or 'desc'
    
    Returns:
        (success, results_or_error)
    """
    try:
        # Build query
        query = {"user_id": ObjectId(user_id)}
        
        # Date range filter
        if start_date:
            query["usage_start_date"] = {"$gte": start_date}
        if end_date:
            if "usage_start_date" in query:
                query["usage_start_date"]["$lte"] = end_date
            else:
                query["usage_end_date"] = {"$lte": end_date}
        
        # Provider filter
        if provider:
            query["provider"] = provider
        
        # Service filter
        if service_name:
            query["service_name"] = {"$regex": service_name, "$options": "i"}
        
        # Region filter
        if region:
            query["region"] = region
        
        # Pagination
        if page_size is None:
            page_size = Config.DEFAULT_PAGE_SIZE
        page_size = min(page_size, Config.MAX_PAGE_SIZE)
        skip = (page - 1) * page_size
        
        # Sorting
        valid_sort_fields = ['usage_start_date', 'usage_end_date', 'cost', 'service_name', 'provider', 'created_at']
        if sort_by not in valid_sort_fields:
            sort_by = 'usage_start_date'
        
        sort_direction = -1 if sort_order == 'desc' else 1
        
        # Execute query
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        
        # Get total count
        total_count = costs_collection.count_documents(query)
        
        # Get paginated results
        cursor = costs_collection.find(query).sort(sort_by, sort_direction).skip(skip).limit(page_size)
        costs = list(cursor)
        
        # Convert ObjectId to string
        for cost in costs:
            cost['_id'] = str(cost['_id'])
            cost['user_id'] = str(cost['user_id'])
            # Convert dates to ISO format
            cost['usage_start_date'] = cost['usage_start_date'].isoformat()
            cost['usage_end_date'] = cost['usage_end_date'].isoformat()
            cost['created_at'] = cost['created_at'].isoformat()
            cost['updated_at'] = cost['updated_at'].isoformat()
        
        # Calculate pagination metadata
        total_pages = (total_count + page_size - 1) // page_size
        
        return True, {
            "costs": costs,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }
        
    except Exception as e:
        return False, f"Error retrieving costs: {str(e)}"


def get_cost_by_id(user_id: str, cost_id: str) -> Tuple[bool, any]:
    """
    Get a single cost record by ID.
    
    Args:
        user_id: User's ID (for authorization)
        cost_id: Cost record ID
    
    Returns:
        (success, cost_data_or_error)
    """
    try:
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        cost = costs_collection.find_one({
            "_id": ObjectId(cost_id),
            "user_id": ObjectId(user_id)
        })
        
        if not cost:
            return False, "Cost record not found or access denied"
        
        # Convert ObjectId to string
        cost['_id'] = str(cost['_id'])
        cost['user_id'] = str(cost['user_id'])
        cost['usage_start_date'] = cost['usage_start_date'].isoformat()
        cost['usage_end_date'] = cost['usage_end_date'].isoformat()
        cost['created_at'] = cost['created_at'].isoformat()
        cost['updated_at'] = cost['updated_at'].isoformat()
        
        return True, cost
        
    except Exception as e:
        return False, f"Error retrieving cost: {str(e)}"


def update_cost(user_id: str, cost_id: str, update_data: Dict) -> Tuple[bool, any]:
    """
    Update a cost record.
    
    Args:
        user_id: User's ID (for authorization)
        cost_id: Cost record ID
        update_data: Fields to update
    
    Returns:
        (success, updated_cost_or_error)
    """
    try:
        # Get existing record
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        existing = costs_collection.find_one({
            "_id": ObjectId(cost_id),
            "user_id": ObjectId(user_id)
        })
        
        if not existing:
            return False, "Cost record not found or access denied"
        
        # Merge with existing data for validation
        merged_data = {**existing, **update_data}
        is_valid, error = validate_cost_data(merged_data)
        if not is_valid:
            return False, error
        
        # Prepare update
        update_fields = {}
        allowed_fields = [
            'provider', 'cloud_account_id', 'service_name', 'resource_id',
            'region', 'usage_quantity', 'usage_unit', 'cost', 'currency',
            'usage_start_date', 'usage_end_date', 'tags', 'metadata'
        ]
        
        for field in allowed_fields:
            if field in update_data:
                if field in ['usage_start_date', 'usage_end_date'] and isinstance(update_data[field], str):
                    update_fields[field] = datetime.fromisoformat(update_data[field].replace('Z', '+00:00'))
                else:
                    update_fields[field] = update_data[field]
        
        update_fields['updated_at'] = datetime.utcnow()
        
        # Update billing period if dates changed
        if 'usage_start_date' in update_fields:
            update_fields['billing_period'] = update_fields['usage_start_date'].strftime("%Y-%m")
        
        # Update database
        result = costs_collection.update_one(
            {"_id": ObjectId(cost_id), "user_id": ObjectId(user_id)},
            {"$set": update_fields}
        )
        
        if result.modified_count == 0:
            return False, "No changes made"
        
        # Return updated record
        return get_cost_by_id(user_id, cost_id)
        
    except Exception as e:
        return False, f"Error updating cost: {str(e)}"


def delete_cost(user_id: str, cost_id: str) -> Tuple[bool, any]:
    """
    Delete a cost record.
    
    Args:
        user_id: User's ID (for authorization)
        cost_id: Cost record ID
    
    Returns:
        (success, message)
    """
    try:
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        result = costs_collection.delete_one({
            "_id": ObjectId(cost_id),
            "user_id": ObjectId(user_id)
        })
        
        if result.deleted_count == 0:
            return False, "Cost record not found or access denied"
        
        return True, "Cost record deleted successfully"
        
    except Exception as e:
        return False, f"Error deleting cost: {str(e)}"


def get_cost_summary(
    user_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    group_by: str = 'provider'
) -> Tuple[bool, any]:
    """
    Get aggregated cost summary.
    
    Args:
        user_id: User's ID
        start_date: Start date for filtering
        end_date: End date for filtering
        group_by: Field to group by ('provider', 'service', 'region', 'billing_period')
    
    Returns:
        (success, summary_or_error)
    """
    try:
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        
        # Build match stage
        match_stage = {"user_id": ObjectId(user_id)}
        if start_date:
            match_stage["usage_start_date"] = {"$gte": start_date}
        if end_date:
            if "usage_start_date" in match_stage:
                match_stage["usage_start_date"]["$lte"] = end_date
            else:
                match_stage["usage_end_date"] = {"$lte": end_date}
        
        # Map group_by to field name
        group_field_map = {
            'provider': '$provider',
            'service': '$service_name',
            'region': '$region',
            'billing_period': '$billing_period'
        }
        
        group_field = group_field_map.get(group_by, '$provider')
        
        # Aggregation pipeline
        pipeline = [
            {"$match": match_stage},
            {"$group": {
                "_id": group_field,
                "total_cost": {"$sum": "$cost"},
                "record_count": {"$sum": 1},
                "avg_cost": {"$avg": "$cost"},
                "min_cost": {"$min": "$cost"},
                "max_cost": {"$max": "$cost"}
            }},
            {"$sort": {"total_cost": -1}}
        ]
        
        results = list(costs_collection.aggregate(pipeline))
        
        # Calculate grand total
        grand_total = sum(r['total_cost'] for r in results)
        
        # Format results
        summary = {
            "group_by": group_by,
            "grand_total": round(grand_total, 2),
            "groups": [
                {
                    "name": r['_id'],
                    "total_cost": round(r['total_cost'], 2),
                    "record_count": r['record_count'],
                    "avg_cost": round(r['avg_cost'], 2),
                    "min_cost": round(r['min_cost'], 2),
                    "max_cost": round(r['max_cost'], 2),
                    "percentage": round((r['total_cost'] / grand_total * 100), 2) if grand_total > 0 else 0
                }
                for r in results
            ]
        }
        
        return True, summary
        
    except Exception as e:
        return False, f"Error generating summary: {str(e)}"
