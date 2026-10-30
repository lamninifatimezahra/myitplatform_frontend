"use client";

import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import kpiSansErreurData from "@/app/ftth/data_ftth/prod_files/kpi_sans_erreur.json";
import { useGlobalFilter } from "@/app/components/GlobalFilterContext";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, ChartDataLabels);

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

function getIsoWeekNumber(date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);
}

export default function KPIBacklogSansErreur() {
  const { globalStartDate, globalEndDate } = useGlobalFilter();
  const startDate = normalizeDate(globalStartDate);
  const endDate = normalizeDate(globalEndDate);
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
  const hasDateFilter = Boolean(startDate || endDate);
  const periodRecords = hasDateFilter ? matchingRecords : matchingRecords.slice(-12);
  const records = periodRecords.filter(({ date }) => date.getDay() !== 0 && date.getDay() !== 6);

  const chartData = {
    labels: records.map(({ date }) => {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      return [`${day}/${month}`, `(S${getIsoWeekNumber(date)})`];
    }),
    datasets: [
      {
        label: "KPI sans comptabilisées les erreurs",
        
        data: records.map(({ value }) => value),
        backgroundColor: "#0284c7",
        borderRadius: 4,
        maxBarThickness: 36,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top", align: "center" },
      datalabels: {
        color: "black",
        anchor: "end",
        align: "top",
        offset: 2,
        font: { size: 10, weight: "bold" },
        formatter: (value) => Number(value).toLocaleString("fr-FR"),
        clip: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => `KPI sans erreur : ${context.parsed.y.toLocaleString("fr-FR")}`,
          
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { autoSkip: false, maxRotation: 0, minRotation: 0, font: { size: 9 } },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        title: { display: true, text: "Volume" },
      },
    },
    layout: { padding: { top: 20, right: 12, bottom: 8, left: 8 } },
  };

  const subtitle = startDate && endDate
    ? `Du ${startDate.toLocaleDateString("fr-FR")} au ${endDate.toLocaleDateString("fr-FR")}`
    : hasDateFilter
      ? `${records.length} dates filtrées`
      : "12 derniers jours, hors week-ends";

  return (
    <section
      id="kpi-backlog-sans-erreur"
      className="visualisation relative flex min-h-[360px] flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
      data-id="kpi-backlog-sans-erreur"
      data-graph-label="Commandes non comptabilisées avant la MEP"
    >
      <header className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Commandes non comptabilisées avant la MEP</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </header>
      {records.length > 0 ? (
        <div className="relative min-h-[280px] flex-1">
          <div className="relative h-[280px] w-full">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      ) : (
        <p className="flex min-h-[280px] flex-1 items-center justify-center text-sm text-gray-500">
          Aucune donnée disponible pour cette période.
        </p>
      )}
    </section>
  );
}
