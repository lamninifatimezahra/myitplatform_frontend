"use client";

import React, { useEffect, useState, useRef } from "react";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fetchWithAuth from "@/utils/fetchWithAuth";


export default function KPIDossiersTraites({ onComponentReady }) {
  const [data, setData] = useState([]);
  const [value, setValue] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [diff, setDiff] = useState(null);
  const [percent, setPercent] = useState(null);
  const [color, setColor] = useState("text-gray-400");
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
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
      case "day":
        break;
      case "week":
        start.setDate(today.getDate() - 6);
        break;
      case "month":
        start.setDate(today.getDate() - 29);
        break;
      case "quarter":
        start.setMonth(today.getMonth() - 3);
        break;
      case "year":
        start.setFullYear(today.getFullYear() - 1);
        break;
    }

    return [start, end];
  };

  const computeSum = (entries, start, end) => {
    const normStart = normalizeDate(start);
    const normEnd = normalizeDate(end);

    return entries
      .filter((item) => {
        const itemDate = normalizeDate(item.date);
        return itemDate >= normStart && itemDate <= normEnd;
      })
      .reduce((sum, item) => sum + (item.traite || 0), 0);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/api/ftth/stock/`);
        const json = await res.json();
        const sorted = json.sort((a, b) => new Date(b.date) - new Date(a.date));
        setData(sorted);
      } catch (err) {
        console.error("Erreur KPI Dossiers Traités:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (data.length === 0) return;

    let start, end;
    if (selectedPeriod === "custom" && startDate && endDate) {
      start = startDate;
      end = endDate;
    } else {
      [start, end] = getPeriodRange();
    }

    const currentSum = computeSum(data, start, end);

    const prevStart = new Date(start);
    const prevEnd = new Date(start);
    const delta = end - start;
    prevStart.setTime(prevStart.getTime() - delta);
    prevEnd.setTime(prevEnd.getTime() - 1);

    const previousSum = computeSum(data, prevStart, prevEnd);
    const variation = currentSum - previousSum;
    const variationPct = previousSum !== 0 ? (variation / previousSum) * 100 : 100;

    setValue(currentSum);
    setPrevious(previousSum);
    setDiff(Math.abs(variation));
    setPercent(Math.abs(variationPct));
    setColor(variation >= 0 ? "text-green-500" : "text-red-500");

    if (!isReady && typeof onComponentReady === "function") {
      onComponentReady();
      setIsReady(true);
    }
  }, [data, selectedPeriod, startDate, endDate, isReady, onComponentReady]);

  return (
    <motion.div
      id="kpi-dossiers-traites"
      className="relative kpi-card bg-white rounded-lg shadow-md p-4 hover:shadow-xl transition-all duration-300"
      whileHover={{ scale: 1.05 }}
    >
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-70 backdrop-blur-sm rounded-lg">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-blue-700 font-semibold">
              Chargement <span className="text-blue-500">MyIT</span>...
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-gray-700 text-sm font-semibold">Dossiers Traités</h3>
          <CheckCircle className="text-blue-500 w-4 h-4" />
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => {
            setSelectedPeriod(e.target.value);
            if (e.target.value !== "custom") {
              setStartDate(null);
              setEndDate(null);
            }
          }}
          className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white shadow-sm appearance-none bg-[url('/empty.png')] bg-no-repeat bg-right pr-6"
        >
          <option value="day">Aujourd’hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="quarter">Trimestre</option>
          <option value="year">Cette année</option>
          <option value="custom">📅 Personnalisé</option>
        </select>
      </div>

      {selectedPeriod === "custom" && (
        <div className="flex gap-3 mb-2">
          <DatePicker
            selected={startDate}
            onChange={(d) => {
              setStartDate(d);
              setTimeout(() => endDateRef.current?.setFocus(), 200);
            }}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            placeholderText="Date de début"
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white shadow-sm w-full"
          />
          <DatePicker
            ref={endDateRef}
            selected={endDate}
            onChange={(d) => setEndDate(d)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            placeholderText="Date de fin"
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white shadow-sm w-full"
          />
        </div>
      )}

      <p className="text-3xl font-bold">{value !== null ? value : "--"}</p>
      {percent !== null && diff !== null && (
        <p className={`text-sm font-medium ${color}`}>
          {diff >= 0 ? "+" : "-"}
          {percent.toFixed(1)}% ({diff >= 0 ? "+" : "-"}
          {diff} dossiers)
        </p>
      )}
    </motion.div>
  );
}
