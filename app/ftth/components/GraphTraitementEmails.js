"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { useGlobalFilter } from "@/app/components/GlobalFilterContext";
import Modal from "react-modal";
import CommentButton from "@/app/components/CommentButton";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

// =========================================
// Couleurs et constantes
// =========================================

const COLORS = {
  "Finalisation commande": "#68bddd",
  "Intervention": "#1b2b6b",
  "MAJ CR STOC": "#4a90e2",
  "Rattrapage B57": "#7bb3f0",
  "REF PMT": "#9ca3af",
  "Renonciation": "#d1d5db",
};

// =========================================
// Fonctions Utilitaires (identiques au modèle)
// =========================================

function getLocalDateString(date) {
  if (!date || isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr) {
  if (typeof dateStr !== "string") return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
  }
  return date;
}

function formatDayLabel(dateStr) {
  if (typeof dateStr !== "string") return `Date invalide`;
  const d = parseLocalDate(dateStr);
  if (!d || isNaN(d.getTime())) return `Date invalide`;
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const week = getWeekNumber(d);
  return `${day}/${month}${week ? ` (S${week})` : ''}`;
}

const getWeekNumber = (date) => {
  if (!date || isNaN(date.getTime())) return null;
  try {
    const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tempDate.getUTCDay() || 7;
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
  } catch (e) {
    console.error("Error calculating week number:", e);
    return null;
  }
};

const getQuarter = (date) => {
  if (!date || isNaN(date.getTime())) return null;
  const month = date.getMonth() + 1;
  return Math.ceil(month / 3);
};

const getSemester = (date) => {
  if (!date || isNaN(date.getTime())) return null;
  const month = date.getMonth() + 1;
  return month <= 6 ? 1 : 2;
};

function getAllWorkingDaysBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
  const daysArray = [];
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  const finalEndDate = new Date(endDate);
  finalEndDate.setHours(0, 0, 0, 0);

  while (currentDate <= finalEndDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateString = getLocalDateString(currentDate);
      if (dateString) {
          daysArray.push(dateString);
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return daysArray;
}

function getAllWeeksBetween(startDate, endDate) {
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
    const weeksArray = new Set();
    const startWeek = getWeekNumber(startDate);
    const endWeek = getWeekNumber(endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    if (startWeek === null || endWeek === null) return [];

    for (let year = startYear; year <= endYear; year++) {
        const tempStart = (year === startYear) ? startDate : new Date(year, 0, 1);
        const tempEnd = (year === endYear) ? endDate : new Date(year, 11, 31);

        let currentWeekDate = new Date(tempStart);
        currentWeekDate.setDate(currentWeekDate.getDate() - currentWeekDate.getDay() + 1);

        while (currentWeekDate <= tempEnd) {
             const weekNum = getWeekNumber(currentWeekDate);
             const isoWeekYear = new Date(Date.UTC(currentWeekDate.getFullYear(), currentWeekDate.getMonth(), currentWeekDate.getDate() + 4 - (currentWeekDate.getDay() || 7))).getUTCFullYear();

             if (weekNum !== null && isoWeekYear === year) {
                 const isInGlobalRange =
                     (year > startYear || (year === startYear && weekNum >= startWeek)) &&
                     (year < endYear || (year === endYear && weekNum <= endWeek));

                 if(isInGlobalRange){
                      weeksArray.add(weekNum);
                 }
             }
             currentWeekDate.setDate(currentWeekDate.getDate() + 7);
        }
    }
    return Array.from(weeksArray).sort((a, b) => a - b);
}

function getAllMonthsBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
  const monthsArray = new Set();
  const startMonth = startDate.getMonth();
  const endMonth = endDate.getMonth();
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    const currentStartMonth = (year === startYear) ? startMonth : 0;
    const currentEndMonth = (year === endYear) ? endMonth : 11;
    for (let month = currentStartMonth; month <= currentEndMonth; month++) {
      monthsArray.add(month + 1);
    }
  }
  return Array.from(monthsArray).sort((a, b) => a - b);
}

function getAllQuartersBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
  const quartersArray = new Set();
  const startQuarter = getQuarter(startDate);
  const endQuarter = getQuarter(endDate);
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  if (startQuarter === null || endQuarter === null) return [];

  for (let year = startYear; year <= endYear; year++) {
    const currentStartQuarter = (year === startYear) ? startQuarter : 1;
    const currentEndQuarter = (year === endYear) ? endQuarter : 4;
    for (let quarter = currentStartQuarter; quarter <= currentEndQuarter; quarter++) {
      quartersArray.add(quarter);
    }
  }
  return Array.from(quartersArray).sort((a, b) => a - b);
}

function getAllSemestersBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
  const semestersArray = new Set();
  const startSemester = getSemester(startDate);
  const endSemester = getSemester(endDate);
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  if (startSemester === null || endSemester === null) return [];

  for (let year = startYear; year <= endYear; year++) {
    const currentStartSemester = (year === startYear) ? startSemester : 1;
    const currentEndSemester = (year === endYear) ? endSemester : 2;
    for (let semester = currentStartSemester; semester <= currentEndSemester; semester++) {
      semestersArray.add(semester);
    }
  }
  return Array.from(semestersArray).sort((a, b) => a - b);
}

function getLastNWorkingDays(days, n = 10) {
  const filteredDays = days
    .map(dateStr => ({ str: dateStr, date: parseLocalDate(dateStr) }))
    .filter(item => item.date && item.date.getDay() !== 0 && item.date.getDay() !== 6)
    .sort((a, b) => b.date - a.date)
    .slice(0, n)
    .sort((a, b) => a.date - b.date)
    .map(item => item.str);
  return filteredDays;
}

// Agrégation des données par date et type
const aggregateByDateAndType = (data) => {
  const grouped = {};
  data.forEach(({ type, date }) => {
    if (!grouped[date]) grouped[date] = {};
    grouped[date][type] = (grouped[date][type] || 0) + 1;
  });
  return Object.entries(grouped).map(([date, types]) => ({ date, ...types }));
};

ChartJS.register(
  BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend, ChartDataLabels
);

// =========================================
// Composant GraphTraitementEmails
// =========================================
export default function GraphTraitementEmails({
  apiUrl = 'https://api.606510.xyz/dashboard/api/mail-ftth/data/',
  title = "Traitement des e-mails",
  id = "traitement-emails",
  dateField = "date",
  weekField = "semaine",
  colors = COLORS,
  defaultViewMode = "day",
  defaultNumPeriods = 10,
}) {
  if (!apiUrl) {
    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
           <h3 className="text-lg font-semibold text-black">{title}</h3>
           <p className="text-red-500 text-sm mt-2">Erreur : L'URL de l'API est requise.</p>
        </div>
      </div>
    );
  }

  // Références
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);
  const prevViewMode = useRef(defaultViewMode);
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);

  // États locaux
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [selectedDates, setSelectedDates] = useState([null, null]);
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
  const [annotations, setAnnotations] = useState([]);

  // États pour mémoriser les sélections par vue
  const [dayViewSelection, setDayViewSelection] = useState({ dates: [null, null], values: [] });
  const [weekViewSelection, setWeekViewSelection] = useState({ values: [], year: null });
  const [monthViewSelection, setMonthViewSelection] = useState({ values: [], year: null });
  const [quarterViewSelection, setQuarterViewSelection] = useState({ values: [], year: null });
  const [semesterViewSelection, setSemesterViewSelection] = useState({ values: [], year: null });

  // Contexte Filtre Global
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Noms des périodes
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const quarterNames = ["T1", "T2", "T3", "T4"];
  const semesterNames = ["S1", "S2"];

  // --- Fonction pour obtenir les périodes disponibles pour une année/mode ---
  const getAvailablePeriodsForYear = useCallback((year, mode) => {
      if (!year || !data || data.length === 0 || mode === "day") return [];

      const periodsSet = new Set();

      data.forEach(item => {
          const itemDate = parseLocalDate(item.date);
          if (itemDate && itemDate.getFullYear() === year) {
              let period = null;
              if (mode === "week") period = getWeekNumber(itemDate);
              else if (mode === "month") period = itemDate.getMonth() + 1;
              else if (mode === "quarter") period = getQuarter(itemDate);
              else if (mode === "semester") period = getSemester(itemDate);
              if (period !== null && !isNaN(period)) periodsSet.add(period);
          }
      });

      return Array.from(periodsSet).sort((a, b) => a - b);
  }, [data]);

  // --- Fonction pour appliquer le filtre global ---
  const applyGlobalFilter = useCallback(() => {
      if (!globalStartDate || !globalEndDate || !data || data.length === 0) return;
      const currentGlobalYear = globalStartDate.getFullYear();

      // Calculer les années réellement disponibles dans les données
      const yearsInData = [...new Set(data.map(item => parseLocalDate(item.date)?.getFullYear()).filter(y => y != null))].sort();

      if (!yearsInData.includes(currentGlobalYear)) {
        console.warn(`Année ${currentGlobalYear} du filtre global non trouvée dans les données pour ce graphique.`);
        setHasGlobalFilter(false);
        return;
      }

      // Appliquer pour la vue "day"
      const dayList = getAllWorkingDaysBetween(globalStartDate, globalEndDate);
      setDayViewSelection({ dates: [globalStartDate, globalEndDate], values: dayList });

      // Appliquer pour les autres vues
      const yearToApply = currentGlobalYear;

      const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
      const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
      const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate);
      const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate);

      // Filtrer par périodes réellement disponibles pour cette année
      const availableWeeks = getAvailablePeriodsForYear(yearToApply, "week");
      const availableMonths = getAvailablePeriodsForYear(yearToApply, "month");
      const availableQuarters = getAvailablePeriodsForYear(yearToApply, "quarter");
      const availableSemesters = getAvailablePeriodsForYear(yearToApply, "semester");

      const finalWeekValues = weekList.filter(p => availableWeeks.includes(p));
      const finalMonthValues = monthList.filter(p => availableMonths.includes(p));
      const finalQuarterValues = quarterList.filter(p => availableQuarters.includes(p));
      const finalSemesterValues = semesterList.filter(p => availableSemesters.includes(p));

      setWeekViewSelection({ values: finalWeekValues, year: yearToApply });
      setMonthViewSelection({ values: finalMonthValues, year: yearToApply });
      setQuarterViewSelection({ values: finalQuarterValues, year: yearToApply });
      setSemesterViewSelection({ values: finalSemesterValues, year: yearToApply });

      // Appliquer la sélection et l'année au mode de vue actuel
      if (viewMode === "day") {
        setSelectedDates([globalStartDate, globalEndDate]);
        setSelectedValues(dayList);
      } else {
          setSelectedYear(yearToApply);
          if (viewMode === "week") setSelectedValues(finalWeekValues);
          else if (viewMode === "month") setSelectedValues(finalMonthValues);
          else if (viewMode === "quarter") setSelectedValues(finalQuarterValues);
          else if (viewMode === "semester") setSelectedValues(finalSemesterValues);
      }

      setHasGlobalFilter(true);
      globalFilterApplied.current = true;

  }, [globalStartDate, globalEndDate, data, viewMode, getAvailablePeriodsForYear]);

  // =========================================
  // UseEffects
  // =========================================

  // Clics extérieurs au panneau de filtre
  useEffect(() => {
    function handleClickOutside(event) {
      if (isOpen && filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest('button[data-filter-toggle]')) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Chargement initial des données
  useEffect(() => {
    let isMounted = true;
    async function fetchDataInternal() {
        if (!isMounted) return;
        setLoading(true);
        globalFilterApplied.current = false;

        try {
            const response = await fetchWithAuth(apiUrl);
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const apiData = await response.json();
            if (!isMounted) return;

            const transformedData = apiData.map(item => ({
                type: item.type,
                date: item[dateField]
            }));
            
            const aggregatedData = aggregateByDateAndType(transformedData);
            
            // Trier les données par date
            const sortedData = aggregatedData.sort((a, b) => new Date(a.date) - new Date(b.date));
            setData(sortedData);

            const years = [...new Set(apiData.map(t => new Date(t[dateField]).getFullYear()))].sort((a, b) => a - b);
            const latestYear = years.length > 0 ? years[years.length - 1] : new Date().getFullYear();
            setAvailableYears(years);
            setMultipleYearsExist(years.length > 1);

            // --- Logique d'initialisation ---
            let yearToUse = selectedYear || latestYear;
            let applyGlobalOnLoad = false;
            let performDefaultSetup = !initializationCompleted.current;

            if (performDefaultSetup && globalStartDate && globalEndDate && years.includes(globalStartDate.getFullYear())) {
                 applyGlobalOnLoad = true;
                 yearToUse = globalStartDate.getFullYear();
                 performDefaultSetup = false;
            }

            if (!applyGlobalOnLoad && performDefaultSetup) {
                 setSelectedYear(yearToUse);

                if (defaultViewMode === "day") {
                    const allDaysWithData = [...new Set(sortedData.map(item => item.date).filter(Boolean))];
                    const last10Days = getLastNWorkingDays(allDaysWithData, 10);
                    if (last10Days.length > 0) {
                        const startDate = parseLocalDate(last10Days[0]);
                        const endDate = parseLocalDate(last10Days[last10Days.length - 1]);
                        setSelectedDates([startDate, endDate]);
                        setSelectedValues(last10Days);
                        setDayViewSelection({ dates: [startDate, endDate], values: last10Days });
                    } else {
                        setSelectedDates([null, null]);
                        setSelectedValues([]);
                        setDayViewSelection({ dates: [null, null], values: [] });
                    }
                } else {
                    const availablePeriods = getAvailablePeriodsForYear(yearToUse, defaultViewMode);
                    const lastPeriods = availablePeriods.slice(-defaultNumPeriods);
                    setSelectedValues(lastPeriods);

                    if (defaultViewMode === "week") setWeekViewSelection({ values: lastPeriods, year: yearToUse });
                    else if (defaultViewMode === "month") setMonthViewSelection({ values: lastPeriods, year: yearToUse });
                    else if (defaultViewMode === "quarter") setQuarterViewSelection({ values: lastPeriods, year: yearToUse });
                    else if (defaultViewMode === "semester") setSemesterViewSelection({ values: lastPeriods, year: yearToUse });
                }
                initializationCompleted.current = true;
            }
            setLoading(false);
        } catch (err) {
            console.error("Erreur lors du chargement des données:", err);
            setError(err.message);
            if (isMounted) { setData([]); setLoading(false); }
        }
    }
    fetchDataInternal();
    return () => { isMounted = false; };
  }, [apiUrl, dateField]);

   // Application du filtre global si changé APRÈS l'init ou si données chargées
   useEffect(() => {
       let isMounted = true;
       if (initializationCompleted.current && data.length > 0 && globalStartDate && globalEndDate) {
           const globalYear = globalStartDate.getFullYear();
           const yearsInData = availableYears;

           if (yearsInData.includes(globalYear)) {
                if (isMounted && !globalFilterApplied.current) {
                    applyGlobalFilter();
                }
           } else {
                if(hasGlobalFilter) setHasGlobalFilter(false);
                console.warn(`Filtre global ignoré: l'année ${globalYear} n'est pas dans les données disponibles (${yearsInData.join(', ')}).`);
           }
       }
        const timer = setTimeout(() => {
            if (isMounted && globalFilterApplied.current) {
                globalFilterApplied.current = false;
            }
        }, 150);

       return () => { isMounted = false; clearTimeout(timer);};
   }, [globalStartDate, globalEndDate, globalModifiedAt, data, applyGlobalFilter, availableYears, hasGlobalFilter]);

  // Gestion du changement de mode et sauvegarde/restauration des sélections
  useEffect(() => {
    if (!initializationCompleted.current) {
        prevViewMode.current = viewMode;
        return;
    }
    if (viewMode !== 'day' && !selectedYear) {
        console.warn("useEffect [viewMode]: selectedYear is null for non-day view. Waiting.");
        prevViewMode.current = viewMode;
        return;
    }

    const previousMode = prevViewMode.current;

    // --- 1. Sauvegarde ---
    if (previousMode && previousMode !== viewMode) {
      const yearToSave = (previousMode !== 'day') ? selectedYear : null;
      if (previousMode === "day") setDayViewSelection({ dates: selectedDates, values: selectedValues });
      else if (previousMode === "week") setWeekViewSelection({ values: selectedValues, year: yearToSave });
      else if (previousMode === "month") setMonthViewSelection({ values: selectedValues, year: yearToSave });
      else if (previousMode === "quarter") setQuarterViewSelection({ values: selectedValues, year: yearToSave });
      else if (previousMode === "semester") setSemesterViewSelection({ values: selectedValues, year: yearToSave });
    }

    // --- 2. Restauration / Initialisation ---
    let newSelectedValues = [];
    let newSelectedDates = selectedDates;

    if (viewMode === "day") {
        if (dayViewSelection.values.length > 0) {
            newSelectedDates = dayViewSelection.dates;
            newSelectedValues = dayViewSelection.values;
        } else {
            const allDaysWithData = [...new Set(data.map(item => item.date).filter(Boolean))];
            const last10Days = getLastNWorkingDays(allDaysWithData, 10);
            if(last10Days.length > 0) {
                newSelectedDates = [parseLocalDate(last10Days[0]), parseLocalDate(last10Days[last10Days.length - 1])];
                newSelectedValues = last10Days;
            } else {
                newSelectedDates = [null, null];
                newSelectedValues = [];
            }
        }
        if (newSelectedDates[0]?.getTime() !== selectedDates[0]?.getTime() || newSelectedDates[1]?.getTime() !== selectedDates[1]?.getTime()) {
            setSelectedDates(newSelectedDates);
        }
    } else {
        let selectionToRestore = { values: [], year: null };
        if (viewMode === "week") selectionToRestore = weekViewSelection;
        else if (viewMode === "month") selectionToRestore = monthViewSelection;
        else if (viewMode === "quarter") selectionToRestore = quarterViewSelection;
        else if (viewMode === "semester") selectionToRestore = semesterViewSelection;

        const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode);

        if (selectionToRestore.year === selectedYear && selectionToRestore.values.length > 0) {
            const validValues = selectionToRestore.values.filter(v => availablePeriods.includes(v));
            newSelectedValues = validValues.length > 0 ? validValues : availablePeriods.slice(-defaultNumPeriods);
        } else {
            newSelectedValues = availablePeriods.slice(-defaultNumPeriods);
            const currentYear = selectedYear;
             if (viewMode === "week") setWeekViewSelection({ values: newSelectedValues, year: currentYear });
             else if (viewMode === "month") setMonthViewSelection({ values: newSelectedValues, year: currentYear });
             else if (viewMode === "quarter") setQuarterViewSelection({ values: newSelectedValues, year: currentYear });
             else if (viewMode === "semester") setSemesterViewSelection({ values: newSelectedValues, year: currentYear });
        }
    }

    // --- 3. Appliquer la sélection ---
    const currentSortedJSON = JSON.stringify(selectedValues.slice().sort());
    const newSortedJSON = JSON.stringify(newSelectedValues.slice().sort());
    if (currentSortedJSON !== newSortedJSON) {
        setSelectedValues(newSelectedValues);
    }

    // --- 4. Mettre à jour prevViewMode ---
    prevViewMode.current = viewMode;

  }, [viewMode, selectedYear, getAvailablePeriodsForYear, defaultNumPeriods, data]);

  // =========================================
  // Gestionnaires d'événements (Filtres)
  // =========================================

  const handleViewModeChange = (newMode) => {
    if (newMode !== viewMode) {
        setViewMode(newMode);
        setHasGlobalFilter(false);
    }
  };

  const handleDayRangeChange = (dates) => {
    const [start, end] = dates;
    setSelectedDates(dates);
    if (start && end) {
      const dayList = getAllWorkingDaysBetween(start, end);
      setSelectedValues(dayList);
      setDayViewSelection({ dates: [start, end], values: dayList });
      setHasGlobalFilter(false);
    } else {
       setSelectedValues([]);
       setDayViewSelection({ dates: [start, end], values: [] });
       setHasGlobalFilter(false);
    }
  };

  const handleSelectionChange = (value) => {
      if (viewMode === 'day') return;
      const newSelectedValues = selectedValues.includes(value)
          ? selectedValues.filter(v => v !== value)
          : [...selectedValues, value].sort((a, b) => a - b);
      setSelectedValues(newSelectedValues);

      const currentYear = selectedYear;
      if (viewMode === "week") setWeekViewSelection({ values: newSelectedValues, year: currentYear });
      else if (viewMode === "month") setMonthViewSelection({ values: newSelectedValues, year: currentYear });
      else if (viewMode === "quarter") setQuarterViewSelection({ values: newSelectedValues, year: currentYear });
      else if (viewMode === "semester") setSemesterViewSelection({ values: newSelectedValues, year: currentYear });
      setHasGlobalFilter(false);
  };

  const handleSelectAll = () => {
    if (viewMode === "day" || !selectedYear) return;

    const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode);
    const allSelectedCurrently = availablePeriods.length > 0 && availablePeriods.every(p => selectedValues.includes(p));
    const newSelectedValues = allSelectedCurrently ? [] : [...availablePeriods];

    setSelectedValues(newSelectedValues);

    const currentYear = selectedYear;
    if (viewMode === "week") setWeekViewSelection({ values: newSelectedValues, year: currentYear });
    else if (viewMode === "month") setMonthViewSelection({ values: newSelectedValues, year: currentYear });
    else if (viewMode === "quarter") setQuarterViewSelection({ values: newSelectedValues, year: currentYear });
    else if (viewMode === "semester") setSemesterViewSelection({ values: newSelectedValues, year: currentYear });

    setHasGlobalFilter(false);
  };

  const handleYearChange = (year) => {
    if (year === selectedYear || viewMode === 'day') return;

    setSelectedYear(year);

    const newAvailablePeriods = getAvailablePeriodsForYear(year, viewMode);
    let newSelectedValues = [];

    if (hasGlobalFilter && globalStartDate && globalEndDate && globalStartDate.getFullYear() === year) {
        let globalPeriods = [];
        if (viewMode === "week") globalPeriods = getAllWeeksBetween(globalStartDate, globalEndDate);
        else if (viewMode === "month") globalPeriods = getAllMonthsBetween(globalStartDate, globalEndDate);
        else if (viewMode === "quarter") globalPeriods = getAllQuartersBetween(globalStartDate, globalEndDate);
        else if (viewMode === "semester") globalPeriods = getAllSemestersBetween(globalStartDate, globalEndDate);
        newSelectedValues = globalPeriods.filter(p => newAvailablePeriods.includes(p));
    } else {
        let selectionToRestore = { values: [], year: null };
        if (viewMode === "week") selectionToRestore = weekViewSelection;
        else if (viewMode === "month") selectionToRestore = monthViewSelection;
        else if (viewMode === "quarter") selectionToRestore = quarterViewSelection;
        else if (viewMode === "semester") selectionToRestore = semesterViewSelection;

        if (selectionToRestore.year === year && selectionToRestore.values.length > 0) {
             const validValues = selectionToRestore.values.filter(v => newAvailablePeriods.includes(v));
             newSelectedValues = validValues.length > 0 ? validValues : newAvailablePeriods.slice(-defaultNumPeriods);
        } else {
            newSelectedValues = newAvailablePeriods.slice(-defaultNumPeriods);
        }
        if (!(globalStartDate && globalEndDate && globalStartDate.getFullYear() === year)) {
            setHasGlobalFilter(false);
        }
    }

    setSelectedValues(newSelectedValues);

    if (viewMode === "week") setWeekViewSelection({ values: newSelectedValues, year: year });
    else if (viewMode === "month") setMonthViewSelection({ values: newSelectedValues, year: year });
    else if (viewMode === "quarter") setQuarterViewSelection({ values: newSelectedValues, year: year });
    else if (viewMode === "semester") setSemesterViewSelection({ values: newSelectedValues, year: year });
  };

  // =========================================
  // Préparation des données pour le graphique
  // =========================================

  const availablePeriodsForFilter = viewMode === 'day'
        ? []
        : selectedYear ? getAvailablePeriodsForYear(selectedYear, viewMode) : [];

  const allPeriodsForFilterSelected = viewMode !== 'day' && availablePeriodsForFilter.length > 0 &&
    availablePeriodsForFilter.every(period => selectedValues.includes(period));

  // Trier les valeurs sélectionnées pour l'ordre des barres/labels
  const sortedSelectedValues = useMemo(() => {
    if (!Array.isArray(selectedValues)) return [];
    try {
        if (viewMode === "day") {
            return selectedValues
                .filter(val => typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}$/))
                .slice()
                .sort();
        } else {
            return selectedValues
                .filter(val => typeof val === "number" || !isNaN(Number(val)))
                .map(val => Number(val))
                .filter(num => !isNaN(num))
                .slice()
                .sort((a, b) => a - b);
        }
    } catch (error) {
        console.error("Error sorting selected values:", error, selectedValues);
        return [];
    }
  }, [selectedValues, viewMode]);

  // Génération des labels pour l'axe X
  const labels = useMemo(() => sortedSelectedValues.map(val => {
      try {
          if (viewMode === "day") return formatDayLabel(val);
          if (viewMode === "week") return `S${val}`;
          if (viewMode === "month") return monthNames[val - 1] || `Mois ${val}`;
          if (viewMode === "quarter") return quarterNames[val - 1] || `Trim. ${val}`;
          if (viewMode === "semester") return semesterNames[val - 1] || `Sem. ${val}`;
          return String(val);
      } catch (e) {
          console.error("Label generation error", e); return String(val);
      }
  }), [sortedSelectedValues, viewMode]);

  // Filtrer et agréger les données selon les périodes sélectionnées
  const chartData = useMemo(() => {
    if (sortedSelectedValues.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Créer un objet pour chaque label avec toutes les propriétés initialisées à 0
    const dataByLabel = {};
    labels.forEach(label => {
      dataByLabel[label] = {};
      Object.keys(colors).forEach(type => {
        dataByLabel[label][type] = 0;
      });
    });

    // Agréger les données selon la vue sélectionnée
    data.forEach(item => {
      const itemDate = parseLocalDate(item.date);
      if (!itemDate) return;
      
      let shouldInclude = false;
      let label = "";
      
      if (viewMode === "day") {
        if (sortedSelectedValues.includes(item.date)) {
          shouldInclude = true;
          label = formatDayLabel(item.date);
        }
      } else {
        if (itemDate.getFullYear() !== selectedYear) return;
        
        let period;
        if (viewMode === "week") period = getWeekNumber(itemDate);
        else if (viewMode === "month") period = itemDate.getMonth() + 1;
        else if (viewMode === "quarter") period = getQuarter(itemDate);
        else if (viewMode === "semester") period = getSemester(itemDate);
        
        if (period !== null && sortedSelectedValues.includes(period)) {
          shouldInclude = true;
          if (viewMode === "week") label = `S${period}`;
          else if (viewMode === "month") label = monthNames[period - 1] || `Mois ${period}`;
          else if (viewMode === "quarter") label = quarterNames[period - 1] || `Trim. ${period}`;
          else if (viewMode === "semester") label = semesterNames[period - 1] || `Sem. ${period}`;
        }
      }
      
      if (shouldInclude && label && dataByLabel[label]) {
        // Ajouter les données de chaque type d'email
        Object.keys(item).forEach(key => {
          if (key !== 'date' && typeof item[key] === 'number' && colors[key]) {
            dataByLabel[label][key] += item[key];
          }
        });
      }
    });

    // Créer les datasets pour Chart.js
    const datasets = Object.keys(colors).map(type => ({
      label: type,
      data: labels.map(label => dataByLabel[label][type] || 0),
      backgroundColor: colors[type],
      borderRadius: 6,
      maxBarThickness: 60,
    }));

    return {
      labels,
      datasets
    };
  }, [data, sortedSelectedValues, viewMode, selectedYear, labels, colors]);

  // Options du graphique Chart.js
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: true,
        color: "#000",
        font: { weight: "bold", size: 10 },
        formatter: val => val > 0 ? val : "",
        anchor: "center",
        align: "center",
      },
      legend: {
        position: "top",
        align: "center",
        labels: { padding: 15, boxWidth: 12, font: { size: 12 } }
      },
      tooltip: {
        mode: "index", intersect: false, padding: 10,
        titleFont: { size: 13 }, bodyFont: { size: 12 }
      },
       title: { display: false }
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: {
          maxRotation: viewMode === 'day' ? 45 : 0, 
          minRotation: viewMode === 'day' ? 45 : 0,
          padding: 10, font: { size: 11 }
        },
        title: {
             display: true,
             text: viewMode === 'day' ? 'Jour' :
                   viewMode === 'week' ? `Semaines ${selectedYear || ''}` :
                   viewMode === 'month' ? `Mois ${selectedYear || ''}` :
                   viewMode === 'quarter' ? `Trimestres ${selectedYear || ''}` :
                   viewMode === 'semester' ? `Semestres ${selectedYear || ''}` : 'Période',
             font: { size: 12 }, padding: { top: 10 }
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { drawBorder: false },
        ticks: { precision: 0, padding: 10 },
        title: { display: true, text: 'Nombre d\'e-mails', font: { size: 12 }, padding: { bottom: 10 } },
        grace: '5%'
      }
    },
     layout: { padding: { top: 5, right: 20, bottom: 10, left: 10 } },
     animation: { duration: 300 },
  }), [viewMode, selectedYear]);

  // Texte descriptif de la période sélectionnée
  const getPeriodLabelText = () => {
        if (viewMode === 'day') {
            if (selectedDates[0] && selectedDates[1]) {
                 const startStr = getLocalDateString(selectedDates[0]);
                 const endStr = getLocalDateString(selectedDates[1]);
                 return `Du ${startStr} au ${endStr}`;
            } else { return "Aucun jour sélectionné"; }
        } else if (sortedSelectedValues.length > 0) {
             const prefix = viewMode === "week" ? "S" :
                           viewMode === "month" ? "" :
                           viewMode === "quarter" ? "Trim." :
                           viewMode === "semester" ? "Sem." : "Pér.";
             const valuesString = sortedSelectedValues.map(val => {
                  if (viewMode === "month") return monthNames[val - 1] || val;
                  return `${prefix} ${val}`;
             }).join(", ");
             let titlePrefix = "";
              if (viewMode === "week") titlePrefix = sortedSelectedValues.length > 1 ? "Semaines" : "Semaine";
              else if (viewMode === "month") titlePrefix = sortedSelectedValues.length > 1 ? "Mois" : "Mois";
              else if (viewMode === "quarter") titlePrefix = sortedSelectedValues.length > 1 ? "Trimestres" : "Trimestre";
              else if (viewMode === "semester") titlePrefix = sortedSelectedValues.length > 1 ? "Semestres" : "Semestre";
              else titlePrefix = sortedSelectedValues.length > 1 ? "Périodes" : "Période";

             return `${titlePrefix}: ${valuesString}`;
        } else {
             return "Aucune période sélectionnée";
        }
  };
  const periodeLabelText = getPeriodLabelText();
  const showData = chartData.datasets.some(dataset => dataset.data.some(d => d > 0));

  // =========================================
  // Rendu JSX
  // =========================================
  if (loading) {
     return ( 
       <div className="visualisation relative" data-id={id}>
         <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-[450px] flex justify-center items-center">
           <p className="text-center text-gray-500">Chargement des données...</p>
         </div>
       </div> 
     );
  }

  if (error) {
    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
           <h3 className="text-lg font-semibold text-black">{title}</h3>
           <p className="text-red-500 text-sm mt-2">Erreur : {error}</p>
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
          <h3 className="no-export text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500 min-h-[20px]">
            {viewMode !== 'day' && selectedYear ? `Année ${selectedYear} - ` : ''}
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
                  filterDate={date => {
                    const day = date.getDay();
                    return day !== 0 && day !== 6;
                  }}
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
                    onClick={handleSelectAll}
                    disabled={availablePeriodsForFilter.length === 0}
                    className={`text-xs px-2 py-1 rounded w-full ${allPeriodsForFilterSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {allPeriodsForFilterSelected ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto border border-gray-200 p-2 rounded text-sm">
                  {availablePeriodsForFilter.length > 0 ? availablePeriodsForFilter.map((value) => (
                    <div key={value} className="flex items-center space-x-2 my-0.5">
                      <input
                        type="checkbox"
                        id={`period-${value}-${viewMode}`}
                        checked={selectedValues.includes(value)}
                        onChange={() => handleSelectionChange(value)}
                        className="cursor-pointer h-3.5 w-3.5"
                      />
                      <label htmlFor={`period-${value}-${viewMode}`} className="text-gray-600 cursor-pointer select-none text-xs">
                        {viewMode === "week" ? `S${value}` :
                          viewMode === "month" ? monthNames[value - 1] || `Mois ${value}` :
                          viewMode === "quarter" ? quarterNames[value - 1] || `Trim. ${value}` :
                          viewMode === "semester" ? semesterNames[value - 1] || `Sem. ${value}` :
                          value}
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

      {/* Conteneur Graphique Principal */}
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
      contentLabel={`Modal ${title}`}
    >
      <div className="bg-white rounded-lg p-6 w-11/12 md:w-4/5 lg:w-3/4 shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500 mt-1 min-h-[20px]">
              {viewMode !== 'day' && selectedYear ? `Année ${selectedYear} - ` : ''}
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
                  datalabels: {
                    ...chartOptions.plugins.datalabels,
                    font: { size: 11 }
                  }
                }
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
            onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))}
            onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))}
          />
        </div>
      </div>
    </Modal>
  </div>
);
}