from __future__ import annotations

import io

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.forecasting import generate_forecast_service

client = TestClient(app)


def test_pipeline_1_waste_sales_trend():
    """Test Aggregation Pipeline 1: Waste / Sales Trend ($dateTrunc, sell-through, leftovers)."""
    res = client.get("/api/analytics/trend?from_date=2026-10-01&to_date=2026-10-15&service=lunch")
    assert res.status_code == 200
    data = res.json()
    assert "data" in data
    assert len(data["data"]) > 0

    first = data["data"][0]
    assert "date" in first
    assert "portions_prepared" in first
    assert "portions_sold" in first
    assert "estimated_leftovers" in first
    assert "sell_through" in first

    # Hand calculation check
    prep = first["portions_prepared"]
    sold = first["portions_sold"]
    leftover = first["estimated_leftovers"]
    st = first["sell_through"]

    assert leftover == max(0, prep - sold)
    if prep > 0:
        assert abs(st - round(sold / prep, 4)) < 0.001


def test_pipeline_2_forecast_vs_actual_join():
    """Test Aggregation Pipeline 2: Forecast vs Actual Join ($lookup on date, period, item)."""
    # 1. Generate and save a forecast
    target_date = "2026-10-20"
    generate_forecast_service(
        service_date=target_date,
        service_period="lunch",
        items=[{"item_id": "chicken_biryani", "planned_portions": 70}]
    )

    # 2. Query comparison endpoint
    res = client.get(f"/api/forecasts/compare?from={target_date}&to={target_date}&item=chicken_biryani")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1

    item_match = next(c for c in data["comparison"] if c["item_id"] == "chicken_biryani")
    assert "predicted_demand" in item_match
    assert "planned_portions" in item_match
    assert "actual_sold" in item_match
    assert "error" in item_match
    assert "abs_error" in item_match
    assert "over_under" in item_match

    # Hand calculation check
    pred = item_match["predicted_demand"]
    sold = item_match["actual_sold"]
    planned = item_match["planned_portions"]

    if sold is not None:
        assert item_match["error"] == sold - pred
        assert item_match["abs_error"] == abs(sold - pred)
        expected_status = "over" if planned > sold else ("under" if planned < sold else "exact")
        assert item_match["over_under"] == expected_status


def test_pipeline_3_accuracy_facet():
    """Test Aggregation Pipeline 3: Accuracy by Item & Category ($facet MAE, WAPE, bias)."""
    res = client.get("/api/analytics/accuracy")
    assert res.status_code == 200
    data = res.json()
    assert "overall" in data
    assert "by_category" in data
    assert "by_item" in data

    overall = data["overall"]
    if overall.get("count", 0) > 0:
        assert "mae" in overall
        assert "wape" in overall
        assert "bias" in overall
        assert overall["mae"] >= 0
        assert overall["wape"] >= 0


def test_pipeline_4_rolling_waste():
    """Test Aggregation Pipeline 4: Rolling Waste ($setWindowFields with 7-day window)."""
    res = client.get("/api/analytics/waste?limit_days=30")
    assert res.status_code == 200
    data = res.json()
    assert "series" in data
    assert len(data["series"]) >= 7

    for row in data["series"]:
        assert "service_date" in row
        assert "daily_waste" in row
        assert "rolling_7d_waste" in row
        assert "rolling_7d_sold" in row
        assert row["rolling_7d_waste"] >= 0


def test_bulk_close_out_success_and_invariant_enforcement():
    """Test POST /api/observations/bulk records close-out and enforces sold <= prepared."""
    target_date = "2026-11-12"
    # Case 1: Successful close-out
    valid_payload = {
        "service_date": target_date,
        "service_period": "lunch",
        "items": [
            {"item_id": "chicken_biryani", "portions_prepared": 80, "portions_sold": 75},
            {"item_id": "paneer_rice_bowl", "portions_prepared": 60, "portions_sold": 60, "sold_out": True},
        ]
    }
    res = client.post("/api/observations/bulk", json=valid_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["items_processed"] == 2
    assert isinstance(data["upserted_count"], int)
    assert "details" in data

    # Case 2: Invariant violation (sold > prepared) must return 422
    invalid_payload = {
        "service_date": target_date,
        "service_period": "lunch",
        "items": [
            {"item_id": "chicken_biryani", "portions_prepared": 50, "portions_sold": 65}
        ]
    }
    bad_res = client.post("/api/observations/bulk", json=invalid_payload)
    assert bad_res.status_code == 422
    err_json = bad_res.json()
    assert err_json["error"]["code"] == "VALIDATION_ERROR"


def test_csv_import_endpoint():
    """Test POST /api/observations/import validates every row and reports accepted / rejected."""
    csv_content = (
        "service_date,service_period,item_id,price,portions_prepared,portions_sold,sold_out,campus_event,weather\n"
        "2026-11-10,dinner,chicken_biryani,130.0,60,55,False,False,clear\n"
        "2026-11-10,dinner,paneer_rice_bowl,90.0,40,40,True,False,clear\n"
        "2026-11-10,midnight_snack,chicken_biryani,130.0,20,15,False,False,clear\n"  # Invalid period
        "2026-11-10,dinner,unknown_super_dish,100.0,30,20,False,False,clear\n"      # Unknown item
        "2026-11-10,dinner,veg_biryani,95.0,20,35,False,False,clear\n"               # sold > prep violation
    )

    file_bytes = io.BytesIO(csv_content.encode("utf-8"))
    res = client.post(
        "/api/observations/import",
        files={"file": ("test_import.csv", file_bytes, "text/csv")}
    )
    assert res.status_code == 200
    report = res.json()
    assert report["accepted_count"] == 2
    assert report["rejected_count"] == 3
    assert len(report["rejected_details"]) == 3


def test_calendar_and_settings_endpoints():
    """Test calendar context and settings cost parameters CRUD."""
    # Calendar update & retrieve
    cal_res = client.put("/api/calendar/2026-11-15", json={
        "weather": "rainy",
        "campus_event": True,
        "event_name": "Autumn Tech Fest",
        "exam_week": False,
        "holiday": False
    })
    assert cal_res.status_code == 200

    get_cal = client.get("/api/calendar?date=2026-11-15")
    assert get_cal.status_code == 200
    assert get_cal.json()["weather"] == "rainy"
    assert get_cal.json()["campus_event"] is True

    # Settings update & retrieve
    set_res = client.put("/api/settings", json={
        "waste_cost": 40.0,
        "stockout_cost": 60.0,
        "buffer_cap_percent": 0.20
    })
    assert set_res.status_code == 200
    st = set_res.json()
    assert st["waste_cost"] == 40.0
    assert st["stockout_cost"] == 60.0
    assert st["critical_fractile"] == 0.60

    get_st = client.get("/api/settings")
    assert get_st.status_code == 200
    assert get_st.json()["waste_cost"] == 40.0


def test_menu_items_patch_and_export_sheet():
    """Test PATCH /menu-items toggle and GET /export/forecast-sheet layout."""
    # PATCH empty payload should be a no-op 200 rather than crashing
    empty_res = client.patch("/api/menu-items/chicken_biryani", json={})
    assert empty_res.status_code == 200
    assert "Chicken Biryani" in empty_res.json()["name"]

    # PATCH price and active
    patch_res = client.patch("/api/menu-items/chicken_biryani", json={"price": 145.0, "active": True})
    assert patch_res.status_code == 200
    assert patch_res.json()["price"] == 145.0

    # Ensure a saved forecast exists for export sheet test
    generate_forecast_service(
        service_date="2026-11-12",
        service_period="lunch",
        items=[{"item_id": "chicken_biryani", "planned_portions": 70}]
    )

    # Printable prep sheet data
    sheet_res = client.get("/api/export/forecast-sheet?date=2026-11-12&service=lunch")
    assert sheet_res.status_code == 200
    sheet = sheet_res.json()
    assert sheet["service_date"] == "2026-11-12"
    assert sheet["service_period"] == "Lunch"
    assert "items" in sheet
    assert len(sheet["items"]) >= 1
    assert "sign_off" in sheet


def test_dashboard_summary_endpoint():
    """Test GET /api/dashboard/summary integration with Pipeline 1."""
    res = client.get("/api/dashboard/summary?date=2026-10-15&service=lunch")
    assert res.status_code == 200
    data = res.json()
    assert data["service_date"] == "2026-10-15"
    assert data["service_period"] == "lunch"
    assert "recent_trend" in data
    assert isinstance(data["recent_trend"], list)
