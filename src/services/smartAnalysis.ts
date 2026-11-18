import {
  computeEMA,
  computeRSI,
  computeSMA,
  computeStochastic,
  computeSupertrend,
  computeVWAP,
} from '@/services/indicators';
import { Candle } from '@/types/trading';

export interface VPVRBin {
  priceLow: number;
  priceHigh: number;
  priceMid: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
}

export interface VolumeProfileResult {
  bins: VPVRBin[];
  maxVolume: number;
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
}

export function computeVPVR(candles: Candle[], numBins = 44): VolumeProfileResult | null {
  if (candles.length < 10) return null;
  let minP = Infinity;
  let maxP = -Infinity;
  for (const c of candles) {
    if (c.low < minP) minP = c.low;
    if (c.high > maxP) maxP = c.high;
  }
  const span = maxP - minP;
  if (span <= 0) return null;

  const step = span / numBins;
  const bins: VPVRBin[] = Array.from({ length: numBins }, (_, i) => ({
    priceLow: minP + i * step,
    priceHigh: minP + (i + 1) * step,
    priceMid: minP + (i + 0.5) * step,
    buyVolume: 0,
    sellVolume: 0,
    totalVolume: 0,
  }));

  let totalVol = 0;
  for (const c of candles) {
    const startIdx = Math.max(0, Math.min(numBins - 1, Math.floor((c.low - minP) / step)));
    const endIdx = Math.max(0, Math.min(numBins - 1, Math.floor((c.high - minP) / step)));
    const count = endIdx - startIdx + 1;
    const perBin = c.volume / Math.max(1, count);
    const isBuy = c.close >= c.open;
    for (let b = startIdx; b <= endIdx; b++) {
      if (isBuy) bins[b].buyVolume += perBin;
      else bins[b].sellVolume += perBin;
      bins[b].totalVolume += perBin;
    }
    totalVol += c.volume;
  }

  let pocIdx = 0;
  let maxBinVol = 0;
  for (let i = 0; i < bins.length; i++) {
    if (bins[i].totalVolume > maxBinVol) {
      maxBinVol = bins[i].totalVolume;
      pocIdx = i;
    }
  }

  // Value Area (70% of volume around POC)
  const targetVol = totalVol * 0.7;
  let captured = bins[pocIdx].totalVolume;
  let lo = pocIdx;
  let hi = pocIdx;

  while (captured < targetVol && (lo > 0 || hi < numBins - 1)) {
    const downVol = lo > 0 ? bins[lo - 1].totalVolume : -1;
    const upVol = hi < numBins - 1 ? bins[hi + 1].totalVolume : -1;
    if (upVol >= downVol && hi < numBins - 1) {
      hi++;
      captured += bins[hi].totalVolume;
    } else if (lo > 0) {
      lo--;
      captured += bins[lo].totalVolume;
    } else {
      break;
    }
  }

  return {
    bins,
    maxVolume: maxBinVol,
    pocPrice: bins[pocIdx].priceMid,
    vahPrice: bins[hi].priceHigh,
    valPrice: bins[lo].priceLow,
  };
}

export interface SwingPivot {
  time: number;
  price: number;
  index: number;
  kind: 'high' | 'low';
  label: 'HH' | 'LH' | 'HL' | 'LL';
}

export interface StructureBreak {
  timeStart: number;
  timeEnd: number;
  price: number;
  type: 'BOS' | 'CHoCH';
  direction: 'bull' | 'bear';
}

export interface FairValueGap {
  timeStart: number;
  timeEnd: number;
  top: number;
  bottom: number;
  direction: 'bull' | 'bear';
}

export interface AutoSRLevel {
  price: number;
  strength: number;
  kind: 'support' | 'resistance';
}

export interface AutoTrendline {
  t1: number;
  p1: number;
  t2: number;
  p2: number;
  kind: 'support' | 'resistance';
}

export interface MarketStructureResult {
  pivots: SwingPivot[];
  breaks: StructureBreak[];
  fvgs: FairValueGap[];
  srLevels: AutoSRLevel[];
  trendlines: AutoTrendline[];
}

export function computeMarketStructure(candles: Candle[]): MarketStructureResult {
  if (candles.length < 24) {
    return { pivots: [], breaks: [], fvgs: [], srLevels: [], trendlines: [] };
  }

  const left = 4;
  const right = 4;
  const rawPivots: { index: number; time: number; price: number; kind: 'high' | 'low' }[] = [];

  for (let i = left; i < candles.length - right; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isHigh = false;
      if (candles[j].low <= candles[i].low) isLow = false;
    }
    if (isHigh) {
      rawPivots.push({ index: i, time: candles[i].time, price: candles[i].high, kind: 'high' });
    }
    if (isLow) {
      rawPivots.push({ index: i, time: candles[i].time, price: candles[i].low, kind: 'low' });
    }
  }

  let lastHigh = -Infinity;
  let lastLow = Infinity;
  const pivots: SwingPivot[] = [];
  for (const p of rawPivots) {
    if (p.kind === 'high') {
      const label = lastHigh === -Infinity || p.price >= lastHigh ? 'HH' : 'LH';
      lastHigh = p.price;
      pivots.push({ ...p, label });
    } else {
      const label = lastLow === Infinity || p.price >= lastLow ? 'HL' : 'LL';
      lastLow = p.price;
      pivots.push({ ...p, label });
    }
  }

  // BOS & CHoCH detection
  const breaks: StructureBreak[] = [];
  let trend: 'bull' | 'bear' = 'bull';
  let activeSwingHigh: SwingPivot | null = null;
  let activeSwingLow: SwingPivot | null = null;

  const pivotByIdx = new Map<number, SwingPivot[]>();
  for (const p of pivots) {
    const arr = pivotByIdx.get(p.index) ?? [];
    arr.push(p);
    pivotByIdx.set(p.index, arr);
  }

  for (let i = 0; i < candles.length; i++) {
    const ps = pivotByIdx.get(i);
    if (ps) {
      for (const p of ps) {
        if (p.kind === 'high') activeSwingHigh = p;
        else activeSwingLow = p;
      }
    }
    const c = candles[i];
    if (activeSwingHigh && c.close > activeSwingHigh.price && i > activeSwingHigh.index) {
      breaks.push({
        timeStart: activeSwingHigh.time,
        timeEnd: c.time,
        price: activeSwingHigh.price,
        type: trend === 'bull' ? 'BOS' : 'CHoCH',
        direction: 'bull',
      });
      trend = 'bull';
      activeSwingHigh = null;
    }
    if (activeSwingLow && c.close < activeSwingLow.price && i > activeSwingLow.index) {
      breaks.push({
        timeStart: activeSwingLow.time,
        timeEnd: c.time,
        price: activeSwingLow.price,
        type: trend === 'bear' ? 'BOS' : 'CHoCH',
        direction: 'bear',
      });
      trend = 'bear';
      activeSwingLow = null;
    }
  }

  // Unmitigated Fair Value Gaps (last 120 bars)
  const fvgs: FairValueGap[] = [];
  const fvgStart = Math.max(2, candles.length - 120);
  const lastTime = candles[candles.length - 1].time;

  for (let i = fvgStart; i < candles.length - 1; i++) {
    const c0 = candles[i - 2];
    const c2 = candles[i];

    // Bullish FVG
    if (c2.low > c0.high && (c2.low - c0.high) / c0.high > 0.0008) {
      let mitigated = false;
      for (let k = i + 1; k < candles.length; k++) {
        if (candles[k].low <= c0.high) {
          mitigated = true;
          break;
        }
      }
      if (!mitigated) {
        fvgs.push({
          timeStart: c0.time,
          timeEnd: lastTime,
          top: c2.low,
          bottom: c0.high,
          direction: 'bull',
        });
      }
    }

    // Bearish FVG
    if (c2.high < c0.low && (c0.low - c2.high) / c0.low > 0.0008) {
      let mitigated = false;
      for (let k = i + 1; k < candles.length; k++) {
        if (candles[k].high >= c0.low) {
          mitigated = true;
          break;
        }
      }
      if (!mitigated) {
        fvgs.push({
          timeStart: c0.time,
          timeEnd: lastTime,
          top: c0.low,
          bottom: c2.high,
          direction: 'bear',
        });
      }
    }
  }

  // Auto Support & Resistance clusters
  const lastClose = candles[candles.length - 1].close;
  const clusters: { price: number; count: number }[] = [];
  for (const p of pivots.slice(-30)) {
    const hit = clusters.find((cl) => Math.abs(cl.price - p.price) / p.price < 0.0045);
    if (hit) {
      hit.price = (hit.price * hit.count + p.price) / (hit.count + 1);
      hit.count++;
    } else {
      clusters.push({ price: p.price, count: 1 });
    }
  }

  const srLevels: AutoSRLevel[] = clusters
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((cl) => ({
      price: cl.price,
      strength: cl.count,
      kind: cl.price >= lastClose ? 'resistance' : 'support',
    }));

  // Auto Trendlines (last two major highs & last two major lows)
  const trendlines: AutoTrendline[] = [];
  const highs = pivots.filter((p) => p.kind === 'high');
  const lows = pivots.filter((p) => p.kind === 'low');
  if (highs.length >= 2) {
    const a = highs[highs.length - 2];
    const b = highs[highs.length - 1];
    trendlines.push({ t1: a.time, p1: a.price, t2: b.time, p2: b.price, kind: 'resistance' });
  }
  if (lows.length >= 2) {
    const a = lows[lows.length - 2];
    const b = lows[lows.length - 1];
    trendlines.push({ t1: a.time, p1: a.price, t2: b.time, p2: b.price, kind: 'support' });
  }

  return {
    pivots: pivots.slice(-24),
    breaks: breaks.slice(-12),
    fvgs: fvgs.slice(-8),
    srLevels,
    trendlines,
  };
}

export function computeLinearRegression(
  candles: Candle[],
  t1: number,
  t2: number
): {
  startTime: number;
  endTime: number;
  midStart: number;
  midEnd: number;
  upperStart: number;
  upperEnd: number;
  lowerStart: number;
  lowerEnd: number;
} | null {
  const minT = Math.min(t1, t2);
  const maxT = Math.max(t1, t2);
  const slice = candles.filter((c) => c.time >= minT && c.time <= maxT);
  if (slice.length < 3) return null;

  const n = slice.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const y = slice[i].close;
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  }

  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  let sqErr = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * i;
    const diff = slice[i].close - pred;
    sqErr += diff * diff;
  }
  const sigma = Math.sqrt(sqErr / n) * 2;

  const midStart = intercept;
  const midEnd = intercept + slope * (n - 1);

  return {
    startTime: slice[0].time,
    endTime: slice[n - 1].time,
    midStart,
    midEnd,
    upperStart: midStart + sigma,
    upperEnd: midEnd + sigma,
    lowerStart: midStart - sigma,
    lowerEnd: midEnd - sigma,
  };
}

export type SignalRating = 'Strong Sell' | 'Sell' | 'Neutral' | 'Buy' | 'Strong Buy';

export interface TechnicalSignalRow {
  name: string;
  value: string;
  action: 'Buy' | 'Neutral' | 'Sell';
}

export interface TechnicalSummaryResult {
  score: number; // 0..100
  rating: SignalRating;
  buyCount: number;
  neutralCount: number;
  sellCount: number;
  oscillators: TechnicalSignalRow[];
  movingAverages: TechnicalSignalRow[];
}

export function computeTechnicalSummary(candles: Candle[]): TechnicalSummaryResult | null {
  if (candles.length < 30) return null;
  const last = candles[candles.length - 1];
  const price = last.close;

  const oscillators: TechnicalSignalRow[] = [];
  const movingAverages: TechnicalSignalRow[] = [];

  // RSI (14)
  const rsiArr = computeRSI(candles, 14);
  const rsi = rsiArr[rsiArr.length - 1]?.value ?? 50;
  oscillators.push({
    name: 'RSI (14)',
    value: rsi.toFixed(2),
    action: rsi < 35 ? 'Buy' : rsi > 65 ? 'Sell' : 'Neutral',
  });

  // Stochastic (14, 3, 3)
  const stoch = computeStochastic(candles, 14, 3, 3);
  const k = stoch.k[stoch.k.length - 1]?.value ?? 50;
  oscillators.push({
    name: 'Stochastic %K (14)',
    value: k.toFixed(1),
    action: k < 25 ? 'Buy' : k > 75 ? 'Sell' : 'Neutral',
  });

  // Momentum (10)
  const momPrev = candles[Math.max(0, candles.length - 11)].close;
  const momPct = ((price - momPrev) / Math.max(momPrev, 1e-9)) * 100;
  oscillators.push({
    name: 'Momentum (10)',
    value: `${momPct >= 0 ? '+' : ''}${momPct.toFixed(2)}%`,
    action: momPct > 0.35 ? 'Buy' : momPct < -0.35 ? 'Sell' : 'Neutral',
  });

  // VWAP
  const vwapArr = computeVWAP(candles);
  const vwap = vwapArr[vwapArr.length - 1]?.value ?? price;
  oscillators.push({
    name: 'VWAP Bias',
    value: vwap.toFixed(2),
    action: price > vwap * 1.001 ? 'Buy' : price < vwap * 0.999 ? 'Sell' : 'Neutral',
  });

  // Supertrend
  const stArr = computeSupertrend(candles, 10, 3);
  const stLast = stArr[stArr.length - 1];
  oscillators.push({
    name: 'Supertrend (10,3)',
    value: stLast ? stLast.value.toFixed(2) : '—',
    action: stLast ? (price >= stLast.value ? 'Buy' : 'Sell') : 'Neutral',
  });

  // Moving Averages
  const maSpecs: Array<{ label: string; fn: () => number | undefined }> = [
    { label: 'EMA (9)', fn: () => computeEMA(candles, 9).slice(-1)[0]?.value },
    { label: 'EMA (21)', fn: () => computeEMA(candles, 21).slice(-1)[0]?.value },
    { label: 'SMA (20)', fn: () => computeSMA(candles, 20).slice(-1)[0]?.value },
    { label: 'EMA (50)', fn: () => computeEMA(candles, 50).slice(-1)[0]?.value },
    { label: 'SMA (50)', fn: () => computeSMA(candles, 50).slice(-1)[0]?.value },
    { label: 'EMA (100)', fn: () => computeEMA(candles, 100).slice(-1)[0]?.value },
    { label: 'EMA (200)', fn: () => computeEMA(candles, 200).slice(-1)[0]?.value },
  ];

  for (const m of maSpecs) {
    const val = m.fn();
    if (val === undefined) continue;
    movingAverages.push({
      name: m.label,
      value: val.toFixed(2),
      action: price > val * 1.0005 ? 'Buy' : price < val * 0.9995 ? 'Sell' : 'Neutral',
    });
  }

  const all = [...oscillators, ...movingAverages];
  const buyCount = all.filter((x) => x.action === 'Buy').length;
  const sellCount = all.filter((x) => x.action === 'Sell').length;
  const neutralCount = all.filter((x) => x.action === 'Neutral').length;
  const total = Math.max(1, all.length);
  const score = Math.round(((buyCount + neutralCount * 0.5) / total) * 100);

  let rating: SignalRating = 'Neutral';
  if (score >= 74) rating = 'Strong Buy';
  else if (score >= 58) rating = 'Buy';
  else if (score <= 26) rating = 'Strong Sell';
  else if (score <= 42) rating = 'Sell';

  return {
    score,
    rating,
    buyCount,
    neutralCount,
    sellCount,
    oscillators,
    movingAverages,
  };
}
