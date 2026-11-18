import React, { useMemo, useState } from 'react';
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

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-16 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-[#2A2E39]">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-[#00D4AA]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#D1D4DC]">
              Compare / Overlay Symbol (% Performance)
            </h3>
          </div>
          <button onClick={() => setOpen(false)} className="text-[#787B86] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-200 p-3 dark:border-[#2A2E39]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#787B86]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Compare against ETHUSDT, XAUUSD, SPY..."
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs outline-none focus:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#131722] dark:text-[#D1D4DC]"
            />
          </div>

          {activePane.compareSymbol && (
            <div className="mt-2 flex items-center justify-between rounded bg-[#2962FF]/15 px-2.5 py-1.5 text-xs">
              <span className="font-semibold text-[#2962FF]">
                Comparing: {getSymbolInfo(activePane.compareSymbol).displaySymbol}
              </span>
              <button
                onClick={() => {
                  setPaneCompareSymbol(activePane.id, null);
                  setOpen(false);
                }}
                className="inline-flex items-center gap-1 text-[#F23645] hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2A2E39]/60">
          {query.trim().length >= 2 && (
            <button
              onClick={() => {
                setPaneCompareSymbol(activePane.id, query.trim().toUpperCase());
                setOpen(false);
                setQuery('');
              }}
              className="flex w-full items-center justify-between bg-[#00D4AA]/10 px-4 py-2 text-left text-xs font-semibold text-[#00D4AA]"
            >
              <span>Compare Custom: {query.trim().toUpperCase()}</span>
              <span>OVERLAY</span>
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
              className="flex w-full items-center justify-between px-4 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-[#2A2E39]/60"
            >
              <div>
                <span className="font-bold text-slate-900 dark:text-[#D1D4DC]">
                  {s.displaySymbol}
                </span>
                <span className="ml-2 text-[#787B86]">{s.name}</span>
              </div>
              <span className="text-[10px] text-[#787B86]">{s.exchange}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
