"use client";

import { useState } from "react";
import useAuth from "@/hooks/useAuth";
import SidebarFTTHStyled from "../components/Sidebar";
import Header from "../components/Header";

import KpiTicketTraite from "../components/KPITicketTraite";
import KpiReentrant from "../components/KpiReentrant";
import KpiTicketsEntrants from "../components/KpiTicketsEntrants";
import KpiTicketsEnCours from "../components/KpiTicketsEnCours";
import KpiTicketsEnCoursPlus2S from "../components/KpiTicketsEnCoursPlus2S";
import VolumeReentrant from "../components/VolumeReentrant";
import SlaAnciennete from "../components/SlaAnciennete";
import VolumeTicketsDivision from "../components/VolumeTicketsDivision";
import TauxReentrants from "../components/TauxReentrants";
import GroupedBarChart from "../components/TicketsEntrantsSortants";
import RapportSortantsEntrants from "../components/RapportSortantsEntrants";
import TicketsReentrantsTable from "../components/TicketsReentrantsTable";
import TicketsEnCoursTable from "../components/TicketsEncoursTable";
import TranticiteCriticite from "../components/TranticiteCriticite";
import NewsTickerRetard from "../components/NewsTickerRetard14";

import { GlobalFilterProvider } from "../components/GlobalFilterContext";
import { ExportProvider } from "../components/ExportContext";

const API_BASE_URL = "https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api";
const API_DSL_DATA = `${API_BASE_URL}/dsl/data/`;

export default function DSLDashboard() {
  const { user, loading, authorized, hydrated } = useAuth(null, "DSL");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalStartDate, setGlobalStartDate] = useState(null);
  const [globalEndDate, setGlobalEndDate] = useState(null);

  const handleGlobalFilter = (start, end) => {
    setGlobalStartDate(start);
    setGlobalEndDate(end);
  };

  if (!hydrated || loading || !authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-white text-gray-600 text-xl">
        Chargement...
      </div>
    );
  }

  return (
    <ExportProvider>
      <GlobalFilterProvider>
        <div className="flex h-screen w-full overflow-hidden relative">
          {/* ☰ bouton mobile */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="sm:hidden fixed top-4 left-4 z-50 text-gray-700 bg-white shadow p-2 rounded-md"
          >
            ☰
          </button>

          {/* ✅ Sidebar FTTH-style */}
          <SidebarFTTHStyled
            sidebarOpen={isSidebarOpen}
            setSidebarOpen={setIsSidebarOpen}
          />

          {/* ✅ Contenu principal DSL */}
          <div className="flex-1 flex flex-col relative">
            {/* Background léger */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 z-0"
              style={{ backgroundImage: "url('/background-office.jpg')" }}
            ></div>

            <Header onGlobalFilter={handleGlobalFilter} />

            <main className="p-6 flex-1 space-y-6 overflow-y-auto relative z-10 bg-gray-50">
              <NewsTickerRetard
                apiUrl={API_DSL_DATA}
                title="Tickets en retard (+14j)"
                dateSortieField="date_sortie"
                dateDerniereMajField="date_derniere_maj"
                idField="id_ticket"
                titreField="compl_title"
                retardDays={14}
                animationDuration={40}
              />

              {/* 🔢 KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <KpiTicketsEntrants apiUrl={API_HISPEED_DATA} dateFilterField="date_derniere_maj" />
              <KpiTicketTraite apiUrl={API_HISPEED_DATA} dateSortieField="date_sortie" />
              <KpiReentrant apiUrl={API_HISPEED_DATA} tagField="tag_reentrant" dateField="date_sortie" />
              <KpiTicketsEnCours apiUrl={API_HISPEED_DATA} dateSortieField="date_sortie" dateDerniereMajField="date_derniere_maj" />
              <KpiTicketsEnCoursPlus2S apiUrl={API_HISPEED_DATA} dateSortieField="date_sortie" dateDerniereMajField="date_derniere_maj" />
            </div>

              {/* 📊 Graphiques – ligne 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GroupedBarChart apiUrl={API_DSL_DATA} />
                <TranticiteCriticite apiUrl={API_DSL_DATA} />
              </div>

              {/* 📊 Graphiques – ligne 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SlaAnciennete apiUrl={API_DSL_DATA} />
                <VolumeTicketsDivision apiUrl={API_DSL_DATA} />
              </div>

              {/* 📊 Graphiques – ligne 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RapportSortantsEntrants apiUrl={API_DSL_DATA} />
                <TauxReentrants apiUrl={API_DSL_DATA} />
              </div>

              {/* 📊 Graphiques – ligne 4 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <VolumeReentrant apiUrl={API_DSL_DATA} />
              </div>

              {/* 🧾 Tableaux */}
              <TicketsReentrantsTable apiUrl={API_DSL_DATA} />
              <TicketsEnCoursTable apiUrl={API_DSL_DATA} />
            </main>
          </div>
        </div>
      </GlobalFilterProvider>
    </ExportProvider>
  );
}
