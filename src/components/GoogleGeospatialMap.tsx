import React, { useEffect, useRef } from 'react';
import {
  APIProvider,
  Map,
  Rectangle,
  Polygon,
  Marker,
  useMap,
} from '@vis.gl/react-google-maps';
import { AnalysisResult, SatelliteScene } from '../types';
import { getRealSatelliteImageUrl } from '../utils/clientFallbackSearch';

declare const google: any;

interface GoogleGeospatialMapProps {
  apiKey: string;
  aoiBbox: [number, number, number, number] | null; // [minLon, minLat, maxLon, maxLat]
  beforeScene: SatelliteScene | null;
  afterScene: SatelliteScene | null;
  analysisResult: AnalysisResult | null;
  selectedGridCell: any | null;
  onSelectGridCell: (cell: any | null) => void;
  mapType: 'hybrid' | 'satellite' | 'roadmap' | 'terrain';
  visualizationMode?: 'change' | 'before' | 'after' | 'swipe';
  showChangeLayer: boolean;
  showAoiLayer: boolean;
  layerOpacity: number;
  resetBoundsSignal?: number;
}

// Ground overlay component for Google Maps
function GoogleGroundOverlay({
  imageUrl,
  bbox,
  opacity = 0.85,
  visible = true,
}: {
  imageUrl?: string | null;
  bbox?: [number, number, number, number] | null;
  opacity?: number;
  visible?: boolean;
}) {
  const map = useMap();
  const overlayRef = useRef<any>(null);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }

    if (!map || !imageUrl || !bbox || !visible) return;

    try {
      const [minLon, minLat, maxLon, maxLat] = bbox;
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(minLat, minLon),
        new google.maps.LatLng(maxLat, maxLon)
      );

      const overlay = new google.maps.GroundOverlay(imageUrl, bounds, {
        opacity,
        clickable: false,
      });
      overlay.setMap(map);
      overlayRef.current = overlay;
    } catch (err) {
      console.warn('Could not create Google Maps GroundOverlay:', err);
    }

    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [map, imageUrl, bbox, opacity, visible]);

  return null;
}

// Controller component to smoothly pan and fit bounds
function MapBoundsController({
  aoiBbox,
  resetBoundsSignal,
}: {
  aoiBbox: [number, number, number, number] | null;
  resetBoundsSignal?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !aoiBbox) return;
    const [minLon, minLat, maxLon, maxLat] = aoiBbox;
    map.fitBounds(
      {
        north: maxLat,
        south: minLat,
        east: maxLon,
        west: minLon,
      },
      40
    );
  }, [map, aoiBbox, resetBoundsSignal]);

  return null;
}

export const GoogleGeospatialMap: React.FC<GoogleGeospatialMapProps> = ({
  apiKey,
  aoiBbox,
  beforeScene,
  afterScene,
  analysisResult,
  selectedGridCell,
  onSelectGridCell,
  mapType,
  visualizationMode = 'change',
  showChangeLayer,
  showAoiLayer,
  layerOpacity,
  resetBoundsSignal,
}) => {
  const centerLat = aoiBbox ? (aoiBbox[1] + aoiBbox[3]) / 2 : 22.9734;
  const centerLng = aoiBbox ? (aoiBbox[0] + aoiBbox[2]) / 2 : 78.6569;

  const shouldRenderPolygons =
    showChangeLayer &&
    visualizationMode === 'change' &&
    Boolean(analysisResult?.changeFeaturesGeoJson);

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={{ lat: centerLat, lng: centerLng }}
        defaultZoom={aoiBbox ? 11 : 5}
        mapTypeId={mapType}
        gestureHandling="greedy"
        disableDefaultUI={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      >
        <MapBoundsController
          aoiBbox={aoiBbox}
          resetBoundsSignal={resetBoundsSignal}
        />

        {/* Center Marker at Geocoded Searched Location */}
        {aoiBbox && (
          <Marker
            position={{ lat: centerLat, lng: centerLng }}
            title="Geocoded Target Location"
          />
        )}

        {/* AOI Bounding Box Rectangle Overlay */}
        {aoiBbox && showAoiLayer && (
          <Rectangle
            bounds={{
              north: aoiBbox[3],
              south: aoiBbox[1],
              east: aoiBbox[2],
              west: aoiBbox[0],
            }}
            strokeColor="#0f172a"
            strokeOpacity={0.9}
            strokeWeight={2}
            fillColor="#0ea5e9"
            fillOpacity={visualizationMode === 'change' ? 0.08 : 0.02}
          />
        )}

        {/* Before Scene Satellite Ground Overlay */}
        {visualizationMode === 'before' && beforeScene && (
          <GoogleGroundOverlay
            imageUrl={beforeScene.thumbnailUrl || getRealSatelliteImageUrl(beforeScene.bbox || aoiBbox || [77.2, 23.1, 77.5, 23.4], 800, 600, 0)}
            bbox={beforeScene.bbox || aoiBbox}
            opacity={layerOpacity}
            visible={true}
          />
        )}

        {/* After Scene Satellite Ground Overlay */}
        {visualizationMode === 'after' && afterScene && (
          <GoogleGroundOverlay
            imageUrl={afterScene.thumbnailUrl || getRealSatelliteImageUrl(afterScene.bbox || aoiBbox || [77.2, 23.1, 77.5, 23.4], 800, 600, 1)}
            bbox={afterScene.bbox || aoiBbox}
            opacity={layerOpacity}
            visible={true}
          />
        )}

        {/* Multi-Temporal Change Detection Grid Polygons */}
        {shouldRenderPolygons &&
          analysisResult?.changeFeaturesGeoJson?.features?.map(
            (feat: any, idx: number) => {
              const props = feat.properties || {};
              const coords = feat.geometry?.coordinates?.[0] || [];
              const path = coords.map((c: [number, number]) => ({
                lat: c[1],
                lng: c[0],
              }));

              const cls = props.classification;
              const theme = props.theme || 'urban';

              let fillColor = '#94a3b8'; // stable
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

              const isSelected = selectedGridCell?.gridId === props.gridId;

              return (
                <Polygon
                  key={props.gridId || idx}
                  paths={path}
                  strokeColor={isSelected ? '#0f172a' : '#ffffff'}
                  strokeOpacity={isSelected ? 1.0 : 0.4}
                  strokeWeight={isSelected ? 3 : 1}
                  fillColor={fillColor}
                  fillOpacity={fillOpacity}
                  onClick={() => onSelectGridCell(props)}
                />
              );
            }
          )}
      </Map>
    </APIProvider>
  );
};
