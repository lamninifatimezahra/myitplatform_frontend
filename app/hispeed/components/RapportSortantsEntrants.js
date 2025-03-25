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
import { useExport } from "./ExportContext";

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
  const id = "rapport-sortants-entrants";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [groupedData, setGroupedData] = useState({});

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("http://127.0.0.1:8000/dashboard/api/hispeed/data/");
        const result = await response.json();
        setData(result);
        setLoading(false);
        processData(result, viewMode);

        const availableWeeks = [...new Set(result.map(ticket => ticket.semaine))].sort((a, b) => a - b);
        const availableMonths = [...new Set(result.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
        setSelectedValues(viewMode === "week" ? availableWeeks.slice(-5) : availableMonths.slice(-5));
      } catch (error) {
        console.error("Erreur lors du fetch des données :", error);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      processData(data, viewMode);
      const availableWeeks = [...new Set(data.map(ticket => ticket.semaine))].sort((a, b) => a - b);
      const availableMonths = [...new Set(data.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
      setSelectedValues(viewMode === "week" ? availableWeeks.slice(-5) : availableMonths.slice(-5));
    }
  }, [viewMode, data]);

  const processData = (tickets, mode) => {
    const aggregatedData = {};
    tickets.forEach(ticket => {
      let entrantKey = mode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1;
      if (!aggregatedData[entrantKey]) aggregatedData[entrantKey] = { entrants: 0, sortants: 0 };
      aggregatedData[entrantKey].entrants += 1;
    });

    tickets.forEach(ticket => {
      if (ticket.date_sortie) {
        let sortantKey = mode === "week" ? ticket.semaine_date_sortant : new Date(ticket.date_sortie).getMonth() + 1;
        if (!aggregatedData[sortantKey]) aggregatedData[sortantKey] = { entrants: 0, sortants: 0 };
        aggregatedData[sortantKey].sortants += 1;
      }
    });

    setGroupedData(aggregatedData);
  };

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  const availableWeeks = [...new Set(data.map(ticket => ticket.semaine))].sort((a, b) => a - b);
  const availableMonths = [...new Set(data.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);

  const filteredPeriods = Object.keys(groupedData)
    .map(key => parseInt(key))
    .filter(key => selectedValues.includes(key))
    .sort((a, b) => a - b);

  const labels = filteredPeriods.map(value => viewMode === "week" ? `Semaine ${value}` : `Mois ${value}`);
  const dataValues = filteredPeriods.map(period => {
    const { entrants, sortants } = groupedData[period] || { entrants: 0, sortants: 0 };
    return entrants > 0 ? ((sortants / entrants) * 100).toFixed(1) : 0;
  });

  const handleSelectionChange = (value) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const periodeLabel = selectedValues.length > 0
    ? (viewMode === "week" ? `Semaine(s) : ${selectedValues.join(", ")}` : `Mois : ${selectedValues.join(", ")}`)
    : "Aucune période sélectionnée";

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full">
        <div className="absolute top-2 right-2 flex items-center space-x-2 z-50">
          <button
            className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
            onClick={() => setIsOpen(!isOpen)}
          >
            <AiOutlineFilter size={20} className="text-gray-600" />
          </button>
          <label className="bg-white px-2 py-1 rounded shadow-sm text-sm flex items-center space-x-1">
            <input
              type="checkbox"
              checked={selectedIds.includes(id)}
              onChange={() => toggleId(id)}
            />
            <span>Inclure</span>
          </label>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Rapport : Sortants/Entrants</h3>
          <p className="text-sm text-gray-500">{periodeLabel}</p>
        </div>

        {isOpen && (
          <div className="absolute right-2 top-14 bg-white shadow-lg rounded-md p-4 w-64 z-50">
            <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
            <div className="flex space-x-2 mb-2 mt-2">
              <button className={`px-3 py-1 rounded-md ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                onClick={() => setViewMode("week")}>Semaine</button>
              <button className={`px-3 py-1 rounded-md ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                onClick={() => setViewMode("month")}>Mois</button>
            </div>
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

        <div className="h-[300px]">
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
                  tension: 0.4,
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
      </div>
    </div>
  );
}