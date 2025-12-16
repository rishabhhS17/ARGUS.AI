import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import { Activity, Radio, LayoutDashboard, Map as MapIcon, Home } from "lucide-react";
import SurveillanceDashboard from "./components/SurveillanceDashboard";
import SocialSimulator from "./components/SocialSimulator";
import HelplineSimulator from "./components/HelplineSimulator";
import UnitManager from "./components/UnitManager";
import LandingPage from "./components/LandingPage";

function App() {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  // --- LAYOUT 1: LANDING PAGE (Standard Window Scrolling) ---
  if (isLandingPage) {
    return (
      <div className="bg-slate-950 min-h-screen w-full">
        <Routes>
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </div>
    );
  }

  // --- LAYOUT 2: DASHBOARD (Fixed Sidebar + Internal Scroll) ---
  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col-reverse md:flex-row bg-slate-950">
      
      {/* SIDEBAR NAVIGATION */}
      <nav className="w-full h-16 md:w-16 md:h-full bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 flex flex-row md:flex-col items-center justify-around md:justify-start py-0 md:py-6 gap-0 md:gap-6 z-50 shrink-0">
        
        {/* Return to Home Link */}
        <NavLink 
          to="/" 
          title="Return to Home" 
          className="p-3 rounded-xl text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition"
        >
          <Home className="w-6 h-6" />
        </NavLink>

        <div className="w-8 h-px bg-slate-800 hidden md:block" />

        <NavLink 
          to="/dashboard" 
          title="Dashboard" 
          className={({ isActive }) => `p-3 rounded-xl transition ${isActive ? "bg-cyan-900/50 text-cyan-400" : "text-slate-500 hover:bg-slate-800"}`}
        >
          <LayoutDashboard className="w-6 h-6" />
        </NavLink>

        <NavLink 
          to="/units" 
          title="Add Units" 
          className={({ isActive }) => `p-3 rounded-xl transition ${isActive ? "bg-emerald-900/50 text-emerald-400" : "text-slate-500 hover:bg-slate-800"}`}
        >
          <MapIcon className="w-6 h-6" />
        </NavLink>

        <NavLink 
          to="/social" 
          title="Simulate Social" 
          className={({ isActive }) => `p-3 rounded-xl transition ${isActive ? "bg-blue-900/50 text-blue-400" : "text-slate-500 hover:bg-slate-800"}`}
        >
          <Activity className="w-6 h-6" />
        </NavLink>

        <NavLink 
          to="/helpline" 
          title="Simulate Helpline" 
          className={({ isActive }) => `p-3 rounded-xl transition ${isActive ? "bg-red-900/50 text-red-400" : "text-slate-500 hover:bg-slate-800"}`}
        >
          <Radio className="w-6 h-6" />
        </NavLink>
      </nav>

      {/* DASHBOARD CONTENT AREA (Scrolls internally) */}
      <main className="flex-1 relative overflow-hidden h-[calc(100vh-4rem)] md:h-screen w-full">
        <Routes>
          <Route path="/dashboard" element={<SurveillanceDashboard />} />
          <Route path="/units" element={<UnitManager />} />
          <Route path="/social" element={<SocialSimulator />} />
          <Route path="/helpline" element={<HelplineSimulator />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;