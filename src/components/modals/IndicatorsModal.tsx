import React, { useMemo, useState } from 'react';
import { Activity, Plus, Search, Settings2, Trash2, Unlock, X } from 'lucide-react';
import { INDICATOR_CATALOG } from '@/data/symbols';
import { cn } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';

const IND_CATS = ['All', 'Trend', 'Momentum', 'Volatility', 'Volume'] as const;

export const IndicatorsModal: React.FC = () => {
  const open = useTradingStore((s) => s.indicatorsModalOpen);
  const setOpen = useTradingStore((s) => s.setIndicatorsModalOpen);
  const setEditingIndicatorId = useTradingStore((s) => s.setEditingIndicatorId);
  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const addIndicator = useTradingStore((s) => s.addIndicator);
  const removeIndicator = useTradingStore((s) => s.removeIndicator);
  const updateIndicator = useTradingStore((s) => s.updateIndicator);

  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<(typeof IND_CATS)[number]>('All');

  const activePane = useMemo(
    () => panes.find((p) => p.id === activePaneId) ?? panes[0],
    [panes, activePaneId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INDICATOR_CATALOG.filter((item) => {
      if (cat !== 'All' && item.category !== cat) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.shortName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [query, cat]);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[540px] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-[#2A2E39]">
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-[#00D4AA]" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#D1D4DC]">
                Indicators, Metrics & Strategies
              </h2>
              <p className="flex items-center gap-1 text-[11px] text-[#089981]">
                <Unlock className="h-3 w-3" />
                Unlimited indicators + Full Inputs/Source/Offset/Style settings
              </p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-[#787B86] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-12">
          <div className="flex flex-col border-b border-slate-200 md:col-span-7 md:border-b-0 md:border-r dark:border-[#2A2E39] min-h-0">
            <div className="space-y-2 border-b border-slate-200 p-3 dark:border-[#2A2E39]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#787B86]" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search SMA, EMA, Supertrend, RSI, MACD..."
                  className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#131722] dark:text-[#D1D4DC]"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {IND_CATS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={cn(
                      'rounded px-2.5 py-1 text-[11px] font-semibold transition',
                      cat === c
                        ? 'bg-[#2962FF] text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-[#131722] dark:text-[#D1D4DC]'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2A2E39]/60">
              {filtered.map((item) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-[#2A2E39]/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-[#D1D4DC]">
                        {item.name}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-[#787B86] dark:bg-[#131722]">
                        {item.placement === 'overlay' ? 'Overlay' : 'Sub-Pane'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#787B86]">{item.description}</p>
                  </div>
                  <button
                    onClick={() => addIndicator(activePane.id, item.type)}
                    className="inline-flex shrink-0 items-center gap-1 rounded bg-[#2962FF] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:col-span-5 min-h-0 bg-slate-50/50 dark:bg-[#131722]/60">
            <div className="border-b border-slate-200 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#787B86] dark:border-[#2A2E39]">
              Active on Chart ({activePane.indicators.length})
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {activePane.indicators.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#787B86]">
                  No indicators applied to this pane.
                </div>
              ) : (
                activePane.indicators.map((ind) => (
                  <div
                    key={ind.id}
                    className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-[#2A2E39] dark:bg-[#1E222D]"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={ind.color}
                          onChange={(e) =>
                            updateIndicator(activePane.id, ind.id, { color: e.target.value })
                          }
                          className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                        <span className="text-xs font-bold text-slate-900 dark:text-[#D1D4DC]">
                          {ind.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setOpen(false);
                            setEditingIndicatorId(ind.id);
                          }}
                          title="Full Indicator Settings (Source, Offset, Style, Visibility)"
                          className="rounded p-1 text-[#2962FF] hover:bg-[#2962FF]/15"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeIndicator(activePane.id, ind.id)}
                          className="rounded p-1 text-[#787B86] hover:bg-rose-500/15 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {Object.keys(ind.params).length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(ind.params).map(([key, val]) => (
                          <div key={key}>
                            <label className="mb-0.5 block text-[10px] capitalize text-[#787B86]">
                              {key}
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={500}
                              step="any"
                              value={val}
                              onChange={(e) => {
                                const nextVal = Math.max(1, Number(e.target.value) || 1);
                                updateIndicator(activePane.id, ind.id, {
                                  params: { ...ind.params, [key]: nextVal },
                                });
                              }}
                              className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs outline-none focus:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#131722] dark:text-[#D1D4DC]"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
