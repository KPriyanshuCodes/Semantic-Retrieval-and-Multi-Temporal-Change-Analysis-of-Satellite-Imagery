import React from 'react';
import { SatelliteScene } from '../types';
import { Calendar, Cloud, Satellite, CheckCircle, ExternalLink, ArrowRight, Eye, ShieldAlert } from 'lucide-react';

interface SceneListProps {
  scenes: SatelliteScene[];
  beforeScene: SatelliteScene | null;
  afterScene: SatelliteScene | null;
  onSelectBefore: (scene: SatelliteScene) => void;
  onSelectAfter: (scene: SatelliteScene) => void;
  onFocusScene: (scene: SatelliteScene) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  dataModeNotice?: string;
  isDemo: boolean;
}

export const SceneList: React.FC<SceneListProps> = ({
  scenes,
  beforeScene,
  afterScene,
  onSelectBefore,
  onSelectAfter,
  onFocusScene,
  onRunAnalysis,
  isAnalyzing,
  dataModeNotice,
  isDemo,
}) => {
  if (scenes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <Satellite className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800 mb-1">No Satellite Scenes Loaded Yet</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Execute a query from the Search panel or adjust your date range to search the Copernicus Data Space
          STAC catalog for Sentinel-2 L2A observations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection Control Bar */}
      <div className="bg-slate-900 text-white rounded-lg p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
            {/* Before Slot */}
            <div className={`p-3 rounded border ${beforeScene ? 'bg-slate-800/80 border-cyan-500/40' : 'bg-slate-800/30 border-dashed border-slate-700'}`}>
              <div className="text-[11px] uppercase tracking-wider font-mono text-cyan-400 mb-1 flex items-center justify-between">
                <span>Before Observation (T1)</span>
                {beforeScene && <span className="text-emerald-400">Selected</span>}
              </div>
              {beforeScene ? (
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold text-white">{beforeScene.acquisitionDate} · {beforeScene.satellite}</div>
                  <div className="text-slate-400 font-mono truncate text-[11px]">ID: {beforeScene.id}</div>
                  <div className="text-slate-400 text-[11px]">Cloud cover: {beforeScene.cloudCover}%</div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">Select a baseline scene below</div>
              )}
            </div>

            {/* After Slot */}
            <div className={`p-3 rounded border ${afterScene ? 'bg-slate-800/80 border-cyan-500/40' : 'bg-slate-800/30 border-dashed border-slate-700'}`}>
              <div className="text-[11px] uppercase tracking-wider font-mono text-cyan-400 mb-1 flex items-center justify-between">
                <span>After Observation (T2)</span>
                {afterScene && <span className="text-emerald-400">Selected</span>}
              </div>
              {afterScene ? (
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold text-white">{afterScene.acquisitionDate} · {afterScene.satellite}</div>
                  <div className="text-slate-400 font-mono truncate text-[11px]">ID: {afterScene.id}</div>
                  <div className="text-slate-400 text-[11px]">Cloud cover: {afterScene.cloudCover}%</div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">Select a target observation below</div>
              )}
            </div>
          </div>

          {/* Trigger Button */}
          <div className="shrink-0 w-full lg:w-auto">
            <button
              onClick={onRunAnalysis}
              disabled={!beforeScene || !afterScene || isAnalyzing}
              className="w-full lg:w-auto px-5 py-3 text-xs font-semibold rounded bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 transition-colors flex items-center justify-center gap-2"
            >
              <span>{isAnalyzing ? 'Processing Spectral Differencing…' : 'Run Change Analysis'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Live / Demo Mode Banner */}
      <div className={`p-3 rounded border text-xs flex items-center justify-between gap-3 ${
        isDemo ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-center gap-2">
          {isDemo ? <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" /> : <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />}
          <div>
            <span className="font-semibold">{isDemo ? 'DEMO DATASET ACTIVE:' : 'COPERNICUS STAC CONNECTED:'}</span>{' '}
            <span>{dataModeNotice || (isDemo ? 'Using verified Sentinel-2 historical demonstration scenes.' : 'Official Copernicus Data Space Ecosystem STAC endpoint (sentinel-2-l2a).')}</span>
          </div>
        </div>
        <span className="font-mono text-[11px] shrink-0 font-semibold">{scenes.length} Scenes Available</span>
      </div>

      {/* Scene Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenes.map((scene) => {
          const isBefore = beforeScene?.id === scene.id;
          const isAfter = afterScene?.id === scene.id;

          return (
            <div
              key={scene.id}
              className={`bg-white rounded-lg border transition-all flex flex-col justify-between overflow-hidden ${
                isBefore || isAfter ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Thumbnail / Quicklook Preview */}
              <div className="relative aspect-16/10 bg-slate-900 overflow-hidden flex items-center justify-center text-slate-500">
                {scene.thumbnailUrl ? (
                  <img
                    src={scene.thumbnailUrl}
                    alt={`Quicklook preview of Sentinel-2 scene ${scene.id} acquired on ${scene.acquisitionDate}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback if quicklook fails
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-center p-4">
                    <Satellite className="w-8 h-8 mx-auto text-slate-600 mb-1" />
                    <span className="text-[11px] text-slate-400">Sentinel-2 L2A BOA Reflectance</span>
                  </div>
                )}

                {/* Cloud & Satellite Pills on Top */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className="bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded">
                    {scene.satellite}
                  </span>
                  <span className="bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-cyan-400" />
                    <span>{scene.cloudCover}% cloud</span>
                  </span>
                </div>

                <div className="absolute top-2 right-2">
                  <span className="bg-slate-950/80 backdrop-blur-xs text-cyan-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
                    Score {scene.relevanceScore}
                  </span>
                </div>
              </div>

              {/* Scene Metadata Content */}
              <div className="p-4 space-y-2.5 flex-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{scene.acquisitionDate}</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{scene.collection}</span>
                </div>

                <div>
                  <div className="text-xs font-mono font-medium text-slate-800 truncate" title={scene.id}>
                    {scene.id}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    Source: {scene.source}
                  </div>
                </div>

                {/* Bounding Coordinates */}
                <div className="p-2 bg-slate-50 rounded text-[11px] font-mono text-slate-600">
                  BBox: [{scene.bbox.map((v) => v.toFixed(2)).join(', ')}]
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => onSelectBefore(scene)}
                  className={`py-1.5 px-2 rounded font-medium transition-colors ${
                    isBefore
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {isBefore ? '✓ Selected (T1)' : 'Set as Before (T1)'}
                </button>

                <button
                  onClick={() => onSelectAfter(scene)}
                  className={`py-1.5 px-2 rounded font-medium transition-colors ${
                    isAfter
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {isAfter ? '✓ Selected (T2)' : 'Set as After (T2)'}
                </button>

                <button
                  onClick={() => onFocusScene(scene)}
                  className="col-span-2 py-1 text-slate-500 hover:text-slate-800 text-[11px] flex items-center justify-center gap-1 mt-0.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Highlight AOI on Map</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
