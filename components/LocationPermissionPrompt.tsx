import React from 'react';
import { MapPin, Shield, X } from 'lucide-react';

interface LocationPermissionPromptProps {
  isOpen: boolean;
  onAllow: () => void;
  onCancel: () => void;
}

/**
 * Calm, minimal explainer shown before we ask the browser for location
 * permission. Gives the user a moment to understand what's happening, which
 * matters for neurodiverse users who benefit from predictable UX.
 */
export const LocationPermissionPrompt: React.FC<LocationPermissionPromptProps> = ({
  isOpen,
  onAllow,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] bg-black/30 dark:bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}
      aria-hidden="true"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-700"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-prompt-title"
        aria-describedby="location-prompt-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-teal-100 dark:bg-teal-900/40 rounded-xl">
            <MapPin className="text-teal-700 dark:text-teal-300" size={22} />
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            aria-label="Close location prompt"
          >
            <X size={18} />
          </button>
        </div>

        <h2
          id="location-prompt-title"
          className="text-lg font-bold text-slate-800 dark:text-white mb-2"
        >
          Show your location on the map?
        </h2>

        <p
          id="location-prompt-desc"
          className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4"
        >
          We'll use your location to show where you are and plan walking routes to buildings.
          Your browser will ask for permission next.
        </p>

        <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg mb-5 border border-slate-100 dark:border-slate-700">
          <Shield className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your location stays on your device — we don't send it anywhere or save it.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Not now
          </button>
          <button
            onClick={onAllow}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            autoFocus
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
