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

// Enregistrement des composants Chart.js
ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

export default function VolumeReentrants() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week"); // "week" ou "month"
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [groupedData, setGroupedData] = useState({});

  // Fetch les données depuis l'API
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("http://127.0.0.1:8000/dashboard/api/hispeed/data/");
        const result = await response.json();
        setData(result);
        setLoading(false);
        updateSelectedValues(result, viewMode);
        processReentrantData(result, viewMode);
      } catch (error) {
        console.error("Erreur lors du fetch des données :", error);
      }
    }
    fetchData();
  }, []);

  // Mettre à jour les valeurs sélectionnées lors du changement de vue (semaine/mois)
  useEffect(() => {
    if (data.length > 0) {
      updateSelectedValues(data, viewMode);
      processReentrantData(data, viewMode);
    }
  }, [viewMode]);

  // Fonction pour mettre à jour les valeurs sélectionnées (semaine ou mois)
  const updateSelectedValues = (tickets, mode) => {
    const availableWeeks = [...new Set(tickets.map(ticket => ticket.semaine))].sort((a, b) => a - b);
    const availableMonths = [...new Set(tickets.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
    setSelectedValues(mode === "week" ? availableWeeks.slice(-5) : availableMonths.slice(-5));
  };

  // Fonction pour calculer les itérations cumulées par ticket
  const processReentrantData = (tickets, mode) => {
    const ticketHistory = {}; // Stocker l'historique des tickets
    const aggregatedData = {}; // Stocker les résultats finaux

    tickets.forEach(ticket => {
      const period = mode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1;
      const ticketId = ticket.id_ticket;

      if (!ticketHistory[ticketId]) {
        ticketHistory[ticketId] = 1;
      } else {
        ticketHistory[ticketId] += 1;
      }

      if (!aggregatedData[period]) {
        aggregatedData[period] = { 2: 0, 3: 0, 4: 0 };
      }

      const iterationCount = ticketHistory[ticketId];

      if (iterationCount >= 2) {
        if (iterationCount >= 4) {
          aggregatedData[period][4] += 1;
        } else {
          aggregatedData[period][iterationCount] += 1;
        }
      }
    });

    setGroupedData(aggregatedData);
  };

  if (loading) {
    return <p className="text-center text-gray-500">Chargement des données...</p>;
  }

  // Récupérer les périodes disponibles
  const availableWeeks = [...new Set(data.map(ticket => ticket.semaine))].sort((a, b) => a - b);
  const availableMonths = [...new Set(data.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);

  // Construire les labels pour les axes X
  const filteredPeriods = Object.keys(groupedData)
    .map(key => parseInt(key))
    .filter(key => selectedValues.includes(key))
    .sort((a, b) => a - b);

  const labels = filteredPeriods.map(value =>
    viewMode === "week" ? `Semaine ${value}` : `Mois ${value}`
  );

  // Construire les datasets
  const datasets = [
    {
      label: "2 Réitérations",
      data: filteredPeriods.map(period => groupedData[period]?.[2] || 0),
      backgroundColor: "#68bddd",
    },
    {
      label: "3 Réitérations",
      data: filteredPeriods.map(period => groupedData[period]?.[3] || 0),
      backgroundColor: "#6f80ac",
    },
    {
      label: "4+ Réitérations",
      data: filteredPeriods.map(period => groupedData[period]?.[4] || 0),
      backgroundColor: "#2c3e50",
    }
  ];

  // Gérer la sélection des semaines/mois
  const handleSelectionChange = (value) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  return (
    <div className="relative bg-white p-5 shadow-md rounded-lg w-full">
      <h3 className="text-lg font-semibold mb-3 text-gray-500">Volume des Réentrants</h3>

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
            <button 
              className={`px-3 py-1 rounded-md ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
              onClick={() => setViewMode("week")}>
              Semaine
            </button>
            <button 
              className={`px-3 py-1 rounded-md ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
              onClick={() => setViewMode("month")}>
              Mois
            </button>
          </div>

          {/* Liste avec cases à cocher pour les semaines/mois */}
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
      <Bar
        data={{ labels, datasets }}
        options={{
          responsive: true,
          plugins: { legend: { display: true } },
          scales: { x: { stacked: false }, y: { stacked: false } },
        }}
      />
    </div>
  );
}
