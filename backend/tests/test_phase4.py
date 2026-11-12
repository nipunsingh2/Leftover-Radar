from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np

from backend.ml.conformal import ConformalIntervalCalibrator

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODELS_DIR / "demand_model.joblib"
METRICS_PATH = MODELS_DIR / "model_metrics.json"


def test_model_artifact_and_metrics_exist():
    """Verify production model and metrics JSON exist and are valid."""
    assert MODEL_PATH.exists(), "demand_model.joblib must exist"
    assert METRICS_PATH.exists(), "model_metrics.json must exist"

    with open(METRICS_PATH, "r", encoding="utf-8") as f:
        metrics = json.load(f)

    assert "model_version" in metrics
    assert "mae" in metrics
    assert "baseline_mae" in metrics
    assert "coverage_80" in metrics
    assert "breakdowns" in metrics
    assert "calibration_bins" in metrics["breakdowns"]

    # Model must beat baseline MAE
    assert metrics["mae"] < metrics["baseline_mae"], f"Model MAE ({metrics['mae']}) must beat baseline ({metrics['baseline_mae']})"
    # 80% coverage must be within calibrated tolerance [0.75, 0.86]
    assert 0.75 <= metrics["coverage_80"] <= 0.86, f"Conformal coverage ({metrics['coverage_80']}) must be near 80%"


def test_model_artifact_load_and_predict():
    """Ensure the serialized joblib artifact loads and can predict on sample feature dict."""
    import pandas as pd

    artifact = joblib.load(MODEL_PATH)
    assert "pipeline" in artifact
    assert "conformal" in artifact
    assert "features" in artifact

    pipeline = artifact["pipeline"]
    calibrator = artifact["conformal"]

    assert isinstance(calibrator, ConformalIntervalCalibrator)

    # Sample inference row
    sample = pd.DataFrame([{
        "item_id": "chicken_biryani",
        "category": "mains",
        "service_period": "lunch",
        "day_of_week": 4,
        "weather": "clear",
        "price": 140.0,
        "price_ratio": 1.1,
        "is_weekend": 0,
        "month": 10,
        "campus_event": 0,
        "exam_week": 0,
        "holiday": 0,
        "menu_item_count": 8,
        "menu_cat_count": 3,
        "item_recent_mean_7d": 85.0,
        "item_recent_mean_14d": 82.0,
        "item_recent_mean_28d": 80.0,
        "same_weekday_mean": 88.0,
        "ewm_mean": 84.0,
        "rolling_std": 12.0,
        "last_observed_sold": 86.0,
        "days_since_last_served": 1,
        "days_since_introduced": 120,
        "sell_through_trailing_mean": 0.95,
        "history_depth": 25,
        "category_period_trailing_mean": 75.0,
    }])

    pred = pipeline.predict(sample)
    assert len(pred) == 1
    assert pred[0] > 0, "Prediction must be strictly positive"

    low, high = calibrator.predict_interval(pred[0])
    assert low < pred[0] <= high, f"Expected low ({low}) < pred ({pred[0]}) <= high ({high})"


def test_conformal_calibrator_properties():
    """Test conformal interval calibration math with synthetic validation residuals."""
    calibrator = ConformalIntervalCalibrator(target_coverage=0.80)
    y_val = np.array([50, 60, 70, 80, 90, 100, 110, 120, 130, 140], dtype=float)
    y_pred = np.array([52, 58, 69, 82, 88, 101, 108, 122, 128, 141], dtype=float)
    calibrator.fit(y_val, y_pred)

    low, high = calibrator.predict_interval(100.0)
    assert low < 100.0 < high
    assert (high - low) > 0

    # Widened interval for low-history items
    w_low, w_high = calibrator.predict_interval(100.0, is_widened=True)
    assert (w_high - w_low) >= (high - low)


def test_newsvendor_recommendation_logic():
    """Test critical fractile calculation, asymmetric cost shifts, and buffer cap."""
    artifact = joblib.load(MODEL_PATH)
    calibrator = artifact["conformal"]

    pred = 100.0

    # Case 1: High stockout cost (c_s = 80, c_w = 20) -> q* = 0.80
    high_cs_rec, high_cs_buf, high_cs_rat = calibrator.compute_newsvendor_recommendation(
        predicted_demand=pred,
        waste_cost=20.0,
        stockout_cost=80.0,
        buffer_cap_percent=0.20,
    )

    # Case 2: High waste cost (c_s = 20, c_w = 80) -> q* = 0.20
    high_cw_rec, high_cw_buf, high_cw_rat = calibrator.compute_newsvendor_recommendation(
        predicted_demand=pred,
        waste_cost=80.0,
        stockout_cost=20.0,
        buffer_cap_percent=0.20,
    )

    assert high_cs_rec >= high_cw_rec
    assert high_cs_buf >= high_cw_buf
    assert "Newsvendor" in high_cs_rat

    # Case 3: Buffer cap enforcement
    capped_rec, capped_buf, _ = calibrator.compute_newsvendor_recommendation(
        predicted_demand=pred,
        waste_cost=5.0,
        stockout_cost=95.0,
        buffer_cap_percent=0.05,
    )
    assert capped_buf <= 5
    assert capped_rec <= 105
