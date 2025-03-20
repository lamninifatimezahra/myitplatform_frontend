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
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Enregistrement des composants Chart.js
ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

export default function GroupedBarChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("day"); // "day", "week" ou "month"
  const [selectedValues, setSelectedValues] = useState([]); // Toujours un tableau []
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]); // Pour stocker les objets Date sélectionnés

  // Noms des mois en français
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  // Chargement des données depuis l'API
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("http://127.0.0.1:8000/dashboard/api/hispeed/data/");
        const result = await response.json();
        setData(result);
        setLoading(false);

        // Définir les valeurs par défaut
        const last10Days = [...new Set(result.map(ticket => ticket.date_derniere_maj))]
          .sort()
          .slice(-10);
        const last5Weeks = [...new Set(result.map(ticket => ticket.semaine))].sort((a, b) => a - b).slice(-5);
        const last3Months = [...new Set(result.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))]
          .sort((a, b) => a - b)
          .slice(-3);

        setSelectedValues(viewMode === "day" ? last10Days : viewMode === "week" ? last5Weeks : last3Months);
        
        // Initialiser les dates sélectionnées
        if (viewMode === "day") {
          setSelectedDates(last10Days.map(dateStr => new Date(dateStr)));
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
      }
    }
    fetchData();
  }, [viewMode]);

  // Effet pour mettre à jour les selectedValues lorsque selectedDates change
  useEffect(() => {
    if (viewMode === "day" && selectedDates.length > 0) {
      const formattedDates = selectedDates.map(date => 
        date.toISOString().split("T")[0]
      );
      setSelectedValues(formattedDates);
    }
  }, [selectedDates, viewMode]);

  if (loading) {
    return <p className="text-center text-gray-500">Chargement des données...</p>;
  }

  // Obtenir les jours, semaines et mois uniques
  const availableDays = [...new Set(data.map(ticket => ticket.date_derniere_maj))].sort();
  const availableWeeks = [...new Set(data.map(ticket => ticket.semaine))].sort((a, b) => a - b);
  const availableMonths = [...new Set(data.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);

  // Filtrer les données selon la période sélectionnée (pour les tickets entrants)
  const filteredDataEntrants = data.filter(ticket =>
    selectedValues.includes(viewMode === "day" ? ticket.date_derniere_maj
      : viewMode === "week" ? ticket.semaine
      : new Date(ticket.date_derniere_maj).getMonth() + 1)
  );

  // Filtrer toutes les données pour les tickets sortants (sans filtrage préliminaire sur date_derniere_maj)
  const allSortants = data.filter(ticket => ticket.date_sortie); // S'assurer qu'il y a une date de sortie

  // Construire les labels pour les axes X (Jours, Semaines ou Mois) et les trier chronologiquement
  let labels = [];
  if (viewMode === "day") {
    labels = [...new Set(filteredDataEntrants.map(ticket => ticket.date_derniere_maj))].sort();
  } else if (viewMode === "week") {
    labels = [...new Set(filteredDataEntrants.map(ticket => ticket.semaine))]
      .sort((a, b) => a - b)
      .map(week => `S${week}`);
  } else { // month
    labels = [...new Set(filteredDataEntrants.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))]
      .sort((a, b) => a - b)
      .map(month => monthNames[month - 1]); // Utiliser les noms de mois
  }

  // Construire les datasets
  const entrantsData = labels.map(label => {
    let period;
    
    if (viewMode === "day") {
      period = label;
    } else if (viewMode === "week") {
      period = parseInt(label.replace("S", ""));
    } else { // month
      period = monthNames.indexOf(label) + 1; // Convertir le nom du mois en numéro
    }
    
    return filteredDataEntrants.filter(ticket => {
      if (viewMode === "day") {
        return ticket.date_derniere_maj === period;
      } else if (viewMode === "week") {
        return ticket.semaine === period;
      } else { // month
        return new Date(ticket.date_derniere_maj).getMonth() + 1 === period;
      }
    }).length;
  });

  // Pour les tickets sortants
  const sortantsData = labels.map(label => {
    let periodValue;
    let periodField;
    
    if (viewMode === "day") {
      periodValue = label; // Pour les jours, on utilise directement la date string
      periodField = "date_sortie";
    } else if (viewMode === "week") {
      periodValue = parseInt(label.replace("S", "")); // Pour les semaines, on extrait le numéro de semaine
      periodField = "semaine_date_sortant";
    } else { // month
      periodValue = monthNames.indexOf(label) + 1; // Convertir le nom du mois en numéro
      periodField = ticket => {
        return ticket.date_sortie ? new Date(ticket.date_sortie).getMonth() + 1 : null;
      };
    }
    
    return allSortants.filter(ticket => {
      if (typeof periodField === "function") {
        return periodField(ticket) === periodValue;
      } else {
        return ticket[periodField] === periodValue;
      }
    }).length;
  });
  
  // Gérer l'ajout ou la suppression d'une date
  const handleDateChange = (date) => {
    setSelectedDates(prevDates => {
      // Vérifier si la date est déjà sélectionnée
      const dateExists = prevDates.some(
        d => d.toISOString().split("T")[0] === date.toISOString().split("T")[0]
      );
      
      if (dateExists) {
        // Supprimer la date si elle est déjà sélectionnée
        return prevDates.filter(
          d => d.toISOString().split("T")[0] !== date.toISOString().split("T")[0]
        );
      } else {
        // Ajouter la date si elle n'est pas déjà sélectionnée
        return [...prevDates, date];
      }
    });
  };

  // Formatage des dates pour l'affichage
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  return (
    <div className="relative bg-white p-5 shadow-md rounded-lg w-full">
      <h3 className="text-lg font-semibold mb-3 text-gray-500">Tickets Entrants vs. Sortants</h3>

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
            <button className={`px-3 py-1 rounded-md ${viewMode === "day" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
              onClick={() => setViewMode("day")}>Jour</button>
            <button className={`px-3 py-1 rounded-md ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
              onClick={() => setViewMode("week")}>Semaine</button>
            <button className={`px-3 py-1 rounded-md ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
              onClick={() => setViewMode("month")}>Mois</button>
          </div>

          {/* Sélection des périodes */}
          {viewMode === "day" ? (
            <div>
              <div className="mb-2">
                <DatePicker
                  selected={null}
                  onChange={handleDateChange}
                  highlightDates={selectedDates}
                  includeDates={availableDays.map(date => new Date(date))}
                  inline
                />
              </div>
              
              {/* Affichage des dates sélectionnées */}
              <div className="mt-2">
                <h5 className="font-medium text-gray-500 mb-1">Jours sélectionnés:</h5>
                <div className="max-h-32 overflow-y-auto">
                  {selectedDates.length > 0 ? (
                    <ul className="space-y-1">
                      {selectedDates.map((date, index) => (
                        <li key={index} className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded">
                          <span>{formatDate(date)}</span>
                          <button 
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDateChange(date)}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">Aucun jour sélectionné</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
              {(viewMode === "week" ? availableWeeks : availableMonths).map(value => (
                <div key={value} className="flex items-center space-x-2">
                  <input type="checkbox" checked={selectedValues.includes(value)}
                    onChange={() => setSelectedValues(prev =>
                      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
                    )} />
                  <span className="text-gray-500">
                    {viewMode === "week" 
                      ? `Semaine ${value}` 
                      : monthNames[value - 1] // Afficher le nom du mois
                    }
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Graphique */}
      <Bar data={{ 
        labels: viewMode === "day" ? labels.map(date => formatDate(date)) : labels, 
        datasets: [
          { label: "Entrants", data: entrantsData, backgroundColor: "#68bddd" }, 
          { label: "Sortants", data: sortantsData, backgroundColor: "#95a5a6" }
        ] 
      }} />
    </div>
  );
}