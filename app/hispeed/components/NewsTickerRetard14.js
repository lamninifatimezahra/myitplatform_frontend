"use client";

import { useEffect, useRef, useState } from "react";
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function NewsTickerRetard14() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentWidth, setContentWidth] = useState(0);

  // Références pour gérer le défilement au clic
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Récupération & regroupement des données
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetchWithAuth(
          `https://myit-backend-ed72239b4b8e.herokuapp.comherokuapp.com/dashboard/api/hispeed/data/`
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

  // Mesurer la largeur du contenu pour calculer la durée d'animation correcte
  useEffect(() => {
    if (contentRef.current && tickets.length > 0) {
      setContentWidth(contentRef.current.offsetWidth);
    }
  }, [tickets]);

  // Gestion du clic & glisser (drag to scroll)
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - (containerRef.current?.offsetLeft || 0));
    setScrollLeft(containerRef.current?.scrollLeft || 0);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const x = e.pageX - (containerRef.current?.offsetLeft || 0);
    const walk = x - startX; // distance parcourue par la souris
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

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

  // Calcul de la durée d'animation en fonction de la largeur du contenu
  // Nous fixons une vitesse constante à 100px par seconde
  const animationDuration = contentWidth / 100;

  return (
    <div className="w-full bg-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div
          className="ticker-container relative w-full whitespace-nowrap overflow-hidden group"
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {/* 
            Pour éviter les délais, nous dupliquons le contenu pour créer un effet de continuité
            La première copie défile depuis la droite, et la seconde est juste derrière
          */}
          <div 
            className="ticker-wrapper flex"
            style={{
              width: "max-content",
              animationDuration: `${animationDuration}s`,
              animationName: "continuous-ticker",
              animationTimingFunction: "linear",
              animationIterationCount: "infinite"
            }}
          >
            <div className="ticker-content inline-block" ref={contentRef}>
              <div className="ticker-item inline-block mx-8 font-bold text-blue-700 uppercase">
                Tickets +14j
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
            
            {/* Clone du contenu pour créer l'effet de continuité sans délai */}
            <div className="ticker-content inline-block">
              <div className="ticker-item inline-block mx-8 font-bold text-blue-700 uppercase">
                Tickets +14j
              </div>

              {tickets.map((ticket) => (
                <div
                  key={`clone-${ticket.id_ticket}`}
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
      </div>

      {/* Animations CSS modifiées */}
      <style jsx>{`
        @keyframes continuous-ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        /* Pause animation sur hover */
        .group:hover .ticker-wrapper {
          animation-play-state: paused !important;
        }
      `}</style>
    </div>
  );
}