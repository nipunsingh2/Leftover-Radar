from typing import Any, Dict

from backend.app.config import settings
from backend.app.database import get_collection

SETTINGS_KEY = "operator_cost_settings"

def get_settings_col():
    return get_collection("settings")

def get_operator_settings() -> Dict[str, Any]:
    col = get_settings_col()
    doc = col.find_one({"key": SETTINGS_KEY})
    if not doc:
        # Default initialization from environment
        return {
            "key": SETTINGS_KEY,
            "waste_cost": settings.DEFAULT_WASTE_COST,
            "stockout_cost": settings.DEFAULT_STOCKOUT_COST,
            "buffer_cap_percent": settings.DEFAULT_BUFFER_CAP_PERCENT
        }
    return {
        "key": SETTINGS_KEY,
        "waste_cost": float(doc["waste_cost"]),
        "stockout_cost": float(doc["stockout_cost"]),
        "buffer_cap_percent": float(doc["buffer_cap_percent"])
    }

def update_operator_settings(new_settings: Dict[str, Any]) -> Dict[str, Any]:
    col = get_settings_col()
    doc = {
        "key": SETTINGS_KEY,
        "waste_cost": float(new_settings.get("waste_cost", settings.DEFAULT_WASTE_COST)),
        "stockout_cost": float(new_settings.get("stockout_cost", settings.DEFAULT_STOCKOUT_COST)),
        "buffer_cap_percent": float(new_settings.get("buffer_cap_percent", settings.DEFAULT_BUFFER_CAP_PERCENT))
    }
    col.replace_one({"key": SETTINGS_KEY}, doc, upsert=True)
    return doc

get_settings = get_operator_settings
update_settings = update_operator_settings
