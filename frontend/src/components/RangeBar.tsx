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
      <div className="relative h-6 bg-canvas-subtle/80 dark:bg-black/40 rounded-lg border border-gold/20 dark:border-white/10 overflow-hidden shadow-inner">
        {/* 1. 80% Conformal Interval Zone (Sage Glass Band) */}
        <div
          className="absolute top-0 bottom-0 bg-gradient-to-r from-forest/15 via-forest/20 to-forest/15 dark:from-forest-dark/20 dark:to-forest-dark/20 border-x border-forest/40 dark:border-gold/40 backdrop-blur-xs"
          style={{
            left: `${pLowPct}%`,
            width: `${Math.max(1.5, pHighPct - pLowPct)}%`,
          }}
          title={`80% Conformal Interval: [${p80Low}, ${p80High}] portions`}
        >
          {/* Subtle diagonal hatching pattern for precision calibration feel */}
          <div className="w-full h-full opacity-15 bg-[radial-gradient(#164232_1px,transparent_1px)] dark:bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:6px_6px]" />
        </div>

        {/* 2. Waste or Shortfall Deviation Shading */}
        {zoneWidth > 0 && (
          <div
            className={`absolute top-0 bottom-0 transition-all duration-300 opacity-60 backdrop-blur-xs ${
              isWasteZone
                ? isExtremeOver
                  ? 'bg-clay'
                  : 'bg-saffron'
                : 'bg-clay'
            }`}
            style={{
              left: `${zoneLeft}%`,
              width: `${zoneWidth}%`,
            }}
            title={
              isWasteZone
                ? `Estimated Over-prep / Waste: +${planned - predicted} portions`
                : `Estimated Under-prep / Stock-out: -${predicted - planned} portions`
            }
          />
        )}

        {/* 3. Point Demand Forecast (\hat{y}) - Slender Gold Needle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-forest dark:bg-gold z-10 transition-all duration-300"
          style={{ left: `${predPct}%` }}
          title={`Model Predicted Demand: ${predicted} portions`}
        >
          <div className="w-2 h-2 -ml-[3px] bg-forest dark:bg-gold rounded-full -mt-0.5 shadow-sm border border-white dark:border-black" />
        </div>

        {/* 4. Planned Marker (Target Preparation) - Diamond Insignia */}
        <div
          className={`absolute top-0 bottom-0 w-1 z-20 transition-all duration-300 ${
            isExtremeUnder || isExtremeOver
              ? 'bg-clay'
              : 'bg-forest dark:bg-gold'
          }`}
          style={{ left: `${planPct}%` }}
          title={`Operator Planned Prep: ${planned} portions`}
        >
          <div
            className={`w-3 h-3 -ml-[4.5px] rounded-[2px] rotate-45 -mt-1 shadow-md border-2 border-white dark:border-black transition-colors duration-300 ${
              isExtremeUnder || isExtremeOver
                ? 'bg-clay shadow-clay/40'
                : 'bg-forest dark:bg-gold shadow-gold-glow'
            }`}
          />
        </div>
      </div>

      {/* Sub-track Labels with Tabular Numerals */}
      <div className="flex justify-between items-center text-[10px] font-mono mt-1 px-1 text-ink-muted dark:text-ink-dark-muted">
        <span title="Lower 80% interval bound">
          p80: <span className="font-semibold text-ink dark:text-ink-dark">{p80Low}</span>
        </span>

        <span className="font-medium text-[9px] uppercase tracking-wider">
          {planned === predicted ? (
            <span className="text-forest dark:text-gold font-semibold">Matched to Forecast</span>
          ) : planned > predicted ? (
            <span className={isExtremeOver ? 'text-clay font-bold' : 'text-saffron font-bold'}>
              +{planned - predicted} buffer
            </span>
          ) : (
            <span className="text-clay font-bold">-{predicted - planned} shortfall</span>
          )}
        </span>

        <span title="Upper 80% interval bound">
          p80: <span className="font-semibold text-ink dark:text-ink-dark">{p80High}</span>
        </span>
      </div>
    </div>
  );
};
