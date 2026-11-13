import React, { useEffect, useState } from 'react';
import { X, HelpCircle, Loader2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/30 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-surface dark:bg-surface-dark border-l border-ink-hairline dark:border-ink-dark-hairline shadow-2xl h-full flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between sticky top-0 bg-surface dark:bg-surface-dark z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-forest dark:text-forest-dark font-semibold">
                Explainability Audit
              </span>
            </div>
            <h2 className="font-serif text-xl font-bold text-ink dark:text-ink-dark mt-0.5">
              Why this number?
            </h2>
            <div className="text-xs text-ink-muted dark:text-ink-dark-muted font-medium">
              {itemName || itemId}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-control text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark hover:bg-canvas dark:hover:bg-canvas-dark transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {loading && (
            <div className="py-16 text-center text-ink-muted dark:text-ink-dark-muted space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-forest" strokeWidth={1.5} />
              <p className="text-xs font-mono">Decomposing ML model weights & historical residuals...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-control bg-clay/10 border border-clay/30 text-clay text-xs">
              {error}
            </div>
          )}

          {!loading && data && (
            <>
              {/* Summary Block */}
              <div className="p-4 rounded-ticket bg-canvas dark:bg-canvas-dark border border-ink-hairline dark:border-ink-dark-hairline space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-ink-muted dark:text-ink-dark-muted">Point Forecast</span>
                  <span className="font-mono text-xl font-bold text-ink dark:text-ink-dark">
                    {data.predicted_demand} <span className="text-xs font-normal text-ink-muted">portions</span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-ink-muted dark:text-ink-dark-muted">80% Conformal Interval</span>
                  <span className="font-mono text-ink dark:text-ink-dark font-medium">
                    [{data.p80_low}, {data.p80_high}]
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs pt-1 border-t border-ink-hairline dark:border-ink-dark-hairline">
                  <span className="text-ink-muted dark:text-ink-dark-muted font-medium">Newsvendor Recommendation</span>
                  <span className="font-mono text-forest dark:text-forest-dark font-bold text-sm">
                    {data.recommended_prep} portions (+{data.buffer_portions} buffer)
                  </span>
                </div>
              </div>

              {/* Data Fallback Notice */}
              <div className="p-3 rounded-ticket bg-sage-tint/40 dark:bg-sage-tint/10 border border-forest/20 text-xs text-ink dark:text-ink-dark leading-relaxed">
                <span className="font-semibold text-forest dark:text-forest-dark">Method: </span>
                {data.explanation_text}
              </div>

              {/* Waterfall Drivers Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-semibold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-forest" strokeWidth={1.5} />
                  <span>Waterfall Demand Drivers</span>
                </h3>

                <div className="space-y-2">
                  {data.drivers.map((driver, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-control bg-canvas dark:bg-canvas-dark border border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 max-w-[70%]">
                        <div className="font-medium text-ink dark:text-ink-dark">{driver.name}</div>
                        <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-tight">
                          {driver.description}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-mono font-bold text-sm ${
                            driver.impact === 'positive'
                              ? 'text-forest dark:text-forest-dark'
                              : driver.impact === 'negative'
                              ? 'text-clay'
                              : 'text-ink dark:text-ink-dark'
                          }`}
                        >
                          {driver.impact === 'positive' ? `+${driver.contribution}` : driver.contribution}
                        </div>
                        <div className="text-[10px] font-mono text-ink-muted uppercase">
                          {driver.unit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Newsvendor Buffer Math Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-semibold">
                  Newsvendor Buffer Optimization
                </h3>

                <div className="p-4 rounded-ticket bg-canvas dark:bg-canvas-dark border border-ink-hairline dark:border-ink-dark-hairline text-xs space-y-2.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Cost of Stock-out (c_s)</span>
                    <span className="font-medium text-ink dark:text-ink-dark">₹{data.buffer_inputs.stockout_cost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Cost of Waste (c_w)</span>
                    <span className="font-medium text-ink dark:text-ink-dark">₹{data.buffer_inputs.waste_cost}</span>
                  </div>
                  <div className="flex justify-between border-t border-ink-hairline dark:border-ink-dark-hairline pt-2">
                    <span className="text-ink-muted">Critical Fractile q*</span>
                    <span className="font-bold text-forest dark:text-forest-dark">
                      {data.buffer_inputs.critical_fractile} (c_s / (c_s + c_w))
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Buffer Cap</span>
                    <span className="text-ink dark:text-ink-dark">
                      +{Math.round(data.buffer_inputs.buffer_cap_percent * 100)}% of demand
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-ink-hairline dark:border-ink-dark-hairline pt-2 font-bold">
                    <span className="text-ink dark:text-ink-dark">Recommended Prep</span>
                    <span className="text-forest dark:text-forest-dark">
                      {data.buffer_inputs.recommended_prep} portions
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparable Historical Services */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-semibold">
                  Comparable Prior Services (Strictly Past)
                </h3>

                {data.comparable_services.length === 0 ? (
                  <div className="text-xs text-ink-muted py-2 italic font-mono">
                    No prior service records found for this dish.
                  </div>
                ) : (
                  <div className="border border-ink-hairline dark:border-ink-dark-hairline rounded-ticket overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-canvas dark:bg-canvas-dark border-b border-ink-hairline dark:border-ink-dark-hairline text-ink-muted text-[11px] font-mono">
                        <tr>
                          <th className="p-2">Date</th>
                          <th className="p-2">Prepared</th>
                          <th className="p-2">Sold</th>
                          <th className="p-2">Leftover</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-hairline dark:divide-ink-dark-hairline bg-surface dark:bg-surface-dark font-mono text-[11px]">
                        {data.comparable_services.map((cs, idx) => (
                          <tr key={idx} className="hover:bg-canvas/50">
                            <td className="p-2">
                              <div>{cs.service_date}</div>
                              <div className="text-[10px] text-ink-muted">{cs.day_of_name} · {cs.weather}</div>
                            </td>
                            <td className="p-2 text-ink dark:text-ink-dark">{cs.portions_prepared}</td>
                            <td className="p-2 text-ink dark:text-ink-dark">
                              {cs.portions_sold}
                              {cs.sold_out && <span className="ml-1 text-[9px] text-clay font-bold">[SOLD OUT]</span>}
                            </td>
                            <td className="p-2 text-ink-muted">{cs.leftovers}</td>
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
