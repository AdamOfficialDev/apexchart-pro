import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  Terminal,
  X,
} from 'lucide-react';
import { getSymbolInfo } from '@/data/symbols';
import { cn, formatPrice, formatTimestamp } from '@/lib/utils';
import { runBacktest } from '@/services/backtester';
import { fetchHistoricalCandles } from '@/services/marketData';
import { BottomPanelTab, useTradingStore } from '@/store/useTradingStore';
import { BacktestResult, BacktestStrategyId } from '@/types/trading';

const STRATEGIES: { id: BacktestStrategyId; label: string }[] = [
  { id: 'rsi_divergence', label: 'RSI Divergence Pro' },
  { id: 'ema_cross', label: 'EMA Cross (9/21)' },
  { id: 'supertrend', label: 'Supertrend (10,3)' },
  { id: 'rsi_reversion', label: 'RSI Reversion' },
  { id: 'bb_breakout', label: 'BB Breakout' },
];

const EquityCurveChart: React.FC<{ values: number[]; positive: boolean }> = ({
  values,
  positive,
}) => {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 240;
  const h = 48;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 4 - ((v - min) / span) * (h - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="overflow-visible rounded bg-slate-100/60 dark:bg-[#0C0F17]/70 p-1">
      <polyline
        fill="none"
        stroke={positive ? '#089981' : '#F23645'}
        strokeWidth="1.8"
        points={pts}
      />
    </svg>
  );
};

export const TradingTerminal: React.FC = () => {
  const open = useTradingStore((s) => s.bottomPanelOpen);
  const setOpen = useTradingStore((s) => s.setBottomPanelOpen);
  const tab = useTradingStore((s) => s.bottomPanelTab);
  const setTab = useTradingStore((s) => s.setBottomPanelTab);
  const bottomHeight = useTradingStore((s) => s.panelSizes.bottomHeight);
  const updatePanelSizes = useTradingStore((s) => s.updatePanelSizes);

  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const quotes = useTradingStore((s) => s.quotes);
  const dataFeed = useTradingStore((s) => s.dataFeed);
  const rsiDivConfig = useTradingStore((s) => s.rsiDivConfig);

  const paperBalance = useTradingStore((s) => s.paperBalance);
  const positions = useTradingStore((s) => s.positions);
  const pendingOrders = useTradingStore((s) => s.pendingOrders);
  const closedTrades = useTradingStore((s) => s.closedTrades);

  const placeMarketOrder = useTradingStore((s) => s.placeMarketOrder);
  const placeLimitOrder = useTradingStore((s) => s.placeLimitOrder);
  const cancelPendingOrder = useTradingStore((s) => s.cancelPendingOrder);
  const closePosition = useTradingStore((s) => s.closePosition);
  const resetPaperAccount = useTradingStore((s) => s.resetPaperAccount);

  const showBacktestOnChart = useTradingStore((s) => s.showBacktestOnChart);
  const setBacktestOverlay = useTradingStore((s) => s.setBacktestOverlay);

  const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0];
  const info = useMemo(() => getSymbolInfo(activePane.symbol), [activePane.symbol]);
  const markPrice = quotes[activePane.symbol]?.price ?? info.basePrice;

  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [qtyInput, setQtyInput] = useState('0.5');
  const [limitInput, setLimitInput] = useState(String(markPrice));
  const [slInput, setSlInput] = useState('');
  const [tpInput, setTpInput] = useState('');

  // Backtester State
  const [strategyId, setStrategyId] = useState<BacktestStrategyId>('rsi_divergence');
  const [btCapital, setBtCapital] = useState('10000');
  const [btResult, setBtResult] = useState<BacktestResult | null>(null);
  const [btLoading, setBtLoading] = useState(false);

  useEffect(() => {
    setLimitInput(String(markPrice));
    setSlInput('');
    setTpInput('');
  }, [activePane.symbol]);

  const totalUnrealizedPnl = useMemo(() => {
    return positions.reduce((sum, pos) => {
      const pInfo = getSymbolInfo(pos.symbol);
      const curr = quotes[pos.symbol]?.price ?? pInfo.basePrice;
      const diff = pos.side === 'buy' ? curr - pos.entryPrice : pos.entryPrice - curr;
      return sum + diff * pos.quantity;
    }, 0);
  }, [positions, quotes]);

  const equity = paperBalance + totalUnrealizedPnl;

  const submitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(qtyInput);
    if (!Number.isFinite(qty) || qty <= 0) return;

    const sl = slInput ? Number(slInput) : undefined;
    const tp = tpInput ? Number(tpInput) : undefined;

    if (orderType === 'market') {
      placeMarketOrder({
        symbol: activePane.symbol,
        side,
        quantity: qty,
        price: markPrice,
        stopLoss: sl,
        takeProfit: tp,
      });
    } else {
      const lim = Number(limitInput);
      if (!Number.isFinite(lim) || lim <= 0) return;
      placeLimitOrder({
        symbol: activePane.symbol,
        side,
        quantity: qty,
        limitPrice: lim,
        stopLoss: sl,
        takeProfit: tp,
      });
    }
  };

  const applyRiskSizing = (riskPct: number) => {
    const entry = orderType === 'market' ? markPrice : Number(limitInput) || markPrice;
    const sl = Number(slInput);
    const riskDollars = equity * (riskPct / 100);
    if (Number.isFinite(sl) && sl > 0 && Math.abs(entry - sl) > 0) {
      const qty = riskDollars / Math.abs(entry - sl);
      setQtyInput(qty >= 10 ? qty.toFixed(1) : qty.toFixed(4));
    } else {
      const qty = riskDollars / Math.max(entry * 0.01, info.minMove);
      setQtyInput(qty >= 10 ? qty.toFixed(1) : qty.toFixed(4));
    }
  };

  const setNotionalSize = (usd: number) => {
    if (markPrice <= 0) return;
    const qty = usd / markPrice;
    setQtyInput(qty >= 10 ? qty.toFixed(1) : qty.toFixed(4));
  };

  const handleRunBacktest = async (selectedStrat = strategyId) => {
    setBtLoading(true);
    try {
      const { candles } = await fetchHistoricalCandles(
        activePane.symbol,
        activePane.timeframe,
        dataFeed
      );
      const cap = Math.max(100, Number(btCapital) || 10000);
      const res = runBacktest(candles, selectedStrat, cap, rsiDivConfig);
      setBtResult(res);
      setBacktestOverlay(res.trades, true);
    } finally {
      setBtLoading(false);
    }
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = bottomHeight;
    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      updatePanelSizes({ bottomHeight: Math.max(170, Math.min(480, startH + delta)) });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="relative z-30 shrink-0 border-t border-slate-200/80 bg-white/95 dark:border-[#222836] dark:bg-[#0F131D]/95">
      {open && (
        <div
          onMouseDown={startResize}
          title="Drag to resize terminal height"
          className="group absolute inset-x-0 -top-[2px] z-40 flex h-[6px] cursor-ns-resize items-center justify-center transition-colors hover:bg-[#2962FF]/30"
        >
          <div className="h-[2px] w-10 rounded-full bg-transparent transition-colors group-hover:bg-[#2962FF]" />
        </div>
      )}

      <div className="flex h-9 items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-bold text-slate-800 transition-all duration-150 hover:bg-slate-100 hover:text-[#2962FF] active:scale-95 dark:text-[#E2E6F0] dark:hover:bg-[#181D2A]"
          >
            <Terminal className="h-3.5 w-3.5 text-[#2962FF]" />
            <span>Trading & Strategy Tester</span>
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={() => {
              setTab('backtest');
              setOpen(true);
            }}
            className={cn(
              'hidden sm:inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all duration-150 active:scale-95',
              open && tab === 'backtest'
                ? 'bg-[#00D4AA]/15 text-[#00D4AA] ring-1 ring-[#00D4AA]/30 shadow-glowCyan'
                : 'text-[#787B86] hover:bg-slate-100 hover:text-[#00D4AA] dark:hover:bg-[#181D2A]'
            )}
          >
            <BarChart3 className="h-3 w-3" />
            <span>Backtester</span>
          </button>

          <div className="hidden md:flex items-center gap-4 font-mono text-[11px] tabular-nums">
            <span className="text-[#787B86]">
              Balance:{' '}
              <span className="font-semibold text-slate-800 dark:text-[#D1D4DC]">
                ${paperBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </span>
            <span className="text-[#787B86]">
              Equity:{' '}
              <span className="font-semibold text-slate-800 dark:text-white">
                ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </span>
            <span className="text-[#787B86]">
              Open PnL:{' '}
              <span
                className={cn(
                  'font-semibold',
                  totalUnrealizedPnl >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                )}
              >
                {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setSide('buy');
              setTab('trade');
              setOpen(true);
            }}
            className="rounded bg-[#089981]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#089981] hover:bg-[#089981] hover:text-white transition"
          >
            Buy {info.displaySymbol}
          </button>
          <button
            onClick={() => {
              setSide('sell');
              setTab('trade');
              setOpen(true);
            }}
            className="rounded bg-[#F23645]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#F23645] hover:bg-[#F23645] hover:text-white transition"
          >
            Sell {info.displaySymbol}
          </button>
        </div>
      </div>

      {open && (
        <div
          style={{ height: bottomHeight }}
          className="grid grid-cols-1 border-t border-slate-200 dark:border-[#2A2E39] md:grid-cols-12"
        >
          {/* Left: Order Ticket */}
          <form
            onSubmit={submitOrder}
            className="flex flex-col justify-between border-b border-slate-200 p-3 dark:border-[#2A2E39] md:col-span-4 md:border-b-0 md:border-r overflow-y-auto"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-[#D1D4DC]">
                  Order Ticket • {info.displaySymbol}
                </span>
                <div className="flex rounded bg-slate-100 p-0.5 text-[10px] font-semibold dark:bg-[#1E222D]">
                  {(['market', 'limit'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOrderType(t)}
                      className={cn(
                        'rounded px-2 py-0.5 uppercase',
                        orderType === t ? 'bg-[#2962FF] text-white' : 'text-[#787B86]'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSide('buy')}
                  className={cn(
                    'rounded py-1.5 text-xs font-bold transition',
                    side === 'buy'
                      ? 'bg-[#089981] text-white'
                      : 'bg-slate-100 text-[#787B86] dark:bg-[#1E222D]'
                  )}
                >
                  Long / Buy
                </button>
                <button
                  type="button"
                  onClick={() => setSide('sell')}
                  className={cn(
                    'rounded py-1.5 text-xs font-bold transition',
                    side === 'sell'
                      ? 'bg-[#F23645] text-white'
                      : 'bg-slate-100 text-[#787B86] dark:bg-[#1E222D]'
                  )}
                >
                  Short / Sell
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] text-[#787B86]">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-900 outline-none focus:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#1E222D] dark:text-[#D1D4DC]"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-[#787B86]">
                    {orderType === 'market' ? 'Market Price' : 'Limit Price'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    disabled={orderType === 'market'}
                    value={orderType === 'market' ? markPrice : limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-900 outline-none disabled:opacity-60 dark:border-[#2A2E39] dark:bg-[#1E222D] dark:text-[#D1D4DC]"
                  />
                </div>
              </div>

              <div className="flex gap-1">
                {[1000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setNotionalSize(amt)}
                    className="flex-1 rounded bg-slate-100 py-0.5 font-mono text-[10px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-[#1E222D] dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]"
                  >
                    ${amt / 1000}k
                  </button>
                ))}
                {[1, 2].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => applyRiskSizing(r)}
                    title={`Calculate position size for ${r}% account risk based on SL`}
                    className="flex-1 rounded bg-[#00D4AA]/15 py-0.5 font-mono text-[10px] font-bold text-[#00D4AA] hover:bg-[#00D4AA]/25"
                  >
                    {r}% Risk
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  value={slInput}
                  onChange={(e) => setSlInput(e.target.value)}
                  placeholder="Stop Loss (opt)"
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-[#F23645] outline-none focus:border-[#F23645] dark:border-[#2A2E39] dark:bg-[#1E222D]"
                />
                <input
                  type="number"
                  step="any"
                  value={tpInput}
                  onChange={(e) => setTpInput(e.target.value)}
                  placeholder="Take Profit (opt)"
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-[#089981] outline-none focus:border-[#089981] dark:border-[#2A2E39] dark:bg-[#1E222D]"
                />
              </div>
            </div>

            <button
              type="submit"
              className={cn(
                'mt-2 w-full rounded py-1.5 text-xs font-bold text-white shadow transition',
                side === 'buy'
                  ? 'bg-[#089981] hover:brightness-110'
                  : 'bg-[#F23645] hover:brightness-110'
              )}
            >
              {orderType === 'market' ? 'Execute' : 'Place Limit'}{' '}
              {side === 'buy' ? 'Buy' : 'Sell'} Order
            </button>
          </form>

          {/* Right: Positions / Orders / History / Strategy Backtester */}
          <div className="flex flex-col md:col-span-8 min-h-0">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 dark:border-[#2A2E39]">
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'positions', label: `Positions (${positions.length})` },
                    { id: 'orders', label: `Orders (${pendingOrders.length})` },
                    { id: 'history', label: `History (${closedTrades.length})` },
                    { id: 'backtest', label: 'Strategy Backtester' },
                  ] as { id: BottomPanelTab; label: string }[]
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs font-semibold transition',
                      tab === t.id || (tab === 'trade' && t.id === 'positions')
                        ? t.id === 'backtest'
                          ? 'bg-[#00D4AA]/15 text-[#00D4AA]'
                          : 'bg-[#2962FF]/15 text-[#2962FF]'
                        : 'text-[#787B86] hover:text-slate-900 dark:hover:text-[#D1D4DC]'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab !== 'backtest' && (
                <button
                  onClick={resetPaperAccount}
                  title="Reset Virtual Balance to $100,000"
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-[#787B86] hover:bg-[#1E222D] hover:text-[#D1D4DC]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset $100k
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              {(tab === 'positions' || tab === 'trade') && (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-[#787B86] dark:bg-[#0C0F17]">
                    <tr>
                      <th className="px-3 py-1.5">Symbol</th>
                      <th className="px-3 py-1.5">Side</th>
                      <th className="px-3 py-1.5">Qty</th>
                      <th className="px-3 py-1.5">Entry</th>
                      <th className="px-3 py-1.5">Mark</th>
                      <th className="px-3 py-1.5">SL / TP</th>
                      <th className="px-3 py-1.5 text-right">Unrealized PnL</th>
                      <th className="px-3 py-1.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px] tabular-nums dark:divide-[#2A2E39]/50">
                    {positions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center font-sans text-[#787B86]">
                          No open positions. Drag SL/TP lines directly on chart once opened!
                        </td>
                      </tr>
                    ) : (
                      positions.map((pos) => {
                        const pInfo = getSymbolInfo(pos.symbol);
                        const curr = quotes[pos.symbol]?.price ?? pos.entryPrice;
                        const pnl =
                          (pos.side === 'buy' ? curr - pos.entryPrice : pos.entryPrice - curr) *
                          pos.quantity;
                        const pnlPct =
                          ((pos.side === 'buy' ? curr - pos.entryPrice : pos.entryPrice - curr) /
                            Math.max(pos.entryPrice, 1e-9)) *
                          100;

                        return (
                          <tr key={pos.id} className="hover:bg-slate-50 dark:hover:bg-[#1E222D]">
                            <td className="px-3 py-1.5 font-sans font-bold text-slate-900 dark:text-[#D1D4DC]">
                              {pInfo.displaySymbol}
                            </td>
                            <td className="px-3 py-1.5">
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                                  pos.side === 'buy'
                                    ? 'bg-[#089981]/15 text-[#089981]'
                                    : 'bg-[#F23645]/15 text-[#F23645]'
                                )}
                              >
                                {pos.side === 'buy' ? 'LONG' : 'SHORT'}
                              </span>
                            </td>
                            <td className="px-3 py-1.5">{pos.quantity}</td>
                            <td className="px-3 py-1.5">
                              {formatPrice(pos.entryPrice, pInfo.precision)}
                            </td>
                            <td className="px-3 py-1.5">{formatPrice(curr, pInfo.precision)}</td>
                            <td className="px-3 py-1.5 text-[10px] text-[#787B86]">
                              {pos.stopLoss ? formatPrice(pos.stopLoss, pInfo.precision) : '—'} /{' '}
                              {pos.takeProfit ? formatPrice(pos.takeProfit, pInfo.precision) : '—'}
                            </td>
                            <td
                              className={cn(
                                'px-3 py-1.5 text-right font-bold',
                                pnl >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                              )}
                            >
                              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPct >= 0 ? '+' : ''}
                              {pnlPct.toFixed(2)}%)
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <button
                                onClick={() => closePosition(pos.id, curr, 'manual')}
                                className="rounded bg-[#F23645]/15 px-2 py-0.5 font-sans text-[10px] font-semibold text-[#F23645] hover:bg-[#F23645] hover:text-white"
                              >
                                Close
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {tab === 'orders' && (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-[#787B86] dark:bg-[#0C0F17]">
                    <tr>
                      <th className="px-3 py-1.5">Symbol</th>
                      <th className="px-3 py-1.5">Side</th>
                      <th className="px-3 py-1.5">Qty</th>
                      <th className="px-3 py-1.5">Limit Price</th>
                      <th className="px-3 py-1.5">SL / TP</th>
                      <th className="px-3 py-1.5 text-right">Cancel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px] dark:divide-[#2A2E39]/50">
                    {pendingOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center font-sans text-[#787B86]">
                          No pending limit orders.
                        </td>
                      </tr>
                    ) : (
                      pendingOrders.map((ord) => {
                        const oInfo = getSymbolInfo(ord.symbol);
                        return (
                          <tr key={ord.id}>
                            <td className="px-3 py-1.5 font-sans font-bold">{oInfo.displaySymbol}</td>
                            <td className="px-3 py-1.5 uppercase">{ord.side}</td>
                            <td className="px-3 py-1.5">{ord.quantity}</td>
                            <td className="px-3 py-1.5">
                              {formatPrice(ord.limitPrice, oInfo.precision)}
                            </td>
                            <td className="px-3 py-1.5 text-[#787B86]">
                              {ord.stopLoss ?? '—'} / {ord.takeProfit ?? '—'}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <button
                                onClick={() => cancelPendingOrder(ord.id)}
                                className="rounded p-1 text-[#787B86] hover:text-rose-400"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {tab === 'history' && (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-[#787B86] dark:bg-[#0C0F17]">
                    <tr>
                      <th className="px-3 py-1.5">Symbol</th>
                      <th className="px-3 py-1.5">Side</th>
                      <th className="px-3 py-1.5">Entry</th>
                      <th className="px-3 py-1.5">Exit</th>
                      <th className="px-3 py-1.5">Reason</th>
                      <th className="px-3 py-1.5 text-right">Realized PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px] dark:divide-[#2A2E39]/50">
                    {closedTrades.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center font-sans text-[#787B86]">
                          No closed trades yet.
                        </td>
                      </tr>
                    ) : (
                      closedTrades.map((t) => {
                        const tInfo = getSymbolInfo(t.symbol);
                        return (
                          <tr key={t.id}>
                            <td className="px-3 py-1.5 font-sans font-bold">{tInfo.displaySymbol}</td>
                            <td className="px-3 py-1.5 uppercase">{t.side}</td>
                            <td className="px-3 py-1.5">
                              {formatPrice(t.entryPrice, tInfo.precision)}
                            </td>
                            <td className="px-3 py-1.5">
                              {formatPrice(t.exitPrice, tInfo.precision)}
                            </td>
                            <td className="px-3 py-1.5 uppercase text-[#787B86]">{t.reason}</td>
                            <td
                              className={cn(
                                'px-3 py-1.5 text-right font-bold',
                                t.pnl >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                              )}
                            >
                              {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)} ({t.pnlPercent.toFixed(2)}%)
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {tab === 'backtest' && (
                <div className="p-3 space-y-3">
                  {/* Strategy Controls Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {STRATEGIES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setStrategyId(s.id);
                            handleRunBacktest(s.id);
                          }}
                          className={cn(
                            'rounded px-2.5 py-1 text-[11px] font-semibold transition',
                            strategyId === s.id
                              ? 'bg-[#00D4AA] text-slate-950'
                              : 'bg-slate-100 text-slate-600 dark:bg-[#1E222D] dark:text-[#D1D4DC]'
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={btCapital}
                        onChange={(e) => setBtCapital(e.target.value)}
                        title="Initial Capital ($)"
                        className="w-24 rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs outline-none dark:border-[#2A2E39] dark:bg-[#1E222D]"
                      />
                      <button
                        onClick={() => handleRunBacktest(strategyId)}
                        disabled={btLoading}
                        className="inline-flex items-center gap-1 rounded bg-[#2962FF] px-3 py-1 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                      >
                        <Play className="h-3 w-3" />
                        {btLoading ? 'Running...' : `Test ${info.displaySymbol} (${activePane.timeframe})`}
                      </button>
                      {btResult && (
                        <button
                          onClick={() =>
                            setBacktestOverlay(btResult.trades, !showBacktestOnChart)
                          }
                          title="Toggle Trade Entry/Exit Markers on Chart"
                          className={cn(
                            'inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold',
                            showBacktestOnChart
                              ? 'bg-[#00D4AA]/15 text-[#00D4AA]'
                              : 'bg-[#1E222D] text-[#787B86]'
                          )}
                        >
                          {showBacktestOnChart ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                          On Chart
                        </button>
                      )}
                    </div>
                  </div>

                  {!btResult ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-[#787B86] dark:border-[#2A2E39]">
                      Select any strategy above (including <strong>RSI Divergence Pro</strong>) and
                      click <strong>Test</strong> to backtest on {info.displaySymbol}{' '}
                      ({activePane.timeframe}) instantly.
                    </div>
                  ) : (
                    <>
                      {/* Metrics Summary + Equity Curve */}
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 dark:border-[#2A2E39] dark:bg-[#1E222D]/60">
                        <div className="grid grid-cols-5 gap-4 font-mono text-xs">
                          <div>
                            <div className="text-[10px] text-[#787B86]">Net Profit</div>
                            <div
                              className={cn(
                                'font-bold',
                                btResult.netProfitUsd >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                              )}
                            >
                              {btResult.netProfitUsd >= 0 ? '+' : ''}$
                              {btResult.netProfitUsd.toFixed(2)} ({btResult.netProfitPct.toFixed(1)}%)
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#787B86]">Win Rate</div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {btResult.winRatePct.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#787B86]">Profit Factor</div>
                            <div className="font-bold text-[#00D4AA]">
                              {btResult.profitFactor.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#787B86]">Max Drawdown</div>
                            <div className="font-bold text-[#F23645]">
                              -{btResult.maxDrawdownPct.toFixed(2)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#787B86]">Total Trades</div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {btResult.totalTrades}
                            </div>
                          </div>
                        </div>

                        <EquityCurveChart
                          values={btResult.equityCurve}
                          positive={btResult.netProfitUsd >= 0}
                        />
                      </div>

                      {/* Simulated Trades Table */}
                      {btResult.trades.length > 0 && (
                        <div className="max-h-28 overflow-y-auto rounded border border-slate-200 dark:border-[#2A2E39]">
                          <table className="w-full text-left font-mono text-[11px]">
                            <thead className="sticky top-0 bg-slate-50 text-[10px] text-[#787B86] dark:bg-[#0C0F17]">
                              <tr>
                                <th className="px-2.5 py-1">Side</th>
                                <th className="px-2.5 py-1">Entry Time</th>
                                <th className="px-2.5 py-1">Entry</th>
                                <th className="px-2.5 py-1">Exit</th>
                                <th className="px-2.5 py-1">Reason</th>
                                <th className="px-2.5 py-1 text-right">PnL</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#2A2E39]/40">
                              {[...btResult.trades].reverse().map((tr) => (
                                <tr key={tr.id}>
                                  <td
                                    className={cn(
                                      'px-2.5 py-1 font-bold uppercase',
                                      tr.side === 'buy' ? 'text-[#089981]' : 'text-[#F23645]'
                                    )}
                                  >
                                    {tr.side}
                                  </td>
                                  <td className="px-2.5 py-1 text-[#787B86]">
                                    {formatTimestamp(tr.entryTime, false)}
                                  </td>
                                  <td className="px-2.5 py-1">
                                    {formatPrice(tr.entryPrice, info.precision)}
                                  </td>
                                  <td className="px-2.5 py-1">
                                    {formatPrice(tr.exitPrice, info.precision)}
                                  </td>
                                  <td className="px-2.5 py-1 text-[#787B86]">{tr.reason}</td>
                                  <td
                                    className={cn(
                                      'px-2.5 py-1 text-right font-bold',
                                      tr.pnlUsd >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                                    )}
                                  >
                                    {tr.pnlUsd >= 0 ? '+' : ''}${tr.pnlUsd.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
