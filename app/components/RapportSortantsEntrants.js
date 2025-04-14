"use client";

import { useState, useEffect, useRef } from "react";
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
import { useGlobalFilter } from "./GlobalFilterContext"; 
import Modal from "react-modal";

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

// Fonction pour obtenir le numéro de semaine ISO
const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

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
  defaultViewMode = "week",
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

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [groupedData, setGroupedData] = useState({});
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
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

  // États pour gérer la priorisation du filtre global
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);

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

  // Fonction pour agréger les données selon l'année sélectionnée
  const processData = (tickets, mode) => {
    const aggregatedData = {};
    tickets.forEach(ticket => {
      let key = mode === "week" 
        ? ticket[weekField] 
        : new Date(ticket[dateCreationField]).getMonth() + 1;
      
      if (!aggregatedData[key]) aggregatedData[key] = { entrants: 0, sortants: 0 };
      aggregatedData[key].entrants += 1;
    });
    
    tickets.forEach(ticket => {
      if (ticket[dateClosedField]) {
        let sortantKey = mode === "week" 
          ? ticket[weekClosedField] 
          : new Date(ticket[dateClosedField]).getMonth() + 1;
        
        if (!aggregatedData[sortantKey]) aggregatedData[sortantKey] = { entrants: 0, sortants: 0 };
        aggregatedData[sortantKey].sortants += 1;
      }
    });
    
    setGroupedData(aggregatedData);
  };

  // Fonctions d'aide pour obtenir toutes les semaines ou mois entre deux dates
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

  // Application du filtre global aux différentes vues
  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate) return;
    const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
    setWeekViewSelection({
      values: weekList,
      year: globalStartDate.getFullYear()
    });
    const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
    setMonthViewSelection({
      values: monthList,
      year: globalStartDate.getFullYear()
    });
    if (viewMode === "week") {
      setSelectedValues(weekList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "month") {
      setSelectedValues(monthList);
      setSelectedYear(globalStartDate.getFullYear());
    }
    setHasGlobalFilter(true);
  };

  // Gestion du changement de vue (semaine/mois) et préservation des sélections
  useEffect(() => {
    if (!prevViewMode.current) {
      prevViewMode.current = viewMode;
      return;
    }
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
    if (viewMode === "week" && weekViewSelection.values.length > 0) {
      setSelectedValues(weekViewSelection.values);
      setSelectedYear(weekViewSelection.year || selectedYear);
    } else if (viewMode === "month" && monthViewSelection.values.length > 0) {
      setSelectedValues(monthViewSelection.values);
      setSelectedYear(monthViewSelection.year || selectedYear);
    }
    if (data.length > 0 && selectedYear) {
      const ticketsForYear = data.filter(ticket => 
        new Date(ticket[dateCreationField]).getFullYear() === selectedYear
      );
      processData(ticketsForYear, viewMode);
    }
    prevViewMode.current = viewMode;
  }, [viewMode]);

  // Récupération des données via l'API et initialisation des états associés
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        setData(result);
        const years = [...new Set(result.map(ticket => new Date(ticket[dateCreationField]).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);
        const ticketsForYear = result.filter(ticket => 
          new Date(ticket[dateCreationField]).getFullYear() === latestYear
        );
        processData(ticketsForYear, viewMode);
        if (!initializationCompleted.current) {
          const availableWeeks = [...new Set(ticketsForYear.map(ticket => ticket[weekField]))]
            .filter(week => !isNaN(Number(week)))
            .sort((a, b) => a - b);
          const availableMonths = [...new Set(ticketsForYear.map(ticket => 
            new Date(ticket[dateCreationField]).getMonth() + 1
          ))].sort((a, b) => a - b);
          const lastWeeks = availableWeeks.slice(-defaultNumPeriods);
          const lastMonths = availableMonths.slice(-defaultNumPeriods);
          if (viewMode === "week") {
            setSelectedValues(lastWeeks);
            setWeekViewSelection({
              values: lastWeeks,
              year: latestYear
            });
          } else {
            setSelectedValues(lastMonths);
            setMonthViewSelection({
              values: lastMonths,
              year: latestYear
            });
          }
          initializationCompleted.current = true;
        }
        if (globalStartDate && globalEndDate && !globalFilterApplied.current) {
          applyGlobalFilter();
          globalFilterApplied.current = true;
        }
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du fetch des données :", error);
        setLoading(false);
      }
    }
    fetchData();
  }, [apiUrl, dateCreationField, weekField, defaultNumPeriods]);

  // Recalcul des données lorsque l'année sélectionnée change
  useEffect(() => {
    if (data.length > 0 && selectedYear) {
      const ticketsForYear = data.filter(ticket => 
        new Date(ticket[dateCreationField]).getFullYear() === selectedYear
      );
      processData(ticketsForYear, viewMode);
    }
  }, [selectedYear, data, dateCreationField, weekField, weekClosedField, dateClosedField]);

  // Application du filtre global si celui-ci est plus récent que la modification locale
  useEffect(() => {
    if (globalStartDate && globalEndDate && globalModifiedAt > 0) {
      applyGlobalFilter();
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt]);

  if (loading)
    return <p className="text-center text-gray-500">Chargement des données...</p>;

  // Fonctions et calculs pour l'affichage (sélection des périodes, labels, etc.)
  const getAvailablePeriodsForYear = (year) => {
    const ticketsForYear = data.filter(ticket => 
      new Date(ticket[dateCreationField]).getFullYear() === year
    );
    if (viewMode === "week") {
      return [...new Set(ticketsForYear.map(ticket => ticket[weekField]))]
        .filter(week => !isNaN(Number(week)))
        .sort((a, b) => a - b);
    } else {
      return [...new Set(ticketsForYear.map(ticket => 
        new Date(ticket[dateCreationField]).getMonth() + 1
      ))].sort((a, b) => a - b);
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
    setHasGlobalFilter(false);
  };

  const handleSelectionChange = (value) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
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
    }
    setHasGlobalFilter(false);
  };

  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    const availablePeriods = getAvailablePeriodsForYear(year);
    if (viewMode === "week") {
      if (hasGlobalFilter && globalStartDate && globalEndDate) {
        const weekList = getAllWeeksBetween(globalStartDate, globalEndDate)
          .filter(w => availablePeriods.includes(w));
        setSelectedValues(weekList);
        setWeekViewSelection({
          values: weekList,
          year: year
        });
      } else {
        const intersection = weekViewSelection.values.filter(w => availablePeriods.includes(w));
        if (intersection.length > 0) {
          setSelectedValues(intersection);
          setWeekViewSelection({
            values: intersection,
            year: year
          });
        } else {
          const lastWeeks = availablePeriods.slice(-defaultNumPeriods);
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
          const lastMonths = availablePeriods.slice(-defaultNumPeriods);
          setSelectedValues(lastMonths);
          setMonthViewSelection({
            values: lastMonths,
            year: year
          });
        }
      }
    }
  };

  const filteredPeriods = Object.keys(groupedData)
    .map(key => parseInt(key))
    .filter(key => selectedValues.includes(key))
    .sort((a, b) => a - b);

  const labels = filteredPeriods.map(p => 
    viewMode === "week" 
      ? `Semaine ${p}` 
      : moisFrancais[p]
  );

  const dataValues = filteredPeriods.map(period => {
    const { entrants, sortants } = groupedData[period] || { entrants: 0, sortants: 0 };
    if (calculateRatio) {
      return entrants > 0 ? ((sortants / entrants) * ratioMultiplier).toFixed(1) : 0;
    } else {
      return sortants;
    }
  });

  const periodeLabel = selectedValues.length > 0
    ? (viewMode === "week" 
        ? `Semaine(s) : ${selectedValues.join(", ")}`
        : `Mois : ${selectedValues.map(m => moisFrancais[m]).join(", ")}`)
    : "Aucune période sélectionnée";

  const chartOptions = {
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
      x: { grid: { display: false } },
      y: {
        grid: { display: true },
        ticks: { callback: (value) => `${value}${yAxisLabel}` },
      },
    },
  };

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

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
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
          {isOpen && (
            <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
              <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
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
              <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
                {availablePeriods.map(value => (
                  <div key={value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(value)}
                      onChange={() => handleSelectionChange(value)}
                    />
                    <span className="text-gray-500">
                      {viewMode === "week" ? `Semaine ${value}` : moisFrancais[value]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-grow flex justify-center items-center h-[350px]">
          <Line
            data={chartData}
            options={chartOptions}
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
              <h3 className="text-2xl font-semibold text-gray-800">{subTitle}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedYear && `Année : ${selectedYear} - `}{periodeLabel}
              </p>
            </div>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          <div className="relative h-[400px] flex items-center justify-center">
            <Line
              data={chartData}
              options={chartOptions}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
