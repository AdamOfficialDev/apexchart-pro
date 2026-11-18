import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getSymbolInfo } from '@/data/symbols';
import { cn } from '@/lib/utils';
import { fetchHistoricalCandles } from '@/services/marketData';
import { computeTechnicalSummary, SignalRating, TechnicalSummaryResult } from '@/services/smartAnalysis';
import { useTradingStore } from '@/store/useTradingStore';
import { TimeframeId } from '@/types/trading';

const MTF_LIST: TimeframeId[] = ['5m', '15m', '1h', '4h', '1D'];

function ratingBadgeColor(r: SignalRating): string {
  if (r === 'Strong Buy') return 'text-[#00D4AA]';
  if (r === 'Buy') return 'text-[#089981]';
  if (r === 'Strong Sell' || r === 'Sell') return 'text-[#F23645]';
  return 'text-[#787B86]';
}

export const TechnicalsPanel: React.FC = () => {
  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const updatePaneTimeframe = useTradingStore((s) => s.updatePaneTimeframe);

  const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0];
  const info = useMemo(() => getSymbolInfo(activePane.symbol), [activePane.symbol]);

  const [summary, setSummary] = useState<TechnicalSummaryResult | null>(null);
  const [mtfRatings, setMtfRatings] = useState<Record<string, SignalRating>>({});
  const [loading, setLoading] = useState(false);

  const loadSignals = async () => {
    setLoading(true);
    try {
      const mainRes = await fetchHistoricalCandles(activePane.symbol, activePane.timeframe);
      setSummary(computeTechnicalSummary(mainRes.candles));

      const mtfResults = await Promise.all(
        MTF_LIST.map(async (tf) => {
          const r = await fetchHistoricalCandles(activePane.symbol, tf);
          const s = computeTechnicalSummary(r.candles);
          return [tf, s?.rating ?? 'Neutral'] as const;
        })
      );
      const map: Record<string, SignalRating> = {};
      for (const [tf, rating] of mtfResults) map[tf] = rating;
      setMtfRatings(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSignals();
  }, [activePane.symbol, activePane.timeframe]);

  // Needle angle: 0 score = -75 deg, 50 = 0 deg, 100 = +75 deg
  const score = summary?.score ?? 50;
  const angleDeg = -75 + (score / 100) * 150;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#131722]">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-[#2A2E39]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#787B86]">
          Technicals • {info.displaySymbol} ({activePane.timeframe})
        </span>
        <button
          onClick={loadSignals}
          title="Refresh Signals"
          className="rounded p-1 text-[#787B86] hover:bg-[#1E222D] hover:text-white"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Radial Speedometer Gauge */}
        <div className="flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-[#2A2E39] dark:bg-[#1E222D]/60">
          <svg viewBox="0 0 200 115" className="w-48 overflow-visible">
            <path
              d="M 22 100 A 78 78 0 0 1 52 38"
              fill="none"
              stroke="#F23645"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M 58 33 A 78 78 0 0 1 92 22"
              fill="none"
              stroke="#FB7185"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M 97 22 A 78 78 0 0 1 103 22"
              fill="none"
              stroke="#787B86"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M 108 22 A 78 78 0 0 1 142 33"
              fill="none"
              stroke="#10B981"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M 148 38 A 78 78 0 0 1 178 100"
              fill="none"
              stroke="#00D4AA"
              strokeWidth="8"
              strokeLinecap="round"
            />

            <g transform={`translate(100,100) rotate(${angleDeg})`}>
              <line x1="0" y1="0" x2="0" y2="-62" stroke="#D1D4DC" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="0" cy="0" r="5" fill="#2962FF" />
            </g>
          </svg>

          <div className={cn('-mt-1 text-sm font-extrabold uppercase tracking-wide', ratingBadgeColor(summary?.rating ?? 'Neutral'))}>
            {summary?.rating ?? 'Neutral'}
          </div>

          {summary && (
            <div className="mt-2.5 grid w-full grid-cols-3 gap-1 text-center font-mono text-[11px]">
              <div className="rounded bg-[#F23645]/10 py-1 text-[#F23645]">
                <div className="font-bold">{summary.sellCount}</div>
                <div className="text-[9px]">SELL</div>
              </div>
              <div className="rounded bg-slate-500/10 py-1 text-[#787B86]">
                <div className="font-bold">{summary.neutralCount}</div>
                <div className="text-[9px]">NEUTRAL</div>
              </div>
              <div className="rounded bg-[#089981]/10 py-1 text-[#089981]">
                <div className="font-bold">{summary.buyCount}</div>
                <div className="text-[9px]">BUY</div>
              </div>
            </div>
          )}
        </div>

        {/* Multi-Timeframe Scanner Matrix */}
        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#787B86]">
            Multi-Timeframe Trend Matrix
          </div>
          <div className="grid grid-cols-5 gap-1">
            {MTF_LIST.map((tf) => {
              const r = mtfRatings[tf] ?? 'Neutral';
              const short =
                r === 'Strong Buy'
                  ? 'S.BUY'
                  : r === 'Strong Sell'
                  ? 'S.SELL'
                  : r.toUpperCase();
              return (
                <button
                  key={tf}
                  onClick={() => updatePaneTimeframe(activePane.id, tf)}
                  className={cn(
                    'flex flex-col items-center rounded border py-1.5 text-[10px] transition',
                    activePane.timeframe === tf
                      ? 'border-[#2962FF] bg-[#2962FF]/15'
                      : 'border-slate-200 dark:border-[#2A2E39] dark:bg-[#1E222D]/60 hover:border-[#2962FF]/50'
                  )}
                >
                  <span className="font-mono font-bold text-slate-800 dark:text-[#D1D4DC]">{tf}</span>
                  <span className={cn('mt-0.5 text-[9px] font-bold', ratingBadgeColor(r))}>
                    {short}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Signal Breakdown Tables */}
        {summary && (
          <>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#787B86]">
                Oscillators & Momentum
              </div>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-[11px] dark:divide-[#2A2E39]/60 dark:border-[#2A2E39]">
                {summary.oscillators.map((row) => (
                  <div key={row.name} className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="text-slate-700 dark:text-[#D1D4DC]">{row.name}</span>
                    <div className="flex items-center gap-2.5 font-mono">
                      <span className="text-[#787B86]">{row.value}</span>
                      <span
                        className={cn(
                          'w-12 text-right font-bold',
                          row.action === 'Buy'
                            ? 'text-[#089981]'
                            : row.action === 'Sell'
                            ? 'text-[#F23645]'
                            : 'text-[#787B86]'
                        )}
                      >
                        {row.action}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#787B86]">
                Moving Averages
              </div>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-[11px] dark:divide-[#2A2E39]/60 dark:border-[#2A2E39]">
                {summary.movingAverages.map((row) => (
                  <div key={row.name} className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="text-slate-700 dark:text-[#D1D4DC]">{row.name}</span>
                    <div className="flex items-center gap-2.5 font-mono">
                      <span className="text-[#787B86]">{row.value}</span>
                      <span
                        className={cn(
                          'w-12 text-right font-bold',
                          row.action === 'Buy'
                            ? 'text-[#089981]'
                            : row.action === 'Sell'
                            ? 'text-[#F23645]'
                            : 'text-[#787B86]'
                        )}
                      >
                        {row.action}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
