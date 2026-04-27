import { useCallback, useEffect, useRef, useState } from 'react';

export interface GeolocationPoint {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export type GeolocationErrorCode =
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT';

export interface GeolocationError {
  code: GeolocationErrorCode;
  message: string;
}

export interface UseGeolocationResult {
  position: GeolocationPoint | null;
  error: GeolocationError | null;
  isWatching: boolean;
  isLoading: boolean;
  start: () => void;
  stop: () => void;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 15_000,
};

const mapError = (err: GeolocationPositionError): GeolocationError => {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return { code: 'PERMISSION_DENIED', message: 'Location permission was denied.' };
    case err.POSITION_UNAVAILABLE:
      return { code: 'POSITION_UNAVAILABLE', message: "Your device couldn't determine a location." };
    case err.TIMEOUT:
      return { code: 'TIMEOUT', message: 'Locating took too long. Try again?' };
    default:
      return { code: 'POSITION_UNAVAILABLE', message: 'Something went wrong while locating you.' };
  }
};

/**
 * useGeolocation — watch the device's current position.
 *
 * Start/stop is explicit so we don't prompt users for permission until they ask
 * (important for calm UX). When watching, the browser streams fresh positions
 * as the user moves — ideal for live-follow navigation.
 */
export const useGeolocation = (options: UseGeolocationOptions = {}): UseGeolocationResult => {
  const [position, setPosition] = useState<GeolocationPoint | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const watchIdRef = useRef<number | null>(null);

  const positionOptions: PositionOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading ?? null,
      speed: pos.coords.speed ?? null,
      timestamp: pos.timestamp,
    });
    setError(null);
    setIsLoading(false);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(mapError(err));
    setIsLoading(false);
    setIsWatching(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError({
        code: 'UNSUPPORTED',
        message: "Your browser doesn't support location services.",
      });
      return;
    }

    if (watchIdRef.current !== null) return; // already watching

    setError(null);
    setIsLoading(true);
    setIsWatching(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      positionOptions,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSuccess, handleError]);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
    setIsLoading(false);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return { position, error, isWatching, isLoading, start, stop };
};
