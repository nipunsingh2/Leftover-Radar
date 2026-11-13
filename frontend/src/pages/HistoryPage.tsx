import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
} from 'recharts';
import { api, ForecastVsActualComparison, RollingWastePoint, AccuracySummary } from '../api/client';
import { Loader2, TrendingUp, Filter } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string>('lunch');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [comparisons, setComparisons] = useState<ForecastVsActualComparison[]>([]);
  const [rollingWaste, setRollingWaste] = useState<RollingWastePoint[]>([]);
  const [accuracy, setAccuracy] = useState<AccuracySummary | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.compareForecastsVsActuals({ service: selectedService, item: selectedItem || undefined }),
      api.getRollingWaste(45),
      api.getAccuracyMetrics(),
    ])
      .then(([compRes, wasteRes, accRes]) => {
        if (!isMounted) return;
        setComparisons(compRes.comparison);
        setRollingWaste(wasteRes.series);
        setAccuracy(accRes);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load historical analytics.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedService, selectedItem]);

  // Format forecast vs actual chart data
  const forecastActualChartData = comparisons
    .filter((c) => c.actual_recorded && c.actual_sold !== null)
    .slice(0, 30)
    .reverse()
    .map((c) => ({
      date: c.service_date.slice(5),
      item: c.item_id,
      actual: c.actual_sold,
      predicted: c.predicted_demand,
      lower: c.lower_estimate,
      upper: c.upper_estimate,
      waste: c.waste,
    }));

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header & Filter Controls */}
      <div className="border-b border-ink-hairline dark:border-ink-dark-hairline pb-4 flex flex-wrap justify-between items-end gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-semibold">
            Service Analytics & Aggregation
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink dark:text-ink-dark mt-1">
            Historical Trends & Forecast Verification
          </h1>
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-0.5">
            PyMongo Aggregations: Pipeline 2 (Forecast vs Actual Join), Pipeline 3 (Accuracy Facets), Pipeline 4 (7-Day Rolling Waste).
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Filter className="w-3.5 h-3.5" />
            <span>Service:</span>
          </div>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="text-xs font-mono px-3 py-1.5 rounded-control bg-canvas dark:bg-canvas-dark border border-ink-hairline dark:border-ink-dark-hairline text-ink dark:text-ink-dark outline-none cursor-pointer"
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="all">All Services</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="py-20 text-center text-ink-muted space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-forest" strokeWidth={1.5} />
          <p className="text-xs font-mono">Running MongoDB Aggregation Pipelines across historical service streams...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-control bg-clay/10 border border-clay/30 text-clay text-xs">
          {error}
        </div>
      )}

      {!loading && (
        <>
          {/* Key Accuracy Metrics (Pipeline 3 Facet Summary) */}
          {accuracy && accuracy.overall && (
            <section aria-label="Forecast Accuracy Summary" className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-ticket bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline">
                <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                  Mean Absolute Error (MAE)
                </div>
                <div className="font-mono text-2xl font-bold text-ink dark:text-ink-dark mt-1">
                  {accuracy.overall.mae} <span className="text-xs font-normal text-ink-muted">portions</span>
                </div>
                <div className="text-[10px] text-ink-muted mt-1 font-mono">
                  Target: &lt; 15 portions
                </div>
              </div>

              <div className="p-4 rounded-ticket bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline">
                <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                  Weighted Absolute % Error
                </div>
                <div className="font-mono text-2xl font-bold text-forest dark:text-forest-dark mt-1">
                  {(accuracy.overall.wape * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-ink-muted mt-1 font-mono">
                  WAPE = sum(|actual - pred|) / sum(actual)
                </div>
              </div>

              <div className="p-4 rounded-ticket bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline">
                <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                  Systematic Model Bias
                </div>
                <div className={`font-mono text-2xl font-bold mt-1 ${Math.abs(accuracy.overall.bias) > 1.0 ? 'text-saffron' : 'text-ink dark:text-ink-dark'}`}>
                  {accuracy.overall.bias > 0 ? `+${accuracy.overall.bias}` : accuracy.overall.bias}
                  <span className="text-xs font-normal text-ink-muted ml-1">portions</span>
                </div>
                <div className="text-[10px] text-ink-muted mt-1 font-mono">
                  Target: |bias| &lt; 1.0
                </div>
              </div>

              <div className="p-4 rounded-ticket bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline">
                <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                  Verified Service Observations
                </div>
                <div className="font-mono text-2xl font-bold text-ink dark:text-ink-dark mt-1">
                  {accuracy.overall.count} <span className="text-xs font-normal text-ink-muted">records</span>
                </div>
                <div className="text-[10px] text-ink-muted mt-1 font-mono">
                  Historical joined services
                </div>
              </div>
            </section>
          )}

          {/* Chart 1: Actual Sales vs Predicted Demand with 80% Interval Band (Pipeline 2) */}
          <section aria-label="Actual vs Forecast Comparison" className="p-6 rounded-ticket bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline space-y-4">
            <div>
              <div className="text-[11px] font-mono uppercase text-forest dark:text-forest-dark font-semibold">
                Pipeline 2 Join Aggregation
              </div>
              <h2 className="font-serif text-lg font-bold text-ink dark:text-ink-dark">
                Realized Sales vs. Model Forecast Range (80% Conformal Band)
              </h2>
              <p className="text-xs text-ink-muted">
                Observed actual sales (forest line) plotted against model point predictions (dashed line) and 80% interval envelope.
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastActualChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DDD5C4" opacity={0.4} />
                  <XAxis dataKey="date" stroke="#5B665F" fontSize={11} fontFamily="monospace" />
                  <YAxis stroke="#5B665F" fontSize={11} fontFamily="monospace" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FBF8F1',
                      border: '1px solid #DDD5C4',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  />
                  {/* Conformal 80% Band */}
                  <Area type="monotone" dataKey="upper" stroke="none" fill="#E3EBDD" fillOpacity={0.6} name="80% Upper" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="#FBF8F1" fillOpacity={1} name="80% Lower" />
                  <Line type="monotone" dataKey="predicted" stroke="#C98A1B" strokeDasharray="4 4" strokeWidth={2} dot={false} name="Forecast" />
                  <Line type="monotone" dataKey="actual" stroke="#1F4D3A" strokeWidth={2.5} dot={{ r: 3 }} name="Actual Sold" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Chart 2: Daily Waste & 7-Day Rolling Moving Average (Pipeline 4) */}
          <section aria-label="Rolling Waste Window Fields" className="p-6 rounded-ticket bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline space-y-4">
            <div>
              <div className="text-[11px] font-mono uppercase text-forest dark:text-forest-dark font-semibold">
                Pipeline 4 ($setWindowFields)
              </div>
              <h2 className="font-serif text-lg font-bold text-ink dark:text-ink-dark">
                Daily Cafeteria Leftover Portions & 7-Day Rolling Moving Average
              </h2>
              <p className="text-xs text-ink-muted">
                Daily preparation leftovers (bars) with 7-day trailing moving average window to monitor waste reduction.
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rollingWaste.slice(-30)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DDD5C4" opacity={0.4} />
                  <XAxis dataKey="service_date" stroke="#5B665F" fontSize={11} fontFamily="monospace" tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#5B665F" fontSize={11} fontFamily="monospace" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FBF8F1',
                      border: '1px solid #DDD5C4',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="daily_waste" fill="#C98A1B" opacity={0.7} radius={[2, 2, 0, 0]} name="Daily Leftovers" />
                  <Line type="monotone" dataKey="rolling_7d_waste" stroke="#A63D2F" strokeWidth={2.5} dot={false} name="7-Day Rolling Avg" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Category Breakdown Table (Pipeline 3 Facet) */}
          {accuracy && accuracy.by_category.length > 0 && (
            <section aria-label="Accuracy by Category" className="space-y-3">
              <h2 className="font-serif text-lg font-bold text-ink dark:text-ink-dark">
                Forecast Performance by Category
              </h2>
              <div className="border border-ink-hairline dark:border-ink-dark-hairline rounded-ticket bg-surface dark:bg-surface-dark overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-canvas dark:bg-canvas-dark border-b border-ink-hairline text-ink-muted text-[11px] uppercase">
                    <tr>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Observations</th>
                      <th className="p-3 text-right">MAE (Portions)</th>
                      <th className="p-3 text-right">WAPE (%)</th>
                      <th className="p-3 text-right">Signed Bias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-hairline dark:divide-ink-dark-hairline">
                    {accuracy.by_category.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-canvas/50">
                        <td className="p-3 font-semibold uppercase font-sans text-ink dark:text-ink-dark">{cat.category}</td>
                        <td className="p-3 text-right text-ink-muted">{cat.count}</td>
                        <td className="p-3 text-right text-ink dark:text-ink-dark font-bold">{cat.mae}</td>
                        <td className="p-3 text-right text-forest dark:text-forest-dark font-bold">{(cat.wape * 100).toFixed(1)}%</td>
                        <td className="p-3 text-right text-ink-muted">{cat.bias > 0 ? `+${cat.bias}` : cat.bias}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
