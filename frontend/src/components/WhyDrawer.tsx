import React, { useEffect, useState } from 'react';
import { X, HelpCircle, Loader2, Compass, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end transition-opacity duration-300">
      <div className="w-full max-w-xl bg-surface/95 dark:bg-[#0E1A13]/95 backdrop-blur-2xl border-l border-gold/30 dark:border-white/10 shadow-2xl h-full flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gold/20 dark:border-white/10 flex items-start justify-between sticky top-0 bg-surface/90 dark:bg-[#0E1A13]/90 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="victorian-badge text-[9px] text-gold dark:text-gold font-bold">
                Transparency & Attribution
              </span>
              <span className="w-1 h-1 rounded-full bg-gold/50" />
              <span className="text-[10px] font-mono text-ink-muted">Linear Model Decomposition</span>
            </div>
            <h2 className="victorian-heading text-2xl font-bold text-forest dark:text-gold mt-1">
              Why this number?
            </h2>
            <div className="text-sm font-serif italic text-ink-muted dark:text-ink-dark-muted mt-0.5">
              {itemName || itemId}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-gold hover:bg-gold/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {loading && (
            <div className="py-20 text-center text-ink-muted space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gold" strokeWidth={2} />
              <p className="text-xs font-mono">Decomposing Ridge model feature coefficients & conformal residuals...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-clay/10 border border-clay/30 text-clay text-xs">
              {error}
            </div>
          )}

          {!loading && data && (
            <>
              {/* Summary Bento Tile */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-gold/10 via-surface/80 to-forest/5 dark:from-gold/10 dark:via-black/30 dark:to-white/5 border border-gold/30 dark:border-white/15 shadow-sm space-y-3.5 backdrop-blur-md">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">
                    Point Forecast (ŷ)
                  </span>
                  <div className="text-right">
                    <span className="font-serif text-3xl font-bold text-forest dark:text-gold tabular-nums">
                      {data.predicted_demand}
                    </span>
                    <span className="text-xs font-sans text-ink-muted ml-1">portions</span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between text-xs pt-2 border-t border-gold/20 dark:border-white/10">
                  <span className="text-ink-muted dark:text-ink-dark-muted">80% Conformal Interval</span>
                  <span className="font-mono font-bold text-ink dark:text-ink-dark">
                    [{data.p80_low}, {data.p80_high}] portions
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs pt-2 border-t border-gold/20 dark:border-white/10">
                  <span className="font-semibold text-forest dark:text-gold font-serif">
                    Recommended Newsvendor Prep
                  </span>
                  <span className="font-mono text-forest dark:text-gold font-bold text-sm">
                    {data.recommended_prep} portions (+{data.buffer_portions} buffer)
                  </span>
                </div>
              </div>

              {/* Data Fallback / Methodology Statement */}
              <div className="p-4 rounded-xl bg-forest/5 dark:bg-white/5 border border-forest/20 dark:border-gold/25 text-xs text-ink dark:text-ink-dark leading-relaxed">
                <span className="victorian-badge text-[10px] text-forest dark:text-gold font-bold mr-1.5">
                  Methodology:
                </span>
                <span>{data.explanation_text}</span>
              </div>

              {/* Waterfall Demand Drivers Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="victorian-badge text-[10px] text-ink-muted dark:text-ink-dark-muted font-bold flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-gold" strokeWidth={2} />
                    <span>Waterfall Demand Contributions</span>
                  </h3>
                  <span className="text-[10px] font-mono text-ink-muted">Feature Weights</span>
                </div>

                <div className="space-y-2.5">
                  {data.drivers.map((driver, idx) => {
                    const isPositive = driver.impact === 'positive';
                    const isNegative = driver.impact === 'negative';

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-canvas/70 dark:bg-white/5 border border-gold/20 dark:border-white/10 flex items-center justify-between text-xs hover:border-gold/40 transition-all duration-200"
                      >
                        <div className="space-y-0.5 max-w-[70%]">
                          <div className="font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                            {isPositive && <ArrowUpRight className="w-3.5 h-3.5 text-forest dark:text-forest-dark" />}
                            {isNegative && <ArrowDownRight className="w-3.5 h-3.5 text-clay" />}
                            <span>{driver.name}</span>
                          </div>
                          <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-tight">
                            {driver.description}
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`font-mono font-bold text-sm tabular-nums ${
                              isPositive
                                ? 'text-forest dark:text-gold'
                                : isNegative
                                ? 'text-clay'
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
                <h3 className="victorian-badge text-[10px] text-ink-muted dark:text-ink-dark-muted font-bold">
                  Newsvendor Mathematical Optimization
                </h3>

                <div className="p-4 rounded-xl bg-canvas/80 dark:bg-black/30 border border-gold/25 dark:border-white/10 text-xs space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Cost of Stock-out (c_s)</span>
                    <span className="font-semibold text-ink dark:text-ink-dark">₹{data.buffer_inputs.stockout_cost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Cost of Waste (c_w)</span>
                    <span className="font-semibold text-ink dark:text-ink-dark">₹{data.buffer_inputs.waste_cost}</span>
                  </div>
                  <div className="flex justify-between border-t border-gold/20 dark:border-white/10 pt-2">
                    <span className="text-ink-muted">Critical Fractile q*</span>
                    <span className="font-bold text-forest dark:text-gold">
                      {data.buffer_inputs.critical_fractile} [c_s / (c_s + c_w)]
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Safety Buffer Cap</span>
                    <span className="text-ink dark:text-ink-dark font-medium">
                      +{Math.round(data.buffer_inputs.buffer_cap_percent * 100)}% of demand
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gold/20 dark:border-white/10 pt-2 font-bold text-sm">
                    <span className="text-forest dark:text-gold font-serif">Recommended Target</span>
                    <span className="text-forest dark:text-gold">
                      {data.buffer_inputs.recommended_prep} portions
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparable Historical Services */}
              <div className="space-y-3">
                <h3 className="victorian-badge text-[10px] text-ink-muted dark:text-ink-dark-muted font-bold">
                  Historical Services (Temporal Strictly Past)
                </h3>

                {data.comparable_services.length === 0 ? (
                  <div className="text-xs text-ink-muted py-3 italic font-serif">
                    No historical records available for this dish in MongoDB.
                  </div>
                ) : (
                  <div className="border border-gold/25 dark:border-white/10 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-canvas-subtle/80 dark:bg-white/5 border-b border-gold/20 dark:border-white/10 text-ink-muted text-[10px] font-mono uppercase">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-right">Prepared</th>
                          <th className="p-2.5 text-right">Sold</th>
                          <th className="p-2.5 text-right">Leftover</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gold/15 dark:divide-white/10 bg-surface/50 dark:bg-black/20 font-mono text-[11px]">
                        {data.comparable_services.map((cs, idx) => (
                          <tr key={idx} className="hover:bg-gold/5 transition-colors">
                            <td className="p-2.5">
                              <div className="font-semibold text-ink dark:text-ink-dark">{cs.service_date}</div>
                              <div className="text-[10px] text-ink-muted">{cs.day_of_name} · {cs.weather}</div>
                            </td>
                            <td className="p-2.5 text-right text-ink dark:text-ink-dark">{cs.portions_prepared}</td>
                            <td className="p-2.5 text-right text-forest dark:text-gold font-semibold">
                              {cs.portions_sold}
                              {cs.sold_out && <span className="ml-1 text-[9px] text-clay font-bold">[STOCKOUT]</span>}
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
