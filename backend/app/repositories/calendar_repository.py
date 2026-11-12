from typing import Any, Dict, List, Optional

from pymongo import UpdateOne

from backend.app.database import format_service_date, get_collection, parse_service_date


def get_cal_col():
    return get_collection("calendar_days")

def get_calendar_day(date_str: str) -> Optional[Dict[str, Any]]:
    col = get_cal_col()
    dt = parse_service_date(date_str)
    doc = col.find_one({"date": dt})
    if not doc:
        return None
    return {
        "date": format_service_date(doc["date"]),
        "campus_event": bool(doc.get("campus_event", False)),
        "event_name": doc.get("event_name"),
        "exam_week": bool(doc.get("exam_week", False)),
        "holiday": bool(doc.get("holiday", False)),
        "holiday_name": doc.get("holiday_name"),
        "weather": doc.get("weather", "clear")
    }

def upsert_calendar_day(day_data: Dict[str, Any]) -> Dict[str, Any]:
    col = get_cal_col()
    dt = parse_service_date(day_data["date"])
    date_str = format_service_date(dt)
    doc = {
        "date": dt,
        "date_str": date_str,
        "campus_event": bool(day_data.get("campus_event", False)),
        "event_name": day_data.get("event_name"),
        "exam_week": bool(day_data.get("exam_week", False)),
        "holiday": bool(day_data.get("holiday", False)),
        "holiday_name": day_data.get("holiday_name"),
        "weather": day_data.get("weather", "clear")
    }
    col.replace_one({"date": dt}, doc, upsert=True)
    return doc

def bulk_seed_calendar_days(days: List[Dict[str, Any]]) -> int:
    if not days:
        return 0
    col = get_cal_col()
    ops = []
    for d in days:
        dt = parse_service_date(d["date"])
        ops.append(
            UpdateOne(
                {"date": dt},
                {"$set": {
                    "date": dt,
                    "date_str": format_service_date(dt),
                    "campus_event": bool(d.get("campus_event", False)),
                    "event_name": d.get("event_name"),
                    "exam_week": bool(d.get("exam_week", False)),
                    "holiday": bool(d.get("holiday", False)),
                    "holiday_name": d.get("holiday_name"),
                    "weather": d.get("weather", "clear")
                }},
                upsert=True
            )
        )
    res = col.bulk_write(ops)
    return res.upserted_count + res.modified_count
