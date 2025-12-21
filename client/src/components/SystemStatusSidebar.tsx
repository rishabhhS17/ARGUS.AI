import { useState, useEffect } from 'react';
import { Server,  ShieldCheck, Wifi, Loader2, AlertCircle } from 'lucide-react';

// Use the same env var as your dashboard
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Props {
  isMapReady: boolean;
}

const SystemStatusSidebar: React.FC<Props> = ({ isMapReady }) => {
  const [status, setStatus] = useState({
    server: 'loading', // 'loading' | 'success' | 'error'
    map: 'loading'
  });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        // Pinging your existing /api/data route as a health check
        const res = await fetch(`${API_URL}/api/data`);
        if (res.ok) {
          // Add a small artificial delay so the user sees the "checking" animation
          setTimeout(() => {
            setStatus(prev => ({ ...prev, server: 'success' }));
          }, 1200);
        } else {
          setStatus(prev => ({ ...prev, server: 'error' }));
        }
      } catch (err) {
        setStatus(prev => ({ ...prev, server: 'error' }));
      }
    };
    checkBackend();
  }, []);

  useEffect(() => {
    if (isMapReady) {
      setTimeout(() => {
        setStatus(prev => ({ ...prev, map: 'success' }));
      }, 500); // Small delay for visual sequencing
    }
  }, [isMapReady]);

  // Auto-hide panel after both are ready
  useEffect(() => {
    if (status.server === 'success' && status.map === 'success') {
      const timer = setTimeout(() => setIsVisible(false), 4000); 
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!isVisible) return null;

  return (
    <div className="absolute top-24 left-4 z-[9999] w-64 bg-slate-900/95 backdrop-blur-md border border-cyan-900/50 rounded-lg shadow-2xl p-4 overflow-hidden animate-in slide-in-from-left duration-500">
      {/* Decorative scanning line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 animate-pulse" />
      
      <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
        <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> System Check
        </h3>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
      </div>

      <div className="space-y-4">
        <StatusItem 
          icon={<Server size={16} />}
          label="BACKEND LINK"
          subtext={status.server === 'loading' ? "Handshaking..." : status.server === 'success' ? "Online" : "Connection Failed"}
          state={status.server}
        />
        {/* <StatusItem 
          icon={<MapIcon size={16} />}
          label="GEOSPATIAL GRID"
          subtext={status.map === 'loading' ? "Rendering tiles..." : "Calibrated"}
          state={status.map}
        /> */}
      </div>
    </div>
  );
};

const StatusItem = ({ icon, label, subtext, state }: any) => (
  <div className="flex items-start gap-3">
    <div className={`mt-1 p-1.5 rounded-md border ${
      state === 'success' ? 'bg-green-950 border-green-900 text-green-500' : 
      state === 'error' ? 'bg-red-950 border-red-900 text-red-500' : 
      'bg-slate-800 border-slate-700 text-cyan-500'
    }`}>
      {state === 'loading' ? <Loader2 className="animate-spin" size={14} /> : icon}
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center">
        <p className="text-xs font-bold text-slate-300">{label}</p>
        {state === 'success' && <Wifi size={12} className="text-green-500" />}
        {state === 'error' && <AlertCircle size={12} className="text-red-500" />}
      </div>
      <p className={`text-[10px] font-mono mt-0.5 ${
        state === 'success' ? 'text-green-400' : 
        state === 'error' ? 'text-red-400' : 
        'text-slate-500'
      }`}>
        {subtext}
      </p>
    </div>
  </div>
);

export default SystemStatusSidebar;