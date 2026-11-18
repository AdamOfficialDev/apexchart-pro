import { useEffect } from 'react';
import { useTradingStore } from '@/store/useTradingStore';

export function useHotkeys() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const store = useTradingStore.getState();
        store.setSearchModalOpen(!store.searchModalOpen);
        return;
      }

      if (e.key === 'Escape') {
        const store = useTradingStore.getState();
        if (store.searchModalOpen) return store.setSearchModalOpen(false);
        if (store.indicatorsModalOpen) return store.setIndicatorsModalOpen(false);
        if (store.chartSettingsModalOpen) return store.setChartSettingsModalOpen(false);
        if (store.shortcutsModalOpen) return store.setShortcutsModalOpen(false);
        if (store.replay.isSelectingStart) return store.setReplaySelectMode(false);
        store.setActiveDrawingTool('cursor');
        store.setSelectedDrawingId(null);
        return;
      }

      if (isInput) return;

      const store = useTradingStore.getState();
      const activePane = store.panes.find((p) => p.id === store.activePaneId) ?? store.panes[0];

      // Undo / Redo drawings (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redoDrawing(activePane.symbol);
        else store.undoDrawing(activePane.symbol);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        store.redoDrawing(activePane.symbol);
        return;
      }

      if (store.replay.enabled) {
        if (e.code === 'Space') {
          e.preventDefault();
          store.toggleReplayPlay();
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          store.stepReplayForward();
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          store.stepReplayBackward();
          return;
        }
      }

      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 't') {
          e.preventDefault();
          store.setActiveDrawingTool('trendline');
        } else if (key === 'h') {
          e.preventDefault();
          store.setActiveDrawingTool('hline');
        } else if (key === 'v') {
          e.preventDefault();
          store.setActiveDrawingTool('vline');
        } else if (key === 'f') {
          e.preventDefault();
          store.setActiveDrawingTool('fib');
        } else if (key === 'r' && !e.shiftKey) {
          e.preventDefault();
          store.setActiveDrawingTool('rect');
        } else if (key === 'l') {
          e.preventDefault();
          store.setActiveDrawingTool('long_pos');
        } else if (key === 's') {
          e.preventDefault();
          store.setActiveDrawingTool('short_pos');
        } else if (key === 'm') {
          e.preventDefault();
          store.toggleMagnetMode();
        } else if (key === 'e') {
          e.preventDefault();
          store.setActiveDrawingTool('eraser');
        }
        return;
      }

      if (e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        store.setShortcutsModalOpen(!store.shortcutsModalOpen);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (store.selectedDrawingId) {
          store.removeDrawing(activePane.symbol, store.selectedDrawingId);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
