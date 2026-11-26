import React, { useEffect, useState } from 'react';
import {
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

  const footprintConfig = useTradingStore((s) => s.footprintConfig);
  const updateFootprint = useTradingStore((s) => s.updateFootprintConfig);
  const resetFootprint = useTradingStore((s) => s.resetFootprintConfig);

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTzDropdownOpen(false);
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

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
    { id: 'symbol', label: 'Symbol & Footprint', icon: <CandlestickChart className="h-3.5 w-3.5" /> },
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
      className="apex-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#05070B]/70 p-3 sm:p-4 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (tzDropdownOpen) setTzDropdownOpen(false);
        }}
        className="apex-modal-card flex h-[min(560px,88vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/[0.98] dark:border-[#262E40] dark:bg-[#131823]/[0.98]"
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 dark:border-[#22293A]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2962FF]/12 text-[#4C82FF] ring-1 ring-[#2962FF]/25">
              <Settings2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Chart Settings
              </h2>
              <div className="text-[10px] font-medium text-[#7D8596]">
                Appearance, Footprint, Scales & Live Data Feeds
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#787B86] dark:border-[#283144] dark:bg-[#0D111A]">
              ESC
            </kbd>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close modal"
              className="rounded-lg p-1.5 text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 active:scale-90 dark:hover:bg-[#1E2536] dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-1 sm:grid-cols-12">
          <div className="border-b border-slate-200/80 p-2.5 sm:col-span-4 sm:border-b-0 sm:border-r dark:border-[#22293A] dark:bg-[#0D111A]/80 space-y-1 overflow-y-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 active:scale-[0.98]',
                  tab === t.id
                    ? 'bg-[#2962FF]/15 text-[#4C82FF] ring-1 ring-[#2962FF]/25'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-[#7D8596] dark:hover:bg-[#171E2C] dark:hover:text-white'
                )}
              >
                <span className="flex items-center gap-2">
                  {t.icon}
                  {t.label}
                </span>
                {t.id === 'feeds' && dataFeed.twelveDataApiKey && (
                  <span className="h-2 w-2 rounded-full bg-[#089981] shadow-[0_0_8px_#089981]" />
                )}
              </button>
            ))}
          </div>

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

                {/* Footprint Order Flow Configuration */}
                <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-[#2A2E39]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#00D4AA]">
                    Footprint (Order Flow) Settings
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Diagonal Imbalance Ratio</span>
                    <div className="flex rounded bg-slate-100 p-0.5 dark:bg-[#131722]">
                      {[2.0, 2.5, 3.0, 4.0].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => updateFootprint({ imbalanceRatio: r })}
                          className={cn(
                            'rounded px-2 py-0.5 font-mono text-[10px] font-bold',
                            footprintConfig.imbalanceRatio === r
                              ? 'bg-[#00D4AA] text-slate-950'
                              : 'text-[#787B86]'
                          )}
                        >
                          {r * 100}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Row Granularity Multiplier</span>
                    <div className="flex rounded bg-slate-100 p-0.5 dark:bg-[#131722]">
                      {[0.75, 1, 1.5, 2].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => updateFootprint({ rowTicksMultiplier: m })}
                          className={cn(
                            'rounded px-2 py-0.5 font-mono text-[10px] font-bold',
                            footprintConfig.rowTicksMultiplier === m
                              ? 'bg-[#2962FF] text-white'
                              : 'text-[#787B86]'
                          )}
                        >
                          {m}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Highlight Candle POC (Point of Control)</span>
                    <input
                      type="checkbox"
                      checked={footprintConfig.showPOC}
                      onChange={(e) => updateFootprint({ showPOC: e.target.checked })}
                      className="accent-[#00D4AA]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Highlight Buy / Sell Imbalances</span>
                    <input
                      type="checkbox"
                      checked={footprintConfig.showImbalances}
                      onChange={(e) => updateFootprint({ showImbalances: e.target.checked })}
                      className="accent-[#00D4AA]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Show Candle Delta Summary Below Bars</span>
                    <input
                      type="checkbox"
                      checked={footprintConfig.showDeltaSummary}
                      onChange={(e) => updateFootprint({ showDeltaSummary: e.target.checked })}
                      className="accent-[#00D4AA]"
                    />
                  </label>
                </div>

                <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-[#2A2E39]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#787B86]">
                    Price Lines & Precision
                  </div>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Last Price Line</span>
                    <input
                      type="checkbox"
                      checked={settings.showLastPriceLine}
                      onChange={(e) => update({ showLastPriceLine: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
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
                      { key: 'showSessions', label: 'Trading Sessions (Asia / London / NY)' },
                      { key: 'showDailyOpen', label: 'Daily Open Reference Line' },
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
                </div>

                <div className="space-y-2 border-t border-slate-200/80 pt-3 dark:border-[#22293A]">
                  {[
                    {
                      label: 'Use 24/7 Real-Time Gold Proxy (PAXG) for XAUUSD when no API key',
                      checked: dataFeed.useGoldProxyWhenNoKey,
                      onChange: (checked: boolean) =>
                        updateDataFeed({ useGoldProxyWhenNoKey: checked }),
                    },
                    {
                      label: 'Prefer Twelve Data for Crypto pairs too (when API key is set)',
                      checked: dataFeed.preferTwelveData,
                      onChange: (checked: boolean) =>
                        updateDataFeed({ preferTwelveData: checked }),
                    },
                  ].map((item) => (
                    <label
                      key={item.label}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/80 px-3 py-2.5 transition hover:bg-slate-50 dark:border-[#22293A] dark:bg-[#0D111A]/60 dark:hover:bg-[#171E2C]"
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.onChange(e.target.checked)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
                          item.checked ? 'bg-[#2962FF]' : 'bg-slate-300 dark:bg-[#262E40]'
                        )}
                      >
                        <span
                          className={cn(
                            'h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200',
                            item.checked ? 'translate-x-3' : 'translate-x-0'
                          )}
                        />
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60 px-5 py-3 dark:border-[#22293A] dark:bg-[#0D111A]/80">
          <button
            type="button"
            onClick={() => {
              reset();
              resetFootprint();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#7D8596] transition hover:bg-slate-200/60 hover:text-slate-900 active:scale-95 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset All Defaults
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl bg-gradient-to-b from-[#3B76FF] to-[#2962FF] px-5 py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_-2px_rgba(41,98,255,0.5)] transition-all duration-150 hover:brightness-110 active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
