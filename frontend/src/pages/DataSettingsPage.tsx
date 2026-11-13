import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Utensils,
  Calendar,
  UploadCloud,
  Check,
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
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-ink-hairline dark:border-ink-dark-hairline pb-4 flex justify-between items-end">
        <div>
          <div className="text-[10px] font-sans font-semibold text-racing dark:text-racing-dark uppercase tracking-wider">
            System Configuration & Catalogs
          </div>
          <h1 className="editorial-title text-2xl font-bold tracking-tight text-ink dark:text-ink-dark mt-0.5">
            Settings, Catalogs & Cost Parameters
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Configure Newsvendor unit costs, manage rotating cafeteria catalog items, adjust campus calendar context, and import POS observations.
          </p>
        </div>
      </div>

      {/* Segmented Sub-Navigation Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-racing text-white shadow-xs'
              : 'glass-card text-ink-muted hover:text-ink'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Newsvendor Parameters</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeTab === 'menu'
              ? 'bg-racing text-white shadow-xs'
              : 'glass-card text-ink-muted hover:text-ink'
          }`}
        >
          <Utensils className="w-3.5 h-3.5" />
          <span>Menu Catalog ({menuItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-racing text-white shadow-xs'
              : 'glass-card text-ink-muted hover:text-ink'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Calendar Context</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeTab === 'import'
              ? 'bg-racing text-white shadow-xs'
              : 'glass-card text-ink-muted hover:text-ink'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>CSV Importer</span>
        </button>
      </div>

      {/* TAB 1: Cost Sliders & Newsvendor Parameterization */}
      {activeTab === 'settings' && (
        <section aria-label="Cost Parameters" className="max-w-2xl space-y-4">
          <div className="glass-card p-6 space-y-5">
            <div>
              <span className="text-[10px] font-sans font-semibold text-racing dark:text-racing-dark uppercase tracking-wider">
                Economic Balance Function
              </span>
              <h2 className="editorial-title text-xl font-bold text-ink dark:text-ink-dark mt-0.5">
                Cost-Aware Newsvendor Buffer Configuration
              </h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                The classical Newsvendor model balances the financial loss of over-preparation (waste disposal) against the penalty of stockouts (unhappy diners).
                Modulating these parameters updates the critical fractile q* = c_s / (c_s + c_w) in real time.
              </p>
            </div>

            {/* Slider 1: Waste Cost (c_w) */}
            <div className="p-3.5 rounded-xl bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-ink dark:text-ink-dark">
                  Cost per Wasted Portion (c_w)
                </label>
                <span className="font-mono text-sm font-bold text-ochre tabular-nums">
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
                className="w-full accent-racing dark:accent-racing-dark cursor-pointer"
              />
              <div className="text-[10px] text-ink-muted font-mono flex justify-between">
                <span>Direct ingredient and disposal cost</span>
                <span>₹5 – ₹120</span>
              </div>
            </div>

            {/* Slider 2: Stockout Cost (c_s) */}
            <div className="p-3.5 rounded-xl bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-ink dark:text-ink-dark">
                  Cost per Missed Sale (c_s)
                </label>
                <span className="font-mono text-sm font-bold text-crimson tabular-nums">
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
                className="w-full accent-racing dark:accent-racing-dark cursor-pointer"
              />
              <div className="text-[10px] text-ink-muted font-mono flex justify-between">
                <span>Lost revenue & diner dissatisfaction penalty</span>
                <span>₹10 – ₹200</span>
              </div>
            </div>

            {/* Slider 3: Buffer Cap Percent */}
            <div className="p-3.5 rounded-xl bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-ink dark:text-ink-dark">
                  Maximum Recommended Buffer Cap
                </label>
                <span className="font-mono text-sm font-bold text-racing dark:text-racing-dark tabular-nums">
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
                className="w-full accent-racing dark:accent-racing-dark cursor-pointer"
              />
              <div className="text-[10px] text-ink-muted font-mono flex justify-between">
                <span>Prevents the buffer from exceeding this ratio of mean demand</span>
                <span>+5% – +30%</span>
              </div>
            </div>

            {/* Live Bento Explanation Readout Box */}
            <div className="p-4 rounded-xl bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline space-y-2 font-mono text-xs">
              <div className="text-[10px] font-sans font-semibold text-racing dark:text-racing-dark uppercase tracking-wider">
                Real-Time Newsvendor Equilibrium
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Critical Fractile:</span>
                <span className="editorial-title text-xl font-bold text-racing dark:text-racing-dark">
                  q* = {liveQStar.toFixed(2)} [{settings.stockout_cost} / ({settings.stockout_cost} + {settings.waste_cost})]
                </span>
              </div>
              <div className="text-[11px] text-ink-muted leading-relaxed font-sans pt-1 border-t border-ink-hairline dark:border-ink-dark-hairline">
                {liveQStar >= 0.70 ? (
                  <span>
                    Stockout penalties outweigh waste: model recommends a <strong>protective safety buffer</strong> to safeguard student satisfaction.
                  </span>
                ) : liveQStar <= 0.40 ? (
                  <span>
                    Waste costs outweigh stockout penalties: model recommends a <strong>lean, conservative preparation</strong> to curb culinary waste.
                  </span>
                ) : (
                  <span>
                    Balanced cost profile: model recommends preparation close to the <strong>median expected demand</strong>.
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-racing hover:bg-racing-hover text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                <span>Save Cost Parameters</span>
              </button>

              {settingsSaved && (
                <span className="text-xs font-mono text-racing dark:text-racing-dark flex items-center gap-1.5 font-bold">
                  <Check className="w-4 h-4" />
                  Saved into MongoDB `settings` collection
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: Menu Catalog Management */}
      {activeTab === 'menu' && (
        <section aria-label="Menu Catalog" className="space-y-3">
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-canvas-subtle/80 dark:bg-white/5 border-b border-ink-hairline dark:border-ink-dark-hairline text-ink-muted text-[10px] font-sans font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Dish Identifier</th>
                  <th className="py-3 px-4">Dish Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Price (₹)</th>
                  <th className="py-3 px-4 text-center">Catalog Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-hairline dark:divide-ink-dark-hairline">
                {menuItems.map((item) => (
                  <tr key={item.id} className="hover:bg-canvas-subtle/50 transition-colors">
                    <td className="py-2.5 px-4 text-ink-muted font-mono">{item.id}</td>
                    <td className="py-2.5 px-4 font-semibold text-ink dark:text-ink-dark font-sans text-sm">{item.name}</td>
                    <td className="py-2.5 px-4 uppercase text-[10px] text-ink-muted">{item.category}</td>
                    <td className="py-2.5 px-4 text-right">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleUpdatePrice(item.id, parseFloat(e.target.value) || 0)}
                        className="w-16 text-right font-mono font-medium p-1 rounded-md bg-canvas-subtle dark:bg-black/30 border border-ink-hairline dark:border-ink-dark-hairline text-xs tabular-nums outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`text-[9px] font-sans px-2 py-0.5 rounded-full font-bold uppercase ${
                          item.active
                            ? 'bg-racing/10 text-racing dark:text-racing-dark'
                            : 'bg-black/10 text-ink-muted'
                        }`}
                      >
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleMenu(item.id, item.active)}
                        className="px-2.5 py-1 text-[11px] rounded-md border border-ink-hairline dark:border-ink-dark-hairline hover:bg-canvas-subtle font-sans transition-colors cursor-pointer"
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
          <div className="glass-card p-6 space-y-4">
            <div>
              <span className="text-[10px] font-sans font-semibold text-racing dark:text-racing-dark uppercase tracking-wider">
                Exogenous Environmental Factors
              </span>
              <h2 className="editorial-title text-xl font-bold text-ink dark:text-ink-dark mt-0.5">
                Campus Context for Target Service Date
              </h2>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-ink-muted">Service Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full font-mono text-xs p-2 rounded-lg bg-canvas-subtle dark:bg-black/30 border border-ink-hairline dark:border-ink-dark-hairline text-ink dark:text-ink-dark outline-none cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-ink-muted">Weather Forecast Condition:</label>
              <select
                value={calendarContext.weather}
                onChange={(e) => setCalendarContext({ ...calendarContext, weather: e.target.value })}
                className="w-full font-mono text-xs p-2 rounded-lg bg-canvas-subtle dark:bg-black/30 border border-ink-hairline dark:border-ink-dark-hairline text-ink dark:text-ink-dark outline-none cursor-pointer"
              >
                <option value="clear">Clear / Sunny (Standard baseline attendance)</option>
                <option value="rainy">Monsoon / Heavy Rain (+22% hot snack surge)</option>
                <option value="hot">Scorching Heat (Cold beverage volume surge)</option>
                <option value="cloudy">Cloudy / Overcast</option>
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t border-ink-hairline dark:border-ink-dark-hairline text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-lg hover:bg-canvas-subtle transition-colors">
                <input
                  type="checkbox"
                  checked={calendarContext.campus_event}
                  onChange={(e) =>
                    setCalendarContext({ ...calendarContext, campus_event: e.target.checked })
                  }
                  className="w-4 h-4 accent-racing"
                />
                <div>
                  <div className="font-semibold text-ink dark:text-ink-dark">Campus Event / Cultural Fest Scheduled</div>
                  <div className="text-[11px] text-ink-muted">+25% footfall surge across all service counters</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-lg hover:bg-canvas-subtle transition-colors">
                <input
                  type="checkbox"
                  checked={calendarContext.exam_week}
                  onChange={(e) =>
                    setCalendarContext({ ...calendarContext, exam_week: e.target.checked })
                  }
                  className="w-4 h-4 accent-racing"
                />
                <div>
                  <div className="font-semibold text-ink dark:text-ink-dark">Midterm / Final Exam Period</div>
                  <div className="text-[11px] text-ink-muted">Comfort food and quick grab-and-go shifts</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-lg hover:bg-canvas-subtle transition-colors">
                <input
                  type="checkbox"
                  checked={calendarContext.holiday}
                  onChange={(e) =>
                    setCalendarContext({ ...calendarContext, holiday: e.target.checked })
                  }
                  className="w-4 h-4 accent-racing"
                />
                <div>
                  <div className="font-semibold text-ink dark:text-ink-dark">Official Campus Holiday / Break</div>
                  <div className="text-[11px] text-ink-muted">-50% dining hall occupancy reduction</div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleSaveCalendar}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-racing hover:bg-racing-hover text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                <span>Save Environmental Context</span>
              </button>

              {calendarSaved && (
                <span className="text-xs font-mono text-racing dark:text-racing-dark flex items-center gap-1.5 font-bold">
                  <Check className="w-4 h-4" />
                  Calendar context saved
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: CSV History Importer */}
      {activeTab === 'import' && (
        <section aria-label="CSV Importer" className="max-w-2xl space-y-4">
          <div className="glass-card p-6 space-y-4">
            <div>
              <span className="text-[10px] font-sans font-semibold text-racing dark:text-racing-dark uppercase tracking-wider">
                Batch Historical Ingestion
              </span>
              <h2 className="editorial-title text-xl font-bold text-ink dark:text-ink-dark mt-0.5">
                Upload Cafeteria POS Service Log
              </h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Import historical observations via CSV. Every row is strictly verified against schema constraints and the invariant: portions sold &le; portions prepared.
              </p>
            </div>

            <div className="border-2 border-dashed border-ink-hairline dark:border-ink-dark-hairline rounded-xl p-6 text-center space-y-2 bg-canvas-subtle/50 dark:bg-black/20 hover:border-racing transition-colors">
              <UploadCloud className="w-8 h-8 mx-auto text-racing dark:text-racing-dark" strokeWidth={1.5} />
              <div className="text-xs font-semibold text-ink dark:text-ink-dark">Select POS Observation CSV File</div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="text-xs text-ink-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-racing file:text-white hover:file:bg-racing-hover cursor-pointer"
              />
            </div>

            <button
              onClick={handleCsvUpload}
              disabled={!importFile || importLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-racing hover:bg-racing-hover text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60 cursor-pointer active:scale-[0.98]"
            >
              {importLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                  <span>Validating Schema & Importing...</span>
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
              <div className="mt-4 p-4 rounded-xl bg-canvas-subtle dark:bg-black/30 border border-ink-hairline dark:border-ink-dark-hairline text-xs font-mono space-y-2">
                <div className="flex justify-between font-bold">
                  <span>Accepted Observations: {importReport.accepted_count}</span>
                  <span className={importReport.rejected_count > 0 ? 'text-crimson' : 'text-racing dark:text-racing-dark'}>
                    Rejected Observations: {importReport.rejected_count}
                  </span>
                </div>

                {importReport.rejected_details && importReport.rejected_details.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-ink-hairline dark:border-ink-dark-hairline text-[11px] text-crimson max-h-48 overflow-y-auto">
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
