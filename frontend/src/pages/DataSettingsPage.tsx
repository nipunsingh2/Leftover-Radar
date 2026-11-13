import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Utensils,
  Calendar,
  UploadCloud,
  Check,
  Save,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  api,
  MenuItem,
  SettingsData,
  CalendarDayContext,
} from '../api/client';

export const DataSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'menu' | 'calendar' | 'import'>('settings');

  // Settings State
  const [settings, setSettings] = useState<SettingsData>({
    waste_cost: 30.0,
    stockout_cost: 70.0,
    buffer_cap_percent: 0.15,
    critical_fractile: 0.70,
  });
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  // Menu State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [, setMenuLoading] = useState<boolean>(false);

  // Calendar State
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-14');
  const [calendarContext, setCalendarContext] = useState<CalendarDayContext>({
    date: '2026-11-14',
    weather: 'clear',
    campus_event: false,
    exam_week: false,
    holiday: false,
  });
  const [calendarSaved, setCalendarSaved] = useState<boolean>(false);

  // CSV Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [importReport, setImportReport] = useState<any | null>(null);

  // Load initial settings and menu
  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error);
    setMenuLoading(true);
    api.getMenuItems(false)
      .then(setMenuItems)
      .catch(console.error)
      .finally(() => setMenuLoading(false));
  }, []);

  // Load calendar when date changes
  useEffect(() => {
    api.getCalendarContext(selectedDate).then(setCalendarContext).catch(console.error);
  }, [selectedDate]);

  // Live Newsvendor Critical Fractile Calculation: q* = c_s / (c_s + c_w)
  const totalCost = settings.stockout_cost + settings.waste_cost;
  const liveQStar = totalCost > 0 ? settings.stockout_cost / totalCost : 0.70;

  const handleSaveSettings = async () => {
    try {
      const updated = await api.updateSettings({
        waste_cost: settings.waste_cost,
        stockout_cost: settings.stockout_cost,
        buffer_cap_percent: settings.buffer_cap_percent,
      });
      setSettings(updated);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMenu = async (itemId: string, currentActive: boolean) => {
    try {
      await api.patchMenuItem(itemId, { active: !currentActive });
      setMenuItems((prev) =>
        prev.map((m) => (m.id === itemId ? { ...m, active: !currentActive } : m))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePrice = async (itemId: string, newPrice: number) => {
    try {
      await api.patchMenuItem(itemId, { price: newPrice });
      setMenuItems((prev) =>
        prev.map((m) => (m.id === itemId ? { ...m, price: newPrice } : m))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCalendar = async () => {
    try {
      const saved = await api.updateCalendarContext(selectedDate, calendarContext);
      setCalendarContext(saved);
      setCalendarSaved(true);
      setTimeout(() => setCalendarSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCsvUpload = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportReport(null);
    try {
      const res = await api.importCsv(importFile);
      setImportReport(res);
    } catch (err: any) {
      setImportReport({ status: 'failed', error: err.message });
    } finally {
      setImportLoading(false);
    }
  };

  const getDishEmoji = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('curry') || cat.includes('main')) return '🍛';
    if (cat.includes('salad') || cat.includes('veg')) return '🥗';
    if (cat.includes('sandwich') || cat.includes('wrap')) return '🥪';
    if (cat.includes('snack') || cat.includes('bread')) return '🥟';
    if (cat.includes('rice') || cat.includes('bowl')) return '🍚';
    if (cat.includes('soup')) return '🍲';
    if (cat.includes('dessert') || cat.includes('sweet')) return '🍮';
    if (cat.includes('beverage') || cat.includes('drink')) return '☕';
    return '🍱';
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="border-b-2 border-matcha/20 dark:border-matcha/30 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="sticker-badge bg-yuzu/25 text-ink dark:text-yuzu border-yuzu/40 font-mono">
              ⚙️ CONTROL PANEL
            </span>
            <span className="text-[11px] font-mono text-ink-muted">
              MongoDB Param Hub & POS Ingestion
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-matcha-dark dark:text-cream">
            Kitchen Settings & Economics 🛠️
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl font-sans">
            Calibrate Newsvendor unit risk asymmetric costs, curate active cafeteria menu items, record campus exogenous events, and ingest POS observation logs.
          </p>
        </div>
      </div>

      {/* Segmented Sub-Navigation Pills */}
      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={() => setActiveTab('settings')}
          className={`btn-tactile flex items-center gap-2 px-4 py-2 rounded-card text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-matcha text-cream shadow-tactile border border-matcha-dark'
              : 'quirky-card text-ink-muted hover:text-ink dark:text-cream/70'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-yuzu" />
          <span>⚖️ Newsvendor Economics</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`btn-tactile flex items-center gap-2 px-4 py-2 rounded-card text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'menu'
              ? 'bg-matcha text-cream shadow-tactile border border-matcha-dark'
              : 'quirky-card text-ink-muted hover:text-ink dark:text-cream/70'
          }`}
        >
          <Utensils className="w-3.5 h-3.5 text-persimmon" />
          <span>🍱 Menu Catalog ({menuItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`btn-tactile flex items-center gap-2 px-4 py-2 rounded-card text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-matcha text-cream shadow-tactile border border-matcha-dark'
              : 'quirky-card text-ink-muted hover:text-ink dark:text-cream/70'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-lavender" />
          <span>📅 Campus Exogenous Factors</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`btn-tactile flex items-center gap-2 px-4 py-2 rounded-card text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'import'
              ? 'bg-matcha text-cream shadow-tactile border border-matcha-dark'
              : 'quirky-card text-ink-muted hover:text-ink dark:text-cream/70'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5 text-berry" />
          <span>📦 POS CSV Ingestion</span>
        </button>
      </div>

      {/* TAB 1: Cost Sliders & Newsvendor Parameterization */}
      {activeTab === 'settings' && (
        <section aria-label="Cost Parameters" className="max-w-3xl space-y-5">
          <div className="quirky-card p-6 space-y-6">
            <div className="border-b border-matcha/10 dark:border-matcha/20 pb-4">
              <div className="flex items-center gap-2">
                <span className="sticker-badge bg-matcha/15 text-matcha-dark dark:text-matcha-light border-matcha/30 font-mono">
                  EQUILIBRIUM FORMULA
                </span>
                <span className="text-xs font-mono text-ink-muted">q* = c_s / (c_s + c_w)</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-matcha-dark dark:text-cream mt-1.5">
                Newsvendor Loss & Shortage Cost Calibration ⚖️
              </h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                The classical stochastic Newsvendor formulation balances the tangible cost of over-preparation (spoilage, disposal) against the penalty of stockouts (missed revenue, unhappy campus diners). Modulating these coefficients updates the target critical fractile instantaneously.
              </p>
            </div>

            {/* Slider 1: Waste Cost (c_w) */}
            <div className="p-4 rounded-card bg-canvas/70 dark:bg-canvas-dark/50 border border-matcha/15 dark:border-matcha/25 space-y-2.5">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-ink dark:text-ink-dark flex items-center gap-1.5 font-sans">
                  <span>🗑️ Unit Waste Disposal Cost (c_w)</span>
                </label>
                <span className="font-mono text-sm font-bold text-persimmon bg-persimmon/10 px-2.5 py-0.5 rounded-pill border border-persimmon/20">
                  ₹{settings.waste_cost.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={settings.waste_cost}
                onChange={(e) =>
                  setSettings({ ...settings, waste_cost: parseFloat(e.target.value) })
                }
                className="w-full accent-persimmon cursor-pointer h-2 bg-matcha/10 rounded-lg"
              />
              <div className="text-[10px] text-ink-muted font-mono flex justify-between">
                <span>Direct ingredient, refrigeration, and compost loss</span>
                <span>Range: ₹5 – ₹120</span>
              </div>
            </div>

            {/* Slider 2: Stockout Cost (c_s) */}
            <div className="p-4 rounded-card bg-canvas/70 dark:bg-canvas-dark/50 border border-matcha/15 dark:border-matcha/25 space-y-2.5">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-ink dark:text-ink-dark flex items-center gap-1.5 font-sans">
                  <span>🚨 Unit Stockout Penalty (c_s)</span>
                </label>
                <span className="font-mono text-sm font-bold text-berry bg-berry/10 px-2.5 py-0.5 rounded-pill border border-berry/20">
                  ₹{settings.stockout_cost.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={settings.stockout_cost}
                onChange={(e) =>
                  setSettings({ ...settings, stockout_cost: parseFloat(e.target.value) })
                }
                className="w-full accent-berry cursor-pointer h-2 bg-matcha/10 rounded-lg"
              />
              <div className="text-[10px] text-ink-muted font-mono flex justify-between">
                <span>Unsatisfied student dissatisfaction & lost counter gross margin</span>
                <span>Range: ₹10 – ₹200</span>
              </div>
            </div>

            {/* Slider 3: Buffer Cap Percent */}
            <div className="p-4 rounded-card bg-canvas/70 dark:bg-canvas-dark/50 border border-matcha/15 dark:border-matcha/25 space-y-2.5">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-ink dark:text-ink-dark flex items-center gap-1.5 font-sans">
                  <span>🛡️ Maximum Recommended Safety Buffer Cap</span>
                </label>
                <span className="font-mono text-sm font-bold text-matcha-dark dark:text-matcha-light bg-matcha/10 px-2.5 py-0.5 rounded-pill border border-matcha/20">
                  +{(settings.buffer_cap_percent * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.30"
                step="0.01"
                value={settings.buffer_cap_percent}
                onChange={(e) =>
                  setSettings({ ...settings, buffer_cap_percent: parseFloat(e.target.value) })
                }
                className="w-full accent-matcha cursor-pointer h-2 bg-matcha/10 rounded-lg"
              />
              <div className="text-[10px] text-ink-muted font-mono flex justify-between">
                <span>Guardrail preventing recommended prep from exceeding mean demand ratio</span>
                <span>Range: +5% – +30%</span>
              </div>
            </div>

            {/* Quirky Diner Receipt: Real-Time Newsvendor Equilibrium */}
            <div className="p-5 rounded-card bg-yuzu/15 dark:bg-yuzu/10 border-2 border-dashed border-yuzu/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-ink-muted flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-persimmon" />
                  Live Equilibrium Equilibrium Receipt
                </span>
                <span className="sticker-badge bg-white dark:bg-surface-dark border-matcha/20 font-mono text-[10px]">
                  FRACTILE DIAL
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <span className="text-xs font-sans text-ink-muted font-medium">Critical Fractile Quantile (q*):</span>
                <div className="font-mono text-xl font-bold text-matcha-dark dark:text-yuzu flex items-baseline gap-2">
                  <span>q* = {liveQStar.toFixed(3)}</span>
                  <span className="text-xs font-normal text-ink-muted">
                    ({settings.stockout_cost} / [{settings.stockout_cost} + {settings.waste_cost}])
                  </span>
                </div>
              </div>

              {/* Progress Bar of fractile */}
              <div className="w-full bg-matcha/10 dark:bg-matcha/20 h-2.5 rounded-pill overflow-hidden relative">
                <div
                  className="bg-gradient-to-r from-yuzu to-persimmon h-full rounded-pill transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, liveQStar * 100))}%` }}
                />
              </div>

              <div className="text-[11px] text-ink dark:text-cream/90 leading-relaxed font-sans pt-2 border-t border-yuzu/30">
                {liveQStar >= 0.70 ? (
                  <div className="flex items-start gap-2">
                    <span className="text-base">🛡️</span>
                    <span>
                      <strong>Protective Safety Buffer Policy:</strong> Stockout penalties dominate waste costs. The model will recommend preparing upper-quantile buffers to ensure zero student stockouts.
                    </span>
                  </div>
                ) : liveQStar <= 0.40 ? (
                  <div className="flex items-start gap-2">
                    <span className="text-base">🌱</span>
                    <span>
                      <strong>Lean Anti-Waste Policy:</strong> Waste costs dominate stockouts. The model will recommend conservative preparation strictly near or below median expectation.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="text-base">⚖️</span>
                    <span>
                      <strong>Balanced Symmetry Policy:</strong> Unit costs are in close parity. Preparation targets are centered around the median expected distribution.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleSaveSettings}
                className="btn-tactile flex items-center gap-2 px-5 py-2.5 rounded-card bg-matcha hover:bg-matcha-hover text-cream text-xs font-bold shadow-tactile transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 text-yuzu" />
                <span>Save Newsvendor Economics</span>
              </button>

              {settingsSaved && (
                <span className="text-xs font-mono text-matcha-dark dark:text-matcha-light flex items-center gap-1.5 font-bold animate-spring">
                  <Check className="w-4 h-4" />
                  Persisted to MongoDB `settings`
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: Menu Catalog Management */}
      {activeTab === 'menu' && (
        <section aria-label="Menu Catalog" className="space-y-4">
          <div className="quirky-card overflow-hidden">
            <div className="p-4 bg-matcha/5 border-b border-matcha/15 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-matcha-dark dark:text-cream">
                  Active Dining Hall Catalog ({menuItems.length} Dishes)
                </h3>
                <p className="text-xs text-ink-muted">
                  Toggle kitchen items on or off the forecast radar and adjust base cafeteria pricing.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-canvas/80 dark:bg-canvas-dark/80 border-b border-matcha/15 text-ink-muted text-[10px] font-sans font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Dish Code</th>
                    <th className="py-3 px-4">Dish Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Counter Price (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-matcha/10 dark:divide-matcha/20">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-matcha/5 transition-colors">
                      <td className="py-3 px-4 text-ink-muted font-mono text-[11px] font-semibold">{item.id}</td>
                      <td className="py-3 px-4 font-bold text-ink dark:text-ink-dark font-sans text-sm">
                        <span className="mr-2 text-base">{getDishEmoji(item.category)}</span>
                        {item.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="sticker-badge bg-canvas text-ink-muted border-matcha/20 uppercase text-[9px] font-mono">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 font-mono">
                          <span className="text-ink-muted">₹</span>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleUpdatePrice(item.id, parseFloat(e.target.value) || 0)}
                            className="w-16 text-right font-mono font-bold p-1 rounded-md bg-canvas dark:bg-canvas-dark border border-matcha/20 text-xs tabular-nums outline-none focus:border-matcha"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`sticker-badge text-[9px] font-mono ${
                            item.active
                              ? 'bg-matcha/15 text-matcha-dark dark:text-matcha-light border-matcha/30'
                              : 'bg-black/5 dark:bg-white/5 text-ink-muted border-ink-muted/30'
                          }`}
                        >
                          {item.active ? '● ACTIVE' : '○ INACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleMenu(item.id, item.active)}
                          className={`btn-tactile px-3 py-1 text-[11px] rounded-card border font-sans font-bold transition-all cursor-pointer ${
                            item.active
                              ? 'border-berry/30 text-berry hover:bg-berry/10'
                              : 'border-matcha/30 text-matcha-dark hover:bg-matcha/10'
                          }`}
                        >
                          {item.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: Calendar Context Editor */}
      {activeTab === 'calendar' && (
        <section aria-label="Calendar Context" className="max-w-xl space-y-4">
          <div className="quirky-card p-6 space-y-5">
            <div className="border-b border-matcha/15 pb-4">
              <span className="sticker-badge bg-lavender/25 text-ink dark:text-lavender border-lavender/40 font-mono">
                EXTERNAL SIGNAL
              </span>
              <h2 className="font-serif text-2xl font-bold text-matcha-dark dark:text-cream mt-1.5">
                Campus Environment Override 🌤️
              </h2>
              <p className="text-xs text-ink-muted mt-1 font-sans">
                Injected into the ML feature pipeline as day-level regressors for weather and student population swings.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink dark:text-ink-dark font-sans">
                Service Calendar Date:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full font-mono text-xs p-2.5 rounded-card bg-canvas dark:bg-canvas-dark border border-matcha/25 text-ink dark:text-ink-dark outline-none cursor-pointer focus:border-matcha"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink dark:text-ink-dark font-sans">
                Weather Forecast Signal:
              </label>
              <select
                value={calendarContext.weather}
                onChange={(e) => setCalendarContext({ ...calendarContext, weather: e.target.value })}
                className="w-full font-mono text-xs p-2.5 rounded-card bg-canvas dark:bg-canvas-dark border border-matcha/25 text-ink dark:text-ink-dark outline-none cursor-pointer focus:border-matcha"
              >
                <option value="clear">☀️ Clear / Sunny (Standard baseline attendance)</option>
                <option value="rainy">🌧️ Monsoon / Heavy Rain (+22% hot snack surge)</option>
                <option value="hot">🔥 Scorching Heat (Cold beverage volume surge)</option>
                <option value="cloudy">☁️ Cloudy / Overcast</option>
              </select>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-matcha/15 text-xs font-sans">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-card hover:bg-matcha/5 border border-transparent hover:border-matcha/15 transition-all">
                <input
                  type="checkbox"
                  checked={calendarContext.campus_event}
                  onChange={(e) =>
                    setCalendarContext({ ...calendarContext, campus_event: e.target.checked })
                  }
                  className="w-4 h-4 accent-matcha cursor-pointer"
                />
                <div>
                  <div className="font-bold text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <span>🎉 Campus Fest / Cultural Event</span>
                    <span className="sticker-badge bg-persimmon/15 text-persimmon border-persimmon/30 font-mono text-[9px]">
                      +25% SURGE
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-muted">High footfall surge across all dining service counters</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-card hover:bg-matcha/5 border border-transparent hover:border-matcha/15 transition-all">
                <input
                  type="checkbox"
                  checked={calendarContext.exam_week}
                  onChange={(e) =>
                    setCalendarContext({ ...calendarContext, exam_week: e.target.checked })
                  }
                  className="w-4 h-4 accent-matcha cursor-pointer"
                />
                <div>
                  <div className="font-bold text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <span>📚 Midterm / Final Exam Period</span>
                    <span className="sticker-badge bg-yuzu/25 text-ink dark:text-yuzu border-yuzu/40 font-mono text-[9px]">
                      QUICK SNACKS
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-muted">Shift towards late-night comfort foods and grab-and-go portions</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-card hover:bg-matcha/5 border border-transparent hover:border-matcha/15 transition-all">
                <input
                  type="checkbox"
                  checked={calendarContext.holiday}
                  onChange={(e) =>
                    setCalendarContext({ ...calendarContext, holiday: e.target.checked })
                  }
                  className="w-4 h-4 accent-matcha cursor-pointer"
                />
                <div>
                  <div className="font-bold text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <span>🏖️ Campus Break / Public Holiday</span>
                    <span className="sticker-badge bg-berry/15 text-berry border-berry/30 font-mono text-[9px]">
                      -50% REDUCTION
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-muted">Severe drop in dormitory footfall and dining hall attendance</div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleSaveCalendar}
                className="btn-tactile flex items-center gap-2 px-5 py-2.5 rounded-card bg-matcha hover:bg-matcha-hover text-cream text-xs font-bold shadow-tactile transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 text-yuzu" />
                <span>Save Calendar Context</span>
              </button>

              {calendarSaved && (
                <span className="text-xs font-mono text-matcha-dark dark:text-matcha-light flex items-center gap-1.5 font-bold animate-spring">
                  <Check className="w-4 h-4" />
                  Synced to feature pipeline
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: CSV History Importer */}
      {activeTab === 'import' && (
        <section aria-label="CSV Importer" className="max-w-2xl space-y-4">
          <div className="quirky-card p-6 space-y-5">
            <div className="border-b border-matcha/15 pb-4">
              <span className="sticker-badge bg-berry/15 text-berry border-berry/30 font-mono">
                DATA PIPELINE
              </span>
              <h2 className="font-serif text-2xl font-bold text-matcha-dark dark:text-cream mt-1.5">
                Batch Ingest Cafeteria POS Logs 📥
              </h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed font-sans">
                Upload historical POS records. Every row is rigorously evaluated against schema constraints and physical dining invariant: portions sold &le; portions prepared.
              </p>
            </div>

            <div className="border-2 border-dashed border-matcha/30 rounded-card p-8 text-center space-y-3 bg-canvas/60 dark:bg-canvas-dark/60 hover:border-matcha transition-colors">
              <div className="w-12 h-12 rounded-full bg-matcha/10 flex items-center justify-center mx-auto text-matcha">
                <UploadCloud className="w-6 h-6" strokeWidth={2} />
              </div>
              <div>
                <div className="text-sm font-bold text-ink dark:text-ink-dark font-sans">
                  Select POS Observation CSV File
                </div>
                <div className="text-[11px] text-ink-muted font-mono mt-0.5">
                  Headers required: date, service, item_id, portions_prepared, portions_sold
                </div>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="text-xs text-ink-muted file:mr-4 file:py-2 file:px-4 file:rounded-card file:border-0 file:text-xs file:font-bold file:bg-matcha file:text-cream hover:file:bg-matcha-hover cursor-pointer"
              />
            </div>

            <button
              onClick={handleCsvUpload}
              disabled={!importFile || importLoading}
              className="btn-tactile flex items-center gap-2 px-5 py-2.5 rounded-card bg-matcha hover:bg-matcha-hover text-cream text-xs font-bold shadow-tactile transition-all disabled:opacity-50 cursor-pointer"
            >
              {importLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-yuzu" strokeWidth={2} />
                  <span>Validating Invariants & Ingesting...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-yuzu" />
                  <span>Ingest Records into MongoDB</span>
                </>
              )}
            </button>

            {/* Row-Level Rejection Report */}
            {importReport && (
              <div className="mt-4 p-4 rounded-card bg-canvas/80 dark:bg-canvas-dark/80 border border-matcha/20 text-xs font-mono space-y-3">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-matcha-dark dark:text-matcha-light flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    Accepted: {importReport.accepted_count}
                  </span>
                  <span className={importReport.rejected_count > 0 ? 'text-berry flex items-center gap-1.5' : 'text-ink-muted'}>
                    <ShieldAlert className="w-4 h-4" />
                    Rejected: {importReport.rejected_count}
                  </span>
                </div>

                {importReport.rejected_details && importReport.rejected_details.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-matcha/15 text-[11px] text-berry max-h-48 overflow-y-auto">
                    {importReport.rejected_details.map((rej: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        <span>Row {rej.row}: {rej.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
