from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


# --- Menu Items ---
class MenuItemBase(BaseModel):
    name: str
    category: str
    tags: List[str] = Field(default_factory=list)
    price: float = Field(ge=0)
    active: bool = True

class MenuItemCreate(MenuItemBase):
    id: str

class MenuItemResponse(MenuItemBase):
    id: str

# --- Observations ---
class ObservationContext(BaseModel):
    campus_event: bool = False
    weather: Optional[str] = "clear"

class ObservationCreate(BaseModel):
    service_date: str = Field(description="YYYY-MM-DD service date")
    service_period: str = Field(description="breakfast, lunch, or dinner")
    item_id: str
    price: Optional[float] = Field(default=None, ge=0)
    portions_prepared: int = Field(ge=0, description="Amount prepared, must be non-negative")
    portions_sold: int = Field(ge=0, description="Amount sold, must be non-negative")
    sold_out: bool = False
    context: ObservationContext = Field(default_factory=ObservationContext)
    source: str = "manual_entry"

    @field_validator("service_period")
    @classmethod
    def validate_service_period(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if v_clean not in ["breakfast", "lunch", "dinner"]:
            raise ValueError("service_period must be 'breakfast', 'lunch', or 'dinner'")
        return v_clean

    @field_validator("service_date")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        try:
            datetime.strptime(v.strip(), "%Y-%m-%d")
        except ValueError:
            raise ValueError("service_date must be in YYYY-MM-DD format")
        return v.strip()

class ObservationResponse(BaseModel):
    id: str
    service_date: str
    service_period: str
    item_id: str
    item_name: Optional[str] = None
    category: Optional[str] = None
    price: float
    portions_prepared: int
    portions_sold: int
    sold_out: bool
    context: ObservationContext
    source: str
    estimated_leftovers: int

# --- Forecast Request & Response ---
class ForecastItemRequest(BaseModel):
    item_id: str
    planned_portions: int = Field(ge=0, description="Planned portions for this dish")

class ForecastRequest(BaseModel):
    service_date: str
    service_period: str
    items: List[ForecastItemRequest]

    @field_validator("service_period")
    @classmethod
    def validate_period(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if v_clean not in ["breakfast", "lunch", "dinner"]:
            raise ValueError("service_period must be 'breakfast', 'lunch', or 'dinner'")
        return v_clean

    @field_validator("service_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            datetime.strptime(v.strip(), "%Y-%m-%d")
        except ValueError:
            raise ValueError("service_date must be in YYYY-MM-DD format")
        return v.strip()

class ForecastItemResult(BaseModel):
    item_id: str
    item_name: str
    category: str
    price: float
    predicted_demand: int
    lower_estimate: int
    upper_estimate: int
    planned_portions: int
    estimated_leftovers: int
    recommended_portions: int
    buffer_portions: int
    buffer_rationale: str
    risk_level: str  # "Low", "Watch", "High"
    risk_reason: str
    prediction_method: str  # "model", "recent_average_baseline", "category_fallback", "none"
    history_status: str  # "sufficient_history", "low_history", "new_item", "not_enough_data"
    model_version: str

class ForecastResponse(BaseModel):
    service_date: str
    service_period: str
    created_at: str
    total_planned: int
    total_predicted: int
    total_estimated_leftovers: int
    items: List[ForecastItemResult]
    data_notice: str

# --- Dashboard & Aggregation Summaries ---
class AggregationPoint(BaseModel):
    date: str
    service_period: str
    portions_prepared: int
    portions_sold: int
    estimated_leftovers: int

class DashboardSummaryResponse(BaseModel):
    service_date: str
    service_period: str
    total_planned: int
    total_predicted: int
    total_estimated_leftovers: int
    saved_forecast_found: bool
    actuals_recorded: bool
    actual_portions_prepared: Optional[int] = None
    actual_portions_sold: Optional[int] = None
    actual_leftovers: Optional[int] = None
    recent_trend: List[AggregationPoint]
    model_version: Optional[str] = None
    model_mae: Optional[float] = None
    baseline_mae: Optional[float] = None
    dataset_notice: str

# --- Model Metrics ---
class ModelMetricsResponse(BaseModel):
    model_version: str
    trained_at: str
    training_records: int
    validation_start: str
    validation_end: str
    validation_records: int
    mae: float
    wape: float
    bias: float
    baseline_mae: float
    baseline_wape: float
    baseline_bias: float
    features: List[str]
    is_synthetic: bool = True
    notice: str
