"use client";

import { useEffect, useState } from "react";
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function NewsTickerRetard14() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetchWithAuth(
          `https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/fttb/data/`
        );
        const raw = await res.json();
        const now = new Date();
        
        // Regroupe les données pour chaque ticket
        const grouped = {};

        raw.forEach(ticket => {
          // On ne prend que les tickets en cours
          if (!ticket.date_sortie) {
            const id = ticket.id_ticket;
            const maj = new Date(ticket.date_derniere_maj);
            const delay = Math.ceil((now - maj) / (1000 * 60 * 60 * 24));

            if (!grouped[id]) {
              grouped[id] = {
                id_ticket: id,
                titre_ticket: ticket.compl_title,
                delay,
                last_maj: maj,
              };
            } else {
              // Met à jour le délai si on trouve une date plus récente
              if (maj > grouped[id].last_maj) {
                grouped[id].delay = delay;
                grouped[id].last_maj = maj;
              }
            }
          }
        });

        // Filtre sur les délais > 14
        const filtered = Object.values(grouped).filter(
          (ticket) => ticket.delay > 14
        );

        setTickets(filtered);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-4 rounded shadow">
        <p className="text-center text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white p-4 rounded shadow">
        <p className="text-center text-gray-500">
          Aucun ticket en retard de plus de 14 jours.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-200 py-4">
      {/* 
        Container centré, avec max-w pour limiter la taille.
        - max-w-7xl : limite à ~1280px de large
        - mx-auto : centre horizontalement
      */}
      <div className="max-w-7xl mx-auto overflow-hidden px-4">
        <div className="ticker-container relative w-full whitespace-nowrap">
          {/* L'animation s’applique sur ticker-content */}
          <div className="ticker-content inline-block animate-ticker">
            {/* Titre en premier */}
            <div className="ticker-item inline-block mx-8 font-bold text-blue-700 uppercase">
              Tickets en retard (+14j)
            </div>

            {tickets.map((ticket) => (
              <div
                key={ticket.id_ticket}
                className="ticker-item inline-block mx-8"
              >
                <span className="font-bold text-red-600">
                  {ticket.id_ticket}
                </span>
                {" - "}
                <span className="text-black font-medium">
                  {ticket.titre_ticket}
                </span>
                {" - "}
                <span className="text-gray-700">
                  Délai : {ticket.delay} jours
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Animation CSS */}
      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .animate-ticker {
          animation: ticker 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
