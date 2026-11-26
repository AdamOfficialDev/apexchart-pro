import React, { useEffect, useMemo, useState } from 'react';
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
        className="apex-modal-card flex h-[min(560px,88vh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/[0.98] dark:border-[#262E40] dark:bg-[#131823]/[0.98]"
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 dark:border-[#22293A]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#00D4AA]/12 text-[#00D4AA] ring-1 ring-[#00D4AA]/25">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Indicators, Metrics & Strategies
              </h2>
              <p className="flex items-center gap-1 text-[11px] font-medium text-[#089981]">
                <Unlock className="h-3 w-3" />
                Unlimited indicators • Full Inputs, Source, Offset & Style control
              </p>
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

        <div className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-12">
          <div className="flex flex-col border-b border-slate-200/80 md:col-span-7 md:border-b-0 md:border-r dark:border-[#22293A] min-h-0">
            <div className="space-y-2.5 border-b border-slate-200/80 p-3.5 dark:border-[#22293A]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#787B86]" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search SMA, EMA, Supertrend, RSI, MACD..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/90 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none transition focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20 dark:border-[#262E40] dark:bg-[#0D111A] dark:text-white"
                />
              </div>
              <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100/80 p-1 dark:bg-[#0B0E15]">
                {IND_CATS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 active:scale-95',
                      cat === c
                        ? 'bg-[#2962FF] text-white shadow-[0_2px_8px_-1px_rgba(41,98,255,0.5)]'
                        : 'text-slate-600 hover:text-slate-900 dark:text-[#8E96A8] dark:hover:text-white'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1E2434]">
              {filtered.map((item) => (
                <div
                  key={item.type}
                  className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-[#192030]/75"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </span>
                      <span
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                          item.placement === 'overlay'
                            ? 'bg-[#2962FF]/12 text-[#4C82FF]'
                            : 'bg-[#00D4AA]/12 text-[#00D4AA]'
                        )}
                      >
                        {item.placement === 'overlay' ? 'Overlay' : 'Sub-Pane'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[#7D8596]">
                      {item.description}
                    </p>
                  </div>
                  <button
                    onClick={() => addIndicator(activePane.id, item.type)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-b from-[#3B76FF] to-[#2962FF] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_3px_10px_-2px_rgba(41,98,255,0.45)] transition-all duration-150 hover:brightness-110 active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:col-span-5 min-h-0 bg-slate-50/60 dark:bg-[#0D111A]/80">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#787B86] dark:border-[#22293A]">
              <span>Active on Chart</span>
              <span className="rounded-md bg-[#2962FF]/15 px-1.5 py-0.5 font-mono text-[10px] text-[#4C82FF]">
                {activePane.indicators.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {activePane.indicators.length === 0 ? (
                <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-[#22293A]">
                  <Activity className="mb-2 h-6 w-6 text-[#787B86]/50" />
                  <div className="text-xs font-semibold text-slate-600 dark:text-[#9CA3AF]">
                    No indicators applied
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#787B86]">
                    Select any indicator on the left to add it.
                  </div>
                </div>
              ) : (
                activePane.indicators.map((ind) => (
                  <div
                    key={ind.id}
                    className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm transition-colors hover:border-slate-300 dark:border-[#232A3B] dark:bg-[#161C29] dark:hover:border-[#323C54]"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="color"
                          value={ind.color}
                          onChange={(e) =>
                            updateIndicator(activePane.id, ind.id, { color: e.target.value })
                          }
                          className="h-5 w-5 cursor-pointer rounded-md border border-white/15 bg-transparent p-0"
                        />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
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
                          className="rounded-lg p-1.5 text-[#4C82FF] transition hover:bg-[#2962FF]/15 active:scale-90"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeIndicator(activePane.id, ind.id)}
                          title="Remove Indicator"
                          className="rounded-lg p-1.5 text-[#787B86] transition hover:bg-rose-500/15 hover:text-rose-400 active:scale-90"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {Object.keys(ind.params).length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(ind.params).map(([key, val]) => (
                          <div key={key}>
                            <label className="mb-1 block text-[10px] font-medium capitalize text-[#7D8596]">
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
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs outline-none transition focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20 dark:border-[#262E40] dark:bg-[#0D111A] dark:text-white"
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
