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
  Legend
} from "chart.js";
import { AiOutlineFilter } from "react-icons/ai";
import ChartDataLabels from "chartjs-plugin-datalabels";

// Enregistrer les composants de Chart.js
ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function SlaAnciennete() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week"); // "week" ou "month"
  const [selectedValues, setSelectedValues] = useState([]); // Semaines ou Mois sélectionnés
  const [selectedSlaCategories, setSelectedSlaCategories] = useState(["Jour", "2J", "3J", "Semaine", "2semaines"]); // SLA sélectionnés
  const [isOpen, setIsOpen] = useState(false);

  // Fetch les données depuis l'API
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("http://127.0.0.1:8000/dashboard/api/hispeed/data/");
        const result = await response.json();
        setData(result);
        setLoading(false);

        // Définir valeurs par défaut (5 dernières semaines/mois)
        const availableWeeks = [...new Set(result.map(ticket => ticket.semaine))].sort((a, b) => a - b);
        const availableMonths = [...new Set(result.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
        setSelectedValues(viewMode === "week" ? availableWeeks.slice(-5) : availableMonths.slice(-5));
      } catch (error) {
        console.error("Erreur lors du fetch des données :", error);
      }
    }
    fetchData();
  }, [viewMode]);

  if (loading) {
    return <p className="text-center text-gray-500">Chargement des données...</p>;
  }

  // Obtenir les semaines et mois uniques
  const availableWeeks = [...new Set(data.map(ticket => ticket.semaine))].sort((a, b) => a - b);
  const availableMonths = [...new Set(data.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
  const availableSlaCategories = ["Jour", "2J", "3J", "Semaine", "2semaines"];

  // Filtrer les données en fonction du mode de vue et des filtres
  const filteredData = data.filter(ticket =>
    selectedValues.includes(viewMode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1) &&
    selectedSlaCategories.includes(ticket.age_hispeed1)
  );

  // Construire les labels pour les axes X (Semaines ou Mois)
  const labels = [...new Set(filteredData.map(ticket => viewMode === "week" ? `S${ticket.semaine}` : `M${new Date(ticket.date_derniere_maj).getMonth() + 1}`))];

  // Construire les datasets pour Chart.js
  const datasets = availableSlaCategories.map(slaCategory => ({
    label: slaCategory,
    data: labels.map(label => {
      const period = viewMode === "week" ? parseInt(label.replace("S", "")) : parseInt(label.replace("M", ""));
      return filteredData.filter(ticket => (viewMode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1) === period && ticket.age_hispeed1 === slaCategory).length;
    }),
    backgroundColor: getColorForSlaCategory(slaCategory),
    stack: "stack1",
    borderRadius: 10, // Arrondir les coins des barres
  }));

  function getColorForSlaCategory(slaCategory) {
    switch (slaCategory) {
      case "Jour": return "#68bddd";
      case "2J": return "#6f80ac";
      case "3J": return "#2c3e50";
      case "Semaine": return "#95a5a6";
      case "2semaines": return "#bdc3c7";
      default: return "#ecf0f1";
    }
  }

  // Gérer la sélection des semaines/mois
  const handleSelectionChange = (value) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  return (
    <div className="relative bg-white p-5 shadow-md rounded-lg w-full">
      <h3 className="text-lg font-semibold mb-3 text-gray-500">SLA d’ancienneté</h3>

      {/* Bouton de filtre */}
      <button className="absolute top-2 right-2 bg-gray-300 p-2 rounded-full hover:bg-gray-300 transition"
        onClick={() => setIsOpen(!isOpen)}>
        <AiOutlineFilter size={20} className="text-gray-500" />
      </button>

      {/* Filtre Popup */}
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
          <h4 className="font-semibold text-gray-500">Filtrer par :</h4>

          {/* Sélecteur de vue */}
          <div className="flex space-x-2 mb-2">
            <button className={`px-3 py-1 rounded-md ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
              onClick={() => setViewMode("week")}>Semaine</button>
            <button className={`px-3 py-1 rounded-md ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
              onClick={() => setViewMode("month")}>Mois</button>
          </div>

          {/* Liste avec cases à cocher pour les semaines/mois */}
          <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
            {(viewMode === "week" ? availableWeeks : availableMonths).map(value => (
              <div key={value} className="flex items-center space-x-2">
                <input type="checkbox" checked={selectedValues.includes(value)}
                  onChange={() => handleSelectionChange(value)} />
                <span className="text-gray-500">{viewMode === "week" ? `Semaine ${value}` : `Mois ${value}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graphique */}
      <Bar
        data={{ labels, datasets }}
        options={{
          responsive: true,
          plugins: {
            legend: { display: true },
            datalabels: { color: "black", anchor: "center", align: "center", formatter: (value) => value > 0 ? value : "" },
          },
          scales: { x: { stacked: true }, y: { stacked: true } },
        }}
      />
    </div>
  );
}
