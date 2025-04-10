"use client";

import { useState, useEffect } from "react";
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
import { useExport } from "./ExportContext";
import fetchWithAuth from "@/utils/fetchWithAuth";


ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend, ChartDataLabels);

export default function VolumeReentrants() {
  const id = "volume-reentrants";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [groupedData, setGroupedData] = useState({});

  // Nouveaux états pour la gestion des années
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  const iterationColors = {
    2: "#2196f3",
    3: "#1b2b6b",
    4: "#f36e3b",
    5: "#4caf50",
    6: "#9c27b0",
    7: "#ff9800",
    8: "#009688",
  };

  // Fonction pour mettre à jour la sélection des périodes (semaines ou mois)
  const updateSelectedValues = (tickets, mode) => {
    const weeks = [...new Set(tickets.map(t => t.semaine))].sort((a, b) => a - b);
    const months = [...new Set(tickets.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
    setSelectedValues(mode === "week" ? weeks.slice(-5) : months.slice(-5));
  };

  // Fonction pour traiter les données des réentrants
  const processReentrantData = (tickets, mode) => {
    const ticketCounts = {};
    const result = {};

    tickets.forEach(ticket => {
      const period = mode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1;
      const ticketId = ticket.id_ticket;
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
        const response = await fetchWithAuth(`https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/dsl/data/`);
        const result = await response.json();
        setData(result);

        // Extraction des années à partir de la date de dernière mise à jour
        const years = [...new Set(result.map(t => new Date(t.date_derniere_maj).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        // Filtrer les tickets pour l'année sélectionnée
        const ticketsForYear = result.filter(t => new Date(t.date_derniere_maj).getFullYear() === latestYear);
        updateSelectedValues(ticketsForYear, viewMode);
        processReentrantData(ticketsForYear, viewMode);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du fetch :", error);
      }
    }
    fetchData();
  }, [viewMode]);

  // Mise à jour lorsque viewMode ou selectedYear change
  useEffect(() => {
    if (data.length > 0 && selectedYear) {
      const ticketsForYear = data.filter(t => new Date(t.date_derniere_maj).getFullYear() === selectedYear);
      updateSelectedValues(ticketsForYear, viewMode);
      processReentrantData(ticketsForYear, viewMode);
    }
  }, [viewMode, selectedYear, data]);

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  // Filtrer les tickets pour l'année sélectionnée
  const ticketsForYear = data.filter(t => new Date(t.date_derniere_maj).getFullYear() === selectedYear);
  const availableWeeks = [...new Set(ticketsForYear.map(t => t.semaine))].sort((a, b) => a - b);
  const availableMonths = [...new Set(ticketsForYear.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
  const availablePeriods = viewMode === "week" ? availableWeeks : availableMonths;

  // Bouton "Tout sélectionner / Tout désélectionner" pour les périodes de l'année en cours
  const allPeriodsSelected =
    availablePeriods.length > 0 &&
    availablePeriods.every(period => selectedValues.includes(period));

  const toggleSelectAll = () => {
    if (allPeriodsSelected) {
      setSelectedValues([]);
    } else {
      setSelectedValues([...availablePeriods]);
    }
  };

  const handleSelectionChange = (value) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  const filteredPeriods = Object.keys(groupedData)
    .map(k => parseInt(k))
    .filter(k => selectedValues.includes(k))
    .sort((a, b) => a - b);

  const labels = filteredPeriods.map(p => viewMode === "week" ? `S-${p}` : `M-${p}`);

  const iterations = Array.from({ length: 7 }, (_, i) => i + 2).filter(it =>
    filteredPeriods.some(period => groupedData[period]?.[it])
  );

  const datasets = iterations.map(it => ({
    label: `${it} Réitération${it > 1 ? "s" : ""}`,
    data: filteredPeriods.map(period => groupedData[period]?.[it] || 0),
    backgroundColor: iterationColors[it] || "#ccc",
    borderRadius: 8,
    hoverBackgroundColor: iterationColors[it],
    hoverBorderWidth: 2,
    hoverBorderColor: "#444",
    categoryPercentage: 0.7,
  }));

  const periodeLabel = selectedValues.length > 0
    ? (viewMode === "week"
        ? `Semaine(s) : ${selectedValues.join(", ")}`
        : `Mois : ${selectedValues.join(", ")}`)
    : "Aucune période sélectionnée";

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full">
        {/* Boutons en haut à droite */}
        <div className="absolute top-2 right-2 flex items-center space-x-2 z-50">
          <button
            className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
            onClick={() => setIsOpen(!isOpen)}
          >
            <AiOutlineFilter size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Titre et affichage de l'année et des périodes */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Volume des Réentrants</h3>
          <p className="text-sm text-gray-500">
            {selectedYear && `Année : ${selectedYear} - `}
            {periodeLabel}
          </p>
        </div>

        {/* Popup filtres */}
        {isOpen && (
          <div className="absolute right-2 top-14 bg-white shadow-lg rounded-md p-4 w-64 z-50">
            <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
            <div className="flex space-x-2 mb-2 mt-2">
              <button
                className={`px-3 py-1 rounded-md ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                onClick={() => setViewMode("week")}
              >
                Semaine
              </button>
              <button
                className={`px-3 py-1 rounded-md ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                onClick={() => setViewMode("month")}
              >
                Mois
              </button>
            </div>
            {/* Sélection d'années si plusieurs existent */}
            {multipleYearsExist && (
              <div className="mb-3">
                <h5 className="text-sm font-medium text-gray-500 mb-1">Années :</h5>
                <div className="flex flex-wrap gap-1">
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => handleYearChange(year)}
                      className={`px-2 py-1 text-xs rounded-md ${
                        selectedYear === year
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Bouton "Tout sélectionner / Tout désélectionner" */}
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
            {/* Sélection des périodes pour l'année sélectionnée */}
            <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
              {(viewMode === "week" ? availableWeeks : availableMonths).map(value => (
                <div key={value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(value)}
                    onChange={() => handleSelectionChange(value)}
                  />
                  <span className="text-gray-500">
                    {viewMode === "week" ? `Semaine ${value}` : `Mois ${value}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Graphique */}
        <div className="h-[300px]">
          <Bar
            data={{ labels, datasets }}
            options={{
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
                  formatter: (value) => value > 0 ? value : "",
                },
                tooltip: {
                  callbacks: {
                    label: (context) => `${context.dataset.label}: ${context.raw}`,
                  },
                },
              },
              scales: {
                x: { stacked: false },
                y: {
                  beginAtZero: true,
                  stacked: false,
                  ticks: { precision: 0 },
                },
              },
            }}
            plugins={[ChartDataLabels]}
          />
        </div>
      </div>
    </div>
  );
}
