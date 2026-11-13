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
  const navItems: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
    { id: 'plan', label: 'Plan', icon: CalendarDays },
    { id: 'closeout', label: 'Close-out', icon: CheckSquare },
    { id: 'history', label: 'History', icon: TrendingUp },
    { id: 'model_lab', label: 'Model Lab', icon: Cpu },
    { id: 'data_settings', label: 'Data & Settings', icon: Sliders },
  ];

  return (
    <aside className="w-64 border-r border-ink-hairline dark:border-ink-dark-hairline bg-surface dark:bg-surface-dark flex flex-col justify-between select-none shrink-0 min-h-screen">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-ink-hairline dark:border-ink-dark-hairline flex items-center gap-3">
          <div className="w-8 h-8 rounded-control bg-forest text-[#F6F1E7] flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <div className="font-serif text-lg font-bold tracking-tight text-ink dark:text-ink-dark leading-none">
              Leftover Radar
            </div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-ink-muted dark:text-ink-dark-muted mt-1">
              Kitchen Prep Planner
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-control text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-forest text-[#F6F1E7] font-semibold dark:bg-forest dark:text-white'
                    : 'text-ink dark:text-ink-dark hover:bg-canvas dark:hover:bg-canvas-dark'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Dark Mode Toggle */}
      <div className="p-4 border-t border-ink-hairline dark:border-ink-dark-hairline space-y-3">
        {/* Night Kitchen Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center justify-between px-3 py-2 rounded-control border border-ink-hairline dark:border-ink-dark-hairline text-xs font-medium text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark bg-canvas dark:bg-canvas-dark transition-colors"
          title="Toggle Night Kitchen theme"
        >
          <span className="flex items-center gap-2">
            {isDarkMode ? <Sun className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />}
            <span>{isDarkMode ? 'Day Kitchen' : 'Night Kitchen'}</span>
          </span>
          <span className="text-[10px] font-mono uppercase opacity-70">
            {isDarkMode ? 'Dark' : 'Light'}
          </span>
        </button>

        {/* Operational Status Badge */}
        <div className="bg-canvas dark:bg-canvas-dark p-2.5 rounded-ticket border border-ink-hairline dark:border-ink-dark-hairline text-[11px] leading-tight space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-forest dark:bg-forest-dark inline-block" />
            <span className="font-medium text-ink dark:text-ink-dark">Operational Ready</span>
          </div>
          <div className="text-[10px] font-mono text-ink-muted dark:text-ink-dark-muted">
            Simulated Data · MongoDB 8.3
          </div>
        </div>
      </div>
    </aside>
  );
};
