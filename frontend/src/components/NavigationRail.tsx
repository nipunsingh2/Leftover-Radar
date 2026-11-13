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
  Sparkles,
  ShieldCheck,
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
    { id: 'plan', label: 'Service Plan', sublabel: 'Conformal ledger & buffers', icon: CalendarDays },
    { id: 'closeout', label: 'Close-out', sublabel: 'Reconciliation & debrief', icon: CheckSquare },
    { id: 'history', label: 'Analytics', sublabel: 'Pipelines & rolling trends', icon: TrendingUp },
    { id: 'model_lab', label: 'Model Lab', sublabel: 'Ridge CV & calibration', icon: Cpu },
    { id: 'data_settings', label: 'Data & Settings', sublabel: 'Catalogs & Newsvendor', icon: Sliders },
  ];

  return (
    <aside className="w-72 glass-panel border-r border-gold/20 dark:border-white/10 flex flex-col justify-between select-none shrink-0 min-h-screen relative z-20">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-gold/15 dark:border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-forest to-forest-hover text-gold border border-gold/40 flex items-center justify-center shadow-gold-glow">
              <UtensilsCrossed className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="victorian-heading text-xl text-forest dark:text-gold tracking-tight leading-none flex items-center gap-1.5">
                <span>Leftover Radar</span>
              </div>
              <div className="victorian-badge text-[9px] text-gold-deep dark:text-gold/80 mt-1 font-semibold">
                Computational Atelier
              </div>
            </div>
          </div>

          <div className="gold-engraved-rule mt-4" />
        </div>

        {/* Navigation Items */}
        <nav className="p-3.5 space-y-1.5">
          <div className="px-3 pt-2 pb-1 text-[10px] victorian-badge text-ink-muted/70 dark:text-ink-dark-muted/70">
            Operations & Telemetry
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full group flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-300 text-left relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-forest/90 to-forest dark:from-gold/20 dark:to-gold/10 text-white dark:text-gold shadow-md shadow-forest/20 dark:shadow-gold-glow/20 border border-gold/40'
                    : 'text-ink dark:text-ink-dark hover:bg-canvas-subtle/70 dark:hover:bg-white/5 hover:translate-x-1'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gold rounded-r-full shadow-gold-glow" />
                )}

                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-white/15 text-gold-200'
                      : 'bg-forest/5 dark:bg-white/5 text-forest dark:text-gold group-hover:bg-forest/10 dark:group-hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.75} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold leading-tight ${isActive ? 'text-white dark:text-gold' : ''}`}>
                    {item.label}
                  </div>
                  <div
                    className={`text-[10px] font-mono leading-tight truncate mt-0.5 ${
                      isActive ? 'text-white/70 dark:text-gold/70' : 'text-ink-muted dark:text-ink-dark-muted'
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Dark Mode Toggle */}
      <div className="p-4 border-t border-gold/15 dark:border-white/10 space-y-3">
        {/* Night Conservatory Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-gold/20 dark:border-white/10 text-xs font-medium text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark bg-canvas/60 dark:bg-white/5 hover:bg-canvas dark:hover:bg-white/10 transition-all duration-200 cursor-pointer shadow-xs"
          title="Toggle Night Kitchen theme"
        >
          <span className="flex items-center gap-2.5">
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-gold" strokeWidth={1.75} />
            ) : (
              <Moon className="w-4 h-4 text-forest" strokeWidth={1.75} />
            )}
            <span className="font-serif font-medium">{isDarkMode ? 'Solar Salon' : 'Night Conservatory'}</span>
          </span>
          <span className="victorian-badge text-[9px] px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep dark:text-gold">
            {isDarkMode ? 'Night' : 'Day'}
          </span>
        </button>

        {/* Operational Status Bento Badge */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-forest/5 to-gold/5 dark:from-white/5 dark:to-gold/5 border border-gold/25 dark:border-white/10 text-[11px] space-y-1.5 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-forest dark:text-gold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest dark:bg-gold opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-forest dark:bg-gold"></span>
              </span>
              <span>Model Online</span>
            </span>
            <span className="victorian-badge text-[9px] text-ink-muted">v3.prod</span>
          </div>
          <div className="text-[10px] font-mono text-ink-muted dark:text-ink-dark-muted flex justify-between">
            <span>Engine: Ridge log1p</span>
            <span>CV MAE 14.44</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
