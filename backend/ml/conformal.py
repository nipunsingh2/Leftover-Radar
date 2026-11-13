from typing import Any, Dict, Tuple

import numpy as np


class ConformalIntervalCalibrator:
    """
    Split-conformal prediction interval calibrator (Section 7.6).
    Calibrates non-conformity scores (residuals) on a validation holdout
    to guarantee empirical coverage on future out-of-sample data (>95% confidence).
    """
    def __init__(self, target_coverage: float = 0.95):
        self.target_coverage = target_coverage
        self.q_lower: float = 0.0
        self.q_upper: float = 0.0
        self.q_lower_95: float = 0.0
        self.q_upper_95: float = 0.0
        self.q_lower_80: float = 0.0
        self.q_upper_80: float = 0.0
        self.residual_quantiles: Dict[str, float] = {}

    def fit(self, y_val: np.ndarray, y_pred_val: np.ndarray):
        y_val = np.asarray(y_val, dtype=float)
        y_pred_val = np.asarray(y_pred_val, dtype=float)

        residuals = y_val - y_pred_val
        alpha = 1.0 - self.target_coverage  # e.g. 0.05 for 95% coverage
        n = len(residuals)

        # Calibrate 95% High-Confidence Quantiles (alpha=0.05)
        alpha_95 = 0.05
        q95_u = min(1.0, max(0.5, np.ceil((n + 1) * (1.0 - alpha_95 / 2.0)) / n))
        q95_l = max(0.0, min(0.5, np.floor((n + 1) * (alpha_95 / 2.0)) / n))
        self.q_upper_95 = float(np.quantile(residuals, q95_u))
        self.q_lower_95 = float(np.quantile(residuals, q95_l))

        # Calibrate 80% Standard Quantiles (alpha=0.20)
        alpha_80 = 0.20
        q80_u = min(1.0, max(0.5, np.ceil((n + 1) * (1.0 - alpha_80 / 2.0)) / n))
        q80_l = max(0.0, min(0.5, np.floor((n + 1) * (alpha_80 / 2.0)) / n))
        self.q_upper_80 = float(np.quantile(residuals, q80_u))
        self.q_lower_80 = float(np.quantile(residuals, q80_l))

        # Primary interval quantiles based on target_coverage
        q_val_upper = min(1.0, max(0.5, np.ceil((n + 1) * (1.0 - alpha / 2.0)) / n))
        q_val_lower = max(0.0, min(0.5, np.floor((n + 1) * (alpha / 2.0)) / n))
        self.q_upper = float(np.quantile(residuals, q_val_upper))
        self.q_lower = float(np.quantile(residuals, q_val_lower))

        # Store residual quantiles for newsvendor critical fractiles
        for fractile in [0.05, 0.10, 0.20, 0.50, 0.60, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 0.975]:
            self.residual_quantiles[str(fractile)] = float(np.quantile(residuals, fractile))

    def predict_interval(
        self,
        point_prediction: float,
        is_widened: bool = False
    ) -> Tuple[int, int]:
        """
        Returns (lower_bound, upper_bound) rounded to whole portions.
        Clamped at >= 0. Widens interval for low-history items (Section 7.7).
        """
        multiplier = 1.35 if is_widened else 1.0
        lower = max(0, int(round(point_prediction + (self.q_lower * multiplier))))
        upper = max(lower, int(round(point_prediction + (self.q_upper * multiplier))))
        return lower, upper

    def evaluate_coverage(self, y_test: np.ndarray, y_pred_test: np.ndarray) -> Dict[str, Any]:
        """Calculates empirical test coverage for primary target, 95%, and 80% intervals."""
        y_test = np.asarray(y_test, dtype=float)
        y_pred_test = np.asarray(y_pred_test, dtype=float)

        covered = 0
        covered_95 = 0
        covered_80 = 0
        n = len(y_test)
        if n == 0:
            return {"coverage": 0.0, "target": self.target_coverage, "coverage_95": 0.0, "coverage_80": 0.0}

        for actual, pred in zip(y_test, y_pred_test):
            low, high = self.predict_interval(pred)
            if low <= actual <= high:
                covered += 1

            low_95 = max(0, int(round(pred + self.q_lower_95)))
            high_95 = max(low_95, int(round(pred + self.q_upper_95)))
            if low_95 <= actual <= high_95:
                covered_95 += 1

            low_80 = max(0, int(round(pred + self.q_lower_80)))
            high_80 = max(low_80, int(round(pred + self.q_upper_80)))
            if low_80 <= actual <= high_80:
                covered_80 += 1

        empirical_coverage = round(covered / n, 4)
        return {
            "empirical_coverage": empirical_coverage,
            "target_coverage": self.target_coverage,
            "coverage_95": round(covered_95 / n, 4),
            "coverage_80": round(covered_80 / n, 4),
            "n_samples": n,
            "q_lower": round(self.q_lower, 2),
            "q_upper": round(self.q_upper, 2),
            "q_lower_95": round(self.q_lower_95, 2),
            "q_upper_95": round(self.q_upper_95, 2),
            "q_lower_80": round(self.q_lower_80, 2),
            "q_upper_80": round(self.q_upper_80, 2),
        }

    def compute_newsvendor_recommendation(
        self,
        predicted_demand: float,
        waste_cost: float,
        stockout_cost: float,
        buffer_cap_percent: float = 0.15
    ) -> Tuple[int, int, str]:
        """
        Newsvendor model per Section 7.6:
        Critical fractile q* = c_s / (c_s + c_w).
        Returns: (recommended_portions, buffer_portions, rationale)
        """
        if (stockout_cost + waste_cost) <= 0:
            q_star = 0.70
        else:
            q_star = stockout_cost / (stockout_cost + waste_cost)

        # Look up corresponding residual buffer
        # Find closest available quantile or interpolate
        available_quantiles = sorted([float(k) for k in self.residual_quantiles.keys()])
        if not available_quantiles:
            raw_buffer = max(2.0, predicted_demand * 0.08)
        else:
            closest_q = min(available_quantiles, key=lambda q: abs(q - q_star))
            raw_buffer = self.residual_quantiles[str(closest_q)]

        # Cap the buffer (default +15% of predicted demand) and never exceed upper range
        max_buffer = max(3.0, predicted_demand * buffer_cap_percent)
        capped_buffer = int(round(np.clip(raw_buffer, 1.0, max_buffer)))

        recommended = max(0, int(round(predicted_demand + capped_buffer)))
        rationale = f"Newsvendor q*={q_star:.2f} (c_s=₹{stockout_cost}, c_w=₹{waste_cost}) -> +{capped_buffer} buffer"

        return recommended, capped_buffer, rationale
