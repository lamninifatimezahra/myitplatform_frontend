"use client";

import React, { useState, useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import { FaExpand, FaPencilAlt } from "react-icons/fa";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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

  useEffect(() => {
    const fetchLatestNonTraite = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth("https://ftth-backend-ayoub-31fb8bb58dc2.herokuapp.com/dashboard/api/stock/");
        const json = await res.json();
        const sorted = json.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latest = sorted[0];
        setValue(latest?.non_traite ?? 0);
      } catch (error) {
        console.error("Erreur API objectif:", error);
        setValue(0);
      }
      setTimeout(() => setLoading(false), 500);
    };

    fetchLatestNonTraite();
  }, []);

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

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText || !commentColor) return;
    setAnnotations((prev) => [
      ...prev,
      { id: Date.now(), text: commentText, color: commentColor, x: 100, y: 50 },
    ]);
    setCommentText("");
    setCommentColor("");
    setShowCommentPopup(false);
  };

  const renderAnnotations = (ref) =>
    annotations.map((ann) => {
      const isEditing = editingComment === ann.id;
      const handleMouseDown = (e) => {
        if (isEditing) return;
        e.preventDefault();
        const startX = e.clientX, startY = e.clientY;
        const initialX = ann.x, initialY = ann.y;
        const handleMouseMove = (moveEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          const bounds = ref.current.getBoundingClientRect();
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
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", () => {
          document.removeEventListener("mousemove", handleMouseMove);
        });
      };

      return (
        <div
          key={ann.id}
          onMouseDown={handleMouseDown}
          onDoubleClick={() => {
            setEditingComment(ann.id);
            setCommentText(ann.text);
            setEditingColor(ann.color);
          }}
          title={ann.text}
          className="absolute p-2 rounded-lg shadow text-white text-sm z-40"
          style={{
            backgroundColor: ann.color,
            top: ann.y,
            left: ann.x,
            cursor: isEditing ? "default" : "move",
            maxWidth: "160px",
            wordWrap: "break-word",
          }}
        >
          {ann.text}
          {isEditing && (
            <div className="absolute top-full left-0 mt-2 bg-white text-black p-2 rounded shadow-xl z-50 w-64">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full border rounded p-2 text-sm mb-2"
              />
              <div className="flex gap-2 mb-2 justify-center">
                {["#22c55e", "#eab308", "#ef4444"].map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditingColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${editingColor === color ? "border-black" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setAnnotations((prev) =>
                      prev.map((c) =>
                        c.id === ann.id ? { ...c, text: commentText, color: editingColor } : c
                      )
                    );
                    setEditingComment(null);
                  }}
                  className="text-white bg-blue-500 px-3 py-1 rounded"
                >
                  Modifier
                </button>
                <button
                  onClick={() => {
                    setAnnotations((prev) => prev.filter((c) => c.id !== ann.id));
                    setEditingComment(null);
                  }}
                  className="text-white bg-red-500 px-3 py-1 rounded"
                >
                  Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      );
    });

  return (
    <div
      data-graph-id="graph-objectif"
      data-graph-label="Objectif"
      className="bg-white shadow-xl rounded-2xl p-6 relative"
      onClick={() => {
        setShowCommentPopup(false);
        setEditingComment(null);
      }}
    >
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-blue-800 font-semibold">Chargement <span className="text-blue-500">MyIT</span>...</p>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-semibold text-slate-800">Objectif</h3>
        <div className="flex gap-2 items-center">
          {exportMode && (
            <input
              type="checkbox"
              className="w-5 h-5 accent-blue-600"
              checked={selectedGraphs?.includes("graph-objectif")}
              onChange={(e) => onGraphSelect?.("graph-objectif", e.target.checked)}
            />
          )}
          <button onClick={(e) => { e.stopPropagation(); setShowCommentPopup(true); }} className="text-gray-500 hover:text-green-500">
            <FaPencilAlt className="w-5 h-5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setModalIsOpen(true); }} className="text-gray-500 hover:text-blue-500">
            <FaExpand className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 my-4">
        <select
          className="p-2 rounded-xl border border-gray-300 bg-white shadow-sm text-sm"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          <option value="day">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="year">Cette année</option>
          <option value="custom">📅 Personnalisé</option>
        </select>
        {selectedPeriod === "custom" && (
          <>
            <DatePicker
              selected={startDate}
              onChange={(date) => {
                setStartDate(date);
                setTimeout(() => endDateRef.current?.setFocus(), 200);
              }}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              placeholderText="Date de début"
              className="p-2 rounded-xl border border-gray-300 text-sm bg-white shadow-sm"
            />
            <DatePicker
              ref={endDateRef}
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              placeholderText="Date de fin"
              className="p-2 rounded-xl border border-gray-300 text-sm bg-white shadow-sm"
            />
          </>
        )}
      </div>
      <div id="canvas-graph-objectif" ref={chartRef} className="relative h-[260px] flex items-center justify-center">
        <div className="w-[75%] h-full">
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
        <div className="absolute bottom-[60px] text-center w-full pointer-events-none">
          <p className="text-4xl font-bold text-gray-900">{value}</p>
          <p className="text-base text-gray-600">commandes</p>
          <p className={`mt-3 text-xl font-bold ${value <= objective ? "text-green-600" : "text-red-600"}`}>
          {value <= objective ? "✓ Dans l&apos;objectif" : "✗ Au-dessus de l&apos;objectif"}
          </p>

        </div>
        {renderAnnotations(chartRef)}
      </div>
      {/* 🖥️ Modal plein écran */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Objectif</h3>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          <div ref={modalChartRef} className="relative h-[400px] flex items-center justify-center">
            <div className="w-[75%] h-full">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
            <div className="absolute bottom-[80px] text-center w-full pointer-events-none">
              <p className="text-5xl font-bold text-gray-900">{value}</p>
              <p className="text-lg text-gray-600">commandes</p>
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
