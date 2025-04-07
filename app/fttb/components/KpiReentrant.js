"use client";

import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { AiOutlineCalendar } from "react-icons/ai";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useExport } from "./ExportContext"; // adapte le chemin si besoin

// Fonction pour calculer le numéro ISO de la semaine
const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

// Header du calendrier
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

export default function KpiReentrant() {
  const id = "kpi-reentrant";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reentrantCount, setReentrantCount] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/api/fttb/data/`)
      .then((response) => response.json())
      .then((jsonData) => {
        setData(jsonData);
        calculateReentrantTickets(jsonData, startDate, endDate);
      })
      .catch((error) => console.error("Erreur de chargement des données :", error));
  }, []);

  useEffect(() => {
    calculateReentrantTickets(data, startDate, endDate);
  }, [startDate, endDate]);

  const calculateReentrantTickets = (tickets, start, end) => {
    if (!start || !end) {
      setReentrantCount(tickets.filter(ticket => ticket.tag_reentrant.trim() !== "").length);
    } else {
      const startFormatted = start.toISOString().split("T")[0];
      const endFormatted = end.toISOString().split("T")[0];
      const filteredTickets = tickets.filter(ticket =>
        ticket.date_sortie >= startFormatted &&
        ticket.date_sortie <= endFormatted &&
        ticket.tag_reentrant.trim() !== ""
      );
      setReentrantCount(filteredTickets.length);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    const formatted = date.toLocaleDateString("fr-FR");
    const week = getWeekNumber(date);
    return `${formatted} (S-${week})`;
  };

  const periodeLabel = startDate && endDate
    ? `Période : ${formatDate(startDate)} → ${formatDate(endDate)}`
    : "Toutes les périodes";

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
    if (start && end) {
      setTimeout(() => {
        setIsCalendarOpen(false);
      }, 300);
    }
  };

  return (
    <div className="visualisation relative w-64" data-id={id}>
      <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">

        {/* 📅 Bouton filtre */}
        <div className="absolute top-3 right-3 z-50">
          <button
            className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          >
            <AiOutlineCalendar size={20} className="text-gray-800" />
          </button>
        </div>


        {/* Contenu principal */}
        <h3 className="text-gray-800 text-lg font-medium">Tickets Réentrants</h3>
        <p className="text-xs text-gray-500 mb-1">{periodeLabel}</p>
        <p className="text-3xl font-bold text-black">{reentrantCount}</p>

        {isCalendarOpen && (
          <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-2 z-50">
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
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
