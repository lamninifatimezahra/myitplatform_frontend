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

// ★ Composants HISPEED importés
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

// ★ Nouveau composant
import SectionRail from "./components/SectionRail";

// Configuration API pour FTTH Ticketing (même structure que HISPEED)
const API_FTTH_TICKETING_BASE = "https://api.606510.xyz/dashboard/api";
const API_FTTH_TICKETING_DATA = `${API_FTTH_TICKETING_BASE}/ftth-data/data/`;
const API_FTTH_COMMENT_UPDATE = `${API_FTTH_TICKETING_BASE}/update-ticket-comment/`;

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
    <GlobalFilterProvider>
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
                <div data-graph-id="graph-vue-ensemble" data-graph-label="Vue d'ensemble combinée du Backlog">
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

            {/* ======= SECTION : TICKETING (avec FTTH Ticketing intégré) ======= */}
            <section ref={refTicketing} className="space-y-6 scroll-mt-16">
              {/* Titre de section */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-sky-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-800">Ticketing FTTH</h2>
              </div>

              {/* Section FTTH Ticketing Dashboard intégré */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-6 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-sky-400 rounded-full"></span>
                  Dashboard FTTH Ticketing Détaillé
                </h3>

                {/* Ticker de retard FTTH */}
                <div className="mb-6">
                  <NewsTickerRetard
                    apiUrl={API_FTTH_TICKETING_DATA}
                    title="Tickets FTTH en retard (+ Semaine)"
                    dateSortieField="date_sortie"
                    dateDerniereMajField="date_derniere_maj"
                    idField="id_ticket"
                    titreField="compl_title"
                    retardDays={7}
                    animationDuration={40}
                  />
                </div>

                {/* KPI FTTH Ticketing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                  <KpiTicketsEntrants apiUrl={API_FTTH_TICKETING_DATA} dateFilterField="date_derniere_maj" />
                  <KpiTicketTraite apiUrl={API_FTTH_TICKETING_DATA} dateSortieField="date_sortie" />
                  <KpiReentrant apiUrl={API_FTTH_TICKETING_DATA} tagField="tag_reentrant" dateField="date_derniere_maj" />
                  <KpiTicketsEnCours apiUrl={API_FTTH_TICKETING_DATA} dateSortieField="date_sortie" dateDerniereMajField="date_derniere_maj" />
                  <KpiTicketsEnCoursPlus2S apiUrl={API_FTTH_TICKETING_DATA} dateSortieField="date_sortie" dateDerniereMajField="date_derniere_maj" />
                </div>

                {/* Graphiques ligne 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <GroupedBarChart apiUrl={API_FTTH_TICKETING_DATA} />
                  <TranticiteCriticite apiUrl={API_FTTH_TICKETING_DATA} />
                </div>

                {/* Graphiques ligne 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <SlaAnciennete apiUrl={API_FTTH_TICKETING_DATA} />
                  <VolumeTicketsDivision apiUrl={API_FTTH_TICKETING_DATA} />
                </div>

                {/* Graphiques ligne 3 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <RapportSortantsEntrants apiUrl={API_FTTH_TICKETING_DATA} />
                  <TauxReentrants apiUrl={API_FTTH_TICKETING_DATA} />
                </div>

                {/* Graphiques ligne 4 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <VolumeReentrant apiUrl={API_FTTH_TICKETING_DATA} />
                  <GraphTicketsItsSfr globalStartDate={globalStartDate} globalEndDate={globalEndDate} />

                </div>

                {/* Tableaux FTTH Ticketing */}
                <div className="space-y-6">
                  <TicketsReentrantsTable
                    apiUrl={API_FTTH_TICKETING_DATA}
                    commentApiUrl={API_FTTH_COMMENT_UPDATE}
                  />
                  <TicketsEnCoursTable
                    apiUrl={API_FTTH_TICKETING_DATA}
                    commentApiUrl={API_FTTH_COMMENT_UPDATE}
                  />
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
    </GlobalFilterProvider>
  );
}