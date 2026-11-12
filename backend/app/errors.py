from typing import Dict, Optional

from fastapi import status
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base domain exception with structured error envelope metadata."""
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        field_errors: Optional[Dict[str, str]] = None,
        retryable: bool = False,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.field_errors = field_errors
        self.retryable = retryable

class ValidationError(AppError):
    def __init__(self, message: str, field_errors: Optional[Dict[str, str]] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            field_errors=field_errors,
            retryable=False
        )

class DatabaseUnavailableError(AppError):
    def __init__(self, message: str = "MongoDB database service is currently unavailable"):
        super().__init__(
            code="DB_UNAVAILABLE",
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            retryable=True
        )

class ModelNotTrainedError(AppError):
    def __init__(self, message: str = "Demand model has not been trained yet. Run 'make train' or seed script."):
        super().__init__(
            code="MODEL_NOT_TRAINED",
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            retryable=False
        )

class NotFoundError(AppError):
    def __init__(self, message: str):
        super().__init__(
            code="NOT_FOUND",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            retryable=False
        )

class ConflictError(AppError):
    def __init__(self, message: str):
        super().__init__(
            code="CONFLICT",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            retryable=False
        )

def format_error_response(
    code: str,
    message: str,
    status_code: int,
    request_id: str,
    field_errors: Optional[Dict[str, str]] = None,
    retryable: bool = False
) -> JSONResponse:
    """Produces the required Section 8.4 uniform error envelope."""
    payload = {
        "error": {
            "code": code,
            "message": message,
            "field_errors": field_errors or {},
            "retryable": retryable,
            "request_id": request_id
        }
    }
    return JSONResponse(status_code=status_code, content=payload)
