import { useState } from 'react';
import { ChevronDown, ChevronUp, Link2, MapPinOff, X } from 'lucide-react';
import { API_URL, readErrorMessage } from '../services/gemini';
import { timeAgo } from '../utils/time';

// Reports that named only a city or region ("fire in Delhi"). They are not on the map and
// never merge on their own, because they could belong to more than one incident. The
// operator picks the incident (server-suggested) or dismisses the report.

interface Props {
  leads: any[];
  onChanged: () => void;
}

interface Candidate {
  _id: string;
  type: string;
  address: string;
  status: string;
  reportCount: number;
  distanceKm: number | null;
}

export default function UnplacedReportsPanel({ leads, onChanged }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (leads.length === 0) return null;

  const showMatches = async (leadId: string) => {
    if (expandedId === leadId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(leadId);
    setCandidates(null);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/leads/${leadId}/candidates`);
      if (!res.ok) throw new Error(await readErrorMessage(res, 'Could not load matches'));
      setCandidates((await res.json()).candidates || []);
    } catch (err) {
      setCandidates([]);
      setError(err instanceof Error ? err.message : 'Could not load matches');
    }
  };

  const act = async (path: string, body?: object) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, 'Action failed'));
      setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
      onChanged();
    }
  };

  return (
    <div className="absolute bottom-20 md:bottom-6 left-4 z-[1000] w-[calc(100%-6rem)] max-w-sm">
      <div className="bg-slate-950/95 border border-amber-800/70 rounded shadow-2xl backdrop-blur">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-2 text-[11px] font-mono font-bold tracking-widest text-amber-400">
            <MapPinOff className="w-4 h-4" /> UNPLACED REPORTS · {leads.length}
          </span>
          {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />}
        </button>

        {isOpen && (
          <div className="border-t border-slate-800 max-h-[45vh] overflow-y-auto p-2 space-y-2">
            <p className="px-1 text-[10px] font-mono text-slate-500">
              Only a city or region was named. Attach each to the incident it describes, or dismiss it.
            </p>

            {leads.map((lead) => (
              <div key={lead._id} className="bg-slate-900 border border-slate-800 rounded p-2 text-[11px]">
                <div className="flex justify-between font-mono text-slate-500">
                  <span>{lead.source} · {lead.precision?.toUpperCase()}</span>
                  <span>{timeAgo(lead.receivedAt)}</span>
                </div>
                <p className="mt-0.5 font-bold text-white uppercase">{lead.type}</p>
                <p className="text-slate-300 line-clamp-2">{lead.description}</p>
                <p className="mt-0.5 text-amber-300/80">📍 {lead.address} (too broad to pin)</p>

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => showMatches(lead._id)}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-1 rounded border border-cyan-800 bg-cyan-900/30 px-2 py-1 font-mono font-bold text-cyan-400 hover:bg-cyan-800/50 disabled:opacity-50"
                  >
                    <Link2 className="w-3 h-3" /> {expandedId === lead._id ? 'HIDE' : 'MATCH'}
                  </button>
                  <button
                    onClick={() => act(`leads/${lead._id}/dismiss`)}
                    disabled={busy}
                    className="flex items-center justify-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono font-bold text-slate-400 hover:text-white disabled:opacity-50"
                  >
                    <X className="w-3 h-3" /> DISMISS
                  </button>
                </div>

                {expandedId === lead._id && (
                  <div className="mt-2 space-y-1">
                    {candidates === null && <p className="font-mono text-slate-500">Finding matching incidents...</p>}
                    {candidates?.length === 0 && (
                      <p className="font-mono text-slate-500">No open {lead.category?.toLowerCase().replace('_', ' ')} incident in {lead.address}.</p>
                    )}
                    {candidates?.map((c) => (
                      <div key={c._id} className="flex items-center justify-between gap-2 rounded border border-slate-700 bg-slate-800/50 p-1.5">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">{c.type}</p>
                          <p className="truncate text-slate-400">
                            {c.address}
                            {c.distanceKm !== null ? ` · ${c.distanceKm} km` : ''} · {c.reportCount} reports
                          </p>
                        </div>
                        <button
                          onClick={() => act(`leads/${lead._id}/attach`, { incidentId: c._id })}
                          disabled={busy}
                          className="shrink-0 rounded border border-cyan-700 bg-cyan-900 px-2 py-1 font-mono font-bold text-cyan-300 hover:bg-cyan-600 hover:text-white disabled:opacity-50"
                        >
                          ATTACH
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {error && <p className="px-1 font-mono text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
