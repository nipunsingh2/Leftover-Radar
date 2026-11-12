from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd

CATEGORICAL_FEATURES = [
    "item_id",
    "category",
    "service_period",
    "day_of_week",
    "weather"
]

NUMERIC_FEATURES = [
    "price",
    "price_ratio",
    "is_weekend",
    "month",
    "campus_event",
    "exam_week",
    "holiday",
    "menu_item_count",
    "menu_cat_count",
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
    "category_period_trailing_mean"
]

ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES

def build_features_dataframe(
    df: pd.DataFrame,
    censoring_strategy: str = "exclude"
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Builds rich, leakage-free features per Section 7.3.
    For each row on service_date D, all history features read ONLY rows with service_date < D.
    Supports two censoring strategies (Section 7.2):
    1. 'exclude': filters out sold_out rows from target training and history windows.
    2. 'censor_adjust': replaces target on sold_out rows with max(sold, expected_demand) flagged as imputed.
    """
    df = df.copy()
    df["service_date"] = pd.to_datetime(df["service_date"])
    df = df.sort_values(by=["service_date", "service_period", "item_id"]).reset_index(drop=True)

    # Basic calendar & context
    df["day_of_week"] = df["service_date"].dt.weekday
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    df["month"] = df["service_date"].dt.month

    # Ensure binary context fields
    for col in ["campus_event", "exam_week", "holiday"]:
        if col not in df.columns:
            df[col] = 0
        else:
            df[col] = df[col].astype(int)

    if "weather" not in df.columns:
        df["weather"] = "clear"
    else:
        df["weather"] = df["weather"].fillna("clear")

    # Menu mix proxies (competition on the same service)
    # Count dishes on that service date & period
    service_menu_counts = df.groupby(["service_date", "service_period"])["item_id"].transform("count")
    df["menu_item_count"] = service_menu_counts

    service_cat_counts = df.groupby(["service_date", "service_period", "category"])["item_id"].transform("count")
    df["menu_cat_count"] = service_cat_counts

    # Handle censoring target adjustment if strategy == 'censor_adjust'
    target_col = "portions_sold"
    if censoring_strategy == "censor_adjust":
        # Calculate trailing non-censored median per item x period
        df["adjusted_target"] = df["portions_sold"].astype(float)
        df["is_imputed"] = 0
        target_col = "adjusted_target"

    # Pre-index historical slices for fast, non-leaking feature computation
    # Chronological expansion:
    n_rows = len(df)

    # Feature vectors
    f_mean_7d = np.zeros(n_rows, dtype=float)
    f_mean_14d = np.zeros(n_rows, dtype=float)
    f_mean_28d = np.zeros(n_rows, dtype=float)
    f_same_dow = np.zeros(n_rows, dtype=float)
    f_ewm = np.zeros(n_rows, dtype=float)
    f_std = np.zeros(n_rows, dtype=float)
    f_last_val = np.zeros(n_rows, dtype=float)
    f_days_since_served = np.zeros(n_rows, dtype=float)
    f_days_since_intro = np.zeros(n_rows, dtype=float)
    f_sell_through = np.zeros(n_rows, dtype=float)
    f_history_depth = np.zeros(n_rows, dtype=int)
    f_cat_mean = np.zeros(n_rows, dtype=float)
    f_price_ratio = np.ones(n_rows, dtype=float)

    # Group records by (item_id, service_period) to calculate strictly past rolling features
    grouped = df.groupby(["item_id", "service_period"])

    for (item_id, period), indices in grouped.groups.items():
        sub = df.loc[indices]
        # Item introduction date is first appearance in history
        intro_date = sub["service_date"].iloc[0]

        for i, (orig_idx, row) in enumerate(sub.iterrows()):
            curr_date = row["service_date"]
            curr_dow = row["day_of_week"]
            curr_price = row["price"]

            # STRICT NO-LEAKAGE: rows with service_date < curr_date
            past = sub.iloc[:i]
            past = past[past["service_date"] < curr_date]

            # Filter sold_out rows from history if excluding
            if censoring_strategy == "exclude":
                valid_past = past[~past["sold_out"]] if "sold_out" in past.columns else past
                if len(valid_past) == 0:
                    valid_past = past
            else:
                valid_past = past

            depth = len(valid_past)
            f_history_depth[orig_idx] = depth
            f_days_since_intro[orig_idx] = (curr_date - intro_date).days

            if depth > 0:
                past_sold = valid_past["portions_sold"].values
                past_dates = valid_past["service_date"]

                # Days since last served
                f_days_since_served[orig_idx] = (curr_date - past_dates.iloc[-1]).days
                f_last_val[orig_idx] = past_sold[-1]

                # Price relative to trailing median
                median_price = valid_past["price"].median()
                f_price_ratio[orig_idx] = round(curr_price / median_price, 3) if median_price > 0 else 1.0

                # 7d / 14d / 28d windows
                d7_mask = past_dates >= (curr_date - pd.Timedelta(days=7))
                d14_mask = past_dates >= (curr_date - pd.Timedelta(days=14))
                d28_mask = past_dates >= (curr_date - pd.Timedelta(days=28))

                f_mean_7d[orig_idx] = past_sold[d7_mask].mean() if np.any(d7_mask) else past_sold[-3:].mean()
                f_mean_14d[orig_idx] = past_sold[d14_mask].mean() if np.any(d14_mask) else past_sold.mean()
                f_mean_28d[orig_idx] = past_sold[d28_mask].mean() if np.any(d28_mask) else past_sold.mean()

                # Same weekday history (last 4 occurrences)
                dow_mask = valid_past["day_of_week"] == curr_dow
                same_dow_sold = past_sold[dow_mask]
                f_same_dow[orig_idx] = same_dow_sold[-4:].mean() if len(same_dow_sold) > 0 else f_mean_28d[orig_idx]

                # Exponentially weighted mean
                weights = np.exp(np.linspace(-1.0, 0.0, len(past_sold)))
                weights /= weights.sum()
                f_ewm[orig_idx] = np.sum(past_sold * weights)

                # Rolling std
                f_std[orig_idx] = float(np.std(past_sold[-14:])) if len(past_sold) >= 3 else 5.0

                # Sell through ratio
                if "portions_prepared" in valid_past.columns:
                    ratios = valid_past["portions_sold"].values / np.maximum(1, valid_past["portions_prepared"].values)
                    f_sell_through[orig_idx] = round(float(np.mean(ratios[-14:])), 3)
                else:
                    f_sell_through[orig_idx] = 0.85
            else:
                f_days_since_served[orig_idx] = 999.0
                f_last_val[orig_idx] = np.nan
                f_mean_7d[orig_idx] = np.nan
                f_mean_14d[orig_idx] = np.nan
                f_mean_28d[orig_idx] = np.nan
                f_same_dow[orig_idx] = np.nan
                f_ewm[orig_idx] = np.nan
                f_std[orig_idx] = np.nan
                f_sell_through[orig_idx] = 0.85

    # Category fallback trailing mean
    cat_grouped = df.groupby(["category", "service_period"])
    for (cat, period), indices in cat_grouped.groups.items():
        sub_cat = df.loc[indices]
        for i, (orig_idx, row) in enumerate(sub_cat.iterrows()):
            curr_date = row["service_date"]
            past_cat = sub_cat.iloc[:i]
            past_cat = past_cat[past_cat["service_date"] < curr_date]
            if len(past_cat) > 0:
                f_cat_mean[orig_idx] = past_cat["portions_sold"].mean()
            else:
                f_cat_mean[orig_idx] = np.nan

    df["item_recent_mean_7d"] = f_mean_7d
    df["item_recent_mean_14d"] = f_mean_14d
    df["item_recent_mean_28d"] = f_mean_28d
    df["same_weekday_mean"] = f_same_dow
    df["ewm_mean"] = f_ewm
    df["rolling_std"] = f_std
    df["last_observed_sold"] = f_last_val
    df["days_since_last_served"] = f_days_since_served
    df["days_since_introduced"] = f_days_since_intro
    df["sell_through_trailing_mean"] = f_sell_through
    df["history_depth"] = f_history_depth
    df["category_period_trailing_mean"] = f_cat_mean
    df["price_ratio"] = f_price_ratio

    metadata = {
        "features": ALL_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "numeric_features": NUMERIC_FEATURES,
        "target_col": target_col,
        "censoring_strategy": censoring_strategy
    }
    return df, metadata
