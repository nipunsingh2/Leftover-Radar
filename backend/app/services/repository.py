from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pymongo import ASCENDING, DESCENDING

from backend.app.database import (
    format_service_date,
    get_forecasts_col,
    get_menu_items_col,
    get_model_runs_col,
    get_observations_col,
    parse_service_date,
)


def list_menu_items(active_only: bool = True) -> List[Dict[str, Any]]:
    col = get_menu_items_col()
    query = {"active": True} if active_only else {}
    items = []
    for doc in col.find(query).sort("name", ASCENDING):
        items.append({
            "id": doc["_id"],
            "name": doc["name"],
            "category": doc.get("category", "main"),
            "tags": doc.get("tags", []),
            "price": float(doc.get("price", 0.0)),
            "active": doc.get("active", True)
        })
    return items

def get_menu_item(item_id: str) -> Optional[Dict[str, Any]]:
    col = get_menu_items_col()
    doc = col.find_one({"_id": item_id})
    if not doc:
        return None
    return {
        "id": doc["_id"],
        "name": doc["name"],
        "category": doc.get("category", "main"),
        "tags": doc.get("tags", []),
        "price": float(doc.get("price", 0.0)),
        "active": doc.get("active", True)
    }

def get_observations(
    date_str: Optional[str] = None,
    service_period: Optional[str] = None,
    item_id: Optional[str] = None,
    limit: int = 100
) -> List[Dict[str, Any]]:
    col = get_observations_col()
    query: Dict[str, Any] = {}
    if date_str:
        query["service_date"] = parse_service_date(date_str)
    if service_period:
        query["service_period"] = service_period
    if item_id:
        query["item_id"] = item_id

    menu_map = {item["id"]: item for item in list_menu_items(active_only=False)}
    results = []
    cursor = col.find(query).sort([("service_date", DESCENDING), ("service_period", ASCENDING)]).limit(limit)
    for doc in cursor:
        item_meta = menu_map.get(doc["item_id"], {})
        prep = int(doc.get("portions_prepared", 0))
        sold = int(doc.get("portions_sold", 0))
        leftovers = max(0, prep - sold)
        results.append({
            "id": str(doc["_id"]),
            "service_date": format_service_date(doc["service_date"]),
            "service_period": doc["service_period"],
            "item_id": doc["item_id"],
            "item_name": item_meta.get("name", doc["item_id"]),
            "category": doc.get("category", item_meta.get("category", "main")),
            "price": float(doc.get("price", item_meta.get("price", 0.0))),
            "portions_prepared": prep,
            "portions_sold": sold,
            "sold_out": bool(doc.get("sold_out", False)),
            "context": doc.get("context", {"campus_event": False, "weather": "clear"}),
            "source": doc.get("source", "manual_entry"),
            "estimated_leftovers": leftovers
        })
    return results

def upsert_observation(obs_data: Dict[str, Any]) -> Dict[str, Any]:
    col = get_observations_col()
    dt = parse_service_date(obs_data["service_date"])
    period = obs_data["service_period"].lower()
    item_id = obs_data["item_id"]

    # Check item details from menu if missing
    item_meta = get_menu_item(item_id)
    category = obs_data.get("category") or (item_meta["category"] if item_meta else "main")
    price = obs_data.get("price") if obs_data.get("price") is not None else (item_meta["price"] if item_meta else 50.0)

    prep = int(obs_data["portions_prepared"])
    sold = int(obs_data["portions_sold"])
    sold_out = obs_data.get("sold_out", sold >= prep)

    filter_q = {
        "service_date": dt,
        "service_period": period,
        "item_id": item_id
    }

    doc = {
        "service_date": dt,
        "service_period": period,
        "item_id": item_id,
        "category": category,
        "price": price,
        "portions_prepared": prep,
        "portions_sold": sold,
        "sold_out": sold_out,
        "context": obs_data.get("context", {"campus_event": False, "weather": "clear"}),
        "source": obs_data.get("source", "manual_entry"),
        "updated_at": datetime.now(timezone.utc)
    }

    col.update_one(filter_q, {"$set": doc}, upsert=True)
    saved_doc = col.find_one(filter_q)
    return {
        "id": str(saved_doc["_id"]),
        "service_date": format_service_date(saved_doc["service_date"]),
        "service_period": saved_doc["service_period"],
        "item_id": saved_doc["item_id"],
        "item_name": item_meta["name"] if item_meta else item_id,
        "category": saved_doc["category"],
        "price": saved_doc["price"],
        "portions_prepared": saved_doc["portions_prepared"],
        "portions_sold": saved_doc["portions_sold"],
        "sold_out": saved_doc["sold_out"],
        "context": saved_doc["context"],
        "source": saved_doc["source"],
        "estimated_leftovers": max(0, prep - sold)
    }

def save_forecast_documents(forecast_docs: List[Dict[str, Any]]):
    col = get_forecasts_col()
    now = datetime.now(timezone.utc)
    for doc in forecast_docs:
        doc["created_at"] = now
        doc["service_date"] = parse_service_date(doc["service_date"])
        # Upsert forecast for that service date, period, and item
        col.update_one(
            {
                "service_date": doc["service_date"],
                "service_period": doc["service_period"],
                "item_id": doc["item_id"]
            },
            {"$set": doc},
            upsert=True
        )

def get_forecasts_for_service(service_date_str: str, service_period: str) -> List[Dict[str, Any]]:
    col = get_forecasts_col()
    dt = parse_service_date(service_date_str)
    cursor = col.find({
        "service_date": dt,
        "service_period": service_period
    })
    results = []
    for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "service_date": format_service_date(doc["service_date"]),
            "service_period": doc["service_period"],
            "item_id": doc["item_id"],
            "predicted_demand": int(doc.get("predicted_demand", 0)),
            "lower_estimate": int(doc.get("lower_estimate", 0)),
            "upper_estimate": int(doc.get("upper_estimate", 0)),
            "planned_portions": int(doc.get("planned_portions", 0)),
            "estimated_leftovers": int(doc.get("estimated_leftovers", 0)),
            "recommended_portions": int(doc.get("recommended_portions", 0)),
            "model_version": doc.get("model_version", "v1"),
            "prediction_method": doc.get("prediction_method", "model")
        })
    return results

def get_latest_model_run() -> Optional[Dict[str, Any]]:
    col = get_model_runs_col()
    doc = col.find_one({}, sort=[("trained_at", DESCENDING)])
    if not doc:
        return None
    return {
        "model_version": doc.get("model_version", "v1"),
        "trained_at": doc["trained_at"].isoformat() if isinstance(doc.get("trained_at"), datetime) else str(doc.get("trained_at")),
        "training_records": doc.get("training_records", 0),
        "validation_records": doc.get("validation_records", 0),
        "validation_start": doc.get("validation_start", ""),
        "validation_end": doc.get("validation_end", ""),
        "mae": doc.get("mae", 0.0),
        "wape": doc.get("wape", 0.0),
        "bias": doc.get("bias", 0.0),
        "baseline_mae": doc.get("baseline_mae", 0.0),
        "baseline_wape": doc.get("baseline_wape", 0.0),
        "baseline_bias": doc.get("baseline_bias", 0.0),
        "features": doc.get("features", []),
        "is_synthetic": doc.get("is_synthetic", True)
    }
