import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import { Activity, Radio, LayoutDashboard, Map as MapIcon, Home } from "lucide-react";
import { lazy, Suspense } from "react";
import LandingPage from "./components/LandingPage";

const SurveillanceDashboard = lazy(() => import("./components/SurveillanceDashboard"));
const SocialSimulator = lazy(() => import("./components/SocialSimulator"));
const HelplineSimulator = lazy(() => import("./components/HelplineSimulator"));
const UnitManager = lazy(() => import("./components/UnitManager"));

function App() {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  // Helper to style the navigation links based on active state
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
    `p-3 rounded-xl transition-all duration-200 ${
      isActive 
        ? "bg-cyan-950/50 text-cyan-400 border border-cyan-900 shadow-[0_0_15px_-3px_rgba(34,211,238,0.2)]" 
        : "text-slate-500 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
    }`;

  if (isLandingPage) {
    return (
      <div className="bg-slate-950 min-h-screen w-full">
        <Routes>
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col-reverse md:flex-row bg-slate-950">
      
      {/* NAVIGATION SIDEBAR / BOTTOM BAR */}
      <nav className="w-full h-16 md:w-20 md:h-full bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 flex flex-row md:flex-col items-center justify-around md:justify-start py-0 md:py-6 gap-0 md:gap-4 z-50 shrink-0 shadow-2xl">
        
        <NavLink to="/" className={getNavLinkClass}>
          <Home className="w-6 h-6" />
        </NavLink>

        <div className="w-8 h-[1px] bg-slate-800 hidden md:block my-2" />

        <NavLink to="/dashboard" className={getNavLinkClass}>
          <LayoutDashboard className="w-6 h-6" />
        </NavLink>

        <NavLink to="/units" className={getNavLinkClass}>
          <MapIcon className="w-6 h-6" />
        </NavLink>

        <NavLink to="/social" className={getNavLinkClass}>
          <Activity className="w-6 h-6" />
        </NavLink>

        <NavLink to="/helpline" className={getNavLinkClass}>
          <Radio className="w-6 h-6" />
        </NavLink>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative overflow-hidden h-[calc(100vh-4rem)] md:h-screen w-full bg-slate-950">
        <Suspense
          fallback={
            <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 text-slate-500 gap-4">
              <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
              <div className="text-xs font-mono tracking-widest animate-pulse">LOADING MODULE...</div>
            </div>
          }
        >
          <Routes>
            <Route path="/dashboard" element={<SurveillanceDashboard />} />
            <Route path="/units" element={<UnitManager />} />
            <Route path="/social" element={<SocialSimulator />} />
            <Route path="/helpline" element={<HelplineSimulator />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;