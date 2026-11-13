from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.app.database import get_collection
from backend.app.main import app
from backend.app.repositories.menu_repository import upsert_menu_item
from backend.app.repositories.observation_repository import upsert_observation
from backend.app.services.forecasting import generate_forecast_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_data():
    """Ensure basic menu items and seed observations exist for tests."""
    pass


def test_forecast_endpoint_contract():
    """Test POST /api/forecasts and GET /api/forecasts contract."""
    target_date = "2026-11-12"
    payload = {
        "service_date": target_date,
        "service_period": "lunch",
        "items": [
            {"item_id": "chicken_biryani", "planned_portions": 75},
            {"item_id": "paneer_rice_bowl", "planned_portions": 60},
        ],
        "weather": "clear",
        "campus_event": False,
    }

    response = client.post("/api/forecasts", json=payload)
    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    assert data["service_date"] == target_date
    assert data["service_period"] == "lunch"
    assert "total_planned" in data
    assert "total_predicted" in data
    assert "items" in data
    assert len(data["items"]) == 2

    first_item = data["items"][0]
    assert first_item["item_id"] == "chicken_biryani"
    assert "predicted_demand" in first_item
    assert "lower_estimate" in first_item
    assert "upper_estimate" in first_item
    assert "recommended_portions" in first_item
    assert "buffer_portions" in first_item
    assert "buffer_rationale" in first_item
    assert "prediction_method" in first_item
    assert "history_status" in first_item

    # Verify GET retrieves the persisted snapshot
    get_res = client.get(f"/api/forecasts?date={target_date}&service=lunch")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["service_date"] == target_date
    assert get_data["count"] >= 2
    assert any(it["item_id"] == "chicken_biryani" for it in get_data["items"])


def test_validation_errors_uniform_envelope():
    """Verify validation errors follow Section 8.4 uniform error envelope."""
    # Invalid meal period
    bad_period = client.post("/api/forecasts", json={
        "service_date": "2026-11-12",
        "service_period": "midnight_snack",
        "items": [{"item_id": "chicken_biryani"}]
    })
    assert bad_period.status_code == 422
    err_body = bad_period.json()
    assert "error" in err_body
    assert err_body["error"]["code"] == "VALIDATION_ERROR"
    assert err_body["error"]["retryable"] is False

    # Unknown menu item
    unknown_item = client.post("/api/forecasts", json={
        "service_date": "2026-11-12",
        "service_period": "lunch",
        "items": [{"item_id": "non_existent_dish_xyz_99"}]
    })
    assert unknown_item.status_code == 422
    assert unknown_item.json()["error"]["code"] == "VALIDATION_ERROR"


def test_fallback_ladder_tier1_sufficient_history():
    """Tier 1 (>= 14 obs): full model with standard conformal interval."""
    res = generate_forecast_service(
        service_date="2026-11-12",
        service_period="lunch",
        items=[{"item_id": "chicken_biryani", "planned_portions": 70}]
    )
    item = res["items"][0]
    assert item["prediction_method"] == "model"
    assert item["history_status"] == "sufficient"
    assert item["history_count"] >= 14
    assert item["predicted_demand"] > 0
    assert item["lower_estimate"] < item["upper_estimate"]


def test_fallback_ladder_tier2_low_history():
    """Tier 2 (3-13 obs): model with widened conformal interval."""
    # Create a test item with exactly 6 historical observations
    test_item_id = "test_low_hist_dish"
    upsert_menu_item({
        "id": test_item_id,
        "name": "Test Low History Dish",
        "category": "main",
        "price": 80.0,
        "active": True
    })

    obs_col = get_collection("service_observations")
    # Clean any prior observations for this test item
    obs_col.delete_many({"item_id": test_item_id})

    # Insert exactly 6 observations prior to target date 2026-11-12
    for day in range(1, 7):
        upsert_observation({
            "service_date": f"2026-11-0{day}",
            "service_period": "lunch",
            "item_id": test_item_id,
            "portions_prepared": 40,
            "portions_sold": 35,
            "sold_out": False,
            "price": 80.0,
            "context": {"weather": "clear", "campus_event": False},
            "source": "simulated"
        })

    res = generate_forecast_service(
        service_date="2026-11-12",
        service_period="lunch",
        items=[{"item_id": test_item_id, "planned_portions": 35}]
    )
    item = res["items"][0]
    assert item["prediction_method"] == "model"
    assert item["history_status"] == "low_history"
    assert 3 <= item["history_count"] <= 13

    # Clean up test observations
    obs_col.delete_many({"item_id": test_item_id})


def test_fallback_ladder_tier3_category_fallback():
    """Tier 3 (< 3 obs): category trailing mean (new item)."""
    test_item_id = "test_new_breakfast_dish"
    upsert_menu_item({
        "id": test_item_id,
        "name": "Test New Breakfast Dish",
        "category": "breakfast",
        "price": 50.0,
        "active": True
    })

    obs_col = get_collection("service_observations")
    obs_col.delete_many({"item_id": test_item_id})

    res = generate_forecast_service(
        service_date="2026-11-12",
        service_period="breakfast",
        items=[{"item_id": test_item_id}]
    )
    item = res["items"][0]
    assert item["prediction_method"] == "category_fallback"
    assert item["history_status"] == "new_item"
    assert item["predicted_demand"] > 0
    assert "category" in item["buffer_rationale"].lower() or "q*" in item["buffer_rationale"]


def test_fallback_ladder_tier4_manual_no_history():
    """Tier 4 (no item and no category history): manual fallback."""
    # Using a date prior to all historical data ensures 0 usable observations
    res = generate_forecast_service(
        service_date="2020-01-01",
        service_period="dinner",
        items=[{"item_id": "chicken_biryani"}]
    )
    item = res["items"][0]
    assert item["prediction_method"] == "manual"
    assert item["history_status"] == "no_history"
    assert item["predicted_demand"] == 0
    assert item["lower_estimate"] == 0
    assert item["upper_estimate"] == 0


def test_explainability_route():
    """Test GET /api/forecasts/{id}/explain endpoint returns drivers, buffer inputs, and history."""
    target_date = "2026-11-12"
    # Create forecast to obtain snapshot ID
    res = client.post("/api/forecasts", json={
        "service_date": target_date,
        "service_period": "lunch",
        "items": [{"item_id": "chicken_biryani", "planned_portions": 70}]
    })
    assert res.status_code == 200
    f_id = res.json()["items"][0]["id"]
    assert f_id, "Snapshot ID must be populated"

    explain_res = client.get(f"/api/forecasts/{f_id}/explain")
    assert explain_res.status_code == 200
    exp = explain_res.json()

    assert exp["forecast_id"] == f_id
    assert exp["item_id"] == "chicken_biryani"
    assert "drivers" in exp
    assert len(exp["drivers"]) >= 1
    assert any(d["name"] == "Historical Baseline Average" for d in exp["drivers"])

    assert "comparable_services" in exp
    assert "buffer_inputs" in exp
    assert "waste_cost" in exp["buffer_inputs"]
    assert "stockout_cost" in exp["buffer_inputs"]
    assert "critical_fractile" in exp["buffer_inputs"]
    assert exp["buffer_inputs"]["critical_fractile"] == 0.70
    assert "explanation_text" in exp
