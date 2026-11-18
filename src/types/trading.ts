export type TimeframeId =
  | '1s'
  | '5s'
  | '15s'
  | '30s'
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '45m'
  | '1h'
  | '2h'
  | '4h'
  | '1D'
  | '1W'
  | '1M';

export type TimeframeGroup = 'Seconds' | 'Minutes' | 'Hours' | 'Days & Above';

export interface TimeframeMeta {
  id: TimeframeId;
  label: string;
  seconds: number;
  group: TimeframeGroup;
  binanceInterval?: string;
  defaultBars: number;
}

export type MarketCategory = 'Crypto' | 'Forex' | 'Stocks' | 'IDX' | 'Commodities';

export interface SymbolInfo {
  symbol: string;
  displaySymbol: string;
  name: string;
  category: MarketCategory;
  exchange: string;
  basePrice: number;
  precision: number;
  minMove: number;
  volatility: number;
  binanceSymbol?: string;
  currency: string;
  description: string;
}

export interface Candle {
  time: number; // UTC unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LiveQuote {
  symbol: string;
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  sparkline: number[];
  source: 'binance' | 'simulated';
}

export type ChartStyleType = 'candles' | 'hollow' | 'heikin_ashi' | 'line' | 'area' | 'bars';
export type ScaleMode = 'normal' | 'logarithmic' | 'percentage';

export interface TimezonePreset {
  id: string;
  label: string;
  short: string;
  offsetMinutes: number | 'local';
}

export interface ChartSettings {
  upColor: string;
  downColor: string;
  wickUpColor: string;
  wickDownColor: string;
  borderUpColor: string;
  borderDownColor: string;
  showWicks: boolean;
  showBorders: boolean;
  showGrid: boolean;
  gridStyle: 'both' | 'vert' | 'horz' | 'none';
  gridOpacity: number;
  crosshairStyle: 'dashed' | 'dotted' | 'solid';
  showWatermark: boolean;
  showCountdown: boolean;
  showQuickTrade: boolean;
  bgType: 'solid' | 'gradient';
  bgColorDark: string;
  bgColorLight: string;
  invertScale: boolean;
  timezone: string; // matches TimezonePreset.id
}

export interface SmartOverlaySettings {
  showVPVR: boolean;
  showMarketStructure: boolean;
  showFVG: boolean;
  showAutoSR: boolean;
  showAutoTrendlines: boolean;
}

export type IndicatorType =
  | 'SMA'
  | 'EMA'
  | 'BB'
  | 'VWAP'
  | 'SUPERTREND'
  | 'DONCHIAN'
  | 'VOLUME'
  | 'RSI'
  | 'MACD'
  | 'STOCH'
  | 'ATR';

export type IndicatorPlacement = 'overlay' | 'subpane';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  name: string;
  placement: IndicatorPlacement;
  visible: boolean;
  color: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  params: Record<string, number>;
}

export interface IndicatorCatalogItem {
  type: IndicatorType;
  name: string;
  shortName: string;
  category: 'Trend' | 'Momentum' | 'Volatility' | 'Volume';
  placement: IndicatorPlacement;
  description: string;
  defaultColor: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  defaultParams: Record<string, number>;
}

// Complete 43 TradingView Drawing Tools
export type DrawingToolType =
  | 'cursor'
  | 'eraser'
  // Trend Lines & Channels
  | 'trendline'
  | 'ray'
  | 'extended_line'
  | 'info_line'
  | 'hline'
  | 'hray'
  | 'vline'
  | 'cross_line'
  | 'channel'
  | 'regression_channel'
  // Gann & Fibonacci
  | 'fib'
  | 'fib_ext'
  | 'fib_channel'
  | 'fib_timezone'
  | 'fib_fan'
  | 'fib_arc'
  | 'pitchfork'
  | 'gann_box'
  // Patterns & Waves
  | 'xabcd'
  | 'abcd'
  | 'elliott_impulse'
  | 'elliott_abc'
  | 'head_shoulders'
  // Forecasting & Risk/Reward
  | 'long_pos'
  | 'short_pos'
  | 'date_price_range'
  | 'bar_pattern'
  // Geometric Shapes
  | 'rect'
  | 'rotated_rect'
  | 'ellipse'
  | 'triangle'
  | 'arc'
  | 'polyline'
  // Annotations & Brushes
  | 'brush'
  | 'highlighter'
  | 'arrow_marker'
  | 'text'
  | 'callout'
  | 'price_label'
  // Measure
  | 'ruler';

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface DrawingObject {
  id: string;
  symbol: string;
  type: Exclude<DrawingToolType, 'cursor' | 'eraser' | 'ruler'>;
  points: DrawingPoint[];
  color: string;
  fillColor?: string;
  lineWidth: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  text?: string;
  locked?: boolean;
  visible?: boolean;
  createdAt: number;
}

export type DrawingToolGroupId =
  | 'cursors'
  | 'lines'
  | 'fib_gann'
  | 'patterns'
  | 'forecast'
  | 'shapes'
  | 'annotations'
  | 'measure';

export interface DrawingToolMeta {
  id: DrawingToolType;
  label: string;
  group: DrawingToolGroupId;
  shortcut?: string;
  pointsRequired: number; // 0 = continuous/drag/multi-click
  description: string;
}

export type LayoutType = '1x1' | '1x2' | '2x1' | '2x2' | '1+2';

export interface ChartPaneConfig {
  id: string;
  symbol: string;
  timeframe: TimeframeId;
  chartStyle: ChartStyleType;
  scaleMode: ScaleMode;
  indicators: IndicatorConfig[];
}

export interface ReplayState {
  enabled: boolean;
  isSelectingStart: boolean;
  isPlaying: boolean;
  speed: 0.5 | 1 | 2 | 5 | 10;
  currentIndex: number;
  totalBars: number;
  currentTimestamp: number | null;
  paneId: string | null;
}

export type AlertCondition = 'crossing_up' | 'crossing_down' | 'crossing';

export interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  condition: AlertCondition;
  note: string;
  active: boolean;
  triggeredAt?: number;
  createdAt: number;
}

export type OrderSide = 'buy' | 'sell';

export interface PaperPosition {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: number;
}

export interface PendingOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  type: 'limit';
  quantity: number;
  limitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  createdAt: number;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  openedAt: number;
  closedAt: number;
  reason: 'manual' | 'sl' | 'tp';
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'info' | 'success' | 'warning' | 'danger';
  createdAt: number;
}

export interface ChartContextMenuData {
  x: number;
  y: number;
  price: number;
  time: number | null;
  barIndex: number | null;
  drawingId: string | null;
}
