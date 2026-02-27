"""
Universal Cloud Service Category Mapper
Supports multi-cloud analytics across Azure, AWS, and GCP.

Single source of truth for mapping cloud service names to
infrastructure categories: Compute, Storage, Database, Networking, Other.
"""

from typing import Dict

# ---------------------------------------------------------------------------
# Canonical keyword-to-category rules (checked via case-insensitive substring)
# Order matters: first match wins, so more specific patterns come first.
# ---------------------------------------------------------------------------

_KEYWORD_RULES = [
    # ── COMPUTE ──────────────────────────────────────────────────────────
    ("ec2", "Compute"),
    ("elastic compute", "Compute"),
    ("virtual machines", "Compute"),
    ("compute engine", "Compute"),
    ("lambda", "Compute"),
    ("azure functions", "Compute"),
    ("cloud functions", "Compute"),
    ("functions", "Compute"),
    ("app service", "Compute"),
    ("app engine", "Compute"),
    ("container instances", "Compute"),
    ("container apps", "Compute"),
    ("kubernetes", "Compute"),
    ("ecs", "Compute"),
    ("eks", "Compute"),
    ("cloud run", "Compute"),
    ("vm scale sets", "Compute"),
    ("lightsail", "Compute"),
    ("batch", "Compute"),
    ("fargate", "Compute"),
    ("microsoft.compute", "Compute"),
    ("microsoft.web", "Compute"),

    # ── STORAGE ──────────────────────────────────────────────────────────
    ("s3", "Storage"),
    ("blob storage", "Storage"),
    ("disk storage", "Storage"),
    ("persistent disk", "Storage"),
    ("backup vault", "Storage"),
    ("backup", "Storage"),
    ("file storage", "Storage"),
    ("filestore", "Storage"),
    ("netapp", "Storage"),
    ("glacier", "Storage"),
    ("ebs", "Storage"),
    ("storage gateway", "Storage"),
    ("cloud storage", "Storage"),
    ("microsoft.storage", "Storage"),
    ("storage", "Storage"),

    # ── DATABASE ─────────────────────────────────────────────────────────
    ("relational database", "Database"),
    ("rds", "Database"),
    ("sql database", "Database"),
    ("azure sql", "Database"),
    ("cloud sql", "Database"),
    ("cosmos db", "Database"),
    ("dynamodb", "Database"),
    ("redshift", "Database"),
    ("postgresql", "Database"),
    ("mysql", "Database"),
    ("mariadb", "Database"),
    ("elasticache", "Database"),
    ("redis cache", "Database"),
    ("firestore", "Database"),
    ("bigtable", "Database"),
    ("bigquery", "Database"),
    ("spanner", "Database"),
    ("memorystore", "Database"),
    ("aurora", "Database"),
    ("neptune", "Database"),
    ("microsoft.sql", "Database"),
    ("microsoft.dbforpostgresql", "Database"),
    ("microsoft.dbformysql", "Database"),
    ("microsoft.documentdb", "Database"),

    # ── NETWORKING ───────────────────────────────────────────────────────
    ("load balancer", "Networking"),
    ("virtual private cloud", "Networking"),
    ("vpc", "Networking"),
    ("virtual network", "Networking"),
    ("azure dns", "Networking"),
    ("cloud dns", "Networking"),
    ("route 53", "Networking"),
    ("cloud cdn", "Networking"),
    ("cloudfront", "Networking"),
    ("front door", "Networking"),
    ("content delivery", "Networking"),
    ("firewall", "Networking"),
    ("application gateway", "Networking"),
    ("api gateway", "Networking"),
    ("vpn gateway", "Networking"),
    ("bandwidth", "Networking"),
    ("network watcher", "Networking"),
    ("cloud nat", "Networking"),
    ("cloud interconnect", "Networking"),
    ("cloud load balancing", "Networking"),
    ("elastic load balancing", "Networking"),
    ("microsoft.network", "Networking"),
    ("dns", "Networking"),

    # ── MANAGEMENT ───────────────────────────────────────────────────────
    ("azure monitor", "Management"),
    ("cloudwatch", "Management"),
    ("cloud monitoring", "Management"),
    ("cloud logging", "Management"),
    ("cloudtrail", "Management"),
    ("log analytics", "Management"),
    ("insight and analytics", "Management"),
    ("automation", "Management"),
    ("devops", "Management"),

    # ── SECURITY ─────────────────────────────────────────────────────────
    ("key vault", "Security"),
    ("security center", "Security"),
    ("azure defender", "Security"),
    ("threat protection", "Security"),
    ("identity and access management", "Security"),
    ("iam", "Security"),
    ("guardduty", "Security"),
    ("security command center", "Security"),
    ("microsoft.keyvault", "Security"),

    # ── MANAGEMENT (catch-all patterns) ──────────────────────────────────
    ("aws config", "Management"),
    ("systems manager", "Management"),
    ("trusted advisor", "Management"),
]

# Pre-built lookup: exact service name (lowered) → category
# Used for O(1) hits on repeated lookups.
_EXACT_MAP: Dict[str, str] = {}

# Runtime cache for substring matches
_CACHE: Dict[str, str] = {}


def map_service_to_category(service_name: str) -> str:
    """
    Map a cloud service name to a universal infrastructure category.

    Supports Azure, AWS, and GCP service names with case-insensitive
    substring matching.  Returns one of:
        Compute | Storage | Database | Networking | Management | Security | Other

    Args:
        service_name: The cloud service name string.

    Returns:
        Category string.
    """
    if not service_name:
        return "Other"

    key = service_name.strip().lower()

    # 1. Check exact cache first
    if key in _CACHE:
        return _CACHE[key]

    # 2. Substring match against keyword rules
    for keyword, category in _KEYWORD_RULES:
        if keyword in key:
            _CACHE[key] = category
            return category

    # 3. No match
    _CACHE[key] = "Other"
    return "Other"


# ---------------------------------------------------------------------------
# Legacy compatibility bridge
# ---------------------------------------------------------------------------
# The old SERVICE_CATEGORIES dict (from cloud_cost_ingestion.py) mapped
# exact service names.  Expose a dict-like interface so existing code that
# does  `SERVICE_CATEGORIES.get(name, "Other")`  still works.

class _CategoryProxy(dict):
    """Dict subclass that falls back to map_service_to_category on miss."""

    def __missing__(self, key):
        return map_service_to_category(key)

    def get(self, key, default="Other"):
        return map_service_to_category(key) if key else default


SERVICE_CATEGORIES = _CategoryProxy()
get_category = map_service_to_category
