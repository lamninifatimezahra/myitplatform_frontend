"use client";

import { useState, useEffect } from "react";
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
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useExport } from "./ExportContext";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

export default function RapportSortantsEntrants() {
  const id = "Rapport Sortants Entrants";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [groupedData, setGroupedData] = useState({});
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  // Fonction de traitement des données (agrégation) pour l'année sélectionnée
  const processData = (tickets, mode) => {
    const aggregatedData = {};
    tickets.forEach(ticket => {
      let entrantKey = mode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1;
      if (!aggregatedData[entrantKey]) aggregatedData[entrantKey] = { entrants: 0, sortants: 0 };
      aggregatedData[entrantKey].entrants += 1;
    });
    tickets.forEach(ticket => {
      if (ticket.date_sortie) {
        let sortantKey = mode === "week" ? ticket.semaine_date_sortant : new Date(ticket.date_sortie).getMonth() + 1;
        if (!aggregatedData[sortantKey]) aggregatedData[sortantKey] = { entrants: 0, sortants: 0 };
        aggregatedData[sortantKey].sortants += 1;
      }
    });
    setGroupedData(aggregatedData);
  };

  // Récupération des données et extraction des années disponibles
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/dsl/data/");
        const result = await response.json();
        setData(result);

        // Extraction des années disponibles selon la date de dernière mise à jour
        const years = [...new Set(result.map(ticket => new Date(ticket.date_derniere_maj).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        // Filtrer les tickets de l'année sélectionnée
        const ticketsForYear = result.filter(ticket => new Date(ticket.date_derniere_maj).getFullYear() === latestYear);
        processData(ticketsForYear, viewMode);

        // Définir par défaut les périodes sélectionnées
        const availableWeeks = [...new Set(ticketsForYear.map(ticket => ticket.semaine))].sort((a, b) => a - b);
        const availableMonths = [...new Set(ticketsForYear.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
        setSelectedValues(viewMode === "week" ? availableWeeks.slice(-5) : availableMonths.slice(-5));
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du fetch des données :", error);
      }
    }
    fetchData();
  }, []);

  // Fonction utilitaire pour obtenir les périodes (semaines ou mois) pour l'année sélectionnée
  const getAvailablePeriodsForYear = (year) => {
    const ticketsForYear = data.filter(ticket => new Date(ticket.date_derniere_maj).getFullYear() === year);
    if (viewMode === "week") {
      return [...new Set(ticketsForYear.map(ticket => ticket.semaine))].sort((a, b) => a - b);
    } else {
      return [...new Set(ticketsForYear.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
    }
  };

  // Mise à jour du traitement et de la sélection des périodes lorsque viewMode, data ou selectedYear change
  useEffect(() => {
    if (data.length > 0 && selectedYear) {
      const ticketsForYear = data.filter(ticket => new Date(ticket.date_derniere_maj).getFullYear() === selectedYear);
      processData(ticketsForYear, viewMode);
      const availablePeriods = getAvailablePeriodsForYear(selectedYear);
      setSelectedValues(availablePeriods.length > 0 ? availablePeriods.slice(-5) : []);
    }
  }, [viewMode, data, selectedYear]);

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  // Extraction des périodes disponibles pour l'année sélectionnée
  const ticketsForYear = data.filter(ticket => new Date(ticket.date_derniere_maj).getFullYear() === selectedYear);
  const availableWeeks = [...new Set(ticketsForYear.map(ticket => ticket.semaine))].sort((a, b) => a - b);
  const availableMonths = [...new Set(ticketsForYear.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
  const availablePeriods = viewMode === "week" ? availableWeeks : availableMonths;

  // Bouton "Tout sélectionner / Tout désélectionner" pour les périodes
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

  // Mise à jour de la sélection d'une période
  const handleSelectionChange = (value) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  // Changement d'année
  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  // Filtrer les périodes à afficher dans le graphique (d'après les données agrégées)
  const filteredPeriods = Object.keys(groupedData)
    .map(key => parseInt(key))
    .filter(key => selectedValues.includes(key))
    .sort((a, b) => a - b);

  const labels = filteredPeriods.map(value =>
    viewMode === "week" ? `Semaine ${value}` : `Mois ${value}`
  );

  const dataValues = filteredPeriods.map(period => {
    const { entrants, sortants } = groupedData[period] || { entrants: 0, sortants: 0 };
    return entrants > 0 ? ((sortants / entrants) * 100).toFixed(1) : 0;
  });

  const periodeLabel = selectedValues.length > 0
    ? (viewMode === "week" ? `Semaine(s) : ${selectedValues.join(", ")}` : `Mois : ${selectedValues.join(", ")}`)
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

        {/* Titre et période affichée */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Rapport : Sortants/Entrants</h3>
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
                        selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Bouton Tout sélectionner / Tout désélectionner */}
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
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Rapport Sortants/Entrants (%)",
                  data: dataValues,
                  borderColor: "#68bddd",
                  backgroundColor: "rgba(104, 189, 221, 0.2)",
                  fill: true,
                  tension: 0.4,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `${context.raw}%` } },
              },
              scales: {
                x: { grid: { display: false } },
                y: {
                  grid: { display: true },
                  ticks: { callback: (value) => `${value}%` },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
