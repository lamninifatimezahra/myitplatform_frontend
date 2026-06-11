/* "use client";

import React from "react";
import { Target } from "lucide-react";
import { motion } from "framer-motion";

export default function KPISPA({ onComponentReady }) {
  return (
    <motion.div
      id="kpi-spa"
      className="visualisation relative w-64"
      data-id="kpi-spa"
      data-graph-label="KPI SPA"
      whileHover={{ scale: 1.05 }}
    >
      <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
        <div className="flex justify-between items-start w-full mb-2">
          <h3 className="text-gray-800 text-lg font-medium">SPA</h3>
          <Target className="text-gray-800 w-5 h-5" />
        </div>
                
        <p className="text-3xl font-bold text-black">...</p>

        <p className="text-xs text-gray-500 mt-1">...% (... unités)</p>
      </div>
    </motion.div>
  );
} */
"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import holidaysData from "@/app/ftth/utils/holidays.json";
import { useGlobalFilter } from "@/app/components/GlobalFilterContext";

export default function KPISPA({
  apiUrl = "https://api.606510.xyz/dashboard/api/ftth/stock/",
}) {
  const { globalStartDate, globalEndDate } = useGlobalFilter();

  const [data, setData] = useState([]);
  const [ratio, setRatio] = useState("0/5");

  // ---------- helpers ----------
  const toISO = (d) => {
    if (!d) return "";

    const date = new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isHoliday = (dateStr) => {
    return (
      holidaysData.france?.[dateStr] ||
      holidaysData.morocco?.[dateStr]
    );
  };

  const isWorkingDay = (item) => {
    const dateObj = new Date(item.date);
    const iso = toISO(dateObj);

    return !isWeekend(dateObj) && !isHoliday(iso);
  };

  const inRange = (item) => {
    if (!globalStartDate || !globalEndDate) return true;

    const d = new Date(item.date);

    const start = new Date(globalStartDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(globalEndDate);
    end.setHours(23, 59, 59, 999);

    return d >= start && d <= end;
  };

  const getLast5WorkingDays = (data) => {
    return data
      .filter((item) => isWorkingDay(item))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  };

  // ---------- fetch ----------
  useEffect(() => {
    fetch(apiUrl)
      .then((res) => res.json())
      .then((json) => {
        setData(Array.isArray(json) ? json : []);
      })
      .catch(console.error);
  }, [apiUrl]);

  // ---------- calcul ----------
  useEffect(() => {
    if (!data.length) {
      setRatio("0/5");
      return;
    }

    let filtered = [];

    // Cas 1 : période sélectionnée
    if (globalStartDate && globalEndDate) {
      filtered = data.filter(
        (item) => inRange(item) && isWorkingDay(item)
      );
    }
    // Cas 2 : 5 derniers jours ouvrés
    else {
      filtered = getLast5WorkingDays(data);
    }

    const totalDays = filtered.length;

    const exceededDays = filtered.filter(
      (item) => Number(item.non_traite) > 75
    ).length;

    setRatio(`${exceededDays}/${totalDays}`);
  }, [data, globalStartDate, globalEndDate]);

  // ---------- affichage période ----------
  const getPeriodLabel = () => {
    if (globalStartDate && globalEndDate) {
      return `Du ${toISO(globalStartDate)} au ${toISO(globalEndDate)}`;
    }

    return "";
  };

  // ---------- calcul pourcentage ----------
  const getPercentage = () => {
    const [exceeded, total] = ratio.split("/").map(Number);

    if (!total || isNaN(exceeded) || isNaN(total)) return 0;

    return (exceeded / total) * 100;
  };

  const percentage = getPercentage();

  return (
    <motion.div
      id="kpi-spa"
      className="visualisation relative w-64"
      data-id="kpi-spa"
      data-graph-label="Ratio de jours de dépassement"
      whileHover={{ scale: 1.05 }}
    >
      <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
        
        <div className="flex justify-between items-start w-full mb-2">
          <h3 className="text-gray-800 text-lg font-medium">
            Ratio jours dépassement
          </h3>

          <AlertTriangle className="text-gray-800 w-5 h-5" />
        </div>

        <p className="text-xs text-gray-500 mb-1">
          {getPeriodLabel()}
        </p>

        <p
          className={`text-3xl font-bold ${
            percentage > 30 ? "text-red-600" : "text-green-600"
          }`}
        >
          {ratio}
        </p>
      </div>
    </motion.div>
  );
}