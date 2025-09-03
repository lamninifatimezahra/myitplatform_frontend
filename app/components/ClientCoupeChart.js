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
import Modal from "react-modal";
import { useGlobalFilter } from "@/app/components/GlobalFilterContext";
import CommentButton from "./CommentButton"; // Assurez-vous que le chemin est correct

if (typeof window !== "undefined") Modal.setAppElement(document.body);

// Fonction pour obtenir le numéro de semaine ISO (conservée)
const getWeekNumber = (date) => {
  if (!date || isNaN(date.getTime())) return null; // Handle invalid dates
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

// ---- NOUVEAU : Fonctions pour Trimestre/Semestre ----
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

// ---- NOUVEAU : Fonction pour calculer les jours ouvrables ----
const getBusinessDaysDifference = (dateDerniereMaj, dateSortie, delaiJour = null) => {
  // Vérifier si les paramètres nécessaires sont présents
  if (!dateDerniereMaj || !dateSortie) {
    return 0;
  }
  
  // Convertir les dates en objets Date
  const dateDebut = new Date(dateDerniereMaj);
  const dateFin = new Date(dateSortie);
  
  // Vérifier la validité des dates
  if (isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) {
    return 0;
  }
  
  // Si un delaiJour est fourni, l'utiliser comme base
  if (delaiJour !== null && !isNaN(delaiJour)) {
    // Calculer le nombre de jours total à examiner (arrondi standard)
    const totalDays = Math.round(delaiJour);
    
    // Compter les weekends pendant cette période
    let weekendDays = 0;
    const currentDate = new Date(dateDebut);
    
    for (let i = 0; i < totalDays; i++) {
      const dayOfWeek = currentDate.getDay();
      
      // Si c'est un samedi (6) ou un dimanche (0), c'est un weekend
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendDays++;
      }
      
      // Passer au jour suivant
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Soustraire les weekends du délai total
    const businessDays = Math.max(0, delaiJour - weekendDays);
    
    // Appliquer l'arrondi selon votre règle:
    // - Si la partie décimale <= 0.5, arrondir à l'inférieur
    // - Si la partie décimale > 0.5, arrondir au supérieur
    const decimalPart = businessDays - Math.floor(businessDays);
    if (decimalPart <= 0.5) {
      return Math.floor(businessDays);
    } else {
      return Math.ceil(businessDays);
    }
  }  
  
  // Si aucun delaiJour n'est fourni, calculer directement les jours ouvrables
  // Copier les dates pour ne pas modifier les originales
  let currentDate = new Date(dateDebut);
  currentDate.setHours(0, 0, 0, 0);
  
  const lastDate = new Date(dateFin);
  lastDate.setHours(23, 59, 59, 999);
  
  let businessDays = 0;
  
  // Parcourir chaque jour entre les dates
  while (currentDate <= lastDate) {
    const dayOfWeek = currentDate.getDay();
    
    // Compter si ce n'est pas un weekend (0 = dimanche, 6 = samedi)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
    
    // Passer au jour suivant
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return businessDays;
};

// ---- NOUVEAU : Fonction pour catégoriser selon SLA ----
const categorizeBySLA = (businessDays) => {
  const SLA_LIMIT = 0.0625; // 1.5 heures = 0.0625 jours
  return businessDays <= SLA_LIMIT ? "Respecte SLA" : "Dépasse SLA";
};

// Fonction pour générer toutes les semaines entre deux dates (conservée/adaptée)
function getAllWeeksBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return []; // Added checks
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

// Fonction pour générer tous les mois entre deux dates (conservée/adaptée)
function getAllMonthsBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return []; // Added checks
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

// ---- NOUVEAU : Fonctions pour générer Trimestres/Semestres entre dates ----
function getAllQuartersBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return []; // Added checks
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
  return [...new Set(quartersArray)].sort((a, b) => a - b);
}

function getAllSemestersBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return []; // Added checks
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
  return [...new Set(semestersArray)].sort((a, b) => a - b);
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

export default function ClientCoupeChart({
  apiUrl,
  // Props de personnalisation (conservées)
  id = "Client Coupé SLA",
  title = "Client Coupé - Analyse SLA",
  dateField = "date_derniere_maj",
  weekField = "semaine",
  filterField = "client_coupe",
  filterValue = "OK",
  yAxisLabel = "Nombre de clients coupés",
  // ---- NOUVEAU : Props du composant de référence (ajoutés pour cohérence) ----
  defaultViewMode = "week",
  defaultNumPeriods = 5, // Utiliser une prop cohérente
}) {
  // Gestion de l'absence de prop apiUrl (conservée)
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

  // Références
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);
  const prevViewMode = useRef(defaultViewMode); // Initialisé avec defaultViewMode
  const filterPanelRef = useRef(null);
  // ---- NOUVEAU : Références pour commentaires ----
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);

  // États locaux
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(defaultViewMode); // Utilise defaultViewMode
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
  // ---- NOUVEAU : État pour commentaires ----
  const [annotations, setAnnotations] = useState([]);

  // États pour mémoriser les sélections pour chaque vue
  const [weekViewSelection, setWeekViewSelection] = useState({ values: [], year: null });
  const [monthViewSelection, setMonthViewSelection] = useState({ values: [], year: null });
  // ---- NOUVEAU : États pour Quarter/Semester ----
  const [quarterViewSelection, setQuarterViewSelection] = useState({ values: [], year: null });
  const [semesterViewSelection, setSemesterViewSelection] = useState({ values: [], year: null });

  // États pour la gestion des années (conservés)
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  // États pour la priorisation des filtres
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);
  // ---- NOUVEAU : États priorisation Quarter/Semester ----
  const [quarterSelectionModifiedAt, setQuarterSelectionModifiedAt] = useState(0);
  const [semesterSelectionModifiedAt, setSemesterSelectionModifiedAt] = useState(0);

  // ---- Noms des périodes pour affichage ---- (Ajoutés/Complétés)
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const quarterNames = ["T1", "T2", "T3", "T4"];
  const semesterNames = ["S1", "S2"];

  // ---- NOUVEAU : Catégories SLA ----
  const slaCategories = ["Respecte SLA", "Dépasse SLA"];

  // Récupération du filtre global (conservée)
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // --- Fonction pour obtenir les périodes disponibles --- (Adaptée de la référence)
  const getAvailablePeriodsForYear = useCallback((year, mode) => {
    if (!year || !data || data.length === 0) return [];
    const filteredByYear = data.filter((t) => {
      const d = new Date(t[dateField]);
      return !isNaN(d.getTime()) && d.getFullYear() === year;
    });
    if (filteredByYear.length === 0) return [];
    let periodsSet;
    try {
      if (mode === "week") periodsSet = new Set(filteredByYear.map(t => { const w = t[weekField]; const d = new Date(t[dateField]); return !isNaN(Number(w)) ? Number(w) : (!isNaN(d.getTime()) ? getWeekNumber(d) : null); }).filter(w => w !== null && !isNaN(w)));
      else if (mode === "month") periodsSet = new Set(filteredByYear.map(t => { const d = new Date(t[dateField]); return !isNaN(d.getTime()) ? d.getMonth() + 1 : null; }).filter(m => m !== null));
      // ---- NOUVEAU ----
      else if (mode === "quarter") periodsSet = new Set(filteredByYear.map(t => getQuarter(new Date(t[dateField]))).filter(q => q !== null));
      else if (mode === "semester") periodsSet = new Set(filteredByYear.map(t => getSemester(new Date(t[dateField]))).filter(s => s !== null));
      else return [];
    } catch (e) { console.error("Erreur calcul périodes:", e); return []; }
    return periodsSet ? Array.from(periodsSet).sort((a, b) => a - b) : [];
  }, [data, dateField, weekField]); // Dépend de data et des props de champ


  // --- Fonction pour appliquer le filtre global --- (Adaptée de la référence)
  const applyGlobalFilter = useCallback(() => {
    if (!globalStartDate || !globalEndDate || isNaN(globalStartDate.getTime()) || isNaN(globalEndDate.getTime()) || !data || data.length === 0) return; // Added checks
    const currentGlobalYear = globalStartDate.getFullYear();
    const localAvailableYears = availableYears.length > 0 ? availableYears : [...new Set(data.map(t => { const d = new Date(t[dateField]); return !isNaN(d.getTime()) ? d.getFullYear() : null; }).filter(y => y !== null))]; // Added checks for date

    if (!localAvailableYears.includes(currentGlobalYear)) {
      console.warn(`Année ${currentGlobalYear} du filtre global non trouvée dans les données de ${title}. Filtre global ignoré pour ce composant.`);
      return; // Ne pas appliquer si l'année n'est pas dispo
    }
    setSelectedYear(currentGlobalYear);

    const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
    const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
    // ---- NOUVEAU ----
    const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate);
    const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate);

    const availableWeeks = getAvailablePeriodsForYear(currentGlobalYear, "week");
    const availableMonths = getAvailablePeriodsForYear(currentGlobalYear, "month");
    // ---- NOUVEAU ----
    const availableQuarters = getAvailablePeriodsForYear(currentGlobalYear, "quarter");
    const availableSemesters = getAvailablePeriodsForYear(currentGlobalYear, "semester");

    const finalWeekValues = weekList.filter(p => availableWeeks.includes(p));
    const finalMonthValues = monthList.filter(p => availableMonths.includes(p));
    // ---- NOUVEAU ----
    const finalQuarterValues = quarterList.filter(p => availableQuarters.includes(p));
    const finalSemesterValues = semesterList.filter(p => availableSemesters.includes(p));

    // Mettre à jour TOUTES les sélections mémorisées
    setWeekViewSelection({ values: finalWeekValues, year: currentGlobalYear });
    setMonthViewSelection({ values: finalMonthValues, year: currentGlobalYear });
    setQuarterViewSelection({ values: finalQuarterValues, year: currentGlobalYear });
    setSemesterViewSelection({ values: finalSemesterValues, year: currentGlobalYear });

    // Appliquer la sélection au mode de vue actuel
    let currentSelection = [];
    if (viewMode === "week") currentSelection = finalWeekValues;
    else if (viewMode === "month") currentSelection = finalMonthValues;
    else if (viewMode === "quarter") currentSelection = finalQuarterValues;
    else if (viewMode === "semester") currentSelection = finalSemesterValues;

    setSelectedValues(currentSelection);
    setHasGlobalFilter(true); // Indiquer que le filtre global est appliqué
    globalFilterApplied.current = true; // Pour l'état initial

    // Le retraitement des données sera déclenché par le changement de selectedYear/selectedValues via l'autre useEffect
  }, [globalStartDate, globalEndDate, data, viewMode, availableYears, getAvailablePeriodsForYear, dateField, title]); // Ajout de dateField, title pour le warning


  // --- UseEffects ---

  // Clics extérieurs (conservé)
  useEffect(() => {
    function handleClickOutside(event) { if (isOpen && filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest('button[data-filter-toggle]')) setIsOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Chargement initial (Adapté de la référence)
  useEffect(() => {
    let isMounted = true;
    async function fetchDataInternal() {
      if (!isMounted) return;
      setLoading(true);
      globalFilterApplied.current = false; // Reset flag
      try {
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        
        // ---- NOUVEAU : Filtrer les tickets qui ont delai_jour et sont des clients coupés ----
        const filteredResult = result.filter(ticket => 
          ticket.delai_jour !== undefined && 
          ticket.delai_jour !== null && 
          ticket[filterField] === filterValue
        );
        
        if (isMounted) {
          setData(filteredResult); // Mettre à jour data d'abord

          const years = [...new Set(filteredResult.map(t => { const d = new Date(t[dateField]); return !isNaN(d.getTime()) ? d.getFullYear() : null; }).filter(y => y !== null))].sort((a, b) => a - b); // Added checks for date
          const latestYear = years.length > 0 ? years[years.length - 1] : new Date().getFullYear();
          setAvailableYears(years); // Mettre à jour les années disponibles
          setMultipleYearsExist(years.length > 1);

          let yearToUse = selectedYear || latestYear;
          let applyGlobalOnLoad = false;
          let performDefaultSetup = !initializationCompleted.current;

          // Décider s'il faut appliquer le filtre global ou la config par défaut
          if (performDefaultSetup && globalStartDate && globalEndDate && !isNaN(globalStartDate.getTime()) && !isNaN(globalEndDate.getTime()) && years.includes(globalStartDate.getFullYear())) { // Added checks
            // Comparer la date de modif globale aux dates locales (toutes vues)
            const lastLocalMod = Math.max(
              weekSelectionModifiedAt,
              monthSelectionModifiedAt,
              quarterSelectionModifiedAt, // Inclure Q/S
              semesterSelectionModifiedAt // Inclure Q/S
            );
            if (globalModifiedAt > lastLocalMod || lastLocalMod === 0) {
              applyGlobalOnLoad = true;
              yearToUse = globalStartDate.getFullYear();
              performDefaultSetup = false; // Ne pas faire le setup par défaut si on applique le global
            }
          }

          if (applyGlobalOnLoad) {
            setSelectedYear(yearToUse);
            setHasGlobalFilter(true); // Important pour que le useEffect suivant applique correctement

          } else if (performDefaultSetup) {
            // Setup par défaut si pas de filtre global prioritaire
            if (!selectedYear) setSelectedYear(yearToUse); else yearToUse = selectedYear; // Confirmer l'année à utiliser

            // Note: getAvailablePeriodsForYear dépend maintenant de 'data'
            const availablePeriods = getAvailablePeriodsForYear(yearToUse, viewMode); // Utiliser viewMode initial
            const lastPeriods = availablePeriods.slice(-defaultNumPeriods);
            setSelectedValues(lastPeriods);

            // Mise à jour de la sélection mémorisée pour la vue initiale
            if (viewMode === "week") setWeekViewSelection({ values: lastPeriods, year: yearToUse });
            else if (viewMode === "month") setMonthViewSelection({ values: lastPeriods, year: yearToUse });
            else if (viewMode === "quarter") setQuarterViewSelection({ values: lastPeriods, year: yearToUse });
            else if (viewMode === "semester") setSemesterViewSelection({ values: lastPeriods, year: yearToUse });

            initializationCompleted.current = true;
            setHasGlobalFilter(false); // Pas de filtre global appliqué par défaut
          } else {
            // Si ce n'est ni l'initialisation, ni une application globale prioritaire,
            // on s'assure que l'année est bien celle sélectionnée (ou la dernière si null)
            if (!selectedYear && latestYear) setSelectedYear(latestYear);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error(`Erreur fetch pour ${title}:`, error);
        if (isMounted) { setData([]); setLoading(false); }
      }
    }
    fetchDataInternal();
    return () => { isMounted = false; };
  }, [apiUrl, dateField, weekField, defaultNumPeriods, defaultViewMode, title, filterField, filterValue]); // Ajout filterField, filterValue


  // Application du filtre global si changé après l'init (Adapté de la référence)
  useEffect(() => {
    let isMounted = true;
    // S'exécute seulement si l'initialisation est terminée et qu'on a des données
    if (initializationCompleted.current && data.length > 0 && globalStartDate && globalEndDate && globalModifiedAt > 0) { // Added checks
      const lastLocalMod = Math.max(
        weekSelectionModifiedAt,
        monthSelectionModifiedAt,
        quarterSelectionModifiedAt, // Inclure Q/S
        semesterSelectionModifiedAt // Inclure Q/S
      );
      // Appliquer si le filtre global est plus récent que la dernière modif locale
      if (globalModifiedAt > lastLocalMod) {
        if (isMounted) {
          console.log(`Appliying global filter update for ${title}`);
          applyGlobalFilter();
        }
      }
    }
    return () => { isMounted = false; };
  }, [globalStartDate, globalEndDate, globalModifiedAt, data, applyGlobalFilter, title]); // applyGlobalFilter, title ajoutés aux dépendances

  // Sauvegarde/restauration lors du changement de vue (Adapté de la référence)
  useEffect(() => {
    // Ne rien faire si l'initialisation n'est pas finie ou si l'année n'est pas encore définie
    if (!initializationCompleted.current || !selectedYear) {
      prevViewMode.current = viewMode; // Mettre à jour même si on ne fait rien d'autre
      return;
    }

    const previousMode = prevViewMode.current;

    // Sauvegarde de l'état de la vue précédente (si elle existait)
    if (previousMode && previousMode !== viewMode) { // Sauvegarder seulement si le mode a changé
      if (previousMode === "week") setWeekViewSelection({ values: selectedValues, year: selectedYear });
      else if (previousMode === "month") setMonthViewSelection({ values: selectedValues, year: selectedYear });
      // ---- NOUVEAU ----
      else if (previousMode === "quarter") setQuarterViewSelection({ values: selectedValues, year: selectedYear });
      else if (previousMode === "semester") setSemesterViewSelection({ values: selectedValues, year: selectedYear });
    }

    // Restauration de l'état pour la nouvelle vue
    let selectionToRestore = { values: [], year: selectedYear };
    if (viewMode === "week") selectionToRestore = weekViewSelection;
    else if (viewMode === "month") selectionToRestore = monthViewSelection;
    // ---- NOUVEAU ----
    else if (viewMode === "quarter") selectionToRestore = quarterViewSelection;
    else if (viewMode === "semester") selectionToRestore = semesterViewSelection;

    // Récupérer les périodes disponibles pour l'année et le mode actuels
    const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode);
    let valuesToSet;

    // Priorité : Filtre global si actif et l'année correspond
    if (hasGlobalFilter && globalStartDate && globalEndDate && selectedYear === globalStartDate.getFullYear()) {
      let globalPeriods = [];
      if (viewMode === "week") globalPeriods = getAllWeeksBetween(globalStartDate, globalEndDate);
      else if (viewMode === "month") globalPeriods = getAllMonthsBetween(globalStartDate, globalEndDate);
      else if (viewMode === "quarter") globalPeriods = getAllQuartersBetween(globalStartDate, globalEndDate);
      else if (viewMode === "semester") globalPeriods = getAllSemestersBetween(globalStartDate, globalEndDate);
      // Filtrer les périodes globales par celles qui sont réellement disponibles
      valuesToSet = globalPeriods.filter(p => availablePeriods.includes(p));
    }
    // Sinon, utiliser la sélection mémorisée si elle correspond à l'année
    else if (selectionToRestore.year === selectedYear && selectionToRestore.values.length > 0) {
      // Filtrer les valeurs mémorisées par celles qui sont disponibles
      const validValues = selectionToRestore.values.filter(v => availablePeriods.includes(v));
      // Si on a des valeurs valides, les utiliser, sinon prendre les dernières par défaut
      valuesToSet = validValues.length > 0 ? validValues : availablePeriods.slice(-defaultNumPeriods);
    }
    // Sinon (pas de filtre global, pas de sélection mémorisée valide), prendre les dernières périodes par défaut
    else {
      valuesToSet = availablePeriods.slice(-defaultNumPeriods);
      // Si on arrive ici, c'est qu'on n'utilise ni le filtre global, ni une sélection mémorisée
      setHasGlobalFilter(false); // S'assurer que le flag est bien à false
    }

    setSelectedValues(valuesToSet);
    prevViewMode.current = viewMode; // Mettre à jour la référence de la vue précédente

  }, [
    viewMode, selectedYear, getAvailablePeriodsForYear, defaultNumPeriods, hasGlobalFilter, globalStartDate, globalEndDate, // Ajout dépendances filtre global
    weekViewSelection, monthViewSelection, quarterViewSelection, semesterViewSelection // Ajout des sélections mémorisées
  ]);


  // --- Fonctions de gestion des filtres ---

  // Gestion changement de sélection de période (Adaptée)
  const handleSelectionChange = (value) => {
    const newSelectedValues = selectedValues.includes(value) ? selectedValues.filter(v => v !== value) : [...selectedValues, value].sort((a, b) => a - b); // Tri ajouté
    setSelectedValues(newSelectedValues);
    const now = Date.now();
    // Mettre à jour la bonne sélection mémorisée et son timestamp
    if (viewMode === "week") { setWeekViewSelection({ values: newSelectedValues, year: selectedYear }); setWeekSelectionModifiedAt(now); }
    else if (viewMode === "month") { setMonthViewSelection({ values: newSelectedValues, year: selectedYear }); setMonthSelectionModifiedAt(now); }
    // ---- NOUVEAU ----
    else if (viewMode === "quarter") { setQuarterViewSelection({ values: newSelectedValues, year: selectedYear }); setQuarterSelectionModifiedAt(now); }
    else if (viewMode === "semester") { setSemesterViewSelection({ values: newSelectedValues, year: selectedYear }); setSemesterSelectionModifiedAt(now); }
    setHasGlobalFilter(false); // Toute sélection manuelle désactive le flag du filtre global
  };

  // Sélectionner/Désélectionner tout (Adaptée)
  const toggleSelectAll = () => {
    const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode);
    const allSelected = availablePeriods.length > 0 && availablePeriods.every(p => selectedValues.includes(p));
    const newSelectedValues = allSelected ? [] : [...availablePeriods].sort((a, b) => a - b); // Tri ajouté
    setSelectedValues(newSelectedValues);
    const now = Date.now();
    // Mettre à jour la bonne sélection mémorisée et son timestamp
    if (viewMode === "week") { setWeekViewSelection({ values: newSelectedValues, year: selectedYear }); setWeekSelectionModifiedAt(now); }
    else if (viewMode === "month") { setMonthViewSelection({ values: newSelectedValues, year: selectedYear }); setMonthSelectionModifiedAt(now); }
    // ---- NOUVEAU ----
    else if (viewMode === "quarter") { setQuarterViewSelection({ values: newSelectedValues, year: selectedYear }); setQuarterSelectionModifiedAt(now); }
    else if (viewMode === "semester") { setSemesterViewSelection({ values: newSelectedValues, year: selectedYear }); setSemesterSelectionModifiedAt(now); }
    setHasGlobalFilter(false); // Désactive le flag du filtre global
  };

  // Gestion changement d'année (Adaptée)
  const handleYearChange = (year) => {
    if (year === selectedYear) return;
    setSelectedYear(year); // Met à jour l'année, ce qui déclenchera l'effet [viewMode, selectedYear] pour ajuster les selectedValues
    // La logique de restauration/calcul des selectedValues est maintenant dans l'effet [viewMode, selectedYear]
    // On s'assure juste ici que si le filtre global était actif, il le reste s'il correspond à la nouvelle année.
    if (hasGlobalFilter && globalStartDate && globalStartDate.getFullYear() !== year) {
      // Si le filtre global était actif mais ne correspond plus à la nouvelle année, on le désactive pour cette année
      setHasGlobalFilter(false);
    } else if (!hasGlobalFilter && globalStartDate && globalStartDate.getFullYear() === year && globalModifiedAt > 0) {
      // Si le filtre global n'était pas actif, mais qu'il correspond à la nouvelle année sélectionnée et est valide
      // On le réactive potentiellement (l'effet [globalModifiedAt] le fera si nécessaire)
      // On peut forcer ici si on veut être sûr.
      const lastLocalMod = Math.max(weekSelectionModifiedAt, monthSelectionModifiedAt, quarterSelectionModifiedAt, semesterSelectionModifiedAt);
      if (globalModifiedAt > lastLocalMod) {
        setHasGlobalFilter(true); // Force le flag si le global est plus récent
      }
    }
    // L'effet [viewMode, selectedYear] s'occupera de mettre à jour selectedValues
  };

  // Gestion changement de mode de vue (Adaptée)
  const handleViewModeChange = (newMode) => {
    if (newMode !== viewMode) {
      // Sauvegarde explicite de l'état actuel AVANT de changer viewMode
      // (L'effet [viewMode] ne le ferait qu'après le re-render)
      const currentSelection = { values: selectedValues, year: selectedYear };
      if (viewMode === "week") setWeekViewSelection(currentSelection);
      else if (viewMode === "month") setMonthViewSelection(currentSelection);
      else if (viewMode === "quarter") setQuarterViewSelection(currentSelection);
      else if (viewMode === "semester") setSemesterViewSelection(currentSelection);

      setViewMode(newMode);
      // L'effet [viewMode, selectedYear] s'occupera de restaurer/calculer les selectedValues pour newMode
    }
  };

  // --- Préparation des données pour le graphique ---

  // Fonction pour obtenir la période d'un ticket selon le viewMode (Ajoutée de la référence)
  const getTicketPeriod = useCallback((ticket) => {
    const ticketDate = new Date(ticket[dateField]);
    if (isNaN(ticketDate.getTime())) return null;

    if (viewMode === "week") {
      // Prioriser le champ 'weekField' s'il existe et est valide, sinon calculer la semaine
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

  // Filtrer les tickets pour l'année sélectionnée (Conservé mais utilise dateField)
  const ticketsForYear = data.filter(t => {
    const d = new Date(t[dateField]);
    return !isNaN(d.getTime()) && d.getFullYear() === selectedYear;
  });

  // Filtrer les tickets selon les périodes sélectionnées (utilise getTicketPeriod)
  const filteredDataForSelectedPeriods = ticketsForYear.filter(ticket => {
    const period = getTicketPeriod(ticket);
    return period !== null && selectedValues.includes(period);
  });

  // Création des labels pour le graphique (Adaptée pour Q/S)
  // On s'assure que les selectedValues sont triées pour l'affichage
  const sortedSelectedValues = [...selectedValues].sort((a, b) => a - b);

  const labels = sortedSelectedValues.map(value => {
    let periodLabel = String(value);
    try {
      if (viewMode === "week") periodLabel = `S${value}`;
      else if (viewMode === "month") periodLabel = monthNames[value - 1] || `Mois ${value}`;
      // ---- NOUVEAU ----
      else if (viewMode === "quarter") periodLabel = quarterNames[value - 1] || `Trim. ${value}`;
      else if (viewMode === "semester") periodLabel = semesterNames[value - 1] || `Sem. ${value}`;
    } catch (e) { console.error("Label error", e); }
    // Afficher l'année seulement si plusieurs années existent
    return multipleYearsExist ? `${periodLabel}, ${selectedYear}` : periodLabel;
  });

  // ---- NOUVEAU : Création des datasets pour stacked bar chart ----
  const datasets = slaCategories.map(category => ({
    label: category,
    data: sortedSelectedValues.map(periodValue => {
      return filteredDataForSelectedPeriods.filter(ticket => {
        const ticketPeriod = getTicketPeriod(ticket);
        
        // Vérifier que le ticket correspond à la période
        if (ticketPeriod !== periodValue) return false;
        
        // Calculer les jours ouvrables en utilisant delai_jour
        const businessDays = getBusinessDaysDifference(
          ticket.date_derniere_maj, 
          ticket.date_sortie, 
          ticket.delai_jour
        );
        
        // Catégoriser selon SLA
        const slaCategory = categorizeBySLA(businessDays);
        
        return slaCategory === category;
      }).length;
    }),
    backgroundColor: category === "Respecte SLA" ? "#17e339" : "#f54c4c", // Bleu foncé pour "Respecte SLA", bleu ciel pour "Dépasse SLA"
    borderRadius: 5,
    stack: "stack1", // Même stack pour empiler
    // Configuration des datalabels pour chaque dataset
    datalabels: {
      anchor: 'center',
      align: 'center',
      color: "white",
      font: { size: 14, weight: 'bold' },
      formatter: value => value > 0 ? value : "",
    }
  }));

  // Données du graphique (Structure stacked bar chart)
  const chartData = {
    labels,
    datasets,
  };

  // Texte descriptif de la période sélectionnée (Adapté pour Q/S)
  const periodeLabelText = sortedSelectedValues.length > 0
    ? viewMode === "week"
      ? `Semaine(s) : ${sortedSelectedValues.join(", ")}`
      : viewMode === "month"
        ? `Mois : ${sortedSelectedValues.map(m => monthNames[m - 1] || m).join(", ")}`
        : viewMode === "quarter"
          ? `Trimestre(s) : ${sortedSelectedValues.map(q => quarterNames[q - 1] || q).join(", ")}`
          : `Semestre(s) : ${sortedSelectedValues.map(s => semesterNames[s - 1] || s).join(", ")}`
    : "Aucune période sélectionnée";

  // ---- NOUVEAU : Options du graphique pour stacked bar chart ----
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Important pour le modal et le flex container
    animation: {
      duration: 500,
      easing: "easeOutQuart"
    },
    plugins: {
      legend: { 
        display: true,
        position: 'top'
      }, // Légende activée pour montrer les deux catégories
      // Désactiver les datalabels globaux car configurés par dataset
      datalabels: { display: true },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      x: {
        stacked: true, // ---- NOUVEAU : Empilage activé ----
        ticks: { color: "black" },
        title: {
          display: true,
          text: viewMode === "week" ? "Semaines" : viewMode === "month" ? "Mois" : viewMode === 'quarter' ? 'Trimestres' : 'Semestres',
          color: "black"
        }
      },
      y: {
        stacked: true, // ---- NOUVEAU : Empilage activé ----
        beginAtZero: true,
        ticks: { color: "black" },
        title: {
          display: true,
          text: yAxisLabel, // Utilise la prop
          color: "black"
        },
        // ---- NOUVEAU : Ajouter de l'espace en haut de l'axe Y ----
        grace: '10%' // Ajoute 10% d'espace au-dessus de la valeur max
      },
    }
  };

  // --- Rendu JSX ---
  if (loading) {
    return (<div className="visualisation relative" data-id={id}><div className="relative bg-white p-5 shadow-md rounded-lg w-full h-[450px] flex justify-center items-center"><p className="text-center text-gray-500">Chargement des données...</p></div></div>);
  }

  // Périodes disponibles pour l'affichage dans le filtre
  const availablePeriodsForFilter = getAvailablePeriodsForYear(selectedYear, viewMode);
  const allPeriodsForFilterSelected = availablePeriodsForFilter.length > 0 && availablePeriodsForFilter.every((p) => selectedValues.includes(p));

  // ---- NOUVEAU : Vérifier s'il y a des données à afficher ----
  const hasDataToDisplay = datasets.some(dataset => dataset.data.some(value => value > 0));

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
          <div className="flex gap-2">
            {/* Bouton Filtre (ajout no-export) */}
            <button
              className="no-export bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
              onClick={() => setIsOpen(!isOpen)}
              data-filter-toggle="true"
            >
              <AiOutlineFilter size={20} className="text-gray-600" />
            </button>

            {/* Bouton Commentaires (ajout no-export) */}
            <div className="no-export">
              <CommentButton
                containerRef={chartContainerRef}
                comments={annotations}
                onAddComment={(c) => setAnnotations([...annotations, c])}
                onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))}
                onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))}
              />
            </div>

            {/* Bouton Agrandir (ajout no-export) */}
            <button
              className="no-export bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
              onClick={() => setModalIsOpen(true)}
            >
              <FaExpand size={18} className="text-gray-600" />
            </button>
          </div>
          {/* Panneau de filtre (Adapté) */}
          {isOpen && (
            <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
              <h4 className="font-semibold text-gray-500 mb-2">Filtrer par :</h4>
              {/* ---- MODIFIÉ : Ajout Trimestre/Semestre aux boutons ---- */}
              <div className="flex space-x-2 mb-3 flex-wrap">
                <button className={`px-3 py-1 rounded-md text-sm mb-1 ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`} onClick={() => handleViewModeChange("week")}>Semaine</button>
                <button className={`px-3 py-1 rounded-md text-sm mb-1 ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`} onClick={() => handleViewModeChange("month")}>Mois</button>
                <button className={`px-3 py-1 rounded-md text-sm mb-1 ${viewMode === "quarter" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`} onClick={() => handleViewModeChange("quarter")}>Trimestre</button>
                <button className={`px-3 py-1 rounded-md text-sm mb-1 ${viewMode === "semester" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`} onClick={() => handleViewModeChange("semester")}>Semestre</button>
              </div>
              {/* Sélection Année (conservée) */}
              {multipleYearsExist && (
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-gray-500 mb-1">Années :</h5>
                  <div className="flex flex-wrap gap-1">
                    {availableYears.map((year) => (<button key={year} onClick={() => handleYearChange(year)} className={`px-2 py-1 text-xs rounded-md ${selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>{year}</button>))}
                  </div>
                </div>
              )}
              {/* Bouton Tout Sélectionner (conservé) */}
              <div className="mb-2">
                <button onClick={toggleSelectAll} className={`text-xs px-2 py-1 rounded-md w-full ${allPeriodsForFilterSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}>
                  {allPeriodsForFilterSelected ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
              {/* Liste des périodes (Adaptée pour labels Q/S) */}
              <div className="max-h-32 overflow-y-auto border p-2 rounded-md text-sm">
                {availablePeriodsForFilter.length > 0 ? availablePeriodsForFilter.map((value) => (
                  <div key={value} className="flex items-center space-x-2 my-1">
                    <input
                      type="checkbox"
                      id={`period-${value}-${viewMode}`}
                      checked={selectedValues.includes(value)}
                      onChange={() => handleSelectionChange(value)}
                      className="cursor-pointer" />
                    <label htmlFor={`period-${value}-${viewMode}`} className="text-gray-600 cursor-pointer select-none">
                      {/* ---- MODIFIÉ : Affichage dynamique des labels ---- */}
                      {viewMode === "week" ? `S${value}` : viewMode === "month" ? monthNames[value - 1] || `Mois ${value}` : viewMode === "quarter" ? quarterNames[value - 1] || `Trim. ${value}` : viewMode === "semester" ? semesterNames[value - 1] || `Sem. ${value}` : value}
                    </label>
                  </div>
                )) : (
                  <p className="text-xs text-gray-400 text-center italic py-2">Aucune période disponible pour {selectedYear}</p> // Message si vide
                )}
              </div>
            </div>
          )}
        </div>

        {/* Conteneur Graphique Principal */}
        {/* ---- MODIFIÉ : Ajout ref et hauteur flexible ---- */}
        <div className="flex-grow flex justify-center items-center w-full min-h-[300px] h-[350px]" ref={chartContainerRef}>
          {hasDataToDisplay ? ( // ---- NOUVEAU : Vérifier s'il y a des données ----
            <Bar
              data={chartData}
              options={chartOptions}
              plugins={[ChartDataLabels]}
            />
          ) : (
            <p className="text-gray-500 italic">Aucune donnée à afficher pour la sélection actuelle.</p>
          )}
        </div>
      </div>

      {/* Modal (Adapté pour ref et CommentButton caché) */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50" // Centrage
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
        contentLabel={`Modal ${title}`} // Label dynamique
      >
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col"> {/* Taille + scroll */}
          {/* Header du Modal */}
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div>
              <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedYear && `Année : ${selectedYear} - `}{periodeLabelText}
              </p>
            </div>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-red-100 transition-colors">❌</button> {/* Bouton fermer amélioré */}
          </div>
          {/* Conteneur Graphique Modal */}
          {/* ---- MODIFIÉ : Ajout ref, CommentButton caché et taille min/flexible ---- */}
          <div className="relative flex-grow min-h-[400px] flex items-center justify-center" ref={modalChartContainerRef}>
            {hasDataToDisplay ? (
              <Bar
                data={chartData}
                // Passer les options, mais s'assurer que maintainAspectRatio est false pour le modal
                options={{ ...chartOptions, maintainAspectRatio: false }}
                plugins={[ChartDataLabels]}
              />
            ) : (
              <p className="text-gray-500 italic">Aucune donnée à afficher.</p>
            )}
            {/* ---- NOUVEAU : CommentButton caché pour le modal ---- */}
            <CommentButton
              containerRef={modalChartContainerRef} // Ref du conteneur modal
              hideButton={true} // Cacher le bouton d'ajout/liste
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