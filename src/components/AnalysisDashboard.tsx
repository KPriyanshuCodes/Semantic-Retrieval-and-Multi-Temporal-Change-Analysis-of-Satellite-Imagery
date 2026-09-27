import React from 'react';
import { AnalysisResult } from '../types';
import { Download, CheckCircle, Info, Activity, AlertTriangle, Layers, MapPin } from 'lucide-react';

interface AnalysisDashboardProps {
  analysis: AnalysisResult | null;
  selectedGridCell: any | null;
  onClearCell: () => void;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  analysis,
  selectedGridCell,
  onClearCell,
}) => {
  if (!analysis) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800 mb-1">No Active Change Analysis</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Select both a Before ($T_1$) and After ($T_2$) Sentinel-2 observation from the Satellite Catalog,
          then click "Run Change Analysis" to compute multi-temporal spectral metrics.
        </p>
      </div>
    );
  }

  const { metrics, beforeScene, afterScene, locationName, analysisType, summary } = analysis;

  const handleDownloadGeoJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(analysis.changeFeaturesGeoJson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${analysis.id}_change_layer.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-lg font-bold text-slate-900">
                Multi-Temporal Change Analysis Report
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{locationName}</span>
              </span>
              <span>·</span>
              <span className="font-mono">
                {beforeScene.date} → {afterScene.date}
              </span>
              <span>·</span>
              <span className="capitalize">{analysisType} Change</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadGeoJson}
              className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export GeoJSON</span>
            </button>
          </div>
        </div>

        {/* Executive Summary */}
        <p className="text-xs text-slate-700 mt-4 leading-relaxed bg-slate-50 p-3 rounded border border-slate-100">
          <strong>Summary:</strong> {summary}
        </p>

        {/* High-Level Quantitative Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-slate-50 rounded border border-slate-100">
            <div className="text-[11px] uppercase tracking-wider font-mono text-slate-600 mb-1">
              Total Area Analyzed
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {metrics.totalAreaKm2} <span className="text-xs font-normal text-slate-600">km²</span>
            </div>
            <div className="text-[11px] text-slate-600 mt-1">Geodesic WGS84</div>
          </div>

          <div className="p-4 bg-slate-50 rounded border border-slate-100">
            <div className="text-[11px] uppercase tracking-wider font-mono text-slate-600 mb-1">
              Changed Surface Area
            </div>
            <div className="text-2xl font-bold font-mono text-red-600">
              {metrics.changedAreaKm2} <span className="text-xs font-normal text-slate-600">km²</span>
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              {metrics.changePercentage}% of target area
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded border border-slate-100">
            <div className="text-[11px] uppercase tracking-wider font-mono text-slate-600 mb-1">
              Scene Overlap
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {metrics.overlapPercentage}%
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">Spatial compatibility OK</div>
          </div>

          <div className="p-4 bg-slate-50 rounded border border-slate-100">
            <div className="text-[11px] uppercase tracking-wider font-mono text-slate-600 mb-1">
              Confidence Index
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-700">
              {metrics.confidenceScore} / 100
            </div>
            <div className="text-[11px] text-slate-600 mt-1">Cloud & geometric score</div>
          </div>
        </div>
      </div>

      {/* Methodological Transparency & Limitations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Layers className="w-4 h-4 text-cyan-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
              Processing Methodology
            </h3>
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-700">Algorithm:</span> {metrics.method}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Index Formula:</span>{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">
                {metrics.indexUsed}
              </code>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Data Source:</span> {metrics.dataSource}
            </div>
            <div>
              <span className="font-semibold text-slate-700">CRS:</span> EPSG:4326 (WGS84 Geodetic)
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Info className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
              Scientific Limitations & Accuracy
            </h3>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <p>
              • <strong>Prototype Notice:</strong> This analysis is intended for exploratory environmental
              and urban change assessments and should not be used as survey-grade land cadastral certification.
            </p>
            <p>
              • <strong>Resolution Constraint:</strong> Sentinel-2 Level-2A imagery operates at 10m–20m ground
              sample distance (GSD). Small sub-pixel objects (&lt;10m) may not register distinct spectral shifts.
            </p>
            <p>
              • <strong>Atmospheric Effects:</strong> Variations in seasonal sun angle and residual aerosol may
              influence spectral indices.
            </p>
          </div>
        </div>
      </div>

      {/* Selected Grid Cell Inspector */}
      {selectedGridCell && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-cyan-950">Inspected Grid Cell: {selectedGridCell.gridId}</span>
            <div className="text-cyan-800 mt-0.5">
              Classification: <strong className="capitalize">{selectedGridCell.classification}</strong> · Δ Spectral Value: {selectedGridCell.deltaValue} · Significance: {selectedGridCell.significance}
            </div>
          </div>
          <button
            onClick={onClearCell}
            className="text-xs text-cyan-800 hover:text-cyan-950 underline font-medium"
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};
