"use client";

import { useRef, useState } from "react";
import useAuth from "@/hooks/useAuth";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

import KPIBacklogJ1 from "./components/KPIBacklogJ1";
import KPIBacklogJ from "./components/KPIBacklogJ";
import KPISPA from "./components/KPISPA";

import GraphVueEnsemble from "./components/GraphVueEnsemble";
import GraphRepartitionManuelle from "./components/GraphRepartitionManuelle";
import GraphTopRegles from "./components/GraphTopRegles";
import GraphTopReglesParJour from "./components/GraphTopReglesParJour";
import GraphEntrantsSortants from "./components/GraphEntrantsSortants";
import GraphTraitementEmails from "./components/GraphTraitementEmails";
import GraphRepartitionEmails from "./components/GraphRepartitionEmails";
import GraphTicketsEntrantsSortants from "./components/GraphTicketsEntrantsSortants";
import GraphTicketsItsSfr from "./components/GraphTicketsItsSfr";
import NewsTickerReglesFTTH from "./components/NewsTickerReglesFTTH";

// ★ Nouveau composant
import SectionRail from "./components/SectionRail";

export default function DashboardFTTH() {
  const { loading, authorized, hydrated } = useAuth(null, "FTTH");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalStartDate, setGlobalStartDate] = useState(null);
  const [globalEndDate, setGlobalEndDate] = useState(null);

  const handleGlobalFilter = (start, end) => {
    setGlobalStartDate(new Date(start));
    setGlobalEndDate(new Date(end));
  };

  // Conteneur scrollable + refs sections
  const mainRef = useRef(null);
  const refManual = useRef(null);
  const refTicketing = useRef(null);
  const refMailing = useRef(null);

  // Définition des sections (ordre, labels, couleurs)
  const sections = [
    { key: "manual", label: "Manuel",  dot: "bg-indigo-600",  ref: refManual },
    { key: "ticketing", label: "Ticketing", dot: "bg-sky-500",   ref: refTicketing },
    { key: "mailing", label: "Mailing",  dot: "bg-emerald-500", ref: refMailing },
  ];

  if (!hydrated || loading || !authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-white text-gray-600 text-xl">
        Chargement...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {/* Menu mobile */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="sm:hidden fixed top-4 left-4 z-50 text-gray-700 bg-white shadow p-2 rounded-md"
      >
        ☰
      </button>

      {/* Sidebar */}
      <Sidebar sidebarOpen={isSidebarOpen} setSidebarOpen={setIsSidebarOpen} />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col relative">
        <Header onGlobalFilter={handleGlobalFilter} setSidebarOpen={setIsSidebarOpen} />

        <main
          ref={mainRef}
          className="flex-1 p-6 space-y-6 overflow-y-auto relative z-10 bg-gray-50"
        >
          {/* Ticker */}
          <div className="w-full overflow-hidden border-b border-gray-200 bg-gray-100 rounded-md">
            <NewsTickerReglesFTTH />
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div id="kpi-backlog-j1"><KPIBacklogJ1 /></div>
            <div id="kpi-backlog-j"><KPIBacklogJ /></div>
            <div id="kpi-spa"><KPISPA /></div>
          </div>

          {/* ======= SECTION : MANUEL ======= */}
          <section ref={refManual} className="space-y-6 scroll-mt-16">
            <div className="grid grid-cols-1 gap-6">
              <div data-graph-id="graph-vue-ensemble" data-graph-label="Vue d’ensemble combinée du Backlog">
                <GraphVueEnsemble
                  externalStartDate={globalStartDate}
                  externalEndDate={globalEndDate}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div data-graph-id="graph-repartition-manuelle" data-graph-label="Répartition Manuelle (Acteur)">
                <GraphRepartitionManuelle globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
              </div>
              <div data-graph-id="graph-top-regles" data-graph-label="Top 5 RÈGLES">
                <GraphTopRegles globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div data-graph-id="graph-top-regles-par-jour" data-graph-label="Top 5 RÈGLES par jour">
                <GraphTopReglesParJour globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div data-graph-id="graph-entrants-sortants" data-graph-label="Entrants – Sortants – Nouveaux cas">
                <GraphEntrantsSortants globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
              </div>
            </div>
          </section>

          {/* ======= SECTION : TICKETING ======= */}
          <section ref={refTicketing} className="space-y-6 scroll-mt-16">
            <div className="grid grid-cols-1 gap-6">
              <div data-graph-id="graph-tickets-entrants-sortants" data-graph-label="Tickets Entrants/Sortants">
                <GraphTicketsEntrantsSortants globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div data-graph-id="graph-tickets-its-sfr" data-graph-label="Tickets ITS ↔ SFR">
                <GraphTicketsItsSfr globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
              </div>
            </div>
          </section>

          {/* ======= SECTION : MAILING ======= */}
          <section ref={refMailing} className="space-y-6 scroll-mt-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div data-graph-id="graph-traitement-emails" data-graph-label="Traitement des Emails">
                <GraphTraitementEmails globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
              </div>
              <div data-graph-id="graph-repartition-emails" data-graph-label="Répartition des Emails">
                <GraphRepartitionEmails globalStartDate={globalStartDate} globalEndDate={globalEndDate} />
              </div>
            </div>
          </section>
        </main>

        {/* ★ Barre Excel réutilisable */}
        <SectionRail
          sections={sections}
          scrollContainerRef={mainRef}
          anchorSelector="[data-graph-id='graph-vue-ensemble']"
        />
      </div>
    </div>
  );
}

/* Ajoute (si besoin) dans ton global.css :
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
*/
