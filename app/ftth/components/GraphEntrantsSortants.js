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
} from "recharts";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand } from "react-icons/fa";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fr } from "date-fns/locale";
import fetchWithAuth from "@/utils/fetchWithAuth";
import holidaysData from "@/app/ftth/utils/holidays.json";
import { useGlobalFilter } from "@/app/components/GlobalFilterContext";
import CommentButton from "@/app/components/CommentButton"; // NOUVEAU: Import du bouton de commentaire

if (typeof window !== "undefined") Modal.setAppElement(document.body);

/* ========================== utils dates (inchangées) ========================== */
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
const quarterOf  = (d) => Math.ceil((d.getMonth() + 1) / 3);
const semesterOf = (d) => ((d.getMonth() + 1) <= 6 ? 1 : 2);

function allWorkingDaysBetween(a, b) {
  const res = [];
  if (!a || !b) return res;
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

/* ====================== styles / config ====================== */
const COLORS = ["#68bddd", "#6f80ac", "#4B5563"];
const labelStyle = { fill: "#374151", fontSize: 13, fontWeight: "bold" };

// MODIFICATION : Légende mise à jour avec le style `line-through` et un `onClick` simple
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
                onClick={() => onClick(it.key)}
                title="Cliquer pour afficher/masquer"
                className={`inline-flex items-center gap-2 transition-opacity ${active ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
              >
                <span
                  className="inline-block w-3 h-3 rounded-sm border border-gray-300"
                  style={{ backgroundColor: it.color }}
                />
                <span className={`text-gray-800 whitespace-nowrap ${!active ? 'line-through' : ''}`}>
                    {it.label}
                </span>
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
  if (x <= 50) return 50;
  if (x <= 100) return 100;
  return Math.ceil((x * 1.05) / 100) * 100;
}

/* ============================ Composant ============================ */
export default function GraphEntrantsSortants({
  apiUrl = "https://api.606510.xyz/dashboard/api/ftth/regle/", // URL corrigée si nécessaire
  id = "Entrants – Sortants – Nouveaux cas",
  chartTitle = "Entrants – Sortants – Nouveaux cas",
  defaultViewMode = "day",
  defaultNumPeriods = 5,
  holidays = [],
}) {
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);
  
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [chartKey, setChartKey] = useState(0);
  
  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [selectedDates, setSelectedDates] = useState([null, null]);
  const [selectedValues, setSelectedValues] = useState([]);
  
  const [visibleKeys, setVisibleKeys] = useState(["stock", "non_traite", "traite"]);
  const [annotations, setAnnotations] = useState([]);

  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  const holidaySet = useMemo(() => {
    try {
      const fr = holidaysData?.france ? Object.keys(holidaysData.france) : [];
      const ma = holidaysData?.morocco ? Object.keys(holidaysData.morocco) : [];
      return new Set([...fr, ...ma, ...holidays]);
    } catch {
      return new Set(holidays);
    }
  }, [holidays]);

  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate) return;

    if (viewMode === "day") {
      const dayList = allWorkingDaysBetween(globalStartDate, globalEndDate);
      setSelectedDates([globalStartDate, globalEndDate]);
      setSelectedValues(dayList);
    } else {
        let periodList = [];
        if(viewMode === 'week') periodList = getAllWeeksBetween(globalStartDate, globalEndDate);
        if(viewMode === 'month') periodList = getAllMonthsBetween(globalStartDate, globalEndDate);
        if(viewMode === 'quarter') periodList = getAllQuartersBetween(globalStartDate, globalEndDate);
        if(viewMode === 'semester') periodList = getAllSemestersBetween(globalStartDate, globalEndDate);
        
        setSelectedValues(periodList);
        setSelectedYear(globalStartDate.getFullYear());
    }
  };
  
  const reload = () => {
    setErrorText("");
    setLoading(true);
    fetchWithAuth(apiUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(raw => {
        if (!Array.isArray(raw)) throw new Error("Format de données invalide");

        const mapped = raw.map((r) => {
          const d = new Date(r.date);
          if (isNaN(d.getTime())) return null;
          return {
            dateObj: d,
            dateISO: toISO(d),
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

        setRecords(mapped);
        const years = [...new Set(mapped.map((x) => x.year))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);

        if (!initializationCompleted.current) {
          if (defaultViewMode === "day") {
            const allDays = [...new Set(mapped.map(r => r.dateISO))];
            const lastDays = lastNWorkingDays(allDays, defaultNumPeriods);
            if (lastDays.length) {
              setSelectedDates([parseISO(lastDays[0]), parseISO(lastDays[lastDays.length - 1])]);
              setSelectedValues(lastDays);
            }
          } else {
            const latestYear = years.length ? years[years.length - 1] : new Date().getFullYear();
            setSelectedYear(latestYear);
            const periods = getAvailablePeriodsForYear(mapped, latestYear, defaultViewMode);
            setSelectedValues(periods.slice(-defaultNumPeriods));
          }
          initializationCompleted.current = true;
        }
        
        if (globalStartDate && globalEndDate && !globalFilterApplied.current) {
          applyGlobalFilter();
          globalFilterApplied.current = true;
        }

      })
      .catch(err => {
        console.error("Fetch error:", err);
        setRecords([]);
        setErrorText("Impossible de charger les données.");
      })
      .finally(() => setLoading(false));
  };
  
  useEffect(reload, [apiUrl]);
  useEffect(() => { if (globalStartDate && globalEndDate && globalModifiedAt > 0) applyGlobalFilter(); }, [globalStartDate, globalEndDate, globalModifiedAt]);
  useEffect(() => {
    const onDown = (e) => {
      if (isOpen && filterPanelRef.current && !filterPanelRef.current.contains(e.target) && !e.target.closest('[data-filter-toggle]')) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isOpen]);

  function getAvailablePeriodsForYear(data, year, mode) {
    const s = new Set();
    data.forEach((r) => { if (r.year === year) s.add(r[mode]); });
    return Array.from(s).sort((a, b) => a - b);
  }

  const handleViewModeChange = (newMode) => {
    if (newMode === viewMode) return;
    setViewMode(newMode);
    
    if (newMode === 'day') {
        const allDays = [...new Set(records.map(r => r.dateISO))];
        const lastDays = lastNWorkingDays(allDays, defaultNumPeriods);
        if(lastDays.length > 0) {
            setSelectedDates([parseISO(lastDays[0]), parseISO(lastDays[lastDays.length - 1])]);
            setSelectedValues(lastDays);
        }
    } else {
        const latestYear = availableYears.length ? availableYears[availableYears.length - 1] : new Date().getFullYear();
        setSelectedYear(latestYear);
        const periods = getAvailablePeriodsForYear(records, latestYear, newMode);
        setSelectedValues(periods.slice(-defaultNumPeriods));
    }
  };
  
  const handleDayRangeChange = (dates) => {
    const [a, b] = dates;
    setSelectedDates(dates);
    setSelectedValues(allWorkingDaysBetween(a, b));
  };

  const handleYearChange = (y) => {
    if (viewMode === "day") return;
    setSelectedYear(y);
    const periods = getAvailablePeriodsForYear(records, y, viewMode);
    setSelectedValues(periods.slice(-defaultNumPeriods));
  };

  const availablePeriodsForFilter = viewMode === "day" || !selectedYear ? [] : getAvailablePeriodsForYear(records, selectedYear, viewMode);
  const allSelected = availablePeriodsForFilter.length > 0 && availablePeriodsForFilter.every(v => selectedValues.includes(v));

  const toggleSelectAll = () => {
    if (viewMode === "day") return;
    setSelectedValues(allSelected ? [] : [...availablePeriodsForFilter]);
  };
  const toggleOne = (v) => {
    if (viewMode === "day") return;
    setSelectedValues(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v].sort((a,b) => a-b));
  };

  // MODIFICATION : La logique de la légende est maintenant un simple "toggle"
  const onLegendClick = (key) => {
    setVisibleKeys((prev) => {
      const isVisible = prev.includes(key);
      if (isVisible) {
        // Empêcher de cacher le dernier élément visible
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const chartRows = useMemo(() => {
    const agg = new Map();
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

    const getLabelAndKey = (r) => {
        if (viewMode === "day") {
            const d = r.dateObj;
            const label = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
            return { key: r.dateISO, label, orderKey: r.dateISO, isHoliday: holidaySet.has(r.dateISO) };
        }
        if (viewMode === "week") return { key: r.week, label: `S${r.week}`, orderKey: r.week };
        if (viewMode === "month") return { key: r.month, label: months[r.month-1], orderKey: r.month };
        if (viewMode === "quarter") return { key: r.quarter, label: `T${r.quarter}`, orderKey: r.quarter };
        if (viewMode === "semester") return { key: r.semester, label: `S${r.semester}`, orderKey: r.semester };
        return { key: r.dateISO, label: r.dateISO, orderKey: r.dateISO };
    };

    // Initialiser toutes les périodes/jours sélectionnés pour garantir leur présence sur l'axe
    if (viewMode === 'day') {
        selectedValues.forEach(iso => {
            const { key, label, orderKey, isHoliday } = getLabelAndKey({dateISO: iso, dateObj: parseISO(iso)});
            agg.set(key, { stock: 0, non_traite: 0, traite: 0, label, orderKey, isHoliday });
        });
    } else {
        selectedValues.forEach(val => {
            const { key, label, orderKey } = getLabelAndKey({[viewMode]: val});
            agg.set(key, { stock: 0, non_traite: 0, traite: 0, label, orderKey, isHoliday: false });
        })
    }
    
    records.forEach(r => {
        const { key } = getLabelAndKey(r);
        if (agg.has(key)) {
            const slot = agg.get(key);
            slot.stock += r.stock || 0;
            slot.non_traite += r.non_traite || 0;
            slot.traite += r.traite || 0;
        }
    });
    
    return Array.from(agg.values()).sort((a,b) => a.orderKey > b.orderKey ? 1 : -1)
        .map(row => ({
            ...row,
            label: row.isHoliday ? `${row.label} 🏖️` : row.label
        }));
  }, [records, viewMode, selectedValues, selectedYear, holidaySet]);

  const maxVisible = useMemo(() => {
    let m = 0;
    chartRows.forEach(r => {
      if (visibleKeys.includes("stock")) m = Math.max(m, r.stock);
      if (visibleKeys.includes("non_traite")) m = Math.max(m, r.non_traite);
      if (visibleKeys.includes("traite")) m = Math.max(m, r.traite);
    });
    return m;
  }, [chartRows, visibleKeys]);
  
  const maxY = niceMax(maxVisible);
  const showData = chartRows.length > 0 && maxVisible > 0;

  const subtitle = useMemo(() => {
    if (viewMode === "day") {
      const [a, b] = selectedDates;
      return a && b ? `Du ${toISO(a)} au ${toISO(b)}` : "Aucune période sélectionnée";
    }
    return `Année ${selectedYear || ''}`;
  }, [viewMode, selectedDates, selectedYear]);

  const renderChart = () => (
      showData ? (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 13, fill: '#4B5563' }} >
                <Label value={xAxisTitleFor(viewMode, selectedYear)} position="insideBottom" offset={-15} style={{ fill: "#374151", fontSize: 13 }} />
            </XAxis>
            <YAxis domain={[0, maxY]} tick={{ fontSize: 13, fill: '#4B5563' }} allowDecimals={false}>
                <Label value="Volume" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: "#374151", fontSize: 13 }} />
            </YAxis>
            <Tooltip />
            {visibleKeys.includes("stock") && (
                <Bar dataKey="stock" name="Stock de la veille" fill={COLORS[0]} radius={[6, 6, 0, 0]}>
                <LabelList dataKey="stock" position="top" style={labelStyle} formatter={(v) => (v > 0 ? v : "")} />
                </Bar>
            )}
            {visibleKeys.includes("non_traite") && (
                <Bar dataKey="non_traite" name="Fermé hier" fill={COLORS[1]} radius={[6, 6, 0, 0]}>
                <LabelList dataKey="non_traite" position="top" style={labelStyle} formatter={(v) => (v > 0 ? v : "")} />
                </Bar>
            )}
            {visibleKeys.includes("traite") && (
                <Bar dataKey="traite" name="Nouveaux cas" fill={COLORS[2]} radius={[6, 6, 0, 0]}>
                <LabelList dataKey="traite" position="top" style={labelStyle} formatter={(v) => (v > 0 ? v : "")} />
                </Bar>
            )}
            </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-500 italic grid place-items-center h-full">Aucune donnée à afficher.</p>
      )
  );


  if (loading) {
    return (
      <div className="visualisation relative bg-white p-5 shadow-md rounded-lg w-full h-[450px] flex justify-center items-center">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* MODIFICATION : Header avec les nouveaux boutons */}
        <div className="flex justify-between items-start mb-2 relative">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{chartTitle}</h3>
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
        </div>

        <LegendInline visibleKeys={visibleKeys} onClick={onLegendClick} />

        {/* Panneau de filtre (inchangé) */}
        {isOpen && (
             <div ref={filterPanelRef} className="no-export absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50 border">
                 <h4 className="font-semibold text-gray-600 text-sm mb-3">Filtrer par :</h4>
                 <div className="flex gap-1 mb-3 flex-wrap">
                    {["day", "week", "month", "quarter", "semester"].map(mode => (
                        <button key={mode} onClick={() => handleViewModeChange(mode)} className={`px-2.5 py-1 rounded text-xs ${viewMode === mode ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                    ))}
                 </div>
                 {viewMode === 'day' ? (
                     <DatePicker
                        selected={selectedDates[0]}
                        onChange={handleDayRangeChange}
                        startDate={selectedDates[0]}
                        endDate={selectedDates[1]}
                        selectsRange
                        inline
                        locale={fr}
                     />
                 ) : (
                    <div>
                        <select value={selectedYear || ''} onChange={(e) => handleYearChange(Number(e.target.value))} className="w-full p-1 border rounded text-sm mb-2">
                            <option value="">Choisir une année</option>
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                         <button onClick={toggleSelectAll} className="w-full text-xs p-1 border rounded mb-2">
                           {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                         </button>
                         <div className="max-h-32 overflow-y-auto">
                           {availablePeriodsForFilter.map(p => (
                               <label key={p} className="flex items-center gap-2 text-sm">
                                   <input type="checkbox" checked={selectedValues.includes(p)} onChange={() => toggleOne(p)} />
                                   {p}
                               </label>
                           ))}
                         </div>
                    </div>
                 )}
             </div>
           )}

        <div className="relative flex-grow h-[350px]" ref={chartContainerRef}>
          {renderChart()}
          <CommentButton containerRef={chartContainerRef} hideButton={true} comments={annotations} onAddComment={(c) => setAnnotations([...annotations, c])} onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))} onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))} />
        </div>
      </div>

      <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)} className="flex items-center justify-center fixed inset-0 z-50" overlayClassName="fixed inset-0 bg-black bg-opacity-40">
         <div className="bg-white rounded-lg p-6 w-11/12 md:w-4/5 lg:w-3/4 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-semibold">{chartTitle}</h3>
                    <p className="text-sm text-gray-500">{subtitle}</p>
                </div>
                <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">✕</button>
            </div>
            <LegendInline visibleKeys={visibleKeys} onClick={onLegendClick} />
            <div className="flex-grow min-h-[500px]" ref={modalChartContainerRef}>
                {renderChart()}
                <CommentButton containerRef={modalChartContainerRef} hideButton={true} comments={annotations} onAddComment={(c) => setAnnotations([...annotations, c])} onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))} onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))} />
            </div>
         </div>
       </Modal>
    </div>
  );
}