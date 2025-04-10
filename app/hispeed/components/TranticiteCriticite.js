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


ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function TranticiteCriticite() {
  const id = "Tranticité / Criticité";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [selectedSeverities, setSelectedSeverities] = useState(["Mineur", "Majeur", "Critique", "Information"]);
  const [isOpen, setIsOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/hispeed/data/");
        const result = await response.json();
        setData(result);
        
        // Extraire les années disponibles
        const years = [...new Set(result.map(ticket => new Date(ticket.date_derniere_maj).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        
        // Sélectionner par défaut l'année la plus récente
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);
        
        // Filtrer les données par la vue et l'année sélectionnée
        const filteredByYear = result.filter(ticket => 
          new Date(ticket.date_derniere_maj).getFullYear() === latestYear
        );
        
        // Définir les valeurs de périodes sélectionnées par défaut
        if (viewMode === "week") {
          const availableWeeks = [...new Set(filteredByYear.map(ticket => ticket.semaine))].sort((a, b) => a - b);
          setSelectedValues(availableWeeks.slice(-5));
        } else {
          const availableMonths = [...new Set(filteredByYear.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
          setSelectedValues(availableMonths.slice(-5));
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du fetch des données :", error);
      }
    }
    fetchData();
  }, []);

  // Mettre à jour les valeurs sélectionnées lorsque le mode de vue ou l'année change
  useEffect(() => {
    if (data.length > 0 && selectedYear) {
      const filteredByYear = data.filter(ticket => 
        new Date(ticket.date_derniere_maj).getFullYear() === selectedYear
      );
      
      if (viewMode === "week") {
        const availableWeeks = [...new Set(filteredByYear.map(ticket => ticket.semaine))].sort((a, b) => a - b);
        setSelectedValues(availableWeeks.length > 0 ? availableWeeks.slice(-5) : []);
      } else {
        const availableMonths = [...new Set(filteredByYear.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
        setSelectedValues(availableMonths.length > 0 ? availableMonths.slice(-5) : []);
      }
    }
  }, [viewMode, selectedYear, data]);

  if (loading) {
    return <p className="text-center text-gray-500">Chargement des données...</p>;
  }

  // Obtenir les périodes disponibles pour l'année sélectionnée
  const getAvailablePeriodsForYear = (year) => {
    const filteredByYear = data.filter(ticket => 
      new Date(ticket.date_derniere_maj).getFullYear() === year
    );
    
    if (viewMode === "week") {
      return [...new Set(filteredByYear.map(ticket => ticket.semaine))].sort((a, b) => a - b);
    } else {
      return [...new Set(filteredByYear.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
    }
  };

  const availablePeriods = getAvailablePeriodsForYear(selectedYear);
  const availableSeverities = ["Mineur", "Majeur", "Critique", "Information"];

  // Vérifier si toutes les périodes sont sélectionnées
  const allPeriodsSelected = availablePeriods.length > 0 && 
    availablePeriods.every(period => selectedValues.includes(period));

  // Structure pour stocker les valeurs sélectionnées avec leurs années associées
  const selectedValuesWithYear = selectedValues.map(value => ({
    value,
    year: selectedYear
  }));

  // Filtrer les données selon les périodes sélectionnées (avec leurs années)
  const filteredData = data.filter(ticket => {
    const ticketYear = new Date(ticket.date_derniere_maj).getFullYear();
    const ticketPeriod = viewMode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1;
    
    return selectedValuesWithYear.some(item => 
      item.value === ticketPeriod && 
      item.year === ticketYear
    ) && selectedSeverities.includes(ticket.severite);
  });

  // Créer les labels du graphique (intégrer l'année si plusieurs années)
  const labels = selectedValuesWithYear.map(item => {
    const periodLabel = viewMode === "week" ? `S${item.value}` : `M${item.value}`;
    return multipleYearsExist ? `${periodLabel}, ${item.year}` : periodLabel;
  });

  // Calculer les totaux pour chaque période
  const totalCounts = selectedValuesWithYear.map(item => {
    return filteredData.filter(ticket => {
      const ticketYear = new Date(ticket.date_derniere_maj).getFullYear();
      const ticketPeriod = viewMode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1;
      return ticketPeriod === item.value && ticketYear === item.year;
    }).length;
  });

  const datasets = [
    ...availableSeverities.map(severity => ({
      label: severity,
      data: selectedValuesWithYear.map(item => {
        return filteredData.filter(ticket => {
          const ticketYear = new Date(ticket.date_derniere_maj).getFullYear();
          const ticketPeriod = viewMode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1;
          return ticketPeriod === item.value && 
                 ticketYear === item.year && 
                 ticket.severite === severity;
        }).length;
      }),
      backgroundColor: getColorForSeverity(severity),
      stack: "stack1",
      borderRadius: 10,
      datalabels: {
        display: true,
        color: "black",
        anchor: "center",
        align: "center",
        formatter: value => value > 0 ? value : "",
      }
    })),
    {
      label: "Total",
      data: totalCounts,
      type: "bar",
      backgroundColor: "transparent",
      borderWidth: 0,
      stack: undefined,
      datalabels: {
        display: true,
        anchor: "end",
        align: "top",
        color: "black",
        font: {
          weight: "bold",
          size: 14
        },
        offset: 0,
        padding: { top: 5 }
      }
    }
  ];

  function getColorForSeverity(severity) {
    switch (severity) {
      case "Mineur": return "#b8e0f0";
      case "Majeur": return "#c9b8f0";
      case "Critique": return "#8A4FFF";
      case "Information": return "#60b2f0";
      default: return "#bdc3c7";
    }
  }

  const handleSelectionChange = (value) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleSelectAll = () => {
    if (allPeriodsSelected) {
      // Si toutes les périodes sont sélectionnées, tout désélectionner
      setSelectedValues([]);
    } else {
      // Sinon, tout sélectionner
      setSelectedValues([...availablePeriods]);
    }
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  // Affichage texte des périodes sélectionnées
  const periodeLabel = selectedValues.length > 0
    ? (viewMode === "week" ? `Semaine(s) : ${selectedValues.join(", ")}` : `Mois : ${selectedValues.join(", ")}`)
    : "Aucune période sélectionnée";

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full">

        {/* ✅ Coin supérieur droit : bouton filtre + inclure */}
        <div className="absolute top-2 right-2 flex items-center space-x-2 z-50">
          <button
            className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
            onClick={() => setIsOpen(!isOpen)}
          >
            <AiOutlineFilter size={20} className="text-gray-600" />
          </button>

        </div>

        {/* ✅ Titre & période */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Tranticité / Criticité</h3>
          <p className="text-sm text-gray-500">
            {selectedYear && `Année : ${selectedYear} - `}{periodeLabel}
          </p>
        </div>

        {/* ✅ Popup filtre */}
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

            {/* Sélection d'année si plusieurs années */}
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

            {/* Bouton unique de sélection/désélection */}
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
              {availablePeriods.map(value => (
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

        <Bar
          data={{ labels, datasets }}
          options={{
            responsive: true,
            plugins: {
              legend: { display: true },
              datalabels: {
                display: false
              },
              tooltip: {
                callbacks: {
                  footer: (tooltipItems) => {
                    const sum = tooltipItems[0].dataset.data[tooltipItems[0].dataIndex];
                    return `Total: ${sum}`;
                  }
                }
              }
            },
            scales: {
              x: { stacked: true },
              y: { stacked: true },
            }
          }}
        />
      </div>
    </div>
  );
}