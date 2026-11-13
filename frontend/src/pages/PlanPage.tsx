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

  // 1. Live Summary Band Calculations (Recomputes locally with zero network calls)
  const totalPlanned = forecastItems.reduce((acc, it) => acc + (it.planned_portions || 0), 0);
  const totalPredicted = forecastItems.reduce((acc, it) => acc + (it.predicted_demand || 0), 0);
  const totalLeftovers = forecastItems.reduce((acc, it) => acc + (it.estimated_leftovers || 0), 0);
  const totalShortfall = forecastItems.reduce((acc, it) => acc + (it.estimated_shortfall || 0), 0);

  // 2. Attention Panel (Top 5 items requiring kitchen manager attention)
  const attentionItems = forecastItems
    .filter((it) => it.risk_level === 'high' || it.risk_level === 'watch' || it.history_status !== 'sufficient')
    .slice(0, 5);

  const handleApplySingle = (itemId: string, recommended: number) => {
    onUpdatePlannedPortions(itemId, recommended);
  };

  const handleAdjustStep = (itemId: string, currentPlanned: number, delta: number) => {
    const updated = Math.max(0, currentPlanned + delta);
    onUpdatePlannedPortions(itemId, updated);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. Summary Band (Section 9.5: 4 figures, no card boxes, hairline dividers) */}
      <section aria-label="Service Plan Summary" className="border-b border-ink-hairline dark:border-ink-dark-hairline pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-ink-hairline dark:divide-ink-dark-hairline">
          {/* Planned Portions */}
          <div className="pt-2 md:pt-0 md:px-4 first:pl-0">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">
              Total Planned
            </div>
            <div className="font-serif text-3xl font-bold tracking-tight text-ink dark:text-ink-dark mt-1 tabular-nums">
              {totalPlanned}
              <span className="text-xs font-sans font-normal text-ink-muted dark:text-ink-dark-muted ml-1.5">
                portions
              </span>
            </div>
            <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted mt-1 font-mono">
              Target operator prep
            </div>
          </div>

          {/* Predicted Demand */}
          <div className="pt-4 md:pt-0 md:px-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">
              Model Forecast (80%)
            </div>
            <div className="font-serif text-3xl font-bold tracking-tight text-forest dark:text-forest-dark mt-1 tabular-nums">
              {totalPredicted}
              <span className="text-xs font-sans font-normal text-ink-muted dark:text-ink-dark-muted ml-1.5">
                servings
              </span>
            </div>
            <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted mt-1 font-mono">
              Aggregated dish demand
            </div>
          </div>

          {/* Estimated Leftovers */}
          <div className="pt-4 md:pt-0 md:px-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">
              Projected Leftovers
            </div>
            <div className={`font-serif text-3xl font-bold tracking-tight mt-1 tabular-nums ${totalLeftovers > 40 ? 'text-saffron' : 'text-ink dark:text-ink-dark'}`}>
              {totalLeftovers}
              <span className="text-xs font-sans font-normal text-ink-muted dark:text-ink-dark-muted ml-1.5">
                servings
              </span>
            </div>
            <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted mt-1 font-mono flex items-center gap-1">
              {totalLeftovers > 0 ? (
                <>
                  <TrendingDown className="w-3 h-3 text-saffron" strokeWidth={1.5} />
                  <span>Planned &gt; demand buffer</span>
                </>
              ) : (
                <span>Zero waste planned</span>
              )}
            </div>
          </div>

          {/* Estimated Shortfall */}
          <div className="pt-4 md:pt-0 md:px-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">
              Projected Shortfall
            </div>
            <div className={`font-serif text-3xl font-bold tracking-tight mt-1 tabular-nums ${totalShortfall > 0 ? 'text-clay' : 'text-ink dark:text-ink-dark'}`}>
              {totalShortfall}
              <span className="text-xs font-sans font-normal text-ink-muted dark:text-ink-dark-muted ml-1.5">
                missed
              </span>
            </div>
            <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted mt-1 font-mono flex items-center gap-1">
              {totalShortfall > 0 ? (
                <>
                  <TrendingUp className="w-3 h-3 text-clay" strokeWidth={1.5} />
                  <span>Stock-out risk present</span>
                </>
              ) : (
                <span>Fully covered</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Attention Panel (Section 9.5: at most 5 items that matter, plain-language reason, one-click fix) */}
      {attentionItems.length > 0 && (
        <section aria-label="Kitchen Attention Items" className="bg-canvas dark:bg-canvas-dark border border-ink-hairline dark:border-ink-dark-hairline rounded-ticket p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-saffron" strokeWidth={1.5} />
              <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-ink dark:text-ink-dark">
                Attention Panel ({attentionItems.length} Dishes Need Review)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {canUndo && onUndoApplyAll && (
                <button
                  onClick={onUndoApplyAll}
                  className="text-xs font-medium text-ink-muted hover:text-ink flex items-center gap-1 px-2 py-1 rounded-control border border-ink-hairline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              )}
              <button
                onClick={onApplyAllRecommendations}
                className="text-xs font-semibold text-forest dark:text-forest-dark hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Apply all recommendations</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {attentionItems.map((item) => (
              <div
                key={item.item_id}
                className="p-3 bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline rounded-control text-xs flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="font-semibold text-ink dark:text-ink-dark flex items-center justify-between">
                    <span>{item.item_name}</span>
                    <span className="font-mono text-ink-muted">
                      Plan: {item.planned_portions}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted mt-1 leading-snug">
                    {item.risk_reason || item.buffer_rationale}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-ink-hairline/60">
                  <span className="text-[10px] font-mono text-forest dark:text-forest-dark font-medium">
                    Rec: {item.recommended_portions}
                  </span>
                  <button
                    onClick={() => handleApplySingle(item.item_id, item.recommended_portions)}
                    className="px-2 py-1 rounded-[3px] bg-forest text-[#F6F1E7] text-[10px] font-semibold hover:bg-forest-hover transition-colors"
                  >
                    Apply {item.recommended_portions}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Forecast Ledger (Hero Component: RangeBar in every row, live recompute, ±5 steppers) */}
      <section aria-label="Forecast Ledger" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold tracking-tight text-ink dark:text-ink-dark">
              Preparation Ledger
            </h2>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
              Live interactive planner with calibrated 80% demand range and Newsvendor buffer.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrepSheetOpen(true)}
              className="px-3 py-1.5 rounded-control border border-ink-hairline dark:border-ink-dark-hairline text-xs font-medium text-ink dark:text-ink-dark hover:bg-surface transition-colors"
            >
              Print Ticket
            </button>
            <button
              onClick={onApplyAllRecommendations}
              className="px-3 py-1.5 rounded-control bg-forest hover:bg-forest-hover text-[#F6F1E7] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Apply All Recommendations
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="border border-ink-hairline dark:border-ink-dark-hairline rounded-ticket bg-surface dark:bg-surface-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-canvas dark:bg-canvas-dark border-b border-ink-hairline dark:border-ink-dark-hairline text-ink-muted dark:text-ink-dark-muted font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Menu Dish</th>
                  <th className="py-3 px-3 text-right">Predicted</th>
                  <th className="py-3 px-4 min-w-[240px]">80% Conformal Range</th>
                  <th className="py-3 px-4 text-center min-w-[170px]">Planned Prep</th>
                  <th className="py-3 px-3 text-right">Leftovers</th>
                  <th className="py-3 px-3 text-right">Recommended</th>
                  <th className="py-3 px-3 text-center">Status</th>
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
                      className="hover:bg-canvas/50 dark:hover:bg-canvas-dark/40 transition-colors"
                    >
                      {/* 1. Dish Name & Tags */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink dark:text-ink-dark text-sm">
                          {item.item_name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-[2px] bg-canvas dark:bg-canvas-dark border border-ink-hairline dark:border-ink-dark-hairline text-ink-muted">
                            {item.category}
                          </span>
                          <span className="text-[11px] font-mono text-ink-muted">
                            ₹{item.price}
                          </span>
                          {/* History Badge */}
                          <span
                            className={`text-[9px] font-mono px-1 py-0.5 rounded-[2px] uppercase ${
                              item.history_status === 'sufficient'
                                ? 'bg-sage-tint/60 text-forest'
                                : item.history_status === 'low_history'
                                ? 'bg-saffron-tint text-saffron font-bold'
                                : 'bg-clay-tint text-clay font-bold'
                            }`}
                          >
                            {item.history_status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>

                      {/* 2. Predicted Demand */}
                      <td className="py-3 px-3 text-right font-mono text-base font-bold text-ink dark:text-ink-dark tabular-nums">
                        {item.predicted_demand}
                      </td>

                      {/* 3. Range Bar Track (Hero visual) */}
                      <td className="py-3 px-4">
                        <RangeBar
                          predicted={item.predicted_demand}
                          p80Low={item.lower_estimate}
                          p80High={item.upper_estimate}
                          planned={item.planned_portions}
                        />
                      </td>

                      {/* 4. Editable Planned Portions (Live local recompute) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* -5 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, -5)}
                            className="px-1.5 py-1 text-[10px] font-mono rounded-[3px] border border-ink-hairline dark:border-ink-dark-hairline bg-canvas hover:bg-surface text-ink-muted hover:text-ink"
                            title="Decrease by 5"
                          >
                            -5
                          </button>

                          {/* -1 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, -1)}
                            className="w-6 h-7 text-xs font-mono rounded-[3px] border border-ink-hairline dark:border-ink-dark-hairline bg-canvas hover:bg-surface text-ink-muted hover:text-ink"
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
                            className="w-16 h-7 text-center font-mono font-bold text-sm bg-canvas dark:bg-canvas-dark border border-ink-hairline dark:border-ink-dark-hairline rounded-[3px] text-ink dark:text-ink-dark focus:border-forest outline-none tabular-nums"
                          />

                          {/* +1 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, 1)}
                            className="w-6 h-7 text-xs font-mono rounded-[3px] border border-ink-hairline dark:border-ink-dark-hairline bg-canvas hover:bg-surface text-ink-muted hover:text-ink"
                          >
                            +
                          </button>

                          {/* +5 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, 5)}
                            className="px-1.5 py-1 text-[10px] font-mono rounded-[3px] border border-ink-hairline dark:border-ink-dark-hairline bg-canvas hover:bg-surface text-ink-muted hover:text-ink"
                            title="Increase by 5"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      {/* 5. Live Estimated Leftovers */}
                      <td className="py-3 px-3 text-right font-mono text-sm tabular-nums">
                        {item.estimated_leftovers > 0 ? (
                          <span className={item.planned_portions > item.upper_estimate ? 'text-clay font-bold' : 'text-saffron font-medium'}>
                            +{item.estimated_leftovers}
                          </span>
                        ) : (
                          <span className="text-ink-muted dark:text-ink-dark-muted">0</span>
                        )}
                      </td>

                      {/* 6. Recommended Portions */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono text-sm font-bold text-forest dark:text-forest-dark tabular-nums">
                          {item.recommended_portions}
                        </div>
                        {item.planned_portions !== item.recommended_portions && (
                          <button
                            onClick={() => handleApplySingle(item.item_id, item.recommended_portions)}
                            className="text-[10px] text-forest dark:text-forest-dark underline hover:no-underline font-medium"
                          >
                            Apply
                          </button>
                        )}
                      </td>

                      {/* 7. Risk Status Badge */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-semibold uppercase font-mono ${
                            isHighRisk
                              ? 'bg-clay-tint text-clay border border-clay/30'
                              : isWatch
                              ? 'bg-saffron-tint text-saffron border border-saffron/30'
                              : 'bg-sage-tint text-forest border border-forest/30'
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
                          className="p-1 rounded-control text-ink-muted hover:text-forest hover:bg-canvas transition-colors"
                          title="View waterfall drivers and buffer math"
                        >
                          <HelpCircle className="w-4 h-4" strokeWidth={1.5} />
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
