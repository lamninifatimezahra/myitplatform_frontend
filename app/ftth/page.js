"use client";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Card from "./components/Card";
import BarChart from "./components/BarChart";
import DoughnutChart from "./components/DoughnutChart";
import LineChart from "./components/LineChart";
import StackedBarChart from "./components/StackedBarChart";

export default function DashboardFTTH() {
  return (
    <div className="flex h-screen relative">
      {/* Image de fond */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url('/background-office.jpg')" }}
      ></div>

      {/* Sidebar */}
      <div className="relative z-20 bg-white shadow-md w-64">
        <Sidebar />
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col relative z-10 max-w-[calc(100%-250px)] mx-auto">
        {/* Header avec le filtre de date inclus */}
        <Header />

        {/* Contenu du dashboard */}
        <div className="p-6 space-y-6">
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