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

// --- Fonctions utilitaires ---

// Nouvelle fonction pour extraire le numéro de semaine de la chaîne "Sxx"
const parseWeekNumber = (weekString) => {
  if (typeof weekString === 'string' && weekString.toUpperCase().startsWith('S')) {
    const numberPart = weekString.substring(1);
    const weekNum = parseInt(numberPart, 10);
    return isNaN(weekNum) ? null : weekNum;
  }
  // Gérer le cas où la donnée pourrait déjà être un nombre
  if (typeof weekString === 'number' && !isNaN(weekString)) {
    return weekString;
  }
  return null; // Retourne null si le format est invalide
};

// Fonctions pour Trimestre et Semestre (basées sur la date)
const getQuarter = (date) => {
  const month = date.getMonth() + 1;
  return Math.ceil(month / 3);
};

const getSemester = (date) => {
  const month = date.getMonth() + 1;
  return month <= 6 ? 1 : 2;
};

// --- Composant Principal ---

export default function VolumeDocumentsMigres({
  apiUrl,
  id = "Volume des Documents Migrés/Semaine",
  title = "Volume des Documents Migrés/Semaine",
  dateField = "date", // Toujours nécessaire pour Année, Mois, Trimestre, Semestre et filtrage global
  weekField = "semaine", // Nouveau : champ pour la semaine (ex: "S23")
  ownerField = "initiateur", // Ajusté selon vos données d'exemple
  typeField = "type_modop",
  targetType = "Création", // Ajusté selon vos données d'exemple (ou gardez "Migration" si c'est le but)
  periodLabels = {
    month: {
      1: "Janv", 2: "Févr", 3: "Mars", 4: "Avr", 5: "Mai", 6: "Juin",
      7: "Juil", 8: "Août", 9: "Sept", 10: "Oct", 11: "Nov", 12: "Déc"
    },
    quarter: { 1: "T1", 2: "T2", 3: "T3", 4: "T4" },
    semester: { 1: "S1", 2: "S2" }
  },
  defaultViewMode = "week",
  defaultNumPeriods = 10,
  enableYearFilter = true,
  enableToggleView = true,
  maxOwners = 5
}) {
  if (!apiUrl) {
    // ... (gestion d'erreur inchangée)
     return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <h3 className="text-lg font-semibold text-black">{title}</h3>
          <p className="text-red-500 text-sm mt-2">Erreur : L'URL de l'API est requise.</p>
        </div>
      </div>
    );
  }

  // Références et États (inchangés sauf suppression de références à getWeekNumber si applicable)
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);
  const prevViewMode = useRef(null);
  const filterPanelRef = useRef(null);
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
  // const [annotations, setAnnotations] = useState([]); // Semble non utilisé dans le code fourni
  const [topOwners, setTopOwners] = useState([]);

  // États pour mémoriser les sélections
  const [weekViewSelection, setWeekViewSelection] = useState({ values: [], year: null });
  const [monthViewSelection, setMonthViewSelection] = useState({ values: [], year: null });
  const [quarterViewSelection, setQuarterViewSelection] = useState({ values: [], year: null });
  const [semesterViewSelection, setSemesterViewSelection] = useState({ values: [], year: null });

  // États pour la gestion des années
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  // États pour gérer la priorisation des filtres
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);
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

  // --- Fonctions de génération de périodes (Mois, Trimestre, Semestre inchangées) ---
  // La fonction getAllWeeksBetween est supprimée car non pertinente maintenant

  function getAllMonthsBetween(startDate, endDate) {
    // ... (code inchangé)
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
    // ... (code inchangé)
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
    // ... (code inchangé)
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

  // --- Fonction pour obtenir les périodes disponibles (modifiée pour la semaine) ---
  const getAvailablePeriodsForYear = (year, mode) => {
    if (!year || data.length === 0) return [];
    // On filtre toujours par année en utilisant le dateField car weekField n'a pas l'année
    const filteredByYear = data.filter((t) => {
        const date = new Date(t[dateField]);
        return !isNaN(date.getTime()) && date.getFullYear() === year;
    });

    if (mode === "week") {
      // Utilise weekField et parseWeekNumber
      return [...new Set(filteredByYear.map((t) => parseWeekNumber(t[weekField])))]
        .filter(week => week !== null) // Exclure les valeurs null/invalides
        .sort((a, b) => a - b);
    } else if (mode === "month") {
      // Utilise dateField
      return [...new Set(filteredByYear.map((t) => {
          const date = new Date(t[dateField]);
          return !isNaN(date.getTime()) ? date.getMonth() + 1 : null;
        }))]
        .filter(month => month !== null)
        .sort((a, b) => a - b);
    } else if (mode === "quarter") {
      // Utilise dateField
      return [...new Set(filteredByYear.map((t) => {
          const date = new Date(t[dateField]);
          return !isNaN(date.getTime()) ? getQuarter(date) : null;
        }))]
        .filter(quarter => quarter !== null)
        .sort((a, b) => a - b);
    } else if (mode === "semester") {
      // Utilise dateField
       return [...new Set(filteredByYear.map((t) => {
           const date = new Date(t[dateField]);
           return !isNaN(date.getTime()) ? getSemester(date) : null;
        }))]
        .filter(semester => semester !== null)
        .sort((a, b) => a - b);
    }
    return [];
  };

  // --- Appliquer le filtre global (modifié pour la semaine) ---
  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate || data.length === 0) return;

    const currentGlobalYear = globalStartDate.getFullYear();
    // Note: Si la plage globale couvre plusieurs années, on prend l'année de début comme référence.
    // Le filtrage des données ci-dessous prendra en compte la plage de dates complète.

    // 1. Filtrer les données brutes par la plage de dates globale en utilisant dateField
    const globallyFilteredDocs = data.filter(doc => {
      const docDate = new Date(doc[dateField]);
      return !isNaN(docDate.getTime()) && docDate >= globalStartDate && docDate <= globalEndDate;
    });

    // 2. Extraire les périodes uniques *des données filtrées* pour chaque mode
    // Pour la semaine, utiliser weekField ; pour les autres, utiliser dateField
    const weekList = [...new Set(globallyFilteredDocs
                        .map(doc => parseWeekNumber(doc[weekField]))
                        .filter(w => w !== null))] // Filtrer null
                      .sort((a, b) => a - b);

    const monthList = [...new Set(globallyFilteredDocs
                        .map(doc => { const d = new Date(doc[dateField]); return !isNaN(d.getTime()) ? d.getMonth() + 1 : null; })
                        .filter(m => m !== null))] // Filtrer null
                       .sort((a, b) => a - b);

    const quarterList = [...new Set(globallyFilteredDocs
                          .map(doc => { const d = new Date(doc[dateField]); return !isNaN(d.getTime()) ? getQuarter(d) : null; })
                          .filter(q => q !== null))] // Filtrer null
                         .sort((a, b) => a - b);

    const semesterList = [...new Set(globallyFilteredDocs
                          .map(doc => { const d = new Date(doc[dateField]); return !isNaN(d.getTime()) ? getSemester(d) : null; })
                          .filter(s => s !== null))] // Filtrer null
                         .sort((a, b) => a - b);

    // 3. Mettre à jour les sélections mémorisées et la sélection active
    setWeekViewSelection({ values: weekList, year: currentGlobalYear });
    setMonthViewSelection({ values: monthList, year: currentGlobalYear });
    setQuarterViewSelection({ values: quarterList, year: currentGlobalYear });
    setSemesterViewSelection({ values: semesterList, year: currentGlobalYear });

    // Appliquer à la vue actuelle
    if (viewMode === "week") setSelectedValues(weekList);
    else if (viewMode === "month") setSelectedValues(monthList);
    else if (viewMode === "quarter") setSelectedValues(quarterList);
    else if (viewMode === "semester") setSelectedValues(semesterList);

    setSelectedYear(currentGlobalYear); // Important: Mettre à jour l'année sélectionnée
    setHasGlobalFilter(true);

    // 4. Retraiter les données pour l'année sélectionnée (qui vient d'être définie)
    const documentsForYear = data.filter((t) => {
        const date = new Date(t[dateField]);
        return !isNaN(date.getTime()) && date.getFullYear() === currentGlobalYear;
    });
    processVolumeData(documentsForYear, viewMode); // Utiliser la vue actuelle
  };

  // Gérer le changement de vue (inchangé dans sa logique de sauvegarde/restauration)
  useEffect(() => {
    // ... (code inchangé, il utilise déjà les états xxxViewSelection)
     if (!prevViewMode.current) {
      prevViewMode.current = viewMode;
      return;
    }
    // Sauvegarde de l'état précédent
    if (prevViewMode.current === "week") setWeekViewSelection({ values: selectedValues, year: selectedYear });
    else if (prevViewMode.current === "month") setMonthViewSelection({ values: selectedValues, year: selectedYear });
    else if (prevViewMode.current === "quarter") setQuarterViewSelection({ values: selectedValues, year: selectedYear });
    else if (prevViewMode.current === "semester") setSemesterViewSelection({ values: selectedValues, year: selectedYear });

    // Restauration de l'état pour la nouvelle vue
    let restoredValues = [];
    let restoredYear = selectedYear;

    if (viewMode === "week" && weekViewSelection.values.length > 0) { restoredValues = weekViewSelection.values; restoredYear = weekViewSelection.year || selectedYear; }
    else if (viewMode === "month" && monthViewSelection.values.length > 0) { restoredValues = monthViewSelection.values; restoredYear = monthViewSelection.year || selectedYear; }
    else if (viewMode === "quarter" && quarterViewSelection.values.length > 0) { restoredValues = quarterViewSelection.values; restoredYear = quarterViewSelection.year || selectedYear; }
    else if (viewMode === "semester" && semesterViewSelection.values.length > 0) { restoredValues = semesterViewSelection.values; restoredYear = semesterViewSelection.year || selectedYear; }
    else {
      // Si aucune sélection n'est mémorisée, prendre les N dernières périodes
      if (selectedYear && data.length > 0) {
        const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode);
        restoredValues = availablePeriods.slice(-defaultNumPeriods);
      }
    }

    setSelectedValues(restoredValues);
    if (restoredYear !== selectedYear) setSelectedYear(restoredYear);

    // Traiter les données pour la nouvelle vue
    if (data.length > 0 && restoredYear) {
        const documentsForYear = data.filter((t) => {
            const date = new Date(t[dateField]);
            return !isNaN(date.getTime()) && date.getFullYear() === restoredYear;
        });
      processVolumeData(documentsForYear, viewMode);
    }
    prevViewMode.current = viewMode;
  }, [viewMode, data]); // Ne pas ajouter dateField/weekField ici directement, c'est via les fonctions appelées

  // --- Traiter les données (modifié pour la semaine) ---
  const processVolumeData = (documents, mode) => {
    // Filtrer pour ne garder que le type cible (ex: 'Création')
    const targetDocs = documents.filter(doc => doc[typeField] === targetType);
    const result = {};

    targetDocs.forEach((doc) => {
      let period = null;
      const docDate = new Date(doc[dateField]); // Toujours nécessaire pour Mois/Trim/Semestre et validité date

      // Déterminer la période en fonction du mode de vue
      if (mode === "week") {
        // Utiliser weekField et parseWeekNumber
        period = parseWeekNumber(doc[weekField]);
      } else if (!isNaN(docDate.getTime())) { // Vérifier la validité de la date pour les autres modes
        if (mode === "month") {
          period = docDate.getMonth() + 1;
        } else if (mode === "quarter") {
          period = getQuarter(docDate);
        } else if (mode === "semester") {
          period = getSemester(docDate);
        }
      }

      // Ignorer si la période n'est pas valide (null ou NaN)
      if (period === null || isNaN(period)) return;

      const owner = doc[ownerField] || "Inconnu"; // Gérer les propriétaires vides/null

      if (!result[period]) result[period] = {};
      if (!result[period][owner]) result[period][owner] = 0;

      result[period][owner]++;
    });

    setGroupedData(result);

    // Calculer les propriétaires les plus actifs (inchangé)
    const ownerCounts = {};
    Object.values(result).forEach(periodData => {
      Object.entries(periodData).forEach(([owner, count]) => {
        if (!ownerCounts[owner]) ownerCounts[owner] = 0;
        ownerCounts[owner] += count;
      });
    });
    const sortedOwners = Object.entries(ownerCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, maxOwners);
    setTopOwners(sortedOwners);
  };

  // --- Chargement initial des données (Ajout de weekField dans les dépendances) ---
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();

        // Filtrer les données invalides (ex: date manquante ou invalide si dateField est crucial)
        const validData = result.filter(item => item && item[dateField] && !isNaN(new Date(item[dateField]).getTime()));
        setData(validData);

        if (validData.length === 0) {
             console.warn("Aucune donnée valide trouvée après filtrage.");
             setLoading(false);
             return;
        }

        // Extraire les années disponibles à partir de dateField
        const years = [...new Set(validData.map((t) => new Date(t[dateField]).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years.length > 0 ? years[years.length - 1] : new Date().getFullYear(); // Fallback
        let initialYear = latestYear;

        // Appliquer le filtre global immédiatement s'il est défini
        if (globalStartDate && globalEndDate && !initializationCompleted.current && !globalFilterApplied.current) {
          // Note: applyGlobalFilter mettra à jour selectedYear
           applyGlobalFilter(); // Utilise les données chargées (validData) implicitement via l'état `data`
           initialYear = selectedYear; // Récupère l'année définie par applyGlobalFilter
           globalFilterApplied.current = true;
        } else {
          setSelectedYear(latestYear);
        }

        // Définir les valeurs par défaut lors de l'initialisation si le filtre global n'a pas été appliqué
        if (!initializationCompleted.current && !globalFilterApplied.current) {
          const documentsForYear = validData.filter((t) => new Date(t[dateField]).getFullYear() === initialYear);
          const availablePeriods = getAvailablePeriodsForYear(initialYear, viewMode); // Utilise validData via l'état `data`
          const lastPeriods = availablePeriods.slice(-defaultNumPeriods);

          setSelectedValues(lastPeriods);

          // Mettre à jour la sélection mémorisée pour la vue par défaut
          if (viewMode === "week") setWeekViewSelection({ values: lastPeriods, year: initialYear });
          else if (viewMode === "month") setMonthViewSelection({ values: lastPeriods, year: initialYear });
          else if (viewMode === "quarter") setQuarterViewSelection({ values: lastPeriods, year: initialYear });
          else if (viewMode === "semester") setSemesterViewSelection({ values: lastPeriods, year: initialYear });

          // Traiter les données pour la sélection initiale
          processVolumeData(documentsForYear, viewMode);
          initializationCompleted.current = true;

        } else if (initializationCompleted.current && selectedYear) {
           // Si déjà initialisé mais fetch est relancé (ou applyGlobalFilter a déjà traité)
           // Assurer que les données sont traitées pour l'année et la vue courantes
           const documentsForYear = validData.filter((t) => new Date(t[dateField]).getFullYear() === selectedYear);
           processVolumeData(documentsForYear, viewMode);
        }


        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setData([]); // Vider les données en cas d'erreur
        setLoading(false);
      }
    }
    fetchData();
  }, [apiUrl, dateField, weekField, ownerField, typeField, targetType, defaultNumPeriods]); // Ajout de weekField

  // Mise à jour du traitement quand selectedYear ou viewMode change (inchangé)
  useEffect(() => {
    if (initializationCompleted.current && data.length > 0 && selectedYear) {
       const documentsForYear = data.filter((t) => {
           const date = new Date(t[dateField]);
           return !isNaN(date.getTime()) && date.getFullYear() === selectedYear;
        });
      processVolumeData(documentsForYear, viewMode);
    }
  }, [selectedYear, viewMode, data]); // dépendances ok

  // Effet pour forcer l'utilisation du filtre global (inchangé)
  useEffect(() => {
    // ... (code inchangé)
     if (initializationCompleted.current && globalStartDate && globalEndDate && globalModifiedAt > 0) {
      const lastLocalModification = Math.max(
        weekSelectionModifiedAt, monthSelectionModifiedAt, quarterSelectionModifiedAt, semesterSelectionModifiedAt
      );
      if (globalModifiedAt > lastLocalModification || lastLocalModification === 0) {
        applyGlobalFilter();
        globalFilterApplied.current = true;
      }
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt]); // dépendances ok

  // --- Rendu du composant ---

  if (loading)
    return <p className="text-center text-gray-500">Chargement des données...</p>;
  if (data.length === 0 && !loading)
     return <p className="text-center text-gray-500">Aucune donnée à afficher.</p>;


  const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode);

  const allPeriodsSelected =
    availablePeriods.length > 0 &&
    selectedValues.length === availablePeriods.length && // Comparaison plus fiable
    availablePeriods.every((period) => selectedValues.includes(period));

  // Gérer la sélection/désélection de toutes les périodes (inchangé)
  const toggleSelectAll = () => {
     // ... (code inchangé)
      const newSelectedValues = allPeriodsSelected ? [] : [...availablePeriods];
    setSelectedValues(newSelectedValues);
    const now = Date.now();
    if (viewMode === "week") { setWeekViewSelection({ values: newSelectedValues, year: selectedYear }); setWeekSelectionModifiedAt(now); }
    else if (viewMode === "month") { setMonthViewSelection({ values: newSelectedValues, year: selectedYear }); setMonthSelectionModifiedAt(now); }
    else if (viewMode === "quarter") { setQuarterViewSelection({ values: newSelectedValues, year: selectedYear }); setQuarterSelectionModifiedAt(now); }
    else if (viewMode === "semester") { setSemesterViewSelection({ values: newSelectedValues, year: selectedYear }); setSemesterSelectionModifiedAt(now); }
    setHasGlobalFilter(false);
  };

  // Gérer le changement de sélection d'une période (inchangé)
  const handleSelectionChange = (value) => {
    // ... (code inchangé)
      const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    setSelectedValues(newSelectedValues);
    const now = Date.now();
    if (viewMode === "week") { setWeekViewSelection({ values: newSelectedValues, year: selectedYear }); setWeekSelectionModifiedAt(now); }
    else if (viewMode === "month") { setMonthViewSelection({ values: newSelectedValues, year: selectedYear }); setMonthSelectionModifiedAt(now); }
    else if (viewMode === "quarter") { setQuarterViewSelection({ values: newSelectedValues, year: selectedYear }); setQuarterSelectionModifiedAt(now); }
    else if (viewMode === "semester") { setSemesterViewSelection({ values: newSelectedValues, year: selectedYear }); setSemesterSelectionModifiedAt(now); }
    setHasGlobalFilter(false);
  };

  // Fonction pour changer de vue (inchangé)
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
  };

  // Gérer le changement d'année (inchangé dans sa logique)
  const handleYearChange = (year) => {
      // ... (code inchangé, utilise getAvailablePeriodsForYear qui est déjà modifié)
       setSelectedYear(year);
        const newAvailablePeriods = getAvailablePeriodsForYear(year, viewMode);
        let newSelectedValues = [];

        if (hasGlobalFilter && globalStartDate && globalEndDate) {
            const globallyFilteredDocsForNewYear = data.filter(doc => {
                const docDate = new Date(doc[dateField]);
                return !isNaN(docDate.getTime()) && docDate.getFullYear() === year && docDate >= globalStartDate && docDate <= globalEndDate;
            });
            if (viewMode === "week") newSelectedValues = [...new Set(globallyFilteredDocsForNewYear.map(doc => parseWeekNumber(doc[weekField])).filter(w => w !== null))].sort((a, b) => a - b);
            else if (viewMode === "month") newSelectedValues = [...new Set(globallyFilteredDocsForNewYear.map(doc => { const d = new Date(doc[dateField]); return !isNaN(d.getTime()) ? d.getMonth() + 1 : null; }).filter(m => m !== null))].sort((a, b) => a - b);
            else if (viewMode === "quarter") newSelectedValues = [...new Set(globallyFilteredDocsForNewYear.map(doc => { const d = new Date(doc[dateField]); return !isNaN(d.getTime()) ? getQuarter(d) : null; }).filter(q => q !== null))].sort((a, b) => a - b);
            else if (viewMode === "semester") newSelectedValues = [...new Set(globallyFilteredDocsForNewYear.map(doc => { const d = new Date(doc[dateField]); return !isNaN(d.getTime()) ? getSemester(d) : null; }).filter(s => s !== null))].sort((a, b) => a - b);

        } else {
            let previousSelection = [];
            if (viewMode === "week") previousSelection = weekViewSelection.values;
            else if (viewMode === "month") previousSelection = monthViewSelection.values;
            else if (viewMode === "quarter") previousSelection = quarterViewSelection.values;
            else if (viewMode === "semester") previousSelection = semesterViewSelection.values;

            const intersection = previousSelection.filter(p => newAvailablePeriods.includes(p));
            if (intersection.length > 0) newSelectedValues = intersection;
             else newSelectedValues = newAvailablePeriods.slice(-defaultNumPeriods);
        }
        setSelectedValues(newSelectedValues);

        if (viewMode === "week") setWeekViewSelection({ values: newSelectedValues, year: year });
        else if (viewMode === "month") setMonthViewSelection({ values: newSelectedValues, year: year });
        else if (viewMode === "quarter") setQuarterViewSelection({ values: newSelectedValues, year: year });
        else if (viewMode === "semester") setSemesterViewSelection({ values: newSelectedValues, year: year });
  };

  // Préparer les données pour le graphique (inchangé dans sa structure)
  const prepareChartData = () => {
      // ... (code inchangé, utilise groupedData et selectedValues qui sont maintenant corrects)
       const filteredPeriods = selectedValues.sort((a, b) => a - b);
        const labels = filteredPeriods.map((period) => {
        let periodLabel = String(period);
        if (viewMode === "week") periodLabel = `S${period}`;
        else if (viewMode === "month" && periodLabels.month[period]) periodLabel = periodLabels.month[period];
        else if (viewMode === "quarter" && periodLabels.quarter[period]) periodLabel = periodLabels.quarter[period];
        else if (viewMode === "semester" && periodLabels.semester[period]) periodLabel = periodLabels.semester[period];
        return multipleYearsExist && selectedYear ? `${periodLabel}, ${selectedYear}` : periodLabel; // Ajout check selectedYear
    });
    const datasets = topOwners.map((owner, index) => {
      const hue = (index * 137.5) % 360;
      const color = `hsl(${hue}, 70%, 60%)`;
      return {
        label: owner,
        data: filteredPeriods.map(period => groupedData[period]?.[owner] || 0), // Utilisation de optional chaining pour sécurité
        backgroundColor: color,
        borderRadius: 8,
        hoverBackgroundColor: `hsl(${hue}, 80%, 55%)`,
        hoverBorderWidth: 2,
        hoverBorderColor: "#444",
        categoryPercentage: 0.8,
        barPercentage: 0.9
      };
    });
    return { labels, datasets };
  };

  const chartData = prepareChartData();

  // Texte pour le sous-titre (inchangé)
  const periodeLabelText = selectedValues.length > 0
    ? viewMode === "week"
      ? `Semaine(s) : ${selectedValues.join(", ")}`
      : viewMode === "month"
        ? `Mois : ${selectedValues.map(m => periodLabels.month[m] || m).join(", ")}`
        : viewMode === "quarter"
          ? `Trimestre(s) : ${selectedValues.map(q => periodLabels.quarter[q] || q).join(", ")}`
          : `Semestre(s) : ${selectedValues.map(s => periodLabels.semester[s] || s).join(", ")}`
    : "Aucune période sélectionnée";

  // Options du graphique (inchangées, mais l'axe X s'adapte aux labels)
  const chartOptions = {
       // ... (options inchangées)
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
        legend: { display: true, position: "top", labels: { color: "black", font: { size: 11 }, padding: 10 }, },
        datalabels: { anchor: "end", align: "end", color: "black", font: { size: 10 }, clamp: true, clip: false, offset: -4, formatter: (value) => (value > 0 ? value : ""), },
        tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${context.raw} document(s)`, }, },
        },
        scales: {
        x: { stacked: false, title: { display: true, text: multipleYearsExist ? `Période, Année` : 'Période' } },
        y: { beginAtZero: true, stacked: false, ticks: { precision: 0 }, title: { display: true, text: `Nombre de Documents (${targetType})` }, grace: '5%' }, // Titre Y ajusté
        },
        animation: { duration: 500, },
    };

  // Rendu JSX (inchangé dans sa structure, les labels dans le filtre s'adaptent)
  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500">
              {selectedYear && `Année : ${selectedYear} - `}
              {periodeLabelText}
            </p>
          </div>
          <div className="flex gap-2">
             {/* Boutons Filtre et Agrandir */}
             <button className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" onClick={() => setIsOpen(!isOpen)} data-filter-toggle="true"><AiOutlineFilter size={20} className="text-gray-600" /></button>
             <button className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" onClick={() => setModalIsOpen(true)}><FaExpand size={18} className="text-gray-600" /></button>
          </div>

          {/* Panneau de filtre */}
          {/* Panneau de filtre */}
          {isOpen && (
            <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
              <h4 className="font-semibold text-gray-500 mb-2">Filtrer par :</h4> {/* Ajout mb-2 */}

              {/* Switchers de vue */}
              {enableToggleView && (
                <div className="flex space-x-1 mb-3 flex-wrap"> {/* Ajustement space et mb */}
                  <button
                    className={`px-2 py-1 text-xs rounded ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                    onClick={() => handleViewModeChange("week")}>
                    Semaine
                  </button>
                  <button
                     className={`px-2 py-1 text-xs rounded ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                    onClick={() => handleViewModeChange("month")}>
                    Mois
                  </button>
                  <button
                     className={`px-2 py-1 text-xs rounded ${viewMode === "quarter" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                    onClick={() => handleViewModeChange("quarter")}>
                    Trimestre
                  </button>
                  <button
                    className={`px-2 py-1 text-xs rounded ${viewMode === "semester" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                    onClick={() => handleViewModeChange("semester")}>
                    Semestre
                  </button>
                </div>
              )}

              {/* Filtre Année */}
              {enableYearFilter && multipleYearsExist && (
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-gray-500 mb-1">Années :</h5>
                  <div className="flex flex-wrap gap-1">
                    {availableYears.map((year) => (
                      <button
                        key={year}
                        onClick={() => handleYearChange(year)}
                        className={`px-2 py-1 text-xs rounded ${selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
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
                  className={`text-xs px-2 py-1 rounded w-full ${ // text-xs et padding ajustés
                    allPeriodsSelected
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
                >
                  {allPeriodsSelected ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>

              {/* Liste des périodes disponibles */}
              <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
                {availablePeriods.map((value) => (
                  <div key={value} className="flex items-center space-x-2 mb-1"> {/* Ajout mb-1 */}
                    <input
                      type="checkbox"
                      id={`period-${value}-${viewMode}`}
                      checked={selectedValues.includes(value)}
                      onChange={() => handleSelectionChange(value)}
                      className="form-checkbox h-4 w-4 text-blue-600" // Style checkbox
                    />
                    <label htmlFor={`period-${value}-${viewMode}`} className="text-gray-600 cursor-pointer text-sm"> {/* Couleur texte ajustée */}
                       {/* CORRECTION APPLIQUÉE ICI */}
                       {viewMode === "week"
                          ? `S${value}`
                          : viewMode === "month"
                            ? periodLabels.month[value] || `Mois ${value}`
                            : viewMode === "quarter"
                              ? periodLabels.quarter[value] || `Trim. ${value}`
                              : periodLabels.semester[value] || `Sem. ${value}`
                       }
                    </label>
                  </div>
                ))}
                {availablePeriods.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-2">Aucune période pour {selectedYear}.</p> // Ajout mt-2
                )}
              </div>
            </div>
          )}        </div>

        {/* Conteneur du graphique */}
        <div className="flex-grow flex justify-center items-center h-[350px]" ref={chartContainerRef}>
           {chartData.labels.length > 0 ? (
             <Bar data={chartData} options={chartOptions} plugins={[ChartDataLabels]} />
           ) : (
              <p className="text-gray-500">Aucune donnée à afficher pour la sélection actuelle.</p>
           )}
        </div>
      </div>

      {/* Modal d'agrandissement */}
      <Modal /* ... props inchangées ... */ >
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
           {/* ... contenu modal inchangé ... */}
            <div className="relative h-[500px] flex items-center justify-center" ref={modalChartContainerRef}>
               {chartData.labels.length > 0 ? (
                 <Bar data={chartData} options={{...chartOptions, plugins: {...chartOptions.plugins, datalabels: {...chartOptions.plugins.datalabels, font: { size: 11 }}}}} plugins={[ChartDataLabels]} /> // Taille datalabels ajustée pour le modal
               ) : (
                  <p className="text-gray-500">Aucune donnée à afficher pour la sélection actuelle.</p>
               )}
           </div>
        </div>
      </Modal>
    </div>
  );
}