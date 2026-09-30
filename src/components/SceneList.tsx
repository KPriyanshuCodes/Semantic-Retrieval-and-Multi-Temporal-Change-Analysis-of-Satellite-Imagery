import React, { useState } from 'react';
import { SatelliteScene } from '../types/index';
import {
  Calendar,
  Cloud,
  Satellite,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  Edit2,
  X,
  Sparkles,
} from 'lucide-react';
import { getRealSatelliteImageUrl } from '../utils/clientFallbackSearch';
import {
  RecommendationResult,
  SelectionValidation,
  formatReadableDate,
  formatIsoDate,
  validatePairSelection,
  getSensorFamily,
} from '../utils/sceneRecommendation';

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
  recommendation?: RecommendationResult | null;
  selectionValidation?: SelectionValidation;
  requestedStartDate?: string;
  requestedEndDate?: string;
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
  recommendation,
  selectionValidation,
  requestedStartDate = '2020-01-01',
  requestedEndDate = '2026-12-31',
}) => {
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);
  const [changeModalRole, setChangeModalRole] = useState<'before' | 'after' | null>(null);
  const [modalFilterSource, setModalFilterSource] = useState<'all' | 'sentinel2' | 'landsat'>('all');

  const toggleDetails = (sceneId: string) => {
    setExpandedDetailsId(expandedDetailsId === sceneId ? null : sceneId);
  };

  // Compute validation if not provided from parent
  const activeValidation: SelectionValidation =
    selectionValidation || validatePairSelection(beforeScene, afterScene);

  // Filter scenes for image grid
  const filteredScenes = scenes.filter((scene) => {
    if (activeSourceFilter === 'sentinel2') {
      return (
        scene.collection === 'sentinel-2-l2a' ||
        scene.satellite.toLowerCase().includes('sentinel')
      );
    }
    if (activeSourceFilter === 'landsat') {
      return (
        scene.collection === 'landsat-c2-l2' ||
        scene.satellite.toLowerCase().includes('landsat')
      );
    }
    return true;
  });

  // Empty State
  if (scenes.length === 0) {
    const hasSearch = Boolean(locationName && locationName !== 'Selected Region');
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
          <Satellite className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">
            {hasSearch ? 'No suitable satellite imagery found' : 'No Satellite Search Submitted Yet'}
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            {hasSearch
              ? `No suitable satellite imagery was found for ${locationName} in the requested time frame (${formatReadableDate(
                  requestedStartDate
                )} to ${formatReadableDate(requestedEndDate)}).`
              : 'Enter a search query in the Search tab to discover Sentinel-2 and Landsat observations.'}
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

  // Format analysis period in ISO 8601 (YYYY-MM-DD)
  const reqStartIso = formatIsoDate(requestedStartDate || '2020-01-01');
  const reqEndIso = formatIsoDate(requestedEndDate || '2026-12-31');
  const periodLabel = `${reqStartIso} → ${reqEndIso}`;

  // Check chronological order of current selection
  const beforeMs = beforeScene
    ? new Date(beforeScene.acquisitionDate || beforeScene.datetime).getTime()
    : 0;
  const afterMs = afterScene
    ? new Date(afterScene.acquisitionDate || afterScene.datetime).getTime()
    : 0;
  const isChronologyValid = beforeScene && afterScene && beforeMs < afterMs;

  const daysBetween =
    beforeMs && afterMs && afterMs > beforeMs
      ? Math.round((afterMs - beforeMs) / 86400000)
      : null;

  return (
    <div className="space-y-5">
      {/* 1. Requested Period & Selected Observation Dates Banner (Rule 1 & 7) */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">
                Analysis Period
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-white">
                {periodLabel}
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Location: <strong className="text-slate-900">{locationName}</strong>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs">
            <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">
              Actual Selected Observation Dates
            </span>
            <div className="font-semibold text-slate-900 flex items-center sm:justify-end gap-1.5 mt-0.5">
              <span>{beforeScene ? formatReadableDate(beforeScene.acquisitionDate) : 'None'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span>{afterScene ? formatReadableDate(afterScene.acquisitionDate) : 'None'}</span>
            </div>
          </div>
        </div>

        {/* Validation Errors & Warnings (Rule 5 & 11) */}
        {!activeValidation.valid && activeValidation.chronologyError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-800">Chronological Selection Error</div>
              <p className="mt-0.5">{activeValidation.chronologyError}</p>
            </div>
          </div>
        )}

        {activeValidation.aoiWarning && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-800">Area Coverage Warning</div>
              <p className="mt-0.5">{activeValidation.aoiWarning}</p>
            </div>
          </div>
        )}

        {activeValidation.sensorWarning && (
          <div className="mt-3 p-3 bg-sky-50 border border-sky-200 rounded-md text-sky-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>{activeValidation.sensorWarning}</div>
          </div>
        )}

        {/* Missing Imagery Notices (Rule 9) */}
        {recommendation?.status === 'missing_before' && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-800">
                No suitable Before image was found for the requested period.
              </div>
              <p className="mt-0.5 text-amber-700">
                No clear observation could be validated near the requested start date (
                {formatReadableDate(requestedStartDate)}). Please expand your date range or select a manual scene below.
              </p>
            </div>
          </div>
        )}

        {recommendation?.status === 'missing_after' && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-800">
                No suitable After image was found for the requested period.
              </div>
              <p className="mt-0.5 text-amber-700">
                No clear observation could be validated near the requested end date (
                {formatReadableDate(requestedEndDate)}).
              </p>
            </div>
          </div>
        )}

        {recommendation?.status === 'insufficient_imagery' && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-800">Insufficient Observations</div>
              <p className="mt-0.5 text-amber-700">{recommendation.errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Recommended Before & Recommended After Section (Rule 10 & 11) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Recommended Multi-Temporal Image Pair
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Chronological & Quality-Optimized Selection
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* RECOMMENDED BEFORE CARD */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  RECOMMENDED BEFORE
                </span>
                <button
                  type="button"
                  onClick={() => setChangeModalRole('before')}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1"
                  aria-label="Change Before Image"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Change</span>
                </button>
              </div>

              {beforeScene ? (
                <div className="flex items-start gap-3.5">
                  <img
                    src={beforeScene.thumbnailUrl || getRealSatelliteImageUrl(beforeScene.bbox, 640, 440, 0)}
                    alt="Recommended Before Observation"
                    className="w-20 h-20 rounded-md object-cover bg-slate-950 shrink-0 border border-slate-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = getRealSatelliteImageUrl(beforeScene.bbox, 640, 440, 0);
                    }}
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">
                      {formatReadableDate(beforeScene.acquisitionDate)}
                    </div>
                    <div className="text-xs font-medium text-slate-700">
                      {beforeScene.satellite}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1">
                      <Cloud className="w-3.5 h-3.5 text-slate-400" />
                      <span>Cloud cover: <strong>{beforeScene.cloudCover}%</strong></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 italic bg-slate-50 rounded">
                  No suitable Before image found within the requested period.
                </div>
              )}
            </div>
          </div>

          {/* RECOMMENDED AFTER CARD */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                  RECOMMENDED AFTER
                </span>
                <button
                  type="button"
                  onClick={() => setChangeModalRole('after')}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1"
                  aria-label="Change After Image"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Change</span>
                </button>
              </div>

              {afterScene ? (
                <div className="flex items-start gap-3.5">
                  <img
                    src={afterScene.thumbnailUrl || getRealSatelliteImageUrl(afterScene.bbox, 640, 440, 1)}
                    alt="Recommended After Observation"
                    className="w-20 h-20 rounded-md object-cover bg-slate-950 shrink-0 border border-slate-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = getRealSatelliteImageUrl(afterScene.bbox, 640, 440, 1);
                    }}
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">
                      {formatReadableDate(afterScene.acquisitionDate)}
                    </div>
                    <div className="text-xs font-medium text-slate-700">
                      {afterScene.satellite}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1">
                      <Cloud className="w-3.5 h-3.5 text-slate-400" />
                      <span>Cloud cover: <strong>{afterScene.cloudCover}%</strong></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 italic bg-slate-50 rounded">
                  No suitable After image found within the requested period.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Execution Bar */}
      <div className="bg-slate-900 text-white rounded-lg p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="text-xs space-y-1">
            <div className="font-bold flex items-center gap-2">
              <span>Change Comparison Baseline:</span>
              <span className="text-slate-300 font-normal">
                {beforeScene && afterScene
                  ? `${formatIsoDate(beforeScene.acquisitionDate)} → ${formatIsoDate(afterScene.acquisitionDate)}`
                  : 'Incomplete selection'}
              </span>
            </div>
            {daysBetween !== null && (
              <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Observation interval: <strong>{daysBetween} days</strong> (~{(daysBetween / 365.25).toFixed(1)} years span)
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onRunAnalysis}
            disabled={!beforeScene || !afterScene || !isChronologyValid || isAnalyzing}
            className="px-6 py-2.5 text-xs font-bold rounded-md bg-white hover:bg-slate-100 text-slate-950 disabled:bg-slate-800 disabled:text-slate-600 transition-colors flex items-center justify-center gap-2 shrink-0"
            aria-label="Run Change Analysis"
          >
            <span>{isAnalyzing ? 'Computing Analysis…' : 'Run Change Analysis'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Satellite Sources Filter & Summary */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Browse All Available Satellite Observations
            </h3>
            <p className="text-[11px] text-slate-500">
              Showing verified observations covering {locationName}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5">
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
              Sentinel-2 ({s2Count})
            </button>
            <button
              onClick={() => setActiveSourceFilter?.('landsat')}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                activeSourceFilter === 'landsat'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Landsat ({landsatCount})
            </button>
          </div>
        </div>
      </div>

      {/* 5. Available Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredScenes.map((scene) => {
          const isBefore = beforeScene?.id === scene.id;
          const isAfter = afterScene?.id === scene.id;
          const isRecBefore = recommendation?.beforeScene?.id === scene.id;
          const isRecAfter = recommendation?.afterScene?.id === scene.id;
          const isDetailsOpen = expandedDetailsId === scene.id;

          const sourceLabel =
            scene.collection === 'landsat-c2-l2' || scene.satellite.toLowerCase().includes('landsat')
              ? 'USGS / Earth Engine'
              : 'Copernicus Data Space';

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
                <img
                  src={scene.thumbnailUrl || getRealSatelliteImageUrl(scene.bbox, 640, 440, 0)}
                  alt={`${scene.satellite} acquired on ${scene.acquisitionDate}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = getRealSatelliteImageUrl(scene.bbox, 640, 440, 0);
                  }}
                />

                {/* HUD Badges */}
                <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-300" />
                  <span>{formatReadableDate(scene.acquisitionDate)}</span>
                </div>

                <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-slate-300" />
                  <span>{scene.cloudCover}% cloud</span>
                </div>

                {/* Recommendation Badges */}
                {isRecBefore && (
                  <div className="absolute bottom-2 left-2 bg-emerald-600/90 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Rec. Before</span>
                  </div>
                )}
                {isRecAfter && (
                  <div className="absolute bottom-2 left-2 bg-sky-600/90 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Rec. After</span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900">{scene.satellite}</span>
                    <span className="text-[11px] text-slate-500">{sourceLabel}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Observation Date: <strong className="text-slate-900">{formatReadableDate(scene.acquisitionDate)}</strong>
                  </div>
                </div>

                {/* Collapsible Details */}
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
                      <span>{isBefore ? 'Selected Before' : 'Set as Before'}</span>
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
                      <span>{isAfter ? 'Selected After' : 'Set as After'}</span>
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

      {/* 6. Interactive Modal to Change Recommended Image (Rule 11) */}
      {changeModalRole && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Change {changeModalRole === 'before' ? 'Before (Baseline)' : 'After (Comparison)'} Image</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {changeModalRole === 'before' && afterScene
                    ? `Must be chronologically earlier than After date: ${formatReadableDate(afterScene.acquisitionDate)}`
                    : changeModalRole === 'after' && beforeScene
                    ? `Must be chronologically later than Before date: ${formatReadableDate(beforeScene.acquisitionDate)}`
                    : 'Select a valid satellite observation.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChangeModalRole(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sensor Filter */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Filter Sensor:</span>
              <button
                onClick={() => setModalFilterSource('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  modalFilterSource === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setModalFilterSource('sentinel2')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  modalFilterSource === 'sentinel2'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                Sentinel-2
              </button>
              <button
                onClick={() => setModalFilterSource('landsat')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  modalFilterSource === 'landsat'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                Landsat
              </button>
            </div>

            {/* Modal Scene List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100">
              {scenes
                .filter((s) => {
                  if (modalFilterSource === 'sentinel2') {
                    return getSensorFamily(s) === 'Sentinel-2';
                  }
                  if (modalFilterSource === 'landsat') {
                    return getSensorFamily(s) === 'Landsat';
                  }
                  return true;
                })
                .map((scene) => {
                  const sceneMs = new Date(scene.acquisitionDate || scene.datetime).getTime();
                  const isCurrentSelection =
                    changeModalRole === 'before'
                      ? beforeScene?.id === scene.id
                      : afterScene?.id === scene.id;

                  // Check if selecting this would cause chronological inversion
                  let chronologyConflict = false;
                  let conflictMessage = '';

                  if (changeModalRole === 'before' && afterScene) {
                    const limitMs = new Date(afterScene.acquisitionDate || afterScene.datetime).getTime();
                    if (sceneMs >= limitMs) {
                      chronologyConflict = true;
                      conflictMessage = `Acquired after ${formatReadableDate(afterScene.acquisitionDate)}`;
                    }
                  } else if (changeModalRole === 'after' && beforeScene) {
                    const limitMs = new Date(beforeScene.acquisitionDate || beforeScene.datetime).getTime();
                    if (sceneMs <= limitMs) {
                      chronologyConflict = true;
                      conflictMessage = `Acquired before ${formatReadableDate(beforeScene.acquisitionDate)}`;
                    }
                  }

                  return (
                    <div
                      key={scene.id}
                      className={`pt-2 flex items-center justify-between gap-3 p-2 rounded-md transition-colors ${
                        isCurrentSelection
                          ? 'bg-slate-100 font-semibold'
                          : chronologyConflict
                          ? 'opacity-60 bg-red-50/50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={scene.thumbnailUrl || getRealSatelliteImageUrl(scene.bbox, 640, 440, 0)}
                          alt=""
                          className="w-12 h-12 rounded object-cover bg-slate-950 shrink-0"
                        />
                        <div className="min-w-0 text-xs space-y-0.5">
                          <div className="font-bold text-slate-900">
                            {formatReadableDate(scene.acquisitionDate)}
                          </div>
                          <div className="text-slate-600 text-[11px]">
                            {scene.satellite} · {scene.cloudCover}% cloud cover
                          </div>
                          {chronologyConflict && (
                            <div className="text-red-700 text-[10px] font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              <span>{conflictMessage}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (changeModalRole === 'before') {
                            onSelectBefore(scene);
                          } else {
                            onSelectAfter(scene);
                          }
                          setChangeModalRole(null);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                          isCurrentSelection
                            ? 'bg-slate-900 text-white cursor-default'
                            : chronologyConflict
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : 'bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800'
                        }`}
                      >
                        {isCurrentSelection
                          ? 'Selected'
                          : chronologyConflict
                          ? 'Select (Requires Swap)'
                          : 'Select'}
                      </button>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setChangeModalRole(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
