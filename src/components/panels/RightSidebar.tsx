import React from 'react';
import { Bell, BookOpen, Gauge, Layers, ListFilter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RightSidebarTab, useTradingStore } from '@/store/useTradingStore';
import { AlertsPanel } from './AlertsPanel';
import { ObjectTreePanel } from './ObjectTreePanel';
import { OrderBookPanel } from './OrderBookPanel';
import { TechnicalsPanel } from './TechnicalsPanel';
import { WatchlistPanel } from './WatchlistPanel';

export const RightSidebar: React.FC = () => {
  const rightTab = useTradingStore((s) => s.rightSidebarTab);
  const setRightTab = useTradingStore((s) => s.setRightSidebarTab);
  const activeAlertsCount = useTradingStore((s) => s.alerts.filter((a) => a.active).length);
  const rightWidth = useTradingStore((s) => s.panelSizes.rightWidth);
  const updatePanelSizes = useTradingStore((s) => s.updatePanelSizes);

  const toggle = (tab: Exclude<RightSidebarTab, null>) => {
    setRightTab(rightTab === tab ? null : tab);
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = rightWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      const next = Math.max(220, Math.min(460, startW + delta));
      updatePanelSizes({ rightWidth: next });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="relative flex h-full shrink-0">
      {rightTab !== null && (
        <div
          style={{ width: rightWidth }}
          className="fixed bottom-8 right-[44px] top-11 z-40 overflow-hidden border-l border-slate-200/80 bg-white shadow-2xl sm:static sm:bottom-auto sm:right-auto sm:top-auto sm:z-auto sm:h-full sm:shadow-none dark:border-[#222836] dark:bg-[#0F131D]"
        >
          <div
            onMouseDown={startResize}
            title="Drag to resize sidebar"
            className="group hidden sm:flex absolute inset-y-0 left-0 z-30 w-[5px] cursor-ew-resize items-center justify-center transition-colors hover:bg-[#2962FF]/35"
          >
            <div className="h-8 w-[2px] rounded-full bg-transparent transition-colors group-hover:bg-[#2962FF]" />
          </div>
          {rightTab === 'watchlist' && <WatchlistPanel />}
          {rightTab === 'orderbook' && <OrderBookPanel />}
          {rightTab === 'alerts' && <AlertsPanel />}
          {rightTab === 'technicals' && <TechnicalsPanel />}
          {rightTab === 'objects' && <ObjectTreePanel />}
        </div>
      )}

      <div className="flex w-[44px] shrink-0 flex-col items-center gap-1.5 border-l border-slate-200/80 bg-white/95 py-2 dark:border-[#222836] dark:bg-[#0F131D]/95">
        <button
          onClick={() => toggle('watchlist')}
          title="Watchlist & Markets"
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-90',
            rightTab === 'watchlist'
              ? 'bg-[#2962FF]/20 text-[#4C82FF] ring-1 ring-[#2962FF]/35 shadow-glowBlue'
              : 'text-[#787B86] hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#181D2A] dark:hover:text-white'
          )}
        >
          <ListFilter className="h-4 w-4" />
        </button>

        <button
          onClick={() => toggle('technicals')}
          title="Technical Signals Gauge & Multi-Timeframe Scanner"
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-90',
            rightTab === 'technicals'
              ? 'bg-[#00D4AA]/20 text-[#00D4AA] ring-1 ring-[#00D4AA]/35 shadow-glowCyan'
              : 'text-[#787B86] hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#181D2A] dark:hover:text-white'
          )}
        >
          <Gauge className="h-4 w-4" />
        </button>

        <button
          onClick={() => toggle('orderbook')}
          title="Order Book & Trades Tape"
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-90',
            rightTab === 'orderbook'
              ? 'bg-[#2962FF]/20 text-[#4C82FF] ring-1 ring-[#2962FF]/35 shadow-glowBlue'
              : 'text-[#787B86] hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#181D2A] dark:hover:text-white'
          )}
        >
          <BookOpen className="h-4 w-4" />
        </button>

        <button
          onClick={() => toggle('alerts')}
          title="Price Alerts"
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-90',
            rightTab === 'alerts'
              ? 'bg-[#2962FF]/20 text-[#4C82FF] ring-1 ring-[#2962FF]/35 shadow-glowBlue'
              : 'text-[#787B86] hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#181D2A] dark:hover:text-white'
          )}
        >
          <Bell className="h-4 w-4" />
          {activeAlertsCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.75)]">
              {activeAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => toggle('objects')}
          title="Object Tree (Drawings & Indicators)"
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-90',
            rightTab === 'objects'
              ? 'bg-[#2962FF]/20 text-[#4C82FF] ring-1 ring-[#2962FF]/35 shadow-glowBlue'
              : 'text-[#787B86] hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#181D2A] dark:hover:text-white'
          )}
        >
          <Layers className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
