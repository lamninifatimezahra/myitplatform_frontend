"use client";

import { useState, useEffect, useRef, useCallback } from "react"; // Added useCallback
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand } from "react-icons/fa";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useGlobalFilter } from "./GlobalFilterContext";
import Modal from "react-modal";
// ---- NOUVEAU ----
import CommentButton from "./CommentButton"; // Assurez-vous que le chemin est correct

// Configurer le Modal pour l'accessibilité
if (typeof window !== "undefined") Modal.setAppElement(document.body);

// --- Fonctions Utilitaires pour Périodes ---
const getWeekNumber = (date) => {
  if (!date || isNaN(date.getTime())) return null; // Handle invalid dates
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
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

function getAllWeeksBetween(startDate, endDate) {
    if (!startDate || !endDate) return [];
    const weeksArray = [];
    const startWeek = getWeekNumber(startDate);
    const endWeek = getWeekNumber(endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    if (startYear === endYear) {
      if (startWeek === null || endWeek === null) return []; // Handle invalid week numbers
      for (let week = startWeek; week <= endWeek; week++) weeksArray.push(week);
    } else {
      for (let year = startYear; year <= endYear; year++) {
        // Need accurate calculation for weeks in year or use a library
        const yearStartDate = new Date(Date.UTC(year, 0, 1));
        const yearEndDate = new Date(Date.UTC(year, 11, 31));
        const firstWeek = getWeekNumber(yearStartDate);
        const lastWeek = getWeekNumber(yearEndDate) || 52; // Estimate last week

        const minWeeks = year === startYear ? (startWeek ?? 1) : 1;
        const maxWeeks = year === endYear ? (endWeek ?? lastWeek) : lastWeek;

        for (let week = minWeeks; week <= maxWeeks; week++) weeksArray.push(week);
      }
    }
    // Remove duplicates that might occur at year boundaries if logic isn't perfect
    return [...new Set(weeksArray)].sort((a, b) => a - b);
  }

function getAllMonthsBetween(startDate, endDate) {
    if (!startDate || !endDate) return [];
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
    if (!startDate || !endDate) return [];
    const quartersArray = [];
    const startQuarter = getQuarter(startDate);
    const endQuarter = getQuarter(endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
     if (startQuarter === null || endQuarter === null) return []; // Handle invalid dates
    if (startYear === endYear) {
      for (let quarter = startQuarter; quarter <= endQuarter; quarter++) quartersArray.push(quarter);
    } else {
      for (let year = startYear; year <= endYear; year++) {
        const maxQuarter = year === endYear ? endQuarter : 4;
        const minQuarter = year === startYear ? startQuarter : 1;
        for (let quarter = minQuarter; quarter <= maxQuarter; quarter++) quartersArray.push(quarter);
      }
    }
     // Remove duplicates for multi-year, although less likely for quarters/semesters
    return [...new Set(quartersArray)].sort((a,b) => a-b);
  }

function getAllSemestersBetween(startDate, endDate) {
    if (!startDate || !endDate) return [];
    const semestersArray = [];
    const startSemester = getSemester(startDate);
    const endSemester = getSemester(endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
     if (startSemester === null || endSemester === null) return []; // Handle invalid dates
    if (startYear === endYear) {
      for (let semester = startSemester; semester <= endSemester; semester++) semestersArray.push(semester);
    } else {
      for (let year = startYear; year <= endYear; year++) {
        const maxSemester = year === endYear ? endSemester : 2;
        const minSemester = year === startYear ? startSemester : 1;
        for (let semester = minSemester; semester <= maxSemester; semester++) semestersArray.push(semester);
      }
    }
     return [...new Set(semestersArray)].sort((a,b) => a-b);
  }
// --- Fin Fonctions Utilitaires ---


ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function TranticiteCriticité({
  apiUrl,
  // Props de personnalisation
  id = "Transité / Criticité",
  title = "Transité / Criticité",
  dateUpdateField = "date_derniere_maj",
  weekField = "semaine",
  severityField = "severite", // Champ pour la criticité
  defaultViewMode = "week",
  defaultNumPeriods = 5, // Utiliser une prop cohérente
  availableSeverities = ["Mineur", "Majeur", "Critique", "Information"]
}) {
  if (!apiUrl) { /* ... gestion erreur API URL ... */
      return ( <div className="visualisation relative" data-id={id}><div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full"><h3 className="text-lg font-semibold text-black">{title}</h3><p className="text-red-500 text-sm mt-2">Erreur : L'URL de l'API est requise.</p></div></div> );
  }

  // Références
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);
  const prevViewMode = useRef(defaultViewMode);
  const filterPanelRef = useRef(null);
  // ---- NOUVEAU : Références pour commentaires ----
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);

  // États locaux
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [selectedValues, setSelectedValues] = useState([]);
  // const [selectedSeverities, setSelectedSeverities] = useState(availableSeverities); // Gardé si besoin futur de filtrer les sévérités
  const [isOpen, setIsOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
  // ---- NOUVEAU : État pour commentaires ----
  const [annotations, setAnnotations] = useState([]);

  // États pour mémoriser les sélections
  const [weekViewSelection, setWeekViewSelection] = useState({ values: [], year: null });
  const [monthViewSelection, setMonthViewSelection] = useState({ values: [], year: null });
  // ---- NOUVEAU : États pour Quarter/Semester ----
  const [quarterViewSelection, setQuarterViewSelection] = useState({ values: [], year: null });
  const [semesterViewSelection, setSemesterViewSelection] = useState({ values: [], year: null });

  // États pour gérer la priorisation
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);
  // ---- NOUVEAU : États priorisation Quarter/Semester ----
  const [quarterSelectionModifiedAt, setQuarterSelectionModifiedAt] = useState(0);
  const [semesterSelectionModifiedAt, setSemesterSelectionModifiedAt] = useState(0);

  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // ---- Noms des périodes pour affichage ----
  const monthNames = [ "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre" ];
  const quarterNames = ["T1", "T2", "T3", "T4"];
  const semesterNames = ["S1", "S2"];

  // --- Fonction pour obtenir les périodes disponibles ---
  // Définie ici pour être accessible par les useEffects et les handlers
  const getAvailablePeriodsForYear = useCallback((year, mode) => {
    if (!year || !data || data.length === 0) return [];
    const filteredByYear = data.filter((t) => {
      const d = new Date(t[dateUpdateField]);
      return !isNaN(d.getTime()) && d.getFullYear() === year;
    });
    if (filteredByYear.length === 0) return [];
    let periodsSet;
    try {
      if (mode === "week") periodsSet = new Set(filteredByYear.map(t => { const w = t[weekField]; const d = new Date(t[dateUpdateField]); return !isNaN(Number(w)) ? Number(w) : (!isNaN(d.getTime()) ? getWeekNumber(d) : null); }).filter(w => w !== null && !isNaN(w)));
      else if (mode === "month") periodsSet = new Set(filteredByYear.map(t => { const d = new Date(t[dateUpdateField]); return !isNaN(d.getTime()) ? d.getMonth() + 1 : null; }).filter(m => m !== null));
      else if (mode === "quarter") periodsSet = new Set(filteredByYear.map(t => getQuarter(new Date(t[dateUpdateField]))).filter(q => q !== null));
      else if (mode === "semester") periodsSet = new Set(filteredByYear.map(t => getSemester(new Date(t[dateUpdateField]))).filter(s => s !== null));
      else return [];
    } catch (e) { console.error("Erreur calcul périodes:", e); return []; }
    return periodsSet ? Array.from(periodsSet).sort((a, b) => a - b) : [];
  }, [data, dateUpdateField, weekField]); // Dépend de data et des props de champ


  // --- Fonction pour appliquer le filtre global ---
   const applyGlobalFilter = useCallback(() => {
    if (!globalStartDate || !globalEndDate || !data || data.length === 0) return;
    const currentGlobalYear = globalStartDate.getFullYear();
    const localAvailableYears = availableYears.length > 0 ? availableYears : [...new Set(data.map(t => new Date(t[dateUpdateField]).getFullYear()))];

    if (!localAvailableYears.includes(currentGlobalYear)) {
      console.warn(`Année ${currentGlobalYear} du filtre global non trouvée.`);
      setHasGlobalFilter(false); return;
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

    // Le retraitement des données sera déclenché par le changement de selectedYear/selectedValues via l'autre useEffect
  }, [globalStartDate, globalEndDate, data, viewMode, availableYears, getAvailablePeriodsForYear]); // viewMode et data sont importants ici


  // --- UseEffects ---

  // Clics extérieurs
  useEffect(() => { /* ... inchangé ... */
      function handleClickOutside(event) { if (isOpen && filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest('button[data-filter-toggle]')) setIsOpen(false); }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Chargement initial
  useEffect(() => {
    let isMounted = true;
    async function fetchDataInternal() {
      if (!isMounted) return;
      setLoading(true);
      globalFilterApplied.current = false;
      try {
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        if (isMounted) {
          setData(result); // Mettre à jour data d'abord

          const years = [...new Set(result.map(t => { const d = new Date(t[dateUpdateField]); return !isNaN(d.getTime()) ? d.getFullYear() : null; }).filter(y => y !== null))].sort();
          const latestYear = years.length > 0 ? years[years.length - 1] : new Date().getFullYear();
          setAvailableYears(years); // Mettre à jour les années disponibles
          setMultipleYearsExist(years.length > 1);

          let yearToUse = selectedYear || latestYear;
          let applyGlobalOnLoad = false;
          let performDefaultSetup = !initializationCompleted.current;

          // Décider s'il faut appliquer le filtre global ou la config par défaut
          if (performDefaultSetup && globalStartDate && globalEndDate && years.includes(globalStartDate.getFullYear())) {
             const lastLocalMod = Math.max(weekSelectionModifiedAt, monthSelectionModifiedAt, quarterSelectionModifiedAt, semesterSelectionModifiedAt);
             if (globalModifiedAt > lastLocalMod || lastLocalMod === 0) {
                 applyGlobalOnLoad = true; yearToUse = globalStartDate.getFullYear(); performDefaultSetup = false;
             }
          }

          if (applyGlobalOnLoad) {
             // Note: applyGlobalFilter dépend maintenant de 'data' et 'availableYears' qui sont définis
             applyGlobalFilter();
          } else if (performDefaultSetup) {
             if (!selectedYear) setSelectedYear(yearToUse); else yearToUse = selectedYear;

             // Note: getAvailablePeriodsForYear dépend maintenant de 'data'
             const availablePeriods = getAvailablePeriodsForYear(yearToUse, viewMode);
             const lastPeriods = availablePeriods.slice(-defaultNumPeriods);
             setSelectedValues(lastPeriods);

             // Mise à jour de la sélection mémorisée
             if (viewMode === "week") setWeekViewSelection({ values: lastPeriods, year: yearToUse });
             else if (viewMode === "month") setMonthViewSelection({ values: lastPeriods, year: yearToUse });
             else if (viewMode === "quarter") setQuarterViewSelection({ values: lastPeriods, year: yearToUse });
             else if (viewMode === "semester") setSemesterViewSelection({ values: lastPeriods, year: yearToUse });

             initializationCompleted.current = true;
          }
          setLoading(false);
        }
      } catch (error) { /* ... gestion erreur ... */
          console.error("Erreur fetch:", error);
          if (isMounted) { setData([]); setLoading(false); }
      }
    }
    fetchDataInternal();
    return () => { isMounted = false; };
  }, [apiUrl, dateUpdateField, weekField, defaultNumPeriods]); // Retiré viewMode, global* car gérés par d'autres effets

  // Application du filtre global si changé après l'init
   useEffect(() => {
    let isMounted = true;
    if (initializationCompleted.current && data.length > 0 && globalStartDate && globalEndDate && globalModifiedAt > 0) {
        const lastLocalMod = Math.max(weekSelectionModifiedAt, monthSelectionModifiedAt, quarterSelectionModifiedAt, semesterSelectionModifiedAt);
        if (globalModifiedAt > lastLocalMod) {
            if (isMounted) applyGlobalFilter();
        }
    }
    return () => { isMounted = false; };
  }, [globalStartDate, globalEndDate, globalModifiedAt, data, applyGlobalFilter]); // applyGlobalFilter ajouté aux dépendances

  // Sauvegarde/restauration lors du changement de vue
   useEffect(() => {
    if (!initializationCompleted.current || !selectedYear) { prevViewMode.current = viewMode; return; }
    const previousMode = prevViewMode.current;
    // Sauvegarde
    if (previousMode) {
      if (previousMode === "week") setWeekViewSelection({ values: selectedValues, year: selectedYear });
      else if (previousMode === "month") setMonthViewSelection({ values: selectedValues, year: selectedYear });
      else if (previousMode === "quarter") setQuarterViewSelection({ values: selectedValues, year: selectedYear });
      else if (previousMode === "semester") setSemesterViewSelection({ values: selectedValues, year: selectedYear });
    }
    // Restauration
    let selectionToRestore = { values: [], year: selectedYear };
    if (viewMode === "week") selectionToRestore = weekViewSelection;
    else if (viewMode === "month") selectionToRestore = monthViewSelection;
    else if (viewMode === "quarter") selectionToRestore = quarterViewSelection;
    else if (viewMode === "semester") selectionToRestore = semesterViewSelection;

    const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode);
    let valuesToSet;
    if (selectionToRestore.year === selectedYear && selectionToRestore.values.length > 0) {
        const validValues = selectionToRestore.values.filter(v => availablePeriods.includes(v));
        valuesToSet = validValues.length > 0 ? validValues : availablePeriods.slice(-defaultNumPeriods);
    } else {
        valuesToSet = availablePeriods.slice(-defaultNumPeriods);
    }
    setSelectedValues(valuesToSet);
    prevViewMode.current = viewMode;
   }, [viewMode, selectedYear, getAvailablePeriodsForYear, defaultNumPeriods]); // getAvailablePeriodsForYear ajouté aux dépendances


  // --- Fonctions de gestion des filtres ---

  const handleSelectionChange = (value) => {
    const newSelectedValues = selectedValues.includes(value) ? selectedValues.filter(v => v !== value) : [...selectedValues, value];
    setSelectedValues(newSelectedValues);
    const now = Date.now();
    if (viewMode === "week") { setWeekViewSelection({ values: newSelectedValues, year: selectedYear }); setWeekSelectionModifiedAt(now); }
    else if (viewMode === "month") { setMonthViewSelection({ values: newSelectedValues, year: selectedYear }); setMonthSelectionModifiedAt(now); }
    // ---- NOUVEAU ----
    else if (viewMode === "quarter") { setQuarterViewSelection({ values: newSelectedValues, year: selectedYear }); setQuarterSelectionModifiedAt(now); }
    else if (viewMode === "semester") { setSemesterViewSelection({ values: newSelectedValues, year: selectedYear }); setSemesterSelectionModifiedAt(now); }
    setHasGlobalFilter(false);
  };

  const toggleSelectAll = () => {
    const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode);
    const allSelected = availablePeriods.length > 0 && availablePeriods.every(p => selectedValues.includes(p));
    const newSelectedValues = allSelected ? [] : [...availablePeriods];
    setSelectedValues(newSelectedValues);
    const now = Date.now();
     if (viewMode === "week") { setWeekViewSelection({ values: newSelectedValues, year: selectedYear }); setWeekSelectionModifiedAt(now); }
    else if (viewMode === "month") { setMonthViewSelection({ values: newSelectedValues, year: selectedYear }); setMonthSelectionModifiedAt(now); }
    // ---- NOUVEAU ----
    else if (viewMode === "quarter") { setQuarterViewSelection({ values: newSelectedValues, year: selectedYear }); setQuarterSelectionModifiedAt(now); }
    else if (viewMode === "semester") { setSemesterViewSelection({ values: newSelectedValues, year: selectedYear }); setSemesterSelectionModifiedAt(now); }
    setHasGlobalFilter(false);
  };

  const handleYearChange = (year) => {
    if (year === selectedYear) return;
    setSelectedYear(year);
    const newAvailablePeriods = getAvailablePeriodsForYear(year, viewMode);
    let newSelectedValues = [];

    // Gérer le filtre global ou la restauration de sélection
    if (hasGlobalFilter && globalStartDate && globalEndDate && globalStartDate.getFullYear() === year) {
        let globalPeriods = [];
        if (viewMode === "week") globalPeriods = getAllWeeksBetween(globalStartDate, globalEndDate);
        else if (viewMode === "month") globalPeriods = getAllMonthsBetween(globalStartDate, globalEndDate);
        // ---- NOUVEAU ----
        else if (viewMode === "quarter") globalPeriods = getAllQuartersBetween(globalStartDate, globalEndDate);
        else if (viewMode === "semester") globalPeriods = getAllSemestersBetween(globalStartDate, globalEndDate);
        newSelectedValues = globalPeriods.filter(p => newAvailablePeriods.includes(p));
    } else {
        let selectionToRestore = { values: [], year: null };
        if (viewMode === "week") selectionToRestore = weekViewSelection;
        else if (viewMode === "month") selectionToRestore = monthViewSelection;
        // ---- NOUVEAU ----
        else if (viewMode === "quarter") selectionToRestore = quarterViewSelection;
        else if (viewMode === "semester") selectionToRestore = semesterViewSelection;

        if (selectionToRestore.year === year && selectionToRestore.values.length > 0) {
             const validValues = selectionToRestore.values.filter(v => newAvailablePeriods.includes(v));
             newSelectedValues = validValues.length > 0 ? validValues : newAvailablePeriods.slice(-defaultNumPeriods);
        } else {
            newSelectedValues = newAvailablePeriods.slice(-defaultNumPeriods);
        }
        setHasGlobalFilter(false);
    }

    setSelectedValues(newSelectedValues);
    // Mettre à jour la sélection mémorisée
     if (viewMode === "week") setWeekViewSelection({ values: newSelectedValues, year: year });
    else if (viewMode === "month") setMonthViewSelection({ values: newSelectedValues, year: year });
    // ---- NOUVEAU ----
    else if (viewMode === "quarter") setQuarterViewSelection({ values: newSelectedValues, year: year });
    else if (viewMode === "semester") setSemesterViewSelection({ values: newSelectedValues, year: year });
  };

  const handleViewModeChange = (newMode) => {
    if (newMode !== viewMode) setViewMode(newMode);
  };

  // --- Préparation des données pour le graphique ---
  const selectedValuesWithYear = selectedValues.map(value => ({ value, year: selectedYear }));

  // Fonction pour obtenir la période d'un ticket selon le viewMode
  const getTicketPeriod = useCallback((ticket) => {
    const ticketDate = new Date(ticket[dateUpdateField]);
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
  }, [viewMode, dateUpdateField, weekField]);


  const labels = selectedValuesWithYear.map(item => {
    let periodLabel = String(item.value);
    try {
      if (viewMode === "week") periodLabel = `S${item.value}`;
      else if (viewMode === "month") periodLabel = monthNames[item.value - 1] || `Mois ${item.value}`;
      else if (viewMode === "quarter") periodLabel = quarterNames[item.value - 1] || `Trim. ${item.value}`;
      else if (viewMode === "semester") periodLabel = semesterNames[item.value - 1] || `Sem. ${item.value}`;
    } catch (e) { console.error("Label error", e); }
    return multipleYearsExist ? `${periodLabel}, ${item.year}` : periodLabel;
  });

  // Calcul des données pour chaque sévérité et pour le total
  const severityData = {};
  const totalData = {};

  selectedValuesWithYear.forEach((item, index) => {
    const label = labels[index]; // Utiliser le label généré comme clé
    totalData[label] = 0;
    availableSeverities.forEach(sev => {
      if (!severityData[sev]) severityData[sev] = {};
      severityData[sev][label] = 0;
    });

    data.forEach(ticket => {
      const ticketDate = new Date(ticket[dateUpdateField]);
      if (isNaN(ticketDate.getTime())) return; // Ignorer date invalide
      const ticketYear = ticketDate.getFullYear();
      const ticketPeriod = getTicketPeriod(ticket); // Utiliser la fonction helper
      const ticketSeverity = ticket[severityField];

      // Vérifier si le ticket correspond à la période/année et a une sévérité valide
      if (ticketYear === item.year && ticketPeriod === item.value && ticketSeverity && availableSeverities.includes(ticketSeverity)) {
          severityData[ticketSeverity][label]++;
          totalData[label]++;
      }
    });
  });


  const datasets = [
    ...availableSeverities.map(severity => ({
      label: severity,
      // Utiliser les données pré-calculées par label
      data: labels.map(label => severityData[severity]?.[label] || 0),
      backgroundColor: getColorForSeverity(severity),
      stack: "stack1", // Empiler par sévérité
      borderRadius: 5, // Ajusté pour un look plus doux
      datalabels: {
        display: true, // Afficher la valeur dans la barre
        color: "black", // Mettre en blanc pour contraste
        anchor: "center",
        align: "center",
        formatter: value => (value > 0 ? value : ""), // Afficher seulement si > 0
        textStrokeColor: 'black', // Contour pour lisibilité
        textStrokeWidth: 0.5
      }
    })),
    // Dataset "invisible" pour afficher le total en haut
    {
      label: "Total", // Ce label n'apparaîtra pas si legend.display=false pour ce dataset
      // Utiliser les données totales pré-calculées par label
      data: labels.map(label => totalData[label] || 0),
      type: "bar", // Type bar mais rendu invisible
      backgroundColor: "transparent",
      borderColor: "transparent",
      borderWidth: 0,
      stack: "stackTotal", // Mettre sur une pile différente pour ne pas affecter l'échelle Y stackée
      datalabels: {
        display: true,
        anchor: "end",
        align: "top",
        color: "#333", // Couleur sombre pour le total
        font: { weight: "bold", size: 12 }, // Taille un peu plus grande
        offset: 0, // Ajuster si nécessaire
        padding: { top: 2 }, // Espace au-dessus de la barre
        formatter: value => (value > 0 ? value : ""), // Afficher seulement si > 0
      }
    }
  ];

  // Fonction pour obtenir la couleur (peut être externe si utilisée ailleurs)
  function getColorForSeverity(severity) {
    switch (severity) {
      case "Mineur": return "#b8e0f0";
      case "Majeur": return "#c9b8f0";
      case "Critique": return "#8A4FFF";
      case "Information": return "#60b2f0";
      default: return "#bdc3c7";
    }
  }

  // Texte descriptif de la période sélectionnée
  const periodeLabelText = selectedValues.length > 0
    ? viewMode === "week"
      ? `Semaine(s) : ${selectedValues.join(", ")}`
      : viewMode === "month"
        ? `Mois : ${selectedValues.map(m => monthNames[m - 1] || m).join(", ")}`
        : viewMode === "quarter"
          ? `Trimestre(s) : ${selectedValues.map(q => quarterNames[q - 1] || q).join(", ")}`
          : `Semestre(s) : ${selectedValues.map(s => semesterNames[s - 1] || s).join(", ")}`
    : "Aucune période sélectionnée";

  // Options du graphique
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
          display: true,
          position: 'bottom', // Légende en bas
          labels: { padding: 15 }
      },
      // Désactiver les datalabels globaux, car ils sont configurés par dataset
      datalabels: { display: false },
      tooltip: {
        mode: 'index', // Afficher toutes les tooltips pour l'index survolé
        intersect: false,
        callbacks: {
           // On pourrait ajouter un footer de total ici aussi si le label du dataset 'Total' n'est pas suffisant
        }
      }
    },
    scales: {
      x: {
          stacked: true, // Important pour l'axe X aussi si les barres sont empilées
          title: { display: true, text: 'Période' }
       },
      y: {
          stacked: true, // Empiler sur l'axe Y
          beginAtZero: true,
          title: { display: true, text: 'Nombre de Tickets' },
          grace: '5%'
      },
    },
    animation: { duration: 500 },
  };

  // --- Rendu JSX ---
  if (loading) { /* ... état de chargement ... */
       return ( <div className="visualisation relative" data-id={id}><div className="relative bg-white p-5 shadow-md rounded-lg w-full h-[450px] flex justify-center items-center"><p className="text-center text-gray-500">Chargement des données...</p></div></div> );
  }

  const availablePeriodsForFilter = getAvailablePeriodsForYear(selectedYear, viewMode);
  const allPeriodsForFilterSelected = availablePeriodsForFilter.length > 0 && availablePeriodsForFilter.every((p) => selectedValues.includes(p));

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500">
              {selectedYear && `Année : ${selectedYear} - `}{periodeLabelText}
            </p>
          </div>
          <div className="flex gap-2">
             {/* Bouton Filtre */}
            <button className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" onClick={() => setIsOpen(!isOpen)} data-filter-toggle="true">
              <AiOutlineFilter size={20} className="text-gray-600" />
            </button>
             {/* ---- NOUVEAU : Bouton Commentaires ---- */}
            <CommentButton
              containerRef={chartContainerRef} comments={annotations}
              onAddComment={(c) => setAnnotations([...annotations, c])}
              onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))}
              onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))}
            />
             {/* Bouton Agrandir */}
            <button className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" onClick={() => setModalIsOpen(true)}>
              <FaExpand size={18} className="text-gray-600" />
            </button>
          </div>
          {/* Panneau de filtre */}
          {isOpen && (
            <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
              <h4 className="font-semibold text-gray-500 mb-2">Filtrer par :</h4>
              {/* ---- MODIFIÉ : Ajout Trimestre/Semestre ---- */}
              <div className="flex space-x-2 mb-3 flex-wrap">
                <button className={`px-3 py-1 rounded-md text-sm mb-1 ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`} onClick={() => handleViewModeChange("week")}>Semaine</button>
                <button className={`px-3 py-1 rounded-md text-sm mb-1 ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`} onClick={() => handleViewModeChange("month")}>Mois</button>
                <button className={`px-3 py-1 rounded-md text-sm mb-1 ${viewMode === "quarter" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`} onClick={() => handleViewModeChange("quarter")}>Trimestre</button>
                <button className={`px-3 py-1 rounded-md text-sm mb-1 ${viewMode === "semester" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`} onClick={() => handleViewModeChange("semester")}>Semestre</button>
              </div>
              {multipleYearsExist && (
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-gray-500 mb-1">Années :</h5>
                  <div className="flex flex-wrap gap-1">
                    {availableYears.map((year) => ( <button key={year} onClick={() => handleYearChange(year)} className={`px-2 py-1 text-xs rounded-md ${selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>{year}</button> ))}
                  </div>
                </div>
              )}
              <div className="mb-2">
                <button onClick={toggleSelectAll} className={`text-xs px-2 py-1 rounded-md w-full ${allPeriodsForFilterSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}>
                  {allPeriodsForFilterSelected ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
              {/* ---- MODIFIÉ : Affichage dynamique des périodes ---- */}
              <div className="max-h-32 overflow-y-auto border p-2 rounded-md text-sm">
                {availablePeriodsForFilter.length > 0 ? availablePeriodsForFilter.map((value) => (
                  <div key={value} className="flex items-center space-x-2 my-1">
                    <input type="checkbox" id={`period-${value}-${viewMode}`} checked={selectedValues.includes(value)} onChange={() => handleSelectionChange(value)} className="cursor-pointer" />
                    <label htmlFor={`period-${value}-${viewMode}`} className="text-gray-600 cursor-pointer select-none">
                      {viewMode === "week" ? `S${value}` : viewMode === "month" ? monthNames[value - 1] || `Mois ${value}` : viewMode === "quarter" ? quarterNames[value - 1] || `Trim. ${value}` : viewMode === "semester" ? semesterNames[value - 1] || `Sem. ${value}` : value}
                    </label>
                  </div>
                )) : (
                  <p className="text-xs text-gray-400 text-center italic py-2">Aucune période disponible</p>
                )}
              </div>
              {/* Optionnel: Ajouter ici un filtre par sévérité si nécessaire */}
            </div>
          )}
        </div>

        {/* Conteneur Graphique Principal */}
        {/* ---- MODIFIÉ : Ajout ref ---- */}
        <div className="flex-grow flex justify-center items-center h-[350px]" ref={chartContainerRef}>
          {datasets.length > 1 && datasets[0].data.some(d => d > 0) ? ( // Vérifier s'il y a des données de sévérité > 0
            <Bar data={{ labels, datasets }} options={chartOptions} plugins={[ChartDataLabels]} />
          ) : (
            <p className="text-gray-500 italic">Aucune donnée à afficher pour la sélection actuelle.</p>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50" overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm" contentLabel={`Modal ${title}`}>
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div>
              <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedYear && `Année : ${selectedYear} - `}{periodeLabelText}</p>
            </div>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-red-100 transition-colors">❌</button>
          </div>
          {/* ---- MODIFIÉ : Ajout ref et bouton commentaire caché ---- */}
          <div className="relative flex-grow min-h-[400px] flex items-center justify-center" ref={modalChartContainerRef}>
            {datasets.length > 1 && datasets[0].data.some(d => d > 0) ? (
              <Bar data={{ labels, datasets }} options={{...chartOptions, maintainAspectRatio: false}} plugins={[ChartDataLabels]} />
            ) : (
              <p className="text-gray-500 italic">Aucune donnée à afficher.</p>
            )}
            <CommentButton
              containerRef={modalChartContainerRef} hideButton={true} comments={annotations}
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