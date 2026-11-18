import React from 'react';
import { cn } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';
import { ChartPane } from './ChartPane';
import { ReplayControls } from './ReplayControls';

export const ChartGrid: React.FC = () => {
  const layout = useTradingStore((s) => s.layout);
  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);

  const visibleCount =
    layout === '1x1' ? 1 : layout === '1x2' || layout === '2x1' ? 2 : layout === '1+2' ? 3 : 4;

  const visiblePanes = panes.slice(0, visibleCount);
  const isMultiPane = visibleCount > 1;

  const gridClass =
    layout === '1x1'
      ? 'grid-cols-1 grid-rows-1'
      : layout === '1x2'
      ? 'grid-cols-2 grid-rows-1'
      : layout === '2x1'
      ? 'grid-cols-1 grid-rows-2'
      : 'grid-cols-2 grid-rows-2';

  return (
    <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden bg-slate-200 dark:bg-[#0C0F17]">
      <div className={cn('grid h-full w-full gap-[3px]', gridClass)}>
        {visiblePanes.map((pane, idx) => (
          <div
            key={pane.id}
            className={cn(
              'min-h-0 min-w-0 h-full w-full',
              layout === '1+2' && idx === 0 && 'row-span-2'
            )}
          >
            <ChartPane
              pane={pane}
              isActive={pane.id === activePaneId}
              isMultiPane={isMultiPane}
            />
          </div>
        ))}
      </div>

      <ReplayControls />
    </div>
  );
};
