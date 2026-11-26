import React, { useEffect, useMemo, useState } from 'react';
import { getSymbolInfo } from '@/data/symbols';
import { cn, formatPrice } from '@/lib/utils';
import { generateOrderBookSnapshot, OrderBookLevel, TradePrint } from '@/services/marketData';
import { useTradingStore } from '@/store/useTradingStore';

export const OrderBookPanel: React.FC = () => {
  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const quotes = useTradingStore((s) => s.quotes);

  const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0];
  const info = useMemo(() => getSymbolInfo(activePane.symbol), [activePane.symbol]);
  const midPrice = quotes[activePane.symbol]?.price ?? info.basePrice;

  const [book, setBook] = useState<{
    asks: OrderBookLevel[];
    bids: OrderBookLevel[];
    spread: number;
    spreadPct: number;
  }>(() => generateOrderBookSnapshot(activePane.symbol, midPrice, 10));

  const [trades, setTrades] = useState<TradePrint[]>([]);

  useEffect(() => {
    const update = () => {
      const snap = generateOrderBookSnapshot(activePane.symbol, midPrice, 10);
      setBook(snap);
      const isBuy = Math.random() >= 0.48;
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);
      const printPrice = Number(
        (midPrice + (Math.random() - 0.5) * info.minMove * 4).toFixed(info.precision)
      );
      const size = Number(
        ((info.category === 'Crypto' ? 1.4 : info.category === 'IDX' ? 1200 : 80) *
          (0.1 + Math.random() * 1.9)).toFixed(info.category === 'Crypto' ? 3 : 0)
      );
      setTrades((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random()}`,
            price: printPrice,
            size,
            side: isBuy ? ('buy' as const) : ('sell' as const),
            time: timeStr,
          },
          ...prev,
        ].slice(0, 22)
      );
    };

    update();
    const id = window.setInterval(update, 650);
    return () => window.clearInterval(id);
  }, [activePane.symbol, midPrice, info.minMove, info.precision, info.category]);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#0F131D]">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-2.5 dark:border-[#222836]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#787B86]">
          Order Book • {info.displaySymbol}
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-[#089981]/12 px-1.5 py-0.5 text-[9px] font-bold text-[#089981]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#089981] animate-pulse" />
          L2 LIVE
        </span>
      </div>

      <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#787B86]">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      <div className="space-y-[2px] px-1.5">
        {book.asks.map((lvl, idx) => (
          <div
            key={`ask-${idx}`}
            className="relative grid grid-cols-3 items-center overflow-hidden rounded px-2 py-[3px] font-mono text-[11px] tabular-nums transition-colors hover:bg-[#F23645]/8"
          >
            <div
              style={{ width: `${lvl.pct}%` }}
              className="pointer-events-none absolute inset-y-0 right-0 rounded-l bg-gradient-to-l from-[#F23645]/22 to-[#F23645]/6 transition-all duration-300 ease-spring"
            />
            <span className="relative z-10 font-medium text-[#F23645]">
              {formatPrice(lvl.price, info.precision)}
            </span>
            <span className="relative z-10 text-right text-slate-700 dark:text-[#E2E6F0]">
              {lvl.size}
            </span>
            <span className="relative z-10 text-right text-[#787B86]">{lvl.total}</span>
          </div>
        ))}
      </div>

      <div className="mx-1.5 my-1.5 flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/90 px-2.5 py-1.5 font-mono text-[11px] dark:border-[#242B3A] dark:bg-[#161B26]">
        <span className="font-bold text-slate-900 dark:text-white">
          {formatPrice(midPrice, info.precision)}
        </span>
        <span className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] text-[#787B86] dark:bg-[#0F131D]">
          Spread {formatPrice(book.spread, info.precision)} ({book.spreadPct.toFixed(3)}%)
        </span>
      </div>

      <div className="space-y-[2px] px-1.5">
        {book.bids.map((lvl, idx) => (
          <div
            key={`bid-${idx}`}
            className="relative grid grid-cols-3 items-center overflow-hidden rounded px-2 py-[3px] font-mono text-[11px] tabular-nums transition-colors hover:bg-[#089981]/8"
          >
            <div
              style={{ width: `${lvl.pct}%` }}
              className="pointer-events-none absolute inset-y-0 right-0 rounded-l bg-gradient-to-l from-[#089981]/22 to-[#089981]/6 transition-all duration-300 ease-spring"
            />
            <span className="relative z-10 font-medium text-[#089981]">
              {formatPrice(lvl.price, info.precision)}
            </span>
            <span className="relative z-10 text-right text-slate-700 dark:text-[#E2E6F0]">
              {lvl.size}
            </span>
            <span className="relative z-10 text-right text-[#787B86]">{lvl.total}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-1 min-h-0 flex-col border-t border-slate-200/80 dark:border-[#222836]">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#787B86]">
          Recent Trades Tape
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1 font-mono text-[11px] tabular-nums">
          {trades.map((tr) => (
            <div
              key={tr.id}
              className="grid grid-cols-3 items-center rounded px-1 py-0.5 transition-colors hover:bg-slate-100/70 dark:hover:bg-[#161B26]"
            >
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 font-medium',
                  tr.side === 'buy' ? 'text-[#089981]' : 'text-[#F23645]'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    tr.side === 'buy' ? 'bg-[#089981]' : 'bg-[#F23645]'
                  )}
                />
                {formatPrice(tr.price, info.precision)}
              </span>
              <span className="text-right text-slate-700 dark:text-[#E2E6F0]">{tr.size}</span>
              <span className="text-right text-[10px] text-[#787B86]">{tr.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
