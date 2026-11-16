import React, { useState, useMemo, useEffect } from 'react';
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
  UtensilsCrossed,
  Search,
  Sliders,
  ShoppingBag,
  Download,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  Flame,
  Check,
  X,
  Award,
  ClipboardCheck,
  Leaf,
  Globe,
} from 'lucide-react';
import { ForecastItemResult } from '../api/client';
import { RangeBar } from '../components/RangeBar';
import { WhyDrawer } from '../components/WhyDrawer';
import { PrepSheetModal } from '../components/PrepSheetModal';
import { WhatIfSimulator, SimulationParams } from '../components/WhatIfSimulator';
import { IngredientBOMModal } from '../components/IngredientBOMModal';
import { WeeklyOutlookModal } from '../components/WeeklyOutlookModal';
import { BenchmarkComparisonModal } from '../components/BenchmarkComparisonModal';
import { ShiftCloseOutModal } from '../components/ShiftCloseOutModal';
import { SustainabilityCard } from '../components/SustainabilityCard';
import { exportPreparationLedgerCsv } from '../utils/exportCsv';
import { saveDraftPortions, loadDraftPortions, clearDraftPortions } from '../utils/localStorageCache';

interface PlanPageProps {
  serviceDate: string;
  servicePeriod: 'breakfast' | 'lunch' | 'dinner';
  forecastItems: ForecastItemResult[];
  onUpdatePlannedPortions: (itemId: string, newPlanned: number) => void;
  onApplyAllRecommendations: () => void;
  onApplyPreset?: (mode: 'conservative' | 'balanced' | 'zero_stockout') => void;
  onUndoApplyAll?: () => void;
  canUndo?: boolean;
  onOpenAllDayMenu?: () => void;
  onSimulateScenario?: (params: SimulationParams) => void;
  onResetSimulation?: () => void;
  isSimulating?: boolean;
  currentWeather?: string;
  isCampusEvent?: boolean;
  isExamWeek?: boolean;
  isHoliday?: boolean;
  onSelectDate?: (date: string) => void;
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

// Dietary & Allergen tag helper
const getDietaryBadges = (name: string, category: string) => {
  const n = name.toLowerCase();
  const badges: Array<{ label: string; class: string }> = [];

  const isNonVeg = n.includes('chicken') || n.includes('mutton') || n.includes('fish') || n.includes('egg');
  if (isNonVeg) {
    badges.push({ label: '🍗 Non-Veg', class: 'bg-persimmon/10 text-persimmon border-persimmon/20' });
  } else {
    badges.push({ label: '🌱 Veg', class: 'bg-matcha/10 text-matcha dark:text-matcha-light border-matcha/20' });
  }

  if (n.includes('paneer') || n.includes('butter') || n.includes('curd') || n.includes('kheer') || n.includes('cheese') || n.includes('tea') || n.includes('coffee')) {
    badges.push({ label: '🥛 Dairy', class: 'bg-canvas-subtle text-ink-muted border-ink-hairline' });
  }

  if (n.includes('roti') || n.includes('naan') || n.includes('paratha') || n.includes('toast') || n.includes('sandwich') || n.includes('bread') || n.includes('pasta')) {
    badges.push({ label: '🌾 Gluten', class: 'bg-yuzu/15 text-yuzu-dark border-yuzu/30' });
  } else if (n.includes('rice') || n.includes('dal') || n.includes('salad') || n.includes('curry')) {
    badges.push({ label: '🌾 GF', class: 'bg-matcha/5 text-matcha-dark dark:text-matcha-light border-matcha/20' });
  }

  return badges;
};

// Volumetric risk spread badge helper
const getVolatilityBadge = (lower: number, upper: number) => {
  const spread = upper - lower;
  if (spread >= 35) {
    return (
      <span className="sticker-badge bg-yuzu/20 text-yuzu-dark border-yuzu/40 font-mono text-[9px]" title="Wide conformal interval: High sensitivity to weather or event shifts">
        High Volatility
      </span>
    );
  }
  if (spread <= 18) {
    return (
      <span className="sticker-badge bg-matcha/15 text-matcha-dark dark:text-matcha-light border-matcha/30 font-mono text-[9px]" title="Tight conformal interval: Stable staple demand">
        Stable Staple
      </span>
    );
  }
  return null;
};

export const PlanPage: React.FC<PlanPageProps> = ({
  serviceDate,
  servicePeriod,
  forecastItems,
  onUpdatePlannedPortions,
  onApplyAllRecommendations,
  onApplyPreset,
  onUndoApplyAll,
  canUndo = false,
  onOpenAllDayMenu,
  onSimulateScenario,
  onResetSimulation,
  isSimulating = false,
  currentWeather = 'clear',
  isCampusEvent = false,
  isExamWeek = false,
  isHoliday = false,
  onSelectDate,
}) => {
  // Why Drawer state
  const [activeWhyItem, setActiveWhyItem] = useState<{ id: string; name: string } | null>(null);
  const [isPrepSheetOpen, setIsPrepSheetOpen] = useState<boolean>(false);
  const [isBOMModalOpen, setIsBOMModalOpen] = useState<boolean>(false);
  const [isWeeklyOutlookOpen, setIsWeeklyOutlookOpen] = useState<boolean>(false);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState<boolean>(false);
  const [isCloseOutModalOpen, setIsCloseOutModalOpen] = useState<boolean>(false);
  const [isSimulatorExpanded, setIsSimulatorExpanded] = useState<boolean>(false);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'demand_desc' | 'risk' | 'price' | 'name'>('default');
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(false);

  // Filter dishes strictly appropriate for the active service period
  const activePeriodItems = useMemo(() => {
    const breakfastOnly = new Set([
      'masala_dosa',
      'idli_sambar',
      'poha',
      'aloo_paratha',
      'avocado_toast',
      'avocado_sourdough',
    ]);
    return forecastItems.filter((item) => {
      const cat = (item.category || '').toLowerCase();
      const iid = (item.item_id || '').toLowerCase();
      const isBreakfastOnly = cat === 'breakfast' || breakfastOnly.has(iid);
      if (servicePeriod === 'breakfast') {
        return isBreakfastOnly || cat === 'beverage' || cat === 'snack';
      }
      if (servicePeriod === 'lunch' || servicePeriod === 'dinner') {
        return !isBreakfastOnly;
      }
      return true;
    });
  }, [forecastItems, servicePeriod]);

  // Check for auto-saved draft on mount
  useEffect(() => {
    const draft = loadDraftPortions(serviceDate, servicePeriod);
    if (draft && Object.keys(draft).length > 0) {
      setHasRestoredDraft(true);
    } else {
      setHasRestoredDraft(false);
    }
  }, [serviceDate, servicePeriod]);

  // 1. Live Summary Calculations
  const totalPlanned = activePeriodItems.reduce((acc, it) => acc + (it.planned_portions || 0), 0);
  const totalPredicted = activePeriodItems.reduce((acc, it) => acc + (it.predicted_demand || 0), 0);
  const totalLeftovers = activePeriodItems.reduce((acc, it) => acc + (it.estimated_leftovers || 0), 0);
  const totalShortfall = activePeriodItems.reduce((acc, it) => acc + (it.estimated_shortfall || 0), 0);

  // 2. Attention Items
  const attentionItems = activePeriodItems
    .filter((it) => it.risk_level === 'high' || it.risk_level === 'watch' || it.history_status !== 'sufficient')
    .slice(0, 4);

  const handleApplySingle = (itemId: string, recommended: number) => {
    onUpdatePlannedPortions(itemId, recommended);
  };

  const handleAdjustStep = (itemId: string, currentPlanned: number, delta: number) => {
    const updated = Math.max(0, currentPlanned + delta);
    onUpdatePlannedPortions(itemId, updated);
  };

  const handleClearDraft = () => {
    clearDraftPortions(serviceDate, servicePeriod);
    setHasRestoredDraft(false);
    onApplyAllRecommendations();
  };

  // 3. Filtered & Sorted Items for Table Display
  const displayedItems = useMemo(() => {
    let result = [...activePeriodItems];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (it) =>
          it.item_name.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          it.item_id.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((it) => {
        const cat = (it.category || '').toLowerCase();
        if (categoryFilter === 'mains') return cat === 'main';
        if (categoryFilter === 'breakfast') return cat === 'breakfast';
        if (categoryFilter === 'snacks') return cat === 'snack';
        if (categoryFilter === 'beverages') return cat === 'beverage';
        if (categoryFilter === 'desserts') return cat === 'dessert';
        return true;
      });
    }

    // Sorting
    if (sortBy === 'demand_desc') {
      result.sort((a, b) => b.predicted_demand - a.predicted_demand);
    } else if (sortBy === 'risk') {
      const riskWeight = { high: 3, watch: 2, low: 1 };
      result.sort((a, b) => (riskWeight[b.risk_level] || 0) - (riskWeight[a.risk_level] || 0));
    } else if (sortBy === 'price') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.item_name.localeCompare(b.item_name));
    }

    return result;
  }, [activePeriodItems, searchQuery, categoryFilter, sortBy]);

  const netDelta = totalPlanned - totalPredicted;
  const netDeltaPercent = totalPredicted > 0 ? ((netDelta / totalPredicted) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-8 space-y-6 max-w-[1440px] mx-auto">
      {/* 1. Bento Grid: Glassmorphism Kitchen Summary with Interactive Raise & Outline */}
      <section aria-label="Kitchen Summary Bento Grid">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bento Cell 1: Preparation Volume */}
          <div className="bento-glass-card p-5 flex flex-col justify-between cursor-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="sticker-badge bg-matcha/10 text-matcha dark:text-matcha-light border-matcha/30">
                  Kitchen Prep
                </span>
                {hasRestoredDraft && (
                  <span className="sticker-badge bg-yuzu/15 text-yuzu-dark border-yuzu/30 font-mono text-[9px]">
                    Draft
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-right">
                <span className="text-[10px] font-mono text-ink-muted uppercase">Forecast:</span>
                <span className="text-xs font-bold font-mono text-ink dark:text-ink-dark tabular-nums">
                  {totalPredicted}
                </span>
              </div>
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-3xl font-bold text-ink dark:text-ink-dark tabular-nums tracking-tight">
                  {totalPlanned}
                </span>
                <span className="text-xs font-sans font-normal text-ink-muted">
                  portions
                </span>
              </div>
              <div className="text-[11px] font-sans mt-0.5 font-semibold text-ink dark:text-ink-dark truncate">
                {netDelta >= 0
                  ? `+${netDelta} buffer (+${netDeltaPercent}%)`
                  : `${netDelta} deficit (${netDeltaPercent}%)`}
              </div>
            </div>

            <div className="pt-2 border-t border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-muted">Active Dishes:</span>
              <span className="font-bold text-ink dark:text-ink-dark">
                {activePeriodItems.length} dishes
              </span>
            </div>
          </div>

          {/* Bento Cell 2: Surplus Leftover Forecast */}
          <div className="bento-glass-card p-5 flex flex-col justify-between cursor-default">
            <div className="flex items-center justify-between">
              <span className="sticker-badge bg-yuzu/15 text-yuzu-dark dark:text-yuzu border-yuzu/40">
                Surplus Cushion
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
              <span className="font-bold text-matcha dark:text-matcha-light">
                ≈ ₹{(totalLeftovers * 30).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Bento Cell 3: Stockout Guard */}
          <div className="bento-glass-card p-5 flex flex-col justify-between cursor-default">
            <div className="flex items-center justify-between">
              <span className="sticker-badge bg-persimmon/15 text-persimmon border-persimmon/40">
                Stockout Guard
              </span>
              <TrendingUp className="w-4 h-4 text-persimmon" />
            </div>

            <div className="my-2">
              <div
                className={`font-serif text-3xl font-bold tabular-nums ${
                  totalShortfall > 0 ? 'text-berry' : 'text-matcha dark:text-matcha-light'
                }`}
              >
                {totalShortfall}
                <span className="text-xs font-sans font-normal text-ink-muted ml-1.5">missed</span>
              </div>
              <div className="text-[11px] text-ink-muted font-sans mt-0.5">
                {totalShortfall === 0 ? 'All expected diners covered' : 'Diner shortfall warning'}
              </div>
            </div>

            <div className="pt-2 border-t border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-muted">Safety Level:</span>
              <span
                className={`font-bold ${
                  totalShortfall === 0 ? 'text-matcha dark:text-matcha-light' : 'text-berry'
                }`}
              >
                {totalShortfall === 0 ? '95% Guaranteed' : 'Action Needed'}
              </span>
            </div>
          </div>

          {/* Bento Cell 4: UN SDG 12.3 Sustainability Card */}
          <SustainabilityCard plannedSurplusCount={totalLeftovers} />
        </div>
      </section>

      {/* 2. Interactive What-If Scenario Simulator Drawer / Banner */}
      {onSimulateScenario && (
        <section aria-label="What-If Scenario Simulator">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsSimulatorExpanded(!isSimulatorExpanded)}
                className="btn-tactile flex items-center gap-2 px-3 py-1 rounded-xl border border-persimmon/30 bg-persimmon/10 hover:bg-persimmon/20 text-xs font-bold text-persimmon cursor-pointer transition-all"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isSimulatorExpanded ? 'Hide Scenario Simulator' : 'Simulate Weather & Event Scenarios'}</span>
              </button>

              {hasRestoredDraft && (
                <button
                  onClick={handleClearDraft}
                  className="text-[11px] font-mono text-ink-muted hover:text-berry flex items-center gap-1 cursor-pointer"
                  title="Discard local drafts and revert to model baseline"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Local Draft</span>
                </button>
              )}
            </div>

            {isSimulatorExpanded && (
              <WhatIfSimulator
                currentWeather={currentWeather}
                isCampusEvent={isCampusEvent}
                isExamWeek={isExamWeek}
                isHoliday={isHoliday}
                onApplySimulation={onSimulateScenario}
                onResetSimulation={onResetSimulation || (() => {})}
                isSimulating={isSimulating}
              />
            )}
          </div>
        </section>
      )}

      {/* 3. Hot List Attention Panel */}
      {attentionItems.length > 0 && (
        <section
          aria-label="Kitchen Attention Items"
          className="bento-glass-card p-4 space-y-2.5 border-l-4 border-l-persimmon bg-persimmon/5 dark:bg-persimmon/10"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-persimmon animate-pulse" />
              <h2 className="text-xs font-serif font-bold text-ink dark:text-ink-dark flex items-center gap-1.5">
                <span>Attention Required:</span>
                <span className="font-mono text-persimmon font-bold">
                  {attentionItems.length} Dishes Outside Safety Bounds
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {canUndo && onUndoApplyAll && (
                <button
                  onClick={onUndoApplyAll}
                  className="btn-tactile px-2.5 py-1 rounded-full border border-ink-hairline text-[11px] font-bold text-ink-muted hover:text-ink flex items-center gap-1 bg-surface dark:bg-surface-dark cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              )}

              <button
                onClick={onApplyAllRecommendations}
                className="btn-tactile px-3.5 py-1 rounded-full bg-persimmon hover:bg-persimmon-hover text-white text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <span>Apply All Recommendations</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {attentionItems.map((item) => (
              <div
                key={item.item_id}
                className="p-3 rounded-xl bg-surface/90 dark:bg-surface-dark/90 border border-ink-hairline dark:border-ink-dark-hairline text-xs flex items-center justify-between gap-2 shadow-xs hover:border-persimmon/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-serif font-bold text-ink dark:text-ink-dark text-xs truncate flex items-center gap-1">
                    <span>{getCategoryEmoji(item.category)}</span>
                    <span className="truncate">{item.item_name}</span>
                  </div>
                  <div className="text-[11px] font-mono text-ink-muted mt-0.5">
                    Plan{' '}
                    <span className="text-ink dark:text-ink-dark font-bold">{item.planned_portions}</span> →
                    Rec{' '}
                    <span className="text-matcha dark:text-matcha-light font-bold">
                      {item.recommended_portions}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleApplySingle(item.item_id, item.recommended_portions)}
                  className="btn-tactile px-2.5 py-1 rounded-lg bg-matcha hover:bg-matcha-hover text-white text-[11px] font-bold cursor-pointer shrink-0"
                  title="Bump to recommended portions"
                >
                  Bump
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Daily Preparation Ledger Section */}
      <section aria-label="Preparation Ledger" className="space-y-3">
        {/* Top Header Row with Presets & Tools */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink dark:text-ink-dark flex items-center gap-2">
              <span>Daily Preparation Ledger</span>
              <span className="text-xs font-mono font-bold text-matcha-dark dark:text-matcha-light bg-matcha/10 dark:bg-matcha/20 px-2.5 py-0.5 rounded-full border border-matcha/30">
                {activePeriodItems.length} Dishes for{' '}
                {servicePeriod.charAt(0).toUpperCase() + servicePeriod.slice(1)}
              </span>
            </h2>
            <p className="text-xs text-ink-muted">
              Adjust portions with muscle memory. Showing {servicePeriod} menu items.
            </p>
          </div>

          {/* Strategic Kitchen Operating Presets (One-Click Buffering Modes) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline text-xs font-semibold">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted px-2 select-none">
              Preset Modes:
            </span>
            <button
              onClick={() => (onApplyPreset ? onApplyPreset('balanced') : onApplyAllRecommendations())}
              className="btn-tactile px-2.5 py-1 rounded-lg bg-matcha hover:bg-matcha-hover text-white text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1"
              title="Optimal Newsvendor recommendation balancing waste cost vs stockout penalty"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Balanced (Newsvendor)</span>
            </button>
            <button
              onClick={() => onApplyPreset && onApplyPreset('conservative')}
              className="btn-tactile px-2.5 py-1 rounded-lg border border-ink-hairline bg-surface dark:bg-surface-dark hover:bg-canvas-subtle text-ink dark:text-ink-dark text-xs font-bold cursor-pointer flex items-center gap-1"
              title="Cook strictly to expected median demand with zero waste cushion"
            >
              <TrendingDown className="w-3.5 h-3.5 text-yuzu-dark" />
              <span>Conservative (Low Waste)</span>
            </button>
            <button
              onClick={() => onApplyPreset && onApplyPreset('zero_stockout')}
              className="btn-tactile px-2.5 py-1 rounded-lg border border-ink-hairline bg-surface dark:bg-surface-dark hover:bg-canvas-subtle text-ink dark:text-ink-dark text-xs font-bold cursor-pointer flex items-center gap-1"
              title="Cook to upper 95% conformal bound to guarantee zero stock-outs on VIP/Exam days"
            >
              <Flame className="w-3.5 h-3.5 text-persimmon" />
              <span>Zero-Stockout (VIP Day)</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Quick ERP Tools */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCloseOutModalOpen(true)}
              className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-persimmon/40 bg-persimmon/15 hover:bg-persimmon/25 text-xs font-bold text-persimmon cursor-pointer transition-all shadow-xs"
              title="Record actual portions sold and leftover scrap to close out current meal shift (C)"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-persimmon" />
              <span>Shift Close-Out</span>
            </button>

            <button
              onClick={() => setIsBOMModalOpen(true)}
              className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-matcha/30 dark:border-matcha/40 bg-matcha/10 dark:bg-matcha/20 hover:bg-matcha/20 text-xs font-bold text-matcha-dark dark:text-cream cursor-pointer transition-all shadow-xs"
              title="Explode planned portions into required raw ingredient kilograms"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-matcha" />
              <span>Raw Ingredients (BOM)</span>
            </button>

            <button
              onClick={() => setIsBenchmarkModalOpen(true)}
              className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-persimmon/30 dark:border-persimmon/40 bg-persimmon/10 dark:bg-persimmon/20 hover:bg-persimmon/20 text-xs font-bold text-persimmon cursor-pointer transition-all shadow-xs"
              title="View empirical performance leaderboard vs baselines (MAE, WAPE, Conformal Coverage)"
            >
              <Award className="w-3.5 h-3.5 text-persimmon" />
              <span>Model Benchmarks</span>
            </button>

            <button
              onClick={() => setIsWeeklyOutlookOpen(true)}
              className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-surface-dark hover:bg-canvas-subtle text-xs font-bold text-ink dark:text-ink-dark cursor-pointer transition-all shadow-xs"
              title="View 7-day upcoming volume outlook and event shock horizon"
            >
              <Calendar className="w-3.5 h-3.5 text-persimmon" />
              <span>7-Day Outlook</span>
            </button>

            <button
              onClick={() => exportPreparationLedgerCsv(activePeriodItems, serviceDate, servicePeriod)}
              className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-surface-dark hover:bg-canvas-subtle text-xs font-bold text-ink dark:text-ink-dark cursor-pointer transition-all shadow-xs"
              title="Download active kitchen prep plan as CSV"
            >
              <Download className="w-3.5 h-3.5 text-ink-muted" />
              <span>Export CSV</span>
            </button>

            {onOpenAllDayMenu && (
              <button
                onClick={onOpenAllDayMenu}
                className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-surface-dark hover:bg-canvas-subtle text-xs font-bold text-ink dark:text-ink-dark cursor-pointer transition-all shadow-xs"
                title="View entire menu schedule divided by meal time"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-ink-muted" />
                <span>All-Day Catalog</span>
              </button>
            )}

            <button
              onClick={() => setIsPrepSheetOpen(true)}
              className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-surface-dark hover:bg-canvas-subtle text-xs font-bold text-ink dark:text-ink-dark cursor-pointer transition-all shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-persimmon" />
              <span>Print Sheet</span>
            </button>
          </div>

          {/* Quick Search & Sort Filter */}
          <div className="flex flex-wrap items-center gap-2 flex-1 justify-end min-w-[280px]">
            {/* Live Search */}
            <div className="flex items-center gap-1.5 bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline rounded-xl px-3 py-1 text-xs">
              <Search className="w-3.5 h-3.5 text-ink-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes..."
                className="bg-transparent text-xs text-ink dark:text-ink-dark outline-none w-28 sm:w-36"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-ink-muted hover:text-ink text-xs p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline text-xs font-semibold rounded-xl px-2.5 py-1 text-ink dark:text-ink-dark outline-none cursor-pointer"
            >
              <option value="default">Sort: Default Order</option>
              <option value="demand_desc">Sort: Highest Demand</option>
              <option value="risk">Sort: Attention First</option>
              <option value="price">Sort: Price (High to Low)</option>
              <option value="name">Sort: Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills Bar */}
        <div className="flex flex-wrap items-center gap-1 pt-1 text-xs">
          {[
            { id: 'all', label: 'All Dishes' },
            { id: 'mains', label: '🍛 Mains & Curries' },
            { id: 'breakfast', label: '🥞 Breakfast' },
            { id: 'snacks', label: '🥪 Snacks' },
            { id: 'beverages', label: '☕ Beverages' },
            { id: 'desserts', label: '🍮 Desserts' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                categoryFilter === cat.id
                  ? 'bg-ink text-white dark:bg-cream dark:text-ink font-bold shadow-xs'
                  : 'bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline text-ink-muted hover:text-ink'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <span className="text-[11px] font-mono text-ink-muted ml-2">
            Showing {displayedItems.length} of {activePeriodItems.length} items
          </span>
        </div>

        {/* Ledger Table inside Quirky Card */}
        <div className="quirky-card overflow-hidden">
          {displayedItems.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Search className="w-8 h-8 text-ink-muted mx-auto opacity-40" />
              <div className="font-serif text-lg font-bold text-ink dark:text-ink-dark">
                No matching dishes found
              </div>
              <p className="text-xs text-ink-muted max-w-sm mx-auto">
                No items match "{searchQuery}" in category "{categoryFilter}" for {servicePeriod}.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                }}
                className="btn-tactile px-3.5 py-1.5 rounded-xl bg-matcha hover:bg-matcha-hover text-white text-xs font-bold cursor-pointer"
              >
                Reset Search & Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-canvas-subtle/80 dark:bg-white/5 border-b border-ink-hairline dark:border-ink-dark-hairline text-ink-muted text-[10px] font-mono font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Menu Dish</th>
                    <th className="py-3 px-3 text-right">Forecast (ŷ)</th>
                    <th className="py-3 px-4 min-w-[220px]">95% Conformal Range</th>
                    <th className="py-3 px-4 text-center min-w-[195px]">Planned Prep</th>
                    <th className="py-3 px-3 text-right">Est. Leftover</th>
                    <th className="py-3 px-3 text-right">Recommended</th>
                    <th className="py-3 px-3 text-center">Safety Status</th>
                    <th className="py-3 px-3 text-center">Audit</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-ink-hairline dark:divide-ink-dark-hairline">
                  {displayedItems.map((item) => {
                    const isHighRisk = item.risk_level === 'high';
                    const isWatch = item.risk_level === 'watch';

                    return (
                      <tr
                        key={item.item_id}
                        className="hover:bg-canvas-subtle/60 dark:hover:bg-white/5 transition-colors"
                      >
                        {/* 1. Dish Name & Tags */}
                        <td className="py-3 px-4">
                          <div className="font-serif font-bold text-ink dark:text-ink-dark text-base flex flex-wrap items-center gap-2">
                            <span className="text-base select-none">{getCategoryEmoji(item.category)}</span>
                            <span>{item.item_name}</span>
                            {getVolatilityBadge(item.lower_estimate, item.upper_estimate)}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-ink-muted dark:text-ink-dark-muted font-sans">
                            <span className="capitalize">{item.category}</span>
                            <span className="opacity-40">•</span>
                            <span className="font-mono font-semibold text-ink dark:text-ink-dark">
                              ₹{item.price}
                            </span>
                            <span className="opacity-40">•</span>
                            <span
                              className={`inline-flex items-center gap-1 font-mono text-[10px] ${
                                item.history_status === 'sufficient'
                                  ? 'text-matcha dark:text-matcha-light font-medium'
                                  : item.history_status === 'low_history'
                                  ? 'text-yuzu-dark font-bold'
                                  : 'text-berry font-bold'
                              }`}
                              title={`History calibration: ${item.history_status.replace('_', ' ')}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.history_status === 'sufficient'
                                    ? 'bg-matcha'
                                    : item.history_status === 'low_history'
                                    ? 'bg-yuzu'
                                    : 'bg-berry'
                                }`}
                              />
                              <span>
                                {item.history_status === 'sufficient'
                                  ? 'Calibrated'
                                  : item.history_status === 'low_history'
                                  ? 'Low History'
                                  : 'Tier 4 Fallback'}
                              </span>
                            </span>

                            {/* Dietary & Allergen Badges */}
                            {getDietaryBadges(item.item_name, item.category).map((badge, bIdx) => (
                              <span
                                key={bIdx}
                                className={`px-1.5 py-0.2 rounded-md font-mono text-[9px] font-bold border ${badge.class}`}
                              >
                                {badge.label}
                              </span>
                            ))}
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

                          {/* Numeric Input */}
                          <input
                            type="number"
                            min="0"
                            max="999"
                            value={item.planned_portions}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              onUpdatePlannedPortions(item.item_id, isNaN(val) ? 0 : Math.max(0, val));
                            }}
                            className="w-14 py-1 text-center font-mono text-sm font-bold text-ink dark:text-ink-dark bg-canvas dark:bg-black/20 border border-ink-hairline dark:border-ink-dark-hairline rounded-lg focus:outline-none focus:border-persimmon transition-colors tabular-nums"
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

                      {/* 5. Estimated Leftovers */}
                      <td className="py-3 px-3 text-right font-mono text-sm tabular-nums">
                        {item.estimated_leftovers > 0 ? (
                          <span className="font-bold text-yuzu-dark dark:text-yuzu">
                            +{item.estimated_leftovers}
                          </span>
                        ) : (
                          <span className="text-ink-muted opacity-40">0</span>
                        )}
                      </td>

                      {/* 6. Recommended Buffer Quantity */}
                      <td className="py-3 px-3 text-right font-mono text-sm font-bold text-matcha dark:text-matcha-light tabular-nums">
                        {item.recommended_portions}
                      </td>

                      {/* 7. Safety Status Badge */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isHighRisk
                              ? 'bg-berry/15 text-berry border border-berry/30'
                              : isWatch
                              ? 'bg-yuzu/15 text-yuzu-dark border border-yuzu/30'
                              : 'bg-matcha/10 text-matcha-dark dark:text-matcha-light border border-matcha/30'
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
          )}
        </div>
      </section>

      {/* Why This Number Drawer */}
      <WhyDrawer
        forecastId={activePeriodItems[0]?.id || forecastItems[0]?.id || 'latest'}
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

      {/* Raw Ingredients Bill of Materials (BOM) Modal */}
      <IngredientBOMModal
        isOpen={isBOMModalOpen}
        onClose={() => setIsBOMModalOpen(false)}
        items={activePeriodItems}
        serviceDate={serviceDate}
        servicePeriod={servicePeriod}
      />

      {/* 7-Day Rolling Weekly Outlook Modal */}
      <WeeklyOutlookModal
        isOpen={isWeeklyOutlookOpen}
        onClose={() => setIsWeeklyOutlookOpen(false)}
        currentDate={serviceDate}
        onSelectDate={(newDate) => {
          if (onSelectDate) onSelectDate(newDate);
        }}
      />

      {/* Model Benchmark Arena Modal */}
      <BenchmarkComparisonModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
      />

      {/* Shift Close-Out & Actuals Reconciliation Modal */}
      <ShiftCloseOutModal
        isOpen={isCloseOutModalOpen}
        onClose={() => setIsCloseOutModalOpen(false)}
        serviceDate={serviceDate}
        servicePeriod={servicePeriod}
        items={activePeriodItems}
      />
    </div>
  );
};
