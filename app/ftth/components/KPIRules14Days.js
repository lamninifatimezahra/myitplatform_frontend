"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function KPIManuelData7Days({
  onComponentReady,
  apiUrl = "https://api.606510.xyz/dashboard/api/manuel/data/",
  delayThreshold = 7,
}) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const readySentRef = useRef(false);

  // Fonction pour calculer le délai en jours
  const calculateDelayDays = (depuisDate) => {
    const depuis = new Date(depuisDate);
    const today = new Date();
    const diffTime = today - depuis;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await fetchWithAuth(apiUrl);
        if (!res?.ok) throw new Error(`HTTP ${res?.status ?? "??"}`);
        const data = await res.json();
        
        // Compter les commandes qui ont dépassé le délai de 7 jours
        let countOverDelay = 0;
        (Array.isArray(data) ? data : []).forEach((item) => {
          if (item?.depuis) {
            const delayDays = calculateDelayDays(item.depuis);
            if (delayDays > delayThreshold) {
              countOverDelay++;
            }
          }
        });

        if (alive) setCount(countOverDelay);
      } catch {
        if (alive) setError("Impossible de charger les données manuelles (réseau/CORS/API).");
      } finally {
        if (alive) {
          setLoading(false);
          if (!readySentRef.current && typeof onComponentReady === "function") {
            readySentRef.current = true; onComponentReady();
          }
        }
      }
    })();
    return () => { alive = false; };
  }, [apiUrl, delayThreshold]);

  const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString("fr-FR") : "—");

  if (loading) {
    return (
      <div className="visualisation relative w-64" data-id="kpi-manuel-7j">
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <h3 className="text-gray-800 text-lg font-medium">Commandes +Semaine</h3>
          <div className="flex items-center justify-center w-full mt-4">
            <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="visualisation relative w-64" data-id="kpi-manuel-7j">
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <h3 className="text-gray-800 text-lg font-medium">Commandes +Semaine</h3>
          <p className="text-red-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      id="kpi-manuel-7j"
      className="visualisation relative w-64"
      data-id="kpi-manuel-7j"
      data-graph-label="Dossiers Manuels (+7j)"
      whileHover={{ scale: 1.05 }}
    >
      <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
        <div className="flex justify-between items-start w-full mb-2">
          <h3 className="text-gray-800 text-lg font-medium">Commandes +Semaine</h3>
          <AlertTriangle className="w-5 h-5 text-gray-800" />
        </div>
               
        <p className="text-3xl font-bold text-red-600">
          {fmt(count)}
        </p>
      </div>
    </motion.div>
  );
}