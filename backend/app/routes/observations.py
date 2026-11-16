from __future__ import annotations

import csv
import io
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Query, UploadFile
from pydantic import BaseModel, Field

from backend.app.errors import AppError
from backend.app.repositories.menu_repository import list_menu_items
from backend.app.repositories.observation_repository import (
    bulk_upsert_observations,
    get_observations,
    upsert_observation,
)

router = APIRouter(prefix="/observations", tags=["Observations & Actuals Recording"])


class SingleObservationInput(BaseModel):
    service_date: str = Field(description="YYYY-MM-DD service date")
    service_period: str = Field(description="breakfast, lunch, or dinner")
    item_id: str
    portions_prepared: int = Field(ge=0, description="Amount prepared, must be non-negative")
    portions_sold: int = Field(ge=0, description="Amount sold, must be non-negative")
    sold_out: Optional[bool] = None
    price: Optional[float] = Field(default=None, ge=0)
    weather: Optional[str] = "clear"
    campus_event: Optional[bool] = False
    source: Optional[str] = "manual_entry"


class BulkCloseOutItem(BaseModel):
    item_id: str
    portions_prepared: int = Field(ge=0)
    portions_sold: int = Field(ge=0)
    sold_out: Optional[bool] = None
    price: Optional[float] = None


class BulkCloseOutRequest(BaseModel):
    service_date: str = Field(description="YYYY-MM-DD service date")
    service_period: str = Field(description="breakfast, lunch, or dinner")
    items: List[BulkCloseOutItem] = Field(description="List of item close-out outcomes")
    weather: Optional[str] = "clear"
    campus_event: Optional[bool] = False


@router.get("", status_code=200)
def list_observations_route(
    date: Optional[str] = Query(None, description="Filter by YYYY-MM-DD"),
    service: Optional[str] = Query(None, description="Filter by breakfast, lunch, or dinner"),
    item_id: Optional[str] = Query(None, description="Filter by item_id"),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
) -> Dict[str, Any]:
    """Filter and paginate service observations."""
    obs = get_observations(
        date_str=date,
        service_period=service,
        item_id=item_id,
        limit=limit,
        skip=skip,
    )
    return {
        "count": len(obs),
        "skip": skip,
        "limit": limit,
        "observations": obs,
    }


@router.post("", status_code=200)
def record_single_observation(payload: SingleObservationInput) -> Dict[str, Any]:
    """
    Record or update actual service outcome after meal service.
    Enforces strict invariant: portions_sold <= portions_prepared.
    """
    if payload.portions_sold > payload.portions_prepared:
        raise AppError(
            code="VALIDATION_ERROR",
            message=f"Invariant violation: portions_sold ({payload.portions_sold}) cannot exceed portions_prepared ({payload.portions_prepared}).",
            status_code=422,
            field_errors={"portions_sold": "portions_sold must be <= portions_prepared"},
        )

    # Validate item exists
    menu_items = {m["id"]: m for m in list_menu_items(active_only=False)}
    if payload.item_id not in menu_items:
        raise AppError(
            code="VALIDATION_ERROR",
            message=f"Unknown menu item '{payload.item_id}'.",
            status_code=422,
            field_errors={"item_id": "Item ID not found in menu catalog."},
        )

    sold_out = payload.sold_out if payload.sold_out is not None else (payload.portions_sold >= payload.portions_prepared)

    doc = {
        "service_date": payload.service_date,
        "service_period": payload.service_period.lower(),
        "item_id": payload.item_id,
        "category": menu_items[payload.item_id]["category"],
        "price": payload.price or menu_items[payload.item_id]["price"],
        "portions_prepared": payload.portions_prepared,
        "portions_sold": payload.portions_sold,
        "sold_out": sold_out,
        "context": {
            "weather": payload.weather,
            "campus_event": payload.campus_event,
        },
        "source": payload.source or "manual_entry",
    }
    saved = upsert_observation(doc)
    return saved


@router.post("/bulk", status_code=200)
def bulk_close_out(payload: BulkCloseOutRequest) -> Dict[str, Any]:
    """
    Close-out endpoint: Records actual prepared and sold quantities for multiple dishes in one transaction (Section 8.3).
    Enforces sold <= prepared invariant on each item.
    """
    period = payload.service_period.lower()
    if period not in ["breakfast", "lunch", "dinner"]:
        raise AppError(
            code="VALIDATION_ERROR",
            message=f"Invalid service_period '{period}'.",
            status_code=422,
        )

    menu_catalog = {m["id"]: m for m in list_menu_items(active_only=False)}
    docs_to_upsert = []

    for it in payload.items:
        if it.portions_sold > it.portions_prepared:
            raise AppError(
                code="VALIDATION_ERROR",
                message=f"Item '{it.item_id}': portions_sold ({it.portions_sold}) cannot exceed portions_prepared ({it.portions_prepared}).",
                status_code=422,
                field_errors={it.item_id: "portions_sold cannot exceed portions_prepared"},
            )

        if it.item_id not in menu_catalog:
            raise AppError(
                code="VALIDATION_ERROR",
                message=f"Unknown menu item '{it.item_id}'.",
                status_code=422,
                field_errors={it.item_id: "Item not recognized in menu catalog."},
            )

        sold_out = it.sold_out if it.sold_out is not None else (it.portions_sold >= it.portions_prepared)
        meta = menu_catalog[it.item_id]

        docs_to_upsert.append({
            "service_date": payload.service_date,
            "service_period": period,
            "item_id": it.item_id,
            "category": meta["category"],
            "price": it.price or meta["price"],
            "portions_prepared": it.portions_prepared,
            "portions_sold": it.portions_sold,
            "sold_out": sold_out,
            "context": {
                "weather": payload.weather,
                "campus_event": payload.campus_event,
            },
            "source": "manual_entry",
        })

    upsert_stats = bulk_upsert_observations(docs_to_upsert)
    upserted_total = int(upsert_stats.get("upserted", 0)) + int(upsert_stats.get("modified", 0))

    return {
        "status": "success",
        "service_date": payload.service_date,
        "service_period": period,
        "items_processed": len(payload.items),
        "upserted_count": upserted_total,
        "details": upsert_stats,
    }


@router.post("/import", status_code=200)
async def import_observations_csv(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Import cafeteria history from a CSV file.
    Validates every row and reports accepted / rejected counts with specific error reasons (Section 8.3).
    """
    contents = await file.read()
    text = contents.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))

    valid_items = {item["id"]: item for item in list_menu_items(active_only=False)}

    accepted_docs = []
    rejected = []

    for row_idx, row in enumerate(reader, start=2):
        date_val = row.get("service_date", "").strip()
        period_val = row.get("service_period", "").strip().lower()
        item_val = row.get("item_id", "").strip()

        if not date_val or not period_val or not item_val:
            rejected.append({"row": row_idx, "reason": "Missing required fields (service_date, service_period, item_id)", "data": row})
            continue

        if period_val not in ["breakfast", "lunch", "dinner"]:
            rejected.append({"row": row_idx, "reason": f"Invalid service_period '{period_val}'", "data": row})
            continue

        if item_val not in valid_items:
            rejected.append({"row": row_idx, "reason": f"Unknown item_id '{item_val}'", "data": row})
            continue

        try:
            prep = int(row.get("portions_prepared", 0))
            sold = int(row.get("portions_sold", 0))
            if prep < 0 or sold < 0:
                rejected.append({"row": row_idx, "reason": "Negative portions", "data": row})
                continue
            if sold > prep:
                rejected.append({"row": row_idx, "reason": f"Invariant violation: sold ({sold}) > prepared ({prep})", "data": row})
                continue
        except ValueError:
            rejected.append({"row": row_idx, "reason": "Non-integer portions_prepared or portions_sold", "data": row})
            continue

        price_val = float(row.get("price", valid_items[item_val]["price"])) if row.get("price") else valid_items[item_val]["price"]
        sold_out_val = str(row.get("sold_out", "")).strip().lower() in ["true", "1", "yes"]
        campus_event = str(row.get("campus_event", "")).strip().lower() in ["true", "1", "yes"]
        exam_week = str(row.get("exam_week", "")).strip().lower() in ["true", "1", "yes"]
        holiday = str(row.get("holiday", "")).strip().lower() in ["true", "1", "yes"]
        weather = row.get("weather", "clear").strip()

        obs_data = {
            "service_date": date_val,
            "service_period": period_val,
            "item_id": item_val,
            "category": valid_items[item_val]["category"],
            "price": price_val,
            "portions_prepared": prep,
            "portions_sold": sold,
            "sold_out": sold_out_val or (sold >= prep),
            "context": {
                "campus_event": campus_event,
                "exam_week": exam_week,
                "holiday": holiday,
                "weather": weather,
            },
            "source": "csv_import",
        }
        accepted_docs.append(obs_data)

    if accepted_docs:
        bulk_upsert_observations(accepted_docs)

    return {
        "status": "success" if len(rejected) == 0 else "partial_success",
        "total_rows": len(accepted_docs) + len(rejected),
        "accepted_count": len(accepted_docs),
        "rejected_count": len(rejected),
        "rejected_details": rejected[:50],
    }
