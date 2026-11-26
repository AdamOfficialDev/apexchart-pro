import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTradingStore } from '@/store/useTradingStore';

export const ToastContainer: React.FC = () => {
  const toasts = useTradingStore((s) => s.toasts);
  const removeToast = useTradingStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-14 top-14 z-50 flex w-84 max-w-[calc(100vw-4.5rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'glass-popover animate-toastIn pointer-events-auto flex items-start gap-3 rounded-xl border p-3',
            t.variant === 'success' && 'border-[#089981]/45 bg-[#131922]/95 text-[#E2E6F0]',
            t.variant === 'warning' && 'border-amber-500/45 bg-[#131922]/95 text-[#E2E6F0]',
            t.variant === 'danger' && 'border-[#F23645]/45 bg-[#131922]/95 text-[#E2E6F0]',
            t.variant === 'info' && 'border-[#2962FF]/45 bg-[#131922]/95 text-[#E2E6F0]'
          )}
        >
          <div
            className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
              t.variant === 'success' && 'bg-[#089981]/15 text-[#089981]',
              t.variant === 'warning' && 'bg-amber-500/15 text-amber-400',
              t.variant === 'danger' && 'bg-[#F23645]/15 text-[#F23645]',
              t.variant === 'info' && 'bg-[#2962FF]/15 text-[#2962FF]'
            )}
          >
            {t.variant === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
            {t.variant === 'warning' && <AlertTriangle className="h-3.5 w-3.5" />}
            {t.variant === 'danger' && <XCircle className="h-3.5 w-3.5" />}
            {t.variant === 'info' && <Info className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold tracking-tight text-white">{t.title}</div>
            {t.description && (
              <div className="mt-0.5 text-[11px] leading-relaxed text-[#94A3B8]">
                {t.description}
              </div>
            )}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            aria-label="Dismiss notification"
            className="rounded-md p-1 text-[#787B86] transition hover:bg-white/10 hover:text-white active:scale-90"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
