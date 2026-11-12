from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Calculate MAE, RMSE, WAPE, and Bias per Section 6.4 & 7.5."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    if len(y_true) == 0:
        return {"mae": 0.0, "rmse": 0.0, "wape": 0.0, "bias": 0.0}

    errors = y_pred - y_true
    abs_errors = np.abs(errors)

    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    sum_true = float(np.sum(y_true))
    wape = float(np.sum(abs_errors) / sum_true) if sum_true > 0 else 0.0
    bias = float(np.mean(errors))

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "wape": round(wape, 4),
        "bias": round(bias, 2)
    }

def compute_calibration_bins(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    n_bins: int = 5
) -> List[Dict[str, Any]]:
    """Generates predicted bins vs actual means for calibration inspection (Section 7.5)."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    if len(y_true) < n_bins:
        return []

    # Bin by predicted demand quantiles
    bin_edges = np.linspace(min(y_pred), max(y_pred) + 1e-5, n_bins + 1)
    bins = []

    for i in range(n_bins):
        low = bin_edges[i]
        high = bin_edges[i + 1]
        mask = (y_pred >= low) & (y_pred < high)
        if np.any(mask):
            pred_mean = float(np.mean(y_pred[mask]))
            act_mean = float(np.mean(y_true[mask]))
            count = int(np.sum(mask))
            bins.append({
                "bin_range": f"{int(round(low))}-{int(round(high))}",
                "predicted_mean": round(pred_mean, 1),
                "actual_mean": round(act_mean, 1),
                "count": count
            })
    return bins

def compute_detailed_breakdowns(
    val_df: pd.DataFrame,
    y_pred: np.ndarray
) -> Dict[str, Any]:
    """Computes breakdowns by period, category, item, and history depth (Section 7.5)."""
    df = val_df.copy()
    df["y_pred"] = y_pred
    df["abs_err"] = np.abs(df["portions_sold"] - df["y_pred"])

    # 1. By Service Period
    period_breakdown = {}
    for period, grp in df.groupby("service_period"):
        period_breakdown[period] = calculate_metrics(grp["portions_sold"].values, grp["y_pred"].values)

    # 2. By Category
    cat_breakdown = {}
    for cat, grp in df.groupby("category"):
        cat_breakdown[cat] = calculate_metrics(grp["portions_sold"].values, grp["y_pred"].values)

    # 3. Low-history (<14 observations) vs Normal history (>=14 observations)
    if "history_depth" in df.columns:
        low_hist_mask = df["history_depth"] < 14
        low_hist_df = df[low_hist_mask]
        norm_hist_df = df[~low_hist_mask]

        hist_split = {
            "low_history": calculate_metrics(low_hist_df["portions_sold"].values, low_hist_df["y_pred"].values) if len(low_hist_df) > 0 else None,
            "normal_history": calculate_metrics(norm_hist_df["portions_sold"].values, norm_hist_df["y_pred"].values) if len(norm_hist_df) > 0 else None,
            "low_history_count": len(low_hist_df),
            "normal_history_count": len(norm_hist_df)
        }
    else:
        hist_split = {}

    return {
        "period_breakdown": period_breakdown,
        "category_breakdown": cat_breakdown,
        "history_split": hist_split,
        "calibration_bins": compute_calibration_bins(df["portions_sold"].values, y_pred)
    }

def evaluate_baseline(train_df: pd.DataFrame, val_df: pd.DataFrame) -> Tuple[np.ndarray, Dict[str, float]]:
    """Legacy helper forwarding to TrailingMeanBaseline."""
    from backend.ml.baselines import TrailingMeanBaseline
    baseline = TrailingMeanBaseline(window_days=28)
    return baseline.evaluate(train_df, val_df)
