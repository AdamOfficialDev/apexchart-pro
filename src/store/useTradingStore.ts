import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INDICATOR_CATALOG, getSymbolInfo } from '@/data/symbols';
import { generateId } from '@/lib/utils';
import {
  ChartPaneConfig,
  ChartSettings,
  ChartStyleType,
  ClosedTrade,
  DrawingObject,
  DrawingToolGroupId,
  DrawingToolType,
  IndicatorConfig,
  IndicatorType,
  LayoutType,
  LiveQuote,
  OrderSide,
  PaperPosition,
  PendingOrder,
  PriceAlert,
  ReplayState,
  ScaleMode,
  SmartOverlaySettings,
  TimeframeId,
  ToastMessage,
} from '@/types/trading';

export type RightSidebarTab = 'watchlist' | 'orderbook' | 'alerts' | 'technicals' | 'objects' | null;
export type BottomPanelTab = 'positions' | 'orders' | 'history' | 'trade';

export const DEFAULT_CHART_SETTINGS: ChartSettings = {
  upColor: '#089981',
  downColor: '#F23645',
  wickUpColor: '#089981',
  wickDownColor: '#F23645',
  borderUpColor: '#089981',
  borderDownColor: '#F23645',
  showWicks: true,
  showBorders: false,
  showGrid: true,
  gridStyle: 'both',
  gridOpacity: 55,
  crosshairStyle: 'dashed',
  showWatermark: true,
  showCountdown: true,
  showQuickTrade: true,
  bgType: 'solid',
  bgColorDark: '#131722',
  bgColorLight: '#FFFFFF',
  invertScale: false,
  timezone: 'local',
};

export const DEFAULT_SMART_OVERLAYS: SmartOverlaySettings = {
  showVPVR: false,
  showMarketStructure: false,
  showFVG: false,
  showAutoSR: false,
  showAutoTrendlines: false,
};

function createIndicatorInstance(
  type: IndicatorType,
  overrideParams?: Record<string, number>,
  overrideColor?: string
): IndicatorConfig {
  const meta = INDICATOR_CATALOG.find((i) => i.type === type) ?? INDICATOR_CATALOG[0];
  return {
    id: generateId('ind'),
    type: meta.type,
    name: meta.shortName,
    placement: meta.placement,
    visible: true,
    color: overrideColor ?? meta.defaultColor,
    secondaryColor: meta.secondaryColor,
    tertiaryColor: meta.tertiaryColor,
    params: { ...meta.defaultParams, ...(overrideParams ?? {}) },
  };
}

const DEFAULT_PANES: ChartPaneConfig[] = [
  {
    id: 'pane-1',
    symbol: 'BTCUSDT',
    timeframe: '15m',
    chartStyle: 'candles',
    scaleMode: 'normal',
    indicators: [
      createIndicatorInstance('EMA', { period: 21 }, '#2962FF'),
      createIndicatorInstance('EMA', { period: 55 }, '#F59E0B'),
      createIndicatorInstance('VOLUME'),
      createIndicatorInstance('RSI', { period: 14 }, '#A855F7'),
    ],
  },
  {
    id: 'pane-2',
    symbol: 'ETHUSDT',
    timeframe: '1h',
    chartStyle: 'candles',
    scaleMode: 'normal',
    indicators: [
      createIndicatorInstance('EMA', { period: 21 }, '#06B6D4'),
      createIndicatorInstance('VOLUME'),
    ],
  },
  {
    id: 'pane-3',
    symbol: 'SOLUSDT',
    timeframe: '5m',
    chartStyle: 'candles',
    scaleMode: 'normal',
    indicators: [
      createIndicatorInstance('VWAP'),
      createIndicatorInstance('VOLUME'),
    ],
  },
  {
    id: 'pane-4',
    symbol: 'XAUUSD',
    timeframe: '15m',
    chartStyle: 'candles',
    scaleMode: 'normal',
    indicators: [
      createIndicatorInstance('BB', { period: 20, stdDev: 2 }),
      createIndicatorInstance('VOLUME'),
    ],
  },
];

const DEFAULT_REPLAY: ReplayState = {
  enabled: false,
  isSelectingStart: false,
  isPlaying: false,
  speed: 1,
  currentIndex: 0,
  totalBars: 0,
  currentTimestamp: null,
  paneId: null,
};

interface TradingStore {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  chartSettings: ChartSettings;
  updateChartSettings: (patch: Partial<ChartSettings>) => void;
  resetChartSettings: () => void;
  smartOverlays: SmartOverlaySettings;
  updateSmartOverlays: (patch: Partial<SmartOverlaySettings>) => void;

  rightSidebarTab: RightSidebarTab;
  setRightSidebarTab: (tab: RightSidebarTab) => void;
  bottomPanelOpen: boolean;
  setBottomPanelOpen: (open: boolean) => void;
  bottomPanelTab: BottomPanelTab;
  setBottomPanelTab: (tab: BottomPanelTab) => void;

  searchModalOpen: boolean;
  setSearchModalOpen: (open: boolean) => void;
  indicatorsModalOpen: boolean;
  setIndicatorsModalOpen: (open: boolean) => void;
  shortcutsModalOpen: boolean;
  setShortcutsModalOpen: (open: boolean) => void;
  chartSettingsModalOpen: boolean;
  setChartSettingsModalOpen: (open: boolean) => void;
  snapshotRequestCounter: number;
  triggerSnapshot: () => void;

  layout: LayoutType;
  setLayout: (layout: LayoutType) => void;
  panes: ChartPaneConfig[];
  activePaneId: string;
  setActivePaneId: (paneId: string) => void;
  favoriteTimeframes: TimeframeId[];
  toggleFavoriteTimeframe: (tf: TimeframeId) => void;
  syncCrosshair: boolean;
  setSyncCrosshair: (sync: boolean) => void;
  syncSymbol: boolean;
  setSyncSymbol: (sync: boolean) => void;
  syncTimeframe: boolean;
  setSyncTimeframe: (sync: boolean) => void;
  syncedCrosshairTime: number | null;
  setSyncedCrosshairTime: (time: number | null) => void;

  updatePaneSymbol: (paneId: string, symbol: string) => void;
  updatePaneTimeframe: (paneId: string, timeframe: TimeframeId) => void;
  updatePaneChartStyle: (paneId: string, chartStyle: ChartStyleType) => void;
  updatePaneScaleMode: (paneId: string, scaleMode: ScaleMode) => void;

  addIndicator: (paneId: string, type: IndicatorType) => void;
  removeIndicator: (paneId: string, indicatorId: string) => void;
  toggleIndicatorVisibility: (paneId: string, indicatorId: string) => void;
  updateIndicator: (paneId: string, indicatorId: string, patch: Partial<IndicatorConfig>) => void;

  activeDrawingTool: DrawingToolType;
  setActiveDrawingTool: (tool: DrawingToolType) => void;
  groupDefaultTools: Record<DrawingToolGroupId, DrawingToolType>;
  setGroupTool: (group: DrawingToolGroupId, tool: DrawingToolType) => void;
  drawingColor: string;
  setDrawingColor: (color: string) => void;
  drawingLineWidth: number;
  setDrawingLineWidth: (width: number) => void;
  drawingLineStyle: 'solid' | 'dashed' | 'dotted';
  setDrawingLineStyle: (style: 'solid' | 'dashed' | 'dotted') => void;
  stayInDrawingMode: boolean;
  toggleStayInDrawingMode: () => void;
  magnetMode: boolean;
  toggleMagnetMode: () => void;
  drawingsLocked: boolean;
  toggleDrawingsLocked: () => void;
  drawingsVisible: boolean;
  toggleDrawingsVisible: () => void;
  selectedDrawingId: string | null;
  setSelectedDrawingId: (id: string | null) => void;
  drawingsBySymbol: Record<string, DrawingObject[]>;
  redoBySymbol: Record<string, DrawingObject[]>;
  addDrawing: (drawing: DrawingObject) => void;
  updateDrawing: (symbol: string, id: string, patch: Partial<DrawingObject>) => void;
  duplicateDrawing: (symbol: string, id: string) => void;
  removeDrawing: (symbol: string, id: string) => void;
  clearDrawingsForSymbol: (symbol: string) => void;
  undoDrawing: (symbol: string) => void;
  redoDrawing: (symbol: string) => void;

  replay: ReplayState;
  enterReplayMode: (paneId: string) => void;
  startReplayAt: (paneId: string, index: number, totalBars: number, timestamp: number | null) => void;
  setReplaySelectMode: (selecting: boolean) => void;
  toggleReplayPlay: () => void;
  stepReplayForward: () => void;
  stepReplayBackward: () => void;
  setReplaySpeed: (speed: 0.5 | 1 | 2 | 5 | 10) => void;
  setReplayIndex: (index: number, timestamp?: number | null) => void;
  setReplayTotalBars: (totalBars: number) => void;
  exitReplayMode: () => void;

  watchlist: string[];
  toggleWatchlistSymbol: (symbol: string) => void;
  quotes: Record<string, LiveQuote>;
  updateQuote: (
    symbol: string,
    price: number,
    source?: 'binance' | 'simulated',
    volume?: number
  ) => void;

  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'active' | 'createdAt'>) => void;
  toggleAlert: (id: string) => void;
  removeAlert: (id: string) => void;
  markAlertTriggered: (id: string) => void;

  paperBalance: number;
  positions: PaperPosition[];
  pendingOrders: PendingOrder[];
  closedTrades: ClosedTrade[];
  placeMarketOrder: (params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    price: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => void;
  placeLimitOrder: (params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    limitPrice: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => void;
  cancelPendingOrder: (id: string) => void;
  closePosition: (id: string, exitPrice: number, reason?: 'manual' | 'sl' | 'tp') => void;
  updatePositionTPSL: (id: string, stopLoss?: number, takeProfit?: number) => void;
  processMarketPriceForPaperTrading: (
    symbol: string,
    high: number,
    low: number,
    close: number
  ) => void;
  resetPaperAccount: () => void;

  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id' | 'createdAt'>) => void;
  removeToast: (id: string) => void;
}

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () =>
        set((state) => {
          const next = state.theme === 'dark' ? 'light' : 'dark';
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', next === 'dark');
          }
          return { theme: next };
        }),

      chartSettings: DEFAULT_CHART_SETTINGS,
      updateChartSettings: (patch) =>
        set((state) => ({
          chartSettings: { ...state.chartSettings, ...patch },
        })),
      resetChartSettings: () => set({ chartSettings: DEFAULT_CHART_SETTINGS }),

      smartOverlays: DEFAULT_SMART_OVERLAYS,
      updateSmartOverlays: (patch) =>
        set((state) => ({
          smartOverlays: { ...state.smartOverlays, ...patch },
        })),

      rightSidebarTab: 'watchlist',
      setRightSidebarTab: (tab) => set({ rightSidebarTab: tab }),
      bottomPanelOpen: false,
      setBottomPanelOpen: (open) => set({ bottomPanelOpen: open }),
      bottomPanelTab: 'positions',
      setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),

      searchModalOpen: false,
      setSearchModalOpen: (open) => set({ searchModalOpen: open }),
      indicatorsModalOpen: false,
      setIndicatorsModalOpen: (open) => set({ indicatorsModalOpen: open }),
      shortcutsModalOpen: false,
      setShortcutsModalOpen: (open) => set({ shortcutsModalOpen: open }),
      chartSettingsModalOpen: false,
      setChartSettingsModalOpen: (open) => set({ chartSettingsModalOpen: open }),
      snapshotRequestCounter: 0,
      triggerSnapshot: () =>
        set((s) => ({ snapshotRequestCounter: s.snapshotRequestCounter + 1 })),

      layout: '1x1',
      setLayout: (layout) => set({ layout }),
      panes: DEFAULT_PANES,
      activePaneId: 'pane-1',
      setActivePaneId: (paneId) => set({ activePaneId: paneId }),

      favoriteTimeframes: ['1s', '5s', '1m', '5m', '15m', '1h', '4h', '1D'],
      toggleFavoriteTimeframe: (tf) =>
        set((state) => {
          const exists = state.favoriteTimeframes.includes(tf);
          if (exists && state.favoriteTimeframes.length <= 2) return state;
          const next = exists
            ? state.favoriteTimeframes.filter((t) => t !== tf)
            : [...state.favoriteTimeframes, tf];
          return { favoriteTimeframes: next };
        }),

      syncCrosshair: true,
      setSyncCrosshair: (syncCrosshair) => set({ syncCrosshair }),
      syncSymbol: false,
      setSyncSymbol: (syncSymbol) => set({ syncSymbol }),
      syncTimeframe: false,
      setSyncTimeframe: (syncTimeframe) => set({ syncTimeframe }),
      syncedCrosshairTime: null,
      setSyncedCrosshairTime: (syncedCrosshairTime) => set({ syncedCrosshairTime }),

      updatePaneSymbol: (paneId, symbol) =>
        set((state) => ({
          panes: state.panes.map((p) =>
            state.syncSymbol || p.id === paneId ? { ...p, symbol } : p
          ),
        })),

      updatePaneTimeframe: (paneId, timeframe) =>
        set((state) => ({
          panes: state.panes.map((p) =>
            state.syncTimeframe || p.id === paneId ? { ...p, timeframe } : p
          ),
        })),

      updatePaneChartStyle: (paneId, chartStyle) =>
        set((state) => ({
          panes: state.panes.map((p) => (p.id === paneId ? { ...p, chartStyle } : p)),
        })),

      updatePaneScaleMode: (paneId, scaleMode) =>
        set((state) => ({
          panes: state.panes.map((p) => (p.id === paneId ? { ...p, scaleMode } : p)),
        })),

      addIndicator: (paneId, type) =>
        set((state) => ({
          panes: state.panes.map((p) =>
            p.id === paneId
              ? { ...p, indicators: [...p.indicators, createIndicatorInstance(type)] }
              : p
          ),
        })),

      removeIndicator: (paneId, indicatorId) =>
        set((state) => ({
          panes: state.panes.map((p) =>
            p.id === paneId
              ? { ...p, indicators: p.indicators.filter((ind) => ind.id !== indicatorId) }
              : p
          ),
        })),

      toggleIndicatorVisibility: (paneId, indicatorId) =>
        set((state) => ({
          panes: state.panes.map((p) =>
            p.id === paneId
              ? {
                  ...p,
                  indicators: p.indicators.map((ind) =>
                    ind.id === indicatorId ? { ...ind, visible: !ind.visible } : ind
                  ),
                }
              : p
          ),
        })),

      updateIndicator: (paneId, indicatorId, patch) =>
        set((state) => ({
          panes: state.panes.map((p) =>
            p.id === paneId
              ? {
                  ...p,
                  indicators: p.indicators.map((ind) =>
                    ind.id === indicatorId ? { ...ind, ...patch } : ind
                  ),
                }
              : p
          ),
        })),

      activeDrawingTool: 'cursor',
      setActiveDrawingTool: (activeDrawingTool) => set({ activeDrawingTool }),
      groupDefaultTools: {
        cursors: 'cursor',
        lines: 'trendline',
        fib_gann: 'fib',
        patterns: 'xabcd',
        forecast: 'long_pos',
        shapes: 'rect',
        annotations: 'brush',
        measure: 'ruler',
      },
      setGroupTool: (group, tool) =>
        set((state) => ({
          groupDefaultTools: { ...state.groupDefaultTools, [group]: tool },
          activeDrawingTool: tool,
        })),

      drawingColor: '#2962FF',
      setDrawingColor: (drawingColor) => set({ drawingColor }),
      drawingLineWidth: 2,
      setDrawingLineWidth: (drawingLineWidth) => set({ drawingLineWidth }),
      drawingLineStyle: 'solid',
      setDrawingLineStyle: (drawingLineStyle) => set({ drawingLineStyle }),
      stayInDrawingMode: false,
      toggleStayInDrawingMode: () => set((s) => ({ stayInDrawingMode: !s.stayInDrawingMode })),
      magnetMode: false,
      toggleMagnetMode: () => set((s) => ({ magnetMode: !s.magnetMode })),
      drawingsLocked: false,
      toggleDrawingsLocked: () => set((s) => ({ drawingsLocked: !s.drawingsLocked })),
      drawingsVisible: true,
      toggleDrawingsVisible: () => set((s) => ({ drawingsVisible: !s.drawingsVisible })),
      selectedDrawingId: null,
      setSelectedDrawingId: (selectedDrawingId) => set({ selectedDrawingId }),
      drawingsBySymbol: {},
      redoBySymbol: {},

      addDrawing: (drawing) =>
        set((state) => {
          const list = state.drawingsBySymbol[drawing.symbol] ?? [];
          return {
            drawingsBySymbol: {
              ...state.drawingsBySymbol,
              [drawing.symbol]: [...list, drawing],
            },
            redoBySymbol: {
              ...state.redoBySymbol,
              [drawing.symbol]: [],
            },
            selectedDrawingId: drawing.id,
          };
        }),

      updateDrawing: (symbol, id, patch) =>
        set((state) => {
          const list = state.drawingsBySymbol[symbol] ?? [];
          return {
            drawingsBySymbol: {
              ...state.drawingsBySymbol,
              [symbol]: list.map((d) => (d.id === id ? { ...d, ...patch } : d)),
            },
          };
        }),

      duplicateDrawing: (symbol, id) =>
        set((state) => {
          const list = state.drawingsBySymbol[symbol] ?? [];
          const src = list.find((d) => d.id === id);
          if (!src) return state;
          const clone: DrawingObject = {
            ...src,
            id: generateId('drw'),
            locked: false,
            points: src.points.map((pt) => ({
              time: pt.time,
              price: pt.price * 1.003,
            })),
            createdAt: Date.now(),
          };
          return {
            drawingsBySymbol: {
              ...state.drawingsBySymbol,
              [symbol]: [...list, clone],
            },
            selectedDrawingId: clone.id,
          };
        }),

      removeDrawing: (symbol, id) =>
        set((state) => {
          const list = state.drawingsBySymbol[symbol] ?? [];
          const removed = list.find((d) => d.id === id);
          const redo = state.redoBySymbol[symbol] ?? [];
          return {
            drawingsBySymbol: {
              ...state.drawingsBySymbol,
              [symbol]: list.filter((d) => d.id !== id),
            },
            redoBySymbol: removed
              ? { ...state.redoBySymbol, [symbol]: [removed, ...redo].slice(0, 25) }
              : state.redoBySymbol,
            selectedDrawingId: state.selectedDrawingId === id ? null : state.selectedDrawingId,
          };
        }),

      clearDrawingsForSymbol: (symbol) =>
        set((state) => ({
          drawingsBySymbol: { ...state.drawingsBySymbol, [symbol]: [] },
          redoBySymbol: { ...state.redoBySymbol, [symbol]: [] },
          selectedDrawingId: null,
        })),

      undoDrawing: (symbol) =>
        set((state) => {
          const list = state.drawingsBySymbol[symbol] ?? [];
          if (list.length === 0) return state;
          const last = list[list.length - 1];
          const redo = state.redoBySymbol[symbol] ?? [];
          return {
            drawingsBySymbol: {
              ...state.drawingsBySymbol,
              [symbol]: list.slice(0, -1),
            },
            redoBySymbol: {
              ...state.redoBySymbol,
              [symbol]: [last, ...redo].slice(0, 25),
            },
            selectedDrawingId: null,
          };
        }),

      redoDrawing: (symbol) =>
        set((state) => {
          const redo = state.redoBySymbol[symbol] ?? [];
          if (redo.length === 0) return state;
          const [restored, ...rest] = redo;
          const list = state.drawingsBySymbol[symbol] ?? [];
          return {
            drawingsBySymbol: {
              ...state.drawingsBySymbol,
              [symbol]: [...list, restored],
            },
            redoBySymbol: {
              ...state.redoBySymbol,
              [symbol]: rest,
            },
            selectedDrawingId: restored.id,
          };
        }),

      replay: DEFAULT_REPLAY,
      enterReplayMode: (paneId) =>
        set({
          replay: {
            enabled: true,
            isSelectingStart: true,
            isPlaying: false,
            speed: 1,
            currentIndex: 0,
            totalBars: 0,
            currentTimestamp: null,
            paneId,
          },
        }),

      startReplayAt: (paneId, index, totalBars, timestamp) =>
        set((state) => ({
          replay: {
            ...state.replay,
            enabled: true,
            isSelectingStart: false,
            isPlaying: false,
            paneId,
            totalBars,
            currentIndex: Math.max(5, Math.min(index, Math.max(5, totalBars - 2))),
            currentTimestamp: timestamp,
          },
        })),

      setReplaySelectMode: (isSelectingStart) =>
        set((state) => ({
          replay: { ...state.replay, isSelectingStart, isPlaying: false },
        })),

      toggleReplayPlay: () =>
        set((state) => {
          if (!state.replay.enabled) return state;
          if (state.replay.isSelectingStart) {
            const fallbackIdx = Math.max(10, Math.floor(state.replay.totalBars * 0.6));
            return {
              replay: {
                ...state.replay,
                isSelectingStart: false,
                currentIndex: state.replay.currentIndex || fallbackIdx,
                isPlaying: true,
              },
            };
          }
          if (state.replay.currentIndex >= state.replay.totalBars - 1) {
            return { replay: { ...state.replay, isPlaying: false } };
          }
          return {
            replay: { ...state.replay, isPlaying: !state.replay.isPlaying },
          };
        }),

      stepReplayForward: () =>
        set((state) => {
          if (!state.replay.enabled || state.replay.totalBars === 0) return state;
          const next = Math.min(state.replay.totalBars - 1, state.replay.currentIndex + 1);
          return {
            replay: {
              ...state.replay,
              isSelectingStart: false,
              currentIndex: next,
              isPlaying: next >= state.replay.totalBars - 1 ? false : state.replay.isPlaying,
            },
          };
        }),

      stepReplayBackward: () =>
        set((state) => {
          if (!state.replay.enabled || state.replay.totalBars === 0) return state;
          const prev = Math.max(5, state.replay.currentIndex - 1);
          return {
            replay: { ...state.replay, isSelectingStart: false, isPlaying: false, currentIndex: prev },
          };
        }),

      setReplaySpeed: (speed) =>
        set((state) => ({ replay: { ...state.replay, speed } })),

      setReplayIndex: (index, timestamp) =>
        set((state) => ({
          replay: {
            ...state.replay,
            currentIndex: Math.max(5, Math.min(index, Math.max(5, state.replay.totalBars - 1))),
            currentTimestamp: timestamp !== undefined ? timestamp : state.replay.currentTimestamp,
          },
        })),

      setReplayTotalBars: (totalBars) =>
        set((state) => ({
          replay: {
            ...state.replay,
            totalBars,
            currentIndex:
              state.replay.currentIndex > 0
                ? Math.min(state.replay.currentIndex, Math.max(5, totalBars - 1))
                : Math.max(10, Math.floor(totalBars * 0.6)),
          },
        })),

      exitReplayMode: () => set({ replay: DEFAULT_REPLAY }),

      watchlist: [
        'BTCUSDT',
        'ETHUSDT',
        'SOLUSDT',
        'BNBUSDT',
        'XRPUSDT',
        'EURUSD',
        'XAUUSD',
        'NVDA',
        'TSLA',
        'BBCA.JK',
        'BBRI.JK',
        'TLKM.JK',
      ],

      toggleWatchlistSymbol: (symbol) =>
        set((state) => {
          const exists = state.watchlist.includes(symbol);
          return {
            watchlist: exists
              ? state.watchlist.filter((s) => s !== symbol)
              : [...state.watchlist, symbol],
          };
        }),

      quotes: {},
      updateQuote: (symbol, price, source = 'simulated', volume = 0) =>
        set((state) => {
          const prev = state.quotes[symbol];
          const info = getSymbolInfo(symbol);
          const prevClose = prev?.prevClose ?? info.basePrice;
          const change = price - prevClose;
          const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
          const spark = prev?.sparkline ? [...prev.sparkline, price].slice(-24) : [price];

          return {
            quotes: {
              ...state.quotes,
              [symbol]: {
                symbol,
                price,
                prevClose,
                change,
                changePercent,
                high24h: prev ? Math.max(prev.high24h, price) : price * 1.012,
                low24h: prev ? Math.min(prev.low24h, price) : price * 0.988,
                volume24h: (prev?.volume24h ?? info.basePrice * 120) + volume,
                sparkline: spark,
                source,
              },
            },
          };
        }),

      alerts: [],
      addAlert: (alert) =>
        set((state) => ({
          alerts: [
            {
              ...alert,
              id: generateId('alert'),
              active: true,
              createdAt: Date.now(),
            },
            ...state.alerts,
          ],
        })),

      toggleAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, active: !a.active, triggeredAt: undefined } : a
          ),
        })),

      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),

      markAlertTriggered: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, active: false, triggeredAt: Date.now() } : a
          ),
        })),

      paperBalance: 100000,
      positions: [],
      pendingOrders: [],
      closedTrades: [],

      placeMarketOrder: ({ symbol, side, quantity, price, stopLoss, takeProfit }) => {
        if (quantity <= 0 || price <= 0) return;
        const pos: PaperPosition = {
          id: generateId('pos'),
          symbol,
          side,
          quantity,
          entryPrice: price,
          stopLoss: stopLoss && stopLoss > 0 ? stopLoss : undefined,
          takeProfit: takeProfit && takeProfit > 0 ? takeProfit : undefined,
          openedAt: Date.now(),
        };
        set((state) => ({
          positions: [pos, ...state.positions],
        }));
        get().addToast({
          title: `${side === 'buy' ? 'Long' : 'Short'} Executed: ${symbol}`,
          description: `Qty ${quantity} @ ${price}`,
          variant: 'success',
        });
      },

      placeLimitOrder: ({ symbol, side, quantity, limitPrice, stopLoss, takeProfit }) => {
        if (quantity <= 0 || limitPrice <= 0) return;
        const order: PendingOrder = {
          id: generateId('ord'),
          symbol,
          side,
          type: 'limit',
          quantity,
          limitPrice,
          stopLoss: stopLoss && stopLoss > 0 ? stopLoss : undefined,
          takeProfit: takeProfit && takeProfit > 0 ? takeProfit : undefined,
          createdAt: Date.now(),
        };
        set((state) => ({
          pendingOrders: [order, ...state.pendingOrders],
        }));
        get().addToast({
          title: `Limit ${side.toUpperCase()} Placed: ${symbol}`,
          description: `Qty ${quantity} @ ${limitPrice}`,
          variant: 'info',
        });
      },

      cancelPendingOrder: (id) =>
        set((state) => ({
          pendingOrders: state.pendingOrders.filter((o) => o.id !== id),
        })),

      closePosition: (id, exitPrice, reason = 'manual') => {
        const state = get();
        const pos = state.positions.find((p) => p.id === id);
        if (!pos) return;

        const priceDiff = pos.side === 'buy' ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
        const pnl = priceDiff * pos.quantity;
        const notional = pos.entryPrice * pos.quantity;
        const pnlPercent = notional > 0 ? (pnl / notional) * 100 : 0;

        const closed: ClosedTrade = {
          id: generateId('trd'),
          symbol: pos.symbol,
          side: pos.side,
          quantity: pos.quantity,
          entryPrice: pos.entryPrice,
          exitPrice,
          pnl,
          pnlPercent,
          openedAt: pos.openedAt,
          closedAt: Date.now(),
          reason,
        };

        set({
          positions: state.positions.filter((p) => p.id !== id),
          closedTrades: [closed, ...state.closedTrades].slice(0, 100),
          paperBalance: state.paperBalance + pnl,
        });

        get().addToast({
          title: `${reason === 'sl' ? 'Stop Loss Hit' : reason === 'tp' ? 'Take Profit Hit' : 'Position Closed'}: ${pos.symbol}`,
          description: `PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`,
          variant: pnl >= 0 ? 'success' : 'danger',
        });
      },

      updatePositionTPSL: (id, stopLoss, takeProfit) =>
        set((state) => ({
          positions: state.positions.map((p) =>
            p.id === id ? { ...p, stopLoss, takeProfit } : p
          ),
        })),

      processMarketPriceForPaperTrading: (symbol, high, low, close) => {
        const state = get();
        const ordersForSymbol = state.pendingOrders.filter((o) => o.symbol === symbol);
        for (const ord of ordersForSymbol) {
          const hit = ord.side === 'buy' ? low <= ord.limitPrice : high >= ord.limitPrice;
          if (hit) {
            set((s) => ({
              pendingOrders: s.pendingOrders.filter((o) => o.id !== ord.id),
              positions: [
                {
                  id: generateId('pos'),
                  symbol: ord.symbol,
                  side: ord.side,
                  quantity: ord.quantity,
                  entryPrice: ord.limitPrice,
                  stopLoss: ord.stopLoss,
                  takeProfit: ord.takeProfit,
                  openedAt: Date.now(),
                },
                ...s.positions,
              ],
            }));
            get().addToast({
              title: `Limit Order Filled: ${ord.symbol}`,
              description: `${ord.side.toUpperCase()} ${ord.quantity} @ ${ord.limitPrice}`,
              variant: 'success',
            });
          }
        }

        const currentPositions = get().positions.filter((p) => p.symbol === symbol);
        for (const pos of currentPositions) {
          if (pos.side === 'buy') {
            if (pos.stopLoss && low <= pos.stopLoss) {
              get().closePosition(pos.id, pos.stopLoss, 'sl');
            } else if (pos.takeProfit && high >= pos.takeProfit) {
              get().closePosition(pos.id, pos.takeProfit, 'tp');
            }
          } else {
            if (pos.stopLoss && high >= pos.stopLoss) {
              get().closePosition(pos.id, pos.stopLoss, 'sl');
            } else if (pos.takeProfit && low <= pos.takeProfit) {
              get().closePosition(pos.id, pos.takeProfit, 'tp');
            }
          }
        }
      },

      resetPaperAccount: () =>
        set({
          paperBalance: 100000,
          positions: [],
          pendingOrders: [],
          closedTrades: [],
        }),

      toasts: [],
      addToast: (toast) => {
        const id = generateId('toast');
        set((state) => ({
          toasts: [{ ...toast, id, createdAt: Date.now() }, ...state.toasts].slice(0, 5),
        }));
        window.setTimeout(() => {
          get().removeToast(id);
        }, 4500);
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    {
      name: 'apexchart-pro-storage-v3',
      partialize: (state) => ({
        theme: state.theme,
        chartSettings: state.chartSettings,
        smartOverlays: state.smartOverlays,
        layout: state.layout,
        panes: state.panes,
        activePaneId: state.activePaneId,
        favoriteTimeframes: state.favoriteTimeframes,
        syncCrosshair: state.syncCrosshair,
        syncSymbol: state.syncSymbol,
        syncTimeframe: state.syncTimeframe,
        watchlist: state.watchlist,
        drawingsBySymbol: state.drawingsBySymbol,
        groupDefaultTools: state.groupDefaultTools,
        alerts: state.alerts,
        paperBalance: state.paperBalance,
        positions: state.positions,
        pendingOrders: state.pendingOrders,
        closedTrades: state.closedTrades,
      }),
    }
  )
);
