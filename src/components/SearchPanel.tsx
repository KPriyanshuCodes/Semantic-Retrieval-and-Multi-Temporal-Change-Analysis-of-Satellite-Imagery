import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  Cloud,
  Compass,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SemanticParsedQuery, GeocodeResult, GeocodeCandidate, AnalysisType } from '../types';
import { executeClientFallbackSearch } from '../utils/clientFallbackSearch';

interface SearchPanelProps {
  onSearchComplete: (
    parsed: SemanticParsedQuery,
    geocode: GeocodeResult,
    multiResult: any
  ) => void;
  isSearching: boolean;
  searchStatusMessage: string;
}

const SAMPLE_QUERIES = [
  'Show forest changes in Bhopal between 2020 and 2026',
  'Show urban expansion in Mumbai from 2020 to 2025',
  'Show vegetation changes around Bengaluru between 2019 and 2024',
  'Analyze Delhi urban growth from 2020 to 2026',
  'Show water-body changes near Hyderabad',
];

export const SearchPanel: React.FC<SearchPanelProps> = ({
  onSearchComplete,
  isSearching,
  searchStatusMessage,
}) => {
  const [queryText, setQueryText] = useState('');
  const [parsedData, setParsedData] = useState<SemanticParsedQuery | null>(null);
  const [geocodeData, setGeocodeData] = useState<GeocodeResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<GeocodeCandidate | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Missing location prompt state
  const [manualLocationInput, setManualLocationInput] = useState('');
  const [awaitingLocationInput, setAwaitingLocationInput] = useState(false);

  // Quick editable parameters
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [overrideStartDate, setOverrideStartDate] = useState('2020-01-01');
  const [overrideEndDate, setOverrideEndDate] = useState('2026-12-31');
  const [overrideType, setOverrideType] = useState<AnalysisType>('vegetation');

  const handleRunSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = (customQuery !== undefined ? customQuery : queryText).trim();
    if (!query) {
      setErrorMessage('Please enter a location or analysis query.');
      setParsedData(null);
      setGeocodeData(null);
      setAwaitingLocationInput(false);
      return;
    }

    setErrorMessage(null);
    setAwaitingLocationInput(false);
    setSelectedCandidate(null);

    try {
      let data: any = null;

      // 1. Try unified fast API
      try {
        const res = await fetch('/api/search-full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        if (res.ok) {
          data = await res.json();
        }
      } catch (networkErr) {
        console.warn('Network call to /api/search-full failed, activating resilient local engine:', networkErr);
      }

      // 2. Seamless local fallback if server response was missing or non-200
      if (!data || !data.parsed) {
        data = await executeClientFallbackSearch(query);
      }

      const parsed: SemanticParsedQuery = data.parsed;
      setParsedData(parsed);

      setOverrideStartDate(parsed.startDate);
      setOverrideEndDate(parsed.endDate);
      setOverrideType(parsed.analysisType);

      // Validate location existence from query
      if (!parsed.location || !parsed.location.trim()) {
        setAwaitingLocationInput(true);
        setErrorMessage('Please specify the city or region you want to analyze.');
        return;
      }

      if (!data.geocode?.found) {
        setAwaitingLocationInput(true);
        setErrorMessage(
          data.geocode?.error || `Could not find coordinates for "${parsed.location}". Please check spelling.`
        );
        return;
      }

      setGeocodeData(data.geocode);
      if (data.geocode.candidates && data.geocode.candidates.length > 0) {
        setSelectedCandidate(data.geocode.candidates[0]);
      }

      onSearchComplete(parsed, data.geocode, data.multiResult);
    } catch (err: any) {
      // Final catch: ensure fallback always displays results or prompts location
      try {
        const fallback = await executeClientFallbackSearch(query);
        if (fallback.parsed) setParsedData(fallback.parsed);
        if (!fallback.parsed?.location || !fallback.parsed.location.trim()) {
          setAwaitingLocationInput(true);
          setErrorMessage('Please specify the city or region you want to analyze.');
          return;
        }
        if (!fallback.geocode?.found) {
          setAwaitingLocationInput(true);
          setErrorMessage(
            fallback.geocode?.error || `Could not find coordinates for "${fallback.parsed.location}". Please check spelling.`
          );
          return;
        }
        setGeocodeData(fallback.geocode);
        onSearchComplete(fallback.parsed, fallback.geocode, fallback.multiResult);
      } catch {
        setErrorMessage(
          err?.message || 'Error searching satellite data. Please verify your query or location.'
        );
      }
    }
  };

  const executeGeocode = async (locationStr: string, currentParsed: SemanticParsedQuery) => {
    try {
      let data: any = null;
      try {
        const res = await fetch('/api/search-full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: locationStr,
            location: locationStr,
            startDate: currentParsed.startDate,
            endDate: currentParsed.endDate,
            maxCloudCover: currentParsed.maxCloudCover,
          }),
        });

        if (res.ok) {
          data = await res.json();
        }
      } catch (netErr) {
        console.warn('Network call to /api/search-full failed, using local engine:', netErr);
      }

      if (!data || !data.geocode) {
        data = await executeClientFallbackSearch(
          locationStr,
          locationStr,
          currentParsed.startDate,
          currentParsed.endDate
        );
      }

      if (!data.geocode?.found) {
        setAwaitingLocationInput(true);
        setErrorMessage(
          data.geocode?.error || `Could not find coordinates for "${locationStr}". Please check spelling.`
        );
        return;
      }

      setGeocodeData(data.geocode);
      if (data.geocode.candidates && data.geocode.candidates.length > 0) {
        setSelectedCandidate(data.geocode.candidates[0]);
      }

      onSearchComplete(currentParsed, data.geocode, data.multiResult);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to search satellite catalogs.');
    }
  };

  const handleSelectCandidate = async (candidate: GeocodeCandidate) => {
    setSelectedCandidate(candidate);
    const updatedGeocode: GeocodeResult = {
      found: true,
      place: candidate.place,
      displayName: candidate.displayName,
      lat: candidate.lat,
      lon: candidate.lon,
      bbox: candidate.bbox,
      attribution: geocodeData?.attribution || 'OpenStreetMap',
      candidates: geocodeData?.candidates,
    };
    setGeocodeData(updatedGeocode);

    if (parsedData) {
      const updatedParsed: SemanticParsedQuery = {
        ...parsedData,
        location: candidate.place,
      };
      setParsedData(updatedParsed);
      await executeGeocode(candidate.place, updatedParsed);
    }
  };

  const handleManualLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLocationInput.trim()) return;

    setErrorMessage(null);
    setAwaitingLocationInput(false);

    const baseParsed: SemanticParsedQuery = parsedData || {
      location: manualLocationInput.trim(),
      startDate: '2020-01-01',
      endDate: '2026-12-31',
      analysisType: 'vegetation',
      maxCloudCover: 20,
      satellite: 'Sentinel-2',
      collection: 'sentinel-2-l2a',
      confidence: 1.0,
      needsClarification: false,
    };

    const updatedParsed: SemanticParsedQuery = {
      ...baseParsed,
      location: manualLocationInput.trim(),
      needsClarification: false,
    };

    setParsedData(updatedParsed);
    await executeGeocode(manualLocationInput.trim(), updatedParsed);
  };

  const handleApplyAdjustments = async () => {
    if (!parsedData || !geocodeData) return;
    const updated: SemanticParsedQuery = {
      ...parsedData,
      startDate: overrideStartDate,
      endDate: overrideEndDate,
      analysisType: overrideType,
    };
    setParsedData(updated);
    await executeGeocode(geocodeData.place, updated);
  };

  return (
    <div className="space-y-4">
      {/* Primary Query Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <div className="max-w-3xl">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-4">
            Search Satellite Imagery
          </h1>

          <form onSubmit={handleRunSearch} className="space-y-3">
            <div className="relative flex items-center">
              <input
                type="text"
                value={queryText}
                onChange={(e) => {
                  setQueryText(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Search satellite imagery by location, theme, or date range..."
                className={`w-full pl-10 pr-32 py-3 text-sm rounded-md border ${
                  errorMessage
                    ? 'border-red-400 focus:ring-2 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-2 focus:ring-slate-900'
                } focus:outline-none focus:border-transparent text-slate-900 placeholder:text-slate-400`}
                disabled={isSearching}
                aria-label="Natural language satellite search query"
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? 'search-error-msg' : undefined}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded transition-colors flex items-center gap-1.5"
                aria-label="Search satellite data"
              >
                <span>{isSearching ? 'Searching…' : 'Search Data'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Sample Queries */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] text-slate-500 font-medium mr-1">Examples:</span>
              {SAMPLE_QUERIES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQueryText(sample);
                    if (errorMessage) setErrorMessage(null);
                    handleRunSearch(undefined, sample);
                  }}
                  className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors text-left"
                >
                  {sample}
                </button>
              ))}
            </div>
          </form>

          {/* Status Banner */}
          {isSearching && (
            <div className="mt-4 p-3 bg-slate-100 border border-slate-200 rounded text-xs text-slate-800 flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>{searchStatusMessage || 'Searching satellite data catalogs...'}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div
              id="search-error-msg"
              role="alert"
              aria-live="assertive"
              className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-xs font-medium text-red-800 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Explicit Location Input if Missing in Query */}
          {awaitingLocationInput && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <HelpCircle className="w-4 h-4 text-amber-700" />
                <span>Specify Location</span>
              </div>
              <p className="text-xs text-amber-800">
                Please enter the target city or region to search satellite images:
              </p>
              <form onSubmit={handleManualLocationSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualLocationInput}
                  onChange={(e) => setManualLocationInput(e.target.value)}
                  placeholder="e.g. Bhopal, Mumbai, Bengaluru"
                  className="flex-1 text-xs p-2 rounded border border-amber-300 bg-white text-slate-900 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!manualLocationInput.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                >
                  Search
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Interpreted Request & Location Confirmation */}
      {parsedData && geocodeData && geocodeData.found && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Interpreted Request
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAdjustments(!showAdjustments)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                {showAdjustments ? 'Hide Adjustments' : 'Adjust Dates/Type'}
              </button>
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
              >
                <span>Details</span>
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Clean Key Request Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded border border-slate-100">
              <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Location</span>
              </div>
              <div className="text-xs font-bold text-slate-900 truncate" title={geocodeData.displayName}>
                {geocodeData.place || parsedData.location}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-100">
              <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-0.5">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Period</span>
              </div>
              <div className="text-xs font-bold text-slate-900">
                {parsedData.startDate.slice(0, 10)} → {parsedData.endDate.slice(0, 10)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-100">
              <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-0.5">
                <Compass className="w-3 h-3 text-slate-400" />
                <span>Change Category</span>
              </div>
              <div className="text-xs font-bold text-slate-900 capitalize">
                {parsedData.analysisType === 'vegetation'
                  ? 'Vegetation / Forest'
                  : parsedData.analysisType === 'urban'
                  ? 'Urban / Construction'
                  : parsedData.analysisType === 'water'
                  ? 'Water Bodies'
                  : 'General Land Change'}
              </div>
            </div>
          </div>

          {/* Quick Adjustments */}
          {showAdjustments && (
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3 rounded">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={overrideStartDate}
                  onChange={(e) => setOverrideStartDate(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={overrideEndDate}
                  onChange={(e) => setOverrideEndDate(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Change Type</label>
                <div className="flex gap-2">
                  <select
                    value={overrideType}
                    onChange={(e) => setOverrideType(e.target.value as AnalysisType)}
                    className="flex-1 text-xs p-1.5 rounded border border-slate-300 bg-white"
                  >
                    <option value="vegetation">Vegetation / Forest</option>
                    <option value="urban">Urban / Construction</option>
                    <option value="water">Water Bodies</option>
                    <option value="general">General Change</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyAdjustments}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Optional Details Section (Coordinates & Ambiguity Candidates) */}
          {showDetails && (
            <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-2">
              <div>
                <strong>Matched Area:</strong> {geocodeData.displayName}
              </div>
              {geocodeData.candidates && geocodeData.candidates.length > 1 && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700">Matched locations:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {geocodeData.candidates.map((cand, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectCandidate(cand)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          selectedCandidate?.displayName === cand.displayName
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {cand.place} ({cand.displayName.split(',')[1]?.trim() || 'Region'})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
