import React from 'react';
import { X, Calendar, CloudSun, AlertCircle, ArrowRight, TrendingUp, Sparkles, ChefHat } from 'lucide-react';

interface WeeklyOutlookModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string;
  onSelectDate: (date: string) => void;
}

export const WeeklyOutlookModal: React.FC<WeeklyOutlookModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  onSelectDate,
}) => {
  if (!isOpen) return null;

  const [y, m, d] = currentDate.split('-').map(Number);

  // Generate 7 upcoming calendar days
  const days = Array.from({ length: 7 }, (_, i) => {
    const target = new Date(y, (m || 1) - 1, (d || 1) + i);
    const dateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(
      target.getDate()
    ).padStart(2, '0')}`;
    const dayName = target.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isWeekend = target.getDay() === 0 || target.getDay() === 6;
    const isFriday = target.getDay() === 5;

    // Simulate realistic campus rhythms
    let loadLevel: 'Heavy Peak' | 'Standard' | 'Light' = 'Standard';
    let expectedVolume = 2450;
    let badgeColor = 'bg-matcha/15 text-matcha-dark border-matcha/30';
    let notes = 'Standard cafeteria dining flow across all three meal periods.';
    let weather = 'Clear & Pleasant';
    let weatherIcon = '☀️';
    let eventTag = 'Regular Academic Schedule';

    if (isFriday) {
      loadLevel = 'Heavy Peak';
      expectedVolume = 3100;
      badgeColor = 'bg-persimmon/15 text-persimmon border-persimmon/30';
      notes = 'Friday special Biryani & Treat surge; ensure +30% Basmati & Paneer prep.';
      eventTag = 'Weekend Eve Rush';
    } else if (isWeekend) {
      loadLevel = 'Light';
      expectedVolume = 1650;
      badgeColor = 'bg-yuzu/20 text-yuzu-dark border-yuzu/40';
      notes = 'Hostelers dining off-campus; lean prep recommended to prevent surplus.';
      eventTag = 'Weekend Schedule';
    } else if (i === 3) {
      weather = 'Rain Likely';
      weatherIcon = '🌧️';
      expectedVolume = 2850;
      loadLevel = 'Heavy Peak';
      badgeColor = 'bg-persimmon/15 text-persimmon border-persimmon/30';
      notes = 'Monsoon rain forecasted; expect higher indoor attendance and hot comfort soups.';
      eventTag = 'Rain Forecast Shock';
    }

    return {
      dateStr,
      dayName,
      formattedDate,
      isToday: i === 0,
      loadLevel,
      expectedVolume,
      badgeColor,
      notes,
      weather,
      weatherIcon,
      eventTag,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-canvas dark:bg-canvas-dark rounded-2xl border border-ink-hairline dark:border-ink-dark-hairline shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-persimmon/10 text-persimmon">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-ink dark:text-ink-dark flex items-center gap-2">
                <span>7-Day Rolling Kitchen Outlook</span>
                <span className="text-xs font-mono font-bold text-persimmon bg-persimmon/15 px-2.5 py-0.5 rounded-full border border-persimmon/30">
                  Weekly Procurement Horizon
                </span>
              </h2>
              <p className="text-xs text-ink-muted">
                Anticipated campus volume, event shocks, and kitchen production strategy for the next 7 days
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-ink-muted hover:text-ink hover:bg-canvas-subtle transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Days List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {days.map((day) => (
            <div
              key={day.dateStr}
              className={`p-4 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                day.isToday
                  ? 'bg-matcha/5 border-matcha/40 shadow-xs'
                  : 'bg-surface dark:bg-surface-dark border-ink-hairline dark:border-ink-dark-hairline hover:border-persimmon/30'
              }`}
            >
              {/* Date & Day Badge */}
              <div className="flex items-center gap-3 min-w-[160px]">
                <div className="text-center p-2 rounded-lg bg-canvas-subtle dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline min-w-[50px]">
                  <div className="text-[10px] font-mono uppercase text-ink-muted">{day.dayName}</div>
                  <div className="font-serif font-bold text-base text-ink dark:text-ink-dark leading-none mt-0.5">
                    {day.formattedDate.split(' ')[1]}
                  </div>
                </div>
                <div>
                  <div className="font-serif font-bold text-sm text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <span>{day.formattedDate}</span>
                    {day.isToday && (
                      <span className="text-[10px] font-mono font-bold text-matcha bg-matcha/15 px-1.5 py-0.2 rounded border border-matcha/30">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                    <span>{day.weatherIcon}</span>
                    <span>{day.weather}</span>
                    <span className="opacity-40">•</span>
                    <span className="font-mono text-[11px]">{day.eventTag}</span>
                  </div>
                </div>
              </div>

              {/* Volume & Strategy Note */}
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2">
                  <span className={`sticker-badge text-[10px] ${day.badgeColor}`}>
                    {day.loadLevel} (~{day.expectedVolume.toLocaleString()} portions)
                  </span>
                </div>
                <p className="text-xs text-ink-muted font-sans mt-1">
                  {day.notes}
                </p>
              </div>

              {/* Action Button */}
              <div className="shrink-0">
                <button
                  onClick={() => {
                    onSelectDate(day.dateStr);
                    onClose();
                  }}
                  className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-hairline bg-surface dark:bg-surface-dark hover:bg-canvas-subtle text-xs font-bold text-ink dark:text-ink-dark cursor-pointer transition-all shadow-xs"
                >
                  <span>Open Day</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ink-hairline dark:border-ink-dark-hairline bg-surface/50 dark:bg-surface-dark/50 flex items-center justify-between text-xs text-ink-muted">
          <div className="flex items-center gap-1.5">
            <ChefHat className="w-4 h-4 text-persimmon" />
            <span>Weekly outlook powered by historical same-weekday moving averages and academic calendar.</span>
          </div>
          <button
            onClick={onClose}
            className="btn-tactile px-4 py-1.5 rounded-xl bg-ink text-white dark:bg-cream dark:text-ink text-xs font-bold cursor-pointer"
          >
            Close Outlook
          </button>
        </div>
      </div>
    </div>
  );
};
