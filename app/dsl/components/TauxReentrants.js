"use client";

import { useState, useEffect } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { AiOutlineFilter } from "react-icons/ai";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useExport } from "./ExportContext"; // 📦 à adapter selon le chemin réel

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function TauxReentrants() {
  const id = "taux-reentrants";
  const { selectedIds, toggleId } = useExport();

  // Noms des mois en français
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

  // États pour les données, le mode de vue, la sélection des périodes et la gestion des années
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [disabledCategories, setDisabledCategories] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  const colors = {
    "Réentrant": "#68bddd",
    "Non Réentrant": "#1b2b6b",
  };

  // Récupération initiale des données, extraction des années disponibles et définition par défaut des périodes (de l'année sélectionnée)
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
        const weeks = [...new Set(ticketsForYear.map(t => t.semaine))].sort((a, b) => a - b);
        const months = [...new Set(ticketsForYear.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
        
        // Sélectionner toutes les semaines par défaut ou tous les mois selon le viewMode
        setSelectedValues(viewMode === "week" ? weeks : months);

        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du fetch :", error);
      }
    }
    fetchData();
  }, [viewMode]);

  // Effet pour mettre à jour les périodes sélectionnées lorsque l'année ou le mode change
  useEffect(() => {
    if (!loading && data.length > 0 && selectedYear) {
      const ticketsForYear = data.filter(t => new Date(t.date_derniere_maj).getFullYear() === selectedYear);
      if (viewMode === "week") {
        const weeks = [...new Set(ticketsForYear.map(t => t.semaine))].sort((a, b) => a - b);
        setSelectedValues(weeks);
      } else {
        const months = [...new Set(ticketsForYear.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
        setSelectedValues(months);
      }
    }
  }, [viewMode, selectedYear, loading]);

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  // Filtrer les tickets pour l'année sélectionnée
  const ticketsForYear = data.filter(t => new Date(t.date_derniere_maj).getFullYear() === selectedYear);
  const weeks = [...new Set(ticketsForYear.map(t => t.semaine))].sort((a, b) => a - b);
  const months = [...new Set(ticketsForYear.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
  const availablePeriods = viewMode === "week" ? weeks : months;

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

  // Filtrer les tickets pour la période sélectionnée (uniquement pour l'année en cours)
  const filteredTickets = ticketsForYear.filter(ticket =>
    selectedValues.includes(
      viewMode === "week"
        ? ticket.semaine
        : new Date(ticket.date_derniere_maj).getMonth() + 1
    )
  );

  // Regrouper les tickets par identifiant pour calculer les réentrants
  const ticketsById = {};
  filteredTickets.forEach(ticket => {
    if (!ticketsById[ticket.id_ticket]) {
      ticketsById[ticket.id_ticket] = [];
    }
    ticketsById[ticket.id_ticket].push(ticket);
  });

  let nonReentrantCount = 0;
  let reentrantCount = 0;
  Object.values(ticketsById).forEach(tickets => {
    const sorted = tickets.sort((a, b) => new Date(a.date_derniere_maj) - new Date(b.date_derniere_maj));
    nonReentrantCount += 1;
    reentrantCount += sorted.length - 1;
  });

  const total = nonReentrantCount + reentrantCount;
  const categories = ["Réentrant", "Non Réentrant"];

  const chartData = {
    labels: categories,
    datasets: [
      {
        data: categories.map(cat =>
          disabledCategories.includes(cat)
            ? 0
            : cat === "Réentrant"
              ? reentrantCount
              : nonReentrantCount
        ),
        backgroundColor: categories.map(cat => colors[cat]),
        cutout: "45%",
        borderWidth: 1,
        rotation: -90,
      },
    ],
  };

  const toggleCategory = (category) => {
    setDisabledCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  // Construction du label de période avec noms des mois en français
  const periodeLabel = selectedValues.length > 0
    ? (viewMode === "week"
        ? `Semaine(s) : ${selectedValues.join(", ")}`
        : `Mois : ${selectedValues.map(m => moisFrancais[m]).join(", ")}`)
    : "Aucune période sélectionnée";

  return (
    <div className="visualisation relative" data-id={id}>
      {/* Boutons en haut à droite */}
      <div className="absolute top-2 right-2 z-50 flex space-x-2">
        <button
          className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
          onClick={() => setIsOpen(!isOpen)}
        >
          <AiOutlineFilter size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Taux des Réentrants</h3>
          <p className="text-sm text-gray-500 mb-3">
            {selectedYear && `Année : ${selectedYear} - `}
            {periodeLabel}
          </p>
        </div>

        {isOpen && (
          <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
            <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
            {/* Boutons pour changer de vue */}
            <div className="flex space-x-2 mb-2">
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
            {/* Sélection des périodes (semaine ou mois) pour l'année sélectionnée */}
            <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
              {availablePeriods.map(value => (
                <div key={value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(value)}
                    onChange={() => handleSelectionChange(value)}
                  />
                  <span className="text-gray-500">
                    {viewMode === "week" 
                      ? `Semaine ${value}` 
                      : moisFrancais[value]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="relative h-full max-h-[300px] w-full">
          <Doughnut
            data={chartData}
            options={{
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
                    generateLabels: (chart) =>
                      chart.data.labels.map((label) => ({
                        text: label,
                        fillStyle: colors[label],
                        hidden: disabledCategories.includes(label),
                      })),
                  },
                  onClick: (_, legendItem) => toggleCategory(legendItem.text),
                },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const label = context.label;
                      const value = context.raw;
                      const percent = total ? ((value / total) * 100).toFixed(2) : "0.0";
                      return `${label}: ${value} (${percent}%)`;
                    },
                  },
                },
                datalabels: {
                  color: "black",
                  font: { size: 10 },
                  formatter: (value, context) => {
                    const label = context.chart.data.labels[context.dataIndex];
                    if (value === 0) return "";
                    const percent = ((value / total) * 100).toFixed(2);
                    return `${value} (${percent}%)`;
                  },
                  anchor: "end",
                  align: "end",
                  offset: 8,
                },
              },
              layout: { padding: 10 },
            }}
          />
        </div>
      </div>
    </div>
  );
}