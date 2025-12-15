
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Activity, Radio, LayoutDashboard, Map as MapIcon } from "lucide-react";
import SurveillanceDashboard from "./components/SurveillanceDashboard";
import SocialSimulator from "./components/SocialSimulator";
import HelplineSimulator from "./components/HelplineSimulator";
import UnitManager from "./components/UnitManager";

function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col-reverse md:flex-row bg-slate-950">
      {/* NAVIGATION: Bottom Bar (Mobile) -> Left Sidebar (Desktop) */}
      <nav className="w-full h-16 md:w-16 md:h-full bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 flex flex-row md:flex-col items-center justify-around md:justify-start py-0 md:py-6 gap-0 md:gap-6 z-50 shrink-0">
        {/* Dashboard Link */}
        <NavLink
          to="/dashboard"
          title="Dashboard"
          className={({ isActive }) =>
            `p-3 rounded-xl transition ${
              isActive
                ? "bg-cyan-900/50 text-cyan-400"
                : "text-slate-500 hover:bg-slate-800"
            }`
          }
        >
          <LayoutDashboard className="w-6 h-6" />
        </NavLink>

        {/* Units Link */}
        <NavLink
          to="/units"
          title="Add Units"
          className={({ isActive }) =>
            `p-3 rounded-xl transition ${
              isActive
                ? "bg-emerald-900/50 text-emerald-400"
                : "text-slate-500 hover:bg-slate-800"
            }`
          }
        >
          <MapIcon className="w-6 h-6" />
        </NavLink>

        {/* Social Link */}
        <NavLink
          to="/social"
          title="Simulate Social"
          className={({ isActive }) =>
            `p-3 rounded-xl transition ${
              isActive
                ? "bg-blue-900/50 text-blue-400"
                : "text-slate-500 hover:bg-slate-800"
            }`
          }
        >
          <Activity className="w-6 h-6" />
        </NavLink>

        {/* Helpline Link */}
        <NavLink
          to="/helpline"
          title="Simulate Helpline"
          className={({ isActive }) =>
            `p-3 rounded-xl transition ${
              isActive
                ? "bg-red-900/50 text-red-400"
                : "text-slate-500 hover:bg-slate-800"
            }`
          }
        >
          <Radio className="w-6 h-6" />
        </NavLink>
      </nav>

      {/* MAIN CONTENT ROUTES */}
      <main className="flex-1 relative overflow-hidden h-[calc(100vh-4rem)] md:h-screen w-full">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
