"use client";

import { useState, useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand } from "react-icons/fa";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useGlobalFilter } from "./GlobalFilterContext";
import Modal from "react-modal";
// ---- NOUVEAU : Import CommentButton ----
import CommentButton from "./CommentButton";

// Configurer le Modal pour l'accessibilité
if (typeof window !== "undefined") Modal.setAppElement(document.body);

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

export default function LineChartRates({
  apiUrl,
  id = "Taux de Migration et Creation",
  title = "Taux de Migration et Creation",
  perimetreField = "perimetre",
  typeField = "type_modop",
  weekField = "semaine",
  dateField = "date",
  // Valeurs pour diviser les sommes par périmètre (à configurer dans page.js)
  divisors = {
    "XDSL": 100,
    "FTTB": 62,
    "EARF-T": 74,
    // Valeur par défaut pour les périmètres non spécifiés
    "default": 100
  },
  migrationType = "Migration",
  creationType = "Création",
  // Couleurs des lignes
  lineColors = {
    migration: "#1E88E5", // Bleu
    creation: "#283593"   // Bleu foncé
  }
}) {
  if (!apiUrl) {
    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <h3 className="text-lg font-semibold text-black">{title}</h3>
          <p className="text-red-500 text-sm mt-2">Erreur : L'URL de l'API est requise.</p>
        </div>
      </div>
    );
  }

  // Références
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);
  const filterPanelRef = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // ---- NOUVEAU : État pour les annotations ----
  const [annotations, setAnnotations] = useState([]);
  
  // États pour les filtres
  const [selectedPerimetres, setSelectedPerimetres] = useState([]);
  const [availablePerimetres, setAvailablePerimetres] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  
  const { globalStartDate, globalEndDate } = useGlobalFilter();

  // Effet pour gérer les clics extérieurs
  useEffect(() => {
    function handleClickOutside(event) {
      if (isFilterOpen &&
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target) &&
        !event.target.closest('button[data-filter-toggle]')) {
        setIsFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterOpen]);

  // Chargement initial des données
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Construction de l'URL avec filtres de date
        let url = apiUrl;
        if (globalStartDate && globalEndDate) {
          const startFormatted = globalStartDate.toISOString().split("T")[0];
          const endFormatted = globalEndDate.toISOString().split("T")[0];
          url = `${apiUrl}?start_date=${startFormatted}&end_date=${endFormatted}`;
        }
        
        const response = await fetchWithAuth(url);
        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (!Array.isArray(result)) {
          throw new Error("Format de données invalide. Un tableau était attendu.");
        }
        
        setData(result);
        
        // Extraire les périmètres, types et semaines disponibles
        const perimetres = [...new Set(result.map(doc => doc[perimetreField]))].filter(Boolean).sort();
        const types = [...new Set(result.map(doc => doc[typeField]))].filter(Boolean);
        const weeks = [...new Set(result.map(doc => doc[weekField]))].filter(Boolean);
        
        // Trier les semaines (S1, S2, etc.)
        weeks.sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, ''));
          const numB = parseInt(b.replace(/\D/g, ''));
          return numA - numB;
        });
        
        setAvailablePerimetres(perimetres);
        setAvailableTypes(types);
        setAvailableWeeks(weeks);
        
        // Par défaut, tout sélectionner
        if (selectedPerimetres.length === 0) {
          setSelectedPerimetres(perimetres);
        }
        
        if (selectedTypes.length === 0) {
          setSelectedTypes(types);
        }
        
        if (selectedWeeks.length === 0) {
          setSelectedWeeks(weeks);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setError(`Erreur: ${error.message}`);
        setLoading(false);
      }
    }
    
    fetchData();
  }, [apiUrl, perimetreField, typeField, weekField, dateField, globalStartDate, globalEndDate]);

  // Préparation des données pour le graphique
  const prepareChartData = () => {
    if (!data || data.length === 0) {
      return { 
        labels: [], 
        datasets: [] 
      };
    }
    
    // Appliquer les filtres
    let filteredData = data;
    
    // Filtrer par semaine si des semaines sont sélectionnées
    if (selectedWeeks.length > 0) {
      filteredData = filteredData.filter(doc => selectedWeeks.includes(doc[weekField]));
    }
    
    // Filtrer par type si nécessaire
    if (selectedTypes.length > 0) {
      filteredData = filteredData.filter(doc => selectedTypes.includes(doc[typeField]));
    }
    
    // Filtrer par périmètre
    if (selectedPerimetres.length > 0) {
      filteredData = filteredData.filter(doc => selectedPerimetres.includes(doc[perimetreField]));
    } else {
      return { 
        labels: [], 
        datasets: [] 
      };
    }
    
    // Calculer les comptes par périmètre et type
    const countsByPerimetre = {};
    const totalCountsByPerimetre = {};

    // Initialiser la structure
    selectedPerimetres.forEach(perimetre => {
      countsByPerimetre[perimetre] = {
        [migrationType]: 0,
        [creationType]: 0
      };
      totalCountsByPerimetre[perimetre] = 0;
    });
    
    // Compter les documents
    filteredData.forEach(doc => {
      const perimetre = doc[perimetreField];
      const type = doc[typeField];
      
      if (selectedPerimetres.includes(perimetre)) {

        totalCountsByPerimetre[perimetre]++;
        if (type === creationType) {
          countsByPerimetre[perimetre][creationType]++;
        }
      }
    });
    
  // Calculer les taux en divisant par les valeurs fournies
  const migrationRates = selectedPerimetres.map(perimetre => {
    const divisor = divisors[perimetre] || divisors["default"];
    // Utilisation du total par périmètre sans filtrer par type
    return (totalCountsByPerimetre[perimetre] / divisor) * 100;
  });
  
  const creationRates = selectedPerimetres.map(perimetre => {
    // Pour le taux de création, on divise par le total des documents du périmètre
    // Si le total est 0, on évite une division par zéro en renvoyant 0
    return totalCountsByPerimetre[perimetre] === 0 
      ? 0 
      : (countsByPerimetre[perimetre][creationType] / totalCountsByPerimetre[perimetre]) * 100;
  });
    
  // Formater les taux avec une décimale
  const formattedMigrationRates = migrationRates.map(rate => parseFloat(rate.toFixed(2)));
  const formattedCreationRates = creationRates.map(rate => parseFloat(rate.toFixed(2)));

  return {
    labels: selectedPerimetres,
    datasets: [
      {
        label: `Somme de Taux de ${migrationType}`,
        data: formattedMigrationRates,
        borderColor: lineColors.migration,
        backgroundColor: lineColors.migration,
        pointBackgroundColor: lineColors.migration,
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: lineColors.migration,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        borderWidth: 3
      },
      {
        label: `Somme de Taux de ${creationType}`,
        data: formattedCreationRates,
        borderColor: lineColors.creation,
        backgroundColor: lineColors.creation,
        pointBackgroundColor: lineColors.creation,
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: lineColors.creation,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        borderWidth: 3
      }
    ]
  };
};

  const chartData = prepareChartData();

  // Options du graphique
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${value} %`
        },
        title: {
          display: true,
          text: 'Somme de Taux de Migration/Création'
        },
             // Pas de limite maximale pour l'axe Y
      suggestedMax: Math.max(
        ...chartData.datasets.flatMap(d => d.data),
        100 // Utilisez 100 comme minimum pour suggestedMax
      ) * 1.1,
        grid: {
          drawBorder: false,
          color: "rgba(0, 0, 0, 0.05)"
        }
      },
      x: {
        offset: true,
        ticks: {
            padding: 1 // Ajuste la distance entre les ticks et les labels
        },
        title: {
          display: true,
          text: 'Activité'
        },
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(2)} %`;
          }
        }
      },
      datalabels: {
        // Activer datalabels pour afficher les pourcentages sur le graphique
        display: true,
        formatter: (value) => `${value} %`,
        color: 'black',
        font: {
          weight: 'bold',
          size: 11
        },
        anchor: 'end',
        align: 'end',
        offset: 5
      }    },
    elements: {
      line: {
        borderJoinStyle: 'round'
      }
    }
  };

  // Gestion des sélections de périmètres
  const togglePerimetre = (perimetre) => {
    setSelectedPerimetres(prev => 
      prev.includes(perimetre)
        ? prev.filter(p => p !== perimetre)
        : [...prev, perimetre]
    );
  };
  
  const selectAllPerimetres = () => {
    setSelectedPerimetres([...availablePerimetres]);
  };
  
  const deselectAllPerimetres = () => {
    setSelectedPerimetres([]);
  };
  
  // Gestion des sélections de types
  const toggleType = (type) => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  const selectAllTypes = () => {
    setSelectedTypes([...availableTypes]);
  };
  
  const deselectAllTypes = () => {
    setSelectedTypes([]);
  };
  
  // Gestion des sélections de semaines
  const toggleWeek = (week) => {
    setSelectedWeeks(prev => 
      prev.includes(week)
        ? prev.filter(w => w !== week)
        : [...prev, week]
    );
  };
  
  const selectAllWeeks = () => {
    setSelectedWeeks([...availableWeeks]);
  };
  
  const deselectAllWeeks = () => {
    setSelectedWeeks([]);
  };

  // Formatage pour la période affichée
  const getPeriodeLabel = () => {
    if (globalStartDate && globalEndDate) {
      const startFormatted = globalStartDate.toLocaleDateString("fr-FR");
      const endFormatted = globalEndDate.toLocaleDateString("fr-FR");
      return `Période : ${startFormatted} → ${endFormatted}`;
    }
    return "Toutes les périodes";
  };

  if (loading) {
    return (
      <div className="visualisation relative h-96 bg-white rounded-xl shadow-md p-6" data-id={id}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Chargement...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="visualisation relative h-96 bg-white rounded-xl shadow-md p-6" data-id={id}>
        <h3 className="text-gray-800 text-lg font-medium mb-4">{title}</h3>
        <p className="text-red-500 text-sm mt-2 break-words">{error}</p>
      </div>
    );
  }

  return (
    <div className="visualisation relative h-96 bg-white rounded-xl shadow-md" data-id={id}>
      {/* Header avec titre et boutons */}
      <div className="no-export p-4 border-b flex justify-between items-center">
        <div>
          <h3 className="text-gray-800 text-lg font-medium">{title}</h3>
          <p className="text-xs text-gray-500">
            {getPeriodeLabel()}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Bouton Filtre */}
          <button
            className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            data-filter-toggle="true"
          >
            <AiOutlineFilter size={20} className="text-gray-800" />
          </button>

          {/* ---- NOUVEAU : Bouton Commentaires ---- */}
          <CommentButton
            containerRef={chartContainerRef}
            comments={annotations}
            onAddComment={(c) => setAnnotations([...annotations, c])}
            onUpdateComment={(c) => setAnnotations(annotations.map(a => a.id === c.id ? c : a))}
            onDeleteComment={(id) => setAnnotations(annotations.filter(a => a.id !== id))}
          />

          {/* Bouton Agrandir */}
          <button
            className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
            onClick={() => setModalIsOpen(true)}
          >
            <FaExpand size={20} className="text-gray-800" />
          </button>
        </div>
      </div>

      {/* Panneau de filtre */}
      {isFilterOpen && (
        <div
          ref={filterPanelRef}
          className="absolute right-0 top-16 mt-2 bg-white shadow-lg rounded-md p-4 z-40 w-72 overflow-y-auto max-h-[70vh]">

          {/* Section Périmètres */}
          <div className="mb-4">
            <h4 className="font-medium mb-1">Périmètre :</h4>
            <div className="flex justify-between mb-1">
              <button
                onClick={selectAllPerimetres}
                className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                Tous
              </button>
              <button
                onClick={deselectAllPerimetres}
                className="px-2 py-0.5 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                Aucun
              </button>
            </div>
            <div className="max-h-24 overflow-y-auto border rounded p-2 mb-3">
              {availablePerimetres.map((perimetre) => (
                <div key={perimetre} className="flex items-center mb-1 last:mb-0">
                  <input
                    type="checkbox"
                    id={`perimetre-${perimetre.replace(/\s+/g, '-')}`}
                    checked={selectedPerimetres.includes(perimetre)}
                    onChange={() => togglePerimetre(perimetre)}
                    className="mr-2"
                  />
                  <label
                    htmlFor={`perimetre-${perimetre.replace(/\s+/g, '-')}`}
                    className="text-sm">
                    {perimetre}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Section Types */}
          <div className="mb-4">
            <h4 className="font-medium mb-1">Type de document :</h4>
            <div className="flex justify-between mb-1">
              <button
                onClick={selectAllTypes}
                className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                Tous
              </button>
              <button
                onClick={deselectAllTypes}
                className="px-2 py-0.5 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                Aucun
              </button>
            </div>
            <div className="max-h-24 overflow-y-auto border rounded p-2 mb-3">
              {availableTypes.map((type) => (
                <div key={type} className="flex items-center mb-1 last:mb-0">
                  <input
                    type="checkbox"
                    id={`type-${type.replace(/\s+/g, '-')}`}
                    checked={selectedTypes.includes(type)}
                    onChange={() => toggleType(type)}
                    className="mr-2"
                  />
                  <label
                    htmlFor={`type-${type.replace(/\s+/g, '-')}`}
                    className="text-sm">
                    {type}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Section Semaines */}
          <div>
            <h4 className="font-medium mb-1">Semaine :</h4>
            <div className="flex justify-between mb-1">
              <button
                onClick={selectAllWeeks}
                className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                Toutes
              </button>
              <button
                onClick={deselectAllWeeks}
                className="px-2 py-0.5 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                Aucune
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto border rounded p-2">
              {availableWeeks.map((week) => (
                <div key={week} className="flex items-center mb-1 last:mb-0">
                  <input
                    type="checkbox"
                    id={`week-${week.replace(/\s+/g, '-')}`}
                    checked={selectedWeeks.includes(week)}
                    onChange={() => toggleWeek(week)}
                    className="mr-2"
                  />
                  <label
                    htmlFor={`week-${week.replace(/\s+/g, '-')}`}
                    className="text-sm">
                    {week}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conteneur du graphique */}
      <div
        className="p-4 h-[calc(100%-64px)] flex items-center justify-center"
        ref={chartContainerRef}>
        {chartData.labels.length > 0 ? (
          <Line
            data={chartData}
            options={chartOptions}
          />
        ) : (
          <div className="text-center text-gray-500">
            Aucune donnée à afficher pour les filtres sélectionnés
          </div>
        )}
      </div>

      {/* Modal d'agrandissement */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-xl shadow-md w-5/6 h-5/6 overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <div>
              <h3 className="text-gray-800 text-lg font-medium">{title}</h3>
              <p className="text-xs text-gray-500">
                {getPeriodeLabel()}
                {selectedPerimetres.length < availablePerimetres.length && (
                  <> | Périmètres: {selectedPerimetres.join(', ')}</>
                )}
                {selectedTypes.length < availableTypes.length && (
                  <> | Types: {selectedTypes.join(', ')}</>
                )}
                {selectedWeeks.length < availableWeeks.length && (
                  <> | Semaines: {selectedWeeks.length > 5
                    ? `${selectedWeeks.length}/${availableWeeks.length} semaines`
                    : selectedWeeks.join(', ')}</>
                )}
              </p>
            </div>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          {/* ---- MODIFIÉ : Ajout de la référence modalChartContainerRef et CommentButton caché ---- */}
          <div
            className="relative p-4 h-[calc(100%-64px)] flex items-center justify-center"
            ref={modalChartContainerRef}>
            {chartData.labels.length > 0 ? (
              <Line
                data={chartData}
                options={{...chartOptions, maintainAspectRatio: false}}
              />
            ) : (
              <div className="text-center text-gray-500">
                Aucune donnée à afficher pour les filtres sélectionnés
              </div>
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