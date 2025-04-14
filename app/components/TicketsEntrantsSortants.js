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
import ChartDataLabels from "chartjs-plugin-datalabels";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getWeek } from "date-fns";
import { fr } from "date-fns/locale";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useGlobalFilter } from "./GlobalFilterContext";
import Modal from "react-modal";

// Définir le conteneur principal pour le modal
if (typeof window !== "undefined") Modal.setAppElement(document.body);

//
// -------------------------
// Fonctions utilitaires
// -------------------------
//
// Renvoie une chaîne "YYYY-MM-DD" basée sur la date locale
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Convertit une chaîne "YYYY-MM-DD" en objet Date
function parseLocalDate(dateStr) {
  if (typeof dateStr !== "string") {
    console.error("parseLocalDate: dateStr is not a string", dateStr);
    return new Date();
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Formate une date (en chaîne "YYYY-MM-DD") au format "JJ/MM (Sx)"
function formatDayLabel(dateStr) {
  if (typeof dateStr !== "string") {
    console.error("formatDayLabel: dateStr is not a string", dateStr);
    return `Date invalide (${dateStr})`;
  }
  const d = parseLocalDate(dateStr);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const week = getWeekNumber(d);
  return `${day}/${month} (S${week})`;
}

// Fonction pour obtenir le numéro de semaine ISO
const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

// Fonction pour obtenir tous les jours ouvrables entre deux dates
function getAllWorkingDaysBetween(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const daysArray = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysArray.push(getLocalDateString(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return daysArray;
}

// Fonction pour obtenir tous les semaines entre deux dates
function getAllWeeksBetween(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const weeksArray = [];
  const startWeek = getWeekNumber(startDate);
  const endWeek = getWeekNumber(endDate);
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  if (startYear === endYear) {
    for (let week = startWeek; week <= endWeek; week++) {
      weeksArray.push(week);
    }
  } else {
    for (let year = startYear; year <= endYear; year++) {
      const maxWeeks = year === startYear ? 52 : endWeek;
      const minWeeks = year === startYear ? startWeek : 1;
      for (let week = minWeeks; week <= maxWeeks; week++) {
        weeksArray.push(week);
      }
    }
  }
  return weeksArray;
}

// Fonction pour obtenir tous les mois entre deux dates
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

// Fonction pour obtenir les 10 derniers jours ouvrables
function getLast10WorkingDays(days) {
  const filteredDays = days.filter(dateStr => {
    const d = parseLocalDate(dateStr);
    const dayOfWeek = d.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }).sort();
  return filteredDays.slice(-10);
}

//
// -------------------------
// Composant GroupedBarChart
// -------------------------
//
// Ce composant affiche un graphique groupé comparant le nombre de tickets entrants et sortants 
// selon trois modes de vue : "day", "week" ou "month".
// Il permet de filtrer les données via un panneau qui utilise un DatePicker pour la vue "day"
// et une sélection multiple pour les vues "week" et "month".
// Les champs utilisés dans le traitement des données sont configurables via les props.
export default function GroupedBarChart({
  // Prop obligatoire
  apiUrl,
  // Props de personnalisation avec valeurs par défaut
  id = "Rapport : Sortants/Entrants",
  chartTitle = "Tickets Entrants vs. Sortants",
  dateUpdateField = "date_derniere_maj",     // Champ de la date de mise à jour pour les entrants
  weekField = "semaine",                      // Champ du numéro de semaine pour les entrants
  dateClosedField = "date_sortie",            // Champ de la date de clôture pour les sortants
  weekClosedField = "semaine_date_sortant",     // Champ du numéro de semaine pour les sortants
  defaultViewMode = "day"                      // Mode par défaut : "day", "week" ou "month"
}) {
  // Vérifier que l'URL de l'API est fournie
  if (!apiUrl) {
    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <p className="text-red-500 text-sm mt-2">Erreur : L'URL de l'API est requise.</p>
        </div>
      </div>
    );
  }

  
  // Références pour la gestion des états et du panneau de filtre
  const chartRef = useRef(null);
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);
  const prevViewMode = useRef(null);
  const filterPanelRef = useRef(null);
  
  // États de base
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  // viewMode peut être "day", "week" ou "month"
  const [viewMode, setViewMode] = useState(defaultViewMode);
  // Pour "day" : plage de dates et sélection des jours (format "YYYY-MM-DD")
  const [selectedDates, setSelectedDates] = useState([null, null]);
  // Pour "week" et "month" : les valeurs sélectionnées (numéros de semaine ou mois / jours)
  const [selectedValues, setSelectedValues] = useState([]);
  
  // États pour mémoriser les sélections antérieures selon le mode
  const [dayViewSelection, setDayViewSelection] = useState({
    dates: [null, null],
    values: []
  });
  const [weekViewSelection, setWeekViewSelection] = useState({
    values: []
  });
  const [monthViewSelection, setMonthViewSelection] = useState({
    values: []
  });
  
  // États liés à la gestion par année
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  
  // Pour savoir si toutes les périodes sont sélectionnées
  const [allSelected, setAllSelected] = useState(false);
  
  // Pour afficher les noms des mois en français
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  
  // Récupération du filtre global via le contexte
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();
  
  // État pour le panneau de filtre et pour le modal d'agrandissement
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
  
  // -------------------------
  // Gestion des clics extérieurs au panneau de filtre
  // -------------------------
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isOpen &&
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target) &&
        !event.target.closest('button[data-filter-toggle]')
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);
  
  // -------------------------
  // Gestion du changement de mode et sauvegarde/restauration des sélections
  // -------------------------
  useEffect(() => {
    if (!prevViewMode.current) {
      prevViewMode.current = viewMode;
      return;
    }
    if (prevViewMode.current === "day") {
      setDayViewSelection({
        dates: selectedDates,
        values: selectedValues
      });
    } else if (prevViewMode.current === "week") {
      setWeekViewSelection({
        values: selectedValues
      });
    } else if (prevViewMode.current === "month") {
      setMonthViewSelection({
        values: selectedValues
      });
    }
    if (viewMode === "day" && dayViewSelection.values.length > 0) {
      setSelectedDates(dayViewSelection.dates);
      setSelectedValues(dayViewSelection.values);
    } else if (viewMode === "week" && weekViewSelection.values.length > 0) {
      setSelectedValues(weekViewSelection.values);
    } else if (viewMode === "month" && monthViewSelection.values.length > 0) {
      setSelectedValues(monthViewSelection.values);
    }
    prevViewMode.current = viewMode;
  }, [viewMode]);
  
  // -------------------------
  // Fonction pour gérer la sélection de la plage de jours (vue "day")
  // -------------------------
  const handleDayRangeChange = (dates) => {
    const [start, end] = dates;
    setSelectedDates([start, end]);
    if (start && end) {
      const dayList = getAllWorkingDaysBetween(start, end);
      setSelectedValues(dayList);
      setDayViewSelection({
        dates: [start, end],
        values: dayList
      });
      setHasGlobalFilter(false);
    }
  };
  
  // -------------------------
  // Chargement initial des données
  // -------------------------
  useEffect(() => {
    fetchWithAuth(apiUrl)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
        
        // Pour la vue "day", extraction de tous les jours ouvrables
        let days = [...new Set(json.map(t => t[dateUpdateField].split("T")[0]))];
        days = days.filter(dateStr => {
          const d = parseLocalDate(dateStr);
          const dw = d.getDay();
          return dw !== 0 && dw !== 6;
        }).sort();
        
        const years = [...new Set(json.map(t => new Date(t[dateUpdateField]).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);
        
        if (!initializationCompleted.current) {
          if (viewMode === "day") {
            const last10Days = getLast10WorkingDays(days);
            if (last10Days.length > 0) {
              const startDate = parseLocalDate(last10Days[0]);
              const endDate = parseLocalDate(last10Days[last10Days.length - 1]);
              setSelectedDates([startDate, endDate]);
              setSelectedValues(last10Days);
              setDayViewSelection({
                dates: [startDate, endDate],
                values: last10Days
              });
            }
          } else if (viewMode === "week") {
            const filteredByYear = json.filter(t => new Date(t[dateUpdateField]).getFullYear() === latestYear);
            const weeks = [...new Set(filteredByYear.map(t => t[weekField]))].sort((a, b) => a - b);
            const filteredWeeks = weeks.filter(w => !isNaN(Number(w)));
            const lastWeeks = filteredWeeks.slice(-5);
            setSelectedValues(lastWeeks);
            setWeekViewSelection({
              values: lastWeeks
            });
          } else if (viewMode === "month") {
            const filteredByYear = json.filter(t => new Date(t[dateUpdateField]).getFullYear() === latestYear);
            const months = [...new Set(filteredByYear.map(t => new Date(t[dateUpdateField]).getMonth() + 1))].sort((a, b) => a - b);
            const lastMonths = months.slice(-3);
            setSelectedValues(lastMonths);
            setMonthViewSelection({
              values: lastMonths
            });
          }
          initializationCompleted.current = true;
        }
        
        if (globalStartDate && globalEndDate && !globalFilterApplied.current) {
          applyGlobalFilter();
          globalFilterApplied.current = true;
        }
      })
      .catch(error => {
        console.error("Erreur lors du chargement des données:", error);
        setLoading(false);
      });
  }, [apiUrl, dateUpdateField, weekField]);
  
  // -------------------------
  // Fonction pour appliquer le filtre global à toutes les vues
  // -------------------------
  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate) return;
    // Pour la vue "day"
    const dayList = getAllWorkingDaysBetween(globalStartDate, globalEndDate);
    setDayViewSelection({
      dates: [globalStartDate, globalEndDate],
      values: dayList
    });
    // Pour la vue "week"
    const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
    setWeekViewSelection({
      values: weekList
    });
    // Pour la vue "month"
    const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
    setMonthViewSelection({
      values: monthList
    });
    if (viewMode === "day") {
      setSelectedDates([globalStartDate, globalEndDate]);
      setSelectedValues(dayList);
    } else if (viewMode === "week") {
      setSelectedValues(weekList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "month") {
      setSelectedValues(monthList);
      setSelectedYear(globalStartDate.getFullYear());
    }
    setHasGlobalFilter(true);
  };
  
  useEffect(() => {
    if (globalStartDate && globalEndDate && globalModifiedAt > 0) {
      applyGlobalFilter();
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt]);
  
  // Fonction pour changer de mode (jour, semaine, mois)
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
  };
  
  // -------------------------
  // Filtrage des données pour le graphique
  // -------------------------
  const availableDays = [...new Set(data.map(t => t[dateUpdateField].split("T")[0]))]
    .filter(dateStr => {
      const d = parseLocalDate(dateStr);
      const dw = d.getDay();
      return dw !== 0 && dw !== 6;
    })
    .sort();
  
  const filteredByYear = viewMode === "day" ? data : data.filter(t => new Date(t[dateUpdateField]).getFullYear() === selectedYear);
  
  let availablePeriods = [];
  if (viewMode === "day") {
    availablePeriods = availableDays;
  } else if (viewMode === "week") {
    availablePeriods = [...new Set(filteredByYear.map(t => {
      const wk = Number(t[weekField]);
      return !isNaN(wk) ? wk : null;
    }).filter(w => w !== null))].sort((a, b) => a - b);
  } else {
    availablePeriods = [...new Set(filteredByYear.map(t => new Date(t[dateUpdateField]).getMonth() + 1))].sort((a, b) => a - b);
  }
  
  const allPeriodsSelected =
    availablePeriods.length > 0 &&
    availablePeriods.every(period => selectedValues.includes(period));
  
  const handleSelectAll = () => {
    if (allPeriodsSelected) {
      setSelectedValues([]);
      setAllSelected(false);
      if (viewMode === "week") {
        setWeekViewSelection({ values: [] });
      } else if (viewMode === "month") {
        setMonthViewSelection({ values: [] });
      }
    } else {
      setSelectedValues([...availablePeriods]);
      setAllSelected(true);
      if (viewMode === "week") {
        setWeekViewSelection({ values: [...availablePeriods] });
      } else if (viewMode === "month") {
        setMonthViewSelection({ values: [...availablePeriods] });
      }
    }
    setHasGlobalFilter(false);
  };
  
  const handleYearChange = (year) => {
    setSelectedYear(year);
    if (viewMode === "week" || viewMode === "month") {
      const filteredByNewYear = data.filter(t => new Date(t[dateUpdateField]).getFullYear() === year);
      if (viewMode === "week") {
        const weeks = [...new Set(filteredByNewYear.map(t => t[weekField]))].sort((a, b) => a - b);
        const filteredWeeks = weeks.filter(w => !isNaN(Number(w)));
        if (hasGlobalFilter && globalStartDate && globalEndDate) {
          const weekList = getAllWeeksBetween(globalStartDate, globalEndDate).filter(w => filteredWeeks.includes(w));
          setSelectedValues(weekList);
          setWeekViewSelection({ values: weekList });
        } else {
          const intersection = weekViewSelection.values.filter(w => filteredWeeks.includes(w));
          if (intersection.length > 0) {
            setSelectedValues(intersection);
          } else {
            const lastWeeks = filteredWeeks.slice(-5);
            setSelectedValues(lastWeeks);
            setWeekViewSelection({ values: lastWeeks });
          }
        }
      } else if (viewMode === "month") {
        const months = [...new Set(filteredByNewYear.map(t => new Date(t[dateUpdateField]).getMonth() + 1))].sort((a, b) => a - b);
        if (hasGlobalFilter && globalStartDate && globalEndDate) {
          const monthList = getAllMonthsBetween(globalStartDate, globalEndDate).filter(m => months.includes(m));
          setSelectedValues(monthList);
          setMonthViewSelection({ values: monthList });
        } else {
          const intersection = monthViewSelection.values.filter(m => months.includes(m));
          if (intersection.length > 0) {
            setSelectedValues(intersection);
          } else {
            const lastMonths = months.slice(-3);
            setSelectedValues(lastMonths);
            setMonthViewSelection({ values: lastMonths });
          }
        }
      }
    }
  };
  
  // -------------------------
  // Préparation des labels pour le graphique
  // -------------------------
  let labels = [];
  if (viewMode === "day") {
    labels = selectedValues
      .filter(val => typeof val === "string")
      .slice()
      .sort()
      .map(val => formatDayLabel(val));
  } else if (viewMode === "week") {
    labels = selectedValues
      .filter(val => typeof val === "number" || !isNaN(Number(val)))
      .map(val => typeof val === "string" ? Number(val) : val)
      .slice()
      .sort((a, b) => a - b)
      .map(w => `Semaine ${w}`);
  } else {
    labels = selectedValues
      .filter(val => typeof val === "number" || !isNaN(Number(val)))
      .map(val => typeof val === "string" ? Number(val) : val)
      .slice()
      .sort((a, b) => a - b)
      .map(m => monthNames[m - 1]);
  }
  
  const sortedSelectedValues = (() => {
    if (viewMode === "day") {
      return selectedValues
        .filter(val => typeof val === "string")
        .slice()
        .sort();
    } else {
      return selectedValues
        .filter(val => typeof val === "number" || !isNaN(Number(val)))
        .map(val => typeof val === "string" ? Number(val) : val)
        .slice()
        .sort((a, b) => a - b);
    }
  })();
  
  // -------------------------
  // Filtrage des tickets pour la vue sélectionnée
  // -------------------------
  const filteredEntrants = data.filter(t => {
    if (viewMode === "day") {
      const dateStr = t[dateUpdateField].split("T")[0];
      return selectedValues.includes(dateStr);
    } else {
      if (new Date(t[dateUpdateField]).getFullYear() !== selectedYear) return false;
      if (viewMode === "week") {
        const wk = Number(t[weekField]);
        return !isNaN(wk) && selectedValues.includes(wk);
      }
      if (viewMode === "month") {
        const m = new Date(t[dateUpdateField]).getMonth() + 1;
        return selectedValues.includes(m);
      }
    }
    return false;
  });
  
  const filteredSortants = data.filter(t => {
    if (!t[dateClosedField]) return false;
    if (viewMode === "day") {
      const dateStr = t[dateClosedField].split("T")[0];
      return selectedValues.includes(dateStr);
    }
    if (new Date(t[dateClosedField]).getFullYear() !== selectedYear) return false;
    if (viewMode === "week") {
      const wk = Number(t[weekClosedField]);
      return !isNaN(wk) && selectedValues.includes(wk);
    }
    if (viewMode === "month") {
      const m = new Date(t[dateClosedField]).getMonth() + 1;
      return selectedValues.includes(m);
    }
    return false;
  });
  
  const entrantsData = sortedSelectedValues.map(val => {
    if (viewMode === "day") {
      return filteredEntrants.filter(t => t[dateUpdateField].split("T")[0] === val).length;
    } else if (viewMode === "week") {
      const numVal = Number(val);
      return filteredEntrants.filter(t => {
        const wk = Number(t[weekField]);
        return !isNaN(wk) && wk === numVal;
      }).length;
    } else {
      const numVal = Number(val);
      return filteredEntrants.filter(t => new Date(t[dateUpdateField]).getMonth() + 1 === numVal).length;
    }
  });
  
  const sortantsData = sortedSelectedValues.map(val => {
    if (viewMode === "day") {
      return filteredSortants.filter(t => t[dateClosedField].split("T")[0] === val).length;
    } else if (viewMode === "week") {
      const numVal = Number(val);
      return filteredSortants.filter(t => {
        const wk = Number(t[weekClosedField]);
        return !isNaN(wk) && wk === numVal;
      }).length;
    } else {
      const numVal = Number(val);
      return filteredSortants.filter(t => new Date(t[dateClosedField]).getMonth() + 1 === numVal).length;
    }
  });
  
  const chartData = {
    labels,
    datasets: [
      { label: "Entrants", data: entrantsData, backgroundColor: "#68bddd", borderRadius: 6 },
      { label: "Sortants", data: sortantsData, backgroundColor: "#1b2b6b", borderRadius: 6 }
    ]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: true,
        color: "#000",
        font: { weight: "bold", size: 11 },
        formatter: val => val > 0 ? val : "",
        anchor: "end",
        align: "top",
        offset: -2
      },
      legend: { 
        position: "top",
        align: "center",
        labels: {
          padding: 20,
          boxWidth: 12,
          font: { size: 12 }
        }
      },
      tooltip: { 
        mode: "index", 
        intersect: false,
        padding: 10,
        titleFont: { size: 14 },
        bodyFont: { size: 13 }
      }
    },
    scales: {
      x: { 
        grid: { display: false },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          padding: 10,
          font: { size: 11 }
        }
      },
      y: {
        beginAtZero: true,
        grid: { drawBorder: false },
        ticks: { precision: 0, padding: 10 }
      }
    },
    layout: {
      padding: { top: 20, right: 20, bottom: 30, left: 10 }
    }
  };
  
  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Header avec titre et boutons */}
        <div className="flex justify-between items-center mb-4 relative">
          <h3 className="text-xl font-semibold text-gray-800">{chartTitle}</h3>
          <div className="flex gap-2">
            <button 
              className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" 
              onClick={() => setIsOpen(!isOpen)}
              data-filter-toggle="true">
              <AiOutlineFilter size={20} className="text-gray-600" />
            </button>
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
              <div className="flex space-x-2 mt-2 mb-2">
                {["day", "week", "month"].map(mode => (
                  <button
                    key={mode}
                    className={`px-3 py-1 rounded-md ${viewMode === mode ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                    onClick={() => handleViewModeChange(mode)}
                  >
                    {mode === "day" ? "Jour" : mode === "week" ? "Semaine" : "Mois"}
                  </button>
                ))}
              </div>
              {viewMode === "day" ? (
                <div>
                  <DatePicker
                    selected={selectedDates[0]}
                    onChange={handleDayRangeChange}
                    startDate={selectedDates[0]}
                    endDate={selectedDates[1]}
                    selectsRange
                    dateFormat="yyyy-MM-dd"
                    locale={fr}
                    inline
                    filterDate={date => {
                      const day = date.getDay();
                      return day !== 0 && day !== 6;
                    }}
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
                      onClick={handleSelectAll}
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
                          {viewMode === "week" ? `Semaine ${value}` : monthNames[value - 1]}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
  
        <div className="flex-grow flex justify-center items-center w-full">
          <Bar
            style={{ width: "100%", height: "100%" }}
            data={chartData}
            options={chartOptions}
            plugins={[ChartDataLabels]}
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
            <h3 className="text-2xl font-semibold text-gray-800">{chartTitle}</h3>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          <div className="relative h-[400px] flex items-center justify-center">
            <Bar
              data={chartData}
              options={chartOptions}
              plugins={[ChartDataLabels]}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
