from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Query

from backend.app.services.analytics import get_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Operations Summary"])


@router.get("/summary", status_code=200)
def get_operations_summary(
    date: str = Query(..., description="Service date YYYY-MM-DD"),
    service: str = Query(..., description="Meal service: breakfast, lunch, or dinner"),
) -> Dict[str, Any]:
    """
    Get operations summary for a selected service date & period (Section 8.3):
    Total planned, predicted demand, estimated leftovers, recorded actuals,
    and recent 14-day MongoDB aggregation trend (Pipeline 1).
    """
    summary = get_dashboard_summary(date, service.lower())
    return summary
