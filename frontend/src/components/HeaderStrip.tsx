import React from 'react';
import { ChevronLeft, ChevronRight, Printer, Sparkles, Loader2, Compass } from 'lucide-react';

interface HeaderStripProps {
  serviceDate: string;
  onDateChange: (date: string) => void;
  servicePeriod: 'breakfast' | 'lunch' | 'dinner';
  onPeriodChange: (period: 'breakfast' | 'lunch' | 'dinner') => void;
  onGenerateForecast: () => void;
  onOpenPrintSheet?: () => void;
  isGenerating?: boolean;
  modelVersion?: string;
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
}) => {
  // Format date e.g. "Saturday, 14 November 2026"
  const dateObj = new Date(serviceDate + 'T00:00:00');
  const formattedDay = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : serviceDate;
  const periodLabel = servicePeriod.charAt(0).toUpperCase() + servicePeriod.slice(1);

  const handleStepDay = (deltaDays: number) => {
    const cur = new Date(serviceDate + 'T00:00:00');
    cur.setDate(cur.getDate() + deltaDays);
    const iso = cur.toISOString().split('T')[0];
    onDateChange(iso);
  };

  return (
    <header className="glass-panel border-b border-gold/20 dark:border-white/10 px-8 py-4 flex flex-wrap items-center justify-between gap-5 sticky top-0 z-10">
      {/* Title & Service Date Stepper */}
      <div className="flex items-center gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="victorian-badge text-[10px] text-gold dark:text-gold tracking-widest font-bold">
              Service Orchestration
            </span>
            <span className="w-1 h-1 rounded-full bg-gold/50" />
            <span className="text-[10px] font-mono text-ink-muted dark:text-ink-dark-muted">
              {modelVersion} · 80% Conformal
            </span>
          </div>

          <h1 className="victorian-heading text-2xl md:text-3xl font-bold tracking-tight text-forest dark:text-gold mt-0.5">
            {periodLabel} Service <span className="text-ink-muted dark:text-ink-dark-muted font-normal text-xl">· {formattedDay}</span>
          </h1>
        </div>

        {/* Frosted Glass Date Stepper */}
        <div className="flex items-center bg-white/70 dark:bg-black/30 border border-gold/30 dark:border-white/15 rounded-xl p-1 shadow-xs backdrop-blur-md">
          <button
            onClick={() => handleStepDay(-1)}
            aria-label="Previous day"
            className="p-1.5 rounded-lg hover:bg-forest/10 dark:hover:bg-white/10 text-forest dark:text-gold transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          </button>

          <input
            type="date"
            value={serviceDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent text-xs font-mono font-semibold px-2.5 py-1 text-ink dark:text-ink-dark outline-none cursor-pointer"
          />

          <button
            onClick={() => handleStepDay(1)}
            aria-label="Next day"
            className="p-1.5 rounded-lg hover:bg-forest/10 dark:hover:bg-white/10 text-forest dark:text-gold transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Service Period Segmented Control & Actions */}
      <div className="flex items-center gap-3.5">
        {/* Segmented Meal Toggle with Frosted Glass Pill */}
        <div className="flex items-center p-1 bg-white/60 dark:bg-black/30 border border-gold/25 dark:border-white/15 rounded-xl text-xs font-medium backdrop-blur-md shadow-inner">
          {(['breakfast', 'lunch', 'dinner'] as const).map((p) => {
            const isSelected = servicePeriod === p;
            return (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-3.5 py-1.5 rounded-lg capitalize transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-forest to-forest-hover dark:from-gold dark:to-gold-deep text-white dark:text-black font-semibold shadow-md shadow-forest/20 dark:shadow-gold-glow/20'
                    : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Print Prep Sheet Button */}
        {onOpenPrintSheet && (
          <button
            onClick={onOpenPrintSheet}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gold/30 dark:border-white/15 bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-xs font-semibold text-forest dark:text-gold shadow-xs transition-all duration-200 hover:-translate-y-0.5 cursor-pointer backdrop-blur-md"
            title="Print Kitchen Preparation Ticket"
          >
            <Printer className="w-4 h-4" strokeWidth={1.75} />
            <span className="font-serif">Prep Ticket</span>
          </button>
        )}

        {/* Primary Generate Forecast Button */}
        <button
          onClick={onGenerateForecast}
          disabled={isGenerating}
          className="shimmer-hover flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-forest via-forest-hover to-forest text-gold-50 dark:from-gold dark:via-gold-300 dark:to-gold-deep dark:text-black text-xs font-semibold shadow-lg shadow-forest/25 dark:shadow-gold-glow/30 border border-gold/40 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              <span>Synthesizing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-gold dark:text-black" strokeWidth={2} />
              <span>Generate Forecast</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
