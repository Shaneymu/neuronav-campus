import React from 'react';
import { Type, Eye, MonitorOff, X, Check, SlidersHorizontal } from 'lucide-react';

interface AccessibilitySettings {
  fontSize: number;
  highContrast: boolean;
  reduceMotion: boolean;
}

interface AccessibilityMenuProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
  onUpdate: (key: keyof AccessibilitySettings, value: number | boolean) => void;
}

export const AccessibilityMenu: React.FC<AccessibilityMenuProps> = ({ isOpen, onClose, settings, onUpdate }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile to close menu */}
      <div
        className="fixed inset-0 z-[999] bg-black/20 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed top-20 right-4 md:absolute z-[1000] bg-white dark:bg-slate-800 p-5 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-[calc(100%-2rem)] max-w-80"
        role="dialog"
        aria-label="Accessibility settings"
      >
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <SlidersHorizontal size={20} className="text-teal-600 dark:text-teal-400" />
            Accessibility
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            aria-label="Close accessibility menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Font Size Control */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Type size={14} /> Text Size
            </label>
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1.5 gap-1" role="radiogroup" aria-label="Text size">
              {([100, 110, 125] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdate('fontSize', size)}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                    settings.fontSize === size
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600 dark:text-teal-400 ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  role="radio"
                  aria-checked={settings.fontSize === size}
                  aria-label={`${size === 100 ? 'Normal' : size === 110 ? 'Large' : 'Extra Large'} text`}
                >
                  {size === 100 ? 'A' : size === 110 ? 'A+' : 'A++'}
                  {settings.fontSize === size && <Check size={12} />}
                </button>
              ))}
            </div>
          </div>

          {/* High Contrast Toggle */}
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2" id="high-contrast-label">
              <Eye size={16} className="text-slate-400" />
              High Contrast
            </label>
            <button
              onClick={() => onUpdate('highContrast', !settings.highContrast)}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${settings.highContrast ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-600'}`}
              aria-pressed={settings.highContrast}
              aria-labelledby="high-contrast-label"
            >
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${settings.highContrast ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {/* Reduce Motion Toggle */}
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2" id="reduce-motion-label">
              <MonitorOff size={16} className="text-slate-400" />
              Reduce Motion
            </label>
            <button
              onClick={() => onUpdate('reduceMotion', !settings.reduceMotion)}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${settings.reduceMotion ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-600'}`}
              aria-pressed={settings.reduceMotion}
              aria-labelledby="reduce-motion-label"
            >
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${settings.reduceMotion ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 text-center">
          Adjust settings to suit your sensory needs.
        </div>
      </div>
    </>
  );
};