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
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useExport } from "./ExportContext"; // adapte le chemin si besoin

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function ClientCoupeChart() {
  const id = "Client Coupé";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // États pour la gestion des années
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  // Récupération initiale des données, extraction des années et définition par défaut des périodes pour l'année sélectionnée
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth(`https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/hispeed/data/`);
        const result = await response.json();
        setData(result);

        // Extraction des années depuis date_derniere_maj
        const years = [...new Set(result.map(t => new Date(t.date_derniere_maj).getFullYear()))].sort((a, b) => a - b);
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        // Filtrer les tickets pour l'année sélectionnée
        const ticketsForYear = result.filter(t => new Date(t.date_derniere_maj).getFullYear() === latestYear);
        const weeks = [...new Set(ticketsForYear.map(t => t.semaine))].sort((a, b) => a - b);
        const months = [...new Set(ticketsForYear.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
        setSelectedValues(viewMode === "week" ? weeks.slice(-5) : months.slice(-5));

        setLoading(false);
      } catch (error) {
        console.error("Erreur fetch :", error);
      }
    }
    fetchData();
  }, [viewMode]);

  // Mise à jour des périodes sélectionnées lorsque l'année sélectionnée change ou que les données se modifient
  useEffect(() => {
    if (data.length > 0 && selectedYear) {
      const ticketsForYear = data.filter(t => new Date(t.date_derniere_maj).getFullYear() === selectedYear);
      const weeks = [...new Set(ticketsForYear.map(t => t.semaine))].sort((a, b) => a - b);
      const months = [...new Set(ticketsForYear.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
      setSelectedValues(viewMode === "week" ? weeks.slice(-5) : months.slice(-5));
    }
  }, [selectedYear, data, viewMode]);

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  // Filtrer les tickets pour l'année sélectionnée
  const ticketsForYear = data.filter(t => new Date(t.date_derniere_maj).getFullYear() === selectedYear);
  const availableWeeks = [...new Set(ticketsForYear.map(t => t.semaine))].sort((a, b) => a - b);
  const availableMonths = [...new Set(ticketsForYear.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
  const availablePeriods = viewMode === "week" ? availableWeeks : availableMonths;

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

  // Filtrer les tickets selon les périodes sélectionnées (dans l'année en cours)
  const filteredData = ticketsForYear.filter(ticket =>
    selectedValues.includes(
      viewMode === "week"
        ? ticket.semaine
        : new Date(ticket.date_derniere_maj).getMonth() + 1
    )
  );

  // On s'assure que les périodes sélectionnées sont triées chronologiquement
  const sortedSelectedValues = [...selectedValues].sort((a, b) => a - b);
  const labels = sortedSelectedValues.map(period =>
    viewMode === "week" ? `S${period}` : `M${period}`
  );

  // Comptage des clients coupés pour chaque période (filtrée et triée)
  const clientCoupeCounts = sortedSelectedValues.map(period =>
    filteredData.filter(ticket =>
      (viewMode === "week"
        ? ticket.semaine
        : new Date(ticket.date_derniere_maj).getMonth() + 1) === period &&
      ticket.client_coupe === "OK"
    ).length
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: "Clients Coupés",
        data: clientCoupeCounts,
        backgroundColor: "#2c3e50",
        borderRadius: 10,
        hoverBackgroundColor: "#1c2c3d",
        hoverBorderWidth: 2,
        hoverBorderColor: "#444",
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
    ],
  };

  const periodeLabel = selectedValues.length > 0
    ? (viewMode === "week"
        ? `Semaine(s) : ${sortedSelectedValues.join(", ")}`
        : `Mois : ${sortedSelectedValues.join(", ")}`)
    : "Aucune période sélectionnée";

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full">

        {/* Boutons en haut à droite : filtre et inclure */}
        <div className="absolute top-2 right-2 flex items-center space-x-2 z-50">
          <button
            className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
            onClick={() => setIsOpen(!isOpen)}
          >
            <AiOutlineFilter size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Titre & affichage de la période */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Client Coupé</h3>
          <p className="text-sm text-gray-500">
            {selectedYear && `Année : ${selectedYear} - `}
            {periodeLabel}
          </p>
        </div>

        {/* Popup filtre */}
        {isOpen && (
          <div className="absolute right-2 top-14 bg-white shadow-lg rounded-md p-4 w-64 z-50">
            <h4 className="font-semibold text-gray-500">Filtrer par :</h4>

            {/* Boutons pour changer de vue */}
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

            {/* Bouton "Tout sélectionner / Tout désélectionner" */}
            <div className="mb-2">
              <button
                onClick={toggleSelectAll}
                className={`text-xs px-2 py-1 rounded-md w-full ${
                  allPeriodsSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                {allPeriodsSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            </div>

            {/* Sélection des périodes (semaines ou mois) pour l'année sélectionnée */}
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
        <div className="h-[300px] mt-4">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: {
                duration: 500,
                easing: "easeOutQuart"
              },
              plugins: {
                legend: { display: false },
                datalabels: {
                  anchor: "end",
                  align: "end",
                  color: "black",
                  font: { size: 11 },
                  formatter: value => value > 0 ? value : "",
                  offset: -4
                }
              },
              scales: {
                x: {
                  ticks: { color: "black" },
                  title: {
                    display: true,
                    text: viewMode === "week" ? "Semaines" : "Mois",
                    color: "black"
                  }
                },
                y: {
                  beginAtZero: true,
                  ticks: { color: "black" },
                  title: {
                    display: true,
                    text: "Nombre de clients coupés",
                    color: "black"
                  }
                }
              }
            }}
            plugins={[ChartDataLabels]}
          />
        </div>
      </div>
    </div>
  );
}
