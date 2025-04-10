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
import fetchWithAuth from "@/utils/fetchWithAuth";
import { AiOutlineFilter } from "react-icons/ai";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { useExport } from "./ExportContext"; // ajustez le chemin si besoin

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
  const id = "SLA d'Anciennete";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  const slaCategories = ["Jour", "2J", "3J", "Semaine", "2semaines", "Plus 2S"];

  // Chargement initial des données et extraction des années disponibles
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth(`https://myit-backend-ed72239b4b8e.herokuapp.comherokuapp.com/dashboard/api/hispeed/data/`);
        const result = await response.json();
        setData(result);

        // Extraction des années disponibles à partir de la date de dernière mise à jour
        const years = [...new Set(result.map(ticket => new Date(ticket.date_derniere_maj).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);

        // Sélectionner par défaut l'année la plus récente
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        setLoading(false);
      } catch (error) {
        console.error("Erreur fetch :", error);
      }
    }
    fetchData();
  }, []);

  // Mise à jour des périodes sélectionnées lorsque viewMode, selectedYear ou data change
  useEffect(() => {
    if (data.length > 0 && selectedYear) {
      const filteredByYear = data.filter(ticket => 
        new Date(ticket.date_derniere_maj).getFullYear() === selectedYear
      );
      if (viewMode === "week") {
        const weeks = [...new Set(filteredByYear.map(ticket => ticket.semaine))].sort((a, b) => a - b);
        setSelectedValues(weeks.length > 0 ? weeks.slice(-5) : []);
      } else {
        const months = [...new Set(filteredByYear.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
        setSelectedValues(months.length > 0 ? months.slice(-5) : []);
      }
    }
  }, [viewMode, selectedYear, data]);

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  // Fonction pour extraire les périodes (semaines ou mois) pour l'année sélectionnée
  const getAvailablePeriodsForYear = (year) => {
    const filteredByYear = data.filter(ticket => new Date(ticket.date_derniere_maj).getFullYear() === year);
    if (viewMode === "week") {
      return [...new Set(filteredByYear.map(ticket => ticket.semaine))].sort((a, b) => a - b);
    } else {
      return [...new Set(filteredByYear.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
    }
  };

  const availablePeriods = getAvailablePeriodsForYear(selectedYear);

  // Vérifier si toutes les périodes disponibles sont sélectionnées
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

  // Filtrer les données en fonction de l'année et des périodes sélectionnées
  const filteredData = data.filter(ticket => {
    const ticketYear = new Date(ticket.date_derniere_maj).getFullYear();
    const ticketPeriod =
      viewMode === "week"
        ? ticket.semaine
        : new Date(ticket.date_derniere_maj).getMonth() + 1;
    return ticketYear === selectedYear && selectedValues.includes(ticketPeriod);
  });

  // Stocker les périodes sélectionnées avec l'année associée
  const selectedValuesWithYear = selectedValues.map(value => ({
    value,
    year: selectedYear
  }));

  // Création des labels du graphique
  const labels = selectedValuesWithYear.map(item => {
    const periodLabel = viewMode === "week" ? `S${item.value}` : `M${item.value}`;
    return multipleYearsExist ? `${periodLabel}, ${item.year}` : periodLabel;
  });

  // Construction des datasets pour le graphique
  const datasets = slaCategories.map(category => ({
    label: category,
    data: selectedValuesWithYear.map(item => {
      return filteredData.filter(ticket => {
        const ticketYear = new Date(ticket.date_derniere_maj).getFullYear();
        const ticketPeriod =
          viewMode === "week"
            ? ticket.semaine
            : new Date(ticket.date_derniere_maj).getMonth() + 1;
        return (
          ticketYear === item.year &&
          ticketPeriod === item.value &&
          ticket.age_hispeed1 === category
        );
      }).length;
    }),
    backgroundColor: getColorForSlaCategory(category),
    stack: "stack1",
    borderRadius: 10
  }));

  function getColorForSlaCategory(category) {
    switch (category) {
      case "Jour":
        return "#b8e0f0";
      case "2J":
        return "#c9b8f0";
      case "3J":
        return "#8A4FFF";
      case "Semaine":
        return "#9932CC";
      case "2semaines":
        return "#0064a1";
      case "Plus 2S":
        return "#60b2f0";
      default:
        return "#ecf0f1";
    }
  }

  const periodeLabel =
    selectedValues.length > 0
      ? viewMode === "week"
        ? `Semaine(s) : ${selectedValues.join(", ")}`
        : `Mois : ${selectedValues.join(", ")}`
      : "Aucune période sélectionnée";

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full">
        {/* Coin supérieur droit : bouton filtre et inclure */}
        <div className="absolute top-2 right-2 flex items-center space-x-2 z-50">
          <button
            className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
            onClick={() => setIsOpen(!isOpen)}
          >
            <AiOutlineFilter size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Titre & période */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">SLA d’Ancienneté</h3>
          <p className="text-sm text-gray-500">
            {selectedYear && `Année : ${selectedYear} - `}
            {periodeLabel}
          </p>
        </div>

        {/* Popup filtre */}
        {isOpen && (
          <div className="absolute right-2 top-14 bg-white shadow-lg rounded-md p-4 w-64 z-50">
            <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
            <div className="flex space-x-2 mb-2 mt-2">
              <button
                className={`px-3 py-1 rounded-md ${
                  viewMode === "week"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-300 text-gray-500"
                }`}
                onClick={() => setViewMode("week")}
              >
                Semaine
              </button>
              <button
                className={`px-3 py-1 rounded-md ${
                  viewMode === "month"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-300 text-gray-500"
                }`}
                onClick={() => setViewMode("month")}
              >
                Mois
              </button>
            </div>
            {/* Sélection d'année si plusieurs années existent */}
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
                    {viewMode === "week"
                      ? `Semaine ${value}`
                      : `Mois ${value}`}
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
              indexAxis: "y",
              responsive: true,
              plugins: {
                legend: { display: true },
                datalabels: {
                  color: "black",
                  anchor: "center",
                  align: "center",
                  formatter: (value) => (value > 0 ? value : "")
                }
              },
              scales: {
                x: { stacked: true },
                y: { stacked: true }
              }
            }}
            plugins={[ChartDataLabels]}
          />
        </div>
      </div>
    </div>
  );
}
