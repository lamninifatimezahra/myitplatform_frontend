'use client';

import useAuth from "@/hooks/useAuth";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import KpiCard from "./components/KPITicketTraite";
import KpiReentrant from "./components/KpiReentrant";
import KpiTicketsEntrants from "./components/KpiTicketsEntrants";
import TranticiteCriticite from "./components/TranticiteCriticite";
import KpiTicketsEnCours from "./components/KpiTicketsEnCours";
import VolumeReentrant from "./components/VolumeReentrant";
import SlaAnciennete from "./components/SlaAnciennete";
import VolumeTicketsDivision from "./components/VolumeTicketsDivision";
import TauxReentrants from "./components/TauxReentrants";
import ClientCoupeChart from "./components/ClientCoupeChart";
import GroupedBarChart from "./components/TicketsEntrantsSortants";
import RapportSortantsEntrants from "./components/RapportSortantsEntrants";
import TicketsReentrantsTable from "./components/TicketsReentrantsTable";
import TicketsEnCoursTable from "./components/TicketsEncoursTable";
import { ExportProvider } from "./components/ExportContext";
import { useState } from "react";

export default function HispeedDashboard() {
  const { user, loading } = useAuth(null, "HISPEED");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 🔁 pour sidebar dynamique

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        Chargement sécurisé...
      </div>
    );
  }

  return (
    <ExportProvider>
      <div className="flex h-screen w-full overflow-hidden">
        {/* Sidebar dynamique avec animation */}
        <div
          className={`bg-white shadow-md transition-all duration-300 ${
            isSidebarOpen ? "w-56" : "w-16"
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
            {/* Ligne 1 : KPI Cards */}
            <div className="flex justify-center space-x-6">
              <KpiTicketsEntrants />
              <KpiCard />
              <KpiTicketsEnCours />
              <KpiReentrant />
            </div>

            {/* Ligne 2 */}
            <div className="grid grid-cols-2 gap-6">
              <GroupedBarChart />
              <TranticiteCriticite />
            </div>

            {/* Ligne 3 */}
            <div className="grid grid-cols-2 gap-6">
              <SlaAnciennete />
              <VolumeTicketsDivision />
            </div>

            {/* Ligne 4 */}
            <div className="grid grid-cols-2 gap-6">
              <RapportSortantsEntrants />
              <TauxReentrants />
            </div>

            {/* Ligne 5 */}
            <div className="grid grid-cols-2 gap-6">
              <ClientCoupeChart />
              <VolumeReentrant />
            </div>

            {/* Ligne 6 */}
            <div>
              <TicketsReentrantsTable />
            </div>
            <div>
              <TicketsEnCoursTable />
            </div>
          </main>
        </div>
      </div>
    </ExportProvider>
  );
}
