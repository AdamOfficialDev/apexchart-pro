import { computeRSI } from '@/services/indicators';
import { Candle, RSIDivergenceConfig, RSIDivergenceSignal } from '@/types/trading';

interface PivotPoint {
  index: number;
  time: number;
  price: number;
  rsi: number;
  kind: 'high' | 'low';
}

export function computeRSIDivergences(
  candles: Candle[],
  config: RSIDivergenceConfig,
  applyClutterFilter = false
): RSIDivergenceSignal[] {
  if (candles.length < config.rsiPeriod + 20) return [];

  const rsiPoints = computeRSI(candles, config.rsiPeriod, 'close');
  const rsiByTime = new Map<number, number>();
  for (const p of rsiPoints) rsiByTime.set(p.time, p.value);

  const rsiArr: (number | null)[] = candles.map((c) => rsiByTime.get(c.time) ?? null);
  const left = Math.max(2, config.pivotLeft);
  const right = Math.max(2, config.pivotRight);

  const pivotHighs: PivotPoint[] = [];
  const pivotLows: PivotPoint[] = [];

  for (let i = left; i < candles.length - right; i++) {
    const r = rsiArr[i];
    if (r === null) continue;

    let isHigh = true;
    let isLow = true;
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isHigh = false;
      if (candles[j].low <= candles[i].low) isLow = false;
    }

    if (isHigh) {
      pivotHighs.push({
        index: i,
        time: candles[i].time,
        price: candles[i].high,
        rsi: r,
        kind: 'high',
      });
    }
    if (isLow) {
      pivotLows.push({
        index: i,
        time: candles[i].time,
        price: candles[i].low,
        rsi: r,
        kind: 'low',
      });
    }
  }

  const signals: RSIDivergenceSignal[] = [];
  const tolFrac = Math.max(0.0005, config.doubleTopTolerancePct / 100);

  const checkMitigated = (
    direction: 'bull' | 'bear',
    entryIdx: number,
    sl: number,
    tp: number
  ): boolean => {
    for (let k = entryIdx + 1; k < candles.length; k++) {
      const c = candles[k];
      if (direction === 'bull') {
        if (c.low <= sl || c.high >= tp) return true;
      } else {
        if (c.high >= sl || c.low <= tp) return true;
      }
    }
    return false;
  };

  const buildTrendlineBreakSetup = (
    direction: 'bull' | 'bear',
    p1: PivotPoint,
    p2: PivotPoint
  ) => {
    let midIdx = p1.index + 1;
    for (let k = p1.index + 1; k < p2.index; k++) {
      if (direction === 'bull') {
        if (candles[k].high > candles[midIdx].high) midIdx = k;
      } else {
        if (candles[k].low < candles[midIdx].low) midIdx = k;
      }
    }

    let anchor2Idx = Math.max(midIdx, p2.index - 1);
    let bestShoulderDist = -Infinity;
    for (let k = midIdx + 1; k < p2.index; k++) {
      if (direction === 'bull') {
        if (candles[k].high < candles[midIdx].high && candles[k].high > bestShoulderDist) {
          bestShoulderDist = candles[k].high;
          anchor2Idx = k;
        }
      } else {
        if (
          candles[k].low > candles[midIdx].low &&
          (bestShoulderDist === -Infinity || candles[k].low < bestShoulderDist)
        ) {
          bestShoulderDist = candles[k].low;
          anchor2Idx = k;
        }
      }
    }

    const idxA = midIdx;
    const valA = direction === 'bull' ? candles[idxA].high : candles[idxA].low;
    const idxB = anchor2Idx > idxA ? anchor2Idx : p2.index - 1;
    const valB =
      idxB > idxA
        ? direction === 'bull'
          ? candles[idxB].high
          : candles[idxB].low
        : valA;

    const spanIdx = Math.max(1, idxB - idxA);
    const slope = (valB - valA) / spanIdx;

    let valid = false;
    let entryIdx = Math.min(candles.length - 1, p2.index + 1);
    let entryPrice = candles[entryIdx].close;
    let endPlotIdx = Math.min(candles.length - 1, p2.index + 16);

    for (let k = p2.index + 1; k <= Math.min(candles.length - 1, p2.index + 24); k++) {
      const tlAtK = valA + slope * (k - idxA);
      const c = candles[k];
      if (direction === 'bull') {
        if (c.close > tlAtK && c.close > c.open) {
          valid = true;
          entryIdx = k;
          entryPrice = c.close;
          endPlotIdx = Math.max(k + 2, idxB + 2);
          break;
        }
      } else {
        if (c.close < tlAtK && c.close < c.open) {
          valid = true;
          entryIdx = k;
          entryPrice = c.close;
          endPlotIdx = Math.max(k + 2, idxB + 2);
          break;
        }
      }
    }

    const tlEndIdx = Math.min(candles.length - 1, endPlotIdx);
    const tlEndVal = valA + slope * (tlEndIdx - idxA);

    return {
      trendline: {
        t1: candles[idxA].time,
        p1: valA,
        t2: candles[tlEndIdx].time,
        p2: tlEndVal,
      },
      valid,
      entryIdx,
      entryTime: candles[entryIdx].time,
      entryPrice,
    };
  };

  for (let i = 1; i < pivotLows.length; i++) {
    const p1 = pivotLows[i - 1];
    const p2 = pivotLows[i];
    if (p2.index - p1.index > 55 || p2.index - p1.index < 4) continue;

    const priceDiffRatio = Math.abs(p2.price - p1.price) / Math.max(p1.price, 1e-9);

    if (config.enableExaggerated && priceDiffRatio <= tolFrac && p2.rsi > p1.rsi + 1.2) {
      const setup = buildTrendlineBreakSetup('bull', p1, p2);
      const sl = Math.min(p1.price, p2.price);
      const risk = Math.max(setup.entryPrice - sl, p2.price * 0.001);
      const tp = setup.entryPrice + risk * 2;
      signals.push({
        id: `div_exag_bull_${p2.time}`,
        kind: 'exaggerated',
        direction: 'bull',
        p1Index: p1.index,
        p1Time: p1.time,
        p1Price: p1.price,
        p1Rsi: p1.rsi,
        p2Index: p2.index,
        p2Time: p2.time,
        p2Price: p2.price,
        p2Rsi: p2.rsi,
        trendline: setup.trendline,
        valid: setup.valid,
        mitigated: setup.valid ? checkMitigated('bull', setup.entryIdx, sl, tp) : false,
        entryTime: setup.entryTime,
        entryPrice: setup.entryPrice,
        stopLoss: sl,
        takeProfit: tp,
      });
      continue;
    }

    if (
      config.enableRegular &&
      p2.price < p1.price * (1 - tolFrac) &&
      p2.rsi > p1.rsi + 1.0
    ) {
      const setup = buildTrendlineBreakSetup('bull', p1, p2);
      const sl = p2.price;
      const risk = Math.max(setup.entryPrice - sl, p2.price * 0.001);
      const tp = setup.entryPrice + risk * 2;
      signals.push({
        id: `div_reg_bull_${p2.time}`,
        kind: 'regular',
        direction: 'bull',
        p1Index: p1.index,
        p1Time: p1.time,
        p1Price: p1.price,
        p1Rsi: p1.rsi,
        p2Index: p2.index,
        p2Time: p2.time,
        p2Price: p2.price,
        p2Rsi: p2.rsi,
        trendline: setup.trendline,
        valid: setup.valid,
        mitigated: setup.valid ? checkMitigated('bull', setup.entryIdx, sl, tp) : false,
        entryTime: setup.entryTime,
        entryPrice: setup.entryPrice,
        stopLoss: sl,
        takeProfit: tp,
      });
      continue;
    }

    if (
      config.enableHidden &&
      p2.price > p1.price * (1 + tolFrac) &&
      p2.rsi < p1.rsi - 1.0
    ) {
      let prevHigh = -Infinity;
      for (let k = p1.index; k <= p2.index; k++) {
        if (candles[k].high > prevHigh) prevHigh = candles[k].high;
      }
      const prevLow = p1.price;
      const span = Math.max(prevHigh - prevLow, p2.price * 0.002);

      const goldenTop = prevHigh - span * config.goldenRatioMin;
      const goldenMid = prevHigh - span * config.goldenRatioTarget;
      const goldenBot = prevHigh - span * config.goldenRatioMax;

      let valid = false;
      let entryIdx = p2.index;
      const endScan = Math.min(candles.length - 1, p2.index + 20);

      if (p2.price <= goldenTop && p2.price >= goldenBot) {
        valid = true;
        entryIdx = p2.index;
      } else {
        for (let k = p2.index + 1; k <= endScan; k++) {
          if (candles[k].low <= goldenTop && candles[k].high >= goldenBot) {
            valid = true;
            entryIdx = k;
            break;
          }
        }
      }

      const endTime = candles[Math.min(candles.length - 1, p2.index + 14)].time;
      const tp = prevHigh + span * 0.272;
      signals.push({
        id: `div_hid_bull_${p2.time}`,
        kind: 'hidden',
        direction: 'bull',
        p1Index: p1.index,
        p1Time: p1.time,
        p1Price: p1.price,
        p1Rsi: p1.rsi,
        p2Index: p2.index,
        p2Time: p2.time,
        p2Price: p2.price,
        p2Rsi: p2.rsi,
        fibSetup: {
          prevLow,
          prevHigh,
          startTime: p1.time,
          endTime,
          goldenTop,
          goldenMid,
          goldenBot,
        },
        valid,
        mitigated: valid ? checkMitigated('bull', entryIdx, prevLow, tp) : false,
        entryTime: candles[entryIdx].time,
        entryPrice: goldenMid,
        stopLoss: prevLow,
        takeProfit: tp,
      });
    }
  }

  for (let i = 1; i < pivotHighs.length; i++) {
    const p1 = pivotHighs[i - 1];
    const p2 = pivotHighs[i];
    if (p2.index - p1.index > 55 || p2.index - p1.index < 4) continue;

    const priceDiffRatio = Math.abs(p2.price - p1.price) / Math.max(p1.price, 1e-9);

    if (config.enableExaggerated && priceDiffRatio <= tolFrac && p2.rsi < p1.rsi - 1.2) {
      const setup = buildTrendlineBreakSetup('bear', p1, p2);
      const sl = Math.max(p1.price, p2.price);
      const risk = Math.max(sl - setup.entryPrice, p2.price * 0.001);
      const tp = Math.max(0.00001, setup.entryPrice - risk * 2);
      signals.push({
        id: `div_exag_bear_${p2.time}`,
        kind: 'exaggerated',
        direction: 'bear',
        p1Index: p1.index,
        p1Time: p1.time,
        p1Price: p1.price,
        p1Rsi: p1.rsi,
        p2Index: p2.index,
        p2Time: p2.time,
        p2Price: p2.price,
        p2Rsi: p2.rsi,
        trendline: setup.trendline,
        valid: setup.valid,
        mitigated: setup.valid ? checkMitigated('bear', setup.entryIdx, sl, tp) : false,
        entryTime: setup.entryTime,
        entryPrice: setup.entryPrice,
        stopLoss: sl,
        takeProfit: tp,
      });
      continue;
    }

    if (
      config.enableRegular &&
      p2.price > p1.price * (1 + tolFrac) &&
      p2.rsi < p1.rsi - 1.0
    ) {
      const setup = buildTrendlineBreakSetup('bear', p1, p2);
      const sl = p2.price;
      const risk = Math.max(sl - setup.entryPrice, p2.price * 0.001);
      const tp = Math.max(0.00001, setup.entryPrice - risk * 2);
      signals.push({
        id: `div_reg_bear_${p2.time}`,
        kind: 'regular',
        direction: 'bear',
        p1Index: p1.index,
        p1Time: p1.time,
        p1Price: p1.price,
        p1Rsi: p1.rsi,
        p2Index: p2.index,
        p2Time: p2.time,
        p2Price: p2.price,
        p2Rsi: p2.rsi,
        trendline: setup.trendline,
        valid: setup.valid,
        mitigated: setup.valid ? checkMitigated('bear', setup.entryIdx, sl, tp) : false,
        entryTime: setup.entryTime,
        entryPrice: setup.entryPrice,
        stopLoss: sl,
        takeProfit: tp,
      });
      continue;
    }

    if (
      config.enableHidden &&
      p2.price < p1.price * (1 - tolFrac) &&
      p2.rsi > p1.rsi + 1.0
    ) {
      let prevLow = Infinity;
      for (let k = p1.index; k <= p2.index; k++) {
        if (candles[k].low < prevLow) prevLow = candles[k].low;
      }
      const prevHigh = p1.price;
      const span = Math.max(prevHigh - prevLow, p2.price * 0.002);

      const goldenBot = prevLow + span * config.goldenRatioMin;
      const goldenMid = prevLow + span * config.goldenRatioTarget;
      const goldenTop = prevLow + span * config.goldenRatioMax;

      let valid = false;
      let entryIdx = p2.index;
      const endScan = Math.min(candles.length - 1, p2.index + 20);

      if (p2.price >= goldenBot && p2.price <= goldenTop) {
        valid = true;
        entryIdx = p2.index;
      } else {
        for (let k = p2.index + 1; k <= endScan; k++) {
          if (candles[k].high >= goldenBot && candles[k].low <= goldenTop) {
            valid = true;
            entryIdx = k;
            break;
          }
        }
      }

      const endTime = candles[Math.min(candles.length - 1, p2.index + 14)].time;
      const tp = Math.max(0.00001, prevLow - span * 0.272);
      signals.push({
        id: `div_hid_bear_${p2.time}`,
        kind: 'hidden',
        direction: 'bear',
        p1Index: p1.index,
        p1Time: p1.time,
        p1Price: p1.price,
        p1Rsi: p1.rsi,
        p2Index: p2.index,
        p2Time: p2.time,
        p2Price: p2.price,
        p2Rsi: p2.rsi,
        fibSetup: {
          prevLow,
          prevHigh,
          startTime: p1.time,
          endTime,
          goldenTop,
          goldenMid,
          goldenBot,
        },
        valid,
        mitigated: valid ? checkMitigated('bear', entryIdx, prevHigh, tp) : false,
        entryTime: candles[entryIdx].time,
        entryPrice: goldenMid,
        stopLoss: prevHigh,
        takeProfit: tp,
      });
    }
  }

  const sorted = signals.sort((a, b) => a.p2Time - b.p2Time);
  if (!applyClutterFilter) return sorted;

  const filtered = config.hideMitigated ? sorted.filter((s) => !s.mitigated) : sorted;
  const maxKeep = Math.max(1, config.maxSetups ?? 4);
  return filtered.slice(-maxKeep);
}
