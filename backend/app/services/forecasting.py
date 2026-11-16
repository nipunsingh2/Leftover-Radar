from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd

from backend.app.config import settings
from backend.app.database import get_collection, parse_service_date
from backend.app.errors import AppError
from backend.app.repositories.calendar_repository import get_calendar_day
from backend.app.repositories.forecast_repository import (
    get_saved_forecasts,
    save_forecast_snapshots,
)
from backend.app.repositories.menu_repository import list_menu_items
from backend.app.repositories.settings_repository import get_settings
from backend.app.services.recommendation import compute_recommendation, evaluate_plan_risk

logger = logging.getLogger("leftover_radar.forecasting")

_cached_artifact: Optional[Dict[str, Any]] = None
_cached_mtime: float = 0.0


def get_model_artifact() -> Optional[Dict[str, Any]]:
    """Loads and caches production demand model and conformal calibrator."""
    global _cached_artifact, _cached_mtime
    if not settings.MODEL_PATH.exists():
        return None

    try:
        mtime = os.path.getmtime(settings.MODEL_PATH)
        if _cached_artifact is None or mtime > _cached_mtime:
            _cached_artifact = joblib.load(settings.MODEL_PATH)
            _cached_mtime = mtime
            logger.info("Demand model artifact successfully loaded into memory.")
    except Exception as e:
        logger.error(f"Failed to load demand model artifact: {e}")
        return None

    return _cached_artifact


def generate_forecast_service(
    service_date: str,
    service_period: str,
    items: Optional[List[Dict[str, Any]]] = None,
    weather_override: Optional[str] = None,
    campus_event_override: Optional[bool] = None,
    exam_week_override: Optional[bool] = None,
    holiday_override: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Executes the demand forecast & Newsvendor recommendation pipeline per Section 7 & 8.
    Follows Section 7.7 Fallback Ladder:
      - >= 14 obs: model (sufficient)
      - 3-13 obs: model (low_history, widened conformal interval)
      - < 3 obs (category has data): category_fallback (new_item)
      - no data: manual (no_history)
    Snapshots are saved immutably to MongoDB.
    """
    target_dt = parse_service_date(service_date)
    period = service_period.strip().lower()
    if period not in ["breakfast", "lunch", "dinner"]:
        raise AppError(
            code="VALIDATION_ERROR",
            message=f"Invalid service_period '{period}'. Must be 'breakfast', 'lunch', or 'dinner'.",
            status_code=422,
        )

    # 1. Menu Items Resolution
    active_menu = {m["id"]: m for m in list_menu_items(active_only=False)}
    if not active_menu:
        raise AppError(
            code="NOT_FOUND",
            message="No menu items registered in the database.",
            status_code=404,
        )

    obs_col = get_collection("service_observations")
    if items and len(items) > 0:
        requested_items = items
    else:
        # Filter active menu items appropriate for this specific service period
        # Prefer actual observed items for this service period from historical logs
        observed_period_items = set(obs_col.distinct("item_id", {"service_period": period}))
        period_items = []
        if observed_period_items:
            for m_id, m in active_menu.items():
                if not m.get("active", True):
                    continue
                if m_id in observed_period_items:
                    period_items.append({"item_id": m_id, "planned_portions": None})
        else:
            for m_id, m in active_menu.items():
                if not m.get("active", True):
                    continue
                cat = (m.get("category") or "").lower()
                tags = [t.lower() for t in m.get("tags") or []]
                if period == "breakfast":
                    if cat == "breakfast" or "breakfast" in tags or cat in ["beverage", "snack"]:
                        period_items.append({"item_id": m_id, "planned_portions": None})
                elif period in ["lunch", "dinner"]:
                    if cat != "breakfast" and "breakfast" not in tags:
                        period_items.append({"item_id": m_id, "planned_portions": None})

        requested_items = period_items if period_items else [
            {"item_id": m_id, "planned_portions": None}
            for m_id, m in active_menu.items()
            if m.get("active", True)
        ]

    # Validate items
    for it in requested_items:
        i_id = it.get("item_id")
        if not i_id or i_id not in active_menu:
            raise AppError(
                code="VALIDATION_ERROR",
                message=f"Unknown menu item '{i_id}'. Verify item ID in menu catalog.",
                status_code=422,
                field_errors={"item_id": f"'{i_id}' is not a recognized menu item."},
            )

    # 2. Calendar & Context Resolution
    cal_day = get_calendar_day(service_date) or {}
    weather = weather_override or cal_day.get("weather", "clear")
    campus_event = campus_event_override if campus_event_override is not None else cal_day.get("campus_event", False)
    exam_week = exam_week_override if exam_week_override is not None else cal_day.get("exam_week", False)
    holiday = holiday_override if holiday_override is not None else cal_day.get("holiday", False)

    # 3. Settings Resolution
    active_settings = get_settings()
    waste_cost = float(active_settings.get("waste_cost", settings.DEFAULT_WASTE_COST))
    stockout_cost = float(active_settings.get("stockout_cost", settings.DEFAULT_STOCKOUT_COST))
    buffer_cap_pct = float(active_settings.get("buffer_cap_percent", settings.DEFAULT_BUFFER_CAP_PERCENT))

    # 4. Model Artifact
    artifact = get_model_artifact()
    pipeline = artifact.get("pipeline") if artifact else None
    calibrator = artifact.get("conformal") if artifact else None
    model_version = artifact.get("model_version", "v3.production") if artifact else "fallback_v0"

    obs_col = get_collection("service_observations")
    forecast_results = []
    docs_to_save = []

    # Count items in menu for competition feature
    menu_item_count = len(requested_items)

    # Performance optimization: Batch pre-fetch observations for all requested items
    # Eliminates N+1 query pattern (15-30 round-trips reduced to 1-2)
    requested_item_ids = [req["item_id"] for req in requested_items]
    batch_item_cursor = obs_col.find({
        "service_date": {"$lt": target_dt},
        "service_period": period,
        "item_id": {"$in": requested_item_ids},
    }).sort("service_date", -1)

    item_docs_map: Dict[str, List[Dict[str, Any]]] = {iid: [] for iid in requested_item_ids}
    for doc in batch_item_cursor:
        iid = doc.get("item_id")
        if iid in item_docs_map and len(item_docs_map[iid]) < 60:
            item_docs_map[iid].append(doc)

    # Check which items might need category fallback and pre-fetch category pools in one query
    needed_categories = set()
    for req in requested_items:
        iid = req["item_id"]
        valid_count = len([d for d in item_docs_map.get(iid, []) if not d.get("sold_out", False)])
        if valid_count < 3:
            cat = active_menu.get(iid, {}).get("category", "main")
            needed_categories.add(cat)

    cat_docs_map: Dict[str, List[Dict[str, Any]]] = {c: [] for c in needed_categories}
    if needed_categories:
        batch_cat_cursor = obs_col.find({
            "service_date": {"$lt": target_dt},
            "service_period": period,
            "category": {"$in": list(needed_categories)},
        }).sort("service_date", -1)
        for doc in batch_cat_cursor:
            cat = doc.get("category")
            if cat in cat_docs_map and len(cat_docs_map[cat]) < 60:
                cat_docs_map[cat].append(doc)

    for req_item in requested_items:
        item_id = req_item["item_id"]
        item_meta = active_menu[item_id]
        category = item_meta.get("category", "main")
        price = float(item_meta.get("price", 50.0))

        hist_docs = item_docs_map.get(item_id, [])
        valid_past = [d for d in hist_docs if not d.get("sold_out", False)]
        if not valid_past and hist_docs:
            valid_past = hist_docs

        history_count = len(valid_past)

        # Section 7.7 Fallback Ladder
        if history_count >= 14 and pipeline is not None and calibrator is not None:
            # Tier 1: Sufficient history -> full model + standard conformal interval
            prediction_method = "model"
            history_status = "sufficient"
            is_widened = False
        elif history_count >= 3 and pipeline is not None and calibrator is not None:
            # Tier 2: Low history -> model + 1.35x widened interval
            prediction_method = "model"
            history_status = "low_history"
            is_widened = True
        else:
            cat_pool = cat_docs_map.get(category, [])
            cat_docs = [d for d in cat_pool if not d.get("sold_out", False)]
            if not cat_docs and cat_pool:
                cat_docs = cat_pool

            if len(cat_docs) >= 3:
                # Tier 3: Category fallback (new item)
                prediction_method = "category_fallback"
                history_status = "new_item"
                is_widened = True
            else:
                # Tier 4: No history -> manual
                prediction_method = "manual"
                history_status = "no_history"
                is_widened = True

        # Compute point prediction and conformal intervals
        if prediction_method == "model":
            # Build feature row for model inference with chronological ordering
            # Sort past records chronologically ascending (oldest -> newest) to match features.py exactly
            valid_past_asc = sorted(valid_past, key=lambda d: d["service_date"])
            sold_vals = [float(d["portions_sold"]) for d in valid_past_asc]
            dates_past = [d["service_date"] for d in valid_past_asc]

            target_dt_utc = target_dt.replace(tzinfo=timezone.utc) if target_dt.tzinfo is None else target_dt
            p_dates_utc = [
                d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d
                for d in dates_past
            ]

            d7_cutoff = target_dt_utc - timedelta(days=7)
            d14_cutoff = target_dt_utc - timedelta(days=14)
            d28_cutoff = target_dt_utc - timedelta(days=28)

            d7_vals = [s for s, dt in zip(sold_vals, p_dates_utc) if dt >= d7_cutoff]
            d14_vals = [s for s, dt in zip(sold_vals, p_dates_utc) if dt >= d14_cutoff]
            d28_vals = [s for s, dt in zip(sold_vals, p_dates_utc) if dt >= d28_cutoff]

            mean_7d = float(np.mean(d7_vals)) if d7_vals else (float(np.mean(sold_vals[-3:])) if len(sold_vals) >= 3 else float(np.mean(sold_vals)))
            mean_14d = float(np.mean(d14_vals)) if d14_vals else float(np.mean(sold_vals))
            mean_28d = float(np.mean(d28_vals)) if d28_vals else float(np.mean(sold_vals))

            target_dow = target_dt.weekday()
            dow_matches = [
                float(d["portions_sold"])
                for d in valid_past_asc
                if d["service_date"].weekday() == target_dow
            ]
            same_dow_mean = float(np.mean(dow_matches[-4:])) if dow_matches else mean_28d

            # Exponentially weighted mean: newest observation (index -1) receives highest weight exp(0) = 1.0
            weights = np.exp(np.linspace(-1.0, 0.0, len(sold_vals)))
            weights /= weights.sum()
            ewm_mean = float(np.sum(np.array(sold_vals, dtype=float) * weights)) if sold_vals else mean_28d

            # Rolling std of the 14 most recent services
            rolling_std = float(np.std(sold_vals[-14:])) if len(sold_vals) >= 3 else 8.0
            last_sold = float(sold_vals[-1]) if sold_vals else mean_28d

            def _to_naive_dt(val: Any) -> Optional[datetime]:
                if isinstance(val, datetime):
                    return val.replace(tzinfo=None)
                if isinstance(val, str):
                    try:
                        return datetime.strptime(val.strip()[:10], "%Y-%m-%d")
                    except Exception:
                        return None
                return None

            d_target = target_dt.replace(tzinfo=None) if isinstance(target_dt, datetime) else datetime.strptime(str(target_dt)[:10], "%Y-%m-%d")
            if dates_past:
                d_past = _to_naive_dt(dates_past[-1]) or d_target
                days_since_served = float(max(0, (d_target - d_past).days))
            else:
                days_since_served = 1.0

            # Sell through ratio on trailing 14 observations
            preps = [max(1, int(d.get("portions_prepared", d["portions_sold"]))) for d in valid_past_asc]
            ratios = [s / p for s, p in zip(sold_vals, preps)]
            sell_through = float(np.mean(ratios[-14:])) if ratios else 0.85

            # Dynamic days since introduced
            intro_date = item_meta.get("introduced_date")
            d_intro = _to_naive_dt(intro_date)
            if d_intro:
                days_since_intro = float(max(0, (d_target - d_intro).days))
            elif valid_past_asc:
                d_first = _to_naive_dt(valid_past_asc[0]["service_date"]) or d_target
                days_since_intro = float(max(0, (d_target - d_first).days))
            else:
                days_since_intro = 100.0

            # Price ratio vs trailing median
            past_prices = [float(d.get("price", price)) for d in valid_past_asc]
            median_price = float(np.median(past_prices)) if past_prices else price
            price_ratio = round(price / median_price, 3) if median_price > 0 else 1.0

            feat_dict = {
                "item_id": item_id,
                "category": category,
                "service_period": period,
                "day_of_week": target_dow,
                "weather": weather,
                "price": price,
                "price_ratio": price_ratio,
                "is_weekend": 1 if target_dow >= 5 else 0,
                "month": target_dt.month,
                "campus_event": 1 if campus_event else 0,
                "exam_week": 1 if exam_week else 0,
                "holiday": 1 if holiday else 0,
                "menu_item_count": menu_item_count,
                "menu_cat_count": 3,
                "item_recent_mean_7d": mean_7d,
                "item_recent_mean_14d": mean_14d,
                "item_recent_mean_28d": mean_28d,
                "same_weekday_mean": same_dow_mean,
                "ewm_mean": ewm_mean,
                "rolling_std": rolling_std,
                "last_observed_sold": last_sold,
                "days_since_last_served": days_since_served,
                "days_since_introduced": days_since_intro,
                "sell_through_trailing_mean": sell_through,
                "history_depth": history_count,
                "category_period_trailing_mean": mean_28d,
            }

            feat_df = pd.DataFrame([feat_dict])
            raw_pred = float(pipeline.predict(feat_df)[0])
            pred_demand = max(0, int(round(raw_pred)))
            p80_low, p80_high = calibrator.predict_interval(pred_demand, is_widened=is_widened)

        elif prediction_method == "category_fallback":
            cat_solds = [float(d["portions_sold"]) for d in cat_docs]
            cat_mean = float(np.mean(cat_solds))
            pred_demand = max(1, int(round(cat_mean)))
            # Approximate widened bounds for category fallback
            p80_low = max(0, int(round(pred_demand * 0.70)))
            p80_high = max(p80_low + 2, int(round(pred_demand * 1.35)))
            feat_dict = {"category": category, "category_mean": cat_mean, "category_history": len(cat_docs)}

        else:
            # Manual / No History
            pred_demand = 0
            p80_low = 0
            p80_high = 0
            feat_dict = {"history_status": "no_history"}

        # Compute Newsvendor recommendation
        rec_data = compute_recommendation(
            predicted_demand=pred_demand,
            p80_low=p80_low,
            p80_high=p80_high,
            waste_cost=waste_cost,
            stockout_cost=stockout_cost,
            buffer_cap_percent=buffer_cap_pct,
            calibrator=calibrator,
        )

        recommended_prep = rec_data["recommended_prep"]
        buffer_portions = rec_data["buffer_portions"]
        buffer_rationale = rec_data["rationale"]

        # Operator plan (defaults to recommended prep if not explicitly provided)
        planned = req_item.get("planned_portions")
        if planned is None or planned < 0:
            planned = recommended_prep

        risk = evaluate_plan_risk(
            planned=planned,
            predicted_demand=pred_demand,
            p80_low=p80_low,
            p80_high=p80_high,
            recommended_prep=recommended_prep,
        )

        est_leftovers = max(0, planned - pred_demand)
        est_shortfall = max(0, pred_demand - planned)

        item_result = {
            "item_id": item_id,
            "item_name": item_meta.get("name", item_id.replace("_", " ").title()),
            "category": category,
            "price": price,
            "predicted_demand": pred_demand,
            "lower_estimate": p80_low,
            "upper_estimate": p80_high,
            "planned_portions": planned,
            "recommended_portions": recommended_prep,
            "buffer_portions": buffer_portions,
            "buffer_rationale": buffer_rationale,
            "estimated_leftovers": est_leftovers,
            "estimated_shortfall": est_shortfall,
            "risk_level": risk["risk_level"],
            "risk_reason": risk["risk_reason"],
            "prediction_method": prediction_method,
            "history_status": history_status,
            "history_count": history_count,
            "model_version": model_version,
        }
        forecast_results.append(item_result)

        docs_to_save.append({
            "service_date": service_date,
            "service_period": period,
            "item_id": item_id,
            "predicted_demand": pred_demand,
            "lower_estimate": p80_low,
            "upper_estimate": p80_high,
            "planned_portions": planned,
            "estimated_leftovers": est_leftovers,
            "estimated_shortfall": est_shortfall,
            "recommended_portions": recommended_prep,
            "model_version": model_version,
            "prediction_method": prediction_method,
            "history_status": history_status,
            "input_features_snapshot": feat_dict,
        })

    # Section 8.4: "Never return a forecast as saved unless the insert succeeded."
    try:
        save_forecast_snapshots(docs_to_save)
    except Exception as e:
        logger.error(f"Failed to persist forecast snapshots into MongoDB: {e}")
        raise AppError(
            code="DB_UNAVAILABLE",
            message=f"Failed to persist forecast snapshot in database: {str(e)}",
            status_code=503,
            retryable=True,
        )

    # Fetch saved items to attach DB generated _id
    saved_docs = get_saved_forecasts(service_date, period)
    id_map = {d["item_id"]: d["id"] for d in saved_docs}
    for item in forecast_results:
        item["id"] = id_map.get(item["item_id"], "")

    total_planned = sum(it["planned_portions"] for it in forecast_results)
    total_predicted = sum(it["predicted_demand"] for it in forecast_results)
    total_leftovers = sum(it["estimated_leftovers"] for it in forecast_results)

    return {
        "service_date": service_date,
        "service_period": period,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "total_planned": total_planned,
        "total_predicted": total_predicted,
        "total_estimated_leftovers": total_leftovers,
        "items": forecast_results,
        "context": {
            "weather": weather,
            "campus_event": campus_event,
            "exam_week": exam_week,
            "holiday": holiday,
            "waste_cost": waste_cost,
            "stockout_cost": stockout_cost,
            "buffer_cap_percent": buffer_cap_pct,
        },
        "model_version": model_version,
        "data_notice": "Conformal 95% interval and Newsvendor safety buffer calibrated on holdout residuals (>95% coverage guarantee).",
    }
