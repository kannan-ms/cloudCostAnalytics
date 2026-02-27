"""
MongoDB Data Models and Schemas
Defines the structure of documents stored in MongoDB collections.
"""

from datetime import datetime
from bson import ObjectId
from typing import Optional, Dict, List


class User:
    """User model for authentication and profile management."""
    
    @staticmethod
    def create_document(name: str, email: str, password_hash: str) -> Dict:
        """
        Create a new user document.
        
        Args:
            name: User's full name
            email: User's email address
            password_hash: Hashed password
            
        Returns:
            Dict: User document ready for MongoDB insertion
        """
        return {
            "name": name,
            "email": email.lower(),
            "password_hash": password_hash,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True,
            "role": "user",
            "profile": {
                "avatar": None,
                "phone": None,
                "organization": None
            },
            "settings": {
                "email_notifications": True,
                "alert_threshold": 100.0,
                "currency": "USD"
            }
        }
    
    @staticmethod
    def sanitize(user_doc: Dict) -> Dict:
        """Remove sensitive fields before sending to client."""
        if user_doc:
            user_doc['_id'] = str(user_doc['_id'])
            user_doc.pop('password_hash', None)
            return user_doc
        return None


class CloudCost:
    """Cloud cost entry model."""
    
    @staticmethod
    def create_document(
        user_id: str,
        service_name: str,
        cost: float,
        date: datetime,
        region: Optional[str] = None,
        resource_id: Optional[str] = None,
        tags: Optional[Dict] = None
    ) -> Dict:
        """
        Create a new cloud cost document.
        
        Args:
            user_id: User's MongoDB ObjectId as string
            service_name: Name of the cloud service (e.g., 'EC2', 'S3', 'Lambda')
            cost: Cost amount
            date: Date of the cost entry
            region: Cloud region (optional)
            resource_id: Specific resource identifier (optional)
            tags: Custom tags (optional)
            
        Returns:
            Dict: Cloud cost document ready for MongoDB insertion
        """
        return {
            "user_id": ObjectId(user_id),
            "service_name": service_name,
            "cost": float(cost),
            "date": date,
            "region": region or "us-east-1",
            "resource_id": resource_id,
            "tags": tags or {},
            "created_at": datetime.utcnow(),
            "currency": "USD",
            "billing_period": date.strftime("%Y-%m")
        }


class Anomaly:
    """Anomaly detection result model."""
    
    @staticmethod
    def create_document(
        user_id: str,
        cost_id: str,
        service_name: str,
        detected_value: float,
        expected_value: float,
        threshold: float,
        severity: str,
        message: str,
        detected_at: datetime = None
    ) -> Dict:
        """
        Create a new anomaly document.
        
        Args:
            user_id: User's MongoDB ObjectId as string
            cost_id: Related cloud cost entry ID
            service_name: Service where anomaly was detected
            detected_value: Actual cost value
            expected_value: Expected/average cost value
            threshold: Anomaly detection threshold
            severity: 'low', 'medium', or 'high'
            message: Description of the anomaly
            detected_at: Timestamp of detection (defaults to utcnow)
            
        Returns:
            Dict: Anomaly document ready for MongoDB insertion
        """
        return {
            "user_id": ObjectId(user_id),
            "cost_id": ObjectId(cost_id),
            "service_name": service_name,
            "detected_value": float(detected_value),
            "expected_value": float(expected_value),
            "threshold": float(threshold),
            "deviation_percentage": ((detected_value - expected_value) / expected_value * 100),
            "severity": severity,
            "message": message,
            "detected_at": detected_at or datetime.utcnow(),
            "status": "new",  # 'new', 'acknowledged', 'resolved', 'ignored'
            "acknowledged_at": None,
            "resolved_at": None
        }


class UsageMetric:
    """Cloud resource usage metric model."""
    
    @staticmethod
    def create_document(
        user_id: str,
        service_name: str,
        metric_name: str,
        value: float,
        unit: str,
        timestamp: datetime
    ) -> Dict:
        
        return {
            "user_id": ObjectId(user_id),
            "service_name": service_name,
            "metric_name": metric_name,
            "value": float(value),
            "unit": unit,
            "timestamp": timestamp,
            "recorded_at": datetime.utcnow()
        }


class Alert:
    """Alert notification model."""
    
    @staticmethod
    def create_document(
        user_id: str,
        alert_type: str,
        title: str,
        message: str,
        severity: str,
        related_entity_id: Optional[str] = None
    ) -> Dict:
        """
        Create a new alert document.
        
        Args:
            user_id: User's MongoDB ObjectId as string
            alert_type: Type of alert ('cost_spike', 'anomaly', 'budget_exceeded', etc.)
            title: Alert title
            message: Alert message
            severity: 'info', 'warning', 'critical'
            related_entity_id: Related document ID (optional)
            
        Returns:
            Dict: Alert document ready for MongoDB insertion
        """
        return {
            "user_id": ObjectId(user_id),
            "alert_type": alert_type,
            "title": title,
            "message": message,
            "severity": severity,
            "related_entity_id": ObjectId(related_entity_id) if related_entity_id else None,
            "created_at": datetime.utcnow(),
            "is_read": False,
            "read_at": None
        }


# Schema validation rules (optional but recommended)
SCHEMAS = {
    "users": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["name", "email", "password_hash", "created_at"],
                "properties": {
                    "name": {"bsonType": "string", "minLength": 1},
                    "email": {"bsonType": "string", "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"},
                    "password_hash": {"bsonType": "string"},
                    "is_active": {"bsonType": "bool"},
                    "role": {"enum": ["user", "admin"]},
                }
            }
        }
    },
    "cloud_costs": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["user_id", "service_name", "cost", "date"],
                "properties": {
                    "user_id": {"bsonType": "objectId"},
                    "service_name": {"bsonType": "string"},
                    "cost": {"bsonType": "double", "minimum": 0},
                    "date": {"bsonType": "date"},
                }
            }
        }
    },
    "anomalies": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["user_id", "severity", "detected_at"],
                "properties": {
                    "user_id": {"bsonType": "objectId"},
                    "severity": {"enum": ["low", "medium", "high"]},
                    "status": {"enum": ["new", "acknowledged", "resolved", "ignored"]},
                }
            }
        }
    }
}
