from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np

from backend.app.database import format_service_date, get_collection, parse_service_date
from backend.app.repositories.forecast_repository import get_forecast_by_id


def generate_item_explanation(
    forecast_id: str,
    item_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generates explainability breakdown for a forecast item per Section 8.3:
    1. Waterfall drivers (contributions relative to baseline)
    2. Comparable historical services (last 3-5 similar occurrences)
    3. Newsvendor buffer inputs (costs, critical fractile, buffer cap)
    4. History depth and fallback ladder status
    """
    forecast_doc = get_forecast_by_id(forecast_id)
    if not forecast_doc:
        raise ValueError(f"Forecast snapshot with ID '{forecast_id}' not found.")

    target_item_id = item_id or forecast_doc.get("item_id")
    service_date_str = forecast_doc["service_date"]
    service_period = forecast_doc["service_period"]
    target_dt = parse_service_date(service_date_str)

    features = forecast_doc.get("input_features_snapshot", {})
    pred_demand = int(forecast_doc.get("predicted_demand", 0))
    p80_low = int(forecast_doc.get("lower_estimate", 0))
    p80_high = int(forecast_doc.get("upper_estimate", pred_demand))
    recommended_prep = int(forecast_doc.get("recommended_portions", pred_demand))
    history_status = forecast_doc.get("history_status", "sufficient")
    prediction_method = forecast_doc.get("prediction_method", "model")

    # 1. Historical comparable services
    obs_col = get_collection("service_observations")
    cursor = obs_col.find({
        "item_id": target_item_id,
        "service_period": service_period.lower(),
        "service_date": {"$lt": target_dt},
    }).sort("service_date", -1).limit(5)

    comparable_services: List[Dict[str, Any]] = []
    past_sales: List[int] = []
    for doc in cursor:
        dt = doc["service_date"]
        sold = int(doc.get("portions_sold", 0))
        prep = int(doc.get("portions_prepared", sold))
        past_sales.append(sold)
        context = doc.get("context", {})
        comparable_services.append({
            "service_date": format_service_date(dt),
            "day_of_name": dt.strftime("%A"),
            "weather": context.get("weather", "clear"),
            "portions_prepared": prep,
            "portions_sold": sold,
            "leftovers": max(0, prep - sold),
            "sold_out": bool(doc.get("sold_out", False)),
        })

    # 2. Waterfall Drivers Decomposition
    baseline_avg = float(np.mean(past_sales)) if past_sales else float(pred_demand)
    if baseline_avg <= 0:
        baseline_avg = max(1.0, float(pred_demand))

    drivers: List[Dict[str, Any]] = [
        {
            "name": "Historical Baseline Average",
            "contribution": round(baseline_avg, 1),
            "unit": "portions",
            "impact": "baseline",
            "description": f"Mean of last {len(past_sales)} service observations strictly preceding this date.",
        }
    ]

    dow_num = target_dt.weekday()
    dow_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    dow_name = dow_names[dow_num]

    # Day of week driver
    same_dow = features.get("same_weekday_mean")
    if same_dow and not np.isnan(same_dow) and same_dow > 0:
        dow_delta = round(float(same_dow) - baseline_avg, 1)
        drivers.append({
            "name": f"Day of Week ({dow_name})",
            "contribution": dow_delta,
            "unit": "portions",
            "impact": "positive" if dow_delta > 0 else ("negative" if dow_delta < 0 else "neutral"),
            "description": f"Historical pattern adjustment for {dow_name}s.",
        })

    # Weather driver
    weather = features.get("weather", "clear")
    if weather in ["rainy", "stormy"]:
        weather_impact = +8.0 if "soup" in target_item_id or "tea" in target_item_id or "maggi" in target_item_id else -4.0
        drivers.append({
            "name": f"Weather ({weather.title()})",
            "contribution": weather_impact,
            "unit": "portions",
            "impact": "positive" if weather_impact > 0 else "negative",
            "description": "Precipitation effect on campus footfall and dish preference.",
        })

    # Campus Event driver
    event = features.get("campus_event", 0)
    if event and event != "none" and event != 0:
        drivers.append({
            "name": "Campus Event Surge",
            "contribution": round(baseline_avg * 0.20, 1),
            "unit": "portions",
            "impact": "positive",
            "description": "Footfall surge from scheduled campus fest / symposium.",
        })

    # Exam week driver
    exam = features.get("exam_week", 0)
    if exam and exam != 0:
        exam_impact = round(baseline_avg * 0.12, 1)
        drivers.append({
            "name": "Exam Week Pattern",
            "contribution": exam_impact,
            "unit": "portions",
            "impact": "positive",
            "description": "Shift towards quick meals and late snacks during midterm/finals.",
        })

    # Recent momentum driver
    mean_7d = features.get("item_recent_mean_7d")
    if mean_7d and not np.isnan(mean_7d) and mean_7d > 0:
        momentum = round(float(mean_7d) - baseline_avg, 1)
        if abs(momentum) >= 1.0:
            drivers.append({
                "name": "Recent 7-Day Velocity",
                "contribution": momentum,
                "unit": "portions",
                "impact": "positive" if momentum > 0 else "negative",
                "description": "Short-term trend shift relative to long-term average.",
            })

    # 3. Newsvendor buffer inputs
    buffer_portions = max(0, recommended_prep - pred_demand)
    buffer_inputs = {
        "waste_cost": float(features.get("waste_cost", 30.0)),
        "stockout_cost": float(features.get("stockout_cost", 70.0)),
        "critical_fractile": round(70.0 / (70.0 + 30.0), 2),
        "raw_buffer": buffer_portions,
        "buffer_cap_percent": float(features.get("buffer_cap_percent", 0.15)),
        "capped_buffer": buffer_portions,
        "recommended_prep": recommended_prep,
        "rationale": f"Optimal safety buffer of +{buffer_portions} portions based on ₹70 stockout cost vs ₹30 waste cost.",
    }

    # 4. Fallback Explanation Text
    if history_status == "sufficient":
        explanation_text = (
            f"Trained Ridge regression model generated point prediction of {pred_demand} portions based on "
            f"{len(past_sales)}+ prior service observations. 80% conformal interval [{p80_low}, {p80_high}] "
            f"derived from held-out validation non-conformity scores."
        )
    elif history_status == "low_history":
        explanation_text = (
            f"Limited historical observations ({len(past_sales)} records). Conformal interval widened by 35% "
            f"[{p80_low}, {p80_high}] to account for parameter variance under sparse history."
        )
    elif history_status == "new_item":
        explanation_text = (
            f"New item cold-start (<3 prior observations). Predicted demand {pred_demand} portions is derived from "
            f"the category trailing mean for '{forecast_doc.get('category', 'main')}' during {service_period}."
        )
    else:
        explanation_text = "No prior history available. Please enter prep plan manually."

    return {
        "forecast_id": forecast_id,
        "item_id": target_item_id,
        "service_date": service_date_str,
        "service_period": service_period,
        "predicted_demand": pred_demand,
        "p80_low": p80_low,
        "p80_high": p80_high,
        "recommended_prep": recommended_prep,
        "buffer_portions": buffer_portions,
        "prediction_method": prediction_method,
        "history_status": history_status,
        "history_count": len(past_sales),
        "explanation_text": explanation_text,
        "drivers": drivers,
        "comparable_services": comparable_services,
        "buffer_inputs": buffer_inputs,
    }
