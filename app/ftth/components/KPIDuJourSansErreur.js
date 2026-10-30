"use client";

import { CircleCheck } from "lucide-react";
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

export default function KPIDuJourSansErreur() {
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
  const records = matchingRecords.filter(({ date }) => date.getDay() !== 0 && date.getDay() !== 6);
  const latestRecord = records[records.length - 1];

  const currentValue = hasDateFilter && records.length
    ? Math.round(records.reduce((sum, record) => sum + record.value, 0) / records.length)
    : latestRecord?.value ?? null;
  const title = hasDateFilter ? "Moyenne KPI sans erreur" : "KPI du jour sans erreur";
  const subtitle = startDate && endDate
    ? `Du ${startDate.toLocaleDateString("fr-FR")} au ${endDate.toLocaleDateString("fr-FR")}`
    : hasDateFilter
      ? `Moyenne sur ${records.length} jours ouvrés`
      : latestRecord
        ? `Valeur du ${latestRecord.date.toLocaleDateString("fr-FR")}`
        : "Aucune date ouvrée disponible";

  return (
    <motion.div
      id="kpi-du-jour-sans-erreur"
      className="visualisation relative w-64"
      data-id="kpi-du-jour-sans-erreur"
      data-graph-label="KPI sans erreur"
      whileHover={{ scale: 1.05 }}
    >
      <div className="relative flex min-h-[176px] w-full flex-col items-start rounded-xl bg-white p-6 shadow-md">
        <div className="mb-2 flex w-full items-start justify-between">
          <h3 className="text-lg font-medium text-gray-800">{title}</h3>
          <CircleCheck className="h-5 w-5 text-gray-800" />
        </div>
        <p className="mb-1 text-xs text-gray-500">{subtitle}</p>
        <p className={`text-3xl font-bold ${currentValue > 75 ? "text-red-600" : "text-green-600"}`}>
          {Number.isFinite(currentValue) ? currentValue.toLocaleString("fr-FR") : "—"}
        </p>
      </div>
    </motion.div>
  );
}