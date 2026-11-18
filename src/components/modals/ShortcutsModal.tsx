import React from 'react';
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

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-[#2A2E39]">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-[#2962FF]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#D1D4DC]">
              Keyboard & Mouse Shortcuts
            </h3>
          </div>
          <button onClick={() => setOpen(false)} className="text-[#787B86] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100 p-2 dark:divide-[#2A2E39]/60">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between px-2 py-2 text-xs">
              <span className="text-slate-600 dark:text-[#D1D4DC]">{s.desc}</span>
              <kbd className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-800 dark:bg-[#131722] dark:text-[#D1D4DC]">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
