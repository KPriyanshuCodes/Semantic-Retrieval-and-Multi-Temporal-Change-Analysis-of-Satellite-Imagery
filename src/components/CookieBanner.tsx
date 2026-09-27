import React, { useState, useEffect } from 'react';
import { Cookie, Settings, Check, X } from 'lucide-react';
import { CookiePreferences } from '../types';

interface CookieBannerProps {
  onPreferencesSaved: (prefs: CookiePreferences) => void;
  forceOpenManager?: boolean;
  onCloseManager?: () => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({
  onPreferencesSaved,
  forceOpenManager = false,
  onCloseManager,
}) => {
  const [showBanner, setShowBanner] = useState(false);
  const [showManager, setShowManager] = useState(false);

  // Default: Only necessary cookies enabled; optional NOT pre-ticked
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('geosemantic_cookie_consent');
    if (!saved) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(saved);
        setAnalyticsEnabled(Boolean(parsed.analytics));
        setMarketingEnabled(Boolean(parsed.marketing));
      } catch (e) {
        setShowBanner(true);
      }
    }
  }, []);

  useEffect(() => {
    if (forceOpenManager) {
      setShowManager(true);
    }
  }, [forceOpenManager]);

  const savePreferences = async (analytics: boolean, marketing: boolean) => {
    const prefs: CookiePreferences = {
      necessary: true,
      analytics,
      marketing,
    };

    localStorage.setItem(
      'geosemantic_cookie_consent',
      JSON.stringify({
        ...prefs,
        timestamp: new Date().toISOString(),
        version: '1.0',
      })
    );

    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs, version: '1.0' }),
      });
    } catch (err) {
      console.warn('Failed to record consent on server:', err);
    }

    onPreferencesSaved(prefs);
    setShowBanner(false);
    setShowManager(false);
    if (onCloseManager) onCloseManager();
  };

  const handleAcceptAll = () => {
    savePreferences(true, false);
  };

  const handleRejectNonEssential = () => {
    savePreferences(false, false);
  };

  const handleSaveCustom = () => {
    savePreferences(analyticsEnabled, marketingEnabled);
  };

  if (!showBanner && !showManager) return null;

  return (
    <>
      {/* Banner at bottom */}
      {showBanner && !showManager && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 p-4 sm:p-5 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <Cookie className="w-4 h-4 text-slate-800" />
                <h4 className="text-sm font-semibold text-slate-900">Cookie & Privacy Consent</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                We use necessary cookies to maintain session boundaries and satellite catalog state. Optional
                performance cookies help us measure Copernicus STAC response times. We do not use advertising
                trackers. You can customize your choice or withdraw consent at any time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleRejectNonEssential}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                Reject Non-Essential
              </button>
              <button
                onClick={() => setShowManager(true)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded transition-colors"
              >
                Manage Preferences
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Dialog */}
      {showManager && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">Manage Cookie Preferences</h3>
              </div>
              <button
                onClick={() => {
                  setShowManager(false);
                  if (onCloseManager) onCloseManager();
                }}
                className="p-1 rounded text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Necessary Cookies</span>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Always Active
                  </span>
                </div>
                <p className="text-slate-600">
                  Required for application security, spatial session persistence, and STAC catalog token handling.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Performance & Analytics</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analyticsEnabled}
                      onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>
                <p className="text-slate-600">
                  Measures satellite API response latencies and server cache hit rates. Zero cross-site tracking.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={handleRejectNonEssential}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded transition-colors"
              >
                Reject Optional
              </button>
              <button
                onClick={handleSaveCustom}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
              >
                Save Choices
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
