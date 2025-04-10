"use client";
import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import fetchWithAuth from "@/utils/fetchWithAuth";


export default function KPIBacklogJ1({ onComponentReady }) {
  const [currentValue, setCurrentValue] = useState(null);
  const [previousValue, setPreviousValue] = useState(null);
  const [difference, setDifference] = useState(null);
  const [percentage, setPercentage] = useState(null);
  const [hasNotifiedReady, setHasNotifiedReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/ftth/stock/");
        const json = await res.json();
        if (Array.isArray(json) && json.length > 1) {
          const sorted = json.sort((a, b) => new Date(b.date) - new Date(a.date));
          const latest = sorted[0];
          const previous = sorted[1];

          const latestVal = latest?.non_traite ?? 0;
          const previousVal = previous?.non_traite ?? 0;
          const diff = latestVal - previousVal;
          const pct = previousVal !== 0 ? (diff / previousVal) * 100 : 0;

          setCurrentValue(latestVal);
          setPreviousValue(previousVal);
          setDifference(diff);
          setPercentage(pct);

          if (!hasNotifiedReady && typeof onComponentReady === "function") {
            onComponentReady();
            setHasNotifiedReady(true);
          }
        }
      } catch (err) {
        console.error("Erreur KPIBacklogJ1:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [hasNotifiedReady, onComponentReady]);

  const isUp = difference !== null && difference > 0;
  const isDown = difference !== null && difference < 0;

  return (
    <motion.div
      id="kpi-backlog-j1"
      className="relative kpi-card bg-white rounded-lg shadow-md p-4 hover:shadow-xl transition-all duration-300"
      whileHover={{ scale: 1.05 }}
    >
      {/* Spinner de chargement */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg">
          <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm mt-2 text-blue-600 font-semibold">Chargement <span className="text-blue-400">MyIT</span>...</p>
        </div>
      )}

      <div className={loading ? "opacity-30 pointer-events-none select-none" : ""}>
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-gray-700 text-sm font-semibold">Backlog FTTH J-1</h3>
          {isUp ? (
            <TrendingUp className="text-green-500 w-5 h-5" />
          ) : isDown ? (
            <TrendingDown className="text-red-500 w-5 h-5" />
          ) : (
            <TrendingUp className="text-gray-400 w-5 h-5" />
          )}
        </div>
        <p className="text-3xl font-bold">{currentValue !== null ? currentValue : "--"}</p>
        {difference !== null && (
          <p className={`text-sm font-medium ${isUp ? "text-green-500" : isDown ? "text-red-500" : "text-gray-500"}`}>
            {isUp ? "+" : isDown ? "" : "±"}
            {Math.abs(percentage).toFixed(1)}% ({isUp ? "+" : isDown ? "-" : "±"}
            {Math.abs(difference)} commandes)
          </p>
        )}
      </div>
    </motion.div>
  );
}
