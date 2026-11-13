import React from 'react';
import { ChevronLeft, ChevronRight, Printer, Sparkles, Loader2, Calendar, Clock, Zap } from 'lucide-react';

interface HeaderStripProps {
  serviceDate: string;
  onDateChange: (date: string) => void;
  servicePeriod: 'breakfast' | 'lunch' | 'dinner';
  onPeriodChange: (period: 'breakfast' | 'lunch' | 'dinner') => void;
  onGenerateForecast: () => void;
  onOpenPrintSheet?: () => void;
  isGenerating?: boolean;
  modelVersion?: string;
  isClockSynced?: boolean;
  onToggleClockSync?: () => void;
  currentTimeStr?: string;
}

export const HeaderStrip: React.FC<HeaderStripProps> = ({
  serviceDate,
  onDateChange,
  servicePeriod,
  onPeriodChange,
  onGenerateForecast,
  onOpenPrintSheet,
  isGenerating = false,
  modelVersion = 'v3.production',
  isClockSynced = true,
  onToggleClockSync,
  currentTimeStr = '12:00 PM',
}) => {
  // Format date e.g. "Saturday, Nov 14, 2026"
  const dateObj = new Date(serviceDate + 'T00:00:00');
  const formattedDay = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
    : serviceDate;
  const periodLabel = servicePeriod.charAt(0).toUpperCase() + servicePeriod.slice(1);

  const mealEmojis = {
    breakfast: '🍳',
    lunch: '🥪',
    dinner: '🍛',
  };

  const handleStepDay = (deltaDays: number) => {
    const cur = new Date(serviceDate + 'T00:00:00');
    cur.setDate(cur.getDate() + deltaDays);
    const iso = cur.toISOString().split('T')[0];
    onDateChange(iso);
  };

  return (
    <div className="bg-surface/85 dark:bg-surface-dark/85 backdrop-blur-xl border-b border-ink-hairline dark:border-ink-dark-hairline px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-[58px] z-20 transition-all">
      {/* Title & Service Date Stepper */}
      <div className="flex items-center gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-matcha dark:text-matcha-light font-bold">
              Service Orchestration
            </span>
            <span className="w-1 h-1 rounded-full bg-persimmon" />
            <span className="text-[10px] font-mono text-ink-muted">
              Model {modelVersion} • 80% Conformal
            </span>
          </div>

          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink dark:text-ink-dark mt-0.5 flex items-center gap-2">
            <span>{mealEmojis[servicePeriod]}</span>
            <span>{periodLabel} Service</span>
            <span className="text-ink-muted dark:text-ink-dark-muted font-normal text-base font-sans">
              • {formattedDay}
            </span>
          </h1>
        </div>

        {/* Tactile Date Stepper Capsule */}
        <div className="flex items-center bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline rounded-2xl p-1 shadow-tactile">
          <button
            onClick={() => handleStepDay(-1)}
            aria-label="Previous day"
            className="p-1.5 rounded-xl hover:bg-surface dark:hover:bg-white/10 text-ink-muted hover:text-ink transition-colors cursor-pointer active:scale-90"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          </button>

          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="w-3.5 h-3.5 text-persimmon" />
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-ink dark:text-ink-dark outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => handleStepDay(1)}
            aria-label="Next day"
            className="p-1.5 rounded-xl hover:bg-surface dark:hover:bg-white/10 text-ink-muted hover:text-ink transition-colors cursor-pointer active:scale-90"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Service Period Segmented Control & Actions */}
      <div className="flex items-center flex-wrap gap-3">
        {/* Clock Sync Status Badge / Quick Toggle */}
        {onToggleClockSync && (
          <button
            onClick={onToggleClockSync}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-mono font-bold transition-all cursor-pointer ${
              isClockSynced
                ? 'bg-matcha/10 border-matcha/30 text-matcha-dark dark:text-cream shadow-xs'
                : 'bg-canvas-subtle dark:bg-white/5 border-persimmon/30 text-persimmon hover:bg-persimmon/10'
            }`}
            title={isClockSynced ? 'Service is synchronized with clock time. Click for manual mode.' : 'Manual service override. Click to sync with clock.'}
          >
            <Clock className={`w-3.5 h-3.5 ${isClockSynced ? 'text-matcha animate-pulse' : 'text-persimmon'}`} strokeWidth={2} />
            <span>{isClockSynced ? `Synced (${currentTimeStr})` : 'Manual Service'}</span>
            {!isClockSynced && (
              <span className="flex items-center gap-0.5 text-[9px] bg-persimmon text-white px-1.5 py-0.2 rounded-full">
                <Zap className="w-2.5 h-2.5" />
                Sync
              </span>
            )}
          </button>
        )}

        {/* Playful Segmented Meal Toggle */}
        <div className="flex items-center p-1 bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline rounded-2xl text-xs font-semibold shadow-tactile">
          {(['breakfast', 'lunch', 'dinner'] as const).map((p) => {
            const isSelected = servicePeriod === p;
            return (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl capitalize transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-matcha text-white font-bold shadow-xs scale-102'
                    : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink'
                }`}
              >
                <span>{mealEmojis[p]}</span>
                <span>{p}</span>
              </button>
            );
          })}
        </div>

        {/* Print Prep Sheet Button */}
        {onOpenPrintSheet && (
          <button
            onClick={onOpenPrintSheet}
            className="btn-tactile flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-surface-dark hover:bg-canvas-subtle text-xs font-bold text-ink dark:text-ink-dark cursor-pointer"
            title="Print Kitchen Preparation Ticket"
          >
            <Printer className="w-3.5 h-3.5 text-persimmon" strokeWidth={2} />
            <span>Prep Ticket</span>
          </button>
        )}

        {/* Primary Generate Forecast Button */}
        <button
          onClick={onGenerateForecast}
          disabled={isGenerating}
          className="btn-tactile flex items-center gap-2 px-5 py-2 rounded-2xl bg-persimmon hover:bg-persimmon-hover text-white text-xs font-bold shadow-quirky cursor-pointer disabled:opacity-60"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
              <span>Scanning Radar...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-yuzu" strokeWidth={2.5} />
              <span>Ping Radar Forecast</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
