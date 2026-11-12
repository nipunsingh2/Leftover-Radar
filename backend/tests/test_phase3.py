import numpy as np
import pandas as pd

from backend.ml.baselines import SameWeekdayBaseline, TrailingMeanBaseline
from backend.ml.features import build_features_dataframe
from backend.ml.simulate import simulate_cafeteria_dataset


def test_leakage_assertion_on_future_tampering():
    """
    Mathematical proof of zero future leakage (Section 7.1, 8.4):
    Features computed for date D must NEVER depend on rows where service_date >= D.
    If future rows are perturbed/tampered, features on date D must remain 100% invariant.
    """
    obs, _ = simulate_cafeteria_dataset(days_count=60, seed=42)
    df_clean = pd.DataFrame(obs)

    # Pick a test date in the middle of history
    unique_dates = sorted(df_clean["service_date"].unique())
    target_date = unique_dates[35] # day 35

    # 1. Compute features on clean data
    feat_df_1, meta_1 = build_features_dataframe(df_clean, censoring_strategy="exclude")
    target_rows_1 = feat_df_1[feat_df_1["service_date"] == target_date].copy()

    # 2. Artificially tamper with ALL future rows (service_date >= target_date)
    df_tampered = df_clean.copy()
    future_mask = df_tampered["service_date"] >= target_date
    # Drastically tamper target and prepared in the future
    df_tampered.loc[future_mask, "portions_sold"] = df_tampered.loc[future_mask, "portions_sold"] * 10 + 500
    df_tampered.loc[future_mask, "portions_prepared"] = df_tampered.loc[future_mask, "portions_prepared"] * 10 + 500

    # 3. Compute features on tampered data
    feat_df_2, meta_2 = build_features_dataframe(df_tampered, censoring_strategy="exclude")
    target_rows_2 = feat_df_2[feat_df_2["service_date"] == target_date].copy()

    # 4. Strict assertion: All history features for target_date MUST BE EXACTLY IDENTICAL
    history_features = [
        "item_recent_mean_7d",
        "item_recent_mean_14d",
        "item_recent_mean_28d",
        "same_weekday_mean",
        "ewm_mean",
        "rolling_std",
        "last_observed_sold",
        "days_since_last_served",
        "days_since_introduced",
        "sell_through_trailing_mean",
        "history_depth",
        "category_period_trailing_mean",
        "price_ratio"
    ]

    for feat in history_features:
        vals_1 = target_rows_1[feat].values
        vals_2 = target_rows_2[feat].values
        # Handle nan comparison
        np.testing.assert_allclose(
            np.nan_to_num(vals_1, nan=-999.0),
            np.nan_to_num(vals_2, nan=-999.0),
            rtol=1e-5,
            err_msg=f"LEAKAGE DETECTED on feature '{feat}'! Value changed after future tampering."
        )

def test_baseline_evaluations_and_metrics():
    """
    Evaluates Baseline A and Baseline B on an out-of-time holdout split per Section 7.4.
    """
    obs, _ = simulate_cafeteria_dataset(days_count=90, seed=42)
    df = pd.DataFrame(obs)
    df["service_date"] = pd.to_datetime(df["service_date"])

    # Chronological holdout split (80% train, 20% validation)
    unique_dates = sorted(df["service_date"].unique())
    split_idx = int(len(unique_dates) * 0.8)
    train_dates = unique_dates[:split_idx]
    val_dates = unique_dates[split_idx:]

    train_df = df[df["service_date"].isin(train_dates)].copy()
    val_df = df[df["service_date"].isin(val_dates)].copy()

    # 1. Baseline A: 28-day trailing mean with category fallback
    baseline_a = TrailingMeanBaseline(window_days=28)
    _, metrics_a = baseline_a.evaluate(train_df, val_df)

    # 2. Baseline B: Same-weekday mean
    baseline_b = SameWeekdayBaseline(occurrences=4)
    _, metrics_b = baseline_b.evaluate(train_df, val_df)

    print("\n--- Out-of-Time Baseline Evaluation Results ---")
    print(f"{baseline_a.name}: MAE={metrics_a['mae']}, WAPE={metrics_a['wape']}, Bias={metrics_a['bias']}")
    print(f"{baseline_b.name}: MAE={metrics_b['mae']}, WAPE={metrics_b['wape']}, Bias={metrics_b['bias']}")

    assert metrics_a["mae"] > 0
    assert 0 < metrics_a["wape"] < 0.35
    assert metrics_b["mae"] > 0
    assert 0 < metrics_b["wape"] < 0.35
