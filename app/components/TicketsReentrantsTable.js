"use client";

import { useState, useEffect, useRef } from "react";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand } from "react-icons/fa";
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

  // États pour la pagination de l'affichage
  const [visibleTickets, setVisibleTickets] = useState(5);

  // États de gestion des années
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  // État pour la gestion de l'agrandissement (modal)
  const [modalIsOpen, setModalIsOpen] = useState(false);

  /**
   * Fonction de traitement des tickets (calcul des itérations).
   */
  const processIterationData = (tickets) => {
    const processed = {};
    const cumulativeIterations = {};

    // Tri par semaine pour avoir un ordre cohérent.
    tickets
      .sort((a, b) => a.semaine - b.semaine)
      .forEach(ticket => {
        const ticketId = ticket.id_ticket;
        const week = ticket.semaine;

        if (!processed[ticketId]) {
          processed[ticketId] = {
            titre_ticket: ticket.compl_title,
            iterations: {},
            totalIterations: 0,
            semaineCounts: {},
          };
          cumulativeIterations[ticketId] = 0;
        }
        cumulativeIterations[ticketId] += 1;
        processed[ticketId].iterations[week] = cumulativeIterations[ticketId];
        processed[ticketId].totalIterations = cumulativeIterations[ticketId];
        processed[ticketId].semaineCounts[week] =
          (processed[ticketId].semaineCounts[week] || 0) + 1;
      });

    return Object.entries(processed)
      .map(([id, ticket]) => {
        const semainesApparition = Object.entries(ticket.semaineCounts)
          .map(([week, count]) => (count > 1 ? `${week}(${count})` : `${week}`))
          .join(", ");
        return {
          id_ticket: id,
          ...ticket,
          semainesApparition,
        };
      })
      .filter(ticket => ticket.totalIterations >= 2)
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
}, [apiUrl]); // Dépendance à apiUrl pour recharger les données si l'URL change

/**
 * Si le filtre global est appliqué (indiqué par globalModifiedAt),
 * on vide la sélection locale pour que le dernier filtre (global) prenne effet.
 */
useEffect(() => {
  if (globalModifiedAt > 0) {
    setSelectedWeeks([]);
  }
}, [globalModifiedAt]);

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

// Filtrage des données affichées en fonction de la sélection des semaines et de la recherche sur l'ID.
const filteredData = data.filter(ticket => {
  // Si aucune semaine n'est sélectionnée, pas de filtrage sur les semaines.
  if (selectedWeeks.length === 0) return true;

  // Récupère pour chaque ticket les itérations correspondant aux semaines sélectionnées.
  const validCounts = selectedWeeks
    .map(week => ticket.iterations[week])
    .filter(count => count !== undefined);

  if (validCounts.length === 0) return false;
  // Exclure le ticket s'il apparaît pour une semaine avec une itération unique.
  if (validCounts.some(count => count === 1)) return false;
  return true;
}).filter(ticket =>
  searchTicketId === "" || ticket.id_ticket.includes(searchTicketId)
);

// Bouton "Tout sélectionner / Tout désélectionner" pour les semaines disponibles.
const allWeeksSelected =
  allWeeks.length > 0 && allWeeks.every(week => selectedWeeks.includes(week));
const toggleSelectAll = () => {
  if (allWeeksSelected) {
    setSelectedWeeks([]);
  } else {
    setSelectedWeeks([...allWeeks]);
  }
};

// Gestion du changement individuel d'une semaine.
const handleWeekSelectionChange = (week) => {
  setSelectedWeeks(prev =>
    prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
  );
};

// Changement d'année.
const handleYearChange = (year) => {
  setSelectedYear(year);
  // Réinitialisation de la sélection locale à chaque changement d'année.
  setSelectedWeeks([]);
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
      <div className="absolute top-2 right-2 flex items-center space-x-2 z-50">
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

      <h3 className="text-lg font-semibold mb-3 text-black">
        {chartTitle}
      </h3>

      {/* Panneau des filtres */}
      {isOpen && (
        <div
          ref={filterPanelRef}
          className="absolute right-2 top-14 bg-white shadow-lg rounded-md p-4 w-64 z-50"
        >
          <h4 className="font-semibold text-black">Filtrer par :</h4>
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
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-center space-x-3 mt-4">
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