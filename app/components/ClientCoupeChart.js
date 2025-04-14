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
import Modal from "react-modal";
import { useGlobalFilter } from "@/app/components/GlobalFilterContext"; 

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
  const yearStart = new Date(Date.UTC(tempDate.getFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

export default function ClientCoupeChart({
  // Prop obligatoire pour l'URL de l'API
  apiUrl,
  // Props de personnalisation avec valeurs par défaut
  id = "Client Coupé",
  title = "Client Coupé",
  barColor = "#2c3e50",
  barHoverColor = "#1c2c3d",
  dateField = "date_derniere_maj",
  weekField = "semaine",
  filterField = "client_coupe",
  filterValue = "OK",
  yAxisLabel = "Nombre de clients coupés"
}) {
  // Gestion de l'absence de prop apiUrl
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
  const prevViewMode = useRef(null);
  const filterPanelRef = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
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

  // États pour la priorisation des filtres
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);

  // Noms des mois en français
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

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
    
    // Ajouter l'écouteur d'événements
    document.addEventListener("mousedown", handleClickOutside);
    
    // Nettoyer l'écouteur d'événements
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
    
    prevViewMode.current = viewMode;
  }, [viewMode]);

  // Récupération initiale des données, extraction des années et définition par défaut des périodes pour l'année sélectionnée
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        setData(result);

        // Extraction des années depuis date_derniere_maj
        const years = [...new Set(result.map(t => new Date(t[dateField]).getFullYear()))].sort((a, b) => a - b);
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        // Ne définir les valeurs par défaut que lors de l'initialisation initiale
        if (!initializationCompleted.current) {
          // Filtrer les tickets pour l'année sélectionnée
          const ticketsForYear = result.filter(t => new Date(t[dateField]).getFullYear() === latestYear);
          const weeks = [...new Set(ticketsForYear.map(t => t[weekField]))]
            .filter(week => !isNaN(Number(week)))
            .sort((a, b) => a - b);
          const months = [...new Set(ticketsForYear.map(t => new Date(t[dateField]).getMonth() + 1))].sort((a, b) => a - b);
          
          const lastWeeks = weeks.slice(-5);
          const lastMonths = months.slice(-5);
          
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
        
        // Appliquer le filtre global immédiatement si disponible
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
  }, [apiUrl, dateField, weekField]);

  // Effet pour forcer la sélection des périodes à partir du filtre global (si plus récent que la modification locale)
  useEffect(() => {
    if (globalStartDate && globalEndDate && globalModifiedAt > 0) {
      applyGlobalFilter();
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt]);

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  // Fonction pour obtenir les périodes disponibles pour l'année sélectionnée
  const getAvailablePeriodsForYear = (year) => {
    const ticketsForYear = data.filter(t => new Date(t[dateField]).getFullYear() === year);
    if (viewMode === "week") {
      return [...new Set(ticketsForYear.map(t => t[weekField]))]
        .filter(week => !isNaN(Number(week)))
        .sort((a, b) => a - b);
    } else {
      return [...new Set(ticketsForYear.map(t => new Date(t[dateField]).getMonth() + 1))].sort((a, b) => a - b);
    }
  };

  const availablePeriods = getAvailablePeriodsForYear(selectedYear);

  // Bouton "Tout sélectionner / Tout désélectionner" pour les périodes de l'année en cours
  const allPeriodsSelected =
    availablePeriods.length > 0 &&
    availablePeriods.every(period => selectedValues.includes(period));

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
          const lastWeeks = availablePeriods.slice(-5);
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
          const lastMonths = availablePeriods.slice(-5);
          setSelectedValues(lastMonths);
          setMonthViewSelection({
            values: lastMonths,
            year: year
          });
        }
      }
    }
  };

  // Fonction pour changer de vue (semaine, mois)
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
  };

  // Filtrer les tickets pour l'année sélectionnée
  const ticketsForYear = data.filter(t => new Date(t[dateField]).getFullYear() === selectedYear);

  // Filtrer les tickets selon les périodes sélectionnées (dans l'année en cours)
  const filteredData = ticketsForYear.filter(ticket =>
    selectedValues.includes(
      viewMode === "week"
        ? ticket[weekField]
        : new Date(ticket[dateField]).getMonth() + 1
    )
  );

  // On s'assure que les périodes sélectionnées sont triées chronologiquement
  const sortedSelectedValues = [...selectedValues].sort((a, b) => a - b);
  
  // Création des labels pour le graphique
  const labels = sortedSelectedValues.map(period => {
    if (viewMode === "week") {
      return `S${period}`;
    } else {
      // Utiliser le nom du mois en français
      return monthNames[period - 1];
    }
  });

  // Comptage des clients coupés pour chaque période (filtrée et triée)
  const clientCoupeCounts = sortedSelectedValues.map(period =>
    filteredData.filter(ticket =>
      (viewMode === "week"
        ? ticket[weekField]
        : new Date(ticket[dateField]).getMonth() + 1) === period &&
      ticket[filterField] === filterValue
    ).length
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: title,
        data: clientCoupeCounts,
        backgroundColor: barColor,
        borderRadius: 10,
        hoverBackgroundColor: barHoverColor,
        hoverBorderWidth: 2,
        hoverBorderColor: "#444",
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
    ],
  };

  // Texte d'affichage de la période sélectionnée
  const periodeLabel = selectedValues.length > 0
    ? (viewMode === "week"
        ? `Semaine(s) : ${sortedSelectedValues.join(", ")}`
        : `Mois : ${sortedSelectedValues.map(m => monthNames[m - 1]).join(", ")}`)
    : "Aucune période sélectionnée";

  // Options pour le graphique (partagées entre la vue normale et le modal)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
      easing: "easeOutQuart"
    },
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: "end",
        align: "end",
        color: "black",
        font: { size: 11 },
        formatter: value => value > 0 ? value : "",
        offset: -4
      }
    },
    scales: {
      x: {
        ticks: { color: "black" },
        title: {
          display: true,
          text: viewMode === "week" ? "Semaines" : "Mois",
          color: "black"
        }
      },
      y: {
        beginAtZero: true,
        ticks: { color: "black" },
        title: {
          display: true,
          text: yAxisLabel,
          color: "black"
        }
      }
    }
  };

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Header avec titre, sous-titre et boutons */}
        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500">
              {selectedYear && `Année : ${selectedYear} - `}{periodeLabel}
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
                  className={`px-3 py-1 rounded-md ${
                    viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"
                  }`}
                  onClick={() => handleViewModeChange("week")}
                >
                  Semaine
                </button>
                <button
                  className={`px-3 py-1 rounded-md ${
                    viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"
                  }`}
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
                        className={`px-2 py-1 text-xs rounded-md ${
                          selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                        }`}
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
                    allPeriodsSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
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
                      {viewMode === "week" ? `Semaine ${value}` : monthNames[value - 1]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-grow flex justify-center items-center w-full">
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