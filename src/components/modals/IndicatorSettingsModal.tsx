import React, { useEffect, useState } from 'react';
import { Activity, Eye, Palette, RotateCcw, Sliders, X } from 'lucide-react';
import { DEFAULT_VISIBILITY, INDICATOR_CATALOG } from '@/data/symbols';
import { cn } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';
import { PriceSource } from '@/types/trading';

const SOURCES: { id: PriceSource; label: string }[] = [
  { id: 'close', label: 'Close' },
  { id: 'open', label: 'Open' },
  { id: 'high', label: 'High' },
  { id: 'low', label: 'Low' },
  { id: 'hl2', label: 'HL2' },
  { id: 'hlc3', label: 'HLC3' },
  { id: 'ohlc4', label: 'OHLC4' },
];

export const IndicatorSettingsModal: React.FC = () => {
  const editingIndId = useTradingStore((s) => s.editingIndicatorId);
  const setEditingIndId = useTradingStore((s) => s.setEditingIndicatorId);
  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const updateIndicator = useTradingStore((s) => s.updateIndicator);
  const rsiDivConfig = useTradingStore((s) => s.rsiDivConfig);
  const updateRsiDivConfig = useTradingStore((s) => s.updateRsiDivConfig);
  const resetRsiDivConfig = useTradingStore((s) => s.resetRsiDivConfig);

  const [tab, setTab] = useState<'inputs' | 'style' | 'visibility'>('inputs');

  useEffect(() => {
    if (!editingIndId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingIndId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingIndId, setEditingIndId]);

  if (!editingIndId) return null;

  let targetPane = panes.find((p) => p.id === activePaneId) ?? panes[0];
  let indicator = targetPane.indicators.find((i) => i.id === editingIndId);
  if (!indicator) {
    for (const p of panes) {
      const m = p.indicators.find((i) => i.id === editingIndId);
      if (m) {
        targetPane = p;
        indicator = m;
        break;
      }
    }
  }
  if (!indicator) return null;

  const meta = INDICATOR_CATALOG.find((c) => c.type === indicator!.type);
  const vis = indicator.visibility ?? DEFAULT_VISIBILITY;
  const isRsiKind = indicator.type === 'RSI' || indicator.type === 'RSI_DIV';
  const supportsSource =
    indicator.type === 'SMA' ||
    indicator.type === 'EMA' ||
    indicator.type === 'BB' ||
    isRsiKind ||
    indicator.type === 'MACD';
  const supportsBands = isRsiKind || indicator.type === 'STOCH';

  return (
    <div
      onClick={() => setEditingIndId(null)}
      className="apex-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#05070B]/70 p-3 sm:p-4 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="apex-modal-card flex max-h-[min(580px,88vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/[0.98] dark:border-[#262E40] dark:bg-[#131823]/[0.98]"
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 dark:border-[#22293A]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00D4AA]/12 text-[#00D4AA] ring-1 ring-[#00D4AA]/25">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                {meta?.name ?? indicator.name}
              </h3>
              <div className="text-[10px] font-medium text-[#7D8596]">Indicator Configuration</div>
            </div>
          </div>
          <button
            onClick={() => setEditingIndId(null)}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 active:scale-90 dark:hover:bg-[#1E2536] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-200/80 px-4 py-2 dark:border-[#22293A] dark:bg-[#0D111A]/60">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100/90 p-1 dark:bg-[#0B0E15]">
            {(
              [
                { id: 'inputs', label: 'Inputs', icon: <Sliders className="h-3.5 w-3.5" /> },
                { id: 'style', label: 'Style', icon: <Palette className="h-3.5 w-3.5" /> },
                { id: 'visibility', label: 'Visibility', icon: <Eye className="h-3.5 w-3.5" /> },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95',
                  tab === t.id
                    ? 'bg-white text-[#2962FF] shadow-sm dark:bg-[#1A2130] dark:text-white'
                    : 'text-[#787B86] hover:text-slate-900 dark:hover:text-[#D1D4DC]'
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 text-xs space-y-3.5">
          {tab === 'inputs' && (
            <>
              {Object.keys(indicator.params).length > 0 ? (
                <div className="space-y-2.5">
                  {Object.entries(indicator.params).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="capitalize text-slate-700 dark:text-[#D1D4DC]">
                        {key}
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={val}
                        onChange={(e) => {
                          const v = Math.max(1, Number(e.target.value) || 1);
                          updateIndicator(targetPane.id, indicator!.id, {
                            params: { ...indicator!.params, [key]: v },
                          });
                        }}
                        className="w-28 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs outline-none focus:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#131722]"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-[#787B86]">
                  This indicator requires no length parameters.
                </div>
              )}

              {supportsSource && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold text-[#787B86]">Source</div>
                  <div className="grid grid-cols-4 gap-1">
                    {SOURCES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          updateIndicator(targetPane.id, indicator!.id, { source: s.id })
                        }
                        className={cn(
                          'rounded py-1 font-mono text-[10px] font-semibold transition',
                          (indicator!.source ?? 'close') === s.id
                            ? 'bg-[#2962FF] text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-[#131722] dark:text-[#D1D4DC]'
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isRsiKind && (
                <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-[#2A2E39]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#00D4AA]">
                    RSI Divergence Pro Rules & Clutter Control
                  </div>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Regular Divergence (Trendline / Body Break)</span>
                    <input
                      type="checkbox"
                      checked={rsiDivConfig.enableRegular}
                      onChange={(e) => updateRsiDivConfig({ enableRegular: e.target.checked })}
                      className="accent-[#00D4AA]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Exaggerated Divergence (Double Top/Bottom Break)</span>
                    <input
                      type="checkbox"
                      checked={rsiDivConfig.enableExaggerated}
                      onChange={(e) =>
                        updateRsiDivConfig({ enableExaggerated: e.target.checked })
                      }
                      className="accent-[#F59E0B]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Hidden Divergence (Prev H/L Fib Golden Ratio)</span>
                    <input
                      type="checkbox"
                      checked={rsiDivConfig.enableHidden}
                      onChange={(e) => updateRsiDivConfig({ enableHidden: e.target.checked })}
                      className="accent-[#A855F7]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Hide Old Mitigated SL/TP Setups (Keep Clean)</span>
                    <input
                      type="checkbox"
                      checked={rsiDivConfig.hideMitigated}
                      onChange={(e) => updateRsiDivConfig({ hideMitigated: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Live Sound + Toast Alert on New Valid Setup</span>
                    <input
                      type="checkbox"
                      checked={rsiDivConfig.enableAlerts}
                      onChange={(e) => updateRsiDivConfig({ enableAlerts: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-[#787B86]">
                        Max Setups
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={rsiDivConfig.maxSetups}
                        onChange={(e) =>
                          updateRsiDivConfig({
                            maxSetups: Math.max(1, Math.min(12, Number(e.target.value) || 4)),
                          })
                        }
                        className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono dark:border-[#2A2E39] dark:bg-[#131722]"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-[#787B86]">
                        Double Top %
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min={0.05}
                        max={2}
                        value={rsiDivConfig.doubleTopTolerancePct}
                        onChange={(e) =>
                          updateRsiDivConfig({
                            doubleTopTolerancePct: Number(e.target.value) || 0.35,
                          })
                        }
                        className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono dark:border-[#2A2E39] dark:bg-[#131722]"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-[#787B86]">
                        Pivot L/R
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={12}
                        value={rsiDivConfig.pivotLeft}
                        onChange={(e) =>
                          updateRsiDivConfig({ pivotLeft: Math.max(2, Number(e.target.value) || 4) })
                        }
                        className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono dark:border-[#2A2E39] dark:bg-[#131722]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {indicator.type !== 'VOLUME' && indicator.type !== 'CVD' && (
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-[#2A2E39]">
                  <span>Bar Offset Shift</span>
                  <input
                    type="number"
                    min={-50}
                    max={50}
                    value={indicator.offset ?? 0}
                    onChange={(e) =>
                      updateIndicator(targetPane.id, indicator!.id, {
                        offset: Number(e.target.value) || 0,
                      })
                    }
                    className="w-24 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs outline-none focus:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#131722]"
                  />
                </div>
              )}
            </>
          )}

          {tab === 'style' && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                  <span>Primary Color</span>
                  <input
                    type="color"
                    value={indicator.color}
                    onChange={(e) =>
                      updateIndicator(targetPane.id, indicator!.id, { color: e.target.value })
                    }
                    className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                  />
                </label>

                {indicator.secondaryColor && (
                  <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                    <span>Secondary Color</span>
                    <input
                      type="color"
                      value={indicator.secondaryColor}
                      onChange={(e) =>
                        updateIndicator(targetPane.id, indicator!.id, {
                          secondaryColor: e.target.value,
                        })
                      }
                      className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span>Line Width</span>
                <div className="flex rounded bg-slate-100 p-0.5 dark:bg-[#131722]">
                  {[1, 2, 3, 4].map((w) => (
                    <button
                      key={w}
                      onClick={() =>
                        updateIndicator(targetPane.id, indicator!.id, { lineWidth: w })
                      }
                      className={cn(
                        'rounded px-2.5 py-1 font-mono text-[10px] font-bold',
                        (indicator!.lineWidth ?? 2) === w
                          ? 'bg-[#2962FF] text-white'
                          : 'text-[#787B86]'
                      )}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span>Line Style</span>
                <div className="flex rounded bg-slate-100 p-0.5 dark:bg-[#131722]">
                  {(['solid', 'dashed', 'dotted'] as const).map((ls) => (
                    <button
                      key={ls}
                      onClick={() =>
                        updateIndicator(targetPane.id, indicator!.id, { lineStyle: ls })
                      }
                      className={cn(
                        'rounded px-2.5 py-1 text-[10px] capitalize',
                        (indicator!.lineStyle ?? 'solid') === ls
                          ? 'bg-[#2962FF] text-white'
                          : 'text-[#787B86]'
                      )}
                    >
                      {ls}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200/80 px-3 py-2.5 dark:border-[#22293A] dark:bg-[#0D111A]/60">
                <span>Show Last Value Tag on Price Scale</span>
                <input
                  type="checkbox"
                  checked={indicator.showLastValue ?? false}
                  onChange={(e) =>
                    updateIndicator(targetPane.id, indicator!.id, {
                      showLastValue: e.target.checked,
                    })
                  }
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
                    indicator.showLastValue ? 'bg-[#2962FF]' : 'bg-slate-300 dark:bg-[#262E40]'
                  )}
                >
                  <span
                    className={cn(
                      'h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200',
                      indicator.showLastValue ? 'translate-x-3' : 'translate-x-0'
                    )}
                  />
                </span>
              </label>

              {supportsBands && (
                <div className="space-y-2.5 border-t border-slate-200/80 pt-3 dark:border-[#22293A]">
                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200/80 px-3 py-2.5 dark:border-[#22293A] dark:bg-[#0D111A]/60">
                    <span className="font-semibold text-[#00D4AA]">
                      Show Overbought/Oversold Bands
                    </span>
                    <input
                      type="checkbox"
                      checked={indicator.showBands !== false}
                      onChange={(e) =>
                        updateIndicator(targetPane.id, indicator!.id, {
                          showBands: e.target.checked,
                        })
                      }
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
                        indicator.showBands !== false ? 'bg-[#00D4AA]' : 'bg-slate-300 dark:bg-[#262E40]'
                      )}
                    >
                      <span
                        className={cn(
                          'h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200',
                          indicator.showBands !== false ? 'translate-x-3' : 'translate-x-0'
                        )}
                      />
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="mb-1 block text-[10px] font-medium text-[#7D8596]">
                        Upper Band
                      </label>
                      <input
                        type="number"
                        value={indicator.upperLevel ?? (indicator.type === 'STOCH' ? 80 : 70)}
                        onChange={(e) =>
                          updateIndicator(targetPane.id, indicator!.id, {
                            upperLevel: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono outline-none transition focus:border-[#2962FF] dark:border-[#262E40] dark:bg-[#0D111A] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-medium text-[#7D8596]">
                        Lower Band
                      </label>
                      <input
                        type="number"
                        value={indicator.lowerLevel ?? (indicator.type === 'STOCH' ? 20 : 30)}
                        onChange={(e) =>
                          updateIndicator(targetPane.id, indicator!.id, {
                            lowerLevel: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono outline-none transition focus:border-[#2962FF] dark:border-[#262E40] dark:bg-[#0D111A] dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'visibility' && (
            <div className="space-y-2">
              <div className="mb-1 text-[11px] font-medium text-[#7D8596]">
                Show indicator on timeframe groups:
              </div>
              {(
                [
                  { key: 'seconds', label: 'Seconds (1s – 30s)' },
                  { key: 'minutes', label: 'Minutes (1m – 45m)' },
                  { key: 'hours', label: 'Hours (1h – 4h)' },
                  { key: 'days', label: 'Days, Weeks & Months (1D – 1M)' },
                ] as const
              ).map((g) => (
                <label
                  key={g.key}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200/80 px-3 py-2.5 transition hover:bg-slate-50 dark:border-[#22293A] dark:bg-[#0D111A]/60 dark:hover:bg-[#171E2C]"
                >
                  <span>{g.label}</span>
                  <input
                    type="checkbox"
                    checked={vis[g.key]}
                    onChange={(e) =>
                      updateIndicator(targetPane.id, indicator!.id, {
                        visibility: { ...vis, [g.key]: e.target.checked },
                      })
                    }
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
                      vis[g.key] ? 'bg-[#2962FF]' : 'bg-slate-300 dark:bg-[#262E40]'
                    )}
                  >
                    <span
                      className={cn(
                        'h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200',
                        vis[g.key] ? 'translate-x-3' : 'translate-x-0'
                      )}
                    />
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60 px-5 py-3 dark:border-[#22293A] dark:bg-[#0D111A]/80">
          <button
            onClick={() => {
              if (isRsiKind) resetRsiDivConfig();
              if (!meta) return;
              updateIndicator(targetPane.id, indicator!.id, {
                params: { ...meta.defaultParams },
                color: meta.defaultColor,
                secondaryColor: meta.secondaryColor,
                source: 'close',
                offset: 0,
                lineWidth: 2,
                lineStyle: 'solid',
                upperLevel: meta.defaultUpperLevel,
                lowerLevel: meta.defaultLowerLevel,
                visibility: DEFAULT_VISIBILITY,
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#7D8596] transition hover:bg-slate-200/60 hover:text-slate-900 active:scale-95 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Defaults
          </button>
          <button
            onClick={() => setEditingIndId(null)}
            className="rounded-xl bg-gradient-to-b from-[#3B76FF] to-[#2962FF] px-5 py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_-2px_rgba(41,98,255,0.5)] transition-all duration-150 hover:brightness-110 active:scale-95"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
