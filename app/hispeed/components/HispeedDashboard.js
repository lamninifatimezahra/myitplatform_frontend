"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../config"; // Import de l'URL du backend
import KpiCard from "./KPITicketTraite";
import Chart from "./Chart";

export default function HispeedDashboard() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">Dashboard HISPEED</h1>

      {/* Section KPI */}
      <div className="grid grid-cols-3 gap-5 mt-5">
        <KpiCard title="Tickets Traités" endpoint="tickets_traites" />
        <KpiCard title="Tickets Réentrants" endpoint="tickets_reentrants" />
        <KpiCard title="Tickets Entrants" endpoint="tickets_entrants" />
      </div>

      {/* Section Graphiques */}
      <div className="grid grid-cols-2 gap-5 mt-5">
        <Chart title="Entrant Par Jour" endpoint="entrant_par_jour" type="bar" />
        <Chart title="Tranticité / Criticité" endpoint="tranticite_criticite" type="bar" />
        <Chart title="Client Coupé" endpoint="client_coupe" type="bar" />
      </div>
    </div>
  );
}
