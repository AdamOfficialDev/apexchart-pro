import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IChartApi, ISeriesApi, Logical } from 'lightweight-charts';
import {
  DEFAULT_FIB_EXT_LEVELS,
  DEFAULT_FIB_RETRACE_LEVELS,
  DRAWING_TOOLS_CATALOG,
  isVisibleOnTimeframeGroup,
  TIMEFRAME_MAP,
} from '@/data/symbols';
import { formatCompactNumber, formatPrice, generateId } from '@/lib/utils';
import {
  computeLinearRegression,
  computeMarketStructure,
  computeVPVR,
} from '@/services/smartAnalysis';
import { useTradingStore } from '@/store/useTradingStore';
import { Candle, DrawingObject, DrawingPoint, DrawingToolType, TimeframeId } from '@/types/trading';

interface DrawingOverlayProps {
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick' | 'Bar' | 'Line' | 'Area'> | null;
  candles: Candle[];
  symbol: string;
  timeframe: TimeframeId;
  precision: number;
  width: number;
  height: number;
  theme: 'dark' | 'light';
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  onHitTestExpose?: (fn: (x: number, y: number) => string | null) => void;
  onRequestContextMenu?: (
    clientX: number,
    clientY: number,
    localX: number,
    localY: number,
    drawingId: string | null
  ) => void;
}

interface ScreenPoint {
  x: number;
  y: number;
}

const FIB_TIME_NUMS = [0, 1, 2, 3, 5, 8, 13, 21, 34];

function hexWithOpacity(hex: string, opacityPct: number): string {
  const alpha = Math.max(0, Math.min(1, opacityPct / 100));
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }
  return hex;
}

function distToSegment(p: ScreenPoint, a: ScreenPoint, b: ScreenPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  from: ScreenPoint,
  to: ScreenPoint,
  size = 10
) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - size * Math.cos(angle - Math.PI / 7),
    to.y - size * Math.sin(angle - Math.PI / 7)
  );
  ctx.lineTo(
    to.x - size * Math.cos(angle + Math.PI / 7),
    to.y - size * Math.sin(angle + Math.PI / 7)
  );
  ctx.closePath();
  ctx.fill();
}

export const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  chart,
  series,
  candles,
  symbol,
  timeframe,
  precision,
  width,
  height,
  theme,
  onCanvasReady,
  onHitTestExpose,
  onRequestContextMenu,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeTool = useTradingStore((s) => s.activeDrawingTool);
  const setActiveTool = useTradingStore((s) => s.setActiveDrawingTool);
  const drawingColor = useTradingStore((s) => s.drawingColor);
  const drawingLineWidth = useTradingStore((s) => s.drawingLineWidth);
  const drawingLineStyle = useTradingStore((s) => s.drawingLineStyle);
  const stayInDrawingMode = useTradingStore((s) => s.stayInDrawingMode);
  const magnetMode = useTradingStore((s) => s.magnetMode);
  const drawingsLocked = useTradingStore((s) => s.drawingsLocked);
  const drawingsVisible = useTradingStore((s) => s.drawingsVisible);
  const selectedDrawingId = useTradingStore((s) => s.selectedDrawingId);
  const setSelectedDrawingId = useTradingStore((s) => s.setSelectedDrawingId);
  const setEditingDrawingId = useTradingStore((s) => s.setEditingDrawingId);
  const drawingsBySymbol = useTradingStore((s) => s.drawingsBySymbol);
  const addDrawing = useTradingStore((s) => s.addDrawing);
  const updateDrawing = useTradingStore((s) => s.updateDrawing);
  const removeDrawing = useTradingStore((s) => s.removeDrawing);
  const smartOverlays = useTradingStore((s) => s.smartOverlays);
  const chartSettings = useTradingStore((s) => s.chartSettings);

  const tfMeta = TIMEFRAME_MAP[timeframe];
  const tfSec = tfMeta.seconds;

  const symbolDrawings = useMemo(
    () =>
      (drawingsBySymbol[symbol] ?? []).filter((d) =>
        isVisibleOnTimeframeGroup(d.visibility, tfMeta.group)
      ),
    [drawingsBySymbol, symbol, tfMeta.group]
  );

  const vpvrData = useMemo(() => {
    if (!smartOverlays.showVPVR || candles.length < 15) return null;
    return computeVPVR(candles.slice(-220), 42);
  }, [smartOverlays.showVPVR, candles]);

  const structureData = useMemo(() => {
    const needsStructure =
      smartOverlays.showMarketStructure ||
      smartOverlays.showFVG ||
      smartOverlays.showAutoSR ||
      smartOverlays.showAutoTrendlines;
    if (!needsStructure || candles.length < 24) return null;
    return computeMarketStructure(candles);
  }, [
    smartOverlays.showMarketStructure,
    smartOverlays.showFVG,
    smartOverlays.showAutoSR,
    smartOverlays.showAutoTrendlines,
    candles,
  ]);

  const [draftPoints, setDraftPoints] = useState<DrawingPoint[]>([]);
  const [cursorPoint, setCursorPoint] = useState<DrawingPoint | null>(null);
  const [rulerStart, setRulerStart] = useState<DrawingPoint | null>(null);
  const [rulerEnd, setRulerEnd] = useState<DrawingPoint | null>(null);
  const [textDraft, setTextDraft] = useState<{
    x: number;
    y: number;
    points: DrawingPoint[];
    kind: 'text' | 'callout';
    editingId?: string;
  } | null>(null);
  const [textValue, setTextValue] = useState('');
  const [isBrushing, setIsBrushing] = useState(false);
  const brushPointsRef = useRef<DrawingPoint[]>([]);

  const [hoverInteractive, setHoverInteractive] = useState(false);
  const dragStateRef = useRef<{
    drawingId: string;
    mode: 'point' | 'move';
    pointIndex: number;
    startPointer: DrawingPoint;
    originalPoints: DrawingPoint[];
  } | null>(null);

  useEffect(() => {
    onCanvasReady?.(canvasRef.current);
  }, [onCanvasReady]);

  useEffect(() => {
    setDraftPoints([]);
    setCursorPoint(null);
    setRulerStart(null);
    setRulerEnd(null);
    setIsBrushing(false);
    brushPointsRef.current = [];
  }, [activeTool, symbol]);

  const timeToX = useCallback(
    (time: number): number | null => {
      if (!chart || candles.length === 0) return null;
      const first = candles[0].time;
      const last = candles[candles.length - 1].time;

      let logical: number;
      if (time <= first) {
        logical = (time - first) / tfSec;
      } else if (time >= last) {
        logical = candles.length - 1 + (time - last) / tfSec;
      } else {
        let lo = 0;
        let hi = candles.length - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (candles[mid].time === time) {
            const coord = chart.timeScale().logicalToCoordinate(mid as Logical);
            return coord !== null ? Number(coord) : null;
          }
          if (candles[mid].time < time) lo = mid + 1;
          else hi = mid - 1;
        }
        const i0 = Math.max(0, hi);
        const i1 = Math.min(candles.length - 1, lo);
        const span = candles[i1].time - candles[i0].time;
        logical = span > 0 ? i0 + (time - candles[i0].time) / span : i0;
      }

      const coord = chart.timeScale().logicalToCoordinate(logical as Logical);
      return coord !== null ? Number(coord) : null;
    },
    [chart, candles, tfSec]
  );

  const priceToY = useCallback(
    (price: number): number | null => {
      if (!series) return null;
      const coord = series.priceToCoordinate(price);
      return coord !== null ? Number(coord) : null;
    },
    [series]
  );

  const screenToData = useCallback(
    (x: number, y: number, applyMagnet = true): DrawingPoint | null => {
      if (!chart || !series || candles.length === 0) return null;
      const logical = chart.timeScale().coordinateToLogical(x);
      const price = series.coordinateToPrice(y);
      if (logical === null || price === null) return null;

      const idx = Number(logical);
      let time: number;
      if (idx <= 0) {
        time = candles[0].time + Math.round(idx) * tfSec;
      } else if (idx >= candles.length - 1) {
        time = candles[candles.length - 1].time + Math.round(idx - (candles.length - 1)) * tfSec;
      } else {
        const i0 = Math.floor(idx);
        const i1 = Math.min(candles.length - 1, i0 + 1);
        const frac = idx - i0;
        time = Math.round(candles[i0].time + frac * (candles[i1].time - candles[i0].time));
      }

      let snappedPrice = Number(price);
      if (applyMagnet && magnetMode) {
        const nearestIdx = Math.max(0, Math.min(candles.length - 1, Math.round(idx)));
        const c = candles[nearestIdx];
        if (c) {
          time = c.time;
          const ohlc = [c.open, c.high, c.low, c.close];
          let bestDist = Infinity;
          for (const candidate of ohlc) {
            const cy = series.priceToCoordinate(candidate);
            if (cy !== null) {
              const d = Math.abs(Number(cy) - y);
              if (d < bestDist && d < 36) {
                bestDist = d;
                snappedPrice = candidate;
              }
            }
          }
        }
      }

      return { time, price: snappedPrice };
    },
    [chart, series, candles, tfSec, magnetMode]
  );

  const toScreen = useCallback(
    (pt: DrawingPoint): ScreenPoint | null => {
      const x = timeToX(pt.time);
      const y = priceToY(pt.price);
      if (x === null || y === null) return null;
      return { x, y };
    },
    [timeToX, priceToY]
  );

  const hitTestDrawings = useCallback(
    (
      sx: number,
      sy: number,
      ignoreGlobalLock = false
    ): { id: string; mode: 'point' | 'move'; pointIndex: number } | null => {
      if (!drawingsVisible || (!ignoreGlobalLock && drawingsLocked)) return null;
      const p = { x: sx, y: sy };

      for (let i = symbolDrawings.length - 1; i >= 0; i--) {
        const d = symbolDrawings[i];
        if (d.visible === false) continue;
        if (!ignoreGlobalLock && d.locked) continue;

        const screenPts = d.points.map(toScreen);
        if (screenPts.some((sp) => sp === null)) continue;
        const pts = screenPts as ScreenPoint[];

        for (let pi = 0; pi < pts.length; pi++) {
          if (Math.hypot(p.x - pts[pi].x, p.y - pts[pi].y) <= 9) {
            return { id: d.id, mode: 'point', pointIndex: pi };
          }
        }

        if (d.type === 'hline' && pts[0]) {
          if (Math.abs(p.y - pts[0].y) <= 7) return { id: d.id, mode: 'move', pointIndex: 0 };
        } else if (d.type === 'hray' && pts[0]) {
          if (p.x >= pts[0].x - 6 && Math.abs(p.y - pts[0].y) <= 7) {
            return { id: d.id, mode: 'move', pointIndex: 0 };
          }
        } else if (d.type === 'vline' && pts[0]) {
          if (Math.abs(p.x - pts[0].x) <= 7) return { id: d.id, mode: 'move', pointIndex: 0 };
        } else if (d.type === 'cross_line' && pts[0]) {
          if (Math.abs(p.x - pts[0].x) <= 7 || Math.abs(p.y - pts[0].y) <= 7) {
            return { id: d.id, mode: 'move', pointIndex: 0 };
          }
        } else if (d.type === 'price_label' && pts[0]) {
          if (p.x >= pts[0].x - 10 && p.x <= pts[0].x + 110 && Math.abs(p.y - pts[0].y) <= 14) {
            return { id: d.id, mode: 'move', pointIndex: 0 };
          }
        } else if (d.type === 'text' && pts[0]) {
          if (p.x >= pts[0].x - 8 && p.x <= pts[0].x + 150 && p.y >= pts[0].y - 20 && p.y <= pts[0].y + 10) {
            return { id: d.id, mode: 'move', pointIndex: 0 };
          }
        } else if (d.type === 'ray' && pts.length >= 2) {
          const dx = pts[1].x - pts[0].x;
          const dy = pts[1].y - pts[0].y;
          const scale = Math.max(width, height) * 2;
          const len = Math.hypot(dx, dy) || 1;
          const farPt = { x: pts[0].x + (dx / len) * scale, y: pts[0].y + (dy / len) * scale };
          if (distToSegment(p, pts[0], farPt) <= 7) return { id: d.id, mode: 'move', pointIndex: 0 };
        } else if ((d.type === 'extended_line' || d.extendLeft || d.extendRight) && pts.length >= 2) {
          const dx = pts[1].x - pts[0].x;
          const dy = pts[1].y - pts[0].y;
          const scale = Math.max(width, height) * 2;
          const len = Math.hypot(dx, dy) || 1;
          const pA =
            d.type === 'extended_line' || d.extendLeft
              ? { x: pts[0].x - (dx / len) * scale, y: pts[0].y - (dy / len) * scale }
              : pts[0];
          const pB =
            d.type === 'extended_line' || d.extendRight
              ? { x: pts[0].x + (dx / len) * scale, y: pts[0].y + (dy / len) * scale }
              : pts[1];
          if (distToSegment(p, pA, pB) <= 7) return { id: d.id, mode: 'move', pointIndex: 0 };
        } else if (
          (d.type === 'rect' ||
            d.type === 'fib' ||
            d.type === 'gann_box' ||
            d.type === 'date_price_range' ||
            d.type === 'ellipse' ||
            d.type === 'regression_channel' ||
            d.type === 'fib_timezone' ||
            d.type === 'fib_fan' ||
            d.type === 'fib_arc') &&
          pts.length >= 2
        ) {
          const minX = Math.min(pts[0].x, pts[1].x);
          const maxX = Math.max(pts[0].x, pts[1].x);
          const minY = Math.min(pts[0].y, pts[1].y);
          const maxY = Math.max(pts[0].y, pts[1].y);
          if (p.x >= minX - 8 && p.x <= maxX + 8 && p.y >= minY - 8 && p.y <= maxY + 8) {
            return { id: d.id, mode: 'move', pointIndex: 0 };
          }
        } else if ((d.type === 'long_pos' || d.type === 'short_pos') && pts.length >= 3) {
          const minX = Math.min(pts[0].x, pts[1].x);
          const maxX = Math.max(pts[0].x, pts[1].x);
          const minY = Math.min(pts[0].y, pts[1].y, pts[2].y);
          const maxY = Math.max(pts[0].y, pts[1].y, pts[2].y);
          if (p.x >= minX - 6 && p.x <= maxX + 6 && p.y >= minY - 6 && p.y <= maxY + 6) {
            return { id: d.id, mode: 'move', pointIndex: 0 };
          }
        } else if (pts.length >= 2) {
          for (let j = 0; j < pts.length - 1; j++) {
            if (distToSegment(p, pts[j], pts[j + 1]) <= 8) {
              return { id: d.id, mode: 'move', pointIndex: 0 };
            }
          }
          if (d.type === 'triangle' && pts.length >= 3 && distToSegment(p, pts[2], pts[0]) <= 8) {
            return { id: d.id, mode: 'move', pointIndex: 0 };
          }
        }
      }
      return null;
    },
    [drawingsVisible, drawingsLocked, symbolDrawings, toScreen, width, height]
  );

  useEffect(() => {
    onHitTestExpose?.((x, y) => hitTestDrawings(x, y, true)?.id ?? null);
  }, [onHitTestExpose, hitTestDrawings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!parent) return;

    const onProbeMove = (ev: MouseEvent) => {
      if (activeTool !== 'cursor' || dragStateRef.current) return;
      const rect = parent.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const hit = hitTestDrawings(x, y);
      setHoverInteractive(Boolean(hit));
    };

    parent.addEventListener('mousemove', onProbeMove);
    return () => parent.removeEventListener('mousemove', onProbeMove);
  }, [activeTool, hitTestDrawings]);

  const finishToolUsage = useCallback(() => {
    if (!stayInDrawingMode) {
      setActiveTool('cursor');
    }
  }, [stayInDrawingMode, setActiveTool]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const isLeftScale = chartSettings.priceScalePosition === 'left';
    const plotLeft = isLeftScale ? 70 : 0;
    const plotRight = isLeftScale ? width : Math.max(0, width - 70);
    const chartPlotWidth = Math.max(0, plotRight - plotLeft);

    // Smart Overlays Layer
    if (vpvrData && smartOverlays.showVPVR) {
      const maxBarW = Math.min(130, chartPlotWidth * 0.22);
      const rightEdge = plotRight - 2;
      const vahY = priceToY(vpvrData.vahPrice);
      const valY = priceToY(vpvrData.valPrice);
      const pocY = priceToY(vpvrData.pocPrice);

      if (vahY !== null && valY !== null) {
        ctx.fillStyle = 'rgba(41, 98, 255, 0.055)';
        ctx.fillRect(plotLeft, Math.min(vahY, valY), chartPlotWidth, Math.abs(valY - vahY));
      }

      for (const bin of vpvrData.bins) {
        const yTop = priceToY(bin.priceHigh);
        const yBot = priceToY(bin.priceLow);
        if (yTop === null || yBot === null) continue;
        const barH = Math.max(1.5, Math.abs(yBot - yTop) - 1);
        const y = Math.min(yTop, yBot);
        const totalW = (bin.totalVolume / Math.max(vpvrData.maxVolume, 1)) * maxBarW;
        const buyW = totalW * (bin.buyVolume / Math.max(bin.totalVolume, 1));
        const sellW = totalW - buyW;

        ctx.fillStyle = 'rgba(8, 153, 129, 0.34)';
        ctx.fillRect(rightEdge - totalW, y, buyW, barH);
        ctx.fillStyle = 'rgba(242, 54, 69, 0.34)';
        ctx.fillRect(rightEdge - sellW, y, sellW, barH);
      }

      if (pocY !== null) {
        ctx.save();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(plotLeft, pocY);
        ctx.lineTo(plotRight, pocY);
        ctx.stroke();
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#F59E0B';
        ctx.fillText(`POC ${formatPrice(vpvrData.pocPrice, precision)}`, plotLeft + 10, pocY - 4);
        ctx.restore();
      }
    }

    if (structureData) {
      if (smartOverlays.showFVG) {
        for (const fvg of structureData.fvgs) {
          const x1 = timeToX(fvg.timeStart);
          const x2 = timeToX(fvg.timeEnd);
          const y1 = priceToY(fvg.top);
          const y2 = priceToY(fvg.bottom);
          if (x1 === null || x2 === null || y1 === null || y2 === null) continue;
          const top = Math.min(y1, y2);
          const h = Math.max(2, Math.abs(y2 - y1));
          ctx.fillStyle =
            fvg.direction === 'bull' ? 'rgba(0, 212, 170, 0.12)' : 'rgba(242, 54, 69, 0.12)';
          ctx.strokeStyle =
            fvg.direction === 'bull' ? 'rgba(0, 212, 170, 0.45)' : 'rgba(242, 54, 69, 0.45)';
          ctx.lineWidth = 1;
          ctx.fillRect(x1, top, Math.max(24, x2 - x1), h);
          ctx.strokeRect(x1, top, Math.max(24, x2 - x1), h);
          ctx.font = '600 9px Inter, sans-serif';
          ctx.fillStyle = fvg.direction === 'bull' ? '#00D4AA' : '#F23645';
          ctx.fillText('FVG', x1 + 4, top + 10);
        }
      }

      if (smartOverlays.showAutoSR) {
        ctx.save();
        for (const lvl of structureData.srLevels) {
          const y = priceToY(lvl.price);
          if (y === null) continue;
          const col = lvl.kind === 'support' ? '#089981' : '#F23645';
          ctx.strokeStyle = `${col}88`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.moveTo(plotLeft, y);
          ctx.lineTo(plotRight, y);
          ctx.stroke();
          ctx.font = '600 9px "JetBrains Mono", monospace';
          ctx.fillStyle = col;
          ctx.fillText(
            `${lvl.kind === 'support' ? 'SUP' : 'RES'} ${formatPrice(lvl.price, precision)}`,
            plotRight - 135,
            y - 3
          );
        }
        ctx.restore();
      }

      if (smartOverlays.showAutoTrendlines) {
        ctx.save();
        for (const tl of structureData.trendlines) {
          const p1 = toScreen({ time: tl.t1, price: tl.p1 });
          const p2 = toScreen({ time: tl.t2, price: tl.p2 });
          if (!p1 || !p2) continue;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy) || 1;
          ctx.strokeStyle = tl.kind === 'support' ? '#00D4AA' : '#F59E0B';
          ctx.lineWidth = 1.4;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p1.x + (dx / len) * (width * 0.9), p1.y + (dy / len) * (width * 0.9));
          ctx.stroke();
        }
        ctx.restore();
      }

      if (smartOverlays.showMarketStructure) {
        ctx.save();
        for (const br of structureData.breaks) {
          const x1 = timeToX(br.timeStart);
          const x2 = timeToX(br.timeEnd);
          const y = priceToY(br.price);
          if (x1 === null || x2 === null || y === null) continue;
          const col = br.direction === 'bull' ? '#089981' : '#F23645';
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.25;
          ctx.setLineDash(br.type === 'BOS' ? [4, 3] : []);
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
          ctx.font = '700 9px Inter, sans-serif';
          ctx.fillStyle = col;
          ctx.fillText(br.type, (x1 + x2) / 2 - 10, br.direction === 'bull' ? y - 3 : y + 10);
        }

        for (const pv of structureData.pivots) {
          const sp = toScreen({ time: pv.time, price: pv.price });
          if (!sp) continue;
          const isHigh = pv.kind === 'high';
          ctx.font = '700 9px "JetBrains Mono", monospace';
          ctx.fillStyle = pv.label === 'HH' || pv.label === 'HL' ? '#00D4AA' : '#F23645';
          ctx.fillText(pv.label, sp.x - 8, isHigh ? sp.y - 6 : sp.y + 12);
        }
        ctx.restore();
      }
    }

    const drawSingle = (
      type: Exclude<DrawingToolType, 'cursor' | 'eraser'>,
      ptsData: DrawingPoint[],
      color: string,
      lineWidth: number,
      lineStyle: 'solid' | 'dashed' | 'dotted',
      isSelected: boolean,
      obj?: Partial<DrawingObject>
    ) => {
      const screenPts = ptsData.map(toScreen);
      if (screenPts.some((s) => s === null)) return;
      const pts = screenPts as ScreenPoint[];

      const strokeOp = obj?.opacity ?? 100;
      const strokeCol = hexWithOpacity(color, strokeOp);
      const fillBase = obj?.fillColor ?? color;
      const fillOp = obj?.showFill === false ? 0 : obj?.fillOpacity ?? 15;
      const fillCol = hexWithOpacity(fillBase, fillOp);
      const fontSpec = `${obj?.fontItalic ? 'italic ' : ''}${
        obj?.fontBold ? '700 ' : '600 '
      }${obj?.fontSize ?? 11}px Inter, sans-serif`;
      const txtCol = obj?.textColor ?? color;

      ctx.save();
      ctx.strokeStyle = strokeCol;
      ctx.fillStyle = strokeCol;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (lineStyle === 'dashed') ctx.setLineDash([7, 5]);
      else if (lineStyle === 'dotted') ctx.setLineDash([2, 4]);
      else ctx.setLineDash([]);

      if ((type === 'trendline' || type === 'info_line') && pts.length >= 2) {
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const len = Math.hypot(dx, dy) || 1;
        const scale = Math.max(width, height) * 2.5;
        const pStart = obj?.extendLeft
          ? { x: pts[0].x - (dx / len) * scale, y: pts[0].y - (dy / len) * scale }
          : pts[0];
        const pEnd = obj?.extendRight
          ? { x: pts[1].x + (dx / len) * scale, y: pts[1].y + (dy / len) * scale }
          : pts[1];

        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();

        if (obj?.text) {
          ctx.setLineDash([]);
          ctx.font = fontSpec;
          ctx.fillStyle = txtCol;
          const mx =
            obj.textAlign === 'left'
              ? pts[0].x + 6
              : obj.textAlign === 'right'
              ? pts[1].x - ctx.measureText(obj.text).width - 6
              : (pts[0].x + pts[1].x) / 2 - ctx.measureText(obj.text).width / 2;
          ctx.fillText(obj.text, mx, (pts[0].y + pts[1].y) / 2 - 6);
        }

        if (isSelected || type === 'info_line' || obj?.showStats) {
          ctx.setLineDash([]);
          const diff = ptsData[1].price - ptsData[0].price;
          const pct = (diff / Math.max(ptsData[0].price, 1e-9)) * 100;
          const bars = Math.round(Math.abs(ptsData[1].time - ptsData[0].time) / tfSec);
          const angle = Math.round(
            (-Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * 180) / Math.PI
          );
          const label =
            type === 'info_line' || obj?.showStats
              ? `${diff >= 0 ? '+' : ''}${formatPrice(diff, precision)} (${
                  pct >= 0 ? '+' : ''
                }${pct.toFixed(2)}%) • ${bars}b • ${angle}°`
              : `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;

          ctx.font = '600 10px "JetBrains Mono", monospace';
          const tw = ctx.measureText(label).width + 12;
          const lx = (pts[0].x + pts[1].x) / 2 - tw / 2;
          const ly = (pts[0].y + pts[1].y) / 2 - 24;
          ctx.fillStyle = theme === 'dark' ? 'rgba(19,23,34,0.92)' : 'rgba(255,255,255,0.94)';
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(lx, ly, tw, 18, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.fillText(label, lx + 6, ly + 12.5);
        }
      } else if (type === 'ray' && pts.length >= 2) {
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const len = Math.hypot(dx, dy) || 1;
        const scale = Math.max(width, height) * 2.5;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[0].x + (dx / len) * scale, pts[0].y + (dy / len) * scale);
        ctx.stroke();
      } else if (type === 'extended_line' && pts.length >= 2) {
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const len = Math.hypot(dx, dy) || 1;
        const scale = Math.max(width, height) * 2.5;
        ctx.beginPath();
        ctx.moveTo(pts[0].x - (dx / len) * scale, pts[0].y - (dy / len) * scale);
        ctx.lineTo(pts[0].x + (dx / len) * scale, pts[0].y + (dy / len) * scale);
        ctx.stroke();
      } else if ((type === 'hline' || type === 'hray') && pts.length >= 1) {
        const startX = type === 'hray' ? pts[0].x : 0;
        ctx.beginPath();
        ctx.moveTo(startX, pts[0].y);
        ctx.lineTo(width, pts[0].y);
        ctx.stroke();
        ctx.setLineDash([]);

        if (obj?.text) {
          ctx.font = fontSpec;
          ctx.fillStyle = txtCol;
          ctx.fillText(obj.text, Math.max(plotLeft + 12, startX + 12), pts[0].y - 6);
        }

        const priceLabel = formatPrice(ptsData[0].price, precision);
        ctx.font = '600 10px "JetBrains Mono", monospace';
        const tw = ctx.measureText(priceLabel).width + 12;
        ctx.fillStyle = color;
        const tagX = isLeftScale ? 4 : width - tw - 4;
        ctx.fillRect(tagX, pts[0].y - 9, tw, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(priceLabel, tagX + 6, pts[0].y + 3.5);
      } else if (type === 'vline' && pts.length >= 1) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, 0);
        ctx.lineTo(pts[0].x, height);
        ctx.stroke();
        if (obj?.text) {
          ctx.setLineDash([]);
          ctx.font = fontSpec;
          ctx.fillStyle = txtCol;
          ctx.fillText(obj.text, pts[0].x + 6, 36);
        }
      } else if (type === 'cross_line' && pts.length >= 1) {
        ctx.beginPath();
        ctx.moveTo(0, pts[0].y);
        ctx.lineTo(width, pts[0].y);
        ctx.moveTo(pts[0].x, 0);
        ctx.lineTo(pts[0].x, height);
        ctx.stroke();
      } else if (type === 'channel' && pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
        if (pts.length >= 3) {
          const ox = pts[2].x - pts[0].x;
          const oy = pts[2].y - pts[0].y;
          const p3 = { x: pts[1].x + ox, y: pts[1].y + oy };
          ctx.beginPath();
          ctx.moveTo(pts[2].x, pts[2].y);
          ctx.lineTo(p3.x, p3.y);
          ctx.stroke();

          ctx.fillStyle = fillCol;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(pts[2].x, pts[2].y);
          ctx.closePath();
          ctx.fill();

          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo((pts[0].x + pts[2].x) / 2, (pts[0].y + pts[2].y) / 2);
          ctx.lineTo((pts[1].x + p3.x) / 2, (pts[1].y + p3.y) / 2);
          ctx.stroke();
        }
      } else if (type === 'regression_channel' && pts.length >= 2) {
        const reg = computeLinearRegression(candles, ptsData[0].time, ptsData[1].time);
        if (reg) {
          const m0 = toScreen({ time: reg.startTime, price: reg.midStart });
          const m1 = toScreen({ time: reg.endTime, price: reg.midEnd });
          const u0 = toScreen({ time: reg.startTime, price: reg.upperStart });
          const u1 = toScreen({ time: reg.endTime, price: reg.upperEnd });
          const l0 = toScreen({ time: reg.startTime, price: reg.lowerStart });
          const l1 = toScreen({ time: reg.endTime, price: reg.lowerEnd });
          if (m0 && m1 && u0 && u1 && l0 && l1) {
            ctx.fillStyle = fillCol;
            ctx.beginPath();
            ctx.moveTo(u0.x, u0.y);
            ctx.lineTo(u1.x, u1.y);
            ctx.lineTo(l1.x, l1.y);
            ctx.lineTo(l0.x, l0.y);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(u0.x, u0.y);
            ctx.lineTo(u1.x, u1.y);
            ctx.moveTo(l0.x, l0.y);
            ctx.lineTo(l1.x, l1.y);
            ctx.stroke();

            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(m0.x, m0.y);
            ctx.lineTo(m1.x, m1.y);
            ctx.stroke();
          }
        }
      } else if (type === 'fib' && pts.length >= 2) {
        const minX = Math.min(pts[0].x, pts[1].x);
        const maxX = Math.max(pts[0].x, pts[1].x);
        const spanW = Math.max(maxX - minX, 95);
        const pStart = obj?.fibReverse ? ptsData[1].price : ptsData[0].price;
        const pEnd = obj?.fibReverse ? ptsData[0].price : ptsData[1].price;
        const priceSpan = pEnd - pStart;

        const levels = (obj?.fibLevels ?? DEFAULT_FIB_RETRACE_LEVELS).filter((l) => l.enabled);
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(120,123,134,0.6)';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
        ctx.setLineDash([]);

        for (let i = 0; i < levels.length; i++) {
          const lvl = levels[i];
          const lvlPrice = pEnd - priceSpan * lvl.level;
          const yCoord = priceToY(lvlPrice);
          if (yCoord === null) continue;

          if (i < levels.length - 1) {
            const nextPrice = pEnd - priceSpan * levels[i + 1].level;
            const nextY = priceToY(nextPrice);
            if (nextY !== null) {
              ctx.fillStyle = hexWithOpacity(lvl.color, 7);
              ctx.fillRect(minX, Math.min(yCoord, nextY), spanW, Math.abs(nextY - yCoord));
            }
          }

          ctx.strokeStyle = lvl.color;
          ctx.lineWidth = Math.max(1, lineWidth * 0.75);
          ctx.beginPath();
          ctx.moveTo(minX, yCoord);
          ctx.lineTo(minX + spanW, yCoord);
          ctx.stroke();

          ctx.fillStyle = lvl.color;
          ctx.font = '600 10px "JetBrains Mono", monospace';
          const levelLabel = obj?.fibShowPercents
            ? `${(lvl.level * 100).toFixed(1)}%`
            : String(lvl.level);
          const textLabel =
            obj?.fibShowPrices === false
              ? levelLabel
              : `${levelLabel} (${formatPrice(lvlPrice, precision)})`;
          ctx.fillText(textLabel, minX + 6, yCoord - 3);
        }
      } else if (type === 'fib_ext' && pts.length >= 2) {
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        if (pts.length >= 3) ctx.lineTo(pts[2].x, pts[2].y);
        ctx.stroke();
        ctx.setLineDash([]);

        if (pts.length >= 3) {
          const impulse = ptsData[1].price - ptsData[0].price;
          const startX = pts[2].x;
          const spanW = Math.max(120, Math.abs(pts[2].x - pts[0].x));
          const levels = (obj?.fibLevels ?? DEFAULT_FIB_EXT_LEVELS).filter((l) => l.enabled);
          for (const lvl of levels) {
            const extPrice = ptsData[2].price + impulse * lvl.level;
            const yCoord = priceToY(extPrice);
            if (yCoord === null) continue;
            ctx.strokeStyle = lvl.color;
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            ctx.moveTo(startX, yCoord);
            ctx.lineTo(startX + spanW, yCoord);
            ctx.stroke();
            ctx.fillStyle = lvl.color;
            ctx.font = '600 10px "JetBrains Mono", monospace';
            const label =
              obj?.fibShowPrices === false
                ? String(lvl.level)
                : `${lvl.level} (${formatPrice(extPrice, precision)})`;
            ctx.fillText(label, startX + 6, yCoord - 3);
          }
        }
      } else if (type === 'fib_channel' && pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
        if (pts.length >= 3) {
          const ox = pts[2].x - pts[0].x;
          const oy = pts[2].y - pts[0].y;
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.618];
          for (const lv of levels) {
            ctx.strokeStyle = lv === 0.618 || lv === 0.5 ? '#00D4AA' : strokeCol;
            ctx.lineWidth = lv === 0 || lv === 1 ? lineWidth : 1;
            ctx.beginPath();
            ctx.moveTo(pts[0].x + ox * lv, pts[0].y + oy * lv);
            ctx.lineTo(pts[1].x + ox * lv, pts[1].y + oy * lv);
            ctx.stroke();
            ctx.font = '600 9px "JetBrains Mono", monospace';
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fillText(String(lv), pts[1].x + ox * lv + 4, pts[1].y + oy * lv);
          }
        }
      } else if (type === 'fib_timezone' && pts.length >= 2) {
        const dt = ptsData[1].time - ptsData[0].time;
        if (Math.abs(dt) > 0) {
          for (const n of FIB_TIME_NUMS) {
            const x = timeToX(ptsData[0].time + dt * n);
            if (x === null) continue;
            ctx.strokeStyle = n === 0 || n === 1 ? strokeCol : '#00D4AA';
            ctx.lineWidth = 1.2;
            ctx.setLineDash(n <= 1 ? [] : [4, 4]);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            ctx.font = '700 10px "JetBrains Mono", monospace';
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fillText(String(n), x + 4, 24);
          }
        }
      } else if (type === 'fib_fan' && pts.length >= 2) {
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(
          Math.min(pts[0].x, pts[1].x),
          Math.min(pts[0].y, pts[1].y),
          Math.abs(pts[1].x - pts[0].x),
          Math.abs(pts[1].y - pts[0].y)
        );
        ctx.setLineDash([]);
        const ratios = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
        const scale = Math.max(width, height) * 2;
        for (const r of ratios) {
          const targetY = pts[0].y + (pts[1].y - pts[0].y) * r;
          const dx = pts[1].x - pts[0].x;
          const dy = targetY - pts[0].y;
          const len = Math.hypot(dx, dy) || 1;
          ctx.strokeStyle = r === 0.618 ? '#00D4AA' : strokeCol;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[0].x + (dx / len) * scale, pts[0].y + (dy / len) * scale);
          ctx.stroke();
        }
      } else if (type === 'fib_arc' && pts.length >= 2) {
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
        ctx.setLineDash([]);
        const baseR = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const ratios = [0.382, 0.5, 0.618, 0.786, 1.0, 1.618];
        for (const r of ratios) {
          ctx.strokeStyle = r === 0.618 ? '#00D4AA' : strokeCol;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, baseR * r, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (type === 'pitchfork' && pts.length >= 2) {
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        if (pts.length >= 3) {
          ctx.moveTo(pts[1].x, pts[1].y);
          ctx.lineTo(pts[2].x, pts[2].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        if (pts.length >= 3) {
          const mid = { x: (pts[1].x + pts[2].x) / 2, y: (pts[1].y + pts[2].y) / 2 };
          const dx = mid.x - pts[0].x;
          const dy = mid.y - pts[0].y;
          const len = Math.hypot(dx, dy) || 1;
          const scale = Math.max(width, height) * 2;
          const ux = (dx / len) * scale;
          const uy = (dy / len) * scale;

          ctx.strokeStyle = '#F23645';
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[0].x + ux, pts[0].y + uy);
          ctx.stroke();

          ctx.strokeStyle = strokeCol;
          ctx.beginPath();
          ctx.moveTo(pts[1].x, pts[1].y);
          ctx.lineTo(pts[1].x + ux, pts[1].y + uy);
          ctx.moveTo(pts[2].x, pts[2].y);
          ctx.lineTo(pts[2].x + ux, pts[2].y + uy);
          ctx.stroke();

          ctx.fillStyle = fillCol;
          ctx.beginPath();
          ctx.moveTo(pts[1].x, pts[1].y);
          ctx.lineTo(pts[1].x + ux, pts[1].y + uy);
          ctx.lineTo(pts[2].x + ux, pts[2].y + uy);
          ctx.lineTo(pts[2].x, pts[2].y);
          ctx.closePath();
          ctx.fill();
        }
      } else if (type === 'gann_box' && pts.length >= 2) {
        const x = Math.min(pts[0].x, pts[1].x);
        const y = Math.min(pts[0].y, pts[1].y);
        const w = Math.abs(pts[1].x - pts[0].x);
        const h = Math.abs(pts[1].y - pts[0].y);
        ctx.fillStyle = fillCol;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        const divs = [0.25, 0.5, 0.75];
        ctx.lineWidth = 1;
        for (const d of divs) {
          ctx.setLineDash(d === 0.5 ? [] : [4, 4]);
          ctx.beginPath();
          ctx.moveTo(x + w * d, y);
          ctx.lineTo(x + w * d, y + h);
          ctx.moveTo(x, y + h * d);
          ctx.lineTo(x + w, y + h * d);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.strokeStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y);
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y + h * 0.5);
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w * 0.5, y);
        ctx.stroke();
      } else if ((type === 'xabcd' || type === 'abcd') && pts.length >= 2) {
        const labels = type === 'xabcd' ? ['X', 'A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D'];
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        if (pts.length >= 3) {
          ctx.fillStyle = fillCol;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.lineTo(pts[2].x, pts[2].y);
          ctx.closePath();
          ctx.fill();
        }
        if (pts.length >= 5) {
          ctx.fillStyle = fillCol;
          ctx.beginPath();
          ctx.moveTo(pts[2].x, pts[2].y);
          ctx.lineTo(pts[3].x, pts[3].y);
          ctx.lineTo(pts[4].x, pts[4].y);
          ctx.closePath();
          ctx.fill();
        }

        ctx.setLineDash([4, 4]);
        ctx.font = '700 10px "JetBrains Mono", monospace';
        if (pts.length >= 3) {
          const xa = Math.abs(ptsData[1].price - ptsData[0].price);
          const ab = Math.abs(ptsData[2].price - ptsData[1].price);
          const ratio = xa > 0 ? ab / xa : 0;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[2].x, pts[2].y);
          ctx.stroke();
          ctx.fillStyle = '#00D4AA';
          ctx.fillText(ratio.toFixed(3), (pts[0].x + pts[2].x) / 2, (pts[0].y + pts[2].y) / 2 - 4);
        }
        if (pts.length >= 4) {
          const ab = Math.abs(ptsData[2].price - ptsData[1].price);
          const bc = Math.abs(ptsData[3].price - ptsData[2].price);
          const ratio = ab > 0 ? bc / ab : 0;
          ctx.beginPath();
          ctx.moveTo(pts[1].x, pts[1].y);
          ctx.lineTo(pts[3].x, pts[3].y);
          ctx.stroke();
          ctx.fillStyle = '#F59E0B';
          ctx.fillText(ratio.toFixed(3), (pts[1].x + pts[3].x) / 2, (pts[1].y + pts[3].y) / 2 - 4);
        }
        if (pts.length >= 5) {
          const bc = Math.abs(ptsData[3].price - ptsData[2].price);
          const cd = Math.abs(ptsData[4].price - ptsData[3].price);
          const ratio = bc > 0 ? cd / bc : 0;
          ctx.beginPath();
          ctx.moveTo(pts[2].x, pts[2].y);
          ctx.lineTo(pts[4].x, pts[4].y);
          ctx.stroke();
          ctx.fillStyle = '#EC4899';
          ctx.fillText(ratio.toFixed(3), (pts[2].x + pts[4].x) / 2, (pts[2].y + pts[4].y) / 2 - 4);
        }
        ctx.setLineDash([]);

        ctx.font = '700 11px Inter, sans-serif';
        pts.forEach((pt, idx) => {
          ctx.fillStyle = color;
          ctx.fillText(labels[idx] ?? String(idx), pt.x - 4, pt.y - 8);
        });
      } else if ((type === 'elliott_impulse' || type === 'elliott_abc') && pts.length >= 2) {
        const labels =
          type === 'elliott_impulse' ? ['(0)', '(1)', '(2)', '(3)', '(4)', '(5)'] : ['(0)', '(A)', '(B)', '(C)'];
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.font = '700 11px "JetBrains Mono", monospace';
        pts.forEach((pt, idx) => {
          ctx.fillStyle = color;
          ctx.fillText(labels[idx] ?? String(idx), pt.x - 9, pt.y - 8);
        });
      } else if (type === 'head_shoulders' && pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        if (pts.length >= 5) {
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = '#F59E0B';
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[2].y);
          ctx.lineTo(pts[pts.length - 1].x, pts[4].y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        const hsLabels = ['L', 'LS', 'NL', 'HEAD', 'NL', 'RS', 'R'];
        ctx.font = '700 10px Inter, sans-serif';
        pts.forEach((pt, idx) => {
          ctx.fillStyle = idx === 3 ? '#F23645' : color;
          ctx.fillText(hsLabels[idx] ?? '', pt.x - 10, pt.y - 8);
        });
      } else if (type === 'bar_pattern' && pts.length >= 2) {
        const minT = Math.min(ptsData[0].time, ptsData[1].time);
        const maxT = Math.max(ptsData[0].time, ptsData[1].time);
        const srcBars = candles.filter((c) => c.time >= minT && c.time <= maxT);
        const x1 = Math.min(pts[0].x, pts[1].x);
        const x2 = Math.max(pts[0].x, pts[1].x);
        const y1 = Math.min(pts[0].y, pts[1].y);
        const y2 = Math.max(pts[0].y, pts[1].y);

        ctx.fillStyle = 'rgba(41, 98, 255, 0.1)';
        ctx.strokeStyle = 'rgba(41, 98, 255, 0.5)';
        ctx.setLineDash([4, 3]);
        ctx.fillRect(x1, y1, Math.max(12, x2 - x1), Math.max(12, y2 - y1));
        ctx.strokeRect(x1, y1, Math.max(12, x2 - x1), Math.max(12, y2 - y1));
        ctx.setLineDash([]);

        if (pts.length >= 3 && srcBars.length > 0) {
          const baseSrcOpen = srcBars[0].open;
          const anchorPrice = ptsData[2].price;
          const anchorTime = ptsData[2].time;
          const barW = Math.max(3, ((x2 - x1) / Math.max(srcBars.length, 1)) * 0.65);

          for (let i = 0; i < srcBars.length; i++) {
            const b = srcBars[i];
            const tOffset = b.time - srcBars[0].time;
            const gx = timeToX(anchorTime + tOffset);
            if (gx === null) continue;
            const go = priceToY(anchorPrice * (b.open / baseSrcOpen));
            const gc = priceToY(anchorPrice * (b.close / baseSrcOpen));
            const gh = priceToY(anchorPrice * (b.high / baseSrcOpen));
            const gl = priceToY(anchorPrice * (b.low / baseSrcOpen));
            if (go === null || gc === null || gh === null || gl === null) continue;

            const isUp = b.close >= b.open;
            ctx.strokeStyle = isUp ? 'rgba(0, 212, 170, 0.7)' : 'rgba(242, 54, 69, 0.7)';
            ctx.fillStyle = isUp ? 'rgba(0, 212, 170, 0.4)' : 'rgba(242, 54, 69, 0.4)';
            ctx.beginPath();
            ctx.moveTo(gx, gh);
            ctx.lineTo(gx, gl);
            ctx.stroke();
            ctx.fillRect(gx - barW / 2, Math.min(go, gc), barW, Math.max(1.5, Math.abs(gc - go)));
          }
        }
      } else if (type === 'rect' && pts.length >= 2) {
        const x = Math.min(pts[0].x, pts[1].x);
        const y = Math.min(pts[0].y, pts[1].y);
        const w = Math.abs(pts[1].x - pts[0].x);
        const h = Math.abs(pts[1].y - pts[0].y);
        ctx.fillStyle = fillCol;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        if (obj?.showMidline !== false) {
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x, y + h / 2);
          ctx.lineTo(x + w, y + h / 2);
          ctx.stroke();
        }
        if (obj?.text) {
          ctx.setLineDash([]);
          ctx.font = fontSpec;
          ctx.fillStyle = txtCol;
          const tx =
            obj.textAlign === 'left'
              ? x + 8
              : obj.textAlign === 'right'
              ? x + w - ctx.measureText(obj.text).width - 8
              : x + w / 2 - ctx.measureText(obj.text).width / 2;
          ctx.fillText(obj.text, tx, y + h / 2 + 4);
        }
      } else if (type === 'rotated_rect' && pts.length >= 2) {
        if (pts.length === 2) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.stroke();
        } else {
          const ox = pts[2].x - pts[0].x;
          const oy = pts[2].y - pts[0].y;
          const p3 = { x: pts[1].x + ox, y: pts[1].y + oy };
          ctx.fillStyle = fillCol;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(pts[2].x, pts[2].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (type === 'ellipse' && pts.length >= 2) {
        const cx = (pts[0].x + pts[1].x) / 2;
        const cy = (pts[0].y + pts[1].y) / 2;
        const rx = Math.max(4, Math.abs(pts[1].x - pts[0].x) / 2);
        const ry = Math.max(4, Math.abs(pts[1].y - pts[0].y) / 2);
        ctx.fillStyle = fillCol;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (type === 'triangle' && pts.length >= 2) {
        ctx.fillStyle = fillCol;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        if (pts.length >= 3) {
          ctx.lineTo(pts[2].x, pts[2].y);
          ctx.closePath();
          ctx.fill();
        }
        ctx.stroke();
      } else if (type === 'arc' && pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        if (pts.length >= 3) {
          ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
        } else {
          ctx.lineTo(pts[1].x, pts[1].y);
        }
        ctx.stroke();
      } else if (type === 'polyline' && pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      } else if ((type === 'long_pos' || type === 'short_pos') && pts.length >= 3) {
        const entryPt = pts[0];
        const tpPt = pts[1];
        const slPt = pts[2];
        const boxLeft = Math.min(entryPt.x, tpPt.x);
        const boxW = Math.max(Math.abs(tpPt.x - entryPt.x), 95);

        const tpTop = Math.min(entryPt.y, tpPt.y);
        const tpH = Math.abs(tpPt.y - entryPt.y);
        ctx.fillStyle = 'rgba(8, 153, 129, 0.22)';
        ctx.fillRect(boxLeft, tpTop, boxW, tpH);
        ctx.strokeStyle = '#089981';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(boxLeft, tpTop, boxW, tpH);

        const slTop = Math.min(entryPt.y, slPt.y);
        const slH = Math.abs(slPt.y - entryPt.y);
        ctx.fillStyle = 'rgba(242, 54, 69, 0.22)';
        ctx.fillRect(boxLeft, slTop, boxW, slH);
        ctx.strokeStyle = '#F23645';
        ctx.strokeRect(boxLeft, slTop, boxW, slH);

        ctx.strokeStyle = '#94A3B8';
        ctx.beginPath();
        ctx.moveTo(boxLeft, entryPt.y);
        ctx.lineTo(boxLeft + boxW, entryPt.y);
        ctx.stroke();

        const reward = Math.abs(ptsData[1].price - ptsData[0].price);
        const risk = Math.max(Math.abs(ptsData[2].price - ptsData[0].price), 1e-9);
        const rr = reward / risk;
        const pctReward = (reward / Math.max(ptsData[0].price, 1e-9)) * 100;
        const pctRisk = (risk / Math.max(ptsData[0].price, 1e-9)) * 100;
        const acct = obj?.accountSize ?? 100000;
        const rPct = obj?.riskPercent ?? 1;
        const riskUsd = acct * (rPct / 100);
        const qtyCalc = riskUsd / risk;

        ctx.font = '600 10px "JetBrains Mono", monospace';
        const rrText = `${type === 'long_pos' ? 'LONG' : 'SHORT'} R:R 1:${rr.toFixed(
          2
        )} • Qty ${qtyCalc >= 10 ? qtyCalc.toFixed(1) : qtyCalc.toFixed(3)}`;
        ctx.fillStyle = theme === 'dark' ? 'rgba(19,23,34,0.92)' : 'rgba(255,255,255,0.94)';
        const bw = ctx.measureText(rrText).width + 12;
        ctx.fillRect(boxLeft + 6, entryPt.y - 10, bw, 18);
        ctx.fillStyle = rr >= 1.5 ? '#089981' : '#F59E0B';
        ctx.fillText(rrText, boxLeft + 12, entryPt.y + 3);

        ctx.fillStyle = '#089981';
        ctx.fillText(
          `TP +${pctReward.toFixed(2)}% (+$${(riskUsd * rr).toFixed(0)})`,
          boxLeft + 6,
          tpPt.y + (type === 'long_pos' ? 12 : -5)
        );
        ctx.fillStyle = '#F23645';
        ctx.fillText(
          `SL -${pctRisk.toFixed(2)}% (-$${riskUsd.toFixed(0)})`,
          boxLeft + 6,
          slPt.y + (type === 'long_pos' ? -5 : 12)
        );
      } else if ((type === 'brush' || type === 'highlighter') && pts.length >= 2) {
        if (type === 'highlighter') {
          ctx.lineWidth = Math.max(12, lineWidth * 5);
          ctx.globalAlpha = 0.34;
        }
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      } else if (type === 'arrow_marker' && pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
        ctx.setLineDash([]);
        drawArrowHead(ctx, pts[0], pts[1], 10 + lineWidth);
      } else if (type === 'text' && pts[0]) {
        ctx.setLineDash([]);
        const label = obj?.text || 'Note';
        ctx.font = fontSpec;
        const tw = ctx.measureText(label).width + 14;
        ctx.fillStyle = theme === 'dark' ? 'rgba(19, 23, 34, 0.9)' : 'rgba(255, 255, 255, 0.94)';
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(pts[0].x, pts[0].y - 16, tw, 24, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = txtCol;
        ctx.fillText(label, pts[0].x + 7, pts[0].y);
      } else if (type === 'callout' && pts.length >= 2) {
        ctx.setLineDash([]);
        const label = obj?.text || 'Callout';
        ctx.font = fontSpec;
        const tw = Math.max(70, ctx.measureText(label).width + 16);
        const bx = pts[1].x - tw / 2;
        const by = pts[1].y - 14;

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();

        ctx.fillStyle = theme === 'dark' ? '#1E222D' : '#FFFFFF';
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, tw, 26, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = txtCol;
        ctx.fillText(label, bx + 8, by + 16.5);
      } else if (type === 'price_label' && pts[0]) {
        ctx.setLineDash([]);
        const txt = formatPrice(ptsData[0].price, precision);
        ctx.font = '700 11px "JetBrains Mono", monospace';
        const tw = ctx.measureText(txt).width + 18;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[0].x + 8, pts[0].y - 10);
        ctx.lineTo(pts[0].x + tw, pts[0].y - 10);
        ctx.lineTo(pts[0].x + tw, pts[0].y + 10);
        ctx.lineTo(pts[0].x + 8, pts[0].y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(txt, pts[0].x + 11, pts[0].y + 4);
      } else if ((type === 'ruler' || type === 'date_price_range') && pts.length >= 2) {
        const x = Math.min(pts[0].x, pts[1].x);
        const y = Math.min(pts[0].y, pts[1].y);
        const w = Math.abs(pts[1].x - pts[0].x);
        const h = Math.abs(pts[1].y - pts[0].y);
        const isUp = ptsData[1].price >= ptsData[0].price;
        const rc = type === 'date_price_range' ? color : isUp ? '#089981' : '#F23645';

        ctx.fillStyle = hexWithOpacity(rc, obj?.fillOpacity ?? 15);
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = rc;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);

        const diff = ptsData[1].price - ptsData[0].price;
        const pct = (diff / Math.max(ptsData[0].price, 1e-9)) * 100;
        const bars = Math.round(Math.abs(ptsData[1].time - ptsData[0].time) / tfSec);
        const minT = Math.min(ptsData[0].time, ptsData[1].time);
        const maxT = Math.max(ptsData[0].time, ptsData[1].time);
        const volSum = candles
          .filter((c) => c.time >= minT && c.time <= maxT)
          .reduce((a, b) => a + b.volume, 0);

        const infoText = `${diff >= 0 ? '+' : ''}${formatPrice(diff, precision)} (${
          pct >= 0 ? '+' : ''
        }${pct.toFixed(2)}%) • ${bars}b • Vol ${formatCompactNumber(volSum)}`;

        ctx.font = '600 10px "JetBrains Mono", monospace';
        const tw = ctx.measureText(infoText).width + 14;
        const bx = Math.min(Math.max(8, (pts[0].x + pts[1].x) / 2 - tw / 2), width - tw - 8);
        const by = isUp ? Math.max(8, y - 26) : Math.min(height - 30, y + h + 6);
        ctx.fillStyle = rc;
        ctx.beginPath();
        ctx.roundRect(bx, by, tw, 20, 5);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(infoText, bx + 7, by + 13.5);
      }

      if (isSelected && type !== 'brush' && type !== 'highlighter') {
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        for (const hp of pts) {
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#2962FF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(hp.x, hp.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    if (drawingsVisible) {
      for (const d of symbolDrawings) {
        if (d.visible === false) continue;
        drawSingle(
          d.type,
          d.points,
          d.color,
          d.lineWidth,
          d.lineStyle ?? 'solid',
          d.id === selectedDrawingId,
          d
        );
      }
    }

    if (
      draftPoints.length > 0 &&
      cursorPoint &&
      activeTool !== 'cursor' &&
      activeTool !== 'eraser' &&
      activeTool !== 'brush' &&
      activeTool !== 'highlighter' &&
      activeTool !== 'text'
    ) {
      drawSingle(
        activeTool,
        [...draftPoints, cursorPoint],
        drawingColor,
        drawingLineWidth,
        drawingLineStyle,
        false
      );
    }

    if (isBrushing && brushPointsRef.current.length > 1) {
      drawSingle(
        activeTool === 'highlighter' ? 'highlighter' : 'brush',
        brushPointsRef.current,
        drawingColor,
        drawingLineWidth,
        drawingLineStyle,
        false
      );
    }

    if (rulerStart && rulerEnd) {
      drawSingle('ruler', [rulerStart, rulerEnd], '#2962FF', 1.5, 'solid', false);
    }

    if (magnetMode && cursorPoint && activeTool !== 'cursor' && activeTool !== 'eraser') {
      const sp = toScreen(cursorPoint);
      if (sp) {
        ctx.fillStyle = '#00D4AA';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }, [
    width,
    height,
    drawingsVisible,
    symbolDrawings,
    selectedDrawingId,
    draftPoints,
    cursorPoint,
    activeTool,
    drawingColor,
    drawingLineWidth,
    drawingLineStyle,
    isBrushing,
    rulerStart,
    rulerEnd,
    magnetMode,
    toScreen,
    priceToY,
    timeToX,
    precision,
    tfSec,
    theme,
    candles,
    vpvrData,
    structureData,
    smartOverlays,
    chartSettings.priceScalePosition,
  ]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    if (!chart) return;
    const onRangeChange = () => render();
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRangeChange);
    };
  }, [chart, render]);

  const commitDrawing = useCallback(
    (type: Exclude<DrawingToolType, 'cursor' | 'eraser' | 'ruler'>, points: DrawingPoint[]) => {
      addDrawing({
        id: generateId('drw'),
        symbol,
        type,
        points,
        color: drawingColor,
        lineWidth: drawingLineWidth,
        lineStyle: drawingLineStyle,
        createdAt: Date.now(),
      });
      setDraftPoints([]);
      finishToolUsage();
    },
    [addDrawing, symbol, drawingColor, drawingLineWidth, drawingLineStyle, finishToolUsage]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button === 2) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dataPt = screenToData(x, y, true);
    if (!dataPt) return;

    if (activeTool === 'eraser') {
      const hit = hitTestDrawings(x, y, true);
      if (hit) removeDrawing(symbol, hit.id);
      return;
    }

    if (activeTool === 'cursor') {
      const hit = hitTestDrawings(x, y);
      if (hit) {
        const target = symbolDrawings.find((d) => d.id === hit.id);
        if (target) {
          setSelectedDrawingId(target.id);
          dragStateRef.current = {
            drawingId: target.id,
            mode: hit.mode,
            pointIndex: hit.pointIndex,
            startPointer: dataPt,
            originalPoints: target.points.map((pt) => ({ ...pt })),
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }
      } else {
        setSelectedDrawingId(null);
      }
      return;
    }

    if (activeTool === 'ruler') {
      if (!rulerStart || (rulerStart && rulerEnd && draftPoints.length === 0)) {
        setRulerStart(dataPt);
        setRulerEnd(dataPt);
        setDraftPoints([dataPt]);
      } else {
        setRulerEnd(dataPt);
        setDraftPoints([]);
      }
      return;
    }

    if (activeTool === 'brush' || activeTool === 'highlighter') {
      setIsBrushing(true);
      brushPointsRef.current = [dataPt];
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (activeTool === 'text') {
      setTextDraft({ x, y, points: [dataPt], kind: 'text' });
      setTextValue('');
      return;
    }

    if (activeTool === 'callout') {
      if (draftPoints.length === 0) {
        setDraftPoints([dataPt]);
      } else {
        setTextDraft({ x, y, points: [draftPoints[0], dataPt], kind: 'callout' });
        setTextValue('');
        setDraftPoints([]);
      }
      return;
    }

    if (activeTool === 'polyline') {
      setDraftPoints((prev) => [...prev, dataPt]);
      return;
    }

    if (activeTool === 'long_pos' || activeTool === 'short_pos') {
      const topPrice = series?.coordinateToPrice(Math.max(10, y - height * 0.14));
      const botPrice = series?.coordinateToPrice(Math.min(height - 10, y + height * 0.08));
      const tpDelta = topPrice ? Math.abs(Number(topPrice) - dataPt.price) : dataPt.price * 0.02;
      const slDelta = botPrice ? Math.abs(dataPt.price - Number(botPrice)) : dataPt.price * 0.01;
      const isLong = activeTool === 'long_pos';

      const tpPrice = isLong ? dataPt.price + tpDelta : Math.max(0.00001, dataPt.price - tpDelta);
      const slPrice = isLong ? Math.max(0.00001, dataPt.price - slDelta) : dataPt.price + slDelta;

      addDrawing({
        id: generateId('drw'),
        symbol,
        type: activeTool,
        points: [
          dataPt,
          { time: dataPt.time + tfSec * 14, price: tpPrice },
          { time: dataPt.time + tfSec * 14, price: slPrice },
        ],
        color: isLong ? '#089981' : '#F23645',
        lineWidth: 1.5,
        lineStyle: 'solid',
        riskPercent: chartSettings.defaultRiskPercent,
        accountSize: 100000,
        createdAt: Date.now(),
      });
      finishToolUsage();
      return;
    }

    const meta = DRAWING_TOOLS_CATALOG.find((t) => t.id === activeTool);
    const reqPts = meta?.pointsRequired ?? 2;
    const nextPts = [...draftPoints, dataPt];

    if (nextPts.length >= reqPts) {
      commitDrawing(activeTool, nextPts);
    } else {
      setDraftPoints(nextPts);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragStateRef.current) {
      const pt = screenToData(x, y, true);
      if (!pt) return;
      const drag = dragStateRef.current;
      const updatedPts = drag.originalPoints.map((op) => ({ ...op }));

      if (drag.mode === 'point') {
        updatedPts[drag.pointIndex] = pt;
      } else {
        const dt = pt.time - drag.startPointer.time;
        const dp = pt.price - drag.startPointer.price;
        for (let i = 0; i < updatedPts.length; i++) {
          updatedPts[i] = {
            time: updatedPts[i].time + dt,
            price: Math.max(0.000001, updatedPts[i].price + dp),
          };
        }
      }
      updateDrawing(symbol, drag.drawingId, { points: updatedPts });
      return;
    }

    const pt = screenToData(x, y, true);
    if (!pt) return;
    setCursorPoint(pt);

    if (activeTool === 'ruler' && draftPoints.length === 1) {
      setRulerEnd(pt);
    }

    if (isBrushing) {
      const last = brushPointsRef.current[brushPointsRef.current.length - 1];
      if (!last || last.time !== pt.time || Math.abs(last.price - pt.price) > 0) {
        brushPointsRef.current.push(pt);
        render();
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragStateRef.current) {
      dragStateRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      return;
    }

    if (isBrushing) {
      setIsBrushing(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (brushPointsRef.current.length > 2) {
        addDrawing({
          id: generateId('drw'),
          symbol,
          type: activeTool === 'highlighter' ? 'highlighter' : 'brush',
          points: [...brushPointsRef.current],
          color: drawingColor,
          lineWidth: drawingLineWidth,
          lineStyle: drawingLineStyle,
          createdAt: Date.now(),
        });
      }
      brushPointsRef.current = [];
      finishToolUsage();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'polyline' && draftPoints.length >= 2) {
      e.stopPropagation();
      commitDrawing('polyline', draftPoints);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = hitTestDrawings(x, y);
    if (!hit) return;
    const target = symbolDrawings.find((d) => d.id === hit.id);
    if (!target) return;

    e.stopPropagation();
    if (target.type === 'text' || target.type === 'callout') {
      setTextDraft({
        x,
        y,
        points: target.points,
        kind: target.type,
        editingId: target.id,
      });
      setTextValue(target.text ?? '');
    } else {
      setSelectedDrawingId(target.id);
      setEditingDrawingId(target.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (draftPoints.length > 0) {
      setDraftPoints([]);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = hitTestDrawings(x, y, true);
    if (hit) setSelectedDrawingId(hit.id);
    onRequestContextMenu?.(e.clientX, e.clientY, x, y, hit?.id ?? null);
  };

  const commitTextDraft = () => {
    if (textDraft && textValue.trim()) {
      if (textDraft.editingId) {
        updateDrawing(symbol, textDraft.editingId, { text: textValue.trim() });
      } else {
        addDrawing({
          id: generateId('drw'),
          symbol,
          type: textDraft.kind,
          points: textDraft.points,
          color: drawingColor,
          lineWidth: 1.5,
          text: textValue.trim(),
          createdAt: Date.now(),
        });
      }
    }
    setTextDraft(null);
    setTextValue('');
    finishToolUsage();
  };

  const activeToolMeta = DRAWING_TOOLS_CATALOG.find((t) => t.id === activeTool);
  const isCanvasInteractive =
    activeTool !== 'cursor' || hoverInteractive || Boolean(dragStateRef.current);

  return (
    <>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{ width, height }}
        className={`absolute inset-0 z-10 ${
          activeTool === 'eraser'
            ? 'pointer-events-auto cursor-cell'
            : activeTool !== 'cursor'
            ? 'pointer-events-auto cursor-crosshair'
            : isCanvasInteractive
            ? 'pointer-events-auto cursor-grab active:cursor-grabbing'
            : 'pointer-events-none'
        }`}
      />

      {activeTool !== 'cursor' && activeToolMeta && (
        <div className="pointer-events-none absolute bottom-10 left-3 z-20 rounded-md border border-[#2A2E39] bg-[#1E222D]/90 px-2.5 py-1 text-[11px] text-[#D1D4DC] shadow-lg backdrop-blur">
          <span className="font-bold text-[#2962FF]">{activeToolMeta.label}</span>
          {activeToolMeta.pointsRequired > 1 && (
            <span className="ml-1.5 font-mono text-[10px] text-[#00D4AA]">
              ({draftPoints.length}/{activeToolMeta.pointsRequired} pts)
            </span>
          )}
          {activeTool === 'polyline' && (
            <span className="ml-1.5 text-[10px] text-[#787B86]">
              Click vertices • Double-click to finish
            </span>
          )}
          {draftPoints.length > 0 && (
            <span className="ml-2 text-[10px] text-[#787B86]">• Right-click / Esc to cancel</span>
          )}
        </div>
      )}

      {textDraft && (
        <div
          style={{
            left: Math.min(textDraft.x, Math.max(12, width - 220)),
            top: Math.min(textDraft.y, Math.max(12, height - 48)),
          }}
          className="absolute z-30 flex items-center gap-1.5 rounded-lg border border-[#2962FF] bg-[#1E222D] p-1.5 shadow-xl"
        >
          <input
            autoFocus
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTextDraft();
              if (e.key === 'Escape') {
                setTextDraft(null);
                finishToolUsage();
              }
            }}
            placeholder={textDraft.kind === 'callout' ? 'Callout note...' : 'Annotation text...'}
            className="w-40 bg-transparent px-1.5 py-0.5 text-xs text-white outline-none placeholder:text-[#787B86]"
          />
          <button
            onClick={commitTextDraft}
            className="rounded bg-[#2962FF] px-2 py-0.5 text-[11px] font-medium text-white hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      )}
    </>
  );
};
