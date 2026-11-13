import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Save, Loader2, Sparkles, CheckSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { api, MenuItem, ForecastItemResult } from '../api/client';

interface CloseOutPageProps {
  serviceDate: string;
  servicePeriod: 'breakfast' | 'lunch' | 'dinner';
  menuItems: MenuItem[];
  forecastItems: ForecastItemResult[];
}

interface CloseOutRow {
  item_id: string;
  item_name: string;
  category: string;
  portions_prepared: number;
  portions_sold: number;
  sold_out: boolean;
  predicted_demand?: number;
  forecast_error?: number;
}

export const CloseOutPage: React.FC<CloseOutPageProps> = ({
  serviceDate,
  servicePeriod,
  menuItems,
  forecastItems,
}) => {
  const [rows, setRows] = useState<CloseOutRow[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debriefSummary, setDebriefSummary] = useState<{
    total_prepared: number;
    total_sold: number;
    total_waste: number;
    total_sold_out: number;
  } | null>(null);

  // Initialize close-out rows from active forecast items or active menu catalog
  useEffect(() => {
    let initial: CloseOutRow[] = [];
    if (forecastItems.length > 0) {
      initial = forecastItems.map((f) => ({
        item_id: f.item_id,
        item_name: f.item_name,
        category: f.category,
        portions_prepared: f.planned_portions || f.recommended_portions || 40,
        portions_sold: Math.min(
          f.planned_portions || f.recommended_portions || 40,
          f.predicted_demand || 35
        ),
        sold_out: false,
        predicted_demand: f.predicted_demand,
      }));
    } else {
      initial = menuItems
        .filter((m) => m.active)
        .map((m) => ({
          item_id: m.id,
          item_name: m.name,
          category: m.category,
          portions_prepared: 50,
          portions_sold: 45,
          sold_out: false,
        }));
    }
    setRows(initial);
  }, [forecastItems, menuItems]);

  const handleUpdate = (
    index: number,
    field: 'portions_prepared' | 'portions_sold' | 'sold_out',
    value: any
  ) => {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value };

      // Auto-set sold_out if sold reaches prepared
      if (field === 'portions_sold' && row.portions_sold >= row.portions_prepared && row.portions_prepared > 0) {
        row.sold_out = true;
      }
      next[index] = row;
      return next;
    });
  };

  const handleSaveCloseOut = async () => {
    // Validate inline invariants: portions_sold <= portions_prepared
    for (const r of rows) {
      if (r.portions_sold > r.portions_prepared) {
        setErrorMessage(
          `Validation Error on "${r.item_name}": portions sold (${r.portions_sold}) cannot exceed portions prepared (${r.portions_prepared}).`
        );
        return;
      }
    }

    setErrorMessage(null);
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        service_date: serviceDate,
        service_period: servicePeriod,
        items: rows.map((r) => ({
          item_id: r.item_id,
          portions_prepared: r.portions_prepared,
          portions_sold: r.portions_sold,
          sold_out: r.sold_out,
        })),
      };

      await api.bulkCloseOut(payload);

      // Compute instant debrief metrics
      const totPrep = rows.reduce((acc, r) => acc + r.portions_prepared, 0);
      const totSold = rows.reduce((acc, r) => acc + r.portions_sold, 0);
      const totWaste = Math.max(0, totPrep - totSold);
      const totSoldOut = rows.filter((r) => r.sold_out).length;

      setDebriefSummary({
        total_prepared: totPrep,
        total_sold: totSold,
        total_waste: totWaste,
        total_sold_out: totSoldOut,
      });

      setSaveSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save close-out records.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header with Title & Finalize Action */}
      <div className="border-b border-gold/20 dark:border-white/10 pb-5 flex flex-wrap justify-between items-end gap-4">
        <div>
          <div className="victorian-badge text-[10px] text-forest dark:text-gold font-bold">
            Post-Service Reconciliation
          </div>
          <h1 className="victorian-heading text-3xl font-bold tracking-tight text-forest dark:text-gold mt-1">
            Service Close-out · {servicePeriod.toUpperCase()} ({serviceDate})
          </h1>
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-0.5">
            Log realized kitchen production, guest portions sold, and observed stockouts to update model training data.
          </p>
        </div>

        <button
          onClick={handleSaveCloseOut}
          disabled={isSaving}
          className="shimmer-hover flex items-center gap-2 px-6 py-2.5 rounded-xl bg-forest hover:bg-forest-hover text-gold-50 dark:bg-gold dark:text-black text-xs font-semibold shadow-lg shadow-forest/25 dark:shadow-gold-glow/20 border border-gold/40 transition-all duration-200 cursor-pointer disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              <span>Saving Out-turn...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" strokeWidth={1.75} />
              <span>Save & Finalize Service</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-clay/10 border border-clay/30 text-clay text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-forest/10 border border-forest/30 text-forest dark:text-gold text-xs flex items-center gap-2.5">
          <Check className="w-4 h-4 shrink-0 text-forest dark:text-gold" />
          <span className="font-semibold">Service close-out saved successfully into MongoDB `service_observations`. Debrief telemetry generated below.</span>
        </div>
      )}

      {/* Bento Grid: Instant Service Debrief */}
      {debriefSummary && (
        <section aria-label="Service Debrief Bento" className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-forest dark:text-gold" />
            <h2 className="victorian-badge text-xs font-bold text-forest dark:text-gold">
              Instant Service Debrief Telemetry
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <div className="victorian-badge text-[9px] text-ink-muted uppercase">Realized Preparation</div>
              <div className="victorian-heading text-3xl font-bold text-forest dark:text-gold mt-1 tabular-nums">
                {debriefSummary.total_prepared}
                <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">portions</span>
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="victorian-badge text-[9px] text-ink-muted uppercase">Realized Sales</div>
              <div className="victorian-heading text-3xl font-bold text-forest dark:text-gold mt-1 tabular-nums">
                {debriefSummary.total_sold}
                <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">servings</span>
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="victorian-badge text-[9px] text-saffron uppercase">Leftover Waste</div>
              <div className="victorian-heading text-3xl font-bold text-saffron mt-1 tabular-nums">
                {debriefSummary.total_waste}
                <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">portions</span>
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="victorian-badge text-[9px] text-clay uppercase">Stockouts Observed</div>
              <div className="victorian-heading text-3xl font-bold text-clay mt-1 tabular-nums">
                {debriefSummary.total_sold_out}
                <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">dishes</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Close-Out Input Table inside Glass Card */}
      <div className="glass-card shadow-glass dark:shadow-glass-dark">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-canvas-subtle/80 dark:bg-white/5 border-b border-gold/20 dark:border-white/10 text-ink-muted dark:text-ink-dark-muted victorian-badge text-[10px]">
            <tr>
              <th className="py-4 px-5">Menu Dish</th>
              <th className="py-4 px-3 text-right">Predicted Demand</th>
              <th className="py-4 px-3 text-center min-w-[140px]">Portions Prepared</th>
              <th className="py-4 px-3 text-center min-w-[140px]">Portions Sold</th>
              <th className="py-4 px-3 text-right">Leftovers</th>
              <th className="py-4 px-3 text-center">Stockout?</th>
              <th className="py-4 px-3 text-center">Audit Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/15 dark:divide-white/10">
            {rows.map((row, idx) => {
              const waste = Math.max(0, row.portions_prepared - row.portions_sold);
              const isInvalid = row.portions_sold > row.portions_prepared;

              return (
                <tr
                  key={row.item_id}
                  className={`hover:bg-gold/5 dark:hover:bg-white/5 transition-colors duration-150 ${
                    isInvalid ? 'bg-clay/10' : ''
                  }`}
                >
                  {/* Dish Name */}
                  <td className="py-3.5 px-5">
                    <div className="font-serif font-bold text-base text-ink dark:text-ink-dark">{row.item_name}</div>
                    <div className="victorian-badge text-[9px] text-ink-muted mt-0.5">{row.category}</div>
                  </td>

                  {/* Predicted Demand */}
                  <td className="py-3.5 px-3 text-right font-serif text-lg font-bold text-ink-muted tabular-nums">
                    {row.predicted_demand !== undefined ? row.predicted_demand : '—'}
                  </td>

                  {/* Portions Prepared Input */}
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="number"
                      min="0"
                      value={row.portions_prepared}
                      onChange={(e) =>
                        handleUpdate(
                          idx,
                          'portions_prepared',
                          Math.max(0, parseInt(e.target.value, 10) || 0)
                        )
                      }
                      className="w-22 h-8 text-center font-mono font-bold text-sm bg-canvas/90 dark:bg-black/40 border border-gold/30 dark:border-white/15 rounded-lg text-ink dark:text-ink-dark focus:border-gold outline-none tabular-nums shadow-inner transition-colors"
                    />
                  </td>

                  {/* Portions Sold Input */}
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="number"
                      min="0"
                      value={row.portions_sold}
                      onChange={(e) =>
                        handleUpdate(
                          idx,
                          'portions_sold',
                          Math.max(0, parseInt(e.target.value, 10) || 0)
                        )
                      }
                      className={`w-22 h-8 text-center font-mono font-bold text-sm bg-canvas/90 dark:bg-black/40 border rounded-lg outline-none tabular-nums shadow-inner transition-colors ${
                        isInvalid
                          ? 'border-clay text-clay'
                          : 'border-gold/30 dark:border-white/15 text-ink dark:text-ink-dark focus:border-gold'
                      }`}
                    />
                  </td>

                  {/* Leftovers */}
                  <td className="py-3.5 px-3 text-right font-mono text-sm tabular-nums">
                    {isInvalid ? (
                      <span className="text-clay font-bold">Error</span>
                    ) : waste > 0 ? (
                      <span className="text-saffron font-bold">+{waste}</span>
                    ) : (
                      <span className="text-forest dark:text-gold font-medium">0</span>
                    )}
                  </td>

                  {/* Sold-out toggle */}
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.sold_out}
                      onChange={(e) => handleUpdate(idx, 'sold_out', e.target.checked)}
                      className="w-4 h-4 accent-clay cursor-pointer rounded-xs"
                      title="Mark if dish ran out before service concluded"
                    />
                  </td>

                  {/* Validation status badge */}
                  <td className="py-3.5 px-3 text-center">
                    {isInvalid ? (
                      <span className="victorian-badge text-[9px] px-2 py-0.5 rounded-full bg-clay/15 text-clay font-bold">
                        Sold &gt; Prep
                      </span>
                    ) : row.sold_out ? (
                      <span className="victorian-badge text-[9px] px-2 py-0.5 rounded-full bg-clay/15 text-clay font-bold">
                        STOCKOUT
                      </span>
                    ) : waste === 0 ? (
                      <span className="victorian-badge text-[9px] px-2 py-0.5 rounded-full bg-forest/10 text-forest dark:text-gold font-bold">
                        Zero Waste
                      </span>
                    ) : (
                      <span className="text-ink-muted text-xs font-mono">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
