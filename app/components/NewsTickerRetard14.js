"use client";

import { useEffect, useState, useRef } from "react";
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function NewsTickerRetard({
  apiUrl, // URL de l'API requise sans valeur par défaut
  title = "Tickets en retard (+14j)",
  dateSortieField = "date_sortie",
  dateDerniereMajField = "date_derniere_maj",
  idField = "id_ticket",
  titreField = "compl_title",
  retardDays = 14,
  animationDuration = 40
}) {
  // Déclaration de tous les états au début de la fonction
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [animationState, setAnimationState] = useState({
    play: true,
    position: 0
  });
  
  // Toutes les références
  const tickerRef = useRef(null);
  const containerRef = useRef(null);

  // Premier useEffect pour charger les données
  useEffect(() => {
    async function fetchData() {
      // Vérifier que l'URL de l'API est fournie
      if (!apiUrl) {
        setError("L'URL de l'API est requise");
        setLoading(false);
        return;
      }

      try {
        const res = await fetchWithAuth(apiUrl);
        const raw = await res.json();
        const now = new Date();
        
        // Regroupe les données pour chaque ticket
        const grouped = {};

        if (!raw || raw.length === 0) {
          setTickets([]);
          setLoading(false);
          return;
        }

        raw.forEach(ticket => {
          // On ne prend que les tickets en cours
          if (!ticket[dateSortieField]) {
            const id = ticket[idField];
            // Vérification que les champs existent
            if (!id || !ticket[dateDerniereMajField]) return;
            
            const maj = new Date(ticket[dateDerniereMajField]);
            const delay = Math.ceil((now - maj) / (1000 * 60 * 60 * 24));

            if (!grouped[id]) {
              grouped[id] = {
                id_ticket: id,
                titre_ticket: ticket[titreField] || "Sans titre",
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

        // Filtre sur les délais > retardDays
        const filtered = Object.values(grouped).filter(
          (ticket) => ticket.delay > retardDays
        );

        setTickets(filtered);
        setLoading(false);
        setError(null);
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
        setError("Erreur lors du chargement des données");
        setLoading(false);
      }
    }

    fetchData();
  }, [apiUrl, dateSortieField, dateDerniereMajField, idField, titreField, retardDays]);

  // Deuxième useEffect pour la gestion des événements globaux
  useEffect(() => {
    // Gestionnaires d'événements globaux pour capturer les mouvements même hors du composant
    const handleGlobalMouseMove = (e) => {
      if (isDragging && tickerRef.current) {
        const deltaX = e.clientX - dragStartX;
        setDragStartX(e.clientX); // Mettre à jour la position de départ pour le prochain mouvement
        
        // Calculer et appliquer la nouvelle position
        const newPosition = animationState.position + deltaX;
        tickerRef.current.style.transform = `translateX(${newPosition}px)`;
        
        // Mettre à jour l'état pour suivre la position actuelle
        setAnimationState(prev => ({
          ...prev,
          position: newPosition
        }));
      }
    };
    
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        
        // Remettre le curseur en mode "grab"
        if (containerRef.current) {
          containerRef.current.style.cursor = 'grab';
        }
      }
    };
    
    // Ajouter les écouteurs d'événements au document
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    // Nettoyer les écouteurs d'événements
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStartX, animationState]);

  // Gestionnaire pour le début du glissement
  const handleMouseDown = (e) => {
    if (isPaused) {
      setIsDragging(true);
      setDragStartX(e.clientX);
      
      // Arrêter l'animation CSS et capturer la position actuelle
      if (tickerRef.current) {
        // Désactiver d'abord l'animation
        tickerRef.current.style.animation = 'none';
        
        // Forcer un reflow pour appliquer le changement d'animation
        void tickerRef.current.offsetWidth;
        
        // Obtenir la position actuelle
        const computedStyle = window.getComputedStyle(tickerRef.current);
        const transform = computedStyle.getPropertyValue('transform');
        const matrix = new DOMMatrix(transform);
        const currentPosition = matrix.m41 || 0;
        
        // Définir la position initiale pour le glisser-déposer
        tickerRef.current.style.transform = `translateX(${currentPosition}px)`;
        
        setAnimationState(prev => ({
          ...prev,
          position: currentPosition
        }));
      }
      
      // Changer le curseur pour indiquer qu'on peut tirer
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing';
      }
    }
  };

  // Gestionnaire pour la pause au survol
  const handleMouseEnter = () => {
    setIsPaused(true);
    if (tickerRef.current) {
      // Capturer la position actuelle et mettre en pause
      const computedStyle = window.getComputedStyle(tickerRef.current);
      const transform = computedStyle.getPropertyValue('transform');
      const matrix = new DOMMatrix(transform);
      
      // Mettre l'animation en pause
      tickerRef.current.style.animationPlayState = 'paused';
      
      setAnimationState({
        play: false,
        position: matrix.m41 || 0
      });
    }
    
    // Changer le curseur en mode "grab"
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  // Gestionnaire pour la sortie de la souris
  const handleMouseLeave = () => {
    if (!isDragging) {
      setIsPaused(false);
      
      if (tickerRef.current) {
        // Réinitialiser les styles CSS
        tickerRef.current.style.animation = `ticker ${animationDuration}s linear infinite`;
        tickerRef.current.style.transform = '';
        
        // Reprendre l'animation
        tickerRef.current.style.animationPlayState = 'running';
        
        setAnimationState(prev => ({
          ...prev,
          play: true
        }));
      }
      
      // Réinitialiser le curseur
      if (containerRef.current) {
        containerRef.current.style.cursor = 'default';
      }
    }
    
    // Si on est en train de glisser, on termine le glissement à la sortie
    if (isDragging) {
      setIsDragging(false);
    }
  };

  // Fonction pour créer un effet de ticker continu
  const createContinuousTicker = () => {
    // Dupliquer tous les tickets pour créer un effet continu
    return (
      <>
        {/* Première copie */}
        <div className="ticker-item inline-block mx-8 font-bold text-blue-700 uppercase">
          {title}
        </div>
        {tickets.map((ticket) => (
          <div
            key={`first-${ticket.id_ticket}`}
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
        
        {/* Deuxième copie pour assurer la continuité */}
        <div className="ticker-item inline-block mx-8 font-bold text-blue-700 uppercase">
          {title}
        </div>
        {tickets.map((ticket) => (
          <div
            key={`second-${ticket.id_ticket}`}
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
      </>
    );
  };

  // Conditions de rendu pour les différents états
  if (loading) {
    return (
      <div className="bg-white p-4 rounded shadow">
        <p className="text-center text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded shadow">
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white p-4 rounded shadow">
        <p className="text-center text-gray-500">
          Aucun élément en retard de plus de {retardDays} jours.
        </p>
      </div>
    );
  }

  // Rendu principal
  return (
    <div className="w-full bg-gray-200 py-4">
      <div 
        ref={containerRef}
        className="max-w-7xl mx-auto overflow-hidden relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
      >
        <div 
          ref={tickerRef}
          className="ticker-content inline-block whitespace-nowrap"
          style={{ 
            animation: `ticker ${animationDuration}s linear infinite`,
            animationPlayState: isPaused ? 'paused' : 'running',
            touchAction: 'none' // Désactiver les actions tactiles par défaut
          }}
        >
          {createContinuousTicker()}
        </div>
        
        {/* Indicateur de défilement */}
        {isPaused && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
            Glissez pour naviguer
          </div>
        )}
      </div>

      {/* Animation CSS */}
      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .ticker-content {
          will-change: transform;
          user-select: none;
        }
      `}</style>
    </div>
  );
}