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
import { Loader2, TrendingUp, Filter, BarChart3, Database } from 'lucide-react';

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
      <div className="border-b border-gold/20 dark:border-white/10 pb-5 flex flex-wrap justify-between items-end gap-4">
        <div>
          <div className="victorian-badge text-[10px] text-forest dark:text-gold font-bold">
            Service Analytics & Aggregation
          </div>
          <h1 className="victorian-heading text-3xl font-bold tracking-tight text-forest dark:text-gold mt-1">
            Historical Trends & Forecast Verification
          </h1>
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-0.5">
            PyMongo Aggregations: Pipeline 2 (Forecast vs Actual Join), Pipeline 3 (Accuracy Facets), Pipeline 4 (7-Day Rolling Moving Window).
          </p>
        </div>

        {/* Filter Capsule */}
        <div className="flex items-center gap-3 bg-white/70 dark:bg-white/5 border border-gold/30 dark:border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-forest dark:text-gold font-serif">
            <Filter className="w-3.5 h-3.5" />
            <span>Service Filter:</span>
          </div>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="text-xs font-mono font-semibold bg-transparent text-ink dark:text-ink-dark outline-none cursor-pointer"
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
          <Loader2 className="w-9 h-9 animate-spin mx-auto text-gold" strokeWidth={2} />
          <p className="text-xs font-mono">Executing MongoDB 8.3 aggregation pipelines across service observation streams...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-clay/10 border border-clay/30 text-clay text-xs">
          {error}
        </div>
      )}

      {!loading && (
        <>
          {/* Key Accuracy Metrics (Bento Grid of Pipeline 3 Facet Summary) */}
          {accuracy && accuracy.overall && (
            <section aria-label="Forecast Accuracy Summary" className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div className="glass-card glass-card-hover p-5">
                <div className="victorian-badge text-[9px] text-ink-muted">
                  Mean Absolute Error (MAE)
                </div>
                <div className="victorian-heading text-3xl font-bold text-forest dark:text-gold mt-1 tabular-nums">
                  {accuracy.overall.mae}
                  <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">portions</span>
                </div>
                <div className="text-[10px] text-ink-muted mt-2 font-mono">
                  Production Target: &lt; 15 portions
                </div>
              </div>

              <div className="glass-card glass-card-hover p-5">
                <div className="victorian-badge text-[9px] text-ink-muted">
                  Weighted Absolute % Error
                </div>
                <div className="victorian-heading text-3xl font-bold text-forest dark:text-gold mt-1 tabular-nums">
                  {(accuracy.overall.wape * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-ink-muted mt-2 font-mono">
                  WAPE = Σ|actual - pred| / Σ(actual)
                </div>
              </div>

              <div className="glass-card glass-card-hover p-5">
                <div className="victorian-badge text-[9px] text-ink-muted">
                  Systematic Model Bias
                </div>
                <div className={`victorian-heading text-3xl font-bold mt-1 tabular-nums ${Math.abs(accuracy.overall.bias) > 1.0 ? 'text-saffron' : 'text-forest dark:text-gold'}`}>
                  {accuracy.overall.bias > 0 ? `+${accuracy.overall.bias}` : accuracy.overall.bias}
                  <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">portions</span>
                </div>
                <div className="text-[10px] text-ink-muted mt-2 font-mono">
                  Production Target: |bias| &lt; 1.0
                </div>
              </div>

              <div className="glass-card glass-card-hover p-5">
                <div className="victorian-badge text-[9px] text-ink-muted">
                  Verified Observations
                </div>
                <div className="victorian-heading text-3xl font-bold text-forest dark:text-gold mt-1 tabular-nums">
                  {accuracy.overall.count}
                  <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">records</span>
                </div>
                <div className="text-[10px] text-ink-muted mt-2 font-mono">
                  Joined historical meal services
                </div>
              </div>
            </section>
          )}

          {/* Chart 1: Actual Sales vs Predicted Demand with 80% Conformal Interval (Pipeline 2) */}
          <section aria-label="Actual vs Forecast Comparison" className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="victorian-badge text-[9px] text-forest dark:text-gold font-bold">
                  Pipeline 2 ($lookup & $project Join)
                </span>
                <h2 className="victorian-heading text-xl font-bold text-forest dark:text-gold mt-0.5">
                  Realized Sales vs. Model Forecast Range (80% Conformal Band)
                </h2>
                <p className="text-xs text-ink-muted">
                  Observed actual sales (deep emerald line) plotted against model point predictions (golden line) and 80% confidence interval.
                </p>
              </div>
            </div>

            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastActualChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(197, 160, 89, 0.2)" opacity={0.5} />
                  <XAxis dataKey="date" stroke="#8FA297" fontSize={11} fontFamily="monospace" />
                  <YAxis stroke="#8FA297" fontSize={11} fontFamily="monospace" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.92)',
                      border: '1px solid rgba(197, 160, 89, 0.35)',
                      borderRadius: '12px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      boxShadow: '0 8px 24px rgba(15, 45, 33, 0.1)',
                    }}
                  />
                  {/* Conformal 80% Band */}
                  <Area type="monotone" dataKey="upper" stroke="none" fill="#C5A059" fillOpacity={0.15} name="80% Upper" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="#FFFFFF" fillOpacity={0.8} name="80% Lower" />
                  <Line type="monotone" dataKey="predicted" stroke="#C5A059" strokeDasharray="4 4" strokeWidth={2} dot={false} name="Forecast" />
                  <Line type="monotone" dataKey="actual" stroke="#164232" strokeWidth={2.75} dot={{ r: 3.5, fill: '#164232' }} name="Actual Sold" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Chart 2: Daily Waste & 7-Day Rolling Moving Average (Pipeline 4) */}
          <section aria-label="Rolling Waste Window Fields" className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="victorian-badge text-[9px] text-forest dark:text-gold font-bold">
                  Pipeline 4 ($setWindowFields)
                </span>
                <h2 className="victorian-heading text-xl font-bold text-forest dark:text-gold mt-0.5">
                  Daily Cafeteria Leftover Portions & 7-Day Rolling Moving Average
                </h2>
                <p className="text-xs text-ink-muted">
                  Daily unconsumed preparation leftovers (amber bars) with 7-day trailing moving average curve to monitor waste trends.
                </p>
              </div>
            </div>

            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rollingWaste.slice(-30)} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(197, 160, 89, 0.2)" opacity={0.5} />
                  <XAxis dataKey="service_date" stroke="#8FA297" fontSize={11} fontFamily="monospace" tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#8FA297" fontSize={11} fontFamily="monospace" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.92)',
                      border: '1px solid rgba(197, 160, 89, 0.35)',
                      borderRadius: '12px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      boxShadow: '0 8px 24px rgba(15, 45, 33, 0.1)',
                    }}
                  />
                  <Bar dataKey="daily_waste" fill="#C98223" opacity={0.65} radius={[4, 4, 0, 0]} name="Daily Leftovers" />
                  <Line type="monotone" dataKey="rolling_7d_waste" stroke="#9E2A2B" strokeWidth={2.75} dot={false} name="7-Day Rolling Avg" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Category Breakdown Table (Pipeline 3 Facet) */}
          {accuracy && accuracy.by_category.length > 0 && (
            <section aria-label="Accuracy by Category" className="space-y-3">
              <h2 className="victorian-heading text-2xl font-bold text-forest dark:text-gold">
                Forecast Performance by Menu Category
              </h2>
              <div className="glass-card shadow-glass dark:shadow-glass-dark overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-canvas-subtle/80 dark:bg-white/5 border-b border-gold/20 dark:border-white/10 text-ink-muted victorian-badge text-[10px]">
                    <tr>
                      <th className="py-4 px-5">Category</th>
                      <th className="py-4 px-5 text-right">Observations</th>
                      <th className="py-4 px-5 text-right">MAE (Portions)</th>
                      <th className="py-4 px-5 text-right">WAPE (%)</th>
                      <th className="py-4 px-5 text-right">Signed Bias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/15 dark:divide-white/10">
                    {accuracy.by_category.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-gold/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-5 font-serif font-bold text-base text-ink dark:text-ink-dark">{cat.category}</td>
                        <td className="py-3.5 px-5 text-right text-ink-muted">{cat.count}</td>
                        <td className="py-3.5 px-5 text-right text-ink dark:text-ink-dark font-bold tabular-nums">{cat.mae}</td>
                        <td className="py-3.5 px-5 text-right text-forest dark:text-gold font-bold tabular-nums">{(cat.wape * 100).toFixed(1)}%</td>
                        <td className="py-3.5 px-5 text-right text-ink-muted tabular-nums">{cat.bias > 0 ? `+${cat.bias}` : cat.bias}</td>
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
