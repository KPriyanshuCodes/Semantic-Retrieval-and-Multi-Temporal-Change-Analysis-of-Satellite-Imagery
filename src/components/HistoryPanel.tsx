import React, { useEffect, useState } from 'react';
import { Trash2, History, ArrowUpRight, CheckCircle2, Shield } from 'lucide-react';

interface HistoryItem {
  id: string;
  createdAt: string;
  locationName: string;
  analysisType: string;
  beforeDate: string;
  afterDate: string;
  changedAreaKm2: number;
  changePercentage: number;
  isDemo: boolean;
}

interface SearchItem {
  id: string;
  query: string;
  timestamp: string;
  parsed: any;
}

export const HistoryPanel: React.FC = () => {
  const [analyses, setAnalyses] = useState<HistoryItem[]>([]);
  const [searches, setSearches] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletedStatus, setDeletedStatus] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setAnalyses(data.analyses || []);
      setSearches(data.searches || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDeleteHistory = async () => {
    if (!window.confirm('Are you sure you want to delete all search queries and analysis history? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      if (res.ok) {
        setAnalyses([]);
        setSearches([]);
        setDeletedStatus('All search history and analysis job records have been permanently erased from the server.');
        setTimeout(() => setDeletedStatus(null), 5000);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-slate-800" />
            <h2 className="text-xl font-bold text-slate-900">Audit History & Saved Analyses</h2>
          </div>
          <p className="text-xs text-slate-600">
            Ephemeral logs of executed satellite searches and multi-temporal comparisons. No personal identity is linked.
          </p>
        </div>

        <button
          onClick={handleDeleteHistory}
          disabled={analyses.length === 0 && searches.length === 0}
          className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 border border-rose-200 rounded transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete All History</span>
        </button>
      </div>

      {deletedStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{deletedStatus}</span>
        </div>
      )}

      {/* Analysis Records Table */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-800">
          Previous Change Analyses ({analyses.length})
        </h3>

        {isLoading ? (
          <div className="text-xs text-slate-500 py-4">Loading history…</div>
        ) : analyses.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center italic">
            No previous analysis records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Location</th>
                  <th className="py-2.5 px-3 font-semibold">Observation Period</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Changed Area</th>
                  <th className="py-2.5 px-3 font-semibold">Percentage</th>
                  <th className="py-2.5 px-3 font-semibold">Data Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analyses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-medium text-slate-900">{item.locationName}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {item.beforeDate} → {item.afterDate}
                    </td>
                    <td className="py-3 px-3 capitalize text-slate-700">{item.analysisType}</td>
                    <td className="py-3 px-3 font-mono text-slate-900">{item.changedAreaKm2} km²</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                      {item.changePercentage}%
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          item.isDemo
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.isDemo ? 'Demo' : 'Copernicus Live'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Natural Language Searches */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-800">
          Recent Queries ({searches.length})
        </h3>

        {searches.length === 0 ? (
          <div className="text-xs text-slate-500 py-4 text-center italic">
            No queries logged.
          </div>
        ) : (
          <div className="space-y-2">
            {searches.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-slate-50 rounded border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-medium text-slate-900">"{s.query}"</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Parsed: {s.parsed.location} · {s.parsed.startDate.slice(0, 10)} → {s.parsed.endDate.slice(0, 10)} · {s.parsed.analysisType}
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-600 shrink-0">
                  {new Date(s.timestamp).toISOString().slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
