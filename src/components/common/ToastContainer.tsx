import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';

export const ToastContainer: React.FC = () => {
  const toasts = useTradingStore((s) => s.toasts);
  const removeToast = useTradingStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-14 top-12 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-2.5 rounded-lg border p-3 shadow-2xl backdrop-blur-md',
            t.variant === 'success' && 'border-[#089981]/50 bg-[#1E222D]/95 text-[#D1D4DC]',
            t.variant === 'warning' && 'border-amber-500/50 bg-[#1E222D]/95 text-[#D1D4DC]',
            t.variant === 'danger' && 'border-[#F23645]/50 bg-[#1E222D]/95 text-[#D1D4DC]',
            t.variant === 'info' && 'border-[#2962FF]/50 bg-[#1E222D]/95 text-[#D1D4DC]'
          )}
        >
          <div className="mt-0.5 shrink-0">
            {t.variant === 'success' && <CheckCircle2 className="h-4 w-4 text-[#089981]" />}
            {t.variant === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-400" />}
            {t.variant === 'danger' && <XCircle className="h-4 w-4 text-[#F23645]" />}
            {t.variant === 'info' && <Info className="h-4 w-4 text-[#2962FF]" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold">{t.title}</div>
            {t.description && (
              <div className="mt-0.5 text-[11px] text-[#787B86]">{t.description}</div>
            )}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-[#787B86] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
