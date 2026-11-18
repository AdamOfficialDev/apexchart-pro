import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Brush,
  Circle,
  Eraser,
  Eye,
  EyeOff,
  GitBranch,
  Lock,
  Magnet,
  MessageSquare,
  Minus,
  MousePointer2,
  MoveUpRight,
  Palette,
  Pencil,
  Pin,
  Redo2,
  Ruler,
  SlidersHorizontal,
  Square,
  Tag,
  Trash2,
  TrendingUp,
  Triangle,
  Type,
  Undo2,
  Unlock,
  Waves,
} from 'lucide-react';
import { DRAWING_TOOLS_CATALOG } from '@/data/symbols';
import { cn } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';
import { DrawingToolGroupId, DrawingToolType } from '@/types/trading';

const PALETTE_COLORS = ['#2962FF', '#00D4AA', '#F59E0B', '#F23645', '#A855F7', '#38BDF8', '#D1D4DC'];

const GROUP_ORDER: { id: DrawingToolGroupId; label: string }[] = [
  { id: 'cursors', label: 'Cursors & Eraser' },
  { id: 'lines', label: 'Trend Line Tools' },
  { id: 'fib_gann', label: 'Gann & Fibonacci Tools' },
  { id: 'patterns', label: 'Harmonic & Elliott Patterns' },
  { id: 'forecast', label: 'Projection & Risk/Reward' },
  { id: 'shapes', label: 'Geometric Shapes' },
  { id: 'annotations', label: 'Annotation & Brushes' },
  { id: 'measure', label: 'Measure' },
];

function renderToolIcon(tool: DrawingToolType): React.ReactNode {
  switch (tool) {
    case 'cursor':
      return <MousePointer2 className="h-4 w-4" />;
    case 'eraser':
      return <Eraser className="h-4 w-4 text-rose-400" />;
    case 'trendline':
    case 'info_line':
      return <TrendingUp className="h-4 w-4" />;
    case 'ray':
    case 'extended_line':
    case 'arrow_marker':
      return <MoveUpRight className="h-4 w-4" />;
    case 'hline':
    case 'hray':
      return <Minus className="h-4 w-4" />;
    case 'vline':
    case 'cross_line':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="5" y1="12" x2="19" y2="12" strokeDasharray="3 2" />
        </svg>
      );
    case 'channel':
    case 'regression_channel':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="15" x2="18" y2="5" />
          <line x1="6" y1="19" x2="20" y2="9" />
        </svg>
      );
    case 'fib':
    case 'fib_ext':
    case 'fib_channel':
    case 'fib_timezone':
    case 'fib_fan':
    case 'fib_arc':
      return <SlidersHorizontal className="h-4 w-4" />;
    case 'pitchfork':
      return <GitBranch className="h-4 w-4" />;
    case 'gann_box':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="4" width="16" height="16" />
          <line x1="4" y1="20" x2="20" y2="4" />
          <line x1="4" y1="4" x2="20" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      );
    case 'xabcd':
    case 'abcd':
    case 'elliott_impulse':
    case 'elliott_abc':
    case 'head_shoulders':
      return <Waves className="h-4 w-4" />;
    case 'long_pos':
      return <ArrowUpCircle className="h-4 w-4 text-[#089981]" />;
    case 'short_pos':
      return <ArrowDownCircle className="h-4 w-4 text-[#F23645]" />;
    case 'date_price_range':
    case 'bar_pattern':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5" width="16" height="14" strokeDasharray="3 2" />
          <path d="M8 15l3-4 3 2 3-5" />
        </svg>
      );
    case 'rect':
    case 'rotated_rect':
      return <Square className="h-4 w-4" />;
    case 'ellipse':
      return <Circle className="h-4 w-4" />;
    case 'triangle':
      return <Triangle className="h-4 w-4" />;
    case 'arc':
    case 'polyline':
      return <Pencil className="h-4 w-4" />;
    case 'brush':
    case 'highlighter':
      return <Brush className="h-4 w-4" />;
    case 'text':
      return <Type className="h-4 w-4" />;
    case 'callout':
      return <MessageSquare className="h-4 w-4" />;
    case 'price_label':
      return <Tag className="h-4 w-4" />;
    case 'ruler':
      return <Ruler className="h-4 w-4" />;
    default:
      return <MousePointer2 className="h-4 w-4" />;
  }
}

export const DrawingToolbar: React.FC = () => {
  const activeTool = useTradingStore((s) => s.activeDrawingTool);
  const groupDefaultTools = useTradingStore((s) => s.groupDefaultTools);
  const setGroupTool = useTradingStore((s) => s.setGroupTool);
  const setActiveTool = useTradingStore((s) => s.setActiveDrawingTool);

  const drawingColor = useTradingStore((s) => s.drawingColor);
  const setDrawingColor = useTradingStore((s) => s.setDrawingColor);
  const stayInDrawingMode = useTradingStore((s) => s.stayInDrawingMode);
  const toggleStayInDrawingMode = useTradingStore((s) => s.toggleStayInDrawingMode);
  const magnetMode = useTradingStore((s) => s.magnetMode);
  const toggleMagnetMode = useTradingStore((s) => s.toggleMagnetMode);
  const drawingsLocked = useTradingStore((s) => s.drawingsLocked);
  const toggleDrawingsLocked = useTradingStore((s) => s.toggleDrawingsLocked);
  const drawingsVisible = useTradingStore((s) => s.drawingsVisible);
  const toggleDrawingsVisible = useTradingStore((s) => s.toggleDrawingsVisible);
  const undoDrawing = useTradingStore((s) => s.undoDrawing);
  const redoDrawing = useTradingStore((s) => s.redoDrawing);
  const clearDrawings = useTradingStore((s) => s.clearDrawingsForSymbol);

  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const activeSymbol = useMemo(
    () => (panes.find((p) => p.id === activePaneId) ?? panes[0]).symbol,
    [panes, activePaneId]
  );

  const [openFlyout, setOpenFlyout] = useState<DrawingToolGroupId | null>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const barRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenFlyout(null);
        setColorOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <aside
      ref={barRef}
      className="relative z-30 flex w-[44px] shrink-0 flex-col items-center justify-between border-r border-slate-200 bg-white py-1.5 dark:border-[#2A2E39] dark:bg-[#131722]"
    >
      <div className="flex flex-col items-center gap-0.5 px-1">
        {GROUP_ORDER.map((group) => {
          const groupTools = DRAWING_TOOLS_CATALOG.filter((t) => t.group === group.id);
          const currentGroupTool = groupDefaultTools[group.id] ?? groupTools[0].id;
          const isGroupActive = groupTools.some((t) => t.id === activeTool);
          const displayTool = isGroupActive ? activeTool : currentGroupTool;
          const displayMeta = DRAWING_TOOLS_CATALOG.find((t) => t.id === displayTool) ?? groupTools[0];
          const hasFlyout = groupTools.length > 1;

          return (
            <div key={group.id} className="relative flex items-center">
              <button
                onClick={() => {
                  setActiveTool(displayTool);
                  setOpenFlyout(null);
                }}
                onContextMenu={(e) => {
                  if (hasFlyout) {
                    e.preventDefault();
                    setOpenFlyout(openFlyout === group.id ? null : group.id);
                  }
                }}
                title={`${displayMeta.label}${
                  displayMeta.shortcut ? ` (${displayMeta.shortcut})` : ''
                }${hasFlyout ? ' — Click ▸ for more tools' : ''}`}
                className={cn(
                  'relative flex h-8 w-8 items-center justify-center rounded-md transition',
                  isGroupActive
                    ? 'bg-[#2962FF]/20 text-[#2962FF]'
                    : 'text-[#787B86] hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]'
                )}
              >
                {renderToolIcon(displayTool)}
                {isGroupActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-[#2962FF]" />
                )}
              </button>

              {hasFlyout && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenFlyout(openFlyout === group.id ? null : group.id);
                    setColorOpen(false);
                  }}
                  title={`Expand ${group.label}`}
                  className="absolute -right-1 bottom-0.5 flex h-3 w-3 items-center justify-center text-[#787B86] hover:text-[#2962FF]"
                >
                  <svg viewBox="0 0 8 8" className="h-2 w-2 fill-current">
                    <polygon points="8,8 8,2 2,8" />
                  </svg>
                </button>
              )}

              {/* Flyout Sub-Menu Drawer */}
              {openFlyout === group.id && (
                <div className="absolute left-11 top-0 z-50 w-60 rounded-lg border border-slate-200 bg-white py-1.5 shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D]">
                  <div className="border-b border-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#787B86] dark:border-[#2A2E39]">
                    {group.label} ({groupTools.length})
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {groupTools.map((tool) => {
                      const sel = activeTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setGroupTool(group.id, tool.id);
                            setOpenFlyout(null);
                          }}
                          className={cn(
                            'flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition',
                            sel
                              ? 'bg-[#2962FF]/15 font-semibold text-[#2962FF]'
                              : 'text-slate-700 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]'
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            {renderToolIcon(tool.id)}
                            <span>{tool.label}</span>
                          </span>
                          {tool.shortcut && (
                            <span className="font-mono text-[10px] text-[#787B86]">
                              {tool.shortcut}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="my-1 h-px w-6 bg-slate-200 dark:bg-[#2A2E39]" />

        {/* Default Color */}
        <div className="relative">
          <button
            onClick={() => {
              setColorOpen(!colorOpen);
              setOpenFlyout(null);
            }}
            title="Default Drawing Color"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#787B86] hover:bg-slate-100 dark:hover:bg-[#1E222D]"
          >
            <Palette className="h-4 w-4" style={{ color: drawingColor }} />
          </button>
          {colorOpen && (
            <div className="absolute left-11 top-0 z-50 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D]">
              {PALETTE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setDrawingColor(c);
                    setColorOpen(false);
                  }}
                  style={{ backgroundColor: c }}
                  className={cn(
                    'h-4 w-4 rounded-full transition hover:scale-110',
                    drawingColor === c && 'ring-2 ring-white ring-offset-2 ring-offset-[#1E222D]'
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Magnet Mode */}
        <button
          onClick={toggleMagnetMode}
          title="Magnet OHLC Snap (Alt+M)"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md transition',
            magnetMode
              ? 'bg-[#2962FF]/20 text-[#2962FF]'
              : 'text-[#787B86] hover:bg-slate-100 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]'
          )}
        >
          <Magnet className="h-4 w-4" />
        </button>

        {/* Stay in Drawing Mode */}
        <button
          onClick={toggleStayInDrawingMode}
          title="Stay in Drawing Mode (Keep Tool Active)"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md transition',
            stayInDrawingMode
              ? 'bg-[#2962FF]/20 text-[#2962FF]'
              : 'text-[#787B86] hover:bg-slate-100 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]'
          )}
        >
          <Pin className="h-4 w-4" />
        </button>

        {/* Lock Drawings */}
        <button
          onClick={toggleDrawingsLocked}
          title={drawingsLocked ? 'Unlock All Drawings' : 'Lock All Drawings'}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md transition',
            drawingsLocked
              ? 'bg-amber-500/20 text-amber-400'
              : 'text-[#787B86] hover:bg-slate-100 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]'
          )}
        >
          {drawingsLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        </button>

        {/* Hide/Show Drawings */}
        <button
          onClick={toggleDrawingsVisible}
          title={drawingsVisible ? 'Hide All Drawings' : 'Show All Drawings'}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md transition',
            !drawingsVisible
              ? 'bg-[#2962FF]/20 text-[#2962FF]'
              : 'text-[#787B86] hover:bg-slate-100 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]'
          )}
        >
          {drawingsVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      {/* Bottom Undo / Redo / Clear */}
      <div className="flex flex-col items-center gap-0.5 pt-1">
        <button
          onClick={() => undoDrawing(activeSymbol)}
          title="Undo Drawing"
          className="flex h-7 w-8 items-center justify-center rounded-md text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => redoDrawing(activeSymbol)}
          title="Redo Drawing"
          className="flex h-7 w-8 items-center justify-center rounded-md text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => clearDrawings(activeSymbol)}
          title="Remove All Drawings on Symbol"
          className="flex h-7 w-8 items-center justify-center rounded-md text-[#787B86] transition hover:bg-rose-500/15 hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
};
