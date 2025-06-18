"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList
} from "recharts";
import { FaExpand, FaSyncAlt } from "react-icons/fa";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// ✅ JSON local
import ticketsData from "../utils/tickets_entrants_sortants.json";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

const colors = ["#68bddd", "#6f80ac"];
const iconBtnClass = "w-11 h-11 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition";

export default function GraphTicketsEntrantsSortants({ globalStartDate, globalEndDate }) {
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [lastFilterSource, setLastFilterSource] = useState("default");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const chartRef = useRef(null);
  const modalChartRef = useRef(null);

  const normalizeDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getPeriodRange = () => {
    const today = new Date();
    let start = new Date(today);
    switch (selectedPeriod) {
      case "week": start.setDate(today.getDate() - 6); break; // 🔄 pour inclure plus de jours, mets -7
      case "month": start.setDate(today.getDate() - 29); break;
      case "quarter": start.setMonth(today.getMonth() - 3); break;
      case "year": start.setFullYear(today.getFullYear() - 1); break;
    }
    return [start, today];
  };

  useEffect(() => {
    const loadData = () => {
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

      const entrants = {};
      const sortants = {};

      ticketsData.forEach(ticket => {
        const createDate = ticket.CREATE_DATE ? normalizeDate(ticket.CREATE_DATE) : null;
        const sortieDate = ticket.DATE_SORTIE ? normalizeDate(ticket.DATE_SORTIE) : null;

        // ✅ Entrants : tickets créés dans la période
        if (createDate && createDate >= start && createDate <= end) {
          const key = createDate.toLocaleDateString("fr-FR");
          entrants[key] = (entrants[key] || 0) + 1;
        }

        // ✅ Sortants : tickets SORTIS (non null) dans la période
        if (sortieDate && sortieDate >= start && sortieDate <= end) {
          const key = sortieDate.toLocaleDateString("fr-FR");
          sortants[key] = (sortants[key] || 0) + 1;
        }
      });

      const allDates = Array.from(new Set([...Object.keys(entrants), ...Object.keys(sortants)]))
        .sort((a, b) => new Date(a.split("/").reverse().join("-")) - new Date(b.split("/").reverse().join("-")));

      const finalData = allDates.map(date => ({
        date,
        entrants: entrants[date] || 0,
        sortants: sortants[date] || 0
      }));

      setData(finalData);
      setTimeout(() => setLoading(false), 300);
    };

    loadData();
  }, [selectedPeriod, startDate, endDate, globalStartDate, globalEndDate, lastFilterSource]);

  const handleReset = () => {
    setSelectedPeriod("week");
    setStartDate(null);
    setEndDate(null);
    setLastFilterSource("local");
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 relative">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-blue-800 font-semibold">Chargement MyIT...</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-semibold text-slate-800">Tickets Entrants / Sortants</h3>
        <div className="flex gap-2">
          <button onClick={handleReset} className={iconBtnClass}><FaSyncAlt /></button>
          <button onClick={() => setModalIsOpen(true)} className={iconBtnClass}><FaExpand /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center my-4">
        <select className="p-2 rounded-xl border border-gray-300 bg-white shadow text-sm" value={selectedPeriod}
          onChange={(e) => { setLastFilterSource("local"); setSelectedPeriod(e.target.value); }}>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="quarter">Trimestre</option>
          <option value="year">Cette année</option>
          <option value="custom">📅 Personnalisé</option>
        </select>
        {selectedPeriod === "custom" && (
          <>
            <DatePicker selected={startDate} onChange={(d) => setStartDate(d)} selectsStart startDate={startDate} endDate={endDate}
              className="p-2 border rounded shadow text-sm" placeholderText="Date de début" />
            <DatePicker selected={endDate} onChange={(d) => setEndDate(d)} selectsEnd startDate={startDate} endDate={endDate}
              className="p-2 border rounded shadow text-sm" placeholderText="Date de fin" />
          </>
        )}
      </div>

<div
  id="canvas-graph-tickets-entrants-sortants"
  data-graph-id="graph-tickets-entrants-sortants"
  data-graph-label="Tickets Entrants / Sortants"
        ref={chartRef}
        className="relative rounded-xl bg-white shadow-inner p-4"
        style={{ height: 480 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="entrants" name="Entrants" fill={colors[0]} radius={[6, 6, 0, 0]}>
              <LabelList dataKey="entrants" position="top" />
            </Bar>
            <Bar dataKey="sortants" name="Sortants" fill={colors[1]} radius={[6, 6, 0, 0]}>
              <LabelList dataKey="sortants" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)} className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Tickets Entrants / Sortants</h3>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          <div ref={modalChartRef} className="relative" style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="entrants" fill={colors[0]}>
                  <LabelList dataKey="entrants" position="top" />
                </Bar>
                <Bar dataKey="sortants" fill={colors[1]}>
                  <LabelList dataKey="sortants" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Modal>
    </div>
  );
}
