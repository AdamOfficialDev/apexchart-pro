import { useEffect, useRef } from 'react';
import { getSymbolInfo, SYMBOLS } from '@/data/symbols';
import { formatPrice, playAlertSound } from '@/lib/utils';
import { fetchBinanceWatchlistTickers } from '@/services/marketData';
import { useTradingStore } from '@/store/useTradingStore';

export function useAlertMonitor() {
  const quotes = useTradingStore((s) => s.quotes);
  const alerts = useTradingStore((s) => s.alerts);
  const watchlist = useTradingStore((s) => s.watchlist);
  const panes = useTradingStore((s) => s.panes);
  const layout = useTradingStore((s) => s.layout);
  const prevPricesRef = useRef<Record<string, number>>({});

  // Real-time Binance 24h batch ticker sync for Watchlist + fallback drift for offline/non-Binance
  useEffect(() => {
    const syncWatchlist = async () => {
      const store = useTradingStore.getState();
      const allSymbols = Array.from(new Set([...store.watchlist, ...SYMBOLS.map((s) => s.symbol)]));
      const binanceMap = new Map<string, string[]>();

      for (const sym of allSymbols) {
        const info = getSymbolInfo(sym);
        if (info.binanceSymbol) {
          const arr = binanceMap.get(info.binanceSymbol) ?? [];
          arr.push(sym);
          binanceMap.set(info.binanceSymbol, arr);
        }
      }

      const liveBatch = await fetchBinanceWatchlistTickers(Array.from(binanceMap.keys()));

      for (const [bSym, targetSyms] of binanceMap.entries()) {
        const item = liveBatch[bSym];
        if (item) {
          for (const sym of targetSyms) {
            store.updateQuote(
              sym,
              item.price,
              sym === 'XAUUSD' ? 'gold-proxy' : 'binance',
              0,
              item.changePercent
            );
          }
        }
      }

      const visiblePaneCount =
        layout === '1x1' ? 1 : layout === '1x2' || layout === '2x1' ? 2 : layout === '1+2' ? 3 : 4;
      const activeChartSymbols = new Set(
        store.panes.slice(0, visiblePaneCount).map((p) => p.symbol)
      );

      for (const sym of store.watchlist) {
        if (activeChartSymbols.has(sym)) continue;
        const info = getSymbolInfo(sym);
        if (info.binanceSymbol && liveBatch[info.binanceSymbol]) continue;

        const curr = store.quotes[sym]?.price ?? info.basePrice;
        const drift = (Math.random() - 0.495) * info.volatility * 0.08 * curr;
        const nextPrice = Math.max(info.minMove, Number((curr + drift).toFixed(info.precision)));
        store.updateQuote(sym, nextPrice, 'simulated', Math.round(Math.random() * 50));
      }
    };

    syncWatchlist();
    const timer = window.setInterval(syncWatchlist, 5000);
    return () => window.clearInterval(timer);
  }, [layout, watchlist, panes]);

  useEffect(() => {
    const store = useTradingStore.getState();
    const activeAlerts = alerts.filter((a) => a.active);
    if (activeAlerts.length === 0) {
      for (const [sym, q] of Object.entries(quotes)) {
        prevPricesRef.current[sym] = q.price;
      }
      return;
    }

    for (const alert of activeAlerts) {
      const q = quotes[alert.symbol];
      if (!q) continue;
      const prev = prevPricesRef.current[alert.symbol];
      const curr = q.price;
      if (prev === undefined) continue;

      let triggered = false;
      if (alert.condition === 'crossing_up') {
        triggered = prev < alert.price && curr >= alert.price;
      } else if (alert.condition === 'crossing_down') {
        triggered = prev > alert.price && curr <= alert.price;
      } else {
        triggered =
          (prev < alert.price && curr >= alert.price) ||
          (prev > alert.price && curr <= alert.price);
      }

      if (triggered) {
        const info = getSymbolInfo(alert.symbol);
        store.markAlertTriggered(alert.id);
        if (store.chartSettings.playAlertSound) {
          playAlertSound();
        }
        store.addToast({
          title: `Alert Triggered: ${info.displaySymbol}`,
          description: `${alert.note ? alert.note + ' — ' : ''}Price hit ${formatPrice(
            curr,
            info.precision
          )}`,
          variant: 'warning',
        });
      }
    }

    for (const [sym, q] of Object.entries(quotes)) {
      prevPricesRef.current[sym] = q.price;
    }
  }, [quotes, alerts]);
}
