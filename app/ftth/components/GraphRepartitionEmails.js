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
import Modal from "react-modal";

// Remplacez le mock par le vrai import de votre projet
import CommentButton from "@/app/components/CommentButton"; 
// Simule fetchWithAuth si ce n'est pas un import global
const fetchWithAuth = (url) => fetch(url); 


// Configuration de Modal
if (typeof window !== "undefined") Modal.setAppElement(document.body);

// Constantes pour les noms
const moisFrancais = { 1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril", 5: "Mai", 6: "Juin", 7: "Juillet", 8: "Août", 9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre" };
const trimestres = { 1: "T1", 2: "T2", 3: "T3", 4: "T4" };
const semestres = { 1: "S1", 2: "S2" };
const viewModeLabels = {
    week: "Semaine",
    month: "Mois",
    quarter: "Trimestre",
    semester: "Semestre"
};


// Enregistrement des plugins ChartJS
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

// Fonctions utilitaires pour la gestion des dates
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};
const getQuarter = (date) => Math.ceil((date.getMonth() + 1) / 3);
const getSemester = (date) => (date.getMonth() < 6 ? 1 : 2);

export default function GraphRepartitionParType() {
  const apiUrl = "https://api.606510.xyz/dashboard/api/mail-ftth/data/";
  const id = "repartition-par-type";
  const dateField = "date";
  const title = "Répartition des e-mails par type";
  const COLORS = {
      "Intervention": "#3b82f6",
      "Renonciation": "#f59e0b",
      "REF PMT": "#111827",
      "Finalisation de commande": "#4b5563",
      "Autre": "#68bddd"
  };
  
  // Références et états
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null); // <-- Ajout de la ref pour le modal
  const prevViewMode = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [disabledCategories, setDisabledCategories] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [comments, setComments] = useState([]); // <-- État pour les commentaires

  // États pour mémoriser les sélections
  const [weekViewSelection, setWeekViewSelection] = useState({ values: [], year: null });
  const [monthViewSelection, setMonthViewSelection] = useState({ values: [], year: null });
  const [quarterViewSelection, setQuarterViewSelection] = useState({ values: [], year: null });
  const [semesterViewSelection, setSemesterViewSelection] = useState({ values: [], year: null });

  // --- Fonctions de gestion des commentaires (inspirées du modèle) ---
  const handleAddComment = (comment) => {
    setComments(prevComments => [...prevComments, comment]);
  };
  const handleUpdateComment = (updatedComment) => {
    setComments(prevComments => 
      prevComments.map(c => c.id === updatedComment.id ? updatedComment : c)
    );
  };
  const handleDeleteComment = (commentId) => {
    setComments(prevComments => prevComments.filter(c => c.id !== commentId));
  };


  // Gestion des clics extérieurs pour fermer le panneau de filtre
  useEffect(() => {
    function handleClickOutside(event) {
      if (isOpen && filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest('button[data-filter-toggle]')) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Conserver l'état de la vue quand celle-ci change
  useEffect(() => {
    if (!prevViewMode.current) {
      prevViewMode.current = viewMode;
      return;
    }
    const selectionState = { values: selectedValues, year: selectedYear };
    if (prevViewMode.current === "week") setWeekViewSelection(selectionState);
    else if (prevViewMode.current === "month") setMonthViewSelection(selectionState);
    else if (prevViewMode.current === "quarter") setQuarterViewSelection(selectionState);
    else if (prevViewMode.current === "semester") setSemesterViewSelection(selectionState);

    let targetSelection = { values: [], year: selectedYear };
    if (viewMode === "week") targetSelection = weekViewSelection;
    else if (viewMode === "month") targetSelection = monthViewSelection;
    else if (viewMode === "quarter") targetSelection = quarterViewSelection;
    else if (viewMode === "semester") targetSelection = semesterViewSelection;
    
    if (targetSelection.values.length > 0 && targetSelection.year === selectedYear) {
        setSelectedValues(targetSelection.values);
    } else {
        const newAvailablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode);
        setSelectedValues(newAvailablePeriods);
    }

    prevViewMode.current = viewMode;
  }, [viewMode]);

  // Récupération des données
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        setData(result);

        const years = [...new Set(result.map(t => new Date(t[dateField]).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        const initialPeriods = [...new Set(result
            .filter(t => new Date(t[dateField]).getFullYear() === latestYear)
            .map(t => getWeekNumber(new Date(t[dateField]))))]
            .sort((a, b) => a - b);
        setSelectedValues(initialPeriods);
        setWeekViewSelection({ values: initialPeriods, year: latestYear });
        
      } catch (error) {
        console.error("Erreur lors du fetch :", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [apiUrl, dateField]);

  const getAvailablePeriodsForYear = (year, mode = viewMode) => {
    const ticketsForYear = data.filter(t => new Date(t[dateField]).getFullYear() === year);
    let periodExtractor;
    if (mode === "week") periodExtractor = (t) => getWeekNumber(new Date(t[dateField]));
    else if (mode === "month") periodExtractor = (t) => new Date(t[dateField]).getMonth() + 1;
    else if (mode === "quarter") periodExtractor = (t) => getQuarter(new Date(t[dateField]));
    else if (mode === "semester") periodExtractor = (t) => getSemester(new Date(t[dateField]));
    
    return [...new Set(ticketsForYear.map(periodExtractor))].sort((a, b) => a - b);
  };

  const availablePeriods = getAvailablePeriodsForYear(selectedYear);
  const allPeriodsSelected = availablePeriods.length > 0 && availablePeriods.every(period => selectedValues.includes(period));

  // Logique de filtrage
  const handleViewModeChange = (newMode) => setViewMode(newMode);
  const handleYearChange = (year) => {
    setSelectedYear(year);
    const newPeriods = getAvailablePeriodsForYear(year, viewMode);
    setSelectedValues(newPeriods);
  };
  const handleSelectionChange = (value) => {
    setSelectedValues(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };
  const toggleSelectAll = () => {
    setSelectedValues(allPeriodsSelected ? [] : [...availablePeriods]);
  };
  const toggleCategory = (category) => {
    setDisabledCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  // Traitement des données pour le graphique
  const filteredData = data.filter(t => {
      const date = new Date(t[dateField]);
      if (date.getFullYear() !== selectedYear) return false;
      
      const period = viewMode === "week" ? getWeekNumber(date)
                   : viewMode === "month" ? date.getMonth() + 1
                   : viewMode === "quarter" ? getQuarter(date)
                   : getSemester(date);
      return selectedValues.includes(period);
  });

  const typeCounts = filteredData.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
  }, {});

  const chartLabels = Object.keys(typeCounts).sort();
  const total = Object.values(typeCounts).reduce((a, b) => a + b, 0);

  const chartData = {
    labels: chartLabels,
    datasets: [{
      data: chartLabels.map(label => disabledCategories.includes(label) ? 0 : typeCounts[label]),
      backgroundColor: chartLabels.map(label => COLORS[label] || COLORS["Autre"]),
      cutout: "45%",
      borderWidth: 1,
    }],
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "right",
        labels: {
          color: "black",
          font: { size: 11 },
          boxWidth: 12,
          padding: 8,
          generateLabels: (chart) => chart.data.labels.map((label, i) => ({
            text: label,
            fillStyle: chart.data.datasets[0].backgroundColor[i],
            hidden: disabledCategories.includes(label),
            strokeStyle: 'transparent'
          })),
        },
        onClick: (_, legendItem) => toggleCategory(legendItem.text),
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label;
            const value = context.raw;
            const currentTotal = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            if (disabledCategories.includes(label) || currentTotal === 0) return null;
            const percent = ((value / currentTotal) * 100).toFixed(2);
            return `${label}: ${value} (${percent}%)`;
          },
        },
      },
      datalabels: {
        color: "black",
        font: { size: 10 },
        formatter: (value, context) => {
          const label = context.chart.data.labels[context.dataIndex];
          const currentTotal = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
          if (value === 0 || disabledCategories.includes(label) || currentTotal === 0) return "";
          const percent = ((value / currentTotal) * 100).toFixed(2);
          return `${percent}%`;
        },
        anchor: "end",
        align: "end",
        offset: 8,
      },
    },
    layout: { padding: 10 },
  };

  const periodeLabel = selectedValues.length > 0
    ? viewMode === "week" ? `Semaine(s) : ${selectedValues.join(", ")}`
    : viewMode === "month" ? `Mois : ${selectedValues.map(m => moisFrancais[m]).join(", ")}`
    : viewMode === "quarter" ? `Trimestre(s) : ${selectedValues.map(q => trimestres[q]).join(", ")}`
    : `Semestre(s) : ${selectedValues.map(s => semestres[s]).join(", ")}`
    : "Aucune période sélectionnée";

  if (loading) {
    return (
        <div className="bg-white shadow-md rounded-lg p-5 flex items-center justify-center h-[400px]">
            <p className="text-center text-gray-500">Chargement des données...</p>
        </div>
    );
  }

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* En-tête */}
        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <h3 className="no-export text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500">
              {selectedYear && `Année : ${selectedYear} - `}{periodeLabel}
            </p>
          </div>
          <div className="no-export flex gap-2">
            <button className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition text-gray-600 hover:text-gray-800" onClick={() => setIsOpen(!isOpen)} data-filter-toggle="true">
              <AiOutlineFilter size={20} />
            </button>
            {/* --- Bouton Commentaire Corrigé --- */}
            <CommentButton
                containerRef={chartContainerRef}
                comments={comments}
                onAddComment={handleAddComment}
                onUpdateComment={handleUpdateComment}
                onDeleteComment={handleDeleteComment}
            />
            <button className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition text-gray-600 hover:text-gray-800" onClick={() => setModalIsOpen(true)}>
              <FaExpand size={18} />
            </button>
          </div>

          {/* Panneau de filtres */}
          {isOpen && (
            <div ref={filterPanelRef} className="no-export absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
              <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
              <div className="flex space-x-2 mb-2 mt-2 flex-wrap">
                {Object.entries(viewModeLabels).map(([mode, label]) => (
                  <button key={mode} className={`px-3 py-1 rounded-md mb-2 ${viewMode === mode ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                    onClick={() => handleViewModeChange(mode)}>
                    {label}
                  </button>
                ))}
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
                {availablePeriods.map(value => (
                  <div key={value} className="flex items-center space-x-2">
                    <input type="checkbox" checked={selectedValues.includes(value)} onChange={() => handleSelectionChange(value)} />
                    <span className="text-gray-500">
                      {viewMode === "week" ? `Semaine ${value}` : viewMode === "month" ? moisFrancais[value] : viewMode === "quarter" ? trimestres[value] : semestres[value]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Zone du graphique */}
        <div className="flex-grow flex justify-center items-center w-full min-h-[300px]" ref={chartContainerRef}>
            {total > 0 ? (
                <Doughnut data={chartData} options={chartOptions} />
            ) : (
                <p className="text-gray-500">Aucune donnée à afficher pour la période sélectionnée.</p>
            )}
        </div>
      </div>

      {/* Modal d'agrandissement */}
      <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)} className="flex items-center justify-center fixed inset-0 z-50" overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedYear && `Année : ${selectedYear} - `}{periodeLabel}</p>
            </div>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          {/* --- Zone du graphique dans le Modal avec le CommentButton --- */}
          <div className="relative h-[400px] flex items-center justify-center" ref={modalChartContainerRef}>
             {total > 0 ? (
                <Doughnut data={chartData} options={chartOptions} />
            ) : (
                <p className="text-gray-500">Aucune donnée à afficher pour la période sélectionnée.</p>
            )}
            <CommentButton
                containerRef={modalChartContainerRef}
                hideButton={true} 
                comments={comments}
                onAddComment={handleAddComment}
                onUpdateComment={handleUpdateComment}
                onDeleteComment={handleDeleteComment}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}