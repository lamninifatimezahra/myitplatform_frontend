"use client";

import { useState, useEffect, useRef } from "react";
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
import { FaExpand } from "react-icons/fa";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useGlobalFilter } from "./GlobalFilterContext";
import Modal from "react-modal";
import CommentButton from "./CommentButton";

// Configurer le Modal pour l'accessibilité
if (typeof window !== "undefined") Modal.setAppElement(document.body);

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function GroupedBarChartEARF({
  apiUrl,
  id = "Type de Document/ETP",
  title = "Type de Document/ETP",
  dateField = "date",
  ownerField = "owner",
  typeField = "type_modop",
  typeColors = {
    "Migration": "#1b2b6b",
    "Création": "#2c3e50"
  },
  defaultMaxOwners = 10
}) {
  const chartContainerRef = useRef(null);
  const filterPanelRef = useRef(null);
  const modalChartContainerRef = useRef(null);
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  
  // États pour les filtres
  const [selectedOwners, setSelectedOwners] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [availableOwners, setAvailableOwners] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [maxOwners, setMaxOwners] = useState(defaultMaxOwners);
  
  // État pour les commentaires
  const [comments, setComments] = useState([]);
  
  // Gestion des commentaires
  const handleAddComment = (comment) => {
    setComments(prevComments => [...prevComments, comment]);
  };

  const handleUpdateComment = (updatedComment) => {
    setComments(prevComments => 
      prevComments.map(c => c.id === updatedComment.id ? updatedComment : c)
    );
  };

  const handleDeleteComment = (commentId) => {
    setComments(prevComments => prevComments.filter(c => c.id !== commentId));
  };
  
  // Effet pour gérer les clics extérieurs au panneau de filtre
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
      if (!apiUrl) {
        setError("L'URL de l'API est requise");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let url = apiUrl;
        
        // Ajout des paramètres de filtre par date si disponibles
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
        
        // Extraire la liste des propriétaires et types uniques
        const owners = [...new Set(result.map(item => item[ownerField]))].filter(Boolean);
        const types = [...new Set(result.map(item => item[typeField]))].filter(Boolean);
        
        setAvailableOwners(owners);
        setAvailableTypes(types);
        
        // Par défaut, sélectionner tous les types disponibles
        setSelectedTypes(types);
        
        // Par défaut, sélectionner les N propriétaires avec le plus de documents
        const ownerCounts = owners.map(owner => {
          return {
            owner,
            count: result.filter(item => item[ownerField] === owner).length
          };
        }).sort((a, b) => b.count - a.count);
        
        const topOwners = ownerCounts.slice(0, maxOwners).map(item => item.owner);
        setSelectedOwners(topOwners);
        
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setError(`Erreur: ${error.message}`);
        setLoading(false);
      }
    }
    
    fetchData();
  }, [apiUrl, ownerField, typeField, dateField, globalStartDate, globalEndDate, globalModifiedAt, maxOwners]);

  // Calcul des données pour le graphique
  const prepareChartData = () => {
    if (!data || data.length === 0 || selectedOwners.length === 0 || selectedTypes.length === 0) {
      return { labels: [], datasets: [] };
    }
    
    // Filtrer les données selon les propriétaires et types sélectionnés
    const filteredData = data.filter(item => 
      selectedOwners.includes(item[ownerField]) && 
      selectedTypes.includes(item[typeField])
    );
    
    // Regrouper par propriétaire et type
    const groupedData = {};
    
    selectedOwners.forEach(owner => {
      groupedData[owner] = {};
      selectedTypes.forEach(type => {
        groupedData[owner][type] = 0;
      });
    });
    
    filteredData.forEach(item => {
      const owner = item[ownerField];
      const type = item[typeField];
      if (groupedData[owner] && groupedData[owner][type] !== undefined) {
        groupedData[owner][type]++;
      }
    });
    
    // Préparer les labels (propriétaires)
    const labels = selectedOwners;
    
    // Préparer les datasets (un par type)
    const datasets = selectedTypes.map(type => ({
      label: type,
      data: labels.map(owner => groupedData[owner][type]),
      backgroundColor: typeColors[type] || "#ccc",
      borderRadius: 8,
      hoverBackgroundColor: typeColors[type] || "#aaa",
      hoverBorderWidth: 2,
      hoverBorderColor: "#444",
      categoryPercentage: 0.8,
      barPercentage: 0.9
    }));
    
    return { labels, datasets };
  };
  
  const chartData = prepareChartData();
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "black",
          font: { size: 11 },
          padding: 10
        },
      },
      datalabels: {
        anchor: "end",
        align: "end",
        color: "black",
        font: { size: 10 },
        clamp: true,
        clip: false,
        offset: -4,
        formatter: (value) => (value > 0 ? value : ""),
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.raw}`
        },
      },
    },
    scales: {
      x: {
        stacked: false,
        title: {
          display: true,
          text: 'Propriétaire'
        }
      },
      y: {
        beginAtZero: true,
        stacked: false,
        ticks: { precision: 0 },
        title: {
          display: true,
          text: 'Nombre de Documents'
        },
        grace: '5%'
      },
    },
    animation: {
      duration: 500,
    },
  };

  // Gestion des sélections
  const toggleOwner = (owner) => {
    setSelectedOwners(prev => 
      prev.includes(owner)
        ? prev.filter(o => o !== owner)
        : [...prev, owner]
    );
  };
  
  const toggleType = (type) => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  const selectAllOwners = () => {
    setSelectedOwners(availableOwners);
  };
  
  const deselectAllOwners = () => {
    setSelectedOwners([]);
  };
  
  const selectAllTypes = () => {
    setSelectedTypes(availableTypes);
  };
  
  const deselectAllTypes = () => {
    setSelectedTypes([]);
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
    <div className="visualisation relative" data-id={id}>
      {/* Conteneur principal de la visualisation */}
      <div className="relative bg-white rounded-xl shadow-md w-full h-96 flex flex-col">

        {/* Header avec titre et boutons */}
        <div className="p-4 border-b flex justify-between items-start">
          {/* Section Titre et Période */}
          <div>
            <h3 className="text-gray-800 text-lg font-medium">{title}</h3>
            <p className="text-xs text-gray-500">{getPeriodeLabel()}</p>
          </div>

          {/* Section Boutons d'action */}
          <div className="flex gap-2 items-center"> {/* Ajout de items-center pour l'alignement vertical */}
            {/* Bouton Filtre */}
            <button
              className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              data-filter-toggle="true"
              aria-label="Ouvrir les filtres"
            >
              <AiOutlineFilter size={20} className="text-gray-800" />
            </button>


            {/* Bouton Agrandir */}
            <button
              className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
              onClick={() => setModalIsOpen(true)}
              aria-label="Agrandir le graphique"
            >
              <FaExpand size={20} className="text-gray-800" />
            </button>
          </div>
        </div>

        {/* Panneau de filtre (positionné absolument par rapport au header ou au conteneur principal) */}
        {isFilterOpen && (
          <div
            ref={filterPanelRef}
            className="absolute right-0 top-14 mt-2 bg-white shadow-lg rounded-md p-4 z-40 w-72 overflow-y-auto max-h-[70vh]"
            // Le positionnement ici est correct car il doit être relatif au conteneur global du graphique
          >
            <h4 className="font-medium mb-2">Filtrer par :</h4>

            {/* Filtre des propriétaires */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <h5 className="font-medium text-sm">Propriétaires :</h5>
                <div className="flex space-x-1">
                  <button
                    onClick={selectAllOwners}
                    className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                    Tous
                  </button>
                  <button
                    onClick={deselectAllOwners}
                    className="px-2 py-0.5 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                    Aucun
                  </button>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto border rounded p-2">
                {availableOwners.map((owner) => (
                  <div key={owner} className="flex items-center mb-1 last:mb-0">
                    <input
                      type="checkbox"
                      id={`owner-${owner}`}
                      checked={selectedOwners.includes(owner)}
                      onChange={() => toggleOwner(owner)}
                      className="mr-2"
                    />
                    <label htmlFor={`owner-${owner}`} className="text-sm truncate">
                      {owner}
                    </label>
                  </div>
                ))}
                {availableOwners.length === 0 && (
                  <p className="text-xs text-gray-500 italic">Aucun propriétaire disponible.</p>
                )}
              </div>
            </div>

            {/* Filtre des types */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <h5 className="font-medium text-sm">Types :</h5>
                <div className="flex space-x-1">
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
              </div>
              <div className="max-h-40 overflow-y-auto border rounded p-2">
                {availableTypes.map((type) => (
                  <div key={type} className="flex items-center mb-1 last:mb-0">
                    <input
                      type="checkbox"
                      id={`type-${type}`}
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleType(type)}
                      className="mr-2"
                    />
                    <label htmlFor={`type-${type}`} className="text-sm flex items-center">
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-1"
                        style={{ backgroundColor: typeColors[type] || "#ccc" }}
                      ></span>
                      {type}
                    </label>
                  </div>
                ))}
                {availableTypes.length === 0 && (
                  <p className="text-xs text-gray-500 italic">Aucun type disponible.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conteneur du graphique principal */}
        <div className="flex-grow flex justify-center items-center w-full p-4" ref={chartContainerRef}>
          {/* Le composant Bar s'adaptera à ce conteneur */}
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Modal d'agrandissement */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50 p-4" // Ajout padding pour éviter collage aux bords
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
        contentLabel={`Modal - ${title}`} // Pour l'accessibilité
      >
        {/* Contenu du Modal */}
        <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden"> {/* Limites taille + flex-col */}

          {/* Header du Modal */}
          <div className="p-4 border-b flex justify-between items-center flex-shrink-0"> {/* flex-shrink-0 */}
            <div>
              <h3 className="text-gray-800 text-lg font-medium">{title}</h3>
              <p className="text-xs text-gray-500">{getPeriodeLabel()}</p>
            </div>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500 p-2" aria-label="Fermer le modal">
              ❌ {/* Un icone SVG serait mieux pour le style */}
            </button>
          </div>

          {/* Corps du Modal (graphique + bouton commentaire) */}
          <div className="flex-grow w-full p-4 relative overflow-hidden"> {/* Ajout relative + overflow-hidden */}

            {/* Conteneur pour le graphique dans le modal */}
            <div className="w-full h-full" ref={modalChartContainerRef}>
              <Bar data={chartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}