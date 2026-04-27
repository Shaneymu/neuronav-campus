import React from 'react';
import { Volume2, Sun, Users, Wind, LucideIcon, Clock } from 'lucide-react';
import { SENSORY_TAGS } from '../constants';
import { SensoryTagType } from '../types';
import { classifyBusyness, busynessLabel, BusynessLevel } from '../utils/busyness';

interface SensoryMeterProps {
  label: string;
  value: number;
  icon?: LucideIcon;
  lowLabel: string;
  highLabel: string;
}

export const SensoryMeter: React.FC<SensoryMeterProps> = ({ label, value, icon: Icon, lowLabel, highLabel }) => {
  let colorClass = 'bg-teal-400 dark:bg-teal-500';
  if (value > 4) colorClass = 'bg-amber-400 dark:bg-amber-500';
  if (value > 7) colorClass = 'bg-rose-400 dark:bg-rose-500';

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-semibold">
        <span className="flex items-center gap-1">
          {Icon && <Icon size={12} />}
          {label}
        </span>
        <span>{value}/10</span>
      </div>
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${value * 10}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={10}
          aria-label={`${label}: ${value} out of 10`}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
};

export const Tag: React.FC<{ type: SensoryTagType }> = ({ type }) => {
  const style = SENSORY_TAGS[type] || {
    label: type,
    color: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700'
  };

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${style.bg} ${style.color} ${style.border} flex items-center gap-1`}>
      {type === 'QUIET' && <Volume2 size={10} />}
      {type === 'LOW_LIGHT' && <Sun size={10} />}
      {type === 'SOCIAL' && <Users size={10} />}
      {type === 'SMELL' && <Wind size={10} />}
      {style.label}
    </span>
  );
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Fill colours for the current-hour dot, keyed to the shared busyness palette. */
const CURRENT_DOT_FILL: Record<BusynessLevel, string> = {
  calm: 'fill-teal-500 dark:fill-teal-300',
  moderate: 'fill-amber-500 dark:fill-amber-300',
  busy: 'fill-orange-500 dark:fill-orange-300',
  'very-busy': 'fill-rose-500 dark:fill-rose-300',
  closed: 'fill-slate-400 dark:fill-slate-500',
};

const CURRENT_TEXT_CLASS: Record<BusynessLevel, string> = {
  calm: 'text-teal-700 dark:text-teal-300',
  moderate: 'text-amber-700 dark:text-amber-300',
  busy: 'text-orange-700 dark:text-orange-300',
  'very-busy': 'text-rose-700 dark:text-rose-300',
  closed: 'text-slate-500 dark:text-slate-400',
};

export const BusyChart: React.FC<{ data: number[]; now?: Date }> = ({ data, now: nowProp }) => {
  if (!data || data.length === 0) return null;

  const hours = ['8am', '9', '10', '11', '12', '1pm', '2', '3', '4', '5', '6', '7'];
  const now = nowProp ?? new Date();
  const currentHour = now.getHours();
  const calculatedIndex = currentHour - 8;
  const showDot = calculatedIndex >= 0 && calculatedIndex < hours.length;
  const dayName = DAY_NAMES[now.getDay()];
  const currentValue = showDot ? data[calculatedIndex] : null;
  const currentLevel = classifyBusyness(currentValue);

  const width = 300;
  const height = 80;
  const padding = 5;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - (val / 100) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="mt-4 mb-2 w-full">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={14} className="text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            Typical Busy Times ({dayName})
          </span>
        </div>
        {showDot && currentValue !== null && (
          <span className={`text-[10px] font-semibold ${CURRENT_TEXT_CLASS[currentLevel]} shrink-0`}>
            Now: {currentValue}% &middot; {busynessLabel(currentLevel)}
          </span>
        )}
      </div>

      <div className="relative h-24 w-full" role="img" aria-label={`Popularity chart showing busy times throughout the day`}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="popularityGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M${points.split(' ')[0].split(',')[0]},${height} L${points.replace(/ /g, ' L')} L${points.split(' ').slice(-1)[0].split(',')[0]},${height} Z`}
            fill="url(#popularityGradient)"
            className="text-teal-500"
          />
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points={points}
            className="text-teal-500 dark:text-teal-400 transition-all duration-500"
          />
          {data.map((val, i) => {
            const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
            const y = height - (val / 100) * height;
            const isCurrentTime = showDot && i === calculatedIndex;
            const dotLevel = classifyBusyness(val);
            const dotClass = isCurrentTime
              ? `${CURRENT_DOT_FILL[currentLevel]} animate-pulse`
              : 'fill-transparent hover:fill-teal-500 cursor-pointer';
            return (
              <g key={i} className="group">
                <circle
                  cx={x}
                  cy={y}
                  r={isCurrentTime ? 5 : 3}
                  className={dotClass}
                  aria-label={isCurrentTime ? `Now (${hours[i]}): ${val}%, ${busynessLabel(dotLevel)}` : undefined}
                />
                <foreignObject x={x - 20} y={y - 30} width="40" height="25" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-slate-800 text-white text-[9px] px-1 py-0.5 rounded text-center shadow-sm whitespace-nowrap">
                    {hours[i]}: {val}%
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
        <div className="flex justify-between text-[9px] text-slate-400 mt-1 px-1">
          <span>8am</span>
          <span>12pm</span>
          <span>7pm</span>
        </div>
      </div>
    </div>
  );
};