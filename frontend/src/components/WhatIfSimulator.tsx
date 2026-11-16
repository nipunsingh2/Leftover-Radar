import React, { useState } from 'react';
import { CloudRain, Sun, Flame, Snowflake, GraduationCap, Trophy, RotateCcw, Sparkles, Sliders } from 'lucide-react';

export interface SimulationParams {
  weather: 'clear' | 'rainy' | 'cold' | 'hot';
  campus_event: boolean;
  exam_week: boolean;
  holiday: boolean;
}

interface WhatIfSimulatorProps {
  currentWeather: string;
  isCampusEvent: boolean;
  isExamWeek: boolean;
  isHoliday: boolean;
  onApplySimulation: (params: SimulationParams) => void;
  onResetSimulation: () => void;
  isSimulating: boolean;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  currentWeather,
  isCampusEvent,
  isExamWeek,
  isHoliday,
  onApplySimulation,
  onResetSimulation,
  isSimulating,
}) => {
  const [selectedWeather, setSelectedWeather] = useState<'clear' | 'rainy' | 'cold' | 'hot'>(
    (currentWeather as any) || 'clear'
  );
  const [selectedEvent, setSelectedEvent] = useState<'none' | 'exam' | 'fest'>(
    isExamWeek ? 'exam' : isCampusEvent ? 'fest' : 'none'
  );

  const isCustomScenario =
    selectedWeather !== (currentWeather || 'clear') ||
    (selectedEvent === 'exam' && !isExamWeek) ||
    (selectedEvent === 'fest' && !isCampusEvent) ||
    (selectedEvent === 'none' && (isExamWeek || isCampusEvent));

  const handleSimulate = (
    weather: 'clear' | 'rainy' | 'cold' | 'hot',
    eventChoice: 'none' | 'exam' | 'fest'
  ) => {
    setSelectedWeather(weather);
    setSelectedEvent(eventChoice);
    onApplySimulation({
      weather,
      campus_event: eventChoice === 'fest',
      exam_week: eventChoice === 'exam',
      holiday: isHoliday,
    });
  };

  const handleReset = () => {
    const baseW = (currentWeather as any) || 'clear';
    const baseE = isExamWeek ? 'exam' : isCampusEvent ? 'fest' : 'none';
    setSelectedWeather(baseW);
    setSelectedEvent(baseE);
    onResetSimulation();
  };

  const getShockImpactNotice = () => {
    if (selectedWeather === 'rainy' && selectedEvent === 'fest') {
      return 'Extreme Surge: Rain + Campus Fest creates peak indoor cafeteria traffic (+40% expected).';
    }
    if (selectedWeather === 'rainy') {
      return 'Monsoon Shock: Students remain on-campus (+15% to +20% demand on hot mains & soups).';
    }
    if (selectedWeather === 'hot') {
      return 'Heat Wave: Lighter appetites on heavy curries; peak cold coffee and beverage consumption (+35%).';
    }
    if (selectedWeather === 'cold') {
      return 'Winter Chill: Enhanced demand for steaming dal, parathas, and comfort biryanis (+12%).';
    }
    if (selectedEvent === 'exam') {
      return 'Exam Week: Erratic dining times; massive late-evening comfort food and snack spikes (+22%).';
    }
    if (selectedEvent === 'fest') {
      return 'Festival Surge: Campus event footfall spike (+25% across fast staples).';
    }
    return 'Baseline Calendar: Operating under real historical calendar conditions.';
  };

  return (
    <div className="bento-glass-card p-4 border border-persimmon/20 bg-persimmon/5 dark:bg-persimmon/10 transition-all shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title & Active Shock Pill */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-persimmon/15 text-persimmon">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-sm text-ink dark:text-ink-dark">
                Live "What-If" Scenario Simulator
              </span>
              {isCustomScenario && (
                <span className="sticker-badge bg-persimmon text-white text-[10px] px-2 py-0.5 animate-pulse">
                  Simulation Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-ink-muted font-sans mt-0.5">
              {getShockImpactNotice()}
            </p>
          </div>
        </div>

        {/* Quick Reset Button if custom shock is applied */}
        {isCustomScenario && (
          <button
            onClick={handleReset}
            className="btn-tactile flex items-center gap-1 px-3 py-1 rounded-full border border-ink-hairline bg-surface dark:bg-surface-dark text-xs font-mono font-bold text-ink-muted hover:text-ink cursor-pointer"
            title="Reset to real campus calendar conditions"
          >
            <RotateCcw className="w-3 h-3 text-persimmon" />
            <span>Reset Scenario</span>
          </button>
        )}
      </div>

      {/* Control Pills Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-ink-hairline dark:border-ink-dark-hairline text-xs">
        {/* 1. Weather Shock Selector */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold flex items-center gap-1">
            <span>Simulate Weather Condition</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'clear', label: 'Clear Day', icon: Sun },
              { id: 'rainy', label: 'Heavy Rain', icon: CloudRain },
              { id: 'cold', label: 'Cold Wave', icon: Snowflake },
              { id: 'hot', label: 'Heat Wave', icon: Flame },
            ].map((w) => {
              const Icon = w.icon;
              const isSelected = selectedWeather === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => handleSimulate(w.id as any, selectedEvent)}
                  disabled={isSimulating}
                  className={`btn-tactile flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-matcha text-white shadow-xs font-bold'
                      : 'bg-surface dark:bg-surface-dark border border-ink-hairline text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{w.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Campus Event Shock Selector */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold flex items-center gap-1">
            <span>Simulate Campus Context</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'none', label: 'Normal Day', icon: Sparkles },
              { id: 'exam', label: 'Exam Week', icon: GraduationCap },
              { id: 'fest', label: 'Campus Fest', icon: Trophy },
            ].map((e) => {
              const Icon = e.icon;
              const isSelected = selectedEvent === e.id;
              return (
                <button
                  key={e.id}
                  onClick={() => handleSimulate(selectedWeather, e.id as any)}
                  disabled={isSimulating}
                  className={`btn-tactile flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-persimmon text-white shadow-xs font-bold'
                      : 'bg-surface dark:bg-surface-dark border border-ink-hairline text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{w_label(e.id)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const w_label = (id: string) => {
  if (id === 'none') return 'Normal Day';
  if (id === 'exam') return 'Exam Week (+20%)';
  if (id === 'fest') return 'Campus Fest (+35%)';
  return id;
};
