"use client";

import { useState, useEffect, useRef } from "react";
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
import CommentButton from "./CommentButton"; 

// Configurer le Modal pour l'accessibilité
if (typeof window !== "undefined") Modal.setAppElement(document.body);

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

// Fonction pour obtenir le numéro de semaine ISO (déjà présente)
const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

// Fonction pour obtenir le trimestre d'une date
const getQuarter = (date) => {
  const month = date.getMonth() + 1;
  return Math.ceil(month / 3);
};

// Fonction pour obtenir le semestre d'une date
const getSemester = (date) => {
  const month = date.getMonth() + 1;
  return month <= 6 ? 1 : 2;
};
const getAvailablePeriodsForYear = (year, mode) => { // Prend le mode en argument
  if (!year || data.length === 0) return [];
  const filteredByYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === year);

  if (mode === "week") {
    return [...new Set(filteredByYear.map((t) => {
          // Gérer le cas où weekField n'est pas un nombre valide
          const weekVal = t[weekField];
          if (!isNaN(Number(weekVal))) {
              return Number(weekVal);
          }
          // Essayer de calculer depuis la date si invalide
          const date = new Date(t[dateUpdateField]);
          if (!isNaN(date.getTime())) {
              return getWeekNumber(date);
          }
          return null; // Ignorer si ni l'un ni l'autre n'est valide
      }))]
      .filter(week => week !== null) // Filtrer les nulls
      .sort((a, b) => a - b);
  } else if (mode === "month") {
    return [...new Set(filteredByYear.map((t) => new Date(t[dateUpdateField]).getMonth() + 1))]
      .sort((a, b) => a - b);
  } else if (mode === "quarter") {
    return [...new Set(filteredByYear.map((t) => getQuarter(new Date(t[dateUpdateField]))))]
      .sort((a, b) => a - b);
  } else if (mode === "semester") {
    return [...new Set(filteredByYear.map((t) => getSemester(new Date(t[dateUpdateField]))))]
      .sort((a, b) => a - b);
  }
  return []; // Retourner un tableau vide par défaut
};

export default function VolumeReentrants({
  apiUrl,
  id = "Volume des Réentrants",
  title = "Volume des Réentrants",
  idField = "id_ticket",
  dateUpdateField = "date_derniere_maj",
  weekField = "semaine",
  iterationColors = {
    2: "#2196f3", 3: "#1b2b6b", 4: "#f36e3b",
    5: "#4caf50", 6: "#9c27b0", 7: "#ff9800", 8: "#009688",
  },
  // ---- MODIFIÉ : Renommé monthLabels en periodLabels et ajouté Quarter/Semester ----
  periodLabels = {
    month: {
      1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril", 5: "Mai", 6: "Juin",
      7: "Juillet", 8: "Août", 9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre"
    },
    quarter: { 1: "T1", 2: "T2", 3: "T3", 4: "T4" },
    semester: { 1: "S1", 2: "S2" }
  },
  defaultViewMode = "week",
  // ---- MODIFIÉ : Renommé showsPerWeek en defaultNumPeriods pour cohérence ----
  defaultNumPeriods = 5,
  enableYearFilter = true,
  enableToggleView = true
}) {
  if (!apiUrl) {
    // ... (gestion de l'erreur API URL inchangée)
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
  const prevViewMode = useRef(null);
  const filterPanelRef = useRef(null);
  // ---- NOUVEAU : Références pour les conteneurs de graphiques ----
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [groupedData, setGroupedData] = useState({});
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
  // ---- NOUVEAU : État pour les commentaires ----
  const [annotations, setAnnotations] = useState([]);

  // États pour mémoriser les sélections pour chaque vue
  const [weekViewSelection, setWeekViewSelection] = useState({ values: [], year: null });
  const [monthViewSelection, setMonthViewSelection] = useState({ values: [], year: null });
  // ---- NOUVEAU : États pour Quarter/Semester ----
  const [quarterViewSelection, setQuarterViewSelection] = useState({ values: [], year: null });
  const [semesterViewSelection, setSemesterViewSelection] = useState({ values: [], year: null });


  // États pour la gestion des années (inchangés)
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  // États pour gérer la priorisation des filtres
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);
  // ---- NOUVEAU : États de priorisation pour Quarter/Semester ----
  const [quarterSelectionModifiedAt, setQuarterSelectionModifiedAt] = useState(0);
  const [semesterSelectionModifiedAt, setSemesterSelectionModifiedAt] = useState(0);


  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Effet pour gérer les clics extérieurs (inchangé)
  useEffect(() => {
    // ... (code inchangé)
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


  // ---- NOUVEAU : Fonctions pour générer Quarter/Semester entre deux dates ----
  // Fonction pour générer toutes les semaines entre deux dates (inchangée)
  function getAllWeeksBetween(startDate, endDate) { /* ... (code inchangé) ... */
    if (!startDate || !endDate) return [];
    const weeksArray = [];
    const startWeek = getWeekNumber(startDate);
    const endWeek = getWeekNumber(endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    if (startYear === endYear) {
      for (let week = startWeek; week <= endWeek; week++) weeksArray.push(week);
    } else {
      for (let year = startYear; year <= endYear; year++) {
        const maxWeeks = year === endYear ? endWeek : 52; // Adjust for year end if needed
        const minWeeks = year === startYear ? startWeek : 1;
        for (let week = minWeeks; week <= maxWeeks; week++) weeksArray.push(week);
      }
    }
    return weeksArray;
  }

  // Fonction pour générer tous les mois entre deux dates (inchangée)
  function getAllMonthsBetween(startDate, endDate) { /* ... (code inchangé) ... */
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
    if (startYear === endYear) {
      for (let quarter = startQuarter; quarter <= endQuarter; quarter++) quartersArray.push(quarter);
    } else {
      for (let year = startYear; year <= endYear; year++) {
        const maxQuarter = year === endYear ? endQuarter : 4;
        const minQuarter = year === startYear ? startQuarter : 1;
        for (let quarter = minQuarter; quarter <= maxQuarter; quarter++) quartersArray.push(quarter);
      }
    }
    return quartersArray;
  }

  function getAllSemestersBetween(startDate, endDate) {
    if (!startDate || !endDate) return [];
    const semestersArray = [];
    const startSemester = getSemester(startDate);
    const endSemester = getSemester(endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    if (startYear === endYear) {
      for (let semester = startSemester; semester <= endSemester; semester++) semestersArray.push(semester);
    } else {
      for (let year = startYear; year <= endYear; year++) {
        const maxSemester = year === endYear ? endSemester : 2;
        const minSemester = year === startYear ? startSemester : 1;
        for (let semester = minSemester; semester <= maxSemester; semester++) semestersArray.push(semester);
      }
    }
    return semestersArray;
  }
  // ---- FIN NOUVEAU ----
  const getAvailablePeriodsForYear = (year, mode) => { // Prend le mode en argument
    if (!year || data.length === 0) return [];
    const filteredByYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === year);

    if (mode === "week") {
      return [...new Set(filteredByYear.map((t) => {
            // Gérer le cas où weekField n'est pas un nombre valide
            const weekVal = t[weekField];
            if (!isNaN(Number(weekVal))) {
                return Number(weekVal);
            }
            // Essayer de calculer depuis la date si invalide
            const date = new Date(t[dateUpdateField]);
            if (!isNaN(date.getTime())) {
                return getWeekNumber(date);
            }
            return null; // Ignorer si ni l'un ni l'autre n'est valide
        }))]
        .filter(week => week !== null) // Filtrer les nulls
        .sort((a, b) => a - b);
    } else if (mode === "month") {
      return [...new Set(filteredByYear.map((t) => new Date(t[dateUpdateField]).getMonth() + 1))]
        .sort((a, b) => a - b);
    } else if (mode === "quarter") {
      return [...new Set(filteredByYear.map((t) => getQuarter(new Date(t[dateUpdateField]))))]
        .sort((a, b) => a - b);
    } else if (mode === "semester") {
      return [...new Set(filteredByYear.map((t) => getSemester(new Date(t[dateUpdateField]))))]
        .sort((a, b) => a - b);
    }
    return []; // Retourner un tableau vide par défaut
  };

  const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode); // Passer le mode


  // ---- MODIFIÉ : Appliquer le filtre global à TOUTES les vues ----
  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate) return;
    const currentGlobalYear = globalStartDate.getFullYear(); // Ou gestion multi-année si besoin

    // Calculer pour toutes les vues
    const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
    setWeekViewSelection({ values: weekList, year: currentGlobalYear });

    const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
    setMonthViewSelection({ values: monthList, year: currentGlobalYear });

    const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate);
    setQuarterViewSelection({ values: quarterList, year: currentGlobalYear });

    const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate);
    setSemesterViewSelection({ values: semesterList, year: currentGlobalYear });

    // Appliquer à la vue actuelle
    if (viewMode === "week") {
      setSelectedValues(weekList);
    } else if (viewMode === "month") {
      setSelectedValues(monthList);
    } else if (viewMode === "quarter") {
      setSelectedValues(quarterList);
    } else if (viewMode === "semester") {
      setSelectedValues(semesterList);
    }
    setSelectedYear(currentGlobalYear); // Assurer que l'année est aussi mise à jour

    setHasGlobalFilter(true);
    // Recalculer les données groupées après application du filtre
    if (data.length > 0) {
         const ticketsForYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === currentGlobalYear);
         // Important: passer le viewMode *actuel* à processReentrantData
         processReentrantData(ticketsForYear, viewMode);
    }
  };

  // ---- MODIFIÉ : Gérer le changement de vue pour TOUTES les vues ----
  useEffect(() => {
    if (!prevViewMode.current) {
      prevViewMode.current = viewMode;
      return;
    }

    // Sauvegarde de l'état précédent
    if (prevViewMode.current === "week") {
      setWeekViewSelection({ values: selectedValues, year: selectedYear });
    } else if (prevViewMode.current === "month") {
      setMonthViewSelection({ values: selectedValues, year: selectedYear });
    } else if (prevViewMode.current === "quarter") {
      setQuarterViewSelection({ values: selectedValues, year: selectedYear });
    } else if (prevViewMode.current === "semester") {
      setSemesterViewSelection({ values: selectedValues, year: selectedYear });
    }

    // Restauration de l'état pour la nouvelle vue (si des données existent)
    let restoredValues = [];
    let restoredYear = selectedYear; // Garder l'année actuelle par défaut

    if (viewMode === "week" && weekViewSelection.values.length > 0) {
      restoredValues = weekViewSelection.values;
      restoredYear = weekViewSelection.year || selectedYear;
    } else if (viewMode === "month" && monthViewSelection.values.length > 0) {
      restoredValues = monthViewSelection.values;
      restoredYear = monthViewSelection.year || selectedYear;
    } else if (viewMode === "quarter" && quarterViewSelection.values.length > 0) {
      restoredValues = quarterViewSelection.values;
      restoredYear = quarterViewSelection.year || selectedYear;
    } else if (viewMode === "semester" && semesterViewSelection.values.length > 0) {
      restoredValues = semesterViewSelection.values;
      restoredYear = semesterViewSelection.year || selectedYear;
    } else {
      // Si aucune sélection n'est mémorisée pour cette vue, on prend les N dernières périodes de l'année
       if (selectedYear && data.length > 0) {
         const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode); // Passer viewMode
         restoredValues = availablePeriods.slice(-defaultNumPeriods);
         // Ne pas changer restoredYear ici, il est déjà = selectedYear
       }
    }

    setSelectedValues(restoredValues);
    // Mettre à jour l'année seulement si elle a été restaurée explicitement
    if (restoredYear !== selectedYear) {
      setSelectedYear(restoredYear);
    }

    // Traiter les données pour la nouvelle vue si nous avons des données et une année sélectionnée
    if (data.length > 0 && restoredYear) {
       const ticketsForYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === restoredYear);
       processReentrantData(ticketsForYear, viewMode);
    }

    prevViewMode.current = viewMode;
  }, [viewMode, data]); // data est ajouté comme dépendance pour recalculer si data change

  // ---- SUPPRIMÉ : updateSelectedValues (logique intégrée dans le fetch useEffect) ----
  // const updateSelectedValues = (tickets, mode) => { ... };

  // ---- MODIFIÉ : Traiter les données pour TOUTES les vues ----
  const processReentrantData = (tickets, mode) => {
    const ticketCounts = {}; // Compte les occurrences par ticket ID
    const result = {}; // Stocke { period: { iteration: Set(ticketId) } }

    tickets.forEach((ticket) => {
      const ticketDate = new Date(ticket[dateUpdateField]);
      let period;

      // Déterminer la période en fonction du mode de vue
      if (mode === "week") {
        period = ticket[weekField]; // Utilise la donnée semaine si disponible
         // Si weekField n'est pas un nombre valide, on pourrait calculer depuis la date
         if (isNaN(Number(period))) {
             period = getWeekNumber(ticketDate);
         } else {
             period = Number(period); // Assurer que c'est un nombre
         }
      } else if (mode === "month") {
        period = ticketDate.getMonth() + 1;
      } else if (mode === "quarter") {
        period = getQuarter(ticketDate);
      } else if (mode === "semester") {
        period = getSemester(ticketDate);
      } else {
        return; // Mode inconnu
      }

      // Ignorer si la période n'est pas valide (e.g., NaN pour semaine)
      if (isNaN(period)) return;

      const ticketId = ticket[idField];
      if (!ticketCounts[ticketId]) ticketCounts[ticketId] = 1;
      else ticketCounts[ticketId] += 1;

      const iteration = ticketCounts[ticketId];
      // On ne compte que les réitérations (à partir de la 2ème occurrence)
      if (iteration >= 2 && iteration <= 8) { // Limite à 8 itérations comme dans l'original
        if (!result[period]) result[period] = {};
        if (!result[period][iteration]) result[period][iteration] = new Set();
        result[period][iteration].add(ticketId); // Stocke l'ID unique pour compter les tickets distincts par itération/période
      }
    });

    // Convertir les Sets en tailles (nombre de tickets uniques)
    const cleaned = {};
    for (const period in result) {
      cleaned[period] = {};
      for (const iteration in result[period]) {
        cleaned[period][iteration] = result[period][iteration].size;
      }
    }
    setGroupedData(cleaned);
  };

  // ---- MODIFIÉ : Fetch initial et sélection par défaut ----
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true); // Mettre loading à true au début
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        setData(result);

        const years = [...new Set(result.map((t) => new Date(t[dateUpdateField]).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        let initialYear = latestYear; // Année par défaut

        // Appliquer le filtre global immédiatement s'il est déjà défini
        if (globalStartDate && globalEndDate && !initializationCompleted.current && !globalFilterApplied.current) {
            applyGlobalFilter(); // Applique le filtre et met à jour selectedYear, selectedValues, etc.
            initialYear = selectedYear; // Utilise l'année du filtre global appliqué
            globalFilterApplied.current = true; // Marquer comme appliqué
        } else {
            // Si pas de filtre global au démarrage, utiliser la dernière année
             setSelectedYear(latestYear);
        }


        // Ne définir les valeurs par défaut que lors de l'initialisation et si pas de filtre global appliqué
        if (!initializationCompleted.current && !globalFilterApplied.current) {
          const ticketsForYear = result.filter((t) => new Date(t[dateUpdateField]).getFullYear() === initialYear);
          const availablePeriods = getAvailablePeriodsForYear(initialYear, viewMode); // Passer le mode actuel
          const lastPeriods = availablePeriods.slice(-defaultNumPeriods);

          setSelectedValues(lastPeriods);

          // Mettre à jour la sélection mémorisée pour la vue par défaut
          if (viewMode === "week") {
            setWeekViewSelection({ values: lastPeriods, year: initialYear });
          } else if (viewMode === "month") {
            setMonthViewSelection({ values: lastPeriods, year: initialYear });
          } else if (viewMode === "quarter") {
            setQuarterViewSelection({ values: lastPeriods, year: initialYear });
          } else if (viewMode === "semester") {
            setSemesterViewSelection({ values: lastPeriods, year: initialYear });
          }

          // Traiter les données pour la sélection initiale
          processReentrantData(ticketsForYear, viewMode);

          initializationCompleted.current = true;
        } else if (initializationCompleted.current && selectedYear) {
           // Si déjà initialisé mais fetch est relancé (e.g. apiUrl change), retraiter les données pour la sélection actuelle
            const ticketsForYear = result.filter((t) => new Date(t[dateUpdateField]).getFullYear() === selectedYear);
            processReentrantData(ticketsForYear, viewMode);
        }


        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setLoading(false);
      }
    }
    fetchData();
    // globalStartDate/EndDate enlevés ici car gérés par l'effet suivant et applyGlobalFilter
  }
  , [apiUrl, dateUpdateField, idField, weekField, defaultNumPeriods]); // viewMode enlevé pour éviter re-fetch juste pour ça

  // Mise à jour du traitement quand selectedYear change (ou viewMode après initialisation)
  useEffect(() => {
    // Ne s'exécute que si l'initialisation est terminée
    if (initializationCompleted.current && data.length > 0 && selectedYear) {
      const ticketsForYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === selectedYear);
      processReentrantData(ticketsForYear, viewMode);
    }
  }, [selectedYear, viewMode, data, dateUpdateField]); // Ajout de viewMode ici

  // Effet pour forcer l'utilisation du filtre global quand il change
  useEffect(() => {
    // Ne s'exécute que si l'initialisation est terminée et que le filtre global a changé
    if (initializationCompleted.current && globalStartDate && globalEndDate && globalModifiedAt > 0) {
        // Vérifier si le filtre global a réellement été appliqué plus récemment que les filtres locaux
        const lastLocalModification = Math.max(
            weekSelectionModifiedAt,
            monthSelectionModifiedAt,
            quarterSelectionModifiedAt,
            semesterSelectionModifiedAt
        );

        // Appliquer le filtre global seulement si la modification globale est plus récente
        // ou si aucune modification locale n'a eu lieu (init)
        if (globalModifiedAt > lastLocalModification || lastLocalModification === 0) {
            applyGlobalFilter();
            globalFilterApplied.current = true; // S'assurer qu'il est marqué comme appliqué
        }
    }
}, [globalStartDate, globalEndDate, globalModifiedAt]); // Ne dépend que du filtre global

  if (loading)
    return <p className="text-center text-gray-500">Chargement des données...</p>;

  // ---- MODIFIÉ : Obtenir les périodes disponibles pour TOUTES les vues ----

  const allPeriodsSelected =
    availablePeriods.length > 0 &&
    availablePeriods.every((period) => selectedValues.includes(period));

  // ---- MODIFIÉ : Gérer la sélection/désélection pour TOUTES les vues ----
  const toggleSelectAll = () => {
    const newSelectedValues = allPeriodsSelected ? [] : [...availablePeriods];
    setSelectedValues(newSelectedValues);

    // Mise à jour de l'état mémorisé et du timestamp pour la vue actuelle
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

    setHasGlobalFilter(false); // Marquer comme filtre local
  };

  // ---- MODIFIÉ : Gérer le changement de sélection pour TOUTES les vues ----
  const handleSelectionChange = (value) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];

    setSelectedValues(newSelectedValues);

    // Mise à jour de l'état mémorisé et du timestamp pour la vue actuelle
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

    setHasGlobalFilter(false); // Marquer comme filtre local
  };

  // Fonction pour changer de vue (déjà présente, inchangée fonctionnellement)
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
    // Le useEffect sur [viewMode] s'occupera du reste
  };

  // ---- MODIFIÉ : Gérer le changement d'année pour TOUTES les vues ----
  const handleYearChange = (year) => {
    setSelectedYear(year);
    const newAvailablePeriods = getAvailablePeriodsForYear(year, viewMode); // Obtenir pour la nouvelle année et vue actuelle

    let newSelectedValues = [];

    // Si le filtre global était actif, essayer de le réappliquer à la nouvelle année
    if (hasGlobalFilter && globalStartDate && globalEndDate) {
        let globalPeriods = [];
        if (viewMode === "week") globalPeriods = getAllWeeksBetween(globalStartDate, globalEndDate);
        else if (viewMode === "month") globalPeriods = getAllMonthsBetween(globalStartDate, globalEndDate);
        else if (viewMode === "quarter") globalPeriods = getAllQuartersBetween(globalStartDate, globalEndDate);
        else if (viewMode === "semester") globalPeriods = getAllSemestersBetween(globalStartDate, globalEndDate);

        // Garder seulement les périodes globales qui existent dans la nouvelle année
        newSelectedValues = globalPeriods.filter(p => newAvailablePeriods.includes(p));
    } else {
        // Sinon, essayer de garder l'intersection avec la sélection mémorisée pour cette vue
        let previousSelection = [];
        if (viewMode === "week") previousSelection = weekViewSelection.values;
        else if (viewMode === "month") previousSelection = monthViewSelection.values;
        else if (viewMode === "quarter") previousSelection = quarterViewSelection.values;
        else if (viewMode === "semester") previousSelection = semesterViewSelection.values;

        const intersection = previousSelection.filter(p => newAvailablePeriods.includes(p));
        if (intersection.length > 0) {
            newSelectedValues = intersection;
        } else {
            // Si pas d'intersection (ou pas de sélection mémorisée), prendre les N dernières périodes
            newSelectedValues = newAvailablePeriods.slice(-defaultNumPeriods);
        }
    }

    setSelectedValues(newSelectedValues);

    // Mettre à jour l'état mémorisé pour la vue actuelle avec la nouvelle année
    if (viewMode === "week") setWeekViewSelection({ values: newSelectedValues, year: year });
    else if (viewMode === "month") setMonthViewSelection({ values: newSelectedValues, year: year });
    else if (viewMode === "quarter") setQuarterViewSelection({ values: newSelectedValues, year: year });
    else if (viewMode === "semester") setSemesterViewSelection({ values: newSelectedValues, year: year });

    // Le useEffect [selectedYear, viewMode] retraitera les données
  };

  // ---- MODIFIÉ : Préparer les labels et datasets pour TOUTES les vues ----
  // Filtrer les périodes dans groupedData selon la sélection ET l'année
  const filteredPeriodsData = Object.entries(groupedData)
    .map(([periodStr, data]) => ({ period: parseInt(periodStr), data }))
    .filter(({ period }) => selectedValues.includes(period))
    .sort((a, b) => a.period - b.period); // Trier par numéro de période

  const labels = filteredPeriodsData.map(({ period }) => {
    let periodLabel = String(period); // Par défaut
    if (viewMode === "week") {
      periodLabel = `S${period}`;
    } else if (viewMode === "month" && periodLabels.month[period]) {
      periodLabel = periodLabels.month[period];
    } else if (viewMode === "quarter" && periodLabels.quarter[period]) {
      periodLabel = periodLabels.quarter[period];
    } else if (viewMode === "semester" && periodLabels.semester[period]) {
      periodLabel = periodLabels.semester[period];
    }
    // Ajouter l'année si plusieurs années existent
    return multipleYearsExist ? `${periodLabel}, ${selectedYear}` : periodLabel;
  });


  // Trouver toutes les itérations présentes dans les données filtrées
   const allIterationsInData = new Set();
   filteredPeriodsData.forEach(({ data }) => {
       Object.keys(data).forEach(iteration => allIterationsInData.add(parseInt(iteration)));
   });
   const iterations = Array.from(allIterationsInData).sort((a, b) => a - b); // Trier les numéros d'itération


  const datasets = iterations.map((it) => ({
    label: `${it} Réitération${it > 1 ? "s" : ""}`,
    // Aller chercher la donnée pour chaque période filtrée et cette itération
    data: filteredPeriodsData.map(({ data }) => data[it] || 0),
    backgroundColor: iterationColors[it] || "#ccc", // Utiliser les couleurs fournies
    borderRadius: 8,
    hoverBackgroundColor: iterationColors[it],
    hoverBorderWidth: 2,
    hoverBorderColor: "#444",
    categoryPercentage: 0.7,
    // ---- IMPORTANT : Ce graphique n'est PAS stacké, contrairement à SlaAnciennete ----
    // stack: 'stack1', // NE PAS AJOUTER CECI
  }));

  // ---- MODIFIÉ : Générer le label de période pour TOUTES les vues ----
  const periodeLabelText = selectedValues.length > 0
    ? viewMode === "week"
      ? `Semaine(s) : ${selectedValues.join(", ")}`
      : viewMode === "month"
        ? `Mois : ${selectedValues.map(m => periodLabels.month[m] || m).join(", ")}`
        : viewMode === "quarter"
          ? `Trimestre(s) : ${selectedValues.map(q => periodLabels.quarter[q] || q).join(", ")}`
          : `Semestre(s) : ${selectedValues.map(s => periodLabels.semester[s] || s).join(", ")}`
    : "Aucune période sélectionnée";


  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { /* ... (options inchangées) ... */
        display: true, position: "top",
        labels: { color: "black", font: { size: 11 }, padding: 10 },
      },
      datalabels: { /* ... (options inchangées) ... */
        anchor: "end", align: "end", color: "black", font: { size: 10 },
        clamp: true, clip: false, offset: -4,
        formatter: (value) => (value > 0 ? value : ""),
      },
      tooltip: { /* ... (options inchangées) ... */
        callbacks: { label: (context) => `${context.dataset.label}: ${context.raw}` },
      },
    },
    scales: {
      // ---- IMPORTANT : PAS de 'stacked: true' ici ----
      x: { stacked: false, title: { display: true, text: multipleYearsExist ? `Période, Année` : 'Période' } },
      y: { beginAtZero: true, stacked: false, ticks: { precision: 0 }, title: { display: true, text: 'Nombre de Tickets Réentrants' }, grace: '5%' },
    },
     animation: {
        duration: 500, // Animation plus douce
    },
  };

  const chartData = {
    labels,
    datasets
  };

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Header avec titre, sous-titre et boutons */}
        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <h3 className="no-export text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500">
              {selectedYear && `Année : ${selectedYear} - `}
              {periodeLabelText} {/* Utilisation de la variable mise à jour */}
            </p>
          </div>

          <div className="no-export flex gap-2">
            <button
              className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
              onClick={() => setIsOpen(!isOpen)}
              data-filter-toggle="true">
              <AiOutlineFilter size={20} className="text-gray-600" />
            </button>
            {/* ---- NOUVEAU : Bouton Commentaire ---- */}
            <CommentButton
              containerRef={chartContainerRef} // Ref du conteneur principal
              comments={annotations}
              onAddComment={(newComment) => setAnnotations([...annotations, newComment])}
              onUpdateComment={(updatedComment) =>
                setAnnotations(annotations.map(a => a.id === updatedComment.id ? updatedComment : a))
              }
              onDeleteComment={(commentId) =>
                setAnnotations(annotations.filter(a => a.id !== commentId))
              }
            />
            <button
              className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
              onClick={() => setModalIsOpen(true)}>
              <FaExpand size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Panneau de filtre */}
          {isOpen && (
            <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
              <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
              {/* ---- MODIFIÉ : Ajouter les boutons Trimestre/Semestre ---- */}
              {enableToggleView && (
                <div className="flex space-x-2 mb-2 mt-2 flex-wrap"> {/* Ajout de flex-wrap */}
                  <button
                    className={`px-3 py-1 rounded-md mb-1 ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                    onClick={() => handleViewModeChange("week")} >
                    Semaine
                  </button>
                  <button
                    className={`px-3 py-1 rounded-md mb-1 ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                    onClick={() => handleViewModeChange("month")} >
                    Mois
                  </button>
                  <button
                    className={`px-3 py-1 rounded-md mb-1 ${viewMode === "quarter" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                    onClick={() => handleViewModeChange("quarter")} >
                    Trimestre
                  </button>
                  <button
                    className={`px-3 py-1 rounded-md mb-1 ${viewMode === "semester" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                    onClick={() => handleViewModeChange("semester")} >
                    Semestre
                  </button>
                </div>
              )}
              {/* Filtre Année (inchangé) */}
              {enableYearFilter && multipleYearsExist && (
                <div className="mb-3">
                   {/* ... code inchangé ... */}
                   <h5 className="text-sm font-medium text-gray-500 mb-1">Années :</h5>
                   <div className="flex flex-wrap gap-1">
                     {availableYears.map((year) => (
                       <button
                         key={year}
                         onClick={() => handleYearChange(year)}
                         className={`px-2 py-1 text-xs rounded-md ${selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                       >
                         {year}
                       </button>
                     ))}
                   </div>
                </div>
              )}
              {/* Bouton Tout Sélectionner (inchangé) */}
              <div className="mb-2">
                 {/* ... code inchangé ... */}
                 <button
                   onClick={toggleSelectAll}
                   className={`text-xs px-2 py-1 rounded-md w-full ${
                     allPeriodsSelected
                       ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                       : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                   }`}
                 >
                   {allPeriodsSelected ? "Tout désélectionner" : "Tout sélectionner"}
                 </button>
              </div>
              {/* ---- MODIFIÉ : Affichage des périodes disponibles ---- */}
              <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
                {availablePeriods.map((value) => (
                  <div key={value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`period-${value}-${viewMode}`} // ID unique pour le label
                      checked={selectedValues.includes(value)}
                      onChange={() => handleSelectionChange(value)}
                    />
                    <label htmlFor={`period-${value}-${viewMode}`} className="text-gray-500 cursor-pointer"> {/* Ajout label et htmlFor */}
                      {viewMode === "week"
                        ? `S${value}`
                        : viewMode === "month"
                          ? periodLabels.month[value] || `Mois ${value}`
                          : viewMode === "quarter"
                            ? periodLabels.quarter[value] || `Trim. ${value}`
                            : viewMode === "semester"
                              ? periodLabels.semester[value] || `Sem. ${value}`
                              : value
                      }
                    </label>
                  </div>
                ))}
                {availablePeriods.length === 0 && (
                    <p className="text-xs text-gray-400 text-center">Aucune période disponible pour {selectedYear}.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ---- MODIFIÉ : Ajouter la ref au conteneur du graphique ---- */}
        <div className="flex-grow flex justify-center items-center h-[350px]" ref={chartContainerRef}>
          <Bar
            data={chartData}
            options={chartOptions}
            plugins={[ChartDataLabels]} // ChartDataLabels est déjà enregistré
          />
        </div>
      </div>

      {/* Modal d'agrandissement */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedYear && `Année : ${selectedYear} - `}{periodeLabelText} {/* Utilisation de la variable mise à jour */}
              </p>
            </div>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          {/* ---- MODIFIÉ : Ajouter la ref au conteneur du graphique modal et le bouton commentaire caché ---- */}
          <div className="relative h-[400px] flex items-center justify-center" ref={modalChartContainerRef}>
            <Bar
              data={chartData}
              options={chartOptions}
              plugins={[ChartDataLabels]}
            />
            {/* Bouton commentaire caché pour afficher/interagir avec les commentaires existants */}
            <CommentButton
              containerRef={modalChartContainerRef}
              hideButton={true} // Cache le bouton "+" mais permet l'interaction
              comments={annotations}
              onAddComment={(newComment) => setAnnotations([...annotations, newComment])}
              onUpdateComment={(updatedComment) =>
                setAnnotations(annotations.map(a => a.id === updatedComment.id ? updatedComment : a))
              }
              onDeleteComment={(commentId) =>
                setAnnotations(annotations.filter(a => a.id !== commentId))
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}