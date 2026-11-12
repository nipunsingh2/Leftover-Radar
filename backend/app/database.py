from datetime import datetime, time, timezone
from typing import Any, Dict, Optional

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import CollectionInvalid

from backend.app.config import settings

client: Optional[MongoClient] = None
db: Optional[Database] = None

def get_client() -> MongoClient:
    global client
    if client is None:
        client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=3000)
    return client

def get_database() -> Database:
    global db
    if db is None:
        c = get_client()
        db = c[settings.MONGODB_DATABASE]
    return db

def get_collection(name: str) -> Collection:
    return get_database()[name]

def parse_service_date(date_str_or_dt) -> datetime:
    """
    Parse date to service-day convention (IST midnight stored as UTC BSON Date).
    Enforces consistent date handling across training, serving, and persistence.
    """
    if isinstance(date_str_or_dt, datetime):
        return datetime.combine(date_str_or_dt.date(), time.min, tzinfo=timezone.utc)
    if isinstance(date_str_or_dt, str):
        dt = datetime.strptime(date_str_or_dt.strip(), "%Y-%m-%d")
        return datetime.combine(dt.date(), time.min, tzinfo=timezone.utc)
    raise ValueError(f"Invalid date format: {date_str_or_dt}")

def format_service_date(dt: datetime) -> str:
    """Format BSON Date back to YYYY-MM-DD string."""
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d")
    return str(dt)

# --- Collection JSON Schemas (Section 8.1) ---
VALIDATORS: Dict[str, Dict[str, Any]] = {
    "menu_items": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["_id", "name", "category", "price", "active"],
            "properties": {
                "_id": {"bsonType": "string", "description": "Stable item identifier string"},
                "name": {"bsonType": "string"},
                "category": {
                    "enum": ["main", "breakfast", "snack", "beverage", "dessert"],
                    "description": "Controlled dish category"
                },
                "tags": {
                    "bsonType": "array",
                    "items": {"bsonType": "string"}
                },
                "price": {"bsonType": ["double", "int"], "minimum": 0},
                "active": {"bsonType": "bool"},
                "introduced_date": {"bsonType": ["date", "string", "null"]},
                "discontinued_date": {"bsonType": ["date", "string", "null"]}
            }
        }
    },
    "service_observations": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["service_date", "service_period", "item_id", "portions_prepared", "portions_sold", "sold_out", "source"],
            "properties": {
                "service_date": {"bsonType": "date"},
                "service_period": {
                    "enum": ["breakfast", "lunch", "dinner"]
                },
                "item_id": {"bsonType": "string"},
                "category": {"bsonType": ["string", "null"]},
                "price": {"bsonType": ["double", "int"], "minimum": 0},
                "portions_prepared": {"bsonType": "int", "minimum": 0},
                "portions_sold": {"bsonType": "int", "minimum": 0},
                "sold_out": {"bsonType": "bool"},
                "context": {
                    "bsonType": "object",
                    "properties": {
                        "campus_event": {"bsonType": "bool"},
                        "exam_week": {"bsonType": "bool"},
                        "holiday": {"bsonType": "bool"},
                        "weather": {"bsonType": "string"}
                    }
                },
                "source": {
                    "enum": ["simulated", "manual_entry", "csv_import"]
                }
            }
        }
    },
    "forecasts": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["created_at", "service_date", "service_period", "item_id", "predicted_demand", "model_version", "prediction_method"],
            "properties": {
                "created_at": {"bsonType": "date"},
                "service_date": {"bsonType": "date"},
                "service_period": {"enum": ["breakfast", "lunch", "dinner"]},
                "item_id": {"bsonType": "string"},
                "predicted_demand": {"bsonType": "int", "minimum": 0},
                "lower_estimate": {"bsonType": "int", "minimum": 0},
                "upper_estimate": {"bsonType": "int", "minimum": 0},
                "planned_portions": {"bsonType": "int", "minimum": 0},
                "estimated_leftovers": {"bsonType": "int", "minimum": 0},
                "estimated_shortfall": {"bsonType": "int", "minimum": 0},
                "recommended_portions": {"bsonType": "int", "minimum": 0},
                "model_version": {"bsonType": "string"},
                "prediction_method": {"enum": ["model", "recent_average_baseline", "same_weekday_baseline", "category_fallback", "manual"]},
                "history_status": {"enum": ["sufficient", "low_history", "new_item", "no_history"]},
                "input_features_snapshot": {"bsonType": "object"}
            }
        }
    },
    "model_runs": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["model_version", "trained_at", "training_records", "mae", "wape"],
            "properties": {
                "model_version": {"bsonType": "string"},
                "trained_at": {"bsonType": "date"},
                "training_records": {"bsonType": "int"},
                "validation_records": {"bsonType": "int"},
                "validation_start": {"bsonType": "string"},
                "validation_end": {"bsonType": "string"},
                "test_start": {"bsonType": ["string", "null"]},
                "test_end": {"bsonType": ["string", "null"]},
                "mae": {"bsonType": ["double", "int"]},
                "wape": {"bsonType": ["double", "int"]},
                "bias": {"bsonType": ["double", "int"]},
                "baseline_mae": {"bsonType": ["double", "int"]},
                "baseline_wape": {"bsonType": ["double", "int"]},
                "coverage_80": {"bsonType": ["double", "int", "null"]},
                "features": {"bsonType": "array"},
                "is_synthetic": {"bsonType": "bool"}
            }
        }
    },
    "calendar_days": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["date", "campus_event", "exam_week", "holiday", "weather"],
            "properties": {
                "date": {"bsonType": "date"},
                "date_str": {"bsonType": "string"},
                "campus_event": {"bsonType": "bool"},
                "event_name": {"bsonType": ["string", "null"]},
                "exam_week": {"bsonType": "bool"},
                "holiday": {"bsonType": "bool"},
                "holiday_name": {"bsonType": ["string", "null"]},
                "weather": {"enum": ["sunny", "clear", "cloudy", "rainy", "hot"]}
            }
        }
    },
    "settings": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["key", "waste_cost", "stockout_cost", "buffer_cap_percent"],
            "properties": {
                "key": {"bsonType": "string"},
                "waste_cost": {"bsonType": ["double", "int"], "minimum": 0},
                "stockout_cost": {"bsonType": ["double", "int"], "minimum": 0},
                "buffer_cap_percent": {"bsonType": ["double", "int"], "minimum": 0, "maximum": 1.0}
            }
        }
    }
}

def init_database():
    """
    Idempotently sets up MongoDB collections with $jsonSchema validators
    and required compound indexes per Section 8.1.
    """
    database = get_database()
    existing_cols = database.list_collection_names()

    # 1. Apply $jsonSchema validators
    for col_name, validator_spec in VALIDATORS.items():
        if col_name not in existing_cols:
            try:
                database.create_collection(col_name, validator=validator_spec)
            except CollectionInvalid:
                pass
        else:
            try:
                database.command({
                    "collMod": col_name,
                    "validator": validator_spec,
                    "validationLevel": "moderate"
                })
            except Exception:
                # Some existing documents might not match new stricter schema in dev
                pass

    # 2. Setup compound indexes
    # service_observations
    obs = database["service_observations"]
    obs.create_index(
        [("service_date", ASCENDING), ("service_period", ASCENDING), ("item_id", ASCENDING)],
        unique=True,
        name="uniq_service_date_period_item"
    )
    obs.create_index(
        [("item_id", ASCENDING), ("service_period", ASCENDING), ("service_date", ASCENDING)],
        name="idx_item_period_date"
    )
    obs.create_index(
        [("service_date", ASCENDING), ("service_period", ASCENDING)],
        name="idx_service_date_period"
    )

    # forecasts
    fc = database["forecasts"]
    fc.create_index([("created_at", DESCENDING)], name="idx_created_at_desc")
    fc.create_index(
        [("service_date", ASCENDING), ("service_period", ASCENDING), ("item_id", ASCENDING)],
        name="idx_fc_date_period_item"
    )

    # model_runs
    mr = database["model_runs"]
    mr.create_index([("trained_at", DESCENDING)], name="idx_trained_at_desc")

    # calendar_days
    cal = database["calendar_days"]
    cal.create_index([("date", ASCENDING)], unique=True, name="uniq_calendar_date")

    # settings
    st = database["settings"]
    st.create_index([("key", ASCENDING)], unique=True, name="uniq_settings_key")

def init_indexes():
    """Backward-compatible alias."""
    init_database()
