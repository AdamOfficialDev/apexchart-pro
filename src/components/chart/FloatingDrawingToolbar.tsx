import React, { useState } from 'react';
import { Copy, Lock, Settings2, Trash2, Unlock, Zap } from 'lucide-react';
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
      onMouseDown={(e) => e.stopPropagation()}
      className="pointer-events-auto absolute left-1/2 top-2.5 z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-white/95 px-2 py-1 shadow-xl backdrop-blur dark:border-[#2A2E39] dark:bg-[#1E222D]/95"
    >
      <span className="px-1.5 text-[10px] font-bold uppercase tracking-wider text-[#787B86]">
        {drawing.type.replace(/_/g, ' ')}
      </span>

      <div className="h-4 w-px bg-slate-200 dark:bg-[#2A2E39]" />

      {/* Color Swatch */}
      <div className="relative">
        <button
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

      {/* Width */}
      <div className="flex items-center gap-0.5 px-0.5">
        {WIDTHS.map((w) => (
          <button
            key={w}
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

      {/* Line Style */}
      <div className="flex items-center gap-0.5">
        {LINE_STYLES.map((st) => (
          <button
            key={st.id}
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

      {/* Full Drawing Settings Modal Button */}
      <button
        onClick={() => setEditingDrawingId(drawing.id)}
        title="Full Drawing Settings (Style, Text, Coordinates, Visibility)"
        className="flex h-6 items-center gap-1 rounded px-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]"
      >
        <Settings2 className="h-3.5 w-3.5 text-[#2962FF]" />
        <span className="hidden sm:inline">Settings</span>
      </button>

      <button
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
        onClick={() => duplicateDrawing(symbol, drawing.id)}
        title="Clone Drawing"
        className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:text-[#787B86] dark:hover:bg-[#2A2E39] dark:hover:text-[#D1D4DC]"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>

      <button
        onClick={() => removeDrawing(symbol, drawing.id)}
        title="Delete (Del)"
        className="flex h-6 w-6 items-center justify-center rounded text-[#F23645] hover:bg-[#F23645]/15"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
