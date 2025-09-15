"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { AiOutlineFilter, AiOutlinePlus, AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
import { FaExpand, FaSave } from "react-icons/fa";

// Enregistrement des composants Chart.js
ChartJS.register(
  BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend, ChartDataLabels
);

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
  const week = getWeekNumber(d);
  return `${day}/${month}${week ? ` (S${week})` : ''}`;
}

const getWeekNumber = (date) => {
  if (!date || isNaN(date.getTime())) return null;
  try {
    const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tempDate.getUTCDay() || 7;
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
  } catch (e) {
    console.error("Error calculating week number:", e);
    return null;
  }
};

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

// =========================================
// Fonctions API
// =========================================

const loadDataFromBackend = async () => {
  try {
    const response = await fetch("https://api.606510.xyz/dashboard/api/backlog-j/data/");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors du chargement:', error);
    return [];
  }
};

const createEntry = async (entryData) => {
  try {
    const response = await fetch("https://api.606510.xyz/dashboard/api/backlog-j/create/", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken()
      },
      body: JSON.stringify(entryData)
    });
    
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Erreur lors de la création');
    }
    return result;
  } catch (error) {
    console.error('Erreur création:', error);
    throw error;
  }
};

const updateEntry = async (entryId, entryData) => {
  try {
    const response = await fetch(`https://api.606510.xyz/dashboard/api/backlog-j/update/${entryId}/`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken()
      },
      body: JSON.stringify(entryData)
    });
    
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Erreur lors de la modification');
    }
    return result;
  } catch (error) {
    console.error('Erreur modification:', error);
    throw error;
  }
};

const deleteEntry = async (entryId) => {
  try {
    const response = await fetch(`https://api.606510.xyz/dashboard/api/backlog-j/delete/${entryId}/`, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': getCsrfToken()
      }
    });
    
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Erreur lors de la suppression');
    }
    return result;
  } catch (error) {
    console.error('Erreur suppression:', error);
    throw error;
  }
};

// Fonction utilitaire pour récupérer le token CSRF
const getCsrfToken = () => {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue || '';
};

// =========================================
// Composant Backlog J Simplifié
// =========================================

export default function BacklogJ({
  id = "Backlog J",
  chartTitle = "Backlog J - Suivi Personnel",
  defaultNumDays = 10
}) {
  // Références
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);

  // États locaux
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDates, setSelectedDates] = useState([null, null]);
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  
  // États pour la saisie de données
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    date: getLocalDateString(new Date()),
    value: ''
  });
  const [saving, setSaving] = useState(false);

  // =========================================
  // Fonction pour recharger les données
  // =========================================

  const reloadData = async () => {
    try {
      setLoading(true);
      const loadedData = await loadDataFromBackend();
      setData(loadedData);
      
      // Après le rechargement, mettre à jour la plage de dates pour inclure les nouvelles données
      if (loadedData.length > 0) {
        const allDates = loadedData.map(entry => entry.date).filter(Boolean).sort();
        const lastDates = allDates.slice(-defaultNumDays);
        
        if (lastDates.length > 0) {
          const startDate = parseLocalDate(lastDates[0]);
          const endDate = parseLocalDate(lastDates[lastDates.length - 1]);
          
          // Étendre la plage pour inclure aujourd'hui si nécessaire
          const today = new Date();
          const todayStr = getLocalDateString(today);
          const finalEndDate = endDate && todayStr && todayStr > lastDates[lastDates.length - 1] ? today : endDate;
          
          if (startDate && finalEndDate) {
            setSelectedDates([startDate, finalEndDate]);
            setSelectedValues(getAllWorkingDaysBetween(startDate, finalEndDate));
          }
        }
      }
      
    } catch (error) {
      console.error('Erreur lors du rechargement:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // Gestionnaires d'événements
  // =========================================

  const handleAddEntry = () => {
    setEditingEntry(null);
    setFormData({
      date: getLocalDateString(new Date()),
      value: ''
    });
    setShowAddForm(true);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      value: entry.value.toString()
    });
    setShowAddForm(true);
  };

  const handleDeleteEntry = async (entryId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) {
      try {
        setSaving(true);
        await deleteEntry(entryId);
        await reloadData();
        alert('Entrée supprimée avec succès');
      } catch (error) {
        alert(error.message || 'Erreur lors de la suppression');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSaveEntry = async () => {
    if (!formData.date || !formData.value) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const numericValue = parseFloat(formData.value);
    if (isNaN(numericValue)) {
      alert('Veuillez entrer une valeur numérique valide.');
      return;
    }

    try {
      setSaving(true);
      
      const entryData = {
        date: formData.date,
        value: numericValue
      };

      if (editingEntry) {
        await updateEntry(editingEntry.id, entryData);
        alert('Entrée modifiée avec succès');
      } else {
        await createEntry(entryData);
        alert('Entrée créée avec succès');
      }

      await reloadData();
      setShowAddForm(false);
      setEditingEntry(null);
      
    } catch (error) {
      alert(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setShowAddForm(false);
    setEditingEntry(null);
    setFormData({
      date: getLocalDateString(new Date()),
      value: ''
    });
  };

  // Gestionnaire de changement de plage de dates
  const handleDayRangeChange = (dates) => {
    const [start, end] = dates;
    setSelectedDates(dates);
    if (start && end) {
      const dayList = getAllWorkingDaysBetween(start, end);
      setSelectedValues(dayList);
    } else {
      setSelectedValues([]);
    }
  };

  // =========================================
  // Chargement initial
  // =========================================

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        const loadedData = await loadDataFromBackend();
        setData(loadedData);

        // Configuration par défaut pour les derniers jours
        if (loadedData.length > 0) {
          const allDates = loadedData.map(entry => entry.date).filter(Boolean).sort();
          const lastDates = allDates.slice(-defaultNumDays);
          
          if (lastDates.length > 0) {
            const startDate = parseLocalDate(lastDates[0]);
            const endDate = parseLocalDate(lastDates[lastDates.length - 1]);
            
            // Inclure aujourd'hui dans la plage si nécessaire
            const today = new Date();
            const todayStr = getLocalDateString(today);
            const finalEndDate = endDate && todayStr && todayStr > lastDates[lastDates.length - 1] ? today : endDate;
            
            if (startDate && finalEndDate) {
              setSelectedDates([startDate, finalEndDate]);
              setSelectedValues(getAllWorkingDaysBetween(startDate, finalEndDate));
            }
          }
        } else {
          // Si pas de données, afficher les 7 derniers jours ouvrables
          const today = new Date();
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 10);
          
          setSelectedDates([sevenDaysAgo, today]);
          setSelectedValues(getAllWorkingDaysBetween(sevenDaysAgo, today));
        }

      } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        alert('Erreur lors du chargement initial des données');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [defaultNumDays]);

  // =========================================
  // Préparation des données pour le graphique
  // =========================================

  const sortedSelectedValues = useMemo(() => {
    if (!Array.isArray(selectedValues)) return [];
    try {
      return selectedValues
        .filter(val => typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}$/))
        .slice()
        .sort();
    } catch (error) {
      console.error("Error sorting selected values:", error, selectedValues);
      return [];
    }
  }, [selectedValues]);

  const labels = useMemo(() => sortedSelectedValues.map(val => {
    try {
      return formatDayLabel(val);
    } catch (e) {
      console.error("Label generation error", e);
      return String(val);
    }
  }), [sortedSelectedValues]);

  // Calcul des données pour le graphique
  const chartData = useMemo(() => {
    const counts = {};

    // Initialiser les compteurs
    sortedSelectedValues.forEach(val => {
      counts[val] = 0;
    });

    // Compter les valeurs par jour
    data.forEach(entry => {
      if (sortedSelectedValues.includes(entry.date)) {
        counts[entry.date] += entry.value;
      }
    });

    const finalData = sortedSelectedValues.map(val => counts[val] || 0);

    return {
      labels,
      datasets: [{
        label: "Backlog",
        data: finalData,
        backgroundColor: "#3b82f6",
        borderRadius: 6
      }]
    };
  }, [data, sortedSelectedValues, labels]);

  // Options du graphique
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: true,
        color: "#000",
        font: { weight: "bold", size: 10 },
        formatter: val => val > 0 ? val : "",
        anchor: "end",
        align: "top",
        offset: -3
      },
      legend: {
        position: "top",
        align: "center",
        labels: { padding: 15, boxWidth: 12, font: { size: 12 } }
      },
      tooltip: {
        mode: "index", intersect: false, padding: 10,
        titleFont: { size: 13 }, bodyFont: { size: 12 }
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
          text: 'Jours',
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
          text: 'Valeurs', 
          font: { size: 12 }, 
          padding: { bottom: 10 } 
        },
        grace: '5%'
      }
    },
    layout: { padding: { top: 5, right: 20, bottom: 10, left: 10 } },
    animation: { duration: 300 },
  }), []);

  const showData = chartData.datasets[0].data.some(d => d > 0);

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
              {sortedSelectedValues.length} jour(s) sélectionné(s)
            </p>
          </div>

          <div className="no-export flex gap-2">
            <button
              className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition disabled:opacity-50"
              onClick={handleAddEntry}
              disabled={saving}
              title="Ajouter une entrée"
            >
              <AiOutlinePlus size={20} />
            </button>

            <button
              className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition text-gray-600 hover:text-gray-800"
              onClick={() => setIsOpen(!isOpen)}
              data-filter-toggle="true"
              title="Filtrer par plage de dates"
            >
              <AiOutlineFilter size={20} />
            </button>

            <button
              className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition text-gray-600 hover:text-gray-800"
              onClick={() => setModalIsOpen(true)}
              title="Agrandir"
            >
              <FaExpand size={18} />
            </button>
          </div>

          {/* Panneau de filtre - Plage de dates */}
          {isOpen && (
            <div ref={filterPanelRef} className="no-export absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50 border border-gray-200">
              <h4 className="font-semibold text-gray-600 text-sm mb-3">Sélectionner la plage de dates :</h4>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">Date de début</label>
                <input
                  type="date"
                  value={selectedDates[0] ? getLocalDateString(selectedDates[0]) : ''}
                  onChange={(e) => {
                    const newStartDate = e.target.value ? parseLocalDate(e.target.value) : null;
                    handleDayRangeChange([newStartDate, selectedDates[1]]);
                  }}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">Date de fin</label>
                <input
                  type="date"
                  value={selectedDates[1] ? getLocalDateString(selectedDates[1]) : ''}
                  onChange={(e) => {
                    const newEndDate = e.target.value ? parseLocalDate(e.target.value) : null;
                    handleDayRangeChange([selectedDates[0], newEndDate]);
                  }}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const today = new Date();
                    const sevenDaysAgo = new Date(today);
                    sevenDaysAgo.setDate(today.getDate() - 7);
                    handleDayRangeChange([sevenDaysAgo, today]);
                  }}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  7 jours
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const thirtyDaysAgo = new Date(today);
                    thirtyDaysAgo.setDate(today.getDate() - 30);
                    handleDayRangeChange([thirtyDaysAgo, today]);
                  }}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  30 jours
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Formulaire d'ajout/modification */}
        {showAddForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-semibold text-gray-700 mb-3">
              {editingEntry ? 'Modifier l\'entrée' : 'Ajouter une entrée'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Valeur *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 15"
                  disabled={saving}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSaveEntry}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              >
                <FaSave size={14} />
                {saving ? 'Sauvegarde...' : (editingEntry ? 'Modifier' : 'Ajouter')}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Liste des entrées récentes */}
        {data.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Entrées récentes</h4>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
              {data.slice(-5).reverse().map((entry) => (
                <div key={entry.id} className="flex justify-between items-center p-2 border-b last:border-b-0 hover:bg-gray-50">
                  <div className="flex-1">
                    <span className="text-sm font-medium">{formatDayLabel(entry.date)}</span>
                    <span className="ml-2 text-sm text-blue-600 font-semibold">{entry.value}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditEntry(entry)}
                      disabled={saving}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50"
                      title="Modifier"
                    >
                      <AiOutlineEdit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      disabled={saving}
                      className="p-1 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"
                      title="Supprimer"
                    >
                      <AiOutlineDelete size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conteneur Graphique Principal */}
        <div className="flex-grow flex justify-center items-center h-[300px] w-full" ref={chartContainerRef}>
          {showData ? (
            <Bar data={chartData} options={chartOptions} plugins={[ChartDataLabels]} />
          ) : (
            <div className="text-center">
              <p className="text-gray-500 italic mb-2">Aucune donnée à afficher pour la sélection actuelle.</p>
              <button
                onClick={handleAddEntry}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              >
                Ajouter des données
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalIsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-11/12 md:w-4/5 lg:w-3/4 shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{chartTitle}</h3>
                <p className="text-sm text-gray-500 mt-1 min-h-[20px]">
                  {sortedSelectedValues.length} jour(s) sélectionné(s)
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
                <Bar
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
                <div className="text-center">
                  <p className="text-gray-500 italic mb-4">Aucune donnée à afficher.</p>
                  <button
                    onClick={() => {
                      setModalIsOpen(false);
                      handleAddEntry();
                    }}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Ajouter des données
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}