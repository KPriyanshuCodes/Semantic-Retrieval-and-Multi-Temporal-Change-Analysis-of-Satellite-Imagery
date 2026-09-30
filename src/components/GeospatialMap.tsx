import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Eye,
  EyeOff,
  Globe,
  Maximize2,
  Sliders,
  Calendar,
  Layers,
  ArrowLeftRight,
} from 'lucide-react';
import { AnalysisResult, SatelliteScene } from '../types';
import { GoogleGeospatialMap } from './GoogleGeospatialMap';
import { getRealSatelliteImageUrl } from '../utils/clientFallbackSearch';

interface GeospatialMapProps {
  aoiBbox: [number, number, number, number] | null; // [minLon, minLat, maxLon, maxLat]
  beforeScene: SatelliteScene | null;
  afterScene: SatelliteScene | null;
  analysisResult: AnalysisResult | null;
  selectedGridCell: any | null;
  onSelectGridCell: (cell: any | null) => void;
}

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyB62PWnhwOgy3-HSOIoFUJWpbGFqIzRy-U';

export const GeospatialMap: React.FC<GeospatialMapProps> = ({
  aoiBbox,
  beforeScene,
  afterScene,
  analysisResult,
  selectedGridCell,
  onSelectGridCell,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const bboxLayerRef = useRef<L.Rectangle | null>(null);
  const markerLayerRef = useRef<L.CircleMarker | null>(null);
  const beforeImageLayerRef = useRef<L.ImageOverlay | null>(null);
  const afterImageLayerRef = useRef<L.ImageOverlay | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Active Map Engine & Layer controls
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>('google');
  const [googleMapType, setGoogleMapType] = useState<'hybrid' | 'roadmap'>(
    'hybrid'
  );
  const [leafletBasemap, setLeafletBasemap] = useState<'carto' | 'satellite'>(
    'satellite'
  );

  // Visualization Modes: change map, before observation, after observation, swipe split
  const [visualizationMode, setVisualizationMode] = useState<
    'change' | 'before' | 'after' | 'swipe'
  >('change');

  // Swipe position (percentage from 0 to 100)
  const [swipePosition, setSwipePosition] = useState<number>(50);

  const [showChangeLayer, setShowChangeLayer] = useState(true);
  const [showAoiLayer, setShowAoiLayer] = useState(true);
  const [layerOpacity, setLayerOpacity] = useState(0.75);
  const [resetBoundsSignal, setResetBoundsSignal] = useState(0);

  const [cursorCoords, setCursorCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Trigger zoom to analysis area
  const handleZoomToAoi = () => {
    setResetBoundsSignal((prev) => prev + 1);
    if (mapInstanceRef.current && aoiBbox) {
      const [minLon, minLat, maxLon, maxLat] = aoiBbox;
      mapInstanceRef.current.fitBounds(
        [
          [minLat, minLon],
          [maxLat, maxLon],
        ],
        { padding: [40, 40], maxZoom: 14 }
      );
    }
  };

  // Initialize Leaflet Map when engine is leaflet
  useEffect(() => {
    if (mapEngine !== 'leaflet') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const centerLat = aoiBbox ? (aoiBbox[1] + aoiBbox[3]) / 2 : 22.9734;
    const centerLon = aoiBbox ? (aoiBbox[0] + aoiBbox[2]) / 2 : 78.6569;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLon],
      zoom: aoiBbox ? 11 : 5,
      zoomControl: true,
      attributionControl: true,
    });

    const tileUrl =
      leafletBasemap === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const attribution =
      leafletBasemap === 'satellite'
        ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS'
        : '&copy; OpenStreetMap contributors &copy; CARTO';

    const tiles = L.tileLayer(tileUrl, { attribution, maxZoom: 18 }).addTo(map);
    tileLayerRef.current = tiles;
    mapInstanceRef.current = map;

    map.on('mousemove', (e) => {
      setCursorCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapEngine]);

  // Update Leaflet Basemap when toggled
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapEngine !== 'leaflet') return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      leafletBasemap === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const attribution =
      leafletBasemap === 'satellite'
        ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS'
        : '&copy; OpenStreetMap contributors &copy; CARTO';

    const newTiles = L.tileLayer(tileUrl, { attribution, maxZoom: 18 }).addTo(map);
    tileLayerRef.current = newTiles;
  }, [leafletBasemap, mapEngine]);

  // Update Leaflet AOI Bounding Box & Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapEngine !== 'leaflet') return;

    if (bboxLayerRef.current) {
      map.removeLayer(bboxLayerRef.current);
      bboxLayerRef.current = null;
    }
    if (markerLayerRef.current) {
      map.removeLayer(markerLayerRef.current);
      markerLayerRef.current = null;
    }

    if (aoiBbox && showAoiLayer) {
      const [minLon, minLat, maxLon, maxLat] = aoiBbox;
      const bounds: L.LatLngBoundsExpression = [
        [minLat, minLon],
        [maxLat, maxLon],
      ];

      const rect = L.rectangle(bounds, {
        color: '#0f172a',
        weight: 2,
        fillColor: '#0ea5e9',
        fillOpacity: visualizationMode === 'change' ? 0.08 : 0.02,
        dashArray: '4, 4',
      }).addTo(map);

      bboxLayerRef.current = rect;

      // Add prominent center location marker
      const centerLat = (minLat + maxLat) / 2;
      const centerLon = (minLon + maxLon) / 2;
      const marker = L.circleMarker([centerLat, centerLon], {
        radius: 6,
        color: '#0f172a',
        weight: 2,
        fillColor: '#0284c7',
        fillOpacity: 1,
      }).addTo(map);
      marker.bindPopup('Geocoded Location Center');
      markerLayerRef.current = marker;

      // Pan & Zoom to the searched location bounds
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [aoiBbox, showAoiLayer, mapEngine, visualizationMode]);

  // Update Leaflet Observation Preview Overlays (for Before / After modes)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapEngine !== 'leaflet') return;

    if (beforeImageLayerRef.current) {
      map.removeLayer(beforeImageLayerRef.current);
      beforeImageLayerRef.current = null;
    }
    if (afterImageLayerRef.current) {
      map.removeLayer(afterImageLayerRef.current);
      afterImageLayerRef.current = null;
    }

    const boundsTarget = aoiBbox || beforeScene?.bbox || afterScene?.bbox;
    if (!boundsTarget) return;

    const [minLon, minLat, maxLon, maxLat] = boundsTarget;
    const imgBounds: L.LatLngBoundsExpression = [
      [minLat, minLon],
      [maxLat, maxLon],
    ];

    if (visualizationMode === 'before' && beforeScene) {
      const initialSrc = beforeScene.thumbnailUrl || getRealSatelliteImageUrl(boundsTarget, 800, 600, 0);
      const overlay = L.imageOverlay(initialSrc, imgBounds, {
        opacity: layerOpacity,
        interactive: false,
      }).addTo(map);
      overlay.on('error', () => {
        overlay.setUrl(getRealSatelliteImageUrl(boundsTarget, 800, 600, 0));
      });
      beforeImageLayerRef.current = overlay;
    } else if (visualizationMode === 'after' && afterScene) {
      const initialSrc = afterScene.thumbnailUrl || getRealSatelliteImageUrl(boundsTarget, 800, 600, 1);
      const overlay = L.imageOverlay(initialSrc, imgBounds, {
        opacity: layerOpacity,
        interactive: false,
      }).addTo(map);
      overlay.on('error', () => {
        overlay.setUrl(getRealSatelliteImageUrl(boundsTarget, 800, 600, 1));
      });
      afterImageLayerRef.current = overlay;
    }
  }, [visualizationMode, beforeScene, afterScene, aoiBbox, mapEngine, layerOpacity]);

  // Update Leaflet Change Detection Grid Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapEngine !== 'leaflet') return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }

    const shouldShow =
      showChangeLayer &&
      visualizationMode === 'change' &&
      Boolean(analysisResult?.changeFeaturesGeoJson);

    if (shouldShow && analysisResult?.changeFeaturesGeoJson) {
      const geoLayer = L.geoJSON(analysisResult.changeFeaturesGeoJson, {
        style: (feature) => {
          const props = feature?.properties || {};
          const cls = props.classification;
          const theme = props.theme || 'urban';

          let fillColor = '#94a3b8';
          let fillOpacity = 0.15 * layerOpacity;

          if (cls === 'increase') {
            fillColor =
              theme === 'vegetation'
                ? '#10b981'
                : theme === 'water'
                ? '#0284c7'
                : '#ef4444';
            fillOpacity = 0.7 * layerOpacity;
          } else if (cls === 'decrease') {
            fillColor = theme === 'vegetation' ? '#f97316' : '#64748b';
            fillOpacity = 0.65 * layerOpacity;
          }

          return {
            fillColor,
            fillOpacity,
            weight: 1,
            color: '#ffffff',
            opacity: 0.4,
          };
        },
        onEachFeature: (feature, layer) => {
          layer.on({
            click: () => onSelectGridCell(feature.properties),
            mouseover: (e) => {
              e.target.setStyle({ weight: 2, color: '#0f172a' });
            },
            mouseout: (e) => {
              geoLayer.resetStyle(e.target);
            },
          });
        },
      }).addTo(map);

      geoJsonLayerRef.current = geoLayer;
    }
  }, [
    analysisResult,
    showChangeLayer,
    layerOpacity,
    visualizationMode,
    mapEngine,
    onSelectGridCell,
  ]);

  return (
    <div className="relative w-full h-[540px] lg:h-[620px] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex flex-col">
      {/* Primary Map View Mode Banner (Top Left) */}
      <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1.5 rounded-md border border-slate-200 shadow-xs">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2">
          Mode:
        </div>
        <button
          onClick={() => setVisualizationMode('change')}
          className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
            visualizationMode === 'change'
              ? 'bg-slate-900 text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          aria-label="Show Change Map"
        >
          Change Map
        </button>
        <button
          onClick={() => setVisualizationMode('before')}
          className={`px-3 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
            visualizationMode === 'before'
              ? 'bg-slate-900 text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          aria-label="View Earlier Observation"
        >
          <span>Before ({beforeScene?.acquisitionDate || 'T1'})</span>
        </button>
        <button
          onClick={() => setVisualizationMode('after')}
          className={`px-3 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
            visualizationMode === 'after'
              ? 'bg-slate-900 text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          aria-label="View Later Observation"
        >
          <span>After ({afterScene?.acquisitionDate || 'T2'})</span>
        </button>
        <button
          onClick={() => setVisualizationMode('swipe')}
          className={`px-3 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 ${
            visualizationMode === 'swipe'
              ? 'bg-cyan-700 text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          aria-label="Interactive Swipe Comparison"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Swipe Comparison</span>
        </button>

        {/* Zoom to Analysis Area Button */}
        <button
          onClick={handleZoomToAoi}
          className="ml-2 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1"
          title="Zoom to Analysis Area (AOI)"
          aria-label="Zoom to analysis area"
        >
          <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
          <span>Fit AOI</span>
        </button>
      </div>

      {/* Swipe Comparison Interactive Overlay */}
      {visualizationMode === 'swipe' ? (
        <div className="relative w-full h-full select-none bg-slate-950 flex overflow-hidden">
          {/* Left Panel: Earlier Observation */}
          <div
            className="absolute top-0 left-0 bottom-0 overflow-hidden z-10 border-r-2 border-white shadow-xl"
            style={{ width: `${swipePosition}%` }}
          >
            <div className="relative w-full h-full bg-slate-900">
              {beforeScene ? (
                <img
                  src={beforeScene.thumbnailUrl || getRealSatelliteImageUrl(beforeScene.bbox || aoiBbox || [77.2, 23.1, 77.5, 23.4], 800, 600, 0)}
                  alt={`Before scene acquired ${beforeScene.acquisitionDate}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    const bbox = beforeScene.bbox || aoiBbox || [77.2, 23.1, 77.5, 23.4];
                    target.src = getRealSatelliteImageUrl(bbox, 800, 600, 0);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  Baseline Satellite Observation (T1)
                </div>
              )}
              {/* Badge */}
              <div className="absolute top-16 left-4 bg-slate-950/85 text-white p-2.5 rounded backdrop-blur-xs text-xs space-y-0.5 border border-white/20">
                <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>BEFORE: {beforeScene?.acquisitionDate || 'T1'}</span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono">
                  Cloud: {beforeScene?.cloudCover || 0}% · {beforeScene?.satellite || 'Sentinel-2'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Later Observation */}
          <div className="w-full h-full bg-slate-900">
            {afterScene ? (
              <img
                src={afterScene.thumbnailUrl || getRealSatelliteImageUrl(afterScene.bbox || aoiBbox || [77.2, 23.1, 77.5, 23.4], 800, 600, 1)}
                alt={`After scene acquired ${afterScene.acquisitionDate}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  const bbox = afterScene.bbox || aoiBbox || [77.2, 23.1, 77.5, 23.4];
                  target.src = getRealSatelliteImageUrl(bbox, 800, 600, 1);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                Comparison Satellite Observation (T2)
              </div>
            )}
            {/* Badge */}
            <div className="absolute top-16 right-4 bg-slate-950/85 text-white p-2.5 rounded backdrop-blur-xs text-xs space-y-0.5 border border-white/20 text-right">
              <div className="font-bold flex items-center justify-end gap-1.5 text-cyan-400">
                <span>AFTER: {afterScene?.acquisitionDate || 'T2'}</span>
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                Cloud: {afterScene?.cloudCover || 0}% · {afterScene?.satellite || 'Sentinel-2'}
              </div>
            </div>
          </div>

          {/* Draggable Swipe Divider Control */}
          <div
            className="absolute top-0 bottom-0 z-20 flex items-center justify-center pointer-events-none"
            style={{ left: `calc(${swipePosition}% - 16px)` }}
          >
            <div className="w-8 h-8 rounded-full bg-white text-slate-900 shadow-lg flex items-center justify-center border border-slate-300 pointer-events-auto cursor-ew-resize">
              <ArrowLeftRight className="w-4 h-4 text-slate-800" />
            </div>
          </div>

          {/* Slider Input overlay for keyboard/touch accessibility */}
          <input
            type="range"
            min="0"
            max="100"
            value={swipePosition}
            onChange={(e) => setSwipePosition(Number(e.target.value))}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-72 md:w-96 z-30 accent-cyan-400 cursor-ew-resize opacity-80 hover:opacity-100"
            aria-label="Swipe comparison divider position"
          />
        </div>
      ) : (
        /* Standard Map Canvas (Google Maps or Leaflet) */
        <>
          {mapEngine === 'google' ? (
            <GoogleGeospatialMap
              apiKey={GOOGLE_MAPS_API_KEY}
              aoiBbox={aoiBbox}
              beforeScene={beforeScene}
              afterScene={afterScene}
              analysisResult={analysisResult}
              selectedGridCell={selectedGridCell}
              onSelectGridCell={onSelectGridCell}
              mapType={googleMapType}
              visualizationMode={visualizationMode}
              showChangeLayer={showChangeLayer}
              showAoiLayer={showAoiLayer}
              layerOpacity={layerOpacity}
              resetBoundsSignal={resetBoundsSignal}
            />
          ) : (
            <div ref={mapContainerRef} className="w-full h-full z-10" />
          )}
        </>
      )}

      {/* Observation Indicator Bar when in Before or After mode */}
      {visualizationMode === 'before' && beforeScene && (
        <div className="absolute top-16 left-3 z-20 bg-emerald-950/90 text-white border border-emerald-500/30 px-3 py-1.5 rounded text-xs flex items-center gap-2 shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Displaying Baseline Observation (T1):{' '}
            <strong>{beforeScene.acquisitionDate}</strong> ({beforeScene.satellite} · Cloud:{' '}
            {beforeScene.cloudCover}%)
          </span>
        </div>
      )}

      {visualizationMode === 'after' && afterScene && (
        <div className="absolute top-16 left-3 z-20 bg-cyan-950/90 text-white border border-cyan-500/30 px-3 py-1.5 rounded text-xs flex items-center gap-2 shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            Displaying Comparison Observation (T2):{' '}
            <strong>{afterScene.acquisitionDate}</strong> ({afterScene.satellite} · Cloud:{' '}
            {afterScene.cloudCover}%)
          </span>
        </div>
      )}

      {/* Top Right Floating Layer HUD */}
      {visualizationMode !== 'swipe' && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
          <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded p-2.5 shadow-xs text-xs space-y-2.5 min-w-[210px]">
            {/* Map Engine Selector */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Geospatial Engine</span>
                </span>
                <span className="font-mono text-[10px] text-emerald-600 font-bold">
                  {mapEngine === 'google' ? 'Google Maps' : 'Leaflet'}
                </span>
              </div>
              <div className="grid grid-cols-2 rounded border border-slate-200 text-[11px] overflow-hidden bg-slate-50">
                <button
                  onClick={() => setMapEngine('google')}
                  className={`py-1 px-1.5 transition-colors font-medium text-center ${
                    mapEngine === 'google'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Google Maps
                </button>
                <button
                  onClick={() => setMapEngine('leaflet')}
                  className={`py-1 px-1.5 transition-colors font-medium text-center ${
                    mapEngine === 'leaflet'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Leaflet / OSM
                </button>
              </div>
            </div>

            {/* Sub-Basemap Style */}
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-medium text-slate-600 block">
                Basemap Imagery
              </span>
              {mapEngine === 'google' ? (
                <div className="grid grid-cols-2 rounded border border-slate-200 text-[11px] overflow-hidden">
                  <button
                    onClick={() => setGoogleMapType('hybrid')}
                    className={`py-1 px-1.5 ${
                      googleMapType === 'hybrid'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Hybrid Aerial
                  </button>
                  <button
                    onClick={() => setGoogleMapType('roadmap')}
                    className={`py-1 px-1.5 ${
                      googleMapType === 'roadmap'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Roadmap
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 rounded border border-slate-200 text-[11px] overflow-hidden">
                  <button
                    onClick={() => setLeafletBasemap('satellite')}
                    className={`py-1 px-1.5 ${
                      leafletBasemap === 'satellite'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Esri Satellite
                  </button>
                  <button
                    onClick={() => setLeafletBasemap('carto')}
                    className={`py-1 px-1.5 ${
                      leafletBasemap === 'carto'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Carto Vector
                  </button>
                </div>
              )}
            </div>

            {/* Change Layer Visibility */}
            {visualizationMode === 'change' && (
              <>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-medium text-slate-600">
                    Change Detection Layer
                  </span>
                  <button
                    onClick={() => setShowChangeLayer(!showChangeLayer)}
                    className="text-slate-700 hover:text-slate-900"
                    title="Toggle Change Detection Grid Layer"
                    aria-label="Toggle change detection layer visibility"
                  >
                    {showChangeLayer ? (
                      <Eye className="w-3.5 h-3.5 text-cyan-600" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* Opacity Slider */}
                {showChangeLayer && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Layer Opacity</span>
                      <span>{Math.round(layerOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={layerOpacity}
                      onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-slate-900"
                      aria-label="Change detection layer opacity"
                    />
                  </div>
                )}
              </>
            )}

            {/* Show/Hide AOI Boundary */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-[11px] font-medium text-slate-600">
                AOI Boundary Box
              </span>
              <button
                onClick={() => setShowAoiLayer(!showAoiLayer)}
                className="text-slate-700 hover:text-slate-900"
                title="Toggle AOI Boundary Box"
                aria-label="Toggle AOI boundary visibility"
              >
                {showAoiLayer ? (
                  <Eye className="w-3.5 h-3.5 text-cyan-600" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Legend HUD with Labels and Text */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-xs border border-slate-200 rounded p-3 shadow-xs text-xs space-y-1.5 max-w-sm">
        <div className="font-semibold text-slate-800 flex items-center justify-between text-[11px] uppercase tracking-wider">
          <span>Change Map Legend</span>
          <span className="font-mono text-slate-400">EPSG:4326</span>
        </div>
        <div className="space-y-1.5 text-[11px]">
          {/* Categorized change swatches */}
          {analysisResult?.analysisType === 'vegetation' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-orange-500 border border-orange-600 shrink-0" />
                <span className="text-slate-800 font-medium">
                  Vegetation Loss / Canopy Decrease (Δ &lt; -0.15)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-emerald-500 border border-emerald-600 shrink-0" />
                <span className="text-slate-800 font-medium">
                  Vegetation Gain / Regrowth (Δ &gt; 0.15)
                </span>
              </div>
            </>
          ) : analysisResult?.analysisType === 'water' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-sky-600 border border-sky-700 shrink-0" />
                <span className="text-slate-800 font-medium">
                  Water Body Expansion / Inundation (Δ &gt; 0.15)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-amber-500 border border-amber-600 shrink-0" />
                <span className="text-slate-800 font-medium">
                  Water Recession / Dry-up (Δ &lt; -0.15)
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-red-500 border border-red-600 shrink-0" />
                <span className="text-slate-800 font-medium">
                  Built-up Expansion / Impervious Growth (Δ &gt; 0.15)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-slate-500 border border-slate-600 shrink-0" />
                <span className="text-slate-800 font-medium">
                  Other Surface Fluctuations (Δ &lt; -0.15)
                </span>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-slate-200 border border-slate-300 shrink-0" />
            <span className="text-slate-600">
              No Significant Change / Stable Surface
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-amber-100 border border-amber-300 border-dashed shrink-0" />
            <span className="text-slate-600">
              Uncertain / Cloud-Masked Areas (Excluded)
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <span className="w-3 h-1 border-t-2 border-dashed border-slate-900 shrink-0" />
            <span className="text-slate-700">Analysis Area Boundary (AOI)</span>
          </div>
        </div>
      </div>

      {/* Bottom-Right Coordinates Readout */}
      {cursorCoords && mapEngine === 'leaflet' && (
        <div className="absolute bottom-3 right-3 z-20 bg-slate-950/80 text-white font-mono text-[10px] px-2 py-1 rounded backdrop-blur-xs">
          LAT: {cursorCoords.lat.toFixed(4)}° | LON: {cursorCoords.lng.toFixed(4)}°
        </div>
      )}
    </div>
  );
};
