"use client";

import { useState, useEffect } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { AiOutlineFilter } from "react-icons/ai";
import ChartDataLabels from "chartjs-plugin-datalabels";

// Enregistrer les composants de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function TauxReentrants() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week"); // "week" ou "month"
  const [selectedValues, setSelectedValues] = useState([]);
  const [disabledCategories, setDisabledCategories] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Couleurs fixes
  const colors = {
    "Réentrant": "#68bddd",
    "Non Réentrant": "#6f80ac",
  };

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

  // Filtrer les données en fonction des filtres sélectionnés
  const filteredData = data.filter(ticket =>
    selectedValues.includes(viewMode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1)
  );

  // Calcul du nombre de réentrants et non réentrants
  const reentrantCount = filteredData.filter(ticket => ticket.is_reentrant_global === true).length;
  const nonReentrantCount = filteredData.filter(ticket => ticket.is_reentrant_global === false).length;

  // Calcul du pourcentage
  const totalTickets = reentrantCount + nonReentrantCount;
  const reentrantPercentage = totalTickets ? ((reentrantCount / totalTickets) * 100).toFixed(1) : "0.0";
  const nonReentrantPercentage = totalTickets ? ((nonReentrantCount / totalTickets) * 100).toFixed(1) : "0.0";

  // Configuration des données pour le Doughnut chart
  const categories = ["Réentrant", "Non Réentrant"];
  const chartData = {
    labels: categories,
    datasets: [
      {
        data: categories.map(cat => 
          disabledCategories.includes(cat) ? 0 : (cat === "Réentrant" ? reentrantCount : nonReentrantCount)
        ),
        backgroundColor: categories.map(cat => colors[cat]),
      },
    ],
  };

  // Gérer la sélection des semaines/mois
  const handleSelectionChange = (value) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  // Gérer l'affichage des catégories dans la légende
  const toggleCategory = (category) => {
    setDisabledCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  return (
    <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-3 text-gray-500">Taux des Réentrants</h3>

      {/* Bouton de filtre */}
      <button className="absolute top-2 right-2 bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
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
      <div className="flex-grow">
        <Doughnut
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                display: true,
                labels: {
                  color: "black",
                  font: { size: 12 },
                  generateLabels: (chart) => {
                    return chart.data.labels.map((label, i) => ({
                      text: `${label} (${label === "Réentrant" ? reentrantPercentage : nonReentrantPercentage}%)`,
                      fillStyle: colors[label],
                      hidden: disabledCategories.includes(label),
                    }));
                  }
                },
                onClick: (_, legendItem) => {
                  toggleCategory(legendItem.text.split(" (")[0]);
                }
              }
            },
            layout: {
              padding: {
                top: 5,
                bottom: 5,
                left: 5,
                right: 5
              }
            }
          }}
          plugins={[ChartDataLabels]}
        />
      </div>
    </div>
  );
}
