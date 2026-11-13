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
import { Loader2, Filter } from 'lucide-react';

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
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header & Filter Controls */}
      <div className="border-b border-ink-hairline dark:border-ink-dark-hairline pb-4 flex flex-wrap justify-between items-end gap-4">
        <div>
          <div className="text-[10px] font-sans font-semibold text-racing dark:text-racing-dark uppercase tracking-wider">
            Operational Telemetry
          </div>
          <h1 className="editorial-title text-2xl font-bold tracking-tight text-ink dark:text-ink-dark mt-0.5">
            Historical Trends & Forecast Verification
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            PyMongo Aggregations: Pipeline 2 (Forecast vs Actual Join), Pipeline 3 (Accuracy Facets), Pipeline 4 (7-Day Rolling Waste Moving Window).
          </p>
        </div>

        {/* Filter Capsule */}
        <div className="flex items-center gap-2 bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline rounded-lg px-2.5 py-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-ink-muted" />
          <span className="text-ink-muted">Service:</span>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="font-mono font-medium bg-transparent text-ink dark:text-ink-dark outline-none cursor-pointer"
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="all">All Services</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="py-24 text-center text-ink-muted space-y-3">
          <Loader2 className="w-7 h-7 animate-spin mx-auto text-racing dark:text-racing-dark" strokeWidth={2} />
          <p className="text-xs font-mono">Running MongoDB 8.3 aggregation pipelines across historical service records...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-crimson/10 border border-crimson/20 text-crimson text-xs">
          {error}
        </div>
      )}

      {!loading && (
        <>
          {/* Key Accuracy Metrics (Bento Grid of Pipeline 3 Facet Summary) */}
          {accuracy && accuracy.overall && (
            <section aria-label="Forecast Accuracy Summary" className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-4">
                <div className="text-[10px] font-sans font-semibold text-ink-muted uppercase">
                  Mean Absolute Error (MAE)
                </div>
                <div className="editorial-title text-2xl font-bold text-ink dark:text-ink-dark mt-1 tabular-nums">
                  {accuracy.overall.mae}
                  <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">portions</span>
                </div>
                <div className="text-[10px] text-ink-muted mt-1 font-mono">
                  Production Target: &lt; 15 portions
                </div>
              </div>

              <div className="glass-card p-4">
                <div className="text-[10px] font-sans font-semibold text-ink-muted uppercase">
                  Weighted Absolute % Error
                </div>
                <div className="editorial-title text-2xl font-bold text-racing dark:text-racing-dark mt-1 tabular-nums">
                  {(accuracy.overall.wape * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-ink-muted mt-1 font-mono">
                  WAPE = Σ|actual - pred| / Σ(actual)
                </div>
              </div>

              <div className="glass-card p-4">
                <div className="text-[10px] font-sans font-semibold text-ink-muted uppercase">
                  Systematic Model Bias
                </div>
                <div className={`editorial-title text-2xl font-bold mt-1 tabular-nums ${Math.abs(accuracy.overall.bias) > 1.0 ? 'text-ochre' : 'text-ink dark:text-ink-dark'}`}>
                  {accuracy.overall.bias > 0 ? `+${accuracy.overall.bias}` : accuracy.overall.bias}
                  <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">portions</span>
                </div>
                <div className="text-[10px] text-ink-muted mt-1 font-mono">
                  Production Target: |bias| &lt; 1.0
                </div>
              </div>

              <div className="glass-card p-4">
                <div className="text-[10px] font-sans font-semibold text-ink-muted uppercase">
                  Verified Observations
                </div>
                <div className="editorial-title text-2xl font-bold text-ink dark:text-ink-dark mt-1 tabular-nums">
                  {accuracy.overall.count}
                  <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">records</span>
                </div>
                <div className="text-[10px] text-ink-muted mt-1 font-mono">
                  Joined historical meal services
                </div>
              </div>
            </section>
          )}

          {/* Chart 1: Actual Sales vs Predicted Demand with 80% Conformal Interval (Pipeline 2) */}
          <section aria-label="Actual vs Forecast Comparison" className="glass-card p-5 space-y-3">
            <div>
              <span className="text-[10px] font-sans font-semibold text-racing dark:text-racing-dark uppercase tracking-wider">
                Pipeline 2 ($lookup & $project Join)
              </span>
              <h2 className="editorial-title text-lg font-bold text-ink dark:text-ink-dark mt-0.5">
                Realized Sales vs. Model Forecast Range (80% Conformal Band)
              </h2>
              <p className="text-xs text-ink-muted">
                Observed actual sales (racing green line) plotted against model point predictions (ochre dashed line) and 80% confidence interval envelope.
              </p>
            </div>

            <div className="h-72 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastActualChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(22, 32, 26, 0.08)" />
                  <XAxis dataKey="date" stroke="#8D9C93" fontSize={11} fontFamily="monospace" />
                  <YAxis stroke="#8D9C93" fontSize={11} fontFamily="monospace" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(22, 32, 26, 0.1)',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                    }}
                  />
                  {/* Conformal 80% Band */}
                  <Area type="monotone" dataKey="upper" stroke="none" fill="#143828" fillOpacity={0.08} name="80% Upper" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="#FFFFFF" fillOpacity={0.8} name="80% Lower" />
                  <Line type="monotone" dataKey="predicted" stroke="#C07818" strokeDasharray="3 3" strokeWidth={1.75} dot={false} name="Forecast" />
                  <Line type="monotone" dataKey="actual" stroke="#143828" strokeWidth={2.25} dot={{ r: 3, fill: '#143828' }} name="Actual Sold" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Chart 2: Daily Waste & 7-Day Rolling Moving Average (Pipeline 4) */}
          <section aria-label="Rolling Waste Window Fields" className="glass-card p-5 space-y-3">
            <div>
              <span className="text-[10px] font-sans font-semibold text-racing dark:text-racing-dark uppercase tracking-wider">
                Pipeline 4 ($setWindowFields)
              </span>
              <h2 className="editorial-title text-lg font-bold text-ink dark:text-ink-dark mt-0.5">
                Daily Cafeteria Leftover Portions & 7-Day Rolling Moving Average
              </h2>
              <p className="text-xs text-ink-muted">
                Daily unconsumed preparation leftovers (ochre bars) with 7-day trailing moving average curve to monitor waste trends.
              </p>
            </div>

            <div className="h-72 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rollingWaste.slice(-30)} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(22, 32, 26, 0.08)" />
                  <XAxis dataKey="service_date" stroke="#8D9C93" fontSize={11} fontFamily="monospace" tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#8D9C93" fontSize={11} fontFamily="monospace" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(22, 32, 26, 0.1)',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                    }}
                  />
                  <Bar dataKey="daily_waste" fill="#C07818" opacity={0.6} radius={[3, 3, 0, 0]} name="Daily Leftovers" />
                  <Line type="monotone" dataKey="rolling_7d_waste" stroke="#A83228" strokeWidth={2.25} dot={false} name="7-Day Rolling Avg" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Category Breakdown Table (Pipeline 3 Facet) */}
          {accuracy && accuracy.by_category.length > 0 && (
            <section aria-label="Accuracy by Category" className="space-y-2">
              <h2 className="editorial-title text-xl font-bold text-ink dark:text-ink-dark">
                Forecast Performance by Menu Category
              </h2>
              <div className="glass-card overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-canvas-subtle/80 dark:bg-white/5 border-b border-ink-hairline dark:border-ink-dark-hairline text-ink-muted text-[10px] font-sans font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Observations</th>
                      <th className="py-3 px-4 text-right">MAE (Portions)</th>
                      <th className="py-3 px-4 text-right">WAPE (%)</th>
                      <th className="py-3 px-4 text-right">Signed Bias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-hairline dark:divide-ink-dark-hairline">
                    {accuracy.by_category.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-canvas-subtle/50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-ink dark:text-ink-dark font-sans">{cat.category}</td>
                        <td className="py-2.5 px-4 text-right text-ink-muted">{cat.count}</td>
                        <td className="py-2.5 px-4 text-right text-ink dark:text-ink-dark font-bold tabular-nums">{cat.mae}</td>
                        <td className="py-2.5 px-4 text-right text-racing dark:text-racing-dark font-bold tabular-nums">{(cat.wape * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-4 text-right text-ink-muted tabular-nums">{cat.bias > 0 ? `+${cat.bias}` : cat.bias}</td>
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
