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
      {/* Visual Sonar Track Container */}
      <div className="relative h-6 bg-canvas-subtle/80 dark:bg-white/5 rounded-xl border border-ink-hairline dark:border-ink-dark-hairline overflow-hidden shadow-inner">
        {/* 1. 95% Conformal Interval Zone (Matcha Sonar Sweep Band) */}
        <div
          className="absolute top-0 bottom-0 bg-matcha/15 dark:bg-matcha-light/20 border-x-2 border-matcha/40 dark:border-matcha-light/40"
          style={{
            left: `${pLowPct}%`,
            width: `${Math.max(2, pHighPct - pLowPct)}%`,
          }}
          title={`95% Conformal Range: [${p80Low}, ${p80High}] portions`}
        >
          {/* Subtle micro dots */}
          <div className="w-full h-full opacity-20 bg-[radial-gradient(#1E4D38_1px,transparent_1px)] dark:bg-[radial-gradient(#FFF_1px,transparent_1px)] [background-size:6px_6px]" />
        </div>

        {/* 2. Deviation Shading between Planned and Forecast */}
        {zoneWidth > 0 && (
          <div
            className={`absolute top-0 bottom-0 transition-all duration-200 opacity-50 ${
              isWasteZone
                ? isExtremeOver
                  ? 'bg-berry'
                  : 'bg-yuzu'
                : 'bg-persimmon'
            }`}
            style={{
              left: `${zoneLeft}%`,
              width: `${zoneWidth}%`,
            }}
            title={
              isWasteZone
                ? `Safety Buffer: +${planned - predicted} portions`
                : `Under-prep Shortfall: -${predicted - planned} portions`
            }
          />
        )}

        {/* 3. Point Demand Forecast (ŷ) - Sonar Center Pin */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-ink dark:bg-ink-dark z-10 transition-all duration-200"
          style={{ left: `${predPct}%` }}
          title={`Model Predicted Demand: ${predicted} portions`}
        >
          <div className="w-2 h-2 -ml-[3px] bg-matcha dark:bg-matcha-light rounded-full -mt-0.5 border border-white dark:border-black shadow-xs" />
        </div>

        {/* 4. Planned Marker (Target Preparation) - Tactile Pin */}
        <div
          className={`absolute top-0 bottom-0 w-1 z-20 transition-all duration-200 ${
            isExtremeUnder || isExtremeOver
              ? 'bg-berry'
              : 'bg-matcha dark:bg-matcha-light'
          }`}
          style={{ left: `${planPct}%` }}
          title={`Planned Prep: ${planned} portions`}
        >
          <div
            className={`w-3.5 h-3.5 -ml-[5px] rounded-full -mt-1 shadow-md border-2 border-white dark:border-black transition-colors duration-200 flex items-center justify-center ${
              isExtremeUnder || isExtremeOver
                ? 'bg-berry text-white'
                : 'bg-persimmon text-white'
            }`}
          >
            <span className="w-1 h-1 rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* Sub-track Labels with Quirky Status Badges */}
      <div className="flex justify-between items-center text-[10px] font-mono mt-1 px-1 text-ink-muted dark:text-ink-dark-muted">
        <span title="Lower 95% conformal interval bound">
          p95: <span className="font-bold text-ink dark:text-ink-dark">{p80Low}</span>
        </span>

        <span className="font-bold text-[10px] flex items-center gap-1">
          {planned === predicted ? (
            <span className="text-matcha dark:text-matcha-light">Target Matched</span>
          ) : planned > predicted ? (
            <span className={isExtremeOver ? 'text-berry' : 'text-yuzu-dark'}>
              +{planned - predicted} buffer
            </span>
          ) : (
            <span className="text-persimmon">
              -{predicted - planned} shortfall
            </span>
          )}
        </span>

        <span title="Upper 95% conformal interval bound">
          p95: <span className="font-bold text-ink dark:text-ink-dark">{p80High}</span>
        </span>
      </div>
    </div>
  );
};
