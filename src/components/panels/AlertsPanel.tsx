import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, Plus, Trash2 } from 'lucide-react';
import { getSymbolInfo } from '@/data/symbols';
import { cn, formatPrice } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';
import { AlertCondition } from '@/types/trading';

const CONDITIONS: { id: AlertCondition; label: string }[] = [
  { id: 'crossing', label: 'Crossing' },
  { id: 'crossing_up', label: 'Cross Up' },
  { id: 'crossing_down', label: 'Cross Down' },
];

export const AlertsPanel: React.FC = () => {
  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const quotes = useTradingStore((s) => s.quotes);
  const alerts = useTradingStore((s) => s.alerts);
  const addAlert = useTradingStore((s) => s.addAlert);
  const toggleAlert = useTradingStore((s) => s.toggleAlert);
  const removeAlert = useTradingStore((s) => s.removeAlert);

  const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0];
  const info = useMemo(() => getSymbolInfo(activePane.symbol), [activePane.symbol]);
  const currentPrice = quotes[activePane.symbol]?.price ?? info.basePrice;

  const [priceInput, setPriceInput] = useState(String(currentPrice));
  const [condition, setCondition] = useState<AlertCondition>('crossing');
  const [note, setNote] = useState('');

  useEffect(() => {
    setPriceInput(String(currentPrice));
  }, [activePane.symbol]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(priceInput);
    if (!Number.isFinite(num) || num <= 0) return;
    addAlert({
      symbol: activePane.symbol,
      price: num,
      condition,
      note: note.trim(),
    });
    setNote('');
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#131722]">
      <div className="border-b border-slate-200 px-3 py-2 dark:border-[#2A2E39]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#787B86]">
          Price Alerts ({alerts.filter((a) => a.active).length} active)
        </span>
      </div>

      <form
        onSubmit={handleCreate}
        className="space-y-2 border-b border-slate-200 p-3 dark:border-[#2A2E39]"
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900 dark:text-[#D1D4DC]">{info.displaySymbol}</span>
          <span className="font-mono text-[11px] text-[#787B86]">
            Last: {formatPrice(currentPrice, info.precision)}
          </span>
        </div>

        {/* Custom Segmented Pills instead of native select */}
        <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-100 p-0.5 dark:bg-[#1E222D]">
          {CONDITIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCondition(c.id)}
              className={cn(
                'rounded py-1 text-[10px] font-semibold transition',
                condition === c.id
                  ? 'bg-[#2962FF] text-white'
                  : 'text-slate-600 dark:text-[#787B86] dark:hover:text-[#D1D4DC]'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <input
          type="number"
          step="any"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          placeholder="Target Price"
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-800 outline-none focus:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#1E222D] dark:text-[#D1D4DC]"
        />

        <div className="flex gap-1">
          {[-2, -1, 1, 2].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() =>
                setPriceInput((currentPrice * (1 + pct / 100)).toFixed(info.precision))
              }
              className="flex-1 rounded bg-slate-100 py-0.5 font-mono text-[10px] font-semibold text-slate-600 hover:bg-slate-200 dark:bg-[#1E222D] dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]"
            >
              {pct > 0 ? `+${pct}%` : `${pct}%`}
            </button>
          ))}
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Alert message (optional)..."
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#1E222D] dark:text-[#D1D4DC]"
        />

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-500 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Alert
        </button>
      </form>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2A2E39]/50">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-[#787B86]">
            <Bell className="mb-2 h-6 w-6 opacity-40" />
            Right-click anywhere on the chart or use this form to add a price alert.
          </div>
        ) : (
          alerts.map((alert) => {
            const sym = getSymbolInfo(alert.symbol);
            return (
              <div key={alert.id} className="flex items-start justify-between gap-2 p-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {alert.active ? (
                      <BellRing className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <Bell className="h-3.5 w-3.5 text-[#787B86]" />
                    )}
                    <span className="text-xs font-bold text-slate-900 dark:text-[#D1D4DC]">
                      {sym.displaySymbol}
                    </span>
                    <span
                      className={cn(
                        'rounded px-1 text-[9px] font-bold uppercase',
                        alert.active
                          ? 'bg-[#089981]/15 text-[#089981]'
                          : 'bg-slate-500/20 text-[#787B86]'
                      )}
                    >
                      {alert.active ? 'Active' : 'Triggered'}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-600 dark:text-[#D1D4DC]">
                    {alert.condition.replace('_', ' ')} @ {formatPrice(alert.price, sym.precision)}
                  </div>
                  {alert.note && (
                    <div className="mt-0.5 truncate text-[10px] text-[#787B86]">{alert.note}</div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleAlert(alert.id)}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[#2962FF] hover:bg-[#2962FF]/10"
                  >
                    {alert.active ? 'Pause' : 'Rearm'}
                  </button>
                  <button
                    onClick={() => removeAlert(alert.id)}
                    className="rounded p-1 text-[#787B86] hover:bg-rose-500/15 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
