"use client";

import { useState, useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
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

// Fonction pour obtenir le numéro de semaine ISO
const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

// Palette fixe de couleurs
const palette = [
  "#007bff", // Bleu
  "#1b2b6b", // Bleu foncé
  "#e6733f", // Orange
  "#7c4dd2", // Violet
  "#c9b8f0", // Rose
  "#f1c40f", // Jaune
  "#f39c12", // Orange foncé
  "#2ecc71", // Vert
];

// Fonction qui retourne la couleur en fonction de l'index de manière déterministe
function getColorForIndex(index) {
  if (index < palette.length) {
    return palette[index];
  }
  // Générer une couleur basée sur l'index (pour une bonne dispersion, on peut multiplier par un nombre premier)
  const hue = (index * 37) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export default function VolumeTicketsDivision({
  // Prop obligatoire pour l'URL de l'API
  apiUrl,
  // Props de personnalisation avec valeurs par défaut
  id = "Volume des Tickets par Division",
  title = "Volume des Tickets par Division",
  divisionField = "division",
  dateField = "date_derniere_maj",
  weekField = "semaine",
  // Ici on ne se base plus sur un objet de couleurs par division
  // Personnalisation des noms de mois
  monthNames = {
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
  // Autres options de configuration
  defaultViewMode = "week",
  defaultVisibleItems = 5,
  chartCutoutPercentage = "40%",
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
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [disabledDivisions, setDisabledDivisions] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);

  // Etats pour mémoriser les sélections pour chaque vue
  const [weekViewSelection, setWeekViewSelection] = useState({
    values: [],
    year: null
  });
  const [monthViewSelection, setMonthViewSelection] = useState({
    values: [],
    year: null
  });

  // État pour gérer la priorisation en mode "week"
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);

  // Récupération du filtre global
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
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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

  // Fonction pour appliquer le filtre global à toutes les vues
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

  // Gestion du changement de vue et conservation de l'état précédent
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
    prevViewMode.current = viewMode;
  }, [viewMode]);

  // Récupération initiale des données et extraction des années disponibles
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        setData(result);

        const years = [...new Set(result.map(ticket => new Date(ticket[dateField]).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        if (!initializationCompleted.current) {
          const filteredByYear = result.filter(ticket =>
            new Date(ticket[dateField]).getFullYear() === latestYear
          );
          if (viewMode === "week") {
            const weeks = [...new Set(filteredByYear.map(ticket => ticket[weekField]))]
              .filter(week => !isNaN(Number(week)))
              .sort((a, b) => a - b);
            const lastWeeks = weeks.slice(-defaultVisibleItems);
            setSelectedValues(lastWeeks);
            setWeekViewSelection({
              values: lastWeeks,
              year: latestYear
            });
          } else {
            const months = [...new Set(filteredByYear.map(ticket => new Date(ticket[dateField]).getMonth() + 1))]
              .sort((a, b) => a - b);
            const lastMonths = months.slice(-defaultVisibleItems);
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
        console.error("Erreur fetch :", error);
        setLoading(false);
      }
    }
    fetchData();
  }, [apiUrl, dateField, weekField, defaultVisibleItems]);

  // Forcer la sélection des périodes à partir du filtre global
  useEffect(() => {
    if (globalStartDate && globalEndDate && globalModifiedAt > 0) {
      applyGlobalFilter();
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt]);

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  // Obtenir les périodes disponibles pour l'année sélectionnée
  const getAvailablePeriodsForYear = (year) => {
    const filteredByYear = data.filter(ticket =>
      new Date(ticket[dateField]).getFullYear() === year
    );
    if (viewMode === "week") {
      return [...new Set(filteredByYear.map(ticket => ticket[weekField]))]
        .filter(week => !isNaN(Number(week)))
        .sort((a, b) => a - b);
    } else {
      return [...new Set(filteredByYear.map(ticket => new Date(ticket[dateField]).getMonth() + 1))]
        .sort((a, b) => a - b);
    }
  };

  const availablePeriods = getAvailablePeriodsForYear(selectedYear);

  // Bouton "Tout sélectionner / Tout désélectionner"
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

  // Changer de vue (semaine ou mois)
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
          const lastWeeks = availablePeriods.slice(-defaultVisibleItems);
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
          const lastMonths = availablePeriods.slice(-defaultVisibleItems);
          setSelectedValues(lastMonths);
          setMonthViewSelection({
            values: lastMonths,
            year: year
          });
        }
      }
    }
  };

  // Filtrer les tickets en fonction de l'année et des périodes sélectionnées
  const filteredData = data.filter(ticket => {
    const ticketYear = new Date(ticket[dateField]).getFullYear();
    const ticketPeriod =
      viewMode === "week"
        ? ticket[weekField]
        : new Date(ticket[dateField]).getMonth() + 1;
    return ticketYear === selectedYear && selectedValues.includes(ticketPeriod);
  });

  // Calculer les statistiques par division
  const divisionCounts = {};
  filteredData.forEach(ticket => {
    const division = ticket[divisionField];
    divisionCounts[division] = (divisionCounts[division] || 0) + 1;
  });
  const totalTickets = Object.values(divisionCounts).reduce((sum, val) => sum + val, 0);
  const divisionPercentages = Object.fromEntries(
    Object.entries(divisionCounts).map(([division, count]) => [
      division, ((count / totalTickets) * 100).toFixed(2)
    ])
  );
  const sortedDivisions = Object.keys(divisionCounts).sort((a, b) => divisionCounts[b] - divisionCounts[a]);

  const chartData = {
    labels: sortedDivisions,
    datasets: [
      {
        data: sortedDivisions.map(d =>
          disabledDivisions.includes(d) ? 0 : divisionCounts[d]
        ),
        backgroundColor: sortedDivisions.map((_, i) => getColorForIndex(i)),
        borderWidth: 1,
        cutout: chartCutoutPercentage,
        rotation: -90,
      },
    ],
  };

  const toggleDivision = (division) => {
    setDisabledDivisions(prev =>
      prev.includes(division) ? prev.filter(d => d !== division) : [...prev, division]
    );
  };

  const periodeLabel = selectedValues.length > 0
    ? (viewMode === "week"
        ? `Semaine(s) : ${selectedValues.join(", ")}`
        : `Mois : ${selectedValues.map(m => monthNames[m]).join(", ")}`)
    : "Aucune période sélectionnée";

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right',
        align: 'center',
        labels: {
          color: "black",
          font: { size: 10 },
          boxWidth: 10,
          padding: 10,
          generateLabels: (chart) => {
            const labels = chart.data.labels || [];
            return labels.map((label, i) => ({
              text: label,
              fillStyle: getColorForIndex(i),
              hidden: disabledDivisions.includes(label)
            }));
          }
        },
        onClick: (_, legendItem) => {
          toggleDivision(legendItem.text);
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const division = ctx.label;
            const value = ctx.raw;
            if (disabledDivisions.includes(division)) return null;
            const percent = totalTickets ? ((value / totalTickets) * 100).toFixed(2) : "0.0";
            return `${division}: ${value} tickets (${percent}%)`;
          }
        }
      },
      datalabels: {
        color: "black",
        anchor: "end",
        align: "end",
        offset: 10,
        font: { size: 9 },
        formatter: (value, ctx) => {
          const division = ctx.chart.data.labels[ctx.dataIndex];
          const pct = divisionPercentages[division];
          return value > 0 ? `${value} (${pct}%)` : "";
        },
        display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
      }
    },
    layout: { padding: { top: 50, right: 50, bottom: 20, left: 70 } },
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
                  className={`text-xs px-2 py-1 rounded-md w-full ${allPeriodsSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
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
                      {viewMode === "week" ? `Semaine ${value}` : monthNames[value]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-grow flex justify-center items-center w-full" style={{ padding: '10px 0 0 0' }}>
          <Doughnut
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
              <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedYear && `Année : ${selectedYear} - `}{periodeLabel}
              </p>
            </div>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          <div className="relative h-[400px] flex items-center justify-center">
            <Doughnut
              data={chartData}
              options={chartOptions}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
