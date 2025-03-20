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

// Enregistrer les composants de Chart.js
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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week"); // "day", "week" ou "month"
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

        // Calculer les données agrégées indépendamment des filtres
        processData(result, viewMode);
        
        // Définir valeurs par défaut (5 dernières semaines/mois)
        const availableWeeks = [...new Set(result.map(ticket => ticket.semaine))].sort((a, b) => a - b);
        const availableMonths = [...new Set(result.map(ticket => {
          const date = new Date(ticket.date_derniere_maj);
          return date.getMonth() + 1;
        }))].sort((a, b) => a - b);
        
        setSelectedValues(viewMode === "week" ? availableWeeks.slice(-5) : availableMonths.slice(-5));
      } catch (error) {
        console.error("Erreur lors du fetch des données :", error);
      }
    }
    fetchData();
  }, []);

  // Recalculer les données agrégées lors du changement de mode de vue
  useEffect(() => {
    if (data.length > 0) {
      processData(data, viewMode);
      
      // Mettre à jour les sélections après changement de mode
      const availableWeeks = [...new Set(data.map(ticket => ticket.semaine))].sort((a, b) => a - b);
      const availableMonths = [...new Set(data.map(ticket => {
        const date = new Date(ticket.date_derniere_maj);
        return date.getMonth() + 1;
      }))].sort((a, b) => a - b);
      
      setSelectedValues(viewMode === "week" ? availableWeeks.slice(-5) : availableMonths.slice(-5));
    }
  }, [viewMode, data]);

  // Fonction pour traiter et agréger les données
  const processData = (tickets, mode) => {
    const aggregatedData = {};
    
    // Calculer les entrées par période
    tickets.forEach(ticket => {
      let entrantKey;
      if (mode === "week") {
        entrantKey = ticket.semaine;
      } else { // mode === "month"
        const date = new Date(ticket.date_derniere_maj);
        entrantKey = date.getMonth() + 1;
      }
      
      if (!aggregatedData[entrantKey]) {
        aggregatedData[entrantKey] = { entrants: 0, sortants: 0 };
      }
      aggregatedData[entrantKey].entrants += 1;
    });
    
    // Calculer les sorties par période
    tickets.forEach(ticket => {
      if (ticket.date_sortie) {
        let sortantKey;
        if (mode === "week") {
          sortantKey = ticket.semaine_date_sortant;
        } else { // mode === "month"
          const date = new Date(ticket.date_sortie);
          sortantKey = date.getMonth() + 1;
        }
        
        if (!aggregatedData[sortantKey]) {
          aggregatedData[sortantKey] = { entrants: 0, sortants: 0 };
        }
        aggregatedData[sortantKey].sortants += 1;
      }
    });
    
    setGroupedData(aggregatedData);
  };

  if (loading) {
    return <p className="text-center text-gray-500">Chargement des données...</p>;
  }

  // Obtenir les semaines et mois uniques
  const availableWeeks = [...new Set(data.map(ticket => ticket.semaine))].sort((a, b) => a - b);
  const availableMonths = [...new Set(data.map(ticket => {
    const date = new Date(ticket.date_derniere_maj);
    return date.getMonth() + 1;
  }))].sort((a, b) => a - b);

  // Préparer les données pour le graphique (en utilisant uniquement les périodes sélectionnées)
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

  // Gérer la sélection des semaines/mois
  const handleSelectionChange = (value) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  return (
    <div className="relative bg-white p-5 shadow-md rounded-lg w-full">
      <h3 className="text-lg font-semibold mb-3 text-gray-500">Rapport : Sortants/Entrants</h3>

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
              tension: 0.4, // Lissage de la courbe
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
  );
}