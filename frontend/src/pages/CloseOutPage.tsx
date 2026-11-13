import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Save, Loader2, CheckSquare } from 'lucide-react';
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
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header with Title & Finalize Action */}
      <div className="border-b border-ink-hairline dark:border-ink-dark-hairline pb-4 flex flex-wrap justify-between items-end gap-4">
        <div>
          <div className="text-[10px] font-sans font-semibold text-racing dark:text-racing-dark uppercase tracking-wider">
            Post-Service Reconciliation
          </div>
          <h1 className="editorial-title text-2xl font-bold tracking-tight text-ink dark:text-ink-dark mt-0.5">
            Service Close-out · {servicePeriod.toUpperCase()} ({serviceDate})
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Log realized kitchen production, guest portions sold, and observed stockouts to update model training telemetry.
          </p>
        </div>

        <button
          onClick={handleSaveCloseOut}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-racing hover:bg-racing-hover text-white text-xs font-semibold shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-60 active:scale-[0.98]"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              <span>Saving Out-turn...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" strokeWidth={1.75} />
              <span>Finalize & Save Service</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-crimson/10 border border-crimson/20 text-crimson text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-racing/10 border border-racing/25 text-racing dark:text-racing-dark text-xs flex items-center gap-2.5">
          <Check className="w-4 h-4 shrink-0 text-racing dark:text-racing-dark" />
          <span className="font-semibold">Service close-out saved successfully into MongoDB `service_observations`. Telemetry debrief below.</span>
        </div>
      )}

      {/* Bento Grid: Instant Service Debrief */}
      {debriefSummary && (
        <section aria-label="Service Debrief Bento" className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-racing dark:text-racing-dark" />
            <h2 className="text-xs font-sans font-bold text-ink dark:text-ink-dark uppercase tracking-wider">
              Service Debrief Summary
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <div className="text-[10px] font-sans font-semibold text-ink-muted uppercase">Realized Prep</div>
              <div className="editorial-title text-2xl font-bold text-ink dark:text-ink-dark mt-1 tabular-nums">
                {debriefSummary.total_prepared}
                <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">portions</span>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="text-[10px] font-sans font-semibold text-ink-muted uppercase">Realized Sales</div>
              <div className="editorial-title text-2xl font-bold text-racing dark:text-racing-dark mt-1 tabular-nums">
                {debriefSummary.total_sold}
                <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">servings</span>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="text-[10px] font-sans font-semibold text-ochre uppercase">Leftover Waste</div>
              <div className="editorial-title text-2xl font-bold text-ochre mt-1 tabular-nums">
                {debriefSummary.total_waste}
                <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">portions</span>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="text-[10px] font-sans font-semibold text-crimson uppercase">Stockouts Observed</div>
              <div className="editorial-title text-2xl font-bold text-crimson mt-1 tabular-nums">
                {debriefSummary.total_sold_out}
                <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">dishes</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Close-Out Input Table inside Glass Card */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-canvas-subtle/80 dark:bg-white/5 border-b border-ink-hairline dark:border-ink-dark-hairline text-ink-muted text-[10px] font-sans font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Menu Dish</th>
              <th className="py-3 px-3 text-right">Predicted Demand</th>
              <th className="py-3 px-3 text-center min-w-[140px]">Portions Prepared</th>
              <th className="py-3 px-3 text-center min-w-[140px]">Portions Sold</th>
              <th className="py-3 px-3 text-right">Leftovers</th>
              <th className="py-3 px-3 text-center">Stockout?</th>
              <th className="py-3 px-3 text-center">Validation Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-hairline dark:divide-ink-dark-hairline">
            {rows.map((row, idx) => {
              const waste = Math.max(0, row.portions_prepared - row.portions_sold);
              const isInvalid = row.portions_sold > row.portions_prepared;

              return (
                <tr
                  key={row.item_id}
                  className={`hover:bg-canvas-subtle/50 dark:hover:bg-white/5 transition-colors ${
                    isInvalid ? 'bg-crimson/10' : ''
                  }`}
                >
                  {/* Dish Name */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-ink dark:text-ink-dark text-sm">{row.item_name}</div>
                    <div className="text-[10px] text-ink-muted">{row.category}</div>
                  </td>

                  {/* Predicted Demand */}
                  <td className="py-3 px-3 text-right font-serif text-base font-bold text-ink-muted tabular-nums">
                    {row.predicted_demand !== undefined ? row.predicted_demand : '—'}
                  </td>

                  {/* Portions Prepared Input */}
                  <td className="py-3 px-3 text-center">
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
                      className="w-20 h-7 text-center font-mono font-bold text-sm bg-surface dark:bg-black/30 border border-ink-hairline dark:border-ink-dark-hairline rounded-md text-ink dark:text-ink-dark focus:border-racing outline-none tabular-nums"
                    />
                  </td>

                  {/* Portions Sold Input */}
                  <td className="py-3 px-3 text-center">
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
                      className={`w-20 h-7 text-center font-mono font-bold text-sm bg-surface dark:bg-black/30 border rounded-md outline-none tabular-nums ${
                        isInvalid
                          ? 'border-crimson text-crimson'
                          : 'border-ink-hairline dark:border-ink-dark-hairline text-ink dark:text-ink-dark focus:border-racing'
                      }`}
                    />
                  </td>

                  {/* Leftovers */}
                  <td className="py-3 px-3 text-right font-mono text-sm tabular-nums">
                    {isInvalid ? (
                      <span className="text-crimson font-bold">Error</span>
                    ) : waste > 0 ? (
                      <span className="text-ochre font-semibold">+{waste}</span>
                    ) : (
                      <span className="text-racing dark:text-racing-dark font-medium">0</span>
                    )}
                  </td>

                  {/* Sold-out toggle */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.sold_out}
                      onChange={(e) => handleUpdate(idx, 'sold_out', e.target.checked)}
                      className="w-4 h-4 accent-crimson cursor-pointer rounded-xs"
                      title="Mark if dish ran out before service concluded"
                    />
                  </td>

                  {/* Validation status badge */}
                  <td className="py-3 px-3 text-center">
                    {isInvalid ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-crimson/15 text-crimson font-bold">
                        Sold &gt; Prep
                      </span>
                    ) : row.sold_out ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-crimson/15 text-crimson font-bold">
                        STOCKOUT
                      </span>
                    ) : waste === 0 ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-racing/10 text-racing dark:text-racing-dark font-semibold">
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
