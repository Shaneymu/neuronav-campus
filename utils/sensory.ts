import { Building, SensoryProfile } from '../types';

/** Haversine distance in metres between two lat/lng pairs. */
export const haversineMetres = (
  a: [number, number],
  b: [number, number],
): number => {
  const R = 6371000;
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Combined sensory load — a simple sum used only for ranking. */
export const sensoryLoad = (p: SensoryProfile): number =>
  p.noise + p.crowds + p.lighting;

export interface CalmerAlternative {
  building: Building;
  /** How much lower the combined sensory load is vs the original. */
  reliefScore: number;
  /** Metres between the original building and the alternative. */
  distanceFromOriginal: number;
}

/**
 * Suggest a calmer alternative of the same category.
 *
 * Returns `null` unless the selected building is meaningfully high-sensory
 * (load >= 15 out of 30), to avoid showing unhelpful alternatives when the
 * user has already picked a quiet space.
 *
 * Ranks candidates by relief first, then proximity — so we nudge users to
 * a calmer spot that's still nearby rather than one across campus.
 */
export const findCalmerAlternative = (
  selected: Building,
  all: Building[],
): CalmerAlternative | null => {
  const selectedLoad = sensoryLoad(selected.sensoryProfile);
  if (selectedLoad < 15) return null;

  const candidates = all
    .filter((b) => b.id !== selected.id && b.category === selected.category)
    .map((b) => ({
      building: b,
      reliefScore: selectedLoad - sensoryLoad(b.sensoryProfile),
      distanceFromOriginal: haversineMetres(selected.coordinates, b.coordinates),
    }))
    .filter((c) => c.reliefScore >= 4); // meaningful relief only

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    // Prefer bigger relief; break ties by distance (closer wins).
    if (b.reliefScore !== a.reliefScore) return b.reliefScore - a.reliefScore;
    return a.distanceFromOriginal - b.distanceFromOriginal;
  });

  return candidates[0];
};
