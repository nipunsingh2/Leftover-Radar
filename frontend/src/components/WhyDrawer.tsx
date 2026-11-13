import React, { useEffect, useState } from 'react';
import { X, HelpCircle, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { api, ItemExplanation } from '../api/client';

interface WhyDrawerProps {
  forecastId: string | null;
  itemId: string | null;
  itemName: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WhyDrawer: React.FC<WhyDrawerProps> = ({
  forecastId,
  itemId,
  itemName,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<ItemExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !forecastId || !itemId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .getForecastExplanation(forecastId, itemId)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load explainability breakdown.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, forecastId, itemId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity duration-200">
      <div className="w-full max-w-xl bg-surface dark:bg-[#121815] border-l border-ink-hairline dark:border-ink-dark-hairline shadow-2xl h-full flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-ink-hairline dark:border-ink-dark-hairline flex items-start justify-between sticky top-0 bg-surface/90 dark:bg-[#121815]/90 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-sans font-semibold text-racing dark:text-racing-dark uppercase tracking-wider">
                Explainability Audit
              </span>
              <span className="w-1 h-1 rounded-full bg-ink-muted/40" />
              <span className="text-[10px] font-mono text-ink-muted">Ridge log1p Model</span>
            </div>
            <h2 className="editorial-title text-2xl font-bold text-ink dark:text-ink-dark mt-1">
              Why this number?
            </h2>
            <div className="text-sm font-sans text-ink-muted dark:text-ink-dark-muted mt-0.5">
              {itemName || itemId}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark hover:bg-canvas-subtle transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {loading && (
            <div className="py-20 text-center text-ink-muted space-y-3">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-racing dark:text-racing-dark" strokeWidth={2} />
              <p className="text-xs font-mono">Decomposing Ridge regression weights & conformal residuals...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-crimson/10 border border-crimson/20 text-crimson text-xs">
              {error}
            </div>
          )}

          {!loading && data && (
            <>
              {/* Summary Bento Tile */}
              <div className="p-5 rounded-xl bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-mono uppercase text-ink-muted">
                    Point Forecast (ŷ)
                  </span>
                  <div className="text-right">
                    <span className="editorial-title text-3xl font-bold text-ink dark:text-ink-dark tabular-nums">
                      {data.predicted_demand}
                    </span>
                    <span className="text-xs font-sans text-ink-muted ml-1.5">portions</span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between text-xs pt-2.5 border-t border-ink-hairline dark:border-ink-dark-hairline">
                  <span className="text-ink-muted">80% Conformal Interval</span>
                  <span className="font-mono font-bold text-ink dark:text-ink-dark tabular-nums">
                    [{data.p80_low}, {data.p80_high}] portions
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs pt-2.5 border-t border-ink-hairline dark:border-ink-dark-hairline">
                  <span className="font-semibold text-racing dark:text-racing-dark font-sans">
                    Recommended Newsvendor Prep
                  </span>
                  <span className="font-mono text-racing dark:text-racing-dark font-bold text-sm tabular-nums">
                    {data.recommended_prep} portions (+{data.buffer_portions} buffer)
                  </span>
                </div>
              </div>

              {/* Data Fallback Notice */}
              <div className="p-3.5 rounded-xl bg-racing/5 dark:bg-racing-dark/10 border border-racing/20 text-xs text-ink dark:text-ink-dark leading-relaxed">
                <span className="font-semibold text-racing dark:text-racing-dark">Methodology: </span>
                <span>{data.explanation_text}</span>
              </div>

              {/* Waterfall Demand Drivers Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-sans font-semibold text-ink dark:text-ink-dark uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-racing dark:text-racing-dark" strokeWidth={2} />
                    <span>Waterfall Demand Contributions</span>
                  </h3>
                  <span className="text-[10px] font-mono text-ink-muted">Model Weights</span>
                </div>

                <div className="space-y-2">
                  {data.drivers.map((driver, idx) => {
                    const isPositive = driver.impact === 'positive';
                    const isNegative = driver.impact === 'negative';

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-canvas-subtle/60 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5 max-w-[70%]">
                          <div className="font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                            {isPositive && <ArrowUpRight className="w-3.5 h-3.5 text-racing dark:text-racing-dark" />}
                            {isNegative && <ArrowDownRight className="w-3.5 h-3.5 text-crimson" />}
                            <span>{driver.name}</span>
                          </div>
                          <div className="text-[11px] text-ink-muted leading-tight">
                            {driver.description}
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`font-mono font-bold text-sm tabular-nums ${
                              isPositive
                                ? 'text-racing dark:text-racing-dark'
                                : isNegative
                                ? 'text-crimson'
                                : 'text-ink dark:text-ink-dark'
                            }`}
                          >
                            {isPositive ? `+${driver.contribution}` : driver.contribution}
                          </div>
                          <div className="text-[9px] font-mono uppercase text-ink-muted">
                            {driver.unit}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Newsvendor Buffer Optimization Math Box */}
              <div className="space-y-3">
                <h3 className="text-xs font-sans font-semibold text-ink dark:text-ink-dark uppercase tracking-wider">
                  Newsvendor Economic Optimization
                </h3>

                <div className="p-4 rounded-xl bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline text-xs space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Cost of Stock-out (c_s)</span>
                    <span className="font-semibold text-ink dark:text-ink-dark">₹{data.buffer_inputs.stockout_cost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Cost of Waste (c_w)</span>
                    <span className="font-semibold text-ink dark:text-ink-dark">₹{data.buffer_inputs.waste_cost}</span>
                  </div>
                  <div className="flex justify-between border-t border-ink-hairline dark:border-ink-dark-hairline pt-2">
                    <span className="text-ink-muted">Critical Fractile q*</span>
                    <span className="font-bold text-racing dark:text-racing-dark">
                      {data.buffer_inputs.critical_fractile} [c_s / (c_s + c_w)]
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Safety Buffer Ceiling</span>
                    <span className="text-ink dark:text-ink-dark font-medium">
                      +{Math.round(data.buffer_inputs.buffer_cap_percent * 100)}% of demand
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-ink-hairline dark:border-ink-dark-hairline pt-2 font-bold text-sm">
                    <span className="text-ink dark:text-ink-dark font-sans">Recommended Target</span>
                    <span className="text-racing dark:text-racing-dark font-mono">
                      {data.buffer_inputs.recommended_prep} portions
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparable Historical Services */}
              <div className="space-y-3">
                <h3 className="text-xs font-sans font-semibold text-ink dark:text-ink-dark uppercase tracking-wider">
                  Comparable Prior Services (Strictly Past)
                </h3>

                {data.comparable_services.length === 0 ? (
                  <div className="text-xs text-ink-muted py-2 italic font-mono">
                    No prior service records found for this dish.
                  </div>
                ) : (
                  <div className="border border-ink-hairline dark:border-ink-dark-hairline rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-canvas-subtle dark:bg-white/5 border-b border-ink-hairline dark:border-ink-dark-hairline text-ink-muted text-[10px] font-mono uppercase">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-right">Prepared</th>
                          <th className="p-2.5 text-right">Sold</th>
                          <th className="p-2.5 text-right">Leftover</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-hairline dark:divide-ink-dark-hairline bg-surface dark:bg-surface-dark font-mono text-[11px]">
                        {data.comparable_services.map((cs, idx) => (
                          <tr key={idx} className="hover:bg-canvas-subtle/50 transition-colors">
                            <td className="p-2.5">
                              <div className="font-semibold text-ink dark:text-ink-dark">{cs.service_date}</div>
                              <div className="text-[10px] text-ink-muted">{cs.day_of_name} · {cs.weather}</div>
                            </td>
                            <td className="p-2.5 text-right text-ink dark:text-ink-dark">{cs.portions_prepared}</td>
                            <td className="p-2.5 text-right text-racing dark:text-racing-dark font-semibold">
                              {cs.portions_sold}
                              {cs.sold_out && <span className="ml-1 text-[9px] text-crimson font-bold">[SOLD OUT]</span>}
                            </td>
                            <td className="p-2.5 text-right text-ink-muted">{cs.leftovers}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
