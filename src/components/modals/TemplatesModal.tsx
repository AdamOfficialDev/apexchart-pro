import React, { useEffect, useState } from 'react';
import { Bookmark, Check, Plus, Trash2, X } from 'lucide-react';
import { useTradingStore } from '@/store/useTradingStore';

export const TemplatesModal: React.FC = () => {
  const open = useTradingStore((s) => s.templatesModalOpen);
  const setOpen = useTradingStore((s) => s.setTemplatesModalOpen);
  const activePaneId = useTradingStore((s) => s.activePaneId);
  const chartTemplates = useTradingStore((s) => s.chartTemplates);
  const saveChartTemplate = useTradingStore((s) => s.saveChartTemplate);
  const applyChartTemplate = useTradingStore((s) => s.applyChartTemplate);
  const deleteChartTemplate = useTradingStore((s) => s.deleteChartTemplate);

  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    saveChartTemplate(nameInput, activePaneId);
    setNameInput('');
  };

  return (
    <div
      onClick={() => setOpen(false)}
      className="apex-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#05070B]/70 p-3 sm:p-4 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="apex-modal-card w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white/[0.98] dark:border-[#262E40] dark:bg-[#131823]/[0.98]"
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 dark:border-[#22293A]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2962FF]/12 text-[#4C82FF] ring-1 ring-[#2962FF]/25">
              <Bookmark className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Chart & Indicator Templates
              </h3>
              <div className="text-[10px] font-medium text-[#7D8596]">
                Save and switch multi-indicator presets
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-[#787B86] transition hover:bg-slate-100 hover:text-slate-900 active:scale-90 dark:hover:bg-[#1E2536] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="flex gap-2 border-b border-slate-200/80 p-3.5 dark:border-[#22293A]"
        >
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Save current setup as template..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20 dark:border-[#262E40] dark:bg-[#0D111A] dark:text-white"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-b from-[#3B76FF] to-[#2962FF] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_3px_10px_-2px_rgba(41,98,255,0.45)] transition-all duration-150 hover:brightness-110 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Save
          </button>
        </form>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-2 dark:divide-[#1E2434]">
          {chartTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-[#192030]"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {tpl.name}
                </div>
                <div className="text-[10px] text-[#7D8596]">
                  {tpl.chartStyle} • {tpl.indicators.length} indicators
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    applyChartTemplate(activePaneId, tpl.id);
                    setOpen(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#089981]/15 px-2.5 py-1 text-[11px] font-semibold text-[#089981] transition hover:bg-[#089981] hover:text-white active:scale-95"
                >
                  <Check className="h-3 w-3" />
                  Load
                </button>
                <button
                  onClick={() => deleteChartTemplate(tpl.id)}
                  aria-label="Delete template"
                  className="rounded-lg p-1.5 text-[#787B86] transition hover:bg-rose-500/15 hover:text-[#F23645] active:scale-90"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
