import React, { useState } from 'react';
import { Search, MapPin, Calendar, Cloud, Compass, ArrowRight, AlertCircle, Sparkles, Sliders } from 'lucide-react';
import { SemanticParsedQuery, GeocodeResult, AnalysisType } from '../types';

interface SearchPanelProps {
  onSearchComplete: (parsed: SemanticParsedQuery, geocode: GeocodeResult) => void;
  isSearching: boolean;
  searchStatusMessage: string;
}

const SAMPLE_QUERIES = [
  'Show urban expansion near Delhi between 2020 and 2025',
  'Find vegetation loss around Mumbai between 2019 and 2024',
  'Show changes in water bodies near Bengaluru',
  'Compare this area before and after 2023 with low cloud cover',
];

export const SearchPanel: React.FC<SearchPanelProps> = ({
  onSearchComplete,
  isSearching,
  searchStatusMessage,
}) => {
  const [queryText, setQueryText] = useState('Show urban expansion near Delhi between 2020 and 2025');
  const [parsedData, setParsedData] = useState<SemanticParsedQuery | null>(null);
  const [geocodeData, setGeocodeData] = useState<GeocodeResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOverrides, setShowOverrides] = useState(false);

  // Editable parameters for user override
  const [overrideLocation, setOverrideLocation] = useState('Delhi');
  const [overrideStartDate, setOverrideStartDate] = useState('2020-01-01');
  const [overrideEndDate, setOverrideEndDate] = useState('2025-12-31');
  const [overrideType, setOverrideType] = useState<AnalysisType>('urban');
  const [overrideCloud, setOverrideCloud] = useState(20);

  const handleRunSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = customQuery || queryText;
    if (!query.trim()) return;

    setErrorMessage(null);

    try {
      // 1. Semantic query intent parsing
      const parseRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!parseRes.ok) {
        throw new Error('Failed to interpret natural language query.');
      }

      const parseJson = await parseRes.json();
      const parsed: SemanticParsedQuery = parseJson.parsed;
      setParsedData(parsed);

      // Sync overrides with parsed parameters
      setOverrideLocation(parsed.location);
      setOverrideStartDate(parsed.startDate);
      setOverrideEndDate(parsed.endDate);
      setOverrideType(parsed.analysisType);
      setOverrideCloud(parsed.maxCloudCover);

      // 2. Geocoding location to real bounding box
      const geoRes = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place: parsed.location }),
      });

      if (!geoRes.ok) {
        throw new Error('Geocoding service unavailable for specified location.');
      }

      const geoJson: GeocodeResult = await geoRes.json();
      setGeocodeData(geoJson);

      // Notify parent to fetch satellite scenes
      onSearchComplete(parsed, geoJson);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Error processing search. Please check your query or specify location directly.'
      );
    }
  };

  const handleApplyOverrides = async () => {
    if (!overrideLocation.trim()) return;
    setErrorMessage(null);

    try {
      const geoRes = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place: overrideLocation }),
      });
      const geoJson: GeocodeResult = await geoRes.json();
      setGeocodeData(geoJson);

      const updatedParsed: SemanticParsedQuery = {
        location: overrideLocation,
        startDate: overrideStartDate,
        endDate: overrideEndDate,
        analysisType: overrideType,
        maxCloudCover: overrideCloud,
        satellite: 'Sentinel-2',
        collection: 'sentinel-2-l2a',
        confidence: 1.0,
        method: 'User Configured Overrides',
      };

      setParsedData(updatedParsed);
      onSearchComplete(updatedParsed, geoJson);
    } catch (err: any) {
      setErrorMessage('Failed to geocode overridden location.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Primary Query Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
            Semantic Satellite Query & Retrieval
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Enter a natural language request. The system extracts geospatial boundaries, temporal intervals,
            and Earth observation themes, then queries the official Copernicus Sentinel-2 L2A STAC archive.
          </p>

          <form onSubmit={handleRunSearch} className="space-y-3">
            <div className="relative flex items-center">
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="e.g. Show urban expansion near Delhi between 2020 and 2025"
                className="w-full pl-11 pr-28 py-3 text-sm rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400"
                disabled={isSearching}
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <button
                type="submit"
                disabled={isSearching || !queryText.trim()}
                className="absolute right-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded transition-colors flex items-center gap-1.5"
              >
                <span>{isSearching ? 'Processing…' : 'Search STAC'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Sample Queries */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-slate-600 font-medium mr-1">Quick examples:</span>
              {SAMPLE_QUERIES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQueryText(sample);
                    handleRunSearch(undefined, sample);
                  }}
                  className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors text-left"
                >
                  {sample}
                </button>
              ))}
            </div>
          </form>

          {/* Status / Loading Banner */}
          {isSearching && (
            <div className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded text-xs text-cyan-900 flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-cyan-700 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>{searchStatusMessage || 'Searching satellite catalog…'}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Extracted Parameters & Geocoding Details */}
      {parsedData && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-800">
                Extracted Query Parameters
              </h2>
              <span className="text-xs text-slate-600 font-mono">
                ({parsedData.method || 'Geospatial NLP Parser'})
              </span>
            </div>
            <button
              onClick={() => setShowOverrides(!showOverrides)}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showOverrides ? 'Hide Overrides' : 'Adjust Parameters'}</span>
            </button>
          </div>

          {/* Parameter Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-3 bg-slate-50 rounded border border-slate-100">
              <div className="text-xs text-slate-600 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Geographic Target</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">{parsedData.location}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-100">
              <div className="text-xs text-slate-600 flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Start Baseline</span>
              </div>
              <div className="text-sm font-semibold font-mono text-slate-900">{parsedData.startDate}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-100">
              <div className="text-xs text-slate-600 flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>End Observation</span>
              </div>
              <div className="text-sm font-semibold font-mono text-slate-900">{parsedData.endDate}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-100">
              <div className="text-xs text-slate-600 flex items-center gap-1 mb-1">
                <Compass className="w-3.5 h-3.5 text-slate-500" />
                <span>Analysis Theme</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 capitalize">
                {parsedData.analysisType} Change
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-100">
              <div className="text-xs text-slate-600 flex items-center gap-1 mb-1">
                <Cloud className="w-3.5 h-3.5 text-slate-500" />
                <span>Max Cloud Cover</span>
              </div>
              <div className="text-sm font-semibold font-mono text-slate-900">
                ≤ {parsedData.maxCloudCover}%
              </div>
            </div>
          </div>

          {/* Geocoding Attribution & BBox Information */}
          {geocodeData && (
            <div className="text-xs text-slate-600 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-slate-100">
              <div>
                <span className="font-medium text-slate-700">AOI Coordinates (WGS84):</span>{' '}
                <span className="font-mono">
                  [{geocodeData.bbox.map((v) => v.toFixed(3)).join(', ')}]
                </span>
                <span className="ml-2">· Center: {geocodeData.lat.toFixed(4)}°N, {geocodeData.lon.toFixed(4)}°E</span>
              </div>
              <div className="text-slate-600 text-[11px]">
                Geocoded via OpenStreetMap Nominatim
              </div>
            </div>
          )}

          {/* Manual Overrides Accordion */}
          {showOverrides && (
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50/80 p-4 rounded">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={overrideLocation}
                  onChange={(e) => setOverrideLocation(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={overrideStartDate}
                  onChange={(e) => setOverrideStartDate(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={overrideEndDate}
                  onChange={(e) => setOverrideEndDate(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Analysis Type</label>
                <select
                  value={overrideType}
                  onChange={(e) => setOverrideType(e.target.value as AnalysisType)}
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                >
                  <option value="urban">Urban / Built-up (NDBI)</option>
                  <option value="vegetation">Vegetation (NDVI)</option>
                  <option value="water">Water Bodies (NDWI)</option>
                  <option value="general">General (Change Vector)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleApplyOverrides}
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                >
                  Apply & Re-query
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
