'use client';

import { useState } from "react";
import useAuth from "@/hooks/useAuth"; // ✅ Hook d'authentification
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

import KPICard from "./components/KPICard";
import PieChartComponent from "./components/PieChart";
import HistogramChart from "./components/HistogramChart";
import StackedHistogram from "./components/StackedHistogram";

export default function DashboardFTTH() {
  const { user, loading, authorized, hydrated } = useAuth(null, "FTTH");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);


  if (!hydrated || loading || !authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-white text-gray-600 text-xl">
        Chargement...
      </div>
    );
  }



  const dataObjectif = [
    { name: "Dans l'objectif", value: 75, color: "#4CAF50" },
    { name: "Hors objectif", value: 25, color: "#E0E0E0" },
  ];

  const dataRepartition = [
    { name: "DSI-ERP-Acamar", value: 27.7, color: "#4A90E2" },
    { name: "DSI-ERP-Transverse", value: 66, color: "#7B61FF" },
    { name: "Hors SLA Phénix", value: 6.3, color: "#50E3C2" },
  ];

  const dataBacklog = [
    { name: "Jan", value: 10 },
    { name: "Feb", value: 15 },
    { name: "Mar", value: 20 },
    { name: "Apr", value: 25 },
    { name: "May", value: 30 },
    { name: "Jun", value: 35 },
    { name: "Jul", value: 40 },
    { name: "Aug", value: 45 },
    { name: "Sep", value: 50 },
    { name: "Oct", value: 55 },
    { name: "Nov", value: 60 },
    { name: "Dec", value: 65 },
  ];

  const dataTopRegles = [
    { name: "R105", value: 60 },
    { name: "R1730", value: 30 },
    { name: "R1676", value: 20 },
    { name: "R1556", value: 10 },
    { name: "R1517", value: 8 },
  ];

  const dataReglesParJour = [
    { name: "Jan", value: 10000 },
    { name: "Feb", value: 20000 },
    { name: "Mar", value: 25000 },
    { name: "Apr", value: 30000 },
    { name: "May", value: 40000 },
    { name: "Jun", value: 35000 },
    { name: "Jul", value: 32000 },
    { name: "Aug", value: 37000 },
    { name: "Sep", value: 34000 },
    { name: "Oct", value: 39000 },
    { name: "Nov", value: 38000 },
    { name: "Dec", value: 36000 },
  ];

  const dataEntrantsSortants = [
    { month: "Jan", entrants: 20000, sortants: 10000 },
    { month: "Feb", entrants: 25000, sortants: 15000 },
    { month: "Mar", entrants: 30000, sortants: 20000 },
    { month: "Apr", entrants: 35000, sortants: 25000 },
    { month: "May", entrants: 40000, sortants: 30000 },
    { month: "Jun", entrants: 45000, sortants: 35000 },
    { month: "Jul", entrants: 47000, sortants: 36000 },
    { month: "Aug", entrants: 50000, sortants: 37000 },
    { month: "Sep", entrants: 42000, sortants: 31000 },
    { month: "Oct", entrants: 48000, sortants: 33000 },
    { month: "Nov", entrants: 46000, sortants: 32000 },
    { month: "Dec", entrants: 43000, sortants: 30000 },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col relative">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 z-0"
          style={{ backgroundImage: "url('/background-office.jpg')" }}
        ></div>

        <div className="sticky top-0 z-50 bg-white shadow-md">
          <Header />
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-auto relative z-10">
          <div className="grid grid-cols-4 gap-6">
            <KPICard title="Backlog FTTH J-1" value="75" percentage="+18%" description="+3 des commandes" />
            <KPICard title="Backlog FTTH J" value="1937" percentage="+27%" description="+1531 des commandes" />
            <KPICard title="Objectif" value="75%" percentage="✓ Dans l’objectif" />
            <KPICard title="Dossiers Traités" value="2548" percentage="+59%" description="+598 cette semaine" />
          </div>

          <div className="grid grid-cols-3 gap-6">
            <PieChartComponent title="Objectif" data={dataObjectif} />
            <HistogramChart title="Vue d’ensemble combinée du Backlog" data={dataBacklog} dataKey="value" color="#00AEEF" />
            <HistogramChart title="Top 5 RÈGLES (Semaine en cours)" data={dataTopRegles} dataKey="value" color="#4A56E2" />
          </div>

          <div className="grid grid-cols-3 gap-6">
            <PieChartComponent title="Répartition Manuelle (Acteur)" data={dataRepartition} />
            <HistogramChart title="Top 5 RÈGLES par jour" data={dataReglesParJour} dataKey="value" color="#7B61FF" />
            <StackedHistogram title="Entrants vs Sortants" data={dataEntrantsSortants} />
          </div>
        </div>
      </div>
    </div>
  );
}
