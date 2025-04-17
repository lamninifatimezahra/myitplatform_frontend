"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LabelList, Legend,
} from "recharts";
import { FaExpand, FaPencilAlt, FaSyncAlt } from "react-icons/fa";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fetchWithAuth from "@/utils/fetchWithAuth";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

const labelStyle = { fill: "#374151", fontSize: 12, fontWeight: "bold" };
const iconBtnClass = "w-11 h-11 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition";
const colors = ["#68bddd", "#6f80ac", "#4B5563"];

export default function GraphEntrantsSortants({
  exportMode = false,
  selectedGraphs = [],
  onGraphSelect,
  globalStartDate,
  globalEndDate,
}) {
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [lastFilterSource, setLastFilterSource] = useState("default");
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentColor, setCommentColor] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [editingColor, setEditingColor] = useState("");
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState(["stock", "non_traite", "traite"]);

  const chartRef = useRef(null);
  const modalChartRef = useRef(null);
  const endDateRef = useRef(null);

  const normalizeDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getLatestDate = (list) => {
    const validDates = list
      .map((item) => new Date(item.date))
      .filter((d) => d.getDay() !== 0 && d.getDay() !== 6);
    return validDates.length ? new Date(Math.max(...validDates)) : null;
  };

  const getPeriodRange = (latest) => {
    const end = new Date(latest);
    let start = new Date(end);
    if (selectedPeriod === "day") {
      // Jour unique : on veut afficher uniquement le dernier jour dispo (hors week-end)
      return [end, end];
    }
    if (selectedPeriod === "week") start.setDate(end.getDate() - 6);
    if (selectedPeriod === "month") start.setDate(end.getDate() - 29);
    if (selectedPeriod === "quarter") start.setMonth(end.getMonth() - 3);
    if (selectedPeriod === "year") start.setFullYear(end.getFullYear() - 1);
    return [start, end];
  };
  

  const handleLocalFilterChange = (period) => {
    setLastFilterSource("local");
    setSelectedPeriod(period);
    if (period !== "custom") {
      setStartDate(null);
      setEndDate(null);
    }
  };
  useEffect(() => {
    if (globalStartDate && globalEndDate) {
      setLastFilterSource("global");
    }
  }, [globalStartDate, globalEndDate]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/ftth/regle/");
        const rawData = await res.json();
        if (!rawData || !rawData.length) return setData([]);
  
        // Grouper les données
        const grouped = rawData.reduce((acc, curr) => {
          const dateKey = formatDate(curr.date);
          if (!acc[dateKey]) {
            acc[dateKey] = { stock: 0, closed: 0, newCases: 0 };
          }
          acc[dateKey].stock += curr.nbr_stoc_veille || 0;
          acc[dateKey].closed += curr.fermer_hier || 0;
          acc[dateKey].newCases += curr.nouveau_cas || 0;
          return acc;
        }, {});
  
        // Trier les dates
        let sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
  
        // Appliquer les filtres
        let start, end;
        if (lastFilterSource === "local") {
          if (selectedPeriod === "custom" && startDate && endDate) {
            start = normalizeDate(startDate);
            end = normalizeDate(endDate);
          } else if (selectedPeriod === "day") {
            start = end = normalizeDate(getLatestDate(rawData));
          } else {
            [start, end] = getPeriodRange(getLatestDate(rawData));
          }
        } else if (lastFilterSource === "global" && globalStartDate && globalEndDate) {
          start = normalizeDate(globalStartDate);
          end = normalizeDate(globalEndDate);
        } else {
          [start, end] = getPeriodRange(getLatestDate(rawData));
        }
  
        const filteredDates = sortedDates.filter((date) => {
          const dateObj = normalizeDate(date);
          const day = dateObj.getDay();
          return dateObj >= start && dateObj <= end && day !== 0 && day !== 6;
        });
  
        const finalData = filteredDates.map((date) => ({
          date: new Date(date).toLocaleDateString("fr-FR"),
          stock: grouped[date].stock,
          non_traite: grouped[date].closed,
          traite: grouped[date].newCases,
        }));
  
        setData(finalData);
      } catch (err) {
        console.error("❌ Erreur données Entrants/Sortants :", err);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };
  
    fetchData();
  }, [selectedPeriod, startDate, endDate, globalStartDate, globalEndDate, lastFilterSource]);
  

  const maxYValue = Math.max(...data.flatMap((d) => [d.stock, d.non_traite, d.traite]), 0);
  const maxY = Math.ceil((maxYValue + 100) / 100) * 100;
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
                    className={`w-6 h-6 rounded-full border-2 ${
                      editingColor === color ? "border-black" : "border-transparent"
                    }`}
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

    const handleReset = () => {
      setVisibleKeys(["stock", "non_traite", "traite"]);
      setSelectedPeriod("week");
      setStartDate(null);
      setEndDate(null);
      setLastFilterSource("local");
    };
    

  return (
    <div
      data-graph-id="graph-entrants-sortants"
      data-graph-label="Entrants – Sortants – Nouveaux cas"
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

      {/* 🧠 Header + Actions */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-semibold text-gray-800">Entrants – Sortants – Nouveaux cas</h3>
        <div className="flex gap-2">
          {exportMode && (
            <input
              type="checkbox"
              className="w-5 h-5 accent-blue-600"
              checked={selectedGraphs?.includes("graph-entrants-sortants")}
              onChange={(e) =>
                onGraphSelect?.("graph-entrants-sortants", e.target.checked)
              }
            />
          )}
          <button onClick={(e) => { e.stopPropagation(); setShowCommentPopup(true); }} className={iconBtnClass}>
            <FaPencilAlt className="text-gray-700" />
          </button>
          <button onClick={handleReset} className={iconBtnClass}>
  <FaSyncAlt className="text-gray-700" />
</button>

          <button onClick={() => setModalIsOpen(true)} className={iconBtnClass}>
            <FaExpand className="text-gray-700" />
          </button>
        </div>
      </div>

      {/* 📅 Filtres personnalisés */}
      <div className="flex flex-wrap gap-4 items-center my-4">
        <select
          className="p-2 rounded-xl border border-gray-300 bg-white shadow text-sm"
          value={selectedPeriod}
          onChange={(e) => handleLocalFilterChange(e.target.value)}
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
            <DatePicker
              selected={startDate}
              onChange={(d) => {
                handleLocalFilterChange("custom");
                setStartDate(d);
                setTimeout(() => endDateRef.current?.setFocus(), 200);
              }}
              selectsStart startDate={startDate} endDate={endDate}
              placeholderText="Date de début"
              className="p-2 rounded-xl border border-gray-300 text-sm bg-white shadow"
            />
            <DatePicker
              ref={endDateRef}
              selected={endDate}
              onChange={(d) => {
                handleLocalFilterChange("custom");
                setEndDate(d);
              }}
              selectsEnd startDate={startDate} endDate={endDate}
              placeholderText="Date de fin"
              className="p-2 rounded-xl border border-gray-300 text-sm bg-white shadow"
            />
          </>
        )}
      </div>

      {/* 📊 Graphique */}
      <div
        id="canvas-graph-entrants-sortants"
        ref={chartRef}
        className="relative rounded-xl bg-white shadow-inner p-4"
        style={{ height: 480 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="date" angle={-35} textAnchor="end" height={85}
              tick={{ fontSize: 14, fill: "#1f2937", fontWeight: 600 }} />
            <YAxis domain={[0, maxY]} />
            <Tooltip />
            <Legend onClick={(e) => setVisibleKeys([e.dataKey])} />
            {visibleKeys.includes("stock") && (
              <Bar dataKey="stock" name="Stock de la veille" fill={colors[0]} radius={[6, 6, 0, 0]}>
                <LabelList dataKey="stock" position="top" style={labelStyle} />
              </Bar>
            )}
            {visibleKeys.includes("non_traite") && (
              <Bar dataKey="non_traite" name="Fermé hier" fill={colors[1]} radius={[6, 6, 0, 0]}>
                <LabelList dataKey="non_traite" position="top" style={labelStyle} />
              </Bar>
            )}
            {visibleKeys.includes("traite") && (
              <Bar dataKey="traite" name="Nouveaux cas" fill={colors[2]} radius={[6, 6, 0, 0]}>
                <LabelList dataKey="traite" position="top" style={labelStyle} />
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
        {renderAnnotations(chartRef)}
      </div>

      {/* 💬 Popup commentaire + 🔍 Modal => Même style que VueEnsemble */}
      {showCommentPopup && (
        <div className="absolute top-10 right-10 bg-white p-4 rounded-xl shadow-2xl z-50 w-72" onClick={(e) => e.stopPropagation()}>
          <h4 className="text-lg font-semibold mb-2 text-gray-800">Ajouter un commentaire</h4>
          <textarea className="w-full border border-gray-300 rounded-lg p-2 mb-2 text-sm"
            rows={3} placeholder="Votre commentaire…"
            value={commentText} onChange={(e) => setCommentText(e.target.value)} />
          <div className="flex gap-3 mb-4">
            {["#22c55e", "#eab308", "#ef4444"].map((color) => (
              <button key={color} onClick={() => setCommentColor(color)}
                className={`w-6 h-6 rounded-full border-2 ${commentColor === color ? "border-black" : "border-transparent"}`}
                style={{ backgroundColor: color }} />
            ))}
          </div>
          <button disabled={!commentText || !commentColor}
            onClick={() => {
              setAnnotations((prev) => [...prev, { id: Date.now(), text: commentText, color: commentColor, x: 100, y: 50 }]);
              setCommentText(""); setCommentColor(""); setShowCommentPopup(false);
            }}
            className={`w-full py-2 rounded-lg font-bold text-white ${commentText && commentColor ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}>
            Valider
          </button>
        </div>
      )}

      {/* 🔍 Modal agrandi */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
  <h3 className="text-2xl font-semibold text-gray-800">Entrants – Sortants – Nouveaux cas</h3>
  <div className="flex gap-2 items-center">
    <button onClick={handleReset} className={iconBtnClass}>
      <FaSyncAlt className="text-gray-700" />
    </button>
    <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
  </div>
</div>

          <div ref={modalChartRef} className="relative" style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="date" angle={-35} textAnchor="end" height={85}
                  tick={{ fontSize: 14, fill: "#1f2937", fontWeight: 600 }} />
                <YAxis domain={[0, maxY]} />
                <Tooltip />
                <Legend onClick={(e) => setVisibleKeys([e.dataKey])} />
                {visibleKeys.includes("stock") && (
                  <Bar dataKey="stock" name="Stock de la veille" fill={colors[0]} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="stock" position="top" style={labelStyle} />
                  </Bar>
                )}
                {visibleKeys.includes("non_traite") && (
                  <Bar dataKey="non_traite" name="Fermé hier" fill={colors[1]} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="non_traite" position="top" style={labelStyle} />
                  </Bar>
                )}
                {visibleKeys.includes("traite") && (
                  <Bar dataKey="traite" name="Nouveaux cas" fill={colors[2]} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="traite" position="top" style={labelStyle} />
                  </Bar>
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
