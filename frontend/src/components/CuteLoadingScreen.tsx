import React, { useState, useEffect } from 'react';

interface CuteLoadingScreenProps {
  isLoading: boolean;
  onDismiss: () => void;
}

export const CuteLoadingScreen: React.FC<CuteLoadingScreenProps> = ({
  isLoading,
  onDismiss,
}) => {
  const [activePhraseIndex, setActivePhraseIndex] = useState<number>(0);
  const [shouldRender, setShouldRender] = useState<boolean>(isLoading);

  const phrases = [
    'Leftover Radar',
    'Simmering the Numbers',
    'Plating with Care',
    'Ready to Serve',
  ];

  // Rotate text phrases smoothly
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setActivePhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 500);

    const handleKey = () => onDismiss();
    window.addEventListener('keydown', handleKey);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isLoading, phrases.length, onDismiss]);

  // Handle smooth exit transition
  useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 700); // Wait for fade-out transition
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div
      onClick={onDismiss}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-canvas/92 dark:bg-canvas-dark/95 backdrop-blur-3xl cursor-pointer select-none transition-opacity duration-700 ease-out ${
        isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Ambient Color Theory Glow (Matcha + Yuzu + Persimmon) */}
      <div className="absolute w-[450px] h-[450px] rounded-full bg-matcha/10 dark:bg-matcha/15 blur-[100px] pointer-events-none animate-liquid-glow" />
      <div className="absolute w-[350px] h-[350px] rounded-full bg-yuzu/15 dark:bg-yuzu/10 blur-[80px] pointer-events-none animate-liquid-glow" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto space-y-8">
        
        {/* Simple Cute Loading Circle with Liquid Gradients */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Subtle Outer Glow Ring */}
          <div className="absolute inset-0 rounded-full bg-matcha/20 dark:bg-matcha/30 blur-xl animate-pulse" />

          {/* SVG Animated Circular Spinner */}
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="cuteCircleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E4D38" />
                <stop offset="50%" stopColor="#F7C948" />
                <stop offset="100%" stopColor="#FF6B35" />
              </linearGradient>
            </defs>

            {/* Background Muted Track */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-matcha/15 dark:text-white/10"
            />

            {/* Spinning Glowing Arc */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="url(#cuteCircleGrad)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray="251.2"
              strokeDashoffset="75"
              className="animate-spin origin-center"
              style={{ animationDuration: '1.4s' }}
            />
          </svg>

          {/* Center Pulsing Accent Dot */}
          <div className="absolute w-3.5 h-3.5 rounded-full bg-persimmon animate-ping opacity-60" />
          <div className="absolute w-3 h-3 rounded-full bg-matcha dark:bg-matcha-light" />
        </div>

        {/* Huge, Cute Text Font (Fraunces Optical Serif) with Smooth Fade Transition */}
        <div className="space-y-3 min-h-[140px] flex flex-col justify-center items-center">
          <h1
            key={activePhraseIndex}
            className="font-serif font-black text-5xl sm:text-7xl md:text-8xl text-matcha-dark dark:text-cream tracking-tight leading-tight animate-in fade-in zoom-in-95 duration-500"
          >
            {phrases[activePhraseIndex]}
          </h1>

          <p className="font-sans font-medium text-xs sm:text-sm tracking-wide text-ink-muted dark:text-ink-dark-muted uppercase font-mono">
            The Algorithmic Kitchen Companion
          </p>
        </div>

        {/* Minimal Tap to Skip Hint */}
        <div className="pt-4 text-[11px] font-mono text-ink-muted/60 dark:text-ink-dark-muted/50">
          Click anywhere to enter kitchen
        </div>

      </div>
    </div>
  );
};
