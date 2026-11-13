from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Query

from backend.app.errors import AppError
from backend.app.repositories.forecast_repository import get_saved_forecasts
from backend.app.repositories.menu_repository import list_menu_items

router = APIRouter(prefix="/export", tags=["Exports & Printable Sheets"])


@router.get("/forecast-sheet", status_code=200)
def get_printable_prep_sheet_data(
    date: str = Query(..., description="Service date YYYY-MM-DD"),
    service: str = Query(..., description="Service period: breakfast, lunch, or dinner"),
) -> Dict[str, Any]:
    """
    Data endpoint for kitchen printable preparation sheet (Section 8.3 & 12).
    Returns items formatted with planned portions, recommendations, safety buffer,
    batch prep notes, and verification checklists.
    """
    period_clean = service.strip().lower()
    menu_catalog = {m["id"]: m for m in list_menu_items(active_only=False)}

    saved_items = get_saved_forecasts(date, period_clean)
    if not saved_items:
        raise AppError(
            code="NOT_FOUND",
            message=f"No saved forecast found for date '{date}' and period '{period_clean}'. Generate a plan first.",
            status_code=404,
        )

    prep_items = []
    total_planned = 0
    total_recommended = 0

    for doc in saved_items:
        item_id = doc["item_id"]
        meta = menu_catalog.get(item_id, {})
        planned = int(doc.get("planned_portions", 0))
        rec = int(doc.get("recommended_portions", 0))
        pred = int(doc.get("predicted_demand", 0))
        buffer = max(0, rec - pred)

        total_planned += planned
        total_recommended += rec

        prep_items.append({
            "item_id": item_id,
            "item_name": meta.get("name", item_id.replace("_", " ").title()),
            "category": meta.get("category", "main"),
            "planned_portions": planned,
            "recommended_portions": rec,
            "predicted_demand": pred,
            "buffer_portions": buffer,
            "p80_range": f"{doc.get('lower_estimate', 0)} – {doc.get('upper_estimate', 0)}",
            "risk_level": "normal" if abs(planned - rec) <= 5 else ("watch" if planned > rec else "lean"),
            "prep_completed": False,
            "chef_notes": "",
        })

    return {
        "kitchen_name": "Campus Central Dining Hall",
        "service_date": date,
        "service_period": period_clean.title(),
        "total_items": len(prep_items),
        "total_planned_portions": total_planned,
        "total_recommended_portions": total_recommended,
        "items": prep_items,
        "sign_off": {
            "head_chef_signature": None,
            "prep_supervisor_signature": None,
            "verified_at": None,
        },
    }
