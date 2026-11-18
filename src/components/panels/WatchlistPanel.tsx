import React, { useMemo, useState } from 'react';
import { Search, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { getSymbolInfo, SYMBOLS } from '@/data/symbols';
import { cn, formatPrice } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';
import { MarketCategory } from '@/types/trading';

const CATEGORIES: Array<'All' | MarketCategory> = ['All', 'Crypto', 'Forex', 'Stocks', 'IDX', 'Commodities'];

const MiniSparkline: React.FC<{ values: number[]; positive: boolean }> = ({ values, positive }) => {
  if (values.length < 2) return <div className="h-4 w-11" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 42;
      const y = 14 - ((v - min) / span) * 12;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width="44" height="16" className="shrink-0 overflow-visible">
      <polyline
        fill="none"
        stroke={positive ? '#089981' : '#F23645'}
        strokeWidth="1.4"
        points={pts}
      />
    </svg>
  );
};

export const WatchlistPanel: React.FC = () => {
  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const updatePaneSymbol = useTradingStore((s) => s.updatePaneSymbol);
  const watchlist = useTradingStore((s) => s.watchlist);
  const toggleWatchlistSymbol = useTradingStore((s) => s.toggleWatchlistSymbol);
  const quotes = useTradingStore((s) => s.quotes);
  const setBottomPanelOpen = useTradingStore((s) => s.setBottomPanelOpen);
  const setBottomPanelTab = useTradingStore((s) => s.setBottomPanelTab);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | MarketCategory>('All');
  const [starredOnly, setStarredOnly] = useState(false);

  const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0];
  const activeInfo = getSymbolInfo(activePane.symbol);
  const activeQuote = quotes[activePane.symbol];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SYMBOLS.filter((s) => {
      if (category !== 'All' && s.category !== category) return false;
      if (starredOnly && !watchlist.includes(s.symbol)) return false;
      if (!q) return true;
      return (
        s.symbol.toLowerCase().includes(q) ||
        s.displaySymbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
      );
    });
  }, [query, category, starredOnly, watchlist]);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#131722]">
      {/* Header */}
      <div className="border-b border-slate-200 p-2.5 dark:border-[#2A2E39]">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#787B86]">
            Watchlist
          </span>
          <button
            onClick={() => setStarredOnly(!starredOnly)}
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold transition',
              starredOnly
                ? 'bg-amber-500/15 text-amber-400'
                : 'text-[#787B86] hover:text-[#D1D4DC]'
            )}
          >
            <Star className={cn('h-3 w-3', starredOnly && 'fill-amber-400')} />
            Starred
          </button>
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#787B86]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter symbols..."
            className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-xs text-slate-900 outline-none focus:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#1E222D] dark:text-[#D1D4DC]"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-semibold transition',
                category === cat
                  ? 'bg-[#2962FF] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#1E222D] dark:text-[#787B86] dark:hover:text-[#D1D4DC]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1 text-[10px] font-semibold text-[#787B86] dark:border-[#2A2E39]/70">
        <span>Symbol</span>
        <span>Last / Chg%</span>
      </div>

      {/* Symbol Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2A2E39]/40">
        {filtered.map((sym) => {
          const quote = quotes[sym.symbol];
          const price = quote?.price ?? sym.basePrice;
          const pct = quote?.changePercent ?? 0;
          const isUp = pct >= 0;
          const isSelected = activePane.symbol === sym.symbol;
          const isStarred = watchlist.includes(sym.symbol);

          return (
            <div
              key={sym.symbol}
              onClick={() => updatePaneSymbol(activePane.id, sym.symbol)}
              className={cn(
                'group flex cursor-pointer items-center justify-between gap-2 px-2.5 py-1.5 transition',
                isSelected
                  ? 'bg-[#2962FF]/12 border-l-2 border-l-[#2962FF]'
                  : 'hover:bg-slate-50 dark:hover:bg-[#1E222D]'
              )}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWatchlistSymbol(sym.symbol);
                  }}
                  className={cn(
                    'shrink-0 transition',
                    isStarred ? 'text-amber-400' : 'text-[#787B86] opacity-25 group-hover:opacity-100'
                  )}
                >
                  <Star className={cn('h-3 w-3', isStarred && 'fill-amber-400')} />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-xs font-bold text-slate-900 dark:text-[#D1D4DC]">
                      {sym.displaySymbol}
                    </span>
                    <span className="text-[9px] font-medium text-[#787B86]">{sym.exchange}</span>
                  </div>
                  <div className="truncate text-[10px] text-[#787B86]">{sym.name}</div>
                </div>
              </div>

              <MiniSparkline values={quote?.sparkline ?? [price, price]} positive={isUp} />

              <div className="shrink-0 text-right font-mono tabular-nums">
                <div className="text-xs font-semibold text-slate-900 dark:text-[#D1D4DC]">
                  {formatPrice(price, sym.precision)}
                </div>
                <div
                  className={cn(
                    'text-[10px] font-semibold',
                    isUp ? 'text-[#089981]' : 'text-[#F23645]'
                  )}
                >
                  {isUp ? '+' : ''}
                  {pct.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Instrument Quick Summary */}
      <div className="border-t border-slate-200 bg-slate-50/70 p-2.5 dark:border-[#2A2E39] dark:bg-[#0C0F17]/50">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-[#D1D4DC]">
            {activeInfo.displaySymbol}
          </span>
          <span className="text-[10px] font-semibold text-[#2962FF]">{activeInfo.category}</span>
        </div>
        <p className="mb-2 line-clamp-2 text-[10px] text-[#787B86]">{activeInfo.description}</p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => {
              setBottomPanelTab('trade');
              setBottomPanelOpen(true);
            }}
            className="flex items-center justify-center gap-1 rounded bg-[#089981] py-1.5 text-[11px] font-bold text-white transition hover:brightness-110"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Buy {activeQuote ? formatPrice(activeQuote.price, activeInfo.precision) : ''}
          </button>
          <button
            onClick={() => {
              setBottomPanelTab('trade');
              setBottomPanelOpen(true);
            }}
            className="flex items-center justify-center gap-1 rounded bg-[#F23645] py-1.5 text-[11px] font-bold text-white transition hover:brightness-110"
          >
            <TrendingDown className="h-3.5 w-3.5" />
            Sell {activeQuote ? formatPrice(activeQuote.price, activeInfo.precision) : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
