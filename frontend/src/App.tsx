import React, { useState, useEffect } from 'react';
import {
  api,
  MenuItem,
  ForecastItemResult,
} from './api/client';
import { NavigationRail, TabId } from './components/NavigationRail';
import { HeaderStrip } from './components/HeaderStrip';
import { PlanPage } from './pages/PlanPage';
import { CloseOutPage } from './pages/CloseOutPage';
import { HistoryPage } from './pages/HistoryPage';
import { ModelLabPage } from './pages/ModelLabPage';
import { DataSettingsPage } from './pages/DataSettingsPage';
import { PrepSheetModal } from './components/PrepSheetModal';
import { AlertCircle, RotateCcw } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabId>('plan');

  // Service Context
  const [serviceDate, setServiceDate] = useState<string>('2026-11-14');
  const [servicePeriod, setServicePeriod] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');

  // Dark Mode ("Night Mode" / "Midnight Diner")
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // App Data State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [forecastItems, setForecastItems] = useState<ForecastItemResult[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Undo History for "Apply All Recommendations"
  const [undoStack, setUndoStack] = useState<ForecastItemResult[] | null>(null);
  const [showUndoToast, setShowUndoToast] = useState<boolean>(false);

  // Prep sheet modal trigger from header
  const [isPrepSheetModalOpen, setIsPrepSheetModalOpen] = useState<boolean>(false);

  // 1. Initialize Dark Mode and Menu Items
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    api
      .getMenuItems(false)
      .then(setMenuItems)
      .catch((err) => console.error('Menu load error:', err));
  }, []);

  // 2. Fetch or Generate Forecast when date/service changes
  const loadForecastData = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      // Check if a saved forecast snapshot exists
      const savedRes = await api.getSavedForecasts(serviceDate, servicePeriod);
      if (savedRes.items && savedRes.items.length > 0) {
        setForecastItems(savedRes.items);
      } else {
        // Automatically generate baseline forecast for the active date and service
        const genRes = await api.generateForecast({
          service_date: serviceDate,
          service_period: servicePeriod,
        });
        setForecastItems(genRes.items);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load forecast data.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    loadForecastData();
  }, [serviceDate, servicePeriod]);

  // 3. Live Local Recompute on Operator Plan Edit (Section 9.5: Zero API calls)
  const handleUpdatePlannedPortions = (itemId: string, newPlanned: number) => {
    setForecastItems((prev) =>
      prev.map((item) => {
        if (item.item_id !== itemId) return item;

        const pred = item.predicted_demand || 0;
        const p80Low = item.lower_estimate || 0;
        const p80High = item.upper_estimate || pred;
        const rec = item.recommended_portions || pred;

        const estLeftovers = Math.max(0, newPlanned - pred);
        const estShortfall = Math.max(0, pred - newPlanned);

        // Risk recalculation
        let risk: 'low' | 'watch' | 'high' = 'low';
        let riskReason = 'Well-calibrated within 80% interval.';

        if (newPlanned < p80Low) {
          risk = 'high';
          riskReason = `Under-prep risk: planned (${newPlanned}) is below 80% demand floor (${p80Low}). Likely stock-out.`;
        } else if (newPlanned > p80High) {
          risk = 'high';
          riskReason = `Over-prep risk: planned (${newPlanned}) exceeds 80% demand ceiling (${p80High}). High waste expected.`;
        } else if (newPlanned > pred * 1.15 && newPlanned > rec) {
          risk = 'watch';
          riskReason = `Elevated prep: planned (${newPlanned}) exceeds Newsvendor recommended buffer (${rec}).`;
        } else if (newPlanned < pred) {
          risk = 'watch';
          riskReason = `Lean prep: planned (${newPlanned}) is below expected demand (${pred}).`;
        }

        return {
          ...item,
          planned_portions: newPlanned,
          estimated_leftovers: estLeftovers,
          estimated_shortfall: estShortfall,
          risk_level: risk,
          risk_reason: riskReason,
        };
      })
    );
  };

  // 4. Apply All Recommendations with Floating Undo Toast
  const handleApplyAllRecommendations = () => {
    setUndoStack([...forecastItems]);
    setShowUndoToast(true);
    setForecastItems((prev) =>
      prev.map((item) => {
        const rec = item.recommended_portions || item.predicted_demand || 0;
        const pred = item.predicted_demand || 0;
        return {
          ...item,
          planned_portions: rec,
          estimated_leftovers: Math.max(0, rec - pred),
          estimated_shortfall: Math.max(0, pred - rec),
          risk_level: 'low',
          risk_reason: 'Optimal Newsvendor recommended buffer applied.',
        };
      })
    );
  };

  const handleUndoApplyAll = () => {
    if (undoStack) {
      setForecastItems(undoStack);
      setUndoStack(null);
      setShowUndoToast(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark transition-colors font-sans selection:bg-persimmon/20 selection:text-persimmon">
      {/* 1. Left Navigation Rail */}
      <NavigationRail
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Strip with Service Controls */}
        <HeaderStrip
          serviceDate={serviceDate}
          onDateChange={setServiceDate}
          servicePeriod={servicePeriod}
          onPeriodChange={setServicePeriod}
          onGenerateForecast={loadForecastData}
          onOpenPrintSheet={() => setIsPrepSheetModalOpen(true)}
          isGenerating={isGenerating}
          modelVersion="v3.production"
        />

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mx-8 mt-4 p-4 rounded-card quirky-card bg-berry/10 border-2 border-berry/30 text-berry text-xs flex items-center justify-between shadow-tactile">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-berry" />
              <span className="font-sans font-medium">{errorMessage}</span>
            </div>
            <button
              onClick={loadForecastData}
              className="btn-tactile px-3 py-1.5 rounded-card bg-berry text-white text-xs font-bold cursor-pointer shadow-tactile"
            >
              Retry
            </button>
          </div>
        )}

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'plan' && (
            <PlanPage
              serviceDate={serviceDate}
              servicePeriod={servicePeriod}
              forecastItems={forecastItems}
              onUpdatePlannedPortions={handleUpdatePlannedPortions}
              onApplyAllRecommendations={handleApplyAllRecommendations}
              onUndoApplyAll={handleUndoApplyAll}
              canUndo={Boolean(undoStack)}
            />
          )}

          {activeTab === 'closeout' && (
            <CloseOutPage
              serviceDate={serviceDate}
              servicePeriod={servicePeriod}
              menuItems={menuItems}
              forecastItems={forecastItems}
            />
          )}

          {activeTab === 'history' && <HistoryPage />}

          {activeTab === 'model_lab' && <ModelLabPage />}

          {activeTab === 'data_settings' && <DataSettingsPage />}
        </main>
      </div>

      {/* Floating Quirky Undo Toast Notification */}
      {showUndoToast && (
        <div className="fixed bottom-6 right-6 z-40 quirky-card px-5 py-3.5 shadow-quirky border-2 border-matcha/30 dark:border-matcha/40 flex items-center gap-4 bg-canvas dark:bg-canvas-dark animate-spring">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✨</span>
            <div>
              <div className="text-xs font-bold text-ink dark:text-ink-dark font-sans">
                All Recommendations Applied
              </div>
              <div className="text-[11px] font-mono text-ink-muted">
                Newsvendor optimal safety buffers synchronized.
              </div>
            </div>
          </div>
          <button
            onClick={handleUndoApplyAll}
            className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-persimmon hover:bg-persimmon-hover text-white text-xs font-bold font-sans cursor-pointer shadow-tactile transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            onClick={() => setShowUndoToast(false)}
            className="text-xs font-mono text-ink-muted hover:text-ink dark:hover:text-cream cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Printable Prep Sheet Modal */}
      <PrepSheetModal
        serviceDate={serviceDate}
        servicePeriod={servicePeriod}
        isOpen={isPrepSheetModalOpen}
        onClose={() => setIsPrepSheetModalOpen(false)}
      />
    </div>
  );
};

export default App;
