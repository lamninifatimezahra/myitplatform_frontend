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
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AiOutlineFilter } from "react-icons/ai";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useExport } from "./ExportContext";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend, ChartDataLabels);

export default function GroupedBarChart() {
  const id = "grouped-bar-chart";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("day");
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("http://127.0.0.1:8000/dashboard/api/hispeed/data/");
        const result = await response.json();
        setData(result);
        setLoading(false);

        const last10Days = [...new Set(result.map(ticket => ticket.date_derniere_maj))].sort().slice(-10);
        const last5Weeks = [...new Set(result.map(ticket => ticket.semaine))].sort((a, b) => a - b).slice(-5);
        const last3Months = [...new Set(result.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b).slice(-3);

        setSelectedValues(viewMode === "day" ? last10Days : viewMode === "week" ? last5Weeks : last3Months);
        if (viewMode === "day") setSelectedDates(last10Days.map(dateStr => new Date(dateStr)));
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
      }
    }
    fetchData();
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "day" && selectedDates.length > 0) {
      const formattedDates = selectedDates.map(date => {
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return local.toISOString().split("T")[0];
      });
      
      setSelectedValues(formattedDates);
    }
  }, [selectedDates, viewMode]);

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  const availableDays = [...new Set(data.map(ticket => ticket.date_derniere_maj))].sort();
  const availableWeeks = [...new Set(data.map(ticket => ticket.semaine))].sort((a, b) => a - b);
  const availableMonths = [...new Set(data.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);

  const filteredDataEntrants = data.filter(ticket =>
    selectedValues.includes(
      viewMode === "day" ? ticket.date_derniere_maj
      : viewMode === "week" ? ticket.semaine
      : new Date(ticket.date_derniere_maj).getMonth() + 1
    )
  );

  const allSortants = data.filter(ticket => ticket.date_sortie);

  let labels = [];
  if (viewMode === "day") {
    labels = selectedValues.slice().sort();
  } else if (viewMode === "week") {
    labels = selectedValues.sort((a, b) => a - b).map(week => `S${week}`);
  } else {
    labels = selectedValues.sort((a, b) => a - b).map(month => monthNames[month - 1]);
  }

  const entrantsData = labels.map(label => {
    let period = label;
    if (viewMode === "week") period = parseInt(label.replace("S", ""));
    else if (viewMode === "month") period = monthNames.indexOf(label) + 1;

    return filteredDataEntrants.filter(ticket => {
      if (viewMode === "day") {
        return ticket.date_derniere_maj === period;
      } else if (viewMode === "week") {
        return ticket.semaine === period;
      } else {
        return new Date(ticket.date_derniere_maj).getMonth() + 1 === period;
      }
    }).length;
  });

  const sortantsData = labels.map(label => {
    let periodValue;
    let periodField;

    if (viewMode === "day") {
      periodValue = label;
      periodField = "date_sortie";
    } else if (viewMode === "week") {
      periodValue = parseInt(label.replace("S", ""));
      periodField = "semaine_date_sortant";
    } else {
      periodValue = monthNames.indexOf(label) + 1;
      periodField = ticket => ticket.date_sortie ? new Date(ticket.date_sortie).getMonth() + 1 : null;
    }

    return allSortants.filter(ticket => {
      if (typeof periodField === "function") {
        return periodField(ticket) === periodValue;
      } else {
        return ticket[periodField] === periodValue;
      }
    }).length;
  });

  const handleDateChange = (date) => {
    setSelectedDates(prevDates => {
      const isoDate = date.toISOString().split("T")[0];
      const exists = prevDates.some(d => d.toISOString().split("T")[0] === isoDate);
      return exists ? prevDates.filter(d => d.toISOString().split("T")[0] !== isoDate) : [...prevDates, date];
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full">
        <div className="absolute top-2 right-2 flex items-center space-x-2 z-50">
          <button className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" onClick={() => setIsOpen(!isOpen)}>
            <AiOutlineFilter size={20} className="text-gray-600" />
          </button>
          <label className="bg-white px-2 py-1 rounded shadow-sm text-sm flex items-center space-x-1">
            <input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleId(id)} />
            <span>Inclure</span>
          </label>
        </div>

        <h3 className="text-lg font-semibold mb-3 text-gray-500">Tickets Entrants vs. Sortants</h3>

        {isOpen && (
          <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
            <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
            <div className="flex space-x-2 mb-2 mt-2">
              <button className={`px-3 py-1 rounded-md ${viewMode === "day" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`} onClick={() => setViewMode("day")}>Jour</button>
              <button className={`px-3 py-1 rounded-md ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`} onClick={() => setViewMode("week")}>Semaine</button>
              <button className={`px-3 py-1 rounded-md ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`} onClick={() => setViewMode("month")}>Mois</button>
            </div>

            {viewMode === "day" ? (
              <div>
                <DatePicker
                  selected={null}
                  onChange={handleDateChange}
                  highlightDates={selectedDates}
                  includeDates={availableDays.map(date => new Date(date))}
                  inline
                />
                <div className="mt-2">
                  <h5 className="font-medium text-gray-500 mb-1">Jours sélectionnés:</h5>
                  <div className="max-h-32 overflow-y-auto">
                    {selectedDates.length > 0 ? (
                      <ul className="space-y-1">
                        {selectedDates.map((date, index) => (
                          <li key={index} className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded">
                            <span>{formatDate(date)}</span>
                            <button className="text-red-500 hover:text-red-700" onClick={() => handleDateChange(date)}>×</button>
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
                    <input type="checkbox" checked={selectedValues.includes(value)} onChange={() => setSelectedValues(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])} />
                    <span className="text-gray-500">{viewMode === "week" ? `Semaine ${value}` : monthNames[value - 1]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="h-[300px]">
          <Bar
            data={{
              labels: viewMode === "day" ? labels.map(formatDate) : labels,
              datasets: [
                { label: "Entrants", data: entrantsData, backgroundColor: "#68bddd" },
                { label: "Sortants", data: sortantsData, backgroundColor: "#1b2b6b" }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                datalabels: {
                  display: true,
                  color: '#000',
                  font: { weight: 'bold', size: 11 },
                  formatter: (value) => value > 0 ? value : '',
                  anchor: 'end',
                  align: 'top',
                  offset: -2
                },
                legend: { position: 'top' },
                tooltip: { mode: 'index', intersect: false }
              },
              scales: {
                x: { grid: { display: false } },
                y: {
                  beginAtZero: true,
                  grid: { drawBorder: false },
                  ticks: { precision: 0 }
                }
              },
              layout: { padding: { top: 20 } }
            }}
            plugins={[ChartDataLabels]}
          />
        </div>
      </div>
    </div>
  );
}
