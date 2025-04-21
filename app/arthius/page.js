"use client";

import useAuth from "@/hooks/useAuth";
import Sidebar from "../components/Sidebar";
import Header from "./components/Header";
import { useState } from "react";
import KpiTotalDocuments from "../components/KpiTotalDocuments";
import KpiTotalMigration from "../components/KpiTotalMigration";
import GroupedBarChartEARF from "../components/GroupedBarChartEARF";
import VolumeDocumentsMigres from "../components/VolumeDocumentsMigres1";
import { ExportProvider } from "../components/ExportContext";
import { GlobalFilterProvider } from "../components/GlobalFilterContext";
import VolumeMigration from "../components/VolumeMigration";
import LineChartRates from "../components/LineChartRates";

// Configuration des URLs d'API pour ce dashboard spécifique
const API_BASE_URL = "https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api";
const API_EARF_DATA = `${API_BASE_URL}/arthius/data/`;
const TAUX_DIVISORS = {
    "XDSL": 450,
    "FTTB": 196,
    "EARF-T": 27,
    "default": 50
  };
export default function EARFDashboard() {
  const { user, loading, authorized, hydrated } = useAuth(null, "EARF");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        <div className="flex h-screen w-full">
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
                <KpiTotalDocuments 
                  apiUrl={API_EARF_DATA}
                  title="Total Documents"
                  dateField="date"
                />
              </div>

              {/* Ligne 2 : Graphiques */}
              <div className="grid grid-cols-2 gap-6">
                  <GroupedBarChartEARF 
                    apiUrl={API_EARF_DATA}
                    title="Documents par Propriétaire et Type"
                    dateField="date"
                    ownerField="initiateur"
                    typeField="type_modop"
                  />
                  <VolumeDocumentsMigres
                    apiUrl={API_EARF_DATA}
                    title="Volume de Documents Migrés par Période"
                    dateField="date"
                    ownerField="initiateur"
                    typeField="type_modop"
                    />

              </div>
              <div className="grid grid-cols-2 gap-6">
                <VolumeMigration 
                    apiUrl={API_EARF_DATA}
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