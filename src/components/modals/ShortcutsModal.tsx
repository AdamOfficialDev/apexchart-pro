import React, { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useTradingStore } from '@/store/useTradingStore';

const SHORTCUTS = [
  { keys: 'Right-Click Chart', desc: 'Context Menu (Reset, Alert, Order, Smart AI, Replay)' },
  { keys: 'Double-Click Axis', desc: 'Auto-fit Price Scale or Reset Time Scale' },
  { keys: 'Double-Click Chart', desc: 'Open Chart Appearance Settings' },
  { keys: 'Alt + Shift + R', desc: 'Reset Chart View to Latest' },
  { keys: 'Ctrl + K / ⌘K', desc: 'Open Symbol Search Command Palette' },
  { keys: 'Ctrl + Z / Ctrl + Y', desc: 'Undo / Redo Drawing' },
  { keys: 'Alt + T / H / V', desc: 'Trend Line / Horizontal / Vertical Line' },
  { keys: 'Alt + F / R', desc: 'Fib Retracement / Rectangle Zone' },
  { keys: 'Alt + L / S', desc: 'Long / Short Position R:R Box' },
  { keys: 'Alt + M / E', desc: 'OHLC Magnet Snap / Eraser Tool' },
  { keys: 'Space', desc: 'Play / Pause Bar Replay' },
  { keys: '← / →', desc: 'Step Backward / Forward in Replay' },
  { keys: 'Delete', desc: 'Remove Selected Drawing' },
  { keys: 'Shift + F', desc: 'Toggle Fullscreen' },
  { keys: 'Esc', desc: 'Cancel Draft / Reset Tool to Cursor' },
];

export const ShortcutsModal: React.FC = () => {
  const open = useTradingStore((s) => s.shortcutsModalOpen);
  const setOpen = useTradingStore((s) => s.setShortcutsModalOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      className="apex-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#05070B]/70 p-3 sm:p-4 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="apex-modal-card w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/90 bg-white/[0.98] dark:border-[#262E40] dark:bg-[#131823]/[0.98]"
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 dark:border-[#22293A]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2962FF]/12 text-[#4C82FF] ring-1 ring-[#2962FF]/25">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Keyboard & Mouse Shortcuts
              </h3>
              <div className="text-[10px] font-medium text-[#7D8596]">
                Speed up chart navigation & drawing workflow
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#787B86] dark:border-[#283144] dark:bg-[#0D111A]">
              ESC
            </kbd>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close modal"
              className="rounded-lg p-1.5 text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 active:scale-90 dark:hover:bg-[#1E2536] dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100 p-2.5 dark:divide-[#1E2434]">
          {SHORTCUTS.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-[#192030]"
            >
              <span className="text-slate-700 dark:text-[#D1D4DC]">{s.desc}</span>
              <kbd className="shrink-0 rounded-lg border border-slate-200 bg-slate-100/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-800 shadow-[0_1px_0_rgba(0,0,0,0.08)] dark:border-[#283144] dark:bg-[#0D111A] dark:text-[#E2E6F0]">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
