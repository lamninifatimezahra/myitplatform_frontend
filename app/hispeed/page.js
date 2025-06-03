"use client";

import { useState } from "react";
import useAuth from "@/hooks/useAuth";
import Sidebar from "../components/Sidebar"; // ✅ ton nouveau sidebar FTTH-like
import Header from "./components/Header";

import ClientCoupeChart from "../components/ClientCoupeChart";
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

const API_BASE_URL = "https://myit-backend-its-c20c9354ce42.herokuapp.com/dashboard/api";
const API_HISPEED_DATA = `${API_BASE_URL}/hispeed/data/`;
const API_COMMENT_UPDATE = `${API_BASE_URL}/update-ticket-comment/`;

export default function HispeedDashboard() {
  const { user, loading, authorized, hydrated } = useAuth(null, "HISPEED");
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
    <GlobalFilterProvider>
      <div className="flex h-screen w-full overflow-hidden relative">
        {/* Mobile toggle */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="sm:hidden fixed top-4 left-4 z-50 text-gray-700 bg-white shadow p-2 rounded-md"
        >
          ☰
        </button>

        {/* Sidebar FTTH-style */}
        <Sidebar isMobileOpen={isSidebarOpen} toggleMobileOpen={() => setIsSidebarOpen(false)} />

        {/* Contenu principal */}
        <div className="flex-1 flex flex-col relative">
          {/* Header background */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20 z-0"
            style={{ backgroundImage: "url('/background-office.jpg')" }}
          ></div>

          {/* Header */}
          <Header onGlobalFilter={handleGlobalFilter} />

          <main className="flex-1 p-6 space-y-6 overflow-y-auto relative z-10 bg-gray-50">
            <NewsTickerRetard
              apiUrl={API_HISPEED_DATA}
              title="Tickets en retard (+ Semaine)"
              dateSortieField="date_sortie"
              dateDerniereMajField="date_derniere_maj"
              idField="id_ticket"
              titreField="compl_title"
              retardDays={7}
              animationDuration={40}
            />

            {/* Ligne 1 : KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <KpiTicketsEntrants apiUrl={API_HISPEED_DATA} dateFilterField="date_derniere_maj" />
              <KpiTicketTraite apiUrl={API_HISPEED_DATA} dateSortieField="date_sortie" />
              <KpiReentrant apiUrl={API_HISPEED_DATA} tagField="tag_reentrant" dateField="date_derniere_maj" />
              <KpiTicketsEnCours apiUrl={API_HISPEED_DATA} dateSortieField="date_sortie" dateDerniereMajField="date_derniere_maj" />
              <KpiTicketsEnCoursPlus2S apiUrl={API_HISPEED_DATA} dateSortieField="date_sortie" dateDerniereMajField="date_derniere_maj" />
            </div>

            {/* Ligne 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GroupedBarChart apiUrl={API_HISPEED_DATA} />
              <TranticiteCriticite apiUrl={API_HISPEED_DATA} />
            </div>

            {/* Ligne 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SlaAnciennete apiUrl={API_HISPEED_DATA} />
              <VolumeTicketsDivision apiUrl={API_HISPEED_DATA} />
            </div>

            {/* Ligne 4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RapportSortantsEntrants apiUrl={API_HISPEED_DATA} />
              <TauxReentrants apiUrl={API_HISPEED_DATA} />
            </div>

            {/* Ligne 5 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ClientCoupeChart apiUrl={API_HISPEED_DATA} />
              <VolumeReentrant apiUrl={API_HISPEED_DATA} />
            </div>

            {/* Tableaux */}
              <TicketsReentrantsTable
                apiUrl={API_HISPEED_DATA}
                commentApiUrl={API_COMMENT_UPDATE}/>
              <TicketsEnCoursTable
                apiUrl={API_HISPEED_DATA}
                commentApiUrl={API_COMMENT_UPDATE}/>
          </main>
        </div>
      </div>
    </GlobalFilterProvider>
  );
}
