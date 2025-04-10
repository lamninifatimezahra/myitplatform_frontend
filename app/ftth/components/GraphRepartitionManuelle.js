"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { FaExpand, FaPencilAlt } from "react-icons/fa";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

const COLORS = ["#4a90e2", "#7b61ff", "#50e3c2", "#ff9f40", "#9966ff"];

const CustomLabelOutside = ({ name, value, cx, cy, midAngle, outerRadius, fill }) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill={fill}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={17}
    >
      <tspan x={x} dy="-0.5em">{name}</tspan>
      <tspan x={x} dy="1.2em">({value.toFixed(1)}%)</tspan>
    </text>
  );
};

export default function GraphRepartitionManuelle({
  exportMode = false,
  selectedGraphs = [],
  onGraphSelect,
  globalStartDate,
  globalEndDate,
}) {
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentColor, setCommentColor] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [editingColor, setEditingColor] = useState("");

  const chartRef = useRef(null);
  const modalChartRef = useRef(null);
  const endDateRef = useRef(null);

  const normalizeDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getPeriodRange = () => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);
    switch (selectedPeriod) {
      case "week": start.setDate(today.getDate() - 6); break;
      case "month": start.setDate(today.getDate() - 29); break;
      case "quarter": start.setMonth(today.getMonth() - 3); break;
      case "year": start.setFullYear(today.getFullYear() - 1); break;
    }
    return [start, end];
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let start, end;
        if (selectedPeriod === "custom" && startDate && endDate) {
          start = startDate;
          end = endDate;
        } else if (globalStartDate && globalEndDate) {
          start = globalStartDate;
          end = globalEndDate;
        } else {
          [start, end] = getPeriodRange();
        }

        const res = await fetchWithAuth("https://ftth-backend-ayoub-31fb8bb58dc2.herokuapp.com/dashboard/api/regle/")        ;
        const all = await res.json();
        const filtered = all.filter((item) => {
          const d = normalizeDate(item.date);
          const day = d.getDay(); // 0 = dimanche, 6 = samedi
          const isWeekday = day !== 0 && day !== 6;
          return d >= normalizeDate(start) && d <= normalizeDate(end) && isWeekday;
        });
        

        const count = {};
        filtered.forEach((item) => {
          const acteur = (item.acteur || "Autre").trim();
          count[acteur] = (count[acteur] || 0) + 1;
        });

        const total = Object.values(count).reduce((a, b) => a + b, 0);
        const formatted = Object.entries(count).map(([name, val], i) => ({
          name,
          value: parseFloat(((val / total) * 100).toFixed(2)),
          color: COLORS[i % COLORS.length],
        }));

        setData(formatted);
      } catch (err) {
        console.error("Erreur chargement données:", err);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };
    fetchData();
  }, [selectedPeriod, startDate, endDate, globalStartDate, globalEndDate]);

  const handleAddComment = () => {
    if (!commentText || !commentColor) return;
    setAnnotations(prev => [...prev, { id: Date.now(), text: commentText, color: commentColor, x: 100, y: 50 }]);
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
        const container = ref.current.getBoundingClientRect();
        const handleMouseMove = (ev) => {
          const dx = ev.clientX - startX, dy = ev.clientY - startY;
          setAnnotations(prev => prev.map(a =>
            a.id === ann.id
              ? { ...a, x: Math.min(Math.max(0, initialX + dx), container.width - 160), y: Math.min(Math.max(0, initialY + dy), container.height - 80) }
              : a));
        };
        const handleMouseUp = () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      };

      return (
        <div key={ann.id}
          onMouseDown={handleMouseDown}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={() => {
            setEditingComment(ann.id);
            setCommentText(ann.text);
            setEditingColor(ann.color);
          }}
          className="absolute p-2 rounded-lg shadow text-white text-sm z-40"
          style={{ backgroundColor: ann.color, top: ann.y, left: ann.x, cursor: "move", maxWidth: "160px", whiteSpace: "pre-wrap" }}
        >
          {ann.text}
          {isEditing && (
            <div className="absolute top-full left-0 mt-2 bg-white text-black p-2 rounded shadow-xl z-50 w-64">
              <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} className="w-full border rounded p-2 text-sm mb-2" />
              <div className="flex gap-2 mb-2 justify-center">
                {["#22c55e", "#eab308", "#ef4444"].map((color) => (
                  <button key={color} onClick={() => setEditingColor(color)} className={`w-6 h-6 rounded-full border-2 ${editingColor === color ? "border-black" : "border-transparent"}`} style={{ backgroundColor: color }} />
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => {
                  setAnnotations(prev => prev.map(c => c.id === ann.id ? { ...c, text: commentText, color: editingColor } : c));
                  setEditingComment(null);
                }} className="text-white bg-blue-500 px-3 py-1 rounded">Modifier</button>
                <button onClick={() => {
                  setAnnotations(prev => prev.filter(c => c.id !== ann.id));
                  setEditingComment(null);
                }} className="text-white bg-red-500 px-3 py-1 rounded">Supprimer</button>
              </div>
            </div>
          )}
        </div>
      );
    });

  return (
    <div data-graph-id="graph-repartition-manuelle" data-graph-label="Répartition Manuelle (Acteur)" className="bg-white shadow-xl rounded-2xl p-6 relative" onClick={() => { setShowCommentPopup(false); setEditingComment(null); }}>
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-blue-800 font-semibold">Chargement <span className="text-blue-500">MyIT</span>...</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-semibold text-slate-800">Répartition Manuelle (Acteur)</h3>
        <div className="flex gap-2">
          {exportMode && (
            <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={selectedGraphs?.includes("graph-repartition-manuelle")} onChange={(e) => onGraphSelect?.("graph-repartition-manuelle", e.target.checked)} />
          )}
          <button onClick={(e) => { e.stopPropagation(); setShowCommentPopup(true); }} className="text-gray-500 hover:text-green-500"><FaPencilAlt className="w-5 h-5" /></button>
          <button onClick={(e) => { e.stopPropagation(); setModalIsOpen(true); }} className="text-gray-500 hover:text-blue-500"><FaExpand className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-4 mb-4">
        <select className="p-2 rounded-xl border border-gray-300 bg-white shadow text-sm" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
          <option value="day">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="quarter">Trimestre</option>
          <option value="year">Cette année</option>
          <option value="custom">📅 Personnalisé</option>
        </select>
        {selectedPeriod === "custom" && (
          <>
            <DatePicker selected={startDate} onChange={(d) => { setStartDate(d); setTimeout(() => endDateRef.current?.setFocus(), 200); }} selectsStart startDate={startDate} endDate={endDate} placeholderText="Date de début" className="p-2 rounded-xl border border-gray-300 text-sm bg-white shadow" />
            <DatePicker ref={endDateRef} selected={endDate} onChange={(d) => setEndDate(d)} selectsEnd startDate={startDate} endDate={endDate} placeholderText="Date de fin" className="p-2 rounded-xl border border-gray-300 text-sm bg-white shadow" />
          </>
        )}
      </div>

      <div ref={chartRef} id="canvas-graph-repartition-manuelle" className="rounded-xl bg-white shadow-inner p-4 relative" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey="value"
              labelLine={true}
              label={CustomLabelOutside}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        {renderAnnotations(chartRef)}
      </div>

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

      <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)} className="flex items-center justify-center fixed inset-0 z-50" overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Répartition Manuelle (Acteur)</h3>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          <div ref={modalChartRef} className="relative" style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={140}
                  dataKey="value"
                  labelLine={true}
                  label={CustomLabelOutside}
                >
                  {data.map((entry, index) => (
                    <Cell key={`modal-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {renderAnnotations(modalChartRef)}
          </div>
        </div>
      </Modal>
    </div>
  );
}
