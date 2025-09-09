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

  // ---------- fetch (sans AbortController) ----------
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

  // ---------- thème dynamique ----------
  const isDanger = currentValue >= 100; // ≥100 rouge, sinon vert
  const palette = isDanger
    ? { bg: "#dc2626", fg: "#ffffff", fgSoft: "rgba(255,255,255,.92)", dot: "#7f1d1d" }
    : { bg: "#059669", fg: "#ffffff", fgSoft: "rgba(255,255,255,.92)", dot: "#064e3b" };

  const hasFilter = !!(globalStartDate && globalEndDate);
  const displayTitle = hasFilter ? "Moyenne KPI" : "KPI du Jour";

  return (
    <motion.div
      id="kpi-backlog-j1"
      className="visualisation relative rounded-lg shadow-md p-4 hover:shadow-xl transition-all duration-300 overflow-hidden min-h-[120px]"
      data-id="kpi-backlog-j1"
      data-graph-label="KPI Backlog J-1"
      whileHover={{ scale: 1.05 }}
    >
      {/* calque de fond qui recouvre 100% (bypass tout bg blanc global) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-lg z-0 pointer-events-none"
        style={{ backgroundColor: palette.bg }}
      />

      {/* contenu */}
      <div className="relative z-10 flex flex-col h-full" style={{ color: palette.fg }}>
        {/* Header (titre + plage + icône cible à droite) */}
        <div className="flex justify-between items-center h-5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold leading-none whitespace-nowrap">{displayTitle}</h3>
            {hasFilter && (
              <>
                <span className="select-none leading-none" style={{ color: palette.fgSoft }}>{"------"}</span>
                <span
                  className="text-[12px] font-medium leading-none whitespace-nowrap"
                  style={{ color: palette.fgSoft }}
                >
                  Du {toISO(globalStartDate)} au {toISO(globalEndDate)}
                </span>
              </>
            )}
          </div>
          <BullseyeIcon color={palette.fgSoft} size={20} />
        </div>

        {/* Zone centrale : valeur centrée + légère descente */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center translate-y-[4px] sm:translate-y-[6px]">
            <p className="text-4xl sm:text-5xl font-bold leading-none tabular-nums tracking-tight">
              {fmt(currentValue)}
            </p>
            <span
              className="block text-lg leading-none mt-1 select-none"
              style={{ color: palette.dot }}
              aria-hidden="true"
            >
              .
            </span>
          </div>
        </div>

        {/* messages optionnels */}
        {error ? (
          <p className="mt-1 text-sm">{error}</p>
        ) : dataHint ? (
          <p className="mt-1 text-xs" style={{ color: palette.fgSoft }}>{dataHint}</p>
        ) : null}
      </div>
    </motion.div>
  );
}
