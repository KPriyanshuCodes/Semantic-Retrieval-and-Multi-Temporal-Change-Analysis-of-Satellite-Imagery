import React from 'react';
import { Layers, ShieldCheck, Database, History, Compass, Info } from 'lucide-react';

interface NavbarProps {
  activeTab: 'explore' | 'catalog' | 'analysis' | 'history' | 'privacy';
  setActiveTab: (tab: 'explore' | 'catalog' | 'analysis' | 'history' | 'privacy') => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  openPrivacyModal: (section: 'privacy' | 'terms' | 'cookies' | 'rights') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isDemoMode,
  setIsDemoMode,
  openPrivacyModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('explore')}
            className="flex items-center gap-2 text-left focus:outline-none group"
            aria-label="GeoSemantic Home"
          >
            <span className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-base tracking-tighter">
              GS
            </span>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-cyan-700 transition-colors">
                GeoSemantic
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] text-slate-600 uppercase tracking-wider font-mono">
                Sentinel-2 Change Analysis
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-1 sm:gap-2 text-sm font-medium text-slate-600"
          aria-label="Primary Navigation"
        >
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'explore'
                ? 'bg-slate-100 text-slate-950 font-semibold'
                : 'hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-4 h-4 text-slate-500" />
            <span>1. Search</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'bg-slate-100 text-slate-950 font-semibold'
                : 'hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            <Database className="w-4 h-4 text-slate-500" />
            <span>2. Available Images</span>
          </button>

          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'analysis'
                ? 'bg-slate-100 text-slate-950 font-semibold'
                : 'hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>3. Change Results</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-slate-100 text-slate-950 font-semibold'
                : 'hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>History</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'bg-slate-100 text-slate-950 font-semibold'
                : 'hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <span>Privacy</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions & Data Mode Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Badge & Switch */}
          <div className="flex items-center border border-slate-200 rounded p-1 bg-slate-50 text-xs">
            <span
              className={`px-2 py-0.5 font-medium rounded ${
                !isDemoMode
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              } cursor-pointer transition-colors`}
              onClick={() => setIsDemoMode(false)}
              title="Query official Copernicus Data Space Ecosystem STAC API"
            >
              LIVE STAC
            </span>
            <span
              className={`px-2 py-0.5 font-medium rounded ${
                isDemoMode
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              } cursor-pointer transition-colors`}
              onClick={() => setIsDemoMode(true)}
              title="Use curated Sentinel-2 demonstration dataset"
            >
              DEMO DATA
            </span>
          </div>

          <button
            onClick={() => openPrivacyModal('privacy')}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            title="Privacy Policy, Data Rights & Third Parties"
            aria-label="Privacy Information"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
