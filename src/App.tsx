import React, { useEffect } from 'react';
import { ChartGrid } from '@/components/chart/ChartGrid';
import { ToastContainer } from '@/components/common/ToastContainer';
import { DrawingToolbar } from '@/components/layout/DrawingToolbar';
import { TopToolbar } from '@/components/layout/TopToolbar';
import { ChartSettingsModal } from '@/components/modals/ChartSettingsModal';
import { IndicatorsModal } from '@/components/modals/IndicatorsModal';
import { ShortcutsModal } from '@/components/modals/ShortcutsModal';
import { SymbolSearchModal } from '@/components/modals/SymbolSearchModal';
import { RightSidebar } from '@/components/panels/RightSidebar';
import { TradingTerminal } from '@/components/panels/TradingTerminal';
import { useAlertMonitor } from '@/hooks/useAlertMonitor';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useTradingStore } from '@/store/useTradingStore';

export const App: React.FC = () => {
  const theme = useTradingStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useHotkeys();
  useAlertMonitor();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F0F3FA] text-[#131722] dark:bg-[#0C0F17] dark:text-[#D1D4DC]">
      <TopToolbar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <DrawingToolbar />
        <ChartGrid />
        <RightSidebar />
      </div>

      <TradingTerminal />

      {/* Modals & Notifications */}
      <SymbolSearchModal />
      <IndicatorsModal />
      <ChartSettingsModal />
      <ShortcutsModal />
      <ToastContainer />
    </div>
  );
};

export default App;
