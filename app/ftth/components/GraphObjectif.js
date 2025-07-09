"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaExpand, FaSyncAlt } from "react-icons/fa";
import Modal from "react-modal";
import holidaysData from "@/app/ftth/utils/holidays.json";
import "react-datepicker/dist/react-datepicker.css";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);
if (typeof window !== "undefined") Modal.setAppElement(document.body);

export default function GraphObjectif({
  exportMode = false,
  selectedGraphs = [],
  onGraphSelect,
  globalStartDate,
  globalEndDate,
}) {
  const [selectedPeriod, setSelectedPeriod] = useState("day");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [hasFilter, setHasFilter] = useState(false);

  const chartRef = useRef(null);

  const normalizeDate = (d) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const fetchAverageNonTraite = async (forceKPIDuJour = false) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        "https://myit-backend-its-c20c9354ce42.herokuapp.com/dashboard/api/ftth/stock/"
      );
      const json = await res.json();

      const holidays = [...Object.keys(holidaysData.france), ...Object.keys(holidaysData.morocco)];
      const isWorkingDay = (dateStr) => {
        const date = new Date(dateStr);
        const day = date.getDay();
        const formattedDate = date.toISOString().split("T")[0];
        return day !== 0 && day !== 6 && !holidays.includes(formattedDate);
      };

      const sortedData = [...json].sort((a, b) => new Date(b.date) - new Date(a.date));
      const today = sortedData[0]?.date ? new Date(sortedData[0].date) : new Date();

      let start = new Date(today);
      let end = new Date(today);

      if (forceKPIDuJour || isFirstLoad) {
        setHasFilter(false);
      } else if (globalStartDate && globalEndDate) {
        start = normalizeDate(globalStartDate);
        end = normalizeDate(globalEndDate);
        setHasFilter(true);
      } else {
        setHasFilter(false);
      }

      const filtered = sortedData.filter((e) => {
        const date = normalizeDate(e.date);
        return date >= start && date <= end && isWorkingDay(e.date);
      });

      if (forceKPIDuJour || isFirstLoad) {
        const mostRecentDay = sortedData.find((e) => isWorkingDay(e.date));
        setValue(mostRecentDay?.non_traite || 0);
        setIsFirstLoad(false);
        return;
      }

      const total = filtered.reduce((acc, el) => acc + (el.non_traite || 0), 0);
      const avg = filtered.length ? total / filtered.length : 0;
      setValue(Math.round(avg));
    } catch (error) {
      console.error("Erreur API objectif:", error);
      setValue(0);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  useEffect(() => {
    fetchAverageNonTraite();
  }, [selectedPeriod, startDate, endDate, globalStartDate, globalEndDate]);

  const handleRefresh = () => {
    if (hasFilter) {
      setSelectedPeriod("day");
      setStartDate(null);
      setEndDate(null);
      setIsFirstLoad(true);
      setHasFilter(false);
      fetchAverageNonTraite(true);
    }
  };

  const getPeriodLabel = () => {
    if (!hasFilter) return "KPI du jour";

    let label = "KPI : Moyenne";
    if (globalStartDate && globalEndDate) {
      const weekStart = getWeekNumber(globalStartDate);
      const weekEnd = getWeekNumber(globalEndDate);
      const startStr = globalStartDate.toLocaleDateString("fr-FR");
      const endStr = globalEndDate.toLocaleDateString("fr-FR");

      label += ` – Période : S${weekStart}`;
      if (weekStart !== weekEnd) label += `-${weekEnd}`;
      label += ` | Du ${startStr} au ${endStr}`;
    }
    return label;
  };

  return (
    <div
      data-graph-id="graph-objectif"
      data-graph-label="Objectif"
      className="bg-white shadow-xl rounded-2xl p-6 relative"
    >
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-blue-800 font-semibold text-sm">
              Chargement <span className="text-blue-500">MyIT</span>…
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">{getPeriodLabel()}</h3>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="w-11 h-11 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition"
            title="Revenir au KPI du jour"
          >
            <FaSyncAlt className="text-gray-700" />
          </button>
          <button
            onClick={() => setModalIsOpen(true)}
            className="w-11 h-11 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition"
            title="Agrandir"
          >
            <FaExpand className="text-gray-700" />
          </button>
        </div>
      </div>

      {/* Graphe */}
      <div
        id="canvas-graph-objectif"
        ref={chartRef}
        className="relative mt-6 flex flex-col items-center justify-center rounded-xl bg-white shadow-inner p-10 overflow-hidden"
      >
        <div className="relative w-[480px] h-[260px]">
          <Doughnut
            data={{
              labels: ["Jauge"],
              datasets: [
                {
                  data: [1],
                  backgroundColor: (ctx) => {
                    const { ctx: canvasCtx, chartArea } = ctx.chart;
                    if (!canvasCtx || !chartArea) return "#22c55e";
                    const gradient = canvasCtx.createLinearGradient(0, 0, chartArea.right, 0);
                    gradient.addColorStop(0, "#22c55e");   // Vert
                    gradient.addColorStop(0.5, "#facc15"); // Jaune
                    gradient.addColorStop(1, "#ef4444");   // Rouge
                    return [gradient];
                  },
                  borderWidth: 0,
                  circumference: 180,
                  rotation: -90,
                  cutout: "68%",
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                tooltip: { enabled: false },
                legend: { display: false },
              },
            }}
          />

          {/* Aiguille */}
          <div
            className="absolute left-1/2 bottom-[45px] origin-bottom"
            style={{ transform: `rotate(${(value / 100) * 180 - 90}deg)` }}
          >
            <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[100px] border-l-transparent border-r-transparent border-b-black" />
            <div className="w-3.5 h-3.5 bg-black rounded-full mt-[-2px] mx-auto" />
          </div>

          {/* Triangle rouge haut */}
          <div className="absolute top-[-14px] left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[12px] border-l-transparent border-r-transparent border-b-red-500" />
          </div>
        </div>

        {/* Texte valeur */}
        <div className="flex items-center justify-center gap-4 mt-12">
          <div className="text-[6rem] font-black text-slate-900 leading-none">{value}</div>
          <div className="text-4xl font-semibold text-slate-500">commandes</div>
        </div>
      </div>

      {/* Modal agrandi */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4 px-4">
            <h3 className="text-2xl font-semibold text-gray-800">Objectif</h3>
            <button
              onClick={() => setModalIsOpen(false)}
              className="w-11 h-11 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition z-50 relative"
            >
              <FaExpand className="text-gray-700" />
            </button>
          </div>
          <div className="relative h-[400px] flex items-center justify-center">
            <div className="text-5xl font-bold">{value} commandes (moyenne)</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
