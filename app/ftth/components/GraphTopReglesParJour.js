"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
  CartesianGrid,
} from "recharts";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand, FaPencilAlt } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fr } from "date-fns/locale";
import fetchWithAuth from "@/utils/fetchWithAuth";
import holidaysMap from "@/app/ftth/utils/holidays.json";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

/* ========================== utils dates (JS pur) ========================== */
function toISO(d) {
  if (!d || isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}
function isWorkingDay(d) {
  const wd = d.getDay(); // 0=dim,6=sam
  return wd !== 0 && wd !== 6;
}
function weekNumber(date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
const quarterOf = (d) => Math.ceil((d.getMonth() + 1) / 3);
const semesterOf = (d) => ((d.getMonth() + 1) <= 6 ? 1 : 2);

function allWorkingDaysBetween(a, b, holidaySet) {
  const res = [];
  const d = new Date(a); d.setHours(0, 0, 0, 0);
  const end = new Date(b); end.setHours(0, 0, 0, 0);
  while (d <= end) {
    const iso = toISO(d);
    if (isWorkingDay(d) && (!holidaySet || !holidaySet.has(iso))) res.push(iso);
    d.setDate(d.getDate() + 1);
  }
  return res;
}
function lastNWorkingDays(isoList, n, holidaySet) {
  return isoList
    .map((s) => ({ s, d: parseISO(s) }))
    .filter((x) => x.d && isWorkingDay(x.d) && (!holidaySet || !holidaySet.has(x.s)))
    .sort((a, b) => b.d - a.d)
    .slice(0, n)
    .sort((a, b) => a.d - b.d)
    .map((x) => x.s);
}

/* ====================== IconButton ====================== */
function IconButton({
  title,
  ariaLabel,
  active = false,
  onClick,
  dataFilterToggle = false,
  size = 30,
  children,
}) {
  const child = React.cloneElement(children, {
    style: { width: size, height: size },
    className: "block pointer-events-none",
  });

  return (
    <button
      type="button"
      onClick={onClick}
      {...(dataFilterToggle ? { "data-filter-toggle": "" } : {})}
      title={title}
      aria-label={ariaLabel || title}
      className={[
        "inline-flex items-center justify-center",
        "w-12 h-12 rounded-full ring-1 shrink-0",
        "leading-none select-none transition-all duration-150",
        "hover:scale-105 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400",
        active
          ? "bg-[#2d3853] text-white ring-[#2d3853]"
          : "bg-gray-200 text-[#2d3853] ring-gray-300 hover:bg-gray-300",
      ].join(" ")}
    >
      {child}
    </button>
  );
}

/* ====================== CustomTooltip ====================== */
const CustomTooltip = ({ active, payload, label, needsLogScale }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800">{label}</p>
        <p className="text-sm">
          <span className="font-medium" style={{ color: data.payload.color }}>
            {data.payload.rule}
          </span>
          : <span className="font-bold">{data.value}</span> cas
        </p>
        {needsLogScale && (
          <p className="text-xs text-gray-500 mt-1">
            (Échelle logarithmique active)
          </p>
        )}
      </div>
    );
  }
  return null;
};

/* ============================ Composant ============================ */
export default function GraphTopReglesParJour({
  apiUrl = "https://api.606510.xyz/dashboard/api/ftth/regle/",
  id = "top-regles-par-jour",
  chartTitle = "Top 5 RÈGLES par jour",
  defaultViewMode = "day",
  defaultNumPeriods = 5,
  externalStartDate = null,
  externalEndDate = null,
  // compat éventuelle
  globalStartDate,
  globalEndDate,
  holidays = [],
  exportMode = false,
  selectedGraphs = [],
  onGraphSelect,
}) {
  // refs UI
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);
  const editorRef = useRef(null);

  // palette stable (définie AVANT tout useMemo qui l'utilise)
  const colorMapRef = useRef({});
  const palette = ["#68bddd", "#6f80ac", "#4B5563", "#9ca3af", "#60a5fa"];
  function colorForRule(rule) {
    if (!colorMapRef.current[rule]) {
      const i = Object.keys(colorMapRef.current).length % palette.length;
      colorMapRef.current[rule] = palette[i];
    }
    return colorMapRef.current[rule];
  }

  // ui
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalChartKey, setModalChartKey] = useState(0); // force re-render dans la modal

  // data / filtres
  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [selectedDates, setSelectedDates] = useState([null, null]);
  const [selectedValues, setSelectedValues] = useState([]);
  const [chartKey, setChartKey] = useState(0);

  // Jours fériés FR + MA
  const holidaySet = useMemo(() => {
    try {
      const frList = holidaysMap?.france ? Object.keys(holidaysMap.france) : [];
      const maList = holidaysMap?.morocco ? Object.keys(holidaysMap.morocco) : [];
      const extra = Array.isArray(holidays) ? holidays : [];
      return new Set([...frList, ...maList, ...extra]);
    } catch {
      return new Set(Array.isArray(holidays) ? holidays : []);
    }
  }, [holidays]);

  // annotations
  const [commentMode, setCommentMode] = useState(false);
  const [comments, setComments] = useState([]);   // {id,text,color,x,y}
  const [editor, setEditor] = useState(null);     // {id?,text,color,x,y,anchor}

  /* ------------- fetch ------------- */
  const reload = () => {
    setErrorText(""); setLoading(true);
    let mounted = true;
    (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetchWithAuth(apiUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        if (!Array.isArray(raw)) throw new Error("Format inattendu: JSON non tableau");

        const mapped = raw.map((r) => {
          const d = new Date(r.date);
          if (isNaN(d.getTime())) return null;
          const iso = toISO(d);
          return {
            ...r,
            dateObj: d,
            dateISO: iso,
            year: d.getFullYear(),
            week: weekNumber(d),
            month: d.getMonth() + 1,
            quarter: quarterOf(d),
            semester: semesterOf(d),
            regle: r.regle,
            nouveau_cas: Number(r.nouveau_cas) || 0,
          };
        }).filter(Boolean);

        if (!mounted) return;

        setRecords(mapped);
        const years = [...new Set(mapped.map((x) => x.year))].sort((a, b) => a - b);
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);

        if (defaultViewMode === "day") {
          const all = [...new Set(mapped.map((x) => x.dateISO))].filter((iso) => {
            const d = parseISO(iso);
            return isWorkingDay(d) && !holidaySet.has(iso);
          });
          const last = lastNWorkingDays(all, 10, holidaySet);
          if (last.length) {
            setSelectedDates([parseISO(last[0]), parseISO(last[last.length - 1])]);
            setSelectedValues(last);
          } else {
            setSelectedDates([null, null]);
            setSelectedValues([]);
          }
        } else {
          const latestYear = years.length ? years[years.length - 1] : new Date().getFullYear();
          setSelectedYear(latestYear);
          const periods = getAvailablePeriodsForYear(mapped, latestYear, defaultViewMode);
          setSelectedValues(periods.slice(-defaultNumPeriods));
        }
      } catch (err) {
        console.error("Fetch FTTH règles error:", err);
        if (mounted) { setRecords([]); setErrorText("Impossible de charger les données (réseau/API)."); }
      } finally {
        clearTimeout(timer);
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  };
  useEffect(reload, [apiUrl]);

  // plage externe/global
  const extStart = externalStartDate ?? globalStartDate ?? null;
  const extEnd   = externalEndDate   ?? globalEndDate   ?? null;
  useEffect(() => {
    if (extStart && extEnd) {
      setViewMode("day");
      setSelectedDates([extStart, extEnd]);
      setSelectedValues(allWorkingDaysBetween(extStart, extEnd, holidaySet));
    }
  }, [extStart, extEnd, holidaySet]);

  // fermer panneaux au clic extérieur
  useEffect(() => {
    const onDown = (e) => {
      if (isOpen && filterPanelRef.current && !filterPanelRef.current.contains(e.target) && !e.target.closest("[data-filter-toggle]")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isOpen]);

  // fermer l'éditeur au clic extérieur
  useEffect(() => {
    const onDown = (e) => {
      if (!editor) return;
      if (editorRef.current && !editorRef.current.contains(e.target)) setEditor(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [editor]);

  // Fix rendu modal : re-key + resize quand ouverte
  useEffect(() => {
    if (modalIsOpen) {
      setModalChartKey((k) => k + 1);
      setTimeout(() => {
        try { window.dispatchEvent(new Event("resize")); } catch {}
      }, 50);
    }
  }, [modalIsOpen]);

  function getAvailablePeriodsForYear(data, year, mode) {
    const key = mode; // "week" | "month" | "quarter" | "semester"
    const s = new Set();
    data.forEach((r) => { if (r.year === year) s.add(r[key]); });
    return Array.from(s).sort((a, b) => a - b);
  }

  /* ----------------- RESET ----------------- */
  const resetGraph = () => {
    setIsOpen(false);
    setModalIsOpen(false);
    setCommentMode(false);
    setEditor(null);
    setComments([]);
    setViewMode(defaultViewMode);
    setSelectedYear(null);
    setSelectedDates([null, null]);
    setSelectedValues([]);
    setErrorText("");
    setChartKey((k) => k + 1);
    reload();
  };

  /* ----------------- filtres ----------------- */
  const handleViewModeChange = (m) => {
    if (m === viewMode) return;
    setViewMode(m);
    if (m === "day") {
      const all = [...new Set(records.map((x) => x.dateISO))];
      const last = lastNWorkingDays(all, 10, holidaySet);
      if (last.length) {
        setSelectedDates([parseISO(last[0]), parseISO(last[last.length - 1])]);
        setSelectedValues(last);
      } else {
        setSelectedDates([null, null]);
        setSelectedValues([]);
      }
    } else {
      const y = selectedYear ?? (availableYears.length ? availableYears[availableYears.length - 1] : new Date().getFullYear());
      setSelectedYear(y);
      const periods = getAvailablePeriodsForYear(records, y, m);
      setSelectedValues(periods.slice(-defaultNumPeriods));
    }
  };
  const handleDayRangeChange = (dates) => {
    const [a, b] = dates;
    setSelectedDates(dates);
    setSelectedValues(a && b ? allWorkingDaysBetween(a, b, holidaySet) : []);
  };
  const handleYearChange = (y) => {
    if (viewMode === "day") return;
    setSelectedYear(y);
    const p = getAvailablePeriodsForYear(records, y, viewMode);
    setSelectedValues(p.slice(-defaultNumPeriods));
  };

  const availablePeriodsForFilter =
    viewMode === "day" || !selectedYear ? [] : getAvailablePeriodsForYear(records, selectedYear, viewMode);

  const allSelected =
    viewMode !== "day" &&
    availablePeriodsForFilter.length > 0 &&
    availablePeriodsForFilter.every((v) => selectedValues.includes(v));

  const toggleSelectAll = () => {
    if (viewMode === "day" || !selectedYear) return;
    setSelectedValues(allSelected ? [] : [...availablePeriodsForFilter]);
  };

  const toggleOne = (v) => {
    if (viewMode === "day") return;
    setSelectedValues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort((a, b) => a - b)));
  };

  /* ----------------- sélection & sous-titre ----------------- */
  const sortedSelectedValues = useMemo(
    () => (viewMode === "day" ? selectedValues.slice().sort() : selectedValues.slice().sort((a, b) => a - b)),
    [selectedValues, viewMode]
  );
  const subtitle = useMemo(() => {
    if (viewMode === "day") {
      const [a, b] = selectedDates;
      if (a && b) return `Du ${toISO(a)} au ${toISO(b)}`;
      return "Aucun jour sélectionné";
    }
    if (!sortedSelectedValues.length) return "Aucune période sélectionnée";
    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const prefix = viewMode === "week" ? "Semaines" : viewMode === "month" ? "Mois" : viewMode === "quarter" ? "Trimestres" : "Semestres";
    const values = sortedSelectedValues.map((v) => {
      if (viewMode === "week") return `S${v}`;
      if (viewMode === "month") return months[v - 1] || v;
      if (viewMode === "quarter") return `T${v}`;
      if (viewMode === "semester") return `S${v}`;
      return String(v);
    });
    return `${selectedYear ? `Année ${selectedYear} - ` : ""}${prefix}: ${values.join(", ")}`;
  }, [viewMode, selectedDates, sortedSelectedValues, selectedYear]);

  /* ----------------- data pour Recharts ----------------- */
  const filteredDatesISO = useMemo(() => {
    if (!records.length) return [];
    const accepts = new Set();
    if (viewMode === "day") {
      sortedSelectedValues.forEach((iso) => accepts.add(iso));
    } else if (selectedYear) {
      records.forEach((r) => {
        if (r.year !== selectedYear) return;
        const key = viewMode === "week" ? r.week : viewMode === "month" ? r.month : viewMode === "quarter" ? r.quarter : r.semester;
        if (sortedSelectedValues.includes(key)) accepts.add(r.dateISO);
      });
    }
    return Array.from(accepts).sort();
  }, [records, viewMode, sortedSelectedValues, selectedYear]);

  const chartData = useMemo(() => {
    if (!records.length) return [];
    const group = new Map();
    records.forEach((r) => {
      if (!filteredDatesISO.length || !filteredDatesISO.includes(r.dateISO)) return;
      if (holidaySet.has(r.dateISO)) return;
      if (!group.has(r.dateISO)) group.set(r.dateISO, []);
      group.get(r.dateISO).push(r);
    });

    const rows = [];
    Array.from(group.keys()).sort().forEach((iso) => {
      const top5 = group.get(iso).slice().sort((a, b) => (b.nouveau_cas || 0) - (a.nouveau_cas || 0)).slice(0, 5);
      top5.forEach((item, idx) => {
        rows.push({
          group: new Date(iso).toLocaleDateString("fr-FR"),
          compositeLabel: idx === 2 ? new Date(iso).toLocaleDateString("fr-FR") : "",
          rule: item.regle,
          value: item.nouveau_cas || 0,
          color: colorForRule(item.regle),
          position: idx,
        });
      });
      rows.push({ group: "", compositeLabel: "", rule: "", value: null, color: "transparent", position: -1 });
    });
    return rows;
  }, [records, filteredDatesISO, holidaySet]);

  // ===== NOUVELLE LOGIQUE D'ÉCHELLE LOGARITHMIQUE =====
  const allValues = chartData.map((d) => d.value || 0).filter(v => v > 0);
  const maxValue = Math.max(...allValues, 0);
  const minValue = Math.min(...allValues.filter(v => v > 0), 1);

  // Fonction pour déterminer si on a besoin d'une échelle logarithmique
  const needsLogScale = maxValue / minValue > 10; // Si ratio > 10, on utilise log

  let yAxisDomain, yAxisScale, formatYAxisTick;

  if (needsLogScale && maxValue > 0) {
    // ÉCHELLE LOGARITHMIQUE
    const logMin = Math.floor(Math.log10(minValue));
    const logMax = Math.ceil(Math.log10(maxValue));
    
    // Domaine logarithmique
    yAxisDomain = [Math.pow(10, logMin), Math.pow(10, logMax)];
    yAxisScale = "log";
    
    // Fonction pour formater les ticks de l'axe Y
    formatYAxisTick = (value) => {
      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
      if (value >= 100) return value.toString();
      if (value >= 10) return value.toString();
      if (value >= 1) return value.toString();
      return value.toFixed(1);
    };
  } else {
    // ÉCHELLE LINÉAIRE (comportement actuel)
    let maxY = 100;
    if (maxValue < 10) maxY = Math.ceil((maxValue + 5) / 10) * 10;
    else if (maxValue < 100) maxY = Math.ceil((maxValue + 10) / 10) * 10;
    else if (maxValue < 1000) maxY = Math.ceil((maxValue + 100) / 100) * 100;
    else maxY = Math.ceil((maxValue + 500) / 500) * 500;
    
    yAxisDomain = [0, maxY];
    yAxisScale = "linear";
    formatYAxisTick = (value) => value.toString();
  }

  const showData = chartData.some((d) => (d.value || 0) > 0);

  /* ===================== Annotations ===================== */
  const openEditorAt = (px, py, anchor) => {
    const ref = anchor === "modal" ? modalChartContainerRef : chartContainerRef;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(Math.max(0.02, (px - rect.left) / rect.width), 0.98);
    const y = Math.min(Math.max(0.02, (py - rect.top) / rect.height), 0.95);
    setEditor({ id: null, text: "", color: "#22c55e", x, y, anchor });
  };

  const addOrUpdateComment = () => {
    if (!editor || !editor.text.trim()) return;
    if (editor.id) {
      setComments((prev) => prev.map((c) => (c.id === editor.id ? { ...c, ...editor } : c)));
    } else {
      setComments((prev) => [...prev, { id: Date.now(), text: editor.text.trim(), color: editor.color, x: editor.x, y: editor.y }]);
    }
    setEditor(null);
    setCommentMode(false);
  };

  const deleteComment = (id) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    setEditor(null);
  };

  const startDrag = (comment, e, anchor) => {
    e.preventDefault();
    const ref = anchor === "modal" ? modalChartContainerRef : chartContainerRef;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const ix = comment.x, iy = comment.y;

    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / rect.width;
      const dy = (ev.clientY - startY) / rect.height;
      const nx = Math.min(Math.max(0.02, ix + dx), 0.98);
      const ny = Math.min(Math.max(0.02, iy + dy), 0.95);
      setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, x: nx, y:ny } : c)));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const openEditorForComment = (c, anchor) =>
    setEditor({ id: c.id, text: c.text, color: c.color, x: c.x, y: c.y, anchor });

  const posStyle = (c, anchor) => {
    const ref = anchor === "modal" ? modalChartContainerRef : chartContainerRef;
    const w = ref.current?.clientWidth || 0;
    const h = ref.current?.clientHeight || 0;
    return { left: `${c.x * w}px`, top: `${c.y * h}px` };
  };

  const popoverStyle = (ed) => {
    const ref = ed.anchor === "modal" ? modalChartContainerRef : chartContainerRef;
    const w = ref.current?.clientWidth || 0;
    const h = ref.current?.clientHeight || 0;
    const px = ed.x * w, py = ed.y * h;
    const left = Math.min(Math.max(8, px - 110), Math.max(8, w - 228));
    const top  = Math.min(Math.max(8, py + 12), Math.max(8, h - 168));
    return { left, top };
  };

  /* ============================ Rendu ============================ */
  if (loading) {
    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-[450px] flex justify-center items-center">
          <p className="text-center text-gray-500">Chargement des données…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{chartTitle}</h3>
            <p className="text-sm text-gray-500 min-h-[20px]">
              {errorText ? <span className="text-red-500">{errorText}</span> : subtitle}
            </p>
            {/* ===== INDICATEUR VISUEL ÉCHELLE LOG ===== */}
            {needsLogScale && showData && (
              <div className="mt-1">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Échelle logarithmique active
                </span>
              </div>
            )}
          </div>

          <div className="no-export flex items-center gap-2">
            {exportMode && (
              <input
                type="checkbox"
                className="w-5 h-5 accent-blue-600"
                checked={selectedGraphs?.includes(id)}
                onChange={(e) => onGraphSelect?.(id, e.target.checked)}
              />
            )}

            <IconButton title="Filtrer" ariaLabel="Filtrer" dataFilterToggle onClick={() => setIsOpen((v) => !v)}>
              <AiOutlineFilter />
            </IconButton>

            <IconButton
              title="Mode commentaire (cliquer sur le graphe)"
              ariaLabel="Commentaires"
              active={commentMode}
              onClick={() => { setCommentMode((v) => !v); setEditor(null); }}
            >
              <FaPencilAlt />
            </IconButton>

            <IconButton title="Rafraîchir le graphe" ariaLabel="Rafraîchir" onClick={resetGraph}>
              <FiRefreshCw />
            </IconButton>

            <IconButton title="Agrandir" ariaLabel="Agrandir" onClick={() => setModalIsOpen(true)}>
              <FaExpand />
            </IconButton>
          </div>

          {/* Panneau filtre */}
          {isOpen && (
            <div
              ref={filterPanelRef}
              className="no-export absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-72 z-50 border border-gray-200"
            >
              <h4 className="font-semibold text-gray-600 text-sm mb-3">Filtrer par :</h4>

              <div className="flex gap-1 mb-3 flex-wrap">
                {["day","week","month","quarter","semester"].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleViewModeChange(m)}
                    className={`px-2.5 py-1 rounded text-xs ${viewMode === m ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                  >
                    {m === "day" ? "Jour" : m === "week" ? "Sem." : m === "month" ? "Mois" : m === "quarter" ? "Trim." : "Sem."}
                  </button>
                ))}
              </div>

              {viewMode === "day" ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Plage de dates :</label>
                  <DatePicker
                    selected={selectedDates[0]}
                    onChange={(d) => handleDayRangeChange(d)}
                    startDate={selectedDates[0]}
                    endDate={selectedDates[1]}
                    selectsRange
                    dateFormat="dd/MM/yyyy"
                    locale={fr}
                    inline
                    filterDate={(d) => isWorkingDay(d) && !holidaySet.has(toISO(d))}
                    calendarClassName="text-sm"
                    dayClassName={() => "text-xs"}
                    maxDate={new Date()}
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                  />
                </div>
              ) : (
                <>
                  {multipleYearsExist && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Année :</h5>
                      <div className="flex flex-wrap gap-1">
                        {availableYears.map((y) => (
                          <button
                            key={y}
                            onClick={() => handleYearChange(y)}
                            className={`px-2 py-0.5 text-xs rounded ${selectedYear === y ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-2">
                    <button
                      onClick={toggleSelectAll}
                      disabled={availablePeriodsForFilter.length === 0}
                      className={`text-xs px-2 py-1 rounded w-full ${allSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                    </button>
                  </div>

                  <div className="max-h-32 overflow-y-auto border border-gray-200 p-2 rounded text-sm">
                    {availablePeriodsForFilter.length ? (
                      availablePeriodsForFilter.map((v) => (
                        <label key={v} className="flex items-center gap-2 my-0.5 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={selectedValues.includes(v)}
                            onChange={() => toggleOne(v)}
                            className="cursor-pointer h-3.5 w-3.5"
                          />
                          {viewMode === "week"
                            ? `S${v}`
                            : viewMode === "month"
                            ? ["Janv.","Fév.","Mars","Avr.","Mai","Juin","Juil.","Août","Sept.","Oct.","Nov.","Déc."][v - 1]
                            : viewMode === "quarter"
                            ? ["T1","T2","T3","T4"][v - 1]
                            : ["S1","S2"][v - 1]}
                        </label>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 text-center italic py-2">Aucune période disponible</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Graphique (carte) */}
        <div className="relative flex-grow h-[350px] select-none" ref={chartContainerRef}>
          {errorText ? (
            <div className="grid place-items-center h-full">
              <div className="text-center">
                <p className="text-red-500 mb-2">{errorText}</p>
                <button onClick={reload} className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">Réessayer</button>
              </div>
            </div>
          ) : showData ? (
            <ResponsiveContainer key={chartKey} width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis
                  dataKey="compositeLabel"
                  angle={-35}
                  textAnchor="end"
                  height={85}
                  tick={{ fontSize: 13, fill: "#1f2937", fontWeight: 600 }}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  domain={yAxisDomain}
                  scale={yAxisScale}
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={formatYAxisTick}
                  tick={{ fontSize: 12, fill: "#374151" }}
                  allowDataOverflow={false}
                />
                <Tooltip content={<CustomTooltip needsLogScale={needsLogScale} />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="rule"
                    position="top"
                    angle={-90}
                    dx={4}
                    dy={-41}
                    style={{ fill: "#374151", fontSize: 12, fontWeight: "bold", textAnchor: "end" }}
                  />
                  {chartData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color || "#ccc"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 italic grid place-items-center h-full">Aucune donnée à afficher.</p>
          )}

          {/* Overlay d'ajout (carte) */}
          {commentMode && (
            <div
              className="absolute inset-0 z-30 cursor-crosshair"
              onClick={(e) => openEditorAt(e.clientX, e.clientY, "main")}
              aria-label="Zone d'ajout de commentaire"
            />
          )}

          {commentMode && (
            <div className="pointer-events-none absolute top-2 right-2 bg-[#2d3853] text-white text-[11px] px-2 py-1 rounded-md shadow z-40">
              Mode commentaire actif — cliquez sur le graphe pour ajouter
            </div>
          )}

          {/* Annotations (carte) */}
          <div className="pointer-events-none absolute inset-0 z-40">
            {comments.map((c) => (
              <div
                key={c.id}
                data-comment-bubble
                className="pointer-events-auto absolute p-2 rounded-lg shadow text-white text-[12px] max-w-[220px] cursor-move"
                style={{ ...posStyle(c, "main"), backgroundColor: c.color }}
                title={c.text}
                onMouseDown={(e) => startDrag(c, e, "main")}
                onDoubleClick={(e) => { e.stopPropagation(); openEditorForComment(c, "main"); }}
              >
                {c.text}
              </div>
            ))}
          </div>

          {/* Popover éditeur (carte) */}
          {editor && editor.anchor === "main" && (
            <div ref={editorRef} className="no-export absolute z-50 w-[220px] bg-white rounded-lg shadow-xl border border-gray-200 p-3" style={popoverStyle(editor)}>
              <textarea value={editor.text} onChange={(e) => setEditor({ ...editor, text: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-sm h-20 outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Votre commentaire…" />
              <div className="flex items-center gap-2 mt-2 mb-3">
                <span className="text-sm text-gray-600">Couleur :</span>
                {["#22c55e","#eab308","#ef4444"].map((c) => (
                  <button key={c} onClick={() => setEditor({ ...editor, color: c })}
                    className={`w-6 h-6 rounded-full border-2 ${editor.color === c ? "border-black" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex gap-2 justify-between">
                <button onClick={addOrUpdateComment} disabled={!editor.text.trim()}
                  className={`px-3 py-1.5 rounded-md text-white text-sm font-semibold ${editor.text.trim() ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}>
                  {editor.id ? "Modifier" : "Ajouter"}
                </button>
                {editor.id && (
                  <button onClick={() => deleteComment(editor.id)} className="px-3 py-1.5 rounded-md text-white text-sm font-semibold bg-red-500 hover:bg-red-600">Supprimer</button>
                )}
                <button onClick={() => setEditor(null)} className="px-3 py-1.5 rounded-md text-sm font-semibold bg-gray-100 hover:bg-gray-200">Fermer</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal plein écran */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => { setModalIsOpen(false); setEditor(null); }}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-lg p-6 w-11/12 md:w-4/5 lg:w-3/4 shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{chartTitle}</h3>
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              {/* ===== INDICATEUR DANS LA MODAL AUSSI ===== */}
              {needsLogScale && showData && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Échelle logarithmique active
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => { setModalIsOpen(false); setEditor(null); }}
              className="text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-red-100 transition"
              title="Fermer"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          {/* Hauteur FIXE pour ResponsiveContainer */}
          <div className="relative w-full h-[520px]" ref={modalChartContainerRef}>
            {errorText ? (
              <div className="grid place-items-center h-full">
                <div className="text-center">
                  <p className="text-red-500 mb-2">{errorText}</p>
                  <button onClick={reload} className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">
                    Réessayer
                  </button>
                </div>
              </div>
            ) : showData ? (
              <ResponsiveContainer key={`m-${chartKey}-${modalChartKey}`} width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="compositeLabel"
                    angle={-35}
                    textAnchor="end"
                    height={85}
                    tick={{ fontSize: 13, fill: "#1f2937", fontWeight: 600 }}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={yAxisDomain}
                    scale={yAxisScale}
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={formatYAxisTick}
                    tick={{ fontSize: 12, fill: "#374151" }}
                    allowDataOverflow={false}
                  />
                  <Tooltip content={<CustomTooltip needsLogScale={needsLogScale} />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="rule"
                      position="top"
                      angle={-90}
                      dx={4}
                      dy={-41}
                      style={{ fill: "#374151", fontSize: 12, fontWeight: "bold", textAnchor: "end" }}
                    />
                    {chartData.map((entry, i) => (
                      <Cell key={`modal-cell-${i}`} fill={entry.color || "#ccc"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 italic grid place-items-center h-full">Aucune donnée à afficher.</p>
            )}

            {/* Overlay d'ajout (modal) */}
            {commentMode && (
              <div className="absolute inset-0 z-30 cursor-crosshair" onClick={(e) => openEditorAt(e.clientX, e.clientY, "modal")} />
            )}

            {/* Annotations (modal) */}
            <div className="pointer-events-none absolute inset-0 z-40">
              {comments.map((c) => (
                <div
                  key={`m-${c.id}`}
                  data-comment-bubble
                  className="pointer-events-auto absolute p-2 rounded-lg shadow text-white text-[12px] max-w-[220px] cursor-move"
                  style={{ ...posStyle(c, "modal"), backgroundColor: c.color }}
                  title={c.text}
                  onMouseDown={(e) => startDrag(c, e, "modal")}
                  onDoubleClick={(e) => { e.stopPropagation(); openEditorForComment(c, "modal"); }}
                >
                  {c.text}
                </div>
              ))}
            </div>

            {editor && editor.anchor === "modal" && (
              <div ref={editorRef} className="no-export absolute z-50 w-[220px] bg-white rounded-lg shadow-xl border border-gray-200 p-3" style={popoverStyle(editor)}>
                <textarea value={editor.text} onChange={(e) => setEditor({ ...editor, text: e.target.value })} className="w-full border border-gray-300 rounded-md p-2 text-sm h-20 outline-none focus:ring-2 focus:ring-blue-400" placeholder="Votre commentaire…" />
                <div className="flex items-center gap-2 mt-2 mb-3">
                  <span className="text-sm text-gray-600">Couleur :</span>
                  {["#22c55e","#eab308","#ef4444"].map((c) => (
                    <button key={c} onClick={() => setEditor({ ...editor, color: c })} className={`w-6 h-6 rounded-full border-2 ${editor.color === c ? "border-black" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex gap-2 justify-between">
                  <button onClick={addOrUpdateComment} disabled={!editor.text.trim()} className={`px-3 py-1.5 rounded-md text-white text-sm font-semibold ${editor.text.trim() ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}>{editor.id ? "Modifier" : "Ajouter"}</button>
                  {editor.id && <button onClick={() => deleteComment(editor.id)} className="px-3 py-1.5 rounded-md text-white text-sm font-semibold bg-red-500 hover:bg-red-600">Supprimer</button>}
                  <button onClick={() => setEditor(null)} className="px-3 py-1.5 rounded-md text-sm font-semibold bg-gray-100 hover:bg-gray-200">Fermer</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}