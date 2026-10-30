"use client";

import { useEffect, useState, useRef } from "react";
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function NewsTickerManuelData() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [animationState, setAnimationState] = useState({ play: true, position: 0 });

  const tickerRef = useRef(null);
  const containerRef = useRef(null);

  const apiUrl = "https://api.606510.xyz/dashboard/api/manuel/data/";

  // Fonction pour calculer le délai en jours
  const calculateDelayDays = (depuisDate) => {
    const depuis = new Date(depuisDate);
    const today = new Date();
    const diffTime = today - depuis;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetchWithAuth(apiUrl);
        const data = await res.json();

        // Transformer les données selon le format demandé: 'id_dossier' : "consigne" + Délai
        const transformedData = data.map((item) => {
          const delayDays = calculateDelayDays(item.depuis);
          return {
            id_dossier: item.id_dossier,
            consigne: item.consigne,
            delai: delayDays,
            date: new Date(item.depuis),
            displayText: `${item.id_dossier}: ${item.consigne} (Délai: ${delayDays} jours)`
          };
        });

        // Trier par délai décroissant (délai le plus grand en premier)
        const sorted = transformedData.sort((a, b) => b.delai - a.delai);
        setRules(sorted);
      } catch (err) {
        console.error("Erreur API Manuel Data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleMouseDown = (e) => {
    if (isPaused) {
      setIsDragging(true);
      setDragStartX(e.clientX);
      if (tickerRef.current) {
        const matrix = new DOMMatrix(window.getComputedStyle(tickerRef.current).getPropertyValue("transform"));
        tickerRef.current.style.transform = `translateX(${matrix.m41}px)`;
        setAnimationState({ play: false, position: matrix.m41 || 0 });
      }
      containerRef.current.style.cursor = "grabbing";
    }
  };

  const handleMouseEnter = () => {
    setIsPaused(true);
    if (tickerRef.current) {
      const matrix = new DOMMatrix(window.getComputedStyle(tickerRef.current).getPropertyValue("transform"));
      setAnimationState((prev) => ({ ...prev, position: matrix.m41 || 0 }));
    }
    containerRef.current.style.cursor = "grab";
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setIsPaused(false);
      containerRef.current.style.cursor = "default";
    }
    if (isDragging) setIsDragging(false);
  };

  const handleMove = (e) => {
    if (isDragging && tickerRef.current) {
      const deltaX = e.clientX - dragStartX;
      setDragStartX(e.clientX);
      const newPosition = animationState.position + deltaX;
      tickerRef.current.style.transform = `translateX(${newPosition}px)`;
      setAnimationState((prev) => ({ ...prev, position: newPosition }));
    }
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", () => {
      if (isDragging) {
        setIsDragging(false);
        containerRef.current.style.cursor = "grab";
      }
    });
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", () => {});
    };
  }, [isDragging, dragStartX, animationState]);

  const createContinuousTicker = () => (
    <>
      {rules.concat(rules).map((item, index) => (
        <div
          key={index}
          className="inline-block mx-6 text-xs sm:text-sm md:text-base whitespace-nowrap"
        >
          <span className="font-semibold text-blue-600">{item.id_dossier}</span>
          {" : "}
          <span className="text-gray-700">{item.consigne}</span>
          <span className="ml-2 font-medium text-orange-600">
            (Délai: {item.delai} jour{item.delai > 1 ? 's' : ''})
          </span>
        </div>
      ))}
    </>
  );

  if (loading) {
    return (
      <div
        className="w-full shadow text-center text-gray-500 text-sm"
        style={{
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        Chargement des données manuelles...
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div
        className="w-full shadow text-center text-gray-400 text-sm"
        style={{
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
        }}
      >
        Aucune donnée manuelle enregistrée
      </div>
    );
  }

  return (
    <div
      className="w-full h-[44px] border-y border-gray-200 shadow-sm relative overflow-hidden flex items-center bg-white/10 backdrop-blur-sm"
    >
      <div
        ref={containerRef}
        className="absolute w-full h-full left-0 top-0 px-4 sm:px-6 overflow-hidden flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
      >
        <div
          ref={tickerRef}
          className={`ticker-content inline-block whitespace-nowrap transition-transform duration-200 ${
            isPaused ? "animate-none" : "animate-ticker"
          }`}
          style={{
            transform: isPaused ? `translateX(${animationState.position}px)` : undefined,
            touchAction: "none",
          }}
        >
          <div className="inline-flex items-center gap-3 text-sm font-medium text-gray-800">
            <span className="text-red-600 font-bold">📋 Dossiers Manuels :</span>
            {createContinuousTicker()}
          </div>
        </div>

        {isPaused && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold shadow">
            Glissez pour naviguer
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          animation: ticker 2500s linear infinite;
        }
        .animate-none {
          animation: none !important;
        }
        .ticker-content {
          will-change: transform;
          user-select: none;
        }
      `}</style>
    </div>
  );
}