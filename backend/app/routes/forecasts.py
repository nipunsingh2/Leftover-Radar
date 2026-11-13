from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from backend.app.errors import AppError
from backend.app.repositories.forecast_repository import get_saved_forecasts
from backend.app.repositories.menu_repository import list_menu_items
from backend.app.services.explain import generate_item_explanation
from backend.app.services.forecasting import generate_forecast_service

router = APIRouter(prefix="/forecasts", tags=["Forecasts & Planning"])


class ForecastItemInput(BaseModel):
    item_id: str
    planned_portions: Optional[int] = Field(default=None, ge=0)


class CreateForecastRequest(BaseModel):
    service_date: str = Field(description="Service date in YYYY-MM-DD format")
    service_period: str = Field(description="Meal period: breakfast, lunch, or dinner")
    items: Optional[List[ForecastItemInput]] = Field(default=None, description="Optional items; defaults to all active dishes")
    weather: Optional[str] = Field(default=None, description="Weather override (e.g. 'clear', 'rainy')")
    campus_event: Optional[bool] = Field(default=None, description="Campus event flag override")
    exam_week: Optional[bool] = Field(default=None, description="Exam week flag override")
    holiday: Optional[bool] = Field(default=None, description="Holiday flag override")


@router.post("", status_code=200)
def create_or_run_forecast(payload: CreateForecastRequest) -> Dict[str, Any]:
    """
    Generate demand forecast and Newsvendor prep recommendations.
    Immutably persists snapshot to MongoDB before returning.
    """
    items_list = [it.model_dump() for it in payload.items] if payload.items else None
    result = generate_forecast_service(
        service_date=payload.service_date,
        service_period=payload.service_period,
        items=items_list,
        weather_override=payload.weather,
        campus_event_override=payload.campus_event,
        exam_week_override=payload.exam_week,
        holiday_override=payload.holiday,
    )
    return result


@router.get("", status_code=200)
def list_or_get_forecasts(
    date: str = Query(..., description="Service date YYYY-MM-DD"),
    service: Optional[str] = Query(None, description="Service period: breakfast, lunch, or dinner"),
    service_period: Optional[str] = Query(None, description="Alias for service"),
) -> Dict[str, Any]:
    """
    Query saved immutable forecast snapshots for a given date and service period.
    """
    period = service or service_period
    if not period:
        raise AppError(
            code="VALIDATION_ERROR",
            message="Query parameter 'service' or 'service_period' is required.",
            status_code=422,
        )

    period_clean = period.strip().lower()
    menu_catalog = {m["id"]: m for m in list_menu_items(active_only=False)}

    saved_items = get_saved_forecasts(date, period_clean)
    for doc in saved_items:
        meta = menu_catalog.get(doc["item_id"], {})
        doc["item_name"] = meta.get("name", doc["item_id"].replace("_", " ").title())
        doc["category"] = meta.get("category", "main")
        doc["price"] = float(meta.get("price", 50.0))

    return {
        "service_date": date,
        "service_period": period_clean,
        "count": len(saved_items),
        "items": saved_items,
    }


@router.get("/compare", status_code=200)
def compare_forecasts_vs_actuals(
    from_date: Optional[str] = Query(None, alias="from", description="Start date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, alias="to", description="End date YYYY-MM-DD"),
    item: Optional[str] = Query(None, description="Item ID filter"),
    service: Optional[str] = Query(None, description="Service period filter"),
) -> Dict[str, Any]:
    """
    Aggregation Pipeline 2 (Section 8.2):
    Forecasts joined with actual observations on (service_date, service_period, item_id).
    Calculates error, absolute error, over/under status, and realized waste.
    """
    from backend.app.database import parse_service_date
    from backend.app.services.analytics import execute_forecast_vs_actual

    dt_start = parse_service_date(from_date) if from_date else None
    dt_end = parse_service_date(to_date) if to_date else None

    comparison = execute_forecast_vs_actual(
        start_date=dt_start,
        end_date=dt_end,
        item_id=item,
        service_period=service,
    )
    return {
        "count": len(comparison),
        "comparison": comparison,
    }


@router.get("/{forecast_id}/explain", status_code=200)
def explain_forecast_item(
    forecast_id: str,
    item_id: Optional[str] = Query(None, description="Target item_id if snapshot contains multiple dishes"),
) -> Dict[str, Any]:
    """
    Returns explainability breakdown for a forecast snapshot (Section 8.3):
    1. Waterfall drivers (day of week, weather, event, trend vs baseline)
    2. Comparable historical services
    3. Newsvendor buffer inputs (costs, critical fractile q*, buffer cap)
    4. History status & fallback reason
    """
    explanation = generate_item_explanation(forecast_id, item_id)
    return explanation
