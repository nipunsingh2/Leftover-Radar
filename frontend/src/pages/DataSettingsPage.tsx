import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Check,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  api,
  SettingsData,
} from '../api/client';

export const DataSettingsPage: React.FC = () => {
  // Settings State
  const [settings, setSettings] = useState<SettingsData>({
    waste_cost: 30.0,
    stockout_cost: 70.0,
    buffer_cap_percent: 0.15,
    critical_fractile: 0.70,
  });
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const notifyError = (err: unknown, fallback: string) => {
    console.error(err);
    const msg = err instanceof Error ? err.message : fallback;
    setActionError(msg);
    setTimeout(() => setActionError(null), 5000);
  };

  // Load active Newsvendor settings on mount
  useEffect(() => {
    api
      .getSettings()
      .then((data) => {
        setSettings({
          waste_cost: data.waste_cost ?? 30.0,
          stockout_cost: data.stockout_cost ?? 70.0,
          buffer_cap_percent: data.buffer_cap_percent ?? 0.15,
          critical_fractile: data.critical_fractile ?? 0.70,
        });
      })
      .catch((err) => notifyError(err, 'Failed to load Newsvendor settings.'));
  }, []);

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
      notifyError(err, 'Failed to save Newsvendor cost settings.');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto select-none">
      {/* Header */}
      <div className="border-b-2 border-matcha/20 dark:border-matcha/30 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="sticker-badge bg-yuzu/25 text-ink dark:text-yuzu border-yuzu/40 font-mono">
              FINANCIAL OPTIMIZATION
            </span>
            <span className="text-[11px] font-mono text-ink-muted">
              Stochastic Newsvendor Loss Engine
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-matcha-dark dark:text-cream">
            Unit Economics & Risk Calibration
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl font-sans">
            Calibrate asymmetric unit risk costs to dynamically determine optimal preparation safety buffers above median demand expectations.
          </p>
        </div>
      </div>

      {/* Visual Error Banner */}
      {actionError && (
        <div className="p-3.5 rounded-2xl bg-berry/10 border border-berry/30 text-berry text-xs font-mono flex items-center justify-between shadow-tactile animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ Error:</span>
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-[11px] underline font-bold hover:text-berry-dark cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Cost Sliders & Newsvendor Parameterization */}
      <section aria-label="Cost Parameters" className="space-y-5">
        <div className="quirky-card p-6 space-y-6">
          <div className="border-b border-matcha/10 dark:border-matcha/20 pb-4">
            <div className="flex items-center gap-2">
              <span className="sticker-badge bg-matcha/15 text-matcha-dark dark:text-matcha-light border-matcha/30 font-mono">
                EQUILIBRIUM FORMULA
              </span>
              <span className="text-xs font-mono text-ink-muted">q* = c_s / (c_s + c_w)</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-matcha-dark dark:text-cream mt-1.5">
              Loss & Shortage Cost Calibration
            </h2>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              The classical stochastic Newsvendor formulation balances the tangible cost of over-preparation (spoilage, disposal) against the penalty of stockouts (missed revenue, unhappy campus diners). Modulating these coefficients updates the target critical fractile instantaneously.
            </p>
          </div>

          {/* Slider 1: Waste Cost (c_w) */}
          <div className="p-4 rounded-card bg-canvas/70 dark:bg-canvas-dark/50 border border-matcha/15 dark:border-matcha/25 space-y-2.5">
            <div className="flex justify-between items-baseline">
              <label className="text-xs font-bold text-ink dark:text-ink-dark flex items-center gap-1.5 font-sans">
                <span>Unit Waste Disposal Cost (c_w)</span>
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
              <span>Direct ingredient, refrigeration, and disposal loss</span>
              <span>Range: ₹5 – ₹120</span>
            </div>
          </div>

          {/* Slider 2: Stockout Cost (c_s) */}
          <div className="p-4 rounded-card bg-canvas/70 dark:bg-canvas-dark/50 border border-matcha/15 dark:border-matcha/25 space-y-2.5">
            <div className="flex justify-between items-baseline">
              <label className="text-xs font-bold text-ink dark:text-ink-dark flex items-center gap-1.5 font-sans">
                <span>Unit Stockout Penalty (c_s)</span>
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
              <span>Student dissatisfaction & lost counter gross margin</span>
              <span>Range: ₹10 – ₹200</span>
            </div>
          </div>

          {/* Slider 3: Buffer Cap Percent */}
          <div className="p-4 rounded-card bg-canvas/70 dark:bg-canvas-dark/50 border border-matcha/15 dark:border-matcha/25 space-y-2.5">
            <div className="flex justify-between items-baseline">
              <label className="text-xs font-bold text-ink dark:text-ink-dark flex items-center gap-1.5 font-sans">
                <span>Maximum Recommended Safety Buffer Cap</span>
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
                Live Equilibrium Receipt
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
                  <span className="w-2 h-2 rounded-full bg-matcha mt-1.5 shrink-0" />
                  <span>
                    <strong>Protective Safety Buffer Policy:</strong> Stockout penalties dominate waste costs. The model will recommend preparing upper-quantile buffers to ensure zero student stockouts.
                  </span>
                </div>
              ) : liveQStar <= 0.40 ? (
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-persimmon mt-1.5 shrink-0" />
                  <span>
                    <strong>Lean Anti-Waste Policy:</strong> Waste costs dominate stockouts. The model will recommend conservative preparation strictly near or below median expectation.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-yuzu mt-1.5 shrink-0" />
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
                Persisted to MongoDB settings
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
