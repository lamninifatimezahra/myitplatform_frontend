"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react"; // <-- Ajout de useMemo ici
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
import CommentButton from "./CommentButton"; // Assurez-vous que le chemin est correct

if (typeof window !== "undefined") Modal.setAppElement(document.body);

// =========================================
// Fonctions Utilitaires
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
  return `${day}/${month}${week ? ` (S${week})` : ''}`; // Affiche semaine seulement si calculable
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
  // Assurer que l'heure est à minuit pour éviter les problèmes de comparaison
  currentDate.setHours(0, 0, 0, 0);
  const finalEndDate = new Date(endDate);
  finalEndDate.setHours(0, 0, 0, 0);

  while (currentDate <= finalEndDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateString = getLocalDateString(currentDate);
      if (dateString) { // Vérifier si la conversion a réussi
          daysArray.push(dateString);
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return daysArray;
}

function getAllWeeksBetween(startDate, endDate) {
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
    const weeksArray = new Set(); // Utiliser un Set pour éviter les doublons dès le départ
    const startWeek = getWeekNumber(startDate);
    const endWeek = getWeekNumber(endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    if (startWeek === null || endWeek === null) return [];

    for (let year = startYear; year <= endYear; year++) {
        const tempStart = (year === startYear) ? startDate : new Date(year, 0, 1);
        const tempEnd = (year === endYear) ? endDate : new Date(year, 11, 31);

        let currentWeekDate = new Date(tempStart);
        currentWeekDate.setDate(currentWeekDate.getDate() - currentWeekDate.getDay() + 1); // Aller au Lundi de la semaine de début

        while (currentWeekDate <= tempEnd) {
             const weekNum = getWeekNumber(currentWeekDate);
             const weekYear = currentWeekDate.getUTCFullYear(); // ISO week year might differ near year end/start
             const isoWeekYear = new Date(Date.UTC(currentWeekDate.getFullYear(), currentWeekDate.getMonth(), currentWeekDate.getDate() + 4 - (currentWeekDate.getDay() || 7))).getUTCFullYear();


             // On ne prend que les semaines qui appartiennent à l'année en cours (selon la norme ISO 8601)
             // Et qui sont dans l'intervalle global
             if (weekNum !== null && isoWeekYear === year) {
                 // Vérifier si cette semaine est comprise dans l'intervalle global
                 // (plus complexe, pour simplifier on prend toutes les semaines entre startWeek/Year et endWeek/Year)
                 const isInGlobalRange =
                     (year > startYear || (year === startYear && weekNum >= startWeek)) &&
                     (year < endYear || (year === endYear && weekNum <= endWeek));

                 if(isInGlobalRange){
                      weeksArray.add(weekNum);
                 }

             }
             // Passer à la semaine suivante
             currentWeekDate.setDate(currentWeekDate.getDate() + 7);
        }
    }
    return Array.from(weeksArray).sort((a, b) => a - b);
}


function getAllMonthsBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
  const monthsArray = new Set();
  const startMonth = startDate.getMonth(); // 0-indexed
  const endMonth = endDate.getMonth(); // 0-indexed
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    const currentStartMonth = (year === startYear) ? startMonth : 0;
    const currentEndMonth = (year === endYear) ? endMonth : 11;
    for (let month = currentStartMonth; month <= currentEndMonth; month++) {
      monthsArray.add(month + 1); // Store 1-indexed month
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
    .sort((a, b) => b.date - a.date) // Sort descending first to easily get the last N
    .slice(0, n)
    .sort((a, b) => a.date - b.date) // Sort ascending for display
    .map(item => item.str);
  return filteredDays;
}

ChartJS.register(
  BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend, ChartDataLabels
);

// =========================================
// Composant GroupedBarChart
// =========================================
export default function GroupedBarChart({
  apiUrl,
  id = "Rapport : Sortants/Entrants",
  chartTitle = "Tickets Entrants vs. Sortants",
  dateUpdateField = "date_derniere_maj",
  weekField = "semaine", // Champ semaine pour entrants
  dateClosedField = "date_sortie",
  weekClosedField = "semaine_date_sortant", // Champ semaine pour sortants
  defaultViewMode = "day",
  defaultNumPeriods = 5,
}) {
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

  // Références
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);
  const prevViewMode = useRef(defaultViewMode); // Initialiser avec defaultViewMode
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);

  // États locaux
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [selectedDates, setSelectedDates] = useState([null, null]);
  const [selectedValues, setSelectedValues] = useState([]); // Contient jours (string "YYYY-MM-DD") ou numéros (week, month, etc.)
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
  const monthNames = [ "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre" ];
  const quarterNames = ["T1", "T2", "T3", "T4"];
  const semesterNames = ["S1", "S2"];

  // --- Fonction pour obtenir les périodes disponibles pour une année/mode (AMÉLIORÉE) ---
  const getAvailablePeriodsForYear = useCallback((year, mode) => {
      if (!year || !data || data.length === 0 || mode === "day") return [];

      const periodsSet = new Set();

      data.forEach(t => {
          // Vérifier la date d'update
          const dUpdate = parseLocalDate(t[dateUpdateField]?.split("T")[0]);
          if (dUpdate && dUpdate.getFullYear() === year) {
              let periodUpdate = null;
              if (mode === "week") periodUpdate = Number(t[weekField]) || getWeekNumber(dUpdate);
              else if (mode === "month") periodUpdate = dUpdate.getMonth() + 1;
              else if (mode === "quarter") periodUpdate = getQuarter(dUpdate);
              else if (mode === "semester") periodUpdate = getSemester(dUpdate);
              if (periodUpdate !== null && !isNaN(periodUpdate)) periodsSet.add(periodUpdate);
          }

          // Vérifier la date de sortie
          const dClose = parseLocalDate(t[dateClosedField]?.split("T")[0]);
          if (dClose && dClose.getFullYear() === year) {
              let periodClose = null;
              if (mode === "week") periodClose = Number(t[weekClosedField]) || getWeekNumber(dClose);
              else if (mode === "month") periodClose = dClose.getMonth() + 1;
              else if (mode === "quarter") periodClose = getQuarter(dClose);
              else if (mode === "semester") periodClose = getSemester(dClose);
               if (periodClose !== null && !isNaN(periodClose)) periodsSet.add(periodClose);
          }
      });

      return Array.from(periodsSet).sort((a, b) => a - b);
  }, [data, dateUpdateField, dateClosedField, weekField, weekClosedField]); // Dépendances clés

  // --- Fonction pour appliquer le filtre global ---
  const applyGlobalFilter = useCallback(() => {
      if (!globalStartDate || !globalEndDate || !data || data.length === 0) return;
      const currentGlobalYear = globalStartDate.getFullYear();

      // Calculer les années réellement disponibles dans les données
      const yearsInData = [...new Set(data.flatMap(t => {
          const dUpdate = parseLocalDate(t[dateUpdateField]?.split("T")[0]);
          const dClose = parseLocalDate(t[dateClosedField]?.split("T")[0]);
          return [dUpdate?.getFullYear(), dClose?.getFullYear()];
      }).filter(y => y != null))].sort();

      if (!yearsInData.includes(currentGlobalYear)) {
        console.warn(`Année ${currentGlobalYear} du filtre global non trouvée dans les données pour ce graphique.`);
        // Optionnel: peut-être afficher un message à l'utilisateur ou ne rien faire
        setHasGlobalFilter(false); // Indiquer que le filtre global n'est pas applicable
        return; // Stopper l'application
      }

      // Appliquer pour la vue "day"
      const dayList = getAllWorkingDaysBetween(globalStartDate, globalEndDate);
      setDayViewSelection({ dates: [globalStartDate, globalEndDate], values: dayList });

      // Appliquer pour les autres vues (basé sur l'année du filtre global)
      // Note: On ne change selectedYear que si le filtre global est appliqué
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
        // Ne pas changer selectedYear pour la vue jour
      } else {
          // Changer l'année sélectionnée pour correspondre au filtre global
          setSelectedYear(yearToApply);
          if (viewMode === "week") setSelectedValues(finalWeekValues);
          else if (viewMode === "month") setSelectedValues(finalMonthValues);
          else if (viewMode === "quarter") setSelectedValues(finalQuarterValues);
          else if (viewMode === "semester") setSelectedValues(finalSemesterValues);
      }

      setHasGlobalFilter(true);
      globalFilterApplied.current = true;

  }, [globalStartDate, globalEndDate, data, viewMode, getAvailablePeriodsForYear, dateUpdateField, dateClosedField]); // `viewMode` est une dépendance clé ici

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
            const result = await response.json();
            if (!isMounted) return;

            setData(result);

            const years = [...new Set(result.flatMap(t => {
                const dUpdate = parseLocalDate(t[dateUpdateField]?.split("T")[0]);
                const dClose = parseLocalDate(t[dateClosedField]?.split("T")[0]);
                return [dUpdate?.getFullYear(), dClose?.getFullYear()];
            }).filter(y => y != null))].sort((a, b) => a - b);

            const latestYear = years.length > 0 ? years[years.length - 1] : new Date().getFullYear();
            setAvailableYears(years);
            setMultipleYearsExist(years.length > 1);

            // --- Logique d'initialisation ---
            let yearToUse = selectedYear || latestYear; // Préfère l'année déjà sélectionnée si elle existe
            let applyGlobalOnLoad = false;
            let performDefaultSetup = !initializationCompleted.current;

            // Vérifier si le filtre global doit être appliqué au chargement
             if (performDefaultSetup && globalStartDate && globalEndDate && years.includes(globalStartDate.getFullYear())) {
                 applyGlobalOnLoad = true;
                 yearToUse = globalStartDate.getFullYear(); // L'année sera définie par applyGlobalFilter
                 performDefaultSetup = false;
            }

            // Appliquer le filtre global si nécessaire (dépend de 'data')
            if (applyGlobalOnLoad) {
                // applyGlobalFilter sera appelé via l'effet dépendant de globalModifiedAt
                // pour s'assurer que 'data' est bien dans le scope
            }
            // Sinon, appliquer la configuration par défaut lors de la première initialisation
            else if (performDefaultSetup) {
                 setSelectedYear(yearToUse); // Définir l'année ici pour les vues non-jour

                if (defaultViewMode === "day") {
                    const allDaysWithData = [...new Set(result.map(t => t[dateUpdateField]?.split("T")[0]).filter(Boolean))];
                    const last10Days = getLastNWorkingDays(allDaysWithData, 10); // Utiliser N=10
                    if (last10Days.length > 0) {
                        const startDate = parseLocalDate(last10Days[0]);
                        const endDate = parseLocalDate(last10Days[last10Days.length - 1]);
                        setSelectedDates([startDate, endDate]);
                        setSelectedValues(last10Days);
                        setDayViewSelection({ dates: [startDate, endDate], values: last10Days });
                    } else { // Cas où il n'y a pas de données pour les jours ouvrés
                        setSelectedDates([null, null]);
                        setSelectedValues([]);
                        setDayViewSelection({ dates: [null, null], values: [] });
                    }
                } else {
                    // Pour les autres vues, utiliser getAvailablePeriodsForYear qui dépend de 'data'
                    // et de l'année sélectionnée (yearToUse)
                    const availablePeriods = getAvailablePeriodsForYear(yearToUse, defaultViewMode); // Appel correct
                    const lastPeriods = availablePeriods.slice(-defaultNumPeriods);
                    setSelectedValues(lastPeriods);

                    // Mettre à jour la sélection mémorisée
                    if (defaultViewMode === "week") setWeekViewSelection({ values: lastPeriods, year: yearToUse });
                    else if (defaultViewMode === "month") setMonthViewSelection({ values: lastPeriods, year: yearToUse });
                    else if (defaultViewMode === "quarter") setQuarterViewSelection({ values: lastPeriods, year: yearToUse });
                    else if (defaultViewMode === "semester") setSemesterViewSelection({ values: lastPeriods, year: yearToUse });
                }
                initializationCompleted.current = true;
            }
            setLoading(false);
        } catch (error) {
            console.error("Erreur lors du chargement des données:", error);
            if (isMounted) { setData([]); setLoading(false); }
        }
    }
    fetchDataInternal();
    return () => { isMounted = false; };
  }, [apiUrl, dateUpdateField, dateClosedField, weekField, weekClosedField]); // Retiré defaultViewMode, defaultNumPeriods etc. qui sont gérés par la logique interne

   // Application du filtre global si changé APRÈS l'init ou si données chargées
   useEffect(() => {
       let isMounted = true;
       // Appliquer si filtre global existe, que les données sont chargées, et que l'init est faite
       // Ou si le filtre global change après coup (globalModifiedAt > 0)
       if (initializationCompleted.current && data.length > 0 && globalStartDate && globalEndDate) {
           // Vérifier si l'année du filtre global est présente dans les données
           const globalYear = globalStartDate.getFullYear();
           const yearsInData = availableYears; // Utiliser les années déjà calculées

           if (yearsInData.includes(globalYear)) {
                if (isMounted && !globalFilterApplied.current) { // Appliquer seulement s'il n'a pas déjà été appliqué dans ce cycle
                    applyGlobalFilter();
                }
           } else {
                // Si l'année du filtre global n'est pas dans les données, on ne peut pas l'appliquer
                if(hasGlobalFilter) setHasGlobalFilter(false); // Désactiver le flag si l'année devient invalide
                console.warn(`Filtre global ignoré: l'année ${globalYear} n'est pas dans les données disponibles (${yearsInData.join(', ')}).`);
           }
       }
       // Reset flag after effect runs to allow re-application if global filter changes again
        const timer = setTimeout(() => {
            if (isMounted && globalFilterApplied.current) {
                globalFilterApplied.current = false;
            }
        }, 150); // Slightly longer timeout

       return () => { isMounted = false; clearTimeout(timer);};
   }, [globalStartDate, globalEndDate, globalModifiedAt, data, applyGlobalFilter, availableYears, hasGlobalFilter]); // dépend de data et applyGlobalFilter


  // ---- CORRIGÉ: Gestion du changement de mode et sauvegarde/restauration des sélections ----
  useEffect(() => {
    if (!initializationCompleted.current) {
        prevViewMode.current = viewMode; // Mettre à jour pour le premier changement
        return;
    }
     // S'assurer qu'une année est sélectionnée pour les modes non-journaliers avant de continuer
    if (viewMode !== 'day' && !selectedYear) {
        // Si pas d'année, on ne peut pas restaurer/calculer. On attend qu'elle soit définie.
        // Peut arriver si l'initialisation sélectionne une année après ce hook.
        console.warn("useEffect [viewMode]: selectedYear is null for non-day view. Waiting.");
        prevViewMode.current = viewMode;
        return;
    }

    const previousMode = prevViewMode.current;

    // --- 1. Sauvegarde (si le mode a changé) ---
    if (previousMode && previousMode !== viewMode) {
      const yearToSave = (previousMode !== 'day') ? selectedYear : null;
      if (previousMode === "day") setDayViewSelection({ dates: selectedDates, values: selectedValues });
      else if (previousMode === "week") setWeekViewSelection({ values: selectedValues, year: yearToSave });
      else if (previousMode === "month") setMonthViewSelection({ values: selectedValues, year: yearToSave });
      else if (previousMode === "quarter") setQuarterViewSelection({ values: selectedValues, year: yearToSave });
      else if (previousMode === "semester") setSemesterViewSelection({ values: selectedValues, year: yearToSave });
    }

    // --- 2. Restauration / Initialisation pour le NOUVEAU mode ---
    let newSelectedValues = [];
    let newSelectedDates = selectedDates; // Garder par défaut

    if (viewMode === "day") {
        if (dayViewSelection.values.length > 0) {
            newSelectedDates = dayViewSelection.dates;
            newSelectedValues = dayViewSelection.values;
        } else {
            // Valeur par défaut si aucune sélection jour n'est mémorisée (ex: 10 derniers jours)
            const allDaysWithData = [...new Set(data.map(t => t[dateUpdateField]?.split("T")[0]).filter(Boolean))];
            const last10Days = getLastNWorkingDays(allDaysWithData, 10);
            if(last10Days.length > 0) {
                newSelectedDates = [parseLocalDate(last10Days[0]), parseLocalDate(last10Days[last10Days.length - 1])];
                newSelectedValues = last10Days;
            } else {
                newSelectedDates = [null, null];
                newSelectedValues = [];
            }
            // Mémoriser cet état par défaut
            // setDayViewSelection({ dates: newSelectedDates, values: newSelectedValues }); // Attention: peut recréer une boucle si mal géré
        }
        // Mettre à jour l'état des dates seulement si nécessaire
        if (newSelectedDates[0]?.getTime() !== selectedDates[0]?.getTime() || newSelectedDates[1]?.getTime() !== selectedDates[1]?.getTime()) {
            setSelectedDates(newSelectedDates);
        }
    } else { // Vues non-journalières
        let selectionToRestore = { values: [], year: null };
        if (viewMode === "week") selectionToRestore = weekViewSelection;
        else if (viewMode === "month") selectionToRestore = monthViewSelection;
        else if (viewMode === "quarter") selectionToRestore = quarterViewSelection;
        else if (viewMode === "semester") selectionToRestore = semesterViewSelection;

        const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode); // Utiliser selectedYear ici

        if (selectionToRestore.year === selectedYear && selectionToRestore.values.length > 0) {
            const validValues = selectionToRestore.values.filter(v => availablePeriods.includes(v));
            newSelectedValues = validValues.length > 0 ? validValues : availablePeriods.slice(-defaultNumPeriods);
        } else {
            newSelectedValues = availablePeriods.slice(-defaultNumPeriods);
            // Mettre à jour l'état mémorisé pour la nouvelle vue/année
             const currentYear = selectedYear;
             if (viewMode === "week") setWeekViewSelection({ values: newSelectedValues, year: currentYear });
             else if (viewMode === "month") setMonthViewSelection({ values: newSelectedValues, year: currentYear });
             else if (viewMode === "quarter") setQuarterViewSelection({ values: newSelectedValues, year: currentYear });
             else if (viewMode === "semester") setSemesterViewSelection({ values: newSelectedValues, year: currentYear });
        }
         // Vider selectedDates quand on passe à une vue non-journalière ? Optionnel.
         // if (selectedDates[0] || selectedDates[1]) setSelectedDates([null, null]);
    }

    // --- 3. Appliquer la sélection ---
    // Comparaison prudente pour éviter mise à jour inutile
    const currentSortedJSON = JSON.stringify(selectedValues.slice().sort());
    const newSortedJSON = JSON.stringify(newSelectedValues.slice().sort());
    if (currentSortedJSON !== newSortedJSON) {
        setSelectedValues(newSelectedValues);
    }

    // --- 4. Mettre à jour prevViewMode ---
    prevViewMode.current = viewMode;

  // ---- DÉPENDANCES CORRIGÉES ----
  }, [viewMode, selectedYear, getAvailablePeriodsForYear, defaultNumPeriods, data, dateUpdateField]); // data et dateUpdateField ajoutés car utilisés indirectement via getLastNWorkingDays

  // =========================================
  // Gestionnaires d'événements (Filtres)
  // =========================================

  const handleViewModeChange = (newMode) => {
    if (newMode !== viewMode) {
        setViewMode(newMode);
        setHasGlobalFilter(false); // L'utilisateur interagit localement
        // La logique de changement de sélection est dans l'useEffect [viewMode]
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
       setSelectedValues([]); // Vider si la plage est incomplète/effacée
       setDayViewSelection({ dates: [start, end], values: [] }); // Mémoriser l'état incomplet/vide
       setHasGlobalFilter(false);
    }
  };

  const handleSelectionChange = (value) => {
      if (viewMode === 'day') return; // Normalement pas utilisé en mode jour
      const newSelectedValues = selectedValues.includes(value)
          ? selectedValues.filter(v => v !== value)
          : [...selectedValues, value].sort((a, b) => a - b); // Ajouter et trier
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

    setSelectedYear(year); // Mettre à jour l'année sélectionnée

    // Recalculer les périodes et la sélection pour la nouvelle année
    const newAvailablePeriods = getAvailablePeriodsForYear(year, viewMode);
    let newSelectedValues = [];

    // Priorité au filtre global s'il est actif et correspond à la nouvelle année
    if (hasGlobalFilter && globalStartDate && globalEndDate && globalStartDate.getFullYear() === year) {
        let globalPeriods = [];
        if (viewMode === "week") globalPeriods = getAllWeeksBetween(globalStartDate, globalEndDate);
        else if (viewMode === "month") globalPeriods = getAllMonthsBetween(globalStartDate, globalEndDate);
        else if (viewMode === "quarter") globalPeriods = getAllQuartersBetween(globalStartDate, globalEndDate);
        else if (viewMode === "semester") globalPeriods = getAllSemestersBetween(globalStartDate, globalEndDate);
        newSelectedValues = globalPeriods.filter(p => newAvailablePeriods.includes(p));
    } else {
        // Sinon, essayer de restaurer la sélection mémorisée pour cette vue/année
        let selectionToRestore = { values: [], year: null };
        if (viewMode === "week") selectionToRestore = weekViewSelection;
        else if (viewMode === "month") selectionToRestore = monthViewSelection;
        else if (viewMode === "quarter") selectionToRestore = quarterViewSelection;
        else if (viewMode === "semester") selectionToRestore = semesterViewSelection;

        if (selectionToRestore.year === year && selectionToRestore.values.length > 0) {
             const validValues = selectionToRestore.values.filter(v => newAvailablePeriods.includes(v));
             newSelectedValues = validValues.length > 0 ? validValues : newAvailablePeriods.slice(-defaultNumPeriods);
        } else {
            // Sinon, prendre les dernières par défaut pour la nouvelle année
            newSelectedValues = newAvailablePeriods.slice(-defaultNumPeriods);
        }
        // Si on change d'année manuellement et qu'on n'est pas sur l'année du filtre global, désactiver le flag
        if (!(globalStartDate && globalEndDate && globalStartDate.getFullYear() === year)) {
            setHasGlobalFilter(false);
        }
    }

    setSelectedValues(newSelectedValues);

    // Mettre à jour l'état mémorisé pour la nouvelle année
    if (viewMode === "week") setWeekViewSelection({ values: newSelectedValues, year: year });
    else if (viewMode === "month") setMonthViewSelection({ values: newSelectedValues, year: year });
    else if (viewMode === "quarter") setQuarterViewSelection({ values: newSelectedValues, year: year });
    else if (viewMode === "semester") setSemesterViewSelection({ values: newSelectedValues, year: year });
  };

  // =========================================
  // Préparation des données pour le graphique
  // =========================================

   // Obtenir les périodes disponibles pour le sélecteur dans le filtre
  const availablePeriodsForFilter = viewMode === 'day'
        ? [] // Pas de liste pour le mode jour (utilise DatePicker)
        : selectedYear ? getAvailablePeriodsForYear(selectedYear, viewMode) : []; // Calculer si année sélectionnée

   // Vérifier si toutes les périodes disponibles (pour la vue/année actuelle) sont sélectionnées
  const allPeriodsForFilterSelected = viewMode !== 'day' && availablePeriodsForFilter.length > 0 &&
    availablePeriodsForFilter.every(period => selectedValues.includes(period));

  // Trier les valeurs sélectionnées pour l'ordre des barres/labels
  const sortedSelectedValues = useMemo(() => { // Utiliser useMemo pour optimiser le tri
    if (!Array.isArray(selectedValues)) return [];
    try {
        if (viewMode === "day") {
            // Trier les chaînes "YYYY-MM-DD"
            return selectedValues
                .filter(val => typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}$/)) // Filtrer pour être sûr
                .slice() // Créer une copie
                .sort();
        } else {
            // Trier les numéros
            return selectedValues
                .filter(val => typeof val === "number" || !isNaN(Number(val))) // Filtrer les nombres/chaînes numériques
                .map(val => Number(val)) // Convertir en nombre
                .filter(num => !isNaN(num)) // Filtrer les NaN potentiels après conversion
                .slice() // Créer une copie
                .sort((a, b) => a - b);
        }
    } catch (error) {
        console.error("Error sorting selected values:", error, selectedValues);
        return [];
    }
  }, [selectedValues, viewMode]); // Recalculer seulement si selectedValues ou viewMode change


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
  }), [sortedSelectedValues, viewMode]); // Dépend des valeurs triées et du mode

  // Fonction helper pour obtenir la période d'un ticket (pour vues non-journalières)
  // Utilise useCallback pour éviter redéfinition inutile
  const getTicketPeriod = useCallback((ticket, mode, dateField, weekFieldProp) => {
      if (!ticket || !dateField) return null;
      const dateStr = ticket[dateField]?.split("T")[0];
      const ticketDate = parseLocalDate(dateStr);
      if (!ticketDate || isNaN(ticketDate.getTime())) return null;

      try {
          if (mode === "week") {
              // Essayer le champ semaine dédié d'abord, sinon calculer
              const weekVal = ticket[weekFieldProp];
              return !isNaN(Number(weekVal)) ? Number(weekVal) : getWeekNumber(ticketDate);
          } else if (mode === "month") {
              return ticketDate.getMonth() + 1;
          } else if (mode === "quarter") {
              return getQuarter(ticketDate);
          } else if (mode === "semester") {
              return getSemester(ticketDate);
          }
          return null;
      } catch (e) {
          console.error("Error in getTicketPeriod:", e);
          return null;
      }
  }, []); // Pas de dépendances externes variables

  // Calcul des données pour Entrants et Sortants (Utilisation de useMemo pour optimisation)
  const { entrantsData, sortantsData } = useMemo(() => {
      const entrantCounts = {};
      const sortantCounts = {};

      // Initialiser les compteurs pour les périodes sélectionnées
      sortedSelectedValues.forEach(val => {
          entrantCounts[val] = 0;
          sortantCounts[val] = 0;
      });

      data.forEach(t => {
          // Calcul pour les entrants
          const dateUpdateStr = t[dateUpdateField]?.split("T")[0];
          const dateUpdate = parseLocalDate(dateUpdateStr);
          if (dateUpdate) {
              if (viewMode === "day") {
                  if (sortedSelectedValues.includes(dateUpdateStr)) {
                      entrantCounts[dateUpdateStr]++;
                  }
              } else if (dateUpdate.getFullYear() === selectedYear) {
                  const period = getTicketPeriod(t, viewMode, dateUpdateField, weekField);
                  if (period !== null && sortedSelectedValues.includes(period)) {
                      entrantCounts[period]++;
                  }
              }
          }

          // Calcul pour les sortants
          const dateClosedStr = t[dateClosedField]?.split("T")[0];
          const dateClosed = parseLocalDate(dateClosedStr);
          if (dateClosed) {
              if (viewMode === "day") {
                  if (sortedSelectedValues.includes(dateClosedStr)) {
                      sortantCounts[dateClosedStr]++;
                  }
              } else if (dateClosed.getFullYear() === selectedYear) {
                  const relevantWeekField = viewMode === "week" ? (weekClosedField || weekField) : weekField;
                  const period = getTicketPeriod(t, viewMode, dateClosedField, relevantWeekField);
                  if (period !== null && sortedSelectedValues.includes(period)) {
                      sortantCounts[period]++;
                  }
              }
          }
      });

      // Convertir les objets de comptage en tableaux dans le bon ordre
      const finalEntrantsData = sortedSelectedValues.map(val => entrantCounts[val] || 0);
      const finalSortantsData = sortedSelectedValues.map(val => sortantCounts[val] || 0);

      return { entrantsData: finalEntrantsData, sortantsData: finalSortantsData };

  }, [data, sortedSelectedValues, viewMode, selectedYear, dateUpdateField, dateClosedField, weekField, weekClosedField, getTicketPeriod]); // Dépendances clés


  // Structure des données pour ChartJS
  const chartData = {
    labels,
    datasets: [
      { label: "Entrants", data: entrantsData, backgroundColor: "#68bddd", borderRadius: 6 },
      { label: "Sortants", data: sortantsData, backgroundColor: "#1b2b6b", borderRadius: 6 }
    ]
  };

  // Options du graphique
  const chartOptions = useMemo(() => ({ // useMemo pour les options aussi
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: true,
        color: "#000",
        font: { weight: "bold", size: 10 },
        formatter: val => val > 0 ? val : "",
        anchor: "end",
        align: "top",
        offset: -3
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
       title: { display: false } // Titre externe utilisé
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: viewMode === 'day' ? 45 : 0, minRotation: viewMode === 'day' ? 45 : 0,
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
        beginAtZero: true,
        grid: { drawBorder: false },
        ticks: { precision: 0, padding: 10 },
        title: { display: true, text: 'Nombre de Tickets', font: { size: 12 }, padding: { bottom: 10 },  },grace: '5%'
      }
    },
     layout: { padding: { top: 5, right: 20, bottom: 10, left: 10 } },
     animation: { duration: 300 },
  }), [viewMode, selectedYear]); // Recalculer si viewMode ou selectedYear change (pour les titres d'axe)

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
                           viewMode === "month" ? "" : // Pas de préfixe pour mois (nom complet)
                           viewMode === "quarter" ? "Trim." :
                           viewMode === "semester" ? "Sem." : "Pér.";
             const valuesString = sortedSelectedValues.map(val => {
                  if (viewMode === "month") return monthNames[val - 1] || val;
                  // Ajouter le préfixe pour les autres vues numériques
                  return `${prefix} ${val}`;
             }).join(", ");
             // Gérer le singulier/pluriel pour le titre global
             let titlePrefix = "";
              if (viewMode === "week") titlePrefix = sortedSelectedValues.length > 1 ? "Semaines" : "Semaine";
              else if (viewMode === "month") titlePrefix = sortedSelectedValues.length > 1 ? "Mois" : "Mois"; // Mois reste Mois
              else if (viewMode === "quarter") titlePrefix = sortedSelectedValues.length > 1 ? "Trimestres" : "Trimestre";
              else if (viewMode === "semester") titlePrefix = sortedSelectedValues.length > 1 ? "Semestres" : "Semestre";
              else titlePrefix = sortedSelectedValues.length > 1 ? "Périodes" : "Période";

             return `${titlePrefix}: ${valuesString}`;
        } else {
             return "Aucune période sélectionnée";
        }
  };
  const periodeLabelText = getPeriodLabelText();
  const showData = entrantsData.some(d => d > 0) || sortantsData.some(d => d > 0);


  // =========================================
  // Rendu JSX
  // =========================================
  if (loading) {
     return ( <div className="visualisation relative" data-id={id}><div className="relative bg-white p-5 shadow-md rounded-lg w-full h-[450px] flex justify-center items-center"><p className="text-center text-gray-500">Chargement des données...</p></div></div> );
  }

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 relative">
             <div>
                 <h3 className="text-lg font-semibold text-gray-800">{chartTitle}</h3>
                 <p className="text-sm text-gray-500 min-h-[20px]"> {/* Min height to prevent layout shift */}
                     {viewMode !== 'day' && selectedYear ? `Année ${selectedYear} - ` : ''}
                     {periodeLabelText}
                 </p>
             </div>
          <div className="flex gap-2">
            <button className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition text-gray-600 hover:text-gray-800" onClick={() => setIsOpen(!isOpen)} data-filter-toggle="true" title="Filtrer"><AiOutlineFilter size={20} /></button>
            <CommentButton containerRef={chartContainerRef} comments={annotations} onAddComment={(c) => setAnnotations([...annotations, c])} onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))} onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))} />
            <button className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition text-gray-600 hover:text-gray-800" onClick={() => setModalIsOpen(true)} title="Agrandir"><FaExpand size={18} /></button>
          </div>
          {/* Panneau de filtre */}
          {isOpen && (
            <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50 border border-gray-200">
              <h4 className="font-semibold text-gray-600 text-sm mb-3">Filtrer par :</h4>
              <div className="flex space-x-1 mb-3 flex-wrap justify-start">
                {["day", "week", "month", "quarter", "semester"].map(mode => ( <button key={mode} className={`px-2.5 py-1 rounded text-xs mb-1 ${viewMode === mode ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`} onClick={() => handleViewModeChange(mode)}> {mode === "day" ? "Jour" : mode === "week" ? "Sem." : mode === "month" ? "Mois" : mode === "quarter" ? "Trim." : "Sem."} </button> ))}
              </div>
              {viewMode === "day" ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Plage de dates :</label>
                  <DatePicker selected={selectedDates[0]} onChange={handleDayRangeChange} startDate={selectedDates[0]} endDate={selectedDates[1]} selectsRange dateFormat="dd/MM/yyyy" locale={fr} inline filterDate={date => { const day = date.getDay(); return day !== 0 && day !== 6; }} calendarClassName="text-sm" dayClassName={() => "text-xs"} wrapperClassName="w-full" popperPlacement="bottom-end" maxDate={new Date()} showMonthDropdown showYearDropdown dropdownMode="select" />
                </div>
              ) : (
                <>
                  {multipleYearsExist && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Année :</h5>
                      <div className="flex flex-wrap gap-1">
                        {availableYears.map(year => ( <button key={year} onClick={() => handleYearChange(year)} className={`px-2 py-0.5 text-xs rounded ${selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}> {year} </button> ))}
                      </div>
                    </div>
                  )}
                   <div className="mb-2">
                    <button onClick={handleSelectAll} disabled={availablePeriodsForFilter.length === 0} className={`text-xs px-2 py-1 rounded w-full ${allPeriodsForFilterSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"} disabled:opacity-50 disabled:cursor-not-allowed`}> {allPeriodsForFilterSelected ? "Tout désélectionner" : "Tout sélectionner"} </button>
                  </div>
                   <div className="max-h-32 overflow-y-auto border border-gray-200 p-2 rounded text-sm">
                     {availablePeriodsForFilter.length > 0 ? availablePeriodsForFilter.map((value) => (
                      <div key={value} className="flex items-center space-x-2 my-0.5">
                        <input type="checkbox" id={`period-${value}-${viewMode}`} checked={selectedValues.includes(value)} onChange={() => handleSelectionChange(value)} className="cursor-pointer h-3.5 w-3.5" />
                        <label htmlFor={`period-${value}-${viewMode}`} className="text-gray-600 cursor-pointer select-none text-xs">
                          {viewMode === "week" ? `S${value}` : viewMode === "month" ? monthNames[value - 1] || `Mois ${value}` : viewMode === "quarter" ? quarterNames[value - 1] || `Trim. ${value}` : viewMode === "semester" ? semesterNames[value - 1] || `Sem. ${value}` : value}
                        </label>
                      </div>
                    )) : ( <p className="text-xs text-gray-400 text-center italic py-2">Aucune période disponible pour {selectedYear}</p> )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Conteneur Graphique Principal */}
        <div className="flex-grow flex justify-center items-center h-[350px] w-full" ref={chartContainerRef}>
           {showData ? ( <Bar data={chartData} options={chartOptions} plugins={[ChartDataLabels]} /> ) : ( <p className="text-gray-500 italic">Aucune donnée à afficher pour la sélection actuelle.</p> )}
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)} className="flex items-center justify-center fixed inset-0 z-50" overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm" contentLabel={`Modal ${chartTitle}`}>
        <div className="bg-white rounded-lg p-6 w-11/12 md:w-4/5 lg:w-3/4 shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                 <div>
                      <h3 className="text-xl font-semibold text-gray-800">{chartTitle}</h3>
                       <p className="text-sm text-gray-500 mt-1 min-h-[20px]"> {viewMode !== 'day' && selectedYear ? `Année ${selectedYear} - ` : ''} {periodeLabelText} </p>
                 </div>
                 <button onClick={() => setModalIsOpen(false)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-100 transition-colors" title="Fermer"> <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"> <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> </svg> </button>
            </div>
            <div className="relative flex-grow min-h-[400px] md:min-h-[500px] flex items-center justify-center" ref={modalChartContainerRef}>
                 {showData ? ( <Bar data={chartData} options={{...chartOptions, plugins: {...chartOptions.plugins, datalabels: {...chartOptions.plugins.datalabels, font: { size: 11 }}}}} plugins={[ChartDataLabels]} /> ) : ( <p className="text-gray-500 italic">Aucune donnée à afficher.</p> )}
                 <CommentButton containerRef={modalChartContainerRef} hideButton={true} comments={annotations} onAddComment={(c) => setAnnotations([...annotations, c])} onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))} onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))} />
            </div>
        </div>
      </Modal>
    </div>
  );
}