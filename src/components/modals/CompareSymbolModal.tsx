import React, { useEffect, useMemo, useState } from 'react';
import { GitCompare, Search, Trash2, X } from 'lucide-react';
import { getSymbolInfo, SYMBOLS } from '@/data/symbols';
import { useTradingStore } from '@/store/useTradingStore';

export const CompareSymbolModal: React.FC = () => {
  const open = useTradingStore((s) => s.compareModalOpen);
  const setOpen = useTradingStore((s) => s.setCompareModalOpen);
  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const setPaneCompareSymbol = useTradingStore((s) => s.setPaneCompareSymbol);

  const [query, setQuery] = useState('');

  const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SYMBOLS.filter(
      (s) =>
        s.symbol !== activePane.symbol &&
        (!q ||
          s.symbol.toLowerCase().includes(q) ||
          s.displaySymbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q))
    );
  }, [query, activePane.symbol]);

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
      className="apex-modal-backdrop fixed inset-0 z-50 flex items-start justify-center bg-[#05070B]/70 px-3 pt-16 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="apex-modal-card w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white/[0.98] dark:border-[#262E40] dark:bg-[#131823]/[0.98]"
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 dark:border-[#22293A]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00D4AA]/12 text-[#00D4AA] ring-1 ring-[#00D4AA]/25">
              <GitCompare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Compare / Overlay Symbol
              </h3>
              <div className="text-[10px] font-medium text-[#7D8596]">Normalized % Performance</div>
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

        <div className="border-b border-slate-200/80 p-3.5 dark:border-[#22293A]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#787B86]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Compare against ETHUSDT, XAUUSD, SPY..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/90 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none transition focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20 dark:border-[#262E40] dark:bg-[#0D111A] dark:text-white"
            />
          </div>

          {activePane.compareSymbol && (
            <div className="mt-2.5 flex items-center justify-between rounded-xl border border-[#2962FF]/25 bg-[#2962FF]/12 px-3 py-2 text-xs">
              <span className="font-semibold text-[#4C82FF]">
                Comparing: {getSymbolInfo(activePane.compareSymbol).displaySymbol}
              </span>
              <button
                onClick={() => {
                  setPaneCompareSymbol(activePane.id, null);
                  setOpen(false);
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold text-[#F23645] transition hover:bg-[#F23645]/15"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1E2434]">
          {query.trim().length >= 2 && (
            <button
              onClick={() => {
                setPaneCompareSymbol(activePane.id, query.trim().toUpperCase());
                setOpen(false);
                setQuery('');
              }}
              className="flex w-full items-center justify-between bg-[#00D4AA]/10 px-4 py-2.5 text-left text-xs font-semibold text-[#00D4AA] transition hover:bg-[#00D4AA]/15"
            >
              <span>Compare Custom: {query.trim().toUpperCase()}</span>
              <span className="rounded bg-[#00D4AA]/20 px-1.5 py-0.5 text-[10px]">OVERLAY</span>
            </button>
          )}
          {filtered.map((s) => (
            <button
              key={s.symbol}
              onClick={() => {
                setPaneCompareSymbol(activePane.id, s.symbol);
                setOpen(false);
                setQuery('');
              }}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-[#192030]"
            >
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {s.displaySymbol}
                </span>
                <span className="ml-2 text-[#7D8596]">{s.name}</span>
              </div>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-[#787B86] dark:bg-[#0D111A]">
                {s.exchange}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
