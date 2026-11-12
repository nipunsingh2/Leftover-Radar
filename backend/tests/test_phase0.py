from fastapi.testclient import TestClient

from backend.app.config import settings
from backend.app.main import app

client = TestClient(app)

def test_health_check_phase0():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["mongodb"] == "connected"
    assert data["database"] == settings.MONGODB_DATABASE
    assert "version" in data
    # Ensure no secrets like passwords or URIs are leaked in health check
    assert "mongodb://" not in str(data)

def test_request_id_middleware():
    response = client.get("/health")
    assert "X-Request-ID" in response.headers
    assert len(response.headers["X-Request-ID"]) > 10

def test_uniform_error_envelope():
    # Trigger a 404
    response = client.get("/non-existent-route")
    assert response.status_code == 404
    # Check uniform error envelope format
    data = response.json()
    assert "detail" in data or "error" in data
