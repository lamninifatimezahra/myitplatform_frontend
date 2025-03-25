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
  const id = "tranticite-criticite";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [selectedSeverities, setSelectedSeverities] = useState(["Mineur", "Majeur", "Critique", "Information"]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("http://127.0.0.1:8000/dashboard/api/hispeed/data/");
        const result = await response.json();
        setData(result);
        setLoading(false);

        const availableWeeks = [...new Set(result.map(ticket => ticket.semaine))].sort((a, b) => a - b);
        const availableMonths = [...new Set(result.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
        setSelectedValues(viewMode === "week" ? availableWeeks.slice(-5) : availableMonths.slice(-5));
      } catch (error) {
        console.error("Erreur lors du fetch des données :", error);
      }
    }
    fetchData();
  }, [viewMode]);

  if (loading) {
    return <p className="text-center text-gray-500">Chargement des données...</p>;
  }

  const availableWeeks = [...new Set(data.map(ticket => ticket.semaine))].sort((a, b) => a - b);
  const availableMonths = [...new Set(data.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
  const availableSeverities = ["Mineur", "Majeur", "Critique", "Information"];

  const filteredData = data.filter(ticket =>
    selectedValues.includes(viewMode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1) &&
    selectedSeverities.includes(ticket.severite)
  );

  const labels = [...new Set(filteredData.map(ticket => viewMode === "week" ? `S${ticket.semaine}` : `M${new Date(ticket.date_derniere_maj).getMonth() + 1}`))];

  const totalCounts = labels.map(label => {
    const period = viewMode === "week" ? parseInt(label.replace("S", "")) : parseInt(label.replace("M", ""));
    return filteredData.filter(ticket => (viewMode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1) === period).length;
  });

  const datasets = [
    ...availableSeverities.map(severity => ({
      label: severity,
      data: labels.map(label => {
        const period = viewMode === "week" ? parseInt(label.replace("S", "")) : parseInt(label.replace("M", ""));
        return filteredData.filter(ticket =>
          (viewMode === "week" ? ticket.semaine : new Date(ticket.date_derniere_maj).getMonth() + 1) === period &&
          ticket.severite === severity
        ).length;
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

          <label className="bg-white px-2 py-1 rounded shadow-sm text-sm flex items-center space-x-1">
            <input
              type="checkbox"
              checked={selectedIds.includes(id)}
              onChange={() => toggleId(id)}
            />
            <span>Inclure</span>
          </label>
        </div>

        {/* ✅ Titre & période */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Tranticité / Criticité</h3>
          <p className="text-sm text-gray-500">{periodeLabel}</p>
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
