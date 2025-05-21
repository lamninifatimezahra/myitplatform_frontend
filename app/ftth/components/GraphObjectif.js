"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaExpand, FaSyncAlt } from "react-icons/fa";
import Modal from "react-modal";
import holidaysData from "@/app/ftth/utils/holidays.json";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fetchWithAuth from "@/utils/fetchWithAuth";

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
  const endDateRef = useRef(null);

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

  const fetchAverageNonTraite = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        "https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/ftth/stock/"
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

      if (isFirstLoad) {
        setHasFilter(false); // 🛑 Ignore les dates globales si KPI du jour
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

      if (isFirstLoad) {
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
      setIsFirstLoad(true);     // Forcer retour au KPI du jour
      setHasFilter(false);
      fetchAverageNonTraite();  // Recharger
    }
  };

  const getNeedleAngle = (val) => {
    const clamped = Math.min(Math.max(val, 0), 100);
    return 180 - (clamped / 100) * 180;
  };

  const angle = getNeedleAngle(value);

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

      {/* Graph */}
      <div
        id="canvas-graph-objectif"
        ref={chartRef}
        className="relative mt-4 h-[400px] flex items-center justify-center rounded-xl bg-white shadow-inner p-4 overflow-hidden"
      >
        <div className="relative">
          <svg width="200" height="200" viewBox="0 0 240 240">
            <circle cx="120" cy="120" r="100" stroke="black" strokeWidth="5" fill="none" />
            <path d="M40,120 A80,80 0 0,1 200,120" stroke="black" strokeWidth="10" fill="none" />
            <line
              x1="120"
              y1="120"
              x2={120 + 45 * Math.cos((Math.PI / 180) * angle)}
              y2={120 - 45 * Math.sin((Math.PI / 180) * angle)}
              stroke="black"
              strokeWidth="5"
            />
            <circle cx="120" cy="120" r="7" fill="black" />
          </svg>

          <div className="absolute top-[125px] left-1/2 transform -translate-x-1/2 flex gap-3">
            <span className="w-14 h-4 rounded-md bg-red-500"></span>
            <span className="w-14 h-4 rounded-md bg-green-500"></span>
          </div>
        </div>

        <div className="flex flex-col items-start ml-10">
          <div className="flex items-center gap-4 mb-1">
            <div className="text-[6rem] font-extrabold text-green-600">{value}</div>
            <div className="text-gray-700 font-bold text-4xl">commandes</div>
          </div>
        </div>
      </div>

      {/* Modal */}
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
