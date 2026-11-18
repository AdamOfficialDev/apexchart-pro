import React from 'react';
import { Eye, EyeOff, Layers, Lock, Trash2, Unlock } from 'lucide-react';
import { DRAWING_TOOLS_CATALOG, getSymbolInfo } from '@/data/symbols';
import { cn, formatPrice } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';

export const ObjectTreePanel: React.FC = () => {
  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const drawingsBySymbol = useTradingStore((s) => s.drawingsBySymbol);
  const selectedDrawingId = useTradingStore((s) => s.selectedDrawingId);
  const setSelectedDrawingId = useTradingStore((s) => s.setSelectedDrawingId);
  const updateDrawing = useTradingStore((s) => s.updateDrawing);
  const removeDrawing = useTradingStore((s) => s.removeDrawing);
  const clearDrawings = useTradingStore((s) => s.clearDrawingsForSymbol);

  const toggleIndicatorVisibility = useTradingStore((s) => s.toggleIndicatorVisibility);
  const removeIndicator = useTradingStore((s) => s.removeIndicator);

  const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0];
  const info = getSymbolInfo(activePane.symbol);
  const drawings = drawingsBySymbol[activePane.symbol] ?? [];

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#131722]">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-[#2A2E39]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#787B86]">
          Object Tree • {info.displaySymbol}
        </span>
        {drawings.length > 0 && (
          <button
            onClick={() => clearDrawings(activePane.symbol)}
            className="text-[10px] font-semibold text-[#F23645] hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
        {/* Indicators Group */}
        <div>
          <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[#787B86]">
            Indicators ({activePane.indicators.length})
          </div>
          {activePane.indicators.length === 0 ? (
            <div className="px-2 py-2 text-xs text-[#787B86]">No indicators added.</div>
          ) : (
            <div className="space-y-1">
              {activePane.indicators.map((ind) => (
                <div
                  key={ind.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-2.5 py-1.5 text-xs dark:border-[#2A2E39] dark:bg-[#1E222D]/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ind.color }} />
                    <span className="font-semibold text-slate-800 dark:text-[#D1D4DC]">
                      {ind.name}
                    </span>
                    <span className="font-mono text-[10px] text-[#787B86]">
                      {Object.values(ind.params).join(',')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleIndicatorVisibility(activePane.id, ind.id)}
                      className="rounded p-1 text-[#787B86] hover:text-white"
                    >
                      {ind.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => removeIndicator(activePane.id, ind.id)}
                      className="rounded p-1 text-[#787B86] hover:text-[#F23645]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawings Group */}
        <div>
          <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[#787B86]">
            Drawings ({drawings.length})
          </div>
          {drawings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-[#787B86]">
              <Layers className="mb-2 h-6 w-6 opacity-35" />
              No drawings on {info.displaySymbol}. Pick any tool from the left toolbar.
            </div>
          ) : (
            <div className="space-y-1">
              {[...drawings].reverse().map((d) => {
                const meta = DRAWING_TOOLS_CATALOG.find((t) => t.id === d.type);
                const isSel = selectedDrawingId === d.id;
                const priceTag = d.points[0] ? formatPrice(d.points[0].price, info.precision) : '';
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDrawingId(d.id)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-md border px-2.5 py-1.5 text-xs transition',
                      isSel
                        ? 'border-[#2962FF] bg-[#2962FF]/15'
                        : 'border-slate-200 dark:border-[#2A2E39] dark:bg-[#1E222D]/60 dark:hover:bg-[#1E222D]'
                    )}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: d.color }}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-800 dark:text-[#D1D4DC]">
                          {d.text || meta?.label || d.type}
                        </div>
                        <div className="font-mono text-[10px] text-[#787B86]">
                          @ {priceTag} • {d.points.length} pts
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateDrawing(activePane.symbol, d.id, {
                            visible: d.visible === false ? true : false,
                          });
                        }}
                        className="rounded p-1 text-[#787B86] hover:text-white"
                      >
                        {d.visible === false ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateDrawing(activePane.symbol, d.id, { locked: !d.locked });
                        }}
                        className={cn(
                          'rounded p-1',
                          d.locked ? 'text-amber-400' : 'text-[#787B86] hover:text-white'
                        )}
                      >
                        {d.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDrawing(activePane.symbol, d.id);
                        }}
                        className="rounded p-1 text-[#787B86] hover:text-[#F23645]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
