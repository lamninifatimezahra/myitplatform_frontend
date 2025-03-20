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

// Enregistrer les composants de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

export default function VolumeTicketsDivision() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week"); // "week" ou "month"
  const [selectedValues, setSelectedValues] = useState([]);
  const [disabledDivisions, setDisabledDivisions] = useState([]); // Divisions désactivées
  const [isOpen, setIsOpen] = useState(false);

  // Définition des couleurs fixes
  const colors = {
    "RESEAU": "#68bddd",
    "GP": "#6f80ac",
    "FSC": "#2c3e50",
    "DSI": "#95a5a6",
    "DOP": "#bdc3c7",
    "DIVEN": "#ecf0f1",
    "AUTRE DIVISION": "#7f8c8d"
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

  // Filtrer les données en fonction du mode de vue et des filtres
  const filteredData = data.filter(ticket =>
    selectedValues.includes(viewMode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1)
  );

  // Agréger les données par division
  const divisionCounts = {};
  filteredData.forEach(ticket => {
    const division = Object.keys(colors).includes(ticket.division) ? ticket.division : "AUTRE DIVISION";
    divisionCounts[division] = (divisionCounts[division] || 0) + 1;
  });

  // Calculer les pourcentages
  const totalTickets = Object.values(divisionCounts).reduce((sum, val) => sum + val, 0);
  const divisionPercentages = Object.fromEntries(
    Object.entries(divisionCounts).map(([division, count]) => [
      division, ((count / totalTickets) * 100).toFixed(1) // Convertir en pourcentage avec 1 décimale
    ])
  );

  // On prépare toutes les divisions pour la légende
  const allDivisions = Object.keys(divisionCounts);
  
  const chartData = {
    labels: allDivisions, // Toutes les divisions pour la légende
    datasets: [
      {
        data: allDivisions.map(division => 
          disabledDivisions.includes(division) ? 0 : divisionCounts[division] // Divisions désactivées ont valeur 0
        ),
        backgroundColor: allDivisions.map(division => colors[division]),
      },
    ],
  };

  // Gérer la sélection des semaines/mois
  const handleSelectionChange = (value) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  // Gérer l'affichage des divisions dans la légende
  const toggleDivision = (division) => {
    setDisabledDivisions(prev =>
      prev.includes(division) ? prev.filter(d => d !== division) : [...prev, division]
    );
  };

  return (
    <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-3 text-gray-500">Volume des Tickets par Division</h3>

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

      {/* Conteneur pour le graphique avec flex-grow pour qu'il occupe tout l'espace disponible */}
      <div className="flex-grow">
        <Doughnut
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                display: true,
                position: 'top', // Légende en haut du graphique
                align: 'center', // Centrer la légende
                labels: {
                  color: "black",
                  font: { 
                    size: 9, // Taille de police réduite
                    weight: "normal" 
                  },
                  padding: 5, // Espacement réduit entre les éléments
                  boxWidth: 12, // Largeur des indicateurs de couleur réduite
                  generateLabels: (chart) => {
                    const datasets = chart.data.datasets;
                    const labels = chart.data.labels || [];
                    
                    return labels.map((label, i) => {
                      const isDisabled = disabledDivisions.includes(label);
                      // Construire manuellement le texte de la légende avec le pourcentage
                      const percentage = divisionPercentages[label] || "0.0";
                      
                      return {
                        text: `${label} (${percentage}%)`,
                        fillStyle: colors[label],
                        hidden: isDisabled,
                        lineWidth: 0,
                        strokeStyle: '#000',
                        fontColor: isDisabled ? '#999' : 'black',
                      };
                    });
                  }
                },
                onClick: (_, legendItem) => {
                  // Extraire le nom de la division sans le pourcentage
                  const division = legendItem.text.split(" (")[0];
                  toggleDivision(division);
                },
                // Optimiser la disposition de la légende
                maxHeight: 80, // Hauteur maximale de la légende
                maxWidth: '100%', // Largeur maximale de la légende
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const division = context.label.split(" (")[0];
                    if (disabledDivisions.includes(division)) {
                      return null; // Pas de tooltip pour les divisions désactivées
                    }
                    return ` ${division}: ${context.raw} tickets (${divisionPercentages[division]}%)`;
                  }
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
          // Suppression du plugin qui affichait les valeurs en gras dans le graphique
        />
      </div>
    </div>
  );
}