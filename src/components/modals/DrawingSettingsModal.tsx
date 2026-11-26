import React, { useEffect, useState } from 'react';
import { Crosshair, Eye, Palette, RotateCcw, Type, X } from 'lucide-react';
import {
  DEFAULT_FIB_EXT_LEVELS,
  DEFAULT_FIB_RETRACE_LEVELS,
  DEFAULT_VISIBILITY,
  DRAWING_TOOLS_CATALOG,
  getSymbolInfo,
} from '@/data/symbols';
import { cn } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';

function toLocalDateTimeValue(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export const DrawingSettingsModal: React.FC = () => {
  const editingId = useTradingStore((s) => s.editingDrawingId);
  const setEditingId = useTradingStore((s) => s.setEditingDrawingId);
  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const drawingsBySymbol = useTradingStore((s) => s.drawingsBySymbol);
  const updateDrawing = useTradingStore((s) => s.updateDrawing);

  const [tab, setTab] = useState<'style' | 'text' | 'coords' | 'visibility'>('style');

  useEffect(() => {
    if (!editingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingId, setEditingId]);

  if (!editingId) return null;

  const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0];
  let foundSymbol = activePane.symbol;
  let drawing = (drawingsBySymbol[foundSymbol] ?? []).find((d) => d.id === editingId);
  if (!drawing) {
    for (const [sym, list] of Object.entries(drawingsBySymbol)) {
      const match = list.find((d) => d.id === editingId);
      if (match) {
        foundSymbol = sym;
        drawing = match;
        break;
      }
    }
  }
  if (!drawing) return null;

  const symInfo = getSymbolInfo(foundSymbol);
  const meta = DRAWING_TOOLS_CATALOG.find((t) => t.id === drawing!.type);
  const isFibTool = drawing.type === 'fib' || drawing.type === 'fib_ext';
  const fibList =
    drawing.fibLevels ??
    (drawing.type === 'fib_ext' ? DEFAULT_FIB_EXT_LEVELS : DEFAULT_FIB_RETRACE_LEVELS);
  const vis = drawing.visibility ?? DEFAULT_VISIBILITY;

  const isPositionTool = drawing.type === 'long_pos' || drawing.type === 'short_pos';
  const isLineTool =
    drawing.type === 'trendline' ||
    drawing.type === 'ray' ||
    drawing.type === 'info_line' ||
    drawing.type === 'channel';
  const isFillCapable =
    drawing.type === 'rect' ||
    drawing.type === 'rotated_rect' ||
    drawing.type === 'ellipse' ||
    drawing.type === 'triangle' ||
    drawing.type === 'channel' ||
    drawing.type === 'gann_box' ||
    drawing.type === 'xabcd' ||
    drawing.type === 'abcd' ||
    drawing.type === 'date_price_range';

  return (
    <div
      onClick={() => setEditingId(null)}
      className="apex-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#05070B]/70 p-3 sm:p-4 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="apex-modal-card flex max-h-[min(560px,88vh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/[0.98] dark:border-[#262E40] dark:bg-[#131823]/[0.98]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 dark:border-[#22293A]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2962FF]/12 text-[#4C82FF] ring-1 ring-[#2962FF]/25">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                {meta?.label ?? drawing.type} Settings
              </h3>
              <div className="text-[10px] font-medium text-[#7D8596]">{symInfo.displaySymbol}</div>
            </div>
          </div>
          <button
            onClick={() => setEditingId(null)}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 active:scale-90 dark:hover:bg-[#1E2536] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Top Tabs */}
        <div className="border-b border-slate-200/80 px-4 py-2 dark:border-[#22293A] dark:bg-[#0D111A]/60">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100/90 p-1 dark:bg-[#0B0E15]">
            {(
              [
                { id: 'style', label: 'Style', icon: <Palette className="h-3.5 w-3.5" /> },
                { id: 'text', label: 'Text', icon: <Type className="h-3.5 w-3.5" /> },
                { id: 'coords', label: 'Coords', icon: <Crosshair className="h-3.5 w-3.5" /> },
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 text-xs space-y-3.5">
          {tab === 'style' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                  <span>Stroke Color</span>
                  <input
                    type="color"
                    value={drawing.color}
                    onChange={(e) => updateDrawing(foundSymbol, drawing!.id, { color: e.target.value })}
                    className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                  />
                </label>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                  <span>Width</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((w) => (
                      <button
                        key={w}
                        onClick={() => updateDrawing(foundSymbol, drawing!.id, { lineWidth: w })}
                        className={cn(
                          'rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
                          drawing!.lineWidth === w ? 'bg-[#2962FF] text-white' : 'text-[#787B86]'
                        )}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span>Line Style</span>
                <div className="flex rounded bg-slate-100 p-0.5 dark:bg-[#131722]">
                  {(['solid', 'dashed', 'dotted'] as const).map((ls) => (
                    <button
                      key={ls}
                      onClick={() => updateDrawing(foundSymbol, drawing!.id, { lineStyle: ls })}
                      className={cn(
                        'rounded px-2.5 py-1 text-[11px] capitalize',
                        (drawing!.lineStyle ?? 'solid') === ls
                          ? 'bg-[#2962FF] text-white'
                          : 'text-[#787B86]'
                      )}
                    >
                      {ls}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span>Stroke Opacity ({drawing.opacity ?? 100}%)</span>
                <input
                  type="range"
                  min={15}
                  max={100}
                  value={drawing.opacity ?? 100}
                  onChange={(e) =>
                    updateDrawing(foundSymbol, drawing!.id, { opacity: Number(e.target.value) })
                  }
                  className="w-36 accent-[#2962FF]"
                />
              </div>

              {isFillCapable && (
                <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-[#2A2E39]">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={drawing.showFill !== false}
                        onChange={(e) =>
                          updateDrawing(foundSymbol, drawing!.id, { showFill: e.target.checked })
                        }
                        className="accent-[#2962FF]"
                      />
                      <span>Background Fill</span>
                    </label>
                    <input
                      type="color"
                      value={drawing.fillColor ?? drawing.color}
                      onChange={(e) =>
                        updateDrawing(foundSymbol, drawing!.id, { fillColor: e.target.value })
                      }
                      className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Fill Opacity ({drawing.fillOpacity ?? 15}%)</span>
                    <input
                      type="range"
                      min={0}
                      max={75}
                      value={drawing.fillOpacity ?? 15}
                      onChange={(e) =>
                        updateDrawing(foundSymbol, drawing!.id, {
                          fillOpacity: Number(e.target.value),
                        })
                      }
                      className="w-36 accent-[#2962FF]"
                    />
                  </div>
                </div>
              )}

              {isLineTool && (
                <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-[#2A2E39]">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Extend Left</span>
                    <input
                      type="checkbox"
                      checked={Boolean(drawing.extendLeft)}
                      onChange={(e) =>
                        updateDrawing(foundSymbol, drawing!.id, { extendLeft: e.target.checked })
                      }
                      className="accent-[#2962FF]"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Extend Right</span>
                    <input
                      type="checkbox"
                      checked={Boolean(drawing.extendRight)}
                      onChange={(e) =>
                        updateDrawing(foundSymbol, drawing!.id, { extendRight: e.target.checked })
                      }
                      className="accent-[#2962FF]"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Always Show Stats (Price Δ, %, Bars, Angle)</span>
                    <input
                      type="checkbox"
                      checked={drawing.showStats ?? drawing.type === 'info_line'}
                      onChange={(e) =>
                        updateDrawing(foundSymbol, drawing!.id, { showStats: e.target.checked })
                      }
                      className="accent-[#2962FF]"
                    />
                  </label>
                </div>
              )}

              {isPositionTool && (
                <div className="space-y-2.5 border-t border-slate-200 pt-3 dark:border-[#2A2E39]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#00D4AA]">
                    Position Risk Calculator
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="mb-1 block text-[10px] text-[#787B86]">Account Size ($)</label>
                      <input
                        type="number"
                        value={drawing.accountSize ?? 100000}
                        onChange={(e) =>
                          updateDrawing(foundSymbol, drawing!.id, {
                            accountSize: Number(e.target.value) || 10000,
                          })
                        }
                        className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono dark:border-[#2A2E39] dark:bg-[#131722]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-[#787B86]">Risk %</label>
                      <input
                        type="number"
                        step="0.25"
                        value={drawing.riskPercent ?? 1}
                        onChange={(e) =>
                          updateDrawing(foundSymbol, drawing!.id, {
                            riskPercent: Number(e.target.value) || 1,
                          })
                        }
                        className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono dark:border-[#2A2E39] dark:bg-[#131722]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Fibonacci Levels Checklist & Ratio Editor */}
              {isFibTool && (
                <div className="space-y-2.5 border-t border-slate-200 pt-3 dark:border-[#2A2E39]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#00D4AA]">
                      Fibonacci Levels
                    </span>
                    <button
                      onClick={() =>
                        updateDrawing(foundSymbol, drawing!.id, {
                          fibLevels:
                            drawing!.type === 'fib_ext'
                              ? DEFAULT_FIB_EXT_LEVELS
                              : DEFAULT_FIB_RETRACE_LEVELS,
                          fibReverse: false,
                        })
                      }
                      className="text-[10px] text-[#2962FF] hover:underline"
                    >
                      Reset Fib Levels
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px]">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(drawing.fibReverse)}
                        onChange={(e) =>
                          updateDrawing(foundSymbol, drawing!.id, { fibReverse: e.target.checked })
                        }
                        className="accent-[#2962FF]"
                      />
                      Reverse
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={drawing.fibShowPrices !== false}
                        onChange={(e) =>
                          updateDrawing(foundSymbol, drawing!.id, {
                            fibShowPrices: e.target.checked,
                          })
                        }
                        className="accent-[#2962FF]"
                      />
                      Prices
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(drawing.fibShowPercents)}
                        onChange={(e) =>
                          updateDrawing(foundSymbol, drawing!.id, {
                            fibShowPercents: e.target.checked,
                          })
                        }
                        className="accent-[#2962FF]"
                      />
                      Percents
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {fibList.map((lvl, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded border border-slate-200 px-2 py-1 dark:border-[#2A2E39] dark:bg-[#131722]/40"
                      >
                        <input
                          type="checkbox"
                          checked={lvl.enabled}
                          onChange={(e) => {
                            const next = fibList.map((item, i) =>
                              i === idx ? { ...item, enabled: e.target.checked } : item
                            );
                            updateDrawing(foundSymbol, drawing!.id, { fibLevels: next });
                          }}
                          className="accent-[#2962FF]"
                        />
                        <input
                          type="number"
                          step="0.001"
                          value={lvl.level}
                          onChange={(e) => {
                            const next = fibList.map((item, i) =>
                              i === idx ? { ...item, level: Number(e.target.value) } : item
                            );
                            updateDrawing(foundSymbol, drawing!.id, { fibLevels: next });
                          }}
                          className="w-14 bg-transparent font-mono text-[11px] outline-none"
                        />
                        <input
                          type="color"
                          value={lvl.color}
                          onChange={(e) => {
                            const next = fibList.map((item, i) =>
                              i === idx ? { ...item, color: e.target.value } : item
                            );
                            updateDrawing(foundSymbol, drawing!.id, { fibLevels: next });
                          }}
                          className="ml-auto h-4 w-5 cursor-pointer border-0 bg-transparent"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'text' && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#787B86]">
                  Label / Note Text
                </label>
                <textarea
                  rows={3}
                  value={drawing.text ?? ''}
                  onChange={(e) => updateDrawing(foundSymbol, drawing!.id, { text: e.target.value })}
                  placeholder="Add label displayed on this drawing..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs outline-none focus:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#131722]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                  <span>Text Color</span>
                  <input
                    type="color"
                    value={drawing.textColor ?? drawing.color}
                    onChange={(e) =>
                      updateDrawing(foundSymbol, drawing!.id, { textColor: e.target.value })
                    }
                    className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                  />
                </label>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                  <span>Size</span>
                  <div className="flex gap-1">
                    {[10, 12, 14, 16].map((fs) => (
                      <button
                        key={fs}
                        onClick={() => updateDrawing(foundSymbol, drawing!.id, { fontSize: fs })}
                        className={cn(
                          'rounded px-1.5 py-0.5 font-mono text-[10px]',
                          (drawing!.fontSize ?? 11) === fs
                            ? 'bg-[#2962FF] text-white'
                            : 'text-[#787B86]'
                        )}
                      >
                        {fs}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      updateDrawing(foundSymbol, drawing!.id, { fontBold: !drawing!.fontBold })
                    }
                    className={cn(
                      'rounded border px-3 py-1 font-bold',
                      drawing.fontBold
                        ? 'border-[#2962FF] bg-[#2962FF]/20 text-[#2962FF]'
                        : 'border-[#2A2E39] text-[#787B86]'
                    )}
                  >
                    B
                  </button>
                  <button
                    onClick={() =>
                      updateDrawing(foundSymbol, drawing!.id, { fontItalic: !drawing!.fontItalic })
                    }
                    className={cn(
                      'rounded border px-3 py-1 italic',
                      drawing.fontItalic
                        ? 'border-[#2962FF] bg-[#2962FF]/20 text-[#2962FF]'
                        : 'border-[#2A2E39] text-[#787B86]'
                    )}
                  >
                    I
                  </button>
                </div>

                <div className="flex rounded bg-slate-100 p-0.5 dark:bg-[#131722]">
                  {(['left', 'center', 'right'] as const).map((al) => (
                    <button
                      key={al}
                      onClick={() => updateDrawing(foundSymbol, drawing!.id, { textAlign: al })}
                      className={cn(
                        'rounded px-2.5 py-1 text-[10px] capitalize',
                        (drawing!.textAlign ?? 'center') === al
                          ? 'bg-[#2962FF] text-white'
                          : 'text-[#787B86]'
                      )}
                    >
                      {al}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'coords' && (
            <div className="space-y-2.5">
              <div className="text-[11px] text-[#787B86]">
                Edit exact Price & Date/Time for every anchor point:
              </div>
              {drawing.points.slice(0, 10).map((pt, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-200 p-2 dark:border-[#2A2E39] dark:bg-[#131722]/40"
                >
                  <span className="col-span-2 font-mono text-[11px] font-bold text-[#2962FF]">
                    Pt #{idx + 1}
                  </span>
                  <div className="col-span-5">
                    <label className="mb-0.5 block text-[9px] text-[#787B86]">Price</label>
                    <input
                      type="number"
                      step="any"
                      value={Number(pt.price.toFixed(symInfo.precision))}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!Number.isFinite(val)) return;
                        const next = drawing!.points.map((p, i) =>
                          i === idx ? { ...p, price: val } : p
                        );
                        updateDrawing(foundSymbol, drawing!.id, { points: next });
                      }}
                      className="w-full rounded border border-slate-200 bg-transparent px-2 py-1 font-mono text-xs outline-none focus:border-[#2962FF] dark:border-[#2A2E39]"
                    />
                  </div>
                  <div className="col-span-5">
                    <label className="mb-0.5 block text-[9px] text-[#787B86]">Date / Time</label>
                    <input
                      type="datetime-local"
                      value={toLocalDateTimeValue(pt.time)}
                      onChange={(e) => {
                        const ms = Date.parse(e.target.value);
                        if (!Number.isFinite(ms)) return;
                        const next = drawing!.points.map((p, i) =>
                          i === idx ? { ...p, time: Math.floor(ms / 1000) } : p
                        );
                        updateDrawing(foundSymbol, drawing!.id, { points: next });
                      }}
                      className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-1 font-mono text-[10px] outline-none focus:border-[#2962FF] dark:border-[#2A2E39]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'visibility' && (
            <div className="space-y-2">
              <div className="mb-1 text-[11px] font-medium text-[#7D8596]">
                Show this drawing on timeframe groups:
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
                      updateDrawing(foundSymbol, drawing!.id, {
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

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60 px-5 py-3 dark:border-[#22293A] dark:bg-[#0D111A]/80">
          <button
            onClick={() =>
              updateDrawing(foundSymbol, drawing!.id, {
                lineWidth: 2,
                lineStyle: 'solid',
                opacity: 100,
                fillOpacity: 15,
                extendLeft: false,
                extendRight: false,
                visibility: DEFAULT_VISIBILITY,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#7D8596] transition hover:bg-slate-200/60 hover:text-slate-900 active:scale-95 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Style
          </button>
          <button
            onClick={() => setEditingId(null)}
            className="rounded-xl bg-gradient-to-b from-[#3B76FF] to-[#2962FF] px-5 py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_-2px_rgba(41,98,255,0.5)] transition-all duration-150 hover:brightness-110 active:scale-95"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
