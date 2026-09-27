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
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  // Handle Search Execution from SearchPanel
  const handleSearchComplete = async (parsed: SemanticParsedQuery, geocode: GeocodeResult) => {
    setParsedQuery(parsed);
    setGeocodeData(geocode);
    setIsSearching(true);
    setSearchStatusMessage('Searching Copernicus Sentinel-2 L2A STAC catalog…');

    try {
      const res = await fetch('/api/satellite/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bbox: geocode.bbox,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          maxCloudCover: parsed.maxCloudCover,
          forceDemo: isDemoMode,
        }),
      });

      if (!res.ok) {
        throw new Error(`Satellite search error: HTTP ${res.status}`);
      }

      const json = await res.json();
      const retrievedScenes: SatelliteScene[] = json.scenes || [];
      setScenes(retrievedScenes);
      setDataModeNotice(json.demoNotice || json.message);

      // Auto-preselect sensible Before and After if at least 2 scenes exist
      if (retrievedScenes.length >= 2) {
        setBeforeScene(retrievedScenes[0]);
        setAfterScene(retrievedScenes[retrievedScenes.length - 1]);
      } else if (retrievedScenes.length === 1) {
        setBeforeScene(retrievedScenes[0]);
        setAfterScene(null);
      }

      // Automatically transition to catalog / map view if user was on explore
      setActiveTab('catalog');
    } catch (err: any) {
      console.error('Failed to retrieve satellite scenes:', err);
    } finally {
      setIsSearching(false);
      setSearchStatusMessage('');
    }
  };

  // Run Multi-temporal Analysis
  const handleRunAnalysis = async () => {
    if (!beforeScene || !afterScene) return;

    setIsAnalyzing(true);
    setActiveTab('analysis');

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

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || 'Multi-temporal change analysis computation failed.');
      }

      const result: AnalysisResult = await res.json();
      setAnalysisResult(result);
    } catch (err: any) {
      alert(`Analysis Notice: ${err.message}`);
    } finally {
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
                  onSelectBefore={setBeforeScene}
                  onSelectAfter={setAfterScene}
                  onFocusScene={(scene) => {
                    if (geocodeData) {
                      setGeocodeData({ ...geocodeData, bbox: scene.bbox });
                    }
                  }}
                  onRunAnalysis={handleRunAnalysis}
                  isAnalyzing={isAnalyzing}
                  dataModeNotice={dataModeNotice}
                  isDemo={isDemoMode}
                />
              </div>

              {/* Right Column: Interactive Map Inspection */}
              <div className="lg:col-span-5 sticky top-20 space-y-3">
                <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs">
                  <div className="text-xs font-semibold text-slate-800 mb-2 flex items-center justify-between">
                    <span>Geospatial Footprint & AOI</span>
                    <span className="font-mono text-slate-400">Sentinel-2 L2A</span>
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

        {/* Tab 3: Change Analysis & Interactive Map */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Dual Layer Map */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <div className="font-bold text-slate-900">
                      Multi-Temporal Observation Map
                    </div>
                    <div className="text-slate-500 font-mono text-[11px]">
                      {beforeScene?.acquisitionDate || 'T1'} vs {afterScene?.acquisitionDate || 'T2'}
                    </div>
                  </div>
                  <GeospatialMap
                    aoiBbox={analysisResult ? analysisResult.aoi : geocodeData ? geocodeData.bbox : null}
                    beforeScene={beforeScene}
                    afterScene={afterScene}
                    analysisResult={analysisResult}
                    selectedGridCell={selectedGridCell}
                    onSelectGridCell={setSelectedGridCell}
                  />
                </div>
              </div>

              {/* Right Column: Quantitative Dashboard */}
              <div className="lg:col-span-5 space-y-4">
                <AnalysisDashboard
                  analysis={analysisResult}
                  selectedGridCell={selectedGridCell}
                  onClearCell={() => setSelectedGridCell(null)}
                />
              </div>
            </div>
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
