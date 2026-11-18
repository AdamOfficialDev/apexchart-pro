import { getSymbolInfo, TIMEFRAME_MAP } from '@/data/symbols';
import { Candle, SymbolInfo, TimeframeId } from '@/types/trading';

const BINANCE_REST_BASE = 'https://data-api.binance.vision/api/v3';
const BINANCE_WS_BASE = 'wss://data-stream.binance.vision/ws';

// Seeded deterministic pseudo-random generator for reproducible synthetic history
function createSeededRng(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundToPrecision(val: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(val * factor) / factor;
}

export function generateSyntheticCandles(
  symbolInfo: SymbolInfo,
  timeframe: TimeframeId,
  count: number,
  endAnchorTimeSec?: number,
  endAnchorPrice?: number
): Candle[] {
  const tfSec = TIMEFRAME_MAP[timeframe].seconds;
  const nowBucket = Math.floor((endAnchorTimeSec ?? Math.floor(Date.now() / 1000)) / tfSec) * tfSec;
  const rng = createSeededRng(`${symbolInfo.symbol}-${timeframe}`);

  // Scale daily volatility to timeframe step
  const stepScale = Math.sqrt(tfSec / 86400);
  const stepVol = Math.max(symbolInfo.volatility * stepScale, symbolInfo.volatility * 0.045);

  const rawCloses: number[] = [];
  let price = endAnchorPrice ?? symbolInfo.basePrice;

  // Walk backwards or generate forward then normalize end price to anchor
  let trendRegime = 0;
  for (let i = 0; i < count; i++) {
    if (i % 24 === 0) {
      trendRegime = (rng() - 0.49) * stepVol * 0.45;
    }
    const u1 = Math.max(rng(), 1e-7);
    const u2 = rng();
    const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const shock = rng() < 0.035 ? (rng() - 0.5) * stepVol * 3.2 : 0;
    const ret = trendRegime + gaussian * stepVol + shock;
    price = Math.max(symbolInfo.minMove * 10, price * (1 + ret));
    rawCloses.push(price);
  }

  // Re-anchor final close smoothly to desired anchor price if provided
  const finalGenerated = rawCloses[rawCloses.length - 1];
  const anchorFactor = endAnchorPrice ? endAnchorPrice / finalGenerated : 1;

  const candles: Candle[] = [];
  let prevClose = rawCloses[0] * anchorFactor;

  for (let i = 0; i < count; i++) {
    const t = nowBucket - (count - 1 - i) * tfSec;
    const close = roundToPrecision(rawCloses[i] * anchorFactor, symbolInfo.precision);
    const open = i === 0 ? close : prevClose;

    const bodySize = Math.abs(close - open);
    const upperWick = (rng() * 0.85 + 0.1) * Math.max(bodySize, open * stepVol * 0.65);
    const lowerWick = (rng() * 0.85 + 0.1) * Math.max(bodySize, open * stepVol * 0.65);

    const high = roundToPrecision(Math.max(open, close) + upperWick, symbolInfo.precision);
    const low = roundToPrecision(
      Math.max(symbolInfo.minMove, Math.min(open, close) - lowerWick),
      symbolInfo.precision
    );

    const baseVol = symbolInfo.category === 'Crypto' ? 850 : symbolInfo.category === 'IDX' ? 420000 : 18500;
    const volume = Math.round(
      baseVol * (0.4 + rng() * 1.9) * (1 + (bodySize / Math.max(open * stepVol, 1e-9)) * 0.5)
    );

    candles.push({ time: t, open, high, low, close, volume });
    prevClose = close;
  }

  return candles;
}

function aggregateCandles(source: Candle[], targetTfSec: number): Candle[] {
  if (source.length === 0) return [];
  const buckets = new Map<number, Candle>();

  for (const c of source) {
    const bucketTime = Math.floor(c.time / targetTfSec) * targetTfSec;
    const existing = buckets.get(bucketTime);
    if (!existing) {
      buckets.set(bucketTime, { ...c, time: bucketTime });
    } else {
      existing.high = Math.max(existing.high, c.high);
      existing.low = Math.min(existing.low, c.low);
      existing.close = c.close;
      existing.volume += c.volume;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

async function fetchBinanceKlines(
  binanceSymbol: string,
  interval: string,
  limit: number
): Promise<Candle[]> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3500);

  try {
    const url = `${BINANCE_REST_BASE}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as unknown[][];
    if (!Array.isArray(data) || data.length === 0) throw new Error('Empty klines');

    const map = new Map<number, Candle>();
    for (const row of data) {
      const time = Math.floor(Number(row[0]) / 1000);
      map.set(time, {
        time,
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]),
      });
    }
    return Array.from(map.values()).sort((a, b) => a.time - b.time);
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchHistoricalCandles(
  symbol: string,
  timeframe: TimeframeId
): Promise<{ candles: Candle[]; source: 'binance' | 'simulated' }> {
  const info = getSymbolInfo(symbol);
  const tfMeta = TIMEFRAME_MAP[timeframe];

  if (info.binanceSymbol) {
    try {
      // Native Binance interval directly supported
      if (tfMeta.binanceInterval) {
        const candles = await fetchBinanceKlines(
          info.binanceSymbol,
          tfMeta.binanceInterval,
          Math.min(1000, tfMeta.defaultBars)
        );
        return { candles, source: 'binance' };
      }

      // Sub-minute intervals (5s, 15s, 30s) -> fetch 1s klines & aggregate + backfill smooth history
      if (tfMeta.seconds < 60) {
        const raw1s = await fetchBinanceKlines(info.binanceSymbol, '1s', 1000);
        const aggregated = aggregateCandles(raw1s, tfMeta.seconds);
        if (aggregated.length > 0) {
          const neededPrefix = Math.max(0, tfMeta.defaultBars - aggregated.length);
          if (neededPrefix > 0) {
            const prefix = generateSyntheticCandles(
              info,
              timeframe,
              neededPrefix,
              aggregated[0].time - tfMeta.seconds,
              aggregated[0].open
            );
            const merged = [...prefix, ...aggregated];
            const dedup = new Map<number, Candle>();
            for (const b of merged) dedup.set(b.time, b);
            return {
              candles: Array.from(dedup.values()).sort((a, b) => a.time - b.time),
              source: 'binance',
            };
          }
          return { candles: aggregated, source: 'binance' };
        }
      }

      // 45m -> aggregate from 15m klines
      if (timeframe === '45m') {
        const raw15m = await fetchBinanceKlines(info.binanceSymbol, '15m', 1000);
        const aggregated = aggregateCandles(raw15m, tfMeta.seconds);
        if (aggregated.length > 0) {
          return { candles: aggregated, source: 'binance' };
        }
      }
    } catch {
      // Graceful fallback to simulated historical generator below
    }
  }

  return {
    candles: generateSyntheticCandles(info, timeframe, tfMeta.defaultBars),
    source: 'simulated',
  };
}

export function subscribeLiveTicks(
  symbol: string,
  timeframe: TimeframeId,
  initialLastCandle: Candle,
  onTick: (candle: Candle, source: 'binance' | 'simulated') => void
): () => void {
  const info = getSymbolInfo(symbol);
  const tfSec = TIMEFRAME_MAP[timeframe].seconds;

  let disposed = false;
  let currentBar: Candle = { ...initialLastCandle };
  let ws: WebSocket | null = null;
  let simTimer: number | null = null;
  let wsHandshakeTimeout: number | null = null;

  const processTrade = (price: number, qty: number, tradeTimeSec: number, source: 'binance' | 'simulated') => {
    if (disposed) return;
    const roundedPrice = roundToPrecision(price, info.precision);
    const bucketTime = Math.floor(tradeTimeSec / tfSec) * tfSec;

    if (bucketTime > currentBar.time) {
      currentBar = {
        time: bucketTime,
        open: roundedPrice,
        high: roundedPrice,
        low: roundedPrice,
        close: roundedPrice,
        volume: qty,
      };
    } else {
      currentBar = {
        ...currentBar,
        high: Math.max(currentBar.high, roundedPrice),
        low: Math.min(currentBar.low, roundedPrice),
        close: roundedPrice,
        volume: currentBar.volume + qty,
      };
    }
    onTick(currentBar, source);
  };

  const startSimulator = () => {
    if (disposed || simTimer !== null) return;
    const intervalMs = tfSec <= 15 ? 350 : 750;
    const tickScale = Math.sqrt(intervalMs / 1000 / 86400);
    const tickVol = Math.max(info.volatility * tickScale * 1.4, info.minMove / Math.max(currentBar.close, 1));

    simTimer = window.setInterval(() => {
      if (disposed) return;
      const noise = (Math.random() - 0.496) * 2.1;
      const nextPrice = Math.max(
        info.minMove,
        currentBar.close * (1 + noise * tickVol)
      );
      const qty = Math.round(
        (info.category === 'Crypto' ? 1.5 : info.category === 'IDX' ? 2500 : 120) * (0.2 + Math.random() * 1.8)
      );
      processTrade(nextPrice, qty, Math.floor(Date.now() / 1000), 'simulated');
    }, intervalMs);
  };

  if (info.binanceSymbol) {
    try {
      const streamName = `${info.binanceSymbol.toLowerCase()}@trade`;
      ws = new WebSocket(`${BINANCE_WS_BASE}/${streamName}`);

      let receivedMessage = false;
      wsHandshakeTimeout = window.setTimeout(() => {
        if (!receivedMessage && !disposed) {
          ws?.close();
          startSimulator();
        }
      }, 3800);

      ws.onmessage = (event) => {
        if (disposed) return;
        receivedMessage = true;
        if (wsHandshakeTimeout) {
          window.clearTimeout(wsHandshakeTimeout);
          wsHandshakeTimeout = null;
        }
        try {
          const msg = JSON.parse(event.data as string) as { p?: string; q?: string; T?: number };
          if (msg.p) {
            const p = Number(msg.p);
            const q = Number(msg.q ?? 0);
            const tSec = Math.floor((msg.T ?? Date.now()) / 1000);
            if (Number.isFinite(p) && p > 0) {
              processTrade(p, Number.isFinite(q) ? q : 0, tSec, 'binance');
            }
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onerror = () => {
        if (!disposed) startSimulator();
      };

      ws.onclose = () => {
        if (!disposed && !receivedMessage) startSimulator();
      };
    } catch {
      startSimulator();
    }
  } else {
    startSimulator();
  }

  return () => {
    disposed = true;
    if (wsHandshakeTimeout !== null) window.clearTimeout(wsHandshakeTimeout);
    if (simTimer !== null) window.clearInterval(simTimer);
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
  };
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
  pct: number;
}

export interface TradePrint {
  id: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  time: string;
}

export function generateOrderBookSnapshot(
  symbol: string,
  midPrice: number,
  levels = 12
): { asks: OrderBookLevel[]; bids: OrderBookLevel[]; spread: number; spreadPct: number } {
  const info = getSymbolInfo(symbol);
  const step = Math.max(info.minMove, midPrice * 0.00025);

  const asksRaw: Omit<OrderBookLevel, 'pct'>[] = [];
  const bidsRaw: Omit<OrderBookLevel, 'pct'>[] = [];

  let askCum = 0;
  let bidCum = 0;

  for (let i = 1; i <= levels; i++) {
    const askPrice = roundToPrecision(midPrice + i * step * (0.8 + Math.random() * 0.4), info.precision);
    const bidPrice = roundToPrecision(
      Math.max(info.minMove, midPrice - i * step * (0.8 + Math.random() * 0.4)),
      info.precision
    );
    const baseSize = info.category === 'Crypto' ? 2.5 : info.category === 'IDX' ? 8500 : 450;
    const askSize = Number((baseSize * (0.2 + Math.random() * 2.4)).toFixed(info.category === 'Crypto' ? 3 : 0));
    const bidSize = Number((baseSize * (0.2 + Math.random() * 2.4)).toFixed(info.category === 'Crypto' ? 3 : 0));

    askCum += askSize;
    bidCum += bidSize;

    asksRaw.push({ price: askPrice, size: askSize, total: Number(askCum.toFixed(2)) });
    bidsRaw.push({ price: bidPrice, size: bidSize, total: Number(bidCum.toFixed(2)) });
  }

  const maxTotal = Math.max(askCum, bidCum, 1);
  const asks = asksRaw
    .map((a) => ({ ...a, pct: Math.min(100, (a.total / maxTotal) * 100) }))
    .reverse();
  const bids = bidsRaw.map((b) => ({ ...b, pct: Math.min(100, (b.total / maxTotal) * 100) }));

  const bestAsk = asks[asks.length - 1]?.price ?? midPrice;
  const bestBid = bids[0]?.price ?? midPrice;
  const spread = Math.max(0, bestAsk - bestBid);
  const spreadPct = midPrice > 0 ? (spread / midPrice) * 100 : 0;

  return { asks, bids, spread, spreadPct };
}
