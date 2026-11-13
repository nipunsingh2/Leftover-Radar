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
  Radio,
  Zap,
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

// Category emoji helper
const getCategoryEmoji = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes('curry') || c.includes('entree') || c.includes('main')) return '🍛';
  if (c.includes('salad') || c.includes('veg')) return '🥗';
  if (c.includes('sandwich') || c.includes('toast') || c.includes('bread')) return '🥪';
  if (c.includes('breakfast') || c.includes('egg')) return '🍳';
  if (c.includes('soup') || c.includes('dal')) return '🍲';
  if (c.includes('dessert') || c.includes('sweet')) return '🍮';
  if (c.includes('beverage') || c.includes('tea') || c.includes('coffee')) return '☕';
  return '🍱';
};

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

  // 1. Live Summary Calculations
  const totalPlanned = forecastItems.reduce((acc, it) => acc + (it.planned_portions || 0), 0);
  const totalPredicted = forecastItems.reduce((acc, it) => acc + (it.predicted_demand || 0), 0);
  const totalLeftovers = forecastItems.reduce((acc, it) => acc + (it.estimated_leftovers || 0), 0);
  const totalShortfall = forecastItems.reduce((acc, it) => acc + (it.estimated_shortfall || 0), 0);

  // 2. Attention Items
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
    <div className="p-8 space-y-6 max-w-[1440px] mx-auto">
      {/* 1. Bento Grid: Quirky Kitchen Summary */}
      <section aria-label="Kitchen Summary Bento Grid">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bento Cell 1: Dominant Anchor (2-col span on LG) */}
          <div className="lg:col-span-2 quirky-card p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-surface to-canvas-subtle/50 dark:from-surface-dark dark:to-black/30">
            {/* Subtle decorative background watermarks */}
            <div className="absolute top-2 right-4 text-7xl select-none opacity-5 font-serif pointer-events-none">
              🍳
            </div>

            <div className="flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="sticker-badge bg-matcha/10 text-matcha dark:text-matcha-light border-matcha/30">
                    🟢 Kitchen Prep Payload
                  </span>
                </div>
                <div className="flex items-baseline gap-3 mt-2">
                  <span className="font-serif text-5xl font-bold text-ink dark:text-ink-dark tabular-nums tracking-tight">
                    {totalPlanned}
                  </span>
                  <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">
                    portions planned
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-ink-muted uppercase">Model Forecast</span>
                <div className="text-xl font-bold font-mono text-ink dark:text-ink-dark mt-0.5 tabular-nums">
                  {totalPredicted} <span className="text-[11px] font-normal text-ink-muted">servings</span>
                </div>
              </div>
            </div>

            {/* Visual Balance Bar */}
            <div className="mt-4 pt-3 border-t border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between text-xs relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-persimmon animate-pulse" />
                <span className="font-semibold text-ink dark:text-ink-dark">
                  Net Balance: {netDelta >= 0 ? `+${netDelta} buffer (+${netDeltaPercent}%) ✨ Ready for lunch rush` : `${netDelta} deficit (${netDeltaPercent}%) ⚠️`}
                </span>
              </div>
              <span className="text-[11px] font-mono text-ink-muted">
                {forecastItems.length} active menu items tracked
              </span>
            </div>
          </div>

          {/* Bento Cell 2: Surplus Leftover Forecast */}
          <div className="quirky-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="sticker-badge bg-yuzu/15 text-yuzu-dark dark:text-yuzu border-yuzu/40">
                Surplus Cushion 🥐
              </span>
              <TrendingDown className="w-4 h-4 text-yuzu-dark" />
            </div>

            <div className="my-2">
              <div className="font-serif text-3xl font-bold tabular-nums text-ink dark:text-ink-dark">
                {totalLeftovers}
                <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">portions</span>
              </div>
              <div className="text-[11px] text-ink-muted font-sans mt-0.5">
                Planned surplus buffer
              </div>
            </div>

            <div className="pt-2 border-t border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-muted">Est. Food Value:</span>
              <span className="font-bold text-matcha dark:text-matcha-light">≈ ₹{(totalLeftovers * 30).toLocaleString()}</span>
            </div>
          </div>

          {/* Bento Cell 3: Stockout Guard */}
          <div className="quirky-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="sticker-badge bg-persimmon/15 text-persimmon border-persimmon/40">
                Stockout Guard 🛡️
              </span>
              <TrendingUp className="w-4 h-4 text-persimmon" />
            </div>

            <div className="my-2">
              <div className={`font-serif text-3xl font-bold tabular-nums ${totalShortfall > 0 ? 'text-berry' : 'text-matcha dark:text-matcha-light'}`}>
                {totalShortfall}
                <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">missed</span>
              </div>
              <div className="text-[11px] text-ink-muted font-sans mt-0.5">
                {totalShortfall === 0 ? 'All diners fed & happy! 🎉' : 'Hungry diners warning 🚨'}
              </div>
            </div>

            <div className="pt-2 border-t border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-muted">Safety Level:</span>
              <span className={`font-bold ${totalShortfall === 0 ? 'text-matcha dark:text-matcha-light' : 'text-berry'}`}>
                {totalShortfall === 0 ? '80% Guaranteed' : 'Action Needed'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Hot List Attention Panel (Quirky Diner Sticky Note) */}
      {attentionItems.length > 0 && (
        <section aria-label="Kitchen Attention Items" className="quirky-card p-5 space-y-3 border-l-6 border-l-persimmon bg-persimmon/5 dark:bg-persimmon/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl select-none">🔥</span>
              <div>
                <h2 className="text-sm font-serif font-bold text-ink dark:text-ink-dark flex items-center gap-2">
                  <span>Chef's Hot List ({attentionItems.length} {attentionItems.length === 1 ? 'Dish Needs Review' : 'Dishes Need Review'})</span>
                </h2>
                <div className="text-[11px] text-ink-muted">
                  Dishes where planned kitchen prep deviates significantly from calibrated Newsvendor safety bounds
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canUndo && onUndoApplyAll && (
                <button
                  onClick={onUndoApplyAll}
                  className="btn-tactile px-3 py-1.5 rounded-xl border border-ink-hairline text-xs font-bold text-ink-muted hover:text-ink flex items-center gap-1.5 bg-surface dark:bg-surface-dark cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo</span>
                </button>
              )}

              <button
                onClick={onApplyAllRecommendations}
                className="btn-tactile px-4 py-1.5 rounded-xl bg-persimmon hover:bg-persimmon-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-quirky cursor-pointer"
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
                className="p-3.5 rounded-xl bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline text-xs flex flex-col justify-between space-y-2.5 shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-serif font-bold text-ink dark:text-ink-dark text-sm flex items-center gap-1.5">
                      <span>{getCategoryEmoji(item.category)}</span>
                      <span>{item.item_name}</span>
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-bold shrink-0 ${
                        item.risk_level === 'high'
                          ? 'bg-berry/15 text-berry'
                          : 'bg-yuzu/25 text-yuzu-dark'
                      }`}
                    >
                      {item.risk_level}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-ink-muted mt-1">
                    Plan: <span className="text-ink dark:text-ink-dark font-bold">{item.planned_portions}</span> • Rec: <span className="text-matcha dark:text-matcha-light font-bold">{item.recommended_portions}</span>
                  </div>
                  <p className="text-[11px] text-ink-muted leading-tight mt-1.5">
                    {item.risk_reason || item.buffer_rationale}
                  </p>
                </div>

                <div className="pt-2 border-t border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between">
                  <span className="text-[10px] font-mono text-ink-muted">
                    Buffer: +{item.recommended_portions - item.predicted_demand}
                  </span>
                  <button
                    onClick={() => handleApplySingle(item.item_id, item.recommended_portions)}
                    className="btn-tactile px-3 py-1 rounded-xl bg-matcha hover:bg-matcha-hover text-white text-[11px] font-bold cursor-pointer"
                  >
                    Bump to {item.recommended_portions} 🚀
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Daily Preparation Ledger (The Kitchen Forecaster Table) */}
      <section aria-label="Preparation Ledger" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink dark:text-ink-dark flex items-center gap-2">
              <span>Daily Preparation Ledger</span>
              <span className="text-xs font-mono font-normal text-ink-muted bg-canvas-subtle px-2 py-0.5 rounded-full">
                29 Dishes Active
              </span>
            </h2>
            <p className="text-xs text-ink-muted">
              Adjust portions with muscle memory. Real-time local recalculation with zero network latency.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrepSheetOpen(true)}
              className="btn-tactile flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-surface-dark hover:bg-canvas-subtle text-xs font-bold text-ink dark:text-ink-dark cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-persimmon" />
              <span>Print Sheet</span>
            </button>
            <button
              onClick={onApplyAllRecommendations}
              className="btn-tactile px-4 py-1.5 rounded-xl bg-matcha hover:bg-matcha-hover text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Apply All Recommendations ✨
            </button>
          </div>
        </div>

        {/* Ledger Table inside Quirky Card */}
        <div className="quirky-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-canvas-subtle/80 dark:bg-white/5 border-b border-ink-hairline dark:border-ink-dark-hairline text-ink-muted text-[10px] font-mono font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Menu Dish</th>
                  <th className="py-3 px-3 text-right">Forecast (ŷ)</th>
                  <th className="py-3 px-4 min-w-[220px]">80% Conformal Range</th>
                  <th className="py-3 px-4 text-center min-w-[195px]">Planned Prep</th>
                  <th className="py-3 px-3 text-right">Est. Leftover</th>
                  <th className="py-3 px-3 text-right">Recommended</th>
                  <th className="py-3 px-3 text-center">Safety Status</th>
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
                      className="hover:bg-canvas-subtle/60 dark:hover:bg-white/5 transition-colors"
                    >
                      {/* 1. Dish Name & Tags */}
                      <td className="py-3 px-4">
                        <div className="font-serif font-bold text-ink dark:text-ink-dark text-base flex items-center gap-2">
                          <span className="text-base select-none">{getCategoryEmoji(item.category)}</span>
                          <span>{item.item_name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-canvas-subtle dark:bg-white/5 border border-ink-hairline text-ink-muted">
                            {item.category}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-ink-muted">
                            ₹{item.price}
                          </span>
                          {/* History Status Badge */}
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                              item.history_status === 'sufficient'
                                ? 'bg-matcha/10 text-matcha dark:text-matcha-light'
                                : item.history_status === 'low_history'
                                ? 'bg-yuzu/20 text-yuzu-dark font-bold'
                                : 'bg-berry/15 text-berry font-bold'
                            }`}
                          >
                            {item.history_status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>

                      {/* 2. Predicted Demand */}
                      <td className="py-3 px-3 text-right font-serif text-xl font-bold text-ink dark:text-ink-dark tabular-nums">
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

                      {/* 4. Editable Planned Portions with Tactile Retro Steppers */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* -5 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, -5)}
                            className="btn-tactile px-2 py-1 text-[10px] font-mono font-bold rounded-lg border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-white/5 hover:bg-canvas-subtle text-ink-muted hover:text-ink cursor-pointer"
                            title="Decrease by 5 portions"
                          >
                            -5
                          </button>

                          {/* -1 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, -1)}
                            className="btn-tactile w-7 h-7 text-xs font-mono font-bold rounded-lg border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-white/5 hover:bg-canvas-subtle text-ink-muted hover:text-ink cursor-pointer"
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
                            className="w-16 h-7 text-center font-mono font-bold text-sm bg-surface dark:bg-black/30 border-2 border-ink-hairline dark:border-ink-dark-hairline rounded-lg text-ink dark:text-ink-dark focus:border-persimmon outline-none tabular-nums shadow-inner"
                          />

                          {/* +1 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, 1)}
                            className="btn-tactile w-7 h-7 text-xs font-mono font-bold rounded-lg border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-white/5 hover:bg-canvas-subtle text-ink-muted hover:text-ink cursor-pointer"
                          >
                            +
                          </button>

                          {/* +5 Button */}
                          <button
                            onClick={() => handleAdjustStep(item.item_id, item.planned_portions, 5)}
                            className="btn-tactile px-2 py-1 text-[10px] font-mono font-bold rounded-lg border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-white/5 hover:bg-canvas-subtle text-ink-muted hover:text-ink cursor-pointer"
                            title="Increase by 5 portions"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      {/* 5. Live Estimated Leftovers */}
                      <td className="py-3.5 px-3 text-right font-mono text-sm tabular-nums">
                        {item.estimated_leftovers > 0 ? (
                          <span className={item.planned_portions > item.upper_estimate ? 'text-berry font-bold' : 'text-yuzu-dark font-bold'}>
                            +{item.estimated_leftovers}
                          </span>
                        ) : (
                          <span className="text-ink-muted font-mono">0</span>
                        )}
                      </td>

                      {/* 6. Recommended Portions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-serif text-lg font-bold text-matcha dark:text-matcha-light tabular-nums">
                          {item.recommended_portions}
                        </div>
                        {item.planned_portions !== item.recommended_portions && (
                          <button
                            onClick={() => handleApplySingle(item.item_id, item.recommended_portions)}
                            className="text-[10px] text-matcha dark:text-matcha-light hover:underline font-bold"
                          >
                            Apply
                          </button>
                        )}
                      </td>

                      {/* 7. Safety Status Badge */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isHighRisk
                              ? 'bg-berry/15 text-berry border border-berry/30'
                              : isWatch
                              ? 'bg-yuzu/20 text-yuzu-dark border border-yuzu/40'
                              : 'bg-matcha/15 text-matcha dark:text-matcha-light border border-matcha/30'
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
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => setActiveWhyItem({ id: item.item_id, name: item.item_name })}
                          className="btn-tactile inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-bold text-ink-muted hover:text-persimmon hover:bg-persimmon/10 transition-colors cursor-pointer"
                          title="View waterfall feature drivers and buffer math"
                        >
                          <HelpCircle className="w-3.5 h-3.5" strokeWidth={2} />
                          <span>Why?</span>
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
