import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Printer,
  Sliders,
} from 'lucide-react';
import { ForecastItemResult } from '../api/client';
import { RangeBar } from '../components/RangeBar';
import { WhyDrawer } from '../components/WhyDrawer';
import { PrepSheetModal } from '../components/PrepSheetModal';

interface PlanPageProps {
  serviceDate: string;
  servicePeriod: 'breakfast' | 'lunch' | 'dinner';
  forecastItems: ForecastItemResult[];
  onUpdatePlannedPortions: (itemId: string, newPlanned: number) => void;
  onApplyAllRecommendations: () => void;
  onUndoApplyAll?: () => void;
  canUndo?: boolean;
}

export const PlanPage: React.FC<PlanPageProps> = ({
  serviceDate,
  servicePeriod,
  forecastItems,
  onUpdatePlannedPortions,
  onApplyAllRecommendations,
  onUndoApplyAll,
  canUndo = false,
}) => {
  // Why Drawer state
  const [activeWhyItem, setActiveWhyItem] = useState<{ id: string; name: string } | null>(null);
  const [isPrepSheetOpen, setIsPrepSheetOpen] = useState<boolean>(false);

  // 1. Live Summary Band Calculations (Zero network calls, instant local execution)
  const totalPlanned = forecastItems.reduce((acc, it) => acc + (it.planned_portions || 0), 0);
  const totalPredicted = forecastItems.reduce((acc, it) => acc + (it.predicted_demand || 0), 0);
  const totalLeftovers = forecastItems.reduce((acc, it) => acc + (it.estimated_leftovers || 0), 0);
  const totalShortfall = forecastItems.reduce((acc, it) => acc + (it.estimated_shortfall || 0), 0);

  // 2. Attention Panel (Top items requiring kitchen attention)
  const attentionItems = forecastItems
    .filter((it) => it.risk_level === 'high' || it.risk_level === 'watch' || it.history_status !== 'sufficient')
    .slice(0, 4);

  const handleApplySingle = (itemId: string, recommended: number) => {
    onUpdatePlannedPortions(itemId, recommended);
  };

  const handleAdjustStep = (itemId: string, currentPlanned: number, delta: number) => {
    const updated = Math.max(0, currentPlanned + delta);
    onUpdatePlannedPortions(itemId, updated);
  };

  const netDelta = totalPlanned - totalPredicted;
  const netDeltaPercent = totalPredicted > 0 ? ((netDelta / totalPredicted) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Bento Grid: Executive Kitchen Summary */}
      <section aria-label="Service Plan Summary Bento Grid">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bento Cell 1: Dominant Anchor (2-col span on LG) */}
          <div className="lg:col-span-2 glass-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-sans font-semibold text-racing dark:text-racing-dark uppercase tracking-wider">
                  Target Operator Preparation
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="editorial-title text-4xl font-bold text-ink dark:text-ink-dark tabular-nums">
                    {totalPlanned}
                  </span>
                  <span className="text-xs font-sans text-ink-muted">total portions planned</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-ink-muted uppercase">Model Forecast</span>
                <div className="text-xl font-bold font-mono text-ink dark:text-ink-dark mt-0.5 tabular-nums">
                  {totalPredicted} <span className="text-[10px] font-normal text-ink-muted">servings</span>
                </div>
              </div>
            </div>

            {/* Visual Balance Bar */}
            <div className="mt-4 pt-3 border-t border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-racing dark:bg-racing-dark" />
                <span className="font-medium text-ink dark:text-ink-dark">
                  Net Balance: {netDelta >= 0 ? `+${netDelta} buffer (+${netDeltaPercent}%)` : `${netDelta} deficit (${netDeltaPercent}%)`}
                </span>
              </div>
              <span className="text-[11px] font-mono text-ink-muted">
                {forecastItems.length} active menu items
              </span>
            </div>
          </div>

          {/* Bento Cell 2: Projected Leftover Waste */}
          <div className="glass-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-sans font-semibold text-ochre uppercase tracking-wider">
                Projected Leftovers
              </span>
              <TrendingDown className="w-3.5 h-3.5 text-ochre" />
            </div>

            <div className="my-2">
              <div className={`editorial-title text-3xl font-bold tabular-nums ${totalLeftovers > 50 ? 'text-ochre' : 'text-ink dark:text-ink-dark'}`}>
                {totalLeftovers}
                <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">portions</span>
              </div>
              <div className="text-[11px] text-ink-muted font-sans mt-0.5">
                Planned surplus buffer
              </div>
            </div>

            <div className="pt-2 border-t border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-muted">Est. Food Value:</span>
              <span className="font-semibold text-ochre">≈ ₹{(totalLeftovers * 30).toLocaleString()}</span>
            </div>
          </div>

          {/* Bento Cell 3: Projected Shortfall Risk */}
          <div className="glass-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-sans font-semibold text-crimson uppercase tracking-wider">
                Projected Shortfall
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-crimson" />
            </div>

            <div className="my-2">
              <div className={`editorial-title text-3xl font-bold tabular-nums ${totalShortfall > 0 ? 'text-crimson' : 'text-racing dark:text-racing-dark'}`}>
                {totalShortfall}
                <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">portions</span>
              </div>
              <div className="text-[11px] text-ink-muted font-sans mt-0.5">
                {totalShortfall === 0 ? 'Full demand coverage' : 'Stockout risk detected'}
              </div>
            </div>

            <div className="pt-2 border-t border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-muted">Diner Coverage:</span>
              <span className={`font-semibold ${totalShortfall === 0 ? 'text-racing dark:text-racing-dark' : 'text-crimson'}`}>
                {totalShortfall === 0 ? '100% Satisfied' : 'Action Required'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Attention Panel (Clean, compact, with correct grammar) */}
      {attentionItems.length > 0 && (
        <section aria-label="Kitchen Attention Items" className="glass-card p-5 space-y-3 border-l-4 border-l-ochre">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-ochre shrink-0" />
              <div>
                <h2 className="text-xs font-sans font-bold text-ink dark:text-ink-dark">
                  Attention Required ({attentionItems.length} {attentionItems.length === 1 ? 'Dish Needs Review' : 'Dishes Need Review'})
                </h2>
                <div className="text-[11px] text-ink-muted">
                  Planned preparation deviates significantly from calibrated Newsvendor safety bounds
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canUndo && onUndoApplyAll && (
                <button
                  onClick={onUndoApplyAll}
                  className="px-2.5 py-1 rounded-md border border-ink-hairline text-xs font-medium text-ink-muted hover:text-ink flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              )}

              <button
                onClick={onApplyAllRecommendations}
                className="px-3 py-1.5 rounded-md bg-racing hover:bg-racing-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <span>Apply All Recommendations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {attentionItems.map((item) => (
              <div
                key={item.item_id}
                className="p-3.5 rounded-xl bg-canvas-subtle/70 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline text-xs flex flex-col justify-between space-y-2.5"
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-semibold text-ink dark:text-ink-dark text-xs">{item.item_name}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${
                        item.risk_level === 'high'
                          ? 'bg-crimson/10 text-crimson'
                          : 'bg-ochre/10 text-ochre'
                      }`}
                    >
                      {item.risk_level}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-ink-muted mt-1">
                    Plan: <span className="text-ink dark:text-ink-dark font-semibold">{item.planned_portions}</span> · Rec: <span className="text-racing dark:text-racing-dark font-semibold">{item.recommended_portions}</span>
                  </div>
                  <p className="text-[11px] text-ink-muted leading-tight mt-1.5">
                    {item.risk_reason || item.buffer_rationale}
                  </p>
                </div>

                <div className="pt-2 border-t border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between">
                  <span className="text-[10px] font-mono text-ink-muted">
                    Rec Buffer: +{item.recommended_portions - item.predicted_demand}
                  </span>
                  <button
                    onClick={() => handleApplySingle(item.item_id, item.recommended_portions)}
                    className="px-2.5 py-1 rounded bg-racing hover:bg-racing-hover text-white text-[11px] font-semibold transition-colors cursor-pointer active:scale-95"
                  >
                    Apply {item.recommended_portions}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Preparation Ledger Table (The Hero Operational Component) */}
      <section aria-label="Preparation Ledger" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="editorial-title text-xl font-bold text-ink dark:text-ink-dark">
              Daily Preparation Ledger
            </h2>
            <p className="text-xs text-ink-muted">
              Interactive preparation ledger with calibrated 80% conformal demand intervals and Newsvendor buffer optimization.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrepSheetOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-surface-dark hover:bg-canvas-subtle text-xs font-medium text-ink dark:text-ink-dark shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-ink-muted" />
              <span>Print Sheet</span>
            </button>
            <button
              onClick={onApplyAllRecommendations}
              className="px-3.5 py-1.5 rounded-lg bg-racing hover:bg-racing-hover text-white text-xs font-semibold shadow-xs transition-all duration-150 cursor-pointer active:scale-[0.98]"
            >
              Apply All Recommendations
            </button>
          </div>
        </div>

        {/* Ledger Table inside Glass Card */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-canvas-subtle/80 dark:bg-white/5 border-b border-ink-hairline dark:border-ink-dark-hairline text-ink-muted text-[10px] font-sans font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Menu Dish</th>
                  <th className="py-3 px-3 text-right">Forecast (ŷ)</th>
                  <th className="py-3 px-4 min-w-[260px]">80% Conformal Range</th>
                  <th className="py-3 px-4 text-center min-w-[200px]">Planned Prep</th>
                  <th className="py-3 px-3 text-right">Est. Leftover</th>
                  <th className="py-3 px-3 text-right">Recommended</th>
                  <th className="py-3 px-3 text-center">Risk Status</th>
                  <th className="py-3 px-3 text-center">Audit</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-ink-hairline dark:divide-ink-dark-hairline">
                {forecastItems.map((item) => {
                  const isHighRisk = item.risk_level === 'high';
                  const isWatch = item.risk_level === 'watch';

                  return (
                    <tr
                      key={item.item_id}
                      className="hover:bg-canvas-subtle/50 dark:hover:bg-white/5 transition-colors duration-100"
                    >
                      {/* 1. Dish Name & Tags */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink dark:text-ink-dark text-sm">
                          {item.item_name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-medium text-ink-muted px-1.5 py-0.5 rounded bg-canvas-subtle dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline">
                            {item.category}
                          </span>
                          <span className="text-[11px] font-mono text-ink-muted">
                            ₹{item.price}
                          </span>
                          {/* History Status Badge */}
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-medium ${
                              item.history_status === 'sufficient'
                                ? 'text-racing dark:text-racing-dark'
                                : item.history_status === 'low_history'
                                ? 'text-ochre font-semibold'
                                : 'text-crimson font-semibold'
                            }`}
                          >
                            {item.history_status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>

                      {/* 2. Predicted Demand */}
                      <td className="py-3 px-3 text-right font-serif text-lg font-bold text-ink dark:text-ink-dark tabular-nums">
                        {item.predicted_demand}
                      </td>

                      {/* 3. Range Bar Track */}
                      <td className="py-3 px-4">
                        <RangeBar
                          predicted={item.predicted_demand}
                          p80Low={item.lower_estimate}
                          p80High={item.upper_estimate}
                          planned={item.planned_portions}
                        />
                      </td>

                      {/* 4. Editable Planned Portions with Tactile Steppers */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* -5 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, -5)}
                            className="px-2 py-1 text-[10px] font-mono font-semibold rounded-md border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-white/5 hover:bg-canvas-subtle text-ink-muted hover:text-ink transition-colors cursor-pointer active:scale-95"
                            title="Decrease by 5 portions"
                          >
                            -5
                          </button>

                          {/* -1 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, -1)}
                            className="w-7 h-7 text-xs font-mono font-semibold rounded-md border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-white/5 hover:bg-canvas-subtle text-ink-muted hover:text-ink transition-colors cursor-pointer active:scale-95"
                          >
                            -
                          </button>

                          {/* Direct Input */}
                          <input
                            type="number"
                            min="0"
                            value={item.planned_portions}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              onUpdatePlannedPortions(item.item_id, isNaN(val) ? 0 : Math.max(0, val));
                            }}
                            className="w-16 h-7 text-center font-mono font-bold text-sm bg-surface dark:bg-black/30 border border-ink-hairline dark:border-ink-dark-hairline rounded-md text-ink dark:text-ink-dark focus:border-racing outline-none tabular-nums"
                          />

                          {/* +1 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, 1)}
                            className="w-7 h-7 text-xs font-mono font-semibold rounded-md border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-white/5 hover:bg-canvas-subtle text-ink-muted hover:text-ink transition-colors cursor-pointer active:scale-95"
                          >
                            +
                          </button>

                          {/* +5 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, 5)}
                            className="px-2 py-1 text-[10px] font-mono font-semibold rounded-md border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-white/5 hover:bg-canvas-subtle text-ink-muted hover:text-ink transition-colors cursor-pointer active:scale-95"
                            title="Increase by 5 portions"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      {/* 5. Live Estimated Leftovers */}
                      <td className="py-3 px-3 text-right font-mono text-sm tabular-nums">
                        {item.estimated_leftovers > 0 ? (
                          <span className={item.planned_portions > item.upper_estimate ? 'text-crimson font-bold' : 'text-ochre font-semibold'}>
                            +{item.estimated_leftovers}
                          </span>
                        ) : (
                          <span className="text-ink-muted">0</span>
                        )}
                      </td>

                      {/* 6. Recommended Portions */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-serif text-base font-bold text-racing dark:text-racing-dark tabular-nums">
                          {item.recommended_portions}
                        </div>
                        {item.planned_portions !== item.recommended_portions && (
                          <button
                            onClick={() => handleApplySingle(item.item_id, item.recommended_portions)}
                            className="text-[10px] text-racing dark:text-racing-dark hover:underline font-semibold"
                          >
                            Apply
                          </button>
                        )}
                      </td>

                      {/* 7. Risk Status Badge */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            isHighRisk
                              ? 'bg-crimson/10 text-crimson border border-crimson/20'
                              : isWatch
                              ? 'bg-ochre/10 text-ochre border border-ochre/20'
                              : 'bg-racing/10 text-racing dark:text-racing-dark border border-racing/20'
                          }`}
                          title={item.risk_reason}
                        >
                          {isHighRisk && <AlertTriangle className="w-3 h-3" />}
                          {isWatch && <AlertTriangle className="w-3 h-3" />}
                          {!isHighRisk && !isWatch && <CheckCircle2 className="w-3 h-3" />}
                          <span>{item.risk_level}</span>
                        </span>
                      </td>

                      {/* 8. Audit "Why?" Button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setActiveWhyItem({ id: item.item_id, name: item.item_name })}
                          className="p-1.5 rounded-md text-ink-muted hover:text-racing hover:bg-canvas-subtle transition-colors cursor-pointer"
                          title="View waterfall feature drivers and buffer math"
                        >
                          <HelpCircle className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Why This Number Drawer */}
      <WhyDrawer
        forecastId={forecastItems[0]?.id || 'latest'}
        itemId={activeWhyItem?.id || null}
        itemName={activeWhyItem?.name || null}
        isOpen={Boolean(activeWhyItem)}
        onClose={() => setActiveWhyItem(null)}
      />

      {/* Prep Sheet Modal */}
      <PrepSheetModal
        serviceDate={serviceDate}
        servicePeriod={servicePeriod}
        isOpen={isPrepSheetOpen}
        onClose={() => setIsPrepSheetOpen(false)}
      />
    </div>
  );
};
