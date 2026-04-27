import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Building } from '../types';
import { CalmerAlternative } from '../utils/sensory';

interface CalmerAlternativeCardProps {
  alternative: CalmerAlternative;
  onSelect: (building: Building) => void;
}

/**
 * A gentle, non-blocking suggestion shown inside the building detail panel
 * when the selected building is high-sensory and a quieter option exists.
 */
export const CalmerAlternativeCard: React.FC<CalmerAlternativeCardProps> = ({
  alternative,
  onSelect,
}) => {
  const { building, reliefScore } = alternative;

  return (
    <button
      onClick={() => onSelect(building)}
      className="w-full text-left bg-teal-50/80 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl p-3 mb-4 hover:bg-teal-100/80 dark:hover:bg-teal-900/40 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
      aria-label={`See a calmer alternative: ${building.name}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-white dark:bg-teal-900/40 rounded-lg shrink-0">
          <Sparkles size={16} className="text-teal-600 dark:text-teal-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider mb-0.5">
            Calmer alternative
          </p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
            {building.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lower sensory load by {reliefScore} points
          </p>
        </div>
        <ArrowRight size={16} className="text-teal-600 dark:text-teal-300 shrink-0 mt-1" />
      </div>
    </button>
  );
};
