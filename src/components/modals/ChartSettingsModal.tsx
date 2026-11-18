import React, { useState } from 'react';
import {
  CandlestickChart,
  Check,
  ChevronDown,
  Clock,
  LayoutTemplate,
  RotateCcw,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
import { getTimezonePreset, TIMEZONE_PRESETS } from '@/data/symbols';
import { cn, formatTimeInOffset } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';

export const ChartSettingsModal: React.FC = () => {
  const open = useTradingStore((s) => s.chartSettingsModalOpen);
  const setOpen = useTradingStore((s) => s.setChartSettingsModalOpen);
  const settings = useTradingStore((s) => s.chartSettings);
  const update = useTradingStore((s) => s.updateChartSettings);
  const reset = useTradingStore((s) => s.resetChartSettings);

  const smartOverlays = useTradingStore((s) => s.smartOverlays);
  const updateSmart = useTradingStore((s) => s.updateSmartOverlays);

  const [tab, setTab] = useState<'symbol' | 'canvas' | 'trading'>('symbol');
  const [tzDropdownOpen, setTzDropdownOpen] = useState(false);

  if (!open) return null;

  const activeTz = getTimezonePreset(settings.timezone);
  const nowSec = Math.floor(Date.now() / 1000);

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
        className="flex w-full max-w-xl flex-col overflow-visible rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-[#2A2E39]">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-[#2962FF]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#D1D4DC]">
              Chart Settings & Preferences
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
        <div className="grid min-h-[370px] grid-cols-1 sm:grid-cols-12">
          {/* Left Tabs */}
          <div className="border-b border-slate-200 p-2 sm:col-span-4 sm:border-b-0 sm:border-r dark:border-[#2A2E39] dark:bg-[#131722]/60">
            <button
              onClick={() => setTab('symbol')}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition',
                tab === 'symbol'
                  ? 'bg-[#2962FF]/15 text-[#2962FF]'
                  : 'text-slate-500 hover:text-slate-900 dark:text-[#787B86] dark:hover:text-[#D1D4DC]'
              )}
            >
              <CandlestickChart className="h-3.5 w-3.5" />
              Symbol & Candles
            </button>
            <button
              onClick={() => setTab('canvas')}
              className={cn(
                'mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition',
                tab === 'canvas'
                  ? 'bg-[#2962FF]/15 text-[#2962FF]'
                  : 'text-slate-500 hover:text-slate-900 dark:text-[#787B86] dark:hover:text-[#D1D4DC]'
              )}
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Canvas & Scales
            </button>
            <button
              onClick={() => setTab('trading')}
              className={cn(
                'mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition',
                tab === 'trading'
                  ? 'bg-[#2962FF]/15 text-[#2962FF]'
                  : 'text-slate-500 hover:text-slate-900 dark:text-[#787B86] dark:hover:text-[#D1D4DC]'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Timezone, Trading & AI
            </button>
          </div>

          {/* Right Form */}
          <div className="space-y-4 p-4 sm:col-span-8 text-xs">
            {tab === 'symbol' && (
              <>
                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#787B86]">
                    Candle Body & Wick Colors
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                      <span>Bullish Candle</span>
                      <input
                        type="color"
                        value={settings.upColor}
                        onChange={(e) =>
                          update({
                            upColor: e.target.value,
                            wickUpColor: e.target.value,
                            borderUpColor: e.target.value,
                          })
                        }
                        className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-[#2A2E39] dark:bg-[#131722]/40">
                      <span>Bearish Candle</span>
                      <input
                        type="color"
                        value={settings.downColor}
                        onChange={(e) =>
                          update({
                            downColor: e.target.value,
                            wickDownColor: e.target.value,
                            borderDownColor: e.target.value,
                          })
                        }
                        className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#787B86]">
                    Color Presets
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'TradingView', up: '#089981', down: '#F23645' },
                      { name: 'Cyber Mint', up: '#00D4AA', down: '#FF3B6B' },
                      { name: 'Classic Mono', up: '#D1D4DC', down: '#64748B' },
                      { name: 'Electric Blue', up: '#2962FF', down: '#F59E0B' },
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

                <div className="space-y-2.5 pt-1">
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Show Candle Wicks</span>
                    <input
                      type="checkbox"
                      checked={settings.showWicks}
                      onChange={(e) => update({ showWicks: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Show Candle Borders</span>
                    <input
                      type="checkbox"
                      checked={settings.showBorders}
                      onChange={(e) => update({ showBorders: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span>Show Candle Close Countdown</span>
                    <input
                      type="checkbox"
                      checked={settings.showCountdown}
                      onChange={(e) => update({ showCountdown: e.target.checked })}
                      className="accent-[#2962FF]"
                    />
                  </label>
                </div>
              </>
            )}

            {tab === 'canvas' && (
              <>
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

                <div className="flex items-center justify-between">
                  <span>Dark Background Color</span>
                  <div className="flex items-center gap-2">
                    {['#131722', '#0B0E14', '#000000', '#161B26'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => update({ bgColorDark: c })}
                        style={{ backgroundColor: c }}
                        className={cn(
                          'h-5 w-5 rounded border border-white/20',
                          settings.bgColorDark === c && 'ring-2 ring-[#2962FF]'
                        )}
                      />
                    ))}
                    <input
                      type="color"
                      value={settings.bgColorDark}
                      onChange={(e) => update({ bgColorDark: e.target.value })}
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                    />
                  </div>
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
                        onClick={() =>
                          update({ gridStyle: g.id, showGrid: g.id !== 'none' })
                        }
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
                    min={10}
                    max={100}
                    value={settings.gridOpacity}
                    onChange={(e) => update({ gridOpacity: Number(e.target.value) })}
                    className="w-36 accent-[#2962FF]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span>Crosshair Line Style</span>
                  <div className="flex rounded-md bg-slate-100 p-0.5 dark:bg-[#131722]">
                    {(['dashed', 'dotted', 'solid'] as const).map((cs) => (
                      <button
                        key={cs}
                        type="button"
                        onClick={() => update({ crosshairStyle: cs })}
                        className={cn(
                          'rounded px-2 py-1 text-[11px] font-semibold capitalize transition',
                          settings.crosshairStyle === cs
                            ? 'bg-[#2962FF] text-white'
                            : 'text-[#787B86] hover:text-[#D1D4DC]'
                        )}
                      >
                        {cs}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-center justify-between">
                  <span>Symbol Watermark</span>
                  <input
                    type="checkbox"
                    checked={settings.showWatermark}
                    onChange={(e) => update({ showWatermark: e.target.checked })}
                    className="accent-[#2962FF]"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between">
                  <span>Invert Price Scale</span>
                  <input
                    type="checkbox"
                    checked={settings.invertScale}
                    onChange={(e) => update({ invertScale: e.target.checked })}
                    className="accent-[#2962FF]"
                  />
                </label>
              </>
            )}

            {tab === 'trading' && (
              <>
                {/* Custom Interactive World Timezone Dropdown (Zero Native Select Glitches) */}
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
                      className="absolute left-0 right-0 top-[64px] z-[60] max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-2xl dark:border-[#2A2E39] dark:bg-[#131722]"
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

                <div className="border-t border-slate-200 pt-3 dark:border-[#2A2E39]" />

                <label className="flex cursor-pointer items-center justify-between">
                  <span>One-Click Buy / Sell Buttons on Chart</span>
                  <input
                    type="checkbox"
                    checked={settings.showQuickTrade}
                    onChange={(e) => update({ showQuickTrade: e.target.checked })}
                    className="accent-[#2962FF]"
                  />
                </label>

                <div className="pt-1">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#00D4AA]">
                    Smart AI & Pro Overlays
                  </div>
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-center justify-between">
                      <span>Volume Profile (VPVR + POC / Value Area)</span>
                      <input
                        type="checkbox"
                        checked={smartOverlays.showVPVR}
                        onChange={(e) => updateSmart({ showVPVR: e.target.checked })}
                        className="accent-[#2962FF]"
                      />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between">
                      <span>Auto Market Structure (HH/HL/LH/LL & BOS/CHoCH)</span>
                      <input
                        type="checkbox"
                        checked={smartOverlays.showMarketStructure}
                        onChange={(e) =>
                          updateSmart({ showMarketStructure: e.target.checked })
                        }
                        className="accent-[#2962FF]"
                      />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between">
                      <span>Fair Value Gaps (FVG Imbalance Zones)</span>
                      <input
                        type="checkbox"
                        checked={smartOverlays.showFVG}
                        onChange={(e) => updateSmart({ showFVG: e.target.checked })}
                        className="accent-[#2962FF]"
                      />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between">
                      <span>Auto Support / Resistance Levels</span>
                      <input
                        type="checkbox"
                        checked={smartOverlays.showAutoSR}
                        onChange={(e) => updateSmart({ showAutoSR: e.target.checked })}
                        className="accent-[#2962FF]"
                      />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between">
                      <span>Auto Pivot Trendlines</span>
                      <input
                        type="checkbox"
                        checked={smartOverlays.showAutoTrendlines}
                        onChange={(e) =>
                          updateSmart({ showAutoTrendlines: e.target.checked })
                        }
                        className="accent-[#2962FF]"
                      />
                    </label>
                  </div>
                </div>
              </>
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
            Reset Defaults
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
