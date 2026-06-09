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

  if (loading) {
    return (
      <div className="visualisation relative w-64" data-id="kpi-backlog-j">
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <div className="flex justify-center items-center w-full h-24">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="visualisation relative w-64"
      data-id="kpi-backlog-j"
      data-graph-label="KPI Backlog J"
      whileHover={{ scale: 1.05 }}
    >
      <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
        <div className="flex justify-between items-start w-full mb-2">
          <h3 className="text-gray-800 text-lg font-medium">Backlog FTTH J</h3>
          {isPositive ? (
            <TrendingUp className="text-gray-800 w-5 h-5" />
          ) : (
            <TrendingDown className="text-gray-800 w-5 h-5" />
          )}
        </div>
                
        <p className="text-3xl font-bold text-black mt-4">{todayValue}</p>
        
        <div className="text-xs text-gray-500 mt-1 opacity-0 pointer-events-none">
          0
        </div>
      </div>
    </motion.div>
  );
}