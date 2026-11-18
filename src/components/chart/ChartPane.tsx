import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ColorType,
  CrosshairMode,
  IChartApi,
  IPriceLine,
  ISeriesApi,
  LineStyle,
  PriceScaleMode,
  TickMarkType,
  Time,
  UTCTimestamp,
  createChart,
} from 'lightweight-charts';
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ChevronUp,
  Eye,
  EyeOff,
  Minus,
  MoveRight,
  Plus,
  RotateCcw,
  Scissors,
  Settings2,
  TrendingDown,
  TrendingUp,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { getSymbolInfo, getTimezonePreset, TIMEFRAME_MAP } from '@/data/symbols';
import { cn, formatCompactNumber, formatPrice, formatTimeInOffset, generateId } from '@/lib/utils';
import {
  computeBollingerBands,
  computeDonchian,
  computeEMA,
  computeHeikinAshi,
  computeSMA,
  computeSupertrend,
  computeVWAP,
} from '@/services/indicators';
import { fetchHistoricalCandles, subscribeLiveTicks } from '@/services/marketData';
import { useTradingStore } from '@/store/useTradingStore';
import { Candle, ChartContextMenuData, ChartPaneConfig, TimeframeId } from '@/types/trading';
import { ChartContextMenu } from './ChartContextMenu';
import { DrawingOverlay } from './DrawingOverlay';
import { FloatingDrawingToolbar } from './FloatingDrawingToolbar';
import { SubPaneChart } from './SubPaneChart';

interface ChartPaneProps {
  pane: ChartPaneConfig;
  isActive: boolean;
  isMultiPane: boolean;
}

type MainSeriesApi = ISeriesApi<'Candlestick' | 'Bar' | 'Line' | 'Area'>;

const RANGE_PRESETS: { label: string; tf: TimeframeId }[] = [
  { label: '1D', tf: '5m' },
  { label: '5D', tf: '15m' },
  { label: '1M', tf: '1h' },
  { label: '3M', tf: '4h' },
  { label: '1Y', tf: '1D' },
  { label: 'ALL', tf: '1W' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatTickInOffset(
  unixSec: number,
  offsetMinutes: number | 'local',
  tickType: TickMarkType
): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const d =
    offsetMinutes === 'local'
      ? new Date(unixSec * 1000)
      : new Date((unixSec + offsetMinutes * 60) * 1000);

  const yr = offsetMinutes === 'local' ? d.getFullYear() : d.getUTCFullYear();
  const mo = offsetMinutes === 'local' ? d.getMonth() : d.getUTCMonth();
  const day = offsetMinutes === 'local' ? d.getDate() : d.getUTCDate();
  const hr = offsetMinutes === 'local' ? d.getHours() : d.getUTCHours();
  const min = offsetMinutes === 'local' ? d.getMinutes() : d.getUTCMinutes();
  const sec = offsetMinutes === 'local' ? d.getSeconds() : d.getUTCSeconds();

  if (tickType === TickMarkType.Year) return String(yr);
  if (tickType === TickMarkType.Month) return `${MONTHS[mo]} '${String(yr).slice(-2)}`;
  if (tickType === TickMarkType.DayOfMonth) return `${day} ${MONTHS[mo]}`;
  if (tickType === TickMarkType.TimeWithSeconds) return `${pad(hr)}:${pad(min)}:${pad(sec)}`;
  return `${pad(hr)}:${pad(min)}`;
}

function formatCountdown(secondsLeft: number): string {
  const s = Math.max(0, Math.floor(secondsLeft));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

export const ChartPane: React.FC<ChartPaneProps> = ({ pane, isActive, isMultiPane }) => {
  const theme = useTradingStore((s) => s.theme);
  const chartSettings = useTradingStore((s) => s.chartSettings);
  const setChartSettingsModalOpen = useTradingStore((s) => s.setChartSettingsModalOpen);

  const setActivePaneId = useTradingStore((s) => s.setActivePaneId);
  const updatePaneTimeframe = useTradingStore((s) => s.updatePaneTimeframe);
  const updatePaneScaleMode = useTradingStore((s) => s.updatePaneScaleMode);
  const toggleIndicatorVisibility = useTradingStore((s) => s.toggleIndicatorVisibility);
  const removeIndicator = useTradingStore((s) => s.removeIndicator);
  const updateQuote = useTradingStore((s) => s.updateQuote);
  const processPaper = useTradingStore((s) => s.processMarketPriceForPaperTrading);

  const placeMarketOrder = useTradingStore((s) => s.placeMarketOrder);
  const placeLimitOrder = useTradingStore((s) => s.placeLimitOrder);
  const addAlert = useTradingStore((s) => s.addAlert);
  const addDrawing = useTradingStore((s) => s.addDrawing);
  const drawingColor = useTradingStore((s) => s.drawingColor);

  const syncCrosshair = useTradingStore((s) => s.syncCrosshair);
  const syncedCrosshairTime = useTradingStore((s) => s.syncedCrosshairTime);
  const setSyncedCrosshairTime = useTradingStore((s) => s.setSyncedCrosshairTime);

  const replay = useTradingStore((s) => s.replay);
  const startReplayAt = useTradingStore((s) => s.startReplayAt);
  const setReplayTotalBars = useTradingStore((s) => s.setReplayTotalBars);
  const setReplayIndex = useTradingStore((s) => s.setReplayIndex);

  const alerts = useTradingStore((s) => s.alerts);
  const positions = useTradingStore((s) => s.positions);
  const snapshotCounter = useTradingStore((s) => s.snapshotRequestCounter);
  const addToast = useTradingStore((s) => s.addToast);

  const symbolInfo = useMemo(() => getSymbolInfo(pane.symbol), [pane.symbol]);
  const tfMeta = TIMEFRAME_MAP[pane.timeframe];
  const tzPreset = useMemo(() => getTimezonePreset(chartSettings.timezone), [chartSettings.timezone]);

  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<MainSeriesApi | null>(null);
  const overlaySeriesRef = useRef<Map<string, ISeriesApi<'Line' | 'Histogram'>[]>>(new Map());
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitTestDrawingRef = useRef<((x: number, y: number) => string | null) | null>(null);
  const isExternalCrosshairRef = useRef(false);

  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [fullCandles, setFullCandles] = useState<Candle[]>([]);
  const [dataSource, setDataSource] = useState<'binance' | 'simulated'>('simulated');
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState<Candle | null>(null);

  const [legendExpanded, setLegendExpanded] = useState(true);
  const [contextMenu, setContextMenu] = useState<ChartContextMenuData | null>(null);
  const [hoverChart, setHoverChart] = useState(false);
  const [priceAxisHover, setPriceAxisHover] = useState<{ y: number; price: number } | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState<{ y: number; price: number } | null>(null);
  const [scrolledAway, setScrolledAway] = useState(false);
  const [quickQty, setQuickQty] = useState(() =>
    symbolInfo.category === 'Crypto' ? '0.10' : symbolInfo.category === 'IDX' ? '1000' : '10'
  );
  const [countdownText, setCountdownText] = useState('00:00');
  const [clockText, setClockText] = useState('');
  const [lastPriceY, setLastPriceY] = useState<number | null>(null);

  const isThisPaneInReplay = replay.enabled && replay.paneId === pane.id;

  useEffect(() => {
    setQuickQty(
      symbolInfo.category === 'Crypto' ? '0.10' : symbolInfo.category === 'IDX' ? '1000' : '10'
    );
  }, [symbolInfo.category, pane.symbol]);

  const displayCandles = useMemo(() => {
    if (isThisPaneInReplay && !replay.isSelectingStart && fullCandles.length > 0) {
      const end = Math.min(fullCandles.length, Math.max(5, replay.currentIndex + 1));
      return fullCandles.slice(0, end);
    }
    return fullCandles;
  }, [fullCandles, isThisPaneInReplay, replay.isSelectingStart, replay.currentIndex]);

  // Live Candle Countdown & Selected World Timezone Clock
  useEffect(() => {
    const tickClock = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const nextClose = (Math.floor(nowSec / tfMeta.seconds) + 1) * tfMeta.seconds;
      setCountdownText(formatCountdown(nextClose - nowSec));
      const timeStr = formatTimeInOffset(nowSec, tzPreset.offsetMinutes, false, true);
      setClockText(`${timeStr} (${tzPreset.short})`);
    };
    tickClock();
    const id = window.setInterval(tickClock, 1000);
    return () => window.clearInterval(id);
  }, [tfMeta.seconds, tzPreset]);

  const refreshLastPriceY = useCallback(() => {
    if (!mainSeriesRef.current || displayCandles.length === 0) {
      setLastPriceY(null);
      return;
    }
    const last = displayCandles[displayCandles.length - 1];
    const coord = mainSeriesRef.current.priceToCoordinate(last.close);
    setLastPriceY(coord !== null ? Number(coord) : null);
  }, [displayCandles]);

  // 1. Initialize main lightweight-charts instance
  useEffect(() => {
    const el = mainContainerRef.current;
    if (!el) return;

    const isDark = theme === 'dark';
    const bgDark = chartSettings.bgColorDark || '#131722';
    const bgLight = chartSettings.bgColorLight || '#FFFFFF';
    const gridAlpha = Math.max(0.05, Math.min(1, (chartSettings.gridOpacity ?? 55) / 100));

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background:
          chartSettings.bgType === 'gradient'
            ? {
                type: ColorType.VerticalGradient,
                topColor: isDark ? bgDark : bgLight,
                bottomColor: isDark ? '#0B0E14' : '#F0F3FA',
              }
            : { type: ColorType.Solid, color: isDark ? bgDark : bgLight },
        textColor: isDark ? '#787B86' : '#475569',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: {
          visible:
            chartSettings.showGrid &&
            (chartSettings.gridStyle === 'both' || chartSettings.gridStyle === 'vert'),
          color: isDark
            ? `rgba(42, 46, 57, ${gridAlpha.toFixed(2)})`
            : `rgba(15, 23, 42, ${(gridAlpha * 0.14).toFixed(2)})`,
        },
        horzLines: {
          visible:
            chartSettings.showGrid &&
            (chartSettings.gridStyle === 'both' || chartSettings.gridStyle === 'horz'),
          color: isDark
            ? `rgba(42, 46, 57, ${gridAlpha.toFixed(2)})`
            : `rgba(15, 23, 42, ${(gridAlpha * 0.14).toFixed(2)})`,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          style:
            chartSettings.crosshairStyle === 'solid'
              ? LineStyle.Solid
              : chartSettings.crosshairStyle === 'dotted'
              ? LineStyle.Dotted
              : LineStyle.Dashed,
          color: isDark ? 'rgba(148,163,184,0.45)' : 'rgba(71,85,105,0.45)',
          labelBackgroundColor: '#2962FF',
        },
        horzLine: {
          style:
            chartSettings.crosshairStyle === 'solid'
              ? LineStyle.Solid
              : chartSettings.crosshairStyle === 'dotted'
              ? LineStyle.Dotted
              : LineStyle.Dashed,
          color: isDark ? 'rgba(148,163,184,0.45)' : 'rgba(71,85,105,0.45)',
          labelBackgroundColor: '#2962FF',
        },
      },
      rightPriceScale: {
        borderColor: isDark ? '#2A2E39' : '#E0E3EB',
        scaleMargins: { top: 0.12, bottom: 0.16 },
        invertScale: chartSettings.invertScale,
      },
      timeScale: {
        borderColor: isDark ? '#2A2E39' : '#E0E3EB',
        timeVisible: true,
        secondsVisible: tfMeta.seconds < 60,
        rightOffset: 10,
        barSpacing: 8,
      },
      handleScroll: { vertTouchDrag: true },
      handleScale: { axisPressedMouseMove: true },
    });

    chartRef.current = chart;
    setChartSize({ width: el.clientWidth, height: el.clientHeight });

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height });
          setChartSize({ width, height });
        }
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      overlaySeriesRef.current.clear();
      priceLinesRef.current = [];
    };
  }, [theme]);

  // Apply appearance, timezone & scale updates live
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const isDark = theme === 'dark';
    const bgDark = chartSettings.bgColorDark || '#131722';
    const bgLight = chartSettings.bgColorLight || '#FFFFFF';
    const gridAlpha = Math.max(0.05, Math.min(1, (chartSettings.gridOpacity ?? 55) / 100));

    chart.applyOptions({
      layout: {
        background:
          chartSettings.bgType === 'gradient'
            ? {
                type: ColorType.VerticalGradient,
                topColor: isDark ? bgDark : bgLight,
                bottomColor: isDark ? '#0B0E14' : '#F0F3FA',
              }
            : { type: ColorType.Solid, color: isDark ? bgDark : bgLight },
      },
      localization: {
        timeFormatter: (time: Time) => {
          if (typeof time === 'number') {
            return formatTimeInOffset(
              time,
              tzPreset.offsetMinutes,
              true,
              tfMeta.seconds < 60
            );
          }
          return String(time);
        },
      },
      grid: {
        vertLines: {
          visible:
            chartSettings.showGrid &&
            (chartSettings.gridStyle === 'both' || chartSettings.gridStyle === 'vert'),
          color: isDark
            ? `rgba(42, 46, 57, ${gridAlpha.toFixed(2)})`
            : `rgba(15, 23, 42, ${(gridAlpha * 0.14).toFixed(2)})`,
        },
        horzLines: {
          visible:
            chartSettings.showGrid &&
            (chartSettings.gridStyle === 'both' || chartSettings.gridStyle === 'horz'),
          color: isDark
            ? `rgba(42, 46, 57, ${gridAlpha.toFixed(2)})`
            : `rgba(15, 23, 42, ${(gridAlpha * 0.14).toFixed(2)})`,
        },
      },
      crosshair: {
        vertLine: {
          style:
            chartSettings.crosshairStyle === 'solid'
              ? LineStyle.Solid
              : chartSettings.crosshairStyle === 'dotted'
              ? LineStyle.Dotted
              : LineStyle.Dashed,
        },
        horzLine: {
          style:
            chartSettings.crosshairStyle === 'solid'
              ? LineStyle.Solid
              : chartSettings.crosshairStyle === 'dotted'
              ? LineStyle.Dotted
              : LineStyle.Dashed,
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: tfMeta.seconds < 60,
        tickMarkFormatter: (time: Time, tickType: TickMarkType) => {
          if (typeof time === 'number') {
            return formatTickInOffset(time, tzPreset.offsetMinutes, tickType);
          }
          return String(time);
        },
      },
      rightPriceScale: {
        invertScale: chartSettings.invertScale,
        mode:
          pane.scaleMode === 'logarithmic'
            ? PriceScaleMode.Logarithmic
            : pane.scaleMode === 'percentage'
            ? PriceScaleMode.Percentage
            : PriceScaleMode.Normal,
      },
    });
  }, [theme, chartSettings, tzPreset, tfMeta.seconds, pane.scaleMode]);

  // 2. Fetch historical candles
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHoveredBar(null);

    fetchHistoricalCandles(pane.symbol, pane.timeframe).then(({ candles, source }) => {
      if (cancelled) return;
      setFullCandles(candles);
      setDataSource(source);
      setLoading(false);

      if (candles.length > 0) {
        const last = candles[candles.length - 1];
        updateQuote(pane.symbol, last.close, source, last.volume);
      }

      if (
        useTradingStore.getState().replay.enabled &&
        useTradingStore.getState().replay.paneId === pane.id
      ) {
        setReplayTotalBars(candles.length);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pane.symbol, pane.timeframe, pane.id, updateQuote, setReplayTotalBars]);

  useEffect(() => {
    if (isThisPaneInReplay && fullCandles.length > 0) {
      setReplayTotalBars(fullCandles.length);
    }
  }, [isThisPaneInReplay, fullCandles.length, setReplayTotalBars]);

  // 3. Subscribe to Live Ticks
  useEffect(() => {
    if (loading || fullCandles.length === 0 || isThisPaneInReplay) return;
    const lastCandle = fullCandles[fullCandles.length - 1];

    const unsubscribe = subscribeLiveTicks(
      pane.symbol,
      pane.timeframe,
      lastCandle,
      (tickCandle, source) => {
        setDataSource(source);
        setFullCandles((prev) => {
          if (prev.length === 0) return [tickCandle];
          const tail = prev[prev.length - 1];
          if (tickCandle.time === tail.time) {
            const copy = prev.slice();
            copy[copy.length - 1] = tickCandle;
            return copy;
          }
          if (tickCandle.time > tail.time) {
            return [...prev.slice(-799), tickCandle];
          }
          return prev;
        });

        updateQuote(pane.symbol, tickCandle.close, source, tickCandle.volume);
        processPaper(pane.symbol, tickCandle.high, tickCandle.low, tickCandle.close);
      }
    );

    return unsubscribe;
  }, [pane.symbol, pane.timeframe, loading, isThisPaneInReplay, fullCandles.length > 0]);

  useEffect(() => {
    if (!isThisPaneInReplay || replay.isSelectingStart || displayCandles.length === 0) return;
    const cur = displayCandles[displayCandles.length - 1];
    updateQuote(pane.symbol, cur.close, 'simulated', cur.volume);
    processPaper(pane.symbol, cur.high, cur.low, cur.close);
    if (replay.currentTimestamp !== cur.time) {
      setReplayIndex(replay.currentIndex, cur.time);
    }
  }, [isThisPaneInReplay, replay.isSelectingStart, displayCandles, pane.symbol]);

  // 4. Create / recreate Main Price Series
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (mainSeriesRef.current) {
      try {
        chart.removeSeries(mainSeriesRef.current);
      } catch {
        // ignore
      }
      mainSeriesRef.current = null;
      priceLinesRef.current = [];
    }

    const priceFormat = {
      type: 'price' as const,
      precision: symbolInfo.precision,
      minMove: symbolInfo.minMove,
    };

    let s: MainSeriesApi;
    if (pane.chartStyle === 'hollow') {
      s = chart.addCandlestickSeries({
        upColor: 'transparent',
        downColor: chartSettings.downColor,
        borderUpColor: chartSettings.upColor,
        borderDownColor: chartSettings.downColor,
        wickVisible: chartSettings.showWicks,
        wickUpColor: chartSettings.wickUpColor,
        wickDownColor: chartSettings.wickDownColor,
        priceFormat,
      });
    } else if (pane.chartStyle === 'bars') {
      s = chart.addBarSeries({
        upColor: chartSettings.upColor,
        downColor: chartSettings.downColor,
        priceFormat,
      });
    } else if (pane.chartStyle === 'line') {
      s = chart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
        priceFormat,
      });
    } else if (pane.chartStyle === 'area') {
      s = chart.addAreaSeries({
        lineColor: '#2962FF',
        topColor: 'rgba(41, 98, 255, 0.34)',
        bottomColor: 'rgba(41, 98, 255, 0.02)',
        lineWidth: 2,
        priceFormat,
      });
    } else {
      s = chart.addCandlestickSeries({
        upColor: chartSettings.upColor,
        downColor: chartSettings.downColor,
        borderVisible: chartSettings.showBorders,
        borderUpColor: chartSettings.borderUpColor,
        borderDownColor: chartSettings.borderDownColor,
        wickVisible: chartSettings.showWicks,
        wickUpColor: chartSettings.wickUpColor,
        wickDownColor: chartSettings.wickDownColor,
        priceFormat,
      });
    }

    mainSeriesRef.current = s;
  }, [
    pane.chartStyle,
    symbolInfo.precision,
    symbolInfo.minMove,
    theme,
    chartSettings.upColor,
    chartSettings.downColor,
    chartSettings.wickUpColor,
    chartSettings.wickDownColor,
    chartSettings.borderUpColor,
    chartSettings.borderDownColor,
    chartSettings.showWicks,
    chartSettings.showBorders,
  ]);

  // 5. Feed price data & overlay indicators
  useEffect(() => {
    const chart = chartRef.current;
    const series = mainSeriesRef.current;
    if (!chart || !series || displayCandles.length === 0) return;

    const effectiveCandles =
      pane.chartStyle === 'heikin_ashi' ? computeHeikinAshi(displayCandles) : displayCandles;

    if (pane.chartStyle === 'line' || pane.chartStyle === 'area') {
      (series as ISeriesApi<'Line' | 'Area'>).setData(
        effectiveCandles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close }))
      );
    } else {
      (series as ISeriesApi<'Candlestick' | 'Bar'>).setData(
        effectiveCandles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    }

    refreshLastPriceY();

    for (const list of overlaySeriesRef.current.values()) {
      for (const s of list) {
        try {
          chart.removeSeries(s);
        } catch {
          // ignore
        }
      }
    }
    overlaySeriesRef.current.clear();

    const overlays = pane.indicators.filter((i) => i.placement === 'overlay' && i.visible);
    for (const ind of overlays) {
      const created: ISeriesApi<'Line' | 'Histogram'>[] = [];

      if (ind.type === 'VOLUME') {
        const volSeries = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: '',
          lastValueVisible: false,
          priceLineVisible: false,
        });
        volSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.84, bottom: 0 },
        });
        volSeries.setData(
          displayCandles.map((c) => ({
            time: c.time as UTCTimestamp,
            value: c.volume,
            color:
              c.close >= c.open ? 'rgba(8, 153, 129, 0.34)' : 'rgba(242, 54, 69, 0.34)',
          }))
        );
        created.push(volSeries);
      } else if (ind.type === 'SMA') {
        const pts = computeSMA(displayCandles, ind.params.period ?? 50);
        const l = chart.addLineSeries({
          color: ind.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        l.setData(pts.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        created.push(l);
      } else if (ind.type === 'EMA') {
        const pts = computeEMA(displayCandles, ind.params.period ?? 21);
        const l = chart.addLineSeries({
          color: ind.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        l.setData(pts.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        created.push(l);
      } else if (ind.type === 'VWAP') {
        const pts = computeVWAP(displayCandles);
        const l = chart.addLineSeries({
          color: ind.color,
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        l.setData(pts.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        created.push(l);
      } else if (ind.type === 'BB') {
        const bb = computeBollingerBands(
          displayCandles,
          ind.params.period ?? 20,
          ind.params.stdDev ?? 2
        );
        const up = chart.addLineSeries({
          color: ind.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const mid = chart.addLineSeries({
          color: ind.secondaryColor ?? '#64748B',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const low = chart.addLineSeries({
          color: ind.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        up.setData(bb.upper.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        mid.setData(bb.middle.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        low.setData(bb.lower.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        created.push(up, mid, low);
      } else if (ind.type === 'DONCHIAN') {
        const dc = computeDonchian(displayCandles, ind.params.period ?? 20);
        const up = chart.addLineSeries({
          color: ind.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const low = chart.addLineSeries({
          color: ind.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        up.setData(dc.upper.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        low.setData(dc.lower.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        created.push(up, low);
      } else if (ind.type === 'SUPERTREND') {
        const st = computeSupertrend(
          displayCandles,
          ind.params.period ?? 10,
          ind.params.multiplier ?? 3,
          ind.color,
          ind.secondaryColor ?? '#F23645'
        );
        const l = chart.addLineSeries({
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        l.setData(
          st.map((p) => ({ time: p.time as UTCTimestamp, value: p.value, color: p.color }))
        );
        created.push(l);
      }

      overlaySeriesRef.current.set(ind.id, created);
    }
  }, [displayCandles, pane.chartStyle, pane.indicators, theme, refreshLastPriceY]);

  // 6. Plot Alerts & Paper Positions
  useEffect(() => {
    const series = mainSeriesRef.current;
    if (!series) return;

    for (const pl of priceLinesRef.current) {
      try {
        series.removePriceLine(pl);
      } catch {
        // ignore
      }
    }
    priceLinesRef.current = [];

    const symAlerts = alerts.filter((a) => a.active && a.symbol === pane.symbol);
    for (const a of symAlerts) {
      priceLinesRef.current.push(
        series.createPriceLine({
          price: a.price,
          color: '#F59E0B',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'Alert',
        })
      );
    }

    const symPositions = positions.filter((p) => p.symbol === pane.symbol);
    for (const pos of symPositions) {
      priceLinesRef.current.push(
        series.createPriceLine({
          price: pos.entryPrice,
          color: pos.side === 'buy' ? '#00D4AA' : '#F23645',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${pos.side === 'buy' ? 'LONG' : 'SHORT'} ${pos.quantity}`,
        })
      );
      if (pos.stopLoss) {
        priceLinesRef.current.push(
          series.createPriceLine({
            price: pos.stopLoss,
            color: '#F23645',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: 'SL',
          })
        );
      }
      if (pos.takeProfit) {
        priceLinesRef.current.push(
          series.createPriceLine({
            price: pos.takeProfit,
            color: '#089981',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: 'TP',
          })
        );
      }
    }
  }, [alerts, positions, pane.symbol, pane.chartStyle]);

  // 7. Crosshair, Scroll-Away & Replay Click
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const candleByTime = new Map<number, Candle>();
    for (const c of displayCandles) candleByTime.set(c.time, c);

    const onCrosshair = (param: { time?: Time }) => {
      if (param.time !== undefined) {
        const t = Number(param.time);
        const found = candleByTime.get(t);
        if (found) setHoveredBar(found);
        if (syncCrosshair && !isExternalCrosshairRef.current) {
          setSyncedCrosshairTime(t);
        }
      } else {
        setHoveredBar(null);
      }
    };

    const onRange = () => {
      refreshLastPriceY();
      const pos = chart.timeScale().scrollPosition();
      setScrolledAway(pos < -6);
    };

    const onClick = (param: { time?: Time }) => {
      setActivePaneId(pane.id);
      setPlusMenuOpen(null);
      if (isThisPaneInReplay && replay.isSelectingStart && param.time !== undefined) {
        const clickedTime = Number(param.time);
        const idx = fullCandles.findIndex((c) => c.time >= clickedTime);
        if (idx >= 0) {
          startReplayAt(pane.id, idx, fullCandles.length, fullCandles[idx].time);
        }
      }
    };

    chart.subscribeCrosshairMove(onCrosshair);
    chart.subscribeClick(onClick);
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshair);
      chart.unsubscribeClick(onClick);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
    };
  }, [
    displayCandles,
    fullCandles,
    syncCrosshair,
    isThisPaneInReplay,
    replay.isSelectingStart,
    pane.id,
    setActivePaneId,
    setSyncedCrosshairTime,
    startReplayAt,
    refreshLastPriceY,
  ]);

  useEffect(() => {
    const chart = chartRef.current;
    const series = mainSeriesRef.current;
    if (!chart || !series || !syncCrosshair || isActive || syncedCrosshairTime === null) return;

    const bar = displayCandles.find((c) => c.time === syncedCrosshairTime);
    if (!bar) return;

    isExternalCrosshairRef.current = true;
    try {
      chart.setCrosshairPosition(bar.close, bar.time as UTCTimestamp, series);
      setHoveredBar(bar);
    } catch {
      // ignore
    }
    isExternalCrosshairRef.current = false;
  }, [syncedCrosshairTime, syncCrosshair, isActive, displayCandles]);

  // 8. Export High-Res Snapshot
  const prevSnapshotRef = useRef(snapshotCounter);
  useEffect(() => {
    if (snapshotCounter === prevSnapshotRef.current) return;
    prevSnapshotRef.current = snapshotCounter;
    if (!isActive || !chartRef.current) return;

    try {
      const chartCanvas = chartRef.current.takeScreenshot();
      const out = document.createElement('canvas');
      out.width = chartCanvas.width;
      out.height = chartCanvas.height;
      const ctx = out.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(chartCanvas, 0, 0);
      if (drawingCanvasRef.current) {
        ctx.drawImage(drawingCanvasRef.current, 0, 0, out.width, out.height);
      }

      ctx.font = '600 13px Inter, sans-serif';
      ctx.fillStyle = theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.45)';
      ctx.fillText(
        `ApexChart Pro  •  ${symbolInfo.displaySymbol}  •  ${pane.timeframe}`,
        18,
        out.height - 16
      );

      const url = out.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pane.symbol}_${pane.timeframe}_${Date.now()}.png`;
      a.click();

      addToast({
        title: 'Chart Snapshot Saved',
        description: `${symbolInfo.displaySymbol} (${pane.timeframe}) downloaded as PNG.`,
        variant: 'success',
      });
    } catch {
      addToast({ title: 'Snapshot Failed', variant: 'danger' });
    }
  }, [
    snapshotCounter,
    isActive,
    pane.symbol,
    pane.timeframe,
    symbolInfo.displaySymbol,
    theme,
    addToast,
  ]);

  const handleResetView = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.priceScale('right').applyOptions({ autoScale: true });
    chart.timeScale().applyOptions({ barSpacing: 8, rightOffset: 10 });
    chart.timeScale().scrollToRealTime();
    setScrolledAway(false);
  }, []);

  const handleFitContent = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.priceScale('right').applyOptions({ autoScale: true });
    chart.timeScale().fitContent();
  }, []);

  const handleZoom = useCallback((factor: number) => {
    const chart = chartRef.current;
    if (!chart) return;
    const range = chart.timeScale().getVisibleLogicalRange();
    if (!range) return;
    const span = range.to - range.from;
    const nextSpan = Math.max(12, Math.min(600, span * factor));
    const delta = nextSpan - span;
    chart.timeScale().setVisibleLogicalRange({
      from: range.from - delta * 0.7,
      to: range.to + delta * 0.3,
    });
  }, []);

  const handlePan = useCallback((barsShift: number) => {
    const chart = chartRef.current;
    if (!chart) return;
    const range = chart.timeScale().getVisibleLogicalRange();
    if (!range) return;
    chart.timeScale().setVisibleLogicalRange({
      from: range.from + barsShift,
      to: range.to + barsShift,
    });
  }, []);

  const openContextMenuAt = useCallback(
    (
      clientX: number,
      clientY: number,
      localX: number,
      localY: number,
      drawingId: string | null
    ) => {
      const chart = chartRef.current;
      const series = mainSeriesRef.current;
      if (!chart || !series) return;

      const price = series.coordinateToPrice(localY);
      const logical = chart.timeScale().coordinateToLogical(localX);
      const lastPrice = displayCandles[displayCandles.length - 1]?.close ?? symbolInfo.basePrice;
      const resolvedPrice = price !== null ? Number(price) : lastPrice;

      let barIndex: number | null = null;
      let time: number | null = null;
      if (logical !== null && fullCandles.length > 0) {
        const idx = Math.max(0, Math.min(fullCandles.length - 1, Math.round(Number(logical))));
        barIndex = idx;
        time = fullCandles[idx].time;
      }

      const detectedDrawing = drawingId ?? hitTestDrawingRef.current?.(localX, localY) ?? null;

      setContextMenu({
        x: clientX,
        y: clientY,
        price: resolvedPrice,
        time,
        barIndex,
        drawingId: detectedDrawing,
      });
    },
    [displayCandles, fullCandles, symbolInfo.basePrice]
  );

  const handleContainerContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = mainContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    openContextMenuAt(
      e.clientX,
      e.clientY,
      e.clientX - rect.left,
      e.clientY - rect.top,
      null
    );
  };

  const handleContainerDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = mainContainerRef.current?.getBoundingClientRect();
    if (!rect || !chartRef.current) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= chartSize.width - 74) {
      chartRef.current.priceScale('right').applyOptions({ autoScale: true });
      addToast({ title: 'Price Scale Auto-Fitted', variant: 'info' });
      return;
    }

    if (y >= chartSize.height - 28) {
      handleResetView();
      return;
    }

    setChartSettingsModalOpen(true);
  };

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = mainContainerRef.current?.getBoundingClientRect();
    if (!rect || !mainSeriesRef.current) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= chartSize.width - 68 && y >= 8 && y <= chartSize.height - 32) {
      const p = mainSeriesRef.current.coordinateToPrice(y);
      if (p !== null) {
        setPriceAxisHover({ y, price: Number(p) });
        return;
      }
    }
    setPriceAxisHover(null);
  };

  const handleDrawHLineAtPrice = (price: number, type: 'hline' | 'hray' = 'hline') => {
    const t = displayCandles[displayCandles.length - 1]?.time ?? Math.floor(Date.now() / 1000);
    addDrawing({
      id: generateId('drw'),
      symbol: pane.symbol,
      type,
      points: [{ time: t, price }],
      color: drawingColor,
      lineWidth: 1.5,
      lineStyle: 'solid',
      createdAt: Date.now(),
    });
  };

  const handleStartReplayHere = (barIndex: number, time: number) => {
    startReplayAt(pane.id, barIndex, fullCandles.length, time);
    addToast({
      title: 'Bar Replay Started',
      description: `Cut at bar #${barIndex + 1}`,
      variant: 'warning',
    });
  };

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'r' && e.shiftKey) {
        e.preventDefault();
        handleResetView();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, handleResetView]);

  const activeBar = hoveredBar ?? displayCandles[displayCandles.length - 1] ?? null;
  const lastBar = displayCandles[displayCandles.length - 1] ?? null;
  const barChange = activeBar ? activeBar.close - activeBar.open : 0;
  const barChangePct = activeBar && activeBar.open > 0 ? (barChange / activeBar.open) * 100 : 0;
  const isBull = barChange >= 0;

  const spreadStep = symbolInfo.minMove * (symbolInfo.precision >= 4 ? 2 : 3);
  const bidPrice = lastBar
    ? Math.max(symbolInfo.minMove, lastBar.close - spreadStep)
    : symbolInfo.basePrice;
  const askPrice = lastBar ? lastBar.close + spreadStep : symbolInfo.basePrice;

  const subPaneIndicators = pane.indicators.filter((i) => i.placement === 'subpane');
  const overlayIndicators = pane.indicators.filter((i) => i.placement === 'overlay');

  return (
    <div
      onMouseDown={() => {
        setActivePaneId(pane.id);
        setPlusMenuOpen(null);
      }}
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden bg-white dark:bg-[#131722]',
        isMultiPane && isActive
          ? 'ring-1 ring-inset ring-[#2962FF]'
          : isMultiPane
          ? 'ring-1 ring-inset ring-slate-200 dark:ring-[#2A2E39]'
          : ''
      )}
    >
      <div
        className="relative flex-1 min-h-0 w-full"
        onMouseEnter={() => setHoverChart(true)}
        onMouseLeave={() => {
          setHoverChart(false);
          setPriceAxisHover(null);
        }}
        onMouseMove={handleContainerMouseMove}
        onContextMenu={handleContainerContextMenu}
        onDoubleClick={handleContainerDoubleClick}
      >
        {/* Subtle Watermark */}
        {chartSettings.showWatermark && (
          <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center select-none opacity-[0.045] dark:opacity-[0.055]">
            <div className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
              {symbolInfo.displaySymbol}
            </div>
            <div className="mt-1 text-lg sm:text-2xl font-bold tracking-widest uppercase text-slate-900 dark:text-white">
              {pane.timeframe} • {symbolInfo.exchange}
            </div>
          </div>
        )}

        {/* Top-Left Inline Legend */}
        <div className="pointer-events-none absolute left-3 top-2 z-20 flex max-w-[82%] flex-col gap-1.5">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold tracking-tight text-slate-900 dark:text-[#D1D4DC]">
              {symbolInfo.displaySymbol}
            </span>
            <span className="text-[11px] font-medium text-[#787B86]">· {pane.timeframe} ·</span>
            <span className="text-[11px] font-medium text-[#787B86]">{symbolInfo.exchange}</span>

            {isThisPaneInReplay ? (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                REPLAY
              </span>
            ) : dataSource === 'binance' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#089981]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#089981]" />
                LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-400">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                SIM
              </span>
            )}

            {activeBar && (
              <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] tabular-nums">
                <span className="text-[#787B86]">
                  O
                  <span className={cn('ml-0.5', isBull ? 'text-[#089981]' : 'text-[#F23645]')}>
                    {formatPrice(activeBar.open, symbolInfo.precision)}
                  </span>
                </span>
                <span className="text-[#787B86]">
                  H
                  <span className={cn('ml-0.5', isBull ? 'text-[#089981]' : 'text-[#F23645]')}>
                    {formatPrice(activeBar.high, symbolInfo.precision)}
                  </span>
                </span>
                <span className="text-[#787B86]">
                  L
                  <span className={cn('ml-0.5', isBull ? 'text-[#089981]' : 'text-[#F23645]')}>
                    {formatPrice(activeBar.low, symbolInfo.precision)}
                  </span>
                </span>
                <span className="text-[#787B86]">
                  C
                  <span className={cn('ml-0.5', isBull ? 'text-[#089981]' : 'text-[#F23645]')}>
                    {formatPrice(activeBar.close, symbolInfo.precision)}
                  </span>
                </span>
                <span className={cn('font-semibold', isBull ? 'text-[#089981]' : 'text-[#F23645]')}>
                  {barChange >= 0 ? '+' : ''}
                  {formatPrice(barChange, symbolInfo.precision)} ({barChange >= 0 ? '+' : ''}
                  {barChangePct.toFixed(2)}%)
                </span>
                <span className="text-[#787B86]">
                  Vol{' '}
                  <span className="text-slate-700 dark:text-[#D1D4DC]">
                    {formatCompactNumber(activeBar.volume)}
                  </span>
                </span>
              </div>
            )}

            <button
              onClick={() => setChartSettingsModalOpen(true)}
              title="Chart Settings"
              className="rounded p-0.5 text-[#787B86] hover:bg-white/10 hover:text-[#D1D4DC]"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {chartSettings.showQuickTrade && lastBar && (
            <div className="pointer-events-auto inline-flex w-fit items-center overflow-hidden rounded border border-slate-200/90 bg-white/90 shadow-sm backdrop-blur dark:border-[#2A2E39] dark:bg-[#131722]/90">
              <button
                onClick={() => {
                  const q = Number(quickQty) || 0.1;
                  placeMarketOrder({
                    symbol: pane.symbol,
                    side: 'sell',
                    quantity: q,
                    price: bidPrice,
                  });
                }}
                className="flex flex-col items-start px-2.5 py-0.5 text-left transition hover:bg-[#F23645]/15"
              >
                <span className="font-mono text-[11px] font-bold leading-tight text-[#F23645] tabular-nums">
                  {formatPrice(bidPrice, symbolInfo.precision)}
                </span>
                <span className="text-[9px] font-semibold tracking-wider text-[#F23645]/80 uppercase">
                  SELL
                </span>
              </button>

              <input
                value={quickQty}
                onChange={(e) => setQuickQty(e.target.value)}
                title="Quick Order Quantity"
                className="h-full w-14 border-x border-slate-200 bg-transparent px-1 text-center font-mono text-[11px] font-semibold text-slate-900 outline-none dark:border-[#2A2E39] dark:text-[#D1D4DC]"
              />

              <button
                onClick={() => {
                  const q = Number(quickQty) || 0.1;
                  placeMarketOrder({
                    symbol: pane.symbol,
                    side: 'buy',
                    quantity: q,
                    price: askPrice,
                  });
                }}
                className="flex flex-col items-end px-2.5 py-0.5 text-right transition hover:bg-[#089981]/15"
              >
                <span className="font-mono text-[11px] font-bold leading-tight text-[#089981] tabular-nums">
                  {formatPrice(askPrice, symbolInfo.precision)}
                </span>
                <span className="text-[9px] font-semibold tracking-wider text-[#089981]/80 uppercase">
                  BUY
                </span>
              </button>
            </div>
          )}

          {overlayIndicators.length > 0 && (
            <div className="pointer-events-auto flex flex-col items-start gap-0.5">
              <button
                onClick={() => setLegendExpanded(!legendExpanded)}
                className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium text-[#787B86] hover:bg-white/5 hover:text-[#D1D4DC]"
              >
                {legendExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                <span>Indicators ({overlayIndicators.length})</span>
              </button>

              {legendExpanded &&
                overlayIndicators.map((ind) => {
                  const paramStr = Object.values(ind.params).join(', ');
                  return (
                    <div
                      key={ind.id}
                      className={cn(
                        'group flex items-center gap-2 rounded px-1.5 py-0.5 text-[11px] transition hover:bg-black/5 dark:hover:bg-white/[0.06]',
                        !ind.visible && 'opacity-45'
                      )}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: ind.color }}
                      />
                      <span className="font-medium text-slate-700 dark:text-[#D1D4DC]">
                        {ind.name}
                        {paramStr ? ` (${paramStr})` : ''}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => toggleIndicatorVisibility(pane.id, ind.id)}
                          className="text-[#787B86] hover:text-white"
                        >
                          {ind.visible ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          onClick={() => removeIndicator(pane.id, ind.id)}
                          className="text-[#787B86] hover:text-rose-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {isActive && <FloatingDrawingToolbar symbol={pane.symbol} />}

        {isThisPaneInReplay && replay.isSelectingStart && (
          <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-xs font-medium text-amber-300 shadow-lg backdrop-blur-md">
              <Scissors className="h-3.5 w-3.5" />
              <span>Click any candle on the chart to cut history & start Bar Replay here</span>
            </div>
          </div>
        )}

        {chartSettings.showCountdown && lastBar && lastPriceY !== null && !isThisPaneInReplay && (
          <div
            style={{
              top: Math.max(18, Math.min(chartSize.height - 46, lastPriceY + 11)),
            }}
            className={cn(
              'pointer-events-none absolute right-[4px] z-20 rounded px-1.5 py-[1px] font-mono text-[10px] font-bold text-white shadow-sm tabular-nums',
              lastBar.close >= lastBar.open ? 'bg-[#089981]' : 'bg-[#F23645]'
            )}
          >
            {countdownText}
          </div>
        )}

        {priceAxisHover && !plusMenuOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPlusMenuOpen(priceAxisHover);
            }}
            style={{
              top: Math.max(8, Math.min(chartSize.height - 40, priceAxisHover.y - 10)),
            }}
            title={`Quick Action @ ${formatPrice(priceAxisHover.price, symbolInfo.precision)}`}
            className="absolute right-[72px] z-20 flex h-5 w-5 items-center justify-center rounded bg-[#2962FF] text-white shadow-md transition hover:scale-110"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}

        {plusMenuOpen && (
          <div
            style={{
              top: Math.max(8, Math.min(chartSize.height - 170, plusMenuOpen.y - 16)),
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-[76px] z-40 w-52 rounded-lg border border-slate-200 bg-white py-1 text-xs shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D] dark:text-[#D1D4DC]"
          >
            <div className="border-b border-slate-200 px-3 py-1 font-mono text-[10px] font-bold text-[#2962FF] dark:border-[#2A2E39]">
              @ {formatPrice(plusMenuOpen.price, symbolInfo.precision)}
            </div>
            <button
              onClick={() => {
                const px = Number(plusMenuOpen.price.toFixed(symbolInfo.precision));
                const live = lastBar?.close ?? symbolInfo.basePrice;
                addAlert({
                  symbol: pane.symbol,
                  price: px,
                  condition: px >= live ? 'crossing_up' : 'crossing_down',
                  note: 'Quick price axis alert',
                });
                addToast({
                  title: `Alert Created @ ${formatPrice(px, symbolInfo.precision)}`,
                  variant: 'warning',
                });
                setPlusMenuOpen(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
            >
              <Bell className="h-3.5 w-3.5 text-amber-400" />
              <span>Add Alert</span>
            </button>
            <button
              onClick={() => {
                handleDrawHLineAtPrice(
                  Number(plusMenuOpen.price.toFixed(symbolInfo.precision)),
                  'hline'
                );
                setPlusMenuOpen(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
            >
              <Minus className="h-3.5 w-3.5 text-[#00D4AA]" />
              <span>Horizontal Line</span>
            </button>
            <button
              onClick={() => {
                handleDrawHLineAtPrice(
                  Number(plusMenuOpen.price.toFixed(symbolInfo.precision)),
                  'hray'
                );
                setPlusMenuOpen(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#2A2E39]"
            >
              <MoveRight className="h-3.5 w-3.5 text-[#00D4AA]" />
              <span>Horizontal Ray</span>
            </button>
            <button
              onClick={() => {
                const px = Number(plusMenuOpen.price.toFixed(symbolInfo.precision));
                const qty =
                  symbolInfo.category === 'Crypto' ? 0.25 : symbolInfo.category === 'IDX' ? 1000 : 10;
                placeLimitOrder({
                  symbol: pane.symbol,
                  side: 'buy',
                  quantity: qty,
                  limitPrice: px,
                });
                setPlusMenuOpen(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-[#089981] hover:bg-[#089981]/10"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Place Buy Limit</span>
            </button>
            <button
              onClick={() => {
                const px = Number(plusMenuOpen.price.toFixed(symbolInfo.precision));
                const qty =
                  symbolInfo.category === 'Crypto' ? 0.25 : symbolInfo.category === 'IDX' ? 1000 : 10;
                placeLimitOrder({
                  symbol: pane.symbol,
                  side: 'sell',
                  quantity: qty,
                  limitPrice: px,
                });
                setPlusMenuOpen(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-[#F23645] hover:bg-[#F23645]/10"
            >
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Place Sell Limit</span>
            </button>
          </div>
        )}

        <div
          className={cn(
            'pointer-events-auto absolute bottom-9 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-slate-200/80 bg-white/90 px-1.5 py-1 shadow-lg backdrop-blur transition-opacity duration-200 dark:border-[#2A2E39] dark:bg-[#1E222D]/92',
            hoverChart || scrolledAway ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          <button
            onClick={() => handleZoom(1.35)}
            title="Zoom Out"
            className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleZoom(0.74)}
            title="Zoom In"
            className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <div className="h-3.5 w-px bg-slate-200 dark:bg-[#2A2E39]" />
          <button
            onClick={() => handlePan(-20)}
            title="Scroll Left"
            className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handlePan(20)}
            title="Scroll Right"
            className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <div className="h-3.5 w-px bg-slate-200 dark:bg-[#2A2E39]" />
          <button
            onClick={handleResetView}
            title="Reset Chart View (Alt+Shift+R)"
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
          {scrolledAway && (
            <button
              onClick={handleResetView}
              title="Jump to Latest Candle"
              className="flex items-center gap-0.5 rounded bg-[#2962FF] px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-blue-500"
            >
              <ChevronsRight className="h-3 w-3" />
              <span>Latest</span>
            </button>
          )}
        </div>

        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#131722]/70 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 rounded-lg border border-[#2A2E39] bg-[#1E222D] px-4 py-2.5 text-xs text-[#D1D4DC] shadow-xl">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2962FF] border-t-transparent" />
              <span>
                Loading {symbolInfo.displaySymbol} ({pane.timeframe})...
              </span>
            </div>
          </div>
        )}

        <div ref={mainContainerRef} className="h-full w-full" />

        <DrawingOverlay
          chart={chartRef.current}
          series={mainSeriesRef.current}
          candles={displayCandles}
          symbol={pane.symbol}
          timeframe={pane.timeframe}
          precision={symbolInfo.precision}
          width={chartSize.width}
          height={chartSize.height}
          theme={theme}
          onCanvasReady={(c) => {
            drawingCanvasRef.current = c;
          }}
          onHitTestExpose={(fn) => {
            hitTestDrawingRef.current = fn;
          }}
          onRequestContextMenu={openContextMenuAt}
        />
      </div>

      {subPaneIndicators.map((ind) => (
        <SubPaneChart
          key={ind.id}
          indicator={ind}
          candles={displayCandles}
          theme={theme}
          bgColorDark={chartSettings.bgColorDark || '#131722'}
          mainChart={chartRef.current}
          onToggleVisibility={() => toggleIndicatorVisibility(pane.id, ind.id)}
          onRemove={() => removeIndicator(pane.id, ind.id)}
        />
      ))}

      {/* Bottom Chart Range Presets + Live Timezone Clock + Scale Controls */}
      <div className="flex h-7 w-full shrink-0 items-center justify-between border-t border-slate-200 bg-white px-2.5 text-[11px] dark:border-[#2A2E39] dark:bg-[#131722]">
        <div className="flex items-center gap-0.5">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                updatePaneTimeframe(pane.id, preset.tf);
                window.setTimeout(() => {
                  chartRef.current?.timeScale().fitContent();
                }, 250);
              }}
              className={cn(
                'rounded px-1.5 py-0.5 font-medium transition',
                pane.timeframe === preset.tf
                  ? 'text-[#2962FF] font-bold bg-[#2962FF]/10'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-[#787B86] dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <button
            onClick={() => setChartSettingsModalOpen(true)}
            title="Click to configure Timezone"
            className="hidden sm:inline text-slate-500 hover:text-slate-900 dark:text-[#787B86] dark:hover:text-[#D1D4DC] tabular-nums"
          >
            {clockText}
          </button>

          <div className="h-3 w-px bg-slate-200 dark:bg-[#2A2E39]" />

          <button
            onClick={() =>
              updatePaneScaleMode(
                pane.id,
                pane.scaleMode === 'percentage' ? 'normal' : 'percentage'
              )
            }
            className={cn(
              'rounded px-1 py-0.5 text-[10px] font-semibold transition',
              pane.scaleMode === 'percentage'
                ? 'text-[#2962FF]'
                : 'text-[#787B86] hover:text-[#D1D4DC]'
            )}
          >
            %
          </button>
          <button
            onClick={() =>
              updatePaneScaleMode(
                pane.id,
                pane.scaleMode === 'logarithmic' ? 'normal' : 'logarithmic'
              )
            }
            className={cn(
              'rounded px-1 py-0.5 text-[10px] font-semibold transition',
              pane.scaleMode === 'logarithmic'
                ? 'text-[#2962FF]'
                : 'text-[#787B86] hover:text-[#D1D4DC]'
            )}
          >
            log
          </button>
          <button
            onClick={handleResetView}
            className="rounded px-1 py-0.5 text-[10px] font-semibold text-[#2962FF] hover:bg-[#2962FF]/10"
          >
            auto
          </button>
        </div>
      </div>

      <ChartContextMenu
        menu={contextMenu}
        paneId={pane.id}
        symbol={pane.symbol}
        currentStyle={pane.chartStyle}
        currentScale={pane.scaleMode}
        onClose={() => setContextMenu(null)}
        onResetView={handleResetView}
        onFitContent={handleFitContent}
        onDrawHLineAtPrice={handleDrawHLineAtPrice}
        onStartReplayHere={handleStartReplayHere}
      />
    </div>
  );
};
