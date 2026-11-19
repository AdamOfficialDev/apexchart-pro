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
  twelveDataInterval?: string;
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
  twelveDataSymbol?: string;
  fxPair?: [string, string];
  currency: string;
  description: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderFlowTick {
  timeSec: number;
  price: number;
  qty: number;
  side: 'buy' | 'sell'; // buy = Ask aggressor, sell = Bid aggressor
  isRealFlow: boolean;
}

export interface FootprintRow {
  price: number;
  bidVol: number;
  askVol: number;
  delta: number;
  bidImbalance: boolean;
  askImbalance: boolean;
}

export interface CandleFootprint {
  time: number;
  step: number;
  rows: FootprintRow[];
  pocPrice: number;
  totalBid: number;
  totalAsk: number;
  delta: number;
  isRealFlow: boolean;
}

export interface FootprintConfig {
  imbalanceRatio: number; // default 3.0 (300%)
  showImbalances: boolean;
  showPOC: boolean;
  showDeltaSummary: boolean;
  rowTicksMultiplier: number; // auto-bucket granularity 1..4
}

export type FeedSourceType = 'binance' | 'twelvedata' | 'gold-proxy' | 'simulated';

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
  source: FeedSourceType;
}

export interface DataFeedConfig {
  twelveDataApiKey: string;
  preferTwelveData: boolean;
  useGoldProxyWhenNoKey: boolean;
}

export type ChartStyleType =
  | 'candles'
  | 'hollow'
  | 'heikin_ashi'
  | 'footprint'
  | 'line'
  | 'area'
  | 'bars';

export type ScaleMode = 'normal' | 'logarithmic' | 'percentage';
export type PriceSource = 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4';

export interface TimezonePreset {
  id: string;
  label: string;
  short: string;
  offsetMinutes: number | 'local';
}

export interface TimeframeVisibility {
  seconds: boolean;
  minutes: boolean;
  hours: boolean;
  days: boolean;
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
  showLastPriceLine: boolean;
  lastPriceLineStyle: 'solid' | 'dashed' | 'dotted';
  showHighLowLines: boolean;
  showPrevCloseLine: boolean;
  showCountdown: boolean;
  precisionOverride: 'auto' | number;

  showStatusSymbol: boolean;
  showStatusFeedBadge: boolean;
  showStatusOHLC: boolean;
  showStatusBarChange: boolean;
  showStatusVolume: boolean;
  showIndicatorTitles: boolean;
  showIndicatorArgs: boolean;

  priceScalePosition: 'right' | 'left';
  invertScale: boolean;
  scaleFontSize: number;
  scaleMarginTop: number;
  scaleMarginBottom: number;
  showSymbolAxisLabel: boolean;

  bgType: 'solid' | 'gradient';
  bgColorDark: string;
  bgColorDarkBottom: string;
  bgColorLight: string;
  bgColorLightBottom: string;
  showGrid: boolean;
  gridStyle: 'both' | 'vert' | 'horz' | 'none';
  gridLineStyle: 'solid' | 'dashed' | 'dotted';
  gridOpacity: number;
  gridColorDark: string;
  crosshairStyle: 'dashed' | 'dotted' | 'solid';
  crosshairColor: string;
  crosshairWidth: 1 | 2 | 3;
  showWatermark: boolean;
  watermarkOpacity: number;
  rightOffset: number;
  barSpacing: number;

  showQuickTrade: boolean;
  showPositionsOnChart: boolean;
  showOrdersOnChart: boolean;
  showAlertsOnChart: boolean;
  playAlertSound: boolean;
  defaultRiskPercent: number;
  timezone: string;
}

export interface SmartOverlaySettings {
  showVPVR: boolean;
  showMarketStructure: boolean;
  showFVG: boolean;
  showAutoSR: boolean;
  showAutoTrendlines: boolean;
  showRSIDivergence: boolean;
  showSessions: boolean;
  showDailyOpen: boolean;
}

export interface RSIDivergenceConfig {
  rsiPeriod: number;
  pivotLeft: number;
  pivotRight: number;
  enableRegular: boolean;
  enableExaggerated: boolean;
  enableHidden: boolean;
  doubleTopTolerancePct: number;
  goldenRatioMin: number;
  goldenRatioTarget: number;
  goldenRatioMax: number;
  maxSetups: number;
  hideMitigated: boolean;
  enableAlerts: boolean;
}

export type DivergenceKind = 'regular' | 'exaggerated' | 'hidden';
export type DivergenceDirection = 'bull' | 'bear';

export interface RSIDivergenceSignal {
  id: string;
  kind: DivergenceKind;
  direction: DivergenceDirection;
  p1Index: number;
  p1Time: number;
  p1Price: number;
  p1Rsi: number;
  p2Index: number;
  p2Time: number;
  p2Price: number;
  p2Rsi: number;
  trendline?: {
    t1: number;
    p1: number;
    t2: number;
    p2: number;
  };
  fibSetup?: {
    prevLow: number;
    prevHigh: number;
    startTime: number;
    endTime: number;
    goldenTop: number;
    goldenMid: number;
    goldenBot: number;
  };
  valid: boolean;
  mitigated?: boolean;
  entryTime: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

export type BacktestStrategyId =
  | 'rsi_divergence'
  | 'ema_cross'
  | 'rsi_reversion'
  | 'supertrend'
  | 'bb_breakout';

export interface BacktestTrade {
  id: string;
  side: 'buy' | 'sell';
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  pnlUsd: number;
  pnlPct: number;
  reason: string;
}

export interface BacktestResult {
  strategyId: BacktestStrategyId;
  strategyName: string;
  initialCapital: number;
  finalEquity: number;
  netProfitUsd: number;
  netProfitPct: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  totalTrades: number;
  equityCurve: number[];
  trades: BacktestTrade[];
}

export interface ChartTemplate {
  id: string;
  name: string;
  chartStyle: ChartStyleType;
  indicators: Omit<IndicatorConfig, 'id'>[];
  smartOverlays: SmartOverlaySettings;
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
  | 'RSI_DIV'
  | 'MACD'
  | 'STOCH'
  | 'ATR'
  | 'CVD';

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
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  source?: PriceSource;
  offset?: number;
  upperLevel?: number;
  lowerLevel?: number;
  showBands?: boolean;
  showLastValue?: boolean;
  visibility?: TimeframeVisibility;
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
  defaultUpperLevel?: number;
  defaultLowerLevel?: number;
}

export type DrawingToolType =
  | 'cursor'
  | 'eraser'
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
  | 'fib'
  | 'fib_ext'
  | 'fib_channel'
  | 'fib_timezone'
  | 'fib_fan'
  | 'fib_arc'
  | 'pitchfork'
  | 'gann_box'
  | 'xabcd'
  | 'abcd'
  | 'elliott_impulse'
  | 'elliott_abc'
  | 'head_shoulders'
  | 'long_pos'
  | 'short_pos'
  | 'date_price_range'
  | 'bar_pattern'
  | 'rect'
  | 'rotated_rect'
  | 'ellipse'
  | 'triangle'
  | 'arc'
  | 'polyline'
  | 'brush'
  | 'highlighter'
  | 'arrow_marker'
  | 'text'
  | 'callout'
  | 'price_label'
  | 'ruler';

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface FibLevelItem {
  level: number;
  color: string;
  enabled: boolean;
}

export interface DrawingObject {
  id: string;
  symbol: string;
  type: Exclude<DrawingToolType, 'cursor' | 'eraser' | 'ruler'>;
  points: DrawingPoint[];
  color: string;
  opacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  showFill?: boolean;
  lineWidth: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  extendLeft?: boolean;
  extendRight?: boolean;
  showMidline?: boolean;
  showStats?: boolean;
  text?: string;
  textColor?: string;
  fontSize?: number;
  fontBold?: boolean;
  fontItalic?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  fibLevels?: FibLevelItem[];
  fibReverse?: boolean;
  fibShowPrices?: boolean;
  fibShowPercents?: boolean;
  riskPercent?: number;
  accountSize?: number;
  visibility?: TimeframeVisibility;
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
  pointsRequired: number;
  description: string;
}

export type LayoutType = '1x1' | '1x2' | '2x1' | '2x2' | '1+2';

export interface ChartPaneConfig {
  id: string;
  symbol: string;
  timeframe: TimeframeId;
  chartStyle: ChartStyleType;
  scaleMode: ScaleMode;
  compareSymbol?: string | null;
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
