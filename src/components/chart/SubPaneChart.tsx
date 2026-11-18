import React, { useEffect, useMemo, useRef } from 'react';
import {
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineStyle,
  LogicalRange,
  UTCTimestamp,
  createChart,
} from 'lightweight-charts';
import { Eye, EyeOff, X } from 'lucide-react';
import { computeATR, computeMACD, computeRSI, computeStochastic } from '@/services/indicators';
import { Candle, IndicatorConfig } from '@/types/trading';

interface SubPaneChartProps {
  indicator: IndicatorConfig;
  candles: Candle[];
  theme: 'dark' | 'light';
  bgColorDark: string;
  mainChart: IChartApi | null;
  onToggleVisibility: () => void;
  onRemove: () => void;
}

export const SubPaneChart: React.FC<SubPaneChartProps> = ({
  indicator,
  candles,
  theme,
  bgColorDark,
  mainChart,
  onToggleVisibility,
  onRemove,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<ISeriesApi<'Line' | 'Histogram'>[]>([]);
  const syncingRef = useRef(false);

  const computed = useMemo(() => {
    if (!indicator.visible || candles.length === 0) return null;
    if (indicator.type === 'RSI') {
      return { kind: 'RSI' as const, data: computeRSI(candles, indicator.params.period ?? 14) };
    }
    if (indicator.type === 'MACD') {
      return {
        kind: 'MACD' as const,
        data: computeMACD(
          candles,
          indicator.params.fast ?? 12,
          indicator.params.slow ?? 26,
          indicator.params.signal ?? 9
        ),
      };
    }
    if (indicator.type === 'STOCH') {
      return {
        kind: 'STOCH' as const,
        data: computeStochastic(
          candles,
          indicator.params.kPeriod ?? 14,
          indicator.params.dPeriod ?? 3,
          indicator.params.smooth ?? 3
        ),
      };
    }
    if (indicator.type === 'ATR') {
      return { kind: 'ATR' as const, data: computeATR(candles, indicator.params.period ?? 14) };
    }
    return null;
  }, [indicator, candles]);

  const latestReadout = useMemo(() => {
    if (!computed || !indicator.visible) return 'Hidden';
    if (computed.kind === 'RSI') {
      const last = computed.data[computed.data.length - 1];
      return last ? last.value.toFixed(2) : '—';
    }
    if (computed.kind === 'ATR') {
      const last = computed.data[computed.data.length - 1];
      return last ? last.value.toFixed(4) : '—';
    }
    if (computed.kind === 'MACD') {
      const m = computed.data.macd[computed.data.macd.length - 1];
      const s = computed.data.signal[computed.data.signal.length - 1];
      return m && s ? `${m.value.toFixed(2)} / ${s.value.toFixed(2)}` : '—';
    }
    if (computed.kind === 'STOCH') {
      const k = computed.data.k[computed.data.k.length - 1];
      const d = computed.data.d[computed.data.d.length - 1];
      return k && d ? `%K ${k.value.toFixed(1)}  %D ${d.value.toFixed(1)}` : '—';
    }
    return '—';
  }, [computed, indicator.visible]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const isDark = theme === 'dark';
    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? bgColorDark : '#FFFFFF' },
        textColor: isDark ? '#787B86' : '#475569',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(42, 46, 57, 0.55)' : 'rgba(15,23,42,0.06)' },
        horzLines: { color: isDark ? 'rgba(42, 46, 57, 0.55)' : 'rgba(15,23,42,0.06)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: isDark ? '#2A2E39' : '#E0E3EB',
        scaleMargins: { top: 0.14, bottom: 0.14 },
      },
      timeScale: {
        visible: false,
        borderColor: isDark ? '#2A2E39' : '#E0E3EB',
      },
    });

    chartRef.current = chart;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) chart.applyOptions({ width, height });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRefs.current = [];
    };
  }, [theme, bgColorDark]);

  useEffect(() => {
    const sub = chartRef.current;
    if (!sub || !mainChart) return;

    const onMainRange = (range: LogicalRange | null) => {
      if (!range || syncingRef.current) return;
      syncingRef.current = true;
      sub.timeScale().setVisibleLogicalRange(range);
      syncingRef.current = false;
    };

    const onSubRange = (range: LogicalRange | null) => {
      if (!range || syncingRef.current) return;
      syncingRef.current = true;
      mainChart.timeScale().setVisibleLogicalRange(range);
      syncingRef.current = false;
    };

    mainChart.timeScale().subscribeVisibleLogicalRangeChange(onMainRange);
    sub.timeScale().subscribeVisibleLogicalRangeChange(onSubRange);

    const currRange = mainChart.timeScale().getVisibleLogicalRange();
    if (currRange) sub.timeScale().setVisibleLogicalRange(currRange);

    return () => {
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(onMainRange);
      sub.timeScale().unsubscribeVisibleLogicalRangeChange(onSubRange);
    };
  }, [mainChart]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    for (const s of seriesRefs.current) {
      try {
        chart.removeSeries(s);
      } catch {
        // ignore
      }
    }
    seriesRefs.current = [];

    if (!computed || !indicator.visible) return;

    if (computed.kind === 'RSI' || computed.kind === 'ATR') {
      const line = chart.addLineSeries({
        color: indicator.color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      line.setData(
        computed.data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }))
      );
      if (computed.kind === 'RSI') {
        line.createPriceLine({
          price: 70,
          color: 'rgba(242,54,69,0.5)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: '',
        });
        line.createPriceLine({
          price: 30,
          color: 'rgba(8,153,129,0.5)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: '',
        });
      }
      seriesRefs.current.push(line);
    } else if (computed.kind === 'MACD') {
      const hist = chart.addHistogramSeries({
        priceLineVisible: false,
        lastValueVisible: false,
      });
      hist.setData(
        computed.data.histogram.map((p) => ({
          time: p.time as UTCTimestamp,
          value: p.value,
          color: p.color,
        }))
      );
      const macdLine = chart.addLineSeries({
        color: indicator.color,
        lineWidth: 2,
        priceLineVisible: false,
      });
      macdLine.setData(
        computed.data.macd.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }))
      );
      const sigLine = chart.addLineSeries({
        color: indicator.secondaryColor ?? '#F97316',
        lineWidth: 1,
        priceLineVisible: false,
      });
      sigLine.setData(
        computed.data.signal.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }))
      );
      seriesRefs.current.push(hist, macdLine, sigLine);
    } else if (computed.kind === 'STOCH') {
      const kLine = chart.addLineSeries({
        color: indicator.color,
        lineWidth: 2,
        priceLineVisible: false,
      });
      kLine.setData(computed.data.k.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      kLine.createPriceLine({
        price: 80,
        color: 'rgba(242,54,69,0.4)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '',
      });
      kLine.createPriceLine({
        price: 20,
        color: 'rgba(8,153,129,0.4)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '',
      });
      const dLine = chart.addLineSeries({
        color: indicator.secondaryColor ?? '#F23645',
        lineWidth: 1,
        priceLineVisible: false,
      });
      dLine.setData(computed.data.d.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      seriesRefs.current.push(kLine, dLine);
    }

    if (mainChart) {
      const r = mainChart.timeScale().getVisibleLogicalRange();
      if (r) chart.timeScale().setVisibleLogicalRange(r);
    }
  }, [computed, indicator, mainChart]);

  const paramSummary = Object.values(indicator.params).join(', ');

  return (
    <div className="relative h-[106px] w-full shrink-0 border-t border-slate-200 dark:border-[#2A2E39]">
      <div className="pointer-events-auto absolute left-3 top-1.5 z-10 flex items-center gap-2 text-[11px]">
        <span className="font-semibold text-slate-700 dark:text-[#D1D4DC]">
          {indicator.name}
          {paramSummary ? ` (${paramSummary})` : ''}
        </span>
        <span className="font-mono text-[11px] tabular-nums" style={{ color: indicator.color }}>
          {latestReadout}
        </span>
        <button
          onClick={onToggleVisibility}
          title={indicator.visible ? 'Hide' : 'Show'}
          className="text-slate-400 hover:text-white"
        >
          {indicator.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </button>
        <button
          onClick={onRemove}
          title="Remove Indicator"
          className="text-slate-400 hover:text-rose-400"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
};
