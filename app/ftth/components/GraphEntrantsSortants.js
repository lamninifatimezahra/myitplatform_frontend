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
  CartesianGrid,
  Label,
  Cell,
} from "recharts";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand, FaPencilAlt } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fr } from "date-fns/locale";
import fetchWithAuth from "@/utils/fetchWithAuth";
import holidaysData from "@/app/ftth/utils/holidays.json";
// Import du contexte global
import { useGlobalFilter } from "@/app/components/GlobalFilterContext";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

/* ========================== utils dates ========================== */
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
const quarterOf  = (d) => Math.ceil((d.getMonth() + 1) / 3);
const semesterOf = (d) => ((d.getMonth() + 1) <= 6 ? 1 : 2);

// MODIFIÉ: Inclure tous les jours ouvrés, même les fériés
function allWorkingDaysBetween(a, b, holidaySet) {
  const res = [];
  const d = new Date(a); d.setHours(0,0,0,0);
  const end = new Date(b); end.setHours(0,0,0,0);
  while (d <= end) {
    const iso = toISO(d);
    if (isWorkingDay(d)) { // Inclure tous les jours ouvrés (lun-ven)
      res.push(iso);
    }
    d.setDate(d.getDate() + 1);
  }
  return res;
}

// MODIFIÉ: Inclure les jours fériés dans les derniers jours ouvrés
function lastNWorkingDays(isoList, n, holidaySet) {
  return isoList
    .map((s) => ({ s, d: parseISO(s) }))
    .filter((x) => x.d && isWorkingDay(x.d)) // Garder tous les jours ouvrés
    .sort((a, b) => b.d - a.d)
    .slice(0, n)
    .sort((a, b) => a.d - b.d)
    .map((x) => x.s);
}

// Fonctions utilitaires pour générer les listes de périodes entre deux dates
function getAllWeeksBetween(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const weeksArray = [];
  const startWeek = weekNumber(startDate);
  const endWeek = weekNumber(endDate);
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  if (startYear === endYear) {
    for (let week = startWeek; week <= endWeek; week++) {
      weeksArray.push(week);
    }
  } else {
    for (let year = startYear; year <= endYear; year++) {
      const maxWeeks = year === endYear ? endWeek : 52;
      const minWeeks = year === startYear ? startWeek : 1;
      for (let week = minWeeks; week <= maxWeeks; week++) {
        weeksArray.push(week);
      }
    }
  }
  return weeksArray;
}

function getAllMonthsBetween(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const monthsArray = [];
  const startMonth = startDate.getMonth() + 1;
  const endMonth = endDate.getMonth() + 1;
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  if (startYear === endYear) {
    for (let month = startMonth; month <= endMonth; month++) {
      monthsArray.push(month);
    }
  } else {
    for (let year = startYear; year <= endYear; year++) {
      const maxMonth = year === endYear ? endMonth : 12;
      const minMonth = year === startYear ? startMonth : 1;
      for (let month = minMonth; month <= maxMonth; month++) {
        monthsArray.push(month);
      }
    }
  }
  return monthsArray;
}

function getAllQuartersBetween(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const quartersArray = [];
  const startQuarter = quarterOf(startDate);
  const endQuarter = quarterOf(endDate);
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  if (startYear === endYear) {
    for (let quarter = startQuarter; quarter <= endQuarter; quarter++) {
      quartersArray.push(quarter);
    }
  } else {
    for (let year = startYear; year <= endYear; year++) {
      const maxQuarter = year === endYear ? endQuarter : 4;
      const minQuarter = year === startYear ? startQuarter : 1;
      for (let quarter = minQuarter; quarter <= maxQuarter; quarter++) {
        quartersArray.push(quarter);
      }
    }
  }
  return quartersArray;
}

function getAllSemestersBetween(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const semestersArray = [];
  const startSemester = semesterOf(startDate);
  const endSemester = semesterOf(endDate);
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  if (startYear === endYear) {
    for (let semester = startSemester; semester <= endSemester; semester++) {
      semestersArray.push(semester);
    }
  } else {
    for (let year = startYear; year <= endYear; year++) {
      const maxSemester = year === endYear ? endSemester : 2;
      const minSemester = year === startYear ? startSemester : 1;
      for (let semester = minSemester; semester <= maxSemester; semester++) {
        semestersArray.push(semester);
      }
    }
  }
  return semestersArray;
}

/* ====================== styles / config ====================== */
const COLORS = ["#68bddd", "#6f80ac", "#4B5563"]; // Stock veille / Fermé hier / Nouveaux cas
const labelStyle = { fill: "#374151", fontSize: 12, fontWeight: "bold" };

/* ===== Légende style Chart.js (top, centrée) ===== */
function LegendInline({ visibleKeys, onClick }) {
  const items = [
    { key: "stock", label: "Stock de la veille", color: COLORS[0] },
    { key: "non_traite", label: "Fermé hier", color: COLORS[1] },
    { key: "traite", label: "Nouveaux cas", color: COLORS[2] },
  ];
  return (
    <div className="w-full flex justify-center items-center mt-1 mb-2 select-none">
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {items.map((it) => {
          const active = visibleKeys.includes(it.key);
          return (
            <li key={it.key}>
              <button
                onClick={(e) => onClick(it.key, e)}
                title="Clic: isoler • Ctrl/Cmd: (dé)cocher"
                className={`inline-flex items-center gap-2 transition-opacity ${active ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
              >
                <span
                  className="inline-block w-3 h-3 rounded-sm border border-gray-300"
                  style={{ backgroundColor: it.color }}
                />
                <span className="text-gray-800 whitespace-nowrap">{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const xAxisTitleFor = (viewMode, year) =>
  viewMode === "day" ? "Jour"
  : viewMode === "week" ? `Semaines ${year ?? ""}`
  : viewMode === "month" ? `Mois ${year ?? ""}`
  : viewMode === "quarter" ? `Trimestres ${year ?? ""}`
  : `Semestres ${year ?? ""}`;

function niceMax(v) {
  const x = Math.max(0, v);
  if (x <= 10) return 10;
  if (x <= 20) return 20;
  if (x <= 50) return 70;
  if (x <= 100) return 150;
  if (x <= 300) return 350;
  return Math.ceil((x * 1.05) / 100) * 100; // ~grace 5%
}

/* ====================== IconButton ====================== */
function IconButton({ title, ariaLabel, active = false, onClick, dataFilterToggle = false, size = 30, children }) {
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
        active ? "bg-[#2d3853] text-white ring-[#2d3853]" : "bg-gray-200 text-[#2d3853] ring-gray-300 hover:bg-gray-300",
      ].join(" ")}
    >
      {child}
    </button>
  );
}

// NOUVEAU: Composant pour afficher "Day off" sur les jours fériés
function DayOffLabel({ viewBox, payload }) {
  if (!payload || !payload.isHoliday) return null;
  
  const { x, width } = viewBox;
  const centerX = x + width / 2;
  const centerY = viewBox.y + viewBox.height / 2;
  
  return (
    <text
      x={centerX}
      y={centerY}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#ef4444"
      fontSize="10"
      fontWeight="bold"
      transform={`rotate(-45 ${centerX} ${centerY})`}
    >
      Day off
    </text>
  );
}

/* ============================ Composant ============================ */
export default function GraphEntrantsSortants({
  apiUrl = "https://api.606510.xyz/dashboard/api/ftth/regle/",
  id = "Entrants – Sortants – Nouveaux cas",
  chartTitle = "Entrants – Sortants – Nouveaux cas",
  defaultViewMode = "day",
  defaultNumPeriods = 5,
  holidays = [],
  exportMode = false,
  selectedGraphs = [],
  onGraphSelect,
}) {
  // refs
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);
  const editorRef = useRef(null);

  // États pour l'initialisation et la gestion du filtre global
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);

  // ui
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [chartKey, setChartKey] = useState(0);
  const [modalChartKey, setModalChartKey] = useState(0);

  // data / filtres
  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [selectedDates, setSelectedDates] = useState([null, null]); // [Date, Date]
  const [selectedValues, setSelectedValues] = useState([]); // day: ISO[] ; sinon: number[]

  // États pour la gestion du filtre global
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
  
  // légende (isolement/toggle)
  const [visibleKeys, setVisibleKeys] = useState(["stock", "non_traite", "traite"]);

  // fériés FR+MA
  const holidaySet = useMemo(() => {
    try {
      const fr = holidaysData?.france ? Object.keys(holidaysData.france) : [];
      const ma = holidaysData?.morocco ? Object.keys(holidaysData.morocco) : [];
      const extra = Array.isArray(holidays) ? holidays : [];
      return new Set([...fr, ...ma, ...extra]);
    } catch {
      return new Set(Array.isArray(holidays) ? holidays : []);
    }
  }, [holidays]);

  // annotations
  const [commentMode, setCommentMode] = useState(false);
  const [comments, setComments] = useState([]);   // {id,text,color,x,y}
  const [editor, setEditor] = useState(null);     // {id?,text,color,x,y,anchor}

  // Extraction du filtre global via le contexte
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Application du filtre global sur les différentes vues
  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate) return;
    
    // Application selon la vue courante
    if (viewMode === "day") {
      const dayList = allWorkingDaysBetween(globalStartDate, globalEndDate, holidaySet);
      setSelectedDates([globalStartDate, globalEndDate]);
      setSelectedValues(dayList);
    } else if (viewMode === "week") {
      const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
      setSelectedValues(weekList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "month") {
      const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
      setSelectedValues(monthList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "quarter") {
      const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate);
      setSelectedValues(quarterList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "semester") {
      const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate);
      setSelectedValues(semesterList);
      setSelectedYear(globalStartDate.getFullYear());
    }
    
    setHasGlobalFilter(true);
  };
  
  /* ----------------- fetch ----------------- */
  const reload = () => {
    setErrorText("");
    setLoading(true);
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
            dateObj: d,
            dateISO: iso,
            year: d.getFullYear(),
            week: weekNumber(d),
            month: d.getMonth() + 1,
            quarter: quarterOf(d),
            semester: semesterOf(d),
            stock: Number(r.nbr_stoc_veille) || 0,
            non_traite: Number(r.fermer_hier) || 0,
            traite: Number(r.nouveau_cas) || 0,
          };
        }).filter(Boolean);

        if (!mounted) return;

        setRecords(mapped);
        const years = [...new Set(mapped.map((x) => x.year))].sort((a, b) => a - b);
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);

        // Initialisation seulement si pas encore fait
        if (!initializationCompleted.current) {
          if (defaultViewMode === "day") {
            const all = [...new Set(mapped.map((x) => x.dateISO))].filter((iso) => {
              const d = parseISO(iso);
              return isWorkingDay(d); // MODIFIÉ: Ne plus exclure les fériés
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
            const selectedPeriods = periods.slice(-defaultNumPeriods);
            setSelectedValues(selectedPeriods);
          }
          initializationCompleted.current = true;
        }

        // Application du filtre global s'il existe
        if (globalStartDate && globalEndDate && !globalFilterApplied.current) {
          applyGlobalFilter();
          globalFilterApplied.current = true;
        }

      } catch (err) {
        console.error("Fetch FTTH entrants/sortants error:", err);
        if (mounted) {
          setRecords([]);
          setErrorText("Impossible de charger les données (réseau/API).");
        }
      } finally {
        clearTimeout(timer);
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  };
  useEffect(reload, [apiUrl]);

  // Application du filtre global quand il change
  useEffect(() => {
    if (globalStartDate && globalEndDate && globalModifiedAt > 0) {
      applyGlobalFilter();
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt]);

  // close panels / editor au clic extérieur + fix modal
  useEffect(() => {
    const onDown = (e) => {
      if (isOpen && filterPanelRef.current && !filterPanelRef.current.contains(e.target) && !e.target.closest("[data-filter-toggle]")) setIsOpen(false);
      if (editor && editorRef.current && !editorRef.current.contains(e.target)) setEditor(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isOpen, editor]);

  useEffect(() => {
    if (modalIsOpen) {
      setModalChartKey((k) => k + 1);
      setTimeout(() => { try { window.dispatchEvent(new Event("resize")); } catch {} }, 50);
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
    setHasGlobalFilter(false);
    setVisibleKeys(["stock","non_traite","traite"]);
    initializationCompleted.current = false;
    globalFilterApplied.current = false;
    setChartKey((k) => k + 1);
    reload();
  };
  
  /* ==================================================================== */
  /* MODIFICATION : Logique de changement de vue pour sélectionner le dernier élément */
  /* ==================================================================== */
  const handleViewModeChange = (newMode) => {
    if (newMode === viewMode || !records.length) return;

    const latestYear = availableYears.length > 0
        ? Math.max(...availableYears)
        : new Date().getFullYear();

    if (newMode === "day") {
        const allISODates = [...new Set(records.map(r => r.dateISO))];
        const lastDayArray = lastNWorkingDays(allISODates, 1, holidaySet);
        
        if (lastDayArray.length > 0) {
            const lastDateObj = parseISO(lastDayArray[0]);
            setSelectedDates([lastDateObj, lastDateObj]);
            setSelectedValues(lastDayArray);
        } else {
            setSelectedDates([null, null]);
            setSelectedValues([]);
        }
    } else {
        setSelectedYear(latestYear);
        const availablePeriods = getAvailablePeriodsForYear(records, latestYear, newMode);
        
        if (availablePeriods.length > 0) {
            const latestPeriod = availablePeriods[availablePeriods.length - 1];
            setSelectedValues([latestPeriod]);
        } else {
            setSelectedValues([]);
        }
    }

    setViewMode(newMode);
    setHasGlobalFilter(false);
  };
  
  const handleDayRangeChange = (dates) => {
    const [a, b] = dates;
    setSelectedDates(dates);
    const dayValues = a && b ? allWorkingDaysBetween(a, b, holidaySet) : [];
    setSelectedValues(dayValues);
    setHasGlobalFilter(false);
  };

  const handleYearChange = (y) => {
    if (viewMode === "day" || y === selectedYear) return;
    
    setSelectedYear(y);
    const availablePeriods = getAvailablePeriodsForYear(records, y, viewMode);
    
    const newSelectedValues = availablePeriods.length > 0
        ? [availablePeriods[availablePeriods.length - 1]]
        : [];
    
    setSelectedValues(newSelectedValues);
    setHasGlobalFilter(false);
  };

  const availablePeriodsForFilter =
    viewMode === "day" || !selectedYear ? [] : getAvailablePeriodsForYear(records, selectedYear, viewMode);

  const allSelected =
    viewMode !== "day" &&
    availablePeriodsForFilter.length > 0 &&
    availablePeriodsForFilter.every((v) => selectedValues.includes(v));

  const toggleSelectAll = () => {
    if (viewMode === "day" || !selectedYear) return;
    const newValues = allSelected ? [] : [...availablePeriodsForFilter];
    setSelectedValues(newValues);
    setHasGlobalFilter(false);
  };

  const toggleOne = (v) => {
    if (viewMode === "day") return;
    const newValues = selectedValues.includes(v) ? selectedValues.filter((x) => x !== v) : [...selectedValues, v].sort((a, b) => a - b);
    setSelectedValues(newValues);
    setHasGlobalFilter(false);
  };

  /* ----------------- dates retenues ----------------- */
  const acceptedDatesISO = useMemo(() => {
    if (!records.length) return [];
    const accepts = new Set();
    if (viewMode === "day") {
      selectedValues.forEach((iso) => accepts.add(iso));
    } else if (selectedYear) {
      records.forEach((r) => {
        if (r.year !== selectedYear) return;
        const key =
          viewMode === "week" ? r.week :
          viewMode === "month" ? r.month :
          viewMode === "quarter" ? r.quarter : r.semester;
        if (selectedValues.includes(key)) accepts.add(r.dateISO);
      });
    }
    const out = Array.from(accepts).filter((iso) => {
      const d = parseISO(iso);
      return d && isWorkingDay(d); // Garder uniquement les jours ouvrés (lun-ven)
    });
    return out.sort();
  }, [records, viewMode, selectedValues, selectedYear, holidaySet]);

  /* ----------------- agrégation -> lignes Recharts ----------------- */
  const chartRows = useMemo(() => {
    if (!records.length || !acceptedDatesISO.length) return [];
    const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

    // init accumulateurs par clé (jour/sem/mois/trim/semestre)
    const agg = new Map(); // key -> { stock, non_traite, traite, label, orderKey, isHoliday }

    const makeKeyAndLabel = (r) => {
      if (viewMode === "day") {
        const d = r.dateObj;
        const dd = String(d.getDate()).padStart(2,"0");
        const mm = String(d.getMonth()+1).padStart(2,"0");
        return { key: r.dateISO, label: `${dd}/${mm} (S${weekNumber(d)})`, orderKey: r.dateISO };
      }
      if (viewMode === "week")     return { key: r.week,     label: `S${r.week}`,         orderKey: r.week };
      if (viewMode === "month")    return { key: r.month,    label: months[r.month-1]||`M${r.month}`, orderKey: r.month };
      if (viewMode === "quarter")  return { key: r.quarter,  label: `T${r.quarter}`,      orderKey: r.quarter };
      if (viewMode === "semester") return { key: r.semester, label: `S${r.semester}`,     orderKey: r.semester };
      return { key: r.dateISO, label: r.dateISO, orderKey: r.dateISO };
    };

    const accepted = new Set(acceptedDatesISO);
    
    // NOUVEAU: Ajouter tous les jours sélectionnés, même ceux sans données
    if (viewMode === "day") {
      acceptedDatesISO.forEach(iso => {
        const d = parseISO(iso);
        if (!d) return;
        
        const { key, label, orderKey } = makeKeyAndLabel({ dateObj: d, dateISO: iso });
        const isHoliday = holidaySet.has(iso);
        
        if (!agg.has(key)) {
          agg.set(key, { 
            stock: 0, 
            non_traite: 0, 
            traite: 0, 
            label, 
            orderKey,
            isHoliday 
          });
        }
      });
    }
    
    records.forEach((r) => {
      if (!accepted.has(r.dateISO)) return;          // filtre jours retenus
      if (viewMode !== "day" && r.year !== selectedYear) return; // sécurité
      
      const { key, label, orderKey } = makeKeyAndLabel(r);
      const isHoliday = viewMode === "day" ? holidaySet.has(r.dateISO) : false;
      
      if (!agg.has(key)) agg.set(key, { stock: 0, non_traite: 0, traite: 0, label, orderKey, isHoliday });
      const slot = agg.get(key);
      
      // MODIFIÉ: Si c'est un jour férié, on met les valeurs à 0
      if (isHoliday) {
        slot.stock = 0;
        slot.non_traite = 0;
        slot.traite = 0;
      } else {
        slot.stock      += r.stock      || 0;
        slot.non_traite += r.non_traite || 0;
        slot.traite     += r.traite     || 0;
      }
    });

    const order = viewMode === "day"
      ? (a, b) => a.orderKey.localeCompare(b.orderKey)
      : (a, b) => a.orderKey - b.orderKey;

    return Array.from(agg.values()).sort(order);
  }, [records, acceptedDatesISO, viewMode, selectedYear, holidaySet]);

  // Y max selon jeux visibles
  const maxVisible = useMemo(() => {
    let m = 0;
    chartRows.forEach((r) => {
      if (r.isHoliday) return; // Ne pas compter les jours fériés pour le max
      if (visibleKeys.includes("stock"))      m = Math.max(m, r.stock);
      if (visibleKeys.includes("non_traite")) m = Math.max(m, r.non_traite);
      if (visibleKeys.includes("traite"))     m = Math.max(m, r.traite);
    });
    return m;
  }, [chartRows, visibleKeys]);
  const maxY = niceMax(maxVisible);
  const showData = chartRows.length > 0 && maxVisible > 0;

  /* ----------------- sous-titre ----------------- */
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
    const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
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

  /* ----------------- légende: click handlers ----------------- */
  const onLegendClick = (key, e) => {
    if (e?.ctrlKey || e?.metaKey) {
      setVisibleKeys((prev) => {
        const has = prev.includes(key);
        const next = has ? prev.filter((k) => k !== key) : [...prev, key];
        return next.length ? next : [key];
      });
      return;
    }
    setVisibleKeys([key]); // isolement
  };

  /* ===================== Annotations (comme l'autre graph) ===================== */
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
    if (editor.id) setComments((prev) => prev.map((c) => (c.id === editor.id ? { ...c, ...editor } : c)));
    else setComments((prev) => [...prev, { id: Date.now(), text: editor.text.trim(), color: editor.color, x: editor.x, y: editor.y }]);
    setEditor(null); setCommentMode(false);
  };
  const deleteComment = (id) => { setComments((p) => p.filter((c) => c.id !== id)); setEditor(null); };
  const startDrag = (comment, e, anchor) => {
    e.preventDefault();
    const ref = anchor === "modal" ? modalChartContainerRef : chartContainerRef;
    const rect = ref.current?.getBoundingClientRect(); if (!rect) return;
    const startX = e.clientX, startY = e.clientY; const ix = comment.x, iy = comment.y;
    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / rect.width;
      const dy = (ev.clientY - startY) / rect.height;
      const nx = Math.min(Math.max(0.02, ix + dx), 0.98);
      const ny = Math.min(Math.max(0.02, iy + dy), 0.95);
      setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, x: nx, y: ny } : c)));
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  };
  const openEditorForComment = (c, anchor) => setEditor({ id: c.id, text: c.text, color: c.color, x: c.x, y: c.y, anchor });
  const posStyle = (c, anchor) => {
    const ref = anchor === "modal" ? modalChartContainerRef : chartContainerRef;
    const w = ref.current?.clientWidth || 0; const h = ref.current?.clientHeight || 0;
    return { left: `${c.x * w}px`, top: `${c.y * h}px` };
  };
  const popoverStyle = (ed) => {
    const ref = ed.anchor === "modal" ? modalChartContainerRef : chartContainerRef;
    const w = ref.current?.clientWidth || 0; const h = ref.current?.clientHeight || 0;
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
        <div className="flex justify-between items-start mb-2 relative">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{chartTitle}</h3>
            <p className="text-sm text-gray-500 min-h-[20px]">
              {errorText ? <span className="text-red-500">{errorText}</span> : subtitle}
            </p>
            {hasGlobalFilter && (
              <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                Filtre global actif
              </span>
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
        </div>

        {/* ===== Légende TOP (comme Chart.js) ===== */}
        <LegendInline visibleKeys={visibleKeys} onClick={onLegendClick} />

        {/* Panneau filtre */}
        {isOpen && (
          <div
            ref={filterPanelRef}
            className="no-export absolute right-0 top-[84px] mt-2 bg-white shadow-lg rounded-md p-4 w-72 z-50 border border-gray-200"
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
                  filterDate={(d) => isWorkingDay(d)} // MODIFIÉ: Ne plus filtrer les fériés
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

        {/* Graphe (carte) */}
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
              <BarChart data={chartRows} margin={{ top: 5, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  angle={-35}
                  textAnchor="end"
                  height={85}
                  tick={{ fontSize: 11, fill: "#1f2937" }}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                >
                  <Label value={xAxisTitleFor(viewMode, selectedYear)} position="insideBottom" offset={-5} style={{ fill: "#374151", fontSize: 12 }} />
                </XAxis>
                <YAxis
                  domain={[0, maxY]}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#1f2937", padding: 10 }}
                >
                  <Label value="Volume" angle={-90} position="insideLeft" offset={-5} style={{ fill: "#374151", fontSize: 12 }} />
                </YAxis>
                <Tooltip />
                {visibleKeys.includes("stock") && (
                  <Bar dataKey="stock" name="Stock de la veille" fill={COLORS[0]} radius={[6, 6, 0, 0]}>
                    <LabelList 
                      dataKey={(entry) => entry.isHoliday ? "" : entry.stock} 
                      position="top" 
                      style={labelStyle} 
                      formatter={(v) => (v > 0 ? v : "")} 
                    />
                  </Bar>
                )}
                {visibleKeys.includes("non_traite") && (
                  <Bar dataKey="non_traite" name="Fermé hier" fill={COLORS[1]} radius={[6, 6, 0, 0]}>
                    <LabelList 
                      dataKey={(entry) => entry.isHoliday ? "" : entry.non_traite} 
                      position="top" 
                      style={labelStyle} 
                      formatter={(v) => (v > 0 ? v : "")} 
                    />
                  </Bar>
                )}
                {visibleKeys.includes("traite") && (
                  <Bar dataKey="traite" name="Nouveaux cas" fill={COLORS[2]} radius={[6, 6, 0, 0]}>
                    <LabelList 
                      dataKey={(entry) => entry.isHoliday ? "" : entry.traite} 
                      position="top" 
                      style={labelStyle} 
                      formatter={(v) => (v > 0 ? v : "")} 
                    />
                  </Bar>
                )}
                
                {/* NOUVEAU: Ajouter les labels "Day off" pour les jours fériés */}
                {viewMode === "day" && (
                  <Bar dataKey="stock" fill="transparent">
                    <LabelList 
                      content={(props) => {
                        const { payload, x, y, width, height } = props;
                        if (!payload || !payload.isHoliday) return null;
                        
                        const centerX = x + width / 2;
                        const centerY = y + height / 2;
                        
                        return (
                          <text
                            x={centerX}
                            y={centerY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#ef4444"
                            fontSize="10"
                            fontWeight="bold"
                            transform={`rotate(-45 ${centerX} ${centerY})`}
                          >
                            Day off
                          </text>
                        );
                      }}
                    />
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 italic grid place-items-center h-full">Aucune donnée à afficher.</p>
          )}

          {/* Overlay ajout annotation (carte) */}
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

          {/* Bulles annotations (carte) */}
          <div className="pointer-events-none absolute inset-0 z-40">
            {comments.map((c) => (
              <div
                key={c.id}
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
                {editor.id && <button onClick={() => deleteComment(editor.id)} className="px-3 py-1.5 rounded-md text-white text-sm font-semibold bg-red-500 hover:bg-red-600">Supprimer</button>}
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
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{chartTitle}</h3>
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
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

          {/* Légende TOP dans la modal */}
          <LegendInline visibleKeys={visibleKeys} onClick={onLegendClick} />

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
                <BarChart data={chartRows} margin={{ top: 5, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    angle={-35}
                    textAnchor="end"
                    height={85}
                    tick={{ fontSize: 11, fill: "#1f2937" }}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                  >
                    <Label value={xAxisTitleFor(viewMode, selectedYear)} position="insideBottom" offset={-5} style={{ fill: "#374151", fontSize: 12 }} />
                  </XAxis>
                  <YAxis
                    domain={[0, maxY]}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#1f2937" }}
                  >
                    <Label value="Volume" angle={-90} position="insideLeft" offset={-5} style={{ fill: "#374151", fontSize: 12 }} />
                  </YAxis>
                  <Tooltip />
                  {visibleKeys.includes("stock") && (
                    <Bar dataKey="stock" fill={COLORS[0]} radius={[6, 6, 0, 0]}>
                      <LabelList 
                        dataKey={(entry) => entry.isHoliday ? "" : entry.stock} 
                        position="top" 
                        style={labelStyle} 
                        formatter={(v) => (v > 0 ? v : "")} 
                      />
                    </Bar>
                  )}
                  {visibleKeys.includes("non_traite") && (
                    <Bar dataKey="non_traite" fill={COLORS[1]} radius={[6, 6, 0, 0]}>
                      <LabelList 
                        dataKey={(entry) => entry.isHoliday ? "" : entry.non_traite} 
                        position="top" 
                        style={labelStyle} 
                        formatter={(v) => (v > 0 ? v : "")} 
                      />
                    </Bar>
                  )}
                  {visibleKeys.includes("traite") && (
                    <Bar dataKey="traite" fill={COLORS[2]} radius={[6, 6, 0, 0]}>
                      <LabelList 
                        dataKey={(entry) => entry.isHoliday ? "" : entry.traite} 
                        position="top" 
                        style={labelStyle} 
                        formatter={(v) => (v > 0 ? v : "")} 
                      />
                    </Bar>
                  )}
                  
                  {/* NOUVEAU: Ajouter les labels "Day off" pour les jours fériés dans la modal */}
                  {viewMode === "day" && chartRows.some(row => row.isHoliday) && (
                    <Bar dataKey={() => 1} fill="transparent">
                      <LabelList 
                        content={(props) => {
                          const { payload, x, y, width, height, index } = props;
                          const rowData = chartRows[index];
                          if (!rowData || !rowData.isHoliday) return null;
                          
                          const centerX = x + width / 2;
                          const centerY = y + height / 2;
                          
                          return (
                            <text
                              key={`modal-dayoff-${index}`}
                              x={centerX}
                              y={centerY}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#ef4444"
                              fontSize="11"
                              fontWeight="bold"
                              transform={`rotate(-45 ${centerX} ${centerY})`}
                            >
                              Day off
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  )}
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