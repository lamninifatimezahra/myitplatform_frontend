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

export default function VolumeReentrants({
  // Prop obligatoire pour l'URL de l'API
  apiUrl,
  // Props de personnalisation avec valeurs par défaut
  id = "Volume des Réentrants",
  title = "Volume des Réentrants",
  idField = "id_ticket",
  dateUpdateField = "date_derniere_maj",
  weekField = "semaine",
  iterationColors = {
    2: "#2196f3",
    3: "#1b2b6b",
    4: "#f36e3b",
    5: "#4caf50",
    6: "#9c27b0",
    7: "#ff9800",
    8: "#009688",
  },
  monthLabels = {
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
  },
  defaultViewMode = "week",
  showsPerWeek = 5,
  enableYearFilter = true,
  enableToggleView = true
}) {
  // Gestion de l'absence de prop apiUrl
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
  const prevViewMode = useRef(null);
  const filterPanelRef = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [groupedData, setGroupedData] = useState({});
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);

  // États pour mémoriser les sélections pour chaque vue
  const [weekViewSelection, setWeekViewSelection] = useState({
    values: [],
    year: null
  });
  const [monthViewSelection, setMonthViewSelection] = useState({
    values: [],
    year: null
  });

  // États pour la gestion des années
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  // États pour gérer la priorisation des filtres
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);

  // Récupération du filtre global depuis le contexte
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Effet pour gérer les clics extérieurs au panneau de filtre
  useEffect(() => {
    function handleClickOutside(event) {
      // Si le panneau est ouvert et que le clic est en dehors du panneau et du bouton de filtre
      if (isOpen && 
          filterPanelRef.current && 
          !filterPanelRef.current.contains(event.target) &&
          !event.target.closest('button[data-filter-toggle]')) {
        setIsOpen(false);
      }
    }
    
    // Ajouter l'écouteur d'événements
    document.addEventListener("mousedown", handleClickOutside);
    
    // Nettoyer l'écouteur d'événements
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fonction pour obtenir le numéro de semaine ISO
  const getWeekNumber = (date) => {
    const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tempDate.getUTCDay() || 7;
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
  };

  // Fonction pour générer toutes les semaines entre deux dates
  function getAllWeeksBetween(startDate, endDate) {
    if (!startDate || !endDate) return [];
    
    const weeksArray = [];
    const startWeek = getWeekNumber(startDate);
    const endWeek = getWeekNumber(endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    // Si les dates sont dans la même année
    if (startYear === endYear) {
      for (let week = startWeek; week <= endWeek; week++) {
        weeksArray.push(week);
      }
    } else {
      // Traitement pour plusieurs années
      for (let year = startYear; year <= endYear; year++) {
        const maxWeeks = year === endYear ? endWeek : 52;
        const minWeeks = year === startYear ? startWeek : 1;
        
        for (let week = minWeeks; week <= maxWeeks; week++) {
          weeksArray.push(week);
        }
      }
    }
    
    return weeksArray;
  }

  // Fonction pour générer tous les mois entre deux dates
  function getAllMonthsBetween(startDate, endDate) {
    if (!startDate || !endDate) return [];
    
    const monthsArray = [];
    const startMonth = startDate.getMonth() + 1;
    const endMonth = endDate.getMonth() + 1;
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    // Si les dates sont dans la même année
    if (startYear === endYear) {
      for (let month = startMonth; month <= endMonth; month++) {
        monthsArray.push(month);
      }
    } else {
      // Traitement pour plusieurs années
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

  // Fonction pour appliquer le filtre global à toutes les vues
  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate) return;
    
    // Pour la vue "semaine"
    const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
    setWeekViewSelection({
      values: weekList,
      year: globalStartDate.getFullYear()
    });
    
    // Pour la vue "mois"
    const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
    setMonthViewSelection({
      values: monthList,
      year: globalStartDate.getFullYear()
    });
    
    // Mettre à jour la vue actuelle
    if (viewMode === "week") {
      setSelectedValues(weekList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "month") {
      setSelectedValues(monthList);
      setSelectedYear(globalStartDate.getFullYear());
    }
    
    setHasGlobalFilter(true);
  };

  // Effet pour gérer le changement de vue et conserver l'état précédent
  useEffect(() => {
    if (!prevViewMode.current) {
      prevViewMode.current = viewMode;
      return;
    }
    
    // Sauvegarde de l'état précédent
    if (prevViewMode.current === "week") {
      setWeekViewSelection({
        values: selectedValues,
        year: selectedYear
      });
    } else if (prevViewMode.current === "month") {
      setMonthViewSelection({
        values: selectedValues,
        year: selectedYear
      });
    }
    
    // Restauration de l'état pour la nouvelle vue
    if (viewMode === "week" && weekViewSelection.values.length > 0) {
      setSelectedValues(weekViewSelection.values);
      setSelectedYear(weekViewSelection.year || selectedYear);
    } else if (viewMode === "month" && monthViewSelection.values.length > 0) {
      setSelectedValues(monthViewSelection.values);
      setSelectedYear(monthViewSelection.year || selectedYear);
    }
    
    // Traiter les données pour la nouvelle vue si nous avons des données
    if (data.length > 0 && selectedYear) {
      const ticketsForYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === selectedYear);
      processReentrantData(ticketsForYear, viewMode);
    }
    
    prevViewMode.current = viewMode;
  }, [viewMode, dateUpdateField]);

  // Fonction pour initialiser la sélection des périodes à partir des tickets et du mode (week ou month)
  const updateSelectedValues = (tickets, mode) => {
    const weeks = [...new Set(tickets.map((t) => t[weekField]))]
      .filter(week => !isNaN(Number(week)))
      .sort((a, b) => a - b);
    const months = [...new Set(tickets.map((t) => new Date(t[dateUpdateField]).getMonth() + 1))].sort((a, b) => a - b);
    
    const lastWeeks = weeks.slice(-showsPerWeek);
    const lastMonths = months.slice(-showsPerWeek);
    
    if (mode === "week") {
      setSelectedValues(lastWeeks);
      setWeekViewSelection({
        values: lastWeeks,
        year: selectedYear
      });
    } else {
      setSelectedValues(lastMonths);
      setMonthViewSelection({
        values: lastMonths,
        year: selectedYear
      });
    }
  };

  // Fonction pour traiter les données des réentrants et les grouper par période et itération
  const processReentrantData = (tickets, mode) => {
    const ticketCounts = {};
    const result = {};

    tickets.forEach((ticket) => {
      const period = mode === "week" ? ticket[weekField] : new Date(ticket[dateUpdateField]).getMonth() + 1;
      const ticketId = ticket[idField];
      if (!ticketCounts[ticketId]) ticketCounts[ticketId] = 1;
      else ticketCounts[ticketId] += 1;

      const iteration = ticketCounts[ticketId];
      if (iteration >= 2 && iteration <= 8) {
        if (!result[period]) result[period] = {};
        if (!result[period][iteration]) result[period][iteration] = new Set();
        result[period][iteration].add(ticketId);
      }
    });

    const cleaned = {};
    for (const period in result) {
      cleaned[period] = {};
      for (const iteration in result[period]) {
        cleaned[period][iteration] = result[period][iteration].size;
      }
    }
    setGroupedData(cleaned);
  };

  // Récupération initiale des données et extraction des années disponibles
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        setData(result);

        const years = [...new Set(result.map((t) => new Date(t[dateUpdateField]).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        const ticketsForYear = result.filter((t) => new Date(t[dateUpdateField]).getFullYear() === latestYear);
        
        // Ne définir les valeurs par défaut que lors de l'initialisation initiale
        if (!initializationCompleted.current) {
          updateSelectedValues(ticketsForYear, viewMode);
          processReentrantData(ticketsForYear, viewMode);
          initializationCompleted.current = true;
        }
        
        // Appliquer le filtre global immédiatement si disponible
        if (globalStartDate && globalEndDate && !globalFilterApplied.current) {
          applyGlobalFilter();
          globalFilterApplied.current = true;
          // Recalculer le groupement de données avec la nouvelle sélection
          processReentrantData(ticketsForYear, viewMode);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setLoading(false);
      }
    }
    fetchData();
  }, [apiUrl, dateUpdateField, idField, weekField, viewMode, showsPerWeek]);

  // Mise à jour du traitement quand selectedYear change
  useEffect(() => {
    if (data.length > 0 && selectedYear) {
      const ticketsForYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === selectedYear);
      processReentrantData(ticketsForYear, viewMode);
    }
  }, [selectedYear, data, dateUpdateField, viewMode]);

  // Effet pour forcer l'utilisation du filtre global
  useEffect(() => {
    if (globalStartDate && globalEndDate && globalModifiedAt > 0) {
      applyGlobalFilter();
      
      // Recalculer le groupement de données avec la nouvelle sélection
      if (data.length > 0 && selectedYear) {
        const ticketsForYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === selectedYear);
        processReentrantData(ticketsForYear, viewMode);
      }
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt, dateUpdateField, viewMode]);

  if (loading)
    return <p className="text-center text-gray-500">Chargement des données...</p>;

  // Fonction pour obtenir les périodes disponibles pour l'année sélectionnée
  const getAvailablePeriodsForYear = (year) => {
    const filteredByYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === year);
    if (viewMode === "week") {
      return [...new Set(filteredByYear.map((t) => t[weekField]))]
        .filter(week => !isNaN(Number(week)))
        .sort((a, b) => a - b);
    } else {
      return [...new Set(filteredByYear.map((t) => new Date(t[dateUpdateField]).getMonth() + 1))].sort((a, b) => a - b);
    }
  };

  const availablePeriods = getAvailablePeriodsForYear(selectedYear);

  const allPeriodsSelected =
    availablePeriods.length > 0 &&
    availablePeriods.every((period) => selectedValues.includes(period));

  const toggleSelectAll = () => {
    const newSelectedValues = allPeriodsSelected ? [] : [...availablePeriods];
    setSelectedValues(newSelectedValues);
    
    // Mise à jour de l'état mémorisé pour la vue actuelle
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
    }
    
    // Marquer comme filtre local, pas global
    setHasGlobalFilter(false);
  };

  const handleSelectionChange = (value) => {
    const newSelectedValues = selectedValues.includes(value) 
      ? selectedValues.filter(v => v !== value) 
      : [...selectedValues, value];
    
    setSelectedValues(newSelectedValues);
    
    // Mise à jour de l'état mémorisé pour la vue actuelle
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
    }
    
    // Marquer comme filtre local, pas global
    setHasGlobalFilter(false);
  };

  // Fonction pour changer de vue (semaine, mois)
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    
    // Réinitialiser les filtres pour la nouvelle année
    // mais garder l'état mémorisé précédent
    const availablePeriods = getAvailablePeriodsForYear(year);
    
    if (viewMode === "week") {
      // Si le filtre global est actif, on le maintient
      if (hasGlobalFilter && globalStartDate && globalEndDate) {
        const weekList = getAllWeeksBetween(globalStartDate, globalEndDate)
          .filter(w => availablePeriods.includes(w));
        setSelectedValues(weekList);
        setWeekViewSelection({
          values: weekList,
          year: year
        });
      } else {
        // Sinon, on garde la sélection précédente si possible
        const intersection = weekViewSelection.values.filter(w => availablePeriods.includes(w));
        if (intersection.length > 0) {
          setSelectedValues(intersection);
          setWeekViewSelection({
            values: intersection,
            year: year
          });
        } else {
          const lastWeeks = availablePeriods.slice(-showsPerWeek);
          setSelectedValues(lastWeeks);
          setWeekViewSelection({
            values: lastWeeks,
            year: year
          });
        }
      }
    } else if (viewMode === "month") {
      if (hasGlobalFilter && globalStartDate && globalEndDate) {
        const monthList = getAllMonthsBetween(globalStartDate, globalEndDate)
          .filter(m => availablePeriods.includes(m));
        setSelectedValues(monthList);
        setMonthViewSelection({
          values: monthList,
          year: year
        });
      } else {
        const intersection = monthViewSelection.values.filter(m => availablePeriods.includes(m));
        if (intersection.length > 0) {
          setSelectedValues(intersection);
          setMonthViewSelection({
            values: intersection,
            year: year
          });
        } else {
          const lastMonths = availablePeriods.slice(-showsPerWeek);
          setSelectedValues(lastMonths);
          setMonthViewSelection({
            values: lastMonths,
            year: year
          });
        }
      }
    }
  };

  // Filtrer les périodes dans groupedData selon la sélection
  const filteredPeriods = Object.keys(groupedData)
    .map((k) => parseInt(k))
    .filter((k) => selectedValues.includes(k))
    .sort((a, b) => a - b);

  const labels = filteredPeriods.map((p) =>
    viewMode === "week" ? `Semaine ${p}` : monthLabels[p]
  );

  const iterations = Array.from({ length: 7 }, (_, i) => i + 2).filter((it) =>
    filteredPeriods.some((period) => groupedData[period]?.[it])
  );

  const datasets = iterations.map((it) => ({
    label: `${it} Réitération${it > 1 ? "s" : ""}`,
    data: filteredPeriods.map((period) => groupedData[period]?.[it] || 0),
    backgroundColor: iterationColors[it] || "#ccc",
    borderRadius: 8,
    hoverBackgroundColor: iterationColors[it],
    hoverBorderWidth: 2,
    hoverBorderColor: "#444",
    categoryPercentage: 0.7,
  }));

  const periodeLabel = selectedValues.length > 0
    ? viewMode === "week"
      ? `Semaine(s) : ${selectedValues.join(", ")}`
      : `Mois : ${selectedValues.map(m => monthLabels[m]).join(", ")}`
    : "Aucune période sélectionnée";

  // Options pour le graphique (partagées entre la vue normale et le modal)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "black",
          font: { size: 11 },
          padding: 10,
        },
      },
      datalabels: {
        anchor: "end",
        align: "end",
        color: "black",
        font: { size: 10 },
        clamp: true,
        clip: false,
        offset: -4,
        formatter: (value) => (value > 0 ? value : ""),
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.raw}`,
        },
      },
    },
    scales: {
      x: { stacked: false },
      y: { beginAtZero: true, stacked: false, ticks: { precision: 0 } },
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
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500">
              {selectedYear && `Année : ${selectedYear} - `}
              {periodeLabel}
            </p>
          </div>
          
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
              {enableToggleView && (
                <div className="flex space-x-2 mb-2 mt-2">
                  <button
                    className={`px-3 py-1 rounded-md ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                    onClick={() => handleViewModeChange("week")}
                  >
                    Semaine
                  </button>
                  <button
                    className={`px-3 py-1 rounded-md ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                    onClick={() => handleViewModeChange("month")}
                  >
                    Mois
                  </button>
                </div>
              )}
              {enableYearFilter && multipleYearsExist && (
                <div className="mb-3">
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
              <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
                {availablePeriods.map((value) => (
                  <div key={value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(value)}
                      onChange={() => handleSelectionChange(value)}
                    />
                    <span className="text-gray-500">
                      {viewMode === "week" ? `Semaine ${value}` : monthLabels[value]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-grow flex justify-center items-center h-[350px]">
          <Bar
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
            <div>
              <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedYear && `Année : ${selectedYear} - `}{periodeLabel}
              </p>
            </div>
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