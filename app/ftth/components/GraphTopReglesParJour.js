"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand } from "react-icons/fa";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fr } from "date-fns/locale";
import fetchWithAuth from "@/utils/fetchWithAuth";
import holidaysMap from "@/app/ftth/utils/holidays.json";
import { useGlobalFilter } from "@/app/components/GlobalFilterContext";
import CommentButton from "@/app/components/CommentButton";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

function isHoliday(dateISO, holidaySet) {
  return holidaySet.has(dateISO);
}

// ... (les fonctions utilitaires de date ne changent pas)
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
  function allWorkingDaysBetweenIncludingHolidays(a, b, holidaySet) {
      const res = [];
      if (!a || !b) return res;
      const d = new Date(a); d.setHours(0, 0, 0, 0);
      const end = new Date(b); end.setHours(0, 0, 0, 0);
      while (d <= end) {
         const iso = toISO(d);

        if (isWorkingDay(d) && !holidaySet.has(iso)) {
            res.push(iso);
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

const STACK_COLORS = ["#68bddd", "#6f80ac", "#4B5563", "#9ca3af", "#bfdbfe"];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const total = payload.reduce((sum, item) => sum + item.value, 0);
        const reversedPayload = [...payload].reverse();
    
        return (
          <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg text-sm">
            <p className="font-bold text-gray-800 mb-2">{label}</p>
            <ul className="space-y-1">
              {reversedPayload.map((item, index) => {
                 const rank = 5 - index;
                 const ruleKey = `top${rank}Rule`;
                 const ruleName = item.payload[ruleKey] || 'N/A';
    
                return (
                  <li key={`item-${index}`} className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: item.fill }} />
                    <span className="flex-grow text-gray-600">{ruleName}:</span>
                    <span className="font-semibold text-gray-800">{item.value}</span>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
              <span>Total:</span>
              <span>{Math.round(total)}</span>
            </div>
          </div>
        );
      }
      return null;
};

// MODIFICATION : Création d'un formatter simple pour les étiquettes
const LabelFormatter = (props) => {
    const { x, y, width, height, value } = props;
    if (height < 15 || !value) {
      return null;
    }
  
    // Tronquer le texte si nécessaire
    const maxChars = Math.floor(height / 8); 
    const truncatedText = value.length > maxChars 
        ? `${value.substring(0, maxChars - 2)}...` 
        : value;
  
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        fill="white"
        fontSize={13}
        fontWeight="600"
        dominantBaseline="middle"
      >
         {value}
      </text>
    );
  };
  

/* ============================ Composant Principal ============================ */
export default function GraphTopReglesStacked({
  disabled = true,
  apiUrl = "https://api.606510.xyz/dashboard/api/ftth/regle/",
  id = "Top 5 RÈGLES par jour",
  chartTitle = "Top 5 RÈGLES par jour",
  defaultViewMode = "day",
  defaultNumPeriods = 5,
  holidays = [],
}) {
  if (disabled) return null;
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);
  
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [availableYears, setAvailableYears] =useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [selectedDates, setSelectedDates] = useState([null, null]);
  const [selectedValues, setSelectedValues] = useState([]);
  
  const [annotations, setAnnotations] = useState([]);

  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  const holidaySet = useMemo(() => {
    try {
      const frList = holidaysMap?.france ? Object.keys(holidaysMap.france) : [];
      const maList = holidaysMap?.morocco ? Object.keys(holidaysMap.morocco) : [];
      return new Set([...frList, ...maList, ...holidays]);
    } catch { return new Set(holidays); }
  }, [holidays]);

  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate) return;

    if (viewMode === "day") {
        const dayList = allWorkingDaysBetweenIncludingHolidays(globalStartDate, globalEndDate);
        setSelectedDates([globalStartDate, globalEndDate]);
        setSelectedValues(dayList);
    } else {
        let periodList = [];
        if (viewMode === 'week') periodList = getAllWeeksBetween(globalStartDate, globalEndDate);
        if (viewMode === 'month') periodList = getAllMonthsBetween(globalStartDate, globalEndDate);
        if (viewMode === 'quarter') periodList = getAllQuartersBetween(globalStartDate, globalEndDate);
        if (viewMode === 'semester') periodList = getAllSemestersBetween(globalStartDate, globalEndDate);
        
        setSelectedValues(periodList);
        setSelectedYear(globalStartDate.getFullYear());
    }
  };

  const reload = () => {
    setLoading(true);
    setErrorText("");
    fetchWithAuth(apiUrl)
      .then(res => res.json())
      .then(raw => {
        if (!Array.isArray(raw)) throw new Error("Format de données invalide");
        const mapped = raw.map(r => {
          const d = new Date(r.date);
          if (isNaN(d.getTime())) return null;
          return {
            dateISO: toISO(d),
            year: d.getFullYear(),
            week: weekNumber(d),
            month: d.getMonth() + 1,
            quarter: quarterOf(d),
            semester: semesterOf(d),
            regle: r.regle,
            nouveau_cas: Number(r.nouveau_cas) || 0,
          };
        }).filter(Boolean);

        setRecords(mapped);
        const years = [...new Set(mapped.map(x => x.year))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);

        if (!initializationCompleted.current) {
            const allDays = [...new Set(mapped.map(r => r.dateISO))];
            const lastDays = lastNWorkingDays(allDays, defaultNumPeriods);
            if(lastDays.length > 0) {
                setSelectedDates([parseISO(lastDays[0]), parseISO(lastDays[lastDays.length - 1])]);
                setSelectedValues(lastDays);
            }
            initializationCompleted.current = true;
        }

        if (globalStartDate && globalEndDate && !globalFilterApplied.current) {
            applyGlobalFilter();
            globalFilterApplied.current = true;
        }
      })
      .catch(err => {
        console.error("Erreur de fetch:", err);
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

  // MODIFICATION : Pré-formater les données avec une clé "label" pour chaque segment
  const chartData = useMemo(() => {
    const dataMap = new Map();

    records.forEach(r => {
        let key = null;
        if (viewMode === 'day' && selectedValues.includes(r.dateISO)) {
            const dateLabel = new Date(r.dateISO).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit' });
            key = dateLabel;
        } else if (viewMode !== 'day' && r.year === selectedYear) {
            const periodValue = r[viewMode];
            if (selectedValues.includes(periodValue)) {
                if(viewMode === 'week') key = `S${periodValue}`;
                if(viewMode === 'month') key = fr.localize.month(periodValue-1, { width: 'abbreviated'});
                if(viewMode === 'quarter') key = `T${periodValue}`;
                if(viewMode === 'semester') key = `S${periodValue}`;
            }
        }
        //Ignorer les jours feries 
        if (holidaySet.has(r.dateISO)) return;
        if (key) {
            if (!dataMap.has(key)) dataMap.set(key, new Map());
            const ruleMap = dataMap.get(key);
            ruleMap.set(r.regle, (ruleMap.get(r.regle) || 0) + r.nouveau_cas);
        }
    });

    const finalData = [];
    dataMap.forEach((ruleMap, label) => {
        const top5 = Array.from(ruleMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        const dataPoint = { label };
        const reversedTop5 = top5.reverse(); 

        for (let i = 0; i < 5; i++) {
            const rank = 5 - i;
            if (reversedTop5[i]) {
                const value = reversedTop5[i][1];
                const rule = reversedTop5[i][0];
                dataPoint[`top${rank}Value`] = value;
                dataPoint[`top${rank}Rule`] = rule; // Garder la règle pour le tooltip
                dataPoint[`top${rank}Label`] = `${Math.round(value)} - ${rule}`; // Créer l'étiquette combinée
            } else {
                dataPoint[`top${rank}Value`] = 0;
                dataPoint[`top${rank}Rule`] = '';
                dataPoint[`top${rank}Label`] = '';
            }
        }
        finalData.push(dataPoint);
    });

    return finalData.sort((a,b) => {
        if (viewMode === 'day') {
            const dateAStr = a.label.replace(' 🏖️', '');
            const dateBStr = b.label.replace(' 🏖️', '');
            const dateA = parseISO(`2024-${dateAStr.substring(3,5)}-${dateAStr.substring(0,2)}`);
            const dateB = parseISO(`2024-${dateBStr.substring(3,5)}-${dateBStr.substring(0,2)}`);
            return dateA - dateB;
        }
        return a.label.localeCompare(b.label, 'fr', { numeric: true });
    });
  }, [records, viewMode, selectedValues, selectedYear, holidaySet]);

  const totalValues = chartData.map(d => 
    d.top1Value + d.top2Value + d.top3Value + d.top4Value + d.top5Value
  ).filter(v => v > 0);
  
  const maxValue = Math.max(0, ...totalValues);
  const minValue = Math.min(...totalValues.filter(v => v > 0), 1);
  const needsLogScale = maxValue > 0 && minValue > 0 && maxValue / minValue > 50;
  
  const yAxisDomain = needsLogScale ? [0.1, 'auto'] : [0, 'auto'];
  
  const showData = chartData.length > 0;

  // MODIFICATION : Simplification du rendu du graphique
  const renderChart = (isModal = false) => (
    showData ? (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: isModal ? 14 : 12, fill: '#4B5563' }} />
            <YAxis 
                scale={needsLogScale ? "log" : "linear"}
                domain={yAxisDomain}
                tick={{ fontSize: isModal ? 14 : 12, fill: '#4B5563' }}
                allowDataOverflow={true}
                tickFormatter={(value) => needsLogScale && value < 1 ? value.toFixed(1) : Math.round(value)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(230, 230, 230, 0.4)' }}/>
            
            <Bar dataKey="top5Value" stackId="a" fill={STACK_COLORS[4]} radius={[0, 0, 4, 4]}>
                <LabelList dataKey="top5Label" content={<LabelFormatter />} />
            </Bar>
            <Bar dataKey="top4Value" stackId="a" fill={STACK_COLORS[3]}>
                <LabelList dataKey="top4Label" content={<LabelFormatter />} />
            </Bar>
            <Bar dataKey="top3Value" stackId="a" fill={STACK_COLORS[2]}>
                <LabelList dataKey="top3Label" content={<LabelFormatter />} />
            </Bar>
            <Bar dataKey="top2Value" stackId="a" fill={STACK_COLORS[1]}>
                <LabelList dataKey="top2Label" content={<LabelFormatter />} />
            </Bar>
            <Bar dataKey="top1Value" stackId="a" fill={STACK_COLORS[0]} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="top1Label" content={<LabelFormatter />} />
            </Bar>
            </BarChart>
        </ResponsiveContainer>
    ) : (
        <p className="text-gray-500 italic grid place-items-center h-full">Aucune donnée à afficher pour la sélection.</p>
    )
  );

  if (loading) return <div className="visualisation relative bg-white p-5 shadow-md rounded-lg w-full h-[450px] flex justify-center items-center"><p>Chargement...</p></div>;

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <h3 className="no-export text-lg font-semibold text-gray-800">{chartTitle}</h3>
            <p className="text-sm text-gray-500 min-h-[20px]">
              {errorText || (needsLogScale && showData && "Échelle logarithmique active")}
            </p>
          </div>
          <div className="no-export flex gap-2">
            <button className="bg-gray-200 p-2 rounded-full hover:bg-gray-300" onClick={() => setIsOpen(!isOpen)} data-filter-toggle="true" title="Filtrer"><AiOutlineFilter size={20} /></button>
            <CommentButton containerRef={chartContainerRef} comments={annotations} onAddComment={c => setAnnotations([...annotations, c])} onUpdateComment={c => setAnnotations(annotations.map(a => a.id === c.id ? c : a))} onDeleteComment={id => setAnnotations(annotations.filter(a => a.id !== id))} />
            <button className="bg-gray-200 p-2 rounded-full hover:bg-gray-300" onClick={() => setModalIsOpen(true)} title="Agrandir"><FaExpand size={18} /></button>
          </div>
           {isOpen && (
             <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50 border">
                 <h4 className="font-semibold text-gray-600 text-sm mb-3">Filtrer par :</h4>
                 <div className="flex gap-1 mb-3 flex-wrap">
                    {["day", "week", "month", "quarter", "semester"].map(mode => (
                        <button key={mode} onClick={() => setViewMode(mode)} className={`px-2.5 py-1 rounded text-xs ${viewMode === mode ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                    ))}
                 </div>
                 {viewMode === 'day' ? (
                     <DatePicker
                        selected={selectedDates[0]}
                        onChange={(dates) => {
                            const [start, end] = dates;
                            setSelectedDates([start, end]);
                            setSelectedValues(allWorkingDaysBetweenIncludingHolidays(start, end, holidaySet));
                        }}
                        startDate={selectedDates[0]}
                        endDate={selectedDates[1]}
                        selectsRange
                        inline
                        locale={fr}
                     />
                 ) : (
                    <div>
                        <select value={selectedYear || ''} onChange={e => setSelectedYear(Number(e.target.value))} className="w-full p-1 border rounded text-sm mb-2">
                            <option value="">Choisir une année</option>
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                 )}
             </div>
           )}
        </div>

        <div className="flex-grow flex justify-center items-center h-[350px] w-full" ref={chartContainerRef}>
          {renderChart(false)}
        </div>
      </div>
       <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)} className="flex items-center justify-center fixed inset-0 z-50" overlayClassName="fixed inset-0 bg-black bg-opacity-40">
         <div className="bg-white rounded-lg p-6 w-11/12 md:w-4/5 lg:w-3/4 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{chartTitle}</h3>
                <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">✕</button>
            </div>
            <div className="flex-grow min-h-[500px]" ref={modalChartContainerRef}>
                {renderChart(true)}
            </div>
         </div>
       </Modal>
    </div>
  );
}