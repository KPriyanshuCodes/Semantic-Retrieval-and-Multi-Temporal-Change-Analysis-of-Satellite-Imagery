import React, { useState } from 'react';
import { SatelliteScene } from '../types';
import {
  Calendar,
  Cloud,
  Satellite,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
} from 'lucide-react';

interface SceneListProps {
  scenes: SatelliteScene[];
  beforeScene: SatelliteScene | null;
  afterScene: SatelliteScene | null;
  onSelectBefore: (scene: SatelliteScene) => void;
  onSelectAfter: (scene: SatelliteScene) => void;
  onFocusScene?: (scene: SatelliteScene) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  dataModeNotice?: string;
  isDemo?: boolean;
  locationName?: string;
  onIncreaseDateRange?: () => void;
  onIncreaseCloudLimit?: () => void;
  onChangeLocation?: () => void;
  multiSearchResult?: any;
  activeSourceFilter?: 'all' | 'sentinel2' | 'landsat';
  setActiveSourceFilter?: (source: 'all' | 'sentinel2' | 'landsat') => void;
}

export const SceneList: React.FC<SceneListProps> = ({
  scenes,
  beforeScene,
  afterScene,
  onSelectBefore,
  onSelectAfter,
  onRunAnalysis,
  isAnalyzing,
  locationName = 'Selected Region',
  onIncreaseDateRange,
  onIncreaseCloudLimit,
  onChangeLocation,
  multiSearchResult,
  activeSourceFilter = 'all',
  setActiveSourceFilter,
}) => {
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);

  const toggleDetails = (sceneId: string) => {
    setExpandedDetailsId(expandedDetailsId === sceneId ? null : sceneId);
  };

  // Empty State
  if (scenes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
          <Satellite className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">
            No clear satellite imagery found
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            No cloud-screened images are currently available for <strong>{locationName}</strong> in the requested time frame.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {onIncreaseDateRange && (
            <button
              onClick={onIncreaseDateRange}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
            >
              Expand Date Range
            </button>
          )}
          {onIncreaseCloudLimit && (
            <button
              onClick={onIncreaseCloudLimit}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              Allow More Cloud Cover
            </button>
          )}
          {onChangeLocation && (
            <button
              onClick={onChangeLocation}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              Change Location
            </button>
          )}
        </div>
      </div>
    );
  }

  const s2Count = multiSearchResult?.sentinel2?.count || 0;
  const landsatCount = multiSearchResult?.landsat?.count || 0;

  return (
    <div className="space-y-5">
      {/* 1. Available Satellite Sources Summary */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Available Satellite Data
            </h2>
            <p className="text-xs text-slate-500">
              Select a Before image and an After image to compute change analysis.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Location: <span className="font-semibold text-slate-800">{locationName}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Sentinel-2 Source Card */}
          <div
            onClick={() => setActiveSourceFilter?.('sentinel2')}
            className={`cursor-pointer rounded-lg p-3.5 border transition-all ${
              activeSourceFilter === 'sentinel2'
                ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900">Sentinel-2</span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {s2Count} images
              </span>
            </div>
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div><strong>Data source:</strong> Copernicus Data Space</div>
              <div><strong>Dates:</strong> {multiSearchResult?.sentinel2?.dateRange || '2020 – 2026'}</div>
              <div><strong>Cloud cover:</strong> {multiSearchResult?.sentinel2?.cloudCoverageRange || '< 20%'}</div>
            </div>
          </div>

          {/* Landsat Source Card */}
          <div
            onClick={() => setActiveSourceFilter?.('landsat')}
            className={`cursor-pointer rounded-lg p-3.5 border transition-all ${
              activeSourceFilter === 'landsat'
                ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900">Landsat</span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {landsatCount} images
              </span>
            </div>
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div><strong>Data source:</strong> Google Earth Engine / USGS</div>
              <div><strong>Dates:</strong> {multiSearchResult?.landsat?.dateRange || '2020 – 2026'}</div>
              <div><strong>Cloud cover:</strong> {multiSearchResult?.landsat?.cloudCoverageRange || '< 20%'}</div>
            </div>
          </div>
        </div>

        {/* Source Filter Tabs */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
          <button
            onClick={() => setActiveSourceFilter?.('all')}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              activeSourceFilter === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Sources ({scenes.length})
          </button>
          <button
            onClick={() => setActiveSourceFilter?.('sentinel2')}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              activeSourceFilter === 'sentinel2'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Sentinel-2 Only ({s2Count})
          </button>
          <button
            onClick={() => setActiveSourceFilter?.('landsat')}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              activeSourceFilter === 'landsat'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Landsat Only ({landsatCount})
          </button>
        </div>
      </div>

      {/* 2. Selected Imagery Bar */}
      <div className="bg-slate-900 text-white rounded-lg p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {/* Before Selection Card */}
            <div
              className={`p-3 rounded-md border flex items-center gap-3 transition-colors ${
                beforeScene
                  ? 'bg-slate-800/90 border-slate-600'
                  : 'bg-slate-800/40 border-dashed border-slate-700 text-slate-400'
              }`}
            >
              {beforeScene?.thumbnailUrl ? (
                <img
                  src={beforeScene.thumbnailUrl}
                  alt="Before observation"
                  className="w-12 h-12 rounded object-cover shrink-0 bg-slate-950"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded bg-slate-700/60 flex items-center justify-center shrink-0">
                  <Satellite className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Before Image
                </div>
                {beforeScene ? (
                  <div className="text-xs">
                    <div className="font-bold text-white truncate">
                      {beforeScene.acquisitionDate}
                    </div>
                    <div className="text-slate-400 text-[11px] truncate">
                      {beforeScene.satellite} · {beforeScene.cloudCover}% cloud
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">Select an image below</div>
                )}
              </div>
            </div>

            {/* After Selection Card */}
            <div
              className={`p-3 rounded-md border flex items-center gap-3 transition-colors ${
                afterScene
                  ? 'bg-slate-800/90 border-slate-600'
                  : 'bg-slate-800/40 border-dashed border-slate-700 text-slate-400'
              }`}
            >
              {afterScene?.thumbnailUrl ? (
                <img
                  src={afterScene.thumbnailUrl}
                  alt="After observation"
                  className="w-12 h-12 rounded object-cover shrink-0 bg-slate-950"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded bg-slate-700/60 flex items-center justify-center shrink-0">
                  <Satellite className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  After Image
                </div>
                {afterScene ? (
                  <div className="text-xs">
                    <div className="font-bold text-white truncate">
                      {afterScene.acquisitionDate}
                    </div>
                    <div className="text-slate-400 text-[11px] truncate">
                      {afterScene.satellite} · {afterScene.cloudCover}% cloud
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">Select an image below</div>
                )}
              </div>
            </div>
          </div>

          {/* Run Analysis Action Button */}
          <button
            onClick={onRunAnalysis}
            disabled={!beforeScene || !afterScene || isAnalyzing}
            className="px-6 py-3 text-xs font-bold rounded-md bg-white hover:bg-slate-100 text-slate-950 disabled:bg-slate-800 disabled:text-slate-600 transition-colors flex items-center justify-center gap-2 shrink-0"
            aria-label="Run Change Analysis"
          >
            <span>{isAnalyzing ? 'Analyzing…' : 'Run Analysis'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Available Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenes.map((scene) => {
          const isBefore = beforeScene?.id === scene.id;
          const isAfter = afterScene?.id === scene.id;
          const isDetailsOpen = expandedDetailsId === scene.id;

          const sourceLabel =
            scene.collection === 'landsat-c2-l2' || scene.satellite.toLowerCase().includes('landsat')
              ? 'Google Earth Engine'
              : 'Copernicus';

          return (
            <div
              key={scene.id}
              className={`bg-white rounded-lg border transition-all flex flex-col justify-between overflow-hidden ${
                isBefore || isAfter
                  ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Image Preview */}
              <div className="relative aspect-16/10 bg-slate-900 overflow-hidden flex items-center justify-center">
                {scene.thumbnailUrl ? (
                  <img
                    src={scene.thumbnailUrl}
                    alt={`${scene.satellite} acquired on ${scene.acquisitionDate}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-center p-4 text-slate-500">
                    <Satellite className="w-8 h-8 mx-auto mb-1 text-slate-600" />
                    <span className="text-[11px]">Satellite Imagery</span>
                  </div>
                )}

                {/* Cloud & Date HUD Badges */}
                <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-300" />
                  <span>{scene.acquisitionDate}</span>
                </div>

                <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-slate-300" />
                  <span>{scene.cloudCover}% cloud</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900">{scene.satellite}</span>
                    <span className="text-[11px] text-slate-500">{sourceLabel}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Acquired: <strong className="text-slate-900">{scene.acquisitionDate}</strong>
                  </div>
                </div>

                {/* Optional Collapsible Details */}
                {isDetailsOpen && (
                  <div className="p-2.5 bg-slate-50 rounded text-[11px] text-slate-600 space-y-1 border border-slate-100">
                    <div className="font-mono text-[10px] truncate" title={scene.id}>
                      <strong>Scene ID:</strong> {scene.id}
                    </div>
                    <div>
                      <strong>Resolution:</strong>{' '}
                      {scene.collection === 'landsat-c2-l2' ? '30m Multi-Spectral' : '10m Multi-Spectral'}
                    </div>
                    <div>
                      <strong>Provider:</strong> {scene.source || sourceLabel}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectBefore(scene)}
                      className={`py-1.5 px-2 text-xs font-semibold rounded border transition-colors flex items-center justify-center gap-1 ${
                        isBefore
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                      aria-label="Select as Before Image"
                    >
                      {isBefore && <Check className="w-3.5 h-3.5" />}
                      <span>{isBefore ? 'Before Selected' : 'Select Before'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectAfter(scene)}
                      className={`py-1.5 px-2 text-xs font-semibold rounded border transition-colors flex items-center justify-center gap-1 ${
                        isAfter
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                      aria-label="Select as After Image"
                    >
                      {isAfter && <Check className="w-3.5 h-3.5" />}
                      <span>{isAfter ? 'After Selected' : 'Select After'}</span>
                    </button>
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => toggleDetails(scene.id)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-0.5"
                    >
                      <span>{isDetailsOpen ? 'Hide Details' : 'Details'}</span>
                      {isDetailsOpen ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
