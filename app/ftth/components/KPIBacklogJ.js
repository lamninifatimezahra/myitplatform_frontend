"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function KPIBacklogJ({ onComponentReady }) {
  const [todayValue, setTodayValue] = useState(0);
  const [yesterdayValue, setYesterdayValue] = useState(0);
  const [diff, setDiff] = useState(0);
  const [percent, setPercent] = useState(0);
  const [isPositive, setIsPositive] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const res = await fetchWithAuth("https://api.606510.xyz/dashboard/api/ftth/stock/");
        const data = await res.json();

        const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        const last = sorted[0];
        const prev = sorted[1];

        const v1 = last?.stock || 0;
        const v2 = prev?.stock || 0;
        const d = v1 - v2;
        const p = v2 !== 0 ? Math.round((d / v2) * 100) : 100;

        setTodayValue(v1);
        setYesterdayValue(v2);
        setDiff(Math.abs(d));
        setPercent(Math.abs(p));
        setIsPositive(d >= 0);

        if (!isReady && typeof onComponentReady === "function") {
          onComponentReady();
          setIsReady(true);
        }
      } catch (err) {
        console.error("Erreur KPI Backlog J", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, [isReady, onComponentReady]);

  return (
    <motion.div
      id="kpi-backlog-j"
      className="relative kpi-card bg-white rounded-lg shadow-md p-4 hover:shadow-xl transition-all duration-300"
      whileHover={{ scale: 1.05 }}
    >
      {/* Chargement */}
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

      {/* Contenu */}
      <div className="flex justify-between items-center">
        <h3 className="text-gray-700 text-sm font-semibold">Backlog FTTH J</h3>
        {isPositive ? (
          <TrendingUp className="text-gray-400 w-5 h-5" />
        ) : (
          <TrendingDown className="text-gray-400 w-5 h-5" />
        )}
      </div>

      <p className="text-3xl font-bold">{todayValue}</p>

      <p className="text-sm text-gray-400">
        {isPositive ? "+" : "-"}
        {percent}% ({isPositive ? "+" : "-"}
        {diff} commandes)
      </p>
    </motion.div>
  );
}
