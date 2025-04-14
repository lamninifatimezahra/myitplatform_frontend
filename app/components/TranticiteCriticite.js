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

// Fonction utilitaire pour obtenir le numéro de semaine ISO
const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

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
  // Prop obligatoire pour l'URL de l'API
  apiUrl,
  // Props de personnalisation (vous pouvez surcharger ces valeurs si nécessaire)
  dateUpdateField = "date_derniere_maj",   // Champ pour la date de mise à jour (entrants)
  weekField = "semaine",                    // Champ pour le numéro de semaine (entrants)
  dateClosedField = "date_sortie",          // Champ pour la date de clôture (sortants)
  weekClosedField = "semaine_date_sortant",   // Champ pour le numéro de semaine (sortants)
  defaultViewMode = "week",                 // Mode de filtrage par défaut ("week" ou "month")
  // Autres configurations que vous souhaitez personnaliser
  availableSeverities = ["Mineur", "Majeur", "Critique", "Information"]
}) {
  // Vérification de la présence de l'URL API
  if (!apiUrl) {
    return (
      <div className="visualisation relative" data-id="Transité / Criticité">
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <p className="text-red-500 text-sm mt-2">Erreur : L'URL de l'API est requise.</p>
        </div>
      </div>
    );
  }

  const id = "Transité / Criticité";
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);
  const prevViewMode = useRef(null);
  const filterPanelRef = useRef(null);

  // États locaux
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [selectedValues, setSelectedValues] = useState([]);
  const [selectedSeverities, setSelectedSeverities] = useState(availableSeverities);
  const [isOpen, setIsOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);

  // États pour mémoriser les sélections selon le mode
  const [weekViewSelection, setWeekViewSelection] = useState({ values: [], year: null });
  const [monthViewSelection, setMonthViewSelection] = useState({ values: [], year: null });

  // Récupération du contexte global pour le filtrage
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Gestion des clics extérieurs au panneau de filtre
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Fonction pour générer toutes les semaines entre deux dates
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

  // Application du filtre global
  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate) return;
    const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
    setWeekViewSelection({ values: weekList, year: globalStartDate.getFullYear() });
    const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
    setMonthViewSelection({ values: monthList, year: globalStartDate.getFullYear() });
    if (viewMode === "week") {
      setSelectedValues(weekList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "month") {
      setSelectedValues(monthList);
      setSelectedYear(globalStartDate.getFullYear());
    }
    setHasGlobalFilter(true);
  };

  // Sauvegarde/restauration des sélections lors d'un changement de vue
  useEffect(() => {
    if (!prevViewMode.current) {
      prevViewMode.current = viewMode;
      return;
    }
    if (prevViewMode.current === "week") {
      setWeekViewSelection({ values: selectedValues, year: selectedYear });
    } else if (prevViewMode.current === "month") {
      setMonthViewSelection({ values: selectedValues, year: selectedYear });
    }
    if (viewMode === "week" && weekViewSelection.values.length > 0) {
      setSelectedValues(weekViewSelection.values);
      setSelectedYear(weekViewSelection.year || selectedYear);
    } else if (viewMode === "month" && monthViewSelection.values.length > 0) {
      setSelectedValues(monthViewSelection.values);
      setSelectedYear(monthViewSelection.year || selectedYear);
    }
    prevViewMode.current = viewMode;
  }, [viewMode]);

  // ---------------------------
  // Chargement initial des données
  // ---------------------------
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        setData(result);

        const years = [...new Set(result.map(ticket => new Date(ticket[dateUpdateField]).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        const filteredByYear = result.filter(ticket =>
          new Date(ticket[dateUpdateField]).getFullYear() === latestYear
        );

        if (!initializationCompleted.current) {
          if (viewMode === "week") {
            const availableWeeks = [...new Set(filteredByYear.map(ticket => ticket[weekField]))]
              .filter(week => !isNaN(Number(week)))
              .sort((a, b) => a - b);
            const lastWeeks = availableWeeks.slice(-5);
            setSelectedValues(lastWeeks);
            setWeekViewSelection({ values: lastWeeks, year: latestYear });
          } else {
            const availableMonths = [...new Set(filteredByYear.map(ticket => new Date(ticket[dateUpdateField]).getMonth() + 1))].sort((a, b) => a - b);
            const lastMonths = availableMonths.slice(-5);
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
        console.error("Erreur lors du fetch des données :", error);
        setLoading(false);
      }
    }
    fetchData();
  }, [apiUrl, dateUpdateField, weekField]);

  useEffect(() => {
    if (globalStartDate && globalEndDate && globalModifiedAt > 0) {
      applyGlobalFilter();
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt]);

  if (loading) {
    return <p className="text-center text-gray-500">Chargement des données...</p>;
  }

  // ---------------------------
  // Filtrage et préparation des périodes disponibles
  // ---------------------------
  const getAvailablePeriodsForYear = (year) => {
    const filteredByYear = data.filter(ticket =>
      new Date(ticket[dateUpdateField]).getFullYear() === year
    );
    if (viewMode === "week") {
      return [...new Set(filteredByYear.map(ticket => ticket[weekField]))]
        .filter(week => !isNaN(Number(week)))
        .sort((a, b) => a - b);
    } else {
      return [...new Set(filteredByYear.map(ticket => new Date(ticket[dateUpdateField]).getMonth() + 1))].sort((a, b) => a - b);
    }
  };

  const availablePeriods = getAvailablePeriodsForYear(selectedYear);
  const allPeriodsSelected = availablePeriods.length > 0 &&
    availablePeriods.every(period => selectedValues.includes(period));

  const selectedValuesWithYear = selectedValues.map(value => ({ value, year: selectedYear }));

  // Filtrer les tickets en fonction des périodes sélectionnées et de la criticité (severite)
  const filteredData = data.filter(ticket => {
    const ticketYear = new Date(ticket[dateUpdateField]).getFullYear();
    const ticketPeriod = viewMode === "week" ? ticket[weekField] : new Date(ticket[dateUpdateField]).getMonth() + 1;
    return selectedValuesWithYear.some(item =>
      item.value === ticketPeriod && item.year === ticketYear
    ) && availableSeverities.includes(ticket.severite);
  });

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const labels = selectedValuesWithYear.map(item => {
    let periodLabel = viewMode === "week" ? `S${item.value}` : monthNames[item.value - 1];
    return multipleYearsExist ? `${periodLabel}, ${item.year}` : periodLabel;
  });

  const totalCounts = selectedValuesWithYear.map(item =>
    filteredData.filter(ticket => {
      const ticketYear = new Date(ticket[dateUpdateField]).getFullYear();
      const ticketPeriod = viewMode === "week" ? ticket[weekField] : new Date(ticket[dateUpdateField]).getMonth() + 1;
      return ticketPeriod === item.value && ticketYear === item.year;
    }).length
  );

  const datasets = [
    ...availableSeverities.map(severity => ({
      label: severity,
      data: selectedValuesWithYear.map(item =>
        filteredData.filter(ticket => {
          const ticketYear = new Date(ticket[dateUpdateField]).getFullYear();
          const ticketPeriod = viewMode === "week" ? ticket[weekField] : new Date(ticket[dateUpdateField]).getMonth() + 1;
          return ticketPeriod === item.value && ticketYear === item.year && ticket.severite === severity;
        }).length
      ),
      backgroundColor: getColorForSeverity(severity),
      stack: "stack1",
      borderRadius: 10,
      datalabels: {
        display: true,
        color: "black",
        anchor: "center",
        align: "center",
        formatter: value => (value > 0 ? value : ""),
      }
    })),
    {
      label: "Total",
      data: totalCounts,
      type: "bar",
      backgroundColor: "transparent",
      borderWidth: 0,
      stack: undefined,
      datalabels: {
        display: true,
        anchor: "end",
        align: "top",
        color: "black",
        font: { weight: "bold", size: 14 },
        offset: 0,
        padding: { top: 5 }
      }
    }
  ];

  function getColorForSeverity(severity) {
    switch (severity) {
      case "Mineur": return "#b8e0f0";
      case "Majeur": return "#c9b8f0";
      case "Critique": return "#8A4FFF";
      case "Information": return "#60b2f0";
      default: return "#bdc3c7";
    }
  }

  const handleSelectionChange = (value) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    setSelectedValues(newSelectedValues);
    if (viewMode === "week") {
      setWeekViewSelection({ values: newSelectedValues, year: selectedYear });
      setWeekSelectionModifiedAt(Date.now());
    } else if (viewMode === "month") {
      setMonthViewSelection({ values: newSelectedValues, year: selectedYear });
      setMonthSelectionModifiedAt(Date.now());
    }
    setHasGlobalFilter(false);
  };

  const toggleSelectAll = () => {
    const newSelectedValues = allPeriodsSelected ? [] : [...availablePeriods];
    setSelectedValues(newSelectedValues);
    if (viewMode === "week") {
      setWeekViewSelection({ values: newSelectedValues, year: selectedYear });
      setWeekSelectionModifiedAt(Date.now());
    } else if (viewMode === "month") {
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
        setWeekViewSelection({ values: weekList, year: year });
      } else {
        const intersection = weekViewSelection.values.filter(w => availablePeriods.includes(w));
        if (intersection.length > 0) {
          setSelectedValues(intersection);
          setWeekViewSelection({ values: intersection, year: year });
        } else {
          const lastWeeks = availablePeriods.slice(-5);
          setSelectedValues(lastWeeks);
          setWeekViewSelection({ values: lastWeeks, year: year });
        }
      }
    } else if (viewMode === "month") {
      if (hasGlobalFilter && globalStartDate && globalEndDate) {
        const monthList = getAllMonthsBetween(globalStartDate, globalEndDate)
          .filter(m => availablePeriods.includes(m));
        setSelectedValues(monthList);
        setMonthViewSelection({ values: monthList, year: year });
      } else {
        const intersection = monthViewSelection.values.filter(m => availablePeriods.includes(m));
        if (intersection.length > 0) {
          setSelectedValues(intersection);
          setMonthViewSelection({ values: intersection, year: year });
        } else {
          const lastMonths = availablePeriods.slice(-5);
          setSelectedValues(lastMonths);
          setMonthViewSelection({ values: lastMonths, year: year });
        }
      }
    }
  };

  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
  };

  const periodeLabelText = selectedValues.length > 0
    ? (viewMode === "week"
        ? `Semaine(s) : ${selectedValues.join(", ")}`
        : `Mois : ${selectedValues.map(m => monthNames[m - 1]).join(", ")}`)
    : "Aucune période sélectionnée";

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      datalabels: { display: false },
      tooltip: {
        callbacks: {
          footer: (tooltipItems) => {
            const sum = tooltipItems[0].dataset.data[tooltipItems[0].dataIndex];
            return `Total: ${sum}`;
          }
        }
      }
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true },
    }
  };

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Header avec titre, sous-titre et boutons */}
        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Transité / Criticité</h3>
            <p className="text-sm text-gray-500">
              {selectedYear && `Année : ${selectedYear} - `}{periodeLabelText}
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
              <div className="flex space-x-2 mb-2 mt-2">
                <button
                  className={`px-3 py-1 rounded-md ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                  onClick={() => handleViewModeChange("week")}>
                  Semaine
                </button>
                <button
                  className={`px-3 py-1 rounded-md ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                  onClick={() => handleViewModeChange("month")}>
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
                        className={`px-2 py-1 text-xs rounded-md ${selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mb-2">
                <button
                  onClick={toggleSelectAll}
                  className={`text-xs px-2 py-1 rounded-md w-full ${allPeriodsSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}>
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
                    <span className="text-gray-500">{viewMode === "week" ? `Semaine ${value}` : monthNames[value - 1]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
  
        <div className="flex-grow flex justify-center items-center w-full">
          <Bar data={{ labels, datasets }} options={chartOptions} />
        </div>
      </div>
  
      {/* Modal d'agrandissement */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-800">Transité / Criticité</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedYear && `Année : ${selectedYear} - `}{periodeLabelText}
              </p>
            </div>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          <div className="relative h-[400px] flex items-center justify-center">
            <Bar data={{ labels, datasets }} options={chartOptions} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
