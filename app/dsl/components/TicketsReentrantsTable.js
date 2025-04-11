"use client";

import { useState, useEffect } from "react";
import { AiOutlineFilter } from "react-icons/ai";
import { useExport } from "./ExportContext";
import fetchWithAuth from "@/utils/fetchWithAuth";


export default function TicketsReentrantsTable() {
  const id = "Détail des Réitérations des Tickets";
  const { selectedIds, toggleId } = useExport();

  // Stockage des données brutes et des données traitées (par année)
  const [rawData, setRawData] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // États pour le filtrage
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [searchTicketId, setSearchTicketId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [visibleTickets, setVisibleTickets] = useState(5);

  // Nouveaux états pour la gestion des années
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);

  // Fonction de traitement des tickets (calcul des itérations)
  const processIterationData = (tickets) => {
    const processed = {};
    const cumulativeIterations = {};

    // Tri par semaine pour garantir un ordre cohérent
    tickets.sort((a, b) => a.semaine - b.semaine).forEach(ticket => {
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
      processed[ticketId].semaineCounts[week] = (processed[ticketId].semaineCounts[week] || 0) + 1;
    });

    return Object.entries(processed).map(([id, ticket]) => {
      const semainesApparition = Object.entries(ticket.semaineCounts)
        .map(([week, count]) => count > 1 ? `${week}(${count})` : `${week}`)
        .join(", ");
      return {
        id_ticket: id,
        ...ticket,
        semainesApparition,
      };
    }).filter(ticket => ticket.totalIterations >= 2)
      .sort((a, b) => b.totalIterations - a.totalIterations);
  };

  // Récupération initiale des données et extraction des années disponibles
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/dsl/data/");
        const result = await response.json();
        setRawData(result);

        // Extraction des années depuis la date de dernière mise à jour
        const years = [...new Set(result.map(ticket => new Date(ticket.date_derniere_maj).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du fetch des données :", error);
      }
    }
    fetchData();
  }, []);

  // Recalcule des données traitées lorsque rawData ou selectedYear change
  useEffect(() => {
    if (rawData.length > 0 && selectedYear) {
      const ticketsForYear = rawData.filter(ticket => new Date(ticket.date_derniere_maj).getFullYear() === selectedYear);
      const processed = processIterationData(ticketsForYear);
      setData(processed);

      // Mise à jour des semaines disponibles pour l'année sélectionnée
      const weeks = [...new Set(ticketsForYear.map(ticket => ticket.semaine))].sort((a, b) => a - b);
      setSelectedWeeks(weeks.slice(-5));
    }
  }, [rawData, selectedYear]);

  // Calcul des semaines disponibles (à partir des tickets de l'année sélectionnée)
  const allWeeks = (() => {
    if (!rawData.length || !selectedYear) return [];
    const weeks = rawData
      .filter(ticket => new Date(ticket.date_derniere_maj).getFullYear() === selectedYear)
      .map(ticket => ticket.semaine);
    return [...new Set(weeks)].sort((a, b) => a - b);
  })();

  // Filtrage des données selon les semaines sélectionnées et la recherche sur l'ID du ticket
  const filteredData = data.filter(ticket =>
    (selectedWeeks.length === 0 || selectedWeeks.some(week => ticket.iterations[week])) &&
    (searchTicketId === "" || ticket.id_ticket.includes(searchTicketId))
  );

  // Bouton "Tout sélectionner / Tout désélectionner" pour les semaines de l'année sélectionnée
  const allWeeksSelected = allWeeks.length > 0 && allWeeks.every(week => selectedWeeks.includes(week));
  const toggleSelectAll = () => {
    if (allWeeksSelected) {
      setSelectedWeeks([]);
    } else {
      setSelectedWeeks([...allWeeks]);
    }
  };

  // Gestion du changement d'une semaine
  const handleWeekSelectionChange = (week) => {
    setSelectedWeeks(prev =>
      prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
    );
  };

  // Gestion du changement d'année
  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  if (loading) return <p className="text-center text-gray-500">Chargement des données...</p>;

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full">
        {/* Coin supérieur droit */}
        <div className="absolute top-2 right-2 flex items-center space-x-2 z-50">
          <button
            className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
            onClick={() => setIsOpen(!isOpen)}
          >
            <AiOutlineFilter size={20} className="text-gray-600" />
          </button>
        </div>

        <h3 className="text-lg font-semibold mb-3 text-black">Détail des Itérations des Tickets</h3>

        {/* Popup filtres */}
        {isOpen && (
          <div className="absolute right-2 top-14 bg-white shadow-lg rounded-md p-4 w-64 z-50">
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
              {allWeeks.map(week => (
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

        <table className="w-full border-collapse border border-gray-300 mt-4 text-sm">
          <thead>
            <tr className="bg-gray-200 text-black">
              <th className="border p-2">ID Ticket</th>
              <th className="border p-2">Titre du Ticket</th>
              {allWeeks.map(week => selectedWeeks.includes(week) && (
                <th key={week} className="border p-2">Semaine {week}</th>
              ))}
<th className="border p-2">Semaines d&apos;Apparition</th>
<th className="border p-2">Total Réitérations</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, visibleTickets).map(ticket => (
              <tr key={ticket.id_ticket} className="hover:bg-gray-100 text-black">
                <td className="border p-2">{ticket.id_ticket}</td>
                <td className="border p-2">{ticket.titre_ticket}</td>
                {allWeeks.map(week => selectedWeeks.includes(week) && (
                  <td key={week} className="border p-2">
                    {ticket.iterations[week] ? ticket.iterations[week] : ""}
                  </td>
                ))}
                <td className="border p-2">{ticket.semainesApparition}</td>
                <td className="border p-2">{ticket.totalIterations}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-center space-x-3 mt-4">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300"
            onClick={() => setVisibleTickets(prev => prev + 5)}
            disabled={visibleTickets >= filteredData.length}
          >
            Voir Plus
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-gray-300"
            onClick={() => setVisibleTickets(prev => Math.max(5, prev - 5))}
            disabled={visibleTickets <= 5}
          >
            Voir Moins
          </button>
        </div>
      </div>
    </div>
  );
}
