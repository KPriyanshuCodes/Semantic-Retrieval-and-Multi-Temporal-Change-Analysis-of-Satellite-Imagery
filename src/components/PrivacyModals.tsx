import React, { useState } from 'react';
import { ShieldCheck, FileText, Cookie, KeyRound, CheckSquare, X, ExternalLink } from 'lucide-react';

interface PrivacyModalsProps {
  activeSection: 'privacy' | 'terms' | 'cookies' | 'rights';
  onClose: () => void;
  openCookieManager: () => void;
}

export const PrivacyModals: React.FC<PrivacyModalsProps> = ({
  activeSection,
  onClose,
  openCookieManager,
}) => {
  const [currentTab, setCurrentTab] = useState<'privacy' | 'terms' | 'cookies' | 'rights'>(activeSection);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-800" />
            <h2 className="text-base font-bold text-slate-900">
              Legal, Privacy & Compliance Disclosures
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-5 gap-4 text-xs font-medium">
          <button
            onClick={() => setCurrentTab('privacy')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              currentTab === 'privacy'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setCurrentTab('terms')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              currentTab === 'terms'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms & Conditions</span>
          </button>

          <button
            onClick={() => setCurrentTab('cookies')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              currentTab === 'cookies'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Cookie Policy</span>
          </button>

          <button
            onClick={() => setCurrentTab('rights')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              currentTab === 'rights'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Data Rights & DPDP</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          {currentTab === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">1. Information Collected</h3>
                <p>
                  GeoSemantic is a scientific research prototype. We adhere strictly to data minimisation
                  principles. We <strong>do not collect</strong> phone numbers, physical addresses, dates of
                  birth, or government identification. We only process:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Natural language geographic search queries entered into the search console.</li>
                  <li>Target bounding coordinates and selected satellite observation IDs.</li>
                  <li>Cookie and consent preference records.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">2. Purpose of Processing</h3>
                <p>
                  Data is processed exclusively to execute Spatio-Temporal Asset Catalog (STAC) queries, perform
                  geospatial area and spectral differencing calculations, and render visualizations.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">3. Third-Party Services</h3>
                <p>We interface exclusively with verified open services:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>
                    <strong>Copernicus Data Space Ecosystem (EU / ESA):</strong> Official Sentinel-2 STAC catalog.
                  </li>
                  <li>
                    <strong>OpenStreetMap Nominatim:</strong> Open geocoding provider (ODbL 1.0).
                  </li>
                  <li>
                    <strong>CartoDB / OpenStreetMap:</strong> Basemap tiles.
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900">
                <strong>Legal Disclaimer:</strong> Privacy controls are designed with Indian data-protection
                requirements in mind and should be reviewed for legal compliance before production deployment.
              </div>
            </div>
          )}

          {currentTab === 'terms' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">1. Research & Analysis Status</h3>
                <p>
                  This application is an Earth Observation and multi-temporal satellite change analysis platform.
                  It provides algorithmic change detection approximations and must not be used for legal land
                  boundary dispute arbitration, critical emergency disaster navigation, or structural engineering.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">2. Data Source Attribution</h3>
                <p>
                  Sentinel-2 satellite imagery is provided under European Commission Copernicus open data access
                  principles. Users of exported datasets must preserve the attribution:
                  <em> "Contains modified Copernicus Sentinel data [year]".</em>
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">3. Accuracy Disclaimer</h3>
                <p>
                  Spectral indices (NDVI, NDBI, NDWI) are empirical mathematical representations of surface reflectance.
                  They do not guarantee 100% categorical accuracy without field ground-truthing.
                </p>
              </div>
            </div>
          )}

          {currentTab === 'cookies' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Cookie Usage</h3>
                <p>
                  We categorize cookies into essential and optional buckets. You can change your choices at any
                  time:
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-semibold text-slate-900">1. Necessary Cookies (Strictly Required)</div>
                  <div className="text-slate-600 mt-0.5">
                    Maintains user UI session state, active AOI bounding box, and selected Before/After satellite scenes.
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-semibold text-slate-900">2. Analytics Cookies (Optional)</div>
                  <div className="text-slate-600 mt-0.5">
                    Aggregated, non-identifying telemetry on STAC query response latencies to optimize caching.
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    onClose();
                    openCookieManager();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                >
                  Manage Cookie Preferences
                </button>
              </div>
            </div>
          )}

          {currentTab === 'rights' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Data Rights & Indian DPDP Act Compliance Framework
                </h3>
                <p>
                  In alignment with the Digital Personal Data Protection (DPDP) principles of data minimisation,
                  purpose specification, and rights of the data principal:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li><strong>Right to Correction & Erasure:</strong> Instant deletion of all query and analysis history.</li>
                  <li><strong>Right to Grievance Redressal:</strong> Direct contact channel provided in documentation.</li>
                  <li><strong>Right to Nominate:</strong> Accessible data export controls.</li>
                </ul>
              </div>

              {/* Developer Internal Checklist */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-2">
                <div className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Internal Developer DPDP Compliance Audit Checklist
                </div>
                <div className="space-y-1 text-slate-600 font-mono text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Data Minimisation: Zero PII or unnecessary identifiers stored</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>No Pre-ticked Optional Consent: Granular opt-in only</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Third-Party Transparency: Copernicus STAC & Nominatim cited</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>One-Click Permanent Deletion: DELETE /api/history operational</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>No False Claims: Labeled as scientific research prototype</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
