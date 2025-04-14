"use client";

import useAuth from "@/hooks/useAuth";
import Sidebar from "../components/Sidebar";
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
import { useState } from "react";
import NewsTickerRetard from "../components/NewsTickerRetard14";
import { GlobalFilterProvider } from "../components/GlobalFilterContext";


// Configuration des URLs d'API pour ce dashboard spécifique
const API_BASE_URL = "https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api";
const API_HISPEED_DATA = `${API_BASE_URL}/hispeed/data/`;

export default function HispeedDashboard() {
  const { user, loading, authorized, hydrated } = useAuth(null, "HISPEED");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!hydrated || loading || !authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-white text-gray-600 text-xl">
        Chargement...
      </div>
    );
  }

  return (
    <GlobalFilterProvider>
      <div className="flex h-screen w-full">
        {/* Sidebar dynamique avec animation */}
        <div
          className={`bg-white shadow-md transition-all duration-300 ${isSidebarOpen ? "w-56" : "w-16"
            }`}
          onMouseEnter={() => setIsSidebarOpen(true)}
          onMouseLeave={() => setIsSidebarOpen(false)}
        >
          <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        </div>

        {/* Contenu principal */}
        <div className="flex-1 flex flex-col bg-gray-100">
          <Header />

          <main className="p-6 flex-1 space-y-6 overflow-y-auto">
            {/* Le News Ticker en haut avec ses paramètres */}
            <NewsTickerRetard
              apiUrl={API_HISPEED_DATA}
              title="Tickets en retard (+14j)"
              dateSortieField="date_sortie"
              dateDerniereMajField="date_derniere_maj"
              idField="id_ticket"
              titreField="compl_title"
              retardDays={14}
              animationDuration={40}
            />

            {/* Ligne 1 : KPI Cards */}
            <div className="flex justify-center space-x-6">
              <KpiTicketsEntrants
                apiUrl={API_HISPEED_DATA}
                title="Tickets Entrants"
                dateFilterField="date_sortie"
                filterType="range"
              />
              <KpiTicketTraite
                apiUrl={API_HISPEED_DATA}
                title="Tickets Traités"
                dateSortieField="date_sortie"
              />
              <KpiReentrant
                apiUrl={API_HISPEED_DATA}
                title="Tickets Réentrants"
                tagField="tag_reentrant"
                dateField="date_sortie"
              />
              <KpiTicketsEnCours
                apiUrl={API_HISPEED_DATA}
                title="Tickets en Cours"
                dateSortieField="date_sortie"
                dateDerniereMajField="date_derniere_maj"
              />
              <KpiTicketsEnCoursPlus2S
                apiUrl={API_HISPEED_DATA}
                title="Tickets +14j"
                dateSortieField="date_sortie"
                dateDerniereMajField="date_derniere_maj"
                retardDays={14}
                blinkWhenPositive={true}
                dataIdSuffix="Tickets en retard de plus de 14 jours"
              />
            </div>

            {/* Ligne 2 */}
            <div className="grid grid-cols-2 gap-6">
              <GroupedBarChart apiUrl={API_HISPEED_DATA} />
              <TranticiteCriticite apiUrl={API_HISPEED_DATA} />
            </div>

            {/* Ligne 3 */}
            <div className="grid grid-cols-2 gap-6">
              <SlaAnciennete apiUrl={API_HISPEED_DATA} />
              <VolumeTicketsDivision apiUrl={API_HISPEED_DATA} />
            </div>

            {/* Ligne 4 */}
            <div className="grid grid-cols-2 gap-6">
              <RapportSortantsEntrants apiUrl={API_HISPEED_DATA} />
              <TauxReentrants apiUrl={API_HISPEED_DATA} />
            </div>

            {/* Ligne 5 */}
            <div className="grid grid-cols-2 gap-6">
              <ClientCoupeChart apiUrl={API_HISPEED_DATA} />
              <VolumeReentrant apiUrl={API_HISPEED_DATA} />
            </div>

            {/* Ligne 6 */}
            <div>
              <TicketsReentrantsTable apiUrl={API_HISPEED_DATA} />
            </div>
            <div>
              <TicketsEnCoursTable apiUrl={API_HISPEED_DATA} />
            </div>
          </main>
        </div>
      </div>
    </GlobalFilterProvider>
  );
}