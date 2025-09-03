"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand, FaPencilAlt } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fr } from "date-fns/locale";
import Modal from "react-modal";
import fetchWithAuth from "@/utils/fetchWithAuth";
// Import du contexte global
import { useGlobalFilter } from "@/app/components/GlobalFilterContext";

// 👉 Jours fériés FR + MA
import holidaysMap from "@/app/ftth/utils/holidays.json";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels);
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
const quarterOf = (d) => Math.ceil((d.getMonth() + 1) / 3);
const semesterOf = (d) => ((d.getMonth() + 1) <= 6 ? 1 : 2);

function allWorkingDaysBetween(a, b, holidaySet) {
  const res = [];
  const d = new Date(a); d.setHours(0,0,0,0);
  const end = new Date(b); end.setHours(0,0,0,0);
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

/* ====================== Légende custom (style Chart.js, top centrée) ====================== */
const COLORS = ["#68bddd", "#6f80ac", "#4B5563"]; // J / J-1 / Traités

function LegendInline({ visibleKeys, onClick }) {
  const items = [
    { key: "stock",       label: "Backlog FTTH J",   color: COLORS[0] },
    { key: "non_traite",  label: "Backlog FTTH J-1", color: COLORS[1] },
    { key: "traite",      label: "Dossiers Traités", color: COLORS[2] },
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

/* ============================ Composant ============================ */
export default function GraphVueEnsemble({
  apiUrl = "https://api.606510.xyz/dashboard/api/ftth/stock/",
  id = "vue-ensemble-backlog",
  chartTitle = "Vue d'ensemble combinée du Backlog",
  defaultViewMode = "day",
  defaultNumPeriods = 5,
  holidays = [],
}) {
  // Références et états de base
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);
  const editorRef = useRef(null);

  // États pour l'initialisation et la gestion du filtre global
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);
  const prevViewMode = useRef(null);

  // ui
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  // data / filtres
  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [selectedDates, setSelectedDates] = useState([null, null]);
  const [selectedValues, setSelectedValues] = useState([]);
  const [chartKey, setChartKey] = useState(0); // force remount du chart (légende, etc.)

  // États pour la gestion du filtre global
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);

  // États pour mémoriser les sélections selon la vue
  const [weekViewSelection, setWeekViewSelection] = useState({
    values: [],
    year: null
  });
  const [monthViewSelection, setMonthViewSelection] = useState({
    values: [],
    year: null
  });
  const [quarterViewSelection, setQuarterViewSelection] = useState({
    values: [],
    year: null
  });
  const [semesterViewSelection, setSemesterViewSelection] = useState({
    values: [],
    year: null
  });
  const [dayViewSelection, setDayViewSelection] = useState({
    dates: [null, null],
    values: []
  });

  // États pour la gestion de la priorisation des filtres locaux vs globaux
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);
  const [quarterSelectionModifiedAt, setQuarterSelectionModifiedAt] = useState(0);
  const [semesterSelectionModifiedAt, setSemesterSelectionModifiedAt] = useState(0);
  const [daySelectionModifiedAt, setDaySelectionModifiedAt] = useState(0);

  // ===== Légende custom : jeux visibles
  const [visibleKeys, setVisibleKeys] = useState(["stock", "non_traite", "traite"]);

  // ====== Jours fériés FR + MA ======
  const holidaySet = useMemo(() => {
    try {
      const fr = holidaysMap?.france ? Object.keys(holidaysMap.france) : [];
      const ma = holidaysMap?.morocco ? Object.keys(holidaysMap.morocco) : [];
      const extra = Array.isArray(holidays) ? holidays : [];
      return new Set([...fr, ...ma, ...extra]);
    } catch {
      return new Set(Array.isArray(holidays) ? holidays : []);
    }
  }, [holidays]);

  // annotations
  const [commentMode, setCommentMode] = useState(false);
  const [comments, setComments] = useState([]);   // {id, text, color, x, y}
  const [editor, setEditor] = useState(null);     // {id?, text, color, x, y, anchor}

  // Extraction du filtre global via le contexte
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Application du filtre global sur les différentes vues
  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate) return;
    
    // Calcul des listes pour chaque mode de vue
    const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
    const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
    const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate);
    const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate);
    const dayList = allWorkingDaysBetween(globalStartDate, globalEndDate, holidaySet);

    // Mise à jour de toutes les sélections de vue
    setWeekViewSelection({
      values: weekList,
      year: globalStartDate.getFullYear()
    });
    setMonthViewSelection({
      values: monthList,
      year: globalStartDate.getFullYear()
    });
    setQuarterViewSelection({
      values: quarterList,
      year: globalStartDate.getFullYear()
    });
    setSemesterViewSelection({
      values: semesterList,
      year: globalStartDate.getFullYear()
    });
    setDayViewSelection({
      dates: [globalStartDate, globalEndDate],
      values: dayList
    });
    
    // Application selon la vue courante
    if (viewMode === "day") {
      setSelectedDates([globalStartDate, globalEndDate]);
      setSelectedValues(dayList);
    } else if (viewMode === "week") {
      setSelectedValues(weekList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "month") {
      setSelectedValues(monthList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "quarter") {
      setSelectedValues(quarterList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "semester") {
      setSelectedValues(semesterList);
      setSelectedYear(globalStartDate.getFullYear());
    }
    
    setHasGlobalFilter(true);
  };

  // Conserver l'état de la vue quand celle-ci change
  useEffect(() => {
    if (!prevViewMode.current) {
      prevViewMode.current = viewMode;
      return;
    }

    // Sauvegarder l'état de l'ancienne vue
    if (prevViewMode.current === "day") {
      setDayViewSelection({
        dates: selectedDates,
        values: selectedValues
      });
    } else if (prevViewMode.current === "week") {
      setWeekViewSelection({
        values: selectedValues,
        year: selectedYear,
      });
    } else if (prevViewMode.current === "month") {
      setMonthViewSelection({
        values: selectedValues,
        year: selectedYear,
      });
    } else if (prevViewMode.current === "quarter") {
      setQuarterViewSelection({
        values: selectedValues,
        year: selectedYear,
      });
    } else if (prevViewMode.current === "semester") {
      setSemesterViewSelection({
        values: selectedValues,
        year: selectedYear,
      });
    }
    
    // Restaurer l'état de la nouvelle vue
    if (viewMode === "day" && dayViewSelection.values.length > 0) {
      setSelectedDates(dayViewSelection.dates);
      setSelectedValues(dayViewSelection.values);
    } else if (viewMode === "week" && weekViewSelection.values.length > 0) {
      setSelectedValues(weekViewSelection.values);
      setSelectedYear(weekViewSelection.year || selectedYear);
    } else if (viewMode === "month" && monthViewSelection.values.length > 0) {
      setSelectedValues(monthViewSelection.values);
      setSelectedYear(monthViewSelection.year || selectedYear);
    } else if (viewMode === "quarter" && quarterViewSelection.values.length > 0) {
      setSelectedValues(quarterViewSelection.values);
      setSelectedYear(quarterViewSelection.year || selectedYear);
    } else if (viewMode === "semester" && semesterViewSelection.values.length > 0) {
      setSelectedValues(semesterViewSelection.values);
      setSelectedYear(semesterViewSelection.year || selectedYear);
    }

    prevViewMode.current = viewMode;
  }, [viewMode]);

  /* ------------- fetch ------------- */
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

        const mapped = raw
          .map((r) => {
            const d = new Date(r.date);
            if (isNaN(d.getTime())) return null;
            return {
              date: r.date,
              dateObj: d,
              dateISO: toISO(d),
              year: d.getFullYear(),
              week: weekNumber(d),
              month: d.getMonth() + 1,
              quarter: quarterOf(d),
              semester: semesterOf(d),
              stock: Number(r.stock) || 0,
              non_traite: Number(r.non_traite) || 0,
              traite: Number(r.traite) || 0,
            };
          })
          .filter(Boolean);

        if (!mounted) return;

        setRecords(mapped);
        const years = [...new Set(mapped.map((x) => x.year))].sort((a, b) => a - b);
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);

        // Initialisation seulement si pas encore fait
        if (!initializationCompleted.current) {
          if (defaultViewMode === "day") {
            const all = [...new Set(mapped.map((x) => x.dateISO))];
            const last = lastNWorkingDays(all, 10, holidaySet);
            if (last.length) {
              setSelectedDates([parseISO(last[0]), parseISO(last[last.length - 1])]);
              setSelectedValues(last);
              setDayViewSelection({
                dates: [parseISO(last[0]), parseISO(last[last.length - 1])],
                values: last
              });
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

            // Initialiser les sélections pour chaque vue
            if (defaultViewMode === "week") {
              setWeekViewSelection({ values: selectedPeriods, year: latestYear });
            } else if (defaultViewMode === "month") {
              setMonthViewSelection({ values: selectedPeriods, year: latestYear });
            } else if (defaultViewMode === "quarter") {
              setQuarterViewSelection({ values: selectedPeriods, year: latestYear });
            } else if (defaultViewMode === "semester") {
              setSemesterViewSelection({ values: selectedPeriods, year: latestYear });
            }
          }
          initializationCompleted.current = true;
        }

        // Application du filtre global s'il existe
        if (globalStartDate && globalEndDate && !globalFilterApplied.current) {
          applyGlobalFilter();
          globalFilterApplied.current = true;
        }

        setLoading(false);
      } catch (err) {
        console.error("Fetch FTTH stock error:", err);
        if (mounted) {
          setRecords([]);
          setErrorText("Impossible de charger les données (réseau/API).");
          setLoading(false);
        }
      } finally {
        clearTimeout(timer);
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

  // fermer panneau filtre si clic extérieur
  useEffect(() => {
    const onDown = (e) => {
      if (isOpen && filterPanelRef.current && !filterPanelRef.current.contains(e.target) && !e.target.closest('[data-filter-toggle]')) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isOpen]);

  // fermer l'éditeur si clic en dehors
  useEffect(() => {
    const onDown = (e) => {
      if (!editor) return;
      if (editorRef.current && !editorRef.current.contains(e.target)) {
        setEditor(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [editor]);

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
    setVisibleKeys(["stock", "non_traite", "traite"]);
    setHasGlobalFilter(false);
    
    // Reset des sélections par vue
    setWeekViewSelection({ values: [], year: null });
    setMonthViewSelection({ values: [], year: null });
    setQuarterViewSelection({ values: [], year: null });
    setSemesterViewSelection({ values: [], year: null });
    setDayViewSelection({ dates: [null, null], values: [] });
    
    // Reset des timestamps
    setWeekSelectionModifiedAt(0);
    setMonthSelectionModifiedAt(0);
    setQuarterSelectionModifiedAt(0);
    setSemesterSelectionModifiedAt(0);
    setDaySelectionModifiedAt(0);
    
    initializationCompleted.current = false;
    globalFilterApplied.current = false;
    
    setChartKey((k) => k + 1);
    reload();
  };

  /* ----------------- filtres ----------------- */
  const handleViewModeChange = (m) => {
    if (m === viewMode) return;
    setViewMode(m);
  };

  const handleDayRangeChange = (dates) => {
    const [a, b] = dates;
    setSelectedDates(dates);
    const dayValues = a && b ? allWorkingDaysBetween(a, b, holidaySet) : [];
    setSelectedValues(dayValues);
    setDayViewSelection({
      dates: dates,
      values: dayValues
    });
    setDaySelectionModifiedAt(Date.now());
    setHasGlobalFilter(false);
  };

  const handleYearChange = (y) => {
    if (viewMode === "day") return;
    setSelectedYear(y);
    const availablePeriods = getAvailablePeriodsForYear(records, y, viewMode);
    
    if (hasGlobalFilter && globalStartDate && globalEndDate) {
      let filteredPeriods = [];
      if (viewMode === "week") {
        filteredPeriods = getAllWeeksBetween(globalStartDate, globalEndDate)
          .filter(w => availablePeriods.includes(w));
        setSelectedValues(filteredPeriods);
        setWeekViewSelection({ values: filteredPeriods, year: y });
      } else if (viewMode === "month") {
        filteredPeriods = getAllMonthsBetween(globalStartDate, globalEndDate)
          .filter(m => availablePeriods.includes(m));
        setSelectedValues(filteredPeriods);
        setMonthViewSelection({ values: filteredPeriods, year: y });
      } else if (viewMode === "quarter") {
        filteredPeriods = getAllQuartersBetween(globalStartDate, globalEndDate)
          .filter(q => availablePeriods.includes(q));
        setSelectedValues(filteredPeriods);
        setQuarterViewSelection({ values: filteredPeriods, year: y });
      } else if (viewMode === "semester") {
        filteredPeriods = getAllSemestersBetween(globalStartDate, globalEndDate)
          .filter(s => availablePeriods.includes(s));
        setSelectedValues(filteredPeriods);
        setSemesterViewSelection({ values: filteredPeriods, year: y });
      }
    } else {
      const p = availablePeriods.slice(-defaultNumPeriods);
      setSelectedValues(p);
      
      if (viewMode === "week") {
        setWeekViewSelection({ values: p, year: y });
      } else if (viewMode === "month") {
        setMonthViewSelection({ values: p, year: y });
      } else if (viewMode === "quarter") {
        setQuarterViewSelection({ values: p, year: y });
      } else if (viewMode === "semester") {
        setSemesterViewSelection({ values: p, year: y });
      }
    }
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
    
    if (viewMode === "week") {
      setWeekViewSelection({ values: newValues, year: selectedYear });
      setWeekSelectionModifiedAt(Date.now());
    } else if (viewMode === "month") {
      setMonthViewSelection({ values: newValues, year: selectedYear });
      setMonthSelectionModifiedAt(Date.now());
    } else if (viewMode === "quarter") {
      setQuarterViewSelection({ values: newValues, year: selectedYear });
      setQuarterSelectionModifiedAt(Date.now());
    } else if (viewMode === "semester") {
      setSemesterViewSelection({ values: newValues, year: selectedYear });
      setSemesterSelectionModifiedAt(Date.now());
    }
    setHasGlobalFilter(false);
  };

  const toggleOne = (v) => {
    if (viewMode === "day") return;
    const newValues = selectedValues.includes(v) ? selectedValues.filter((x) => x !== v) : [...selectedValues, v].sort((a, b) => a - b);
    setSelectedValues(newValues);
    
    if (viewMode === "week") {
      setWeekViewSelection({ values: newValues, year: selectedYear });
      setWeekSelectionModifiedAt(Date.now());
    } else if (viewMode === "month") {
      setMonthViewSelection({ values: newValues, year: selectedYear });
      setMonthSelectionModifiedAt(Date.now());
    } else if (viewMode === "quarter") {
      setQuarterViewSelection({ values: newValues, year: selectedYear });
      setQuarterSelectionModifiedAt(Date.now());
    } else if (viewMode === "semester") {
      setSemesterViewSelection({ values: newValues, year: selectedYear });
      setSemesterSelectionModifiedAt(Date.now());
    }
    setHasGlobalFilter(false);
  };

  /* ----------------- data du chart ----------------- */
  const sortedSelectedValues = useMemo(
    () => (viewMode === "day" ? selectedValues.slice().sort() : selectedValues.slice().sort((a, b) => a - b)),
    [selectedValues, viewMode]
  );

  const labels = useMemo(() => {
    const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    if (viewMode === "day") {
      return sortedSelectedValues.map((iso) => {
        const d = parseISO(iso);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        return `${dd}/${mm} (S${weekNumber(d)})`;
      });
    }
    if (viewMode === "week") return sortedSelectedValues.map((w) => `S${w}`);
    if (viewMode === "month") return sortedSelectedValues.map((m) => months[m - 1] || `M${m}`);
    if (viewMode === "quarter") return sortedSelectedValues.map((q) => `T${q}`);
    if (viewMode === "semester") return sortedSelectedValues.map((s) => `S${s}`);
    return sortedSelectedValues.map(String);
  }, [sortedSelectedValues, viewMode]);

  const sums = useMemo(() => {
    const stock = {}, nonT = {}, tra = {};
    sortedSelectedValues.forEach((v) => { stock[v]=0; nonT[v]=0; tra[v]=0; });
    records.forEach((r) => {
      // ignore les jours fériés en toutes vues
      if (holidaySet.has(r.dateISO)) return;

      if (viewMode === "day") {
        const key = r.dateISO;
        if (sortedSelectedValues.includes(key)) {
          stock[key] += r.stock;
          nonT[key] += r.non_traite;
          tra[key] += r.traite;
        }
      } else {
        if (selectedYear && r.year !== selectedYear) return;
        const key =
          viewMode === "week" ? r.week :
          viewMode === "month" ? r.month :
          viewMode === "quarter" ? r.quarter : r.semester;
        if (sortedSelectedValues.includes(key)) {
          stock[key] += r.stock;
          nonT[key] += r.non_traite;
          tra[key] += r.traite;
        }
      }
    });
    return {
      stockArr: sortedSelectedValues.map((v) => stock[v] || 0),
      nonTraiteArr: sortedSelectedValues.map((v) => nonT[v] || 0),
      traiteArr: sortedSelectedValues.map((v) => tra[v] || 0),
    };
  }, [records, sortedSelectedValues, selectedYear, viewMode, holidaySet]);

  // datasets avec "hidden" piloté par visibleKeys
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      { label: "Backlog FTTH J",   data: sums.stockArr,     backgroundColor: COLORS[0], borderRadius: 6, hidden: !visibleKeys.includes("stock") },
      { label: "Backlog FTTH J-1", data: sums.nonTraiteArr, backgroundColor: COLORS[1], borderRadius: 6, hidden: !visibleKeys.includes("non_traite") },
      { label: "Dossiers Traités", data: sums.traiteArr,    backgroundColor: COLORS[2], borderRadius: 6, hidden: !visibleKeys.includes("traite") },
    ],
  }), [labels, sums, visibleKeys]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: true,
        color: "#000",
        font: { size: 12, weight: "bold" },
        formatter: (v) => (v > 0 ? v : ""),
        anchor: "end",
        align: "top",
        offset: -3,
        clamp: true,
      },
      legend: {
        display: false, // ← on désactive la légende native, on utilise LegendInline
      },
      tooltip: { mode: "index", intersect: false, padding: 10, titleFont: { size: 13 }, bodyFont: { size: 12 } },
      title: { display: false },
    },
    layout: { padding: { top: 5, right: 20, bottom: 10, left: 10 } },
    animation: { duration: 250 },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: viewMode === "day" ? 45 : 0, minRotation: viewMode === "day" ? 45 : 0, padding: 10, font: { size: 11 } },
        title: {
          display: true,
          text:
            viewMode === "day" ? "Jour" :
            viewMode === "week" ? `Semaines ${selectedYear ?? ""}` :
            viewMode === "month" ? `Mois ${selectedYear ?? ""}` :
            viewMode === "quarter" ? `Trimestres ${selectedYear ?? ""}` :
            `Semestres ${selectedYear ?? ""}`,
          font: { size: 12 },
          padding: { top: 10 },
        },
      },
      y: {
        beginAtZero: true,
        grid: { drawBorder: false },
        ticks: { precision: 0, padding: 10 },
        title: { display: true, text: "Volume", font: { size: 12 }, padding: { bottom: 10 } },
        grace: "5%",
      },
    },
  }), [viewMode, selectedYear]);

  // sous-titre
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

  const showData =
    sums.stockArr.some((n) => n > 0) ||
    sums.nonTraiteArr.some((n) => n > 0) ||
    sums.traiteArr.some((n) => n > 0);

  /* ===================== Légende: handlers ===================== */
  const onLegendClick = (key, e) => {
    if (e?.ctrlKey || e?.metaKey) {
      setVisibleKeys((prev) => {
        const has = prev.includes(key);
        const next = has ? prev.filter((k) => k !== key) : [...prev, key];
        return next.length ? next : [key]; // ne jamais tout cacher
      });
      return;
    }
    setVisibleKeys([key]); // isolement
  };

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
      setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, x: nx, y: ny } : c)));
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
      <div className="visualisation relative" data-id={id} data-graph-label={chartTitle}>
        <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-[450px] flex justify-center items-center">
          <p className="text-center text-gray-500">Chargement des données…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="visualisation relative" data-id={id} data-graph-label={chartTitle}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-2 relative">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{chartTitle}</h3>
            <p className="text-sm text-gray-500 min-h-[20px]">
              {errorText ? <span className="text-red-500">{errorText}</span> : subtitle}
            </p>
          </div>

          <div className="no-export flex items-center gap-2">
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

        {/* ===== Légende TOP (custom) ===== */}
        <LegendInline visibleKeys={visibleKeys} onClick={onLegendClick} />

        {/* Graphique */}
        <div className="relative flex-grow h-[350px] select-none" ref={chartContainerRef}>
          {errorText ? (
            <div className="grid place-items-center h-full">
              <div className="text-center">
                <p className="text-red-500 mb-2">{errorText}</p>
                <button onClick={reload} className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">Réessayer</button>
              </div>
            </div>
          ) : showData ? (
            <Bar key={chartKey} data={chartData} options={chartOptions} plugins={[ChartDataLabels]} />
          ) : (
            <p className="text-gray-500 italic grid place-items-center h-full">Aucune donnée à afficher.</p>
          )}

          {/* Overlay d'ajout (uniquement si mode commentaire actif) */}
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

          {/* Annotations */}
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

          {/* Popover éditeur (main) */}
          {editor && editor.anchor === "main" && (
            <div
              ref={editorRef}
              className="no-export absolute z-50 w-[220px] bg-white rounded-lg shadow-xl border border-gray-200 p-3"
              style={popoverStyle(editor)}
            >
              <textarea
                value={editor.text}
                onChange={(e) => setEditor({ ...editor, text: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-sm h-20 outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Votre commentaire…"
              />
              <div className="flex items-center gap-2 mt-2 mb-3">
                <span className="text-sm text-gray-600">Couleur :</span>
                {["#22c55e", "#eab308", "#ef4444"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditor({ ...editor, color: c })}
                    className={`w-6 h-6 rounded-full border-2 ${editor.color === c ? "border-black" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    title="Couleur"
                    aria-label="Couleur"
                  />
                ))}
              </div>
              <div className="flex gap-2 justify-between">
                <button
                  onClick={addOrUpdateComment}
                  disabled={!editor.text.trim()}
                  className={`px-3 py-1.5 rounded-md text-white text-sm font-semibold ${editor.text.trim() ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}
                >
                  {editor.id ? "Modifier" : "Ajouter"}
                </button>
                {editor.id && (
                  <button
                    onClick={() => deleteComment(editor.id)}
                    className="px-3 py-1.5 rounded-md text-white text-sm font-semibold bg-red-500 hover:bg-red-600"
                  >
                    Supprimer
                  </button>
                )}
                <button
                  onClick={() => setEditor(null)}
                  className="px-3 py-1.5 rounded-md text-sm font-semibold bg-gray-100 hover:bg-gray-200"
                >
                  Fermer
                </button>
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

          <div className="relative flex-grow min-h-[420px]" ref={modalChartContainerRef}>
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
              <Bar
                key={`m-${chartKey}`}
                data={chartData}
                options={{
                  ...chartOptions,
                  plugins: { ...chartOptions.plugins, datalabels: { ...chartOptions.plugins.datalabels, font: { size: 11, weight: "bold" } } }
                }}
                plugins={[ChartDataLabels]}
              />
            ) : (
              <p className="text-gray-500 italic grid place-items-center h-full">Aucune donnée à afficher.</p>
            )}

            {/* Overlay d'ajout (modal) */}
            {commentMode && (
              <div className="absolute inset-0 z-30 cursor-crosshair" onClick={(e) => openEditorAt(e.clientX, e.clientY, "modal")} />
            )}

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
              <div
                ref={editorRef}
                className="no-export absolute z-50 w-[220px] bg-white rounded-lg shadow-xl border border-gray-200 p-3"
                style={popoverStyle(editor)}
              >
                <textarea
                  value={editor.text}
                  onChange={(e) => setEditor({ ...editor, text: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm h-20 outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Votre commentaire…"
                />
                <div className="flex items-center gap-2 mt-2 mb-3">
                  <span className="text-sm text-gray-600">Couleur :</span>
                  {["#22c55e", "#eab308", "#ef4444"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditor({ ...editor, color: c })}
                      className={`w-6 h-6 rounded-full border-2 ${editor.color === c ? "border-black" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-2 justify-between">
                  <button
                    onClick={addOrUpdateComment}
                    disabled={!editor.text.trim()}
                    className={`px-3 py-1.5 rounded-md text-white text-sm font-semibold ${editor.text.trim() ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}
                  >
                    {editor.id ? "Modifier" : "Ajouter"}
                  </button>
                  {editor.id && (
                    <button
                      onClick={() => deleteComment(editor.id)}
                      className="px-3 py-1.5 rounded-md text-white text-sm font-semibold bg-red-500 hover:bg-red-600"
                    >
                      Supprimer
                    </button>
                  )}
                  <button onClick={() => setEditor(null)} className="px-3 py-1.5 rounded-md text-sm font-semibold bg-gray-100 hover:bg-gray-200">
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}