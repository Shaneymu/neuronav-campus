import React from 'react';
import { Users } from 'lucide-react';
import {
  BusynessLevel,
  busynessLabel,
  classifyBusyness,
  getCurrentBusyness,
} from '../utils/busyness';

interface BusynessBadgeProps {
  popularTimes: number[];
  /** Current time, injected so the badge ticks with the rest of the UI. */
  now?: Date;
  /** Compact variant for list cards — drops the icon and shortens the label. */
  size?: 'sm' | 'md';
  /** Force a specific level (used by the BusyChart caption). */
  level?: BusynessLevel;
  /** Custom label override — useful for "Now: 42%" style callouts. */
  label?: string;
}

/**
 * Maps a busyness level onto the existing teal / amber / rose palette so the
 * signal lines up with the SensoryMeter colours elsewhere in the app.
 */
const LEVEL_STYLES: Record<BusynessLevel, { bg: string; text: string; border: string }> = {
  calm: {
    bg: 'bg-teal-50 dark:bg-teal-900/30',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
  },
  moderate: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  busy: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  'very-busy': {
    bg: 'bg-rose-50 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
  },
  closed: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
  },
};

/**
 * Small pill showing the live busyness of a building — e.g. "Busy now".
 * Intentionally tiny so it works on list cards as well as detail views.
 */
export const BusynessBadge: React.FC<BusynessBadgeProps> = ({
  popularTimes,
  now,
  size = 'md',
  level: forcedLevel,
  label: customLabel,
}) => {
  const resolvedLevel = forcedLevel ?? getCurrentBusyness(popularTimes, now).level;
  const style = LEVEL_STYLES[resolvedLevel];

  const text = customLabel
    ?? (resolvedLevel === 'closed' ? busynessLabel(resolvedLevel) : `${busynessLabel(resolvedLevel)} now`);

  const sizing = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : 'text-xs px-2 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${sizing} ${style.bg} ${style.text} ${style.border}`}
      aria-label={`Current busyness: ${text}`}
    >
      {size === 'md' && <Users size={12} aria-hidden="true" />}
      {text}
    </span>
  );
};

/**
 * Exposed so the BusyChart caption can reuse the exact same colour mapping
 * without re-rendering a full pill.
 */
export const busynessTextClass = (value: number | null): string => {
  const level = classifyBusyness(value);
  return LEVEL_STYLES[level].text;
};
