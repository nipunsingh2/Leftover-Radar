from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.app.config import settings as app_settings
from backend.app.repositories.settings_repository import (
    get_operator_settings,
    update_operator_settings,
)

router = APIRouter(prefix="/settings", tags=["Settings & Cost Parameters"])


class SettingsUpdatePayload(BaseModel):
    waste_cost: Optional[float] = Field(default=None, ge=0.0, description="Cost per wasted portion in INR (c_w)")
    stockout_cost: Optional[float] = Field(default=None, ge=0.0, description="Cost per missed customer sale in INR (c_s)")
    buffer_cap_percent: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Max buffer allowance as fraction e.g. 0.15 for 15%")


@router.get("", status_code=200)
def get_settings_route() -> Dict[str, Any]:
    """Retrieve active operator cost parameters and buffer cap."""
    st = get_operator_settings()
    cw = float(st.get("waste_cost", app_settings.DEFAULT_WASTE_COST))
    cs = float(st.get("stockout_cost", app_settings.DEFAULT_STOCKOUT_COST))
    cap = float(st.get("buffer_cap_percent", app_settings.DEFAULT_BUFFER_CAP_PERCENT))
    q_star = round(cs / (cs + cw), 4) if (cs + cw) > 0 else 0.70

    return {
        "waste_cost": cw,
        "stockout_cost": cs,
        "buffer_cap_percent": cap,
        "critical_fractile": q_star,
        "defaults": {
            "waste_cost": app_settings.DEFAULT_WASTE_COST,
            "stockout_cost": app_settings.DEFAULT_STOCKOUT_COST,
            "buffer_cap_percent": app_settings.DEFAULT_BUFFER_CAP_PERCENT,
        },
    }


@router.put("", status_code=200)
def update_settings_route(payload: SettingsUpdatePayload) -> Dict[str, Any]:
    """Update operator cost parameters and buffer cap (Section 8.3)."""
    current = get_operator_settings()
    updated = {
        "waste_cost": payload.waste_cost if payload.waste_cost is not None else current.get("waste_cost", app_settings.DEFAULT_WASTE_COST),
        "stockout_cost": payload.stockout_cost if payload.stockout_cost is not None else current.get("stockout_cost", app_settings.DEFAULT_STOCKOUT_COST),
        "buffer_cap_percent": payload.buffer_cap_percent if payload.buffer_cap_percent is not None else current.get("buffer_cap_percent", app_settings.DEFAULT_BUFFER_CAP_PERCENT),
    }
    saved = update_operator_settings(updated)
    cw = float(saved["waste_cost"])
    cs = float(saved["stockout_cost"])
    cap = float(saved["buffer_cap_percent"])
    q_star = round(cs / (cs + cw), 4) if (cs + cw) > 0 else 0.70

    return {
        "status": "success",
        "waste_cost": cw,
        "stockout_cost": cs,
        "buffer_cap_percent": cap,
        "critical_fractile": q_star,
    }
