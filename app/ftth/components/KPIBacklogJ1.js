"use client";
import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function KPIBacklogJ1({ onComponentReady }) {
  const [currentValue, setCurrentValue] = useState(0);
  const [previousValue, setPreviousValue] = useState(0);
  const [difference, setDifference] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [isPositive, setIsPositive] = useState(true); // ici, POSITIF = baisse (bon)
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetchWithAuth("https://myit-backend-its-c20c9354ce42.herokuapp.com/dashboard/api/ftth/stock/");
        const json = await res.json();

        if (Array.isArray(json) && json.length > 1) {
          const sorted = json.sort((a, b) => new Date(b.date) - new Date(a.date));
          const latest = sorted[0];
          const previous = sorted[1];

          const latestVal = latest?.non_traite ?? 0;
          const previousVal = previous?.non_traite ?? 0;
          const diff = latestVal - previousVal;
          const pct = previousVal !== 0 ? Math.round((diff / previousVal) * 100) : 100;

          setCurrentValue(latestVal);
          setPreviousValue(previousVal);
          setDifference(Math.abs(diff));
          setPercentage(Math.abs(pct));
          setIsPositive(diff < 0); // baisse = bon = vert

          if (!isReady && typeof onComponentReady === "function") {
            onComponentReady();
            setIsReady(true);
          }
        }
      } catch (err) {
        console.error("Erreur KPIBacklogJ1:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isReady, onComponentReady]);

  return (
    <motion.div
      id="kpi-backlog-j1"
      className="relative kpi-card bg-white rounded-lg shadow-md p-4 hover:shadow-xl transition-all duration-300"
      whileHover={{ scale: 1.05 }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 backdrop-blur-sm z-50 rounded-lg">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-blue-700 font-semibold">
              Chargement <span className="text-blue-500">MyIT</span>...
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-gray-700 text-sm font-semibold">Backlog FTTH J-1</h3>
        {isPositive ? (
          <TrendingDown className="text-green-500 w-5 h-5" />
        ) : (
          <TrendingUp className="text-red-500 w-5 h-5" />
        )}
      </div>

      <p className="text-3xl font-bold">{currentValue}</p>

      <p className={`text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}>
        {isPositive ? "-" : "+"}
        {percentage}% ({isPositive ? "-" : "+"}
        {difference} commandes)
      </p>
    </motion.div>
  );
}
