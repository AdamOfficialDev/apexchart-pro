import React, { useEffect } from 'react';
import { Pause, Play, Scissors, SkipBack, SkipForward, X } from 'lucide-react';
import { cn, formatTimestamp } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';

const SPEEDS: Array<0.5 | 1 | 2 | 5 | 10> = [0.5, 1, 2, 5, 10];

export const ReplayControls: React.FC = () => {
  const replay = useTradingStore((s) => s.replay);
  const toggleReplayPlay = useTradingStore((s) => s.toggleReplayPlay);
  const stepForward = useTradingStore((s) => s.stepReplayForward);
  const stepBackward = useTradingStore((s) => s.stepReplayBackward);
  const setSpeed = useTradingStore((s) => s.setReplaySpeed);
  const setSelectMode = useTradingStore((s) => s.setReplaySelectMode);
  const setReplayIndex = useTradingStore((s) => s.setReplayIndex);
  const exitReplayMode = useTradingStore((s) => s.exitReplayMode);

  useEffect(() => {
    if (!replay.enabled || !replay.isPlaying || replay.isSelectingStart) return;
    const intervalMs = Math.max(90, Math.round(1000 / replay.speed));
    const id = window.setInterval(() => {
      useTradingStore.getState().stepReplayForward();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [replay.enabled, replay.isPlaying, replay.isSelectingStart, replay.speed]);

  if (!replay.enabled) return null;

  const maxIdx = Math.max(5, replay.totalBars - 1);

  return (
    <div className="pointer-events-auto absolute bottom-10 left-1/2 z-30 -translate-x-1/2">
      <div className="glass-panel flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-white/95 px-3 py-1.5 shadow-2xl dark:bg-[#1E222D]/95">
        <div className="flex items-center gap-1.5 pr-1">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          <span className="text-[11px] font-bold tracking-wider text-amber-400 uppercase">
            Replay
          </span>
        </div>

        <button
          onClick={() => setSelectMode(!replay.isSelectingStart)}
          title="Select starting bar on chart"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
            replay.isSelectingStart
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#2A2E39] dark:text-[#D1D4DC] dark:hover:bg-[#363A45]'
          )}
        >
          <Scissors className="h-3.5 w-3.5" />
          <span>Jump to Bar</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-[#2A2E39]" />

        <div className="flex items-center gap-1">
          <button
            onClick={stepBackward}
            title="Step Backward (Left Arrow)"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={toggleReplayPlay}
            title="Play / Pause (Space)"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#2962FF] text-white shadow-sm hover:bg-blue-500"
          >
            {replay.isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 translate-x-[1px]" />
            )}
          </button>

          <button
            onClick={stepForward}
            title="Step Forward (Right Arrow)"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-[#D1D4DC] dark:hover:bg-[#2A2E39]"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center rounded-md bg-slate-100 p-0.5 dark:bg-[#131722]">
          {SPEEDS.map((sp) => (
            <button
              key={sp}
              onClick={() => setSpeed(sp)}
              className={cn(
                'rounded px-2 py-0.5 font-mono text-[11px] font-semibold transition',
                replay.speed === sp
                  ? 'bg-[#2962FF] text-white shadow'
                  : 'text-slate-500 hover:text-slate-900 dark:text-[#787B86] dark:hover:text-[#D1D4DC]'
              )}
            >
              {sp}x
            </button>
          ))}
        </div>

        {replay.totalBars > 0 && (
          <div className="hidden md:flex items-center gap-2 pl-1">
            <input
              type="range"
              min={5}
              max={maxIdx}
              value={Math.min(maxIdx, Math.max(5, replay.currentIndex))}
              onChange={(e) => setReplayIndex(Number(e.target.value))}
              className="h-1.5 w-28 cursor-pointer accent-amber-500"
            />
            <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-[#787B86]">
              {replay.currentIndex + 1}/{replay.totalBars}
            </span>
            {replay.currentTimestamp && (
              <span className="hidden lg:inline font-mono text-[11px] text-[#787B86]">
                {formatTimestamp(replay.currentTimestamp, true)}
              </span>
            )}
          </div>
        )}

        <div className="h-4 w-px bg-slate-200 dark:bg-[#2A2E39]" />

        <button
          onClick={exitReplayMode}
          title="Exit Replay Mode"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/10"
        >
          <X className="h-3.5 w-3.5" />
          <span>Exit</span>
        </button>
      </div>
    </div>
  );
};
