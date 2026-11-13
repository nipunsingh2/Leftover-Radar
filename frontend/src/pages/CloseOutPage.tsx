import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Save, Loader2, Sparkles, CheckSquare } from 'lucide-react';
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
      {/* Title */}
      <div className="border-b border-ink-hairline dark:border-ink-dark-hairline pb-4 flex justify-between items-end">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-semibold">
            Post-Service Reconciliation
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink dark:text-ink-dark mt-1">
            Service Close-out · {servicePeriod.toUpperCase()} ({serviceDate})
          </h1>
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-0.5">
            Record realized preparation, portions sold, and stockouts to calculate leftover waste and update model training data.
          </p>
        </div>

        <button
          onClick={handleSaveCloseOut}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-control bg-forest hover:bg-forest-hover text-[#F6F1E7] text-xs font-semibold shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              <span>Saving Out-turn...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" strokeWidth={1.5} />
              <span>Save & Finalize Service</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-control bg-clay/10 border border-clay/30 text-clay text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-control bg-forest/10 border border-forest/30 text-forest dark:text-forest-dark text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>Service close-out saved successfully into MongoDB `service_observations`. Debrief below.</span>
        </div>
      )}

      {/* Instant Debrief Card (Section 9.6: debrief showing forecast vs actual per item, total waste, error) */}
      {debriefSummary && (
        <section aria-label="Service Debrief Summary" className="p-5 rounded-ticket bg-canvas dark:bg-canvas-dark border border-ink-hairline dark:border-ink-dark-hairline space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-ink dark:text-ink-dark flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-forest" />
            <span>Instant Service Debrief</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1 font-mono text-xs">
            <div className="p-3 bg-surface dark:bg-surface-dark rounded-control border border-ink-hairline">
              <div className="text-ink-muted text-[10px] uppercase">Total Prepared</div>
              <div className="text-xl font-bold text-ink dark:text-ink-dark mt-0.5">
                {debriefSummary.total_prepared} <span className="text-[10px] font-normal">portions</span>
              </div>
            </div>
            <div className="p-3 bg-surface dark:bg-surface-dark rounded-control border border-ink-hairline">
              <div className="text-ink-muted text-[10px] uppercase">Realized Sales</div>
              <div className="text-xl font-bold text-forest dark:text-forest-dark mt-0.5">
                {debriefSummary.total_sold} <span className="text-[10px] font-normal">servings</span>
              </div>
            </div>
            <div className="p-3 bg-surface dark:bg-surface-dark rounded-control border border-ink-hairline">
              <div className="text-ink-muted text-[10px] uppercase">Realized Leftovers (Waste)</div>
              <div className="text-xl font-bold text-saffron mt-0.5">
                {debriefSummary.total_waste} <span className="text-[10px] font-normal">portions</span>
              </div>
            </div>
            <div className="p-3 bg-surface dark:bg-surface-dark rounded-control border border-ink-hairline">
              <div className="text-ink-muted text-[10px] uppercase">Stockouts Observed</div>
              <div className="text-xl font-bold text-clay mt-0.5">
                {debriefSummary.total_sold_out} <span className="text-[10px] font-normal">dishes</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Close-Out Table (Tab-key friendly, inline validation) */}
      <div className="border border-ink-hairline dark:border-ink-dark-hairline rounded-ticket bg-surface dark:bg-surface-dark overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-canvas dark:bg-canvas-dark border-b border-ink-hairline dark:border-ink-dark-hairline text-ink-muted dark:text-ink-dark-muted font-mono text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Menu Dish</th>
              <th className="py-3 px-3 text-right">Predicted Demand</th>
              <th className="py-3 px-3 text-center min-w-[130px]">Portions Prepared</th>
              <th className="py-3 px-3 text-center min-w-[130px]">Portions Sold</th>
              <th className="py-3 px-3 text-right">Leftovers</th>
              <th className="py-3 px-3 text-center">Stockout?</th>
              <th className="py-3 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-hairline dark:divide-ink-dark-hairline">
            {rows.map((row, idx) => {
              const waste = Math.max(0, row.portions_prepared - row.portions_sold);
              const isInvalid = row.portions_sold > row.portions_prepared;

              return (
                <tr
                  key={row.item_id}
                  className={`hover:bg-canvas/50 dark:hover:bg-canvas-dark/40 transition-colors ${
                    isInvalid ? 'bg-clay/5' : ''
                  }`}
                >
                  {/* Dish Name */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-ink dark:text-ink-dark text-sm">{row.item_name}</div>
                    <div className="text-[10px] uppercase font-mono text-ink-muted">{row.category}</div>
                  </td>

                  {/* Predicted Demand */}
                  <td className="py-3 px-3 text-right font-mono text-sm text-ink-muted tabular-nums">
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
                      className="w-20 h-8 text-center font-mono font-bold text-sm bg-canvas dark:bg-canvas-dark border border-ink-hairline dark:border-ink-dark-hairline rounded-[3px] text-ink dark:text-ink-dark focus:border-forest outline-none tabular-nums"
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
                      className={`w-20 h-8 text-center font-mono font-bold text-sm bg-canvas dark:bg-canvas-dark border rounded-[3px] outline-none tabular-nums ${
                        isInvalid
                          ? 'border-clay text-clay'
                          : 'border-ink-hairline dark:border-ink-dark-hairline text-ink dark:text-ink-dark focus:border-forest'
                      }`}
                    />
                  </td>

                  {/* Leftovers */}
                  <td className="py-3 px-3 text-right font-mono text-sm tabular-nums">
                    {isInvalid ? (
                      <span className="text-clay font-bold">Error</span>
                    ) : waste > 0 ? (
                      <span className="text-saffron font-bold">+{waste}</span>
                    ) : (
                      <span className="text-forest dark:text-forest-dark font-medium">0</span>
                    )}
                  </td>

                  {/* Sold-out toggle */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.sold_out}
                      onChange={(e) => handleUpdate(idx, 'sold_out', e.target.checked)}
                      className="w-4 h-4 accent-clay cursor-pointer rounded-[2px]"
                      title="Mark if dish ran out before service concluded"
                    />
                  </td>

                  {/* Validation status badge */}
                  <td className="py-3 px-3 text-center font-mono text-[10px]">
                    {isInvalid ? (
                      <span className="px-1.5 py-0.5 rounded bg-clay-tint text-clay font-bold">
                        Sold &gt; Prep
                      </span>
                    ) : row.sold_out ? (
                      <span className="px-1.5 py-0.5 rounded bg-clay/10 text-clay font-bold">
                        SOLD OUT
                      </span>
                    ) : waste === 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-sage-tint text-forest font-semibold">
                        Zero Waste
                      </span>
                    ) : (
                      <span className="text-ink-muted">OK</span>
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
