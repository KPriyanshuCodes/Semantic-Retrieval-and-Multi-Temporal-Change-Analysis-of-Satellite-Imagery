import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import {
  Download,
  Calendar,
  MapPin,
  Satellite,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { generateAnalysisPdf, generateAnalysisCsv } from '../utils/reportGenerator';

interface AnalysisDashboardProps {
  analysis: AnalysisResult | null;
  selectedGridCell: any | null;
  onClearCell: () => void;
  onFocusLocation?: () => void;
  onBackToCatalog?: () => void;
  onRetryAnalysis?: () => void;
  isAnalyzing?: boolean;
  analysisStep?: number;
  analysisError?: string | null;
  mapComponent?: React.ReactNode;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  analysis,
  onBackToCatalog,
  onRetryAnalysis,
  isAnalyzing = false,
  analysisError = null,
  mapComponent,
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // 1. Loading State
  if (isAnalyzing) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-800 animate-spin">
          <Activity className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">
            Analyzing Satellite Changes
          </h3>
          <p className="text-xs text-slate-500">
            Comparing before and after imagery to detect surface changes...
          </p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (analysisError) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-8 text-center max-w-md mx-auto space-y-4 shadow-xs">
        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900">
            Analysis Could Not Be Completed
          </h3>
          <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
            {analysisError}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          {onRetryAnalysis && (
            <button
              onClick={onRetryAnalysis}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
            >
              Try Again
            </button>
          )}
          {onBackToCatalog && (
            <button
              onClick={onBackToCatalog}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              Select Different Images
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. No active analysis yet
  if (!analysis) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-3">
        <p className="text-xs text-slate-500">
          No analysis has been run yet. Select a Before and After image to see change results.
        </p>
        {onBackToCatalog && (
          <button
            onClick={onBackToCatalog}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
          >
            Select Satellite Images
          </button>
        )}
      </div>
    );
  }

  const {
    metrics,
    beforeScene,
    afterScene,
    locationName,
    analysisType,
    summary,
  } = analysis;

  const handleDownloadGeoJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(analysis.changeFeaturesGeoJson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${analysis.id}_change_layer.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePdfDownload = () => {
    setDownloadingPdf(true);
    try {
      generateAnalysisPdf(analysis);
    } finally {
      setTimeout(() => setDownloadingPdf(false), 600);
    }
  };

  const handleCsvDownload = () => {
    setDownloadingCsv(true);
    try {
      generateAnalysisCsv(analysis);
    } finally {
      setTimeout(() => setDownloadingCsv(false), 600);
    }
  };

  // Determine user-friendly change type label
  const changeTypeLabel =
    analysisType === 'vegetation'
      ? 'Vegetation / Forest Change'
      : analysisType === 'urban'
      ? 'Urban / Construction Expansion'
      : analysisType === 'water'
      ? 'Water Surface Dynamics'
      : 'General Land Cover Change';

  // Determine satellite and source used
  const satelliteUsed = afterScene.satellite || beforeScene.satellite || 'Sentinel-2';
  const sourceUsed =
    afterScene.collection === 'landsat-c2-l2' || satelliteUsed.toLowerCase().includes('landsat')
      ? 'Google Earth Engine'
      : 'Copernicus Data Space';

  return (
    <div className="space-y-6">
      {/* 1. Header Card: Context & Primary Actions */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-lg font-bold text-slate-900">
                Change Analysis Results
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Multi-temporal comparison between {beforeScene.date} and {afterScene.date}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onBackToCatalog && (
              <button
                onClick={onBackToCatalog}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Images</span>
              </button>
            )}
            <button
              onClick={handlePdfDownload}
              disabled={downloadingPdf}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded transition-colors flex items-center gap-1 shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{downloadingPdf ? 'Generating...' : 'Download Report'}</span>
            </button>
            <button
              onClick={handleCsvDownload}
              disabled={downloadingCsv}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded transition-colors flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV Data</span>
            </button>
          </div>
        </div>

        {/* 2. Stakeholder Decision Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-0.5">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>Location</span>
            </div>
            <div className="text-xs font-bold text-slate-900 truncate" title={locationName}>
              {locationName}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-0.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Analysis Period</span>
            </div>
            <div className="text-xs font-bold text-slate-900">
              {beforeScene.date} → {afterScene.date}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-0.5">
              <Satellite className="w-3 h-3 text-slate-400" />
              <span>Satellite & Source</span>
            </div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {satelliteUsed} ({sourceUsed})
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="text-[11px] text-slate-500 mb-0.5">Change Type</div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {changeTypeLabel}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Key Results: Changed Area & Percentage */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
            Changed Area
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            {metrics.changedAreaKm2.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">km²</span>
          </div>
          <div className="text-xs text-red-600 font-medium">
            Significant detected change
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
            Change Percentage
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            {metrics.changePercentage}%
          </div>
          <div className="text-xs text-slate-500">
            Of total analyzed area
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
            Total Area Analyzed
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            {metrics.totalAreaKm2.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">km²</span>
          </div>
          <div className="text-xs text-slate-500">
            Geographic coverage
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
            Unchanged / Stable
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            {metrics.stableAreaKm2.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">km²</span>
          </div>
          <div className="text-xs text-emerald-600 font-medium">
            {(100 - metrics.changePercentage).toFixed(1)}% stable surface
          </div>
        </div>
      </div>

      {/* 4. Side-by-Side Images & Change Map */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
          Imagery & Change Map
        </h3>

        {/* Side-by-Side Before & After Images */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Before Image Preview */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-950 flex flex-col">
            <div className="p-2.5 bg-slate-900 text-white flex items-center justify-between text-xs">
              <span className="font-bold">Before Image</span>
              <span className="text-slate-300 font-mono text-[11px]">{beforeScene.date}</span>
            </div>
            <div className="relative aspect-16/10 bg-slate-900 flex items-center justify-center">
              {beforeScene.thumbnailUrl ? (
                <img
                  src={beforeScene.thumbnailUrl}
                  alt={`Before observation on ${beforeScene.date}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=77.3,23.1,77.5,23.3&bboxSR=4326&imageSR=4326&size=640,440&format=jpg&f=image';
                  }}
                />
              ) : (
                <div className="text-center text-slate-400 p-4">
                  <Satellite className="w-8 h-8 mx-auto mb-1 text-slate-600" />
                  <span className="text-xs">Baseline Satellite Image</span>
                </div>
              )}
            </div>
            <div className="p-2 bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-200">
              <span>{beforeScene.satellite}</span>
              <span>{beforeScene.cloudCover}% cloud cover</span>
            </div>
          </div>

          {/* After Image Preview */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-950 flex flex-col">
            <div className="p-2.5 bg-slate-900 text-white flex items-center justify-between text-xs">
              <span className="font-bold">After Image</span>
              <span className="text-slate-300 font-mono text-[11px]">{afterScene.date}</span>
            </div>
            <div className="relative aspect-16/10 bg-slate-900 flex items-center justify-center">
              {afterScene.thumbnailUrl ? (
                <img
                  src={afterScene.thumbnailUrl}
                  alt={`After observation on ${afterScene.date}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=77.3,23.1,77.5,23.3&bboxSR=4326&imageSR=4326&size=640,440&format=jpg&f=image';
                  }}
                />
              ) : (
                <div className="text-center text-slate-400 p-4">
                  <Satellite className="w-8 h-8 mx-auto mb-1 text-slate-600" />
                  <span className="text-xs">Comparison Satellite Image</span>
                </div>
              )}
            </div>
            <div className="p-2 bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-200">
              <span>{afterScene.satellite}</span>
              <span>{afterScene.cloudCover}% cloud cover</span>
            </div>
          </div>
        </div>

        {/* Change Map Container */}
        {mapComponent && (
          <div className="pt-2">
            <div className="text-xs font-semibold text-slate-800 mb-2">
              Detected Change Layer & Map
            </div>
            <div className="rounded-lg overflow-hidden border border-slate-200">
              {mapComponent}
            </div>
          </div>
        )}

        {/* Plain Language Summary */}
        {summary && (
          <div className="p-3 bg-slate-50 rounded border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
            <strong>Key Finding:</strong> {summary}
          </div>
        )}
      </div>

      {/* 5. Optional Technical Details Section (Collapsed by default) */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900"
        >
          <span>Technical Details & Metadata</span>
          {showTechnicalDetails ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs space-y-3 text-slate-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-900">Before Scene Information</div>
                <div className="font-mono text-[11px] truncate">ID: {beforeScene.id}</div>
                <div>Collection: {beforeScene.collection || 'sentinel-2-l2a'}</div>
                <div>Source: {beforeScene.source || sourceUsed}</div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-900">After Scene Information</div>
                <div className="font-mono text-[11px] truncate">ID: {afterScene.id}</div>
                <div>Collection: {afterScene.collection || 'sentinel-2-l2a'}</div>
                <div>Source: {afterScene.source || sourceUsed}</div>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-100 space-y-1">
              <div>
                <strong>Spectral Difference Method:</strong> {metrics.method}
              </div>
              <div>
                <strong>Index Formula:</strong> {metrics.indexUsed}
              </div>
              <div>
                <strong>Scene Overlap:</strong> {metrics.overlapPercentage}%
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleDownloadGeoJson}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Vector GeoJSON</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
