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

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend, ChartDataLabels);

export default function VolumeReentrants() {
  const id = "volume-reentrants";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [groupedData, setGroupedData] = useState({});

  const iterationColors = {
    2: "#2196f3",
    3: "#1b2b6b",
    4: "#f36e3b",
    5: "#4caf50",
    6: "#9c27b0",
    7: "#ff9800",
    8: "#009688",
  };

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
        console.error("Erreur lors du fetch :", error);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      updateSelectedValues(data, viewMode);
      processReentrantData(data, viewMode);
    }
  }, [viewMode]);

  const updateSelectedValues = (tickets, mode) => {
    const weeks = [...new Set(tickets.map(t => t.semaine))].sort((a, b) => a - b);
    const months = [...new Set(tickets.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
    setSelectedValues(mode === "week" ? weeks.slice(-5) : months.slice(-5));
  };

  const processReentrantData = (tickets, mode) => {
    const ticketCounts = {};
    const result = {};

    tickets.forEach(ticket => {
      const period = mode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1;
      const ticketId = ticket.id_ticket;

      if (!ticketCounts[ticketId]) ticketCounts[ticketId] = 1;
      else ticketCounts[ticketId] += 1;

      const iteration = ticketCounts[ticketId];
      if (iteration >= 2 && iteration <= 8) {
        if (!result[period]) result[period] = {};
        if (!result[period][iteration]) result[period][iteration] = new Set();
        result[period][iteration].add(ticketId);
      }
    });

    const cleaned = {};
    for (const period in result) {
      cleaned[period] = {};
      for (const iteration in result[period]) {
        cleaned[period][iteration] = result[period][iteration].size;
      }
    }

    setGroupedData(cleaned);
  };

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  const availableWeeks = [...new Set(data.map(t => t.semaine))].sort((a, b) => a - b);
  const availableMonths = [...new Set(data.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);

  const filteredPeriods = Object.keys(groupedData)
    .map(k => parseInt(k))
    .filter(k => selectedValues.includes(k))
    .sort((a, b) => a - b);

  const labels = filteredPeriods.map(p => viewMode === "week" ? `S-${p}` : `M-${p}`);

  const iterations = Array.from({ length: 7 }, (_, i) => i + 2).filter(it =>
    filteredPeriods.some(period => groupedData[period]?.[it])
  );

  const datasets = iterations.map(it => ({
    label: `${it} Réitération${it > 1 ? "s" : ""}`,
    data: filteredPeriods.map(period => groupedData[period]?.[it] || 0),
    backgroundColor: iterationColors[it] || "#ccc",
    borderRadius: 8,
    hoverBackgroundColor: iterationColors[it],
    hoverBorderWidth: 2,
    hoverBorderColor: "#444",
    categoryPercentage: 0.7
  }));

  const handleSelectionChange = (value) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const periodeLabel = selectedValues.length > 0
    ? (viewMode === "week"
      ? `Semaine(s) : ${selectedValues.join(", ")}`
      : `Mois : ${selectedValues.join(", ")}`)
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
          <h3 className="text-lg font-semibold text-gray-800">Volume des Réentrants</h3>
          <p className="text-sm text-gray-500">{periodeLabel}</p>
        </div>

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
            <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
              {(viewMode === "week" ? availableWeeks : availableMonths).map(value => (
                <div key={value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(value)}
                    onChange={() => handleSelectionChange(value)}
                  />
                  <span className="text-gray-500">{viewMode === "week" ? `Semaine ${value}` : `Mois ${value}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-[300px]">
          <Bar
            data={{ labels, datasets }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                  position: 'top',
                  labels: {
                    color: "black",
                    font: { size: 11 },
                    padding: 10
                  }
                },
                datalabels: {
                  anchor: 'end',
                  align: 'end',
                  color: 'black',
                  font: { size: 10 },
                  clamp: true,
                  clip: false,
                  offset: -4,
                  formatter: (value) => value > 0 ? value : ''
                },
                tooltip: {
                  callbacks: {
                    label: (context) => `${context.dataset.label}: ${context.raw}`
                  }
                }
              },
              scales: {
                x: { stacked: false },
                y: {
                  beginAtZero: true,
                  stacked: false,
                  ticks: { precision: 0 }
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
