from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from backend.app.repositories.calendar_repository import (
    get_calendar_day,
    upsert_calendar_day,
)

router = APIRouter(prefix="/calendar", tags=["Calendar Context"])

WeatherType = Literal["sunny", "clear", "cloudy", "rainy", "hot"]


class CalendarDayUpdatePayload(BaseModel):
    weather: Optional[WeatherType] = Field(default="clear", description="sunny, clear, cloudy, rainy, hot")
    campus_event: Optional[bool] = Field(default=False, description="Campus event/fest scheduled")
    event_name: Optional[str] = None
    exam_week: Optional[bool] = Field(default=False, description="Midterms or finals week")
    holiday: Optional[bool] = Field(default=False, description="Official campus holiday")
    holiday_name: Optional[str] = None


@router.get("", status_code=200)
def get_calendar_context(
    date: str = Query(..., description="Service date YYYY-MM-DD"),
) -> Dict[str, Any]:
    """Retrieve operational context (weather, event, exams) for a given date."""
    day = get_calendar_day(date)
    if not day:
        return {
            "date": date,
            "weather": "clear",
            "campus_event": False,
            "event_name": None,
            "exam_week": False,
            "holiday": False,
            "holiday_name": None,
        }
    return day


@router.put("/{date}", status_code=200)
def update_calendar_context(date: str, payload: CalendarDayUpdatePayload) -> Dict[str, Any]:
    """Update or upsert operational context for a given date (Section 8.3)."""
    data = {
        "date": date,
        "weather": payload.weather or "clear",
        "campus_event": bool(payload.campus_event),
        "event_name": payload.event_name,
        "exam_week": bool(payload.exam_week),
        "holiday": bool(payload.holiday),
        "holiday_name": payload.holiday_name,
    }
    saved = upsert_calendar_day(data)
    return {
        "status": "success",
        "date": date,
        "context": saved,
    }
