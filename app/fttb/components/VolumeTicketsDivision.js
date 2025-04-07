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
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useExport } from "./ExportContext"; // adapte le chemin si besoin

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function VolumeTicketsDivision() {
  const id = "volume-division";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [disabledDivisions, setDisabledDivisions] = useState([]);

  const colors = {
    "ANC-FTTB": "#007bff",
    "BOT": "#1b2b6b",
    "CBL-N2": "#e6733f",
    "EXT_ERT": "#7c4dd2",
    "HLVIP": "#b83c82",
    "NOC_OMT": "#f1c40f",
    "THD_N2": "#f39c12",
    "THD_SFRASS_VTL": "#c9b8f0"
  };

  const fallbackPalette = [
    "#66b3ff", "#99ccff", "#c2d1f0", "#ffcc99", "#f7b7a3",
    "#dab6fc", "#ffb347", "#c0e3e5", "#ffd3b6", "#aec6cf"
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/api/fttb/data/`);
        const result = await response.json();
        setData(result);

        const years = [...new Set(result.map(ticket => new Date(ticket.date_derniere_maj).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        setLoading(false);
      } catch (error) {
        console.error("Erreur fetch :", error);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (data.length > 0 && selectedYear) {
      const filteredByYear = data.filter(ticket =>
        new Date(ticket.date_derniere_maj).getFullYear() === selectedYear
      );
      if (viewMode === "week") {
        const weeks = [...new Set(filteredByYear.map(ticket => ticket.semaine))].sort((a, b) => a - b);
        setSelectedValues(weeks.length > 0 ? [...weeks] : []);
      } else {
        const months = [...new Set(filteredByYear.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
        setSelectedValues(months.length > 0 ? months.slice(-5) : []);
      }
    }
  }, [viewMode, selectedYear, data]);

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

  const filteredData = data.filter(ticket => {
    const ticketYear = new Date(ticket.date_derniere_maj).getFullYear();
    const ticketPeriod = viewMode === "week"
      ? ticket.semaine
      : new Date(ticket.date_derniere_maj).getMonth() + 1;
    return ticketYear === selectedYear && selectedValues.includes(ticketPeriod);
  });

  const divisionCounts = {};
  filteredData.forEach(ticket => {
    const division = ticket.division;
    divisionCounts[division] = (divisionCounts[division] || 0) + 1;
  });
  const totalTickets = Object.values(divisionCounts).reduce((sum, val) => sum + val, 0);
  const divisionPercentages = Object.fromEntries(
    Object.entries(divisionCounts).map(([division, count]) => [
      division, ((count / totalTickets) * 100).toFixed(2)
    ])
  );
  const sortedDivisions = Object.keys(divisionCounts).sort((a, b) => divisionCounts[b] - divisionCounts[a]);

  const extendedColors = { ...colors };
  let paletteIndex = 0;
  sortedDivisions.forEach(division => {
    if (!extendedColors[division]) {
      extendedColors[division] = fallbackPalette[paletteIndex % fallbackPalette.length];
      paletteIndex++;
    }
  });

  const chartData = {
    labels: sortedDivisions,
    datasets: [
      {
        data: sortedDivisions.map(d =>
          disabledDivisions.includes(d) ? 0 : divisionCounts[d]
        ),
        backgroundColor: sortedDivisions.map(d => extendedColors[d]),
        borderWidth: 1,
        cutout: '40%',
        rotation: -90
      },
    ],
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
        <div className="absolute top-2 right-2 flex items-center space-x-2 z-50">
          <button
            className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
            onClick={() => setIsOpen(!isOpen)}
          >
            <AiOutlineFilter size={20} className="text-gray-600" />
          </button>
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-1">Volume des Tickets par Division</h3>
        <p className="text-sm text-gray-500 mb-3">
          {selectedYear && `Année : ${selectedYear} - `}
          {periodeLabel}
        </p>

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
            {multipleYearsExist && (
              <div className="mb-3">
                <h5 className="text-sm font-medium text-gray-500 mb-1">Années :</h5>
                <div className="flex flex-wrap gap-1">
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => handleYearChange(year)}
                      className={`px-2 py-1 text-xs rounded-md ${selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mb-2">
              <button
                onClick={toggleSelectAll}
                className={`text-xs px-2 py-1 rounded-md w-full ${allPeriodsSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
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
                        fillStyle: extendedColors[label],
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
