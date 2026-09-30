import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { SearchPanel } from './components/SearchPanel';
import { SceneList } from './components/SceneList';
import { GeospatialMap } from './components/GeospatialMap';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { HistoryPanel } from './components/HistoryPanel';
import { PrivacyModals } from './components/PrivacyModals';
import { CookieBanner } from './components/CookieBanner';
import { SemanticParsedQuery, GeocodeResult, SatelliteScene, AnalysisResult, CookiePreferences } from './types';
import { computeClientAnalysis } from './utils/clientFallbackSearch';
import {
  recommendSatellitePair,
  validatePairSelection,
  RecommendationResult,
  SelectionValidation,
} from './utils/sceneRecommendation';
import { ShieldCheck, Compass, Database, Layers, ExternalLink, Satellite } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'explore' | 'catalog' | 'analysis' | 'history' | 'privacy'>('explore');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Search & Geolocation State
  const [parsedQuery, setParsedQuery] = useState<SemanticParsedQuery | null>(null);
  const [geocodeData, setGeocodeData] = useState<GeocodeResult | null>(null);
  const [scenes, setScenes] = useState<SatelliteScene[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatusMessage, setSearchStatusMessage] = useState('');
  const [dataModeNotice, setDataModeNotice] = useState<string | undefined>(undefined);

  // Selection & Analysis State
  const [beforeScene, setBeforeScene] = useState<SatelliteScene | null>(null);
  const [afterScene, setAfterScene] = useState<SatelliteScene | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [selectionValidation, setSelectionValidation] = useState<SelectionValidation>({ valid: true });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(1);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedGridCell, setSelectedGridCell] = useState<any | null>(null);

  // Privacy & Consent State
  const [privacyModalSection, setPrivacyModalSection] = useState<'privacy' | 'terms' | 'cookies' | 'rights' | null>(null);
  const [forceOpenCookieManager, setForceOpenCookieManager] = useState(false);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  React.useEffect(() => {
    const handler = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  const [multiSearchResult, setMultiSearchResult] = useState<any | null>(null);
  const [activeSourceFilter, setActiveSourceFilter] = useState<'all' | 'sentinel2' | 'landsat'>('all');

  // Handle Search Execution from SearchPanel
  const handleSearchComplete = async (
    parsed: SemanticParsedQuery,
    geocode: GeocodeResult,
    multiResult: any = multiSearchResult
  ) => {
    setParsedQuery(parsed);
    setGeocodeData(geocode);
    setAnalysisResult(null); // Clear previous analysis for new location
    setSelectedGridCell(null);
    setIsSearching(true);

    setSearchStatusMessage(
      `Querying Copernicus Sentinel-2 and Google Earth Engine Landsat in parallel for ${geocode.place || parsed.location}…`
    );

    try {
      let data = multiResult;
      if (!data && geocode) {
        const multiRes = await fetch('/api/satellite/multi-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bbox: geocode.bbox,
            startDate: parsed.startDate,
            endDate: parsed.endDate,
            maxCloudCover: parsed.maxCloudCover,
            location: geocode.place,
          }),
        });
        data = await multiRes.json();
      }

      setMultiSearchResult(data);
      const s2Scenes = data?.sentinel2?.scenes || [];
      const landsatScenes = data?.landsat?.scenes || [];
      const allScenes = [...s2Scenes, ...landsatScenes];

      setScenes(allScenes);
      setActiveSourceFilter('all');

      // Proper Chronological and Data-Quality-Based Recommendation
      const rec = recommendSatellitePair(
        allScenes,
        parsed.startDate,
        parsed.endDate,
        geocode.bbox
      );

      setRecommendation(rec);
      setBeforeScene(rec.beforeScene);
      setAfterScene(rec.afterScene);

      const val = validatePairSelection(rec.beforeScene, rec.afterScene, geocode.bbox);
      setSelectionValidation(val);

      setDataModeNotice('Satellite search complete. Review optimal chronological recommendations below.');
      setActiveTab('catalog');
    } catch (err: any) {
      console.error('Multi-source search failed:', err);
    } finally {
      setIsSearching(false);
      setSearchStatusMessage('');
    }
  };

  // User Manual Selection Handlers with Validation
  const handleSelectBefore = (scene: SatelliteScene) => {
    setBeforeScene(scene);
    const val = validatePairSelection(scene, afterScene, geocodeData?.bbox);
    setSelectionValidation(val);
  };

  const handleSelectAfter = (scene: SatelliteScene) => {
    setAfterScene(scene);
    const val = validatePairSelection(beforeScene, scene, geocodeData?.bbox);
    setSelectionValidation(val);
  };

  // Run Multi-temporal Analysis
  const handleRunAnalysis = async () => {
    if (!beforeScene || !afterScene || !selectionValidation.valid) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStep(1);
    setActiveTab('analysis');

    const t1 = setTimeout(() => setAnalysisStep(2), 250);
    const t2 = setTimeout(() => setAnalysisStep(3), 500);

    try {
      setAnalysisStep(4);
      let result: AnalysisResult | null = null;

      try {
        const res = await fetch('/api/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            beforeScene,
            afterScene,
            analysisType: parsedQuery?.analysisType || 'urban',
            locationName: parsedQuery?.location || geocodeData?.place || 'Selected Region',
            aoi: geocodeData?.bbox,
          }),
        });

        if (res.ok) {
          result = await res.json();
        }
      } catch (netErr) {
        console.warn('Network call to /api/analysis failed, using local analysis computation engine:', netErr);
      }

      if (!result) {
        result = computeClientAnalysis(
          beforeScene,
          afterScene,
          parsedQuery?.analysisType || 'vegetation',
          parsedQuery?.location || geocodeData?.place || 'Selected Region',
          geocodeData?.bbox
        );
      }

      setAnalysisStep(5);
      setAnalysisStep(6);
      await new Promise((r) => setTimeout(r, 200));
      setAnalysisResult(result);
    } catch (err: any) {
      // Guaranteed safe fallback
      const fallbackResult = computeClientAnalysis(
        beforeScene,
        afterScene,
        parsedQuery?.analysisType || 'vegetation',
        parsedQuery?.location || geocodeData?.place || 'Selected Region',
        geocodeData?.bbox
      );
      setAnalysisResult(fallbackResult);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Header / Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDemoMode={isDemoMode}
        setIsDemoMode={(val) => {
          setIsDemoMode(val);
          // Re-query if we already have geocode data
          if (parsedQuery && geocodeData) {
            handleSearchComplete(parsedQuery, geocodeData);
          }
        }}
        openPrivacyModal={(sec) => setPrivacyModalSection(sec)}
      />

      {/* Google Maps Demo Quota Notification */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-16 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Main App Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Tab 1: Explore & Semantic Query */}
        {activeTab === 'explore' && (
          <div className="space-y-6">
            <SearchPanel
              onSearchComplete={handleSearchComplete}
              isSearching={isSearching}
              searchStatusMessage={searchStatusMessage}
            />

            {/* Quick Map Preview if AOI is present */}
            {geocodeData && (
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">
                    Geographic Boundary Focus: {geocodeData.displayName}
                  </div>
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="text-xs font-semibold text-slate-900 hover:text-cyan-700 flex items-center gap-1"
                  >
                    <span>View Satellite Catalog ({scenes.length})</span>
                    <span>→</span>
                  </button>
                </div>
                <GeospatialMap
                  aoiBbox={geocodeData.bbox}
                  beforeScene={beforeScene}
                  afterScene={afterScene}
                  analysisResult={analysisResult}
                  selectedGridCell={selectedGridCell}
                  onSelectGridCell={setSelectedGridCell}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Satellite Catalog & Observations */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Scene List */}
              <div className="lg:col-span-7 space-y-4">
                <SceneList
                  scenes={scenes}
                  beforeScene={beforeScene}
                  afterScene={afterScene}
                  onSelectBefore={handleSelectBefore}
                  onSelectAfter={handleSelectAfter}
                  recommendation={recommendation}
                  selectionValidation={selectionValidation}
                  requestedStartDate={parsedQuery?.startDate || '2020-01-01'}
                  requestedEndDate={parsedQuery?.endDate || '2026-12-31'}
                  onFocusScene={(scene) => {
                    if (geocodeData) {
                      setGeocodeData({ ...geocodeData, bbox: scene.bbox });
                    }
                  }}
                  onRunAnalysis={handleRunAnalysis}
                  isAnalyzing={isAnalyzing}
                  dataModeNotice={dataModeNotice}
                  isDemo={isDemoMode}
                  locationName={geocodeData?.displayName || parsedQuery?.location || 'Selected Region'}
                  multiSearchResult={multiSearchResult}
                  activeSourceFilter={activeSourceFilter}
                  setActiveSourceFilter={setActiveSourceFilter}
                  onIncreaseDateRange={async () => {
                    if (!parsedQuery || !geocodeData) return;
                    const startYear = parseInt(parsedQuery.startDate.slice(0, 4), 10) - 2;
                    const endYear = parseInt(parsedQuery.endDate.slice(0, 4), 10) + 1;
                    const updated = {
                      ...parsedQuery,
                      startDate: `${startYear}-01-01`,
                      endDate: `${endYear}-12-31`,
                    };
                    const multiRes = await fetch('/api/satellite/multi-search', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        bbox: geocodeData.bbox,
                        startDate: updated.startDate,
                        endDate: updated.endDate,
                        maxCloudCover: updated.maxCloudCover,
                        location: geocodeData.place,
                      }),
                    });
                    const multiData = await multiRes.json();
                    handleSearchComplete(updated, geocodeData, multiData);
                  }}
                  onIncreaseCloudLimit={async () => {
                    if (!parsedQuery || !geocodeData) return;
                    const updated = {
                      ...parsedQuery,
                      maxCloudCover: Math.min(60, parsedQuery.maxCloudCover + 20),
                    };
                    const multiRes = await fetch('/api/satellite/multi-search', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        bbox: geocodeData.bbox,
                        startDate: updated.startDate,
                        endDate: updated.endDate,
                        maxCloudCover: updated.maxCloudCover,
                        location: geocodeData.place,
                      }),
                    });
                    const multiData = await multiRes.json();
                    handleSearchComplete(updated, geocodeData, multiData);
                  }}
                  onChangeLocation={() => setActiveTab('explore')}
                />
              </div>

              {/* Right Column: Interactive Map Inspection */}
              <div className="lg:col-span-5 sticky top-20 space-y-3">
                <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs">
                  <div className="text-xs font-semibold text-slate-800 mb-2 flex items-center justify-between">
                    <span>Target Area Map</span>
                    <span className="text-[11px] text-slate-500">Selected Coverage</span>
                  </div>
                  <GeospatialMap
                    aoiBbox={geocodeData ? geocodeData.bbox : null}
                    beforeScene={beforeScene}
                    afterScene={afterScene}
                    analysisResult={analysisResult}
                    selectedGridCell={selectedGridCell}
                    onSelectGridCell={setSelectedGridCell}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Change Analysis Results */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <AnalysisDashboard
              analysis={analysisResult}
              selectedGridCell={selectedGridCell}
              onClearCell={() => setSelectedGridCell(null)}
              onBackToCatalog={() => setActiveTab('catalog')}
              onRetryAnalysis={handleRunAnalysis}
              isAnalyzing={isAnalyzing}
              analysisStep={analysisStep}
              analysisError={analysisError}
              mapComponent={
                <GeospatialMap
                  aoiBbox={analysisResult ? analysisResult.aoi : geocodeData ? geocodeData.bbox : null}
                  beforeScene={beforeScene}
                  afterScene={afterScene}
                  analysisResult={analysisResult}
                  selectedGridCell={selectedGridCell}
                  onSelectGridCell={setSelectedGridCell}
                />
              }
            />
          </div>
        )}

        {/* Tab 4: Audit & Search History */}
        {activeTab === 'history' && <HistoryPanel />}

        {/* Tab 5: Privacy & DPDP Compliance Overview */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-slate-900" />
                <h2 className="text-xl font-bold text-slate-900">Privacy, Governance & Data Rights</h2>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                GeoSemantic adheres to privacy-by-design standards aligned with Indian data-protection principles.
                Review our comprehensive legal and technical notices below or adjust your cookie preferences.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => setPrivacyModalSection('privacy')}
                  className="p-4 rounded border border-slate-200 hover:border-slate-900 text-left transition-colors bg-slate-50/50"
                >
                  <div className="font-semibold text-slate-900 text-sm mb-1">Privacy Policy</div>
                  <div className="text-xs text-slate-600">
                    Transparent disclosure of data minimisation, processing purpose, and third parties.
                  </div>
                </button>

                <button
                  onClick={() => setPrivacyModalSection('terms')}
                  className="p-4 rounded border border-slate-200 hover:border-slate-900 text-left transition-colors bg-slate-50/50"
                >
                  <div className="font-semibold text-slate-900 text-sm mb-1">Terms & Conditions</div>
                  <div className="text-xs text-slate-600">
                    Prototype limitations, research usage guidelines, and Sentinel-2 licensing terms.
                  </div>
                </button>

                <button
                  onClick={() => setPrivacyModalSection('cookies')}
                  className="p-4 rounded border border-slate-200 hover:border-slate-900 text-left transition-colors bg-slate-50/50"
                >
                  <div className="font-semibold text-slate-900 text-sm mb-1">Cookie Policy</div>
                  <div className="text-xs text-slate-600">
                    Granular consent controls separating necessary state cookies from optional metrics.
                  </div>
                </button>

                <button
                  onClick={() => setPrivacyModalSection('rights')}
                  className="p-4 rounded border border-slate-200 hover:border-slate-900 text-left transition-colors bg-slate-50/50"
                >
                  <div className="font-semibold text-slate-900 text-sm mb-1">Data Rights & DPDP Audit</div>
                  <div className="text-xs text-slate-600">
                    Data subject rights, instant history erasure tools, and internal developer checklist.
                  </div>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Need to adjust your current cookie permissions?
                </span>
                <button
                  onClick={() => setForceOpenCookieManager(true)}
                  className="px-3 py-1.5 font-semibold text-slate-900 border border-slate-300 hover:bg-slate-100 rounded transition-colors"
                >
                  Change Cookie Preferences
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">GeoSemantic</span> · Earth Observation & Satellite Change Detection
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setPrivacyModalSection('privacy')}
              className="hover:text-slate-900 transition-colors"
            >
              Privacy Policy
            </button>
            <span>·</span>
            <button
              onClick={() => setPrivacyModalSection('terms')}
              className="hover:text-slate-900 transition-colors"
            >
              Terms
            </button>
            <span>·</span>
            <button
              onClick={() => setPrivacyModalSection('cookies')}
              className="hover:text-slate-900 transition-colors"
            >
              Cookies
            </button>
            <span>·</span>
            <button
              onClick={() => setPrivacyModalSection('rights')}
              className="hover:text-slate-900 transition-colors"
            >
              Data Rights
            </button>
            <span>·</span>
            <a
              href="https://dataspace.copernicus.eu/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors inline-flex items-center gap-1"
            >
              <span>Copernicus Ecosystem</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      </footer>

      {/* Privacy / Legal Modals */}
      {privacyModalSection && (
        <PrivacyModals
          activeSection={privacyModalSection}
          onClose={() => setPrivacyModalSection(null)}
          openCookieManager={() => setForceOpenCookieManager(true)}
        />
      )}

      {/* Cookie Consent Banner & Preferences Manager */}
      <CookieBanner
        onPreferencesSaved={(prefs) => {
          console.log('Saved cookie preferences:', prefs);
        }}
        forceOpenManager={forceOpenCookieManager}
        onCloseManager={() => setForceOpenCookieManager(false)}
      />
    </div>
  );
}
