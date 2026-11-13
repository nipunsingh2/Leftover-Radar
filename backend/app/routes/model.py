from __future__ import annotations

import json
from typing import Any, Dict, List

from fastapi import APIRouter, BackgroundTasks

from backend.app.config import settings
from backend.app.errors import AppError
from backend.app.repositories.model_run_repository import get_all_model_runs, get_latest_model_run
from backend.ml.train import train_and_evaluate_pipeline

router = APIRouter(prefix="/model", tags=["Model Operations & Metrics"])

_retrain_status = {
    "status": "idle",
    "last_run": None,
    "error": None,
}


def _run_retrain_task():
    global _retrain_status
    _retrain_status["status"] = "running"
    _retrain_status["error"] = None
    try:
        metrics = train_and_evaluate_pipeline(seed=42)
        _retrain_status["status"] = "completed"
        _retrain_status["last_run"] = metrics.get("trained_at")
    except Exception as e:
        _retrain_status["status"] = "failed"
        _retrain_status["error"] = str(e)


@router.get("/metrics", status_code=200)
def get_model_metrics() -> Dict[str, Any]:
    """
    Retrieve latest production model performance metrics, baselines,
    conformal interval coverage, and calibration bins (Section 8.3).
    """
    if settings.METRICS_PATH.exists():
        try:
            with open(settings.METRICS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    run = get_latest_model_run()
    if not run:
        raise AppError(
            code="MODEL_NOT_TRAINED",
            message="No model run metrics found. Retrain model or run ML training script.",
            status_code=404,
        )
    return run


@router.get("/runs", status_code=200)
def list_model_runs() -> List[Dict[str, Any]]:
    """Retrieve historical model runs logged in MongoDB."""
    return get_all_model_runs()


@router.post("/retrain", status_code=202)
def trigger_retrain(background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """
    Explicit manual retrain endpoint (Section 8.3).
    Triggers expanding-window training pipeline as a background task.
    """
    global _retrain_status
    if _retrain_status["status"] == "running":
        return {
            "status": "already_running",
            "message": "Model retraining is already in progress.",
        }

    background_tasks.add_task(_run_retrain_task)
    return {
        "status": "accepted",
        "message": "Model retraining triggered in background. Poll /api/model/retrain/status for updates.",
    }


@router.get("/retrain/status", status_code=200)
def get_retrain_status() -> Dict[str, Any]:
    """Status endpoint for background model retrain task."""
    return _retrain_status
