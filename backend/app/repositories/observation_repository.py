from datetime import datetime
from typing import Any, Dict, List, Optional

from pymongo import ASCENDING, DESCENDING, UpdateOne

from backend.app.database import format_service_date, get_collection, parse_service_date


def get_obs_col():
    return get_collection("service_observations")

def get_observations(
    date_str: Optional[str] = None,
    service_period: Optional[str] = None,
    item_id: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
) -> List[Dict[str, Any]]:
    col = get_obs_col()
    query: Dict[str, Any] = {}
    if date_str:
        query["service_date"] = parse_service_date(date_str)
    if service_period:
        query["service_period"] = service_period.lower()
    if item_id:
        query["item_id"] = item_id

    results = []
    cursor = col.find(query).sort([("service_date", DESCENDING), ("service_period", ASCENDING)]).skip(skip).limit(limit)
    for doc in cursor:
        prep = int(doc.get("portions_prepared", 0))
        sold = int(doc.get("portions_sold", 0))
        results.append({
            "id": str(doc["_id"]),
            "service_date": format_service_date(doc["service_date"]),
            "service_period": doc["service_period"],
            "item_id": doc["item_id"],
            "category": doc.get("category"),
            "price": float(doc.get("price", 0.0)),
            "portions_prepared": prep,
            "portions_sold": sold,
            "sold_out": bool(doc.get("sold_out", False)),
            "context": doc.get("context", {}),
            "source": doc.get("source", "simulated"),
            "estimated_leftovers": max(0, prep - sold),
            "estimated_shortfall": max(0, sold - prep) if sold > prep else 0
        })
    return results

def upsert_observation(data: Dict[str, Any]) -> Dict[str, Any]:
    col = get_obs_col()
    dt = parse_service_date(data["service_date"])
    period = data["service_period"].lower()
    item_id = data["item_id"]
    prep = int(data["portions_prepared"])
    sold = int(data["portions_sold"])
    sold_out = bool(data.get("sold_out", sold >= prep))

    filter_q = {
        "service_date": dt,
        "service_period": period,
        "item_id": item_id
    }
    update_doc = {
        "$set": {
            "service_date": dt,
            "service_period": period,
            "item_id": item_id,
            "category": data.get("category"),
            "price": float(data.get("price", 0.0)),
            "portions_prepared": prep,
            "portions_sold": sold,
            "sold_out": sold_out,
            "context": data.get("context", {}),
            "source": data.get("source", "manual_entry")
        }
    }
    col.update_one(filter_q, update_doc, upsert=True)
    saved = col.find_one(filter_q)
    return {
        "id": str(saved["_id"]),
        "service_date": format_service_date(saved["service_date"]),
        "service_period": saved["service_period"],
        "item_id": saved["item_id"],
        "category": saved.get("category"),
        "price": float(saved.get("price", 0.0)),
        "portions_prepared": int(saved["portions_prepared"]),
        "portions_sold": int(saved["portions_sold"]),
        "sold_out": bool(saved["sold_out"]),
        "context": saved.get("context", {}),
        "source": saved.get("source", "manual_entry"),
        "estimated_leftovers": max(0, prep - sold)
    }

def bulk_upsert_observations(records: List[Dict[str, Any]]) -> Dict[str, int]:
    """Uses bulk_write with UpdateOne(upsert=True) per Section 8.1."""
    if not records:
        return {"upserted": 0, "modified": 0}
    col = get_obs_col()
    ops = []
    for r in records:
        dt = parse_service_date(r["service_date"])
        period = r["service_period"].lower()
        item_id = r["item_id"]
        prep = int(r["portions_prepared"])
        sold = int(r["portions_sold"])
        sold_out = bool(r.get("sold_out", sold >= prep))

        ops.append(
            UpdateOne(
                {"service_date": dt, "service_period": period, "item_id": item_id},
                {"$set": {
                    "service_date": dt,
                    "service_period": period,
                    "item_id": item_id,
                    "category": r.get("category"),
                    "price": float(r.get("price", 0.0)),
                    "portions_prepared": prep,
                    "portions_sold": sold,
                    "sold_out": sold_out,
                    "context": r.get("context", {}),
                    "source": r.get("source", "simulated")
                }},
                upsert=True
            )
        )
    res = col.bulk_write(ops)
    return {"upserted": res.upserted_count, "modified": res.modified_count, "matched": res.matched_count}

def get_history_strictly_prior_to(
    item_id: str,
    service_period: str,
    target_date_dt: datetime,
    limit: int = 40
) -> List[Dict[str, Any]]:
    """Fetches past service observations strictly before target_date to prevent leakage."""
    col = get_obs_col()
    cursor = col.find({
        "item_id": item_id,
        "service_period": service_period.lower(),
        "service_date": {"$lt": target_date_dt}
    }).sort("service_date", DESCENDING).limit(limit)
    return list(cursor)
