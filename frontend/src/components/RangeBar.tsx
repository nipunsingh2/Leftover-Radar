import React from 'react';

interface RangeBarProps {
  predicted: number;
  p80Low: number;
  p80High: number;
  planned: number;
  maxScale?: number;
}

export const RangeBar: React.FC<RangeBarProps> = ({
  predicted,
  p80Low,
  p80High,
  planned,
  maxScale: customMax,
}) => {
  // Compute max domain boundary for the bar
  const domainMax = Math.max(customMax || 0, p80High * 1.25, planned * 1.15, 100);

  const getPercent = (val: number) => {
    return Math.min(100, Math.max(0, (val / domainMax) * 100));
  };

  const pLowPct = getPercent(p80Low);
  const pHighPct = getPercent(p80High);
  const predPct = getPercent(predicted);
  const planPct = getPercent(planned);

  // Waste vs Shortfall shading
  const isWasteZone = planned > predicted;
  const isShortfallZone = planned < predicted;
  const zoneLeft = Math.min(planPct, predPct);
  const zoneWidth = Math.abs(planPct - predPct);

  const isExtremeOver = planned > p80High;
  const isExtremeUnder = planned < p80Low;

  return (
    <div className="w-full select-none">
      {/* Visual Track Container */}
      <div className="relative h-5 bg-canvas-subtle/80 dark:bg-white/5 rounded-md border border-ink-hairline dark:border-ink-dark-hairline overflow-hidden">
        {/* 1. 80% Conformal Interval Zone (Sage Glass Band) */}
        <div
          className="absolute top-0 bottom-0 bg-racing/10 dark:bg-racing-dark/15 border-x border-racing/30 dark:border-racing-dark/30"
          style={{
            left: `${pLowPct}%`,
            width: `${Math.max(1.5, pHighPct - pLowPct)}%`,
          }}
          title={`80% Conformal Interval: [${p80Low}, ${p80High}] portions`}
        />

        {/* 2. Deviation Shading between Planned and Forecast */}
        {zoneWidth > 0 && (
          <div
            className={`absolute top-0 bottom-0 transition-all duration-200 opacity-40 ${
              isWasteZone
                ? isExtremeOver
                  ? 'bg-crimson'
                  : 'bg-ochre'
                : 'bg-crimson'
            }`}
            style={{
              left: `${zoneLeft}%`,
              width: `${zoneWidth}%`,
            }}
            title={
              isWasteZone
                ? `Buffer: +${planned - predicted} portions`
                : `Shortfall: -${predicted - planned} portions`
            }
          />
        )}

        {/* 3. Point Demand Forecast (ŷ) - Clean Vertical Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-ink dark:bg-ink-dark z-10 transition-all duration-200"
          style={{ left: `${predPct}%` }}
          title={`Model Predicted Demand: ${predicted} portions`}
        >
          <div className="w-1.5 h-1.5 -ml-[2px] bg-ink dark:bg-ink-dark rounded-full -mt-0.5" />
        </div>

        {/* 4. Planned Marker (Target Preparation) - Tactile Indicator */}
        <div
          className={`absolute top-0 bottom-0 w-1 z-20 transition-all duration-200 ${
            isExtremeUnder || isExtremeOver
              ? 'bg-crimson'
              : 'bg-racing dark:bg-racing-dark'
          }`}
          style={{ left: `${planPct}%` }}
          title={`Operator Planned Prep: ${planned} portions`}
        >
          <div
            className={`w-2.5 h-2.5 -ml-[3px] rounded-xs rotate-45 -mt-0.5 shadow-xs border border-surface dark:border-surface-dark transition-colors duration-200 ${
              isExtremeUnder || isExtremeOver
                ? 'bg-crimson'
                : 'bg-racing dark:bg-racing-dark'
            }`}
          />
        </div>
      </div>

      {/* Sub-track Labels with Tabular Numerals */}
      <div className="flex justify-between items-center text-[10px] font-mono mt-1 px-0.5 text-ink-muted dark:text-ink-dark-muted">
        <span title="Lower 80% interval bound">
          p80: <span className="font-semibold text-ink dark:text-ink-dark">{p80Low}</span>
        </span>

        <span className="font-medium text-[10px]">
          {planned === predicted ? (
            <span className="text-racing dark:text-racing-dark font-semibold">Matches Forecast</span>
          ) : planned > predicted ? (
            <span className={isExtremeOver ? 'text-crimson font-bold' : 'text-ochre font-semibold'}>
              +{planned - predicted} buffer
            </span>
          ) : (
            <span className="text-crimson font-bold">-{predicted - planned} shortfall</span>
          )}
        </span>

        <span title="Upper 80% interval bound">
          p80: <span className="font-semibold text-ink dark:text-ink-dark">{p80High}</span>
        </span>
      </div>
    </div>
  );
};
