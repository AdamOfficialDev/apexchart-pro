import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, GripVertical, Lock, Settings2, Trash2, Unlock, Zap } from 'lucide-react';
import { getSymbolInfo } from '@/data/symbols';
import { cn } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';

const SWATCHES = ['#2962FF', '#00D4AA', '#089981', '#F23645', '#F59E0B', '#A855F7', '#E2E8F0'];
const WIDTHS = [1, 2, 3, 4];
const LINE_STYLES: Array<{ id: 'solid' | 'dashed' | 'dotted'; label: string }> = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'dotted', label: 'Dotted' },
];

interface FloatingDrawingToolbarProps {
  symbol: string;
}

export const FloatingDrawingToolbar: React.FC<FloatingDrawingToolbarProps> = ({ symbol }) => {
  const selectedId = useTradingStore((s) => s.selectedDrawingId);
  const setEditingDrawingId = useTradingStore((s) => s.setEditingDrawingId);
  const drawingsBySymbol = useTradingStore((s) => s.drawingsBySymbol);
  const updateDrawing = useTradingStore((s) => s.updateDrawing);
  const duplicateDrawing = useTradingStore((s) => s.duplicateDrawing);
  const removeDrawing = useTradingStore((s) => s.removeDrawing);
  const paperBalance = useTradingStore((s) => s.paperBalance);
  const quotes = useTradingStore((s) => s.quotes);
  const placeMarketOrder = useTradingStore((s) => s.placeMarketOrder);

  const [colorMenu, setColorMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem('apexchart_floating_toolbar_pos');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return { x: parsed.x, y: parsed.y };
      }
      return null;
    } catch {
      return null;
    }
  });

  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    pointerId: number;
  } | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);

  const clampPos = useCallback((x: number, y: number) => {
    const el = toolbarRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) return { x, y };
    const pad = 8;
    const maxX = Math.max(pad, parent.clientWidth - el.offsetWidth - pad);
    const maxY = Math.max(pad, parent.clientHeight - el.offsetHeight - pad);
    return {
      x: Math.round(Math.min(maxX, Math.max(pad, x))),
      y: Math.round(Math.min(maxY, Math.max(pad, y))),
    };
  }, []);

  useEffect(() => {
    const el = toolbarRef.current;
    const parent = el?.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver(() => {
      setPos((prev) => (prev ? clampPos(prev.x, prev.y) : prev));
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [clampPos]);

  useEffect(() => {
    return () => {
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
      }
    };
  }, []);

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      const el = toolbarRef.current;
      const parent = el?.parentElement;
      if (!el || !parent) return;

      e.stopPropagation();
      e.preventDefault();

      const elRect = el.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const origX = pos ? pos.x : elRect.left - parentRect.left;
      const origY = pos ? pos.y : elRect.top - parentRect.top;

      dragRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        origX,
        origY,
        pointerId: e.pointerId,
      };
      setIsDragging(true);

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore if unsupported
      }
    },
    [pos]
  );

  const onDragMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.stopPropagation();

      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      pendingPosRef.current = clampPos(drag.origX + dx, drag.origY + dy);

      if (dragRafRef.current === null) {
        dragRafRef.current = window.requestAnimationFrame(() => {
          dragRafRef.current = null;
          if (pendingPosRef.current) {
            setPos(pendingPosRef.current);
          }
        });
      }
    },
    [clampPos]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.stopPropagation();

      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      const finalPos = clampPos(drag.origX + dx, drag.origY + dy);

      dragRef.current = null;
      pendingPosRef.current = null;
      setIsDragging(false);
      setPos(finalPos);

      try {
        localStorage.setItem('apexchart_floating_toolbar_pos', JSON.stringify(finalPos));
      } catch {
        // ignore storage quota errors
      }

      try {
        if (e.currentTarget.hasPointerCapture(drag.pointerId)) {
          e.currentTarget.releasePointerCapture(drag.pointerId);
        }
      } catch {
        // ignore
      }
    },
    [clampPos]
  );

  const resetPosition = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPos(null);
    try {
      localStorage.removeItem('apexchart_floating_toolbar_pos');
    } catch {
      // ignore
    }
  }, []);

  if (!selectedId) return null;
  const drawing = (drawingsBySymbol[symbol] ?? []).find((d) => d.id === selectedId);
  if (!drawing) return null;

  const isPositionBox =
    (drawing.type === 'long_pos' || drawing.type === 'short_pos') && drawing.points.length >= 3;

  const handleExecuteRR = () => {
    if (!isPositionBox) return;
    const info = getSymbolInfo(symbol);
    const livePrice = quotes[symbol]?.price ?? drawing.points[0].price;
    const entry = drawing.points[0].price;
    const tp = drawing.points[1].price;
    const sl = drawing.points[2].price;
    const riskPct = drawing.riskPercent ?? 1;
    const acct = drawing.accountSize ?? paperBalance;
    const riskUsd = acct * (riskPct / 100);
    const stopDist = Math.max(Math.abs(entry - sl), info.minMove);
    const qty = Number((riskUsd / stopDist).toFixed(info.category === 'Crypto' ? 4 : 0));
    const safeQty = Math.max(info.category === 'Crypto' ? 0.001 : 1, qty);

    placeMarketOrder({
      symbol,
      side: drawing.type === 'long_pos' ? 'buy' : 'sell',
      quantity: safeQty,
      price: livePrice,
      stopLoss: Number(sl.toFixed(info.precision)),
      takeProfit: Number(tp.toFixed(info.precision)),
    });
  };

  return (
    <div
      ref={toolbarRef}
      style={pos ? { left: `${pos.x}px`, top: `${pos.y}px`, transform: 'none' } : undefined}
      onPointerDown={(e) => {
        e.stopPropagation();
        const target = e.target as HTMLElement;
        if (!target.closest('button, input, select, a, [data-no-drag]')) {
          startDrag(e);
        }
      }}
      onPointerMove={onDragMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'pointer-events-auto absolute z-40 flex max-w-[95%] flex-wrap items-center gap-1 rounded-xl border border-slate-200/90 bg-white/95 px-2 py-1.5 shadow-xl backdrop-blur-md dark:border-[#283044] dark:bg-[#161B26]/95',
        pos === null && 'left-1/2 top-3 -translate-x-1/2',
        isDragging && 'ring-1 ring-[#2962FF]/50 shadow-2xl select-none'
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onPointerDown={startDrag}
        onDoubleClick={resetPosition}
        title="Drag to move toolbar (Double-click to reset)"
        className={cn(
          'flex h-6 w-5 touch-none items-center justify-center rounded-md text-[#787B86] transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#222938] dark:hover:text-white',
          isDragging ? 'cursor-grabbing text-[#2962FF]' : 'cursor-grab'
        )}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      <span className="cursor-grab select-none px-1 text-[10px] font-bold uppercase tracking-wider text-[#787B86] active:cursor-grabbing">
        {drawing.type.replace(/_/g, ' ')}
      </span>

      <div className="h-4 w-px bg-slate-200 dark:bg-[#2A2E39]" />

      <div className="relative">
        <button
          type="button"
          onClick={() => setColorMenu(!colorMenu)}
          title="Color"
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
        >
          <span
            className="h-3.5 w-3.5 rounded-sm border border-white/25"
            style={{ backgroundColor: drawing.color }}
          />
        </button>
        {colorMenu && (
          <div className="absolute left-0 top-8 z-50 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-[#2A2E39] dark:bg-[#1E222D]">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  updateDrawing(symbol, drawing.id, { color: c });
                  setColorMenu(false);
                }}
                style={{ backgroundColor: c }}
                className={cn(
                  'h-4 w-4 rounded-full transition hover:scale-110',
                  drawing.color === c && 'ring-2 ring-white ring-offset-1 ring-offset-[#1E222D]'
                )}
              />
            ))}
            <input
              type="color"
              value={drawing.color}
              onChange={(e) => updateDrawing(symbol, drawing.id, { color: e.target.value })}
              className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 px-0.5">
        {WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => updateDrawing(symbol, drawing.id, { lineWidth: w })}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded font-mono text-[10px] font-semibold transition',
              drawing.lineWidth === w
                ? 'bg-[#2962FF]/20 text-[#2962FF]'
                : 'text-slate-500 hover:bg-slate-100 dark:text-[#787B86] dark:hover:bg-[#2A2E39] dark:hover:text-[#D1D4DC]'
            )}
          >
            {w}px
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-slate-200 dark:bg-[#2A2E39]" />

      <div className="flex items-center gap-0.5">
        {LINE_STYLES.map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => updateDrawing(symbol, drawing.id, { lineStyle: st.id })}
            title={st.label}
            className={cn(
              'flex h-6 items-center justify-center rounded px-1.5 text-[10px] font-medium transition',
              (drawing.lineStyle ?? 'solid') === st.id
                ? 'bg-[#2962FF]/20 text-[#2962FF]'
                : 'text-slate-500 hover:bg-slate-100 dark:text-[#787B86] dark:hover:bg-[#2A2E39] dark:hover:text-[#D1D4DC]'
            )}
          >
            {st.id === 'solid' ? '—' : st.id === 'dashed' ? '- -' : '···'}
          </button>
        ))}
      </div>

      {isPositionBox && (
        <>
          <div className="h-4 w-px bg-slate-200 dark:bg-[#2A2E39]" />
          <button
            type="button"
            onClick={handleExecuteRR}
            title="Auto-calculate risk lot size and place order"
            className="inline-flex items-center gap-1 rounded bg-[#00D4AA]/15 px-2 py-0.5 text-[10px] font-bold text-[#00D4AA] hover:bg-[#00D4AA] hover:text-slate-950 transition"
          >
            <Zap className="h-3 w-3" />
            <span>Execute {drawing.riskPercent ?? 1}%</span>
          </button>
        </>
      )}

      <div className="h-4 w-px bg-slate-200 dark:bg-[#2A2E39]" />

      <button
        type="button"
        onClick={() => setEditingDrawingId(drawing.id)}
        title="Full Drawing Settings"
        className="flex h-6 items-center gap-1 rounded px-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]"
      >
        <Settings2 className="h-3.5 w-3.5 text-[#2962FF]" />
        <span className="hidden sm:inline">Settings</span>
      </button>

      <button
        type="button"
        onClick={() => updateDrawing(symbol, drawing.id, { locked: !drawing.locked })}
        title={drawing.locked ? 'Unlock' : 'Lock'}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded transition',
          drawing.locked
            ? 'bg-amber-500/20 text-amber-400'
            : 'text-slate-500 hover:bg-slate-100 dark:text-[#787B86] dark:hover:bg-[#2A2E39] dark:hover:text-[#D1D4DC]'
        )}
      >
        {drawing.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
      </button>

      <button
        type="button"
        onClick={() => duplicateDrawing(symbol, drawing.id)}
        title="Clone Drawing"
        className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:text-[#787B86] dark:hover:bg-[#2A2E39] dark:hover:text-[#D1D4DC]"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() => removeDrawing(symbol, drawing.id)}
        title="Delete Drawing (Del)"
        className="flex h-6 w-6 items-center justify-center rounded text-[#F23645] hover:bg-[#F23645]/15"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
