import React, { useEffect } from 'react';
import { ChartGrid } from '@/components/chart/ChartGrid';
import { ToastContainer } from '@/components/common/ToastContainer';
import { DrawingToolbar } from '@/components/layout/DrawingToolbar';
import { TopToolbar } from '@/components/layout/TopToolbar';
import { ChartSettingsModal } from '@/components/modals/ChartSettingsModal';
import { CompareSymbolModal } from '@/components/modals/CompareSymbolModal';
import { DrawingSettingsModal } from '@/components/modals/DrawingSettingsModal';
import { IndicatorsModal } from '@/components/modals/IndicatorsModal';
import { IndicatorSettingsModal } from '@/components/modals/IndicatorSettingsModal';
import { ShortcutsModal } from '@/components/modals/ShortcutsModal';
import { SymbolSearchModal } from '@/components/modals/SymbolSearchModal';
import { TemplatesModal } from '@/components/modals/TemplatesModal';
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#EEF2F9] text-[#131722] transition-colors duration-200 selection:bg-[#2962FF]/25 selection:text-[#2962FF] dark:bg-[#090C12] dark:text-[#E2E6F0] dark:selection:text-white">
      <TopToolbar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <DrawingToolbar />
        <ChartGrid />
        <RightSidebar />
      </div>

      <TradingTerminal />

      {/* Modals & Notifications */}
      <SymbolSearchModal />
      <CompareSymbolModal />
      <TemplatesModal />
      <IndicatorsModal />
      <IndicatorSettingsModal />
      <DrawingSettingsModal />
      <ChartSettingsModal />
      <ShortcutsModal />
      <ToastContainer />
    </div>
  );
};

export default App;
