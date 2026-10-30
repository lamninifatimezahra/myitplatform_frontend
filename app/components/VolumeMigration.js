"use client";

import { useState, useEffect, useRef } from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
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
  ArcElement,
  Tooltip,
  Legend,
  Title,
  ChartDataLabels
);

export default function VolumeMigration({
  apiUrl,
  id = "Volume De Documents Migrés/ETP",
  title = "Volume De Documents Migrés/ETP",
  ownerField = "owner",
  typeField = "type_modop",
  weekField = "semaine",
  dateField = "date",
  maxOwners = 6, // Nombre max de propriétaires à afficher individuellement
  colorPalette = [
    "#2196f3", "#1b2b6b", "#f36e3b", "#4caf50", 
    "#9c27b0", "#ff9800", "#009688"

  ]
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
  const [annotations, setAnnotations] = useState([]);
  
  // États pour les filtres
  const [selectedOwners, setSelectedOwners] = useState([]);
  const [availableOwners, setAvailableOwners] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [otherThreshold, setOtherThreshold] = useState(0); // Seuil pour regrouper en "Autres"
  
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
        
        // Extraire les types disponibles et les semaines
        const types = [...new Set(result.map(doc => doc[typeField]))].filter(Boolean);
        const weeks = [...new Set(result.map(doc => doc[weekField]))].filter(Boolean);
        
        // Trier les semaines pour un affichage cohérent (S1, S2, etc.)
        weeks.sort((a, b) => {
          // Extraction du numéro de semaine (ex: "S6" -> 6)
          const numA = parseInt(a.replace(/\D/g, ''));
          const numB = parseInt(b.replace(/\D/g, ''));
          return numA - numB;
        });
        
        setAvailableTypes(types);
        setAvailableWeeks(weeks);
        
        // Par défaut, tout sélectionner
        if (selectedTypes.length === 0) {
          setSelectedTypes(types);
        }
        
        if (selectedWeeks.length === 0) {
          setSelectedWeeks(weeks);
        }
        
        // Traiter les données pour le graphique
        processData(result);
        
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setError(`Erreur: ${error.message}`);
        setLoading(false);
      }
    }
    
    fetchData();
  }, [apiUrl, ownerField, typeField, weekField, dateField, globalStartDate, globalEndDate]);

  // Traiter les données pour obtenir les documents par propriétaire
  const processData = (documents) => {
    // Appliquer les filtres
    let filteredDocs = documents;
    
    // Filtrer par type si des types sont sélectionnés
    if (selectedTypes.length > 0) {
      filteredDocs = filteredDocs.filter(doc => selectedTypes.includes(doc[typeField]));
    }
    
    // Filtrer par semaine si des semaines sont sélectionnées
    if (selectedWeeks.length > 0) {
      filteredDocs = filteredDocs.filter(doc => selectedWeeks.includes(doc[weekField]));
    }
    
    // Compter par propriétaire
    const ownerCounts = {};
    
    filteredDocs.forEach(doc => {
      const owner = doc[ownerField] || "Non défini";
      if (!ownerCounts[owner]) {
        ownerCounts[owner] = 1;
      } else {
        ownerCounts[owner]++;
      }
    });
    
    // Convertir en tableau et trier par count (descendant)
    const sortedOwners = Object.entries(ownerCounts)
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count);
    
    // Extraire la liste des propriétaires disponibles
    const allOwners = sortedOwners.map(item => item.owner);
    setAvailableOwners(allOwners);
    
    // Par défaut, sélectionner tous les propriétaires
    if (selectedOwners.length === 0) {
      setSelectedOwners(allOwners);
    }
    
    // Calculer le seuil pour "Autres" (basé sur une répartition pareto 80/20)
    const totalDocs = filteredDocs.length;
    if (totalDocs > 0) {
      const countSum = sortedOwners.reduce((sum, item) => sum + item.count, 0);
      const threshold = Math.max(0, Math.floor(countSum * 0.02)); // 2% du total
      setOtherThreshold(threshold);
    }
    
    setGroupedData(ownerCounts);
  };

  // Effet pour recalculer les données quand les filtres changent
  useEffect(() => {
    if (data.length > 0) {
      processData(data);
    }
  }, [selectedTypes, selectedWeeks]);

  // Préparation des données pour le camembert
  const prepareChartData = () => {
    if (!groupedData || Object.keys(groupedData).length === 0) {
      return { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
    }
    
    // Filtrer selon la sélection et trier
    const filteredOwners = Object.entries(groupedData)
      .filter(([owner]) => selectedOwners.includes(owner))
      .sort((a, b) => b[1] - a[1]);
    
    // Séparer les top propriétaires et regrouper les moins significatifs
    let otherCount = 0;
    let labels = [];
    let dataPoints = [];
    let colors = [];
    
    filteredOwners.forEach(([owner, count], index) => {
      if (index < maxOwners && count > otherThreshold) {
        labels.push(owner);
        dataPoints.push(count);
        colors.push(colorPalette[index % colorPalette.length]);
      } else {
        otherCount += count;
      }
    });
    
    // Ajouter la catégorie "Autres" si nécessaire
    if (otherCount > 0) {
      labels.push("Autres");
      dataPoints.push(otherCount);
      colors.push("#CCCCCC"); // Gris pour "Autres"
    }
    
    return {
      labels,
      datasets: [
        {
          data: dataPoints,
          backgroundColor: colors,
          borderColor: colors.map(color => color),
          borderWidth: 1,
          hoverOffset: 15
        }
      ]
    };
  };

  const chartData = prepareChartData();

// Mise à jour des options du graphique avec des positions de labels modifiées
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '40%',      // Espace vide au centre (par défaut c'est 0 pour Pie)
    radius: '70%',      // Réduire le rayon du graphique pour laisser plus d'espace aux labels
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
      datalabels: {
        formatter: (value, ctx) => {
          const total = ctx.dataset.data.reduce((acc, val) => acc + val, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          // Retourner à la fois le nombre et le pourcentage
          return value > 0 ? `${percentage}%\n(${value})` : '';
        },
        color: 'black', // Couleur noire pour les labels
        font: {
          weight: 'bold',
          size: 11
        },
        // Positionnement des labels à l'extérieur du camembert
        anchor: 'end',
        align: 'end',
        offset: 10, // Distance par rapport au bord du graphique
        clamp: true, // Empêcher les labels de sortir du conteneur
        clip: false, // Ne pas couper les labels
        textAlign: 'center',
        display: function(context) {
          return context.dataset.data[context.dataIndex] > 0; // Afficher seulement si la valeur > 0
        }
      }
    },
    // Éviter les chevauchements en réduisant légèrement la taille du graphique
    layout: {
      padding: {
        top: 15,
        bottom: 15,
        left: 15,
        right: 60 // Plus d'espace à droite pour les labels
      }
    }
  };
    
  const selectAllOwners = () => {
    setSelectedOwners([...availableOwners]);
  };
  
  const deselectAllOwners = () => {
    setSelectedOwners([]);
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

  // Total des documents
  const totalDocs = selectedOwners.reduce((total, owner) => {
    return total + (groupedData[owner] || 0);
  }, 0);

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
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h3 className="text-gray-800 text-lg font-medium">{title}</h3>
          <p className="text-xs text-gray-500">
            {getPeriodeLabel()} | Total: {totalDocs} document{totalDocs > 1 ? 's' : ''}
          </p>
        </div>
        {/* --- Conteneur des boutons --- */}
        <div className="flex gap-2 items-center"> {/* Ajout de items-center peut aider à l'alignement vertical */}
          {/* Bouton Filtre */}
          <button
            className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
            onClick={() => setIsFilterOpen(!isFilterOpen)} // Assurez-vous que isFilterOpen est défini dans useState
            data-filter-toggle="true"
          >
            <AiOutlineFilter size={20} className="text-gray-800" />
          </button>


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
      {/* Assurez-vous que le positionnement de ce panneau est correct par rapport aux boutons */}
      {isFilterOpen && (
        <div
          ref={filterPanelRef}
          // Ajustez 'top-14' ou 'top-16' si nécessaire pour qu'il s'aligne bien sous la barre de titre/boutons
          className="absolute right-4 top-16 mt-1 bg-white shadow-lg rounded-md p-4 z-40 w-72 overflow-y-auto max-h-[70vh]"
          >
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
          <div className="mb-4">
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
            <div className="max-h-32 overflow-y-auto border rounded p-2 mb-3">
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
        {totalDocs > 0 ? (
          <Pie
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
        ariaHideApp={false} // Important pour éviter les warnings/erreurs react-modal
      >
        {/* Contenu du Modal */}
        <div className="bg-white rounded-xl shadow-md w-5/6 h-5/6 overflow-hidden flex flex-col"> {/* flex flex-col pour mieux gérer la hauteur */}
          {/* Header du Modal */}
          <div className="p-4 border-b flex justify-between items-center flex-shrink-0"> {/* flex-shrink-0 pour que le header ne rétrécisse pas */}
            <div>
              <h3 className="text-gray-800 text-lg font-medium">{title}</h3>
              <p className="text-xs text-gray-500">
                {getPeriodeLabel()} | Total: {totalDocs} document{totalDocs > 1 ? 's' : ''}
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
            {/* --- MODIFICATION Modal : Wrapper aussi le CommentButton ici s'il doit apparaître --- */}
            <div className="flex gap-2 items-center">
              {/* Si le bouton commentaire est aussi dans le modal, il faut le wrapper ici aussi */}
               <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500 text-2xl leading-none"> {/* Bouton fermer */}
                 × {/* Utilisation de l'entité HTML pour une croix */}
               </button>
            </div>
             {/* --- FIN MODIFICATION Modal --- */}
          </div>
          {/* Corps du Modal (Graphique) */}
          <div
            className="p-4 flex-grow relative flex items-center justify-center overflow-hidden" /* flex-grow pour prendre l'espace, relative pour positionner des éléments internes si besoin */
            ref={modalChartContainerRef}
          >
             {/*
             Note: Le CommentButton a été déplacé dans le header du modal pour une UI plus standard.
             Si vous aviez des annotations *sur* le graphique lui-même gérées via CommentButton,
             il faudrait une logique plus complexe ici, potentiellement en séparant l'affichage
             des annotations de la logique du bouton/panneau.
             */}
            {totalDocs > 0 ? (
              <div className="w-full h-full"> {/* Conteneur pour forcer le Pie à prendre la taille */}
                <Pie
                  data={chartData}
                  options={{ ...chartOptions, maintainAspectRatio: false }} // maintainAspectRatio: false est clé pour le redimensionnement
                />
              </div>
            ) : (
              <div className="text-center text-gray-500">
                Aucune donnée à afficher pour les filtres sélectionnés
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}