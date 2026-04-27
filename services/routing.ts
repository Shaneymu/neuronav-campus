/**
 * Routing service — fetches a walking route from OSRM's public demo server.
 *
 * OSRM's demo server is free, requires no API key, and supports the "foot"
 * profile which follows paths and pedestrian-friendly routes. It's rate-limited
 * and intended for demo/small-scale use — perfect for a university project.
 *
 * If you deploy this more widely, swap the host for a self-hosted OSRM
 * instance or a commercial provider like Mapbox Directions / OpenRouteService.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface WalkingRoute {
  /** Ordered [lat, lng] pairs suitable for drawing a Leaflet polyline. */
  coordinates: [number, number][];
  /** Total distance in metres. */
  distance: number;
  /** Estimated walking time in seconds. */
  duration: number;
}

interface OsrmRouteResponse {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: {
      type: 'LineString';
      coordinates: [number, number][]; // [lng, lat]
    };
  }>;
  message?: string;
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/foot';

/**
 * Fetches a walking route between two points. Throws on network error or
 * when OSRM returns a non-Ok status code.
 */
export const fetchWalkingRoute = async (
  from: LatLng,
  to: LatLng,
  signal?: AbortSignal,
): Promise<WalkingRoute> => {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=false`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Routing failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OsrmRouteResponse;
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(data.message || 'No walking route could be found.');
  }

  const route = data.routes[0];

  return {
    // OSRM returns [lng, lat]; Leaflet expects [lat, lng].
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: route.distance,
    duration: route.duration,
  };
};

/** Format metres as "120 m" or "1.2 km". */
export const formatDistance = (metres: number): string => {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(metres < 10_000 ? 1 : 0)} km`;
};

/** Format seconds as "3 min" or "1 h 15 min". */
export const formatDuration = (seconds: number): string => {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
};
