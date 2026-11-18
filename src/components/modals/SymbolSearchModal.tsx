import React, { useEffect, useMemo, useState } from 'react';
import { PlusCircle, Search, X } from 'lucide-react';
import { getSymbolInfo, SYMBOLS } from '@/data/symbols';
import { cn, formatPrice } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';
import { MarketCategory } from '@/types/trading';

const CATS: Array<'All' | MarketCategory> = ['All', 'Crypto', 'Forex', 'Stocks', 'IDX', 'Commodities'];

export const SymbolSearchModal: React.FC = () => {
  const open = useTradingStore((s) => s.searchModalOpen);
  const setOpen = useTradingStore((s) => s.setSearchModalOpen);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const updatePaneSymbol = useTradingStore((s) => s.updatePaneSymbol);
  const watchlist = useTradingStore((s) => s.watchlist);
  const toggleWatchlistSymbol = useTradingStore((s) => s.toggleWatchlistSymbol);
  const quotes = useTradingStore((s) => s.quotes);

  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<'All' | MarketCategory>('All');
  const [selectedIdx, setSelectedIdx] = useState(0);

  const cleanQuery = query.trim().toUpperCase().replace(/\s+/g, '');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SYMBOLS.filter((s) => {
      if (cat !== 'All' && s.category !== cat) return false;
      if (!q) return true;
      return (
        s.symbol.toLowerCase().includes(q) ||
        s.displaySymbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.exchange.toLowerCase().includes(q)
      );
    });
  }, [query, cat]);

  const exactMatchExists = useMemo(
    () =>
      SYMBOLS.some(
        (s) => s.symbol.toUpperCase() === cleanQuery || s.displaySymbol.toUpperCase() === cleanQuery
      ),
    [cleanQuery]
  );

  const customPreview = useMemo(
    () => (cleanQuery.length >= 2 && !exactMatchExists ? getSymbolInfo(cleanQuery) : null),
    [cleanQuery, exactMatchExists]
  );

  useEffect(() => {
    setSelectedIdx(0);
  }, [query, cat, open]);

  if (!open) return null;

  const choose = (symbol: string) => {
    updatePaneSymbol(activePaneId, symbol);
    setOpen(false);
    setQuery('');
  };

  const addAndChooseCustom = () => {
    if (!customPreview) return;
    if (!watchlist.includes(customPreview.symbol)) {
      toggleWatchlistSymbol(customPreview.symbol);
    }
    choose(customPreview.symbol);
  };

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-16 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D]"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-3 dark:border-[#2A2E39]">
          <Search className="h-4 w-4 text-[#2962FF]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIdx((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIdx((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                if (results[selectedIdx]) choose(results[selectedIdx].symbol);
                else if (customPreview) addAndChooseCustom();
              }
            }}
            placeholder="Search or type ANY ticker (e.g. PEPEUSDT, SUIUSDT, MSFT, ADRO.JK)..."
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-[#787B86] dark:text-[#D1D4DC]"
          />
          <button onClick={() => setOpen(false)} className="text-[#787B86] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 px-4 py-2 dark:border-[#2A2E39]">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-semibold transition',
                cat === c
                  ? 'bg-[#2962FF] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#131722] dark:text-[#D1D4DC]'
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2A2E39]/60">
          {customPreview && (
            <button
              onClick={addAndChooseCustom}
              className="flex w-full items-center justify-between bg-[#00D4AA]/10 px-4 py-2.5 text-left hover:bg-[#00D4AA]/20"
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle className="h-4 w-4 text-[#00D4AA]" />
                <div>
                  <div className="text-xs font-bold text-[#00D4AA]">
                    Load Custom Ticker: {customPreview.displaySymbol}
                  </div>
                  <div className="text-[10px] text-[#787B86]">
                    {customPreview.description} • Auto-added to Watchlist
                  </div>
                </div>
              </div>
              <span className="rounded bg-[#00D4AA]/20 px-2 py-0.5 text-[10px] font-bold text-[#00D4AA]">
                {customPreview.exchange}
              </span>
            </button>
          )}

          {results.length === 0 && !customPreview ? (
            <div className="p-8 text-center text-xs text-[#787B86]">
              Type any ticker symbol (like PEPEUSDT, MSFT, ADRO.JK, AUDUSD) to load dynamically.
            </div>
          ) : (
            results.map((s, idx) => {
              const q = quotes[s.symbol];
              return (
                <button
                  key={s.symbol}
                  onClick={() => choose(s.symbol)}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-2.5 text-left transition',
                    idx === selectedIdx
                      ? 'bg-[#2962FF]/15'
                      : 'hover:bg-slate-50 dark:hover:bg-[#2A2E39]/60'
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-[#D1D4DC]">
                        {s.displaySymbol}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-[#131722] dark:text-[#787B86]">
                        {s.category}
                      </span>
                    </div>
                    <div className="text-xs text-[#787B86]">{s.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-semibold text-slate-800 dark:text-[#D1D4DC]">
                      {formatPrice(q?.price ?? s.basePrice, s.precision)}
                    </div>
                    <div className="text-[10px] text-[#787B86]">{s.exchange}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
