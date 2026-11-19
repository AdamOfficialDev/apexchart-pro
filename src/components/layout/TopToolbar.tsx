import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bookmark,
  Camera,
  CandlestickChart,
  Check,
  ChevronDown,
  Columns2,
  Database,
  GitCompare,
  Grid2X2,
  Keyboard,
  LayoutGrid,
  Maximize2,
  Moon,
  PanelLeft,
  PlayCircle,
  Rows2,
  Search,
  Settings2,
  Sparkles,
  Star,
  Sun,
  Zap,
} from 'lucide-react';
import { getSymbolInfo, TIMEFRAMES } from '@/data/symbols';
import { cn, formatPrice } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';
import { ChartStyleType, LayoutType, TimeframeGroup } from '@/types/trading';

const CHART_STYLES: { id: ChartStyleType; label: string; badge?: string }[] = [
  { id: 'candles', label: 'Candles' },
  { id: 'hollow', label: 'Hollow Candles' },
  { id: 'heikin_ashi', label: 'Heikin Ashi' },
  { id: 'footprint', label: 'Footprint (Order Flow)', badge: 'PRO' },
  { id: 'bars', label: 'OHLC Bars' },
  { id: 'line', label: 'Line' },
  { id: 'area', label: 'Area' },
];

const LAYOUTS: { id: LayoutType; label: string; icon: React.ReactNode }[] = [
  { id: '1x1', label: 'Single (1x1)', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { id: '1x2', label: '2 Columns (1x2)', icon: <Columns2 className="h-3.5 w-3.5" /> },
  { id: '2x1', label: '2 Rows (2x1)', icon: <Rows2 className="h-3.5 w-3.5" /> },
  { id: '1+2', label: '1 Left + 2 Right', icon: <Columns2 className="h-3.5 w-3.5" /> },
  { id: '2x2', label: 'Quad Grid (2x2)', icon: <Grid2X2 className="h-3.5 w-3.5" /> },
];

const TF_GROUPS: TimeframeGroup[] = ['Seconds', 'Minutes', 'Hours', 'Days & Above'];

export const TopToolbar: React.FC = () => {
  const theme = useTradingStore((s) => s.theme);
  const toggleTheme = useTradingStore((s) => s.toggleTheme);
  const chartSettings = useTradingStore((s) => s.chartSettings);
  const updateChartSettings = useTradingStore((s) => s.updateChartSettings);
  const smartOverlays = useTradingStore((s) => s.smartOverlays);
  const updateSmartOverlays = useTradingStore((s) => s.updateSmartOverlays);
  const dataFeed = useTradingStore((s) => s.dataFeed);
  const mobileDrawingBarOpen = useTradingStore((s) => s.mobileDrawingBarOpen);
  const setMobileDrawingBarOpen = useTradingStore((s) => s.setMobileDrawingBarOpen);

  const panes = useTradingStore((s) => s.panes);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const layout = useTradingStore((s) => s.layout);
  const setLayout = useTradingStore((s) => s.setLayout);
  const favoriteTimeframes = useTradingStore((s) => s.favoriteTimeframes);
  const toggleFavoriteTimeframe = useTradingStore((s) => s.toggleFavoriteTimeframe);
  const updatePaneTimeframe = useTradingStore((s) => s.updatePaneTimeframe);
  const updatePaneChartStyle = useTradingStore((s) => s.updatePaneChartStyle);

  const syncCrosshair = useTradingStore((s) => s.syncCrosshair);
  const setSyncCrosshair = useTradingStore((s) => s.setSyncCrosshair);
  const syncSymbol = useTradingStore((s) => s.syncSymbol);
  const setSyncSymbol = useTradingStore((s) => s.setSyncSymbol);
  const syncTimeframe = useTradingStore((s) => s.syncTimeframe);
  const setSyncTimeframe = useTradingStore((s) => s.setSyncTimeframe);

  const replay = useTradingStore((s) => s.replay);
  const enterReplayMode = useTradingStore((s) => s.enterReplayMode);
  const exitReplayMode = useTradingStore((s) => s.exitReplayMode);

  const quotes = useTradingStore((s) => s.quotes);
  const setSearchModalOpen = useTradingStore((s) => s.setSearchModalOpen);
  const setIndicatorsModalOpen = useTradingStore((s) => s.setIndicatorsModalOpen);
  const setShortcutsModalOpen = useTradingStore((s) => s.setShortcutsModalOpen);
  const setCompareModalOpen = useTradingStore((s) => s.setCompareModalOpen);
  const setTemplatesModalOpen = useTradingStore((s) => s.setTemplatesModalOpen);
  const openChartSettingsTab = useTradingStore((s) => s.openChartSettingsTab);
  const triggerSnapshot = useTradingStore((s) => s.triggerSnapshot);

  const activePane = useMemo(
    () => panes.find((p) => p.id === activePaneId) ?? panes[0],
    [panes, activePaneId]
  );
  const symbolInfo = useMemo(() => getSymbolInfo(activePane.symbol), [activePane.symbol]);
  const liveQuote = quotes[activePane.symbol];

  const [openMenu, setOpenMenu] = useState<'tf' | 'style' | 'layout' | 'smart' | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const orderedFavorites = useMemo(() => {
    const set = new Set(favoriteTimeframes);
    return TIMEFRAMES.filter((t) => set.has(t.id));
  }, [favoriteTimeframes]);

  const activeSmartCount = Object.values(smartOverlays).filter(Boolean).length;
  const hasTdKey = Boolean(dataFeed.twelveDataApiKey?.trim());

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <header
      ref={navRef}
      className="relative z-40 flex h-10 w-full shrink-0 items-center justify-between gap-1.5 border-b border-slate-200 bg-white px-2 dark:border-[#2A2E39] dark:bg-[#131722]"
    >
      <div className="flex min-w-0 items-center gap-1">
        {/* Mobile Drawing Bar Toggle */}
        <button
          onClick={() => setMobileDrawingBarOpen(!mobileDrawingBarOpen)}
          title="Toggle Drawing Tools"
          className={cn(
            'sm:hidden flex h-7 w-7 shrink-0 items-center justify-center rounded transition',
            mobileDrawingBarOpen
              ? 'bg-[#2962FF]/20 text-[#2962FF]'
              : 'text-[#787B86] hover:bg-[#1E222D]'
          )}
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {/* Brand */}
        <div className="hidden sm:flex shrink-0 items-center gap-1.5 pr-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#2962FF] to-[#00D4AA] text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="hidden 2xl:inline whitespace-nowrap text-xs font-bold tracking-tight text-slate-900 dark:text-[#D1D4DC]">
            ApexChart
          </span>
        </div>

        {/* Symbol Search */}
        <button
          onClick={() => setSearchModalOpen(true)}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-left transition hover:bg-slate-100 dark:hover:bg-[#1E222D]"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-[#787B86]" />
          <span className="text-xs font-bold text-slate-900 dark:text-[#D1D4DC]">
            {symbolInfo.displaySymbol}
          </span>
          {liveQuote && (
            <span
              className={cn(
                'hidden md:inline font-mono text-[11px] font-semibold tabular-nums',
                liveQuote.changePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
              )}
            >
              {formatPrice(liveQuote.price, symbolInfo.precision)}
            </span>
          )}
          <kbd className="hidden 2xl:inline rounded border border-slate-200 px-1 py-[1px] font-mono text-[9px] text-[#787B86] dark:border-[#2A2E39]">
            ⌘K
          </kbd>
        </button>

        {/* Compare */}
        <button
          onClick={() => setCompareModalOpen(true)}
          title="Compare / Overlay Symbol (%)"
          className={cn(
            'hidden sm:inline-flex shrink-0 items-center justify-center rounded p-1.5 transition',
            activePane.compareSymbol
              ? 'bg-amber-500/15 text-amber-400'
              : 'text-[#787B86] hover:bg-slate-100 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]'
          )}
        >
          <GitCompare className="h-3.5 w-3.5" />
        </button>

        <div className="h-5 w-px shrink-0 bg-slate-200 dark:bg-[#2A2E39]" />

        {/* All Timeframes */}
        <div className="relative flex shrink-0 items-center gap-0.5">
          <div className="hidden xl:flex items-center gap-0.5">
            {orderedFavorites.map((tf) => (
              <button
                key={tf.id}
                onClick={() => updatePaneTimeframe(activePane.id, tf.id)}
                className={cn(
                  'shrink-0 whitespace-nowrap rounded px-1.5 py-1 font-mono text-[11px] font-medium transition',
                  activePane.timeframe === tf.id
                    ? 'bg-[#2962FF]/15 text-[#2962FF] font-bold'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#1E222D]'
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setOpenMenu(openMenu === 'tf' ? null : 'tf')}
            title="All Timeframes (Seconds to Monthly)"
            className={cn(
              'flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-1 text-xs font-medium transition',
              openMenu === 'tf'
                ? 'bg-[#2962FF]/15 text-[#2962FF]'
                : 'text-slate-600 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#1E222D]'
            )}
          >
            <span className="xl:hidden font-mono font-bold text-[#2962FF]">
              {activePane.timeframe}
            </span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {openMenu === 'tf' && (
            <div className="absolute left-0 top-9 z-50 w-72 rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D]">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#787B86]">
                  All Timeframes Unlocked
                </span>
                <span className="rounded bg-[#089981]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#089981]">
                  Seconds Ready
                </span>
              </div>
              <div className="space-y-2.5">
                {TF_GROUPS.map((group) => {
                  const items = TIMEFRAMES.filter((t) => t.group === group);
                  return (
                    <div key={group}>
                      <div className="mb-1 px-1 text-[10px] font-semibold text-[#787B86]">
                        {group}
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {items.map((tf) => {
                          const isFav = favoriteTimeframes.includes(tf.id);
                          const isSel = activePane.timeframe === tf.id;
                          return (
                            <div
                              key={tf.id}
                              className={cn(
                                'group flex items-center justify-between rounded px-2 py-1 text-xs transition',
                                isSel
                                  ? 'bg-[#2962FF]/20 text-[#2962FF] font-bold'
                                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-[#131722] dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]'
                              )}
                            >
                              <button
                                onClick={() => {
                                  updatePaneTimeframe(activePane.id, tf.id);
                                  setOpenMenu(null);
                                }}
                                className="flex-1 text-left font-mono"
                              >
                                {tf.label}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavoriteTimeframe(tf.id);
                                }}
                                title="Pin to top bar"
                                className={cn(
                                  'ml-1 transition',
                                  isFav
                                    ? 'text-amber-400'
                                    : 'text-slate-400 opacity-30 group-hover:opacity-100'
                                )}
                              >
                                <Star className={cn('h-3 w-3', isFav && 'fill-amber-400')} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px shrink-0 bg-slate-200 dark:bg-[#2A2E39]" />

        {/* Chart Type (incl. Footprint!) */}
        <div className="relative shrink-0">
          <button
            onClick={() => setOpenMenu(openMenu === 'style' ? null : 'style')}
            title="Chart Style (Candles, Heikin Ashi, Footprint)"
            className={cn(
              'flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium transition',
              activePane.chartStyle === 'footprint'
                ? 'bg-[#00D4AA]/15 text-[#00D4AA]'
                : 'text-slate-700 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#1E222D]'
            )}
          >
            <CandlestickChart className="h-4 w-4 shrink-0 text-[#2962FF]" />
            <span className="hidden 2xl:inline">
              {CHART_STYLES.find((c) => c.id === activePane.chartStyle)?.label}
            </span>
            <ChevronDown className="h-3 w-3 text-[#787B86]" />
          </button>

          {openMenu === 'style' && (
            <div className="absolute left-0 top-9 z-50 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D]">
              {CHART_STYLES.map((cs) => (
                <button
                  key={cs.id}
                  onClick={() => {
                    updatePaneChartStyle(activePane.id, cs.id);
                    setOpenMenu(null);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs transition',
                    activePane.chartStyle === cs.id
                      ? 'bg-[#2962FF]/15 font-semibold text-[#2962FF]'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{cs.label}</span>
                    {cs.badge && (
                      <span className="rounded bg-[#00D4AA]/15 px-1 py-0.2 text-[9px] font-bold text-[#00D4AA]">
                        {cs.badge}
                      </span>
                    )}
                  </span>
                  {activePane.chartStyle === cs.id && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-5 w-px shrink-0 bg-slate-200 dark:bg-[#2A2E39]" />

        <button
          onClick={() => setIndicatorsModalOpen(true)}
          title="Indicators & Strategies"
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#1E222D]"
        >
          <Activity className="h-3.5 w-3.5 shrink-0 text-[#00D4AA]" />
          <span className="hidden lg:inline">Indicators</span>
          <span className="rounded bg-[#2962FF]/15 px-1 font-mono text-[10px] font-bold text-[#2962FF]">
            {activePane.indicators.length}
          </span>
        </button>

        <div className="relative shrink-0">
          <button
            onClick={() => setOpenMenu(openMenu === 'smart' ? null : 'smart')}
            title="Smart AI Overlays, RSI Divergence Pro & Sessions"
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-xs font-semibold transition',
              activeSmartCount > 0 || openMenu === 'smart'
                ? 'bg-[#00D4AA]/15 text-[#00D4AA]'
                : 'text-slate-700 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#1E222D]'
            )}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden lg:inline">Smart AI</span>
            {activeSmartCount > 0 && (
              <span className="rounded bg-[#00D4AA] px-1 font-mono text-[10px] font-bold text-slate-950">
                {activeSmartCount}
              </span>
            )}
          </button>

          {openMenu === 'smart' && (
            <div className="absolute left-0 top-9 z-50 w-72 rounded-lg border border-slate-200 bg-white p-2 shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D]">
              <div className="mb-1.5 flex items-center justify-between px-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00D4AA]">
                  Smart Quant & Divergence
                </span>
                <span className="text-[9px] font-bold text-[#787B86]">PRO FREE</span>
              </div>
              <div className="space-y-1 text-xs">
                {(
                  [
                    {
                      key: 'showRSIDivergence',
                      title: 'RSI Divergence Pro (Reg / Exag / Hid)',
                      sub: 'Trendline breakouts + Golden Ratio Fib setups',
                    },
                    {
                      key: 'showVPVR',
                      title: 'Volume Profile (VPVR)',
                      sub: 'POC, Value Area High/Low histogram',
                    },
                    {
                      key: 'showMarketStructure',
                      title: 'Market Structure',
                      sub: 'Auto HH/HL/LH/LL & BOS/CHoCH breaks',
                    },
                    {
                      key: 'showFVG',
                      title: 'Fair Value Gaps (FVG)',
                      sub: 'Unmitigated institutional imbalances',
                    },
                    {
                      key: 'showAutoSR',
                      title: 'Auto Support / Resistance',
                      sub: 'Clustered pivot liquidity levels',
                    },
                    {
                      key: 'showAutoTrendlines',
                      title: 'Auto Pivot Trendlines',
                      sub: 'Dynamic structural support & resistance',
                    },
                    {
                      key: 'showSessions',
                      title: 'Trading Sessions (Killzones)',
                      sub: 'Asia, London & New York session shading',
                    },
                    {
                      key: 'showDailyOpen',
                      title: 'Daily Open Line',
                      sub: 'Today UTC open institutional reference',
                    },
                  ] as const
                ).map((item) => {
                  const active = smartOverlays[item.key];
                  return (
                    <button
                      key={item.key}
                      onClick={() => updateSmartOverlays({ [item.key]: !active })}
                      className={cn(
                        'flex w-full items-start justify-between rounded-md px-2 py-1.5 text-left transition',
                        active
                          ? 'bg-[#00D4AA]/12 text-[#00D4AA]'
                          : 'hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]'
                      )}
                    >
                      <div>
                        <div className="font-semibold">{item.title}</div>
                        <div className="text-[10px] text-[#787B86]">{item.sub}</div>
                      </div>
                      <input
                        type="checkbox"
                        readOnly
                        checked={active}
                        className="mt-1 accent-[#00D4AA]"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setTemplatesModalOpen(true)}
          title="Chart & Indicator Templates"
          className="hidden md:inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#1E222D]"
        >
          <Bookmark className="h-3.5 w-3.5 shrink-0 text-[#2962FF]" />
          <span className="hidden 2xl:inline">Templates</span>
        </button>

        <button
          onClick={() => (replay.enabled ? exitReplayMode() : enterReplayMode(activePane.id))}
          title="Bar Replay Mode"
          className={cn(
            'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-xs font-semibold transition',
            replay.enabled
              ? 'bg-amber-500 text-slate-950'
              : 'text-slate-700 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#1E222D]'
          )}
        >
          <PlayCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">Replay</span>
        </button>
      </div>

      {/* Right Cluster */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => openChartSettingsTab('feeds')}
          title="Configure Live Data Feeds & Twelve Data API Key"
          className={cn(
            'hidden sm:inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-[11px] font-semibold transition',
            hasTdKey
              ? 'bg-[#089981]/15 text-[#089981]'
              : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
          )}
        >
          <Database className="h-3 w-3 shrink-0" />
          <span>{hasTdKey ? 'TD API' : 'Feeds'}</span>
        </button>

        <button
          onClick={() => updateChartSettings({ showQuickTrade: !chartSettings.showQuickTrade })}
          title="Toggle One-Click Buy/Sell Buttons"
          className={cn(
            'hidden lg:inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium transition',
            chartSettings.showQuickTrade
              ? 'bg-[#2962FF]/15 text-[#2962FF]'
              : 'text-[#787B86] hover:bg-slate-100 dark:hover:bg-[#1E222D]'
          )}
        >
          <Zap className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden 2xl:inline">1-Click</span>
        </button>

        <div className="relative shrink-0">
          <button
            onClick={() => setOpenMenu(openMenu === 'layout' ? null : 'layout')}
            title="Multi-Chart Layouts & Sync"
            className={cn(
              'flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium transition',
              layout !== '1x1'
                ? 'bg-[#2962FF]/15 text-[#2962FF]'
                : 'text-slate-700 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#1E222D]'
            )}
          >
            <Grid2X2 className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline font-mono text-[11px]">{layout}</span>
            <ChevronDown className="h-3 w-3 text-[#787B86]" />
          </button>

          {openMenu === 'layout' && (
            <div className="absolute right-0 top-9 z-50 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D]">
              <div className="mb-1.5 px-1.5 text-[10px] font-bold uppercase tracking-wider text-[#787B86]">
                Multi-Chart Grid
              </div>
              <div className="space-y-0.5">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setLayout(l.id);
                      setOpenMenu(null);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs transition',
                      layout === l.id
                        ? 'bg-[#2962FF]/15 font-semibold text-[#2962FF]'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {l.icon}
                      {l.label}
                    </span>
                    {layout === l.id && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>

              <div className="my-2 border-t border-slate-200 dark:border-[#2A2E39]" />
              <div className="mb-1 px-1.5 text-[10px] font-bold uppercase tracking-wider text-[#787B86]">
                Sync Across Charts
              </div>
              <div className="space-y-0.5 text-xs dark:text-[#D1D4DC]">
                <label className="flex cursor-pointer items-center justify-between rounded px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-[#2A2E39]">
                  <span>Sync Crosshair</span>
                  <input
                    type="checkbox"
                    checked={syncCrosshair}
                    onChange={(e) => setSyncCrosshair(e.target.checked)}
                    className="accent-[#2962FF]"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-[#2A2E39]">
                  <span>Sync Symbol</span>
                  <input
                    type="checkbox"
                    checked={syncSymbol}
                    onChange={(e) => setSyncSymbol(e.target.checked)}
                    className="accent-[#2962FF]"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-[#2A2E39]">
                  <span>Sync Timeframe</span>
                  <input
                    type="checkbox"
                    checked={syncTimeframe}
                    onChange={(e) => setSyncTimeframe(e.target.checked)}
                    className="accent-[#2962FF]"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => openChartSettingsTab('symbol')}
          title="Chart Settings"
          className="shrink-0 rounded p-1.5 text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]"
        >
          <Settings2 className="h-4 w-4" />
        </button>

        <button
          onClick={triggerSnapshot}
          title="Export PNG Snapshot"
          className="hidden sm:inline-flex shrink-0 rounded p-1.5 text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]"
        >
          <Camera className="h-4 w-4" />
        </button>

        <button
          onClick={toggleTheme}
          title="Toggle Dark / Light Theme"
          className="shrink-0 rounded p-1.5 text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          onClick={() => setShortcutsModalOpen(true)}
          title="Keyboard Shortcuts (?)"
          className="hidden md:inline-flex shrink-0 rounded p-1.5 text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]"
        >
          <Keyboard className="h-4 w-4" />
        </button>

        <button
          onClick={toggleFullscreen}
          title="Fullscreen (Shift+F)"
          className="hidden md:inline-flex shrink-0 rounded p-1.5 text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#1E222D] dark:hover:text-[#D1D4DC]"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
