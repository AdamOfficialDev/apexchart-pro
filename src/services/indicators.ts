import { Candle } from '@/types/trading';

export interface TimeValuePoint {
  time: number;
  value: number;
}

export interface ColoredPoint {
  time: number;
  value: number;
  color?: string;
}

export function computeHeikinAshi(candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];
  const result: Candle[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen =
      i === 0 ? (c.open + c.close) / 2 : (result[i - 1].open + result[i - 1].close) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    result.push({
      time: c.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: c.volume,
    });
  }
  return result;
}

export function computeSMA(candles: Candle[], period = 20): TimeValuePoint[] {
  if (candles.length < period || period < 1) return [];
  const out: TimeValuePoint[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) {
      out.push({ time: candles[i].time, value: sum / period });
    }
  }
  return out;
}

export function computeEMA(candles: Candle[], period = 21): TimeValuePoint[] {
  if (candles.length < period || period < 1) return [];
  const k = 2 / (period + 1);
  const out: TimeValuePoint[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i].close;
  let ema = sum / period;
  out.push({ time: candles[period - 1].time, value: ema });
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    out.push({ time: candles[i].time, value: ema });
  }
  return out;
}

export function computeBollingerBands(candles: Candle[], period = 20, stdDevMult = 2) {
  const upper: TimeValuePoint[] = [];
  const middle: TimeValuePoint[] = [];
  const lower: TimeValuePoint[] = [];
  if (candles.length < period) return { upper, middle, lower };

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    const mean = sum / period;

    let sqDiff = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = candles[j].close - mean;
      sqDiff += diff * diff;
    }
    const sd = Math.sqrt(sqDiff / period);
    const t = candles[i].time;
    middle.push({ time: t, value: mean });
    upper.push({ time: t, value: mean + stdDevMult * sd });
    lower.push({ time: t, value: mean - stdDevMult * sd });
  }

  return { upper, middle, lower };
}

export function computeVWAP(candles: Candle[]): TimeValuePoint[] {
  if (candles.length === 0) return [];
  const out: TimeValuePoint[] = [];
  let cumPV = 0;
  let cumVol = 0;
  let currentDay = -1;

  for (const c of candles) {
    const utcDay = Math.floor(c.time / 86400);
    if (utcDay !== currentDay) {
      cumPV = 0;
      cumVol = 0;
      currentDay = utcDay;
    }
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = Math.max(c.volume, 1);
    cumPV += typicalPrice * vol;
    cumVol += vol;
    out.push({ time: c.time, value: cumPV / cumVol });
  }
  return out;
}

export function computeATR(candles: Candle[], period = 14): TimeValuePoint[] {
  if (candles.length < period + 1) return [];
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close)
    );
    trs.push(tr);
  }

  const out: TimeValuePoint[] = [];
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push({ time: candles[period].time, value: atr });

  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    out.push({ time: candles[i + 1].time, value: atr });
  }
  return out;
}

export function computeSupertrend(
  candles: Candle[],
  period = 10,
  multiplier = 3,
  bullColor = '#10B981',
  bearColor = '#F43F5E'
): ColoredPoint[] {
  const atrPoints = computeATR(candles, period);
  if (atrPoints.length === 0) return [];

  const atrMap = new Map<number, number>();
  for (const p of atrPoints) atrMap.set(p.time, p.value);

  const out: ColoredPoint[] = [];
  let prevFinalUpper = 0;
  let prevFinalLower = 0;
  let prevTrend: 1 | -1 = 1;
  let initialized = false;

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const atr = atrMap.get(c.time);
    if (atr === undefined) continue;

    const hl2 = (c.high + c.low) / 2;
    const basicUpper = hl2 + multiplier * atr;
    const basicLower = hl2 - multiplier * atr;

    if (!initialized) {
      prevFinalUpper = basicUpper;
      prevFinalLower = basicLower;
      prevTrend = c.close >= hl2 ? 1 : -1;
      initialized = true;
      out.push({
        time: c.time,
        value: prevTrend === 1 ? prevFinalLower : prevFinalUpper,
        color: prevTrend === 1 ? bullColor : bearColor,
      });
      continue;
    }

    const prevClose = candles[i - 1].close;
    const finalUpper =
      basicUpper < prevFinalUpper || prevClose > prevFinalUpper ? basicUpper : prevFinalUpper;
    const finalLower =
      basicLower > prevFinalLower || prevClose < prevFinalLower ? basicLower : prevFinalLower;

    let trend: 1 | -1 = prevTrend;
    if (prevTrend === -1 && c.close > prevFinalUpper) {
      trend = 1;
    } else if (prevTrend === 1 && c.close < prevFinalLower) {
      trend = -1;
    }

    prevFinalUpper = finalUpper;
    prevFinalLower = finalLower;
    prevTrend = trend;

    out.push({
      time: c.time,
      value: trend === 1 ? finalLower : finalUpper,
      color: trend === 1 ? bullColor : bearColor,
    });
  }
  return out;
}

export function computeDonchian(candles: Candle[], period = 20) {
  const upper: TimeValuePoint[] = [];
  const middle: TimeValuePoint[] = [];
  const lower: TimeValuePoint[] = [];
  if (candles.length < period) return { upper, middle, lower };

  for (let i = period - 1; i < candles.length; i++) {
    let maxH = -Infinity;
    let minL = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > maxH) maxH = candles[j].high;
      if (candles[j].low < minL) minL = candles[j].low;
    }
    const t = candles[i].time;
    upper.push({ time: t, value: maxH });
    lower.push({ time: t, value: minL });
    middle.push({ time: t, value: (maxH + minL) / 2 });
  }
  return { upper, middle, lower };
}

export function computeRSI(candles: Candle[], period = 14): TimeValuePoint[] {
  if (candles.length <= period) return [];
  const out: TimeValuePoint[] = [];

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  const calcRsi = (g: number, l: number) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  out.push({ time: candles[period].time, value: calcRsi(avgGain, avgLoss) });

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out.push({ time: candles[i].time, value: calcRsi(avgGain, avgLoss) });
  }

  return out;
}

export function computeMACD(candles: Candle[], fast = 12, slow = 26, signalPeriod = 9) {
  const fastEma = computeEMA(candles, fast);
  const slowEma = computeEMA(candles, slow);
  if (fastEma.length === 0 || slowEma.length === 0) {
    return { macd: [] as TimeValuePoint[], signal: [] as TimeValuePoint[], histogram: [] as ColoredPoint[] };
  }

  const fastMap = new Map(fastEma.map((p) => [p.time, p.value]));
  const macdLine: TimeValuePoint[] = [];

  for (const s of slowEma) {
    const f = fastMap.get(s.time);
    if (f !== undefined) {
      macdLine.push({ time: s.time, value: f - s.value });
    }
  }

  if (macdLine.length < signalPeriod) {
    return { macd: macdLine, signal: [] as TimeValuePoint[], histogram: [] as ColoredPoint[] };
  }

  const signalLine: TimeValuePoint[] = [];
  const histogram: ColoredPoint[] = [];
  const k = 2 / (signalPeriod + 1);

  let sum = 0;
  for (let i = 0; i < signalPeriod; i++) sum += macdLine[i].value;
  let sig = sum / signalPeriod;

  for (let i = signalPeriod - 1; i < macdLine.length; i++) {
    if (i > signalPeriod - 1) {
      sig = macdLine[i].value * k + sig * (1 - k);
    }
    const histVal = macdLine[i].value - sig;
    signalLine.push({ time: macdLine[i].time, value: sig });
    histogram.push({
      time: macdLine[i].time,
      value: histVal,
      color: histVal >= 0 ? 'rgba(16, 185, 129, 0.72)' : 'rgba(244, 63, 94, 0.72)',
    });
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

export function computeStochastic(
  candles: Candle[],
  kPeriod = 14,
  dPeriod = 3,
  smooth = 3
): { k: TimeValuePoint[]; d: TimeValuePoint[] } {
  if (candles.length < kPeriod + smooth + dPeriod) return { k: [], d: [] };

  const rawK: TimeValuePoint[] = [];
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (candles[j].high > highest) highest = candles[j].high;
      if (candles[j].low < lowest) lowest = candles[j].low;
    }
    const range = highest - lowest;
    const val = range === 0 ? 50 : ((candles[i].close - lowest) / range) * 100;
    rawK.push({ time: candles[i].time, value: val });
  }

  const smoothArr = (arr: TimeValuePoint[], p: number): TimeValuePoint[] => {
    const out: TimeValuePoint[] = [];
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      sum += arr[i].value;
      if (i >= p) sum -= arr[i - p].value;
      if (i >= p - 1) out.push({ time: arr[i].time, value: sum / p });
    }
    return out;
  };

  const k = smoothArr(rawK, Math.max(1, smooth));
  const d = smoothArr(k, Math.max(1, dPeriod));
  return { k, d };
}
