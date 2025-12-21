import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getSocket } from "../services/socket";
import { 
  Activity, Crosshair, MapPin, Eye, Volume2, Truck, 
  CheckCircle2, Trash2, Maximize, Flame, Stethoscope, 
  Megaphone, Loader2, ChevronDown, Shield 
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { generateAdvisoryText } from '../services/gemini';
import SystemStatusSidebar from './SystemStatusSidebar';

// --- ENV VAR HANDLING ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const socket = getSocket();

// --- ICONS ---
const incidentIcon = new L.DivIcon({
  className: "bg-transparent",
  html: `
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
}) as any;

const policeIcon = new L.DivIcon({ className: 'bg-transparent', html: `<div style="background:#3b82f6; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #3b82f6;"></div>` }) as any;
const fireIcon = new L.DivIcon({ className: 'bg-transparent', html: `<div style="background:#ef4444; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #ef4444;"></div>` }) as any;
const medicalIcon = new L.DivIcon({ className: 'bg-transparent', html: `<div style="background:#22c55e; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #22c55e;"></div>` }) as any;

// --- HELPERS ---
const isValidCoord = (coord: any) => Array.isArray(coord) && coord.length === 2 && coord[0] != null && coord[1] != null;

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

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
  const [incidents, setIncidents] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [suggestedUnits, setSuggestedUnits] = useState<any[]>([]);
  
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState(11);
  const [shouldFly, setShouldFly] = useState(false);
  const [flash, setFlash] = useState(false);
  const [advisoryStatus, setAdvisoryStatus] = useState('');

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
    setTimeout(() => setShouldFly(false), 2500);
    
    if (incident.status !== 'DISPATCHED') {
      const incidentCoords = incident.location.coordinates;
      const idleUnits = units
        .filter(u => u.status === 'IDLE' && isValidCoord(u.coordinates))
        .map(u => ({
          ...u,
          distance: getDistanceKm(incidentCoords[0], incidentCoords[1], u.coordinates[0], u.coordinates[1])
        }));

      const bestPolice = idleUnits.filter(u => u.type === 'POLICE').sort((a, b) => a.distance - b.distance)[0];
      const bestFire = idleUnits.filter(u => u.type === 'FIRE').sort((a, b) => a.distance - b.distance)[0];
      const bestMedical = idleUnits.filter(u => u.type === 'MEDICAL').sort((a, b) => a.distance - b.distance)[0];

      setSuggestedUnits([bestPolice, bestFire, bestMedical].filter(u => u !== undefined));
    }
  };

  const handleDeploy = async (unitId: string) => {
    if (!selectedIncident) return;
    await fetch(`${API_URL}/api/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId: selectedIncident._id, unitId })
    });
    setSuggestedUnits([]); 
  };

  useEffect(() => {
    fetch(`${API_URL}/api/data`)
      .then(res => res.json())
      .then(data => {
        setIncidents(data.incidents);
        setUnits(data.units);
      });

    socket.on("incident_alert", (data) => {
      setIncidents(data.incidents);
      setUnits(data.units);

      if (data.newIncident && data.newIncident.severity > 7) {
        setFlash(true);
        setTimeout(() => setFlash(false), 800);
      }
    });

    socket.on("units_updated", setUnits);

    return () => {
      socket.off("incident_alert");
      socket.off("units_updated");
    };
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-950 text-slate-200 relative overflow-hidden">
      <div className={`absolute inset-0 bg-red-500/20 z-[9999] pointer-events-none transition-opacity duration-500 ${flash ? 'opacity-100' : 'opacity-0'}`} />
      
      {/* Sidebar: Passed literal true since map loads immediately */}
      <SystemStatusSidebar isMapReady={true} />
      
      {/* MAP AREA */}
      <div className="flex-1 relative h-full w-full">
        <MapContainer center={DEFAULT_VIEW} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="© OpenStreetMap" />
          <MapController center={mapCenter} zoom={mapZoom} shouldFly={shouldFly} />
          
          {incidents.map((inc) => {
            if (!isValidCoord(inc?.location?.coordinates)) return null;

            return (
              <React.Fragment key={inc._id}>
                <Marker 
                  position={inc.location.coordinates as [number, number]} 
                  icon={incidentIcon} 
                  eventHandlers={{ click: () => focusOnIncident(inc) }} 
                />
                {inc.assignedUnit && isValidCoord(inc.assignedUnit.coordinates) && (
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
                 
                 {selectedIncident.assignedUnit ? (
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
                                 <div className="text-[10px] text-slate-500">{unit.distance.toFixed(1)} km away</div>
                               </div>
                            </div>
                            <button onClick={() => handleDeploy(unit._id)} className="text-[10px] bg-cyan-900 text-cyan-400 px-3 py-1.5 rounded border border-cyan-700 hover:bg-cyan-600 hover:text-white transition font-bold">DEPLOY</button>
                         </div>
                       ))
                     )}
                   </div>
                 )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}