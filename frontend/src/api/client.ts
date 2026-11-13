export interface MenuItem {
  id: string;
  name: string;
  category: string;
  tags: string[];
  price: number;
  active: boolean;
}

export interface ForecastItemResult {
  id?: string;
  item_id: string;
  item_name: string;
  category: string;
  price: number;
  predicted_demand: number;
  lower_estimate: number;
  upper_estimate: number;
  planned_portions: number;
  recommended_portions: number;
  buffer_portions: number;
  buffer_rationale: string;
  estimated_leftovers: number;
  estimated_shortfall: number;
  risk_level: 'low' | 'watch' | 'high';
  risk_reason: string;
  prediction_method: 'model' | 'category_fallback' | 'manual';
  history_status: 'sufficient' | 'low_history' | 'new_item' | 'no_history';
  history_count: number;
  model_version: string;
}

export interface ForecastResponse {
  service_date: string;
  service_period: string;
  created_at: string;
  total_planned: number;
  total_predicted: number;
  total_estimated_leftovers: number;
  items: ForecastItemResult[];
  context: {
    weather: string;
    campus_event: boolean;
    exam_week: boolean;
    holiday: boolean;
    waste_cost: number;
    stockout_cost: number;
    buffer_cap_percent: number;
  };
  model_version: string;
  data_notice: string;
}

export interface WaterfallDriver {
  name: string;
  contribution: number;
  unit: string;
  impact: 'baseline' | 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface ComparableService {
  service_date: string;
  day_of_name: string;
  weather: string;
  portions_prepared: number;
  portions_sold: number;
  leftovers: number;
  sold_out: boolean;
}

export interface ItemExplanation {
  forecast_id: string;
  item_id: string;
  service_date: string;
  service_period: string;
  predicted_demand: number;
  p80_low: number;
  p80_high: number;
  recommended_prep: number;
  buffer_portions: number;
  prediction_method: string;
  history_status: string;
  history_count: number;
  explanation_text: string;
  drivers: WaterfallDriver[];
  comparable_services: ComparableService[];
  buffer_inputs: {
    waste_cost: number;
    stockout_cost: number;
    critical_fractile: number;
    raw_buffer: number;
    buffer_cap_percent: number;
    capped_buffer: number;
    recommended_prep: number;
    rationale: string;
  };
}

export interface ForecastVsActualComparison {
  forecast_id: string;
  service_date: string;
  service_period: string;
  item_id: string;
  predicted_demand: number;
  planned_portions: number;
  lower_estimate: number;
  upper_estimate: number;
  recommended_portions: number;
  actual_prepared: number | null;
  actual_sold: number | null;
  sold_out: boolean;
  actual_recorded: boolean;
  error: number | null;
  abs_error: number | null;
  over_under: 'over' | 'under' | 'exact' | 'pending';
  waste: number;
}

export interface AccuracySummary {
  overall: {
    count: number;
    mae: number;
    bias: number;
    wape: number;
  };
  by_category: Array<{
    category: string;
    count: number;
    mae: number;
    bias: number;
    wape: number;
  }>;
  by_item: Array<{
    item_id: string;
    category?: string;
    count: number;
    mae: number;
    bias: number;
    wape: number;
  }>;
}

export interface RollingWastePoint {
  service_date: string;
  daily_prepared: number;
  daily_sold: number;
  daily_waste: number;
  rolling_7d_waste: number;
  rolling_7d_sold: number;
}

export interface SettingsData {
  waste_cost: number;
  stockout_cost: number;
  buffer_cap_percent: number;
  critical_fractile: number;
  defaults?: {
    waste_cost: number;
    stockout_cost: number;
    buffer_cap_percent: number;
  };
}

export interface CalendarDayContext {
  date: string;
  weather: string;
  campus_event: boolean;
  event_name?: string | null;
  exam_week: boolean;
  holiday: boolean;
  holiday_name?: string | null;
}

export interface PrepSheetData {
  kitchen_name: string;
  service_date: string;
  service_period: string;
  total_items: number;
  total_planned_portions: number;
  total_recommended_portions: number;
  items: Array<{
    item_id: string;
    item_name: string;
    category: string;
    planned_portions: number;
    recommended_portions: number;
    predicted_demand: number;
    buffer_portions: number;
    p80_range: string;
    risk_level: string;
    prep_completed: boolean;
    chef_notes: string;
  }>;
  sign_off: {
    head_chef_signature: string | null;
    prep_supervisor_signature: string | null;
    verified_at: string | null;
  };
}

const BASE_URL = '/api';

export const api = {
  // Health
  async getHealth() {
    const res = await fetch('/health');
    return res.json();
  },

  // Forecasts
  async generateForecast(payload: {
    service_date: string;
    service_period: string;
    items?: Array<{ item_id: string; planned_portions?: number }>;
    weather?: string;
    campus_event?: boolean;
    exam_week?: boolean;
    holiday?: boolean;
  }): Promise<ForecastResponse> {
    const res = await fetch(`${BASE_URL}/forecasts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: 'Forecast generation failed' } }));
      throw new Error(err?.error?.message || err.detail || 'Forecast generation failed');
    }
    return res.json();
  },

  async getSavedForecasts(date: string, service: string) {
    const res = await fetch(`${BASE_URL}/forecasts?date=${date}&service=${service}`);
    if (!res.ok) throw new Error('Failed to fetch saved forecasts');
    return res.json();
  },

  async getForecastExplanation(forecastId: string, itemId?: string): Promise<ItemExplanation> {
    const q = itemId ? `?item_id=${itemId}` : '';
    const res = await fetch(`${BASE_URL}/forecasts/${forecastId}/explain${q}`);
    if (!res.ok) throw new Error('Failed to load item explanation');
    return res.json();
  },

  async compareForecastsVsActuals(params: {
    from?: string;
    to?: string;
    item?: string;
    service?: string;
  }): Promise<{ count: number; comparison: ForecastVsActualComparison[] }> {
    const q = new URLSearchParams();
    if (params.from) q.append('from', params.from);
    if (params.to) q.append('to', params.to);
    if (params.item) q.append('item', params.item);
    if (params.service) q.append('service', params.service);
    const res = await fetch(`${BASE_URL}/forecasts/compare?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch forecast comparison');
    return res.json();
  },

  // Observations & Close-out
  async bulkCloseOut(payload: {
    service_date: string;
    service_period: string;
    items: Array<{
      item_id: string;
      portions_prepared: number;
      portions_sold: number;
      sold_out?: boolean;
    }>;
  }) {
    const res = await fetch(`${BASE_URL}/observations/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: 'Close-out save failed' } }));
      throw new Error(err?.error?.message || err.detail || 'Close-out save failed');
    }
    return res.json();
  },

  async getObservations(params: {
    date?: string;
    service?: string;
    item_id?: string;
    limit?: number;
  }) {
    const q = new URLSearchParams();
    if (params.date) q.append('date', params.date);
    if (params.service) q.append('service', params.service);
    if (params.item_id) q.append('item_id', params.item_id);
    if (params.limit) q.append('limit', params.limit.toString());
    const res = await fetch(`${BASE_URL}/observations?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch observations');
    return res.json();
  },

  async importCsv(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/observations/import`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('CSV upload failed');
    return res.json();
  },

  // Analytics
  async getAccuracyMetrics(startDate?: string, endDate?: string): Promise<AccuracySummary> {
    const q = new URLSearchParams();
    if (startDate) q.append('start_date', startDate);
    if (endDate) q.append('end_date', endDate);
    const res = await fetch(`${BASE_URL}/analytics/accuracy?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to load accuracy metrics');
    return res.json();
  },

  async getRollingWaste(limitDays: number = 60): Promise<{ limit_days: number; series: RollingWastePoint[] }> {
    const res = await fetch(`${BASE_URL}/analytics/waste?limit_days=${limitDays}`);
    if (!res.ok) throw new Error('Failed to load rolling waste');
    return res.json();
  },

  async getWasteSalesTrend(fromDate?: string, toDate?: string, service?: string) {
    const q = new URLSearchParams();
    if (fromDate) q.append('from_date', fromDate);
    if (toDate) q.append('to_date', toDate);
    if (service) q.append('service', service);
    const res = await fetch(`${BASE_URL}/analytics/trend?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to load waste & sales trend');
    return res.json();
  },

  async getAggregationExplain(date?: string, service: string = 'lunch', days: number = 14) {
    const q = new URLSearchParams({ service, days: days.toString() });
    if (date) q.append('date', date);
    const res = await fetch(`${BASE_URL}/analytics/aggregation-explain?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch aggregation explanation');
    return res.json();
  },

  // Menu items
  async getMenuItems(activeOnly: boolean = false): Promise<MenuItem[]> {
    const res = await fetch(`${BASE_URL}/menu-items?active_only=${activeOnly}`);
    if (!res.ok) throw new Error('Failed to fetch menu items');
    return res.json();
  },

  async patchMenuItem(itemId: string, payload: Partial<MenuItem>) {
    const res = await fetch(`${BASE_URL}/menu-items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to update menu item ${itemId}`);
    return res.json();
  },

  // Settings
  async getSettings(): Promise<SettingsData> {
    const res = await fetch(`${BASE_URL}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(payload: Partial<SettingsData>): Promise<SettingsData> {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  // Calendar
  async getCalendarContext(date: string): Promise<CalendarDayContext> {
    const res = await fetch(`${BASE_URL}/calendar?date=${date}`);
    if (!res.ok) throw new Error(`Failed to fetch calendar for ${date}`);
    return res.json();
  },

  async updateCalendarContext(date: string, payload: Partial<CalendarDayContext>): Promise<CalendarDayContext> {
    const res = await fetch(`${BASE_URL}/calendar/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to update calendar for ${date}`);
    return res.json();
  },

  // Model
  async getModelMetrics() {
    const res = await fetch(`${BASE_URL}/model/metrics`);
    if (!res.ok) throw new Error('Failed to fetch model metrics');
    return res.json();
  },

  async getModelRuns() {
    const res = await fetch(`${BASE_URL}/model/runs`);
    if (!res.ok) throw new Error('Failed to fetch model runs');
    return res.json();
  },

  async triggerModelRetrain() {
    const res = await fetch(`${BASE_URL}/model/retrain`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger retrain');
    return res.json();
  },

  async getRetrainStatus() {
    const res = await fetch(`${BASE_URL}/model/retrain/status`);
    if (!res.ok) throw new Error('Failed to get retrain status');
    return res.json();
  },

  // Export
  async getPrepSheet(date: string, service: string): Promise<PrepSheetData> {
    const res = await fetch(`${BASE_URL}/export/forecast-sheet?date=${date}&service=${service}`);
    if (!res.ok) throw new Error('Failed to fetch printable prep sheet');
    return res.json();
  },

  // Dashboard summary
  async getDashboardSummary(date: string, service: string) {
    const res = await fetch(`${BASE_URL}/dashboard/summary?date=${date}&service=${service}`);
    if (!res.ok) throw new Error('Failed to fetch dashboard summary');
    return res.json();
  },
};
