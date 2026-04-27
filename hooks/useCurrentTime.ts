import { useEffect, useState } from 'react';

/**
 * Returns a Date that refreshes every `intervalMs` (default 60s).
 *
 * Used so busyness forecasts stay fresh when the tab is left open — without
 * requiring any user interaction. Minute resolution is plenty for
 * "calmer in 45 min"-style callouts and keeps re-renders cheap.
 */
export const useCurrentTime = (intervalMs: number = 60_000): Date => {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
};
