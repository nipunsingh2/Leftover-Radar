from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pymongo import UpdateOne

from backend.app.database import format_service_date, get_collection, parse_service_date


def get_forecast_col():
    return get_collection("forecasts")

def save_forecast_snapshots(forecast_docs: List[Dict[str, Any]]):
    """
    Persists immutable forecast snapshots per Section 8.1.
    Includes input features snapshot, recommendation, prediction method, intervals.
    """
    if not forecast_docs:
        return
    col = get_forecast_col()
    now = datetime.now(timezone.utc)
    ops = []
    for doc in forecast_docs:
        dt = parse_service_date(doc["service_date"])
        period = doc["service_period"].lower()
        item_id = doc["item_id"]

        doc_to_save = {
            "created_at": now,
            "service_date": dt,
            "service_period": period,
            "item_id": item_id,
            "predicted_demand": int(doc["predicted_demand"]),
            "lower_estimate": int(doc.get("lower_estimate", 0)),
            "upper_estimate": int(doc.get("upper_estimate", doc["predicted_demand"])),
            "planned_portions": int(doc.get("planned_portions", doc["predicted_demand"])),
            "estimated_leftovers": int(doc.get("estimated_leftovers", 0)),
            "estimated_shortfall": int(doc.get("estimated_shortfall", 0)),
            "recommended_portions": int(doc.get("recommended_portions", doc["predicted_demand"])),
            "model_version": doc.get("model_version", "v1"),
            "prediction_method": doc.get("prediction_method", "model"),
            "history_status": doc.get("history_status", "sufficient"),
            "input_features_snapshot": doc.get("input_features_snapshot", {})
        }
        ops.append(
            UpdateOne(
                {"service_date": dt, "service_period": period, "item_id": item_id},
                {"$set": doc_to_save},
                upsert=True
            )
        )
    col.bulk_write(ops)

def get_saved_forecasts(service_date_str: str, service_period: str) -> List[Dict[str, Any]]:
    col = get_forecast_col()
    dt = parse_service_date(service_date_str)
    cursor = col.find({"service_date": dt, "service_period": service_period.lower()})
    results = []
    for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "service_date": format_service_date(doc["service_date"]),
            "service_period": doc["service_period"],
            "item_id": doc["item_id"],
            "predicted_demand": int(doc["predicted_demand"]),
            "lower_estimate": int(doc.get("lower_estimate", 0)),
            "upper_estimate": int(doc.get("upper_estimate", 0)),
            "planned_portions": int(doc.get("planned_portions", 0)),
            "estimated_leftovers": int(doc.get("estimated_leftovers", 0)),
            "estimated_shortfall": int(doc.get("estimated_shortfall", 0)),
            "recommended_portions": int(doc.get("recommended_portions", 0)),
            "model_version": doc.get("model_version", "v1"),
            "prediction_method": doc.get("prediction_method", "model"),
            "history_status": doc.get("history_status", "sufficient"),
            "input_features_snapshot": doc.get("input_features_snapshot", {})
        })
    return results

def get_forecast_by_id(forecast_id: str) -> Optional[Dict[str, Any]]:
    col = get_forecast_col()
    try:
        doc = col.find_one({"_id": ObjectId(forecast_id)})
    except Exception:
        return None
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "service_date": format_service_date(doc["service_date"]),
        "service_period": doc["service_period"],
        "item_id": doc["item_id"],
        "predicted_demand": int(doc["predicted_demand"]),
        "lower_estimate": int(doc.get("lower_estimate", 0)),
        "upper_estimate": int(doc.get("upper_estimate", 0)),
        "planned_portions": int(doc.get("planned_portions", 0)),
        "estimated_leftovers": int(doc.get("estimated_leftovers", 0)),
        "estimated_shortfall": int(doc.get("estimated_shortfall", 0)),
        "recommended_portions": int(doc.get("recommended_portions", 0)),
        "model_version": doc.get("model_version", "v1"),
        "prediction_method": doc.get("prediction_method", "model"),
        "history_status": doc.get("history_status", "sufficient"),
        "input_features_snapshot": doc.get("input_features_snapshot", {})
    }
