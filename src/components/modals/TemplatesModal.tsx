import React, { useState } from 'react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-[#2A2E39] dark:bg-[#1E222D]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-[#2A2E39]">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-[#2962FF]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#D1D4DC]">
              Chart & Indicator Templates
            </h3>
          </div>
          <button onClick={() => setOpen(false)} className="text-[#787B86] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="flex gap-2 border-b border-slate-200 p-3 dark:border-[#2A2E39]"
        >
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Save current setup as template..."
            className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-[#2962FF] dark:border-[#2A2E39] dark:bg-[#131722] dark:text-[#D1D4DC]"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-md bg-[#2962FF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Save
          </button>
        </form>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1.5 dark:divide-[#2A2E39]/60">
          {chartTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-[#2A2E39]/50"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-[#D1D4DC]">
                  {tpl.name}
                </div>
                <div className="text-[10px] text-[#787B86]">
                  {tpl.chartStyle} • {tpl.indicators.length} indicators
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    applyChartTemplate(activePaneId, tpl.id);
                    setOpen(false);
                  }}
                  className="inline-flex items-center gap-1 rounded bg-[#089981]/15 px-2.5 py-1 text-[11px] font-semibold text-[#089981] hover:bg-[#089981] hover:text-white"
                >
                  <Check className="h-3 w-3" />
                  Load
                </button>
                <button
                  onClick={() => deleteChartTemplate(tpl.id)}
                  className="rounded p-1 text-[#787B86] hover:text-[#F23645]"
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
