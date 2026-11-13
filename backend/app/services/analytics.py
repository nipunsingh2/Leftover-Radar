from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from backend.app.database import format_service_date, get_collection, parse_service_date
from backend.app.repositories.forecast_repository import get_saved_forecasts
from backend.app.repositories.model_run_repository import get_latest_model_run
from backend.app.repositories.observation_repository import get_observations


# ==============================================================================
# PIPELINE 1: Waste / Sales Trend Aggregation (Section 8.2 #1)
# $match -> $lookup menu_items -> $group by $dateTrunc -> $project leftover, sell-through -> $sort
# ==============================================================================
def build_waste_sales_trend_pipeline(
    start_date: datetime,
    end_date: datetime,
    service_period: Optional[str] = None,
) -> List[Dict[str, Any]]:
    match_q: Dict[str, Any] = {
        "service_date": {"$gte": start_date, "$lte": end_date}
    }
    if service_period and service_period.lower() not in ["all", ""]:
        match_q["service_period"] = service_period.lower()

    return [
        {"$match": match_q},
        {
            "$lookup": {
                "from": "menu_items",
                "localField": "item_id",
                "foreignField": "_id",
                "as": "menu_item",
            }
        },
        {
            "$unwind": {
                "path": "$menu_item",
                "preserveNullAndEmptyArrays": True,
            }
        },
        {
            "$group": {
                "_id": {
                    "day": {"$dateTrunc": {"date": "$service_date", "unit": "day"}},
                    "service_period": "$service_period",
                },
                "total_prepared": {"$sum": "$portions_prepared"},
                "total_sold": {"$sum": "$portions_sold"},
                "item_count": {"$sum": 1},
            }
        },
        {
            "$project": {
                "_id": 0,
                "service_date": "$_id.day",
                "service_period": "$_id.service_period",
                "portions_prepared": "$total_prepared",
                "portions_sold": "$total_sold",
                "item_count": "$item_count",
                "leftover": {
                    "$max": [
                        0,
                        {"$subtract": ["$total_prepared", "$total_sold"]},
                    ]
                },
                "sell_through": {
                    "$cond": [
                        {"$gt": ["$total_prepared", 0]},
                        {"$round": [{"$divide": ["$total_sold", "$total_prepared"]}, 4]},
                        0.0,
                    ]
                },
            }
        },
        {"$sort": {"service_date": 1, "service_period": 1}},
    ]


def execute_waste_sales_trend(
    start_date: datetime,
    end_date: datetime,
    service_period: Optional[str] = None,
) -> List[Dict[str, Any]]:
    col = get_collection("service_observations")
    pipe = build_waste_sales_trend_pipeline(start_date, end_date, service_period)
    cursor = col.aggregate(pipe)
    results = []
    for doc in cursor:
        results.append({
            "date": format_service_date(doc["service_date"]),
            "service_period": doc["service_period"],
            "portions_prepared": int(doc["portions_prepared"]),
            "portions_sold": int(doc["portions_sold"]),
            "estimated_leftovers": int(doc["leftover"]),
            "sell_through": float(doc["sell_through"]),
        })
    return results


# ==============================================================================
# PIPELINE 2: Forecast vs Actual Join Aggregation (Section 8.2 #2)
# forecasts $lookup observations on (date, period, item) -> error, abs_error, over_under
# ==============================================================================
def build_forecast_vs_actual_pipeline(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    item_id: Optional[str] = None,
    service_period: Optional[str] = None,
) -> List[Dict[str, Any]]:
    match_q: Dict[str, Any] = {}
    if start_date and end_date:
        match_q["service_date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        match_q["service_date"] = {"$gte": start_date}
    elif end_date:
        match_q["service_date"] = {"$lte": end_date}

    if item_id:
        match_q["item_id"] = item_id
    if service_period and service_period.lower() not in ["all", ""]:
        match_q["service_period"] = service_period.lower()

    return [
        {"$match": match_q},
        {
            "$lookup": {
                "from": "service_observations",
                "let": {
                    "f_date": "$service_date",
                    "f_period": "$service_period",
                    "f_item": "$item_id",
                },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": ["$service_date", "$$f_date"]},
                                    {"$eq": ["$service_period", "$$f_period"]},
                                    {"$eq": ["$item_id", "$$f_item"]},
                                ]
                            }
                        }
                    }
                ],
                "as": "actual",
            }
        },
        {
            "$unwind": {
                "path": "$actual",
                "preserveNullAndEmptyArrays": True,
            }
        },
        {
            "$project": {
                "_id": 0,
                "forecast_id": {"$toString": "$_id"},
                "service_date": "$service_date",
                "service_period": "$service_period",
                "item_id": "$item_id",
                "predicted_demand": "$predicted_demand",
                "planned_portions": "$planned_portions",
                "lower_estimate": "$lower_estimate",
                "upper_estimate": "$upper_estimate",
                "recommended_portions": "$recommended_portions",
                "actual_prepared": "$actual.portions_prepared",
                "actual_sold": "$actual.portions_sold",
                "sold_out": {"$ifNull": ["$actual.sold_out", False]},
                "actual_recorded": {
                    "$cond": [{"$ifNull": ["$actual", False]}, True, False]
                },
                "error": {
                    "$cond": [
                        {"$ifNull": ["$actual.portions_sold", False]},
                        {"$subtract": ["$actual.portions_sold", "$predicted_demand"]},
                        None,
                    ]
                },
                "abs_error": {
                    "$cond": [
                        {"$ifNull": ["$actual.portions_sold", False]},
                        {"$abs": {"$subtract": ["$actual.portions_sold", "$predicted_demand"]}},
                        None,
                    ]
                },
                "over_under": {
                    "$cond": [
                        {"$ifNull": ["$actual.portions_sold", False]},
                        {
                            "$cond": [
                                {"$gt": ["$planned_portions", "$actual.portions_sold"]},
                                "over",
                                {
                                    "$cond": [
                                        {"$lt": ["$planned_portions", "$actual.portions_sold"]},
                                        "under",
                                        "exact",
                                    ]
                                },
                            ]
                        },
                        "pending",
                    ]
                },
                "waste": {
                    "$cond": [
                        {"$ifNull": ["$actual.portions_prepared", False]},
                        {
                            "$max": [
                                0,
                                {"$subtract": ["$actual.portions_prepared", "$actual.portions_sold"]},
                            ]
                        },
                        0,
                    ]
                },
            }
        },
        {"$sort": {"service_date": -1, "service_period": 1, "item_id": 1}},
    ]


def execute_forecast_vs_actual(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    item_id: Optional[str] = None,
    service_period: Optional[str] = None,
) -> List[Dict[str, Any]]:
    col = get_collection("forecasts")
    pipe = build_forecast_vs_actual_pipeline(start_date, end_date, item_id, service_period)
    cursor = col.aggregate(pipe)
    results = []
    for doc in cursor:
        results.append({
            "forecast_id": doc.get("forecast_id", ""),
            "service_date": format_service_date(doc["service_date"]),
            "service_period": doc["service_period"],
            "item_id": doc["item_id"],
            "predicted_demand": int(doc.get("predicted_demand", 0)),
            "planned_portions": int(doc.get("planned_portions", 0)),
            "lower_estimate": int(doc.get("lower_estimate", 0)),
            "upper_estimate": int(doc.get("upper_estimate", 0)),
            "recommended_portions": int(doc.get("recommended_portions", 0)),
            "actual_prepared": int(doc["actual_prepared"]) if doc.get("actual_prepared") is not None else None,
            "actual_sold": int(doc["actual_sold"]) if doc.get("actual_sold") is not None else None,
            "sold_out": bool(doc.get("sold_out", False)),
            "actual_recorded": bool(doc.get("actual_recorded", False)),
            "error": int(doc["error"]) if doc.get("error") is not None else None,
            "abs_error": int(doc["abs_error"]) if doc.get("abs_error") is not None else None,
            "over_under": doc.get("over_under", "pending"),
            "waste": int(doc.get("waste", 0)),
        })
    return results


# ==============================================================================
# PIPELINE 3: Accuracy by Item & Category ($facet) (Section 8.2 #3)
# ==============================================================================
def build_accuracy_facet_pipeline(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    # Step 1: Base match on forecasts with recorded observations
    match_q: Dict[str, Any] = {}
    if start_date and end_date:
        match_q["service_date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        match_q["service_date"] = {"$gte": start_date}
    elif end_date:
        match_q["service_date"] = {"$lte": end_date}

    return [
        {"$match": match_q},
        # Join observations
        {
            "$lookup": {
                "from": "service_observations",
                "let": {
                    "f_date": "$service_date",
                    "f_period": "$service_period",
                    "f_item": "$item_id",
                },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": ["$service_date", "$$f_date"]},
                                    {"$eq": ["$service_period", "$$f_period"]},
                                    {"$eq": ["$item_id", "$$f_item"]},
                                ]
                            }
                        }
                    }
                ],
                "as": "obs",
            }
        },
        {"$unwind": "$obs"},
        # Join menu_items for category
        {
            "$lookup": {
                "from": "menu_items",
                "localField": "item_id",
                "foreignField": "_id",
                "as": "menu_meta",
            }
        },
        {"$unwind": {"path": "$menu_meta", "preserveNullAndEmptyArrays": True}},
        {
            "$project": {
                "item_id": 1,
                "category": {"$ifNull": ["$menu_meta.category", "main"]},
                "predicted": "$predicted_demand",
                "sold": "$obs.portions_sold",
                "abs_error": {"$abs": {"$subtract": ["$obs.portions_sold", "$predicted_demand"]}},
                "signed_error": {"$subtract": ["$obs.portions_sold", "$predicted_demand"]},
            }
        },
        {
            "$facet": {
                "overall": [
                    {
                        "$group": {
                            "_id": None,
                            "count": {"$sum": 1},
                            "sum_abs_error": {"$sum": "$abs_error"},
                            "sum_signed_error": {"$sum": "$signed_error"},
                            "sum_sold": {"$sum": "$sold"},
                        }
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "count": 1,
                            "mae": {
                                "$round": [
                                    {"$divide": ["$sum_abs_error", {"$max": [1, "$count"]}]},
                                    2,
                                ]
                            },
                            "bias": {
                                "$round": [
                                    {"$divide": ["$sum_signed_error", {"$max": [1, "$count"]}]},
                                    2,
                                ]
                            },
                            "wape": {
                                "$round": [
                                    {"$divide": ["$sum_abs_error", {"$max": [1, "$sum_sold"]}]},
                                    4,
                                ]
                            },
                        }
                    },
                ],
                "by_category": [
                    {
                        "$group": {
                            "_id": "$category",
                            "count": {"$sum": 1},
                            "sum_abs_error": {"$sum": "$abs_error"},
                            "sum_signed_error": {"$sum": "$signed_error"},
                            "sum_sold": {"$sum": "$sold"},
                        }
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "category": "$_id",
                            "count": 1,
                            "mae": {
                                "$round": [
                                    {"$divide": ["$sum_abs_error", {"$max": [1, "$count"]}]},
                                    2,
                                ]
                            },
                            "bias": {
                                "$round": [
                                    {"$divide": ["$sum_signed_error", {"$max": [1, "$count"]}]},
                                    2,
                                ]
                            },
                            "wape": {
                                "$round": [
                                    {"$divide": ["$sum_abs_error", {"$max": [1, "$sum_sold"]}]},
                                    4,
                                ]
                            },
                        }
                    },
                    {"$sort": {"count": -1}},
                ],
                "by_item": [
                    {
                        "$group": {
                            "_id": "$item_id",
                            "category": {"$first": "$category"},
                            "count": {"$sum": 1},
                            "sum_abs_error": {"$sum": "$abs_error"},
                            "sum_signed_error": {"$sum": "$signed_error"},
                            "sum_sold": {"$sum": "$sold"},
                        }
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "item_id": "$_id",
                            "category": 1,
                            "count": 1,
                            "mae": {
                                "$round": [
                                    {"$divide": ["$sum_abs_error", {"$max": [1, "$count"]}]},
                                    2,
                                ]
                            },
                            "bias": {
                                "$round": [
                                    {"$divide": ["$sum_signed_error", {"$max": [1, "$count"]}]},
                                    2,
                                ]
                            },
                            "wape": {
                                "$round": [
                                    {"$divide": ["$sum_abs_error", {"$max": [1, "$sum_sold"]}]},
                                    4,
                                ]
                            },
                        }
                    },
                    {"$sort": {"count": -1}},
                ],
            }
        },
    ]


def execute_accuracy_facet(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    col = get_collection("forecasts")
    pipe = build_accuracy_facet_pipeline(start_date, end_date)
    res = list(col.aggregate(pipe))
    if not res:
        return {"overall": {}, "by_category": [], "by_item": []}

    facet_data = res[0]
    overall = facet_data["overall"][0] if facet_data.get("overall") else {
        "count": 0, "mae": 0.0, "bias": 0.0, "wape": 0.0
    }
    return {
        "overall": overall,
        "by_category": facet_data.get("by_category", []),
        "by_item": facet_data.get("by_item", []),
    }


# ==============================================================================
# PIPELINE 4: Rolling Waste ($setWindowFields with 7-day window) (Section 8.2 #4)
# ==============================================================================
def build_rolling_waste_pipeline(limit_days: int = 60) -> List[Dict[str, Any]]:
    return [
        {
            "$group": {
                "_id": {
                    "$dateTrunc": {"date": "$service_date", "unit": "day"}
                },
                "daily_prepared": {"$sum": "$portions_prepared"},
                "daily_sold": {"$sum": "$portions_sold"},
                "daily_waste": {
                    "$sum": {
                        "$max": [
                            0,
                            {"$subtract": ["$portions_prepared", "$portions_sold"]},
                        ]
                    }
                },
            }
        },
        {"$sort": {"_id": 1}},
        {
            "$setWindowFields": {
                "partitionBy": None,
                "sortBy": {"_id": 1},
                "output": {
                    "rolling_7d_waste": {
                        "$avg": "$daily_waste",
                        "window": {
                            "documents": [-6, 0],
                        },
                    },
                    "rolling_7d_sold": {
                        "$avg": "$daily_sold",
                        "window": {
                            "documents": [-6, 0],
                        },
                    },
                },
            }
        },
        {
            "$project": {
                "_id": 0,
                "service_date": "$_id",
                "daily_prepared": "$daily_prepared",
                "daily_sold": "$daily_sold",
                "daily_waste": "$daily_waste",
                "rolling_7d_waste": {"$round": ["$rolling_7d_waste", 2]},
                "rolling_7d_sold": {"$round": ["$rolling_7d_sold", 2]},
            }
        },
        {"$sort": {"service_date": -1}},
        {"$limit": limit_days},
    ]


def execute_rolling_waste(limit_days: int = 60) -> List[Dict[str, Any]]:
    col = get_collection("service_observations")
    pipe = build_rolling_waste_pipeline(limit_days)
    cursor = col.aggregate(pipe)
    results = []
    for doc in cursor:
        results.append({
            "service_date": format_service_date(doc["service_date"]),
            "daily_prepared": int(doc["daily_prepared"]),
            "daily_sold": int(doc["daily_sold"]),
            "daily_waste": int(doc["daily_waste"]),
            "rolling_7d_waste": float(doc["rolling_7d_waste"]),
            "rolling_7d_sold": float(doc["rolling_7d_sold"]),
        })
    # Return chronologically ascending for charts
    return list(reversed(results))


# ==============================================================================
# DASHBOARD SUMMARY SERVICE
# ==============================================================================
def get_dashboard_summary(service_date_str: str, service_period: str) -> Dict[str, Any]:
    """Compile service summary, saved forecast, actuals, and aggregation trend."""
    dt = parse_service_date(service_date_str)

    # 1. Check for saved forecast for this date and service
    saved_forecasts = get_saved_forecasts(service_date_str, service_period)
    has_saved_forecast = len(saved_forecasts) > 0

    total_planned = sum(f.get("planned_portions", 0) for f in saved_forecasts) if has_saved_forecast else 0
    total_predicted = sum(f.get("predicted_demand", 0) for f in saved_forecasts) if has_saved_forecast else 0
    total_estimated_leftovers = sum(f.get("estimated_leftovers", 0) for f in saved_forecasts) if has_saved_forecast else 0

    # 2. Check for recorded actuals
    actual_obs = get_observations(date_str=service_date_str, service_period=service_period, limit=200)
    has_actuals = len(actual_obs) > 0

    actual_prep = sum(o["portions_prepared"] for o in actual_obs) if has_actuals else None
    actual_sold = sum(o["portions_sold"] for o in actual_obs) if has_actuals else None
    actual_waste = sum(o["estimated_leftovers"] for o in actual_obs) if has_actuals else None

    # 3. MongoDB Aggregation 1: recent 14-day history trend for context
    start_trend = dt - timedelta(days=14)
    trend_data = execute_waste_sales_trend(start_trend, dt, service_period)

    # 4. Latest model metrics
    model_run = get_latest_model_run()

    return {
        "service_date": service_date_str,
        "service_period": service_period,
        "total_planned": total_planned,
        "total_predicted": total_predicted,
        "total_estimated_leftovers": total_estimated_leftovers,
        "saved_forecast_found": has_saved_forecast,
        "actuals_recorded": has_actuals,
        "actual_portions_prepared": actual_prep,
        "actual_portions_sold": actual_sold,
        "actual_leftovers": actual_waste,
        "recent_trend": trend_data,
        "model_version": model_run["model_version"] if model_run else "v3.production",
        "model_mae": model_run["mae"] if model_run else None,
        "baseline_mae": model_run["baseline_mae"] if model_run else None,
        "dataset_notice": "Demo dataset: simulated records. Out-of-time holdout validation. Decision support only.",
    }
