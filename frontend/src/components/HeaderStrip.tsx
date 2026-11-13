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
  // Format title e.g. "Lunch · Sat 14 Nov 2026"
  const dateObj = new Date(serviceDate + 'T00:00:00');
  const formattedDay = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
    : serviceDate;
  const periodLabel = servicePeriod.charAt(0).toUpperCase() + servicePeriod.slice(1);

  const handleStepDay = (deltaDays: number) => {
    const cur = new Date(serviceDate + 'T00:00:00');
    cur.setDate(cur.getDate() + deltaDays);
    const iso = cur.toISOString().split('T')[0];
    onDateChange(iso);
  };

  return (
    <header className="border-b border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-surface-dark px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      {/* Title & Date Stepper */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink dark:text-ink-dark">
            {periodLabel} <span className="text-ink-muted dark:text-ink-dark-muted font-normal">· {formattedDay}</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-mono text-ink-muted dark:text-ink-dark-muted">
              Model {modelVersion} · Conformal 80%
            </span>
          </div>
        </div>

        {/* Date Stepper Controls */}
        <div className="flex items-center border border-ink-hairline dark:border-ink-dark-hairline rounded-control bg-canvas dark:bg-canvas-dark overflow-hidden ml-2">
          <button
            onClick={() => handleStepDay(-1)}
            aria-label="Previous day"
            className="p-1.5 hover:bg-surface dark:hover:bg-surface-dark text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark transition-colors"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <input
            type="date"
            value={serviceDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent text-xs font-mono px-2 py-1 text-ink dark:text-ink-dark outline-none cursor-pointer"
          />
          <button
            onClick={() => handleStepDay(1)}
            aria-label="Next day"
            className="p-1.5 hover:bg-surface dark:hover:bg-surface-dark text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark transition-colors"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Service Period Segmented Control & Actions */}
      <div className="flex items-center gap-3">
        {/* Segmented Meal Control */}
        <div className="flex items-center p-0.5 border border-ink-hairline dark:border-ink-dark-hairline rounded-control bg-canvas dark:bg-canvas-dark text-xs font-medium">
          {(['breakfast', 'lunch', 'dinner'] as const).map((p) => {
            const isSelected = servicePeriod === p;
            return (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-3 py-1.5 rounded-[4px] capitalize transition-all ${
                  isSelected
                    ? 'bg-surface dark:bg-surface-dark text-forest dark:text-forest-dark font-semibold shadow-xs'
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-control border border-ink-hairline dark:border-ink-dark-hairline bg-canvas dark:bg-canvas-dark hover:bg-surface dark:hover:bg-surface-dark text-xs font-medium text-ink dark:text-ink-dark transition-colors"
            title="Print Kitchen Preparation Ticket"
          >
            <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Prep Sheet</span>
          </button>
        )}

        {/* Primary Generate Forecast Button */}
        <button
          onClick={onGenerateForecast}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 rounded-control bg-forest hover:bg-forest-hover text-[#F6F1E7] text-xs font-semibold shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Generate Forecast</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
