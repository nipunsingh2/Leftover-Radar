import React, { useState, useEffect, useCallback } from 'react';
import {
  api,
  MenuItem,
  ForecastItemResult,
} from './api/client';
import { TopNavigationBar, TabId } from './components/TopNavigationBar';
import { HeaderStrip } from './components/HeaderStrip';
import { PlanPage } from './pages/PlanPage';
import { CloseOutPage } from './pages/CloseOutPage';
import { HistoryPage } from './pages/HistoryPage';
import { ModelLabPage } from './pages/ModelLabPage';
import { DataSettingsPage } from './pages/DataSettingsPage';
import { PrepSheetModal } from './components/PrepSheetModal';
import { CuteLoadingScreen } from './components/CuteLoadingScreen';
import { AlertCircle, RotateCcw, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabId>('plan');

  // Clock Synchronization State & Helper
  const getPeriodFromTime = (date: Date): 'breakfast' | 'lunch' | 'dinner' => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // Breakfast: 06:00 (360m) to 10:59 (659m)
    if (totalMinutes >= 360 && totalMinutes < 660) {
      return 'breakfast';
    }
    // Lunch: 11:00 (660m) to 16:29 (989m)
    if (totalMinutes >= 660 && totalMinutes < 990) {
      return 'lunch';
    }
    // Dinner: 16:30 (990m) through late night until 05:59 (359m)
    return 'dinner';
  };

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isClockSynced, setIsClockSynced] = useState<boolean>(true);

  // Service Context: Initialize service period based on live clock
  const [serviceDate, setServiceDate] = useState<string>('2026-11-14');
  const [servicePeriod, setServicePeriod] = useState<'breakfast' | 'lunch' | 'dinner'>(() => {
    return getPeriodFromTime(new Date());
  });

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

  // Modals & Overlays
  const [isPrepSheetModalOpen, setIsPrepSheetModalOpen] = useState<boolean>(false);
  const [showCuteLoading, setShowCuteLoading] = useState<boolean>(true);

  // Auto-dismiss initial cute loading screen after first visit
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCuteLoading(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

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

  // 2. Real-Time Clock Synchronization Effect
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (isClockSynced) {
        const autoPeriod = getPeriodFromTime(now);
        setServicePeriod((prev) => {
          if (prev !== autoPeriod) {
            return autoPeriod;
          }
          return prev;
        });
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [isClockSynced]);

  const handleToggleClockSync = useCallback(() => {
    setIsClockSynced((prev) => {
      const next = !prev;
      if (next) {
        // Snapped immediately to current time
        const autoPeriod = getPeriodFromTime(new Date());
        setServicePeriod(autoPeriod);
      }
      return next;
    });
  }, []);

  const handleManualPeriodChange = (newPeriod: 'breakfast' | 'lunch' | 'dinner') => {
    // If the operator manually picks another period, disable auto clock sync
    setIsClockSynced(false);
    setServicePeriod(newPeriod);
  };

  // 3. Fetch or Generate Forecast when date/service changes
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

  // 4. Live Local Recompute on Operator Plan Edit (Section 9.5: Zero API calls)
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

  // 5. Apply All Recommendations with Floating Undo Toast
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

  const currentTimeStr = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col min-h-screen bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark transition-colors font-sans selection:bg-persimmon/20 selection:text-persimmon">
      {/* 1. Top Liquid Glass Navigation Bar */}
      <TopNavigationBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isClockSynced={isClockSynced}
        onToggleClockSync={handleToggleClockSync}
        currentTimeStr={currentTimeStr}
        activeServicePeriod={servicePeriod}
      />

      {/* 2. Top Header Strip with Service Controls */}
      <HeaderStrip
        serviceDate={serviceDate}
        onDateChange={setServiceDate}
        servicePeriod={servicePeriod}
        onPeriodChange={handleManualPeriodChange}
        onGenerateForecast={loadForecastData}
        onOpenPrintSheet={() => setIsPrepSheetModalOpen(true)}
        isGenerating={isGenerating}
      />

      {/* 3. Global Error Banner */}
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

      {/* 4. Dynamic Page Views */}
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

      {/* 5. Floating Quirky Undo Toast Notification */}
      {showUndoToast && (
        <div className="fixed bottom-6 right-6 z-40 quirky-card px-5 py-3.5 shadow-quirky border-2 border-matcha/30 dark:border-matcha/40 flex items-center gap-4 bg-canvas dark:bg-canvas-dark animate-spring">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-yuzu" />
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

      {/* 6. Printable Prep Sheet Modal */}
      <PrepSheetModal
        serviceDate={serviceDate}
        servicePeriod={servicePeriod}
        isOpen={isPrepSheetModalOpen}
        onClose={() => setIsPrepSheetModalOpen(false)}
      />

      {/* 7. Cute Kitchen Radar Initial Loading Screen Overlay */}
      <CuteLoadingScreen
        isLoading={showCuteLoading}
        onDismiss={() => setShowCuteLoading(false)}
      />
    </div>
  );
};

export default App;
