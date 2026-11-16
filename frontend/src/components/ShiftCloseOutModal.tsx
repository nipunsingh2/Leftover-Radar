import React, { useState, useEffect } from 'react';
import {
  X,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  TrendingDown,
  DollarSign,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { api, ForecastItemResult } from '../api/client';

interface ShiftCloseOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceDate: string;
  servicePeriod: 'breakfast' | 'lunch' | 'dinner';
  items: ForecastItemResult[];
  onSuccess?: () => void;
}

interface ItemRowState {
  item_id: string;
  item_name: string;
  category: string;
  price: number;
  portions_prepared: number;
  portions_sold: number;
  sold_out: boolean;
}

export const ShiftCloseOutModal: React.FC<ShiftCloseOutModalProps> = ({
  isOpen,
  onClose,
  serviceDate,
  servicePeriod,
  items,
  onSuccess,
}) => {
  if (!isOpen) return null;

  // Initialize row states from active planned portions
  const [rows, setRows] = useState<ItemRowState[]>(() =>
    items.map((it) => {
      const prep = it.planned_portions || it.recommended_portions || 100;
      // Pre-fill sold slightly under prep (e.g. median predicted demand or prep - buffer)
      const expectedSold = Math.min(prep, Math.round(it.predicted_demand || prep * 0.9));
      return {
        item_id: it.item_id,
        item_name: it.item_name,
        category: it.category,
        price: it.price || 40,
        portions_prepared: prep,
        portions_sold: expectedSold,
        sold_out: false,
      };
    })
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);

  // Totals
  const totalPrepared = rows.reduce((acc, r) => acc + (r.portions_prepared || 0), 0);
  const totalSold = rows.reduce((acc, r) => acc + (r.portions_sold || 0), 0);
  const totalWaste = Math.max(0, totalPrepared - totalSold);
  const sellThroughRate = totalPrepared > 0 ? ((totalSold / totalPrepared) * 100).toFixed(1) : '0.0';
  const estimatedWasteCost = totalWaste * 30; // ₹30/portion average cost

  const handleUpdate = (itemId: string, field: 'portions_prepared' | 'portions_sold', val: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.item_id !== itemId) return r;
        const updated = { ...r, [field]: Math.max(0, val) };
        if (field === 'portions_prepared' && updated.portions_sold > updated.portions_prepared) {
          updated.portions_sold = updated.portions_prepared;
        }
        updated.sold_out = updated.portions_sold >= updated.portions_prepared && updated.portions_prepared > 0;
        return updated;
      })
    );
  };

  const handleToggleSoldOut = (itemId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.item_id !== itemId) return r;
        const next = !r.sold_out;
        return {
          ...r,
          sold_out: next,
          portions_sold: next ? r.portions_prepared : r.portions_sold,
        };
      })
    );
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    // Validate invariant: sold <= prepared
    for (const r of rows) {
      if (r.portions_sold > r.portions_prepared) {
        setErrorMessage(
          `Validation Error: For "${r.item_name}", sold portions (${r.portions_sold}) cannot exceed prepared (${r.portions_prepared}).`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await api.bulkCloseOut({
        service_date: serviceDate,
        service_period: servicePeriod,
        items: rows.map((r) => ({
          item_id: r.item_id,
          portions_prepared: r.portions_prepared,
          portions_sold: r.portions_sold,
          sold_out: r.sold_out,
        })),
      });

      setIsSubmittedSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record end-of-day observations';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-surface dark:bg-surface-dark border-2 border-persimmon/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-ink-hairline dark:border-ink-dark-hairline bg-canvas-subtle/50 dark:bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-persimmon text-white flex items-center justify-center shadow-tactile">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="sticker-badge bg-persimmon/15 text-persimmon border-persimmon/30 font-mono text-[10px]">
                  END-OF-SHIFT AUDIT
                </span>
                <span className="text-xs font-mono text-ink-muted">
                  {serviceDate} • {servicePeriod.toUpperCase()}
                </span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-ink dark:text-ink-dark mt-0.5">
                Shift Close-Out & Actuals Reconciliation
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-muted hover:text-ink dark:hover:text-ink-dark hover:bg-canvas-subtle transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Reconciliation KPI Cards */}
        <div className="grid grid-cols-4 gap-3 p-5 bg-canvas/60 dark:bg-canvas-dark/40 border-b border-ink-hairline dark:border-ink-dark-hairline text-center">
          <div className="p-3 rounded-2xl bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline">
            <span className="text-[10px] font-mono text-ink-muted uppercase">Total Prepared</span>
            <div className="font-serif text-xl font-bold text-ink dark:text-ink-dark mt-0.5">
              {totalPrepared} <span className="text-[10px] font-normal text-ink-muted">serv</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline">
            <span className="text-[10px] font-mono text-ink-muted uppercase">Actual Sold</span>
            <div className="font-serif text-xl font-bold text-matcha dark:text-matcha-light mt-0.5">
              {totalSold} <span className="text-[10px] font-normal text-ink-muted">serv</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline">
            <span className="text-[10px] font-mono text-ink-muted uppercase">Leftover Waste</span>
            <div className="font-serif text-xl font-bold text-yuzu-dark mt-0.5">
              {totalWaste} <span className="text-[10px] font-normal text-ink-muted">serv</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline">
            <span className="text-[10px] font-mono text-ink-muted uppercase">Sell-Through Rate</span>
            <div className="font-serif text-xl font-bold text-persimmon mt-0.5">
              {sellThroughRate}%
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-berry/10 border border-berry/30 text-berry text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Banner */}
        {isSubmittedSuccess && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-matcha/15 border-2 border-matcha text-matcha-dark dark:text-matcha-light text-xs flex items-center gap-3 animate-in zoom-in-95">
            <CheckCircle2 className="w-5 h-5 text-matcha shrink-0" />
            <div>
              <div className="font-bold text-sm">Shift Successfully Reconciled!</div>
              <div className="text-[11px] opacity-90">
                Ground-truth observations persisted to MongoDB 8.x. Historical telemetry, variance tracking, and model retrain queues have been updated.
              </div>
            </div>
          </div>
        )}

        {/* Dish Entry Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <p className="text-xs text-ink-muted">
            Enter actual kitchen outcomes below. Invariant rule: Sold portions cannot exceed prepared portions.
          </p>

          <div className="border border-ink-hairline dark:border-ink-dark-hairline rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-canvas-subtle/80 dark:bg-white/5 border-b border-ink-hairline dark:border-ink-dark-hairline text-ink-muted text-[10px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Menu Item</th>
                  <th className="py-3 px-3 text-center">Portions Prepared</th>
                  <th className="py-3 px-3 text-center">Portions Sold</th>
                  <th className="py-3 px-3 text-center">Leftover Scrap</th>
                  <th className="py-3 px-3 text-center">Sold Out?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-hairline dark:divide-ink-dark-hairline bg-surface dark:bg-surface-dark">
                {rows.map((row) => {
                  const leftover = Math.max(0, row.portions_prepared - row.portions_sold);
                  const isInvalid = row.portions_sold > row.portions_prepared;
                  return (
                    <tr
                      key={row.item_id}
                      className={`hover:bg-canvas-subtle/40 transition-colors ${
                        isInvalid ? 'bg-berry/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-serif font-bold text-ink dark:text-ink-dark text-sm">
                        <div>{row.item_name}</div>
                        <span className="text-[10px] font-mono font-normal text-ink-muted">
                          {row.category}
                        </span>
                      </td>

                      {/* Portions Prepared Input */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min={0}
                          value={row.portions_prepared}
                          onChange={(e) =>
                            handleUpdate(row.item_id, 'portions_prepared', parseInt(e.target.value) || 0)
                          }
                          className="w-20 px-2.5 py-1.5 rounded-xl border border-ink-hairline text-center font-bold font-mono text-ink dark:text-ink-dark bg-canvas dark:bg-canvas-dark focus:border-persimmon outline-none"
                        />
                      </td>

                      {/* Portions Sold Input */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min={0}
                          value={row.portions_sold}
                          onChange={(e) =>
                            handleUpdate(row.item_id, 'portions_sold', parseInt(e.target.value) || 0)
                          }
                          className={`w-20 px-2.5 py-1.5 rounded-xl border text-center font-bold font-mono text-ink dark:text-ink-dark bg-canvas dark:bg-canvas-dark outline-none ${
                            isInvalid
                              ? 'border-berry text-berry'
                              : 'border-ink-hairline focus:border-matcha'
                          }`}
                        />
                      </td>

                      {/* Leftover Scrap Output */}
                      <td className="py-3 px-3 text-center font-bold tabular-nums">
                        <span
                          className={`px-2 py-0.5 rounded-md ${
                            leftover === 0
                              ? 'text-matcha bg-matcha/10'
                              : 'text-yuzu-dark bg-yuzu/15'
                          }`}
                        >
                          {leftover} portions
                        </span>
                      </td>

                      {/* Sold Out Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSoldOut(row.item_id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                            row.sold_out
                              ? 'bg-berry text-white shadow-xs'
                              : 'bg-canvas-subtle text-ink-muted hover:text-ink'
                          }`}
                        >
                          {row.sold_out ? 'SOLD OUT' : 'In Stock'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-ink-hairline dark:border-ink-dark-hairline bg-canvas-subtle/50 dark:bg-white/5 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-ink-muted flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-matcha" />
            <span>
              Waste Impact: <strong className="text-ink dark:text-ink-dark">≈ ₹{estimatedWasteCost.toLocaleString()}</strong> in unconsumed food
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-ink-hairline hover:bg-canvas-subtle text-xs font-bold text-ink-muted cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isSubmittedSuccess}
              className="btn-tactile flex items-center gap-2 px-5 py-2.5 rounded-xl bg-persimmon hover:bg-persimmon-hover text-white text-xs font-bold cursor-pointer shadow-tactile transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Committing to MongoDB...</span>
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Submit Shift Close-Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
