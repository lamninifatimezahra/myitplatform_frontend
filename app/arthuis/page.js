"use client";

import { useState } from "react";
import useAuth from "@/hooks/useAuth";
import SidebarFTTHStyled from "../components/Sidebar";
import Header from "./components/Header";

import KpiTotalDocuments from "../components/KpiTotalDocuments";
import GroupedBarChartEARF from "../components/GroupedBarChartEARF";
import VolumeDocumentsMigres from "../components/VolumeDocumentsMigres1";
import VolumeMigration from "../components/VolumeMigration";

import { ExportProvider } from "../components/ExportContext";
import { GlobalFilterProvider } from "../components/GlobalFilterContext";

//  API pour le dashboard Arthius
const API_BASE_URL = "https://api.606510.xyz/dashboard/api";
const API_ARTHIUS_DATA = `${API_BASE_URL}/arthius/data/`;

export default function ArthiusDashboard() {
  const { user, loading, authorized, hydrated } = useAuth(null, "ARTHUIS");
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

          {/* ✅ Sidebar style FTTH */}
          <SidebarFTTHStyled
            sidebarOpen={isSidebarOpen}
            setSidebarOpen={setIsSidebarOpen}
          />

          {/* ✅ Contenu principal Arthius */}
          <div className="flex-1 flex flex-col relative">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 z-0"
              style={{ backgroundImage: "url('/background-office.jpg')" }}
            ></div>

            <Header onGlobalFilter={handleGlobalFilter} />

            <main className="p-6 flex-1 space-y-6 overflow-y-auto relative z-10 bg-gray-50">
              {/* 🔢 KPI ligne 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 gap-6">
                <KpiTotalDocuments
                  apiUrl={API_ARTHIUS_DATA}
                  title="Total Documents"
                  dateField="date"
                />
              </div>

              {/* 📊 Graphiques ligne 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GroupedBarChartEARF
                  apiUrl={API_ARTHIUS_DATA}
                  title="Documents par Propriétaire et Type"
                  dateField="date"
                  ownerField="initiateur"
                  typeField="type_modop"
                />
                <VolumeDocumentsMigres
                  apiUrl={API_ARTHIUS_DATA}
                  title="Volume de Documents Migrés par Période"
                  dateField="date"
                  ownerField="initiateur"
                  typeField="type_modop"
                />
              </div>

              {/* 📊 Graphiques ligne 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <VolumeMigration
                  apiUrl={API_ARTHIUS_DATA}
                  title="Documents Migrés par Propriétaire"
                  ownerField="initiateur"
                  typeField="type_modop"
                  dateField="date"
                />
              </div>
            </main>
          </div>
        </div>
      </GlobalFilterProvider>
    </ExportProvider>
  );
}
