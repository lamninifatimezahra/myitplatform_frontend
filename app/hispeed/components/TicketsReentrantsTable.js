"use client";

import { useState, useEffect } from "react";
import { AiOutlineFilter } from "react-icons/ai";

export default function TicketsReentrantsTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [searchTicketId, setSearchTicketId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [visibleTickets, setVisibleTickets] = useState(5); // Nombre de tickets visibles

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("http://127.0.0.1:8000/dashboard/api/hispeed/data/");
        const result = await response.json();
        setData(processIterationData(result));
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du fetch des données :", error);
      }
    }
    fetchData();
  }, []);

  // 📌 Fonction pour traiter les réitérations et stocker les itérations cumulées
  const processIterationData = (tickets) => {
    const processed = {};
    const cumulativeIterations = {}; // Stocke l'itération cumulée de chaque ticket

    tickets
      .sort((a, b) => a.semaine - b.semaine) // Trier les tickets par semaine croissante
      .forEach(ticket => {
        const ticketId = ticket.id_ticket;
        const week = ticket.semaine;

        if (!processed[ticketId]) {
          processed[ticketId] = {
            titre_ticket: ticket.compl_title,
            iterations: {},
            totalIterations: 0, // Stocke le total d'itérations
            semainesApparition: [],
          };
          cumulativeIterations[ticketId] = 0; // Initialiser l'itération cumulée
        }

        cumulativeIterations[ticketId] += 1; // Ajouter une itération cumulée

        // Stocker la valeur cumulée pour cette semaine
        processed[ticketId].iterations[week] = cumulativeIterations[ticketId];
        processed[ticketId].totalIterations = cumulativeIterations[ticketId]; // Mettre à jour total

        if (!processed[ticketId].semainesApparition.includes(week)) {
          processed[ticketId].semainesApparition.push(week);
        }
      });

    return Object.entries(processed)
      .map(([id, data]) => ({ id_ticket: id, ...data }))
      .filter(ticket => ticket.totalIterations >= 2) // Garde uniquement les tickets avec au moins 2 itérations
      .sort((a, b) => b.totalIterations - a.totalIterations); // Trie en ordre descendant
  };

  if (loading) {
    return <p className="text-center text-gray-500">Chargement des données...</p>;
  }

  // 📌 Récupérer toutes les semaines disponibles
  const allWeeks = [...new Set(data.flatMap(ticket => Object.keys(ticket.iterations).map(Number)))].sort((a, b) => a - b);

  // 📌 Filtrer les tickets selon les semaines sélectionnées et l'ID recherché
  const filteredData = data.filter(ticket =>
    (selectedWeeks.length === 0 || selectedWeeks.some(week => ticket.iterations[week])) &&
    (searchTicketId === "" || ticket.id_ticket.includes(searchTicketId))
  );

  return (
    <div className="relative bg-white p-5 shadow-md rounded-lg w-full">
      <h3 className="text-lg font-semibold mb-3 text-black">Détail des Itérations des Tickets</h3>

      {/* 📌 Bouton de filtre */}
      <button className="absolute top-2 right-2 bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
        onClick={() => setIsOpen(!isOpen)}>
        <AiOutlineFilter size={20} className="text-gray-500" />
      </button>

      {/* 📌 Filtre Popup */}
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
          <h4 className="font-semibold text-black">Filtrer par :</h4>

          {/* 📌 Recherche par ID Ticket */}
          <input 
            type="text" 
            placeholder="Rechercher ID Ticket..."
            className="border p-2 w-full rounded-md mt-2"
            value={searchTicketId}
            onChange={(e) => setSearchTicketId(e.target.value)}
          />

          {/* 📌 Sélection des semaines */}
          <h4 className="font-semibold mt-2 text-black">Semaines :</h4>
          <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
            {allWeeks.map(week => (
              <div key={week} className="flex items-center space-x-2">
                <input type="checkbox" checked={selectedWeeks.includes(week)}
                  onChange={() => setSelectedWeeks(prev =>
                    prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
                  )}
                />
                <span className="text-black">Semaine {week}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📌 Tableau */}
      <table className="w-full border-collapse border border-gray-300 mt-4 text-sm">
        <thead>
          <tr className="bg-gray-200 text-black">
            <th className="border p-2">ID Ticket</th>
            <th className="border p-2">Titre du Ticket</th>
            {allWeeks.map(week => selectedWeeks.includes(week) && (
              <th key={week} className="border p-2">Semaine {week}</th>
            ))}
            <th className="border p-2">Semaines d'Apparition</th>
            <th className="border p-2">Total Itérations</th>
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
              <td className="border p-2">{ticket.semainesApparition.length > 0 ? ticket.semainesApparition.join(", ") : "-"}</td>
              <td className="border p-2">{ticket.totalIterations}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 📌 Boutons de pagination */}
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
  );
}
