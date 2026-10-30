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
import CommentButton from "./CommentButton";

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

// Couleur pour la catégorie "Autres"
const AUTRES_COLOR = "#808080"; // Gris

// Fonction qui retourne la couleur en fonction de l'index de manière déterministe
function getColorForIndex(index) {
  if (index < palette.length) {
    return palette[index];
  }
  // Générer une couleur basée sur l'index
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
  monthNames = {
    1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril", 5: "Mai", 6: "Juin",
    7: "Juillet", 8: "Août", 9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre"
  },
  // Autres options de configuration
  defaultViewMode = "week",
  defaultVisibleItems = 5,
  chartCutoutPercentage = "40%",
}) {
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
  const [disabledDivisions, setDisabledDivisions] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
  const [comments, setComments] = useState([]);

  // Etats pour mémoriser les sélections pour chaque vue
  const [weekViewSelection, setWeekViewSelection] = useState({ values: [], year: null });
  const [monthViewSelection, setMonthViewSelection] = useState({ values: [], year: null });
  const [quarterViewSelection, setQuarterViewSelection] = useState({ values: [], year: null });
  const [semesterViewSelection, setSemesterViewSelection] = useState({ values: [], year: null });

  // État pour gérer la priorisation des vues
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);
  const [quarterSelectionModifiedAt, setQuarterSelectionModifiedAt] = useState(0);
  const [semesterSelectionModifiedAt, setSemesterSelectionModifiedAt] = useState(0);

  // Noms des trimestres et semestres
  const quarterNames = { 1: "T1", 2: "T2", 3: "T3", 4: "T4" };
  const semesterNames = { 1: "S1", 2: "S2" };

  // Gestion des commentaires
  const handleAddComment = (comment) => setComments(prev => [...prev, comment]);
  const handleUpdateComment = (updated) => setComments(prev => prev.map(c => c.id === updated.id ? updated : c));
  const handleDeleteComment = (id) => setComments(prev => prev.filter(c => c.id !== id));

  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  useEffect(() => {
    function handleClickOutside(event) {
      if (isOpen && filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest('button[data-filter-toggle]')) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Fonctions pour générer des listes de périodes
  function getAllWeeksBetween(startDate, endDate) { if (!startDate || !endDate) return []; const weeks = []; let currentDate = new Date(startDate); while (currentDate <= endDate) { weeks.push(getWeekNumber(currentDate)); currentDate.setDate(currentDate.getDate() + 7); } return [...new Set(weeks)]; }
  function getAllMonthsBetween(startDate, endDate) { if (!startDate || !endDate) return []; const months = []; let currentDate = new Date(startDate); while (currentDate <= endDate) { months.push(currentDate.getMonth() + 1); currentDate.setMonth(currentDate.getMonth() + 1); } return [...new Set(months)]; }
  function getAllQuartersBetween(startDate, endDate) { if (!startDate || !endDate) return []; const quarters = []; let currentDate = new Date(startDate); while (currentDate <= endDate) { quarters.push(getQuarter(currentDate)); currentDate.setMonth(currentDate.getMonth() + 3); } return [...new Set(quarters)]; }
  function getAllSemestersBetween(startDate, endDate) { if (!startDate || !endDate) return []; const semesters = []; let currentDate = new Date(startDate); while (currentDate <= endDate) { semesters.push(getSemester(currentDate)); currentDate.setMonth(currentDate.getMonth() + 6); } return [...new Set(semesters)]; }

  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate) return;
    const commonProps = { year: globalStartDate.getFullYear() };
    const weekList = getAllWeeksBetween(globalStartDate, globalEndDate); setWeekViewSelection({ values: weekList, ...commonProps });
    const monthList = getAllMonthsBetween(globalStartDate, globalEndDate); setMonthViewSelection({ values: monthList, ...commonProps });
    const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate); setQuarterViewSelection({ values: quarterList, ...commonProps });
    const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate); setSemesterViewSelection({ values: semesterList, ...commonProps });

    const setters = { week: setSelectedValues, month: setSelectedValues, quarter: setSelectedValues, semester: setSelectedValues };
    const lists = { week: weekList, month: monthList, quarter: quarterList, semester: semesterList };
    setters[viewMode](lists[viewMode]);
    setSelectedYear(globalStartDate.getFullYear());
    setHasGlobalFilter(true);
  };

  useEffect(() => {
    if (!prevViewMode.current) { prevViewMode.current = viewMode; return; }
    const selections = { week: weekViewSelection, month: monthViewSelection, quarter: quarterViewSelection, semester: semesterViewSelection };
    const currentSelection = { values: selectedValues, year: selectedYear };
    if (prevViewMode.current === "week") setWeekViewSelection(currentSelection);
    else if (prevViewMode.current === "month") setMonthViewSelection(currentSelection);
    else if (prevViewMode.current === "quarter") setQuarterViewSelection(currentSelection);
    else if (prevViewMode.current === "semester") setSemesterViewSelection(currentSelection);
    
    if (selections[viewMode].values.length > 0) {
      setSelectedValues(selections[viewMode].values);
      setSelectedYear(selections[viewMode].year || selectedYear);
    }
    prevViewMode.current = viewMode;
  }, [viewMode]);

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
          const filteredByYear = result.filter(t => new Date(t[dateField]).getFullYear() === latestYear);
          const periodExtractors = {
            week: t => t[weekField],
            month: t => new Date(t[dateField]).getMonth() + 1,
            quarter: t => getQuarter(new Date(t[dateField])),
            semester: t => getSemester(new Date(t[dateField])),
          };
          const periods = [...new Set(filteredByYear.map(periodExtractors[viewMode]))].filter(p => !isNaN(Number(p))).sort((a, b) => a - b);
          const lastPeriods = periods.slice(-defaultVisibleItems);
          setSelectedValues(lastPeriods);
          const selections = {
            week: setWeekViewSelection, month: setMonthViewSelection,
            quarter: setQuarterViewSelection, semester: setSemesterViewSelection
          };
          selections[viewMode]({ values: lastPeriods, year: latestYear });
          initializationCompleted.current = true;
        }
        if (globalStartDate && globalEndDate && !globalFilterApplied.current) {
          applyGlobalFilter();
          globalFilterApplied.current = true;
        }
        setLoading(false);
      } catch (error) { console.error("Erreur fetch :", error); setLoading(false); }
    }
    fetchData();
  }, [apiUrl, dateField, weekField, defaultVisibleItems]);

  useEffect(() => {
    if (globalStartDate && globalEndDate && globalModifiedAt > 0) applyGlobalFilter();
  }, [globalStartDate, globalEndDate, globalModifiedAt]);

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  const getAvailablePeriodsForYear = (year) => {
    const filtered = data.filter(t => new Date(t[dateField]).getFullYear() === year);
    const extractors = {
      week: t => t[weekField], month: t => new Date(t[dateField]).getMonth() + 1,
      quarter: t => getQuarter(new Date(t[dateField])), semester: t => getSemester(new Date(t[dateField]))
    };
    return [...new Set(filtered.map(extractors[viewMode]))].filter(p => !isNaN(Number(p))).sort((a, b) => a - b);
  };

  const availablePeriods = getAvailablePeriodsForYear(selectedYear);
  const allPeriodsSelected = availablePeriods.length > 0 && availablePeriods.every(p => selectedValues.includes(p));

  const toggleSelectAll = () => {
    const newValues = allPeriodsSelected ? [] : [...availablePeriods];
    setSelectedValues(newValues);
    const setters = {
      week: setWeekViewSelection, month: setMonthViewSelection, quarter: setQuarterViewSelection, semester: setSemesterViewSelection
    };
    const timeSetters = {
      week: setWeekSelectionModifiedAt, month: setMonthSelectionModifiedAt, quarter: setQuarterSelectionModifiedAt, semester: setSemesterSelectionModifiedAt
    };
    setters[viewMode]({ values: newValues, year: selectedYear });
    timeSetters[viewMode](Date.now());
    setHasGlobalFilter(false);
  };
  
  const handleSelectionChange = (value) => {
    const newValues = selectedValues.includes(value) ? selectedValues.filter(v => v !== value) : [...selectedValues, value];
    setSelectedValues(newValues);
    const setters = { week: setWeekViewSelection, month: setMonthViewSelection, quarter: setQuarterViewSelection, semester: setSemesterViewSelection };
    const timeSetters = { week: setWeekSelectionModifiedAt, month: setMonthSelectionModifiedAt, quarter: setQuarterSelectionModifiedAt, semester: setSemesterSelectionModifiedAt };
    setters[viewMode]({ values: newValues, year: selectedYear });
    timeSetters[viewMode](Date.now());
    setHasGlobalFilter(false);
  };

  const handleViewModeChange = (newMode) => setViewMode(newMode);

  const handleYearChange = (year) => {
    setSelectedYear(year);
    const periods = getAvailablePeriodsForYear(year);
    let newValues = [];
    if (hasGlobalFilter && globalStartDate && globalEndDate) {
      const globalPeriodFunctions = { week: getAllWeeksBetween, month: getAllMonthsBetween, quarter: getAllQuartersBetween, semester: getAllSemestersBetween };
      newValues = globalPeriodFunctions[viewMode](globalStartDate, globalEndDate).filter(p => periods.includes(p));
    } else {
      const selections = { week: weekViewSelection, month: monthViewSelection, quarter: quarterViewSelection, semester: semesterViewSelection };
      const intersection = selections[viewMode].values.filter(v => periods.includes(v));
      newValues = intersection.length > 0 ? intersection : periods.slice(-defaultVisibleItems);
    }
    setSelectedValues(newValues);
    const setters = { week: setWeekViewSelection, month: setMonthViewSelection, quarter: setQuarterViewSelection, semester: setSemesterViewSelection };
    setters[viewMode]({ values: newValues, year: year });
  };
  
  const filteredData = data.filter(ticket => {
    const ticketYear = new Date(ticket[dateField]).getFullYear();
    let ticketPeriod;
    if (viewMode === "week") ticketPeriod = ticket[weekField];
    else if (viewMode === "month") ticketPeriod = new Date(ticket[dateField]).getMonth() + 1;
    else if (viewMode === "quarter") ticketPeriod = getQuarter(new Date(ticket[dateField]));
    else if (viewMode === "semester") ticketPeriod = getSemester(new Date(ticket[dateField]));
    return ticketYear === selectedYear && selectedValues.includes(ticketPeriod);
  });
  
  // ====================================================================
  // MODIFICATION : Calculer et regrouper les divisions de moins de 2%
  // ====================================================================
  const divisionCounts = {};
  filteredData.forEach(ticket => {
    const division = ticket[divisionField];
    divisionCounts[division] = (divisionCounts[division] || 0) + 1;
  });

  const totalTickets = Object.values(divisionCounts).reduce((sum, val) => sum + val, 0);

  const finalDivisionData = {};
  let autresCount = 0;

  // Séparer les divisions principales de celles à regrouper
  Object.entries(divisionCounts).forEach(([division, count]) => {
    if (totalTickets > 0 && (count / totalTickets) * 100 < 2) {
      autresCount += count;
    } else {
      finalDivisionData[division] = count;
    }
  });

  // Ajouter la catégorie "Autres" si nécessaire
  if (autresCount > 0) {
    finalDivisionData["Autres"] = autresCount;
  }
  
  const sortedDivisions = Object.keys(finalDivisionData).sort((a, b) => {
    if (a === "Autres") return 1; // Toujours placer "Autres" à la fin
    if (b === "Autres") return -1;
    return finalDivisionData[b] - finalDivisionData[a];
  });
  
  const divisionPercentages = Object.fromEntries(
    Object.entries(finalDivisionData).map(([division, count]) => [
      division, totalTickets > 0 ? ((count / totalTickets) * 100).toFixed(2) : "0.00"
    ])
  );
  // ====================================================================
  // FIN DE LA MODIFICATION
  // ====================================================================

  const chartData = {
    labels: sortedDivisions,
    datasets: [
      {
        data: sortedDivisions.map(d =>
          disabledDivisions.includes(d) ? 0 : finalDivisionData[d]
        ),
        backgroundColor: sortedDivisions.map((division, i) => 
            division === "Autres" ? AUTRES_COLOR : getColorForIndex(i)
        ),
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
    ? viewMode === "week" ? `Semaine(s) : ${selectedValues.join(", ")}`
    : viewMode === "month" ? `Mois : ${selectedValues.map(m => monthNames[m]).join(", ")}`
    : viewMode === "quarter" ? `Trimestre(s) : ${selectedValues.map(q => quarterNames[q]).join(", ")}`
    : `Semestre(s) : ${selectedValues.map(s => semesterNames[s]).join(", ")}`
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
              color: "black", font: { size: 8 }, boxWidth: 10, padding: 10,
              generateLabels: (chart) => {
                const labels = chart.data.labels || [];
                return labels.map((label, i) => ({
                  text: label,
                  fillStyle: chart.data.datasets[0].backgroundColor[i], // Utiliser la couleur du dataset
                  hidden: disabledDivisions.includes(label),
                  strokeStyle: 'transparent' // Assurez-vous qu'il n'y a pas de bordure
                }));
              }
            },
            onClick: (_, legendItem) => {
              toggleDivision(legendItem.text);
            },
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
            },
          },
          datalabels: {
            color: "black", anchor: "end", align: "end", offset: 10, font: { size: 9 },
            formatter: (value, ctx) => {
              const division = ctx.chart.data.labels[ctx.dataIndex];
              const pct = divisionPercentages[division];
              return value > 0 && pct ? `${value} (${pct}%)` : "";
            },
            display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
          }
        },
        layout: { padding: { top: 50, right: 50, bottom: 20, left: 70 } },
      };


    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
          <div className="flex justify-between items-start mb-4 relative">
            <div>
              <h3 className="no-export text-lg font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-500">
                {selectedYear && `Année : ${selectedYear} - `}
                {periodeLabel}
              </p>
            </div>
            <div className="no-export flex gap-2">
              <button className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" onClick={() => setIsOpen(!isOpen)} data-filter-toggle="true">
                <AiOutlineFilter size={20} className="text-gray-600" />
              </button>
              <CommentButton containerRef={chartContainerRef} comments={comments} onAddComment={handleAddComment} onUpdateComment={handleUpdateComment} onDeleteComment={handleDeleteComment} />
              <button className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" onClick={() => setModalIsOpen(true)}>
                <FaExpand size={18} className="text-gray-600" />
              </button>
            </div>
            {isOpen && (
              <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
                <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
                <div className="flex space-x-2 mb-2 mt-2 flex-wrap">
                  <button className={`px-3 py-1 rounded-md mb-2 ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`} onClick={() => handleViewModeChange("week")}>Semaine</button>
                  <button className={`px-3 py-1 rounded-md mb-2 ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`} onClick={() => handleViewModeChange("month")}>Mois</button>
                  <button className={`px-3 py-1 rounded-md mb-2 ${viewMode === "quarter" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`} onClick={() => handleViewModeChange("quarter")}>Trimestre</button>
                  <button className={`px-3 py-1 rounded-md mb-2 ${viewMode === "semester" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`} onClick={() => handleViewModeChange("semester")}>Semestre</button>
                </div>
                {multipleYearsExist && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-gray-500 mb-1">Années :</h5>
                    <div className="flex flex-wrap gap-1">
                      {availableYears.map(year => (
                        <button key={year} onClick={() => handleYearChange(year)} className={`px-2 py-1 text-xs rounded-md ${selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                          {year}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mb-2">
                  <button onClick={toggleSelectAll} className={`text-xs px-2 py-1 rounded-md w-full ${allPeriodsSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}>
                    {allPeriodsSelected ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
                  {availablePeriods.map((value) => (
                    <div key={value} className="flex items-center space-x-2">
                      <input type="checkbox" checked={selectedValues.includes(value)} onChange={() => handleSelectionChange(value)} />
                      <span className="text-gray-500">
                        {viewMode === "week" ? `Semaine ${value}` : viewMode === "month" ? monthNames[value] : viewMode === "quarter" ? quarterNames[value] : semesterNames[value]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex-grow flex justify-center items-center w-full" style={{ padding: '10px 0 0 0' }} ref={chartContainerRef}>
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        </div>
        <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)} className="flex items-center justify-center fixed inset-0 z-50" overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedYear && `Année : ${selectedYear} - `}{periodeLabel}</p>
              </div>
              <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
            </div>
            <div className="relative h-[400px] flex items-center justify-center" ref={modalChartContainerRef}>
              <Doughnut data={chartData} options={chartOptions} />
              <CommentButton containerRef={modalChartContainerRef} hideButton={true} comments={comments} onAddComment={handleAddComment} onUpdateComment={handleUpdateComment} onDeleteComment={handleDeleteComment} />
            </div>
          </div>
        </Modal>
      </div>
    );
}