import {
  Candle,
  CandleFootprint,
  FootprintConfig,
  FootprintRow,
  OrderFlowTick,
} from '@/types/trading';

export function computeFootprintStep(
  candles: Candle[],
  minMove: number,
  multiplier = 1
): number {
  const sample = candles.slice(-40);
  if (sample.length === 0) return Math.max(minMove, 1);

  const ranges = sample
    .map((c) => Math.max(c.high - c.low, minMove))
    .sort((a, b) => a - b);
  const medianRange = ranges[Math.floor(ranges.length / 2)] || minMove * 10;
  const rawStep = Math.max(minMove, (medianRange / 7) * Math.max(0.5, multiplier));

  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let nice = 1;
  if (norm >= 5) nice = 5;
  else if (norm >= 2.5) nice = 2.5;
  else if (norm >= 2) nice = 2;
  else nice = 1;

  return Math.max(minMove, nice * mag);
}

export function buildCandleFootprint(
  candle: Candle,
  step: number,
  config: FootprintConfig,
  liveTicks?: OrderFlowTick[]
): CandleFootprint {
  const bucketMap = new Map<number, { bid: number; ask: number }>();
  let isRealFlow = false;

  const snapPrice = (p: number) => Math.round(Math.floor(p / step) * step * 1e8) / 1e8;

  if (liveTicks && liveTicks.length > 0) {
    isRealFlow = liveTicks.some((t) => t.isRealFlow);
    for (const t of liveTicks) {
      const bp = snapPrice(t.price);
      const cur = bucketMap.get(bp) ?? { bid: 0, ask: 0 };
      if (t.side === 'buy') cur.ask += t.qty;
      else cur.bid += t.qty;
      bucketMap.set(bp, cur);
    }
  } else {
    // Deterministic intrabar OHLCV volume profile estimator for older history
    const lowB = snapPrice(candle.low);
    const highB = snapPrice(candle.high);
    const bodyLow = Math.min(candle.open, candle.close);
    const bodyHigh = Math.max(candle.open, candle.close);
    const isBull = candle.close >= candle.open;
    const totalVol = Math.max(candle.volume, 10);

    const prices: number[] = [];
    const maxSteps = 22;
    for (let p = lowB, n = 0; p <= highB + step * 0.1 && n < maxSteps; p += step, n++) {
      prices.push(Math.round(p * 1e8) / 1e8);
    }
    if (prices.length === 0) prices.push(lowB);

    const weights = prices.map((p, idx) => {
      const inBody = p >= bodyLow - step * 0.5 && p <= bodyHigh + step * 0.5;
      const distCenter =
        Math.abs(p - (candle.open + candle.close) / 2) /
        Math.max(candle.high - candle.low, step);
      const jitter = 0.85 + ((Math.sin(candle.time * 0.01 + idx * 1.7) + 1) * 0.18);
      return (inBody ? 1.8 : 0.75) * (1.2 - Math.min(0.8, distCenter)) * jitter;
    });
    const wSum = weights.reduce((a, b) => a + b, 0) || 1;

    for (let i = 0; i < prices.length; i++) {
      const p = prices[i];
      const rowVol = (totalVol * weights[i]) / wSum;
      const ratioSeed = (Math.sin(candle.time * 0.03 + i * 2.3) + 1) * 0.5;
      const askShare = isBull ? 0.54 + ratioSeed * 0.24 : 0.22 + ratioSeed * 0.24;
      const ask = rowVol * askShare;
      const bid = rowVol * (1 - askShare);
      bucketMap.set(p, { bid, ask });
    }
  }

  const sortedPrices = Array.from(bucketMap.keys()).sort((a, b) => a - b);
  let pocPrice = sortedPrices[0] ?? candle.close;
  let maxRowTotal = -1;
  let totalBid = 0;
  let totalAsk = 0;

  const rawRows = sortedPrices.map((p) => {
    const val = bucketMap.get(p)!;
    const tot = val.bid + val.ask;
    if (tot > maxRowTotal) {
      maxRowTotal = tot;
      pocPrice = p;
    }
    totalBid += val.bid;
    totalAsk += val.ask;
    return {
      price: p,
      bidVol: val.bid,
      askVol: val.ask,
      delta: val.ask - val.bid,
      bidImbalance: false,
      askImbalance: false,
    };
  });

  // Diagonal Bid/Ask Imbalance Detection (Ask[i] vs Bid[i-1], Bid[i] vs Ask[i+1])
  if (config.showImbalances) {
    const ratio = Math.max(1.5, config.imbalanceRatio);
    for (let i = 0; i < rawRows.length; i++) {
      if (i > 0 && rawRows[i].askVol > 0) {
        const diagBid = rawRows[i - 1].bidVol;
        if (diagBid > 0 && rawRows[i].askVol >= diagBid * ratio) {
          rawRows[i].askImbalance = true;
        }
      }
      if (i < rawRows.length - 1 && rawRows[i].bidVol > 0) {
        const diagAsk = rawRows[i + 1].askVol;
        if (diagAsk > 0 && rawRows[i].bidVol >= diagAsk * ratio) {
          rawRows[i].bidImbalance = true;
        }
      }
    }
  }

  return {
    time: candle.time,
    step,
    rows: rawRows,
    pocPrice,
    totalBid,
    totalAsk,
    delta: totalAsk - totalBid,
    isRealFlow,
  };
}

export function computeCVDSeries(
  candles: Candle[],
  ticksByCandle: Map<number, OrderFlowTick[]>
): Array<{ time: number; cvd: number; barDelta: number }> {
  let cumulative = 0;
  const out: Array<{ time: number; cvd: number; barDelta: number }> = [];

  for (const c of candles) {
    const ticks = ticksByCandle.get(c.time);
    let delta = 0;
    if (ticks && ticks.length > 0) {
      for (const t of ticks) {
        delta += t.side === 'buy' ? t.qty : -t.qty;
      }
    } else {
      const range = Math.max(c.high - c.low, 1e-9);
      const bodyRatio = (c.close - c.open) / range; // -1..+1
      delta = c.volume * bodyRatio * 0.65;
    }
    cumulative += delta;
    out.push({ time: c.time, cvd: cumulative, barDelta: delta });
  }

  return out;
}
