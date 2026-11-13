import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Heart } from 'lucide-react';

interface CuteLoadingScreenProps {
  isLoading: boolean;
  onDismiss: () => void;
  servicePeriod?: 'breakfast' | 'lunch' | 'dinner';
  serviceDate?: string;
}

export const CuteLoadingScreen: React.FC<CuteLoadingScreenProps> = ({
  isLoading,
  onDismiss,
  servicePeriod = 'lunch',
  serviceDate = '2026-11-14',
}) => {
  const [progress, setProgress] = useState<number>(15);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const steps = [
    { emoji: '🍙', text: "Warming up the cafeteria ovens & fetching pantry logs..." },
    { emoji: '🌤️', text: "Checking weather shocks & campus cultural fest signals..." },
    { emoji: '🔬', text: "Fitting Ridge log1p regression on historical diner demand..." },
    { emoji: '⚖️', text: "Calibrating Newsvendor loss fractile q* = c_s / (c_s + c_w)..." },
    { emoji: '🍱', text: "Plating your optimal 80% conformal anti-waste forecast! ✨" },
  ];

  // Animate progress and step sequence
  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }

    setProgress(20);
    setActiveStepIndex(0);

    const timer1 = setTimeout(() => {
      setProgress(45);
      setActiveStepIndex(1);
    }, 450);

    const timer2 = setTimeout(() => {
      setProgress(70);
      setActiveStepIndex(2);
    }, 950);

    const timer3 = setTimeout(() => {
      setProgress(88);
      setActiveStepIndex(3);
    }, 1450);

    const timer4 = setTimeout(() => {
      setProgress(100);
      setActiveStepIndex(4);
    }, 1900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 dark:bg-canvas-dark/85 backdrop-blur-2xl animate-in fade-in duration-300">
      {/* Playful Ambient Color Orbs (Color Theory: Matcha + Yuzu + Persimmon + Berry) */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-yuzu/25 dark:bg-yuzu/15 blur-3xl pointer-events-none animate-liquid-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-persimmon/20 dark:bg-persimmon/10 blur-3xl pointer-events-none animate-liquid-glow" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-88 h-88 rounded-full bg-matcha/15 dark:bg-matcha/20 blur-3xl pointer-events-none" />

      {/* Main Cute Modal Card */}
      <div className="relative w-full max-w-xl quirky-card p-8 md:p-10 text-center shadow-2xl border-2 border-matcha/30 dark:border-matcha/40 bg-surface/85 dark:bg-surface-dark/85 overflow-hidden">
        
        {/* Steam Puffs Animation */}
        <div className="flex justify-center gap-6 mb-1 h-6">
          <span className="text-sm select-none animate-steam-float" style={{ animationDelay: '0s' }}>💨</span>
          <span className="text-sm select-none animate-steam-float" style={{ animationDelay: '0.8s' }}>✨</span>
          <span className="text-sm select-none animate-steam-float" style={{ animationDelay: '1.4s' }}>💨</span>
        </div>

        {/* Cute Mascot: Bouncing Kawaii Onigiri & Radar Dish */}
        <div className="relative mx-auto w-28 h-28 mb-5 animate-mascot-bounce select-none">
          {/* Pulsing Radar Ring behind Mascot */}
          <div className="absolute inset-0 rounded-full bg-matcha/15 dark:bg-matcha/25 animate-ping opacity-35" />
          
          <div className="relative w-full h-full rounded-3xl bg-gradient-to-b from-white to-canvas-subtle dark:from-white/10 dark:to-white/5 border-2 border-matcha/30 shadow-tactile flex flex-col items-center justify-center overflow-hidden">
            {/* Cute Little Antenna */}
            <div className="absolute -top-1 w-2 h-4 bg-persimmon rounded-full" />
            <div className="absolute -top-2 w-3.5 h-3.5 bg-yuzu rounded-full border border-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-persimmon" />
            </div>

            {/* Kawaii Face */}
            <div className="text-4xl mt-1 select-none">🍙</div>
            
            {/* Blushing Cheeks */}
            <div className="flex items-center justify-center gap-6 -mt-2">
              <span className="w-2.5 h-1.5 rounded-full bg-berry/40" />
              <span className="w-2.5 h-1.5 rounded-full bg-berry/40" />
            </div>

            {/* Little Matcha Base */}
            <div className="w-10 h-3 rounded-full bg-matcha mt-1" />
          </div>

          {/* Floating Orbiting Food Buddies */}
          <span className="absolute -top-2 -right-3 text-lg animate-bounce" style={{ animationDuration: '2s' }}>🥐</span>
          <span className="absolute -bottom-2 -left-3 text-lg animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>🥪</span>
          <span className="absolute -top-2 -left-3 text-lg animate-bounce" style={{ animationDuration: '2.2s', animationDelay: '1s' }}>🍛</span>
          <span className="absolute -bottom-2 -right-3 text-lg animate-bounce" style={{ animationDuration: '1.8s', animationDelay: '0.7s' }}>☕</span>
        </div>

        {/* Huge Cute Typography (Fraunces + Color Theory) */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yuzu/25 border border-yuzu/40 text-ink dark:text-yuzu text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-persimmon animate-spin" style={{ animationDuration: '5s' }} />
            <span>Kitchen Sonar In Motion</span>
            <span className="capitalize">• {servicePeriod}</span>
          </div>

          <h2 className="font-serif font-black text-3xl sm:text-5xl text-matcha-dark dark:text-cream tracking-tight leading-tight">
            Simmering the Numbers! 🍲
          </h2>

          <p className="text-xs sm:text-sm text-ink-muted dark:text-ink-dark-muted font-sans max-w-md mx-auto">
            Leftover Radar is blending historical consumption patterns with real-time weather & calendar signals.
          </p>
        </div>

        {/* Bubbly Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="w-full bg-canvas-subtle dark:bg-white/10 h-3.5 rounded-full overflow-hidden p-0.5 border border-matcha/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-matcha via-yuzu to-persimmon transition-all duration-300 shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono font-bold text-ink-muted">
            <span>Calibrating...</span>
            <span className="text-matcha-dark dark:text-matcha-light">{progress}% Complete</span>
          </div>
        </div>

        {/* Dynamic Rotating Step Checklist */}
        <div className="mt-5 p-4 rounded-2xl bg-canvas-subtle/70 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline text-left">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold mb-2">
            Algorithmic Preparation Sequence
          </div>
          <div className="space-y-2">
            {steps.map((st, idx) => {
              const isPast = idx < activeStepIndex;
              const isCurrent = idx === activeStepIndex;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2.5 text-xs transition-all duration-200 ${
                    isCurrent
                      ? 'font-bold text-ink dark:text-ink-dark translate-x-1'
                      : isPast
                      ? 'text-matcha dark:text-matcha-light line-through opacity-70'
                      : 'text-ink-muted/50 dark:text-ink-dark-muted/40'
                  }`}
                >
                  <span className="text-sm select-none">{st.emoji}</span>
                  <span className="font-sans flex-1 truncate">{st.text}</span>
                  {isPast && <span className="text-matcha text-xs font-mono font-bold">✓</span>}
                  {isCurrent && <span className="w-2 h-2 rounded-full bg-persimmon animate-ping" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dismiss / Skip Action (UI/UX Principle: User Freedom) */}
        <div className="mt-6 flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-ink-muted">
            <Heart className="w-3.5 h-3.5 text-berry fill-berry" />
            <span>Zero Food Waste Mission</span>
          </div>

          <button
            onClick={onDismiss}
            className="btn-tactile flex items-center gap-2 px-5 py-2.5 rounded-full bg-matcha hover:bg-matcha-hover text-white text-xs font-bold font-sans cursor-pointer shadow-tactile transition-all"
          >
            <span>Enter Kitchen Ledger</span>
            <ArrowRight className="w-3.5 h-3.5 text-yuzu" />
          </button>
        </div>

      </div>
    </div>
  );
};
