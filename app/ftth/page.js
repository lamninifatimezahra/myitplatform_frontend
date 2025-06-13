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
import GraphTraitementEmails from "./components/GraphTraitementEmails";
import GraphTraitementTickets from "./components/GraphTraitementTickets";

import NewsTickerReglesFTTH from "./components/NewsTickerReglesFTTH";
import Image from "next/image";

export default function DashboardFTTH() {
  const { user, loading, authorized, hydrated } = useAuth(null, "FTTH");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalStartDate, setGlobalStartDate] = useState(null);
  const [globalEndDate, setGlobalEndDate] = useState(null);

  const handleGlobalFilter = (start, end) => {
    setGlobalStartDate(new Date(start));
    setGlobalEndDate(new Date(end));
  };

  // 🌀 Chargement global (authentification + données utilisateur)
  if (!hydrated || loading || !authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-white relative">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-[6px] border-t-[#31327e] border-b-[#6f80ac] border-l-transparent border-r-transparent rounded-full animate-spin-custom" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/logo-myit.png"
              alt="Logo MyIT"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
        </div>
        <style jsx>{`
          @keyframes spin-custom {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
          .animate-spin-custom {
            animation: spin-custom 1.1s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {/* Bouton menu mobile */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="sm:hidden fixed top-4 left-4 z-50 text-gray-700 bg-white shadow p-2 rounded-md"
      >
        ☰
      </button>

      {/* Barre latérale */}
      <Sidebar sidebarOpen={isSidebarOpen} setSidebarOpen={setIsSidebarOpen} />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col relative">
        {/* Fond d’écran flouté */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 z-0"
          style={{ backgroundImage: "url('/background-office.jpg')" }}
        ></div>

        {/* Header avec filtre global */}
        <Header
          onGlobalFilter={handleGlobalFilter}
          setSidebarOpen={setIsSidebarOpen}
        />

        {/* Fil d’actualité en haut */}
        <NewsTickerReglesFTTH />

        {/* Contenu dashboard */}
        <div className="flex-1 p-6 space-y-6 overflow-auto relative z-10">
          {/* 🔷 KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPIBacklogJ1 />
            <KPIBacklogJ />
            <KPIObjectif />
            <KPIDossiersTraites />
          </div>

          {/* 🔷 Graphiques - ligne 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GraphObjectif
              globalStartDate={globalStartDate}
              globalEndDate={globalEndDate}
            />
            <GraphVueEnsemble
              globalStartDate={globalStartDate}
              globalEndDate={globalEndDate}
            />
          </div>

          {/* 🔷 Graphiques - ligne 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GraphTopRegles
              globalStartDate={globalStartDate}
              globalEndDate={globalEndDate}
            />
            <GraphTopReglesParJour
              globalStartDate={globalStartDate}
              globalEndDate={globalEndDate}
            />
          </div>

          {/* 🔷 Graphiques - ligne 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GraphRepartitionManuelle
              globalStartDate={globalStartDate}
              globalEndDate={globalEndDate}
            />
            <GraphEntrantsSortants
              globalStartDate={globalStartDate}
              globalEndDate={globalEndDate}
            />
          </div>

          {/* 🔷 Graphiques - ligne 4 (nouveaux) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GraphTraitementEmails
              globalStartDate={globalStartDate}
              globalEndDate={globalEndDate}
            />
            <GraphTraitementTickets
              globalStartDate={globalStartDate}
              globalEndDate={globalEndDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
