"use client";

import React, { useState, useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import { FaExpand, FaPencilAlt, FaSyncAlt } from "react-icons/fa";
import Modal from "react-modal";
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
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentColor, setCommentColor] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [editingColor, setEditingColor] = useState("");

  const chartRef = useRef(null);
  const modalChartRef = useRef(null);
  const endDateRef = useRef(null);

  const objective = 100;
  const iconBtnClass = "w-11 h-11 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition";

  const normalizeDate = (d) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getPeriodRange = () => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);
    switch (selectedPeriod) {
      case "week": start.setDate(today.getDate() - 6); break;
      case "month": start.setDate(today.getDate() - 29); break;
      case "year": start.setFullYear(today.getFullYear() - 1); break;
      case "custom":
        if (startDate && endDate) return [startDate, endDate];
        break;
      default: break;
    }
    return [start, end];
  };

  const fetchAverageNonTraite = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/ftth/stock/");
      const json = await res.json();
  
      const normalizeDate = (d) => {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date;
      };
  
      const isWorkingDay = (dateStr) => {
        const day = new Date(dateStr).getDay();
        return day !== 0 && day !== 6;
      };
  
      const sortedData = [...json].sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastDateStr = sortedData[0]?.date;
      const lastDate = normalizeDate(lastDateStr);
  
      let filtered = [];
      let total = 0;
      let workingDaysCount = 0;
  
      if (selectedPeriod === "day") {
        filtered = sortedData.filter(e => e.date === lastDateStr);
      } else {
        // Générer les X derniers jours ouvrés selon le mode
        const maxDays = selectedPeriod === "week" ? 7
                       : selectedPeriod === "month" ? 22
                       : selectedPeriod === "year" ? 260
                       : 7;
  
        const workingDates = [];
        for (let i = 0; i < sortedData.length && workingDates.length < maxDays; i++) {
          const date = normalizeDate(sortedData[i].date);
          if (date <= lastDate && isWorkingDay(sortedData[i].date)) {
            workingDates.push(sortedData[i]);
          }
        }
  
        filtered = workingDates;
      }
  
      total = filtered.reduce((acc, el) => acc + (el.non_traite || 0), 0);
      workingDaysCount = filtered.length;
  
      const avg = workingDaysCount ? total / workingDaysCount : 0;
  
      console.log("✅ DÉTAILS CALCUL MOYENNE :");
      console.log("Jours inclus :", filtered.map(f => f.date));
      console.log("Total =", total, "| Jours ouvrés =", workingDaysCount, "| Moyenne =", avg);
  
      setValue(Math.round(avg));
    } catch (error) {
      console.error("Erreur API objectif:", error);
      setValue(0);
    }
    setTimeout(() => setLoading(false), 500);
  };
  

  useEffect(() => {
    fetchAverageNonTraite();
  }, [
    selectedPeriod,
    startDate ?? null,
    endDate ?? null,
    globalStartDate ?? null,
    globalEndDate ?? null
  ]);

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

  const handleAddComment = () => {
    if (!commentText || !commentColor) return;
    setAnnotations(prev => [...prev, {
      id: Date.now(), text: commentText, color: commentColor, x: 100, y: 50
    }]);
    setCommentText(""); setCommentColor(""); setShowCommentPopup(false);
  };

  const renderAnnotations = (ref) =>
    annotations.map((ann) => {
      const isEditing = editingComment === ann.id;
      const handleMouseDown = (e) => {
        if (isEditing) return;
        e.preventDefault();
        const startX = e.clientX, startY = e.clientY;
        const initialX = ann.x, initialY = ann.y;
        const bounds = ref.current.getBoundingClientRect();
        const move = (ev) => {
          const dx = ev.clientX - startX, dy = ev.clientY - startY;
          setAnnotations((prev) =>
            prev.map((a) =>
              a.id === ann.id
                ? {
                    ...a,
                    x: Math.min(Math.max(0, initialX + dx), bounds.width - 160),
                    y: Math.min(Math.max(0, initialY + dy), bounds.height - 80),
                  }
                : a
            )
          );
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", () => document.removeEventListener("mousemove", move), { once: true });
      };

      return (
        <div key={ann.id} onMouseDown={handleMouseDown} onClick={(e) => e.stopPropagation()}
          onDoubleClick={() => { setEditingComment(ann.id); setCommentText(ann.text); setEditingColor(ann.color); }}
          className="absolute p-2 rounded-lg shadow text-white text-sm z-40"
          style={{ backgroundColor: ann.color, top: ann.y, left: ann.x, cursor: isEditing ? "default" : "move", maxWidth: "160px" }}
          title={ann.text}
        >
          {ann.text}
        </div>
      );
    });

  return (
    <div data-graph-id="graph-objectif" data-graph-label="Objectif"
      className="bg-white shadow-xl rounded-2xl p-6 relative"
      onClick={() => {
        setShowCommentPopup(false);
        setEditingComment(null);
      }}
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
          {exportMode && (
            <input type="checkbox" className="w-5 h-5 accent-blue-600"
              checked={selectedGraphs?.includes("graph-objectif")}
              onChange={(e) => onGraphSelect?.("graph-objectif", e.target.checked)} />
          )}
          <button onClick={(e) => { e.stopPropagation(); setShowCommentPopup(true); }} className={iconBtnClass}>
            <FaPencilAlt className="text-gray-700" />
          </button>
          <button onClick={() => {
            setSelectedPeriod("day");
            setStartDate(null);
            setEndDate(null);
          }} className={iconBtnClass}>
            <FaSyncAlt className="text-gray-700" />
          </button>
          <button onClick={() => setModalIsOpen(true)} className={iconBtnClass}>
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

      {/* Graphique objectif */}
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
        {renderAnnotations(chartRef)}
      </div>

      {/* Popup commentaire */}
      {showCommentPopup && (
        <div className="absolute top-10 right-10 bg-white p-4 rounded-xl shadow-2xl z-50 w-72" onClick={(e) => e.stopPropagation()}>
          <h4 className="text-lg font-semibold mb-2 text-gray-800">Ajouter un commentaire</h4>
          <textarea className="w-full border border-gray-300 rounded-lg p-2 mb-2 text-sm" rows={3} placeholder="Votre commentaire..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
          <div className="flex gap-3 mb-4">
            {["#22c55e", "#eab308", "#ef4444"].map((color) => (
              <button key={color} onClick={() => setCommentColor(color)} className={`w-6 h-6 rounded-full border-2 ${commentColor === color ? "border-black" : "border-transparent"}`} style={{ backgroundColor: color }} />
            ))}
          </div>
          <button disabled={!commentText || !commentColor} onClick={handleAddComment} className={`w-full py-2 rounded-lg font-bold text-white ${commentText && commentColor ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}>Valider</button>
        </div>
      )}

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
            {renderAnnotations(modalChartRef)}
          </div>
        </div>
      </Modal>
    </div>
  );
}
