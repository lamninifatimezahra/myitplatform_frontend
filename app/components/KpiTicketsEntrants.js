"use client";

import { useEffect, useState, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { AiOutlineCalendar } from "react-icons/ai";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useGlobalFilter } from "./GlobalFilterContext";

// Fonction pour obtenir le numéro de la semaine ISO
const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

// Header personnalisé pour le DatePicker
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

export default function KpiTicketsEntrants({
  apiUrl,
  title = "Tickets Entrants",
  dateFilterField = "date_derniere_maj",
  filterType = "all"
}) {
  const id = `KPI ${title}`;
  const calendarRef = useRef(null);

  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [localStartDate, setLocalStartDate] = useState(null);
  const [localEndDate, setLocalEndDate] = useState(null);
  const [localModifiedAt, setLocalModifiedAt] = useState(0);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Fermer le calendrier si clic en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isCalendarOpen &&
        calendarRef.current &&
        !calendarRef.current.contains(event.target) &&
        !event.target.closest('button[data-calendar-toggle]')
      ) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCalendarOpen]);

  // Appliquer filtre global si plus récent que local
  useEffect(() => {
    if (globalModifiedAt > localModifiedAt) {
      setLocalStartDate(globalStartDate);
      setLocalEndDate(globalEndDate);
      setLocalModifiedAt(globalModifiedAt); // 🔄 important pour ne pas bloquer le filtre global
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt, localModifiedAt]);

  const effectiveStartDate =
    globalModifiedAt > localModifiedAt && globalStartDate ? globalStartDate : localStartDate;
  const effectiveEndDate =
    globalModifiedAt > localModifiedAt && globalEndDate ? globalEndDate : localEndDate;

  // Chargement des données
  useEffect(() => {
    if (!apiUrl) {
      setError("L'URL de l'API est requise");
      return;
    }

    fetchWithAuth(apiUrl)
      .then((res) => res.json())
      .then((jsonData) => {
        setData(jsonData);
        calculateTickets(jsonData, effectiveStartDate, effectiveEndDate);
      })
      .catch((err) => {
        setError("Erreur lors du chargement des données");
      });
  }, [apiUrl, effectiveStartDate, effectiveEndDate]);

  // Recalculer à chaque changement
  useEffect(() => {
    calculateTickets(data, effectiveStartDate, effectiveEndDate);
  }, [data, effectiveStartDate, effectiveEndDate, dateFilterField]);

  // ✅ Fonction de calcul finale avec log de débogage
  const normalizeDate = (d) => {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    return nd;
  };
  
  const calculateTickets = (tickets, start, end) => {
    if (!tickets || tickets.length === 0) {
      setTicketsCount(0);
      return;
    }
  
    if (!start || !end) {
      setTicketsCount(tickets.length);
      return;
    }
  
    const startDate = normalizeDate(start);
    const endDate = normalizeDate(end);
  
    const filtered = tickets.filter((t) => {
      const dateRaw = t[dateFilterField];
      if (!dateRaw) return false;
      const ticketDate = normalizeDate(dateRaw);
      return ticketDate >= startDate && ticketDate <= endDate;
    });
  
    setTicketsCount(filtered.length);
  };
  
  const formatDate = (date) => {
    if (!date) return "";
    const formatted = date.toLocaleDateString("fr-FR");
    const week = getWeekNumber(date);
    return `${formatted} (S-${week})`;
  };

  const periodeLabel =
    effectiveStartDate && effectiveEndDate
      ? `${formatDate(effectiveStartDate)} → ${formatDate(effectiveEndDate)}`
      : "Toutes les périodes";

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setLocalStartDate(start);
    setLocalEndDate(end);
    setLocalModifiedAt(Date.now());
    if (start && end) {
      setTimeout(() => setIsCalendarOpen(false), 300);
    }
  };

  if (error) {
    return (
      <div className="visualisation relative w-64" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <h3 className="text-gray-800 text-lg font-medium">{title}</h3>
          <p className="text-red-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="visualisation relative w-64" data-id={id}>
      <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
        <div className="no-export flex justify-between items-start w-full mb-2">
          <h3 className="text-gray-800 text-lg font-medium">{title}</h3>
          <button
            className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            data-calendar-toggle="true"
          >
            <AiOutlineCalendar size={20} className="text-gray-800" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-1">{periodeLabel}</p>
        <p className="text-3xl font-bold text-black">{ticketsCount}</p>

        {isCalendarOpen && (
          <div
            ref={calendarRef}
            className="absolute right-0 top-14 mt-2 bg-white shadow-lg rounded-md p-2 z-50"
          >
            <DatePicker
              selectsRange
              startDate={localStartDate}
              endDate={localEndDate}
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
