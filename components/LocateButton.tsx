import React from 'react';
import { LocateFixed, Locate, Loader2 } from 'lucide-react';

interface LocateButtonProps {
  isWatching: boolean;
  isLoading: boolean;
  hasError: boolean;
  onClick: () => void;
}

/**
 * Floating map control that toggles live-follow tracking.
 * Three visual states: idle, loading, actively following.
 */
export const LocateButton: React.FC<LocateButtonProps> = ({
  isWatching,
  isLoading,
  hasError,
  onClick,
}) => {
  const label = isWatching
    ? 'Stop following my location'
    : 'Show my location and follow me';

  const icon = isLoading ? (
    <Loader2 size={20} className="animate-spin" />
  ) : isWatching ? (
    <LocateFixed size={20} />
  ) : (
    <Locate size={20} />
  );

  const activeStyles = isWatching
    ? 'bg-teal-600 text-white hover:bg-teal-700 ring-2 ring-teal-300 dark:ring-teal-500/60'
    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700';

  return (
    <button
      onClick={onClick}
      className={`
        absolute bottom-24 right-6 md:bottom-6 md:right-20
        z-[450] w-12 h-12 rounded-full shadow-lg
        flex items-center justify-center
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500
        ${activeStyles}
      `}
      aria-label={label}
      aria-pressed={isWatching}
      title={hasError ? 'Location unavailable — tap to try again' : label}
    >
      {icon}
    </button>
  );
};
