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
import fetchWithAuth from "@/utils/fetchWithAuth";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend, ChartDataLabels);

// Renvoie une chaîne "YYYY-MM-DD" basée sur l'heure locale
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Convertit une entrée (string ou Date) en un objet Date basé sur la date locale
function parseLocalDate(dateInput) {
  if (typeof dateInput === "string") {
    const [year, month, day] = dateInput.split("-").map(Number);
    return new Date(year, month - 1, day);
  } else if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  } else {
    return new Date(dateInput);
  }
}

// Formate la date pour l'affichage "Jour (Semaine x)"
function formatDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : parseLocalDate(dateInput);
  const day = d.getDate().toString().padStart(2, "0");
  const weekNum = getWeek(d, { locale: fr });
  return `${day} (Semaine ${weekNum})`;
}

export default function GroupedBarChart() {
  const id = "Rapport : Sortants/Entrants";
  const { selectedIds, toggleId } = useExport();

  // États liés aux données, vue et sélections
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("day"); // "day", "week", "month"
  const [selectedValues, setSelectedValues] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [allSelected, setAllSelected] = useState(false);

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  useEffect(() => {
    fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/fttb/data/")
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
        // Extraction des 23 derniers jours en ne considérant que la date locale
        const lastDays = [...new Set(json.map(t => t.date_derniere_maj.split("T")[0]))]
          .sort()
          .slice(-23);
        const years = [...new Set(json.map(t => new Date(t.date_derniere_maj).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        if (viewMode === "day") {
          setSelectedValues(lastDays);
          // Conversion en objet Date locale à partir de la chaîne "YYYY-MM-DD"
          setSelectedDates(lastDays.map(d => parseLocalDate(d)));
          if (lastDays.length > 0) {
            setCalendarMonth(parseLocalDate(lastDays[lastDays.length - 1]));
          }
        } else if (viewMode === "week") {
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

  // Pour la vue "day", mettre à jour selectedValues en fonction de selectedDates en heure locale
  useEffect(() => {
    if (viewMode === "day") {
      const formatted = selectedDates.map(d => getLocalDateString(d));
      setSelectedValues(formatted);
    }
  }, [selectedDates, viewMode]);

  // Recalcul de la sélection lors du changement de l'année ou du mode de vue (pour "week" et "month")
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

  // Pour la vue "day", extraire la date locale uniquement
  const availableDays = [...new Set(data.map(t => t.date_derniere_maj.split("T")[0]))].sort();
  const filteredByYear = viewMode === "day" ? data : data.filter(t => new Date(t.date_derniere_maj).getFullYear() === selectedYear);
  const availablePeriods =
    viewMode === "day"
      ? availableDays
      : viewMode === "week"
      ? [...new Set(filteredByYear.map(t => t.semaine))].sort((a, b) => a - b)
      : [...new Set(filteredByYear.map(t => new Date(t.date_derniere_maj).getMonth() + 1))].sort((a, b) => a - b);

  const allPeriodsSelected =
    availablePeriods.length > 0 && availablePeriods.every(period => selectedValues.includes(period));

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

  // Pour les entrants, comparer la date locale extraite
  const filteredEntrants = data.filter(t => {
    if (viewMode === "day") {
      return selectedValues.includes(t.date_derniere_maj.split("T")[0]);
    } else {
      if (new Date(t.date_derniere_maj).getFullYear() !== selectedYear) return false;
      if (viewMode === "week") return selectedValues.includes(t.semaine);
      if (viewMode === "month") return selectedValues.includes(new Date(t.date_derniere_maj).getMonth() + 1);
    }
    return false;
  });

  // Pour les sortants, comparer la date locale extraite
  const filteredSortants = data.filter(t => {
    if (!t.date_sortie) return false;
    if (viewMode === "day") {
      return selectedValues.includes(t.date_sortie.split("T")[0]);
    }
    return new Date(t.date_sortie).getFullYear() === selectedYear;
  });

  // Définition des labels selon le mode de vue
  let labels = [];
  if (viewMode === "day") {
    labels = selectedValues
      .map(val => String(val))
      .sort((a, b) => a.localeCompare(b))
      .map(d => formatDate(d));
  } else if (viewMode === "week") {
    labels = selectedValues.slice().sort((a, b) => a - b).map(w => `Semaine ${w}`);
  } else {
    labels = selectedValues.slice().sort((a, b) => a - b).map(m => monthNames[m - 1]);
  }

  // Tri conditionnel de selectedValues pour calculer les données
  const sortedSelectedValues =
    viewMode === "day"
      ? selectedValues.map(val => String(val)).sort((a, b) => a.localeCompare(b))
      : selectedValues.slice().sort((a, b) => a - b);

  // Calcul des données pour les entrants
  const entrantsData = sortedSelectedValues.map(val => {
    if (viewMode === "day") {
      return filteredEntrants.filter(t => t.date_derniere_maj.split("T")[0] === val).length;
    } else if (viewMode === "week") {
      return filteredEntrants.filter(t => t.semaine === val).length;
    } else {
      return filteredEntrants.filter(t => new Date(t.date_derniere_maj).getMonth() + 1 === val).length;
    }
  });

  // Calcul des données pour les sortants
  const sortantsData = sortedSelectedValues.map(val => {
    if (viewMode === "day") {
      return filteredSortants.filter(t => t.date_sortie.split("T")[0] === val).length;
    } else if (viewMode === "week") {
      return filteredSortants.filter(t => t.semaine_date_sortant === val).length;
    } else {
      return filteredSortants.filter(t => new Date(t.date_sortie).getMonth() + 1 === val).length;
    }
  });

  // Fonction pour normaliser les dates dans le même format
  const normalizeDateFormat = (date) => {
    return typeof date === 'string' ? date : getLocalDateString(date);
  };

  // Fonction pour vérifier si une date est disponible
  const isDateAvailable = (date) => {
    const dateStr = getLocalDateString(date);
    return availableDays.includes(dateStr);
  };

  // Gestion du clic sur une date en vue "jour"
  const handleDateChange = (date) => {
    const dateStr = getLocalDateString(date);
    
    // Vérifier si la date est dans les dates disponibles
    if (!availableDays.includes(dateStr)) return;
    
    // Mettre à jour les dates sélectionnées
    const dateIndex = selectedDates.findIndex(d => getLocalDateString(d) === dateStr);
    if (dateIndex >= 0) {
      // Désélectionner la date
      setSelectedDates(prev => [...prev.slice(0, dateIndex), ...prev.slice(dateIndex + 1)]);
    } else {
      // Sélectionner la date
      setSelectedDates(prev => [...prev, date]);
    }
  };

  // Gestion du clic sur une semaine (rendu réversible)
  const handleWeekClick = (_, weekNum) => {
    const currentMonth = calendarMonth;
    const weekDates = availableDays
      .map(d => parseLocalDate(d))
      .filter(d => getWeek(d, { locale: fr }) === weekNum);
    setSelectedDates(prev => {
      const weekDatesStr = weekDates.map(d => getLocalDateString(d));
      const allSelected = weekDatesStr.every(date => 
        prev.some(p => getLocalDateString(p) === date)
      );
      if (allSelected) {
        return prev.filter(p => !weekDatesStr.includes(getLocalDateString(p)));
      } else {
        const toAdd = weekDates.filter(d => 
          !prev.some(p => getLocalDateString(p) === getLocalDateString(d))
        );
        return [...prev, ...toAdd];
      }
    });
    setTimeout(() => {
      setCalendarMonth(currentMonth);
    }, 10);
  };

  // Gestion du clic pour sélectionner/désélectionner toutes les dates du mois (vue "jour")
  const handleMonthClick = () => {
    const month = calendarMonth.getMonth();
    const year = calendarMonth.getFullYear();
    const monthDates = availableDays
      .map(d => parseLocalDate(d))
      .filter(d => d.getMonth() === month && d.getFullYear() === year);
    setSelectedDates(prev => {
      const monthDatesStr = monthDates.map(d => getLocalDateString(d));
      const allSelected = monthDatesStr.every(date =>
        prev.some(p => getLocalDateString(p) === date)
      );
      if (allSelected) {
        return prev.filter(p => !monthDatesStr.includes(getLocalDateString(p)));
      } else {
        const toAdd = monthDates.filter(d =>
          !prev.some(p => getLocalDateString(p) === getLocalDateString(d))
        );
        return [...prev, ...toAdd];
      }
    });
  };

  // Render custom day contents
  const renderDayContents = (day, date) => {
    return <span>{day}</span>;
  };

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Bouton filtre */}
        <div className="absolute top-2 right-2 z-50">
          <button className="bg-gray-300 p-2 rounded-full" onClick={() => setIsOpen(!isOpen)}>
            <AiOutlineFilter size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Titre aligné à gauche */}
        <h3 className="text-xl font-semibold mb-4 text-gray-800 text-left">Tickets Entrants vs. Sortants</h3>

        {isOpen && (
          <div className="absolute right-0 top-12 mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
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
                {/* Bouton pour sélectionner/désélectionner toutes les dates du mois */}
                <button
                  onClick={handleMonthClick}
                  className="mb-2 w-full px-2 py-1 text-xs rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  Sélectionner/Désélectionner tout le mois
                </button>
                <DatePicker
                  selected={calendarMonth}
                  onChange={handleDateChange}
                  filterDate={isDateAvailable}
                  renderDayContents={renderDayContents}
                  highlightDates={selectedDates.map(date => new Date(date))}
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
                    onClick={handleSelectAll}
                    className={`text-xs px-2 py-1 rounded-md w-full ${allPeriodsSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
                  >
                    {allPeriodsSelected ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                </div>

                <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
                  {availablePeriods.map(val => (
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

        {/* Container du graphique */}
        <div className="flex-grow flex justify-center items-center w-full">
          <Bar
            style={{ width: "100%", height: "100%" }}
            data={{
              labels: labels,
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
                legend: { 
                  position: "top",
                  align: "center",
                  labels: {
                    padding: 20,
                    boxWidth: 12,
                    font: { size: 12 }
                  }
                },
                tooltip: { 
                  mode: "index", 
                  intersect: false,
                  padding: 10,
                  titleFont: { size: 14 },
                  bodyFont: { size: 13 }
                }
              },
              scales: {
                x: { 
                  grid: { display: false },
                  ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                    padding: 10,
                    font: { size: 11 }
                  }
                },
                y: {
                  beginAtZero: true,
                  grid: { drawBorder: false },
                  ticks: { precision: 0, padding: 10 }
                }
              },
              layout: {
                padding: { top: 20, right: 20, bottom: 30, left: 10 }
              }
            }}
            plugins={[ChartDataLabels]}
          />
        </div>
      </div>
    </div>
  );
}