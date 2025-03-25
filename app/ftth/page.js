"use client";
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Card from "./components/Card";
import BarChart from "./components/BarChart";
import DoughnutChart from "./components/DoughnutChart";
import LineChart from "./components/LineChart";
import StackedBarChart from "./components/StackedBarChart";

export default function DashboardFTTH() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col relative">
        {/* Image de fond */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 z-0"
          style={{ backgroundImage: "url('/background-office.jpg')" }}
        ></div>

        {/* Header fixé en haut */}
        <div className="sticky top-0 z-50 bg-white shadow-md">
          <Header />
        </div>

        {/* Contenu du dashboard avec un scrollable container */}
        <div className="flex-1 p-6 space-y-6 overflow-auto relative z-10">
          {/* Section des statistiques */}
          <div className="grid grid-cols-4 gap-6">
            <Card title="Backlog FTTH J-1" value="75" percentage="+18%" description="+3 des commandes" />
            <Card title="Backlog FTTH J" value="1937" percentage="+27%" description="+1531 des commandes" />
            <Card title="Objectif" value="75%" percentage="✓ Dans l'objectif" />
            <Card title="Dossiers Traités" value="2548" percentage="+59%" description="+598 cette semaine" />
          </div>

          {/* Section des graphiques */}
          <div className="grid grid-cols-2 gap-6">
            <DoughnutChart title="Objectif" />
            <BarChart title="Top 5 RÈGLES (Semaine en cours)" />
            <StackedBarChart title="Vue d’ensemble combinée du Backlog" />
            <LineChart title="Entrants vs Sortants" />
          </div>
        </div>
      </div>
    </div>
  );
}
