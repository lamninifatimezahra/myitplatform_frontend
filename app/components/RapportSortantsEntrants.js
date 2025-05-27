"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Line } from "react-chartjs-2";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fr } from "date-fns/locale";
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
import { useGlobalFilter } from "./GlobalFilterContext"; 
import Modal from "react-modal";
// ---- NOUVEAU : Import CommentButton ----
import CommentButton from "./CommentButton";

// Configurer le Modal pour l'accessibilité
if (typeof window !== "undefined") Modal.setAppElement(document.body);

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

// Définition de moisFrancais pour afficher les noms des mois en français
const moisFrancais = {
  1: "Janvier",
  2: "Février",
  3: "Mars",
  4: "Avril",
  5: "Mai",
  6: "Juin",
  7: "Juillet",
  8: "Août",
  9: "Septembre",
  10: "Octobre",
  11: "Novembre",
  12: "Décembre"
};

// ---- NOUVEAU : Noms pour trimestres et semestres ----
const quarterNames = ["T1", "T2", "T3", "T4"];
const semesterNames = ["S1", "S2"];

// Fonctions utilitaires pour les dates
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

function getLocalDateString(date) {
  if (!date || isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
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

// ---- NOUVEAU : Fonctions utilitaires pour trimestres et semestres ----
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

// Fonctions d'aide pour obtenir toutes les périodes entre deux dates
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
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclure weekend
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
      const maxWeeks = year === endYear ? endWeek : 52;
      const minWeeks = year === startYear ? startWeek : 1;
      for (let week = minWeeks; week <= maxWeeks; week++) weeksArray.push(week);
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
  return [...new Set(quartersArray)].sort((a,b) => a-b);
}

function getAllSemestersBetween(startDate, endDate) {
  if (!startDate || !endDate) return [];
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
  return [...new Set(semestersArray)].sort((a,b) => a-b);
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

export default function RapportSortantsEntrants({
  // Prop obligatoire pour l'URL de l'API
  apiUrl,
  // Props de personnalisation
  title = "Rapport Sortants/Entrants",
  subTitle = "Rapport : Sortants/Entrants",
  id = "Rapport Sortants/Entrants",
  // Structure de données
  dateCreationField = "date_derniere_maj",
  dateClosedField = "date_sortie",
  weekField = "semaine",
  weekClosedField = "semaine_date_sortant",
  // Calcul et affichage
  calculateRatio = true,
  ratioMultiplier = 100,
  yAxisLabel = "%",
  // Apparence
  lineColor = "#68bddd",
  backgroundColor = "rgba(104, 189, 221, 0.2)",
  defaultViewMode = "day",
  defaultNumPeriods = 5,
  // Options graphiques
  lineTension = 0.4,
  enableFill = true,
  showTooltipPercentage = true
}) {
  // Vérification de la présence de l'URL de l'API
  if (!apiUrl) {
    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <p className="text-red-500 text-sm mt-2">Erreur : L'URL de l'API est requise.</p>
        </div>
      </div>
    );
  }

  // Références et états internes
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);
  const prevViewMode = useRef(null);
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  // ---- NOUVEAU : Référence pour la modal ----
  const modalChartContainerRef = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [selectedValues, setSelectedValues] = useState([]);
  const [selectedDates, setSelectedDates] = useState([null, null]); // Pour la vue jour
  const [isOpen, setIsOpen] = useState(false);
  const [groupedData, setGroupedData] = useState({});
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
  // ---- NOUVEAU : État pour les annotations ----
  const [annotations, setAnnotations] = useState([]);

  // États pour mémoriser les sélections pour chaque vue
  const [dayViewSelection, setDayViewSelection] = useState({
    dates: [null, null],
    values: []
  });
  const [weekViewSelection, setWeekViewSelection] = useState({
    values: [],
    year: null
  });
  const [monthViewSelection, setMonthViewSelection] = useState({
    values: [],
    year: null
  });
  // ---- NOUVEAU : États pour trimestres et semestres ----
  const [quarterViewSelection, setQuarterViewSelection] = useState({
    values: [],
    year: null
  });
  const [semesterViewSelection, setSemesterViewSelection] = useState({
    values: [],
    year: null
  });

  // États pour gérer la priorisation du filtre global
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);
  const [daySelectionModifiedAt, setDaySelectionModifiedAt] = useState(0);
  // ---- NOUVEAU : États priorisation pour trimestres et semestres ----
  const [quarterSelectionModifiedAt, setQuarterSelectionModifiedAt] = useState(0);
  const [semesterSelectionModifiedAt, setSemesterSelectionModifiedAt] = useState(0);

  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Gestion des clics extérieurs au panneau de filtre
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fonction pour agréger les données selon le mode sélectionné
  const processData = useCallback((tickets, mode) => {
    const aggregatedData = {};
    
    if (mode === "day") {
      // Traitement pour la vue journalière
      tickets.forEach(ticket => {
        const dateStr = ticket[dateCreationField]?.split("T")[0];
        if (!dateStr) return;
        
        if (!aggregatedData[dateStr]) aggregatedData[dateStr] = { entrants: 0, sortants: 0 };
        aggregatedData[dateStr].entrants += 1;
      });
      
      tickets.forEach(ticket => {
        const closedDateStr = ticket[dateClosedField]?.split("T")[0];
        if (!closedDateStr) return;
        
        if (!aggregatedData[closedDateStr]) aggregatedData[closedDateStr] = { entrants: 0, sortants: 0 };
        aggregatedData[closedDateStr].sortants += 1;
      });
    } else {
      // Traitement pour vues semaine/mois/trimestre/semestre
      tickets.forEach(ticket => {
        let key;
        if (mode === "week") {
          key = ticket[weekField];
        } else if (mode === "month") {
          key = new Date(ticket[dateCreationField]).getMonth() + 1;
        } else if (mode === "quarter") {
          key = getQuarter(new Date(ticket[dateCreationField]));
        } else if (mode === "semester") {
          key = getSemester(new Date(ticket[dateCreationField]));
        }
        
        if (!aggregatedData[key]) aggregatedData[key] = { entrants: 0, sortants: 0 };
        aggregatedData[key].entrants += 1;
      });
      
      tickets.forEach(ticket => {
        if (ticket[dateClosedField]) {
          let sortantKey;
          if (mode === "week") {
            sortantKey = ticket[weekClosedField];
          } else if (mode === "month") {
            sortantKey = new Date(ticket[dateClosedField]).getMonth() + 1;
          } else if (mode === "quarter") {
            sortantKey = getQuarter(new Date(ticket[dateClosedField]));
          } else if (mode === "semester") {
            sortantKey = getSemester(new Date(ticket[dateClosedField]));
          }
          
          if (!aggregatedData[sortantKey]) aggregatedData[sortantKey] = { entrants: 0, sortants: 0 };
          aggregatedData[sortantKey].sortants += 1;
        }
      });
    }
    
    setGroupedData(aggregatedData);
  }, [dateCreationField, dateClosedField, weekField, weekClosedField]);

  // Fonction pour obtenir les périodes disponibles pour une année donnée
  const getAvailablePeriodsForYear = useCallback((year, mode) => {
    if (!data || data.length === 0) return [];
    
    if (mode === "day") {
      // Pour la vue journalière, retourner toutes les dates disponibles pour l'année
      return [...new Set(data
        .flatMap(ticket => {
          const dates = [];
          const creationDate = ticket[dateCreationField]?.split("T")[0];
          const closedDate = ticket[dateClosedField]?.split("T")[0];
          
          if (creationDate && parseLocalDate(creationDate)?.getFullYear() === year) {
            dates.push(creationDate);
          }
          if (closedDate && parseLocalDate(closedDate)?.getFullYear() === year) {
            dates.push(closedDate);
          }
          
          return dates;
        })
        .filter(Boolean))]
        .sort();
    } else if (mode === "week") {
      // Pour la vue semaine
      return [...new Set(data
        .filter(ticket => 
          (new Date(ticket[dateCreationField]).getFullYear() === year) || 
          (ticket[dateClosedField] && new Date(ticket[dateClosedField]).getFullYear() === year)
        )
        .map(ticket => {
          const weekValues = [];
          if (new Date(ticket[dateCreationField]).getFullYear() === year) {
            weekValues.push(Number(ticket[weekField]));
          }
          if (ticket[dateClosedField] && new Date(ticket[dateClosedField]).getFullYear() === year) {
            weekValues.push(Number(ticket[weekClosedField]));
          }
          return weekValues;
        })
        .flat())]
        .filter(week => !isNaN(Number(week)))
        .map(week => Number(week))
        .sort((a, b) => a - b);
    } else if (mode === "month") {
      // Pour la vue mois
      return [...new Set(data
        .filter(ticket => 
          (new Date(ticket[dateCreationField]).getFullYear() === year) || 
          (ticket[dateClosedField] && new Date(ticket[dateClosedField]).getFullYear() === year)
        )
        .map(ticket => {
          const monthValues = [];
          if (new Date(ticket[dateCreationField]).getFullYear() === year) {
            monthValues.push(new Date(ticket[dateCreationField]).getMonth() + 1);
          }
          if (ticket[dateClosedField] && new Date(ticket[dateClosedField]).getFullYear() === year) {
            monthValues.push(new Date(ticket[dateClosedField]).getMonth() + 1);
          }
          return monthValues;
        })
        .flat())]
        .sort((a, b) => a - b);
    } else if (mode === "quarter") {
      // ---- NOUVEAU : Pour la vue trimestre ----
      return [...new Set(data
        .filter(ticket => 
          (new Date(ticket[dateCreationField]).getFullYear() === year) || 
          (ticket[dateClosedField] && new Date(ticket[dateClosedField]).getFullYear() === year)
        )
        .map(ticket => {
          const quarterValues = [];
          if (new Date(ticket[dateCreationField]).getFullYear() === year) {
            quarterValues.push(getQuarter(new Date(ticket[dateCreationField])));
          }
          if (ticket[dateClosedField] && new Date(ticket[dateClosedField]).getFullYear() === year) {
            quarterValues.push(getQuarter(new Date(ticket[dateClosedField])));
          }
          return quarterValues;
        })
        .flat())]
        .filter(quarter => quarter !== null)
        .sort((a, b) => a - b);
    } else if (mode === "semester") {
      // ---- NOUVEAU : Pour la vue semestre ----
      return [...new Set(data
        .filter(ticket => 
          (new Date(ticket[dateCreationField]).getFullYear() === year) || 
          (ticket[dateClosedField] && new Date(ticket[dateClosedField]).getFullYear() === year)
        )
        .map(ticket => {
          const semesterValues = [];
          if (new Date(ticket[dateCreationField]).getFullYear() === year) {
            semesterValues.push(getSemester(new Date(ticket[dateCreationField])));
          }
          if (ticket[dateClosedField] && new Date(ticket[dateClosedField]).getFullYear() === year) {
            semesterValues.push(getSemester(new Date(ticket[dateClosedField])));
          }
          return semesterValues;
        })
        .flat())]
        .filter(semester => semester !== null)
        .sort((a, b) => a - b);
    }
    
    return [];
  }, [data, dateCreationField, dateClosedField, weekField, weekClosedField]);

  // Application du filtre global aux différentes vues
  const applyGlobalFilter = useCallback(() => {
    if (!globalStartDate || !globalEndDate) return;
    
    const startYear = globalStartDate.getFullYear();
    
    // Pour la vue jour
    const dayList = getAllWorkingDaysBetween(globalStartDate, globalEndDate);
    setDayViewSelection({
      dates: [globalStartDate, globalEndDate],
      values: dayList
    });
    setDaySelectionModifiedAt(Date.now());
    
    // Pour la vue semaine
    const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
    setWeekViewSelection({
      values: weekList,
      year: startYear
    });
    setWeekSelectionModifiedAt(Date.now());
    
    // Pour la vue mois
    const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
    setMonthViewSelection({
      values: monthList,
      year: startYear
    });
    setMonthSelectionModifiedAt(Date.now());
    
    // ---- NOUVEAU : Pour les vues trimestre et semestre ----
    const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate);
    setQuarterViewSelection({
      values: quarterList,
      year: startYear
    });
    setQuarterSelectionModifiedAt(Date.now());
    
    const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate);
    setSemesterViewSelection({
      values: semesterList,
      year: startYear
    });
    setSemesterSelectionModifiedAt(Date.now());
    
    // Appliquer la sélection correspondant à la vue active
    if (viewMode === "day") {
      setSelectedDates([globalStartDate, globalEndDate]);
      setSelectedValues(dayList);
    } else if (viewMode === "week") {
      setSelectedValues(weekList);
      setSelectedYear(startYear);
    } else if (viewMode === "month") {
      setSelectedValues(monthList);
      setSelectedYear(startYear);
    } else if (viewMode === "quarter") {
      setSelectedValues(quarterList);
      setSelectedYear(startYear);
    } else if (viewMode === "semester") {
      setSelectedValues(semesterList);
      setSelectedYear(startYear);
    }
    
    setHasGlobalFilter(true);
    globalFilterApplied.current = true;
  }, [globalStartDate, globalEndDate, viewMode]);

  // Récupération des données via l'API et initialisation des états associés
  useEffect(() => {
    let isMounted = true;
    
    async function fetchData() {
      try {
        setLoading(true);
        
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        
        if (!isMounted) return;
        setData(result);
        
        // Extraire toutes les années disponibles de manière sécurisée
        const years = [...new Set(result
          .flatMap(ticket => {
            const years = [];
            try {
              if (ticket[dateCreationField]) {
                const date = new Date(ticket[dateCreationField]);
                if (!isNaN(date.getTime())) years.push(date.getFullYear());
              }
              if (ticket[dateClosedField]) {
                const date = new Date(ticket[dateClosedField]);
                if (!isNaN(date.getTime())) years.push(date.getFullYear());
              }
            } catch (e) {
              console.error("Erreur de traitement des dates:", e);
            }
            return years;
          }))]
          .filter(year => !isNaN(year))
          .sort();
        
        if (!isMounted) return;
        
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        
        const latestYear = years.length > 0 ? years[years.length - 1] : new Date().getFullYear();
        
        // Éviter de redéfinir l'année si déjà sélectionnée
        if (!selectedYear) {
          setSelectedYear(latestYear);
        }
        
        // Filtrer les tickets pour l'année sélectionnée seulement si pas mode jour
        if (viewMode !== "day") {
          const yearToUse = selectedYear || latestYear;
          const ticketsForYear = result.filter(ticket => {
            try {
              const createDate = new Date(ticket[dateCreationField]);
              const closeDate = ticket[dateClosedField] ? new Date(ticket[dateClosedField]) : null;
              
              return createDate.getFullYear() === yearToUse || 
                    (closeDate && closeDate.getFullYear() === yearToUse);
            } catch (e) {
              return false;
            }
          });
          
          processData(ticketsForYear, viewMode);
        } else {
          // Pour le mode jour, utiliser tous les tickets
          processData(result, "day");
        }
        
        // Initialisation des sélections si pas encore fait
        if (!initializationCompleted.current) {
          if (viewMode === "day") {
            // Initialiser avec les derniers jours
            const allDaysWithData = [...new Set(result
              .flatMap(ticket => {
                const dates = [];
                try {
                  if (ticket[dateCreationField]) {
                    const dateStr = ticket[dateCreationField].split("T")[0];
                    if (dateStr) dates.push(dateStr);
                  }
                  if (ticket[dateClosedField]) {
                    const dateStr = ticket[dateClosedField].split("T")[0];
                    if (dateStr) dates.push(dateStr);
                  }
                } catch (e) {}
                return dates;
              })
              .filter(Boolean))];
            
            const lastDays = getLastNWorkingDays(allDaysWithData, defaultNumPeriods);
            
            if (lastDays.length > 0 && isMounted) {
              const startDate = parseLocalDate(lastDays[0]);
              const endDate = parseLocalDate(lastDays[lastDays.length - 1]);
              
              if (startDate && endDate) {
                setSelectedDates([startDate, endDate]);
                setSelectedValues(lastDays);
                setDayViewSelection({
                  dates: [startDate, endDate],
                  values: lastDays
                });
              }
            }
          } else {
            const yearToUse = selectedYear || latestYear;

            // Initialiser les dernières semaines
            const availableWeekPeriods = getAvailablePeriodsForYear(yearToUse, "week");
            const last5Weeks = availableWeekPeriods.slice(-defaultNumPeriods);
            setWeekViewSelection({
              values: last5Weeks,
              year: yearToUse
            });

            // Initialiser les derniers mois
            const availableMonthPeriods = getAvailablePeriodsForYear(yearToUse, "month");
            const last5Months = availableMonthPeriods.slice(-defaultNumPeriods);
            setMonthViewSelection({
              values: last5Months,
              year: yearToUse
            });

            // ---- NOUVEAU : Initialiser les derniers trimestres et semestres ----
            const availableQuarterPeriods = getAvailablePeriodsForYear(yearToUse, "quarter");
            const last5Quarters = availableQuarterPeriods.slice(-defaultNumPeriods);
            setQuarterViewSelection({
              values: last5Quarters,
              year: yearToUse
            });

            const availableSemesterPeriods = getAvailablePeriodsForYear(yearToUse, "semester");
            const last5Semesters = availableSemesterPeriods.slice(-defaultNumPeriods);
            setSemesterViewSelection({
              values: last5Semesters,
              year: yearToUse
            });

            // Initialiser les selectedValues uniquement selon la vue actuelle
            if (viewMode === "week") {
              setSelectedValues(last5Weeks);
            } else if (viewMode === "month") {
              setSelectedValues(last5Months);
            } else if (viewMode === "quarter") {
              setSelectedValues(last5Quarters);
            } else if (viewMode === "semester") {
              setSelectedValues(last5Semesters);
            }
          }
          // Marquer l'initialisation comme terminée
          if (isMounted) {
            initializationCompleted.current = true;
          }
        }
        
        // Appliquer le filtre global si disponible et si l'initialisation est terminée
        if (globalStartDate && globalEndDate && !globalFilterApplied.current && isMounted) {
          applyGlobalFilter();
          globalFilterApplied.current = true;
        }
        
        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Erreur lors du fetch des données :", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [apiUrl]);

  // Gestion du changement de vue (jour/semaine/mois/trimestre/semestre) et préservation des sélections
  useEffect(() => {
    if (!prevViewMode.current || !initializationCompleted.current) {
      prevViewMode.current = viewMode;
      return;
    }
    
    // Sauvegarder la sélection actuelle avant de changer de vue
    const previousMode = prevViewMode.current;
    
    if (previousMode === "day") {
      setDayViewSelection({
        dates: selectedDates,
        values: selectedValues
      });
    } else if (previousMode === "week") {
      setWeekViewSelection({
        values: selectedValues,
        year: selectedYear
      });
    } else if (previousMode === "month") {
      setMonthViewSelection({
        values: selectedValues,
        year: selectedYear
      });
    } else if (previousMode === "quarter") {
      setQuarterViewSelection({
        values: selectedValues,
        year: selectedYear
      });
    } else if (previousMode === "semester") {
      setSemesterViewSelection({
        values: selectedValues,
        year: selectedYear
      });
    }
    
    // Restaurer la sélection pour la nouvelle vue
    if (viewMode === "day") {
      if (dayViewSelection.values.length > 0) {
        setSelectedDates(dayViewSelection.dates);
        setSelectedValues(dayViewSelection.values);
      } else if (data.length > 0) {
        // Si pas de sélection mémorisée, utiliser les derniers jours
        const allDaysWithData = [...new Set(data
          .flatMap(ticket => {
            const dates = [];
            if (ticket[dateCreationField]) {
              const dateStr = ticket[dateCreationField].split("T")[0];
              if (dateStr) dates.push(dateStr);
            }
            if (ticket[dateClosedField]) {
              const dateStr = ticket[dateClosedField].split("T")[0];
              if (dateStr) dates.push(dateStr);
            }
            return dates;
          })
          .filter(Boolean))];
        
        const last10Days = getLastNWorkingDays(allDaysWithData, defaultNumPeriods);
        
        if (last10Days.length > 0) {
          const startDate = parseLocalDate(last10Days[0]);
          const endDate = parseLocalDate(last10Days[last10Days.length - 1]);
          setSelectedDates([startDate, endDate]);
          setSelectedValues(last10Days);
        }
      }
      
      // Mettre à jour les données pour la vue jour
      if (data.length > 0) {
        processData(data, "day");
      }
    } else {
      // Pour les vues semaine, mois, trimestre et semestre
      let selectionToRestore;
      if (viewMode === "week") {
        selectionToRestore = weekViewSelection;
      } else if (viewMode === "month") {
        selectionToRestore = monthViewSelection;
      } else if (viewMode === "quarter") {
        selectionToRestore = quarterViewSelection;
      } else if (viewMode === "semester") {
        selectionToRestore = semesterViewSelection;
      }
      
      const yearToUse = selectionToRestore.year || selectedYear;
      
      if (yearToUse) {
        // Ne pas mettre à jour l'année si elle est déjà correcte
        if (yearToUse !== selectedYear) {
          setSelectedYear(yearToUse);
        }
        
        if (data.length > 0) {
          const ticketsForYear = data.filter(ticket => {
            try {
              const createDate = new Date(ticket[dateCreationField]);
              const closeDate = ticket[dateClosedField] ? new Date(ticket[dateClosedField]) : null;
              
              return createDate.getFullYear() === yearToUse || 
                    (closeDate && closeDate.getFullYear() === yearToUse);
            } catch (e) {
              return false;
            }
          });
          
          processData(ticketsForYear, viewMode);
        }
        
        if (selectionToRestore.values.length > 0) {
          setSelectedValues(selectionToRestore.values);
        } else {
          // Si pas de sélection mémorisée, utiliser les dernières périodes
          const availablePeriods = getAvailablePeriodsForYear(yearToUse, viewMode);
          const lastPeriods = availablePeriods.slice(-defaultNumPeriods);
          
          if (lastPeriods.length > 0) {
            setSelectedValues(lastPeriods);
            
            if (viewMode === "week") {
              setWeekViewSelection({
                values: lastPeriods,
                year: yearToUse
              });
            } else if (viewMode === "month") {
              setMonthViewSelection({
                values: lastPeriods,
                year: yearToUse
              });
            } else if (viewMode === "quarter") {
              setQuarterViewSelection({
                values: lastPeriods,
                year: yearToUse
              });
            } else if (viewMode === "semester") {
              setSemesterViewSelection({
                values: lastPeriods,
                year: yearToUse
              });
            }
          }
        }
      }
    }
    
    prevViewMode.current = viewMode;
  }, [viewMode]);

  // Recalcul des données lorsque l'année sélectionnée change
  useEffect(() => {
    if (data.length > 0 && selectedYear && viewMode !== "day") {
      const ticketsForYear = data.filter(ticket => {
        const createDate = new Date(ticket[dateCreationField]);
        const closeDate = ticket[dateClosedField] ? new Date(ticket[dateClosedField]) : null;
        
        return createDate.getFullYear() === selectedYear || 
              (closeDate && closeDate.getFullYear() === selectedYear);
      });
      
      processData(ticketsForYear, viewMode);
    }
  }, [selectedYear, data, dateCreationField, dateClosedField, viewMode, processData]);

  // Application du filtre global si celui-ci est plus récent que la modification locale
  useEffect(() => {
    if (globalStartDate && globalEndDate && globalModifiedAt > 0) {
      const shouldApplyGlobal = (
        viewMode === "day" && globalModifiedAt > daySelectionModifiedAt ||
        viewMode === "week" && globalModifiedAt > weekSelectionModifiedAt ||
        viewMode === "month" && globalModifiedAt > monthSelectionModifiedAt ||
        viewMode === "quarter" && globalModifiedAt > quarterSelectionModifiedAt ||
        viewMode === "semester" && globalModifiedAt > semesterSelectionModifiedAt
      );
      
      if (shouldApplyGlobal) {
        applyGlobalFilter();
      }
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt, viewMode, daySelectionModifiedAt, weekSelectionModifiedAt, monthSelectionModifiedAt, quarterSelectionModifiedAt, semesterSelectionModifiedAt, applyGlobalFilter]);

  // Désactiver le filtre global si l'utilisateur modifie une sélection manuellement
  useEffect(() => {
    if (!hasGlobalFilter) {
      globalFilterApplied.current = false;
    }
  }, [selectedValues, selectedDates]);

  // Fonctions et événements de l'interface utilisateur
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
  };
  
  const handleDayRangeChange = (dates) => {
    const [start, end] = dates;
    setSelectedDates(dates);
    
    if (start && end) {
      const dayList = getAllWorkingDaysBetween(start, end);
      setSelectedValues(dayList);
      setDayViewSelection({
        dates: [start, end],
        values: dayList
      });
      setDaySelectionModifiedAt(Date.now());
      setHasGlobalFilter(false);
    }
  };

  const getAvailablePeriodsForSelection = () => {
    if (viewMode === "day") {
      // Pour la vue jour, les périodes disponibles viennent de getAllWorkingDaysBetween
      return selectedDates[0] && selectedDates[1] 
        ? getAllWorkingDaysBetween(selectedDates[0], selectedDates[1])
        : [];
    } else {
      // Pour semaine, mois, trimestre et semestre, utiliser getAvailablePeriodsForYear
      return selectedYear ? getAvailablePeriodsForYear(selectedYear, viewMode) : [];
    }
  };

  const availablePeriods = getAvailablePeriodsForSelection();
  const allPeriodsSelected =
    availablePeriods.length > 0 &&
    availablePeriods.every(period => selectedValues.includes(period));

  const toggleSelectAll = () => {
    if (viewMode === "day") return; // Non applicable pour la vue jour
    
    const newSelectedValues = allPeriodsSelected ? [] : [...availablePeriods];
    setSelectedValues(newSelectedValues);
    
    if (viewMode === "week") {
      setWeekViewSelection({
        values: newSelectedValues,
        year: selectedYear
      });
      setWeekSelectionModifiedAt(Date.now());
    } else if (viewMode === "month") {
      setMonthViewSelection({
        values: newSelectedValues,
        year: selectedYear
      });
      setMonthSelectionModifiedAt(Date.now());
    } else if (viewMode === "quarter") {
      setQuarterViewSelection({
        values: newSelectedValues,
        year: selectedYear
      });
      setQuarterSelectionModifiedAt(Date.now());
    } else if (viewMode === "semester") {
      setSemesterViewSelection({
        values: newSelectedValues,
        year: selectedYear
      });
      setSemesterSelectionModifiedAt(Date.now());
    }
    
    setHasGlobalFilter(false);
  };

  const handleYearChange = (year) => {
    if (year === selectedYear || viewMode === "day") return;
    
    setSelectedYear(year);
    
    // Rechercher les périodes disponibles pour la nouvelle année
    const availablePeriods = getAvailablePeriodsForYear(year, viewMode);
    
    // Vérifier si le filtre global correspond à cette année
    if (hasGlobalFilter && globalStartDate && globalEndDate && globalStartDate.getFullYear() === year) {
      let globalPeriods = [];
      
      if (viewMode === "week") {
        globalPeriods = getAllWeeksBetween(globalStartDate, globalEndDate);
      } else if (viewMode === "month") {
        globalPeriods = getAllMonthsBetween(globalStartDate, globalEndDate);
      } else if (viewMode === "quarter") {
        globalPeriods = getAllQuartersBetween(globalStartDate, globalEndDate);
      } else if (viewMode === "semester") {
        globalPeriods = getAllSemestersBetween(globalStartDate, globalEndDate);
      }
      
      const validValues = globalPeriods.filter(p => availablePeriods.includes(p));
      
      setSelectedValues(validValues);
      
      if (viewMode === "week") {
        setWeekViewSelection({
          values: validValues,
          year
        });
      } else if (viewMode === "month") {
        setMonthViewSelection({
          values: validValues,
          year
        });
      } else if (viewMode === "quarter") {
        setQuarterViewSelection({
          values: validValues,
          year
        });
      } else if (viewMode === "semester") {
        setSemesterViewSelection({
          values: validValues,
          year
        });
      }
    } else {
      // Sinon, vérifier s'il existe une sélection mémorisée pour cette année
      let selectionToRestore;
      if (viewMode === "week") {
        selectionToRestore = weekViewSelection;
      } else if (viewMode === "month") {
        selectionToRestore = monthViewSelection;
      } else if (viewMode === "quarter") {
        selectionToRestore = quarterViewSelection;
      } else if (viewMode === "semester") {
        selectionToRestore = semesterViewSelection;
      }
      
      if (selectionToRestore.year === year && selectionToRestore.values.length > 0) {
        const validValues = selectionToRestore.values.filter(v => availablePeriods.includes(v));
        
        if (validValues.length > 0) {
          setSelectedValues(validValues);
        } else {
          // Si aucune sélection valide, prendre les dernières périodes
          const lastPeriods = availablePeriods.slice(-defaultNumPeriods);
          setSelectedValues(lastPeriods);
          
          if (viewMode === "week") {
            setWeekViewSelection({
              values: lastPeriods,
              year
            });
          } else if (viewMode === "month") {
            setMonthViewSelection({
              values: lastPeriods,
              year
            });
          } else if (viewMode === "quarter") {
            setQuarterViewSelection({
              values: lastPeriods,
              year
            });
          } else if (viewMode === "semester") {
            setSemesterViewSelection({
              values: lastPeriods,
              year
            });
          }
        }
      } else {
        // Si pas de sélection mémorisée, prendre les dernières périodes
        const lastPeriods = availablePeriods.slice(-defaultNumPeriods);
        setSelectedValues(lastPeriods);
        
        if (viewMode === "week") {
          setWeekViewSelection({
            values: lastPeriods,
            year
          });
        } else if (viewMode === "month") {
          setMonthViewSelection({
            values: lastPeriods,
            year
          });
        } else if (viewMode === "quarter") {
          setQuarterViewSelection({
            values: lastPeriods,
            year
          });
        } else if (viewMode === "semester") {
          setSemesterViewSelection({
            values: lastPeriods,
            year
          });
        }
      }
      
      setHasGlobalFilter(false);
    }
  };

  // Préparation des données pour le graphique
  const filteredPeriods = useMemo(() => {
    if (viewMode === "day") {
      // Pour la vue jour, utiliser directement les valeurs sélectionnées (sous format string)
      return selectedValues
        .filter(Boolean)
        .sort();
    } else {
      // Pour semaine, mois, trimestre et semestre, filtrer les périodes disponibles dans groupedData
      return Object.keys(groupedData)
        .map(key => Number(key))
        .filter(key => selectedValues.includes(key))
        .sort((a, b) => a - b);
    }
  }, [groupedData, selectedValues, viewMode]);

  // Génération des labels pour l'axe X
  const labels = useMemo(() => {
    return filteredPeriods.map(p => {
      if (viewMode === "day") {
        return formatDayLabel(p);
      } else if (viewMode === "week") {
        return `Semaine ${p}`;
      } else if (viewMode === "month") {
        return moisFrancais[p] || `Mois ${p}`;
      } else if (viewMode === "quarter") {
        return quarterNames[p - 1] || `Trim. ${p}`;
      } else if (viewMode === "semester") {
        return semesterNames[p - 1] || `Sem. ${p}`;
      }
      return p.toString();
    });
  }, [filteredPeriods, viewMode]);

  // Calcul des données pour le graphique
  const dataValues = useMemo(() => {
    return filteredPeriods.map(period => {
      const { entrants, sortants } = groupedData[period] || { entrants: 0, sortants: 0 };
      
      if (calculateRatio) {
        return entrants > 0 ? ((sortants / entrants) * ratioMultiplier).toFixed(1) : 0;
      } else {
        return sortants;
      }
    });
  }, [filteredPeriods, groupedData, calculateRatio, ratioMultiplier]);

  // Détermination du texte pour la période sélectionnée
  const periodeLabel = useMemo(() => {
    if (selectedValues.length === 0) {
      return "Aucune période sélectionnée";
    }
    
    if (viewMode === "day") {
      if (selectedDates[0] && selectedDates[1]) {
        const startStr = selectedDates[0].toLocaleDateString('fr-FR');
        const endStr = selectedDates[1].toLocaleDateString('fr-FR');
        return `Du ${startStr} au ${endStr}`;
      }
      return "Période invalide";
    } else if (viewMode === "week") {
      return `Semaine(s) : ${selectedValues.join(", ")}`;
    } else if (viewMode === "month") {
      return `Mois : ${selectedValues.map(m => moisFrancais[m]).join(", ")}`;
    } else if (viewMode === "quarter") {
      return `Trimestre(s) : ${selectedValues.map(q => quarterNames[q - 1] || q).join(", ")}`;
    } else if (viewMode === "semester") {
      return `Semestre(s) : ${selectedValues.map(s => semesterNames[s - 1] || s).join(", ")}`;
    }
    
    return "Période inconnue";
  }, [selectedValues, viewMode, selectedDates]);

  // Configuration des options du graphique
  const chartOptions = useMemo(() => {
    // Déterminer si une seule valeur est sélectionnée pour centrer le graphique
    const centerScale = selectedValues.length === 1;
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { 
          callbacks: { 
            label: (context) => `${context.raw}${showTooltipPercentage ? yAxisLabel : ""}` 
          } 
        },
      },
      scales: {
        x: { 
          grid: { display: false },
          // Configurer l'échelle X pour centrer une seule valeur
          min: centerScale ? -0.5 : undefined,
          max: centerScale ? 0.5 : undefined,
        },
        y: {
          grid: { display: true },
          ticks: { callback: (value) => `${value}${yAxisLabel}` },
        },
      },
    };
  }, [selectedValues, showTooltipPercentage, yAxisLabel]);

  // Structure des données pour ChartJS
  const chartData = {
    labels,
    datasets: [
      {
        label: title,
        data: dataValues,
        borderColor: lineColor,
        backgroundColor: backgroundColor,
        fill: enableFill,
        tension: lineTension,
      },
    ],
  };

  if (loading) {
    return <p className="text-center text-gray-500">Chargement des données...</p>;
  }

  const handleSelectionChange = (value) => {
    setSelectedValues(prev => {
      const newSelection = prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value];

      if (viewMode === "week") {
        setWeekViewSelection({
          values: newSelection,
          year: selectedYear
        });
        setWeekSelectionModifiedAt(Date.now());
      } else if (viewMode === "month") {
        setMonthViewSelection({
          values: newSelection,
          year: selectedYear
        });
        setMonthSelectionModifiedAt(Date.now());
      } else if (viewMode === "quarter") {
        setQuarterViewSelection({
          values: newSelection,
          year: selectedYear
        });
        setQuarterSelectionModifiedAt(Date.now());
      } else if (viewMode === "semester") {
        setSemesterViewSelection({
          values: newSelection,
          year: selectedYear
        });
        setSemesterSelectionModifiedAt(Date.now());
      }

      setHasGlobalFilter(false);
      globalFilterApplied.current = false;
      return newSelection;
    });
  };

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <h3 className="no-export text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500">
              {viewMode !== "day" && selectedYear ? `Année : ${selectedYear} - ` : ''}
              {periodeLabel}
            </p>
          </div>
          <div className="flex gap-2 no-export">
            <button
              className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
              onClick={() => setIsOpen(!isOpen)}
              data-filter-toggle="true"
            >
              <AiOutlineFilter size={20} className="text-gray-600" />
            </button>
            {/* ---- NOUVEAU : Bouton Commentaires ---- */}
            <CommentButton
              containerRef={chartContainerRef}
              comments={annotations}
              onAddComment={(c) => setAnnotations([...annotations, c])}
              onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))}
              onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))}
            />
            <button
              className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
              onClick={() => setModalIsOpen(true)}
            >
              <FaExpand size={18} className="text-gray-600" />
            </button>
          </div>

          {isOpen && (
            <div ref={filterPanelRef} className="no-export absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-72 z-50">
              <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
              <div className="flex space-x-1 mb-2 mt-2 flex-wrap">
                <button
                  className={`px-2 py-1 rounded text-sm mb-1 ${viewMode === "day" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                  onClick={() => handleViewModeChange("day")}
                >
                  Jour
                </button>
                <button
                  className={`px-2 py-1 rounded text-sm mb-1 ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                  onClick={() => handleViewModeChange("week")}
                >
                  Semaine
                </button>
                <button
                  className={`px-2 py-1 rounded text-sm mb-1 ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                  onClick={() => handleViewModeChange("month")}
                >
                  Mois
                </button>
                <button
                  className={`px-2 py-1 rounded text-sm mb-1 ${viewMode === "quarter" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                  onClick={() => handleViewModeChange("quarter")}
                >
                  Trimestre
                </button>
                <button
                  className={`px-2 py-1 rounded text-sm mb-1 ${viewMode === "semester" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                  onClick={() => handleViewModeChange("semester")}
                >
                  Semestre
                </button>
              </div>
              
              {viewMode === "day" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Plage de dates :</label>
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
                      return day !== 0 && day !== 6; // Exclure weekend
                    }}
                    calendarClassName="text-sm"
                    dayClassName={() => "text-xs"}
                    wrapperClassName="w-full"
                    popperPlacement="bottom-end"
                    maxDate={new Date()}
                  />
                </div>
              ) : (
                <>
                  {multipleYearsExist && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Années :</h5>
                      <div className="flex flex-wrap gap-1">
                        {availableYears.map(year => (
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
                  <div className="mb-2">
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
                  <div className="max-h-40 overflow-y-auto border p-2 rounded-md">
                    {availablePeriods.length > 0 ? (
                      availablePeriods.map(value => (
                        <div key={value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`period-${value}`}
                            checked={selectedValues.includes(value)}
                            onChange={() => handleSelectionChange(value)}
                          />
                          <label htmlFor={`period-${value}`} className="text-gray-500 text-sm">
                            {viewMode === "week" ? `Semaine ${value}` : 
                             viewMode === "month" ? moisFrancais[value] :
                             viewMode === "quarter" ? quarterNames[value - 1] || `Trim. ${value}` :
                             viewMode === "semester" ? semesterNames[value - 1] || `Sem. ${value}` :
                             value}
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-xs italic">Aucune période disponible</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ---- MODIFIÉ : Ajout de la référence chartContainerRef ---- */}
        <div className="flex-grow flex justify-center items-center h-[350px]" ref={chartContainerRef}>
          {filteredPeriods.length > 0 ? (
            <Line
              data={chartData}
              options={chartOptions}
            />
          ) : (
            <p className="text-center text-gray-500">Aucune donnée à afficher pour la période sélectionnée.</p>
          )}
        </div>
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-800">{subTitle}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {viewMode !== "day" && selectedYear ? `Année : ${selectedYear} - ` : ''}
                {periodeLabel}
              </p>
            </div>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          {/* ---- MODIFIÉ : Ajout de la référence modalChartContainerRef et CommentButton caché ---- */}
          <div className="relative h-[400px] flex items-center justify-center" ref={modalChartContainerRef}>
            {filteredPeriods.length > 0 ? (
              <Line
                data={chartData}
                options={chartOptions}
              />
            ) : (
              <p className="text-center text-gray-500">Aucune donnée à afficher pour la période sélectionnée.</p>
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