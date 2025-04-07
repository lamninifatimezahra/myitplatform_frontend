"use client";

import { useEffect, useState } from "react";
import { AiOutlineFilter } from "react-icons/ai";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useExport } from "./ExportContext"; // adapte le chemin si nécessaire

export default function TicketsEnCoursTable() {
  const id = "tickets-en-cours";
  const { selectedIds, toggleId } = useExport();

  const [tickets, setTickets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [allWeeks, setAllWeeks] = useState([]);
  const [sortOrder, setSortOrder] = useState("desc");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/api/dsl/data/`);
      const raw = await res.json();
      const now = new Date();
      const grouped = {};

      raw.forEach(ticket => {
        if (!ticket.date_sortie) {
          const id = ticket.id_ticket;
          const week = ticket.semaine;
          const maj = new Date(ticket.date_derniere_maj);
          const delay = Math.ceil((now - maj) / (1000 * 60 * 60 * 24));

          if (!grouped[id]) {
            grouped[id] = {
              id_ticket: id,
              titre_ticket: ticket.compl_title,
              delay,
              last_maj: maj,
              semaineCounts: { [week]: 1 },
              semaines: [week],
            };
          } else {
            if (maj > grouped[id].last_maj) {
              grouped[id].delay = delay;
              grouped[id].last_maj = maj;
            }
            grouped[id].semaineCounts[week] = (grouped[id].semaineCounts[week] || 0) + 1;
            if (!grouped[id].semaines.includes(week)) {
              grouped[id].semaines.push(week);
            }
          }
        }
      });

      const final = Object.values(grouped)
        .filter(t => t.delay > 14)
        .map(t => {
          return {
            ...t,
            semainesApparition: Object.entries(t.semaineCounts)
              .map(([w, c]) => (c > 1 ? `${w}(${c})` : w))
              .join(", ")
          };
        });

      const weeks = [...new Set(final.flatMap(t => t.semaines))].sort((a, b) => a - b);
      setAllWeeks(weeks);
      setTickets(final);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = tickets;
    if (selectedWeeks.length > 0) {
      filtered = filtered.filter(t => t.semaines.some(w => selectedWeeks.includes(w)));
    }
    filtered = [...filtered].sort((a, b) => {
      return sortOrder === "asc" ? a.delay - b.delay : b.delay - a.delay;
    });
    setFiltered(filtered);
  }, [tickets, selectedWeeks, sortOrder]);

  if (loading) return <p className="text-center text-gray-500">Chargement...</p>;

  return (
    <div className="visualisation relative" data-id={id}>
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full">
        {/* ✅ Coin supérieur droit */}
        <div className="absolute top-2 right-2 flex items-center space-x-2 z-50">
          <button
            className="bg-gray-300 p-2 rounded-full hover:bg-gray-400"
            onClick={() => setIsOpen(!isOpen)}
          >
            <AiOutlineFilter size={20} className="text-gray-600" />
          </button>

        </div>

        <h3 className="text-lg font-semibold mb-3 text-black">Tickets en cours - Plus de 2 semaines</h3>

        {isOpen && (
          <div className="absolute right-2 top-14 bg-white shadow-lg rounded-md p-4 w-64 z-50">
            <h4 className="font-semibold text-black">Filtrer par :</h4>
            <h4 className="font-semibold mt-2 text-black">Semaines :</h4>
            <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
              {allWeeks.map(week => (
                <div key={week} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedWeeks.includes(week)}
                    onChange={() => setSelectedWeeks(prev =>
                      prev.includes(week)
                        ? prev.filter(w => w !== week)
                        : [...prev, week]
                    )}
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

        <table className="w-full border-collapse border border-gray-300 mt-4 text-sm">
          <thead>
            <tr className="bg-gray-200 text-black">
              <th className="border p-2">ID Ticket</th>
              <th className="border p-2">Titre</th>
              <th className="border p-2">Délai (jours)</th>
              <th className="border p-2">Semaines d'apparition</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, visibleCount).map(ticket => (
              <tr key={ticket.id_ticket} className="hover:bg-gray-100 text-black">
                <td className="border p-2">{ticket.id_ticket}</td>
                <td className="border p-2">{ticket.titre_ticket}</td>
                <td className="border p-2">{ticket.delay}</td>
                <td className="border p-2">{ticket.semainesApparition}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-center space-x-3 mt-4">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300"
            onClick={() => setVisibleCount(prev => prev + 5)}
            disabled={visibleCount >= filtered.length}
          >
            Voir Plus
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-gray-300"
            onClick={() => setVisibleCount(prev => Math.max(5, prev - 5))}
            disabled={visibleCount <= 5}
          >
            Voir Moins
          </button>
        </div>
      </div>
    </div>
  );
}
