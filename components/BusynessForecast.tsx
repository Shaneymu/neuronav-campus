import React from 'react';
import { TrendingDown, Sparkles } from 'lucide-react';
import {
  findNextQuieterSlot,
  findQuietestRemainingSlot,
  formatHour,
  formatTimeDelta,
  getCurrentBusyness,
} from '../utils/busyness';

interface BusynessForecastProps {
  popularTimes: number[];
  /** Injected so the forecast ticks alongside the rest of the UI. */
  now?: Date;
}

/**
 * A single-line callout shown under a building's description:
 *
 *   "Calmer after 3pm (in 2h 10 min)" — when currently busy
 *   "Stays calm until 7pm"             — when already calm, for reassurance
 *
 * Motivation: the survey in Shane's dissertation flagged busyness forecasting
 * as the #1 requested feature. Surfacing a concrete "wait until X" gives the
 * user a predictable plan rather than an open-ended wait, which is the exact
 * uncertainty pathway Wigham et al. (2015) link to sensory avoidance in
 * autistic adults.
 */
export const BusynessForecast: React.FC<BusynessForecastProps> = ({ popularTimes, now }) => {
  const current = getCurrentBusyness(popularTimes, now);

  // Outside covered hours — quietly render nothing rather than showing stale data.
  if (current.level === 'closed') return null;

  const quieter = findNextQuieterSlot(popularTimes, now);

  if (quieter) {
    return (
      <div
        className="flex items-start gap-2 rounded-xl border border-teal-100 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-900/20 px-3 py-2 mb-3"
        role="note"
      >
        <TrendingDown
          size={16}
          className="text-teal-600 dark:text-teal-300 mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
          <span className="font-semibold text-teal-700 dark:text-teal-300">
            Calmer after {formatHour(quieter.hour)}
          </span>
          <span className="text-slate-500 dark:text-slate-400"> ({formatTimeDelta(quieter.inMinutes)})</span>
        </p>
      </div>
    );
  }

  // Already calm, or no meaningful drop ahead — show reassurance instead.
  const quietest = findQuietestRemainingSlot(popularTimes, now);
  if (!quietest) return null;

  if (current.level === 'calm') {
    return (
      <div
        className="flex items-start gap-2 rounded-xl border border-teal-100 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-900/20 px-3 py-2 mb-3"
        role="note"
      >
        <Sparkles
          size={16}
          className="text-teal-600 dark:text-teal-300 mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
          <span className="font-semibold text-teal-700 dark:text-teal-300">It&rsquo;s calm here right now.</span>
          <span className="text-slate-500 dark:text-slate-400">
            {' '}Quietest point ahead is around {formatHour(quietest.hour)}.
          </span>
        </p>
      </div>
    );
  }

  // Busy now, no relief ahead today — be honest about it.
  return (
    <div
      className="flex items-start gap-2 rounded-xl border border-amber-100 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 px-3 py-2 mb-3"
      role="note"
    >
      <TrendingDown
        size={16}
        className="text-amber-600 dark:text-amber-300 mt-0.5 shrink-0"
        aria-hidden="true"
      />
      <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
        <span className="font-semibold text-amber-700 dark:text-amber-300">
          Likely busy for the rest of the day.
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {' '}Quietest remaining point is around {formatHour(quietest.hour)}.
        </span>
      </p>
    </div>
  );
};
