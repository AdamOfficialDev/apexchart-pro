import { getSymbolInfo, TIMEFRAME_MAP } from '@/data/symbols';
import { Candle, DataFeedConfig, FeedSourceType, SymbolInfo, TimeframeId } from '@/types/trading';

const BINANCE_REST_BASE = 'https://data-api.binance.vision/api/v3';
const BINANCE_WS_BASE = 'wss://data-stream.binance.vision/ws';
const TWELVE_REST_BASE = 'https://api.twelvedata.com';
const TWELVE_WS_BASE = 'wss://ws.twelvedata.com/v1/quotes/price';

const FX_RATE_CACHE: { rates?: Record<string, number>; fetchedAt?: number } = {};
const SERVER_CLOCK: { offsetSec: number; syncedAt: number } = { offsetSec: 0, syncedAt: 0 };

export function getServerClockOffsetSec(): number {
  return SERVER_CLOCK.offsetSec;
}

export function getServerNowSec(): number {
  return Math.floor(Date.now() / 1000) + SERVER_CLOCK.offsetSec;
}

function updateServerOffsetFromAtomicClock(serverTimeSec: number) {
  if (!Number.isFinite(serverTimeSec) || serverTimeSec < 1600000000) return;
  const localSec = Math.floor(Date.now() / 1000);
  const nextOffset = serverTimeSec - localSec;
  // Smoothly ignore minor <= 2s network jitter once already synced
  if (SERVER_CLOCK.syncedAt > 0 && Math.abs(nextOffset - SERVER_CLOCK.offsetSec) <= 2) {
    return;
  }
  SERVER_CLOCK.offsetSec = nextOffset;
  SERVER_CLOCK.syncedAt = Date.now();
}

async function syncServerClock(): Promise<number> {
  if (Date.now() - SERVER_CLOCK.syncedAt < 300000 && SERVER_CLOCK.syncedAt > 0) {
    return getServerNowSec();
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`${BINANCE_REST_BASE}/time`, { signal: controller.signal });
    if (res.ok) {
      const json = (await res.json()) as { serverTime?: number };
      if (json.serverTime) {
        updateServerOffsetFromAtomicClock(Math.floor(json.serverTime / 1000));
      }
    }
  } catch {
    // Keep existing offset
  } finally {
    window.clearTimeout(timer);
  }
  return getServerNowSec();
}

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

async function fetchLiveFxSpotAnchor(info: SymbolInfo): Promise<number | null> {
  if (!info.fxPair) return null;
  const now = Date.now();
  try {
    if (!FX_RATE_CACHE.rates || !FX_RATE_CACHE.fetchedAt || now - FX_RATE_CACHE.fetchedAt > 300000) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', {
          signal: controller.signal,
        });
        if (res.ok) {
          const json = (await res.json()) as { rates?: Record<string, number> };
          if (json.rates) {
            FX_RATE_CACHE.rates = json.rates;
            FX_RATE_CACHE.fetchedAt = now;
          }
        }
      } finally {
        window.clearTimeout(timer);
      }
    }

    const rates = FX_RATE_CACHE.rates;
    if (!rates) return null;
    const [base, quote] = info.fxPair;
    if (base === 'USD' && rates[quote]) return rates[quote];
    if (quote === 'USD' && rates[base]) return 1 / rates[base];
    if (rates[base] && rates[quote]) return rates[quote] / rates[base];
    return null;
  } catch {
    return null;
  }
}

export async function fetchBinanceWatchlistTickers(
  binanceSymbols: string[]
): Promise<Record<string, { price: number; changePercent: number }>> {
  if (binanceSymbols.length === 0) return {};
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3500);
  try {
    const encoded = encodeURIComponent(JSON.stringify(binanceSymbols));
    const res = await fetch(`${BINANCE_REST_BASE}/ticker/24hr?symbols=${encoded}`, {
      signal: controller.signal,
    });
    if (!res.ok) return {};
    const list = (await res.json()) as Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
    }>;
    const out: Record<string, { price: number; changePercent: number }> = {};
    if (Array.isArray(list)) {
      for (const item of list) {
        const p = Number(item.lastPrice);
        const pct = Number(item.priceChangePercent);
        if (Number.isFinite(p) && p > 0) {
          out[item.symbol] = { price: p, changePercent: Number.isFinite(pct) ? pct : 0 };
        }
      }
    }
    return out;
  } catch {
    return {};
  } finally {
    window.clearTimeout(timer);
  }
}

export function generateSyntheticCandles(
  symbolInfo: SymbolInfo,
  timeframe: TimeframeId,
  count: number,
  endAnchorTimeSec?: number,
  endAnchorPrice?: number
): Candle[] {
  const tfSec = TIMEFRAME_MAP[timeframe].seconds;
  const anchorSec = endAnchorTimeSec ?? getServerNowSec();
  const nowBucket = Math.floor(anchorSec / tfSec) * tfSec;
  const rng = createSeededRng(`${symbolInfo.symbol}-${timeframe}-${nowBucket}`);

  const stepScale = Math.sqrt(tfSec / 86400);
  const stepVol = Math.max(symbolInfo.volatility * stepScale, symbolInfo.volatility * 0.045);

  const rawCloses: number[] = [];
  let price = endAnchorPrice ?? symbolInfo.basePrice;

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

    const baseVol =
      symbolInfo.category === 'Crypto' ? 850 : symbolInfo.category === 'IDX' ? 420000 : 18500;
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
  limit: number,
  endTimeMs?: number
): Promise<Candle[]> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4500);

  try {
    const endParam = endTimeMs ? `&endTime=${endTimeMs}` : '';
    const url = `${BINANCE_REST_BASE}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}${endParam}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as unknown[][];
    if (!Array.isArray(data) || data.length === 0) return [];

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

async function fetchBinanceDeepKlines(
  binanceSymbol: string,
  interval: string,
  batches = 2,
  initialEndMs?: number
): Promise<Candle[]> {
  const merged = new Map<number, Candle>();
  let endMs = initialEndMs;

  for (let i = 0; i < batches; i++) {
    const chunk = await fetchBinanceKlines(binanceSymbol, interval, 1000, endMs);
    if (chunk.length === 0) break;
    for (const c of chunk) merged.set(c.time, c);
    endMs = chunk[0].time * 1000 - 1;
    if (chunk.length < 950) break;
  }

  return Array.from(merged.values()).sort((a, b) => a.time - b.time);
}

function parseTwelveDatetimeToUnixSec(dtStr: string): number {
  const iso = dtStr.includes(' ') ? dtStr.replace(' ', 'T') + 'Z' : dtStr + 'T00:00:00Z';
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : getServerNowSec();
}

function formatUnixSecToTwelveDate(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function fetchTwelveDataKlines(
  tdSymbol: string,
  interval: string,
  apiKey: string,
  outputsize = 1800,
  endDateSec?: number
): Promise<Candle[]> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 6000);
  try {
    const endParam = endDateSec
      ? `&end_date=${encodeURIComponent(formatUnixSecToTwelveDate(endDateSec))}`
      : '';
    const url = `${TWELVE_REST_BASE}/time_series?symbol=${encodeURIComponent(
      tdSymbol
    )}&interval=${encodeURIComponent(
      interval
    )}&outputsize=${outputsize}&timezone=UTC${endParam}&apikey=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`);
    const json = (await res.json()) as {
      status?: string;
      message?: string;
      values?: Array<{
        datetime: string;
        open: string;
        high: string;
        low: string;
        close: string;
        volume?: string;
      }>;
    };
    if (json.status === 'error' || !Array.isArray(json.values) || json.values.length === 0) {
      throw new Error(json.message || 'Twelve Data returned empty values');
    }

    const map = new Map<number, Candle>();
    for (const row of json.values) {
      const time = parseTwelveDatetimeToUnixSec(row.datetime);
      map.set(time, {
        time,
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume ?? 1000) || 1000,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.time - b.time);
  } finally {
    window.clearTimeout(timer);
  }
}

export async function testTwelveDataKey(
  apiKey: string
): Promise<{ ok: boolean; price?: string; error?: string }> {
  if (!apiKey.trim()) return { ok: false, error: 'API Key empty' };
  try {
    const res = await fetch(
      `${TWELVE_REST_BASE}/price?symbol=XAU/USD&apikey=${encodeURIComponent(apiKey.trim())}`
    );
    const json = (await res.json()) as { price?: string; status?: string; message?: string };
    if (json.price) return { ok: true, price: json.price };
    return { ok: false, error: json.message ?? 'Invalid API key or quota limit' };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function fetchHistoricalCandles(
  symbol: string,
  timeframe: TimeframeId,
  feedConfig?: DataFeedConfig
): Promise<{ candles: Candle[]; source: FeedSourceType; warning?: string }> {
  const info = getSymbolInfo(symbol);
  const tfMeta = TIMEFRAME_MAP[timeframe];
  const tdKey = feedConfig?.twelveDataApiKey?.trim() || '';
  let tdWarning: string | undefined;

  const serverNowSec = await syncServerClock();

  const shouldTryTwelveData =
    Boolean(tdKey) &&
    Boolean(info.twelveDataSymbol) &&
    (feedConfig?.preferTwelveData || !info.binanceSymbol || info.symbol === 'XAUUSD');

  if (shouldTryTwelveData && info.twelveDataSymbol) {
    try {
      const interval = tfMeta.twelveDataInterval ?? '1min';
      const reqSize = tfMeta.seconds < 60 ? 300 : Math.min(2500, tfMeta.defaultBars);
      const raw = await fetchTwelveDataKlines(info.twelveDataSymbol, interval, tdKey, reqSize);

      if (raw.length > 0) {
        if (tfMeta.seconds < 60) {
          const lastBar = raw[raw.length - 1];
          const isMarketOpen = serverNowSec - lastBar.time < 900;
          const anchorTime = isMarketOpen ? serverNowSec : lastBar.time + 59;
          const synth = generateSyntheticCandles(
            info,
            timeframe,
            tfMeta.defaultBars,
            anchorTime,
            lastBar.close
          );
          return { candles: synth, source: 'twelvedata' };
        }
        if (timeframe === '3m') {
          const agg = aggregateCandles(raw, 180);
          if (agg.length > 0) return { candles: agg, source: 'twelvedata' };
        }
        return { candles: raw, source: 'twelvedata' };
      }
    } catch (err) {
      tdWarning = (err as Error).message;
    }
  }

  const allowBinance =
    Boolean(info.binanceSymbol) &&
    (info.symbol !== 'XAUUSD' || feedConfig?.useGoldProxyWhenNoKey !== false);

  if (allowBinance && info.binanceSymbol) {
    const resolvedSource: FeedSourceType = info.symbol === 'XAUUSD' ? 'gold-proxy' : 'binance';
    try {
      if (tfMeta.binanceInterval) {
        const candles = await fetchBinanceDeepKlines(
          info.binanceSymbol,
          tfMeta.binanceInterval,
          2
        );
        if (candles.length > 0) {
          return { candles, source: resolvedSource, warning: tdWarning };
        }
      }

      if (tfMeta.seconds < 60) {
        const raw1s = await fetchBinanceDeepKlines(info.binanceSymbol, '1s', 2);
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
            const dedup = new Map<number, Candle>();
            for (const b of [...prefix, ...aggregated]) dedup.set(b.time, b);
            return {
              candles: Array.from(dedup.values()).sort((a, b) => a.time - b.time),
              source: resolvedSource,
              warning: tdWarning,
            };
          }
          return { candles: aggregated, source: resolvedSource, warning: tdWarning };
        }
      }

      if (timeframe === '45m') {
        const raw15m = await fetchBinanceDeepKlines(info.binanceSymbol, '15m', 2);
        const aggregated = aggregateCandles(raw15m, tfMeta.seconds);
        if (aggregated.length > 0) {
          return { candles: aggregated, source: resolvedSource, warning: tdWarning };
        }
      }
    } catch {
      // Fall through
    }
  }

  const fxAnchor = await fetchLiveFxSpotAnchor(info);
  return {
    candles: generateSyntheticCandles(
      info,
      timeframe,
      tfMeta.defaultBars,
      serverNowSec,
      fxAnchor ?? info.basePrice
    ),
    source: 'simulated',
    warning: tdWarning,
  };
}

export async function fetchOlderCandles(
  symbol: string,
  timeframe: TimeframeId,
  oldestCandle: Candle,
  feedConfig?: DataFeedConfig
): Promise<Candle[]> {
  const info = getSymbolInfo(symbol);
  const tfMeta = TIMEFRAME_MAP[timeframe];
  const tdKey = feedConfig?.twelveDataApiKey?.trim() || '';

  const shouldTryTwelveData =
    Boolean(tdKey) &&
    Boolean(info.twelveDataSymbol) &&
    (feedConfig?.preferTwelveData || !info.binanceSymbol || info.symbol === 'XAUUSD');

  if (shouldTryTwelveData && info.twelveDataSymbol) {
    try {
      if (tfMeta.seconds >= 60) {
        const interval = tfMeta.twelveDataInterval ?? '1min';
        const older = await fetchTwelveDataKlines(
          info.twelveDataSymbol,
          interval,
          tdKey,
          1500,
          oldestCandle.time - 1
        );
        const mapped = timeframe === '3m' ? aggregateCandles(older, 180) : older;
        const filtered = mapped.filter((c) => c.time < oldestCandle.time);
        if (filtered.length > 0) return filtered;
      }
    } catch {
      // Fallback below
    }
  }

  const allowBinance =
    Boolean(info.binanceSymbol) &&
    (info.symbol !== 'XAUUSD' || feedConfig?.useGoldProxyWhenNoKey !== false);

  if (allowBinance && info.binanceSymbol) {
    try {
      const endMs = oldestCandle.time * 1000 - 1;
      if (tfMeta.binanceInterval) {
        const chunk = await fetchBinanceKlines(
          info.binanceSymbol,
          tfMeta.binanceInterval,
          1000,
          endMs
        );
        const filtered = chunk.filter((c) => c.time < oldestCandle.time);
        if (filtered.length > 0) return filtered;
      } else if (timeframe === '45m') {
        const chunk15m = await fetchBinanceKlines(info.binanceSymbol, '15m', 1000, endMs);
        const agg = aggregateCandles(chunk15m, tfMeta.seconds).filter(
          (c) => c.time < oldestCandle.time
        );
        if (agg.length > 0) return agg;
      } else if (tfMeta.seconds < 60) {
        const chunk1s = await fetchBinanceKlines(info.binanceSymbol, '1s', 1000, endMs);
        const agg = aggregateCandles(chunk1s, tfMeta.seconds).filter(
          (c) => c.time < oldestCandle.time
        );
        if (agg.length > 0) return agg;
      }
    } catch {
      // Fallback synthetic
    }
  }

  return generateSyntheticCandles(
    info,
    timeframe,
    800,
    oldestCandle.time - tfMeta.seconds,
    oldestCandle.open
  ).filter((c) => c.time < oldestCandle.time);
}

export function subscribeLiveTicks(
  symbol: string,
  timeframe: TimeframeId,
  initialLastCandle: Candle,
  onTick: (candle: Candle, source: FeedSourceType) => void,
  feedConfig?: DataFeedConfig
): () => void {
  const info = getSymbolInfo(symbol);
  const tfSec = TIMEFRAME_MAP[timeframe].seconds;
  const tdKey = feedConfig?.twelveDataApiKey?.trim() || '';

  let disposed = false;
  let currentBar: Candle = { ...initialLastCandle };
  let activeSource: FeedSourceType = 'simulated';
  let hasReceivedLiveStream = false;
  let lastLiveMsgLocalMs = Date.now();

  let ws: WebSocket | null = null;
  let simTimer: number | null = null;
  let rolloverTimer: number | null = null;
  let tdRestPollTimer: number | null = null;
  let wsHandshakeTimeout: number | null = null;

  const processTrade = (
    price: number,
    qty: number,
    tradeTimeSec: number,
    source: FeedSourceType
  ) => {
    if (disposed) return;
    activeSource = source;

    // ONLY trust Binance atomic UTC timestamps for SERVER_CLOCK!
    // Never let Twelve Data WS truncated/minute-rounded timestamps corrupt SERVER_CLOCK!
    if (source === 'binance' || source === 'gold-proxy') {
      updateServerOffsetFromAtomicClock(tradeTimeSec);
    }
    if (source !== 'simulated') {
      hasReceivedLiveStream = true;
      lastLiveMsgLocalMs = Date.now();
    }

    const roundedPrice = roundToPrecision(price, info.precision);
    // Strict monotonic bucket: NEVER go backwards earlier than currentBar.time!
    const rawBucket = Math.floor(tradeTimeSec / tfSec) * tfSec;
    const bucketTime = Math.max(currentBar.time, rawBucket);

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

  // Auto-Rollover Watchdog using true atomic UTC getServerNowSec()
  rolloverTimer = window.setInterval(() => {
    if (disposed || !hasReceivedLiveStream) return;
    const nowServer = getServerNowSec();
    const expectedBucket = Math.floor(nowServer / tfSec) * tfSec;
    if (expectedBucket > currentBar.time && expectedBucket - currentBar.time <= tfSec * 8) {
      currentBar = {
        time: expectedBucket,
        open: currentBar.close,
        high: currentBar.close,
        low: currentBar.close,
        close: currentBar.close,
        volume: 0,
      };
      onTick(currentBar, activeSource);
    }
  }, 450);

  const startSimulator = () => {
    if (disposed || simTimer !== null) return;
    const intervalMs = tfSec <= 15 ? 350 : 750;
    const tickScale = Math.sqrt(intervalMs / 1000 / 86400);
    const tickVol = Math.max(
      info.volatility * tickScale * 1.4,
      info.minMove / Math.max(currentBar.close, 1)
    );

    simTimer = window.setInterval(() => {
      if (disposed) return;
      const noise = (Math.random() - 0.496) * 2.1;
      const nextPrice = Math.max(info.minMove, currentBar.close * (1 + noise * tickVol));
      const qty = Math.round(
        (info.category === 'Crypto' ? 1.5 : info.category === 'IDX' ? 2500 : 120) *
          (0.2 + Math.random() * 1.8)
      );
      processTrade(nextPrice, qty, getServerNowSec(), 'simulated');
    }, intervalMs);
  };

  const useTwelveDataWs =
    Boolean(tdKey) &&
    Boolean(info.twelveDataSymbol) &&
    (feedConfig?.preferTwelveData || !info.binanceSymbol || info.symbol === 'XAUUSD');

  if (useTwelveDataWs && info.twelveDataSymbol) {
    try {
      ws = new WebSocket(`${TWELVE_WS_BASE}?apikey=${encodeURIComponent(tdKey)}`);
      let receivedPrice = false;
      wsHandshakeTimeout = window.setTimeout(() => {
        if (!receivedPrice && !disposed) {
          ws?.close();
          startSimulator();
        }
      }, 5000);

      ws.onopen = () => {
        hasReceivedLiveStream = true;
        ws?.send(
          JSON.stringify({
            action: 'subscribe',
            params: { symbols: info.twelveDataSymbol },
          })
        );
      };

      ws.onmessage = (ev) => {
        if (disposed) return;
        try {
          const msg = JSON.parse(ev.data as string) as {
            event?: string;
            price?: number;
            timestamp?: number;
            day_volume?: number;
          };
          if (msg.event === 'price' && typeof msg.price === 'number' && msg.price > 0) {
            receivedPrice = true;
            if (wsHandshakeTimeout) {
              window.clearTimeout(wsHandshakeTimeout);
              wsHandshakeTimeout = null;
            }
            // Use atomic server clock getServerNowSec() so quantized Twelve Data timestamps never rewind candles!
            processTrade(msg.price, msg.day_volume ? 10 : 5, getServerNowSec(), 'twelvedata');
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        if (!disposed && !receivedPrice) startSimulator();
      };
      ws.onclose = () => {
        if (!disposed && !receivedPrice) startSimulator();
      };

      tdRestPollTimer = window.setInterval(async () => {
        if (disposed || !receivedPrice) return;
        if (Date.now() - lastLiveMsgLocalMs < 14000) return;
        try {
          const r = await fetch(
            `${TWELVE_REST_BASE}/price?symbol=${encodeURIComponent(
              info.twelveDataSymbol!
            )}&apikey=${encodeURIComponent(tdKey)}`
          );
          if (r.ok) {
            const j = (await r.json()) as { price?: string };
            const p = Number(j.price);
            if (Number.isFinite(p) && p > 0) {
              processTrade(p, 5, getServerNowSec(), 'twelvedata');
            }
          }
        } catch {
          // ignore
        }
      }, 15000);
    } catch {
      startSimulator();
    }
  } else if (
    info.binanceSymbol &&
    (info.symbol !== 'XAUUSD' || feedConfig?.useGoldProxyWhenNoKey !== false)
  ) {
    const resolvedSource: FeedSourceType = info.symbol === 'XAUUSD' ? 'gold-proxy' : 'binance';
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
          const msg = JSON.parse(event.data as string) as {
            p?: string;
            q?: string;
            T?: number;
          };
          if (msg.p) {
            const p = Number(msg.p);
            const q = Number(msg.q ?? 0);
            const tSec = Math.floor((msg.T ?? Date.now()) / 1000);
            if (Number.isFinite(p) && p > 0) {
              processTrade(p, Number.isFinite(q) ? q : 0, tSec, resolvedSource);
            }
          }
        } catch {
          // ignore
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
    if (rolloverTimer !== null) window.clearInterval(rolloverTimer);
    if (tdRestPollTimer !== null) window.clearInterval(tdRestPollTimer);
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
    const askPrice = roundToPrecision(
      midPrice + i * step * (0.8 + Math.random() * 0.4),
      info.precision
    );
    const bidPrice = roundToPrecision(
      Math.max(info.minMove, midPrice - i * step * (0.8 + Math.random() * 0.4)),
      info.precision
    );
    const baseSize = info.category === 'Crypto' ? 2.5 : info.category === 'IDX' ? 8500 : 450;
    const askSize = Number(
      (baseSize * (0.2 + Math.random() * 2.4)).toFixed(info.category === 'Crypto' ? 3 : 0)
    );
    const bidSize = Number(
      (baseSize * (0.2 + Math.random() * 2.4)).toFixed(info.category === 'Crypto' ? 3 : 0)
    );

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
