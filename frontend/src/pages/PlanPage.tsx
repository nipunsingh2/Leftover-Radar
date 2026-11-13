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
  ShieldAlert,
  Printer,
  Compass,
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

  // 2. Attention Panel (Top items requiring kitchen manager attention)
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

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. Bento Grid: Executive Service Metrics */}
      <section aria-label="Service Plan Summary Bento Grid">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Bento Cell 1: Total Planned Prep (Hero 2-col span on medium screens) */}
          <div className="glass-card glass-card-hover p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="victorian-badge text-[10px] text-forest dark:text-gold font-bold">
                Target Operator Prep
              </span>
              <span className="victorian-badge text-[9px] px-2 py-0.5 rounded-full bg-forest/10 dark:bg-gold/10 text-forest dark:text-gold font-semibold">
                Live State
              </span>
            </div>

            <div className="my-4">
              <div className="victorian-heading text-4xl lg:text-5xl font-bold text-forest dark:text-gold tabular-nums tracking-tight">
                {totalPlanned}
                <span className="text-sm font-sans font-normal text-ink-muted dark:text-ink-dark-muted ml-2">
                  portions
                </span>
              </div>
              <div className="text-xs font-mono text-ink-muted dark:text-ink-dark-muted mt-1">
                Sum of kitchen planned preparation
              </div>
            </div>

            <div className="pt-3 border-t border-gold/15 dark:border-white/10 flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-muted">Expected Demand:</span>
              <span className="font-semibold text-ink dark:text-ink-dark">{totalPredicted} portions</span>
            </div>
          </div>

          {/* Bento Cell 2: Forecast Demand & 80% Coverage */}
          <div className="glass-card glass-card-hover p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="victorian-badge text-[10px] text-forest dark:text-gold font-bold">
                Model Demand Forecast
              </span>
              <span className="victorian-badge text-[9px] px-2 py-0.5 rounded-full bg-sage/15 text-forest dark:text-gold font-semibold">
                80% Conformal
              </span>
            </div>

            <div className="my-4">
              <div className="victorian-heading text-4xl lg:text-5xl font-bold text-forest dark:text-gold tabular-nums tracking-tight">
                {totalPredicted}
                <span className="text-sm font-sans font-normal text-ink-muted dark:text-ink-dark-muted ml-2">
                  servings
                </span>
              </div>
              <div className="text-xs font-mono text-ink-muted dark:text-ink-dark-muted mt-1">
                Ridge log1p point aggregation
              </div>
            </div>

            <div className="pt-3 border-t border-gold/15 dark:border-white/10 flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-muted">Net Prep Delta:</span>
              <span className={`font-semibold ${totalPlanned >= totalPredicted ? 'text-forest dark:text-gold' : 'text-clay'}`}>
                {totalPlanned - totalPredicted >= 0 ? `+${totalPlanned - totalPredicted} buffer` : `${totalPlanned - totalPredicted} deficit`}
              </span>
            </div>
          </div>

          {/* Bento Cell 3: Projected Leftovers (Waste Buffer) */}
          <div className="glass-card glass-card-hover p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="victorian-badge text-[10px] text-saffron font-bold">
                Projected Leftovers
              </span>
              <TrendingDown className="w-4 h-4 text-saffron" />
            </div>

            <div className="my-4">
              <div className={`victorian-heading text-4xl lg:text-5xl font-bold tabular-nums tracking-tight ${totalLeftovers > 50 ? 'text-saffron' : 'text-ink dark:text-ink-dark'}`}>
                {totalLeftovers}
                <span className="text-sm font-sans font-normal text-ink-muted dark:text-ink-dark-muted ml-2">
                  portions
                </span>
              </div>
              <div className="text-xs font-mono text-ink-muted dark:text-ink-dark-muted mt-1">
                Planned in excess of demand
              </div>
            </div>

            <div className="pt-3 border-t border-gold/15 dark:border-white/10 flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-muted">Est. Food Value:</span>
              <span className="font-semibold text-saffron">≈ ₹{(totalLeftovers * 35).toLocaleString()}</span>
            </div>
          </div>

          {/* Bento Cell 4: Projected Shortfall (Stockout Risk) */}
          <div className="glass-card glass-card-hover p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="victorian-badge text-[10px] text-clay font-bold">
                Projected Shortfall
              </span>
              <TrendingUp className="w-4 h-4 text-clay" />
            </div>

            <div className="my-4">
              <div className={`victorian-heading text-4xl lg:text-5xl font-bold tabular-nums tracking-tight ${totalShortfall > 0 ? 'text-clay' : 'text-forest dark:text-gold'}`}>
                {totalShortfall}
                <span className="text-sm font-sans font-normal text-ink-muted dark:text-ink-dark-muted ml-2">
                  missed
                </span>
              </div>
              <div className="text-xs font-mono text-ink-muted dark:text-ink-dark-muted mt-1">
                {totalShortfall === 0 ? 'Zero unserved guests expected' : 'Potential diner stockout'}
              </div>
            </div>

            <div className="pt-3 border-t border-gold/15 dark:border-white/10 flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-muted">Diner Coverage:</span>
              <span className={`font-semibold ${totalShortfall === 0 ? 'text-forest dark:text-gold' : 'text-clay'}`}>
                {totalShortfall === 0 ? '100% Satisfied' : 'Risk Present'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Attention Bento Panel */}
      {attentionItems.length > 0 && (
        <section aria-label="Kitchen Attention Items" className="glass-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-saffron/15 text-saffron flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="victorian-heading text-lg font-bold text-forest dark:text-gold">
                  Chef Attention Panel ({attentionItems.length} Dishes Need Review)
                </h2>
                <div className="text-[11px] font-mono text-ink-muted dark:text-ink-dark-muted">
                  Dishes with high stockout variance or out-of-band preparation plans
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {canUndo && onUndoApplyAll && (
                <button
                  onClick={onUndoApplyAll}
                  className="px-3 py-1.5 rounded-xl border border-gold/30 text-xs font-semibold text-ink-muted hover:text-ink flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo</span>
                </button>
              )}

              <button
                onClick={onApplyAllRecommendations}
                className="shimmer-hover px-4 py-2 rounded-xl bg-forest hover:bg-forest-hover text-gold-50 dark:bg-gold dark:text-black text-xs font-semibold shadow-md flex items-center gap-2 transition-all duration-200 cursor-pointer"
              >
                <span>Apply All Recommendations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {attentionItems.map((item) => (
              <div
                key={item.item_id}
                className="p-4 rounded-xl bg-canvas/70 dark:bg-white/5 border border-gold/25 dark:border-white/10 text-xs flex flex-col justify-between space-y-3 hover:border-gold/45 transition-all duration-200 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between font-serif">
                    <span className="font-bold text-sm text-ink dark:text-ink-dark">{item.item_name}</span>
                    <span className="victorian-badge text-[9px] px-1.5 py-0.5 rounded bg-clay/10 text-clay font-bold">
                      {item.risk_level}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-ink-muted mt-0.5">
                    Planned: {item.planned_portions} · Rec: {item.recommended_portions}
                  </div>
                  <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted mt-2 leading-snug">
                    {item.risk_reason || item.buffer_rationale}
                  </p>
                </div>

                <div className="pt-2 border-t border-gold/15 dark:border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-forest dark:text-gold font-bold">
                    Buffer: +{item.recommended_portions - item.predicted_demand}
                  </span>
                  <button
                    onClick={() => handleApplySingle(item.item_id, item.recommended_portions)}
                    className="px-2.5 py-1 rounded-lg bg-forest hover:bg-forest-hover text-gold-50 dark:bg-gold dark:text-black text-[10px] font-semibold transition-all duration-150 cursor-pointer shadow-xs"
                  >
                    Apply {item.recommended_portions}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Preparation Ledger (Hero Component with RangeBars and Steppers) */}
      <section aria-label="Forecast Ledger" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="victorian-heading text-2xl font-bold text-forest dark:text-gold">
              Preparation Ledger
            </h2>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
              Live interactive planner with calibrated 80% conformal demand intervals and Newsvendor buffer optimization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPrepSheetOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gold/30 dark:border-white/15 bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-xs font-semibold text-forest dark:text-gold shadow-xs transition-all duration-200 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>
            <button
              onClick={onApplyAllRecommendations}
              className="shimmer-hover px-4 py-2 rounded-xl bg-forest hover:bg-forest-hover text-gold-50 dark:bg-gold dark:text-black text-xs font-semibold shadow-md transition-all duration-200 cursor-pointer"
            >
              Apply All Recommendations
            </button>
          </div>
        </div>

        {/* Ledger Table inside Glass Card */}
        <div className="glass-card shadow-glass dark:shadow-glass-dark">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-canvas-subtle/80 dark:bg-white/5 border-b border-gold/20 dark:border-white/10 text-ink-muted dark:text-ink-dark-muted victorian-badge text-[10px]">
                <tr>
                  <th className="py-4 px-5">Menu Dish</th>
                  <th className="py-4 px-3 text-right">Predicted</th>
                  <th className="py-4 px-5 min-w-[260px]">80% Conformal Range</th>
                  <th className="py-4 px-5 text-center min-w-[190px]">Target Planned Prep</th>
                  <th className="py-4 px-3 text-right">Est. Leftover</th>
                  <th className="py-4 px-3 text-right">Recommended</th>
                  <th className="py-4 px-3 text-center">Status</th>
                  <th className="py-4 px-3 text-center">Audit</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gold/15 dark:divide-white/10">
                {forecastItems.map((item) => {
                  const isHighRisk = item.risk_level === 'high';
                  const isWatch = item.risk_level === 'watch';

                  return (
                    <tr
                      key={item.item_id}
                      className="hover:bg-gold/5 dark:hover:bg-white/5 transition-colors duration-150 group"
                    >
                      {/* 1. Dish Name & Tags */}
                      <td className="py-4 px-5">
                        <div className="font-serif font-bold text-ink dark:text-ink-dark text-base">
                          {item.item_name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="victorian-badge text-[9px] px-2 py-0.5 rounded-full bg-canvas dark:bg-white/5 border border-gold/25 dark:border-white/10 text-ink-muted font-medium">
                            {item.category}
                          </span>
                          <span className="text-[11px] font-mono text-ink-muted">
                            ₹{item.price}
                          </span>
                          {/* History Badge */}
                          <span
                            className={`victorian-badge text-[8px] px-2 py-0.5 rounded-full font-bold ${
                              item.history_status === 'sufficient'
                                ? 'bg-forest/10 text-forest dark:text-forest-dark'
                                : item.history_status === 'low_history'
                                ? 'bg-saffron/15 text-saffron'
                                : 'bg-clay/15 text-clay'
                            }`}
                          >
                            {item.history_status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>

                      {/* 2. Predicted Demand */}
                      <td className="py-4 px-3 text-right font-serif text-xl font-bold text-forest dark:text-gold tabular-nums">
                        {item.predicted_demand}
                      </td>

                      {/* 3. Range Bar Track (Hero visual) */}
                      <td className="py-4 px-5">
                        <RangeBar
                          predicted={item.predicted_demand}
                          p80Low={item.lower_estimate}
                          p80High={item.upper_estimate}
                          planned={item.planned_portions}
                        />
                      </td>

                      {/* 4. Editable Planned Portions (Live local recompute) */}
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* -5 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, -5)}
                            className="px-2 py-1 text-[10px] font-mono font-semibold rounded-lg border border-gold/25 dark:border-white/10 bg-canvas dark:bg-white/5 hover:bg-gold/15 dark:hover:bg-white/15 text-ink-muted hover:text-ink transition-colors cursor-pointer"
                            title="Decrease by 5"
                          >
                            -5
                          </button>

                          {/* -1 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, -1)}
                            className="w-7 h-8 text-xs font-mono font-semibold rounded-lg border border-gold/25 dark:border-white/10 bg-canvas dark:bg-white/5 hover:bg-gold/15 dark:hover:bg-white/15 text-ink-muted hover:text-ink transition-colors cursor-pointer"
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
                            className="w-18 h-8 text-center font-mono font-bold text-sm bg-canvas/90 dark:bg-black/40 border border-gold/30 dark:border-white/15 rounded-lg text-ink dark:text-ink-dark focus:border-gold outline-none tabular-nums shadow-inner transition-colors"
                          />

                          {/* +1 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, 1)}
                            className="w-7 h-8 text-xs font-mono font-semibold rounded-lg border border-gold/25 dark:border-white/10 bg-canvas dark:bg-white/5 hover:bg-gold/15 dark:hover:bg-white/15 text-ink-muted hover:text-ink transition-colors cursor-pointer"
                          >
                            +
                          </button>

                          {/* +5 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, 5)}
                            className="px-2 py-1 text-[10px] font-mono font-semibold rounded-lg border border-gold/25 dark:border-white/10 bg-canvas dark:bg-white/5 hover:bg-gold/15 dark:hover:bg-white/15 text-ink-muted hover:text-ink transition-colors cursor-pointer"
                            title="Increase by 5"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      {/* 5. Live Estimated Leftovers */}
                      <td className="py-4 px-3 text-right font-mono text-sm tabular-nums">
                        {item.estimated_leftovers > 0 ? (
                          <span className={item.planned_portions > item.upper_estimate ? 'text-clay font-bold' : 'text-saffron font-semibold'}>
                            +{item.estimated_leftovers}
                          </span>
                        ) : (
                          <span className="text-ink-muted dark:text-ink-dark-muted">0</span>
                        )}
                      </td>

                      {/* 6. Recommended Portions */}
                      <td className="py-4 px-3 text-right">
                        <div className="font-serif text-lg font-bold text-forest dark:text-gold tabular-nums">
                          {item.recommended_portions}
                        </div>
                        {item.planned_portions !== item.recommended_portions && (
                          <button
                            onClick={() => handleApplySingle(item.item_id, item.recommended_portions)}
                            className="text-[10px] victorian-badge text-forest dark:text-gold hover:underline font-bold"
                          >
                            Apply
                          </button>
                        )}
                      </td>

                      {/* 7. Risk Status Badge */}
                      <td className="py-4 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] victorian-badge font-bold ${
                            isHighRisk
                              ? 'bg-clay/15 text-clay border border-clay/30'
                              : isWatch
                              ? 'bg-saffron/15 text-saffron border border-saffron/30'
                              : 'bg-forest/10 text-forest dark:text-forest-dark border border-forest/30'
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
                      <td className="py-4 px-3 text-center">
                        <button
                          onClick={() => setActiveWhyItem({ id: item.item_id, name: item.item_name })}
                          className="p-1.5 rounded-lg text-ink-muted hover:text-gold hover:bg-gold/10 transition-colors cursor-pointer"
                          title="View waterfall drivers and buffer math"
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
