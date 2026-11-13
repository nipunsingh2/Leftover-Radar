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

  return (
    <div className="w-full select-none">
      {/* Visual Track Container */}
      <div className="relative h-6 bg-canvas dark:bg-canvas-dark rounded-[3px] border border-ink-hairline dark:border-ink-dark-hairline overflow-hidden">
        {/* 1. 80% Conformal Interval Zone */}
        <div
          className="absolute top-0 bottom-0 bg-[#E3EBDD] dark:bg-[#1E2E22] border-x border-forest/30 dark:border-forest-dark/40"
          style={{
            left: `${pLowPct}%`,
            width: `${Math.max(1, pHighPct - pLowPct)}%`,
          }}
          title={`80% Conformal Interval: [${p80Low}, ${p80High}] portions`}
        />

        {/* 2. Waste or Shortfall Zone */}
        {zoneWidth > 0 && (
          <div
            className={`absolute top-0 bottom-0 opacity-40 ${
              isWasteZone
                ? planned > p80High
                  ? 'bg-clay dark:bg-clay'
                  : 'bg-saffron dark:bg-saffron'
                : 'bg-clay dark:bg-clay'
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

        {/* 3. Predicted Demand Tick (\hat{y}) */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-ink dark:bg-ink-dark z-10"
          style={{ left: `${predPct}%` }}
          title={`Model Predicted Demand: ${predicted} portions`}
        >
          <div className="w-1.5 h-1.5 -ml-[2px] bg-ink dark:bg-ink-dark rounded-full -mt-0.5" />
        </div>

        {/* 4. Planned Marker (Target Preparation) */}
        <div
          className={`absolute top-0 bottom-0 w-1 z-20 transition-all duration-150 ${
            planned < p80Low
              ? 'bg-clay'
              : planned > p80High
              ? 'bg-clay'
              : 'bg-forest dark:bg-forest-dark'
          }`}
          style={{ left: `${planPct}%` }}
          title={`Operator Planned Prep: ${planned} portions`}
        >
          <div
            className={`w-2.5 h-2.5 -ml-[3.5px] rounded-[1px] rotate-45 -mt-1 border border-surface dark:border-surface-dark ${
              planned < p80Low || planned > p80High
                ? 'bg-clay'
                : 'bg-forest dark:bg-forest-dark'
            }`}
          />
        </div>
      </div>

      {/* Sub-track Labels */}
      <div className="flex justify-between items-center text-[10px] font-mono text-ink-muted dark:text-ink-dark-muted mt-1 px-0.5">
        <span title="Lower 80% interval bound">
          p80: <span className="text-ink dark:text-ink-dark font-medium">{p80Low}</span>
        </span>
        <span title="Point forecast vs plan delta">
          {planned === predicted ? (
            <span className="text-forest dark:text-forest-dark font-medium">plan matches demand</span>
          ) : planned > predicted ? (
            <span className={planned > p80High ? 'text-clay font-medium' : 'text-saffron font-medium'}>
              +{planned - predicted} waste buffer
            </span>
          ) : (
            <span className="text-clay font-medium">-{predicted - planned} shortfall</span>
          )}
        </span>
        <span title="Upper 80% interval bound">
          p80: <span className="text-ink dark:text-ink-dark font-medium">{p80High}</span>
        </span>
      </div>
    </div>
  );
};
