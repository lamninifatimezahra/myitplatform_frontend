"use client";

import { useRef, useState } from "react";
import useAuth from "@/hooks/useAuth";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { GlobalFilterProvider } from "../components/GlobalFilterContext"; // Assurez-vous que le chemin est correct

// Import des composants
import KPIBacklogJ1 from "./components/KPIBacklogJ1";
import KPIBacklogJ from "./components/KPIBacklogJ";
import KPISPA from "./components/KPISPA";
import KPIRules14Days from "./components/KPIRules14Days";
import GraphVueEnsemble from "./components/GraphVueEnsemble";
import GraphRepartitionManuelle from "./components/GraphRepartitionManuelle";
import GraphTopRegles from "./components/GraphTopRegles";
import GraphTopReglesParJour from "./components/GraphTopReglesParJour";
import GraphEntrantsSortants from "./components/GraphEntrantsSortants";
import GraphTraitementEmails from "./components/GraphTraitementEmails";
import GraphRepartitionEmails from "./components/GraphRepartitionEmails";
import NewsTickerReglesFTTH from "./components/NewsTickerReglesFTTH";
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
import SectionRail from "./components/SectionRail";
import BacklogJ from "./components/GraphBacklogJ";
import BacklogChart from "./components/BacklogChart";
import VolumeReentrantsLineChart from "../components/VolumeReentrantLineChart";

// Configuration API
const API_FTTH_TICKETING_BASE = "https://api.606510.xyz/dashboard/api";
const API_FTTH_TICKETING_DATA = `${API_FTTH_TICKETING_BASE}/ftth-data/data/`;
const API_FTTH_COMMENT_UPDATE = `${API_FTTH_TICKETING_BASE}/update-ticket-comment/`;

export default function DashboardFTTH() {
  const { loading, authorized, hydrated } = useAuth(null, "FTTH");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. On garde l'état local. C'est la source de vérité pour cette page.
  const [globalStartDate, setGlobalStartDate] = useState(null);
  const [globalEndDate, setGlobalEndDate] = useState(null);
  const [globalModifiedAt, setGlobalModifiedAt] = useState(0); // Timestamp pour forcer les mises à jour

  const handleGlobalFilter = (start, end) => {
    // On s'assure de gérer les dates nulles correctement
    setGlobalStartDate(start ? new Date(start) : null);
    setGlobalEndDate(end ? new Date(end) : null);
    setGlobalModifiedAt(Date.now()); // On met à jour le timestamp pour signaler un changement
  };

  // Conteneur scrollable + refs sections
  const mainRef = useRef(null);
  const refManual = useRef(null);
  const refTicketing = useRef(null);
  const refMailing = useRef(null);

  const sections = [
    { key: "manual", label: "Manuel", dot: "bg-indigo-600", ref: refManual },
    { key: "ticketing", label: "Ticketing", dot: "bg-sky-500", ref: refTicketing },
    { key: "mailing", label: "Mailing", dot: "bg-emerald-500", ref: refMailing },
  ];

  if (!hydrated || loading || !authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-white text-gray-600 text-xl">
        Chargement...
      </div>
    );
  }

  // 2. On prépare l'objet `value` à passer au Provider.
  // Il contient les dates de notre état local et la fonction pour les changer.
  const filterContextValue = {
    globalStartDate,
    globalEndDate,
    globalModifiedAt,
    setGlobalDates: handleGlobalFilter,
  };

  return (
    // 3. On passe notre état local au Provider via la prop `value`.
    // C'est ici que la connexion est faite.
    <GlobalFilterProvider value={filterContextValue}>
      <div className="flex h-screen w-full overflow-hidden relative bg-gray-50">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="sm:hidden fixed top-4 left-4 z-50 text-gray-700 bg-white shadow p-2 rounded-md"
        >
          ☰
        </button>

        <Sidebar sidebarOpen={isSidebarOpen} setSidebarOpen={setIsSidebarOpen} />

        <div className="flex-1 flex flex-col relative">
          {/* Le Header continue de mettre à jour l'état local de cette page via la prop */}
          <Header onGlobalFilter={handleGlobalFilter} setSidebarOpen={setIsSidebarOpen} />

          <main
            ref={mainRef}
            className="flex-1 p-6 space-y-6 overflow-y-auto relative z-10"
          >
            {/* 
              Tous les composants ci-dessous liront maintenant les bonnes dates 
              car le Provider a été mis à jour avec les valeurs de cette page.
            */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-sky-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-800">Manuel FTTH</h2>
            </div>
            <div className="w-full overflow-hidden border-b border-gray-200 bg-gray-100 rounded-md">
              <NewsTickerReglesFTTH />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPIBacklogJ1 />
              <KPIBacklogJ />
              <KPISPA />
              <KPIRules14Days />
            </div>

            {/* ======= SECTION : MANUEL ======= */}
            <section ref={refManual} className="space-y-6 scroll-mt-16">
              <GraphVueEnsemble />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GraphRepartitionManuelle />
                <GraphTopRegles />
              </div>
              <GraphTopReglesParJour />
              <GraphEntrantsSortants />
            </section>

            {/* ======= SECTION : TICKETING ======= */}
            <section ref={refTicketing} className="space-y-6 scroll-mt-16">
              <div className="flex items-center gap-3 pt-6">
                <div className="w-1 h-8 bg-sky-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-800">Ticketing FTTH</h2>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
                <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-sky-400 rounded-full"></span>
                  Dashboard FTTH Ticketing Détaillé
                </h3>
                <NewsTickerRetard apiUrl={API_FTTH_TICKETING_DATA} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <KpiTicketsEntrants apiUrl={API_FTTH_TICKETING_DATA} />
                  <KpiTicketTraite apiUrl={API_FTTH_TICKETING_DATA} />
                  <KpiReentrant apiUrl={API_FTTH_TICKETING_DATA} />
                  <KpiTicketsEnCours apiUrl={API_FTTH_TICKETING_DATA} />
                  <KpiTicketsEnCoursPlus2S apiUrl={API_FTTH_TICKETING_DATA} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GroupedBarChart apiUrl={API_FTTH_TICKETING_DATA} />
                  <RapportSortantsEntrants apiUrl={API_FTTH_TICKETING_DATA} />
                  <BacklogChart apiUrl={API_FTTH_TICKETING_DATA} />
                  <TranticiteCriticite apiUrl={API_FTTH_TICKETING_DATA} />
                  <SlaAnciennete apiUrl={API_FTTH_TICKETING_DATA} />
                  <VolumeTicketsDivision apiUrl={API_FTTH_TICKETING_DATA} />
                  <TauxReentrants apiUrl={API_FTTH_TICKETING_DATA} />
                  <VolumeReentrant apiUrl={API_FTTH_TICKETING_DATA} />
                  <VolumeReentrantsLineChart apiUrl={API_FTTH_TICKETING_DATA} />
                  
                </div>
                <TicketsReentrantsTable apiUrl={API_FTTH_TICKETING_DATA} commentApiUrl={API_FTTH_COMMENT_UPDATE} tableType="ftth" />
                <TicketsEnCoursTable
                  apiUrl={API_FTTH_TICKETING_DATA}
                  commentApiUrl={API_FTTH_COMMENT_UPDATE}
                  tableType="ftth"  
                />              
                </div>
            </section>

            {/* ======= SECTION : MAILING ======= */}
            <section ref={refMailing} className="space-y-6 scroll-mt-16">
              <div className="flex items-center gap-3 pt-6">
                <div className="w-1 h-8 bg-emerald-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-800">Mailing FTTH</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GraphTraitementEmails />
                <GraphRepartitionEmails />
              </div>
            </section>
                <SectionRail sections={sections} scrollContainerRef={mainRef} />

          </main>

        </div>
      </div>
    </GlobalFilterProvider>
  );
}