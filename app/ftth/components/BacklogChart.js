"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  PointElement
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fr } from "date-fns/locale";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useGlobalFilter } from "@/app/components/GlobalFilterContext";
import Modal from "react-modal";
import CommentButton from "@/app/components/CommentButton";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

// =========================================
// Fonctions Utilitaires
// =========================================

function getLocalDateString(date) {
  if (!date || isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr) {
  if (typeof dateStr !== "string") return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
  }
  return date;
}

function formatDayLabel(dateStr) {
  if (typeof dateStr !== "string") return `Date invalide`;
  const d = parseLocalDate(dateStr);
  if (!d || isNaN(d.getTime())) return `Date invalide`;
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}`;
}

function getAllWorkingDaysBetween(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
  const daysArray = [];
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  const finalEndDate = new Date(endDate);
  finalEndDate.setHours(0, 0, 0, 0);

  while (currentDate <= finalEndDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateString = getLocalDateString(currentDate);
      if (dateString) {
          daysArray.push(dateString);
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return daysArray;
}

function getLastNWorkingDays(days, n = 15) {
  const filteredDays = days
    .map(dateStr => ({ str: dateStr, date: parseLocalDate(dateStr) }))
    .filter(item => item.date && item.date.getDay() !== 0 && item.date.getDay() !== 6)
    .sort((a, b) => b.date - a.date)
    .slice(0, n)
    .sort((a, b) => a.date - b.date)
    .map(item => item.str);
  return filteredDays;
}

ChartJS.register(
  LineElement, CategoryScale, LinearScale, Title, Tooltip, Legend, PointElement, ChartDataLabels
);

// =========================================
// Composant BacklogChart
// =========================================
export default function BacklogChart({
  apiUrl,
  id = "Évolution du Backlog",
  chartTitle = "Évolution du Backlog",
  dateEntryField = "date_derniere_maj",
  dateExitField = "date_sortie",
  defaultNumDays = 15,
  retardDays = 7, // Nouveau paramètre pour le seuil de retard
}) {
  if (!apiUrl) {
    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
           <h3 className="text-lg font-semibold text-black">{chartTitle}</h3>
           <p className="text-red-500 text-sm mt-2">Erreur : L'URL de l'API est requise.</p>
        </div>
      </div>
    );
  }

  // Références
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);

  // États locaux
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState([null, null]);
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
  const [annotations, setAnnotations] = useState([]);

  // Contexte Filtre Global
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // --- Calcul du backlog global (une seule fois pour toutes les données) ---
  const globalBacklogData = useMemo(() => {
    if (!data.length) return { backlogByDate: {}, backlogRetardByDate: {} };

    // 1. Créer tous les événements
    const events = [];
    data.forEach(ticket => {
      const entryDateStr = ticket[dateEntryField]?.split("T")[0];
      const exitDateStr = ticket[dateExitField]?.split("T")[0];
      
      if (entryDateStr) {
        events.push({
          date: entryDateStr,
          type: 'ENTRY',
          ticketId: ticket.id_ticket || ticket.id,
          ticket: ticket
        });
      }

      if (exitDateStr) {
        events.push({
          date: exitDateStr,
          type: 'EXIT',
          ticketId: ticket.id_ticket || ticket.id,
          ticket: ticket
        });
      }
    });

    // 2. Trier tous les événements chronologiquement
    events.sort((a, b) => a.date.localeCompare(b.date));

    // 3. Calculer le backlog cumulatif et le backlog en retard pour chaque date
    const backlogByDate = {};
    const backlogRetardByDate = {};
    const activeTickets = new Map(); // tickets actuellement dans le backlog
    
    events.forEach(event => {
      const eventDate = new Date(event.date);
      
      // Si on n'a pas encore de valeur pour cette date, initialiser avec la valeur précédente
      if (!backlogByDate.hasOwnProperty(event.date)) {
        const previousDates = Object.keys(backlogByDate).sort();
        const lastValue = previousDates.length > 0 ? backlogByDate[previousDates[previousDates.length - 1]] : 0;
        const lastRetardValue = previousDates.length > 0 ? backlogRetardByDate[previousDates[previousDates.length - 1]] : 0;
        
        backlogByDate[event.date] = lastValue;
        backlogRetardByDate[event.date] = lastRetardValue;
      }

      // Appliquer l'événement
      if (event.type === 'ENTRY') {
        activeTickets.set(event.ticketId, {
          ticket: event.ticket,
          entryDate: eventDate
        });
      } else if (event.type === 'EXIT') {
        activeTickets.delete(event.ticketId);
      }
      
      // Recalculer le backlog total et en retard
      const totalBacklog = activeTickets.size;
      
      // Calculer combien de tickets sont en retard (>= retardDays jours dans le backlog)
      let ticketsEnRetard = 0;
      activeTickets.forEach(({ entryDate }) => {
        const delayInDays = Math.ceil((eventDate - entryDate) / (1000 * 60 * 60 * 24));
        if (delayInDays >= retardDays) {
          ticketsEnRetard++;
        }
      });
      
      // Sécurité : empêcher backlog négatif
      backlogByDate[event.date] = Math.max(0, totalBacklog);
      backlogRetardByDate[event.date] = Math.max(0, ticketsEnRetard);
    });

    return { backlogByDate, backlogRetardByDate };
  }, [data, dateEntryField, dateExitField, retardDays]);

  // --- Fonction pour appliquer le filtre global ---
  const applyGlobalFilter = useCallback(() => {
      if (!globalStartDate || !globalEndDate || !data || data.length === 0) return;

      const dayList = getAllWorkingDaysBetween(globalStartDate, globalEndDate);
      setSelectedDates([globalStartDate, globalEndDate]);
      setSelectedValues(dayList);
      setHasGlobalFilter(true);
      globalFilterApplied.current = true;

  }, [globalStartDate, globalEndDate, data]);

  // =========================================
  // UseEffects
  // =========================================

  // Clics extérieurs au panneau de filtre
  useEffect(() => {
    function handleClickOutside(event) {
      if (isOpen && filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest('button[data-filter-toggle]')) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Chargement initial des données
  useEffect(() => {
    let isMounted = true;
    async function fetchDataInternal() {
        if (!isMounted) return;
        setLoading(true);
        globalFilterApplied.current = false;

        try {
            const response = await fetchWithAuth(apiUrl);
            const result = await response.json();
            if (!isMounted) return;

            setData(result);

            // --- Logique d'initialisation ---
            let applyGlobalOnLoad = false;
            let performDefaultSetup = !initializationCompleted.current;

            // Vérifier si le filtre global doit être appliqué au chargement
            if (performDefaultSetup && globalStartDate && globalEndDate) {
                applyGlobalOnLoad = true;
                performDefaultSetup = false;
            }

            // Appliquer la configuration par défaut lors de la première initialisation
            if (performDefaultSetup) {
                // Obtenir toutes les dates disponibles dans les données
                const allDatesSet = new Set();
                result.forEach(ticket => {
                    const entryDate = ticket[dateEntryField]?.split("T")[0];
                    const exitDate = ticket[dateExitField]?.split("T")[0];
                    if (entryDate) allDatesSet.add(entryDate);
                    if (exitDate) allDatesSet.add(exitDate);
                });

                const allDays = Array.from(allDatesSet).sort();
                const lastNDays = getLastNWorkingDays(allDays, defaultNumDays);
                
                if (lastNDays.length > 0) {
                    const startDate = parseLocalDate(lastNDays[0]);
                    const endDate = parseLocalDate(lastNDays[lastNDays.length - 1]);
                    setSelectedDates([startDate, endDate]);
                    setSelectedValues(lastNDays);
                } else {
                    setSelectedDates([null, null]);
                    setSelectedValues([]);
                }
                
                initializationCompleted.current = true;
            }
            setLoading(false);
        } catch (error) {
            console.error("Erreur lors du chargement des données:", error);
            if (isMounted) { setData([]); setLoading(false); }
        }
    }
    fetchDataInternal();
    return () => { isMounted = false; };
  }, [apiUrl, dateEntryField, dateExitField, defaultNumDays]);

   // Application du filtre global si changé APRÈS l'init ou si données chargées
   useEffect(() => {
       let isMounted = true;
       if (initializationCompleted.current && data.length > 0 && globalStartDate && globalEndDate) {
           if (isMounted && !globalFilterApplied.current) {
               applyGlobalFilter();
           }
       }
       const timer = setTimeout(() => {
           if (isMounted && globalFilterApplied.current) {
               globalFilterApplied.current = false;
           }
       }, 150);

       return () => { isMounted = false; clearTimeout(timer);};
   }, [globalStartDate, globalEndDate, globalModifiedAt, data, applyGlobalFilter]);

  // =========================================
  // Gestionnaires d'événements (Filtres)
  // =========================================

  const handleDayRangeChange = (dates) => {
    const [start, end] = dates;
    setSelectedDates(dates);
    if (start && end) {
      const dayList = getAllWorkingDaysBetween(start, end);
      setSelectedValues(dayList);
      setHasGlobalFilter(false);
    } else {
       setSelectedValues([]);
       setHasGlobalFilter(false);
    }
  };

  // =========================================
  // Calcul des données pour le graphique
  // =========================================

  // Extraction des valeurs de backlog pour les jours sélectionnés
  const backlogData = useMemo(() => {
    if (!selectedValues.length || !globalBacklogData.backlogByDate) return [];

    return selectedValues.map(dateStr => {
      // Si on a une valeur exacte pour cette date, l'utiliser
      if (globalBacklogData.backlogByDate.hasOwnProperty(dateStr)) {
        const value = globalBacklogData.backlogByDate[dateStr];
        return typeof value === 'number' ? value : 0;
      }

      // Sinon, trouver la dernière valeur connue avant cette date
      const allDates = Object.keys(globalBacklogData.backlogByDate).sort();
      let lastKnownValue = 0;
      
      for (let i = allDates.length - 1; i >= 0; i--) {
        if (allDates[i] < dateStr) {
          const value = globalBacklogData.backlogByDate[allDates[i]];
          lastKnownValue = typeof value === 'number' ? value : 0;
          break;
        }
      }
      
      return lastKnownValue;
    });
  }, [selectedValues, globalBacklogData]);

  // Extraction des valeurs de backlog en retard pour les jours sélectionnés
  const backlogRetardData = useMemo(() => {
    if (!selectedValues.length || !globalBacklogData.backlogRetardByDate) return [];

    return selectedValues.map(dateStr => {
      // Si on a une valeur exacte pour cette date, l'utiliser
      if (globalBacklogData.backlogRetardByDate.hasOwnProperty(dateStr)) {
        const value = globalBacklogData.backlogRetardByDate[dateStr];
        return typeof value === 'number' ? value : 0;
      }

      // Sinon, trouver la dernière valeur connue avant cette date
      const allDates = Object.keys(globalBacklogData.backlogRetardByDate).sort();
      let lastKnownValue = 0;
      
      for (let i = allDates.length - 1; i >= 0; i--) {
        if (allDates[i] < dateStr) {
          const value = globalBacklogData.backlogRetardByDate[allDates[i]];
          lastKnownValue = typeof value === 'number' ? value : 0;
          break;
        }
      }
      
      return lastKnownValue;
    });
  }, [selectedValues, globalBacklogData]);

  // Calcul des moyennes pour la légende
  const backlogMoyenne = useMemo(() => {
    if (!backlogData.length) return 0;
    const sum = backlogData.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / backlogData.length * 10) / 10; // Arrondi à 1 décimale
  }, [backlogData]);

  const backlogRetardMoyenne = useMemo(() => {
    if (!backlogRetardData.length) return 0;
    const sum = backlogRetardData.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / backlogRetardData.length * 10) / 10; // Arrondi à 1 décimale
  }, [backlogRetardData]);
  const labels = useMemo(() => 
    selectedValues.map(dateStr => formatDayLabel(dateStr)), 
    [selectedValues]
  );

  // Structure des données pour ChartJS avec deux datasets
  const chartData = {
    labels,
    datasets: [
      {
        label: `Tickets dans le backlog (moy: ${backlogMoyenne})`,
        data: backlogData,
        backgroundColor: "rgba(104, 189, 221, 0.2)",
        borderColor: "#68bddd",
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#1b2b6b",
        pointBorderColor: "#68bddd",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      },
      {
        label: `Tickets +${retardDays} jours (moy: ${backlogRetardMoyenne})`,
        data: backlogRetardData,
        backgroundColor: "rgba(255, 99, 132, 0.1)",
        borderColor: "#ff6384",
        borderWidth: 3,
        fill: false,
        tension: 0.3,
        pointBackgroundColor: "#dc2626",
        pointBorderColor: "#ff6384",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  // Options du graphique
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: true,
        color: function(context) {
          // Couleur rouge pour le dataset des retards, bleu pour le total
          return context.datasetIndex === 1 ? "#dc2626" : "#1b2b6b";
        },
        font: { weight: "bold", size: 10 },
        formatter: function(value, context) {
          // Retourner simplement la valeur
          return value;
        },
        anchor: function(context) {
          return context.datasetIndex === 1 ? "center" : "end";
        },
        align: function(context) {
          return context.datasetIndex === 1 ? "bottom" : "top";
        },
        offset: function(context) {
          return context.datasetIndex === 1 ? -10 : 5;
        },
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: function(context) {
          return context.datasetIndex === 1 ? "#dc2626" : "#1b2b6b";
        },
        borderWidth: 1,
        borderRadius: 2,
        padding: 1
      },
      legend: {
        position: "top",
        align: "center",
        labels: { padding: 15, boxWidth: 12, font: { size: 12 } }
      },
      tooltip: {
        mode: "index", 
        intersect: false, 
        padding: 10,
        titleFont: { size: 13 }, 
        bodyFont: { size: 12 },
        callbacks: {
          label: function(context) {
            // Vérifier que context.parsed existe
            if (!context.parsed || typeof context.parsed.y === 'undefined') {
              return `${context.dataset.label}: 0 tickets`;
            }
            return `${context.dataset.label}: ${context.parsed.y} tickets`;
          }
        }
      },
      title: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 45, 
          minRotation: 45,
          padding: 10, 
          font: { size: 11 }
        },
        title: {
             display: true,
             text: 'Jour',
             font: { size: 12 }, 
             padding: { top: 10 }
        }
      },
      y: {
        beginAtZero: true,
        grid: { drawBorder: false },
        ticks: { precision: 0, padding: 10 },
        title: { 
          display: true, 
          text: 'Nombre de Tickets dans le Backlog', 
          font: { size: 12 }, 
          padding: { bottom: 10 }
        },
        grace: '5%'
      }
    },
    layout: { padding: { top: 15, right: 20, bottom: 10, left: 10 } },
    animation: { duration: 300 },
  }), [retardDays]);

  // Texte descriptif de la période sélectionnée
  const getPeriodLabelText = () => {
    if (selectedDates[0] && selectedDates[1]) {
      const startStr = getLocalDateString(selectedDates[0]);
      const endStr = getLocalDateString(selectedDates[1]);
      return `Du ${startStr} au ${endStr}`;
    } else { 
      return "Aucun jour sélectionné"; 
    }
  };
  
  const periodeLabelText = getPeriodLabelText();
  const showData = backlogData.length > 0 && backlogData.some(d => d >= 0);

  // =========================================
  // Rendu JSX
  // =========================================
  if (loading) {
     return ( 
       <div className="visualisation relative" data-id={id}>
         <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-[450px] flex justify-center items-center">
           <p className="text-center text-gray-500">Chargement des données...</p>
         </div>
       </div> 
     );
  }

return (
  <div className="visualisation relative" data-id={id}>
    <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 relative">
        <div>
          <h3 className="no-export text-lg font-semibold text-gray-800">{chartTitle}</h3>
          <p className="text-sm text-gray-500 min-h-[20px]">
            {periodeLabelText}
          </p>
        </div>

        <div className="no-export flex gap-2">
          <button
            className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition text-gray-600 hover:text-gray-800"
            onClick={() => setIsOpen(!isOpen)}
            data-filter-toggle="true"
            title="Filtrer"
          >
            <AiOutlineFilter size={20} />
          </button>

          <CommentButton
            containerRef={chartContainerRef}
            comments={annotations}
            onAddComment={(c) => setAnnotations([...annotations, c])}
            onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))}
            onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))}
          />

          <button
            className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition text-gray-600 hover:text-gray-800"
            onClick={() => setModalIsOpen(true)}
            title="Agrandir"
          >
            <FaExpand size={18} />
          </button>
        </div>

        {/* Panneau de filtre */}
        {isOpen && (
          <div ref={filterPanelRef} className="no-export absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50 border border-gray-200">
            <h4 className="font-semibold text-gray-600 text-sm mb-3">Filtrer par période :</h4>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Plage de dates :</label>
              <DatePicker
                selected={selectedDates[0]}
                onChange={handleDayRangeChange}
                startDate={selectedDates[0]}
                endDate={selectedDates[1]}
                selectsRange
                dateFormat="dd/MM/yyyy"
                locale={fr}
                inline
                filterDate={date => {
                  const day = date.getDay();
                  return day !== 0 && day !== 6;
                }}
                calendarClassName="text-sm"
                dayClassName={() => "text-xs"}
                wrapperClassName="w-full"
                popperPlacement="bottom-end"
                maxDate={new Date()}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
            </div>
          </div>
        )}
      </div>

      {/* Conteneur Graphique Principal */}
      <div className="flex-grow flex justify-center items-center h-[350px] w-full" ref={chartContainerRef}>
        {showData ? (
          <Line data={chartData} options={chartOptions} plugins={[ChartDataLabels]} />
        ) : (
          <p className="text-gray-500 italic">Aucune donnée à afficher pour la sélection actuelle.</p>
        )}
      </div>
    </div>

    {/* Modal */}
    <Modal
      isOpen={modalIsOpen}
      onRequestClose={() => setModalIsOpen(false)}
      className="flex items-center justify-center fixed inset-0 z-50"
      overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      contentLabel={`Modal ${chartTitle}`}
    >
      <div className="bg-white rounded-lg p-6 w-11/12 md:w-4/5 lg:w-3/4 shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{chartTitle}</h3>
            <p className="text-sm text-gray-500 mt-1 min-h-[20px]">
              {periodeLabelText}
            </p>
          </div>
          <button
            onClick={() => setModalIsOpen(false)}
            className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-100 transition-colors"
            title="Fermer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative flex-grow min-h-[400px] md:min-h-[500px] flex items-center justify-center" ref={modalChartContainerRef}>
          {showData ? (
            <Line
              data={chartData}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  datalabels: {
                    ...chartOptions.plugins.datalabels,
                    font: { size: 11 }
                  }
                }
              }}
              plugins={[ChartDataLabels]}
            />
          ) : (
            <p className="text-gray-500 italic">Aucune donnée à afficher.</p>
          )}
          <CommentButton
            containerRef={modalChartContainerRef}
            hideButton={true}
            comments={annotations}
            onAddComment={(c) => setAnnotations([...annotations, c])}
            onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))}
            onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))}
          />
        </div>
      </div>
    </Modal>
  </div>
);
}