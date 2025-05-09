"use client";

import React, { useState, useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import { FaExpand, FaPencilAlt, FaSyncAlt } from "react-icons/fa";
import Modal from "react-modal";
import holidaysData from "@/app/ftth/utils/holidays.json";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fetchWithAuth from "@/utils/fetchWithAuth";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";

ChartJS.register(ArcElement, ChartTooltip, ChartLegend);
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
  const [annotations, setAnnotations] = useState([]);

  const chartRef = useRef(null);
  const modalChartRef = useRef(null);
  const endDateRef = useRef(null);

  const objective = 100;

  const normalizeDate = (d) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  useEffect(() => {
    if (globalStartDate && globalEndDate) {
      setSelectedPeriod("custom");
      setStartDate(globalStartDate);
      setEndDate(globalEndDate);
    }
  }, [globalStartDate, globalEndDate]);

  const fetchAverageNonTraite = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/ftth/stock/");
      const json = await res.json();

      const holidays = [...Object.keys(holidaysData.france), ...Object.keys(holidaysData.morocco)];
      const isWorkingDay = (dateStr) => {
        const date = new Date(dateStr);
        const day = date.getDay();
        const formattedDate = date.toISOString().split("T")[0];
        return day !== 0 && day !== 6 && !holidays.includes(formattedDate);
      };

      const sortedData = [...json].sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastDateStr = sortedData[0]?.date;
      const today = lastDateStr ? new Date(lastDateStr) : new Date();

      const getPeriodRange = () => {
        let start = new Date(today);
        let end = new Date(today);

        switch (selectedPeriod) {
          case "week":
            start.setDate(today.getDate() - 6);
            break;
          case "month":
            start.setMonth(today.getMonth() - 1);
            break;
          case "trimestre":
            start.setMonth(today.getMonth() - 3);
            break;
          case "year":
            start.setFullYear(today.getFullYear() - 1);
            break;
          case "custom":
            if (startDate && endDate) return [startDate, endDate];
            break;
          default:
            break;
        }
        return [start, end];
      };

      let [start, end] = getPeriodRange();

      if (globalStartDate && globalEndDate) {
        start = normalizeDate(globalStartDate);
        end = normalizeDate(globalEndDate);
      }

      let filtered = [];
      if (selectedPeriod === "day") {
        filtered = sortedData.filter((e) => e.date === lastDateStr);
      } else {
        const workingDates = [];
        for (let i = 0; i < sortedData.length; i++) {
          const date = normalizeDate(sortedData[i].date);
          if (date >= start && date <= end && isWorkingDay(sortedData[i].date)) {
            workingDates.push(sortedData[i]);
          }
        }
        filtered = workingDates;
      }

      const total = filtered.reduce((acc, el) => acc + (el.non_traite || 0), 0);
      const workingDaysCount = filtered.length;
      const avg = workingDaysCount ? total / workingDaysCount : 0;

      setValue(Math.round(avg));
    } catch (error) {
      console.error("Erreur API objectif:", error);
      setValue(0);
    }
    setTimeout(() => setLoading(false), 500);
  };

  useEffect(() => {
    fetchAverageNonTraite();
  }, [selectedPeriod, startDate, endDate, globalStartDate, globalEndDate]);

  const doughnutData = {
    labels: ["Commandes", "Reste"],
    datasets: [
      {
        data: [value, Math.max(objective - value, 0)],
        backgroundColor: [value <= objective ? "#22c55e" : "#ef4444", "#e5e7eb"],
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions = {
    cutout: "75%",
    rotation: -90,
    circumference: 180,
    plugins: { tooltip: { enabled: false }, legend: { display: false } },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div data-graph-id="graph-objectif" data-graph-label="Objectif"
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
        <h3 className="text-2xl font-semibold text-gray-800">Objectif</h3>
        <div className="flex gap-2">
          <button onClick={() => setModalIsOpen(true)} className="w-11 h-11 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition">
            <FaExpand className="text-gray-700" />
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 my-4">
        <select className="p-2 rounded-xl border border-gray-300 bg-white shadow text-sm"
          value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
          <option value="day">Aujourd’hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="trimestre">Trimestre</option>
          <option value="year">Cette année</option>
          <option value="custom">📅 Personnalisé</option>
        </select>
        {selectedPeriod === "custom" && (
          <>
            <DatePicker selected={startDate} onChange={(d) => { setStartDate(d); setTimeout(() => endDateRef.current?.setFocus(), 200); }}
              selectsStart startDate={startDate} endDate={endDate}
              placeholderText="Date de début" className="p-2 rounded-xl border border-gray-300 text-sm bg-white shadow" />
            <DatePicker ref={endDateRef} selected={endDate} onChange={(d) => setEndDate(d)}
              selectsEnd startDate={startDate} endDate={endDate}
              placeholderText="Date de fin" className="p-2 rounded-xl border border-gray-300 text-sm bg-white shadow" />
          </>
        )}
      </div>

      {/* Graph */}
      <div id="canvas-graph-objectif" ref={chartRef}
        className="relative h-[480px] flex items-center justify-center rounded-xl bg-white shadow-inner p-4">
        <div className="w-[65%] h-[80%]">
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
        <div className="absolute top-[60%] translate-y-[-50%] text-center w-full pointer-events-none">
          <p className="text-4xl font-bold text-gray-900">{value}</p>
          <p className="text-base text-gray-600">commandes</p>
          <p className={`mt-3 text-xl font-bold ${value <= objective ? "text-green-600" : "text-red-600"}`}>
            {value <= objective ? "✓ Dans l'objectif" : "✗ Au-dessus de l'objectif"}
          </p>
        </div>
      </div>

      {/* Modal plein écran */}
      <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-gray-800">Objectif</h3>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          <div ref={modalChartRef} className="relative h-[400px] flex items-center justify-center">
            <div className="w-[75%] h-full">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
            <div className="absolute bottom-[80px] text-center w-full pointer-events-none">
              <p className="text-5xl font-bold text-gray-900">{value}</p>
              <p className="text-lg text-gray-600">commandes (moyenne)</p>
              <p className={`mt-3 text-2xl font-bold ${value <= objective ? "text-green-600" : "text-red-600"}`}>
                {value <= objective ? "✓ Dans l'objectif" : "✗ Au-dessus de l'objectif"}
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
