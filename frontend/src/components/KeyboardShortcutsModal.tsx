import React from 'react';
import { X, Keyboard, Sparkles, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Navigation & Views',
      items: [
        { key: '1', description: 'Jump to Preparation Ledger' },
        { key: '2', description: 'Jump to Telemetry & Verification' },
        { key: '3', description: 'Jump to Unit Economics Settings' },
        { key: 'D', description: 'Toggle Night Mode (Dark Theme)' },
      ],
    },
    {
      category: 'Kitchen Planning Actions',
      items: [
        { key: 'B', description: 'Apply Balanced (Newsvendor) Preset' },
        { key: 'P', description: 'Open Printable Kitchen Prep Sheet' },
        { key: 'M', description: 'Open Model Benchmark Arena' },
        { key: 'I', description: 'Open Raw Ingredients Bill of Materials (BOM)' },
        { key: 'W', description: 'Open 7-Day Rolling Outlook' },
        { key: 'C', description: 'Open End-of-Shift Close-Out Modal' },
      ],
    },
    {
      category: 'General & Dialogs',
      items: [
        { key: '?', description: 'Show this Keyboard Shortcuts cheat sheet' },
        { key: 'Esc', description: 'Close any active modal, sheet, or drawer' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-surface dark:bg-surface-dark border-2 border-matcha/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-ink-hairline dark:border-ink-dark-hairline bg-canvas-subtle/50 dark:bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-matcha text-white flex items-center justify-center shadow-tactile">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="sticker-badge bg-matcha/15 text-matcha-dark dark:text-matcha-light border-matcha/30 font-mono text-[10px]">
                  WORKSTATION EFFICIENCY
                </span>
                <span className="text-xs font-mono text-ink-muted">Hotkeys & Tactile Controls</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-ink dark:text-ink-dark mt-0.5">
                Kitchen Keyboard Shortcuts
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-muted hover:text-ink dark:hover:text-ink-dark hover:bg-canvas-subtle transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {shortcuts.map((section, idx) => (
            <div key={idx} className="space-y-2.5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-persimmon" />
                <span>{section.category}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="p-3 rounded-2xl bg-canvas-subtle/60 dark:bg-white/5 border border-ink-hairline dark:border-ink-dark-hairline flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-ink dark:text-ink-dark font-medium">{item.description}</span>
                    <kbd className="px-2.5 py-1 rounded-xl bg-surface dark:bg-surface-dark border-2 border-ink-hairline dark:border-ink-dark-hairline text-xs font-mono font-bold shadow-tactile text-persimmon shrink-0">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ink-hairline dark:border-ink-dark-hairline bg-canvas-subtle/50 dark:bg-white/5 text-center text-xs text-ink-muted font-mono">
          Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-ink-hairline font-bold">?</kbd> at any time to toggle this quick reference.
        </div>
      </div>
    </div>
  );
};
