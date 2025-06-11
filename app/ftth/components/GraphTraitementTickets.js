"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList
} from "recharts";
import { FaExpand, FaPencilAlt, FaSyncAlt } from "react-icons/fa";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fetchWithAuth from "@/utils/fetchWithAuth";
import holidaysData from "@/app/ftth/utils/holidays.json";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

const labelStyle = { fill: "#374151", fontSize: 12, fontWeight: "bold" };
const color = "#6f80ac"; // couleur différente de emails
const iconBtnClass = "w-11 h-11 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition";

export default function GraphTraitementTickets({ globalStartDate, globalEndDate }) {
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [lastFilterSource, setLastFilterSource] = useState("default");
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getYAxisMax = (values) => {
    const max = Math.max(...values, 0);
    if (max <= 10) return 20;
    if (max <= 20) return 30;
    if (max <= 50) return 60;
    if (max <= 100) return 120;
    return Math.ceil((max + 50) / 50) * 50;
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

      try {
        const res = await fetchWithAuth("https://myit-backend-its-c20c9354ce42.herokuapp.com/dashboard/api/ftth/tickets/");
        const json = await res.json();

        const filtered = json
          .map((item) => ({ ...item, dateObj: new Date(item.date) }))
          .filter((item) => {
            const d = normalizeDate(item.dateObj);
            return d >= start && d <= end;
          })
          .sort((a, b) => a.dateObj - b.dateObj);

        const finalData = filtered.map((item) => ({
          date: item.dateObj.toLocaleDateString("fr-FR"),
          tickets: item.tickets || item.nb || item.count || 0, // adapte ici si ta clé est différente
        }));

        setData(finalData);
      } catch (error) {
        console.error("Erreur de chargement tickets :", error);
        setData([]);
      } finally {
        setTimeout(() => setLoading(false), 400);
      }
    };

    fetchData();
  }, [selectedPeriod, startDate, endDate, globalStartDate, globalEndDate, lastFilterSource]);

  const maxY = getYAxisMax(data.map((d) => d.tickets));

  return (
    <div data-graph-id="graph-traitement-tickets" data-graph-label="Traitement des tickets"
      className="bg-white shadow-xl rounded-2xl p-6 relative">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-blue-800 font-semibold text-sm">Chargement <span className="text-blue-500">MyIT</span>…</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-semibold text-gray-800">Traitement des tickets</h3>
        <div className="flex gap-2">
          <button onClick={() => setSelectedPeriod("week")} className={iconBtnClass}><FaSyncAlt /></button>
          <button onClick={() => setModalIsOpen(true)} className={iconBtnClass}><FaExpand /></button>
        </div>
      </div>

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
            <DatePicker selected={startDate} onChange={(d) => { setStartDate(d); setTimeout(() => endDateRef.current?.setFocus(), 200); }}
              selectsStart startDate={startDate} endDate={endDate} placeholderText="Date de début"
              className="p-2 rounded-xl border border-gray-300 text-sm bg-white shadow" />
            <DatePicker ref={endDateRef} selected={endDate} onChange={(d) => setEndDate(d)}
              selectsEnd startDate={startDate} endDate={endDate} placeholderText="Date de fin"
              className="p-2 rounded-xl border border-gray-300 text-sm bg-white shadow" />
          </>
        )}
      </div>

      <div id="canvas-graph-traitement-tickets" ref={chartRef} className="relative rounded-xl bg-white shadow-inner p-4" style={{ height: 480 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="date" angle={-35} textAnchor="end" height={85} tick={{ fontSize: 14, fill: "#1f2937", fontWeight: 600 }} />
            <YAxis domain={[0, maxY]} />
            <Tooltip />
            <Bar dataKey="tickets" fill={color} radius={[6, 6, 0, 0]}>
              <LabelList dataKey="tickets" position="top" style={labelStyle} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Traitement des tickets</h3>
            <div className="flex gap-2 items-center">
              <button onClick={() => setSelectedPeriod("week")} className={iconBtnClass}>
                <FaSyncAlt className="text-gray-700" />
              </button>
              <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
            </div>
          </div>

          <div ref={modalChartRef} className="relative" style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="date" angle={-35} textAnchor="end" height={85} tick={{ fontSize: 14, fill: "#1f2937", fontWeight: 600 }} />
                <YAxis domain={[0, maxY]} />
                <Tooltip />
                <Bar dataKey="tickets" fill={color} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="tickets" position="top" style={labelStyle} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Modal>
    </div>
  );
}
