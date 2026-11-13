from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pymongo import DESCENDING

from backend.app.database import get_collection


def get_model_run_col():
    return get_collection("model_runs")

def log_model_run(run_data: Dict[str, Any]):
    col = get_model_run_col()
    doc = {
        "model_version": run_data["model_version"],
        "trained_at": datetime.now(timezone.utc),
        "training_records": int(run_data["training_records"]),
        "validation_records": int(run_data.get("validation_records", 0)),
        "validation_start": str(run_data.get("validation_start", "")),
        "validation_end": str(run_data.get("validation_end", "")),
        "test_start": str(run_data.get("test_start", "")),
        "test_end": str(run_data.get("test_end", "")),
        "mae": float(run_data["mae"]),
        "wape": float(run_data["wape"]),
        "bias": float(run_data.get("bias", 0.0)),
        "baseline_mae": float(run_data.get("baseline_mae", 0.0)),
        "baseline_wape": float(run_data.get("baseline_wape", 0.0)),
        "coverage_80": float(run_data["coverage_80"]) if run_data.get("coverage_80") is not None else None,
        "features": list(run_data.get("features", [])),
        "is_synthetic": bool(run_data.get("is_synthetic", True))
    }
    col.insert_one(doc)

def get_latest_model_run() -> Optional[Dict[str, Any]]:
    col = get_model_run_col()
    doc = col.find_one({}, sort=[("trained_at", DESCENDING)])
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "model_version": doc["model_version"],
        "trained_at": doc["trained_at"].isoformat() if isinstance(doc.get("trained_at"), datetime) else str(doc.get("trained_at")),
        "training_records": doc["training_records"],
        "validation_records": doc.get("validation_records", 0),
        "validation_start": doc.get("validation_start", ""),
        "validation_end": doc.get("validation_end", ""),
        "test_start": doc.get("test_start"),
        "test_end": doc.get("test_end"),
        "mae": doc["mae"],
        "wape": doc["wape"],
        "bias": doc.get("bias", 0.0),
        "baseline_mae": doc.get("baseline_mae", 0.0),
        "baseline_wape": doc.get("baseline_wape", 0.0),
        "coverage_80": doc.get("coverage_80"),
        "features": doc.get("features", []),
        "is_synthetic": doc.get("is_synthetic", True)
    }

def list_model_runs(limit: int = 10) -> List[Dict[str, Any]]:
    col = get_model_run_col()
    cursor = col.find({}).sort("trained_at", DESCENDING).limit(limit)
    runs = []
    for doc in cursor:
        runs.append({
            "id": str(doc["_id"]),
            "model_version": doc["model_version"],
            "trained_at": doc["trained_at"].isoformat() if isinstance(doc.get("trained_at"), datetime) else str(doc.get("trained_at")),
            "training_records": doc["training_records"],
            "mae": doc["mae"],
            "wape": doc["wape"],
            "bias": doc.get("bias", 0.0),
            "baseline_mae": doc.get("baseline_mae", 0.0),
            "is_synthetic": doc.get("is_synthetic", True)
        })
    return runs

get_all_model_runs = list_model_runs
