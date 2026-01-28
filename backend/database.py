"""
MongoDB Database Connection Module
Handles MongoDB Atlas connectivity and database operations.
"""

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, ConfigurationError
from config import Config
import logging
import urllib.parse

# Configure logging - reduced verbosity
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)


class Database:
    """MongoDB Database connection handler."""
    
    client = None
    db = None
    
    @staticmethod
    def _validate_connection_string(uri):
        """Validate and fix common issues with MongoDB connection string."""
        if not uri:
            raise ValueError("MONGODB_URI is empty or not set")
        
        # Check for placeholder values
        if '<username>' in uri or '<password>' in uri or '<cluster>' in uri:
            raise ValueError(
                "Connection string contains placeholders. "
                "Please replace <username>, <password>, and <cluster> with actual values."
            )
        
        # Check if it's a valid MongoDB URI format
        if not uri.startswith(('mongodb://', 'mongodb+srv://')):
            raise ValueError(
                "Invalid MongoDB URI format. "
                "Should start with 'mongodb://' or 'mongodb+srv://'"
            )
        
        return uri
    
    @staticmethod
    def initialize():
        """Initialize MongoDB connection."""
        try:
            # Validate connection string
            uri = Database._validate_connection_string(Config.MONGODB_URI)
            
            # Create MongoDB client with increased timeout for initial connection
            Database.client = MongoClient(
                uri,
                serverSelectionTimeoutMS=30000,  # Increased to 30 seconds
                connectTimeoutMS=30000,
                socketTimeoutMS=30000,
                retryWrites=True,
                retryReads=True
            )
            
            # Test the connection with a ping command
            Database.client.admin.command('ping')
            
            # Get database
            Database.db = Database.client[Config.DATABASE_NAME]
            
            # Verify database access
            Database.db.command('ping')
            
            print(" MongoDB Atlas connected")
            return True
            
        except ValueError as e:
            logger.error(f"Configuration error: {e}")
            logger.error("Please check your MONGODB_URI in the .env file")
            return False
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            logger.error("Possible causes:")
            logger.error("  1. Incorrect username or password")
            logger.error("  2. IP address not whitelisted in MongoDB Atlas Network Access")
            logger.error("  3. Connection string format is incorrect")
            logger.error("  4. Password contains special characters that need URL encoding")
            return False
        except ServerSelectionTimeoutError as e:
            logger.error(f"MongoDB server selection timeout: {e}")
            logger.error("Possible causes:")
            logger.error("  1. Network connectivity issues")
            logger.error("  2. IP address not whitelisted in MongoDB Atlas")
            logger.error("  3. Firewall blocking the connection")
            logger.error("  4. Incorrect cluster address in connection string")
            return False
        except ConfigurationError as e:
            logger.error(f"MongoDB configuration error: {e}")
            logger.error("Please check your connection string format")
            return False
        except Exception as e:
            logger.error(f"Unexpected error connecting to MongoDB: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            return False
    
    @staticmethod
    def get_db():
        """Get database instance."""
        if Database.db is None:
            Database.initialize()
        return Database.db
    
    @staticmethod
    def close():
        """Close MongoDB connection."""
        if Database.client:
            Database.client.close()


# Collection names
class Collections:
    """Database collection names."""
    USERS = "users"
    CLOUD_COSTS = "cloud_costs"
    ANOMALIES = "anomalies"
    USAGE_METRICS = "usage_metrics"
    ALERTS = "alerts"


def get_collection(collection_name):
    """
    Get a specific collection from the database.
    
    Args:
        collection_name (str): Name of the collection
        
    Returns:
        Collection: MongoDB collection object
    """
    db = Database.get_db()
    return db[collection_name]


def create_indexes():
    """
    Create indexes for better query performance.
    Should be called once during application initialization.
    """
    try:
        db = Database.get_db()
        
        # Users collection indexes
        db[Collections.USERS].create_index("email", unique=True)
        db[Collections.USERS].create_index("created_at")
        
        # Cloud costs collection indexes
        # Compound index for user_id + usage_start_date (most common query pattern)
        db[Collections.CLOUD_COSTS].create_index([
            ("user_id", 1),
            ("usage_start_date", -1)
        ])
        # Individual indexes for filtering
        db[Collections.CLOUD_COSTS].create_index("provider")
        db[Collections.CLOUD_COSTS].create_index("service_name")
        db[Collections.CLOUD_COSTS].create_index("region")
        db[Collections.CLOUD_COSTS].create_index("billing_period")
        db[Collections.CLOUD_COSTS].create_index("usage_start_date")
        db[Collections.CLOUD_COSTS].create_index("cost")
        
        # Anomalies collection indexes
        db[Collections.ANOMALIES].create_index([
            ("user_id", 1),
            ("detected_at", -1)
        ])
        db[Collections.ANOMALIES].create_index("severity")
        db[Collections.ANOMALIES].create_index("status")
        
        # Usage metrics collection indexes
        db[Collections.USAGE_METRICS].create_index([
            ("user_id", 1),
            ("timestamp", -1)
        ])
        
        # Alerts collection indexes
        db[Collections.ALERTS].create_index([
            ("user_id", 1),
            ("created_at", -1)
        ])
        db[Collections.ALERTS].create_index("is_read")
        
        return True
        
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")
        return False


if __name__ == "__main__":
    # Test database connection
    print("Testing MongoDB connection...")
    if Database.initialize():
        print("✓ Connection successful!")
        print(f"Database: {Database.db.name}")
        print(f"Collections: {Database.db.list_collection_names()}")
        Database.close()
    else:
        print("✗ Connection failed!")
