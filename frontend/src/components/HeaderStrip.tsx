import React from 'react';
import { ChevronLeft, ChevronRight, Printer, Sparkles, Loader2, Calendar, UtensilsCrossed } from 'lucide-react';

interface HeaderStripProps {
  serviceDate: string;
  onDateChange: (date: string) => void;
  servicePeriod: 'breakfast' | 'lunch' | 'dinner';
  onPeriodChange: (period: 'breakfast' | 'lunch' | 'dinner') => void;
  onGenerateForecast: () => void;
  onOpenPrintSheet?: () => void;
  onOpenAllDayMenu?: () => void;
  isGenerating?: boolean;
}

export const HeaderStrip: React.FC<HeaderStripProps> = ({
  serviceDate,
  onDateChange,
  servicePeriod,
  onPeriodChange,
  onGenerateForecast,
  onOpenPrintSheet,
  onOpenAllDayMenu,
  isGenerating = false,
}) => {
  // Format date safely without UTC timezone shift (e.g. "Sat, Nov 14, 2026")
  const [yearNum, monthNum, dayNum] = serviceDate.split('-').map(Number);
  const localDateObj = new Date(yearNum, (monthNum || 1) - 1, dayNum || 1);
  const formattedDay = !isNaN(localDateObj.getTime())
    ? localDateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : serviceDate;
  const periodLabel = servicePeriod.charAt(0).toUpperCase() + servicePeriod.slice(1);

  const handleStepDay = (deltaDays: number) => {
    // Pure local date arithmetic avoiding UTC offset jumping
    const [y, m, d] = serviceDate.split('-').map(Number);
    const nextDate = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
    const nextY = nextDate.getFullYear();
    const nextM = String(nextDate.getMonth() + 1).padStart(2, '0');
    const nextD = String(nextDate.getDate()).padStart(2, '0');
    onDateChange(`${nextY}-${nextM}-${nextD}`);
  };

  return (
    <div className="bg-surface/70 dark:bg-surface-dark/70 backdrop-blur-xl border-b border-ink-hairline dark:border-ink-dark-hairline px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-[52px] z-20 transition-all select-none">
      {/* Left: Compact Date Stepper & Active Service */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-lg text-ink dark:text-ink-dark leading-none">
            {periodLabel} Service
          </span>
          <span className="text-ink-muted text-xs font-sans">•</span>
          <span className="text-xs font-sans font-medium text-ink-muted dark:text-ink-dark-muted">
            {formattedDay}
          </span>
        </div>

        {/* Minimal Tactile Date Stepper */}
        <div className="flex items-center bg-canvas-subtle/70 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline rounded-full p-0.5 shadow-sm">
          <button
            onClick={() => handleStepDay(-1)}
            aria-label="Previous day"
            className="p-1 rounded-full hover:bg-surface dark:hover:bg-white/10 text-ink-muted hover:text-ink transition-colors cursor-pointer active:scale-90"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>

          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="w-3 h-3 text-persimmon" />
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-[11px] font-mono font-bold text-ink dark:text-ink-dark outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => handleStepDay(1)}
            aria-label="Next day"
            className="p-1 rounded-full hover:bg-surface dark:hover:bg-white/10 text-ink-muted hover:text-ink transition-colors cursor-pointer active:scale-90"
          >
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Right: Service Period Control & Quick Actions */}
      <div className="flex items-center gap-2.5">
        {/* Sleek Segmented Meal Toggle (Clean Text, No Emojis) */}
        <div className="flex items-center p-0.5 bg-canvas-subtle/70 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline rounded-full text-xs font-semibold shadow-inner">
          {(['breakfast', 'lunch', 'dinner'] as const).map((p) => {
            const isSelected = servicePeriod === p;
            return (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-3 py-1 rounded-full capitalize text-xs transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-matcha text-white font-bold shadow-xs scale-102'
                    : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* All-Day Menu Schedule Button */}
        {onOpenAllDayMenu && (
          <button
            onClick={onOpenAllDayMenu}
            className="btn-tactile flex items-center gap-1.5 px-3 py-1 rounded-full border border-matcha/30 dark:border-matcha/40 bg-matcha/10 dark:bg-matcha/20 hover:bg-matcha/20 text-xs font-bold text-matcha-dark dark:text-cream cursor-pointer transition-all shadow-xs"
            title="View entire cafeteria menu segmented by meal time"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-matcha" strokeWidth={2} />
            <span>All-Day Menu</span>
          </button>
        )}

        {/* Print Prep Sheet Button */}
        {onOpenPrintSheet && (
          <button
            onClick={onOpenPrintSheet}
            className="btn-tactile flex items-center gap-1.5 px-3 py-1 rounded-full border border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-surface-dark hover:bg-canvas-subtle text-xs font-bold text-ink dark:text-ink-dark cursor-pointer transition-all"
            title="Print Kitchen Preparation Ticket"
          >
            <Printer className="w-3 h-3 text-persimmon" strokeWidth={2} />
            <span>Prep Ticket</span>
          </button>
        )}

        {/* Primary Generate Forecast Button */}
        <button
          onClick={onGenerateForecast}
          disabled={isGenerating}
          className="btn-tactile flex items-center gap-1.5 px-4 py-1 rounded-full bg-persimmon hover:bg-persimmon-hover text-white text-xs font-bold shadow-tactile cursor-pointer disabled:opacity-60 transition-all"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} />
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-yuzu" strokeWidth={2.5} />
              <span>Ping Radar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
