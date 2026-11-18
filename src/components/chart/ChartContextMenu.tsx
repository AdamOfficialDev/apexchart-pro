import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Bell,
  CandlestickChart,
  Check,
  ChevronRight,
  Copy,
  Database,
  Eye,
  EyeOff,
  Lock,
  Minus,
  MoveRight,
  RotateCcw,
  Scissors,
  Settings2,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Unlock,
  Zap,
} from 'lucide-react';
import { getSymbolInfo } from '@/data/symbols';
import { formatPrice } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';
import { ChartContextMenuData, ChartStyleType, ScaleMode } from '@/types/trading';

interface ChartContextMenuProps {
  menu: ChartContextMenuData | null;
  paneId: string;
  symbol: string;
  currentStyle: ChartStyleType;
  currentScale: ScaleMode;
  onClose: () => void;
  onResetView: () => void;
  onFitContent: () => void;
  onDrawHLineAtPrice: (price: number, type?: 'hline' | 'hray') => void;
  onStartReplayHere: (barIndex: number, time: number) => void;
}

const STYLES: { id: ChartStyleType; label: string }[] = [
  { id: 'candles', label: 'Candles' },
  { id: 'hollow', label: 'Hollow Candles' },
  { id: 'heikin_ashi', label: 'Heikin Ashi' },
  { id: 'bars', label: 'OHLC Bars' },
  { id: 'line', label: 'Line' },
  { id: 'area', label: 'Area' },
];

export const ChartContextMenu: React.FC<ChartContextMenuProps> = ({
  menu,
  paneId,
  symbol,
  currentStyle,
  currentScale,
  onClose,
  onResetView,
  onFitContent,
  onDrawHLineAtPrice,
  onStartReplayHere,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [subMenu, setSubMenu] = useState<'style' | 'scale' | 'smart' | null>(null);

  const info = getSymbolInfo(symbol);
  const quotes = useTradingStore((s) => s.quotes);
  const paperBalance = useTradingStore((s) => s.paperBalance);
  const chartSettings = useTradingStore((s) => s.chartSettings);
  const updateChartSettings = useTradingStore((s) => s.updateChartSettings);
  const smartOverlays = useTradingStore((s) => s.smartOverlays);
  const updateSmartOverlays = useTradingStore((s) => s.updateSmartOverlays);
  const updatePaneChartStyle = useTradingStore((s) => s.updatePaneChartStyle);
  const updatePaneScaleMode = useTradingStore((s) => s.updatePaneScaleMode);
  const addAlert = useTradingStore((s) => s.addAlert);
  const addToast = useTradingStore((s) => s.addToast);
  const placeLimitOrder = useTradingStore((s) => s.placeLimitOrder);
  const placeMarketOrder = useTradingStore((s) => s.placeMarketOrder);
  const openChartSettingsTab = useTradingStore((s) => s.openChartSettingsTab);
  const setEditingDrawingId = useTradingStore((s) => s.setEditingDrawingId);

  const drawingsVisible = useTradingStore((s) => s.drawingsVisible);
  const toggleDrawingsVisible = useTradingStore((s) => s.toggleDrawingsVisible);
  const drawingsLocked = useTradingStore((s) => s.drawingsLocked);
  const toggleDrawingsLocked = useTradingStore((s) => s.toggleDrawingsLocked);
  const clearDrawings = useTradingStore((s) => s.clearDrawingsForSymbol);
  const drawingsBySymbol = useTradingStore((s) => s.drawingsBySymbol);
  const updateDrawing = useTradingStore((s) => s.updateDrawing);
  const duplicateDrawing = useTradingStore((s) => s.duplicateDrawing);
  const removeDrawing = useTradingStore((s) => s.removeDrawing);

  useEffect(() => {
    setSubMenu(null);
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const formattedPrice = formatPrice(menu.price, info.precision);
  const livePrice = quotes[symbol]?.price ?? info.basePrice;
  const defaultQty = info.category === 'Crypto' ? 0.25 : info.category === 'IDX' ? 1000 : 10;

  const menuW = 264;
  const menuH = 470;
  const left = Math.min(menu.x, window.innerWidth - menuW - 12);
  const top = Math.min(menu.y, window.innerHeight - menuH - 12);

  const targetDrawing = menu.drawingId
    ? (drawingsBySymbol[symbol] ?? []).find((d) => d.id === menu.drawingId)
    : null;

  const executeFromRRBox = () => {
    if (!targetDrawing || targetDrawing.points.length < 3) return;
    const entry = targetDrawing.points[0].price;
    const tp = targetDrawing.points[1].price;
    const sl = targetDrawing.points[2].price;
    const isLong = targetDrawing.type === 'long_pos';
    const riskPct = targetDrawing.riskPercent ?? 1;
    const riskUsd = (targetDrawing.accountSize ?? paperBalance) * (riskPct / 100);
    const stopDist = Math.max(Math.abs(entry - sl), info.minMove);
    const qty = Number((riskUsd / stopDist).toFixed(info.category === 'Crypto' ? 4 : 0));
    const safeQty = Math.max(info.category === 'Crypto' ? 0.001 : 1, qty);

    placeMarketOrder({
      symbol,
      side: isLong ? 'buy' : 'sell',
      quantity: safeQty,
      price: livePrice,
      stopLoss: Number(sl.toFixed(info.precision)),
      takeProfit: Number(tp.toFixed(info.precision)),
    });
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 w-[264px] rounded-lg border border-slate-200 bg-white py-1.5 text-xs shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D] dark:text-[#D1D4DC]"
    >
      {targetDrawing && (
        <>
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2962FF]">
            Drawing: {targetDrawing.type.replace(/_/g, ' ')}
          </div>
          <button
            onClick={() => {
              setEditingDrawingId(targetDrawing.id);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 font-semibold hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
          >
            <Settings2 className="h-3.5 w-3.5 text-[#2962FF]" />
            <span>Drawing Settings...</span>
          </button>
          {(targetDrawing.type === 'long_pos' || targetDrawing.type === 'short_pos') && (
            <button
              onClick={executeFromRRBox}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 font-semibold text-[#00D4AA] hover:bg-[#00D4AA]/10"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Execute Trade (Auto-Size)</span>
            </button>
          )}
          <button
            onClick={() => {
              updateDrawing(symbol, targetDrawing.id, { locked: !targetDrawing.locked });
              onClose();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
          >
            {targetDrawing.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            <span>{targetDrawing.locked ? 'Unlock Drawing' : 'Lock Drawing'}</span>
          </button>
          <button
            onClick={() => {
              duplicateDrawing(symbol, targetDrawing.id);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Clone Drawing</span>
          </button>
          <button
            onClick={() => {
              removeDrawing(symbol, targetDrawing.id);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[#F23645] hover:bg-[#F23645]/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Drawing</span>
          </button>
          <div className="my-1 border-t border-slate-200 dark:border-[#2A2E39]" />
        </>
      )}

      <button
        onClick={() => {
          onResetView();
          onClose();
        }}
        className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
      >
        <span className="flex items-center gap-2.5 font-medium">
          <RotateCcw className="h-3.5 w-3.5 text-[#2962FF]" />
          Reset Chart View
        </span>
        <span className="font-mono text-[10px] text-[#787B86]">Alt+Shift+R</span>
      </button>

      <button
        onClick={() => {
          onFitContent();
          onClose();
        }}
        className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
      >
        <span className="flex items-center gap-2.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-[#787B86]" />
          Fit All Data to Screen
        </span>
      </button>

      <div className="my-1 border-t border-slate-200 dark:border-[#2A2E39]" />

      <button
        onClick={() => {
          const rounded = Number(menu.price.toFixed(info.precision));
          addAlert({
            symbol,
            price: rounded,
            condition: rounded >= livePrice ? 'crossing_up' : 'crossing_down',
            note: `Chart right-click alert`,
          });
          addToast({
            title: `Alert Added: ${info.displaySymbol}`,
            description: `Target @ ${formattedPrice}`,
            variant: 'warning',
          });
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
      >
        <Bell className="h-3.5 w-3.5 text-amber-400" />
        <span>Add Alert at {formattedPrice}</span>
      </button>

      <button
        onClick={() => {
          onDrawHLineAtPrice(Number(menu.price.toFixed(info.precision)), 'hline');
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
      >
        <Minus className="h-3.5 w-3.5 text-[#00D4AA]" />
        <span>Horizontal Line at {formattedPrice}</span>
      </button>

      <button
        onClick={() => {
          onDrawHLineAtPrice(Number(menu.price.toFixed(info.precision)), 'hray');
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
      >
        <MoveRight className="h-3.5 w-3.5 text-[#00D4AA]" />
        <span>Horizontal Ray from Cursor</span>
      </button>

      <button
        onClick={() => {
          navigator.clipboard
            ?.writeText(String(Number(menu.price.toFixed(info.precision))))
            .catch(() => {});
          addToast({ title: `Copied ${formattedPrice}`, variant: 'info' });
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
      >
        <Copy className="h-3.5 w-3.5 text-[#787B86]" />
        <span>Copy Price ({formattedPrice})</span>
      </button>

      <div className="my-1 border-t border-slate-200 dark:border-[#2A2E39]" />

      <button
        onClick={() => {
          const px = Number(menu.price.toFixed(info.precision));
          if (px >= livePrice) {
            placeMarketOrder({ symbol, side: 'buy', quantity: defaultQty, price: livePrice });
          } else {
            placeLimitOrder({ symbol, side: 'buy', quantity: defaultQty, limitPrice: px });
          }
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[#089981] hover:bg-[#089981]/10"
      >
        <TrendingUp className="h-3.5 w-3.5" />
        <span>
          {menu.price < livePrice ? `Buy Limit @ ${formattedPrice}` : `Buy Market (${defaultQty})`}
        </span>
      </button>

      <button
        onClick={() => {
          const px = Number(menu.price.toFixed(info.precision));
          if (px <= livePrice) {
            placeMarketOrder({ symbol, side: 'sell', quantity: defaultQty, price: livePrice });
          } else {
            placeLimitOrder({ symbol, side: 'sell', quantity: defaultQty, limitPrice: px });
          }
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[#F23645] hover:bg-[#F23645]/10"
      >
        <TrendingDown className="h-3.5 w-3.5" />
        <span>
          {menu.price > livePrice ? `Sell Limit @ ${formattedPrice}` : `Sell Market (${defaultQty})`}
        </span>
      </button>

      {menu.barIndex !== null && menu.time !== null && (
        <>
          <div className="my-1 border-t border-slate-200 dark:border-[#2A2E39]" />
          <button
            onClick={() => {
              onStartReplayHere(menu.barIndex!, menu.time!);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-amber-400 hover:bg-amber-500/10"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span>Start Bar Replay from This Bar</span>
          </button>
        </>
      )}

      <div className="my-1 border-t border-slate-200 dark:border-[#2A2E39]" />

      <div
        className="relative"
        onMouseEnter={() => setSubMenu('smart')}
        onMouseLeave={() => setSubMenu(null)}
      >
        <button className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]">
          <span className="flex items-center gap-2.5 text-[#00D4AA]">
            <Sparkles className="h-3.5 w-3.5" />
            Smart AI Overlays
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-[#787B86]" />
        </button>

        {subMenu === 'smart' && (
          <div className="absolute left-full top-0 ml-1 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-[#2A2E39] dark:bg-[#1E222D]">
            {(
              [
                { key: 'showVPVR', label: 'Volume Profile (VPVR)' },
                { key: 'showMarketStructure', label: 'BOS / CHoCH & Swings' },
                { key: 'showFVG', label: 'Fair Value Gaps (FVG)' },
                { key: 'showAutoSR', label: 'Auto Support / Resist' },
                { key: 'showAutoTrendlines', label: 'Auto Pivot Trendlines' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  updateSmartOverlays({ [item.key]: !smartOverlays[item.key] });
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
              >
                <span>{item.label}</span>
                {smartOverlays[item.key] && <Check className="h-3.5 w-3.5 text-[#00D4AA]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="relative"
        onMouseEnter={() => setSubMenu('style')}
        onMouseLeave={() => setSubMenu(null)}
      >
        <button className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]">
          <span className="flex items-center gap-2.5">
            <CandlestickChart className="h-3.5 w-3.5 text-[#787B86]" />
            Chart Type
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-[#787B86]" />
        </button>

        {subMenu === 'style' && (
          <div className="absolute left-full top-0 ml-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-[#2A2E39] dark:bg-[#1E222D]">
            {STYLES.map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  updatePaneChartStyle(paneId, st.id);
                  onClose();
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
              >
                <span>{st.label}</span>
                {currentStyle === st.id && <Check className="h-3.5 w-3.5 text-[#2962FF]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="relative"
        onMouseEnter={() => setSubMenu('scale')}
        onMouseLeave={() => setSubMenu(null)}
      >
        <button className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]">
          <span className="flex items-center gap-2.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#787B86]" />
            Price Scale
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-[#787B86]" />
        </button>

        {subMenu === 'scale' && (
          <div className="absolute left-full top-0 ml-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-[#2A2E39] dark:bg-[#1E222D]">
            {(
              [
                { id: 'normal', label: 'Regular' },
                { id: 'logarithmic', label: 'Logarithmic' },
                { id: 'percentage', label: 'Percentage (%)' },
              ] as { id: ScaleMode; label: string }[]
            ).map((sc) => (
              <button
                key={sc.id}
                onClick={() => {
                  updatePaneScaleMode(paneId, sc.id);
                  onClose();
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
              >
                <span>{sc.label}</span>
                {currentScale === sc.id && <Check className="h-3.5 w-3.5 text-[#2962FF]" />}
              </button>
            ))}
            <div className="my-1 border-t border-slate-200 dark:border-[#2A2E39]" />
            <button
              onClick={() => {
                updateChartSettings({ invertScale: !chartSettings.invertScale });
                onClose();
              }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
            >
              <span>Invert Price Scale</span>
              {chartSettings.invertScale && <Check className="h-3.5 w-3.5 text-[#2962FF]" />}
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => {
          toggleDrawingsVisible();
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
      >
        {drawingsVisible ? <EyeOff className="h-3.5 w-3.5 text-[#787B86]" /> : <Eye className="h-3.5 w-3.5 text-[#787B86]" />}
        <span>{drawingsVisible ? 'Hide All Drawings' : 'Show All Drawings'}</span>
      </button>

      <button
        onClick={() => {
          toggleDrawingsLocked();
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
      >
        {drawingsLocked ? <Unlock className="h-3.5 w-3.5 text-[#787B86]" /> : <Lock className="h-3.5 w-3.5 text-[#787B86]" />}
        <span>{drawingsLocked ? 'Unlock All Drawings' : 'Lock All Drawings'}</span>
      </button>

      <button
        onClick={() => {
          clearDrawings(symbol);
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[#F23645] hover:bg-[#F23645]/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Remove Drawings on {info.displaySymbol}</span>
      </button>

      <div className="my-1 border-t border-slate-200 dark:border-[#2A2E39]" />

      <button
        onClick={() => {
          openChartSettingsTab('feeds');
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[#00D4AA] hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
      >
        <Database className="h-3.5 w-3.5" />
        <span>Data Feeds / Twelve Data API...</span>
      </button>

      <button
        onClick={() => {
          openChartSettingsTab('symbol');
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 font-medium hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
      >
        <Settings2 className="h-3.5 w-3.5 text-[#787B86]" />
        <span>Chart Settings...</span>
      </button>
    </div>
  );
};
