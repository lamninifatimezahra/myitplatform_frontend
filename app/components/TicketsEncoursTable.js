"use client";

import { useEffect, useState, useRef } from "react";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import fetchWithAuth from "@/utils/fetchWithAuth";
import Modal from "react-modal";

// Configurer le Modal pour l'accessibilité
if (typeof window !== "undefined") Modal.setAppElement(document.body);

export default function TicketsEnCoursTable({
  // Prop obligatoire pour l'URL de l'API
  apiUrl,
  commentApiUrl,
  tableType = "hispeed",
  // Props de personnalisation avec valeurs par défaut
  id = "Tickets en cours - Plus de une semaine",
  dateSortieField = "date_sortie",
  idField = "id_ticket",
  titleField = "compl_title",
  dateUpdateField = "date_derniere_maj",
  weekField = "semaine"
}) {
  // Gestion de l'absence de prop apiUrl
  if (!apiUrl) {
    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <p className="text-red-500 text-sm mt-2">Erreur : L'URL de l'API est requise.</p>
        </div>
      </div>
    );
  }

  // Références
  const filterPanelRef = useRef(null);

  // États de gestion des données
  const [tickets, setTickets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [allWeeks, setAllWeeks] = useState([]);
  const [sortOrder, setSortOrder] = useState("desc");
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  
  // États pour l'édition des commentaires
  const [editingComment, setEditingComment] = useState(null); // {id: ticketId, text: commentText}
  const [commentSaving, setCommentSaving] = useState(false);

  // États pour la pagination de l'affichage
  const [visibleTickets, setVisibleTickets] = useState(5);

  // Effet pour fermer le panneau de filtre en cas de clic extérieur
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isOpen &&
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target) &&
        !event.target.closest('button[data-filter-toggle]')
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fonction utilitaire pour obtenir le numéro de semaine ISO
  const getWeekNumber = (date) => {
    const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tempDate.getUTCDay() || 7;
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
  };

  // Récupération initiale des données depuis l'API
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetchWithAuth(apiUrl);
        const raw = await res.json();
        const now = new Date();
        const grouped = {};

        raw.forEach(ticket => {
          // Pour les tickets "en cours" (sans date de clôture)
          if (!ticket[dateSortieField]) {
            const ticketId = ticket[idField];
            const week = ticket[weekField];
            const maj = new Date(ticket[dateUpdateField]);
            const delay = Math.ceil((now - maj) / (1000 * 60 * 60 * 24));

            if (!grouped[ticketId]) {
              grouped[ticketId] = {
                [idField]: ticketId,
                titre_ticket: ticket[titleField],
                delay,
                last_maj: maj,
                semaineCounts: { [week]: 1 },
                semaines: [week],
                // Ajouter les champs de commentaire
                comment_en_cours: ticket.comment_en_cours || "",
                comment_reentrant: ticket.comment_reentrant || "",
              };
            } else {
              if (maj > grouped[ticketId].last_maj) {
                grouped[ticketId].delay = delay;
                grouped[ticketId].last_maj = maj;
                // Mettre à jour les commentaires si nécessaire
                if (ticket.comment_en_cours) {
                  grouped[ticketId].comment_en_cours = ticket.comment_en_cours;
                }
                if (ticket.comment_reentrant) {
                  grouped[ticketId].comment_reentrant = ticket.comment_reentrant;
                }
              }
              grouped[ticketId].semaineCounts[week] = (grouped[ticketId].semaineCounts[week] || 0) + 1;
              if (!grouped[ticketId].semaines.includes(week)) {
                grouped[ticketId].semaines.push(week);
              }
            }
          }
        });

        const finalTickets = Object.values(grouped)
          .filter(t => t.delay > 7)
          .map(t => ({
            ...t,
            semainesApparition: Object.entries(t.semaineCounts)
              .map(([w, c]) => (c > 1 ? `${w}(${c})` : w))
              .join(", ")
          }));

        const weeks = [...new Set(finalTickets.flatMap(t => t.semaines))].sort((a, b) => a - b);
        setAllWeeks(weeks);
        setTickets(finalTickets);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setLoading(false);
      }
    }
    fetchData();
  }, [apiUrl, dateSortieField, idField, titleField, dateUpdateField, weekField]);

  // Filtrage et tri des tickets selon les semaines sélectionnées et l'ordre
  useEffect(() => {
    let filteredTickets = tickets;
    if (selectedWeeks.length > 0) {
      filteredTickets = filteredTickets.filter(t => t.semaines.some(w => selectedWeeks.includes(w)));
    }
    filteredTickets = [...filteredTickets].sort((a, b) => {
      return sortOrder === "asc" ? a.delay - b.delay : b.delay - a.delay;
    });
    setFiltered(filteredTickets);
  }, [tickets, selectedWeeks, sortOrder]);

  // Fonction pour déterminer si un filtre est appliqué
  const isFilterApplied = () => {
    return selectedWeeks.length > 0;
  };

  // Effet pour ajuster visibleTickets quand un filtre est appliqué
  useEffect(() => {
    if (isFilterApplied()) {
      // Si un filtre est appliqué, afficher tous les tickets
      setVisibleTickets(filtered.length || 5);
    } else {
      // Si aucun filtre n'est appliqué, revenir à l'affichage par défaut
      setVisibleTickets(5);
    }
  }, [filtered.length, selectedWeeks]);

  const toggleSelectAll = () => {
    if (selectedWeeks.length === allWeeks.length) {
      setSelectedWeeks([]);
    } else {
      setSelectedWeeks([...allWeeks]);
    }
  };

  // Nouvelle fonction pour gérer l'édition des commentaires
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
      const response = await fetchWithAuth(commentApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_ticket: ticketId,
          comment_type: 'en_cours',
          comment_text: commentText,
          table_type: tableType
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        // Mettre à jour l'état local
        setTickets(prevTickets => 
          prevTickets.map(ticket => 
            ticket[idField] === ticketId 
              ? { ...ticket, comment_en_cours: commentText } 
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

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Header avec titre et boutons */}
        <div className="no-export flex justify-between items-start mb-4 relative">
          <h3 className="text-lg font-semibold text-black">
            Tickets en cours - Plus de une semaine ({filtered.length} ticket{filtered.length > 1 ? 's' : ''})
          </h3>
          <div className="flex gap-2">
            <button
              className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
              onClick={() => setIsOpen(!isOpen)}
              data-filter-toggle="true">
              <AiOutlineFilter size={20} className="text-gray-600" />
            </button>
            <button
              className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
              onClick={() => setModalIsOpen(true)}>
              <FaExpand size={18} className="text-gray-600" />
            </button>
          </div>
          
          {/* Panneau de filtre */}
          {isOpen && (
            <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
              <h4 className="font-semibold text-black">Filtrer par :</h4>
              <h4 className="font-semibold mt-2 text-black">Semaines :</h4>
              <div className="mb-2">
                <button
                  onClick={toggleSelectAll}
                  className={`text-xs px-2 py-1 rounded-md w-full ${
                    selectedWeeks.length === allWeeks.length
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
                >
                  {selectedWeeks.length === allWeeks.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
                {allWeeks.map(week => (
                  <div key={week} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedWeeks.includes(week)}
                      onChange={() =>
                        setSelectedWeeks(prev =>
                          prev.includes(week)
                            ? prev.filter(w => w !== week)
                            : [...prev, week]
                        )
                      }
                    />
                    <span className="text-black">Semaine {week}</span>
                  </div>
                ))}
              </div>
              <h4 className="font-semibold mt-4 text-black">Trier par :</h4>
              <select
                className="border mt-1 p-1 rounded-md w-full"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
              >
                <option value="desc">Décroissant</option>
                <option value="asc">Croissant</option>
              </select>
            </div>
          )}
        </div>

        {/* Indicateur de filtre actif */}
        {isFilterApplied() && (
          <div className="mb-3 text-sm text-blue-600 bg-blue-50 p-2 rounded">
            📊 Filtre actif - Affichage de tous les tickets correspondants ({filtered.length} ticket{filtered.length > 1 ? 's' : ''})
          </div>
        )}

        {/* Affichage du tableau */}
        <div className="flex-grow overflow-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-200 text-black">
                <th className="border p-2">ID Ticket</th>
                <th className="border p-2">Titre</th>
                <th className="border p-2">Délai (jours)</th>
                <th className="border p-2">Semaines d'apparition</th>
                <th className="border p-2">Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visibleTickets).map(ticket => (
                <tr key={ticket[idField]} className="hover:bg-gray-100 text-black">
                  <td className="border p-2">{ticket[idField]}</td>
                  <td className="border p-2">{ticket.titre_ticket}</td>
                  <td className="border p-2">{ticket.delay}</td>
                  <td className="border p-2">{ticket.semainesApparition}</td>
                  <td className="border p-2">
                    {editingComment && editingComment.id === ticket[idField] ? (
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
                            onClick={() => saveComment(ticket[idField], editingComment.text)}
                            disabled={commentSaving}
                          >
                            {commentSaving ? "..." : <><FaSave className="mr-1" /> Enregistrer</>}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div className="flex-grow">
                          {ticket.comment_en_cours || <span className="text-gray-400 italic">Aucun commentaire</span>}
                        </div>
                        <button 
                          className="text-blue-500 hover:text-blue-700 ml-2"
                          onClick={() => startEditingComment(ticket[idField], ticket.comment_en_cours)}
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

        {/* Boutons "Voir Plus/Moins" seulement quand aucun filtre n'est appliqué */}
        {!isFilterApplied() && (
          <div className="no-export flex justify-center space-x-3 mt-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300"
              onClick={() => setVisibleTickets((prev) => prev + 5)}
              disabled={visibleTickets >= filtered.length}
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
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-10/12 lg:w-10/12 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-black">
              Tickets en cours - Plus de une semaine ({filtered.length} ticket{filtered.length > 1 ? 's' : ''})
            </h3>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-200 text-black">
                  <th className="border p-2">ID Ticket</th>
                  <th className="border p-2">Titre</th>
                  <th className="border p-2">Délai (jours)</th>
                  <th className="border p-2">Semaines d'apparition</th>
                  <th className="border p-2">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ticket => (
                  <tr key={ticket[idField]} className="hover:bg-gray-100 text-black">
                    <td className="border p-2">{ticket[idField]}</td>
                    <td className="border p-2">{ticket.titre_ticket}</td>
                    <td className="border p-2">{ticket.delay}</td>
                    <td className="border p-2">{ticket.semainesApparition}</td>
                    <td className="border p-2">
                      {editingComment && editingComment.id === ticket[idField] ? (
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
                              onClick={() => saveComment(ticket[idField], editingComment.text)}
                              disabled={commentSaving}
                            >
                              {commentSaving ? "..." : <><FaSave className="mr-1" /> Enregistrer</>}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div className="flex-grow">
                            {ticket.comment_en_cours || <span className="text-gray-400 italic">Aucun commentaire</span>}
                          </div>
                          <button 
                            className="text-blue-500 hover:text-blue-700 ml-2"
                            onClick={() => startEditingComment(ticket[idField], ticket.comment_en_cours)}
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