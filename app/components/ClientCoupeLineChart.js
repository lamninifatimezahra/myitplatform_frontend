"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand } from "react-icons/fa";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useGlobalFilter } from "@/app/components/GlobalFilterContext"; 
import Modal from "react-modal";
import CommentButton from "./CommentButton";
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Configurer le Modal pour l'accessibilité
if (typeof window !== "undefined") Modal.setAppElement(document.body);

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

// Noms des périodes pour affichage
const monthNames = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
const quarterNames = ["T1", "T2", "T3", "T4"];
const semesterNames = ["S1", "S2"];

// Fonction pour obtenir le numéro de semaine ISO
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

// Fonctions pour Trimestre/Semestre
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

// Fonctions pour générer toutes les périodes entre deux dates
function getAllWeeksBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
  const weeksArray = [];
  const startWeek = getWeekNumber(startDate);
  const endWeek = getWeekNumber(endDate);
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  if (startYear === endYear) {
    if (startWeek === null || endWeek === null) return [];
    for (let week = startWeek; week <= endWeek; week++) weeksArray.push(week);
  } else {
    for (let year = startYear; year <= endYear; year++) {
      const yearStartDate = new Date(Date.UTC(year, 0, 1));
      const yearEndDate = new Date(Date.UTC(year, 11, 31));
      const firstWeek = getWeekNumber(yearStartDate);
      const lastWeek = getWeekNumber(yearEndDate) || 52;

      const minWeeks = year === startYear ? (startWeek ?? 1) : 1;
      const maxWeeks = year === endYear ? (endWeek ?? lastWeek) : lastWeek;

      for (let week = minWeeks; week <= maxWeeks; week++) weeksArray.push(week);
    }
  }
  return [...new Set(weeksArray)].sort((a, b) => a - b);
}

function getAllMonthsBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
  const monthsArray = [];
  const startMonth = startDate.getMonth() + 1;
  const endMonth = endDate.getMonth() + 1;
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  if (startYear === endYear) {
    for (let month = startMonth; month <= endMonth; month++) monthsArray.push(month);
  } else {
    for (let year = startYear; year <= endYear; year++) {
      const maxMonth = year === endYear ? endMonth : 12;
      const minMonth = year === startYear ? startMonth : 1;
      for (let month = minMonth; month <= maxMonth; month++) monthsArray.push(month);
    }
  }
  return monthsArray;
}

function getAllQuartersBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
  const quartersArray = [];
  const startQuarter = getQuarter(startDate);
  const endQuarter = getQuarter(endDate);
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  if (startQuarter === null || endQuarter === null) return [];
  if (startYear === endYear) {
    for (let quarter = startQuarter; quarter <= endQuarter; quarter++) quartersArray.push(quarter);
  } else {
    for (let year = startYear; year <= endYear; year++) {
      const maxQuarter = year === endYear ? endQuarter : 4;
      const minQuarter = year === startYear ? startQuarter : 1;
      for (let quarter = minQuarter; quarter <= maxQuarter; quarter++) quartersArray.push(quarter);
    }
  }
  return [...new Set(quartersArray)].sort((a, b) => a - b);
}

function getAllSemestersBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
  const semestersArray = [];
  const startSemester = getSemester(startDate);
  const endSemester = getSemester(endDate);
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  if (startSemester === null || endSemester === null) return [];
  if (startYear === endYear) {
    for (let semester = startSemester; semester <= endSemester; semester++) semestersArray.push(semester);
  } else {
    for (let year = startYear; year <= endYear; year++) {
      const maxSemester = year === endYear ? endSemester : 2;
      const minSemester = year === startYear ? startSemester : 1;
      for (let semester = minSemester; semester <= maxSemester; semester++) semestersArray.push(semester);
    }
  }
  return [...new Set(semestersArray)].sort((a, b) => a - b);
}

export default function ClientCoupeLineChart({
  apiUrl,
  id = "Evolution Client Coupé",
  title = "Client Coupé - Évolution",
  dateField = "date_derniere_maj",
  weekField = "semaine",
  filterField = "client_coupe",
  filterValue = "OK",
  yAxisLabel = "Nombre de clients coupés",
  defaultViewMode = "week",
  defaultNumPeriods = 5,
  lineColor = "#3b82f6",
  backgroundColor = "rgba(59, 130, 246, 0.1)",
  lineTension = 0.3,
  enableFill = true
}) {
  if (!apiUrl) {
    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-red-500 text-sm mt-2">Erreur : L'URL de l'API est requise.</p>
        </div>
      </div>
    );
  }

  // Références et états internes
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);
  const prevViewMode = useRef(defaultViewMode);
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
  const [annotations, setAnnotations] = useState([]);

  // États pour mémoriser les sélections pour chaque vue
  const [weekViewSelection, setWeekViewSelection] = useState({ values: [], year: null });
  const [monthViewSelection, setMonthViewSelection] = useState({ values: [], year: null });
  const [quarterViewSelection, setQuarterViewSelection] = useState({ values: [], year: null });
  const [semesterViewSelection, setSemesterViewSelection] = useState({ values: [], year: null });

  // États pour la gestion des années
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  // États pour la priorisation des filtres
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);
  const [quarterSelectionModifiedAt, setQuarterSelectionModifiedAt] = useState(0);
  const [semesterSelectionModifiedAt, setSemesterSelectionModifiedAt] = useState(0);

  // Récupération du filtre global
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Gestion des clics extérieurs
  useEffect(() => {
    function handleClickOutside(event) {
      if (isOpen && 
          filterPanelRef.current && 
          !filterPanelRef.current.contains(event.target) &&
          !event.target.closest('button[data-filter-toggle]')) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Fonction pour obtenir la période d'un ticket selon le viewMode
  const getTicketPeriod = useCallback((ticket) => {
    const ticketDate = new Date(ticket[dateField]);
    if (isNaN(ticketDate.getTime())) return null;

    if (viewMode === "week") {
      const weekVal = ticket[weekField];
      return !isNaN(Number(weekVal)) ? Number(weekVal) : getWeekNumber(ticketDate);
    } else if (viewMode === "month") {
      return ticketDate.getMonth() + 1;
    } else if (viewMode === "quarter") {
      return getQuarter(ticketDate);
    } else if (viewMode === "semester") {
      return getSemester(ticketDate);
    }
    return null;
  }, [viewMode, dateField, weekField]);

  // Fonction pour obtenir les périodes disponibles
  const getAvailablePeriodsForYear = useCallback((year, mode) => {
    if (!year || !data || data.length === 0) return [];
    const filteredByYear = data.filter((t) => {
      const d = new Date(t[dateField]);
      return !isNaN(d.getTime()) && d.getFullYear() === year;
    });
    if (filteredByYear.length === 0) return [];
    let periodsSet;
    try {
      if (mode === "week") {
        periodsSet = new Set(filteredByYear.map(t => {
          const w = t[weekField];
          const d = new Date(t[dateField]);
          return !isNaN(Number(w)) ? Number(w) : (!isNaN(d.getTime()) ? getWeekNumber(d) : null);
        }).filter(w => w !== null && !isNaN(w)));
      } else if (mode === "month") {
        periodsSet = new Set(filteredByYear.map(t => {
          const d = new Date(t[dateField]);
          return !isNaN(d.getTime()) ? d.getMonth() + 1 : null;
        }).filter(m => m !== null));
      } else if (mode === "quarter") {
        periodsSet = new Set(filteredByYear.map(t => getQuarter(new Date(t[dateField]))).filter(q => q !== null));
      } else if (mode === "semester") {
        periodsSet = new Set(filteredByYear.map(t => getSemester(new Date(t[dateField]))).filter(s => s !== null));
      } else return [];
    } catch (e) { 
      console.error("Erreur calcul périodes:", e); 
      return []; 
    }
    return periodsSet ? Array.from(periodsSet).sort((a, b) => a - b) : [];
  }, [data, dateField, weekField]);

  // Fonction pour appliquer le filtre global
  const applyGlobalFilter = useCallback(() => {
    if (!globalStartDate || !globalEndDate || isNaN(globalStartDate.getTime()) || isNaN(globalEndDate.getTime()) || !data || data.length === 0) return;
    
    const currentGlobalYear = globalStartDate.getFullYear();
    const localAvailableYears = availableYears.length > 0 ? availableYears : [...new Set(data.map(t => {
      const d = new Date(t[dateField]);
      return !isNaN(d.getTime()) ? d.getFullYear() : null;
    }).filter(y => y !== null))];

    if (!localAvailableYears.includes(currentGlobalYear)) {
      console.warn(`Année ${currentGlobalYear} du filtre global non trouvée dans les données de ${title}. Filtre global ignoré pour ce composant.`);
      return;
    }
    
    setSelectedYear(currentGlobalYear);

    const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
    const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
    const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate);
    const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate);

    const availableWeeks = getAvailablePeriodsForYear(currentGlobalYear, "week");
    const availableMonths = getAvailablePeriodsForYear(currentGlobalYear, "month");
    const availableQuarters = getAvailablePeriodsForYear(currentGlobalYear, "quarter");
    const availableSemesters = getAvailablePeriodsForYear(currentGlobalYear, "semester");

    const finalWeekValues = weekList.filter(p => availableWeeks.includes(p));
    const finalMonthValues = monthList.filter(p => availableMonths.includes(p));
    const finalQuarterValues = quarterList.filter(p => availableQuarters.includes(p));
    const finalSemesterValues = semesterList.filter(p => availableSemesters.includes(p));

    setWeekViewSelection({ values: finalWeekValues, year: currentGlobalYear });
    setMonthViewSelection({ values: finalMonthValues, year: currentGlobalYear });
    setQuarterViewSelection({ values: finalQuarterValues, year: currentGlobalYear });
    setSemesterViewSelection({ values: finalSemesterValues, year: currentGlobalYear });

    let currentSelection = [];
    if (viewMode === "week") currentSelection = finalWeekValues;
    else if (viewMode === "month") currentSelection = finalMonthValues;
    else if (viewMode === "quarter") currentSelection = finalQuarterValues;
    else if (viewMode === "semester") currentSelection = finalSemesterValues;

    setSelectedValues(currentSelection);
    setHasGlobalFilter(true);
    globalFilterApplied.current = true;
  }, [globalStartDate, globalEndDate, data, viewMode, availableYears, getAvailablePeriodsForYear, dateField, title]);

  // Chargement initial des données
  useEffect(() => {
    let isMounted = true;
    
    async function fetchDataInternal() {
      if (!isMounted) return;
      setLoading(true);
      globalFilterApplied.current = false;
      
      try {
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        
        // Filtrer uniquement les clients coupés
        const filteredResult = result.filter(ticket => 
          ticket[filterField] === filterValue
        );
        
        if (isMounted) {
          setData(filteredResult);

          const years = [...new Set(filteredResult.map(t => {
            const d = new Date(t[dateField]);
            return !isNaN(d.getTime()) ? d.getFullYear() : null;
          }).filter(y => y !== null))].sort((a, b) => a - b);
          
          const latestYear = years.length > 0 ? years[years.length - 1] : new Date().getFullYear();
          setAvailableYears(years);
          setMultipleYearsExist(years.length > 1);

          let yearToUse = selectedYear || latestYear;
          let applyGlobalOnLoad = false;
          let performDefaultSetup = !initializationCompleted.current;

          if (performDefaultSetup && globalStartDate && globalEndDate && !isNaN(globalStartDate.getTime()) && !isNaN(globalEndDate.getTime()) && years.includes(globalStartDate.getFullYear())) {
            const lastLocalMod = Math.max(
              weekSelectionModifiedAt,
              monthSelectionModifiedAt,
              quarterSelectionModifiedAt,
              semesterSelectionModifiedAt
            );
            if (globalModifiedAt > lastLocalMod || lastLocalMod === 0) {
              applyGlobalOnLoad = true;
              yearToUse = globalStartDate.getFullYear();
              performDefaultSetup = false;
            }
          }

          if (applyGlobalOnLoad) {
            setSelectedYear(yearToUse);
            setHasGlobalFilter(true);
          } else if (performDefaultSetup) {
            if (!selectedYear) setSelectedYear(yearToUse);
            else yearToUse = selectedYear;

            const availablePeriods = getAvailablePeriodsForYear(yearToUse, viewMode);
            const lastPeriods = availablePeriods.slice(-defaultNumPeriods);
            setSelectedValues(lastPeriods);

            if (viewMode === "week") setWeekViewSelection({ values: lastPeriods, year: yearToUse });
            else if (viewMode === "month") setMonthViewSelection({ values: lastPeriods, year: yearToUse });
            else if (viewMode === "quarter") setQuarterViewSelection({ values: lastPeriods, year: yearToUse });
            else if (viewMode === "semester") setSemesterViewSelection({ values: lastPeriods, year: yearToUse });

            initializationCompleted.current = true;
            setHasGlobalFilter(false);
          } else {
            if (!selectedYear && latestYear) setSelectedYear(latestYear);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error(`Erreur fetch pour ${title}:`, error);
        if (isMounted) {
          setData([]);
          setLoading(false);
        }
      }
    }
    
    fetchDataInternal();
    return () => { isMounted = false; };
  }, [apiUrl, dateField, weekField, defaultNumPeriods, defaultViewMode, title, filterField, filterValue]);

  // Application du filtre global
  useEffect(() => {
    let isMounted = true;
    
    if (initializationCompleted.current && data.length > 0 && globalStartDate && globalEndDate && globalModifiedAt > 0) {
      const lastLocalMod = Math.max(
        weekSelectionModifiedAt,
        monthSelectionModifiedAt,
        quarterSelectionModifiedAt,
        semesterSelectionModifiedAt
      );
      
      if (globalModifiedAt > lastLocalMod) {
        if (isMounted) {
          console.log(`Applying global filter update for ${title}`);
          applyGlobalFilter();
        }
      }
    }
    
    return () => { isMounted = false; };
  }, [globalStartDate, globalEndDate, globalModifiedAt, data, applyGlobalFilter, title]);

  // Sauvegarde/restauration lors du changement de vue
  useEffect(() => {
    if (!initializationCompleted.current || !selectedYear) {
      prevViewMode.current = viewMode;
      return;
    }

    const previousMode = prevViewMode.current;

    if (previousMode && previousMode !== viewMode) {
      if (previousMode === "week") setWeekViewSelection({ values: selectedValues, year: selectedYear });
      else if (previousMode === "month") setMonthViewSelection({ values: selectedValues, year: selectedYear });
      else if (previousMode === "quarter") setQuarterViewSelection({ values: selectedValues, year: selectedYear });
      else if (previousMode === "semester") setSemesterViewSelection({ values: selectedValues, year: selectedYear });
    }

    let selectionToRestore = { values: [], year: selectedYear };
    if (viewMode === "week") selectionToRestore = weekViewSelection;
    else if (viewMode === "month") selectionToRestore = monthViewSelection;
    else if (viewMode === "quarter") selectionToRestore = quarterViewSelection;
    else if (viewMode === "semester") selectionToRestore = semesterViewSelection;

    const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode);
    let valuesToSet;

    if (hasGlobalFilter && globalStartDate && globalEndDate && selectedYear === globalStartDate.getFullYear()) {
      let globalPeriods = [];
      if (viewMode === "week") globalPeriods = getAllWeeksBetween(globalStartDate, globalEndDate);
      else if (viewMode === "month") globalPeriods = getAllMonthsBetween(globalStartDate, globalEndDate);
      else if (viewMode === "quarter") globalPeriods = getAllQuartersBetween(globalStartDate, globalEndDate);
      else if (viewMode === "semester") globalPeriods = getAllSemestersBetween(globalStartDate, globalEndDate);
      
      valuesToSet = globalPeriods.filter(p => availablePeriods.includes(p));
    } else if (selectionToRestore.year === selectedYear && selectionToRestore.values.length > 0) {
      const validValues = selectionToRestore.values.filter(v => availablePeriods.includes(v));
      valuesToSet = validValues.length > 0 ? validValues : availablePeriods.slice(-defaultNumPeriods);
    } else {
      valuesToSet = availablePeriods.slice(-defaultNumPeriods);
      setHasGlobalFilter(false);
    }

    setSelectedValues(valuesToSet);
    prevViewMode.current = viewMode;
  }, [
    viewMode, selectedYear, getAvailablePeriodsForYear, defaultNumPeriods, hasGlobalFilter, globalStartDate, globalEndDate,
    weekViewSelection, monthViewSelection, quarterViewSelection, semesterViewSelection
  ]);

  // Fonctions de gestion des filtres
  const handleSelectionChange = (value) => {
    const newSelectedValues = selectedValues.includes(value) 
      ? selectedValues.filter(v => v !== value) 
      : [...selectedValues, value].sort((a, b) => a - b);
    
    setSelectedValues(newSelectedValues);
    const now = Date.now();
    
    if (viewMode === "week") {
      setWeekViewSelection({ values: newSelectedValues, year: selectedYear });
      setWeekSelectionModifiedAt(now);
    } else if (viewMode === "month") {
      setMonthViewSelection({ values: newSelectedValues, year: selectedYear });
      setMonthSelectionModifiedAt(now);
    } else if (viewMode === "quarter") {
      setQuarterViewSelection({ values: newSelectedValues, year: selectedYear });
      setQuarterSelectionModifiedAt(now);
    } else if (viewMode === "semester") {
      setSemesterViewSelection({ values: newSelectedValues, year: selectedYear });
      setSemesterSelectionModifiedAt(now);
    }
    
    setHasGlobalFilter(false);
  };

  const toggleSelectAll = () => {
    const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode);
    const allSelected = availablePeriods.length > 0 && availablePeriods.every(p => selectedValues.includes(p));
    const newSelectedValues = allSelected ? [] : [...availablePeriods].sort((a, b) => a - b);
    
    setSelectedValues(newSelectedValues);
    const now = Date.now();
    
    if (viewMode === "week") {
      setWeekViewSelection({ values: newSelectedValues, year: selectedYear });
      setWeekSelectionModifiedAt(now);
    } else if (viewMode === "month") {
      setMonthViewSelection({ values: newSelectedValues, year: selectedYear });
      setMonthSelectionModifiedAt(now);
    } else if (viewMode === "quarter") {
      setQuarterViewSelection({ values: newSelectedValues, year: selectedYear });
      setQuarterSelectionModifiedAt(now);
    } else if (viewMode === "semester") {
      setSemesterViewSelection({ values: newSelectedValues, year: selectedYear });
      setSemesterSelectionModifiedAt(now);
    }
    
    setHasGlobalFilter(false);
  };

  const handleYearChange = (year) => {
    if (year === selectedYear) return;
    setSelectedYear(year);
    
    if (hasGlobalFilter && globalStartDate && globalStartDate.getFullYear() !== year) {
      setHasGlobalFilter(false);
    } else if (!hasGlobalFilter && globalStartDate && globalStartDate.getFullYear() === year && globalModifiedAt > 0) {
      const lastLocalMod = Math.max(weekSelectionModifiedAt, monthSelectionModifiedAt, quarterSelectionModifiedAt, semesterSelectionModifiedAt);
      if (globalModifiedAt > lastLocalMod) {
        setHasGlobalFilter(true);
      }
    }
  };

  const handleViewModeChange = (newMode) => {
    if (newMode !== viewMode) {
      const currentSelection = { values: selectedValues, year: selectedYear };
      
      if (viewMode === "week") setWeekViewSelection(currentSelection);
      else if (viewMode === "month") setMonthViewSelection(currentSelection);
      else if (viewMode === "quarter") setQuarterViewSelection(currentSelection);
      else if (viewMode === "semester") setSemesterViewSelection(currentSelection);

      setViewMode(newMode);
    }
  };

  // Préparation des données pour le graphique
  const ticketsForYear = useMemo(() => {
    return data.filter(t => {
      const d = new Date(t[dateField]);
      return !isNaN(d.getTime()) && d.getFullYear() === selectedYear;
    });
  }, [data, dateField, selectedYear]);

  const filteredDataForSelectedPeriods = useMemo(() => {
    return ticketsForYear.filter(ticket => {
      const period = getTicketPeriod(ticket);
      return period !== null && selectedValues.includes(period);
    });
  }, [ticketsForYear, selectedValues, getTicketPeriod]);

  // Création des labels optimisés
  const sortedSelectedValues = [...selectedValues].sort((a, b) => a - b);

  const createOptimizedLabels = () => {
    const numPeriods = sortedSelectedValues.length;
    
    return sortedSelectedValues.map(value => {
      let periodLabel = String(value);
      
      if (viewMode === "week") {
        if (numPeriods > 10) {
          periodLabel = `S${value}`;
        } else {
          periodLabel = `S ${value}`;
        }
      } else if (viewMode === "month") {
        if (numPeriods > 6) {
          periodLabel = monthNames[value - 1] || `M${value}`;
        } else {
          periodLabel = monthNames[value - 1] || `Mois ${value}`;
        }
      } else if (viewMode === "quarter") {
        periodLabel = quarterNames[value - 1] || `T${value}`;
      } else if (viewMode === "semester") {
        periodLabel = semesterNames[value - 1] || `S${value}`;
      }
      
      if (multipleYearsExist && numPeriods <= 8) {
        return `${periodLabel} ${selectedYear}`;
      }
      return periodLabel;
    });
  };

  const labels = createOptimizedLabels();

  // Calcul des données (simple comptage des clients coupés)
  const chartData = useMemo(() => ({
    labels,
    datasets: [{
      label: "Clients coupés",
      data: sortedSelectedValues.map(periodValue => {
        return filteredDataForSelectedPeriods.filter(ticket => {
          const ticketPeriod = getTicketPeriod(ticket);
          return ticketPeriod === periodValue;
        }).length;
      }),
      borderColor: lineColor,
      backgroundColor: backgroundColor,
      pointBackgroundColor: lineColor,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      tension: lineTension,
      fill: enableFill
    }]
  }), [labels, sortedSelectedValues, filteredDataForSelectedPeriods, getTicketPeriod, lineColor, backgroundColor, lineTension, enableFill]);

  // Texte descriptif de la période sélectionnée
  const periodeLabelText = useMemo(() => {
    if (sortedSelectedValues.length === 0) return "Aucune période sélectionnée";
    
    if (viewMode === "week") {
      return `Semaine(s) : ${sortedSelectedValues.join(", ")}`;
    } else if (viewMode === "month") {
      return `Mois : ${sortedSelectedValues.map(m => monthNames[m - 1] || m).join(", ")}`;
    } else if (viewMode === "quarter") {
      return `Trimestre(s) : ${sortedSelectedValues.map(q => quarterNames[q - 1] || q).join(", ")}`;
    } else if (viewMode === "semester") {
      return `Semestre(s) : ${sortedSelectedValues.map(s => semesterNames[s - 1] || s).join(", ")}`;
    }
    
    return "Période inconnue";
  }, [sortedSelectedValues, viewMode]);

  // Options du graphique optimisées pour line chart
  const chartOptions = useMemo(() => {
    const centerScale = sortedSelectedValues.length === 1;
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500,
        easing: "easeOutQuart"
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: lineColor,
          borderWidth: 1,
          cornerRadius: 6,
          displayColors: false,
        },
        // 3. AJOUT : Configurer le plugin pour afficher les valeurs
        datalabels: {
          display: true,       // Activer l'affichage des étiquettes
          anchor: 'end',       // Positionner l'ancre en haut du point
          align: 'top',        // Aligner le texte au-dessus de l'ancre
          offset: 8,           // Ajouter un petit décalage pour ne pas toucher le point
          color: '#333',      // Couleur du texte pour une bonne lisibilité
          font: {
            weight: 'bold',
            size: 12,
          },
          // Optionnel: ajouter un fond pour une meilleure visibilité sur les lignes
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderRadius: 4,
          padding: 4,
        }
      },
      scales: {
        x: {
          ticks: { 
            color: "black",
            maxRotation: sortedSelectedValues.length > 8 ? 45 : 0,
            font: {
              size: sortedSelectedValues.length > 12 ? 10 : 12
            }
          },
          title: {
            display: true,
            text: viewMode === "week" ? "Semaines" : viewMode === "month" ? "Mois" : viewMode === 'quarter' ? 'Trimestres' : 'Semestres',
            color: "black"
          },
          grid: { display: false },
          min: centerScale ? -0.5 : undefined,
          max: centerScale ? 0.5 : undefined,
        },
        y: {
          beginAtZero: true,
          ticks: { 
            color: "black",
            precision: 0
          },
          title: {
            display: true,
            text: yAxisLabel,
            color: "black"
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)"
          },
          // Augmenter la marge en haut pour laisser de la place aux étiquettes
          grace: '20%' 
        },
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      elements: {
        point: {
          hoverBackgroundColor: "#1d4ed8",
          hoverBorderColor: "#ffffff",
          hoverBorderWidth: 3,
        }
      }
    };
  }, [sortedSelectedValues, lineColor, yAxisLabel, viewMode]);

  if (loading) {
    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-[450px] flex justify-center items-center">
          <p className="text-center text-gray-500">Chargement des données...</p>
        </div>
      </div>
    );
  }

  // Périodes disponibles pour l'affichage dans le filtre
  const availablePeriodsForFilter = getAvailablePeriodsForYear(selectedYear, viewMode);
  const allPeriodsForFilterSelected = availablePeriodsForFilter.length > 0 && availablePeriodsForFilter.every((p) => selectedValues.includes(p));

  // Vérifier s'il y a des données à afficher
  const hasDataToDisplay = chartData.datasets[0].data.some(value => value > 0);

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <h3 className="no-export text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500">
              {selectedYear && `Année : ${selectedYear} - `}{periodeLabelText}
            </p>
          </div>
          <div className="flex gap-2 no-export">
            {/* Bouton Filtre */}
            <button
              className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
              onClick={() => setIsOpen(!isOpen)}
              data-filter-toggle="true"
            >
              <AiOutlineFilter size={20} className="text-gray-600" />
            </button>

            {/* Bouton Commentaires */}
            <CommentButton
              containerRef={chartContainerRef}
              comments={annotations}
              onAddComment={(c) => setAnnotations([...annotations, c])}
              onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))}
              onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))}
            />

            {/* Bouton Agrandir */}
            <button
              className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
              onClick={() => setModalIsOpen(true)}
            >
              <FaExpand size={18} className="text-gray-600" />
            </button>
          </div>
          
          {/* Panneau de filtre */}
          {isOpen && (
            <div ref={filterPanelRef} className="no-export absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
              <h4 className="font-semibold text-gray-500 mb-2">Filtrer par :</h4>
              
              {/* Boutons de sélection du mode de vue */}
              <div className="flex space-x-2 mb-3 flex-wrap">
                <button 
                  className={`px-3 py-1 rounded-md text-sm mb-1 ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`} 
                  onClick={() => handleViewModeChange("week")}
                >
                  Semaine
                </button>
                <button 
                  className={`px-3 py-1 rounded-md text-sm mb-1 ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`} 
                  onClick={() => handleViewModeChange("month")}
                >
                  Mois
                </button>
                <button 
                  className={`px-3 py-1 rounded-md text-sm mb-1 ${viewMode === "quarter" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`} 
                  onClick={() => handleViewModeChange("quarter")}
                >
                  Trimestre
                </button>
                <button 
                  className={`px-3 py-1 rounded-md text-sm mb-1 ${viewMode === "semester" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`} 
                  onClick={() => handleViewModeChange("semester")}
                >
                  Semestre
                </button>
              </div>
              
              {/* Sélection Année */}
              {multipleYearsExist && (
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-gray-500 mb-1">Années :</h5>
                  <div className="flex flex-wrap gap-1">
                    {availableYears.map((year) => (
                      <button 
                        key={year} 
                        onClick={() => handleYearChange(year)} 
                        className={`px-2 py-1 text-xs rounded-md ${selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Bouton Tout Sélectionner */}
              <div className="mb-2">
                <button 
                  onClick={toggleSelectAll} 
                  className={`text-xs px-2 py-1 rounded-md w-full ${allPeriodsForFilterSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
                >
                  {allPeriodsForFilterSelected ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
              
              {/* Liste des périodes */}
              <div className="max-h-32 overflow-y-auto border p-2 rounded-md text-sm">
                {availablePeriodsForFilter.length > 0 ? availablePeriodsForFilter.map((value) => (
                  <div key={value} className="flex items-center space-x-2 my-1">
                    <input
                      type="checkbox"
                      id={`period-${value}-${viewMode}`}
                      checked={selectedValues.includes(value)}
                      onChange={() => handleSelectionChange(value)}
                      className="cursor-pointer" 
                    />
                    <label htmlFor={`period-${value}-${viewMode}`} className="text-gray-600 cursor-pointer select-none">
                      {viewMode === "week" ? `S${value}` : 
                       viewMode === "month" ? monthNames[value - 1] || `Mois ${value}` : 
                       viewMode === "quarter" ? quarterNames[value - 1] || `Trim. ${value}` : 
                       viewMode === "semester" ? semesterNames[value - 1] || `Sem. ${value}` : 
                       value}
                    </label>
                  </div>
                )) : (
                  <p className="text-xs text-gray-400 text-center italic py-2">Aucune période disponible pour {selectedYear}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Conteneur Graphique Principal */}
        <div className="flex-grow flex justify-center items-center w-full min-h-[300px] h-[350px]" ref={chartContainerRef}>
          {hasDataToDisplay ? (
            <Line
              data={chartData}
              options={chartOptions}
            />
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
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
          {/* Header du Modal */}
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div>
              <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedYear && `Année : ${selectedYear} - `}{periodeLabelText}
              </p>
            </div>
            <button 
              onClick={() => setModalIsOpen(false)} 
              className="text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-red-100 transition-colors"
            >
              ❌
            </button>
          </div>
          
          {/* Conteneur Graphique Modal */}
          <div className="relative flex-grow min-h-[400px] flex items-center justify-center" ref={modalChartContainerRef}>
            {hasDataToDisplay ? (
              <Line
                data={chartData}
                options={{ ...chartOptions, maintainAspectRatio: false }}
              />
            ) : (
              <p className="text-gray-500 italic">Aucune donnée à afficher.</p>
            )}
            
            {/* CommentButton caché pour le modal */}
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