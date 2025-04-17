"use client";
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import useAuth from "@/hooks/useAuth";
import KPIBacklogJ1 from "./components/KPIBacklogJ1";
import KPIBacklogJ from "./components/KPIBacklogJ";
import KPIObjectif from "./components/KPIObjectif";
import KPIDossiersTraites from "./components/KPIDossiersTraites";
import GraphObjectif from "./components/GraphObjectif";
import GraphVueEnsemble from "./components/GraphVueEnsemble";
import GraphTopRegles from "./components/GraphTopRegles";
import GraphRepartitionManuelle from "./components/GraphRepartitionManuelle";
import GraphTopReglesParJour from "./components/GraphTopReglesParJour";
import GraphEntrantsSortants from "./components/GraphEntrantsSortants";

export default function DashboardFTTH() {
  const { user, loading, authorized, hydrated } = useAuth(null, "FTTH");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [globalStartDate, setGlobalStartDate] = useState(null);
  const [globalEndDate, setGlobalEndDate] = useState(null);

  if (!hydrated || loading || !authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-white text-gray-600 text-xl">
        Chargement...
      </div>
    );
  }

  const handleGlobalFilter = (start, end) => {
    setGlobalStartDate(new Date(start));
    setGlobalEndDate(new Date(end));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="sm:hidden fixed top-4 left-4 z-50 text-gray-700 bg-white shadow p-2 rounded-md"
      >
        ☰
      </button>

      <Sidebar isMobileOpen={isSidebarOpen} toggleMobileOpen={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col relative">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 z-0"
          style={{ backgroundImage: "url('/background-office.jpg')" }}
        ></div>

        <Header onGlobalFilter={handleGlobalFilter} />

        <div className="flex-1 p-6 space-y-6 overflow-auto relative z-10">
          {/* 🔢 KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPIBacklogJ1 />
            <KPIBacklogJ />
            <KPIObjectif />
            <KPIDossiersTraites />
          </div>

          {/* 📊 Graphiques – ligne 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GraphObjectif globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
            <GraphVueEnsemble globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
          </div>

          {/* 📊 Graphiques – ligne 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GraphTopRegles globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
            <GraphTopReglesParJour globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
          </div>

          {/* 📊 Graphiques – ligne 3 (⛔ Changement ici) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GraphRepartitionManuelle globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
            <GraphEntrantsSortants globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
          </div>
        </div>
      </div>
    </div>
  );
}
