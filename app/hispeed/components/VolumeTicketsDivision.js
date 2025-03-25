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
import { useExport } from "./ExportContext"; // adapte le chemin si besoin

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function VolumeTicketsDivision() {
  const id = "volume-division";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [disabledDivisions, setDisabledDivisions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const colors = {
    "RESEAU": "#007bff",
    "GP": "#1b2b6b",
    "FSC": "#e6733f",
    "DSI": "#7c4dd2",
    "DOP": "#b83c82",
    "DIVEN": "#f1c40f",
    "AUTRE DIVISION": "#f39c12"
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
        console.error("Erreur fetch :", error);
      }
    }
    fetchData();
  }, [viewMode]);

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  const availableWeeks = [...new Set(data.map(t => t.semaine))].sort((a, b) => a - b);
  const availableMonths = [...new Set(data.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);

  const filteredData = data.filter(ticket =>
    selectedValues.includes(
      viewMode === "week"
        ? ticket.semaine
        : new Date(ticket.date_derniere_maj).getMonth() + 1
    )
  );

  const divisionCounts = {};
  filteredData.forEach(ticket => {
    const division = Object.keys(colors).includes(ticket.division) ? ticket.division : "AUTRE DIVISION";
    divisionCounts[division] = (divisionCounts[division] || 0) + 1;
  });

  const totalTickets = Object.values(divisionCounts).reduce((sum, val) => sum + val, 0);
  const divisionPercentages = Object.fromEntries(
    Object.entries(divisionCounts).map(([division, count]) => [
      division, ((count / totalTickets) * 100).toFixed(2)
    ])
  );

  const sortedDivisions = Object.keys(divisionCounts).sort((a, b) => divisionCounts[b] - divisionCounts[a]);

  const chartData = {
    labels: sortedDivisions,
    datasets: [
      {
        data: sortedDivisions.map(d =>
          disabledDivisions.includes(d) ? 0 : divisionCounts[d]
        ),
        backgroundColor: sortedDivisions.map(d => colors[d]),
        borderWidth: 1,
        cutout: '40%',
        rotation: -90
      },
    ],
  };

  const handleSelectionChange = (value) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleDivision = (division) => {
    setDisabledDivisions(prev =>
      prev.includes(division) ? prev.filter(d => d !== division) : [...prev, division]
    );
  };

  const periodeLabel = selectedValues.length > 0
    ? (viewMode === "week"
      ? `Semaine(s) : ${selectedValues.join(", ")}`
      : `Mois : ${selectedValues.join(", ")}`)
    : "Aucune période sélectionnée";

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Boutons en haut à droite */}
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

        {/* Titre + période */}
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Volume des Tickets par Division</h3>
        <p className="text-sm text-gray-500 mb-3">{periodeLabel}</p>

        {/* Filtres */}
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

        {/* Graphique */}
        <div className="relative h-[300px] w-full">
          <Doughnut
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                  position: 'right',
                  labels: {
                    color: "black",
                    font: { size: 10 },
                    boxWidth: 10,
                    generateLabels: (chart) => {
                      const labels = chart.data.labels || [];
                      return labels.map((label, i) => ({
                        text: label,
                        fillStyle: colors[label],
                        hidden: disabledDivisions.includes(label)
                      }));
                    }
                  },
                  onClick: (_, item) => toggleDivision(item.text),
                },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const division = ctx.label;
                      if (disabledDivisions.includes(division)) return null;
                      return `${division}: ${ctx.raw} tickets (${divisionPercentages[division]}%)`;
                    }
                  }
                },
                datalabels: {
                  color: "black",
                  anchor: "end",
                  align: "end",
                  offset: 8,
                  font: { size: 9 },
                  formatter: (value, ctx) => {
                    const division = ctx.chart.data.labels[ctx.dataIndex];
                    const pct = divisionPercentages[division];
                    return value > 0 ? `${value} (${pct}%)` : "";
                  },
                  display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
                }
              },
              layout: {
                padding: { top: 20, right: 50, bottom: 20, left: 50 }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
