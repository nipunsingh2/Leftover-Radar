import React from 'react';
import { ChevronLeft, ChevronRight, Printer, Sparkles, Loader2 } from 'lucide-react';

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
  // Format date e.g. "Saturday, Nov 14, 2026"
  const dateObj = new Date(serviceDate + 'T00:00:00');
  const formattedDay = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
    : serviceDate;
  const periodLabel = servicePeriod.charAt(0).toUpperCase() + servicePeriod.slice(1);

  const handleStepDay = (deltaDays: number) => {
    const cur = new Date(serviceDate + 'T00:00:00');
    cur.setDate(cur.getDate() + deltaDays);
    const iso = cur.toISOString().split('T')[0];
    onDateChange(iso);
  };

  return (
    <header className="glass-panel border-b border-ink-hairline dark:border-ink-dark-hairline px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
      {/* Title & Service Date Stepper */}
      <div className="flex items-center gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans font-semibold text-racing dark:text-racing-dark uppercase tracking-wider">
              Commercial Operations
            </span>
            <span className="w-1 h-1 rounded-full bg-ink-muted/40" />
            <span className="text-[10px] font-mono text-ink-muted dark:text-ink-dark-muted">
              Model {modelVersion} · 80% Conformal
            </span>
          </div>

          <h1 className="editorial-title text-2xl font-bold tracking-tight text-ink dark:text-ink-dark mt-0.5">
            {periodLabel} Service <span className="text-ink-muted dark:text-ink-dark-muted font-normal text-lg">· {formattedDay}</span>
          </h1>
        </div>

        {/* Date Stepper Controls */}
        <div className="flex items-center bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline rounded-lg p-0.5 shadow-xs">
          <button
            onClick={() => handleStepDay(-1)}
            aria-label="Previous day"
            className="p-1.5 rounded-md hover:bg-surface dark:hover:bg-white/10 text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>

          <input
            type="date"
            value={serviceDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent text-xs font-mono font-medium px-2 py-0.5 text-ink dark:text-ink-dark outline-none cursor-pointer"
          />

          <button
            onClick={() => handleStepDay(1)}
            aria-label="Next day"
            className="p-1.5 rounded-md hover:bg-surface dark:hover:bg-white/10 text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Service Period Segmented Control & Actions */}
      <div className="flex items-center gap-3">
        {/* Segmented Meal Toggle */}
        <div className="flex items-center p-1 bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline rounded-lg text-xs font-medium">
          {(['breakfast', 'lunch', 'dinner'] as const).map((p) => {
            const isSelected = servicePeriod === p;
            return (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-3 py-1 rounded-md capitalize transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-surface dark:bg-surface-dark text-racing dark:text-racing-dark font-semibold shadow-xs'
                    : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark'
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-surface-dark hover:bg-canvas-subtle text-xs font-medium text-ink dark:text-ink-dark shadow-xs transition-colors cursor-pointer"
            title="Print Kitchen Preparation Ticket"
          >
            <Printer className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
            <span>Prep Sheet</span>
          </button>
        )}

        {/* Primary Generate Forecast Button */}
        <button
          onClick={onGenerateForecast}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-racing hover:bg-racing-hover text-white text-xs font-semibold shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-60 active:scale-[0.98]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-brass-light" strokeWidth={2} />
              <span>Generate Forecast</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
