import {
  computeBollingerBands,
  computeEMA,
  computeRSI,
  computeSupertrend,
} from '@/services/indicators';
import { computeRSIDivergences } from '@/services/rsiDivergence';
import {
  BacktestResult,
  BacktestStrategyId,
  BacktestTrade,
  Candle,
  RSIDivergenceConfig,
} from '@/types/trading';

const STRATEGY_NAMES: Record<BacktestStrategyId, string> = {
  rsi_divergence: 'RSI Divergence Pro (Reg / Exag / Hid)',
  ema_cross: 'EMA Crossover (9 / 21)',
  rsi_reversion: 'RSI Mean Reversion (30 / 70)',
  supertrend: 'Supertrend Trend Follower (10, 3)',
  bb_breakout: 'Bollinger Bands Breakout (20, 2)',
};

export function runBacktest(
  candles: Candle[],
  strategyId: BacktestStrategyId,
  initialCapital = 10000,
  rsiDivConfig?: RSIDivergenceConfig
): BacktestResult {
  const empty: BacktestResult = {
    strategyId,
    strategyName: STRATEGY_NAMES[strategyId],
    initialCapital,
    finalEquity: initialCapital,
    netProfitUsd: 0,
    netProfitPct: 0,
    winRatePct: 0,
    profitFactor: 0,
    maxDrawdownPct: 0,
    totalTrades: 0,
    equityCurve: [initialCapital],
    trades: [],
  };

  if (candles.length < 40) return empty;

  const trades: BacktestTrade[] = [];
  let equity = initialCapital;
  let peakEquity = initialCapital;
  let maxDD = 0;
  const equityCurve: number[] = [initialCapital];

  if (strategyId === 'rsi_divergence') {
    const cfg: RSIDivergenceConfig = rsiDivConfig ?? {
      rsiPeriod: 14,
      pivotLeft: 4,
      pivotRight: 3,
      enableRegular: true,
      enableExaggerated: true,
      enableHidden: true,
      doubleTopTolerancePct: 0.35,
      goldenRatioMin: 0.5,
      goldenRatioTarget: 0.618,
      goldenRatioMax: 0.65,
      maxSetups: 4,
      hideMitigated: true,
      enableAlerts: true,
    };
    const sigs = computeRSIDivergences(candles, cfg, false).filter((s) => s.valid);
    const idxByTime = new Map<number, number>();
    candles.forEach((c, idx) => idxByTime.set(c.time, idx));

    for (const sig of sigs) {
      const startIdx = idxByTime.get(sig.entryTime);
      if (startIdx === undefined || startIdx >= candles.length - 1) continue;

      const riskAmt = equity * 0.02;
      const stopDist = Math.max(Math.abs(sig.entryPrice - sig.stopLoss), sig.entryPrice * 0.001);
      const qty = riskAmt / stopDist;

      let exitIdx = candles.length - 1;
      let exitPrice = candles[exitIdx].close;
      let reason = 'EOD';

      for (let k = startIdx + 1; k < candles.length; k++) {
        const c = candles[k];
        if (sig.direction === 'bull') {
          if (c.low <= sig.stopLoss) {
            exitIdx = k;
            exitPrice = sig.stopLoss;
            reason = `${sig.kind.toUpperCase()} SL`;
            break;
          }
          if (c.high >= sig.takeProfit) {
            exitIdx = k;
            exitPrice = sig.takeProfit;
            reason = `${sig.kind.toUpperCase()} TP`;
            break;
          }
        } else {
          if (c.high >= sig.stopLoss) {
            exitIdx = k;
            exitPrice = sig.stopLoss;
            reason = `${sig.kind.toUpperCase()} SL`;
            break;
          }
          if (c.low <= sig.takeProfit) {
            exitIdx = k;
            exitPrice = sig.takeProfit;
            reason = `${sig.kind.toUpperCase()} TP`;
            break;
          }
        }
      }

      const diff = sig.direction === 'bull' ? exitPrice - sig.entryPrice : sig.entryPrice - exitPrice;
      const pnlUsd = diff * qty;
      equity += pnlUsd;
      peakEquity = Math.max(peakEquity, equity);
      maxDD = Math.max(maxDD, ((peakEquity - equity) / peakEquity) * 100);
      equityCurve.push(equity);

      trades.push({
        id: sig.id,
        side: sig.direction === 'bull' ? 'buy' : 'sell',
        entryTime: sig.entryTime,
        entryPrice: sig.entryPrice,
        exitTime: candles[exitIdx].time,
        exitPrice,
        pnlUsd,
        pnlPct: (pnlUsd / Math.max(equity - pnlUsd, 1)) * 100,
        reason,
      });
    }
  } else {
    const fastMap = new Map(computeEMA(candles, 9).map((p) => [p.time, p.value]));
    const slowMap = new Map(computeEMA(candles, 21).map((p) => [p.time, p.value]));
    const rsiMap = new Map(computeRSI(candles, 14).map((p) => [p.time, p.value]));
    const stMap = new Map(computeSupertrend(candles, 10, 3).map((p) => [p.time, p]));
    const bb = computeBollingerBands(candles, 20, 2);
    const bbUpMap = new Map(bb.upper.map((p) => [p.time, p.value]));
    const bbLowMap = new Map(bb.lower.map((p) => [p.time, p.value]));

    let pos: { side: 'buy' | 'sell'; entryTime: number; entryPrice: number } | null = null;

    for (let i = 25; i < candles.length; i++) {
      const c = candles[i];
      const prev = candles[i - 1];
      let signal: 'buy' | 'sell' | null = null;

      if (strategyId === 'ema_cross') {
        const f0 = fastMap.get(prev.time);
        const s0 = slowMap.get(prev.time);
        const f1 = fastMap.get(c.time);
        const s1 = slowMap.get(c.time);
        if (f0 && s0 && f1 && s1) {
          if (f0 <= s0 && f1 > s1) signal = 'buy';
          else if (f0 >= s0 && f1 < s1) signal = 'sell';
        }
      } else if (strategyId === 'rsi_reversion') {
        const r = rsiMap.get(c.time);
        if (r !== undefined) {
          if (r < 32) signal = 'buy';
          else if (r > 68) signal = 'sell';
        }
      } else if (strategyId === 'supertrend') {
        const st = stMap.get(c.time);
        if (st) {
          signal = c.close >= st.value ? 'buy' : 'sell';
        }
      } else if (strategyId === 'bb_breakout') {
        const up = bbUpMap.get(c.time);
        const lo = bbLowMap.get(c.time);
        if (up && lo) {
          if (c.close > up) signal = 'buy';
          else if (c.close < lo) signal = 'sell';
        }
      }

      if (signal && (!pos || pos.side !== signal)) {
        if (pos) {
          const ret =
            pos.side === 'buy'
              ? (c.close - pos.entryPrice) / pos.entryPrice
              : (pos.entryPrice - c.close) / pos.entryPrice;
          const pnlUsd = equity * ret;
          equity += pnlUsd;
          peakEquity = Math.max(peakEquity, equity);
          maxDD = Math.max(maxDD, ((peakEquity - equity) / peakEquity) * 100);
          equityCurve.push(equity);

          trades.push({
            id: `bt_${trades.length + 1}`,
            side: pos.side,
            entryTime: pos.entryTime,
            entryPrice: pos.entryPrice,
            exitTime: c.time,
            exitPrice: c.close,
            pnlUsd,
            pnlPct: ret * 100,
            reason: 'Flip Signal',
          });
        }
        pos = { side: signal, entryTime: c.time, entryPrice: c.close };
      }
    }
  }

  const wins = trades.filter((t) => t.pnlUsd > 0);
  const losses = trades.filter((t) => t.pnlUsd <= 0);
  const grossWin = wins.reduce((s, t) => s + t.pnlUsd, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnlUsd, 0));

  return {
    strategyId,
    strategyName: STRATEGY_NAMES[strategyId],
    initialCapital,
    finalEquity: equity,
    netProfitUsd: equity - initialCapital,
    netProfitPct: ((equity - initialCapital) / initialCapital) * 100,
    winRatePct: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0,
    maxDrawdownPct: maxDD,
    totalTrades: trades.length,
    equityCurve,
    trades,
  };
}
