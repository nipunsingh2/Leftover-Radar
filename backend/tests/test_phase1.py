
import pymongo.errors
import pytest

from backend.app.database import init_database, parse_service_date
from backend.app.repositories.calendar_repository import get_calendar_day, upsert_calendar_day
from backend.app.repositories.forecast_repository import (
    get_saved_forecasts,
    save_forecast_snapshots,
)
from backend.app.repositories.menu_repository import (
    get_menu_item,
    list_menu_items,
    update_item_status,
)
from backend.app.repositories.observation_repository import (
    bulk_upsert_observations,
    get_obs_col,
    upsert_observation,
)
from backend.app.repositories.seed_menu_data import seed_menu
from backend.app.repositories.settings_repository import (
    get_operator_settings,
    update_operator_settings,
)


def setup_module():
    init_database()

def test_menu_repository_crud():
    count = seed_menu()
    assert count >= 19

    # List active
    active_items = list_menu_items(active_only=True)
    assert len(active_items) >= 18
    # Mutton roll is inactive
    ids = [i["id"] for i in active_items]
    assert "mutton_roll" not in ids
    assert "paneer_rice_bowl" in ids

    # Get single item
    item = get_menu_item("paneer_rice_bowl")
    assert item is not None
    assert item["name"] == "Paneer Rice Bowl"
    assert item["price"] == 90.0

    # Update price and toggle
    updated = update_item_status("paneer_rice_bowl", price=95.0)
    assert updated["price"] == 95.0
    # Reset back
    update_item_status("paneer_rice_bowl", price=90.0)

def test_observation_unique_compound_index():
    obs_col = get_obs_col()
    dt = parse_service_date("2026-11-20")

    # Clean test key
    obs_col.delete_many({"service_date": dt, "service_period": "lunch", "item_id": "test_dish"})

    # Insert first observation
    doc1 = {
        "service_date": dt,
        "service_period": "lunch",
        "item_id": "test_dish",
        "portions_prepared": 100,
        "portions_sold": 90,
        "sold_out": False,
        "source": "manual_entry"
    }
    obs_col.insert_one(doc1)

    # Attempting raw insert of exact duplicate (date, period, item) must raise DuplicateKeyError!
    doc2 = {
        "service_date": dt,
        "service_period": "lunch",
        "item_id": "test_dish",
        "portions_prepared": 110,
        "portions_sold": 95,
        "sold_out": False,
        "source": "manual_entry"
    }
    with pytest.raises(pymongo.errors.DuplicateKeyError):
        obs_col.insert_one(doc2)

    # Cleanup
    obs_col.delete_many({"service_date": dt, "service_period": "lunch", "item_id": "test_dish"})

def test_observation_upsert_and_bulk():
    obs_data = {
        "service_date": "2026-11-21",
        "service_period": "dinner",
        "item_id": "rajma_chawal",
        "category": "main",
        "price": 80.0,
        "portions_prepared": 80,
        "portions_sold": 74,
        "sold_out": False,
        "context": {"campus_event": True, "weather": "rainy"},
        "source": "manual_entry"
    }
    saved = upsert_observation(obs_data)
    assert saved["portions_sold"] == 74
    assert saved["estimated_leftovers"] == 6

    # Update with new sold count
    obs_data["portions_sold"] = 78
    updated = upsert_observation(obs_data)
    assert updated["portions_sold"] == 78
    assert updated["estimated_leftovers"] == 2

    # Bulk upsert
    bulk_data = [
        {
            "service_date": "2026-11-21",
            "service_period": "breakfast",
            "item_id": "poha",
            "category": "breakfast",
            "price": 35.0,
            "portions_prepared": 50,
            "portions_sold": 45,
            "sold_out": False,
            "context": {"campus_event": False, "weather": "sunny"},
            "source": "simulated"
        },
        {
            "service_date": "2026-11-21",
            "service_period": "breakfast",
            "item_id": "idli_sambar",
            "category": "breakfast",
            "price": 45.0,
            "portions_prepared": 60,
            "portions_sold": 58,
            "sold_out": False,
            "context": {"campus_event": False, "weather": "sunny"},
            "source": "simulated"
        }
    ]
    res = bulk_upsert_observations(bulk_data)
    assert res["upserted"] + res["modified"] + res["matched"] >= 2

def test_forecast_snapshot_repository():
    forecast_batch = [
        {
            "service_date": "2026-11-22",
            "service_period": "lunch",
            "item_id": "chole_bhature",
            "predicted_demand": 85,
            "lower_estimate": 78,
            "upper_estimate": 94,
            "planned_portions": 90,
            "estimated_leftovers": 5,
            "recommended_portions": 92,
            "model_version": "v2.0",
            "prediction_method": "model",
            "history_status": "sufficient",
            "input_features_snapshot": {"price": 85, "day_of_week": 6}
        }
    ]
    save_forecast_snapshots(forecast_batch)
    saved = get_saved_forecasts("2026-11-22", "lunch")
    assert len(saved) >= 1
    chole = next(f for f in saved if f["item_id"] == "chole_bhature")
    assert chole["predicted_demand"] == 85
    assert chole["model_version"] == "v2.0"

def test_settings_and_calendar():
    # Settings
    curr = get_operator_settings()
    assert curr["waste_cost"] > 0
    assert curr["stockout_cost"] > 0
    assert 0 < curr["buffer_cap_percent"] <= 1.0

    updated = update_operator_settings({"waste_cost": 35.0, "stockout_cost": 75.0, "buffer_cap_percent": 0.20})
    assert updated["waste_cost"] == 35.0
    assert updated["stockout_cost"] == 75.0

    # Reset
    update_operator_settings({"waste_cost": 30.0, "stockout_cost": 70.0, "buffer_cap_percent": 0.15})

    # Calendar
    cal_day = {
        "date": "2026-11-23",
        "campus_event": True,
        "event_name": "Tech Fest Day 1",
        "exam_week": False,
        "holiday": False,
        "weather": "clear"
    }
    upsert_calendar_day(cal_day)
    saved_day = get_calendar_day("2026-11-23")
    assert saved_day is not None
    assert saved_day["event_name"] == "Tech Fest Day 1"
    assert saved_day["campus_event"] is True
