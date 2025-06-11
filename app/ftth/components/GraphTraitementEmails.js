"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList
} from "recharts";
import { FaExpand, FaPencilAlt, FaSyncAlt } from "react-icons/fa";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

const COLORS = {
  "MAJ CR STOC": "#68bddd",
  "Commande bloqué": "#6f80ac",
  "Renonciation": "#4B5563",
  "REF PMT": "#9ca3af",
  "Activation TV": "#60a5fa",
  "Rattrapage B57": "#22c55e"
};

const rawData = [
  { type: "MAJ CR STOC", date: "04/06/2025" },
  { type: "MAJ CR STOC", date: "04/06/2025" },
  { type: "Activation TV", date: "05/06/2025" },
  { type: "Rattrapage B57", date: "09/06/2025" },
  { type: "Commande bloqué", date: "09/06/2025" },
  { type: "Renonciation", date: "10/06/2025" },
  { type: "REF PMT", date: "11/06/2025" },
  { type: "MAJ CR STOC", date: "11/06/2025" },
  { type: "MAJ CR STOC", date: "11/06/2025" }
];

// Agrégation des données
const aggregateByDateAndType = (filteredRawData) => {
  const grouped = {};
  filteredRawData.forEach(({ type, date }) => {
    if (!grouped[date]) grouped[date] = {};
    grouped[date][type] = (grouped[date][type] || 0) + 1;
  });
  return Object.entries(grouped).map(([date, typesObj]) => ({ date, ...typesObj }));
};

const labelStyle = { fill: "#374151", fontSize: 12, fontWeight: "bold" };
const iconBtnClass = "w-11 h-11 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition";

export default function GraphTraitementEmails() {
  const [data, setData] = useState([]);
  const [visibleKeys, setVisibleKeys] = useState(Object.keys(COLORS));
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const endDateRef = useRef(null);

  const [annotations, setAnnotations] = useState([]);
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentColor, setCommentColor] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [editingColor, setEditingColor] = useState("");

  const chartRef = useRef(null);
  const modalChartRef = useRef(null);

  const parseDate = (str) => {
    const [day, month, year] = str.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (date) =>
    date.toLocaleDateString("fr-FR").padStart(10, "0");

  const filterRawData = () => {
    const dates = rawData.map(d => parseDate(d.date)).sort((a, b) => b - a);
    const latest = dates[0];
    let start = new Date(latest), end = new Date(latest);

    if (selectedPeriod === "custom" && startDate && endDate) {
      start = startDate;
      end = endDate;
    } else if (selectedPeriod === "week") {
      start.setDate(latest.getDate() - 6);
    } else if (selectedPeriod === "month") {
      start.setDate(latest.getDate() - 29);
    } else if (selectedPeriod === "quarter") {
      start.setMonth(latest.getMonth() - 3);
    } else if (selectedPeriod === "year") {
      start.setFullYear(latest.getFullYear() - 1);
    }

    return rawData.filter(d => {
      const dObj = parseDate(d.date);
      return dObj >= start && dObj <= end;
    });
  };

  const refresh = () => {
    setVisibleKeys(Object.keys(COLORS));
    setSelectedPeriod("week");
    setStartDate(null);
    setEndDate(null);
  };

  useEffect(() => {
    setLoading(true);
    const filtered = filterRawData();
    const aggregated = aggregateByDateAndType(filtered);
    setData(aggregated);
    setTimeout(() => setLoading(false), 400);
  }, [selectedPeriod, startDate, endDate]);

  const getYAxisMax = () => {
    const max = Math.max(
      ...data.flatMap(item => Object.values(item).filter(v => typeof v === "number"))
    );
    if (max <= 1) return 2;
    if (max <= 2) return 3;
    if (max <= 4) return 5;
    if (max <= 7) return 8;
    if (max <= 10) return 11;
    if (max <= 20) return 21;
    return Math.ceil((max + 20) / 20) * 20;
  };

  const renderAnnotations = (ref) =>
    annotations.map((ann) => {
      const isEditing = editingComment === ann.id;
      const handleMouseDown = (e) => {
        if (isEditing) return;
        e.preventDefault();
        const startX = e.clientX, startY = e.clientY;
        const initialX = ann.x, initialY = ann.y;
        const rect = ref.current.getBoundingClientRect();
        const handleMouseMove = (moveEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          setAnnotations((prev) =>
            prev.map((a) =>
              a.id === ann.id
                ? {
                    ...a,
                    x: Math.min(Math.max(0, initialX + dx), rect.width - 160),
                    y: Math.min(Math.max(0, initialY + dy), rect.height - 80),
                  }
                : a
            )
          );
        };
        const handleMouseUp = () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      };

      return (
        <div
          key={ann.id}
          onMouseDown={handleMouseDown}
          className="absolute p-2 rounded-lg shadow text-white text-sm z-40"
          style={{
            backgroundColor: ann.color,
            top: ann.y,
            left: ann.x,
            cursor: isEditing ? "default" : "move",
            maxWidth: "160px",
            whiteSpace: "pre-wrap",
          }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={() => {
            setEditingComment(ann.id);
            setCommentText(ann.text);
            setEditingColor(ann.color);
          }}
          title={ann.text}
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
                      prev.map((a) =>
                        a.id === ann.id ? { ...a, text: commentText, color: editingColor } : a
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
                    setAnnotations((prev) => prev.filter((a) => a.id !== ann.id));
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

  const maxY = getYAxisMax();

  return (
    <div
      data-graph-id="graph-traitement-emails"
      data-graph-label="Traitement des e-mails"
      className="bg-white shadow-xl rounded-2xl p-6 relative"
      onClick={() => {
        setShowCommentPopup(false);
        setEditingComment(null);
      }}
    >
      {/* Spinner */}
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
        <h3 className="text-2xl font-semibold text-gray-800">Traitement des e-mails</h3>
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); setShowCommentPopup(true); }} className={iconBtnClass}><FaPencilAlt /></button>
          <button onClick={refresh} className={iconBtnClass}><FaSyncAlt /></button>
          <button onClick={() => setModalIsOpen(true)} className={iconBtnClass}><FaExpand /></button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-4 mb-4">
        <select
          className="p-2 rounded-xl border border-gray-300 bg-white shadow text-sm"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          <option value="day">Aujourd’hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="quarter">Trimestre</option>
          <option value="year">Cette année</option>
          <option value="custom">📅 Personnalisé</option>
        </select>
        {selectedPeriod === "custom" && (
          <>
            <DatePicker selected={startDate} onChange={(d) => {
              setStartDate(d);
              setTimeout(() => endDateRef.current?.setFocus(), 200);
            }} placeholderText="Date début" className="p-2 rounded-xl border" />
            <DatePicker ref={endDateRef} selected={endDate} onChange={(d) => setEndDate(d)} placeholderText="Date fin" className="p-2 rounded-xl border" />
          </>
        )}
      </div>

      {/* Graphe principal */}
      <div id="canvas-graph-traitement-emails" ref={chartRef} className="relative rounded-xl bg-white p-4 shadow-inner" style={{ height: 480 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={10} barGap={2}>
            <XAxis dataKey="date" height={70} angle={-45} textAnchor="end"
              tick={{ fontSize: 14, fill: "#1f2937", fontWeight: 600 }} />
            <YAxis domain={[0, maxY]} />
            <Tooltip />
            <Legend onClick={(e) => setVisibleKeys([e.dataKey])} />
            {Object.keys(COLORS).map((type) =>
              visibleKeys.includes(type) && (
                <Bar key={type} dataKey={type} fill={COLORS[type]} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey={type} position="top" style={labelStyle} />
                </Bar>
              )
            )}
          </BarChart>
        </ResponsiveContainer>
        {renderAnnotations(chartRef)}
      </div>

      {/* Commentaire */}
      {showCommentPopup && (
        <div className="absolute top-12 right-12 bg-white shadow-2xl p-4 rounded-xl w-72 z-50" onClick={(e) => e.stopPropagation()}>
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Ajouter un commentaire</h4>
          <textarea className="w-full border border-gray-300 rounded p-2 mb-2 text-sm"
            rows={3} value={commentText} onChange={(e) => setCommentText(e.target.value)} />
          <div className="flex gap-3 mb-4">
            {["#22c55e", "#eab308", "#ef4444"].map((color) => (
              <button key={color} onClick={() => setCommentColor(color)}
                className={`w-6 h-6 rounded-full border-2 ${commentColor === color ? "border-black" : "border-transparent"}`}
                style={{ backgroundColor: color }} />
            ))}
          </div>
          <button
            disabled={!commentText || !commentColor}
            onClick={() => {
              setAnnotations((prev) => [...prev, { id: Date.now(), text: commentText, color: commentColor, x: 100, y: 50 }]);
              setCommentText(""); setCommentColor(""); setShowCommentPopup(false);
            }}
            className={`w-full py-2 rounded-lg font-bold text-white ${commentText && commentColor ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}
          >
            Valider
          </button>
        </div>
      )}

      {/* Modal agrandi (optionnel) */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-gray-800">Traitement des e-mails</h3>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          <div ref={modalChartRef} className="relative" style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="date" angle={-45} textAnchor="end"
                  tick={{ fontSize: 14, fill: "#1f2937", fontWeight: 600 }} height={80} />
                <YAxis domain={[0, maxY]} />
                <Tooltip />
                {Object.keys(COLORS).map((type) =>
                  visibleKeys.includes(type) && (
                    <Bar key={type} dataKey={type} fill={COLORS[type]}>
                      <LabelList dataKey={type} position="top" style={labelStyle} />
                    </Bar>
                  )
                )}
              </BarChart>
            </ResponsiveContainer>
            {renderAnnotations(modalChartRef)}
          </div>
        </div>
      </Modal>
    </div>
  );
}
