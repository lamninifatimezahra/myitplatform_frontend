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
import ChartDataLabels from "chartjs-plugin-datalabels";
import { AiOutlineFilter } from "react-icons/ai";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { useExport } from "./ExportContext";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend, ChartDataLabels);

export default function GroupedBarChart() {
  const id = "grouped-bar-chart";
  const { selectedIds, toggleId } = useExport();

  // États liés aux données, vue, sélection et gestion des années (uniquement pour les vues semaine/mois)
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  // viewMode peut être "day", "week" ou "month"
  const [viewMode, setViewMode] = useState("day");
  // Pour "day" : dates au format ISO, pour "week" et "month" : nombres représentant la semaine ou le mois
  const [selectedValues, setSelectedValues] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  // Pour la vue "day"
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  // États pour la gestion des années en vue "week" et "month"
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  // Pour le bouton "Tout sélectionner/Tout désélectionner" en vue non "day"
  const [allSelected, setAllSelected] = useState(false);

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  // Au fetch initial, on charge les données et on en déduit la sélection par défaut
  useEffect(() => {
    fetch("http://127.0.0.1:8000/dashboard/api/hispeed/data/")
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);

        // Pour la vue "day", on récupère les derniers jours disponibles
        const lastDays = [...new Set(json.map(t => t.date_derniere_maj))].sort().slice(-10);
        // Pour la gestion des années en vue "week" et "month"
        const years = [...new Set(json.map(t => new Date(t.date_derniere_maj).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        if (viewMode === "day") {
          setSelectedValues(lastDays);
          setSelectedDates(lastDays.map(d => new Date(d)));
          if (lastDays.length > 0) {
            setCalendarMonth(new Date(lastDays[lastDays.length - 1]));
          }
        } else if (viewMode === "week") {
          // Filtrer par année sélectionnée
          const filteredByYear = json.filter(t => new Date(t.date_derniere_maj).getFullYear() === latestYear);
          const lastWeeks = [...new Set(filteredByYear.map(t => t.semaine))].sort((a, b) => a - b).slice(-5);
          setSelectedValues(lastWeeks);
          setAllSelected(false);
        } else if (viewMode === "month") {
          const filteredByYear = json.filter(t => new Date(t.date_derniere_maj).getFullYear() === latestYear);
          const lastMonths = [...new Set(filteredByYear.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b).slice(-3);
          setSelectedValues(lastMonths);
          setAllSelected(false);
        }
      });
  }, [viewMode]);

  // Pour la vue "day", mettre à jour selectedValues en fonction de selectedDates
  useEffect(() => {
    if (viewMode === "day") {
      const formatted = selectedDates.map(d =>
        new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0]
      );
      setSelectedValues(formatted);
    }
  }, [selectedDates, viewMode]);

  // Recalcule automatique de la sélection lorsque selectedYear ou viewMode change (pour week et month)
  useEffect(() => {
    if (viewMode === "week" || viewMode === "month") {
      const filteredByYear = data.filter(t => new Date(t.date_derniere_maj).getFullYear() === selectedYear);
      if (viewMode === "week") {
        const weeks = [...new Set(filteredByYear.map(t => t.semaine))].sort((a, b) => a - b);
        setSelectedValues(weeks.slice(-5));
        setAllSelected(false);
      } else if (viewMode === "month") {
        const months = [...new Set(filteredByYear.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);
        setSelectedValues(months.slice(-3));
        setAllSelected(false);
      }
    }
  }, [selectedYear, viewMode, data]);

  if (loading) return <p className="text-center text-gray-500">Chargement...</p>;

  // Pour la vue "day", on utilise toutes les dates disponibles ; pour "week"/"month", on filtre par année
  const availableDays = [...new Set(data.map(t => t.date_derniere_maj))].sort();
  const filteredByYear = viewMode === "day" ? data : data.filter(t => new Date(t.date_derniere_maj).getFullYear() === selectedYear);
  const availablePeriods =
    viewMode === "day"
      ? availableDays
      : viewMode === "week"
      ? [...new Set(filteredByYear.map(t => t.semaine))].sort((a, b) => a - b)
      : [...new Set(filteredByYear.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);

  const allPeriodsSelected =
    availablePeriods.length > 0 && availablePeriods.every(period => selectedValues.includes(period));

  // Gestion du bouton "Tout sélectionner/Tout désélectionner" pour la vue week/month
  const handleSelectAll = () => {
    if (allPeriodsSelected) {
      setSelectedValues([]);
      setAllSelected(false);
    } else {
      setSelectedValues([...availablePeriods]);
      setAllSelected(true);
    }
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  // Pour le filtrage des entrants, si on est en vue day on ne filtre pas par année, sinon on vérifie l'année
  const filteredEntrants = data.filter(t => {
    if (viewMode === "day") {
      return selectedValues.includes(t.date_derniere_maj);
    } else {
      if (new Date(t.date_derniere_maj).getFullYear() !== selectedYear) return false;
      if (viewMode === "week") return selectedValues.includes(t.semaine);
      if (viewMode === "month") return selectedValues.includes(new Date(t.date_derniere_maj).getMonth() + 1);
    }
    return false;
  });

  // Pour les sortants, on ne prend que ceux dont la date_sortie est définie et (en week/month) appartenant à l'année sélectionnée
  const filteredSortants = data.filter(t => {
    if (!t.date_sortie) return false;
    if (viewMode === "day") return true;
    return new Date(t.date_sortie).getFullYear() === selectedYear;
  });

  // Calcul des labels pour le graphique ; si week ou month, on ajoute l'année si plusieurs années existent
  let labels = [];
  if (viewMode === "day") {
    labels = selectedValues.slice().sort();
  } else if (viewMode === "week") {
    labels = selectedValues.slice().sort((a, b) => a - b).map(w =>
      multipleYearsExist ? `S${w}, ${selectedYear}` : `S${w}`
    );
  } else {
    labels = selectedValues.slice().sort((a, b) => a - b).map(m =>
      multipleYearsExist ? `${monthNames[m - 1]}, ${selectedYear}` : monthNames[m - 1]
    );
  }

  // Calcul des données pour les entrants
  const entrantsData = selectedValues
    .slice()
    .sort((a, b) => a - b)
    .map(val => {
      if (viewMode === "day") {
        return filteredEntrants.filter(t => t.date_derniere_maj === val).length;
      } else if (viewMode === "week") {
        return filteredEntrants.filter(t => t.semaine === val).length;
      } else {
        return filteredEntrants.filter(t => new Date(t.date_derniere_maj).getMonth() + 1 === val).length;
      }
    });

  // Calcul des données pour les sortants
  const sortantsData = selectedValues
    .slice()
    .sort((a, b) => a - b)
    .map(val => {
      if (viewMode === "day") {
        return filteredSortants.filter(t => t.date_sortie === val).length;
      } else if (viewMode === "week") {
        return filteredSortants.filter(t => t.semaine_date_sortant === val).length;
      } else {
        return filteredSortants.filter(t => new Date(t.date_sortie).getMonth() + 1 === val).length;
      }
    });

  // Fonction de formatage de la date pour la vue "day"
  const formatDate = (str) => {
    const d = new Date(str);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;
  };

  // Pour la gestion du calendrier en vue "day"
  const handleDateChange = (date) => {
    const iso = date.toISOString().split("T")[0];
    setSelectedDates(prev =>
      prev.some(d => d.toISOString().split("T")[0] === iso)
        ? prev.filter(d => d.toISOString().split("T")[0] !== iso)
        : [...prev, date]
    );
  };

  const handleWeekClick = (_, weekNum) => {
    // Conserver le mois courant du calendrier
    const currentMonth = calendarMonth;
    const weekDates = availableDays
      .map(d => new Date(d))
      .filter(d => getWeek(d, { locale: fr }) === weekNum);
    setSelectedDates(prev => {
      const existing = weekDates.filter(
        d => !prev.some(p => p.toISOString().split("T")[0] === d.toISOString().split("T")[0])
      );
      return [...prev, ...existing];
    });
    setTimeout(() => {
      setCalendarMonth(currentMonth);
    }, 10);
  };

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full">
        {/* Bouton filtre et case d'inclusion */}
        <div className="absolute top-2 right-2 flex items-center space-x-2 z-50">
          <button className="bg-gray-300 p-2 rounded-full" onClick={() => setIsOpen(!isOpen)}>
            <AiOutlineFilter size={20} className="text-gray-600" />
          </button>
          <label className="bg-white px-2 py-1 rounded shadow-sm text-sm flex items-center space-x-1">
            <input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleId(id)} />
            <span>Inclure</span>
          </label>
        </div>

        <h3 className="text-lg font-semibold mb-3 text-gray-800">Tickets Entrants vs. Sortants</h3>

        {isOpen && (
          <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
            <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
            <div className="flex space-x-2 mt-2 mb-2">
              {["day", "week", "month"].map(mode => (
                <button
                  key={mode}
                  className={`px-3 py-1 rounded-md ${viewMode === mode ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                  onClick={() => setViewMode(mode)}
                >
                  {mode === "day" ? "Jour" : mode === "week" ? "Semaine" : "Mois"}
                </button>
              ))}
            </div>

            {viewMode === "day" ? (
              <div>
                <DatePicker
                  selected={calendarMonth}
                  onChange={handleDateChange}
                  highlightDates={selectedDates}
                  includeDates={availableDays.map(d => new Date(d))}
                  inline
                  calendarStartDay={1}
                  showWeekNumbers
                  onWeekSelect={handleWeekClick}
                  locale={fr}
                  onMonthChange={month => setCalendarMonth(month)}
                />
              </div>
            ) : (
              <>
                {/* Affichage du filtre d'années (si plusieurs années existent) */}
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

                {/* Bouton "Tout sélectionner/Tout désélectionner" avec le même style que dans Tranticité/Criticité */}
                <div className="mb-2">
                  <button
                    onClick={handleSelectAll}
                    className={`text-xs px-2 py-1 rounded-md w-full ${
                      allPeriodsSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    {allPeriodsSelected ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                </div>

                <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
                  {(viewMode === "week" ? availablePeriods : availablePeriods).map(val => (
                    <div key={val} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedValues.includes(val)}
                        onChange={() =>
                          setSelectedValues(prev =>
                            prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
                          )
                        }
                      />
                      <span className="text-gray-600">
                        {viewMode === "week" ? `Semaine ${val}` : monthNames[val - 1]}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="h-[300px] flex justify-center items-center">
          <div className="w-11/12">
            <Bar
              data={{
                labels: viewMode === "day" ? labels.map(formatDate) : labels,
                datasets: [
                  { label: "Entrants", data: entrantsData, backgroundColor: "#68bddd", borderRadius: 6 },
                  { label: "Sortants", data: sortantsData, backgroundColor: "#1b2b6b", borderRadius: 6 }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  datalabels: {
                    display: true,
                    color: "#000",
                    font: { weight: "bold", size: 11 },
                    formatter: val => val > 0 ? val : "",
                    anchor: "end",
                    align: "top",
                    offset: -2
                  },
                  legend: { position: "top" },
                  tooltip: { mode: "index", intersect: false }
                },
                scales: {
                  x: { grid: { display: false } },
                  y: {
                    beginAtZero: true,
                    grid: { drawBorder: false },
                    ticks: { precision: 0 }
                  }
                }
              }}
              plugins={[ChartDataLabels]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
