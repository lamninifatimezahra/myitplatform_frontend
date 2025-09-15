"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import fetchWithAuth from "@/utils/fetchWithAuth";
import holidaysData from "@/app/ftth/utils/holidays.json";
import { useGlobalFilter } from "@/app/components/GlobalFilterContext";

/* Icône cible + flèche (inline SVG, colorable) */
const BullseyeIcon = ({ color = "currentColor", size = 20, className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="2" fill={color} stroke="none" />
    <path d="M15 9l6-6" />
    <path d="M17 3h4v4" />
    <path d="M12 12l3-3" />
  </svg>
);

export default function KPIBacklogJ1({
  onComponentReady,
  apiUrl = "https://api.606510.xyz/dashboard/api/ftth/stock/",
  fieldName = "non_traite",
}) {
  const { globalStartDate, globalEndDate } = useGlobalFilter();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentValue, setCurrentValue] = useState(0);
  const [error, setError] = useState("");
  const [dataHint, setDataHint] = useState("");
  const readySentRef = useRef(false);

  // ---------- utils ----------
  const normalizeDate = (d) => { const dt = new Date(d); dt.setHours(0,0,0,0); return dt; };
  const toISO = (d) => normalizeDate(d).toISOString().slice(0, 10);
  const fmtISO = (d) => (d ? toISO(d) : "");

  const isWorkingDay = (dateLike) => {
    const date = new Date(dateLike);
    const day = date.getDay();
    const formatted = toISO(date);
    const holidays = [
      ...Object.keys(holidaysData.france || {}),
      ...Object.keys(holidaysData.morocco || {}),
    ];
    return day !== 0 && day !== 6 && !holidays.includes(formatted);
  };

  const sortByDateDesc = (arr) =>
    [...arr].sort((a, b) => normalizeDate(b.date) - normalizeDate(a.date));

  const filterByRangeInclusiveWorkingDays = (arr, start, end) => {
    if (!start || !end) return [];
    const s = normalizeDate(start), e = normalizeDate(end);
    return arr.filter((x) => {
      const dx = normalizeDate(x.date);
      return dx >= s && dx <= e && isWorkingDay(dx);
    });
  };

  const meanOnField = (arr, key) => {
    const vals = arr.map((x) => Number(x?.[key])).filter((v) => Number.isFinite(v));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  // ---------- fetch ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError(""); setDataHint("");
      try {
        const res = await fetchWithAuth(apiUrl);
        if (!res?.ok) throw new Error(`HTTP ${res?.status ?? "??"}`);
        const json = await res.json();
        if (alive) setData(Array.isArray(json) ? json : []);
      } catch {
        if (alive) setError("Impossible de charger le KPI (réseau/CORS/API).");
      } finally {
        if (alive) {
          setLoading(false);
          if (!readySentRef.current && typeof onComponentReady === "function") {
            readySentRef.current = true; onComponentReady();
          }
        }
      }
    })();
    return () => { alive = false; };
  }, [apiUrl, onComponentReady]);

  // ---------- calcul valeur ----------
  useEffect(() => {
    if (!data.length) { setCurrentValue(0); setDataHint("Aucune donnée disponible."); return; }
    const sorted = sortByDateDesc(data);

    if (globalStartDate && globalEndDate) {
      const cur = filterByRangeInclusiveWorkingDays(sorted, globalStartDate, globalEndDate);
      const avg = meanOnField(cur, fieldName);
      if (avg === null) { setCurrentValue(0); setDataHint("Aucune donnée dans la période filtrée."); }
      else { setCurrentValue(Math.round(avg)); setDataHint(""); }
      return;
    }

    const latestWorking = sorted.find((e) => isWorkingDay(e.date));
    if (!latestWorking) { setCurrentValue(0); setDataHint("Aucun jour ouvré trouvé dans les données."); return; }
    setCurrentValue(Number(latestWorking?.[fieldName] ?? 0));
    setDataHint("");
  }, [data, globalStartDate, globalEndDate, fieldName]);

  const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString("fr-FR") : "—");

  // ---------- logique couleur et labels ----------
  const isDanger = currentValue >= 100; // ≥100 rouge, sinon vert
  const hasFilter = !!(globalStartDate && globalEndDate);
  const displayTitle = hasFilter ? "Moyenne KPI" : "KPI du Jour";
  
  // Format des dates pour l'affichage
  const formatDateRange = () => {
    if (!hasFilter) return "Dernière valeur disponible";
    // Format cohérent avec le filtrage
    const startStr = globalStartDate instanceof Date ? 
      globalStartDate.toISOString().slice(0, 10) : 
      globalStartDate.toString().slice(0, 10);
    const endStr = globalEndDate instanceof Date ? 
      globalEndDate.toISOString().slice(0, 10) : 
      globalEndDate.toString().slice(0, 10);
    return `Du ${startStr} au ${endStr}`;
  };

  if (loading) {
    return (
      <div className="visualisation relative w-64" data-id="kpi-backlog-j1">
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <h3 className="text-gray-800 text-lg font-medium">{displayTitle}</h3>
          <div className="flex items-center justify-center w-full mt-4">
            <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="visualisation relative w-64" data-id="kpi-backlog-j1">
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <h3 className="text-gray-800 text-lg font-medium">{displayTitle}</h3>
          <p className="text-red-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      id="kpi-backlog-j1"
      className="visualisation relative w-64"
      data-id="kpi-backlog-j1"
      data-graph-label="KPI Backlog J-1"
      whileHover={{ scale: 1.05 }}
    >
      <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
        <div className="flex justify-between items-start w-full mb-2">
          <h3 className="text-gray-800 text-lg font-medium">{displayTitle}</h3>
          <BullseyeIcon color="#374151" size={20} />
        </div>
        
        <p className="text-xs text-gray-500 mb-1">{formatDateRange()}</p>
        
        <p className={`text-3xl font-bold ${isDanger ? 'text-red-600' : 'text-green-600'}`}>
          {fmt(currentValue)}
        </p>

        {dataHint && (
          <p className="text-xs text-gray-500 mt-1">{dataHint}</p>
        )}
      </div>
    </motion.div>
  );
}