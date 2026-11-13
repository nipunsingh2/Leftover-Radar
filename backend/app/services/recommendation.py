from __future__ import annotations

from typing import Any, Dict, Optional

import numpy as np

from backend.app.config import settings
from backend.app.repositories.settings_repository import get_settings


def compute_recommendation(
    predicted_demand: float,
    p80_low: int,
    p80_high: int,
    waste_cost: Optional[float] = None,
    stockout_cost: Optional[float] = None,
    buffer_cap_percent: Optional[float] = None,
    calibrator: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Computes Newsvendor optimal prep recommendation with buffer cap (Section 7.6).
    Formula: q* = c_s / (c_s + c_w).
    Returns recommended prep portions, buffer portions, critical fractile, and audit rationale.
    """
    # 1. Load active settings if not explicitly passed
    if waste_cost is None or stockout_cost is None or buffer_cap_percent is None:
        try:
            curr_settings = get_settings()
            if waste_cost is None:
                waste_cost = float(curr_settings.get("waste_cost", settings.DEFAULT_WASTE_COST))
            if stockout_cost is None:
                stockout_cost = float(curr_settings.get("stockout_cost", settings.DEFAULT_STOCKOUT_COST))
            if buffer_cap_percent is None:
                buffer_cap_percent = float(curr_settings.get("buffer_cap_percent", settings.DEFAULT_BUFFER_CAP_PERCENT))
        except Exception:
            waste_cost = waste_cost or settings.DEFAULT_WASTE_COST
            stockout_cost = stockout_cost or settings.DEFAULT_STOCKOUT_COST
            buffer_cap_percent = buffer_cap_percent or settings.DEFAULT_BUFFER_CAP_PERCENT

    # 2. Critical fractile q*
    total_cost = stockout_cost + waste_cost
    if total_cost <= 0:
        q_star = 0.70
    else:
        q_star = round(stockout_cost / total_cost, 4)

    # 3. Buffer calculation
    if calibrator is not None and hasattr(calibrator, "residual_quantiles") and calibrator.residual_quantiles:
        # Calibrator residual quantile lookup
        avail = sorted([float(k) for k in calibrator.residual_quantiles.keys()])
        closest_q = min(avail, key=lambda q: abs(q - q_star))
        raw_buffer = float(calibrator.residual_quantiles[str(closest_q)])
    else:
        # Approximation from conformal interval range
        spread = max(0, p80_high - predicted_demand)
        raw_buffer = spread * (q_star - 0.50) / 0.40 if q_star >= 0.50 else -spread * (0.50 - q_star) / 0.40

    # 4. Cap buffer at buffer_cap_percent of predicted demand
    max_buffer = max(2.0, predicted_demand * buffer_cap_percent)
    capped_buffer = int(round(np.clip(raw_buffer, 0.0, max_buffer)))

    recommended_prep = max(0, int(round(predicted_demand + capped_buffer)))
    # Never exceed upper range bound unless predicted_demand itself exceeds p80_high
    if recommended_prep > p80_high and p80_high >= predicted_demand:
        recommended_prep = p80_high
        capped_buffer = max(0, recommended_prep - int(round(predicted_demand)))

    rationale = (
        f"Newsvendor q*={q_star:.2f} (c_s=₹{stockout_cost:.0f}, c_w=₹{waste_cost:.0f}) "
        f"-> +{capped_buffer} buffer (cap {int(buffer_cap_percent*100)}%)"
    )

    return {
        "recommended_prep": recommended_prep,
        "buffer_portions": capped_buffer,
        "critical_fractile": q_star,
        "waste_cost": waste_cost,
        "stockout_cost": stockout_cost,
        "buffer_cap_percent": buffer_cap_percent,
        "raw_buffer": round(raw_buffer, 2),
        "rationale": rationale,
    }


def evaluate_plan_risk(
    planned: int,
    predicted_demand: int,
    p80_low: int,
    p80_high: int,
    recommended_prep: int,
) -> Dict[str, str]:
    """
    Evaluates operational risk of the planned preparation vs conformal interval & recommendation.
    Returns level ('low' | 'watch' | 'high') and an actionable reason.
    """
    if planned < p80_low:
        return {
            "risk_level": "high",
            "risk_reason": f"Under-prep risk: planned ({planned}) is below 95% demand floor ({p80_low}). Likely stock-out.",
        }
    elif planned > p80_high:
        return {
            "risk_level": "high",
            "risk_reason": f"Over-prep risk: planned ({planned}) exceeds 95% demand ceiling ({p80_high}). High waste expected.",
        }
    elif planned > (predicted_demand * 1.15) and planned > recommended_prep:
        return {
            "risk_level": "watch",
            "risk_reason": f"Elevated prep: planned ({planned}) exceeds Newsvendor recommended buffer ({recommended_prep}).",
        }
    elif planned < predicted_demand:
        return {
            "risk_level": "watch",
            "risk_reason": f"Lean prep: planned ({planned}) is below expected demand ({predicted_demand}).",
        }
    else:
        return {
            "risk_level": "low",
            "risk_reason": f"Well-calibrated: planned ({planned}) is within 95% interval [{p80_low}, {p80_high}].",
        }
