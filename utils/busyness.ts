/**
 * Busyness forecasting helpers.
 *
 * `popularTimes` is a 12-slot array covering 08:00–19:00 (hour index 8..19),
 * where each value is a "% busy" estimate 0–100. Data is day-agnostic —
 * we treat these as typical hourly patterns for any weekday.
 *
 * Purpose: turn an unpredictable variable (when will this space be
 * manageable?) into a predictable one — directly addressing the intolerance
 * of uncertainty pathway Wigham et al. (2015) identify, and the survey
 * finding that busyness forecasting was the #1 requested feature.
 */

export type BusynessLevel = 'closed' | 'calm' | 'moderate' | 'busy' | 'very-busy';

export const BUSYNESS_OPEN_HOUR = 8;
export const BUSYNESS_CLOSE_HOUR = 19; // last covered hour inclusive

/** Thresholds chosen to map onto the SensoryMeter colour scheme. */
const CALM_MAX = 30;
const MODERATE_MAX = 55;
const BUSY_MAX = 80;

/** Minimum drop (percentage points) to be worth waiting for. */
const MEANINGFUL_DROP = 20;

export interface BusynessReading {
  /** The popularTimes index representing the given hour (null if out of range). */
  hourIndex: number | null;
  /** Percentage busyness at that hour (null if out of range). */
  value: number | null;
  level: BusynessLevel;
}

export interface BusynessForecast {
  /** Hour-of-day (24h) the quieter window starts, e.g. 15 for 3pm. */
  hour: number;
  /** Busyness value at that hour. */
  value: number;
  /** Minutes from now until the quieter window begins. */
  inMinutes: number;
  /** Classification at that hour. */
  level: BusynessLevel;
}

export const classifyBusyness = (value: number | null): BusynessLevel => {
  if (value === null) return 'closed';
  if (value <= CALM_MAX) return 'calm';
  if (value <= MODERATE_MAX) return 'moderate';
  if (value <= BUSY_MAX) return 'busy';
  return 'very-busy';
};

/** Human-friendly label for a busyness level. */
export const busynessLabel = (level: BusynessLevel): string => {
  switch (level) {
    case 'calm': return 'Calm';
    case 'moderate': return 'Moderate';
    case 'busy': return 'Busy';
    case 'very-busy': return 'Very busy';
    case 'closed': return 'Outside opening hours';
  }
};

/**
 * Reading for the current moment. Returns level='closed' when outside the
 * 08:00–19:00 window covered by popularTimes.
 */
export const getCurrentBusyness = (
  popularTimes: number[],
  now: Date = new Date(),
): BusynessReading => {
  const hour = now.getHours();
  if (hour < BUSYNESS_OPEN_HOUR || hour > BUSYNESS_CLOSE_HOUR) {
    return { hourIndex: null, value: null, level: 'closed' };
  }
  const idx = hour - BUSYNESS_OPEN_HOUR;
  const value = popularTimes[idx] ?? null;
  return { hourIndex: idx, value, level: classifyBusyness(value) };
};

/**
 * The next upcoming hour (today) that is meaningfully quieter than right now.
 * Returns null when we're already calm, when nothing ahead is better, or
 * when we're outside the covered window.
 */
export const findNextQuieterSlot = (
  popularTimes: number[],
  now: Date = new Date(),
): BusynessForecast | null => {
  const current = getCurrentBusyness(popularTimes, now);
  if (current.value === null || current.hourIndex === null) return null;

  // Already calm? No point suggesting a quieter time.
  if (current.level === 'calm') return null;

  const threshold = Math.min(current.value - MEANINGFUL_DROP, MODERATE_MAX);

  for (let i = current.hourIndex + 1; i < popularTimes.length; i += 1) {
    const value = popularTimes[i];
    if (value <= threshold) {
      const hour = BUSYNESS_OPEN_HOUR + i;
      const minutesUntilHour =
        (hour - now.getHours()) * 60 - now.getMinutes();
      return {
        hour,
        value,
        inMinutes: Math.max(0, minutesUntilHour),
        level: classifyBusyness(value),
      };
    }
  }

  return null;
};

/**
 * Quietest remaining slot in today's covered window. Useful when the user
 * is already calm and just wants to know how long the calm lasts — or when
 * findNextQuieterSlot returns null but we still want to surface something.
 */
export const findQuietestRemainingSlot = (
  popularTimes: number[],
  now: Date = new Date(),
): BusynessForecast | null => {
  const hour = now.getHours();
  const startIndex = Math.max(0, hour - BUSYNESS_OPEN_HOUR);
  if (startIndex >= popularTimes.length) return null;

  let bestIdx = startIndex;
  for (let i = startIndex + 1; i < popularTimes.length; i += 1) {
    if (popularTimes[i] < popularTimes[bestIdx]) bestIdx = i;
  }

  const bestHour = BUSYNESS_OPEN_HOUR + bestIdx;
  const minutesUntilHour =
    (bestHour - now.getHours()) * 60 - now.getMinutes();

  return {
    hour: bestHour,
    value: popularTimes[bestIdx],
    inMinutes: Math.max(0, minutesUntilHour),
    level: classifyBusyness(popularTimes[bestIdx]),
  };
};

/** "3pm", "8am" */
export const formatHour = (hour: number): string => {
  const normalised = ((hour + 11) % 12) + 1;
  const suffix = hour < 12 ? 'am' : 'pm';
  return `${normalised}${suffix}`;
};

/** "in 45 min", "in 2h 10 min", "now" */
export const formatTimeDelta = (minutes: number): string => {
  if (minutes <= 0) return 'now';
  if (minutes < 60) return `in ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `in ${h}h ${m} min` : `in ${h}h`;
};
