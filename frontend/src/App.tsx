import React, { useState, useEffect, useCallback } from 'react';
import {
  api,
  MenuItem,
  ForecastItemResult,
} from './api/client';
import { TopNavigationBar, TabId } from './components/TopNavigationBar';
import { HeaderStrip } from './components/HeaderStrip';
import { PlanPage } from './pages/PlanPage';
import { HistoryPage } from './pages/HistoryPage';
import { DataSettingsPage } from './pages/DataSettingsPage';
import { PrepSheetModal } from './components/PrepSheetModal';
import { CuteLoadingScreen } from './components/CuteLoadingScreen';
import { AllDayMenuModal } from './components/AllDayMenuModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { AlertCircle, RotateCcw, Sparkles } from 'lucide-react';
import { saveDraftPortions, loadDraftPortions } from './utils/localStorageCache';

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

  // Service Context: Initialize service date using local timezone without UTC offset
  const [serviceDate, setServiceDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
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
  const [simulationContext, setSimulationContext] = useState<{
    weather?: string;
    campus_event?: boolean;
    exam_week?: boolean;
    holiday?: boolean;
    active: boolean;
  }>({ active: false });

  // Undo History for "Apply All Recommendations"
  const [undoStack, setUndoStack] = useState<ForecastItemResult[] | null>(null);
  const [showUndoToast, setShowUndoToast] = useState<boolean>(false);

  // Modals & Overlays
  const [isPrepSheetModalOpen, setIsPrepSheetModalOpen] = useState<boolean>(false);
  const [isAllDayMenuOpen, setIsAllDayMenuOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [showCuteLoading, setShowCuteLoading] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('leftover_radar_welcomed');
    } catch {
      return true;
    }
  });

  // Snappy startup splash auto-dismiss and persist session
  useEffect(() => {
    if (!showCuteLoading) return;
    const timer = setTimeout(() => {
      setShowCuteLoading(false);
      try {
        sessionStorage.setItem('leftover_radar_welcomed', '1');
      } catch {}
    }, 700);
    return () => clearTimeout(timer);
  }, [showCuteLoading]);

  // Global Keyboard Shortcuts Listener for Commercial Kitchen Workstations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === '1') {
        setActiveTab('plan');
      } else if (e.key === '2') {
        setActiveTab('history');
      } else if (e.key === '3') {
        setActiveTab('data_settings');
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.key === 'd' || e.key === 'D') {
        setIsDarkMode((prev) => !prev);
      } else if (e.key === 'p' || e.key === 'P') {
        setIsPrepSheetModalOpen(true);
      } else if (e.key === 'Escape') {
        setIsShortcutsModalOpen(false);
        setIsAllDayMenuOpen(false);
        setIsPrepSheetModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  // Helper to strictly ensure only items appropriate for the period are retained
  const filterItemsByPeriod = (items: ForecastItemResult[], period: 'breakfast' | 'lunch' | 'dinner') => {
    const breakfastOnly = new Set([
      'masala_dosa', 'idli_sambar', 'poha', 'aloo_paratha', 'avocado_toast', 'avocado_sourdough'
    ]);
    return items.filter((item) => {
      const cat = (item.category || '').toLowerCase();
      const iid = (item.item_id || '').toLowerCase();
      const isBreakfastOnly = cat === 'breakfast' || breakfastOnly.has(iid);
      if (period === 'breakfast') {
        return isBreakfastOnly || cat === 'beverage' || cat === 'snack';
      }
      if (period === 'lunch' || period === 'dinner') {
        return !isBreakfastOnly;
      }
      return true;
    });
  };

  // 3. Fetch or Generate Forecast when date/service changes
  const loadForecastData = async (simOverrides?: {
    weather?: string;
    campus_event?: boolean;
    exam_week?: boolean;
    holiday?: boolean;
  }) => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      let rawItems: ForecastItemResult[] = [];
      if (simOverrides) {
        const genRes = await api.generateForecast({
          service_date: serviceDate,
          service_period: servicePeriod,
          ...simOverrides,
        });
        rawItems = genRes.items;
      } else {
        // Check if a saved forecast snapshot exists
        const savedRes = await api.getSavedForecasts(serviceDate, servicePeriod);
        if (savedRes.items && savedRes.items.length > 0) {
          rawItems = savedRes.items;
        } else {
          // Automatically generate baseline forecast for the active date and service
          const genRes = await api.generateForecast({
            service_date: serviceDate,
            service_period: servicePeriod,
          });
          rawItems = genRes.items;
        }
      }

      let filtered = filterItemsByPeriod(rawItems, servicePeriod);

      // Restore custom draft adjustments from localStorage if present
      const draft = loadDraftPortions(serviceDate, servicePeriod);
      if (draft && Object.keys(draft).length > 0) {
        filtered = filtered.map((item) => {
          if (draft[item.item_id] !== undefined) {
            const customPlanned = draft[item.item_id];
            const pred = item.predicted_demand || 0;
            return {
              ...item,
              planned_portions: customPlanned,
              estimated_leftovers: Math.max(0, customPlanned - pred),
              estimated_shortfall: Math.max(0, pred - customPlanned),
            };
          }
          return item;
        });
      }

      setForecastItems(filtered);
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
    setForecastItems((prev) => {
      const updatedList = prev.map((item) => {
        if (item.item_id !== itemId) return item;

        const pred = item.predicted_demand || 0;
        const p80Low = item.lower_estimate || 0;
        const p80High = item.upper_estimate || pred;
        const rec = item.recommended_portions || pred;

        const estLeftovers = Math.max(0, newPlanned - pred);
        const estShortfall = Math.max(0, pred - newPlanned);

        // Risk recalculation
        let risk: 'low' | 'watch' | 'high' = 'low';
        let riskReason = 'Well-calibrated within 95% interval.';

        if (newPlanned < p80Low) {
          risk = 'high';
          riskReason = `Under-prep risk: planned (${newPlanned}) is below 95% demand floor (${p80Low}). Likely stock-out.`;
        } else if (newPlanned > p80High) {
          risk = 'high';
          riskReason = `Over-prep risk: planned (${newPlanned}) exceeds 95% demand ceiling (${p80High}). High waste expected.`;
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
      });

      // Auto-save draft portions to localStorage
      const draftMap: Record<string, number> = {};
      updatedList.forEach((it) => {
        draftMap[it.item_id] = it.planned_portions;
      });
      saveDraftPortions(serviceDate, servicePeriod, draftMap);

      return updatedList;
    });
  };

  // 5. Presets: Balanced (Newsvendor q*), Conservative (predicted demand y_hat), Zero Stock-out (upper 95% ceiling)
  const handleApplyPreset = (mode: 'conservative' | 'balanced' | 'zero_stockout') => {
    setUndoStack([...forecastItems]);
    setShowUndoToast(true);
    setTimeout(() => {
      setShowUndoToast(false);
    }, 2000);

    setForecastItems((prev) => {
      const updatedList = prev.map((item) => {
        const pred = item.predicted_demand || 0;
        let targetPortions = item.recommended_portions || pred;

        if (mode === 'conservative') {
          // Zero waste cushion: cook strictly the predicted median demand
          targetPortions = pred;
        } else if (mode === 'zero_stockout') {
          // Maximum protection: cook to upper 95% conformal bound
          targetPortions = item.upper_estimate || pred + 15;
        } else {
          // Balanced Newsvendor
          targetPortions = item.recommended_portions || pred;
        }

        const estLeftovers = Math.max(0, targetPortions - pred);
        const estShortfall = Math.max(0, pred - targetPortions);

        return {
          ...item,
          planned_portions: targetPortions,
          estimated_leftovers: estLeftovers,
          estimated_shortfall: estShortfall,
          risk_level: (mode === 'conservative' ? 'watch' : 'low') as 'low' | 'watch',
          risk_reason:
            mode === 'conservative'
              ? 'Conservative preset: Zero safety buffer planned. Risk of minor stockout if demand surges.'
              : mode === 'zero_stockout'
              ? 'Zero-Stockout preset: Upper 95% demand ceiling covered.'
              : 'Optimal Newsvendor recommended buffer applied.',
        };
      });

      // Update draft
      const draftMap: Record<string, number> = {};
      updatedList.forEach((it) => {
        draftMap[it.item_id] = it.planned_portions;
      });
      saveDraftPortions(serviceDate, servicePeriod, draftMap);

      return updatedList;
    });
  };

  const handleApplyAllRecommendations = () => {
    handleApplyPreset('balanced');
  };

  const handleSimulateScenario = (params: {
    weather: string;
    campus_event: boolean;
    exam_week: boolean;
    holiday: boolean;
  }) => {
    setSimulationContext({ ...params, active: true });
    loadForecastData(params);
  };

  const handleResetSimulation = () => {
    setSimulationContext({ active: false });
    loadForecastData();
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
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
      />

      {/* 2. Top Header Strip with Service Controls */}
      <HeaderStrip
        serviceDate={serviceDate}
        onDateChange={setServiceDate}
        servicePeriod={servicePeriod}
        onPeriodChange={handleManualPeriodChange}
        onGenerateForecast={() => loadForecastData()}
        onOpenPrintSheet={() => setIsPrepSheetModalOpen(true)}
        onOpenAllDayMenu={() => setIsAllDayMenuOpen(true)}
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
            onClick={() => loadForecastData()}
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
            onApplyPreset={handleApplyPreset}
            onUndoApplyAll={handleUndoApplyAll}
            canUndo={Boolean(undoStack)}
            onOpenAllDayMenu={() => setIsAllDayMenuOpen(true)}
            onSimulateScenario={handleSimulateScenario}
            onResetSimulation={handleResetSimulation}
            isSimulating={isGenerating}
            currentWeather={simulationContext.weather || 'clear'}
            isCampusEvent={simulationContext.campus_event || false}
            isExamWeek={simulationContext.exam_week || false}
            isHoliday={simulationContext.holiday || false}
            onSelectDate={setServiceDate}
          />
        )}

        {activeTab === 'history' && <HistoryPage />}

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

      {/* 7. All-Day Meal Schedule Modal */}
      <AllDayMenuModal
        isOpen={isAllDayMenuOpen}
        onClose={() => setIsAllDayMenuOpen(false)}
        menuItems={menuItems}
        onSelectPeriod={(period) => {
          handleManualPeriodChange(period);
        }}
      />

      {/* 8. Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* 9. Cute Kitchen Radar Initial Loading Screen Overlay */}
      <CuteLoadingScreen
        isLoading={showCuteLoading}
        onDismiss={() => setShowCuteLoading(false)}
      />
    </div>
  );
};

export default App;
