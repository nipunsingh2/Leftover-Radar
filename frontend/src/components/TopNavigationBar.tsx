import React from 'react';
import {
  CalendarDays,
  CheckSquare,
  TrendingUp,
  Cpu,
  Sliders,
  Radio,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

export type TabId = 'plan' | 'closeout' | 'history' | 'model_lab' | 'data_settings';

interface TopNavigationBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isClockSynced: boolean;
  onToggleClockSync: () => void;
  currentTimeStr: string;
  activeServicePeriod: 'breakfast' | 'lunch' | 'dinner';
  onTriggerCuteLoading: () => void;
}

export const TopNavigationBar: React.FC<TopNavigationBarProps> = ({
  activeTab,
  onTabChange,
  isDarkMode,
  onToggleDarkMode,
  isClockSynced,
  onToggleClockSync,
  currentTimeStr,
  activeServicePeriod,
  onTriggerCuteLoading,
}) => {
  const navItems: Array<{ id: TabId; label: string; icon: React.ElementType; emoji: string; badge?: string }> = [
    { id: 'plan', label: 'Preparation Ledger', icon: CalendarDays, emoji: '🍱' },
    { id: 'closeout', label: 'Daily Close-Out', icon: CheckSquare, emoji: '🧾' },
    { id: 'history', label: 'Radar Telemetry', icon: TrendingUp, emoji: '📈' },
    { id: 'model_lab', label: 'Model Diagnostics', icon: Cpu, emoji: '🔬', badge: 'Ridge log1p' },
    { id: 'data_settings', label: 'Economics & Config', icon: Sliders, emoji: '⚙️' },
  ];

  const mealEmojis = {
    breakfast: '🍳',
    lunch: '🥪',
    dinner: '🍛',
  };

  return (
    <header className="liquid-glass-nav sticky top-0 z-30 px-6 py-2.5 transition-all select-none">
      <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity & Animated Radar Dish */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-10 h-10 rounded-2xl bg-matcha dark:bg-matcha text-white flex items-center justify-center shadow-quirky overflow-hidden cursor-pointer group"
               onClick={onTriggerCuteLoading}
               title="Click for Cute Kitchen Radar Loading Animation!">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent animate-pulse" />
            <Radio className="w-5 h-5 text-yuzu relative z-10 transition-transform duration-300 group-hover:scale-110" strokeWidth={2.2} />
            {/* Spinning Sonar Sweep */}
            <div className="absolute inset-0 border border-white/25 rounded-full animate-ping opacity-25 pointer-events-none" />
            {/* Cute sparkle dot */}
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-persimmon animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-bold tracking-tight text-ink dark:text-ink-dark flex items-center gap-1">
                <span>Leftover Radar</span>
                <span className="text-xs text-persimmon animate-bounce">✨</span>
              </span>
              <span className="hidden lg:inline-flex sticker-badge bg-yuzu/20 text-yuzu-dark dark:text-yuzu border-yuzu/40 font-mono text-[9px] py-0.5 px-2">
                v3.PRODUCTION
              </span>
            </div>
            <div className="text-[11px] font-sans text-ink-muted dark:text-ink-dark-muted hidden sm:block">
              The Algorithmic Kitchen Companion
            </div>
          </div>
        </div>

        {/* Center: Hoverable Liquid Glass Navigation Pills */}
        <nav className="flex items-center gap-1.5 p-1 rounded-full bg-canvas-subtle/50 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline shadow-inner max-w-full overflow-x-auto py-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`liquid-glass-pill group flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  isActive ? 'liquid-pill-active' : 'text-ink dark:text-ink-dark'
                }`}
              >
                <span className="text-sm transition-transform duration-200 group-hover:scale-125">
                  {item.emoji}
                </span>
                <span className="font-sans font-bold text-xs tracking-tight">
                  {item.label}
                </span>

                {item.badge && (
                  <span className={`hidden xl:inline-block text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-matcha/10 text-matcha dark:text-matcha-light'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-persimmon animate-pulse shadow-sm" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Clock Sync Widget, Cute Preview & Theme Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Live Kitchen Clock Sync Pill */}
          <div
            onClick={onToggleClockSync}
            className={`liquid-glass-pill flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all border ${
              isClockSynced
                ? 'border-matcha/40 bg-matcha/10 dark:bg-matcha/20 text-matcha-dark dark:text-cream shadow-sm'
                : 'border-persimmon/40 bg-persimmon/10 text-persimmon dark:text-persimmon-tint'
            }`}
            title={isClockSynced ? 'Clock Synced: Automatically switches service by time of day. Click to switch to manual.' : 'Manual Service Override Active. Click to sync with live clock.'}
          >
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold tabular-nums">
              <Clock className={`w-3.5 h-3.5 ${isClockSynced ? 'text-matcha animate-pulse' : 'text-persimmon'}`} strokeWidth={2} />
              <span>{currentTimeStr}</span>
            </div>

            <div className="h-3 w-[1px] bg-ink-hairline dark:bg-white/20" />

            <div className="flex items-center gap-1 text-[11px] font-sans font-semibold">
              <span>{mealEmojis[activeServicePeriod]}</span>
              <span className="capitalize">{activeServicePeriod}</span>
            </div>

            <div className="flex items-center">
              {isClockSynced ? (
                <span className="relative flex h-2 w-2 ml-1" title="Live Clock Sync Active">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-matcha opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-matcha" />
                </span>
              ) : (
                <span className="text-[9px] font-mono font-bold bg-persimmon text-white px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5" />
                  Sync
                </span>
              )}
            </div>
          </div>

          {/* Cute Loading Screen Trigger Pill */}
          <button
            onClick={onTriggerCuteLoading}
            className="liquid-glass-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-ink-muted hover:text-matcha dark:text-cream/80 dark:hover:text-cream cursor-pointer transition-all"
            title="Preview Cute Kitchen Radar Loading Screen!"
          >
            <Sparkles className="w-3.5 h-3.5 text-yuzu animate-spin" style={{ animationDuration: '6s' }} />
            <span className="font-serif hidden md:inline">Cute Splash 🌸</span>
          </button>

          {/* Daytime / Midnight Diner Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="liquid-glass-pill p-2 rounded-full text-ink-muted hover:text-ink dark:text-cream/80 dark:hover:text-cream cursor-pointer transition-all flex items-center justify-center"
            title={isDarkMode ? 'Switch to ☀️ Daytime Kitchen' : 'Switch to 🌙 Midnight Diner'}
          >
            {isDarkMode ? (
              <span className="text-base select-none">🌙</span>
            ) : (
              <span className="text-base select-none">☀️</span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
