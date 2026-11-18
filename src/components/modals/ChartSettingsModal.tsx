import React, { useEffect, useState } from 'react';
import {
  Activity,
  CandlestickChart,
  Check,
  ChevronDown,
  Clock,
  Database,
  Eye,
  KeyRound,
  LayoutTemplate,
  RotateCcw,
  Ruler,
  Settings2,
  Sparkles,
  Wifi,
  X,
} from 'lucide-react';
import { getTimezonePreset, TIMEZONE_PRESETS } from '@/data/symbols';
import { cn, formatTimeInOffset } from '@/lib/utils';
import { testTwelveDataKey } from '@/services/marketData';
import { useTradingStore } from '@/store/useTradingStore';

type SettingsTab = 'symbol' | 'status' | 'scales' | 'canvas' | 'trading' | 'feeds';

export const ChartSettingsModal: React.FC = () => {
  const open = useTradingStore((s) => s.chartSettingsModalOpen);
  const setOpen = useTradingStore((s) => s.setChartSettingsModalOpen);
  const initialTab = useTradingStore((s) => s.chartSettingsInitialTab);
  const settings = useTradingStore((s) => s.chartSettings);
  const update = useTradingStore((s) => s.updateChartSettings);
  const reset = useTradingStore((s) => s.resetChartSettings);

  const smartOverlays = useTradingStore((s) => s.smartOverlays);
  const updateSmart = useTradingStore((s) => s.updateSmartOverlays);
  const dataFeed = useTradingStore((s) => s.dataFeed);
  const updateDataFeed = useTradingStore((s) => s.updateDataFeed);
  const addToast = useTradingStore((s) => s.addToast);

  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [tzDropdownOpen, setTzDropdownOpen] = useState(false);
  const [tdKeyInput, setTdKeyInput] = useState(dataFeed.twelveDataApiKey);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setTdKeyInput(dataFeed.twelveDataApiKey);
      setTestResult(null);
    }
  }, [open, initialTab, dataFeed.twelveDataApiKey]);

  if (!open) return null;

  const activeTz = getTimezonePreset(settings.timezone);
  const nowSec = Math.floor(Date.now() / 1000);

  const handleSaveAndTestKey = async () => {
    const cleaned = tdKeyInput.trim();
    updateDataFeed({ twelveDataApiKey: cleaned });
    if (!cleaned) {
      setTestResult('API Key cleared. Using built-in live/proxy feeds.');
      return;
    }
    setTestingKey(true);
    setTestResult(null);
    const res = await testTwelveDataKey(cleaned);
    setTestingKey(false);
    if (res.ok) {
      setTestResult(`Connected! Live XAU/USD = $${res.price}`);
      addToast({
        title: 'Twelve Data Connected',
        description: `Live XAU/USD spot: $${res.price}`,
        variant: 'success',
      });
    } else {
      setTestResult(`Error: ${res.error}`);
      addToast({
        title: 'Twelve Data Test Failed',
        description: res.error,
        variant: 'danger',
      });
    }
  };

  const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'symbol', label: 'Symbol', icon: <CandlestickChart className="h-3.5 w-3.5" /> },
    { id: 'status', label: 'Status Line', icon: <Eye className="h-3.5 w-3.5" /> },
    { id: 'scales', label: 'Scales & Lines', icon: <Ruler className="h-3.5 w-3.5" /> },
    { id: 'canvas', label: 'Canvas & Grid', icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
    { id: 'trading', label: 'Trading & AI', icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: 'feeds', label: 'Data Feeds & API', icon: <Database className="h-3.5 w-3.5" /> },
  ];

  return (
    <div
      onClick={() => {
        setTzDropdownOpen(false);
        setOpen(false);
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (tzDropdownOpen) setTzDropdownOpen(false);
        }}
        className="flex h-[540px] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-[#2A2E39]">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-[#2962FF]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#D1D4DC]">
              Chart Settings
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-[#787B86] hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="grid flex-1 min-h-0 grid-cols-1 sm:grid-cols-12">
          {/* Left Navigation */}
          <div className="border-b border-slate-200 p-2 sm:col-span-4 sm:border-b-0 sm:border-r dark:border-[#2A2E39] dark:bg-[#131722]/60 space-y-0.5 overflow-y-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition',
                  tab === t.id
                    ? 'bg-[#2962FF]/15 text-[#2962FF]'
                    : 'text-slate-500 hover:text-slate-900 dark:text-[#787B86] dark:hover:text-[#D1D4DC]'
                )}
              >
                <span className="flex items-center gap-2">
                  {t.icon}
                  {t.label}
                </span>
                {t.id === 'feeds' && dataFeed.twelveDataApiKey && (
                  <span className="h-2 w-2 rounded-full bg-[#089981]" />
                )}
              </button>
            ))}
          </div>

          {/* Right Form */}
          <div className="overflow-y-auto p-4 sm:col-span-8 text-xs space-y-4">
            {tab === 'symbol' && (
              <>
                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#787B86]">
                    Candles Body, Borders & Wicks
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                      <span>Bullish Body</span>
                      <input
                        type="color"
                        value={settings.upColor}
                        onChange={(e) => update({ upColor: e.target.value })}
                        className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                      <span>Bearish Body</span>
                      <input
                        type="color"
                        value={settings.downColor}
                        onChange={(e) => update({ downColor: e.target.value })}
                        className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.showWicks}
                          onChange={(e) => update({ showWicks: e.target.checked })}
                          className="accent-[#2962FF]"
                        />
                        Bull Wick
                      </span>
                      <input
                        type="color"
                        value={settings.wickUpColor}
                        onChange={(e) => update({ wickUpColor: e.target.value })}
                        className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                      <span>Bear Wick</span>
                      <input
                        type="color"
                        value={settings.wickDownColor}
                        onChange={(e) => update({ wickDownColor: e.target.value })}
                        className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.showBorders}
                          onChange={(e) => update({ showBorders: e.target.checked })}
                          className="accent-[#2962FF]"
                        />
                        Bull Border
                      </span>
                      <input
                        type="color"
                        value={settings.borderUpColor}
                        onChange={(e) => update({ borderUpColor: e.target.value })}
                        className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                      <span>Bear Border</span>
                      <input
                        type="color"
                        value={settings.borderDownColor}
                        onChange={(e) => update({ borderDownColor: e.target.value })}
                        className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#787B86]">
                    Color Presets
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'TradingView', up: '#089981', down: '#F23645' },
                      { name: 'Cyber Mint', up: '#00D4AA', down: '#FF3B6B' },
                      { name: 'Classic Mono', up: '#D1D4DC', down: '#64748B' },
                      { name: 'Hollow Pro', up: '#2962FF', down: '#F59E0B' },
                    ].map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() =>
                          update({
                            upColor: p.up,
                            wickUpColor: p.up,
                            borderUpColor: p.up,
                            downColor: p.down,
                            wickDownColor: p.down,
                            borderDownColor: p.down,
                          })
                        }
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium hover:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#131722]/40 dark:hover:bg-[#2A2E39]"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-[#2A2E39]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#787B86]">
                    Price Lines & Precision
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Price Line</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.showLastPriceLine}
                        onChange={(e) => update({ showLastPriceLine: e.target.checked })}
                        className="accent-[#2962FF]"
                      />
                      <div className="flex rounded bg-slate-100 p-0.5 dark:bg-[#131722]">
                        {(['solid', 'dashed', 'dotted'] as const).map((ls) => (
                          <button
                            key={ls}
                            type="button"
                            onClick={() => update({ lastPriceLineStyle: ls })}
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] capitalize',
                              settings.lastPriceLineStyle === ls
                                ? 'bg-[#2962FF] text-white'
                                : 'text-[#787B86]'
                            )}
                          >
                            {ls}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Session High & Low Price Lines</span>
                    <input
                      type="checkbox"
                      checked={settings.showHighLowLines}
                      onChange={(e) => update({ showHighLowLines: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Countdown to Bar Close</span>
                    <input
                      type="checkbox"
                      checked={settings.showCountdown}
                      onChange={(e) => update({ showCountdown: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
                  <div className="flex items-center justify-between">
                    <span>Price Precision Override</span>
                    <div className="flex rounded bg-slate-100 p-0.5 dark:bg-[#131722]">
                      {(['auto', 0, 1, 2, 3, 4, 5] as const).map((p) => (
                        <button
                          key={String(p)}
                          type="button"
                          onClick={() => update({ precisionOverride: p })}
                          className={cn(
                            'rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                            settings.precisionOverride === p
                              ? 'bg-[#2962FF] text-white'
                              : 'text-[#787B86]'
                          )}
                        >
                          {p === 'auto' ? 'Auto' : p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === 'status' && (
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#787B86]">
                  Top-Left Legend & Status Line
                </div>
                {(
                  [
                    { key: 'showStatusSymbol', label: 'Symbol Title, Timeframe & Exchange' },
                    { key: 'showStatusFeedBadge', label: 'Live Data Feed Status Badge (LIVE / TWELVE / SIM)' },
                    { key: 'showStatusOHLC', label: 'OHLC Values (Open, High, Low, Close)' },
                    { key: 'showStatusBarChange', label: 'Bar Change Value & Percentage' },
                    { key: 'showStatusVolume', label: 'Volume Value' },
                    { key: 'showIndicatorTitles', label: 'Indicator Titles List' },
                    { key: 'showIndicatorArgs', label: 'Indicator Input Arguments (e.g. 21, 55)' },
                  ] as const
                ).map((item) => (
                  <label key={item.key} className="flex cursor-pointer items-center justify-between py-0.5">
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={settings[item.key]}
                      onChange={(e) => update({ [item.key]: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
                ))}
              </div>
            )}

            {tab === 'scales' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span>Price Scale Position</span>
                  <div className="flex rounded-md bg-slate-100 p-0.5 dark:bg-[#131722]">
                    {(['left', 'right'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => update({ priceScalePosition: pos })}
                        className={cn(
                          'rounded px-3 py-1 text-[11px] font-semibold capitalize transition',
                          settings.priceScalePosition === pos
                            ? 'bg-[#2962FF] text-white'
                            : 'text-[#787B86] hover:text-[#D1D4DC]'
                        )}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-center justify-between">
                  <span>Invert Price Scale</span>
                  <input
                    type="checkbox"
                    checked={settings.invertScale}
                    onChange={(e) => update({ invertScale: e.target.checked })}
                    className="accent-[#2962FF]"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between">
                  <span>Show Symbol Name Label on Price Axis</span>
                  <input
                    type="checkbox"
                    checked={settings.showSymbolAxisLabel}
                    onChange={(e) => update({ showSymbolAxisLabel: e.target.checked })}
                    className="accent-[#2962FF]"
                  />
                </label>

                <div className="flex items-center justify-between gap-4">
                  <span>Scale Font Size ({settings.scaleFontSize}px)</span>
                  <input
                    type="range"
                    min={9}
                    max={14}
                    value={settings.scaleFontSize}
                    onChange={(e) => update({ scaleFontSize: Number(e.target.value) })}
                    className="w-36 accent-[#2962FF]"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Top Padding Margin ({settings.scaleMarginTop}%)</span>
                  <input
                    type="range"
                    min={2}
                    max={35}
                    value={settings.scaleMarginTop}
                    onChange={(e) => update({ scaleMarginTop: Number(e.target.value) })}
                    className="w-36 accent-[#2962FF]"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Bottom Padding Margin ({settings.scaleMarginBottom}%)</span>
                  <input
                    type="range"
                    min={2}
                    max={35}
                    value={settings.scaleMarginBottom}
                    onChange={(e) => update({ scaleMarginBottom: Number(e.target.value) })}
                    className="w-36 accent-[#2962FF]"
                  />
                </div>
              </div>
            )}

            {tab === 'canvas' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Background Style</span>
                  <div className="flex rounded-md bg-slate-100 p-0.5 dark:bg-[#131722]">
                    {(['solid', 'gradient'] as const).map((bg) => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => update({ bgType: bg })}
                        className={cn(
                          'rounded px-2.5 py-1 text-[11px] font-semibold capitalize transition',
                          settings.bgType === bg
                            ? 'bg-[#2962FF] text-white'
                            : 'text-[#787B86] hover:text-[#D1D4DC]'
                        )}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                    <span>Dark BG {settings.bgType === 'gradient' ? 'Top' : ''}</span>
                    <input
                      type="color"
                      value={settings.bgColorDark}
                      onChange={(e) => update({ bgColorDark: e.target.value })}
                      className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                    />
                  </label>
                  {settings.bgType === 'gradient' && (
                    <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                      <span>Dark BG Bottom</span>
                      <input
                        type="color"
                        value={settings.bgColorDarkBottom}
                        onChange={(e) => update({ bgColorDarkBottom: e.target.value })}
                        className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span>Grid Lines</span>
                  <div className="flex rounded-md bg-slate-100 p-0.5 dark:bg-[#131722]">
                    {(
                      [
                        { id: 'both', label: 'Both' },
                        { id: 'vert', label: 'Vert' },
                        { id: 'horz', label: 'Horz' },
                        { id: 'none', label: 'None' },
                      ] as const
                    ).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => update({ gridStyle: g.id, showGrid: g.id !== 'none' })}
                        className={cn(
                          'rounded px-2 py-1 text-[11px] font-semibold transition',
                          settings.gridStyle === g.id
                            ? 'bg-[#2962FF] text-white'
                            : 'text-[#787B86] hover:text-[#D1D4DC]'
                        )}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Grid Opacity ({settings.gridOpacity}%)</span>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={settings.gridOpacity}
                    onChange={(e) => update({ gridOpacity: Number(e.target.value) })}
                    className="w-36 accent-[#2962FF]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span>Crosshair Style & Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.crosshairColor}
                      onChange={(e) => update({ crosshairColor: e.target.value })}
                      className="h-5 w-6 cursor-pointer border-0 bg-transparent"
                    />
                    <div className="flex rounded-md bg-slate-100 p-0.5 dark:bg-[#131722]">
                      {(['dashed', 'dotted', 'solid'] as const).map((cs) => (
                        <button
                          key={cs}
                          type="button"
                          onClick={() => update({ crosshairStyle: cs })}
                          className={cn(
                            'rounded px-2 py-0.5 text-[10px] font-semibold capitalize',
                            settings.crosshairStyle === cs
                              ? 'bg-[#2962FF] text-white'
                              : 'text-[#787B86]'
                          )}
                        >
                          {cs}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.showWatermark}
                      onChange={(e) => update({ showWatermark: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                    <span>Watermark ({settings.watermarkOpacity}%)</span>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={25}
                    value={settings.watermarkOpacity}
                    onChange={(e) => update({ watermarkOpacity: Number(e.target.value) })}
                    className="w-36 accent-[#2962FF]"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Right Margin Offset ({settings.rightOffset} bars)</span>
                  <input
                    type="range"
                    min={2}
                    max={40}
                    value={settings.rightOffset}
                    onChange={(e) => update({ rightOffset: Number(e.target.value) })}
                    className="w-36 accent-[#2962FF]"
                  />
                </div>
              </div>
            )}

            {tab === 'trading' && (
              <>
                <div className="relative">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-[#D1D4DC]">
                      <Clock className="h-3.5 w-3.5 text-[#2962FF]" />
                      Chart & Clock Timezone
                    </span>
                    <span className="font-mono text-[11px] text-[#00D4AA]">
                      {formatTimeInOffset(nowSec, activeTz.offsetMinutes, false, true)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTzDropdownOpen((v) => !v);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-900 transition hover:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#131722] dark:text-[#D1D4DC]"
                  >
                    <span>{activeTz.label}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-[#787B86] transition-transform',
                        tzDropdownOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {tzDropdownOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 right-0 top-[64px] z-[60] max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-2xl dark:border-[#2A2E39] dark:bg-[#131722]"
                    >
                      {TIMEZONE_PRESETS.map((tz) => (
                        <button
                          key={tz.id}
                          type="button"
                          onClick={() => {
                            update({ timezone: tz.id });
                            setTzDropdownOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-center justify-between px-3 py-2 text-left text-xs transition',
                            settings.timezone === tz.id
                              ? 'bg-[#2962FF]/15 font-semibold text-[#2962FF]'
                              : 'text-slate-700 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#1E222D]'
                          )}
                        >
                          <span>{tz.label}</span>
                          <span className="flex items-center gap-2 font-mono text-[10px] text-[#787B86]">
                            {formatTimeInOffset(nowSec, tz.offsetMinutes, false, false)}
                            {settings.timezone === tz.id && (
                              <Check className="h-3.5 w-3.5 text-[#2962FF]" />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-[#2A2E39]">
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>One-Click Buy / Sell Spread Buttons</span>
                    <input
                      type="checkbox"
                      checked={settings.showQuickTrade}
                      onChange={(e) => update({ showQuickTrade: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Show Open Positions (Entry / SL / TP) on Chart</span>
                    <input
                      type="checkbox"
                      checked={settings.showPositionsOnChart}
                      onChange={(e) => update({ showPositionsOnChart: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Show Active Alerts on Chart</span>
                    <input
                      type="checkbox"
                      checked={settings.showAlertsOnChart}
                      onChange={(e) => update({ showAlertsOnChart: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Play Chime Sound When Alert Triggers</span>
                    <input
                      type="checkbox"
                      checked={settings.playAlertSound}
                      onChange={(e) => update({ playAlertSound: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
                </div>

                <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-[#2A2E39]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#00D4AA]">
                    Smart AI & Quant Overlays
                  </div>
                  {(
                    [
                      { key: 'showVPVR', label: 'Volume Profile (VPVR + POC / VAH / VAL)' },
                      { key: 'showMarketStructure', label: 'Market Structure (HH/HL/LH/LL & BOS/CHoCH)' },
                      { key: 'showFVG', label: 'Fair Value Gaps (FVG Imbalance Zones)' },
                      { key: 'showAutoSR', label: 'Auto Support / Resistance Levels' },
                      { key: 'showAutoTrendlines', label: 'Auto Pivot Trendlines' },
                    ] as const
                  ).map((item) => (
                    <label key={item.key} className="flex cursor-pointer items-center justify-between">
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={smartOverlays[item.key]}
                        onChange={(e) => updateSmart({ [item.key]: e.target.checked })}
                        className="accent-[#00D4AA]"
                      />
                    </label>
                  ))}
                </div>
              </>
            )}

            {tab === 'feeds' && (
              <div className="space-y-4">
                <div className="rounded-lg border border-[#00D4AA]/30 bg-[#00D4AA]/10 p-3">
                  <div className="flex items-center gap-2 font-bold text-[#00D4AA]">
                    <Wifi className="h-4 w-4" />
                    <span>Real-Time Multi-Asset Data Feeds</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-[#D1D4DC]">
                    Crypto & <strong>XAUUSD (Gold)</strong> otomatis jalan real-time tanpa API key
                    via Binance Vision + Gold Proxy. Untuk data native{' '}
                    <strong>XAU/USD, Forex, US Stocks, & Saham IDX</strong> langsung dari Twelve Data,
                    masukkan API key gratis di bawah ini.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 font-semibold text-slate-800 dark:text-[#D1D4DC]">
                    <KeyRound className="h-3.5 w-3.5 text-[#2962FF]" />
                    Twelve Data API Key (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={tdKeyInput}
                      onChange={(e) => setTdKeyInput(e.target.value)}
                      placeholder="Paste your Twelve Data API key..."
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#131722] dark:text-[#D1D4DC]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveAndTestKey}
                      disabled={testingKey}
                      className="rounded-lg bg-[#2962FF] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {testingKey ? 'Testing...' : 'Save & Test'}
                    </button>
                  </div>
                  {testResult && (
                    <div
                      className={cn(
                        'mt-1.5 text-[11px] font-medium',
                        testResult.startsWith('Connected') ? 'text-[#089981]' : 'text-amber-400'
                      )}
                    >
                      {testResult}
                    </div>
                  )}
                  <p className="mt-1 text-[10px] text-[#787B86]">
                    Dapatkan key gratis di <span className="text-[#2962FF]">twelvedata.com</span>{' '}
                    (800 REST calls/hari + Live WebSocket). Tersimpan lokal di browser lo.
                  </p>
                </div>

                <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-[#2A2E39]">
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Use 24/7 Real-Time Gold Proxy (PAXG) for XAUUSD when no API key</span>
                    <input
                      type="checkbox"
                      checked={dataFeed.useGoldProxyWhenNoKey}
                      onChange={(e) =>
                        updateDataFeed({ useGoldProxyWhenNoKey: e.target.checked })
                      }
                      className="accent-[#2962FF]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Prefer Twelve Data for Crypto pairs too (when API key is set)</span>
                    <input
                      type="checkbox"
                      checked={dataFeed.preferTwelveData}
                      onChange={(e) => updateDataFeed({ preferTwelveData: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 dark:border-[#2A2E39]">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#787B86] hover:bg-white/5 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset All Defaults
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg bg-[#2962FF] px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
