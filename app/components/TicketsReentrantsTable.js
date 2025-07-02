"use client";

import { useState, useEffect, useRef } from "react";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import Modal from "react-modal";
import { useGlobalFilter } from "./GlobalFilterContext";
import fetchWithAuth from "@/utils/fetchWithAuth";

// Pour l'accessibilité du Modal
if (typeof window !== "undefined") Modal.setAppElement(document.body);

/**
 * Calcule le numéro de semaine ISO d'une date.
 */
const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

/**
 * Renvoie la liste de toutes les semaines entre deux dates.
 */
const getAllWeeksBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return [];
  const weeksArray = [];
  const startWeek = getWeekNumber(startDate);
  const endWeek = getWeekNumber(endDate);
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  if (startYear === endYear) {
    for (let week = startWeek; week <= endWeek; week++) {
      weeksArray.push(week);
    }
  } else {
    for (let year = startYear; year <= endYear; year++) {
      const maxWeeks = year === endYear ? endWeek : 52;
      const minWeeks = year === startYear ? startWeek : 1;
      for (let week = minWeeks; week <= maxWeeks; week++) {
        weeksArray.push(week);
      }
    }
  }
  return weeksArray;
};

export default function TicketsReentrantsTable({
  apiUrl,
  commentApiUrl,
  tableType = "hispeed",
  id = "Détail des Réitérations des Tickets",
  chartTitle = "Détail des Réitérations des Tickets"
}) {
  // Vérification si l'URL de l'API est fournie
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

  // On inclut globalModifiedAt pour détecter les nouveaux déclenchements du filtre global.
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Références pour le panneau de filtre et le bouton de filtre
  const filterPanelRef = useRef(null);
  const filterButtonRef = useRef(null);

  // États pour la récupération et le traitement des données
  const [rawData, setRawData] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // États de filtrage local
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [searchTicketId, setSearchTicketId] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // ✅ NOUVEAU : État pour savoir si l'utilisateur a fait une sélection manuelle
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const [lastGlobalModifiedAt, setLastGlobalModifiedAt] = useState(0);

  // États pour la pagination de l'affichage
  const [visibleTickets, setVisibleTickets] = useState(5);

  // États de gestion des années
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  // État pour la gestion de l'agrandissement (modal)
  const [modalIsOpen, setModalIsOpen] = useState(false);
  
  // États pour l'édition des commentaires
  const [editingComment, setEditingComment] = useState(null); // {id: ticketId, text: commentText}
  const [commentSaving, setCommentSaving] = useState(false);

/**
 * Fonction de traitement des tickets (calcul des itérations).
 * Version améliorée avec attribution cohérente des itérations
 */
const processIterationData = (tickets) => {
  const processed = {};

  // Grouper les tickets par ID
  const ticketsByIdAndWeek = {};
  
  tickets.forEach(ticket => {
    const ticketId = ticket.id_ticket;
    const week = ticket.semaine;
    
    if (!ticketsByIdAndWeek[ticketId]) {
      ticketsByIdAndWeek[ticketId] = {};
    }
    
    if (!ticketsByIdAndWeek[ticketId][week]) {
      ticketsByIdAndWeek[ticketId][week] = [];
    }
    
    ticketsByIdAndWeek[ticketId][week].push(ticket);
  });

  // Traiter chaque ticket
  Object.entries(ticketsByIdAndWeek).forEach(([ticketId, weekData]) => {
    // Obtenir toutes les semaines pour ce ticket et les trier
    const weeks = Object.keys(weekData).map(Number).sort((a, b) => a - b);
    
    let cumulativeCount = 0;
    const iterations = {};
    const weekDetails = [];
    
    // Pour chaque semaine, calculer le nombre d'occurrences et l'itération cumulative
    weeks.forEach((week, index) => {
      const occurrencesInWeek = weekData[week].length;
      
      // Pour chaque occurrence dans cette semaine
      for (let i = 0; i < occurrencesInWeek; i++) {
        cumulativeCount++;
        
        // Stocker l'itération cumulative pour cette semaine
        iterations[week] = cumulativeCount;
        
        // Préparer le texte pour l'affichage
        let weekText = `S${week}`;
        
        // Si c'est la première fois que le ticket apparaît
        if (cumulativeCount === 1) {
          weekText += " (1ère itération)";
        } else {
          // Pour les itérations suivantes
          weekText += ` (${cumulativeCount}ème itération)`;
        }
        
        // Si plusieurs occurrences dans la même semaine, préciser
        if (occurrencesInWeek > 1 && i > 0) {
          weekText += ` - occurrence ${i + 1}`;
        }
        
        weekDetails.push({
          week: week,
          iteration: cumulativeCount,
          text: weekText
        });
      }
    });
    
    // Obtenir les infos du premier ticket pour les métadonnées
    const firstTicket = Object.values(weekData)[0][0];
    
    processed[ticketId] = {
      titre_ticket: firstTicket.compl_title,
      iterations: iterations,
      totalIterations: cumulativeCount,
      weekDetails: weekDetails,
      comment_reentrant: firstTicket.comment_reentrant || "",
      // Créer la chaîne d'affichage des semaines
      semainesApparition: weekDetails.map(wd => wd.text).join(", ")
    };
  });

  return Object.entries(processed)
    .map(([id, ticket]) => ({
      id_ticket: id,
      ...ticket,
      // Le nombre de réitérations est le total moins la première occurrence
      totalIterations: ticket.totalIterations - 1,
    }))
    .filter(ticket => ticket.totalIterations >= 1) // Garder seulement les tickets qui ont au moins une réitération
    .sort((a, b) => b.totalIterations - a.totalIterations);
};

  // Récupération initiale des données et extraction des années disponibles.
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        setRawData(result);

        // Extraction des années à partir de la date de dernière mise à jour.
        const years = [
          ...new Set(
            result.map(ticket => new Date(ticket.date_derniere_maj).getFullYear())
          )
        ].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du fetch des données :", error);
        setLoading(false);
      }
    }
    fetchData();
  }, [apiUrl]);

  /**
   * Calcul des semaines disponibles depuis toutes les données de l'année sélectionnée
   * (sans tenir compte du filtre global).
   */
  const allWeeks = (() => {
    if (!rawData.length || !selectedYear) return [];
    const weeks = rawData
      .filter(ticket => {
        const ticketDate = new Date(ticket.date_derniere_maj);
        return ticketDate.getFullYear() === selectedYear;
      })
      .map(ticket => ticket.semaine);
    return [...new Set(weeks)].sort((a, b) => a - b);
  })();

  /**
   * ✅ MODIFIÉ : Applique le filtre global SEULEMENT s'il y a un nouveau filtre global
   * et que l'utilisateur n'a pas fait de sélection manuelle depuis.
   */
  useEffect(() => {
    // Vérifier s'il y a un nouveau filtre global
    const isNewGlobalFilter = globalModifiedAt > lastGlobalModifiedAt && globalModifiedAt > 0;
    
    if (isNewGlobalFilter && globalStartDate && globalEndDate) {
      // Calculer les semaines correspondant à la période choisie
      const weeksToSelect = getAllWeeksBetween(globalStartDate, globalEndDate);
      
      // Filtrer pour ne garder que les semaines correspondant à l'année sélectionnée
      // et qui existent dans nos données
      const filteredWeeks = weeksToSelect.filter(week => {
        return allWeeks.includes(week);
      });
      
      // Appliquer la sélection automatique du filtre global
      setSelectedWeeks(filteredWeeks);
      
      // Marquer que ce n'est plus une sélection manuelle
      setHasManualSelection(false);
      
      // Mémoriser ce globalModifiedAt pour détecter les prochains changements
      setLastGlobalModifiedAt(globalModifiedAt);
    }
  }, [globalModifiedAt, globalStartDate, globalEndDate, allWeeks, lastGlobalModifiedAt]);

  /**
   * Calcul et traitement des données.
   *
   * Si aucune sélection locale n'est effectuée (selectedWeeks vide) et qu'un filtre global est défini,
   * le filtrage global est appliqué (filtrage par date). Dès qu'une sélection locale est définie,
   * le filtrage se fait sur l'ensemble des données pour l'année sélectionnée, sans tenir compte du filtre global.
   */
  useEffect(() => {
    if (rawData.length > 0 && selectedYear) {
      // Filtrage par année (toutes les données de l'année)
      let ticketsForYear = rawData.filter(
        ticket =>
          new Date(ticket.date_derniere_maj).getFullYear() === selectedYear
      );
      // Si aucune sélection locale n'est faite et qu'un filtre global est défini, on l'applique.
      if (selectedWeeks.length === 0 && globalStartDate && globalEndDate) {
        ticketsForYear = ticketsForYear.filter(ticket => {
          const ticketDate = new Date(ticket.date_derniere_maj);
          return ticketDate >= globalStartDate && ticketDate <= globalEndDate;
        });
      }
      const processed = processIterationData(ticketsForYear);
      setData(processed);
    }
  }, [rawData, selectedYear, globalStartDate, globalEndDate, selectedWeeks]);

  // Filtrage des données affichées en fonction de la sélection des semaines et de la recherche sur l'ID.
const filteredData = data.filter(ticket => {
  // Si aucune semaine n'est sélectionnée, pas de filtrage sur les semaines.
  
  if (selectedWeeks.length === 0) return true;

  // Récupère pour chaque ticket les itérations correspondant aux semaines sélectionnées.
  const validCounts = selectedWeeks
    .map(week => ticket.iterations[week])
    .filter(count => count !== undefined);

  // Si le ticket n'apparaît dans aucune des semaines sélectionnées
  if (validCounts.length === 0) return false;
  
  // ✅ NOUVELLE LOGIQUE : 
  // Afficher le ticket SEULEMENT s'il y a au moins une semaine sélectionnée 
  // où le ticket a une itération > 1 (donc pas sa première apparition)
  const hasReiterationInSelectedWeeks = validCounts.some(count => count > 1);
  
  return hasReiterationInSelectedWeeks;
}).filter(ticket =>
  searchTicketId === "" || ticket.id_ticket.includes(searchTicketId)
);

  // ✅ Fonction pour déterminer si un filtre est appliqué
  const isFilterApplied = () => {
    const hasGlobalFilter = globalStartDate && globalEndDate;
    const hasLocalFilter = selectedWeeks.length > 0 || searchTicketId.trim() !== "";
    return hasGlobalFilter || hasLocalFilter;
  };

  // ✅ Effet pour ajuster visibleTickets quand un filtre est appliqué
  useEffect(() => {
    if (isFilterApplied()) {
      // Si un filtre est appliqué, afficher tous les tickets
      setVisibleTickets(filteredData.length || 5);
    } else {
      // Si aucun filtre n'est appliqué, revenir à l'affichage par défaut
      setVisibleTickets(5);
    }
  }, [filteredData.length, selectedWeeks, searchTicketId, globalStartDate, globalEndDate]);

  // Bouton "Tout sélectionner / Tout désélectionner" pour les semaines disponibles.
  const allWeeksSelected =
    allWeeks.length > 0 && allWeeks.every(week => selectedWeeks.includes(week));
  
  // ✅ MODIFIÉ : Marquer comme sélection manuelle
  const toggleSelectAll = () => {
    if (allWeeksSelected) {
      setSelectedWeeks([]);
    } else {
      setSelectedWeeks([...allWeeks]);
    }
    setHasManualSelection(true); // ✅ Marquer comme sélection manuelle
  };

  // ✅ MODIFIÉ : Marquer comme sélection manuelle
  const handleWeekSelectionChange = (week) => {
    setSelectedWeeks(prev =>
      prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
    );
    setHasManualSelection(true); // ✅ Marquer comme sélection manuelle
  };

  // Changement d'année.
  const handleYearChange = (year) => {
    setSelectedYear(year);
    // Réinitialisation de la sélection locale à chaque changement d'année.
    setSelectedWeeks([]);
    setHasManualSelection(false); // ✅ Réinitialiser le flag de sélection manuelle
  };

  // ✅ NOUVEAU : Fonction pour réinitialiser les filtres locaux et reprendre le filtre global
  const resetToGlobalFilter = () => {
    setSelectedWeeks([]);
    setSearchTicketId("");
    setHasManualSelection(false);
    
    // Réappliquer le filtre global s'il existe
    if (globalStartDate && globalEndDate) {
      const weeksToSelect = getAllWeeksBetween(globalStartDate, globalEndDate);
      const filteredWeeks = weeksToSelect.filter(week => allWeeks.includes(week));
      setSelectedWeeks(filteredWeeks);
    }
  };

  // Nouvelles fonctions pour gérer l'édition des commentaires
  const startEditingComment = (ticketId, currentComment) => {
    setEditingComment({
      id: ticketId,
      text: currentComment || ""
    });
  };

  // Annuler l'édition
  const cancelEditingComment = () => {
    setEditingComment(null);
  };

  // Sauvegarder le commentaire
const saveComment = async (ticketId, commentText) => {
  setCommentSaving(true);
  try {
    const response = await fetchWithAuth( commentApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_ticket: ticketId,
        comment_type: 'reentrant',
        comment_text: commentText,
        table_type: tableType    // Spécifier explicitement la table
      }),
    });

    const data = await response.json();
    
    if (data.status === 'success') {
      // Mettre à jour l'état local
      setData(prevData => 
        prevData.map(ticket => 
          ticket.id_ticket === ticketId 
            ? { ...ticket, comment_reentrant: commentText } 
            : ticket
        )
      );
      setEditingComment(null);
    } else {
      alert(`Erreur: ${data.message || 'Échec de la sauvegarde du commentaire'}`);
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du commentaire:", error);
    alert("Une erreur est survenue lors de la sauvegarde du commentaire.");
  } finally {
    setCommentSaving(false);
  }
};

  // Fermeture automatique du panneau de filtre si clic en dehors du panneau ou du bouton.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (loading)
    return (
      <p className="text-center text-gray-500">Chargement des données...</p>
    );

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full">
        {/* Boutons en haut à droite pour le panneau de filtres et l'agrandissement */}
        <div className="no-export absolute top-2 right-2 flex items-center space-x-2 z-50">
          <button
            ref={filterButtonRef}
            className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <AiOutlineFilter size={20} className="text-gray-600" />
          </button>
          <button
            className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
            onClick={() => setModalIsOpen(true)}
          >
            <FaExpand size={18} className="text-gray-600" />
          </button>
        </div>

        <h3 className="no-export text-lg font-semibold mb-3 text-black">
          {chartTitle}
        </h3>

        {/* Panneau des filtres */}
        {isOpen && (
          <div
            ref={filterPanelRef}
            className="absolute right-2 top-14 bg-white shadow-lg rounded-md p-4 w-64 z-50"
          >
            <h4 className="font-semibold text-black">Filtrer par :</h4>
            
            {/* ✅ NOUVEAU : Bouton pour revenir au filtre global */}
            {hasManualSelection && (globalStartDate && globalEndDate) && (
              <div className="mb-3">
                <button
                  onClick={resetToGlobalFilter}
                  className="text-xs px-2 py-1 rounded-md w-full bg-orange-100 text-orange-700 hover:bg-orange-200"
                >
                  🔄 Revenir au filtre global
                </button>
              </div>
            )}
            
            <input
              type="text"
              placeholder="Rechercher ID Ticket..."
              className="border p-2 w-full rounded-md mt-2"
              value={searchTicketId}
              onChange={(e) => setSearchTicketId(e.target.value)}
            />
            {/* Sélection d'années si plusieurs existent */}
            {multipleYearsExist && (
              <div className="mt-2">
                <h4 className="font-semibold text-black">Années :</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {availableYears.map((year) => (
                    <button
                      key={year}
                      onClick={() => handleYearChange(year)}
                      className={`px-2 py-1 text-xs rounded-md ${
                        selectedYear === year
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <h4 className="font-semibold mt-2 text-black">Semaines :</h4>
            
            {/* ✅ NOUVEAU : Indicateur de sélection manuelle */}
            {hasManualSelection && (
              <div className="text-xs text-blue-600 mb-2">
                ✋ Sélection personnalisée active
              </div>
            )}
            
            {/* Bouton Tout sélectionner / Tout désélectionner */}
            <div className="mb-2">
              <button
                onClick={toggleSelectAll}
                className={`text-xs px-2 py-1 rounded-md w-full ${
                  allWeeksSelected
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                {allWeeksSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
              {allWeeks.map((week) => (
                <div key={week} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedWeeks.includes(week)}
                    onChange={() => handleWeekSelectionChange(week)}
                  />
                  <span className="text-black">Semaine {week}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indicateur de filtre actif */}
        {isFilterApplied() && (
          <div className="mb-3 text-sm text-blue-600 bg-blue-50 p-2 rounded">
            📊 Filtre actif - Affichage de tous les tickets correspondants ({filteredData.length} ticket{filteredData.length > 1 ? 's' : ''})
            {hasManualSelection && (
              <span className="ml-2 text-green-600">• Personnalisé</span>
            )}
          </div>
        )}

        {/* Tableau principal */}
        <table className="w-full border-collapse border border-gray-300 mt-4 text-sm">
          <thead>
            <tr className="bg-gray-200 text-black">
              <th className="border p-2">ID Ticket</th>
              <th className="border p-2">Titre du Ticket</th>
              {allWeeks.map(
                (week) =>
                  selectedWeeks.includes(week) && (
                    <th key={week} className="border p-2">
                      Semaine {week}
                    </th>
                  )
              )}
              <th className="border p-2">Semaines d'Apparition</th>
              <th className="border p-2">Total Réitérations</th>
              <th className="border p-2">Commentaire Réentrant</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, visibleTickets).map((ticket) => (
              <tr key={ticket.id_ticket} className="hover:bg-gray-100 text-black">
                <td className="border p-2">{ticket.id_ticket}</td>
                <td className="border p-2">{ticket.titre_ticket}</td>
                {allWeeks.map(
                  (week) =>
                    selectedWeeks.includes(week) && (
                      <td key={week} className="border p-2">
                        {ticket.iterations[week] ? ticket.iterations[week] : ""}
                      </td>
                    )
                )}
                <td className="border p-2">{ticket.semainesApparition}</td>
                <td className="border p-2">{ticket.totalIterations}</td>
                <td className="border p-2">
                  {editingComment && editingComment.id === ticket.id_ticket ? (
                    <div className="flex flex-col gap-2">
                      <textarea 
                        className="w-full border p-2 rounded text-sm"
                        value={editingComment.text}
                        onChange={(e) => setEditingComment({...editingComment, text: e.target.value})}
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <button 
                          className="bg-gray-200 text-gray-800 px-2 py-1 rounded flex items-center text-xs"
                          onClick={cancelEditingComment}
                          disabled={commentSaving}
                        >
                          <FaTimes className="mr-1" /> Annuler
                        </button>
                        <button 
                          className="bg-green-500 text-white px-2 py-1 rounded flex items-center text-xs"
                          onClick={() => saveComment(ticket.id_ticket, editingComment.text)}
                          disabled={commentSaving}
                        >
                          {commentSaving ? "..." : <><FaSave className="mr-1" /> Enregistrer</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex-grow">
                        {ticket.comment_reentrant || <span className="text-gray-400 italic">Aucun commentaire</span>}
                      </div>
                      <button 
                        className="text-blue-500 hover:text-blue-700 ml-2"
                        onClick={() => startEditingComment(ticket.id_ticket, ticket.comment_reentrant)}
                      >
                        <FaEdit />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Boutons "Voir Plus/Moins" seulement quand aucun filtre n'est appliqué */}
        {!isFilterApplied() && (
          <div className="no-export flex justify-center space-x-3 mt-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300"
              onClick={() => setVisibleTickets((prev) => prev + 5)}
              disabled={visibleTickets >= filteredData.length}
            >
              Voir Plus
            </button>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-gray-300"
              onClick={() => setVisibleTickets((prev) => Math.max(5, prev - 5))}
              disabled={visibleTickets <= 5}
            >
              Voir Moins
            </button>
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
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-800">
              {chartTitle}
            </h3>
            <button
              onClick={() => setModalIsOpen(false)}
              className="text-gray-500 hover:text-red-500"
            >
              ❌
            </button>
          </div>
          {/* Tableau en mode agrandi */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 mt-4 text-sm">
              <thead>
                <tr className="bg-gray-200 text-black">
                  <th className="border p-2">ID Ticket</th>
                  <th className="border p-2">Titre du Ticket</th>
                  {allWeeks.map(
                    (week) =>
                      selectedWeeks.includes(week) && (
                        <th key={week} className="border p-2">
                          Semaine {week}
                        </th>
                      )
                  )}
                  <th className="border p-2">Semaines d'Apparition</th>
                  <th className="border p-2">Total Réitérations</th>
                  <th className="border p-2">Commentaire Réentrant</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((ticket) => (
                  <tr key={ticket.id_ticket} className="hover:bg-gray-100 text-black">
                    <td className="border p-2">{ticket.id_ticket}</td>
                    <td className="border p-2">{ticket.titre_ticket}</td>
                    {allWeeks.map(
                      (week) =>
                        selectedWeeks.includes(week) && (
                          <td key={week} className="border p-2">
                            {ticket.iterations[week] ? ticket.iterations[week] : ""}
                          </td>
                        )
                    )}
                    <td className="border p-2">{ticket.semainesApparition}</td>
                    <td className="border p-2">{ticket.totalIterations}</td>
                    <td className="border p-2">
                      {editingComment && editingComment.id === ticket.id_ticket ? (
                        <div className="flex flex-col gap-2">
                          <textarea 
                            className="w-full border p-2 rounded text-sm"
                            value={editingComment.text}
                            onChange={(e) => setEditingComment({...editingComment, text: e.target.value})}
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <button 
                              className="bg-gray-200 text-gray-800 px-2 py-1 rounded flex items-center text-xs"
                              onClick={cancelEditingComment}
                              disabled={commentSaving}
                            >
                              <FaTimes className="mr-1" /> Annuler
                            </button>
                            <button 
                              className="bg-green-500 text-white px-2 py-1 rounded flex items-center text-xs"
                              onClick={() => saveComment(ticket.id_ticket, editingComment.text)}
                              disabled={commentSaving}
                            >
                              {commentSaving ? "..." : <><FaSave className="mr-1" /> Enregistrer</>}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div className="flex-grow">
                            {ticket.comment_reentrant || <span className="text-gray-400 italic">Aucun commentaire</span>}
                          </div>
                          <button 
                            className="text-blue-500 hover:text-blue-700 ml-2"
                            onClick={() => startEditingComment(ticket.id_ticket, ticket.comment_reentrant)}
                          >
                            <FaEdit />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}