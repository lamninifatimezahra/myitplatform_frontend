"use client";

import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { AiOutlineCalendar } from "react-icons/ai";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useExport } from "./ExportContext"; // adapte le chemin si nécessaire

// Fonction pour obtenir le numéro de semaine ISO
const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

// Header personnalisé pour le calendrier
const renderCustomHeader = ({
  date,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}) => (
  <div className="flex justify-between items-center p-2 bg-gray-100 rounded-t-md">
    <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>{"<"}</button>
    <span className="font-medium">
      {date.toLocaleString("fr-FR", { month: "long", year: "numeric" })}
    </span>
    <button onClick={increaseMonth} disabled={nextMonthButtonDisabled}>{">"}</button>
  </div>
);

export default function KpiTicketsEntrants() {
  const id = "KPI Tickets Entrants";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/api/hispeed/data/`)
      .then((res) => res.json())
      .then((jsonData) => {
        setData(jsonData);
        calculateTickets(jsonData, startDate, endDate);
      })
      .catch((err) => console.error("Erreur de chargement :", err));
  }, []);

  useEffect(() => {
    calculateTickets(data, startDate, endDate);
  }, [startDate, endDate]);

  const calculateTickets = (tickets, start, end) => {
    if (!start || !end) {
      setTicketsCount(tickets.length);
    } else {
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];
      const filtered = tickets.filter(t => t.date_sortie >= startStr && t.date_sortie <= endStr);
      setTicketsCount(filtered.length);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    const formatted = date.toLocaleDateString("fr-FR");
    const week = getWeekNumber(date);
    return `${formatted} (S-${week})`;
  };

  const periodeLabel = startDate && endDate
    ? `${formatDate(startDate)} → ${formatDate(endDate)}`
    : "Toutes les périodes";

  return (
    <div className="visualisation relative w-64" data-id={id}>
      <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">

        {/* ✅ Bouton filtre (coin supérieur droit) */}
        <div className="absolute top-3 right-3 z-50">
          <button
            className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          >
            <AiOutlineCalendar size={20} className="text-gray-800" />
          </button>
        </div>

        {/* ✅ Titre + période */}
        <h3 className="text-gray-800 text-lg font-medium">Tickets Entrants</h3>
        <p className="text-xs text-gray-500 mb-1">{periodeLabel}</p>

        {/* ✅ KPI */}
        <p className="text-3xl font-bold text-black">{ticketsCount}</p>

        {/* ✅ Calendrier popup */}
        {isCalendarOpen && (
          <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-2 z-50">
            <DatePicker
              selectsRange
              startDate={startDate}
              endDate={endDate}
              onChange={([start, end]) => {
                setStartDate(start);
                setEndDate(end);
              }}
              dateFormat="yyyy-MM-dd"
              placeholderText="Sélectionner une période"
              renderCustomHeader={renderCustomHeader}
              formatWeekNumber={getWeekNumber}
              showWeekNumbers
              inline
              
            />
          </div>
        )}
      </div>
    </div>
  );
}
