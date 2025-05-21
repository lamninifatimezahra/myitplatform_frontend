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
  Legend
} from "chart.js";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand } from "react-icons/fa";
import ChartDataLabels from "chartjs-plugin-datalabels";
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

// Fonction pour obtenir le numéro de semaine ISO
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

// Nouvelle fonction pour calculer les jours ouvrables, excluant correctement les weekends
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

// Fonction pour catégoriser les tickets selon leur délai (en jours ouvrables)
const categorizeTicket = (businessDays) => {
  if (businessDays <= 1) return "Jour";
  if (businessDays <= 2) return "2J";
  if (businessDays <= 3) return "3J";
  if (businessDays <= 5) return "Semaine";
  if (businessDays <= 10) return "2semaines";
  return "Plus 2S";
};

export default function SlaAnciennete({
  // Prop obligatoire pour l'URL de l'API
  apiUrl,
  // Props personnalisables avec des valeurs par défaut
  id = "SLA d'ancienneté",
  defaultViewMode = "week", // "week" ou "month"
  defaultNumPeriods = 5
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

  // Références
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
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  // États pour mémoriser les sélections pour chaque vue
  const [weekViewSelection, setWeekViewSelection] = useState({ values: [], year: null });
  const [monthViewSelection, setMonthViewSelection] = useState({ values: [], year: null });
  const [quarterViewSelection, setQuarterViewSelection] = useState({ values: [], year: null });
  const [semesterViewSelection, setSemesterViewSelection] = useState({ values: [], year: null });

  // États pour gérer la priorisation de la sélection des périodes
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);
  const [quarterSelectionModifiedAt, setQuarterSelectionModifiedAt] = useState(0);
  const [semesterSelectionModifiedAt, setSemesterSelectionModifiedAt] = useState(0);

  // Définition des catégories SLA
  const slaCategories = ["Jour", "2J", "3J", "Semaine", "2semaines", "Plus 2S"];

  // Noms des mois en français
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  // Noms des trimestres
  const quarterNames = ["T1", "T2", "T3", "T4"];

  // Noms des semestres
  const semesterNames = ["S1", "S2"];

  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Effet pour gérer les clics extérieurs au panneau de filtre
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

  // Fonctions pour générer toutes les semaines ou mois entre deux dates
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

  // Application du filtre global aux différentes vues
  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate) return;
    const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
    setWeekViewSelection({ values: weekList, year: globalStartDate.getFullYear() });
    const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
    setMonthViewSelection({ values: monthList, year: globalStartDate.getFullYear() });
    const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate);
    setQuarterViewSelection({ values: quarterList, year: globalStartDate.getFullYear() });
    const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate);
    setSemesterViewSelection({ values: semesterList, year: globalStartDate.getFullYear() });

    if (viewMode === "week") {
      setSelectedValues(weekList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "month") {
      setSelectedValues(monthList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "quarter") {
      setSelectedValues(quarterList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "semester") {
      setSelectedValues(semesterList);
      setSelectedYear(globalStartDate.getFullYear());
    }
    setHasGlobalFilter(true);
  };

  // Changement de vue et préservation des sélections précédentes
  useEffect(() => {
    if (!prevViewMode.current) {
      prevViewMode.current = viewMode;
      return;
    }
    if (prevViewMode.current === "week") {
      setWeekViewSelection({ values: selectedValues, year: selectedYear });
    } else if (prevViewMode.current === "month") {
      setMonthViewSelection({ values: selectedValues, year: selectedYear });
    } else if (prevViewMode.current === "quarter") {
      setQuarterViewSelection({ values: selectedValues, year: selectedYear });
    } else if (prevViewMode.current === "semester") {
      setSemesterViewSelection({ values: selectedValues, year: selectedYear });
    }

    if (viewMode === "week" && weekViewSelection.values.length > 0) {
      setSelectedValues(weekViewSelection.values);
      setSelectedYear(weekViewSelection.year || selectedYear);
    } else if (viewMode === "month" && monthViewSelection.values.length > 0) {
      setSelectedValues(monthViewSelection.values);
      setSelectedYear(monthViewSelection.year || selectedYear);
    } else if (viewMode === "quarter" && quarterViewSelection.values.length > 0) {
      setSelectedValues(quarterViewSelection.values);
      setSelectedYear(quarterViewSelection.year || selectedYear);
    } else if (viewMode === "semester" && semesterViewSelection.values.length > 0) {
      setSelectedValues(semesterViewSelection.values);
      setSelectedYear(semesterViewSelection.year || selectedYear);
    }
    prevViewMode.current = viewMode;
  }, [viewMode]);

  // Chargement initial des données via l'API
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        
        // Filtrer les tickets qui n'ont pas de date_sortie
        const filteredResult = result.filter(ticket => 
          ticket.date_sortie && ticket.date_sortie !== null && ticket.date_sortie !== ""
        );
        
        setData(filteredResult);

        // Extraction des années disponibles depuis la date de mise à jour ("date_sortie")
        const years = [...new Set(filteredResult.map(ticket => new Date(ticket.date_sortie).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        if (!initializationCompleted.current) {
          const filteredByYear = filteredResult.filter(ticket =>
            new Date(ticket.date_sortie).getFullYear() === latestYear
          );

          if (viewMode === "week") {
            const weeks = [...new Set(filteredByYear.map(ticket => ticket.semaine_date_sortant))]
              .filter(week => !isNaN(Number(week)))
              .sort((a, b) => a - b);
            const lastWeeks = weeks.slice(-defaultNumPeriods);
            setSelectedValues(lastWeeks);
            setWeekViewSelection({ values: lastWeeks, year: latestYear });
          }
          else if (viewMode === "quarter") {
            const quarters = [...new Set(filteredByYear.map(ticket => getQuarter(new Date(ticket.date_sortie))))].sort((a, b) => a - b);
            const lastQuarters = quarters.slice(-defaultNumPeriods);
            setSelectedValues(lastQuarters);
            setQuarterViewSelection({ values: lastQuarters, year: latestYear });
          } else if (viewMode === "semester") {
            const semesters = [...new Set(filteredByYear.map(ticket => getSemester(new Date(ticket.date_sortie))))].sort((a, b) => a - b);
            const lastSemesters = semesters.slice(-defaultNumPeriods);
            setSelectedValues(lastSemesters);
            setSemesterViewSelection({ values: lastSemesters, year: latestYear });
          }
          else {
            const months = [...new Set(filteredByYear.map(ticket => new Date(ticket.date_sortie).getMonth() + 1))].sort((a, b) => a - b);
            const lastMonths = months.slice(-defaultNumPeriods);
            setSelectedValues(lastMonths);
            setMonthViewSelection({ values: lastMonths, year: latestYear });
          }
          initializationCompleted.current = true;
        }

        if (globalStartDate && globalEndDate && !globalFilterApplied.current) {
          applyGlobalFilter();
          globalFilterApplied.current = true;
        }

        setLoading(false);
      } catch (error) {
        console.error("Erreur fetch :", error);
        setLoading(false);
      }
    }
    fetchData();
  }, [apiUrl, defaultNumPeriods, viewMode, globalStartDate, globalEndDate]);

  // Application du filtre global s'il a été modifié
  useEffect(() => {
    if (globalStartDate && globalEndDate && globalModifiedAt > 0) {
      applyGlobalFilter();
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt]);

  if (loading)
    return <p className="text-center text-gray-500">Chargement des données..</p>;

  // Obtention des périodes disponibles pour l'année sélectionnée
  const getAvailablePeriodsForYear = (year) => {
    const filteredByYear = data.filter(ticket => new Date(ticket.date_sortie).getFullYear() === year);
    if (viewMode === "week") {
      return [...new Set(filteredByYear.map(ticket => ticket.semaine_date_sortant))]
        .filter(week => !isNaN(Number(week)))
        .sort((a, b) => a - b);
    }
    else if (viewMode === "quarter") {
      return [...new Set(filteredByYear.map(ticket => getQuarter(new Date(ticket.date_sortie))))]
        .sort((a, b) => a - b);
    } else if (viewMode === "semester") {
      return [...new Set(filteredByYear.map(ticket => getSemester(new Date(ticket.date_sortie))))]
        .sort((a, b) => a - b);
    }
    else {
      return [...new Set(filteredByYear.map(ticket => new Date(ticket.date_sortie).getMonth() + 1))]
        .sort((a, b) => a - b);
    }
  };

  const availablePeriods = getAvailablePeriodsForYear(selectedYear);
  const allPeriodsSelected =
    availablePeriods.length > 0 &&
    availablePeriods.every(period => selectedValues.includes(period));

  const toggleSelectAll = () => {
    const newSelectedValues = allPeriodsSelected ? [] : [...availablePeriods];
    setSelectedValues(newSelectedValues);
    if (viewMode === "week") {
      setWeekViewSelection({ values: newSelectedValues, year: selectedYear });
      setWeekSelectionModifiedAt(Date.now());
    }
    else if (viewMode === "quarter") {
      setQuarterViewSelection({ values: newSelectedValues, year: selectedYear });
      setQuarterSelectionModifiedAt(Date.now());
    } else if (viewMode === "semester") {
      setSemesterViewSelection({ values: newSelectedValues, year: selectedYear });
      setSemesterSelectionModifiedAt(Date.now());
    }
    else {
      setMonthViewSelection({ values: newSelectedValues, year: selectedYear });
      setMonthSelectionModifiedAt(Date.now());
    }
    setHasGlobalFilter(false);
  };

  const handleSelectionChange = (value) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    setSelectedValues(newSelectedValues);
    if (viewMode === "week") {
      setWeekViewSelection({ values: newSelectedValues, year: selectedYear });
      setWeekSelectionModifiedAt(Date.now());
    }
    else if (viewMode === "quarter") {
      setQuarterViewSelection({ values: newSelectedValues, year: selectedYear });
      setQuarterSelectionModifiedAt(Date.now());
    } else if (viewMode === "semester") {
      setSemesterViewSelection({ values: newSelectedValues, year: selectedYear });
      setSemesterSelectionModifiedAt(Date.now());
    }
    else {
      setMonthViewSelection({ values: newSelectedValues, year: selectedYear });
      setMonthSelectionModifiedAt(Date.now());
    }
    setHasGlobalFilter(false);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    const availablePeriods = getAvailablePeriodsForYear(year);
    if (viewMode === "week") {
      if (hasGlobalFilter && globalStartDate && globalEndDate) {
        const weekList = getAllWeeksBetween(globalStartDate, globalEndDate)
          .filter(w => availablePeriods.includes(w));
        setSelectedValues(weekList);
        setWeekViewSelection({ values: weekList, year });
      } else {
        const intersection = weekViewSelection.values.filter(w => availablePeriods.includes(w));
        if (intersection.length > 0) {
          setSelectedValues(intersection);
          setWeekViewSelection({ values: intersection, year });
        } else {
          const lastWeeks = availablePeriods.slice(-defaultNumPeriods);
          setSelectedValues(lastWeeks);
          setWeekViewSelection({ values: lastWeeks, year });
        }
      }
    }
    else if (viewMode === "quarter") {
      if (hasGlobalFilter && globalStartDate && globalEndDate) {
        const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate)
          .filter(q => availablePeriods.includes(q));
        setSelectedValues(quarterList);
        setQuarterViewSelection({ values: quarterList, year });
      } else {
        const intersection = quarterViewSelection.values.filter(q => availablePeriods.includes(q));
        if (intersection.length > 0) {
          setSelectedValues(intersection);
          setQuarterViewSelection({ values: intersection, year });
        } else {
          const lastQuarters = availablePeriods.slice(-defaultNumPeriods);
          setSelectedValues(lastQuarters);
          setQuarterViewSelection({ values: lastQuarters, year });
        }
      }
    } else if (viewMode === "semester") {
      if (hasGlobalFilter && globalStartDate && globalEndDate) {
        const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate)
          .filter(s => availablePeriods.includes(s));
        setSelectedValues(semesterList);
        setSemesterViewSelection({ values: semesterList, year });
      } else {
        const intersection = semesterViewSelection.values.filter(s => availablePeriods.includes(s));
        if (intersection.length > 0) {
          setSelectedValues(intersection);
          setSemesterViewSelection({ values: intersection, year });
        } else {
          const lastSemesters = availablePeriods.slice(-defaultNumPeriods);
          setSelectedValues(lastSemesters);
          setSemesterViewSelection({ values: lastSemesters, year });
        }
      }
    }
    else {
      if (hasGlobalFilter && globalStartDate && globalEndDate) {
        const monthList = getAllMonthsBetween(globalStartDate, globalEndDate)
          .filter(m => availablePeriods.includes(m));
        setSelectedValues(monthList);
        setMonthViewSelection({ values: monthList, year });
      } else {
        const intersection = monthViewSelection.values.filter(m => availablePeriods.includes(m));
        if (intersection.length > 0) {
          setSelectedValues(intersection);
          setMonthViewSelection({ values: intersection, year });
        } else {
          const lastMonths = availablePeriods.slice(-defaultNumPeriods);
          setSelectedValues(lastMonths);
          setMonthViewSelection({ values: lastMonths, year });
        }
      }
    }
  };

  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
  };

  // Constitution des labels et préparation du dataset
  const selectedValuesWithYear = selectedValues.map(value => ({ value, year: selectedYear }));
  const labels = selectedValuesWithYear.map(item => {
    let periodLabel;
    if (viewMode === "week") {
      periodLabel = `S${item.value}`;
    } else if (viewMode === "month") {
      periodLabel = monthNames[item.value - 1];
    } else if (viewMode === "quarter") {
      periodLabel = quarterNames[item.value - 1];
    } else if (viewMode === "semester") {
      periodLabel = semesterNames[item.value - 1];
    }
    return multipleYearsExist ? `${periodLabel}, ${item.year}` : periodLabel;
  });

  const datasets = slaCategories.map(category => ({
    label: category,
    data: selectedValuesWithYear.map(item => {
      return data.filter(ticket => {
        // Ignorer les tickets sans date_sortie ou sans delai_jour
        if (!ticket.date_sortie || ticket.delai_jour === undefined || ticket.delai_jour === null) {
          return false;
        }
        
        const ticketYear = new Date(ticket.date_sortie).getFullYear();
        let ticketPeriod;

        if (viewMode === "week") {
          ticketPeriod = ticket.semaine_date_sortant;
        } else if (viewMode === "month") {
          ticketPeriod = new Date(ticket.date_sortie).getMonth() + 1;
        } else if (viewMode === "quarter") {
          ticketPeriod = getQuarter(new Date(ticket.date_sortie));
        } else if (viewMode === "semester") {
          ticketPeriod = getSemester(new Date(ticket.date_sortie));
        }

        // Calcul des jours ouvrables entre date_derniere_maj et date_sortie
        // Utiliser delai_jour comme base si disponible
        const businessDays = getBusinessDaysDifference(
          ticket.date_derniere_maj, 
          ticket.date_sortie, 
          ticket.delai_jour
        );
        
        // Obtention de la catégorie SLA en fonction des jours ouvrables
        const slaCategory = categorizeTicket(businessDays);

        return ticketYear === item.year &&
          ticketPeriod === item.value &&
          slaCategory === category;
      }).length;
    }),
    backgroundColor: getColorForSlaCategory(category),
    stack: "stack1",
    borderRadius: 10
  }));

  function getColorForSlaCategory(category) {
    switch (category) {
      case "Jour": return "#b8e0f0";
      case "2J": return "#c9b8f0";
      case "3J": return "#8A4FFF";
      case "Semaine": return "#9932CC";
      case "2semaines": return "#0064a1";
      case "Plus 2S": return "#60b2f0";
      default: return "#ecf0f1";
    }
  }

  const periodeLabelText = selectedValues.length > 0
    ? viewMode === "week"
      ? `Semaine(s) : ${selectedValues.join(", ")}`
      : viewMode === "month"
      ? `Mois : ${selectedValues.map(m => monthNames[m - 1]).join(", ")}`
      : viewMode === "quarter"
      ? `Trimestre(s) : ${selectedValues.map(q => quarterNames[q - 1]).join(", ")}`
      : `Semestre(s) : ${selectedValues.map(s => semesterNames[s - 1]).join(", ")}`
    : "Aucune période sélectionnée";

  const chartOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      datalabels: {
        color: "black",
        anchor: "center",
        align: "center",
        formatter: (value) => (value > 0 ? value : "")
      }
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true }
    }
  };


return (
  <div className="visualisation relative" data-id={id}>
    <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
      {/* Header avec titre, sous-titre et boutons */}
      <div className="flex justify-between items-start mb-4 relative">
        <div>
          <h3 className="no-export text-lg font-semibold text-gray-800">SLA d'ancienneté</h3>
          <p className="text-sm text-gray-500">
            {selectedYear && `Année : ${selectedYear} - `}{periodeLabelText}
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
          <CommentButton
            containerRef={chartContainerRef}
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
            onClick={() => setModalIsOpen(true)}
          >
            <FaExpand size={18} className="text-gray-600" />
          </button>
        </div>

        {isOpen && (
          <div ref={filterPanelRef} className="no-export absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
            <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
            <div className="flex space-x-2 mb-2 mt-2 flex-wrap">
              <button
                className={`px-3 py-1 rounded-md mb-2 ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                onClick={() => handleViewModeChange("week")}
              >
                Semaine
              </button>
              <button
                className={`px-3 py-1 rounded-md mb-2 ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                onClick={() => handleViewModeChange("month")}
              >
                Mois
              </button>
              <button
                className={`px-3 py-1 rounded-md mb-2 ${viewMode === "quarter" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                onClick={() => handleViewModeChange("quarter")}
              >
                Trimestre
              </button>
              <button
                className={`px-3 py-1 rounded-md mb-2 ${viewMode === "semester" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                onClick={() => handleViewModeChange("semester")}
              >
                Semestre
              </button>
            </div>
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
                className={`text-xs px-2 py-1 rounded-md w-full ${allPeriodsSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
              >
                {allPeriodsSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
              {availablePeriods.map(value => (
                <div key={value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(value)}
                    onChange={() => handleSelectionChange(value)}
                  />
                  <span className="text-gray-500">
                    {viewMode === "week"
                      ? `Semaine ${value}`
                      : viewMode === "month"
                      ? monthNames[value - 1]
                      : viewMode === "quarter"
                      ? quarterNames[value - 1]
                      : semesterNames[value - 1]
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-grow flex justify-center items-center h-[350px]" ref={chartContainerRef}>
        <Bar
          data={{ labels, datasets }}
          options={chartOptions}
          plugins={[ChartDataLabels]}
        />
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
            <h3 className="text-2xl font-semibold text-gray-800">SLA d'ancienneté</h3>
            <p className="text-sm text-gray-500 mt-1">
              {selectedYear && `Année : ${selectedYear} - `}{periodeLabelText}
            </p>
          </div>
          <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
        </div>
        <div className="relative h-[400px] flex items-center justify-center" ref={modalChartContainerRef}>
          <Bar
            data={{ labels, datasets }}
            options={chartOptions}
            plugins={[ChartDataLabels]}
          />
          <CommentButton
            containerRef={modalChartContainerRef}
            hideButton={true}
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