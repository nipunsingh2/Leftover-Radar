import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Utensils,
  Calendar,
  UploadCloud,
  Check,
  AlertCircle,
  Save,
  Loader2,
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
  const [menuLoading, setMenuLoading] = useState<boolean>(false);

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

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-ink-hairline dark:border-ink-dark-hairline pb-4 flex justify-between items-end">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-forest dark:text-forest-dark font-semibold">
            Cafeteria Configuration
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink dark:text-ink-dark mt-1">
            Data, Catalogs & Cost Settings
          </h1>
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-0.5">
            Configure Newsvendor cost parameters, manage rotating Indian menu items, adjust campus calendar context, and import POS history.
          </p>
        </div>
      </div>

      {/* Segmented Sub-Navigation */}
      <div className="flex border-b border-ink-hairline dark:border-ink-dark-hairline gap-6 text-xs font-mono">
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'settings'
              ? 'border-forest text-forest dark:text-forest-dark'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Newsvendor Cost Parameters</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'menu'
              ? 'border-forest text-forest dark:text-forest-dark'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Utensils className="w-3.5 h-3.5" />
          <span>Menu Catalog ({menuItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'calendar'
              ? 'border-forest text-forest dark:text-forest-dark'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Calendar Context Editor</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'import'
              ? 'border-forest text-forest dark:text-forest-dark'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>CSV History Importer</span>
        </button>
      </div>

      {/* TAB 1: Cost Sliders & Newsvendor Parameterization */}
      {activeTab === 'settings' && (
        <section aria-label="Cost Parameters" className="max-w-2xl space-y-6">
          <div className="p-6 rounded-ticket bg-surface dark:bg-surface-dark border border-ink-hairline dark:border-ink-dark-hairline space-y-6">
            <div>
              <h2 className="font-serif text-lg font-bold text-ink dark:text-ink-dark">
                Cost-Aware Newsvendor Buffer Configuration
              </h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                The Newsvendor model balances the cost of over-preparation (waste) against under-preparation (lost student sale).
                Adjusting these values shifts the optimal buffer quantile in real time.
              </p>
            </div>

            {/* Slider 1: Waste Cost (c_w) */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-ink dark:text-ink-dark">
                  Cost per Wasted Portion (c_w)
                </label>
                <span className="font-mono text-sm font-bold text-ink dark:text-ink-dark">
                  ₹{settings.waste_cost}
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
                className="w-full accent-forest cursor-pointer"
              />
              <p className="text-[11px] text-ink-muted font-mono">
                Direct ingredient and disposal cost of unconsumed food portions.
              </p>
            </div>

            {/* Slider 2: Stockout Cost (c_s) */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-ink dark:text-ink-dark">
                  Cost per Missed Sale (c_s)
                </label>
                <span className="font-mono text-sm font-bold text-ink dark:text-ink-dark">
                  ₹{settings.stockout_cost}
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
                className="w-full accent-forest cursor-pointer"
              />
              <p className="text-[11px] text-ink-muted font-mono">
                Lost revenue and student dissatisfaction cost when a dish runs out prematurely.
              </p>
            </div>

            {/* Slider 3: Buffer Cap Percent */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-ink dark:text-ink-dark">
                  Maximum Buffer Cap
                </label>
                <span className="font-mono text-sm font-bold text-ink dark:text-ink-dark">
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
                className="w-full accent-forest cursor-pointer"
              />
              <p className="text-[11px] text-ink-muted font-mono">
                Safety ceiling: prevents the buffer from exceeding this percentage of expected demand.
              </p>
            </div>

            {/* Live Explanation Readout Box (Section 9.6) */}
            <div className="p-4 rounded-control bg-canvas dark:bg-canvas-dark border border-ink-hairline text-xs font-mono space-y-2">
              <div className="text-[10px] uppercase text-forest font-bold">
                Real-Time Newsvendor Equilibrium
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Critical Fractile:</span>
                <span className="font-bold text-forest">
                  q* = {liveQStar.toFixed(2)} ({settings.stockout_cost} / ({settings.stockout_cost} + {settings.waste_cost}))
                </span>
              </div>
              <div className="text-[11px] text-ink-muted leading-relaxed font-sans">
                {liveQStar >= 0.70 ? (
                  <span>
                    Stockout cost outweighs waste: recommending a <strong>generous safety buffer</strong> to protect diner satisfaction.
                  </span>
                ) : liveQStar <= 0.40 ? (
                  <span>
                    Waste cost outweighs stockouts: recommending a <strong>lean, conservative preparation</strong> to minimize food disposal.
                  </span>
                ) : (
                  <span>
                    Balanced cost profile: recommending preparation near the <strong>median demand</strong>.
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-5 py-2.5 rounded-control bg-forest hover:bg-forest-hover text-[#F6F1E7] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Cost Parameters</span>
              </button>

              {settingsSaved && (
                <span className="text-xs font-mono text-forest flex items-center gap-1 font-semibold">
                  <Check className="w-4 h-4" />
                  Saved into MongoDB settings
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: Menu Catalog Management */}
      {activeTab === 'menu' && (
        <section aria-label="Menu Catalog" className="space-y-4">
          <div className="border border-ink-hairline dark:border-ink-dark-hairline rounded-ticket bg-surface dark:bg-surface-dark overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-canvas dark:bg-canvas-dark border-b border-ink-hairline text-ink-muted text-[11px] uppercase">
                <tr>
                  <th className="p-3">Dish Identifier</th>
                  <th className="p-3">Dish Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Price (₹)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-hairline dark:divide-ink-dark-hairline">
                {menuItems.map((item) => (
                  <tr key={item.id} className="hover:bg-canvas/50">
                    <td className="p-3 text-ink-muted">{item.id}</td>
                    <td className="p-3 font-sans font-semibold text-ink dark:text-ink-dark">{item.name}</td>
                    <td className="p-3 uppercase text-[10px] text-ink-muted">{item.category}</td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleUpdatePrice(item.id, parseFloat(e.target.value) || 0)}
                        className="w-16 text-right font-mono p-1 rounded bg-canvas border border-ink-hairline text-xs"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.active ? 'bg-sage-tint text-forest' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleMenu(item.id, item.active)}
                        className="px-2.5 py-1 text-[10px] rounded border border-ink-hairline hover:bg-canvas transition-colors font-sans"
                      >
                        {item.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: Calendar Context Editor */}
      {activeTab === 'calendar' && (
        <section aria-label="Calendar Context" className="max-w-xl space-y-4">
          <div className="p-6 rounded-ticket bg-surface dark:bg-surface-dark border border-ink-hairline space-y-4">
            <h2 className="font-serif text-lg font-bold text-ink dark:text-ink-dark">
              Campus Context for Service Date
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-mono text-ink-muted">Service Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full font-mono text-xs p-2 rounded bg-canvas border border-ink-hairline text-ink outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-ink-muted">Weather Forecast:</label>
              <select
                value={calendarContext.weather}
                onChange={(e) => setCalendarContext({ ...calendarContext, weather: e.target.value })}
                className="w-full font-mono text-xs p-2 rounded bg-canvas border border-ink-hairline text-ink outline-none"
              >
                <option value="clear">Clear / Sunny (Standard)</option>
                <option value="rainy">Monsoon / Heavy Rain (+22% snack demand)</option>
                <option value="hot">Scorching Heat (Beverage surge)</option>
                <option value="cloudy">Cloudy / Overcast</option>
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t border-ink-hairline text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={calendarContext.campus_event}
                  onChange={(e) =>
                    setCalendarContext({ ...calendarContext, campus_event: e.target.checked })
                  }
                  className="accent-forest"
                />
                <span>Campus Event / Cultural Fest Scheduled (+25% footfall surge)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={calendarContext.exam_week}
                  onChange={(e) =>
                    setCalendarContext({ ...calendarContext, exam_week: e.target.checked })
                  }
                  className="accent-forest"
                />
                <span>Midterm or Finals Exam Week (Comfort food & coffee shift)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={calendarContext.holiday}
                  onChange={(e) =>
                    setCalendarContext({ ...calendarContext, holiday: e.target.checked })
                  }
                  className="accent-forest"
                />
                <span>Official Campus Holiday / Break (-50% occupancy)</span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleSaveCalendar}
                className="flex items-center gap-2 px-5 py-2.5 rounded-control bg-forest hover:bg-forest-hover text-[#F6F1E7] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Context</span>
              </button>

              {calendarSaved && (
                <span className="text-xs font-mono text-forest flex items-center gap-1 font-semibold">
                  <Check className="w-4 h-4" />
                  Calendar context updated
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: CSV History Importer */}
      {activeTab === 'import' && (
        <section aria-label="CSV Importer" className="max-w-2xl space-y-4">
          <div className="p-6 rounded-ticket bg-surface dark:bg-surface-dark border border-ink-hairline space-y-4">
            <h2 className="font-serif text-lg font-bold text-ink dark:text-ink-dark">
              Upload Cafeteria POS Service Log
            </h2>
            <p className="text-xs text-ink-muted">
              Import historical service records via CSV. Every row is strictly validated against schema constraints and the sold &le; prepared invariant.
            </p>

            <div className="border-2 border-dashed border-ink-hairline rounded-ticket p-6 text-center space-y-2 bg-canvas">
              <UploadCloud className="w-8 h-8 mx-auto text-forest" />
              <div className="text-xs text-ink font-medium">Select POS observations CSV file</div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="text-xs text-ink-muted file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-forest file:text-white hover:file:bg-forest-hover cursor-pointer"
              />
            </div>

            <button
              onClick={handleCsvUpload}
              disabled={!importFile || importLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-control bg-forest hover:bg-forest-hover text-[#F6F1E7] text-xs font-semibold shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
            >
              {importLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating & Importing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Import Records</span>
                </>
              )}
            </button>

            {/* Row-Level Rejection Report */}
            {importReport && (
              <div className="mt-4 p-4 rounded-control bg-canvas border border-ink-hairline text-xs font-mono space-y-2">
                <div className="flex justify-between font-bold">
                  <span>Accepted Rows: {importReport.accepted_count}</span>
                  <span className={importReport.rejected_count > 0 ? 'text-clay' : 'text-forest'}>
                    Rejected Rows: {importReport.rejected_count}
                  </span>
                </div>

                {importReport.rejected_details && importReport.rejected_details.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-ink-hairline text-[11px] text-clay max-h-48 overflow-y-auto">
                    {importReport.rejected_details.map((rej: any, idx: number) => (
                      <div key={idx}>
                        Row {rej.row}: {rej.reason}
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
