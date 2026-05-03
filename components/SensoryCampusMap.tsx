import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapPin, Volume2, Sun, Search, X, List, Map as MapIcon,
  Loader2, Moon, DoorOpen, BookOpen, Dumbbell, Coffee, Monitor,
  Sparkles, GraduationCap, Users, SlidersHorizontal, Navigation, CheckCircle2, AlertTriangle,
  Footprints, Timer, Maximize2, Minimize2
} from 'lucide-react';
import { BUILDINGS_DATA, MAP_CONFIG, getCategoryIconSvg } from '../constants';
import { Building } from '../types';
import { SensoryMeter, Tag, BusyChart } from './UIComponents';
import { AccessibilityMenu } from './AccessibilityMenu';
import { LocateButton } from './LocateButton';
import { LocationPermissionPrompt } from './LocationPermissionPrompt';
import { CalmerAlternativeCard } from './CalmerAlternativeCard';
import { BusynessBadge } from './BusynessBadge';
import { BusynessForecast } from './BusynessForecast';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCurrentTime } from '../hooks/useCurrentTime';
import {
  fetchWalkingRoute,
  formatDistance,
  formatDuration,
  WalkingRoute,
} from '../services/routing';
import { findCalmerAlternative } from '../utils/sensory';

// Type definition for Leaflet global
declare global {
  interface Window {
    L: typeof import('leaflet');
  }
}

const getCategoryLabel = (category: string): string => {
  switch (category) {
    case 'library': return 'Library';
    case 'sport': return 'Sports Facility';
    case 'social': return 'Social Hub';
    case 'tech': return 'Technology Lab';
    case 'calm': return 'Quiet Space';
    case 'academic': return 'Academic Building';
    default: return 'Building';
  }
};

const getCategoryIcon = (category: string) => {
  const size = 14;
  const className = 'text-teal-600 dark:text-teal-400';
  switch (category) {
    case 'library': return <BookOpen size={size} className={className} />;
    case 'sport': return <Dumbbell size={size} className={className} />;
    case 'social': return <Coffee size={size} className={className} />;
    case 'tech': return <Monitor size={size} className={className} />;
    case 'calm': return <Sparkles size={size} className={className} />;
    case 'academic': return <GraduationCap size={size} className={className} />;
    default: return <MapPin size={size} className={className} />;
  }
};

// Haversine distance in metres between two lat/lng points
const getDistanceMetres = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const CAMPUS_CENTRE = { lat: 54.9779, lng: -1.6075 };
const MAX_ROUTING_DISTANCE = 2000; // 2km

export default function SensoryCampusMap() {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'fullList'>('map');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuiet, setFilterQuiet] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mobileDetailMode, setMobileDetailMode] = useState("compact");
  const [expandedListItem, setExpandedListItem] = useState<string | null>(null);

  // Accessibility State
  const [showAccessMenu, setShowAccessMenu] = useState(false);
  const [accessSettings, setAccessSettings] = useState({
    fontSize: 100,
    highContrast: false,
    reduceMotion: false
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const tileLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const hasCenteredOnUserRef = useRef(false);

  // Geolocation / live-follow state
  const { position: userPosition, error: locationError, isWatching, isLoading: locating, start: startLocating, stop: stopLocating } = useGeolocation();
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [hasAskedOnce, setHasAskedOnce] = useState(false);

  // Route state
  const [route, setRoute] = useState<WalkingRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Minute-ticking clock so busyness badges, forecasts and the BusyChart
  // stay fresh while the tab is open — at the rough resolution the forecast
  // thresholds work on.
  const now = useCurrentTime();

  const filteredLocations = useMemo(() => {
    return BUILDINGS_DATA.filter(b => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = b.name.toLowerCase().includes(term) ||
        b.description.toLowerCase().includes(term) ||
        b.code.toLowerCase().includes(term);
      const matchesQuiet = filterQuiet ? (b.sensoryProfile.noise <= 3 || b.tags.includes('QUIET')) : true;
      return matchesSearch && matchesQuiet;
    });
  }, [searchTerm, filterQuiet]);

  // Apply Accessibility Settings
  useEffect(() => {
    document.documentElement.style.fontSize = `${accessSettings.fontSize}%`;

    if (accessSettings.reduceMotion) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }

    if (accessSettings.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [accessSettings]);

  // Apply Dark Mode Global Class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Consolidated marker update function
  const updateMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};

    filteredLocations.forEach(building => {
      const isSelected = selectedBuilding?.id === building.id;
      const { noise } = building.sensoryProfile;

      const getColor = (): string => {
        if (isSelected) return '#0d9488';
        if (noise >= 7) return darkMode ? '#fb7185' : '#f43f5e';
        if (noise <= 3 || building.tags.includes('QUIET')) return darkMode ? '#2dd4bf' : '#14b8a6';
        return darkMode ? '#fbbf24' : '#f59e0b';
      };

      const iconSvg = getCategoryIconSvg(building.category);
      const markerSize = isSelected ? 48 : 36;
      const iconHtml = `
        <div style="
          background-color: ${getColor()};
          width: ${markerSize}px;
          height: ${markerSize}px;
          border-radius: 50%;
          border: 3px solid ${darkMode ? '#1e293b' : 'white'};
          box-shadow: 0 4px 6px rgba(0,0,0,0.2);
          display: flex; align-items: center; justify-content: center;
          color: ${darkMode ? '#0f172a' : 'white'};
          transition: all 0.3s ease;
        "
        role="button"
        aria-label="${building.name} - ${getCategoryLabel(building.category)}"
        tabindex="0"
        >
          ${iconSvg}
        </div>
      `;

      const marker = window.L.marker(building.coordinates as [number, number], {
        icon: window.L.divIcon({
          className: 'custom-marker',
          html: iconHtml,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40]
        })
      }).addTo(map);

      marker.bindTooltip(building.name, {
        direction: 'top',
        offset: [0, -42],
        className: 'custom-tooltip'
      });

      marker.on('click', () => {
        setSelectedBuilding(building);
        if (window.innerWidth < 768) {
          setViewMode('map');
        }
        map.flyTo(building.coordinates, 18, { duration: 1.5 });
      });

      markersRef.current[building.id] = marker;
    });
  }, [filteredLocations, selectedBuilding, darkMode]);

  // Map Initialization with error handling and timeout
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if Leaflet is available with a timeout
    if (!window.L) {
      const timeout = setTimeout(() => {
        if (!window.L) {
          setMapError(true);
        }
      }, 8000);

      const checkInterval = setInterval(() => {
        if (window.L) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          initMap();
        }
      }, 200);

      return () => {
        clearTimeout(timeout);
        clearInterval(checkInterval);
      };
    } else {
      initMap();
    }

    function initMap() {
      if (mapInstanceRef.current) {
        // Map already exists — just update tile layer for dark mode
        if (tileLayerRef.current) {
          tileLayerRef.current.setUrl(darkMode ? MAP_CONFIG.dark : MAP_CONFIG.light);
        }
        setTimeout(() => mapInstanceRef.current.invalidateSize(), 100);
        return;
      }

      try {
        const map = window.L.map(mapContainerRef.current!, {
          // Centroid of the 4 prototype buildings so every marker is in view.
          center: [54.9779, -1.6075],
          zoom: 17,
          zoomControl: false,
          attributionControl: false
        });

        tileLayerRef.current = window.L.tileLayer(
          darkMode ? MAP_CONFIG.dark : MAP_CONFIG.light,
          { maxZoom: 19 }
        ).addTo(map);

        window.L.control.zoom({ position: 'bottomright' }).addTo(map);
        mapInstanceRef.current = map;
        setMapReady(true);
      } catch (error) {
        console.error('Map initialisation error:', error);
        setMapError(true);
      }
    }
  }, [darkMode, viewMode]);

  // Single consolidated effect for marker updates
  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMarkers();
    }
  }, [updateMarkers]);

  // Draw / update the user location marker + accuracy circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;

    if (!userPosition) {
      // Clean up if tracking stopped
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.remove();
        accuracyCircleRef.current = null;
      }
      hasCenteredOnUserRef.current = false;
      return;
    }

    const latlng: [number, number] = [userPosition.lat, userPosition.lng];

    // Custom pulsing dot icon — CSS handles the animation and dark mode
    const icon = window.L.divIcon({
      className: 'user-location-marker-wrapper',
      html: '<div class="user-location-marker"><div class="pulse"></div><div class="dot"></div></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = window.L.marker(latlng, {
        icon,
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(latlng);
    }

    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = window.L.circle(latlng, {
        radius: userPosition.accuracy,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.08,
        weight: 1,
        interactive: false,
      }).addTo(map);
    } else {
      accuracyCircleRef.current.setLatLng(latlng);
      accuracyCircleRef.current.setRadius(userPosition.accuracy);
    }

    // First fix: centre the map on the user
    if (isWatching && !hasCenteredOnUserRef.current) {
      hasCenteredOnUserRef.current = true;
      const useAnim = !accessSettings.reduceMotion;
      if (useAnim) {
        map.flyTo(latlng, Math.max(map.getZoom(), 17), { duration: 1.2 });
      } else {
        map.setView(latlng, Math.max(map.getZoom(), 17));
      }
    } else if (isWatching && hasCenteredOnUserRef.current) {
      // Subsequent updates: gentle pan to keep user in view
      map.panTo(latlng, { animate: !accessSettings.reduceMotion, duration: 0.5 });
    }
  }, [userPosition, isWatching, accessSettings.reduceMotion]);

  // Fetch a walking route whenever user position + selected building exist
  useEffect(() => {
    // Clear any previous route layer when dependencies change
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    if (!userPosition || !selectedBuilding) {
      setRoute(null);
      setRouteError(null);
      return;
    }

    // Skip routing if user is too far from campus
    const distToCampus = getDistanceMetres(userPosition.lat, userPosition.lng, CAMPUS_CENTRE.lat, CAMPUS_CENTRE.lng);
    if (distToCampus > MAX_ROUTING_DISTANCE) {
      setRoute(null);
      setRouteError(null);
      return;
    }

    const controller = new AbortController();
    setRouteLoading(true);
    setRouteError(null);

    fetchWalkingRoute(
      { lat: userPosition.lat, lng: userPosition.lng },
      { lat: selectedBuilding.coordinates[0], lng: selectedBuilding.coordinates[1] },
      controller.signal,
    )
      .then((result) => {
        setRoute(result);
        setRouteLoading(false);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === 'AbortError') return;
        console.warn('Routing failed:', err);
        setRoute(null);
        setRouteError('Walking route unavailable right now.');
        setRouteLoading(false);
      });

    return () => controller.abort();
    // Intentionally depend on building id and rounded position so we don't
    // re-fetch on every GPS jitter. ~5dp ≈ 1m resolution.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedBuilding?.id,
    userPosition ? Math.round(userPosition.lat * 1e4) / 1e4 : null,
    userPosition ? Math.round(userPosition.lng * 1e4) / 1e4 : null,
  ]);

  // Render the route polyline on the map when we have one
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    if (!route) return;

    routeLayerRef.current = window.L.polyline(route.coordinates, {
      color: darkMode ? '#5eead4' : '#0d9488',
      weight: 5,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '1 10',
      interactive: false,
    }).addTo(map);
  }, [route, darkMode]);

  // Calmer alternative for the selected building
  const calmerAlternative = useMemo(() => {
    if (!selectedBuilding) return null;
    return findCalmerAlternative(selectedBuilding, BUILDINGS_DATA);
  }, [selectedBuilding]);

  const handleLocateClick = useCallback(() => {
    if (isWatching) {
      stopLocating();
      return;
    }
    // On first use, show the calm explainer before the browser's permission prompt.
    if (!hasAskedOnce) {
      setShowPermissionPrompt(true);
    } else {
      startLocating();
    }
  }, [isWatching, hasAskedOnce, startLocating, stopLocating]);

  const handlePermissionAllow = useCallback(() => {
    setShowPermissionPrompt(false);
    setHasAskedOnce(true);
    startLocating();
  }, [startLocating]);

  const handleFindQuiet = () => {
    const quietest = [...BUILDINGS_DATA].sort((a, b) => a.sensoryProfile.noise - b.sensoryProfile.noise)[0];
    setSelectedBuilding(quietest);
    setFilterQuiet(true);
    setViewMode('map');
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(quietest.coordinates, 18, { duration: 1.5 });
    }
  };

  const handleBuildingSelect = (building: Building) => {
    setSelectedBuilding(building);
    if (window.innerWidth < 768) setViewMode('map');
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(building.coordinates, 18, { duration: 1.5 });
    }
  };

  const handleListItemClick = (building: Building) => {
    if (window.innerWidth < 768) {
      setExpandedListItem(prev => prev === building.id ? null : building.id);
      setSelectedBuilding(building);
    } else {
      handleBuildingSelect(building);
    }
  };

  const handleViewOnMap = (building: Building) => {
    setExpandedListItem(null);
    handleBuildingSelect(building);
  };

  const handleAccessibilityUpdate = (key: keyof typeof accessSettings, value: number | boolean) => {
    setAccessSettings(prev => ({ ...prev, [key]: value }));
  };

  const isNearCampus = userPosition ? getDistanceMetres(userPosition.lat, userPosition.lng, CAMPUS_CENTRE.lat, CAMPUS_CENTRE.lng) <= MAX_ROUTING_DISTANCE : false;

  const renderRouteBlock = () => {
    if (!selectedBuilding) return null;

    if (!userPosition && !isWatching) {
      return (
        <button
          onClick={handleLocateClick}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors mb-4 text-left focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label="Show my location to get walking directions"
        >
          <Navigation size={16} className="text-teal-600 dark:text-teal-300" />
          <span className="text-sm text-slate-700 dark:text-slate-200">
            Show my location to get walking directions
          </span>
        </button>
      );
    }

    if (userPosition && !isNearCampus) {
      return (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mb-4">
          <Navigation size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Walking directions available when you're on or near campus</p>
        </div>
      );
    }

    if (routeLoading) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mb-4 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          Finding the calmest walking route…
        </div>
      );
    }

    if (routeError) {
      return (
        <div
          className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 mb-4"
          role="status"
        >
          <AlertTriangle size={14} className="text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600 dark:text-slate-300">{routeError}</p>
        </div>
      );
    }

    if (route) {
      return (
        <div className="flex items-center gap-4 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 mb-4">
          <div className="flex items-center gap-2">
            <Footprints size={16} className="text-teal-700 dark:text-teal-300" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                Walking
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                {formatDistance(route.distance)}
              </p>
            </div>
          </div>
          <div className="h-8 w-px bg-teal-200 dark:bg-teal-800" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-teal-700 dark:text-teal-300" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                About
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                {formatDuration(route.duration)}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] font-sans overflow-hidden transition-colors duration-300 relative bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">

      <AccessibilityMenu
        isOpen={showAccessMenu}
        onClose={() => setShowAccessMenu(false)}
        settings={accessSettings}
        onUpdate={handleAccessibilityUpdate}
      />

      <LocationPermissionPrompt
        isOpen={showPermissionPrompt}
        onAllow={handlePermissionAllow}
        onCancel={() => setShowPermissionPrompt(false)}
      />

      {/* SIDEBAR */}
      <div className={`
        ${viewMode === 'list' || viewMode === 'fullList' ? 'flex' : 'hidden'}
        md:flex w-full ${viewMode === 'fullList' ? 'md:w-full' : 'md:w-96'} bg-white dark:bg-slate-800 shadow-xl z-20 flex-col
        h-full border-r border-slate-100 dark:border-slate-700 relative transition-colors duration-300
      `}>

        <div className="p-6 pb-4 bg-white dark:bg-slate-800 z-10 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg transition-colors">
                <MapPin className="text-teal-700 dark:text-teal-400" size={20} />
              </div>
              <h1 className="text-xl font-bold tracking-tight">NeuroNav Campus</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 ml-1">Northumbria University</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'fullList' ? 'map' : 'fullList')}
              className="hidden md:flex p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              aria-label={viewMode === 'fullList' ? 'Return to map view' : 'View full list without map'}
              title={viewMode === 'fullList' ? 'Back to Map' : 'Full List View'}
            >
              {viewMode === 'fullList' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={() => setShowAccessMenu(!showAccessMenu)}
              className={`p-2 rounded-full transition-colors ${showAccessMenu ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
              aria-label="Accessibility Settings"
              aria-expanded={showAccessMenu}
            >
              <SlidersHorizontal size={18} />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <div className="px-6 pb-4 space-y-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Find a building..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-sm dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search buildings"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterQuiet(!filterQuiet)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all border ${filterQuiet ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              aria-pressed={filterQuiet}
            >
              <Volume2 size={14} />
              Quiet Only
            </button>
          </div>
        </div>

        <div
          className={`flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50 pb-24 md:pb-4 ${viewMode === 'fullList' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min' : 'space-y-3'}`}
          role="list"
          aria-label="Campus buildings"
        >
          {filteredLocations.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No buildings match your search.</p>
          )}
          {filteredLocations.map(building => (
            <div
              key={building.id}
              role="listitem"
            >
              <button
                onClick={() => handleListItemClick(building)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleListItemClick(building); } }}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${selectedBuilding?.id === building.id ? 'bg-teal-50/50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700 ring-1 ring-teal-500 dark:ring-teal-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-teal-100 dark:hover:border-teal-800'}`}
                aria-expanded={expandedListItem === building.id || selectedBuilding?.id === building.id}
                aria-label={`${building.name} - ${getCategoryLabel(building.category)}`}
              >
                <div className="mb-2">
                  <h3 className="font-bold text-base text-slate-800 dark:text-white">{building.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getCategoryIcon(building.category)}
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {getCategoryLabel(building.category)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{building.code}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3 items-center">
                  {building.tags.map(tag => <Tag key={tag} type={tag} />)}
                  <BusynessBadge popularTimes={building.popularTimes} now={now} size="sm" />
                </div>

                {/* Mobile: Expand details inline */}
                <div className="md:hidden">
                  {expandedListItem === building.id && (
                    <div className="mt-4 pt-4 border-t border-teal-100 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">{building.description}</p>
                      <BusynessForecast popularTimes={building.popularTimes} now={now} />
                      <BusyChart data={building.popularTimes} now={now} />
                      {building.sensoryEntrance && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800 mb-3">
                          <div className="flex items-start gap-2">
                            <DoorOpen className="text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" size={16} />
                            <div>
                              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase mb-0.5">Low-Sensory Entry</p>
                              <p className="text-xs text-slate-600 dark:text-slate-300 italic">{building.sensoryEntrance}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2 bg-white/60 dark:bg-slate-800/60 p-3 rounded-lg mb-3 border border-slate-100 dark:border-slate-700">
                        <SensoryMeter label="Noise" value={building.sensoryProfile.noise} icon={Volume2} lowLabel="Silent" highLabel="Loud" />
                        <SensoryMeter label="Crowds" value={building.sensoryProfile.crowds} icon={Users} lowLabel="Empty" highLabel="Busy" />
                        <SensoryMeter label="Light" value={building.sensoryProfile.lighting} icon={Sun} lowLabel="Dim" highLabel="Bright" />
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewOnMap(building); }}
                        className="w-full py-3 rounded-xl bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm flex items-center justify-center gap-2 shadow-md mb-1"
                      >
                        <MapPin size={16} /> View on Map
                      </button>
                    </div>
                  )}
                </div>

                {/* Desktop: Expand details inline */}
                <div className="hidden md:block">
                  {(selectedBuilding?.id === building.id || viewMode === 'fullList') && (
                    <div className="mt-4 pt-4 border-t border-teal-100 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">{building.description}</p>
                      <BusynessForecast popularTimes={building.popularTimes} now={now} />
                      {renderRouteBlock()}
                      {calmerAlternative && (
                        <CalmerAlternativeCard
                          alternative={calmerAlternative}
                          onSelect={handleBuildingSelect}
                        />
                      )}
                      <BusyChart data={building.popularTimes} now={now} />
                      {building.sensoryEntrance && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800 mb-3">
                          <div className="flex items-start gap-2">
                            <DoorOpen className="text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" size={16} />
                            <div>
                              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase mb-0.5">Low-Sensory Entry</p>
                              <p className="text-xs text-slate-600 dark:text-slate-300 italic">{building.sensoryEntrance}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2 bg-white/60 dark:bg-slate-800/60 p-3 rounded-lg mb-4 border border-slate-100 dark:border-slate-700">
                        <SensoryMeter label="Noise" value={building.sensoryProfile.noise} icon={Volume2} lowLabel="Silent" highLabel="Loud" />
                        <SensoryMeter label="Crowds" value={building.sensoryProfile.crowds} icon={Users} lowLabel="Empty" highLabel="Busy" />
                        <SensoryMeter label="Light" value={building.sensoryProfile.lighting} icon={Sun} lowLabel="Dim" highLabel="Bright" />
                      </div>
                      <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <p className="flex items-center gap-2"><Navigation size={12} /> {building.access}</p>
                        <p className="flex items-center gap-2"><CheckCircle2 size={12} /> Best time: {building.bestTime}</p>
                      </div>
                      {viewMode === 'fullList' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setViewMode('map'); handleBuildingSelect(building); }}
                          className="w-full mt-3 py-2.5 rounded-xl bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity"
                        >
                          <MapPin size={16} /> View on Map
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MAP AREA */}
      <div className={`flex-1 relative bg-slate-100 dark:bg-slate-900 ${viewMode === 'fullList' ? 'hidden' : viewMode === 'map' ? 'block' : 'hidden md:block'}`}>
        <div ref={mapContainerRef} className="w-full h-full z-0 outline-none relative" role="application" aria-label="Campus map">
          {!mapReady && !mapError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 z-50 text-slate-400">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Loading Map...</p>
            </div>
          )}
          {mapError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 z-50 text-slate-500 px-6 text-center">
              <AlertTriangle className="mb-3 text-amber-500" size={40} />
              <p className="font-semibold text-lg mb-1">Map failed to load</p>
              <p className="text-sm mb-4">The map library could not be loaded. You can still browse buildings using the list view.</p>
              <button
                onClick={() => setViewMode('list')}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                Switch to List View
              </button>
            </div>
          )}
        </div>

        {/* Locate-me button */}
        {mapReady && (
          <LocateButton
            isWatching={isWatching}
            isLoading={locating}
            hasError={!!locationError}
            onClick={handleLocateClick}
          />
        )}

        {/* Location error toast */}
        {locationError && !isWatching && (
          <div
            className="absolute bottom-44 md:bottom-24 right-6 z-[450] max-w-xs bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 rounded-xl shadow-lg px-4 py-3 flex items-start gap-2"
            role="alert"
          >
            <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              {locationError.message}
            </p>
          </div>
        )}

        {/* Map Brand Badge — visible on both mobile and desktop map views */}
        {mapReady && (
          <div className="absolute top-4 left-4 z-[400] bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-sm border border-white/50 dark:border-slate-600/50 flex items-center gap-2.5">
            <div className="p-1.5 bg-teal-100 dark:bg-teal-900/50 rounded-lg">
              <MapPin className="text-teal-700 dark:text-teal-400" size={16} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-800 dark:text-white leading-tight">NeuroNav Campus</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Northumbria University</p>
            </div>
          </div>
        )}

        {/* Desktop Legend */}
        {mapReady && (
          <div className="absolute top-6 right-6 z-[400] bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-white/50 dark:border-slate-600/50 max-w-xs hidden md:block">
            <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Sensory Guide</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-400 ring-2 ring-white dark:ring-slate-700 shadow-sm"></div>
                <span className="text-xs text-slate-600 dark:text-slate-300">Low Sensory / Quiet</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-700 shadow-sm"></div>
                <span className="text-xs text-slate-600 dark:text-slate-300">Moderate Activity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400 ring-2 ring-white dark:ring-slate-700 shadow-sm"></div>
                <span className="text-xs text-slate-600 dark:text-slate-300">High Activity / Social</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 z-[500]">
        <button
          onClick={() => setViewMode('map')}
          className={`px-6 py-3 rounded-full shadow-lg font-semibold flex items-center gap-2 transition-all ${viewMode === 'map' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          aria-pressed={viewMode === 'map'}
        >
          <MapIcon size={18} /> Map
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-6 py-3 rounded-full shadow-lg font-semibold flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          aria-pressed={viewMode === 'list'}
        >
          <List size={18} /> List
        </button>
      </div>

      {/* MOBILE SLIDE-UP DETAIL PANEL */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-[600] bg-white dark:bg-slate-900 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] transition-transform duration-500 ease-in-out ${selectedBuilding && viewMode === 'map' ? 'translate-y-0' : 'translate-y-full'}`}
        role="dialog"
        aria-label={selectedBuilding ? `Details for ${selectedBuilding.name}` : undefined}
      >
        {selectedBuilding && (
          <div className="flex flex-col">
            {/* Drag Handle */}
            <button
              className="w-full flex justify-center pt-3 pb-1"
              onClick={() => { setSelectedBuilding(null); setMobileDetailMode("compact"); }}
              aria-label="Close building details"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </button>

            {/* Header */}
            <div className="px-6 py-2 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold dark:text-white">{selectedBuilding.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
                    {getCategoryLabel(selectedBuilding.category)}
                  </span>
                  <span className="text-xs text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">{selectedBuilding.code}</span>
                </div>
              </div>
              <button onClick={() => { setSelectedBuilding(null); setMobileDetailMode("compact"); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full" aria-label="Close">
                <X size={20} className="dark:text-white" />
              </button>
            </div>

            {mobileDetailMode === "compact" && (
              <div className="px-6 pb-6 pt-3">
                <div className="flex gap-3 mb-3">
                  <button onClick={() => setMobileDetailMode("full")} className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md">
                    <Volume2 size={16} /> Sensory Info
                  </button>
                  <button onClick={() => { handleLocateClick(); }} className="flex-1 py-3 rounded-xl bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm flex items-center justify-center gap-2 shadow-md">
                    <Navigation size={16} /> Navigate
                  </button>
                </div>
                {renderRouteBlock()}
              </div>
            )}
            {/* Scrollable Content */}
            {mobileDetailMode === "full" && (
            <div className="overflow-y-auto px-6 pb-8 max-h-[65vh]">
              <div className="flex flex-wrap gap-2 mb-4 mt-2 items-center">
                {selectedBuilding.tags.map(tag => <Tag key={tag} type={tag} />)}
                <BusynessBadge popularTimes={selectedBuilding.popularTimes} now={now} size="sm" />
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                {selectedBuilding.description}
              </p>

              <BusynessForecast popularTimes={selectedBuilding.popularTimes} now={now} />

              {renderRouteBlock()}

              {calmerAlternative && (
                <CalmerAlternativeCard
                  alternative={calmerAlternative}
                  onSelect={handleBuildingSelect}
                />
              )}

              <BusyChart data={selectedBuilding.popularTimes} now={now} />

              {selectedBuilding.sensoryEntrance && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-4 mt-4">
                  <div className="flex items-start gap-3">
                    <DoorOpen className="text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase mb-1">Low-Sensory Entry</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{selectedBuilding.sensoryEntrance}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-4 border border-slate-100 dark:border-slate-700">
                <SensoryMeter label="Noise" value={selectedBuilding.sensoryProfile.noise} icon={Volume2} lowLabel="Silent" highLabel="Loud" />
                <SensoryMeter label="Crowds" value={selectedBuilding.sensoryProfile.crowds} icon={Users} lowLabel="Empty" highLabel="Busy" />
                <SensoryMeter label="Light" value={selectedBuilding.sensoryProfile.lighting} icon={Sun} lowLabel="Dim" highLabel="Bright" />
              </div>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}