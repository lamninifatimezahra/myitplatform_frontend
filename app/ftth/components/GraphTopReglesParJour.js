"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell
} from "recharts";
import { FaExpand, FaPencilAlt, FaSyncAlt } from "react-icons/fa";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fetchWithAuth from "@/utils/fetchWithAuth";
import holidaysData from "@/app/ftth/utils/holidays.json";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

const labelStyle = { fill: "#374151", fontSize: 12, fontWeight: "bold" };
const iconBtnClass = "w-11 h-11 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition";
const colors = ["#68bddd", "#6f80ac", "#4B5563", "#9ca3af", "#60a5fa"];

export default function GraphTopReglesParJour({
  exportMode = false, selectedGraphs = [], onGraphSelect,
  globalStartDate, globalEndDate,
}) {
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [lastFilterSource, setLastFilterSource] = useState("default");
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [annotations, setAnnotations] = useState([]);
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentColor, setCommentColor] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [editingColor, setEditingColor] = useState("");

  const chartRef = useRef(null);
  const modalChartRef = useRef(null);
  const endDateRef = useRef(null);
  const ruleColorMap = useRef({});

  const getColorForRule = (rule) => {
    if (!ruleColorMap.current[rule]) {
      const index = Object.keys(ruleColorMap.current).length % colors.length;
      ruleColorMap.current[rule] = colors[index];
    }
    return ruleColorMap.current[rule];
  };

  const normalizeDate = (date) => new Date(date).setHours(0, 0, 0, 0);

  const getPeriodRange = (latest) => {
    let start = new Date(latest);
    if (selectedPeriod === "week") start.setDate(latest.getDate() - 6);
    if (selectedPeriod === "month") start.setDate(latest.getDate() - 29);
    if (selectedPeriod === "quarter") start.setMonth(latest.getMonth() - 3);
    if (selectedPeriod === "year") start.setFullYear(latest.getFullYear() - 1);
    return [start, latest];
  };

  useEffect(() => {
    if (globalStartDate && globalEndDate) setLastFilterSource("global");
  }, [globalStartDate, globalEndDate]);

  const isWorkingDay = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDay(); // 0 = dimanche, 6 = samedi
  const formattedDate = date.toISOString().split("T")[0];
  const holidays = [
    ...Object.keys(holidaysData.france),
    ...Object.keys(holidaysData.morocco),
  ];
  return day !== 0 && day !== 6 && !holidays.includes(formattedDate);
};

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth("https://api.606510.xyz/dashboard/api/ftth/regle/");
        const json = await res.json();
        if (!json.length) return setData([]);

        const allDates = json.map(i => new Date(i.date));
        const latest = new Date(Math.max(...allDates));

        let start, end;
        if (lastFilterSource === "local") {
          [start, end] = selectedPeriod === "custom" && startDate && endDate
            ? [startDate, endDate]
            : getPeriodRange(latest);
        } else if (globalStartDate && globalEndDate) {
          [start, end] = [globalStartDate, globalEndDate];
        } else {
          [start, end] = getPeriodRange(latest);
        }

        const grouped = {};
        json.forEach(item => {
          const itemDate = normalizeDate(item.date);
          if (itemDate >= normalizeDate(start) && itemDate <= normalizeDate(end) && isWorkingDay(item.date)) {
            if (!grouped[item.date]) grouped[item.date] = [];
            grouped[item.date].push(item);
          }
        });

        const all = [];
        Object.entries(grouped).forEach(([date, rules]) => {
          const top5 = rules.sort((a, b) => (b.nouveau_cas || 0) - (a.nouveau_cas || 0)).slice(0, 5);
top5.forEach((rule, index) => {
  all.push({
    group: new Date(date).toLocaleDateString("fr-FR"),
    rule: rule.regle,
    value: rule.nouveau_cas || 0,
    color: getColorForRule(rule.regle),
    position: index,
  });
});

          all.push({ group: "", rule: "", value: null, color: "transparent", position: -1 });
        });

        const allWithLabels = all.map((d, i) => ({
          ...d,
          compositeLabel: d.position === 2 ? d.group : "",
        }));

        setData(allWithLabels.reverse()); // ✅ dernière date à droite
      } catch (err) {
        console.error("Erreur fetch règles :", err);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };

    fetchData();
  }, [selectedPeriod, startDate, endDate, globalStartDate, globalEndDate, lastFilterSource]);

  // ✅ Axe Y dynamique lisible
  const maxValue = Math.max(...data.map(d => d.value || 0), 0);
  let maxY = 100;
  if (maxValue < 10) maxY = Math.ceil((maxValue + 5) / 10) * 10;
  else if (maxValue < 100) maxY = Math.ceil((maxValue + 10) / 10) * 10;
  else if (maxValue < 1000) maxY = Math.ceil((maxValue + 100) / 100) * 100;
  else maxY = Math.ceil((maxValue + 500) / 500) * 500;
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
          setAnnotations(prev =>
            prev.map(a =>
              a.id === ann.id
                ? { ...a, x: Math.min(Math.max(0, initialX + dx), rect.width - 160), y: Math.min(Math.max(0, initialY + dy), rect.height - 80) }
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
        <div key={ann.id} onMouseDown={handleMouseDown} onClick={(e) => e.stopPropagation()}
          className="absolute p-2 rounded-lg shadow text-white text-sm z-40"
          style={{ backgroundColor: ann.color, top: ann.y, left: ann.x, cursor: isEditing ? "default" : "move", maxWidth: "160px" }}
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
              <textarea className="w-full border rounded p-2 text-sm mb-2" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
              <div className="flex gap-2 mb-2 justify-center">
                {["#22c55e", "#eab308", "#ef4444"].map((color) => (
                  <button key={color} onClick={() => setEditingColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${editingColor === color ? "border-black" : "border-transparent"}`}
                    style={{ backgroundColor: color }} />
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
    <div className="bg-white shadow-xl rounded-2xl p-6 relative"
      data-graph-id="graph-top-regles-par-jour"
      data-graph-label="Top 5 RÈGLES par jour"
      onClick={() => { setShowCommentPopup(false); setEditingComment(null); }}
    >
      {/* 🔹 En-tête + actions */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-semibold text-slate-800">Top 5 RÈGLES par jour</h3>
        <div className="flex gap-2">
          {exportMode && (
            <input type="checkbox" className="w-5 h-5 accent-blue-600"
              checked={selectedGraphs?.includes("graph-top-regles-par-jour")}
              onChange={(e) => onGraphSelect?.("graph-top-regles-par-jour", e.target.checked)} />
          )}
          <button onClick={(e) => { e.stopPropagation(); setShowCommentPopup(true); }} className={iconBtnClass}><FaPencilAlt /></button>
          <button onClick={() => {
            setSelectedPeriod("week");
            setStartDate(null);
            setEndDate(null);
            setLastFilterSource("local");
          }} className={iconBtnClass}><FaSyncAlt /></button>
          <button onClick={() => setModalIsOpen(true)} className={iconBtnClass}><FaExpand /></button>
        </div>
      </div>

      {/* 🔽 Filtres personnalisés */}
      <div className="flex flex-wrap gap-4 items-center my-4">
        <select className="p-2 rounded-xl border border-gray-300 bg-white shadow text-sm"
          value={selectedPeriod}
          onChange={(e) => {
            setSelectedPeriod(e.target.value);
            setLastFilterSource("local");
          }}>
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
            }} selectsStart startDate={startDate} endDate={endDate}
              placeholderText="Date de début" className="p-2 rounded-xl border border-gray-300 text-sm bg-white shadow" />
            <DatePicker ref={endDateRef} selected={endDate} onChange={(d) => setEndDate(d)}
              selectsEnd startDate={startDate} endDate={endDate}
              placeholderText="Date de fin" className="p-2 rounded-xl border border-gray-300 text-sm bg-white shadow" />
          </>
        )}
      </div>

      {/* 📊 Graphique */}
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

<div id="canvas-graph-top-regles-par-jour" ref={chartRef} className="relative rounded-xl bg-white shadow-inner p-4" style={{ height: 480 }}>

        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="compositeLabel" angle={-35} textAnchor="end" height={85}
              tick={{ fontSize: 13, fill: "#1f2937", fontWeight: 600 }} interval={0} />
            <YAxis domain={[0, maxY]} />
            <Tooltip />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="rule" position="top" angle={-90} dx={4} dy={-41}
                style={{ ...labelStyle, textAnchor: "end", fontSize: 13 }} />
              {data.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.color || "#ccc"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {renderAnnotations(chartRef)}
      </div>

      {/* 💬 Popup annotation */}
      {showCommentPopup && (
        <div className="absolute top-10 right-10 bg-white p-4 rounded-xl shadow-2xl z-50 w-72" onClick={(e) => e.stopPropagation()}>
          <h4 className="text-lg font-semibold mb-2 text-gray-800">Ajouter un commentaire</h4>
          <textarea className="w-full border border-gray-300 rounded-lg p-2 mb-2 text-sm" rows={3}
            placeholder="Votre commentaire…" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
          <div className="flex gap-3 mb-4">
            {["#22c55e", "#eab308", "#ef4444"].map((color) => (
              <button key={color} onClick={() => setCommentColor(color)}
                className={`w-6 h-6 rounded-full border-2 ${commentColor === color ? "border-black" : "border-transparent"}`}
                style={{ backgroundColor: color }} />
            ))}
          </div>
          <button disabled={!commentText || !commentColor} onClick={() => {
            setAnnotations(prev => [...prev, { id: Date.now(), text: commentText, color: commentColor, x: 100, y: 50 }]);
            setCommentText(""); setCommentColor(""); setShowCommentPopup(false);
          }}
            className={`w-full py-2 rounded-lg font-bold text-white ${commentText && commentColor ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}>
            Valider
          </button>
        </div>
      )}

      {/* 🔍 Modal agrandi avec même style que carte */}
      <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-gray-800">Top 5 RÈGLES par jour</h3>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          <div ref={modalChartRef} className="relative" style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="compositeLabel" angle={-35} textAnchor="end" height={85}
                  tick={{ fontSize: 13, fill: "#1f2937", fontWeight: 600 }} interval={0} />
                <YAxis domain={[0, maxY]} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="rule" position="top" angle={-90} dx={4} dy={-41}
                    style={{ ...labelStyle, textAnchor: "end", fontSize: 13 }} />
                  {data.map((entry, i) => (
                    <Cell key={`modal-cell-${i}`} fill={entry.color || "#ccc"} />
                  ))}
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
