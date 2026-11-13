import React from 'react';
import {
  CalendarDays,
  CheckSquare,
  TrendingUp,
  Cpu,
  Sliders,
  Moon,
  Sun,
  UtensilsCrossed,
  LucideIcon,
  Radio,
  Sparkles,
} from 'lucide-react';

export type TabId = 'plan' | 'closeout' | 'history' | 'model_lab' | 'data_settings';

interface NavigationRailProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeTab,
  onTabChange,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const navItems: Array<{ id: TabId; label: string; sublabel: string; icon: LucideIcon; emoji: string }> = [
    { id: 'plan', label: 'Service Plan', sublabel: 'Prep ledger & safety buffer', icon: CalendarDays, emoji: '🍱' },
    { id: 'closeout', label: 'Close-out', sublabel: 'Waste & sales reconciliation', icon: CheckSquare, emoji: '🧾' },
    { id: 'history', label: 'Radar Trends', sublabel: 'Accuracy & rolling waste', icon: TrendingUp, emoji: '📈' },
    { id: 'model_lab', label: 'Model Lab', sublabel: 'Ridge CV & calibration', icon: Cpu, emoji: '🔬' },
    { id: 'data_settings', label: 'Kitchen Config', sublabel: 'Newsvendor costs & menu', icon: Sliders, emoji: '⚙️' },
  ];

  return (
    <aside className="w-68 bg-surface/90 dark:bg-surface-dark/90 backdrop-blur-xl border-r border-ink-hairline dark:border-ink-dark-hairline flex flex-col justify-between select-none shrink-0 min-h-screen z-20">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-ink-hairline dark:border-ink-dark-hairline">
          <div className="flex items-center gap-3.5">
            {/* Animated Quirky Radar Monogram */}
            <div className="relative w-11 h-11 rounded-2xl bg-matcha dark:bg-matcha text-white flex items-center justify-center shadow-quirky overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-pulse" />
              <Radio className="w-5 h-5 text-yuzu relative z-10" strokeWidth={2} />
              {/* Rotating radar sweep ping */}
              <div className="absolute inset-0 border border-white/20 rounded-full animate-ping opacity-30" />
            </div>

            <div>
              <div className="font-serif text-xl font-bold tracking-tight text-ink dark:text-ink-dark flex items-center gap-1.5 leading-none">
                <span>Leftover Radar</span>
                <span className="text-xs">✨</span>
              </div>
              <div className="text-[11px] font-sans font-medium text-ink-muted dark:text-ink-dark-muted mt-1">
                The Algorithmic Kitchen Companion
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3.5 space-y-1.5">
          <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-ink-muted/70 dark:text-ink-dark-muted font-bold">
            Service Ops
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-200 text-left cursor-pointer ${
                  isActive
                    ? 'bg-matcha text-white shadow-quirky font-semibold scale-[1.01]'
                    : 'text-ink dark:text-ink-dark hover:bg-canvas-subtle dark:hover:bg-white/5 hover:translate-x-1'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-transform group-hover:scale-110 ${
                    isActive ? 'bg-white/15' : 'bg-canvas-subtle dark:bg-white/10'
                  }`}
                >
                  <span>{item.emoji}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-sans font-semibold leading-tight ${isActive ? 'text-white' : ''}`}>
                    {item.label}
                  </div>
                  <div
                    className={`text-[10px] truncate mt-0.5 ${
                      isActive ? 'text-white/70 font-mono' : 'text-ink-muted dark:text-ink-dark-muted font-mono'
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>

                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-persimmon animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Quirky Theme Toggle */}
      <div className="p-4 border-t border-ink-hairline dark:border-ink-dark-hairline space-y-3">
        {/* Daytime / Midnight Diner Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border border-ink-hairline dark:border-ink-dark-hairline text-xs font-semibold text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark bg-canvas/60 dark:bg-white/5 hover:bg-canvas dark:hover:bg-white/10 transition-all cursor-pointer shadow-xs"
          title="Toggle Daytime / Midnight Diner mode"
        >
          <span className="flex items-center gap-2 font-serif text-sm">
            {isDarkMode ? (
              <span className="text-base">🌙</span>
            ) : (
              <span className="text-base">☀️</span>
            )}
            <span>{isDarkMode ? 'Midnight Diner' : 'Daytime Kitchen'}</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-persimmon/10 text-persimmon font-bold">
            {isDarkMode ? 'Night' : 'Day'}
          </span>
        </button>

        {/* Radar Telemetry Badge */}
        <div className="p-3.5 rounded-2xl bg-canvas-subtle/80 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline text-[11px] space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-xs text-matcha dark:text-matcha-light">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-matcha opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-matcha dark:bg-matcha-light" />
              </span>
              <span>Sonar Active</span>
            </span>
            <span className="font-mono text-[10px] text-persimmon font-bold">80% Conf.</span>
          </div>
          <div className="text-[10px] font-mono text-ink-muted dark:text-ink-dark-muted flex justify-between pt-0.5">
            <span>Ridge log1p</span>
            <span>CV MAE 14.4</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
