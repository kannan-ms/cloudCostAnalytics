"""
Simple Cost Trends Service
--------------------------
Implements the minimal CSV upload + monthly cost trends logic
backed by the `cost_records` collection.

This is intentionally independent from the more advanced cost
ingestion and anomaly detection pipeline so it can be used as
the primary "happy path" for the MVP:

- POST /upload-cost-data
- GET  /api/cost-trends
"""

from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import List, Tuple, Dict, Any

from werkzeug.datastructures import FileStorage

from database import get_collection, Collections


REQUIRED_COLUMNS = [
    "provider",
    "service_name",
    "cost",
    "usage_start_date",
    "usage_end_date",
]

DATE_FORMAT = "%Y-%m-%d"


def _validate_header(fieldnames: List[str]) -> Tuple[bool, str]:
    """
    Validate that the CSV header contains the required columns
    with exact names.
    """
    if not fieldnames:
        return False, "CSV file has no header row"

    missing = [col for col in REQUIRED_COLUMNS if col not in fieldnames]
    if missing:
        return (
            False,
            f"CSV is missing required columns: {', '.join(missing)}. "
            f"Required columns are: {', '.join(REQUIRED_COLUMNS)}",
        )

    return True, ""


def _parse_date(value: str, field_name: str, row_index: int) -> datetime:
    try:
        return datetime.strptime(value.strip(), DATE_FORMAT)
    except Exception as exc:  # pragma: no cover - defensive
        raise ValueError(
            f"Row {row_index}: '{field_name}' must be in YYYY-MM-DD format "
            f"(got '{value}')"
        ) from exc


def _parse_cost(value: str, row_index: int) -> float:
    try:
        cost = float(value)
        return cost
    except Exception as exc:  # pragma: no cover - defensive
        raise ValueError(
            f"Row {row_index}: 'cost' must be numeric (got '{value}')"
        ) from exc


def parse_and_store_csv(file: FileStorage) -> Tuple[bool, Dict[str, Any]]:
    """
    Parse a CSV upload and store raw records into `cost_records`.

    Returns:
        (success, payload)

        On success:
            (True, {
                "inserted_count": int,
                "message": str,
            })

        On failure:
            (False, {
                "error": str,
            })
    """
    if not file or file.filename == "":
        return False, {"error": "No file provided"}

    if not file.filename.lower().endswith(".csv"):
        return False, {"error": "Only CSV files are supported (.csv)"}

    try:
        # Read file as text
        stream = io.StringIO(file.stream.read().decode("utf-8-sig"))
    except UnicodeDecodeError:
        return False, {"error": "Unable to decode file. Please upload a UTF-8 CSV file."}

    reader = csv.DictReader(stream)

    is_valid, header_error = _validate_header(reader.fieldnames)
    if not is_valid:
        return False, {"error": header_error}

    documents = []
    row_index = 1  # 1-based for user-friendly messages (excluding header)

    for row in reader:
        row_index += 1

        # Skip completely empty rows
        if not any(row.values()):
            continue

        try:
            # Required fields presence & non-empty
            for col in REQUIRED_COLUMNS:
                value = (row.get(col) or "").strip()
                if value == "":
                    raise ValueError(f"Row {row_index}: '{col}' is required and cannot be empty")

            usage_start = _parse_date(row["usage_start_date"], "usage_start_date", row_index)
            usage_end = _parse_date(row["usage_end_date"], "usage_end_date", row_index)
            cost_value = _parse_cost(row["cost"], row_index)

            # Derive month string in YYYY-MM from usage_start_date
            month = usage_start.strftime("%Y-%m")

            doc = {
                "provider": row["provider"].strip(),
                "service_name": row["service_name"].strip(),
                "cost": cost_value,
                "usage_start_date": usage_start,
                "usage_end_date": usage_end,
                "month": month,
                "created_at": datetime.utcnow(),
                # Keep original raw row in case of future debugging
                "raw": {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()},
            }

            documents.append(doc)
        except ValueError as ve:
            # Stop on first validation error and report clearly
            return False, {"error": str(ve)}

    if not documents:
        return False, {"error": "No valid records found in CSV file"}

    collection = get_collection(Collections.COST_RECORDS)
    result = collection.insert_many(documents)

    return True, {
        "inserted_count": len(result.inserted_ids),
        "message": f"Successfully stored {len(result.inserted_ids)} cost records.",
    }


def get_monthly_cost_trends() -> Dict[str, List]:
    """
    Aggregate total cost per month (YYYY-MM) from `cost_records`.

    Returns:
        {
            "labels": [...],
            "values": [...]
        }
    """
    collection = get_collection(Collections.COST_RECORDS)

    pipeline = [
        {
            "$group": {
                "_id": "$month",
                "total_cost": {"$sum": "$cost"},
            }
        },
        {
            "$sort": {"_id": 1}
        },
    ]

    results = list(collection.aggregate(pipeline))

    if not results:
        return {"labels": [], "values": []}

    labels: List[str] = []
    values: List[float] = []

    for item in results:
        labels.append(item["_id"])
        values.append(round(float(item.get("total_cost", 0.0)), 2))

    return {"labels": labels, "values": values}


