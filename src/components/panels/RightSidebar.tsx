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

  const toggle = (tab: Exclude<RightSidebarTab, null>) => {
    setRightTab(rightTab === tab ? null : tab);
  };

  return (
    <div className="flex h-full shrink-0">
      {rightTab !== null && (
        <div className="h-full w-72 overflow-hidden border-l border-slate-200 bg-white dark:border-[#2A2E39] dark:bg-[#131722]">
          {rightTab === 'watchlist' && <WatchlistPanel />}
          {rightTab === 'orderbook' && <OrderBookPanel />}
          {rightTab === 'alerts' && <AlertsPanel />}
          {rightTab === 'technicals' && <TechnicalsPanel />}
          {rightTab === 'objects' && <ObjectTreePanel />}
        </div>
      )}

      <div className="flex w-[42px] shrink-0 flex-col items-center gap-1.5 border-l border-slate-200 bg-white py-2 dark:border-[#2A2E39] dark:bg-[#131722]">
        <button
          onClick={() => toggle('watchlist')}
          title="Watchlist & Markets"
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-md transition',
            rightTab === 'watchlist'
              ? 'bg-[#2962FF]/20 text-[#2962FF]'
              : 'text-[#787B86] hover:bg-slate-100 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]'
          )}
        >
          <ListFilter className="h-4 w-4" />
        </button>

        <button
          onClick={() => toggle('technicals')}
          title="Technical Signals Gauge & Multi-Timeframe Scanner"
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-md transition',
            rightTab === 'technicals'
              ? 'bg-[#00D4AA]/20 text-[#00D4AA]'
              : 'text-[#787B86] hover:bg-slate-100 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]'
          )}
        >
          <Gauge className="h-4 w-4" />
        </button>

        <button
          onClick={() => toggle('orderbook')}
          title="Order Book & Trades Tape"
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-md transition',
            rightTab === 'orderbook'
              ? 'bg-[#2962FF]/20 text-[#2962FF]'
              : 'text-[#787B86] hover:bg-slate-100 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]'
          )}
        >
          <BookOpen className="h-4 w-4" />
        </button>

        <button
          onClick={() => toggle('alerts')}
          title="Price Alerts"
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-md transition',
            rightTab === 'alerts'
              ? 'bg-[#2962FF]/20 text-[#2962FF]'
              : 'text-[#787B86] hover:bg-slate-100 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]'
          )}
        >
          <Bell className="h-4 w-4" />
          {activeAlertsCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-slate-950">
              {activeAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => toggle('objects')}
          title="Object Tree (Drawings & Indicators)"
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-md transition',
            rightTab === 'objects'
              ? 'bg-[#2962FF]/20 text-[#2962FF]'
              : 'text-[#787B86] hover:bg-slate-100 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]'
          )}
        >
          <Layers className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
