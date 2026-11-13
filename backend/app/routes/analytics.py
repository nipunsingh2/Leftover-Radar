from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Query

from backend.app.database import parse_service_date
from backend.app.services.analytics import (
    build_waste_sales_trend_pipeline,
    execute_accuracy_facet,
    execute_rolling_waste,
    execute_waste_sales_trend,
)

router = APIRouter(prefix="/analytics", tags=["Analytics & Aggregations"])


@router.get("/accuracy")
def get_accuracy_metrics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
) -> Dict[str, Any]:
    """
    Aggregation Pipeline 3 (Section 8.2):
    Forecast vs actual joined analysis grouped by item and category.
    Computes MAE, WAPE, and bias using MongoDB $facet in a single round-trip.
    """
    dt_start = parse_service_date(start_date) if start_date else None
    dt_end = parse_service_date(end_date) if end_date else None
    return execute_accuracy_facet(start_date=dt_start, end_date=dt_end)


@router.get("/waste")
def get_rolling_waste(
    limit_days: int = Query(60, ge=7, le=180, description="Number of days to return"),
) -> Dict[str, Any]:
    """
    Aggregation Pipeline 4 (Section 8.2):
    Rolling waste moving average computed via MongoDB $setWindowFields with a 7-day window.
    """
    series = execute_rolling_waste(limit_days=limit_days)
    return {
        "limit_days": limit_days,
        "count": len(series),
        "series": series,
    }


@router.get("/trend")
def get_waste_sales_trend(
    from_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    service: Optional[str] = Query(None, description="Service period filter"),
) -> Dict[str, Any]:
    """
    Aggregation Pipeline 1 (Section 8.2):
    Waste and sales trend over time with sell-through ratio.
    """
    dt_end = parse_service_date(to_date) if to_date else datetime.now(timezone.utc)
    dt_start = parse_service_date(from_date) if from_date else dt_end - timedelta(days=30)
    data = execute_waste_sales_trend(start_date=dt_start, end_date=dt_end, service_period=service)
    return {
        "from_date": dt_start.strftime("%Y-%m-%d"),
        "to_date": dt_end.strftime("%Y-%m-%d"),
        "service_period": service or "all",
        "data": data,
    }


@router.get("/aggregation-explain")
def explain_aggregation(
    date: Optional[str] = None,
    service: Optional[str] = "lunch",
    days: int = 14,
) -> Dict[str, Any]:
    """
    Returns the MongoDB aggregation pipeline stages and executed output.
    Demonstrates $match -> $lookup -> $unwind -> $group -> $project -> $sort
    for project evaluation & grading (Section 8.2).
    """
    target_dt = parse_service_date(date) if date else datetime.now(timezone.utc)
    start_dt = target_dt - timedelta(days=days)

    pipeline = build_waste_sales_trend_pipeline(start_dt, target_dt, service)
    results = execute_waste_sales_trend(start_dt, target_dt, service)

    stage_explanations = [
        {
            "stage": "$match",
            "purpose": "Filter service_observations within the selected date range and meal service.",
            "spec": pipeline[0]["$match"],
        },
        {
            "stage": "$lookup",
            "purpose": "Join the menu_items collection using item_id == menu_items._id to pull category and dish name.",
            "spec": pipeline[1]["$lookup"],
        },
        {
            "stage": "$unwind",
            "purpose": "Flatten joined item_details array while preserving records without matching menu entries.",
            "spec": pipeline[2]["$unwind"],
        },
        {
            "stage": "$group",
            "purpose": "Group records by service_date and service_period. Sum portions_prepared and portions_sold.",
            "spec": pipeline[3]["$group"],
        },
        {
            "stage": "$project",
            "purpose": "Project tidy output and compute estimated leftovers = max(portions_prepared - portions_sold, 0).",
            "spec": pipeline[4]["$project"],
        },
        {
            "stage": "$sort",
            "purpose": "Chronological ordering by service_date ascending for chart consumption.",
            "spec": pipeline[5]["$sort"],
        },
    ]

    return {
        "pipeline_stages": stage_explanations,
        "date_range": {
            "start": start_dt.strftime("%Y-%m-%d"),
            "end": target_dt.strftime("%Y-%m-%d"),
        },
        "service_period": service,
        "executed_results": results,
    }
