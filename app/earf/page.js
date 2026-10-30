"use client";

import { useState } from "react";
import useAuth from "@/hooks/useAuth";
import SidebarFTTHStyled from "../components/Sidebar";
import Header from "./components/Header";

import KpiTotalDocuments from "../components/KpiTotalDocuments";
import KpiTotalMigration from "../components/KpiTotalMigration";
import GroupedBarChartEARF from "../components/GroupedBarChartEARF";
import VolumeDocumentsMigres from "../components/VolumeDocumentsMigres";
import VolumeMigration from "../components/VolumeMigration";
import LineChartRates from "../components/LineChartRates";

import { ExportProvider } from "../components/ExportContext";
import { GlobalFilterProvider } from "../components/GlobalFilterContext";

const API_BASE_URL = "https://api.606510.xyz/dashboard/api";
const API_EARF_DATA = `${API_BASE_URL}/earf/data/`;

const TAUX_DIVISORS = {
  XDSL: 450,
  FTTB: 196,
  "EARF-T": 27,
  default: 50,
};

export default function EARFDashboard() {
  const { user, loading, authorized, hydrated } = useAuth(null, "EARF");
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

          {/* ✅ Contenu principal EARF */}
          <div className="flex-1 flex flex-col relative">
            {/* ✅ Background */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 z-0"
              style={{ backgroundImage: "url('/background-office.jpg')" }}
            ></div>

            <Header onGlobalFilter={handleGlobalFilter} />

            <main className="p-6 flex-1 space-y-6 overflow-y-auto relative z-10 bg-gray-50">
              {/* 🔢 KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <KpiTotalDocuments
                  apiUrl={API_EARF_DATA}
                  title="Total Documents"
                  dateField="date"
                />
                <KpiTotalMigration
                  apiUrl={API_EARF_DATA}
                  title="Total Migration"
                  dateField="date"
                />
                <KpiTotalMigration
                  apiUrl={API_EARF_DATA}
                  title="Total Création"
                  dateField="date"
                  typeValue="Création"
                />
              </div>

              {/* 📊 Graphiques – ligne 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GroupedBarChartEARF
                  apiUrl={API_EARF_DATA}
                  title="Type de Document/ETP"
                  dateField="date"
                  ownerField="owner"
                  typeField="type_modop"
                  typeColors={{
                    Migration: "#2196f3",
                    Création: "#2c3e50",
                  }}
                />
                <VolumeDocumentsMigres
                  apiUrl={API_EARF_DATA}
                  title="Volume des Documents Migrés/Semaine"
                  dateField="date"
                  ownerField="owner"
                  typeField="type_modop"
                  targetType="Migration"
                  defaultViewMode="week"
                  maxOwners={10}
                />
              </div>

              {/* 📊 Graphiques – ligne 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <VolumeMigration
                  apiUrl={API_EARF_DATA}
                  title="Documents Migrés par Propriétaire"
                  ownerField="owner"
                  typeField="type_modop"
                  targetType="Migration"
                  dateField="date"
                  maxOwners={10}
                />
                <LineChartRates
                  apiUrl={API_EARF_DATA}
                  title="Taux de Migration et Création"
                  perimetreField="perimetre"
                  typeField="type_modop"
                  weekField="semaine"
                  dateField="date"
                  divisors={TAUX_DIVISORS}
                  migrationType="Migration"
                  creationType="Création"
                />
              </div>
            </main>
          </div>
        </div>
      </GlobalFilterProvider>
    </ExportProvider>
  );
}
