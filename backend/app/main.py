import json
import logging
import sys
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.config import settings
from backend.app.database import get_client, init_indexes
from backend.app.errors import AppError, format_error_response

# Configure structured JSON logging
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("leftover_radar")

# Global model state cache
app_state = {
    "model_loaded": False,
    "model_version": None,
    "mongo_connected": False
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup self-check
    try:
        client = get_client()
        client.admin.command("ping")
        app_state["mongo_connected"] = True
        init_indexes()
        logger.info(json.dumps({
            "event": "startup",
            "mongodb": "connected",
            "database": settings.MONGODB_DATABASE,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }))
    except Exception as e:
        app_state["mongo_connected"] = False
        logger.warning(json.dumps({
            "event": "startup_warning",
            "mongodb": "disconnected",
            "error": str(e)
        }))

    # Check model artifact presence
    if settings.MODEL_PATH.exists():
        app_state["model_loaded"] = True
    else:
        app_state["model_loaded"] = False

    yield
    # Shutdown logic if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Campus Cafeteria Demand & Prep Planner API (ML + MongoDB)",
    lifespan=lifespan
)

# 1. Request-ID & Structured JSON Logging Middleware
class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = req_id
        start_time = time.perf_counter()

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            response.headers["X-Request-ID"] = req_id

            # Log structured access
            logger.info(json.dumps({
                "request_id": req_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms
            }))
            return response
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(json.dumps({
                "request_id": req_id,
                "method": request.method,
                "path": request.url.path,
                "error": str(exc),
                "duration_ms": duration_ms
            }))
            raise exc

app.add_middleware(RequestContextMiddleware)

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Uniform Error Handlers (Section 8.4)
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return format_error_response(
        code=exc.code,
        message=exc.message,
        status_code=exc.status_code,
        request_id=req_id,
        field_errors=exc.field_errors,
        retryable=exc.retryable
    )

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    field_errors = {}
    for err in exc.errors():
        loc = ".".join(str(part) for part in err.get("loc", []))
        field_errors[loc] = err.get("msg", "Invalid value")

    return format_error_response(
        code="VALIDATION_ERROR",
        message="Request validation failed. Verify provided parameters.",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        request_id=req_id,
        field_errors=field_errors,
        retryable=False
    )

@app.exception_handler(Exception)
async def general_error_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return format_error_response(
        code="INTERNAL_SERVER_ERROR",
        message=f"An unexpected internal error occurred: {str(exc)}",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        request_id=req_id,
        retryable=True
    )

# 4. Health Check Route
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    """Liveness check. Reports whether MongoDB is reachable and model is loaded without exposing secrets."""
    try:
        client = get_client()
        client.admin.command("ping")
        mongo_status = "connected"
    except Exception:
        mongo_status = "disconnected"

    model_loaded = settings.MODEL_PATH.exists()
    is_healthy = mongo_status == "connected"

    body = {
        "status": "healthy" if is_healthy else "degraded",
        "mongodb": mongo_status,
        "database": settings.MONGODB_DATABASE,
        "model_loaded": model_loaded,
        "version": settings.PROJECT_VERSION,
        "environment": settings.ENVIRONMENT
    }
    status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=status_code, content=body)

# Mount frontend production build if present
dist_path = ROOT_DIR / "frontend" / "dist"
if dist_path.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
