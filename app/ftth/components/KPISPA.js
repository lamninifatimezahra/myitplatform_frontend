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

import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import kpiSansErreurData from "@/app/ftth/data_ftth/prod_files/kpi_sans_erreur.json";
import { useGlobalFilter } from "@/app/components/GlobalFilterContext";

function parseDateReporting(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function KPISPA() {
  const { globalStartDate, globalEndDate } = useGlobalFilter();
  const startDate = normalizeDate(globalStartDate);
  const endDate = normalizeDate(globalEndDate);
  const hasDateFilter = Boolean(startDate || endDate);
  const matchingRecords = (Array.isArray(kpiSansErreurData) ? kpiSansErreurData : [])
    .map((record) => {
      const date = parseDateReporting(record?.date_reporting);
      const value = Number(record?.kpi_sans_erreur);
      if (!date || !Number.isFinite(value)) return null;
      return { date, value };
    })
    .filter((record) => record !== null)
    .filter(({ date }) => (!startDate || date >= startDate) && (!endDate || date <= endDate))
    .sort((a, b) => a.date - b.date);
  const periodRecords = hasDateFilter ? matchingRecords : matchingRecords.slice(-12);
  const records = periodRecords.filter(({ date }) => date.getDay() !== 0 && date.getDay() !== 6);
  const exceededDays = records.filter(({ value }) => value > 75).length;
  const ratio = `${exceededDays}/${records.length}`;
  const percentage = records.length ? (exceededDays / records.length) * 100 : 0;

  const toISO = (value) => {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const periodLabel = startDate && endDate
    ? `Du ${toISO(startDate)} au ${toISO(endDate)}`
    : hasDateFilter
      ? `${records.length} jours filtrés`
      : `Sur ${records.length} jours (12 derniers jours, hors week-ends)`;

  return (
    <motion.div
      id="kpi-spa"
      className="visualisation relative w-64"
      data-id="kpi-spa"
      data-graph-label="Ratio de jours de dépassement"
      whileHover={{ scale: 1.05 }}
    >
      <div className="relative h-[176px] bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
        
        <div className="flex justify-between items-start w-full mb-2">
          <h3 className="text-gray-800 text-lg font-medium">
            Ratio jours dépassement
          </h3>

          <AlertTriangle className="text-gray-800 w-5 h-5" />
        </div>

        <p className="text-xs text-gray-500 mb-1">{periodLabel}</p>

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