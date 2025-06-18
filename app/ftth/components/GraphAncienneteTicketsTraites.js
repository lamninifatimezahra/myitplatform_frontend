"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList
} from "recharts";
import { FaExpand, FaPencilAlt, FaSyncAlt } from "react-icons/fa";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fetchWithAuth from "@/utils/fetchWithAuth";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

const iconBtnClass = "w-11 h-11 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition";
const colors = ["#68bddd", "#6f80ac", "#4B5563", "#9ca3af", "#60a5fa"];

export default function GraphAncienneteTicketsTraites({ globalStartDate, globalEndDate }) {
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [lastFilterSource, setLastFilterSource] = useState("default");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentColor, setCommentColor] = useState("");
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
    switch (selectedPeriod) {
      case "week": start.setDate(today.getDate() - 6); break;
      case "month": start.setDate(today.getDate() - 29); break;
      case "quarter": start.setMonth(today.getMonth() - 3); break;
      case "year": start.setFullYear(today.getFullYear() - 1); break;
    }
    return [start, today];
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let start, end;
      if (lastFilterSource === "local") {
        if (selectedPeriod === "custom" && startDate && endDate) {
          start = normalizeDate(startDate);
          end = normalizeDate(endDate);
        } else {
          [start, end] = getPeriodRange();
        }
      } else if (globalStartDate && globalEndDate) {
        start = normalizeDate(globalStartDate);
        end = normalizeDate(globalEndDate);
      } else {
        [start, end] = getPeriodRange();
      }

      const res = await fetchWithAuth("https://myit-backend-its-c20c9354ce42.herokuapp.com/dashboard/api/ftth/stock/");
      const json = await res.json();

      const grouped = json.filter(item => {
        const d = normalizeDate(item.date);
        return d >= start && d <= end;
      }).reduce((acc, item) => {
        const day = new Date(item.date).toLocaleDateString("fr-FR");
        const value = item.traite || 0;
        const existing = acc.find((e) => e.date === day);
        if (existing) {
          existing.value += value;
        } else {
          acc.push({ date: day, value, color: colors[Math.floor(Math.random() * colors.length)] });
        }
        return acc;
      }, []);

      setData(grouped);
    } catch (error) {
      console.error("Erreur de chargement :", error);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriod, startDate, endDate, globalStartDate, globalEndDate, lastFilterSource]);

  const handleReset = () => {
    setSelectedPeriod("week");
    setStartDate(null);
    setEndDate(null);
    setLastFilterSource("local");
  };

  const renderAnnotations = (ref) => annotations.map((ann) => (
    <div
      key={ann.id}
      className="absolute p-2 rounded-lg shadow text-white text-sm z-40"
      style={{
        backgroundColor: ann.color,
        top: ann.y,
        left: ann.x,
        maxWidth: "160px"
      }}
    >
      {ann.text}
    </div>
  ));

return (
<div
  data-graph-id="graph-anciennete-tickets-traites"
  data-graph-label="Ancienneté des Tickets Traités"
    className="bg-white shadow-xl rounded-2xl p-6 relative"
  >
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-blue-800 font-semibold">Chargement MyIT…</p>
          </div>
        </div>
      )}

      {/* 🔵 Header et actions */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-semibold text-slate-800">Ancienneté des Tickets Traités</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowCommentPopup(true)} className={iconBtnClass}><FaPencilAlt /></button>
          <button onClick={handleReset} className={iconBtnClass}><FaSyncAlt /></button>
          <button onClick={() => setModalIsOpen(true)} className={iconBtnClass}><FaExpand /></button>
        </div>
      </div>

      {/* 📅 Filtres personnalisés */}
      <div className="flex flex-wrap gap-4 items-center my-4">
        <select className="p-2 rounded-xl border border-gray-300 bg-white shadow text-sm" value={selectedPeriod}
          onChange={(e) => { setLastFilterSource("local"); setSelectedPeriod(e.target.value); }}>
          <option value="day">Aujourd’hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="quarter">Trimestre</option>
          <option value="year">Cette année</option>
          <option value="custom">📅 Personnalisé</option>
        </select>
        {selectedPeriod === "custom" && (
          <>
            <DatePicker selected={startDate} onChange={(d) => setStartDate(d)}
              className="p-2 border rounded shadow text-sm" placeholderText="Date de début" />
            <DatePicker selected={endDate} onChange={(d) => setEndDate(d)}
              className="p-2 border rounded shadow text-sm" placeholderText="Date de fin" />
          </>
        )}
      </div>

      {/* 📊 Graph principal */}
      <div id="canvas-graph-anciennete-tickets-traites" ref={chartRef}
 className="relative rounded-xl bg-white shadow-inner p-4" style={{ height: 480 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#4a90e2" strokeWidth={2}>
              <LabelList dataKey="value" position="top" style={{ fill: "#1f2937", fontSize: 12, fontWeight: "bold" }} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
        {renderAnnotations(chartRef)}
      </div>

      {/* 🔍 Modal Agrandi */}
      <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)} className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Ancienneté des Tickets Traités</h3>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          <div ref={modalChartRef} style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#4a90e2" strokeWidth={2}>
                  <LabelList dataKey="value" position="top" style={{ fill: "#1f2937", fontSize: 13, fontWeight: "bold" }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Modal>
    </div>
  );
}
