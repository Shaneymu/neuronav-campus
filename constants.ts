import { Building, MapConfig, SensoryTagDef, SensoryTagType } from './types';

export const MAP_CONFIG: MapConfig = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
};

export const SENSORY_TAGS: Record<SensoryTagType, SensoryTagDef> = {
  QUIET: { label: 'Quiet Zone', color: 'text-teal-600 dark:text-teal-300', bg: 'bg-teal-50 dark:bg-teal-900/30', border: 'border-teal-200 dark:border-teal-800' },
  LOW_LIGHT: { label: 'Dim Lighting', color: 'text-indigo-600 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-200 dark:border-indigo-800' },
  SOCIAL: { label: 'Social Hub', color: 'text-amber-600 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800' },
  NATURE: { label: 'Nature', color: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800' },
  GLARE: { label: 'Glare Risk', color: 'text-orange-600 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800' },
  ECHO: { label: 'Echo Prone', color: 'text-purple-600 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800' },
  SMELL: { label: 'Food Smells', color: 'text-pink-600 dark:text-pink-300', bg: 'bg-pink-50 dark:bg-pink-900/30', border: 'border-pink-200 dark:border-pink-800' }
};

/**
 * popularTimes is a 12-slot array covering 08:00–19:00 (hour index 0 = 8am).
 * Google Popular Times is not programmatically accessible, so these are
 * best-effort estimates — except Sport Central, which uses Northumbria Sport's
 * own published peak/quiet stats. See busyness.ts for how these feed the UI.
 *
 * Coordinates come from OpenStreetMap (verified via Nominatim in April 2026):
 *   - University Library → way 737438922
 *   - Sport Central      → way 170753279
 *   - Students' Union    → way 737438899 (Habita, inside NSU)
 *   - CIS Building       → way 700957899
 */
export const BUILDINGS_DATA: Building[] = [
  {
    id: 'lib-001',
    name: 'University Library',
    code: 'LIB',
    coordinates: [54.97857, -1.60869],
    category: 'library',
    tags: ['QUIET', 'LOW_LIGHT'],
    sensoryProfile: { noise: 2, crowds: 5, lighting: 3 },
    description: 'The main study hub. Floors 3 and 4 are strictly Silent Study. The basement is dimmer and quieter than the ground floor.',
    features: ['Silent Study (Floors 2-4)', 'Sensory Pods available'],
    access: 'Automatic revolving door. Lifts to all floors.',
    sensoryEntrance: 'Avoid the main revolving door during class changeover (xx:50 - xx:00). Use the accessible pass door for a slower entry.',
    bestTime: 'Before 11am or after 6pm',
    // Typical undergrad study pattern — slow start, long afternoon peak, tapers by evening.
    popularTimes: [15, 25, 40, 55, 60, 55, 70, 75, 75, 60, 45, 30]
  },
  {
    id: 'spc-003',
    name: 'Sport Central',
    code: 'SPC',
    coordinates: [54.97815, -1.60683],
    category: 'sport',
    tags: ['SOCIAL', 'ECHO', 'GLARE'],
    sensoryProfile: { noise: 9, crowds: 8, lighting: 9 },
    description: 'High-energy environment. Main Arena has high-intensity lighting. Large open halls cause echoing.',
    features: ['Swimming Pool', 'Gym', 'Main Arena'],
    access: 'Level access via automatic doors.',
    sensoryEntrance: 'The main reception can be chaotic. Access the gym directly via the turnstiles to the left if you have your card ready.',
    bestTime: 'Early mornings (07:00-10:00)',
    // Source: Northumbria Sport's published stats — weekday peaks at 11, 13, 16, 18; quiet 7-10 and 20-22.
    popularTimes: [20, 25, 30, 75, 50, 80, 45, 50, 85, 65, 90, 60]
  },
  {
    id: 'su-004',
    name: "Students' Union",
    code: 'NSU',
    coordinates: [54.97837, -1.60741],
    category: 'social',
    tags: ['SOCIAL', 'SMELL'],
    sensoryProfile: { noise: 8, crowds: 9, lighting: 6 },
    description: "Social heart of campus. Ground floor (Habita) is loud with strong coffee/food smells. Top floor 'Relax' lounge is a safe haven.",
    features: ['Habita Bar', 'Quiet Lounge (Top Floor)'],
    access: 'Lift access to all floors.',
    sensoryEntrance: 'The main entrance ramp is often crowded with smokers. Use the side entrance facing the Library for cleaner air and less crowding.',
    bestTime: 'Before 11:30am',
    // Lunch rush + Happy Hour (5pm Mon/Wed/Fri) drive the two main peaks.
    popularTimes: [5, 10, 25, 45, 80, 75, 50, 40, 55, 90, 85, 70]
  },
  {
    id: 'cis-002',
    name: 'CIS Building',
    code: 'CIS',
    coordinates: [54.97668, -1.60696],
    category: 'tech',
    tags: ['QUIET', 'LOW_LIGHT'],
    sensoryProfile: { noise: 3, crowds: 4, lighting: 4 },
    description: 'Modern building with glare-control glazing. Open plan layout has a low hum but no sharp noises.',
    features: ['Computer Labs', 'Help Desk'],
    access: 'Automatic doors (149cm wide).',
    sensoryEntrance: 'The wide atrium entrance is usually calm. Good visibility of the whole space upon entry.',
    bestTime: 'Fridays',
    // Academic pattern — heavy 9-12 and 1-3 lecture blocks, much quieter after 5pm.
    popularTimes: [15, 55, 75, 70, 65, 55, 70, 60, 35, 20, 10, 5]
  }
];

export const getCategoryIconSvg = (category: string): string => {
  const attrs = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  switch (category) {
    case 'library':
      return '<svg ' + attrs + '><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>';
    case 'sport':
      return '<svg ' + attrs + '><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>';
    case 'social':
      return '<svg ' + attrs + '><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" x2="6" y1="2" y2="4"></line><line x1="10" x2="10" y1="2" y2="4"></line><line x1="14" x2="14" y1="2" y2="4"></line></svg>';
    case 'tech':
      return '<svg ' + attrs + '><rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg>';
    case 'calm':
      return '<svg ' + attrs + '><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>';
    case 'academic':
      return '<svg ' + attrs + '><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>';
    default:
      return '<svg ' + attrs + '><circle cx="12" cy="10" r="3"></circle><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"></path></svg>';
  }
};