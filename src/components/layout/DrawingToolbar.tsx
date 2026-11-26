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
  const mobileOpen = useTradingStore((s) => s.mobileDrawingBarOpen);

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
  const drawingsBySymbol = useTradingStore((s) => s.drawingsBySymbol);
  const addToast = useTradingStore((s) => s.addToast);

  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const activeSymbol = useMemo(
    () => (panes.find((p) => p.id === activePaneId) ?? panes[0]).symbol,
    [panes, activePaneId]
  );

  const [flyout, setFlyout] = useState<{
    groupId: DrawingToolGroupId;
    top: number;
    left: number;
  } | null>(null);

  const [colorPos, setColorPos] = useState<{ top: number; left: number } | null>(null);
  const barRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setFlyout(null);
        setColorPos(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFlyout(null);
        setColorPos(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onEsc);
    };
  }, []);

  const openGroupFlyout = (groupId: DrawingToolGroupId, el: HTMLElement, toolCount: number) => {
    if (flyout?.groupId === groupId) {
      setFlyout(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const estHeight = Math.min(340, toolCount * 32 + 40);
    const top = Math.max(44, Math.min(rect.top, window.innerHeight - estHeight - 12));
    const left = rect.right + 6;
    setColorPos(null);
    setFlyout({ groupId, top, left });
  };

  const handleClearAll = () => {
    const count = (drawingsBySymbol[activeSymbol] ?? []).length;
    clearDrawings(activeSymbol);
    addToast({
      title: count > 0 ? `Cleared ${count} drawings on ${activeSymbol}` : 'No drawings to clear',
      variant: 'info',
    });
  };

  const flyoutMeta = flyout ? GROUP_ORDER.find((g) => g.id === flyout.groupId) : null;
  const flyoutTools = flyout
    ? DRAWING_TOOLS_CATALOG.filter((t) => t.group === flyout.groupId)
    : [];

  return (
    <aside
      ref={barRef}
      className={cn(
        'relative z-30 w-[46px] shrink-0 flex-col items-center justify-between border-r border-slate-200/80 bg-white/95 py-2 dark:border-[#222836] dark:bg-[#0F131D]/95',
        mobileOpen ? 'flex' : 'hidden sm:flex'
      )}
    >
      <div className="flex flex-col items-center gap-0.5 overflow-y-auto no-scrollbar px-1">
        {GROUP_ORDER.map((group) => {
          const groupTools = DRAWING_TOOLS_CATALOG.filter((t) => t.group === group.id);
          const currentGroupTool = groupDefaultTools[group.id] ?? groupTools[0].id;
          const isGroupActive = groupTools.some((t) => t.id === activeTool);
          const displayTool = isGroupActive ? activeTool : currentGroupTool;
          const displayMeta =
            DRAWING_TOOLS_CATALOG.find((t) => t.id === displayTool) ?? groupTools[0];
          const hasFlyout = groupTools.length > 1;

          return (
            <div key={group.id} className="relative flex items-center">
              <button
                type="button"
                onClick={(e) => {
                  if (hasFlyout && isGroupActive) {
                    openGroupFlyout(group.id, e.currentTarget, groupTools.length);
                  } else {
                    setActiveTool(displayTool);
                    setFlyout(null);
                  }
                }}
                onContextMenu={(e) => {
                  if (hasFlyout) {
                    e.preventDefault();
                    openGroupFlyout(group.id, e.currentTarget, groupTools.length);
                  }
                }}
                title={`${displayMeta.label}${
                  displayMeta.shortcut ? ` (${displayMeta.shortcut})` : ''
                }${hasFlyout ? ' — Click again or ▸ for sub-tools' : ''}`}
                className={cn(
                  'relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-90',
                  isGroupActive
                    ? 'bg-gradient-to-b from-[#2962FF]/25 to-[#2962FF]/10 text-[#4C82FF] ring-1 ring-[#2962FF]/35 shadow-glowBlue'
                    : 'text-[#787B86] hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#181D2A] dark:hover:text-white'
                )}
              >
                {renderToolIcon(displayTool)}
                {isGroupActive && (
                  <span className="absolute -left-1 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#2962FF] shadow-[0_0_8px_#2962FF]" />
                )}
              </button>

              {hasFlyout && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const parentBtn = e.currentTarget.parentElement;
                    openGroupFlyout(
                      group.id,
                      parentBtn ?? e.currentTarget,
                      groupTools.length
                    );
                  }}
                  title={`Show ${group.label} (${groupTools.length})`}
                  className="absolute -right-0.5 bottom-0 flex h-4 w-4 items-center justify-center rounded-sm text-[#787B86] hover:text-[#2962FF]"
                >
                  <svg viewBox="0 0 8 8" className="h-2 w-2 fill-current">
                    <polygon points="8,8 8,2 2,8" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}

        <div className="my-1 h-px w-6 bg-slate-200 dark:bg-[#2A2E39]" />

        <button
          type="button"
          onClick={(e) => {
            setFlyout(null);
            if (colorPos) {
              setColorPos(null);
              return;
            }
            const rect = e.currentTarget.getBoundingClientRect();
            setColorPos({
              top: Math.max(44, Math.min(rect.top, window.innerHeight - 50)),
              left: rect.right + 6,
            });
          }}
          title="Default Drawing Color"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#787B86] hover:bg-slate-100 dark:hover:bg-[#1E222D]"
        >
          <Palette className="h-4 w-4" style={{ color: drawingColor }} />
        </button>

        <button
          type="button"
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

        <button
          type="button"
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

        <button
          type="button"
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

        <button
          type="button"
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

      <div className="flex flex-col items-center gap-0.5 pt-1">
        <button
          type="button"
          onClick={() => undoDrawing(activeSymbol)}
          title="Undo Drawing"
          className="flex h-7 w-8 items-center justify-center rounded-md text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => redoDrawing(activeSymbol)}
          title="Redo Drawing"
          className="flex h-7 w-8 items-center justify-center rounded-md text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          title="Remove All Drawings on Symbol"
          className="flex h-7 w-8 items-center justify-center rounded-md text-[#787B86] transition hover:bg-rose-500/15 hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Fixed Flyout Sub-Tools Menu (Never clipped by overflow-y-auto!) */}
      {flyout && flyoutMeta && (
        <div
          style={{ top: flyout.top, left: flyout.left }}
          className="glass-popover animate-slideRight fixed z-[60] w-64 rounded-xl border border-slate-200/80 bg-white/95 py-1.5 dark:border-[#262C3D] dark:bg-[#161B26]/95"
        >
          <div className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#787B86] dark:border-[#242B3A]">
            {flyoutMeta.label} ({flyoutTools.length})
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {flyoutTools.map((tool) => {
              const sel = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    setGroupTool(flyout.groupId, tool.id);
                    setFlyout(null);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-all duration-150',
                    sel
                      ? 'bg-[#2962FF]/15 font-semibold text-[#2962FF]'
                      : 'text-slate-700 hover:translate-x-0.5 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#222938]'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    {renderToolIcon(tool.id)}
                    <span>{tool.label}</span>
                  </span>
                  {tool.shortcut && (
                    <kbd className="rounded border border-slate-200 px-1 py-[1px] font-mono text-[9px] text-[#787B86] dark:border-[#2A3142] dark:bg-[#0F131D]">
                      {tool.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fixed Color Picker Popover */}
      {colorPos && (
        <div
          style={{ top: colorPos.top, left: colorPos.left }}
          className="glass-popover animate-slideRight fixed z-[60] flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/95 p-2.5 dark:border-[#262C3D] dark:bg-[#161B26]/95"
        >
          {PALETTE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setDrawingColor(c);
                setColorPos(null);
              }}
              style={{ backgroundColor: c }}
              className={cn(
                'h-4 w-4 rounded-full transition-transform duration-150 hover:scale-125 active:scale-95',
                drawingColor === c && 'ring-2 ring-white ring-offset-2 ring-offset-[#161B26]'
              )}
            />
          ))}
        </div>
      )}
    </aside>
  );
};
