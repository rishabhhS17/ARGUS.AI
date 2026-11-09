import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Activity, Crosshair, MapPin, Eye, Volume2, Truck,
  CheckCircle2, Trash2, Maximize, Flame, Stethoscope,
  Megaphone, Loader2, ChevronDown, Shield, Siren, X, Users
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { generateAdvisoryText, readErrorMessage, API_URL } from '../services/gemini';
import { useLiveData } from '../services/liveData';
import SystemStatusSidebar from './SystemStatusSidebar';

// --- CORROBORATION STYLING ---
const VERIFICATION_STYLES: Record<string, { hex: string; text: string; bar: string; border: string }> = {
  CONFIRMED: { hex: '#ef4444', text: 'text-red-400', bar: 'bg-red-500', border: 'border-red-800' },
  CORROBORATED: { hex: '#f97316', text: 'text-orange-400', bar: 'bg-orange-500', border: 'border-orange-800' },
  UNCONFIRMED: { hex: '#f59e0b', text: 'text-amber-400', bar: 'bg-amber-500', border: 'border-amber-800' },
};
const verificationStyle = (v?: string) => VERIFICATION_STYLES[v || 'UNCONFIRMED'] || VERIFICATION_STYLES.UNCONFIRMED;

function timeAgo(value: string | Date) {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

// --- ICONS ---
// One marker per correlated incident; the badge shows how many reports back it.
const incidentIconCache = new Map<string, L.DivIcon>();
function getIncidentIcon(reportCount: number, verification?: string) {
  const key = `${reportCount}|${verification}`;
  const cached = incidentIconCache.get(key);
  if (cached) return cached;

  const badge = reportCount > 1
    ? `<div style="position:absolute; top:0; right:-4px; z-index:20; min-width:22px; height:22px; padding:0 5px; box-sizing:border-box; border-radius:11px; background:#0f172a; border:2px solid ${verificationStyle(verification).hex}; color:#fff; font:700 11px/18px ui-monospace,monospace; text-align:center;">${reportCount > 99 ? '99+' : reportCount}</div>`
    : '';
  const icon = new L.DivIcon({
    className: "bg-transparent",
    html: `${badge}
    <div style="position: relative; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute; 
        width: 100%; 
        height: 100%; 
        background: rgba(239, 68, 68, 0.5); 
        border-radius: 50%; 
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      
      <div style="position: relative; z-index: 10; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#dc2626" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
    </div>
  `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
  });
  incidentIconCache.set(key, icon);
  return icon;
}

function CorroborationPanel({ incident }: { incident: any }) {
  const count = incident.reportCount ?? 1;
  const confidence = incident.confidence ?? 35;
  const verification = incident.verification ?? 'UNCONFIRMED';
  const style = verificationStyle(verification);
  const reports: any[] = [...(incident.reports ?? [])].reverse();

  return (
    <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-cyan-500 mt-1" />
          <div>
            <div className="text-xs text-slate-500 font-mono">CORROBORATION</div>
            <div className="text-sm text-slate-200">
              Backed by <span className="font-bold text-white">{count}</span> {count === 1 ? 'report' : 'reports'}
            </div>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${style.text} ${style.border}`}>{verification}</span>
      </div>

      <div>
        <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
          <span>CONFIDENCE</span><span className={style.text}>{confidence}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full ${style.bar} transition-all duration-500`} style={{ width: `${confidence}%` }} />
        </div>
      </div>

      {incident.sources?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {incident.sources.map((s: string) => (
            <span key={s} className="text-[10px] font-mono bg-slate-800 border border-slate-700 px-2 rounded-full">{s}</span>
          ))}
        </div>
      )}

      {reports.length > 0 && (
        <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {reports.map((r, i) => (
            <li key={`${r.receivedAt}-${i}`} className="text-[11px] bg-slate-900 border border-slate-800 rounded p-2">
              <div className="flex justify-between font-mono text-slate-500">
                <span>{r.source}</span><span>{timeAgo(r.receivedAt)}</span>
              </div>
              <p className="text-slate-300 line-clamp-2 mt-0.5">{r.description}</p>
            </li>
          ))}
        </ul>
      )}
      {count > reports.length && reports.length > 0 && (
        <p className="text-[10px] text-slate-500 font-mono">Showing latest {reports.length} of {count}</p>
      )}
    </div>
  );
}

const policeIcon = new L.DivIcon({ className: 'bg-transparent', html: `<div style="background:#3b82f6; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #3b82f6;"></div>` }) as any;
const fireIcon = new L.DivIcon({ className: 'bg-transparent', html: `<div style="background:#ef4444; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #ef4444;"></div>` }) as any;
const medicalIcon = new L.DivIcon({ className: 'bg-transparent', html: `<div style="background:#22c55e; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #22c55e;"></div>` }) as any;

// --- HELPERS ---
const isValidCoord = (coord: any) => Array.isArray(coord) && coord.length === 2 && coord[0] != null && coord[1] != null;

function MapController({ center, zoom, shouldFly }: { center: [number, number] | null, zoom: number, shouldFly: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (center && shouldFly && isValidCoord(center)) {
      map.invalidateSize();
      map.flyTo(center, zoom, { animate: true, duration: 2.0 });
    }
  }, [center, zoom, shouldFly, map]);
  return null;
}

export default function SurveillanceDashboard() {
  const { incidents, units, loaded, refresh } = useLiveData();
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [suggestedUnits, setSuggestedUnits] = useState<any[]>([]);
  const [actionError, setActionError] = useState('');
  const [isActing, setIsActing] = useState(false);

  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState(11);
  const [shouldFly, setShouldFly] = useState(false);
  const [flash, setFlash] = useState(false);
  const [advisoryStatus, setAdvisoryStatus] = useState('');
  const [incomingAlert, setIncomingAlert] = useState<any | null>(null);
  const [alertKind, setAlertKind] = useState<'NEW' | 'CORROBORATED'>('NEW');
  const alertTimerRef = useRef<ReturnType<typeof setTimeout>>();
  // incident id -> reportCount from the previous poll; null until the first snapshot lands.
  const seenRef = useRef<Map<string, number> | null>(null);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  // Cleaned up: Removed isMapReady state as setIsMapReady was never used
  
  const DEFAULT_VIEW: [number, number] = [28.6139, 77.2090]; 

  // --- RESET HANDLER ---
  const handleResetSystem = async () => {
    const key = prompt("🔒 SECURITY PROTOCOL\nEnter Admin Key to confirm system wipe:");
    
    if (!key) return; 

    try {
      const res = await fetch(`${API_URL}/api/clear`, { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': key 
        }
      });

      if (res.ok) {
        refresh();
        setSelectedIncident(null);
        setIsPanelOpen(false);
        handleResetView();
        alert("✅ System Reset Successful");
      } else {
        alert("❌ ACCESS DENIED: Invalid Security Key");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error connecting to server");
    }
  };

  const handleResetView = () => {
    setMapCenter(DEFAULT_VIEW);
    setMapZoom(11);
    setShouldFly(true);
    setTimeout(() => setShouldFly(false), 2500);
  };

  const handleBroadcastAdvisory = async () => {
    if (!selectedIncident) return;
    setAdvisoryStatus('GENERATING...');
    const text = await generateAdvisoryText(selectedIncident);
    setAdvisoryStatus('POSTING...');
    await fetch(`${API_URL}/api/advisory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
    });
    refresh();
    setAdvisoryStatus('SENT');
    setTimeout(() => setAdvisoryStatus(''), 2000);
  };

  const focusOnIncident = (incident: any) => {
    if (!isValidCoord(incident?.location?.coordinates)) return;

    setSelectedIncident(incident);
    setMapCenter(incident.location.coordinates);
    setMapZoom(16);
    setShouldFly(true);
    setIsPanelOpen(true);
    setActionError('');
    setTimeout(() => setShouldFly(false), 2500);
  };

  // Deploy and resolve share one shape: POST, surface the server's reason on failure
  // (e.g. "That unit is no longer available"), then pull fresh state.
  const runIncidentAction = async (path: string, body: object) => {
    setIsActing(true);
    setActionError('');
    try {
      const res = await fetch(`${API_URL}/api/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, 'Action failed'));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsActing(false);
      refresh();
    }
  };

  const handleDeploy = (unitId: string) => {
    if (!selectedIncident) return;
    setSuggestedUnits([]);
    return runIncidentAction('deploy', { incidentId: selectedIncident._id, unitId });
  };

  const handleResolve = () => {
    if (!selectedIncident) return;
    return runIncidentAction('resolve', { incidentId: selectedIncident._id });
  };

  // Nearest-unit ranking happens on the server. Re-ask whenever the selection, its
  // status, or the unit roster changes (a unit may have just been taken or freed).
  const selectedId = selectedIncident?._id;
  const selectedStatus = selectedIncident?.status;
  useEffect(() => {
    if (!selectedId || selectedStatus !== 'PENDING') {
      setSuggestedUnits([]);
      return;
    }

    let cancelled = false;
    fetch(`${API_URL}/api/incidents/${selectedId}/suggestions`)
      .then((res) => (res.ok ? res.json() : { suggestions: [] }))
      .then((data) => { if (!cancelled) setSuggestedUnits(data.suggestions || []); })
      .catch(() => { if (!cancelled) setSuggestedUnits([]); });

    return () => { cancelled = true; };
  }, [selectedId, selectedStatus, units]);

  // Polls replace socket pushes, so "something happened" is worked out by diffing
  // snapshots: an unseen id is a new incident, a higher reportCount is a corroboration.
  useEffect(() => {
    if (!loaded) return;

    const previous = seenRef.current;
    seenRef.current = new Map(incidents.map((i) => [i._id, i.reportCount ?? 1]));
    if (!previous) return; // first snapshot: existing incidents are not news

    const fresh = incidents.find((i) => !previous.has(i._id));
    const corroborated = fresh ? undefined : incidents.find(
      (i) => (i.reportCount ?? 1) > (previous.get(i._id) ?? Infinity),
    );
    const target = fresh || corroborated;
    if (!target) return;

    setAlertKind(fresh ? 'NEW' : 'CORROBORATED');
    setIncomingAlert(target);
    clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => setIncomingAlert(null), 9000);

    if (fresh && fresh.severity > 7) {
      setFlash(true);
      setTimeout(() => setFlash(false), 800);
    }
  }, [incidents, loaded]);

  useEffect(() => () => clearTimeout(alertTimerRef.current), []);

  // Keep the open details panel live as new reports merge in (or clear it after a reset).
  useEffect(() => {
    setSelectedIncident((prev: any) => (prev ? incidents.find((i) => i._id === prev._id) ?? null : prev));
  }, [incidents]);

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-950 text-slate-200 relative overflow-hidden">
      <div className={`absolute inset-0 bg-red-500/20 z-[9999] pointer-events-none transition-opacity duration-500 ${flash ? 'opacity-100' : 'opacity-0'}`} />
      {incomingAlert && (
        <div className="absolute top-20 left-1/2 z-[3000] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-in slide-in-from-top-4 duration-300 md:top-6">
          <div className="border border-red-500/70 bg-slate-950/95 shadow-[0_0_40px_rgba(239,68,68,0.25)] backdrop-blur rounded p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded bg-red-500/15 p-2 text-red-400">
                <Siren className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold tracking-widest text-red-400">
                    {alertKind === 'NEW'
                      ? 'NEW INCIDENT REGISTERED'
                      : `REPORT CORROBORATED · ${incomingAlert.reportCount} SOURCES`}
                  </p>
                  <button
                    onClick={() => setIncomingAlert(null)}
                    className="rounded p-1 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                    aria-label="Dismiss incident alert"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="mt-1 truncate text-lg font-bold uppercase text-white">{incomingAlert.type || 'Incident Alert'}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-300">{incomingAlert.description || 'New incident requires operator review.'}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-red-800 bg-red-950/40 px-2 py-1 text-[10px] font-bold text-red-300">
                    SEVERITY {incomingAlert.severity || 'N/A'}/10
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-400">
                    {incomingAlert.location?.address || 'Location pending'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    focusOnIncident(incomingAlert);
                    setIncomingAlert(null);
                  }}
                  className="mt-4 w-full rounded border border-cyan-700 bg-cyan-900/40 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-700 hover:text-white"
                >
                  FOCUS ON MAP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Sidebar: Passed literal true since map loads immediately */}
      <SystemStatusSidebar isMapReady={true} />
      
      {/* MAP AREA */}
      <div className="flex-1 relative h-full w-full">
        <MapContainer center={DEFAULT_VIEW} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="© OpenStreetMap" />
          <MapController center={mapCenter} zoom={mapZoom} shouldFly={shouldFly} />
          
          {incidents.map((inc) => {
            // Resolved incidents leave the map; it only shows what still needs attention.
            if (!isValidCoord(inc?.location?.coordinates) || inc.status === 'RESOLVED') return null;

            return (
              <React.Fragment key={inc._id}>
                <Marker 
                  position={inc.location.coordinates as [number, number]} 
                  icon={getIncidentIcon(inc.reportCount ?? 1, inc.verification)}
                  eventHandlers={{ click: () => focusOnIncident(inc) }} 
                />
                {inc.status === 'DISPATCHED' && inc.assignedUnit && isValidCoord(inc.assignedUnit.coordinates) && (
                  <Polyline 
                      positions={[
                        inc.location.coordinates as [number, number], 
                        inc.assignedUnit.coordinates as [number, number]
                      ]} 
                      pathOptions={{ color: '#0ea5e9', dashArray: '5, 8', weight: 2, opacity: 0.6 }} 
                  />
                )}
              </React.Fragment>
            );
          })}

          {units.map((unit) => {
             if (!isValidCoord(unit?.coordinates)) return null;

             return (
              <Marker 
                  key={unit._id} 
                  position={unit.coordinates as [number, number]} 
                  icon={unit.type === 'FIRE' ? fireIcon : unit.type === 'MEDICAL' ? medicalIcon : policeIcon}
              >
                <Popup><strong>{unit.name}</strong><br />{unit.type}</Popup>
              </Marker>
             );
          })}
        </MapContainer>

        {/* HEADER OVERLAY */}
        <div className="absolute top-0 left-0 w-full p-4 z-[1000] bg-gradient-to-b from-slate-950/90 to-transparent flex justify-between items-start pointer-events-none">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tighter text-white flex items-center gap-2 drop-shadow-md">
              <Eye className="text-cyan-500 w-8 h-8" /> ARGUS<span className="text-cyan-500">.AI</span>
            </h1>
            <p className="text-[8px] md:text-[10px] text-cyan-400 font-mono ml-10 md:ml-12 tracking-widest">
                PANOPTIC SURVEILLANCE SYSTEM
            </p>
          </div>
          
          <button onClick={handleResetSystem} className="pointer-events-auto bg-red-900/20 hover:bg-red-900/80 border border-red-800 text-red-500 hover:text-white p-2 rounded transition-all flex items-center gap-2 text-xs font-mono font-bold backdrop-blur-sm">
            <Trash2 className="w-4 h-4" /> <span className="hidden md:inline">RESET SYSTEM</span><span className="md:hidden">RESET</span>
          </button>
        </div>

        {/* RE-CENTER BUTTON */}
        <div className="absolute bottom-20 md:bottom-6 right-4 md:right-6 z-[1000]">
          <button onClick={handleResetView} className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-full shadow-lg border border-slate-700 flex items-center gap-2 transition-transform hover:scale-105">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* DETAILS SIDEBAR / MOBILE DRAWER */}
      <div className={`
        fixed md:static bottom-0 left-0 right-0 
        md:w-96 w-full 
        h-[60vh] md:h-full 
        bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 
        flex flex-col z-[2000] shadow-2xl 
        transition-transform duration-300 ease-in-out
        ${isPanelOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
      `}>
        
        {/* Mobile Toggle Handle */}
        <div 
            className="md:hidden w-full bg-slate-800/50 h-8 flex items-center justify-center cursor-pointer border-b border-slate-800"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
        >
            <ChevronDown className="w-5 h-5 text-slate-500" />
        </div>

        <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <h2 className="font-bold text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-500" /> LIVE FORENSICS
          </h2>
          {selectedIncident && (
             <div className="flex gap-2">
                <button onClick={() => focusOnIncident(selectedIncident)} className="text-[10px] bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded border border-cyan-800 hover:bg-cyan-800/50 transition">RE-FOCUS</button>
                <button onClick={() => setIsPanelOpen(false)} className="md:hidden text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">HIDE</button>
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 md:pb-4">
          {!selectedIncident ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
              <Crosshair className="w-16 h-16 opacity-20" />
              <p className="text-sm font-mono">SELECT TARGET ON MAP</p>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right duration-300 space-y-6">
              
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="text-xl md:text-2xl font-bold text-white uppercase">{selectedIncident.type}</h3>
                <div className="flex items-center gap-3 mt-1">
                   <span className={`text-xs px-2 py-0.5 rounded border font-mono ${selectedIncident.severity > 7 ? 'bg-red-900/50 text-red-400 border-red-800' : 'bg-yellow-900/50 text-yellow-400 border-yellow-800'}`}>SEVERITY: {selectedIncident.severity}/10</span>
                </div>
              </div>

              <CorroborationPanel incident={selectedIncident} />

              <div className="bg-slate-950 p-3 rounded border border-slate-800 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-500 mt-1" />
                <div>
                  <div className="text-xs text-slate-500 font-mono">GEOLOCATION</div>
                  <div className="text-sm text-slate-200">{selectedIncident.location.address}</div>
                </div>
              </div>
              
              <button 
                  onClick={handleBroadcastAdvisory}
                  disabled={advisoryStatus !== ''}
                  className="w-full bg-cyan-900/30 hover:bg-cyan-900/80 border border-cyan-800 text-cyan-400 hover:text-white p-2 rounded transition-all flex items-center justify-center gap-2 text-xs font-mono font-bold disabled:opacity-50"
              >
                  {advisoryStatus === 'GENERATING...' || advisoryStatus === 'POSTING...' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Megaphone className="w-4 h-4" />}
                  {advisoryStatus === '' ? "BROADCAST ADVISORY" : advisoryStatus}
              </button>

              {/* DETAILED BREAKDOWN */}
              {selectedIncident.breakdown && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-cyan-500 border-b border-slate-800 pb-1 font-mono">AI EVIDENCE BREAKDOWN</h4>
                  <div className="text-xs">
                    <span className="text-slate-500 block mb-1">SOURCE:</span>
                    <p className="text-slate-300 bg-slate-800/50 p-2 rounded border-l-2 border-cyan-500 italic">"{selectedIncident.breakdown.evidence_source || "N/A"}"</p>
                  </div>
                  {selectedIncident.breakdown.visual_clues?.length > 0 && (
                    <div className="text-xs">
                       <span className="text-slate-500 flex items-center gap-1 mb-1"><Eye className="w-3 h-3"/> VISUAL:</span>
                       <div className="flex flex-wrap gap-1">{selectedIncident.breakdown.visual_clues.map((c:string, i:number)=><span key={i} className="bg-slate-800 border border-slate-700 px-2 rounded-full">{c}</span>)}</div>
                    </div>
                  )}
                  {selectedIncident.breakdown.acoustics?.length > 0 && (
                    <div className="text-xs">
                       <span className="text-slate-500 flex items-center gap-1 mb-1"><Volume2 className="w-3 h-3"/> AUDIO:</span>
                       <div className="flex flex-wrap gap-1">{selectedIncident.breakdown.acoustics.map((s:string, i:number)=><span key={i} className="bg-slate-800 border border-slate-700 px-2 rounded-full">{s}</span>)}</div>
                    </div>
                  )}
                </div>
              )}

              {/* MANUAL DEPLOYMENT SECTION */}
              <div className="pt-2 border-t border-slate-800">
                 <h4 className="text-xs font-bold text-slate-500 flex items-center gap-2 mb-3"><Truck className="w-3 h-3"/> DEPLOYMENT STATUS</h4>
                 
                 {selectedIncident.status === 'RESOLVED' ? (
                   <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded border border-slate-700">
                     <div>
                       <span className="text-slate-300 font-mono text-sm font-bold block">INCIDENT CLOSED</span>
                       <span className="text-[10px] text-slate-500 font-mono">
                         {selectedIncident.assignedUnit ? `${selectedIncident.assignedUnit.name} released · ` : ''}
                         {selectedIncident.resolvedAt ? new Date(selectedIncident.resolvedAt).toLocaleTimeString() : ''}
                       </span>
                     </div>
                     <div className="flex items-center gap-1 text-[10px] bg-slate-700/40 text-slate-300 px-2 py-0.5 rounded border border-slate-600">
                        <CheckCircle2 className="w-3 h-3"/> RESOLVED
                     </div>
                   </div>
                 ) : selectedIncident.assignedUnit ? (
                   <div className="flex items-center justify-between bg-green-950/30 p-3 rounded border border-green-900/50 animate-in zoom-in duration-300">
                     <div>
                       <span className="text-green-400 font-mono text-sm font-bold block">{selectedIncident.assignedUnit.name}</span>
                       <span className="text-[10px] text-green-600 font-mono">{selectedIncident.assignedUnit.type} UNIT</span>
                     </div>
                     <div className="flex items-center gap-1 text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/50">
                        <CheckCircle2 className="w-3 h-3"/> DISPATCHED
                     </div>
                   </div>
                 ) : (
                   <div className="space-y-2">
                     <p className="text-[10px] text-slate-400 font-mono mb-2">NEAREST ASSETS (1 PER TYPE):</p>
                     {suggestedUnits.length === 0 ? (
                       <div className="text-xs text-slate-500 italic p-2 border border-slate-800 rounded bg-slate-900/50">No idle units available nearby.</div>
                     ) : (
                       suggestedUnits.map(unit => (
                         <div key={unit._id} className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700 hover:border-cyan-500 transition">
                            <div className="flex items-center gap-3">
                               <div className={`p-1.5 rounded-full ${unit.type === 'FIRE' ? 'bg-red-900/50 text-red-500' : unit.type === 'MEDICAL' ? 'bg-green-900/50 text-green-500' : 'bg-blue-900/50 text-blue-500'}`}>
                                  {unit.type === 'FIRE' ? <Flame className="w-3 h-3"/> : unit.type === 'MEDICAL' ? <Stethoscope className="w-3 h-3"/> : <Shield className="w-3 h-3"/>}
                               </div>
                               <div>
                                 <div className="text-xs font-bold text-white">{unit.name}</div>
                                 <div className="text-[10px] text-slate-500">{unit.distanceKm.toFixed(1)} km away</div>
                               </div>
                            </div>
                            <button onClick={() => handleDeploy(unit._id)} disabled={isActing} className="text-[10px] bg-cyan-900 text-cyan-400 px-3 py-1.5 rounded border border-cyan-700 hover:bg-cyan-600 hover:text-white transition font-bold disabled:opacity-50">DEPLOY</button>
                         </div>
                       ))
                     )}
                   </div>
                 )}

                 {selectedIncident.status !== 'RESOLVED' && (
                   <button
                     onClick={handleResolve}
                     disabled={isActing}
                     className="mt-3 w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white p-2 rounded transition-all flex items-center justify-center gap-2 text-xs font-mono font-bold disabled:opacity-50"
                   >
                     <CheckCircle2 className="w-4 h-4" />
                     {selectedIncident.assignedUnit ? 'MARK RESOLVED & RELEASE UNIT' : 'MARK RESOLVED'}
                   </button>
                 )}

                 {actionError && (
                   <p className="mt-2 text-[11px] font-mono text-red-400">{actionError}</p>
                 )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
