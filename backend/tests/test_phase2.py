import csv
import os

from backend.app.config import settings
from backend.ml.simulate import simulate_cafeteria_dataset


def test_simulator_stats_and_calibration():
    obs, stats = simulate_cafeteria_dataset()

    # 1. Row counts and day span
    assert stats["days"] == 180
    assert stats["total_rows"] >= 3500
    assert stats["unique_items"] == 20

    # 2. Calibrated sold_out rate strictly around 8-12% per Section 6 & 10
    assert 7.5 <= stats["sold_out_pct"] <= 12.5, f"Sold out rate {stats['sold_out_pct']}% not in 8-12% range"

    # 3. Data invariants for every single row
    for row in obs:
        prep = row["portions_prepared"]
        sold = row["portions_sold"]
        assert prep >= 0, "Negative prepared portion"
        assert sold >= 0, "Negative sold portion"
        assert sold <= prep, f"Violation: sold ({sold}) > prepared ({prep})"
        if row["sold_out"]:
            assert sold == prep, "Sold out flag set but sold != prepared"
        assert row["source"] == "simulated"
        assert row["service_period"] in ["breakfast", "lunch", "dinner"]

def test_csv_file_matches_config():
    csv_path = settings.ROOT_DIR / "data" / "sample_observations.csv"
    assert os.path.exists(csv_path), "sample_observations.csv does not exist"

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    assert len(rows) >= 3500
    sold_out_count = sum(1 for r in rows if r["sold_out"].lower() == "true")
    pct = (sold_out_count / len(rows)) * 100
    assert 7.5 <= pct <= 12.5

def test_data_card_exists():
    card_path = settings.ROOT_DIR / "data" / "DATA_CARD.md"
    assert os.path.exists(card_path), "DATA_CARD.md is missing"
    content = card_path.read_text(encoding="utf-8")
    assert "NegativeBinomial" in content
    assert "Censored Demand" in content
    assert "11.50%" in content or "8%–12%" in content or "8-12%" in content
