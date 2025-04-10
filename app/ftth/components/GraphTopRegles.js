"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList
} from "recharts";
import { FaExpand, FaPencilAlt } from "react-icons/fa";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fetchWithAuth from "@/utils/fetchWithAuth";


if (typeof window !== "undefined") Modal.setAppElement(document.body);

const colors = ["#4a90e2", "#7b61ff", "#50e3c2", "#66a2e0", "#6278f0"];

export default function GraphTopRegles({
  exportMode = false,
  selectedGraphs = [],
  onGraphSelect,
  globalStartDate,
  globalEndDate
}) {
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFilterSource, setLastFilterSource] = useState("default");
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
      case "quarter": start.setMonth(today.getMonth() - 3); break;
      case "year": start.setFullYear(today.getFullYear() - 1); break;
    }
    return [start, end];
  };

  useEffect(() => {
    if (globalStartDate && globalEndDate) setLastFilterSource("global");
  }, [globalStartDate, globalEndDate]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let start, end;
      if (lastFilterSource === "local") {
        if (selectedPeriod === "custom" && startDate && endDate) {
          start = startDate;
          end = endDate;
        } else {
          [start, end] = getPeriodRange();
        }
      } else if (globalStartDate && globalEndDate) {
        start = globalStartDate;
        end = globalEndDate;
      } else {
        [start, end] = getPeriodRange();
      }

      try {
        const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/ftth/regle/");
        const json = await res.json();
        const startNorm = normalizeDate(start);
        const endNorm = normalizeDate(end);

        const filtered = json.filter(item => {
          const itemDate = normalizeDate(item.date);
          const day = itemDate.getDay(); // 0 = dimanche, 6 = samedi
          const isWeekday = day !== 0 && day !== 6;
          return itemDate >= startNorm && itemDate <= endNorm && isWeekday;
        });
        

        const ruleTotals = filtered.reduce((acc, curr) => {
          acc[curr.regle] = (acc[curr.regle] || 0) + curr.nbr_stoc_du_jour;
          return acc;
        }, {});

        const top5 = Object.entries(ruleTotals)
          .map(([rule, total]) => ({ name: rule, value: total }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
          .map((item, i) => ({ ...item, color: colors[i] }));

        setData(top5);
        setTimeout(() => setLoading(false), 300);
      } catch (e) {
        console.error("Erreur lors du chargement :", e);
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedPeriod, startDate, endDate, globalStartDate, globalEndDate, lastFilterSource]);

  const maxYValue = Math.max(...data.map(d => d.value || 0), 0);
  let padding = 0;
  if (maxYValue < 10) padding = 5;
  else if (maxYValue < 100) padding = 10;
  else if (maxYValue < 1000) padding = 100;
  else padding = 500;
  const maxY = Math.ceil((maxYValue + padding) / 100) * 100;
  const renderAnnotations = (ref) =>
    annotations.map((ann) => {
      const isEditing = editingComment === ann.id;
      const handleMouseDown = (e) => {
        if (isEditing) return;
        e.preventDefault();
        const startX = e.clientX, startY = e.clientY;
        const initialX = ann.x, initialY = ann.y;
        const containerRect = ref.current.getBoundingClientRect();
        const handleMouseMove = (moveEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          setAnnotations(prev =>
            prev.map(a => a.id === ann.id
              ? { ...a, x: Math.min(Math.max(0, initialX + dx), containerRect.width - 160), y: Math.min(Math.max(0, initialY + dy), containerRect.height - 80) }
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
          style={{ backgroundColor: ann.color, top: ann.y, left: ann.x, cursor: isEditing ? "default" : "move", maxWidth: "160px", whiteSpace: "pre-wrap" }}
          title={ann.text}
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

  const handleAddComment = () => {
    if (!commentText || !commentColor) return;
    setAnnotations(prev => [...prev, { id: Date.now(), text: commentText, color: commentColor, x: 100, y: 50 }]);
    setCommentText("");
    setCommentColor("");
    setShowCommentPopup(false);
  };

  return (
    <div
      data-graph-id="graph-top-regles"
      data-graph-label="Top 5 RÈGLES"
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

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-semibold text-slate-800">Top 5 RÈGLES</h3>
        <div className="flex gap-2 items-center">
          {exportMode && (
            <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={selectedGraphs?.includes("graph-top-regles")} onChange={(e) => onGraphSelect?.("graph-top-regles", e.target.checked)} />
          )}
          <button onClick={(e) => { e.stopPropagation(); setShowCommentPopup(true); }} className="text-gray-500 hover:text-green-500"><FaPencilAlt className="w-5 h-5" /></button>
          <button onClick={() => setModalIsOpen(true)} className="text-gray-500 hover:text-blue-500"><FaExpand className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-4 items-center my-4">
        <select className="p-2 rounded-xl border border-gray-300 bg-white shadow text-sm" value={selectedPeriod} onChange={(e) => { setLastFilterSource("local"); setSelectedPeriod(e.target.value); }}>
          <option value="day">Aujourd’hui</option>
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

      {/* Graph */}
      <div ref={chartRef} id="canvas-graph-top-regles" className="bg-white rounded-xl shadow-inner p-4 relative" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis domain={[0, maxY]} />
            <Tooltip />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList dataKey="value" position="top" fill="black" fontWeight="bold" fontSize={14} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {renderAnnotations(chartRef)}
      </div>

      {/* Commentaire */}
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

      {/* Modal */}
      <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)} className="flex items-center justify-center fixed inset-0 z-50" overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Top 5 RÈGLES</h3>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          <div ref={modalChartRef} className="relative" style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" />
                <YAxis domain={[0, maxY]} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-modal-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="value" position="top" fill="black" fontWeight="bold" fontSize={14} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {renderAnnotations(modalChartRef)}
          </div>
        </div>
      </Modal>
    </div>
  );
}
