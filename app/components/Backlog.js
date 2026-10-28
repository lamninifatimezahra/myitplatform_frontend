"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fr } from "date-fns/locale";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useGlobalFilter } from "./GlobalFilterContext";
import Modal from "react-modal";
import CommentButton from "./CommentButton";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

ChartJS.register(
  BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend, ChartDataLabels
);

// =========================================
// Constantes
// =========================================
const BACKLOG_THRESHOLD = 15;
const COLOR_OK = "#22c55e";
const COLOR_ALERT = "#ef4444";

// Retire tous les espaces pour comparer les noms de files
const normalizeFile = (s) => (s || "").replace(/\s+/g, "");

const BACKLOG_FILES = new Set([
  "IN_DSI_FOC_EXP_DSL_ENT_COUP_STC",
  "IN_DSI_FOC_EXP_DSL_ENT_COUPEE",
  "DSI_FOC_EXP_DSL_ETUD-HSENT",
  "DSI_FOC_EXP_DSL_ETUD-HSGP",
  "IN_DSI_FOC_REFACT-HISPEED",
  "IN_DSI_FOC_REFACT-HISPEED-DDS",
  "IN_DSI_FOC_REFACT-REFFIXE-CPTL",
  "IN_DSI_MOA_AGREGATEUR",
  "IN_DSI_OSS_HISPEED_EXP_B2B",
  "IN_DSI_FOC_REFACT-IPM",
  "IN_DSI_FOC_REFACT-CERBERE",
].map(normalizeFile));

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const QUARTER_NAMES = ["T1", "T2", "T3", "T4"];
const SEMESTER_NAMES = ["S1", "S2"];

// =========================================
// Fonctions utilitaires
// =========================================
function toDayString(v) {
  if (!v || typeof v !== "string") return null;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function getLocalDateString(date) {
  if (!date || isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDate(dateStr) {
  if (typeof dateStr !== "string") return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

const getQuarter = (date) => Math.ceil((date.getMonth() + 1) / 3);
const getSemester = (date) => (date.getMonth() + 1 <= 6 ? 1 : 2);

function getPeriodValue(date, mode) {
  if (mode === "week") return getWeekNumber(date);
  if (mode === "month") return date.getMonth() + 1;
  if (mode === "quarter") return getQuarter(date);
  if (mode === "semester") return getSemester(date);
  return null;
}

function formatDayLabel(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d) return "Date invalide";
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month} (S${getWeekNumber(d)})`;
}

function getAllWorkingDaysBetween(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const days = [];
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const stop = new Date(endDate);
  stop.setHours(0, 0, 0, 0);
  while (cur <= stop) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days.push(getLocalDateString(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function getLastNWorkingDays(days, n = 10) {
  return days
    .map(str => ({ str, date: parseLocalDate(str) }))
    .filter(i => i.date && i.date.getDay() !== 0 && i.date.getDay() !== 6)
    .sort((a, b) => b.date - a.date)
    .slice(0, n)
    .sort((a, b) => a.date - b.date)
    .map(i => i.str);
}

// Périodes (semaines, mois...) couvertes par un intervalle, dans l'année de départ
function periodsBetween(start, end, mode) {
  const set = new Set();
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const stop = new Date(end);
  stop.setHours(0, 0, 0, 0);
  while (cur <= stop) {
    if (cur.getFullYear() === start.getFullYear()) {
      const p = getPeriodValue(cur, mode);
      if (p != null) set.add(p);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return [...set].sort((a, b) => a - b);
}

// Dimanche de la semaine ISO (version corrigée : gère le lundi de la semaine 1 en décembre)
function getISOWeekEndDate(year, week) {
  const jan4 = new Date(year, 0, 4);
  const dayNum = jan4.getDay() || 7;
  const monday1 = new Date(year, 0, 4 - dayNum + 1);
  return new Date(monday1.getFullYear(), monday1.getMonth(), monday1.getDate() + (week - 1) * 7 + 6);
}

function getPeriodEndString(val, mode, year) {
  if (mode === "day") return val;
  if (!year) return null;
  let end = null;
  if (mode === "week") end = getISOWeekEndDate(year, val);
  else if (mode === "month") end = new Date(year, val, 0);
  else if (mode === "quarter") end = new Date(year, val * 3, 0);
  else if (mode === "semester") end = new Date(year, val * 6, 0);
  return end ? getLocalDateString(end) : null;
}

function periodLabel(val, mode) {
  if (mode === "day") return formatDayLabel(val);
  if (mode === "week") return `S${val}`;
  if (mode === "month") return MONTH_NAMES[val - 1] || `Mois ${val}`;
  if (mode === "quarter") return QUARTER_NAMES[val - 1] || `Trim. ${val}`;
  if (mode === "semester") return SEMESTER_NAMES[val - 1] || `Sem. ${val}`;
  return String(val);
}

// =========================================
// Composant Backlog
// =========================================
export default function Backlog({
  apiUrl,
  id = "Backlog",
  chartTitle = "Backlog (tickets restants)",
  entryField = "date_derniere_maj",
  exitField = "date_sortie",
  fileField = "file_clarify",
  defaultViewMode = "day",
  defaultNumPeriods = 5,
  threshold = BACKLOG_THRESHOLD,
}) {
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);
  const ignoreGlobalRef = useRef(false);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [selectedDates, setSelectedDates] = useState([null, null]);
  const [selectedValues, setSelectedValues] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [annotations, setAnnotations] = useState([]);

  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // ---------- Chargement ----------
  useEffect(() => {
    if (!apiUrl) return;
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        if (isMounted) setData(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        if (isMounted) setData([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [apiUrl]);

  // ---------- Clic extérieur du panneau de filtre ----------
  useEffect(() => {
    function handleClickOutside(event) {
      if (isOpen && filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest("button[data-filter-toggle]")) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // ---------- Données dérivées ----------
  const availableYears = useMemo(() => {
    const years = new Set();
    data.forEach(t => {
      [t[entryField], t[exitField]].forEach(v => {
        const d = parseLocalDate(toDayString(v));
        if (d) years.add(d.getFullYear());
      });
    });
    return [...years].sort((a, b) => a - b);
  }, [data, entryField, exitField]);

  const getAvailablePeriods = (year, mode) => {
    if (!year || mode === "day") return [];
    const set = new Set();
    data.forEach(t => {
      [t[entryField], t[exitField]].forEach(v => {
        const d = parseLocalDate(toDayString(v));
        if (d && d.getFullYear() === year) set.add(getPeriodValue(d, mode));
      });
    });
    return [...set].sort((a, b) => a - b);
  };

  // Sélection par défaut (ou issue du filtre global) pour un mode / une année
  const buildSelection = (mode, year) => {
    const useGlobal = !ignoreGlobalRef.current && globalStartDate && globalEndDate;

    if (mode === "day") {
      if (useGlobal) {
        return { dates: [globalStartDate, globalEndDate], values: getAllWorkingDaysBetween(globalStartDate, globalEndDate) };
      }
      const days = [...new Set(data.map(t => toDayString(t[entryField])).filter(Boolean))];
      const last = getLastNWorkingDays(days, 10);
      return {
        dates: last.length ? [parseLocalDate(last[0]), parseLocalDate(last[last.length - 1])] : [null, null],
        values: last,
      };
    }

    const available = getAvailablePeriods(year, mode);
    if (useGlobal && globalStartDate.getFullYear() === year) {
      const g = periodsBetween(globalStartDate, globalEndDate, mode).filter(p => available.includes(p));
      if (g.length) return { values: g };
    }
    return { values: available.slice(-defaultNumPeriods) };
  };

  const applySelection = (mode, year) => {
    const s = buildSelection(mode, year);
    setSelectedValues(s.values);
    if (mode === "day") setSelectedDates(s.dates);
  };

  // Initialisation + filtre global
  useEffect(() => {
    if (!data.length || !availableYears.length) return;
    ignoreGlobalRef.current = false;
    let year = availableYears[availableYears.length - 1];
    if (globalStartDate && globalEndDate && availableYears.includes(globalStartDate.getFullYear())) {
      year = globalStartDate.getFullYear();
    }
    setSelectedYear(year);
    applySelection(viewMode, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, globalStartDate, globalEndDate, globalModifiedAt]);

  // ---------- Gestionnaires ----------
  const handleViewModeChange = (newMode) => {
    if (newMode === viewMode) return;
    ignoreGlobalRef.current = true;
    setViewMode(newMode);
    applySelection(newMode, selectedYear);
  };

  const handleYearChange = (year) => {
    if (year === selectedYear || viewMode === "day") return;
    ignoreGlobalRef.current = true;
    setSelectedYear(year);
    applySelection(viewMode, year);
  };

  const handleDayRangeChange = (dates) => {
    const [start, end] = dates;
    setSelectedDates(dates);
    setSelectedValues(start && end ? getAllWorkingDaysBetween(start, end) : []);
  };

  const handleSelectionChange = (value) => {
    if (viewMode === "day") return;
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value].sort((a, b) => a - b)
    );
  };

  const availablePeriodsForFilter = viewMode === "day" ? [] : getAvailablePeriods(selectedYear, viewMode);
  const allPeriodsForFilterSelected =
    availablePeriodsForFilter.length > 0 && availablePeriodsForFilter.every(p => selectedValues.includes(p));

  const handleSelectAll = () => {
    if (viewMode === "day") return;
    setSelectedValues(allPeriodsForFilterSelected ? [] : [...availablePeriodsForFilter]);
  };

  // ---------- Calcul du backlog ----------
  const sortedSelectedValues = useMemo(() => {
    if (viewMode === "day") {
      return selectedValues.filter(v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)).slice().sort();
    }
    return selectedValues.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
  }, [selectedValues, viewMode]);

  const labels = useMemo(
    () => sortedSelectedValues.map(v => periodLabel(v, viewMode)),
    [sortedSelectedValues, viewMode]
  );

  // Logique (requête 1) : DATE_ENTREE < D  ET  (DATE_SORTIE IS NULL OU DATE_SORTIE >= D+1)
  // Jour : D = le jour. Autres vues : D = fin de période (plafonnée à aujourd'hui).
  const backlogData = useMemo(() => {
    const tickets = data.filter(t => BACKLOG_FILES.has(normalizeFile(t[fileField])));
    const today = getLocalDateString(new Date());
    // ===== TEST TEMPORAIRE=====
  const testDate = "2026-10-26"; 
  const liste = tickets.filter(t => {
    const entry = toDayString(t[entryField]);
    const exit = toDayString(t[exitField]);
    return entry && entry < testDate && (!exit || exit > testDate);
  });
  console.log(`Backlog API ${testDate} :`, liste.length);
  console.table(
    liste
      .map(t => ({
        id: t.id_ticket,
        file: t.file_clarify,
        entree: t[entryField],
        sortie: t[exitField],
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
  );
  // ===== FIN DU TEST =====

    return sortedSelectedValues.map(val => {
      let ref = getPeriodEndString(val, viewMode, selectedYear);
      if (!ref) return 0;
      if (ref > today) ref = today;

      return tickets.reduce((count, t) => {
        const entry = toDayString(t[entryField]);
        const exit = toDayString(t[exitField]);
        if (!entry || entry >= ref) return count;  // DATE_ENTREE < D
        if (exit && exit <= ref) return count;     // DATE_SORTIE NULL ou > D (>= D+1)
        return count + 1;
      }, 0);
    });
  }, [data, sortedSelectedValues, viewMode, selectedYear, entryField, exitField, fileField]);

  const chartData = {
    labels,
    datasets: [
      {
        label: `Backlog (≤ ${threshold} vert, > ${threshold} rouge)`,
        data: backlogData,
        backgroundColor: backlogData.map(v => (v <= threshold ? COLOR_OK : COLOR_ALERT)),
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: true,
        color: "#000",
        font: { weight: "bold", size: 10 },
        formatter: val => (val > 0 ? val : ""),
        anchor: "end",
        align: "top",
        offset: -3,
      },
      legend: {
        position: "top",
        align: "center",
        labels: {
          padding: 15,
          boxWidth: 12,
          font: { size: 12 },
          generateLabels: (chart) =>
            ChartJS.defaults.plugins.legend.labels.generateLabels(chart).map(l => ({
              ...l,
              fillStyle: "#6b7280",
              strokeStyle: "#6b7280",
            })),
        },
      },
      tooltip: {
        mode: "index", intersect: false, padding: 10,
        titleFont: { size: 13 }, bodyFont: { size: 12 },
      },
      title: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: viewMode === "day" ? 45 : 0,
          minRotation: viewMode === "day" ? 45 : 0,
          padding: 10,
          font: { size: 11 },
        },
        title: {
          display: true,
          text:
            viewMode === "day" ? "Jour" :
            viewMode === "week" ? `Semaines ${selectedYear || ""}` :
            viewMode === "month" ? `Mois ${selectedYear || ""}` :
            viewMode === "quarter" ? `Trimestres ${selectedYear || ""}` :
            `Semestres ${selectedYear || ""}`,
          font: { size: 12 },
          padding: { top: 10 },
        },
      },
      y: {
        beginAtZero: true,
        grid: { drawBorder: false },
        ticks: { precision: 0, padding: 10 },
        title: { display: true, text: "Nombre de Tickets", font: { size: 12 }, padding: { bottom: 10 } },
        grace: "5%",
      },
    },
    layout: { padding: { top: 5, right: 20, bottom: 10, left: 10 } },
    animation: { duration: 300 },
  }), [viewMode, selectedYear]);

  const getPeriodLabelText = () => {
    if (viewMode === "day") {
      if (selectedDates[0] && selectedDates[1]) {
        return `Du ${getLocalDateString(selectedDates[0])} au ${getLocalDateString(selectedDates[1])}`;
      }
      return "Aucun jour sélectionné";
    }
    if (!sortedSelectedValues.length) return "Aucune période sélectionnée";
    const plural = sortedSelectedValues.length > 1;
    const title =
      viewMode === "week" ? (plural ? "Semaines" : "Semaine") :
      viewMode === "month" ? "Mois" :
      viewMode === "quarter" ? (plural ? "Trimestres" : "Trimestre") :
      (plural ? "Semestres" : "Semestre");
    return `${title}: ${sortedSelectedValues.map(v => periodLabel(v, viewMode)).join(", ")}`;
  };
  const periodeLabelText = getPeriodLabelText();
  const showData = backlogData.some(d => d > 0);

  // =========================================
  // Rendu
  // =========================================
  if (!apiUrl) {
    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <h3 className="text-lg font-semibold text-black">{chartTitle}</h3>
          <p className="text-red-500 text-sm mt-2">Erreur : L'URL de l'API est requise.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-[450px] flex justify-center items-center">
          <p className="text-center text-gray-500">Chargement des données...</p>
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
            <h3 className="no-export text-lg font-semibold text-gray-800">{chartTitle}</h3>
            <p className="text-sm text-gray-500 min-h-[20px]">
              {viewMode !== "day" && selectedYear ? `Année ${selectedYear} - ` : ""}
              {periodeLabelText}
            </p>
          </div>

          <div className="no-export flex gap-2">
            <button
              className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition text-gray-600 hover:text-gray-800"
              onClick={() => setIsOpen(!isOpen)}
              data-filter-toggle="true"
              title="Filtrer"
            >
              <AiOutlineFilter size={20} />
            </button>

            <CommentButton
              containerRef={chartContainerRef}
              comments={annotations}
              onAddComment={(c) => setAnnotations([...annotations, c])}
              onUpdateComment={(c) => setAnnotations(annotations.map(a => (a.id === c.id ? c : a)))}
              onDeleteComment={(cid) => setAnnotations(annotations.filter(a => a.id !== cid))}
            />

            <button
              className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition text-gray-600 hover:text-gray-800"
              onClick={() => setModalIsOpen(true)}
              title="Agrandir"
            >
              <FaExpand size={18} />
            </button>
          </div>

          {/* Panneau de filtre */}
          {isOpen && (
            <div ref={filterPanelRef} className="no-export absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50 border border-gray-200">
              <h4 className="font-semibold text-gray-600 text-sm mb-3">Filtrer par :</h4>
              <div className="flex space-x-1 mb-3 flex-wrap justify-start">
                {["day", "week", "month", "quarter", "semester"].map(mode => (
                  <button
                    key={mode}
                    className={`px-2.5 py-1 rounded text-xs mb-1 ${viewMode === mode ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                    onClick={() => handleViewModeChange(mode)}
                  >
                    {mode === "day" ? "Jour" : mode === "week" ? "Sem." : mode === "month" ? "Mois" : mode === "quarter" ? "Trim." : "Semestre"}
                  </button>
                ))}
              </div>

              {viewMode === "day" ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Plage de dates :</label>
                  <DatePicker
                    selected={selectedDates[0]}
                    onChange={handleDayRangeChange}
                    startDate={selectedDates[0]}
                    endDate={selectedDates[1]}
                    selectsRange
                    dateFormat="dd/MM/yyyy"
                    locale={fr}
                    inline
                    filterDate={date => date.getDay() !== 0 && date.getDay() !== 6}
                    calendarClassName="text-sm"
                    dayClassName={() => "text-xs"}
                    wrapperClassName="w-full"
                    popperPlacement="bottom-end"
                    maxDate={new Date()}
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                  />
                </div>
              ) : (
                <>
                  {availableYears.length > 1 && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Année :</h5>
                      <div className="flex flex-wrap gap-1">
                        {availableYears.map(year => (
                          <button
                            key={year}
                            onClick={() => handleYearChange(year)}
                            className={`px-2 py-0.5 text-xs rounded ${selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mb-2">
                    <button
                      onClick={handleSelectAll}
                      disabled={availablePeriodsForFilter.length === 0}
                      className={`text-xs px-2 py-1 rounded w-full ${allPeriodsForFilterSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {allPeriodsForFilterSelected ? "Tout désélectionner" : "Tout sélectionner"}
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 p-2 rounded text-sm">
                    {availablePeriodsForFilter.length > 0 ? availablePeriodsForFilter.map(value => (
                      <div key={value} className="flex items-center space-x-2 my-0.5">
                        <input
                          type="checkbox"
                          id={`bk-period-${value}-${viewMode}`}
                          checked={selectedValues.includes(value)}
                          onChange={() => handleSelectionChange(value)}
                          className="cursor-pointer h-3.5 w-3.5"
                        />
                        <label htmlFor={`bk-period-${value}-${viewMode}`} className="text-gray-600 cursor-pointer select-none text-xs">
                          {periodLabel(value, viewMode)}
                        </label>
                      </div>
                    )) : (
                      <p className="text-xs text-gray-400 text-center italic py-2">
                        Aucune période disponible pour {selectedYear}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Graphique principal */}
        <div className="flex-grow flex justify-center items-center h-[350px] w-full" ref={chartContainerRef}>
          {showData ? (
            <Bar data={chartData} options={chartOptions} plugins={[ChartDataLabels]} />
          ) : (
            <p className="text-gray-500 italic">Aucune donnée à afficher pour la sélection actuelle.</p>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
        contentLabel={`Modal ${chartTitle}`}
      >
        <div className="bg-white rounded-lg p-6 w-11/12 md:w-4/5 lg:w-3/4 shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{chartTitle}</h3>
              <p className="text-sm text-gray-500 mt-1 min-h-[20px]">
                {viewMode !== "day" && selectedYear ? `Année ${selectedYear} - ` : ""}
                {periodeLabelText}
              </p>
            </div>
            <button
              onClick={() => setModalIsOpen(false)}
              className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-100 transition-colors"
              title="Fermer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="relative flex-grow min-h-[400px] md:min-h-[500px] flex items-center justify-center" ref={modalChartContainerRef}>
            {showData ? (
              <Bar
                data={chartData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    datalabels: { ...chartOptions.plugins.datalabels, font: { size: 11 } },
                  },
                }}
                plugins={[ChartDataLabels]}
              />
            ) : (
              <p className="text-gray-500 italic">Aucune donnée à afficher.</p>
            )}
            <CommentButton
              containerRef={modalChartContainerRef}
              hideButton={true}
              comments={annotations}
              onAddComment={(c) => setAnnotations([...annotations, c])}
              onUpdateComment={(c) => setAnnotations(annotations.map(a => (a.id === c.id ? c : a)))}
              onDeleteComment={(cid) => setAnnotations(annotations.filter(a => a.id !== cid))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}