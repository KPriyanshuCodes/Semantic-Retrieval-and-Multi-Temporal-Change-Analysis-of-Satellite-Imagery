import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Eye, EyeOff, Map as MapIcon, Globe } from 'lucide-react';
import { AnalysisResult, SatelliteScene } from '../types';
import { GoogleGeospatialMap } from './GoogleGeospatialMap';

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

  // Active Map Engine & Layer controls
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>('google');
  const [googleMapType, setGoogleMapType] = useState<'hybrid' | 'roadmap'>(
    'hybrid'
  );
  const [leafletBasemap, setLeafletBasemap] = useState<'carto' | 'satellite'>(
    'satellite'
  );

  const [showChangeLayer, setShowChangeLayer] = useState(true);
  const [showAoiLayer, setShowAoiLayer] = useState(true);
  const [layerOpacity, setLayerOpacity] = useState(0.75);
  const [cursorCoords, setCursorCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

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

    const centerLat = aoiBbox ? (aoiBbox[1] + aoiBbox[3]) / 2 : 28.6139;
    const centerLon = aoiBbox ? (aoiBbox[0] + aoiBbox[2]) / 2 : 77.209;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLon],
      zoom: 10,
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

  // Update Leaflet AOI Bounding Box
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapEngine !== 'leaflet') return;

    if (bboxLayerRef.current) {
      map.removeLayer(bboxLayerRef.current);
      bboxLayerRef.current = null;
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
        fillOpacity: 0.08,
        dashArray: '4, 4',
      }).addTo(map);

      bboxLayerRef.current = rect;
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [aoiBbox, showAoiLayer, mapEngine]);

  // Update Leaflet Change Detection Grid Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapEngine !== 'leaflet') return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }

    if (analysisResult?.changeFeaturesGeoJson && showChangeLayer) {
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
      if (geoLayer.getBounds().isValid()) {
        map.fitBounds(geoLayer.getBounds(), { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [analysisResult, showChangeLayer, layerOpacity, mapEngine]);

  return (
    <div className="relative w-full h-[540px] lg:h-[620px] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex flex-col">
      {/* Map Canvas: Render Google Maps or Leaflet */}
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
          showChangeLayer={showChangeLayer}
          showAoiLayer={showAoiLayer}
          layerOpacity={layerOpacity}
        />
      ) : (
        <div ref={mapContainerRef} className="w-full h-full z-10" />
      )}

      {/* Top Floating Controls HUD */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded p-2.5 shadow-xs text-xs space-y-2.5 min-w-[200px]">
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
              Layer Style
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
                  Hybrid Satellite
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
                  Satellite
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
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-[11px] font-medium text-slate-600">
              Change Detection Grid
            </span>
            <button
              onClick={() => setShowChangeLayer(!showChangeLayer)}
              className="text-slate-700 hover:text-slate-900"
              title="Toggle Change Detection Grid Layer"
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
                <span>Opacity</span>
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
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Floating Legend HUD */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-xs border border-slate-200 rounded p-2.5 shadow-xs text-xs space-y-1.5 max-w-xs">
        <div className="font-semibold text-slate-800 flex items-center justify-between text-[11px] uppercase tracking-wider">
          <span>Footprint & Change Legend</span>
          <span className="font-mono text-slate-400">WGS84</span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-red-500/80 border border-red-600 shrink-0" />
            <span className="text-slate-700">
              Significant Change / Built-up Expansion (Δ &gt; 0.15)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-orange-400/80 border border-orange-500 shrink-0" />
            <span className="text-slate-700">
              Moderate Change / Vegetation Loss (Δ &lt; -0.15)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-slate-300/40 border border-slate-400 shrink-0" />
            <span className="text-slate-700">
              Stable Land Cover / No Change
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 border-t-2 border-dashed border-slate-900 shrink-0" />
            <span className="text-slate-700">AOI Analysis Boundary</span>
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
