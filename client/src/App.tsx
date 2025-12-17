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
      <nav className="w-full h-16 md:w-16 md:h-full bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 flex flex-row md:flex-col items-center justify-around md:justify-start py-0 md:py-6 gap-0 md:gap-6 z-50 shrink-0">
        <NavLink to="/" className="p-3 rounded-xl text-slate-500 hover:bg-slate-800">
          <Home className="w-6 h-6" />
        </NavLink>

        <NavLink to="/dashboard" className="p-3 rounded-xl text-slate-500 hover:bg-slate-800">
          <LayoutDashboard className="w-6 h-6" />
        </NavLink>

        <NavLink to="/units" className="p-3 rounded-xl text-slate-500 hover:bg-slate-800">
          <MapIcon className="w-6 h-6" />
        </NavLink>

        <NavLink to="/social" className="p-3 rounded-xl text-slate-500 hover:bg-slate-800">
          <Activity className="w-6 h-6" />
        </NavLink>

        <NavLink to="/helpline" className="p-3 rounded-xl text-slate-500 hover:bg-slate-800">
          <Radio className="w-6 h-6" />
        </NavLink>
      </nav>

      <main className="flex-1 relative overflow-hidden h-[calc(100vh-4rem)] md:h-screen w-full">
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center text-slate-400 font-mono">
              Loading Command Modules...
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
