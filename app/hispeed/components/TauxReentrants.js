"use client";

import { useState, useEffect } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { AiOutlineFilter } from "react-icons/ai";
import { useExport } from "./ExportContext"; // 📦 à adapter selon le chemin réel

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function TauxReentrants() {
  const id = "taux-reentrants";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [disabledCategories, setDisabledCategories] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const colors = {
    "Réentrant": "#68bddd",
    "Non Réentrant": "#1b2b6b",
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("http://127.0.0.1:8000/dashboard/api/hispeed/data/");
        const result = await response.json();
        setData(result);
        setLoading(false);

        const weeks = [...new Set(result.map(t => t.semaine))].sort((a, b) => a - b);
        const months = [...new Set(result.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
        setSelectedValues(viewMode === "week" ? weeks.slice(-5) : months.slice(-5));
      } catch (error) {
        console.error("Erreur lors du fetch :", error);
      }
    }
    fetchData();
  }, [viewMode]);

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  const weeks = [...new Set(data.map(t => t.semaine))].sort((a, b) => a - b);
  const months = [...new Set(data.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);

  const filteredData = data.filter(ticket =>
    selectedValues.includes(viewMode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1)
  );

  const ticketsById = {};
  filteredData.forEach(ticket => {
    if (!ticketsById[ticket.id_ticket]) {
      ticketsById[ticket.id_ticket] = [];
    }
    ticketsById[ticket.id_ticket].push(ticket);
  });

  let nonReentrantCount = 0;
  let reentrantCount = 0;

  Object.values(ticketsById).forEach(tickets => {
    const sorted = tickets.sort((a, b) => new Date(a.date_derniere_maj) - new Date(b.date_derniere_maj));
    nonReentrantCount += 1;
    reentrantCount += sorted.length - 1;
  });

  const total = nonReentrantCount + reentrantCount;
  const categories = ["Réentrant", "Non Réentrant"];

  const chartData = {
    labels: categories,
    datasets: [
      {
        data: categories.map(cat =>
          disabledCategories.includes(cat)
            ? 0
            : cat === "Réentrant"
              ? reentrantCount
              : nonReentrantCount
        ),
        backgroundColor: categories.map(cat => colors[cat]),
        cutout: "45%",
        borderWidth: 1,
        rotation: -90,
      },
    ],
  };

  const handleSelectionChange = (value) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleCategory = (category) => {
    setDisabledCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const periodeLabel = selectedValues.length > 0
    ? (viewMode === "week"
      ? `Semaine(s) : ${selectedValues.join(", ")}`
      : `Mois : ${selectedValues.join(", ")}`)
    : "Aucune période sélectionnée";

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="absolute top-2 right-2 z-50 flex space-x-2">
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

      <div className="bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Taux des Réentrants</h3>
          <p className="text-sm text-gray-500 mb-3">{periodeLabel}</p>
        </div>

        {isOpen && (
          <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
            <h4 className="font-semibold text-gray-500">Filtrer par :</h4>

            <div className="flex space-x-2 mb-2">
              <button className={`px-3 py-1 rounded-md ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`} onClick={() => setViewMode("week")}>Semaine</button>
              <button className={`px-3 py-1 rounded-md ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`} onClick={() => setViewMode("month")}>Mois</button>
            </div>

            <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
              {(viewMode === "week" ? weeks : months).map(value => (
                <div key={value} className="flex items-center space-x-2">
                  <input type="checkbox" checked={selectedValues.includes(value)} onChange={() => handleSelectionChange(value)} />
                  <span className="text-gray-500">{viewMode === "week" ? `Semaine ${value}` : `Mois ${value}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="relative h-full max-h-[300px] w-full">
          <Doughnut
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                  position: "right",
                  labels: {
                    color: "black",
                    font: { size: 11 },
                    boxWidth: 12,
                    padding: 8,
                    generateLabels: (chart) => chart.data.labels.map((label, i) => ({
                      text: label,
                      fillStyle: colors[label],
                      hidden: disabledCategories.includes(label),
                    }))
                  },
                  onClick: (_, legendItem) => toggleCategory(legendItem.text),
                },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const label = context.label;
                      const value = context.raw;
                      const percent = total ? ((value / total) * 100).toFixed(2) : "0.0";
                      return `${label}: ${value} (${percent}%)`;
                    },
                  }
                },
                datalabels: {
                  color: "black",
                  font: { size: 10 },
                  formatter: (value, context) => {
                    const label = context.chart.data.labels[context.dataIndex];
                    if (value === 0) return "";
                    const percent = ((value / total) * 100).toFixed(2);
                    return `${value} (${percent}%)`;
                  },
                  anchor: 'end',
                  align: 'end',
                  offset: 8
                }
              },
              layout: { padding: 10 }
            }}
          />
        </div>
      </div>
    </div>
  );
}