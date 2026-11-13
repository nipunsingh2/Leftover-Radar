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
  Circle,
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
  const navItems: Array<{ id: TabId; label: string; sublabel: string; icon: LucideIcon }> = [
    { id: 'plan', label: 'Service Plan', sublabel: 'Daily prep ledger & buffer', icon: CalendarDays },
    { id: 'closeout', label: 'Close-out', sublabel: 'Reconciliation & actuals', icon: CheckSquare },
    { id: 'history', label: 'Analytics', sublabel: 'Accuracy & rolling waste', icon: TrendingUp },
    { id: 'model_lab', label: 'Model Lab', sublabel: 'Validation & calibration', icon: Cpu },
    { id: 'data_settings', label: 'Settings & Catalog', sublabel: 'Newsvendor costs & menu', icon: Sliders },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-ink-hairline dark:border-ink-dark-hairline flex flex-col justify-between select-none shrink-0 min-h-screen z-20">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-ink-hairline dark:border-ink-dark-hairline">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-racing text-white dark:bg-racing dark:text-white flex items-center justify-center shadow-xs">
              <UtensilsCrossed className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <div className="editorial-title text-lg font-bold text-ink dark:text-ink-dark leading-none">
                Leftover Radar
              </div>
              <div className="text-[11px] font-sans text-ink-muted dark:text-ink-dark-muted font-medium mt-1">
                Kitchen Demand Planning
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 pt-3 pb-1.5 text-[10px] font-sans font-semibold text-ink-muted/70 dark:text-ink-dark-muted/70 uppercase tracking-wider">
            Operations
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left cursor-pointer ${
                  isActive
                    ? 'bg-racing text-white shadow-xs font-semibold'
                    : 'text-ink dark:text-ink-dark hover:bg-canvas-subtle/70 dark:hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-brass-light' : 'text-ink-muted dark:text-ink-dark-muted group-hover:text-ink dark:group-hover:text-ink-dark'
                  }`}
                  strokeWidth={isActive ? 2 : 1.75}
                />

                <div className="flex-1 min-w-0">
                  <div className={`text-xs leading-tight font-medium ${isActive ? 'text-white font-semibold' : ''}`}>
                    {item.label}
                  </div>
                  <div
                    className={`text-[10px] font-sans truncate mt-0.5 ${
                      isActive ? 'text-white/70' : 'text-ink-muted dark:text-ink-dark-muted'
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>

                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brass-light" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Theme Toggle */}
      <div className="p-4 border-t border-ink-hairline dark:border-ink-dark-hairline space-y-3">
        {/* Day / Night Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-ink-hairline dark:border-ink-dark-hairline text-xs font-medium text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark bg-canvas/60 dark:bg-white/5 hover:bg-canvas dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Toggle Day / Night theme"
        >
          <span className="flex items-center gap-2">
            {isDarkMode ? (
              <Sun className="w-3.5 h-3.5 text-brass-light" strokeWidth={1.75} />
            ) : (
              <Moon className="w-3.5 h-3.5 text-racing" strokeWidth={1.75} />
            )}
            <span className="font-sans text-xs">{isDarkMode ? 'Light Mode' : 'Night Mode'}</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-canvas-subtle dark:bg-white/10 text-ink dark:text-ink-dark">
            {isDarkMode ? 'Dark' : 'Light'}
          </span>
        </button>

        {/* Operational Status Pill */}
        <div className="p-3 rounded-xl bg-canvas-subtle/50 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline text-[11px] space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-xs text-ink dark:text-ink-dark">
              <span className="w-2 h-2 rounded-full bg-racing dark:bg-racing-dark inline-block" />
              <span>Model Online</span>
            </span>
            <span className="text-[10px] font-mono text-ink-muted">v3.prod</span>
          </div>
          <div className="text-[10px] font-mono text-ink-muted dark:text-ink-dark-muted flex justify-between pt-0.5">
            <span>Ridge log1p</span>
            <span>CV MAE 14.44</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
