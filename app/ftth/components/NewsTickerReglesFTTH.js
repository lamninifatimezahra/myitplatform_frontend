"use client";

import { useEffect, useState, useRef } from "react";
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function NewsTickerReglesFTTH() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [animationState, setAnimationState] = useState({ play: true, position: 0 });

  const tickerRef = useRef(null);
  const containerRef = useRef(null);

  const apiUrl = "https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/ftth/regle/";

  useEffect(() => {
    async function fetchData() {
      try {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 14);
        const iso = sinceDate.toISOString().split("T")[0];

        const res = await fetchWithAuth(`${apiUrl}?since=${iso}`);
        const data = await res.json();

        const map = new Map();
        data.forEach((item) => {
          const key = `${item.regle}::${item.consigne}`;
          if (!map.has(key)) {
            map.set(key, {
              rule: item.regle,
              consigne: item.consigne,
              date: new Date(item.date || item.created_at),
            });
          }
        });

        const sorted = [...map.values()].sort((a, b) => b.date - a.date);
        setRules(sorted);
      } catch (err) {
        console.error("Erreur API FTTH:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    const handleMove = (e) => {
      if (isDragging && tickerRef.current) {
        const deltaX = e.clientX - dragStartX;
        setDragStartX(e.clientX);
        const newPosition = animationState.position + deltaX;
        tickerRef.current.style.transform = `translateX(${newPosition}px)`;
        setAnimationState((prev) => ({ ...prev, position: newPosition }));
      }
    };
    const handleUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (containerRef.current) containerRef.current.style.cursor = "grab";
      }
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, dragStartX, animationState]);

  const handleMouseDown = (e) => {
    if (isPaused) {
      setIsDragging(true);
      setDragStartX(e.clientX);
      if (tickerRef.current) {
        tickerRef.current.style.animation = "none";
        void tickerRef.current.offsetWidth;
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
      tickerRef.current.style.animationPlayState = "paused";
      setAnimationState((prev) => ({ ...prev, position: matrix.m41 || 0 }));
    }
    if (containerRef.current) containerRef.current.style.cursor = "grab";
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setIsPaused(false);
      if (tickerRef.current) {
        tickerRef.current.style.animation = `ticker ${Math.max(180, rules.length * 9)}s linear infinite`;
        tickerRef.current.style.transform = "";
        tickerRef.current.style.animationPlayState = "running";
        setAnimationState((prev) => ({ ...prev, play: true }));
      }
      if (containerRef.current) containerRef.current.style.cursor = "default";
    }
    if (isDragging) setIsDragging(false);
  };

  const createContinuousTicker = () => (
    <>
      {rules.map((item, index) => (
        <div key={`r1-${index}`} className="inline-block mx-12 text-sm">
          <span className="font-bold text-red-600">{item.rule}</span>
          {item.consigne && (
            <>
              {" – "}
              <span className="text-black">{item.consigne}</span>
            </>
          )}
        </div>
      ))}
      {rules.map((item, index) => (
        <div key={`r2-${index}`} className="inline-block mx-12 text-sm">
          <span className="font-bold text-red-600">{item.rule}</span>
          {item.consigne && (
            <>
              {" – "}
              <span className="text-black">{item.consigne}</span>
            </>
          )}
        </div>
      ))}
    </>
  );

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500">
        Chargement des règles FTTH...
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400">
        Aucune règle FTTH enregistrée
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-100 py-4 shadow">
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
            animation: `ticker ${Math.max(180, rules.length * 9)}s linear infinite`,
            animationPlayState: isPaused ? "paused" : "running",
            touchAction: "none",
          }}
        >
          {createContinuousTicker()}
        </div>

        {isPaused && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
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
        .ticker-content {
          will-change: transform;
          user-select: none;
        }
      `}</style>
    </div>
  );
}