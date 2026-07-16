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
import { FaExpand } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fr } from "date-fns/locale";
import Modal from "react-modal";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useGlobalFilter } from "@/app/components/GlobalFilterContext";
import CommentButton from "@/app/components/CommentButton";

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
  const wd = d.getDay();
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

function allWorkingDaysBetween(a, b) {
  const res = [];
  const d = new Date(a); d.setHours(0,0,0,0);
  const end = new Date(b); end.setHours(0,0,0,0);
  while (d <= end) {
    if (isWorkingDay(d)) {
      res.push(toISO(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return res;
}
function lastNWorkingDays(isoList, n) {
  return isoList
    .map((s) => ({ s, d: parseISO(s) }))
    .filter((x) => x.d && isWorkingDay(x.d))
    .sort((a, b) => b.d - a.d)
    .slice(0, n)
    .sort((a, b) => a.d - b.d)
    .map((x) => x.s);
}
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

const COLORS = ["#1b2b6b"];

function LegendInline({ visibleKeys, onClick }) {
  const item = { key: "non_traite", label: "Backlog FTTH J-1", color: COLORS[0] };
  const active = visibleKeys.includes(item.key);

  return (
    <div className="w-full flex justify-center items-center mt-1 mb-2 select-none">
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <li>
          <button
            onClick={() => onClick(item.key)}
            title="Cliquer pour masquer/afficher"
            className={`inline-flex items-center gap-2 transition-opacity ${active ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
          >
            <span
              className="inline-block w-3 h-3 rounded-sm border border-gray-300"
              style={{ backgroundColor: item.color }}
            />
            <span className={`text-gray-800 whitespace-nowrap ${!active ? 'line-through' : ''}`}>{item.label}</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

export default function KPI_FTTH({
  apiUrl = "https://api.606510.xyz/dashboard/api/ftth/stock/",
  id = "KPI FTTH",
  chartTitle = "KPI FTTH",
  defaultViewMode = "day",
  defaultNumPeriods = 5,
  holidays = [],
}) {
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);
  
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);
  const prevViewMode = useRef(null);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [selectedDates, setSelectedDates] = useState([null, null]);
  const [selectedValues, setSelectedValues] = useState([]);
  const [chartKey, setChartKey] = useState(0);
  
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
  
  const [weekViewSelection, setWeekViewSelection] = useState({ values: [], year: null });
  const [monthViewSelection, setMonthViewSelection] = useState({ values: [], year: null });
  const [quarterViewSelection, setQuarterViewSelection] = useState({ values: [], year: null });
  const [semesterViewSelection, setSemesterViewSelection] = useState({ values: [], year: null });
  const [dayViewSelection, setDayViewSelection] = useState({ dates: [null, null], values: [] });
  
  const [visibleKeys, setVisibleKeys] = useState(["non_traite"]);
  const [annotations, setAnnotations] = useState([]);
  
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
  
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate) return;
    
    const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
    const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
    const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate);
    const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate);
    const dayList = allWorkingDaysBetween(globalStartDate, globalEndDate, null);

    setWeekViewSelection({ values: weekList, year: globalStartDate.getFullYear() });
    setMonthViewSelection({ values: monthList, year: globalStartDate.getFullYear() });
    setQuarterViewSelection({ values: quarterList, year: globalStartDate.getFullYear() });
    setSemesterViewSelection({ values: semesterList, year: globalStartDate.getFullYear() });
    setDayViewSelection({ dates: [globalStartDate, globalEndDate], values: dayList });
    
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
  
  useEffect(() => {
    if (!prevViewMode.current) {
      prevViewMode.current = viewMode;
      return;
    }
    if (prevViewMode.current === "day") setDayViewSelection({ dates: selectedDates, values: selectedValues });
    else if (prevViewMode.current === "week") setWeekViewSelection({ values: selectedValues, year: selectedYear });
    else if (prevViewMode.current === "month") setMonthViewSelection({ values: selectedValues, year: selectedYear });
    else if (prevViewMode.current === "quarter") setQuarterViewSelection({ values: selectedValues, year: selectedYear });
    else if (prevViewMode.current === "semester") setSemesterViewSelection({ values: selectedValues, year: selectedYear });
    
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
              dateISO: toISO(d),
              year: d.getFullYear(),
              week: weekNumber(d),
              month: d.getMonth() + 1,
              quarter: quarterOf(d),
              semester: semesterOf(d),
              non_traite: Number(r.non_traite) || 0,
            };
          })
          .filter(Boolean);

        if (!mounted) return;

        setRecords(mapped);
        const years = [...new Set(mapped.map((x) => x.year))].sort((a, b) => a - b);
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);

        if (!initializationCompleted.current) {
          if (defaultViewMode === "day") {
            const all = [...new Set(mapped.map((x) => x.dateISO))];
            const last = lastNWorkingDays(all, 10);
            if (last.length) {
              setSelectedDates([parseISO(last[0]), parseISO(last[last.length - 1])]);
              setSelectedValues(last);
              setDayViewSelection({ dates: [parseISO(last[0]), parseISO(last[last.length - 1])], values: last });
            }
          } else {
            const latestYear = years.length > 0 ? years[years.length - 1] : new Date().getFullYear();
            setSelectedYear(latestYear);
            const periods = getAvailablePeriodsForYear(mapped, latestYear, defaultViewMode);
            const selectedPeriods = periods.slice(-defaultNumPeriods);
            setSelectedValues(selectedPeriods);
            
            if (defaultViewMode === "week") setWeekViewSelection({ values: selectedPeriods, year: latestYear });
            else if (defaultViewMode === "month") setMonthViewSelection({ values: selectedPeriods, year: latestYear });
            else if (defaultViewMode === "quarter") setQuarterViewSelection({ values: selectedPeriods, year: latestYear });
            else if (defaultViewMode === "semester") setSemesterViewSelection({ values: selectedPeriods, year: latestYear });
          }
          initializationCompleted.current = true;
        }

        if (globalStartDate && globalEndDate && !globalFilterApplied.current) {
          applyGlobalFilter();
          globalFilterApplied.current = true;
        }
        setLoading(false);
      } catch (err) {
        if (mounted) {
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
  useEffect(() => { if (globalStartDate && globalEndDate && globalModifiedAt > 0) applyGlobalFilter(); }, [globalStartDate, globalEndDate, globalModifiedAt]);
  useEffect(() => {
    const onDown = (e) => {
      if (isOpen && filterPanelRef.current && !filterPanelRef.current.contains(e.target) && !e.target.closest('[data-filter-toggle]')) setIsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isOpen]);
  
  function getAvailablePeriodsForYear(data, year, mode) {
    const key = mode;
    const s = new Set();
    data.forEach((r) => { if (r.year === year) s.add(r[key]); });
    return Array.from(s).sort((a, b) => a - b);
  }
  const handleViewModeChange = (m) => { if (m !== viewMode) setViewMode(m); };
  const handleDayRangeChange = (dates) => {
    const [a, b] = dates;
    setSelectedDates(dates);
    setSelectedValues(a && b ? allWorkingDaysBetween(a, b) : []);
    setHasGlobalFilter(false);
  };
  const handleYearChange = (y) => {
    if (viewMode === "day") return;
    setSelectedYear(y);
    const availablePeriods = getAvailablePeriodsForYear(records, y, viewMode);
    
    if (hasGlobalFilter && globalStartDate && globalEndDate) {
      let filteredPeriods = [];
      if (viewMode === "week") filteredPeriods = getAllWeeksBetween(globalStartDate, globalEndDate).filter(w => availablePeriods.includes(w));
      else if (viewMode === "month") filteredPeriods = getAllMonthsBetween(globalStartDate, globalEndDate).filter(m => availablePeriods.includes(m));
      else if (viewMode === "quarter") filteredPeriods = getAllQuartersBetween(globalStartDate, globalEndDate).filter(q => availablePeriods.includes(q));
      else if (viewMode === "semester") filteredPeriods = getAllSemestersBetween(globalStartDate, globalEndDate).filter(s => availablePeriods.includes(s));
      setSelectedValues(filteredPeriods);
    } else {
      setSelectedValues(availablePeriods.slice(-defaultNumPeriods));
    }
  };
  const availablePeriodsForFilter = viewMode === "day" || !selectedYear ? [] : getAvailablePeriodsForYear(records, selectedYear, viewMode);
  const allSelected = viewMode !== "day" && availablePeriodsForFilter.length > 0 && availablePeriodsForFilter.every((v) => selectedValues.includes(v));
  const toggleSelectAll = () => {
    if (viewMode === "day" || !selectedYear) return;
    setSelectedValues(allSelected ? [] : [...availablePeriodsForFilter]);
    setHasGlobalFilter(false);
  };
  const toggleOne = (v) => {
    if (viewMode === "day") return;
    const newValues = selectedValues.includes(v) ? selectedValues.filter((x) => x !== v) : [...selectedValues, v].sort((a, b) => a - b);
    setSelectedValues(newValues);
    setHasGlobalFilter(false);
  };

  const sortedSelectedValues = useMemo(() => (viewMode === "day" ? selectedValues.slice().sort() : selectedValues.slice().sort((a, b) => a - b)), [selectedValues, viewMode]);
  const labels = useMemo(() => {
    const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    if (viewMode === "day") return sortedSelectedValues.map(iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)} (S${weekNumber(parseISO(iso))})`);
    if (viewMode === "week") return sortedSelectedValues.map(w => `S${w}`);
    if (viewMode === "month") return sortedSelectedValues.map(m => months[m - 1] || `M${m}`);
    if (viewMode === "quarter") return sortedSelectedValues.map(q => `T${q}`);
    return sortedSelectedValues.map(s => `S${s}`);
  }, [sortedSelectedValues, viewMode]);
  
  // ================= MODIFICATION : FORMULE STRICTE KPIBacklogJ1 =================
  // La formule de KPIBacklogJ1 est : Moyenne = (Somme des valeurs) / (Nombre d'entrées)
  // Appliquée ici à chaque période.
const sums = useMemo(() => {
  // Structure pour stocker TOUTES les valeurs par période (pas juste somme/count)
  const periodValues = {};
  
  // Initialisation
  sortedSelectedValues.forEach((v) => {
    periodValues[v] = [];
  });

  records.forEach((r) => {
    // 1. Filtre Jours Fériés / Non travaillés - IDENTIQUE à KPIBacklogJ1
    const dateObj = parseISO(r.dateISO);
    
    // Vérifier si c'est un jour ouvré
    if (!dateObj || !isWorkingDay(dateObj)) {
      return;
    }
    
    // Vérifier si c'est un jour férié
    if (holidaySet.has(r.dateISO)) {
      return;
    }

    // 2. Filtre Année (sauf mode jour)
    if (viewMode !== "day" && selectedYear && r.year !== selectedYear) {
      return;
    }

    // 3. Détermination de la clé de regroupement
    let key;
    if (viewMode === "day") {
      key = r.dateISO;
    } else if (viewMode === "week") {
      key = r.week;
    } else if (viewMode === "month") {
      key = r.month;
    } else if (viewMode === "quarter") {
      key = r.quarter;
    } else if (viewMode === "semester") {
      key = r.semester;
    }

    // 4. Accumulation - Stocker CHAQUE valeur individuellement
    // (pas juste la somme, pour calculer la moyenne exactement comme KPIBacklogJ1)
    if (periodValues[key]) {
      periodValues[key].push(r.non_traite);
    }
  });

  // 5. Calcul final - MOYENNE comme dans KPIBacklogJ1
  // Formule : somme des valeurs / nombre de valeurs
  const finalValues = sortedSelectedValues.map((v) => {
    const values = periodValues[v];
    
    // Si aucune valeur, retourner 0
    if (values.length === 0) return 0;
    
    // Calculer la moyenne : somme / count
    // C'est EXACTEMENT la même formule que meanOnField() dans KPIBacklogJ1
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    
    return average;
  });

  return { nonTraiteArr: finalValues };
}, [records, sortedSelectedValues, selectedYear, viewMode, holidaySet]);
  // ================= FIN MODIFICATION =================
  
  const chartData = useMemo(() => {
    const holidayFlags = sortedSelectedValues.map(v => viewMode === "day" && holidaySet.has(v));
    const processData = (data) => data.map((val, idx) => (holidayFlags[idx] && val === 0 ? 0.1 : val));

    return {
      labels,
      datasets: [
        { 
          label: "Backlog FTTH J-1", 
          data: processData(sums.nonTraiteArr), 
          backgroundColor: COLORS[0], 
          borderRadius: 6, 
          hidden: !visibleKeys.includes("non_traite") 
        },
      ],
      holidayFlags,
      originalData: { nonTraiteArr: sums.nonTraiteArr }
    };
  }, [labels, sums, visibleKeys, viewMode, holidaySet]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: (ctx) => (viewMode === "day" && chartData.holidayFlags?.[ctx.dataIndex]) || (ctx.dataset.data[ctx.dataIndex] > 0),
        color: "#000", font: { size: 10, weight: "bold" },
        formatter: (val, ctx) => {
          if (viewMode === "day" && chartData.holidayFlags?.[ctx.dataIndex]) {
            const originalValue = chartData.originalData.nonTraiteArr[ctx.dataIndex];
            return originalValue > 0 ? `${originalValue} 🏖️` : "🏖️";
          }
          return val > 0.5 ? Math.round(val) : "";
        },
        anchor: "end", align: "top", offset: -3, clip: false,
      },
      legend: { display: false },
      tooltip: { 
        mode: "index", intersect: false, padding: 10,
        callbacks: {
          label: (ctx) => {
            let label = ctx.dataset.label || '';
            if (label) label += ': ';
            if (viewMode === "day" && chartData.holidayFlags?.[ctx.dataIndex]) {
              return label + chartData.originalData.nonTraiteArr[ctx.dataIndex] + ' 🏖️';
            }
            return label + Math.round(ctx.parsed.y);
          }
        }
      },
    },
    layout: { padding: { top: 20, right: 20, bottom: 10, left: 10 } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: viewMode === "day" ? 45 : 0, minRotation: viewMode === "day" ? 45 : 0 },
        title: { display: true, text: viewMode === "day" ? "Jour" : `Périodes ${selectedYear ?? ""}` },
      },
      y: {
        beginAtZero: true, grid: { drawBorder: false },
        ticks: { precision: 0, callback: (val) => Math.round(val) },
        title: { display: true, text: viewMode === "day" ? "Volume" : "Moyenne" },
      },
    },
  }), [viewMode, selectedYear, chartData]);

  const subtitle = useMemo(() => {
    if (viewMode === "day") {
      const [a, b] = selectedDates;
      return a && b ? `Du ${toISO(a)} au ${toISO(b)}` : "Aucun jour sélectionné";
    }
    if (!sortedSelectedValues.length) return "Aucune période sélectionnée";
    const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    const prefix = viewMode === "week" ? "Semaines" : viewMode === "month" ? "Mois" : viewMode === "quarter" ? "Trimestres" : "Semestres";
    const values = sortedSelectedValues.map(v => {
      if (viewMode === "week") return `S${v}`;
      if (viewMode === "month") return months[v - 1] || v;
      if (viewMode === "quarter") return `T${v}`;
      return `S${v}`;
    });
    return `${selectedYear ? `Année ${selectedYear} - ` : ""}${prefix}: ${values.join(", ")}`;
  }, [viewMode, selectedDates, sortedSelectedValues, selectedYear]);

  const showData = !errorText && sortedSelectedValues.length > 0;

  const onLegendClick = (key) => {
    setVisibleKeys((prev) => (prev.includes(key) ? [] : [key]));
  };

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
            <h3 className="no-export text-lg font-semibold text-gray-800">{chartTitle}</h3>
            <p className="text-sm text-gray-500 min-h-[20px]">
              {errorText ? <span className="text-red-500">{errorText}</span> : subtitle}
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
              onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))}
              onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))}
            />
            <button
              className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition text-gray-600 hover:text-gray-800"
              onClick={() => setModalIsOpen(true)}
              title="Agrandir"
            >
              <FaExpand size={18} />
            </button>
          </div>
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
                     {mode === "day" ? "Jour" : mode === "week" ? "Sem." : mode === "month" ? "Mois" : mode === "quarter" ? "Trim." : "Sem."}
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
                     filterDate={(d) => isWorkingDay(d)}
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
                   {multipleYearsExist && (
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
                       onClick={toggleSelectAll}
                       disabled={availablePeriodsForFilter.length === 0}
                       className={`text-xs px-2 py-1 rounded w-full ${allSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"} disabled:opacity-50 disabled:cursor-not-allowed`}
                     >
                       {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                     </button>
                   </div>
                   <div className="max-h-32 overflow-y-auto border border-gray-200 p-2 rounded text-sm">
                     {availablePeriodsForFilter.length > 0 ? availablePeriodsForFilter.map((value) => (
                       <div key={value} className="flex items-center space-x-2 my-0.5">
                         <input
                           type="checkbox"
                           id={`period-${value}-${viewMode}`}
                           checked={selectedValues.includes(value)}
                           onChange={() => toggleOne(value)}
                           className="cursor-pointer h-3.5 w-3.5"
                         />
                         <label htmlFor={`period-${value}-${viewMode}`} className="text-gray-600 cursor-pointer select-none text-xs">
                           {viewMode === "week" ? `S${value}` :
                             viewMode === "month" ? ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"][value - 1] || `Mois ${value}` :
                             viewMode === "quarter" ? `T${value}` :
                             `S${value}`}
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
        
        <LegendInline visibleKeys={visibleKeys} onClick={onLegendClick} />
        
        <div className="flex-grow flex justify-center items-center h-[350px] w-full" ref={chartContainerRef}>
          {errorText ? (
            <div className="text-center">
              <p className="text-red-500 mb-2">{errorText}</p>
              <button onClick={reload} className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">Réessayer</button>
            </div>
          ) : showData ? (
            <Bar key={chartKey} data={chartData} options={chartOptions} plugins={[ChartDataLabels]} />
          ) : (
            <p className="text-gray-500 italic">Aucune donnée à afficher pour la sélection actuelle.</p>
          )}
        </div>
      </div>
      
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
              <p className="text-sm text-gray-500 mt-1 min-h-[20px]">{subtitle}</p>
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

          <LegendInline visibleKeys={visibleKeys} onClick={onLegendClick} />

          <div className="relative flex-grow min-h-[400px] md:min-h-[500px] flex items-center justify-center" ref={modalChartContainerRef}>
            {showData ? (
              <Bar key={`m-${chartKey}`} data={chartData} options={chartOptions} plugins={[ChartDataLabels]} />
            ) : (
              <p className="text-gray-500 italic">Aucune donnée à afficher.</p>
            )}
            <CommentButton
              containerRef={modalChartContainerRef}
              hideButton={true}
              comments={annotations}
              onAddComment={(c) => setAnnotations([...annotations, c])}
              onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))}
              onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}