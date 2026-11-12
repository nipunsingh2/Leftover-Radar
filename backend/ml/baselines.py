from typing import Dict, Tuple

import numpy as np
import pandas as pd

from backend.ml.evaluate import calculate_metrics


class TrailingMeanBaseline:
    """
    Baseline A: item x period trailing mean (28 days)
    with category x period fallback if item history < 3.
    """
    def __init__(self, window_days: int = 28):
        self.window_days = window_days
        self.name = "Baseline A (28-day Trailing Mean with Category Fallback)"

    def predict_row(
        self,
        item_id: str,
        service_period: str,
        category: str,
        target_date: pd.Timestamp,
        history_df: pd.DataFrame
    ) -> float:
        # STRICT NO-LEAKAGE: service_date < target_date
        past = history_df[
            (history_df["service_date"] < target_date) &
            (history_df["item_id"] == item_id) &
            (history_df["service_period"] == service_period)
        ]

        # Filter sold_out rows
        if "sold_out" in past.columns:
            valid_past = past[~past["sold_out"]]
            if len(valid_past) == 0:
                valid_past = past
        else:
            valid_past = past

        if len(valid_past) >= 3:
            # Trailing 28 days
            window_mask = valid_past["service_date"] >= (target_date - pd.Timedelta(days=self.window_days))
            if np.any(window_mask):
                return float(valid_past[window_mask]["portions_sold"].mean())
            return float(valid_past["portions_sold"].tail(5).mean())

        # Category fallback
        cat_past = history_df[
            (history_df["service_date"] < target_date) &
            (history_df["category"] == category) &
            (history_df["service_period"] == service_period)
        ]
        if len(cat_past) > 0:
            return float(cat_past["portions_sold"].mean())

        return float(history_df["portions_sold"].mean()) if len(history_df) > 0 else 50.0

    def evaluate(self, train_df: pd.DataFrame, val_df: pd.DataFrame) -> Tuple[np.ndarray, Dict[str, float]]:
        combined = pd.concat([train_df, val_df], ignore_index=True)
        combined["service_date"] = pd.to_datetime(combined["service_date"])

        preds = []
        for _, row in val_df.iterrows():
            pred = self.predict_row(
                item_id=row["item_id"],
                service_period=row["service_period"],
                category=row["category"],
                target_date=pd.to_datetime(row["service_date"]),
                history_df=combined
            )
            preds.append(max(0.0, pred))

        y_pred = np.array(preds)
        y_true = val_df["portions_sold"].values
        metrics = calculate_metrics(y_true, y_pred)
        return y_pred, metrics

class SameWeekdayBaseline:
    """
    Baseline B: Same-weekday mean (last 4 occurrences)
    with 28-day trailing mean fallback.
    """
    def __init__(self, occurrences: int = 4):
        self.occurrences = occurrences
        self.name = "Baseline B (Same-Weekday Mean, Last 4 Weeks)"

    def predict_row(
        self,
        item_id: str,
        service_period: str,
        category: str,
        target_date: pd.Timestamp,
        history_df: pd.DataFrame
    ) -> float:
        dow = target_date.weekday()
        past = history_df[
            (history_df["service_date"] < target_date) &
            (history_df["item_id"] == item_id) &
            (history_df["service_period"] == service_period)
        ]
        if "sold_out" in past.columns:
            valid_past = past[~past["sold_out"]]
            if len(valid_past) == 0:
                valid_past = past
        else:
            valid_past = past

        same_dow_past = valid_past[valid_past["service_date"].dt.weekday == dow]
        if len(same_dow_past) >= 2:
            return float(same_dow_past["portions_sold"].tail(self.occurrences).mean())
        elif len(valid_past) >= 1:
            return float(valid_past["portions_sold"].tail(7).mean())
        else:
            cat_past = history_df[
                (history_df["service_date"] < target_date) &
                (history_df["category"] == category) &
                (history_df["service_period"] == service_period)
            ]
            return float(cat_past["portions_sold"].mean()) if len(cat_past) > 0 else 50.0

    def evaluate(self, train_df: pd.DataFrame, val_df: pd.DataFrame) -> Tuple[np.ndarray, Dict[str, float]]:
        combined = pd.concat([train_df, val_df], ignore_index=True)
        combined["service_date"] = pd.to_datetime(combined["service_date"])

        preds = []
        for _, row in val_df.iterrows():
            pred = self.predict_row(
                item_id=row["item_id"],
                service_period=row["service_period"],
                category=row["category"],
                target_date=pd.to_datetime(row["service_date"]),
                history_df=combined
            )
            preds.append(max(0.0, pred))

        y_pred = np.array(preds)
        y_true = val_df["portions_sold"].values
        metrics = calculate_metrics(y_true, y_pred)
        return y_pred, metrics
