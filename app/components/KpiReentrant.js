"use client";

import { useEffect, useState, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { AiOutlineCalendar } from "react-icons/ai";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useGlobalFilter } from "./GlobalFilterContext";

// Calcul ISO semaine
const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

// Header custom
const renderCustomHeader = ({ date, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => (
  <div className="flex justify-between items-center p-2 bg-gray-100 rounded-t-md">
    <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>{"<"}</button>
    <span className="font-medium">
      {date.toLocaleString("fr-FR", { month: "long", year: "numeric" })}
    </span>
    <button onClick={increaseMonth} disabled={nextMonthButtonDisabled}>{">"}</button>
  </div>
);

// Normalisation sans l'heure
const normalizeDate = (input) => {
  if (!input) return null;
  const date = typeof input === "string" ? new Date(input) : input;
  if (isNaN(date)) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export default function KpiReentrant({
  apiUrl,
  title = "Tickets Réentrants",
  tagField = "tag_reentrant",
  dateField = "date_sortie"
}) {
  const id = `KPI ${title}`;
  const calendarRef = useRef(null);
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  const [data, setData] = useState([]);
  const [reentrantCount, setReentrantCount] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [error, setError] = useState(null);

  const [localStartDate, setLocalStartDate] = useState(null);
  const [localEndDate, setLocalEndDate] = useState(null);
  const [localModifiedAt, setLocalModifiedAt] = useState(0);

  const effectiveStartDate = globalModifiedAt > localModifiedAt && globalStartDate ? globalStartDate : localStartDate;
  const effectiveEndDate = globalModifiedAt > localModifiedAt && globalEndDate ? globalEndDate : localEndDate;

  useEffect(() => {
    function handleClickOutside(event) {
      if (isCalendarOpen &&
        calendarRef.current &&
        !calendarRef.current.contains(event.target) &&
        !event.target.closest('button[data-calendar-toggle]')) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCalendarOpen]);

  useEffect(() => {
    if (globalModifiedAt > localModifiedAt) {
      setLocalStartDate(globalStartDate);
      setLocalEndDate(globalEndDate);
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt]);

  useEffect(() => {
    if (!apiUrl) {
      setError("L'URL de l'API est requise");
      return;
    }

    fetchWithAuth(apiUrl)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        calculateReentrantTickets(json, effectiveStartDate, effectiveEndDate);
      })
      .catch((err) => {
        setError("Erreur lors du chargement des données");
      });
  }, [apiUrl, effectiveStartDate, effectiveEndDate]);

  useEffect(() => {
    calculateReentrantTickets(data, effectiveStartDate, effectiveEndDate);
  }, [data, effectiveStartDate, effectiveEndDate]);

  const calculateReentrantTickets = (tickets, startDate, endDate) => {
    if (!tickets || tickets.length === 0) return setReentrantCount(0);

    const start = startDate ? normalizeDate(startDate) : null;
    const end = endDate ? normalizeDate(endDate) : null;

    const isReentrant = (ticket) =>
      ticket[tagField] && ticket[tagField].trim() !== "";

    const inRange = (ticketDate) =>
      ticketDate && start && end && ticketDate >= start && ticketDate <= end;

    const total = tickets.filter(ticket => {
      const rawDate = ticket[dateField];
      const ticketDate = normalizeDate(rawDate);
      return isReentrant(ticket) && (!start || !end || inRange(ticketDate));
    });

    setReentrantCount(total.length);
  };

  const formatDate = (date) => {
    if (!date) return "";
    const formatted = date.toLocaleDateString("fr-FR");
    const week = getWeekNumber(date);
    return `${formatted} (S-${week})`;
  };

  const periodeLabel = effectiveStartDate && effectiveEndDate
    ? `Période : ${formatDate(effectiveStartDate)} → ${formatDate(effectiveEndDate)}`
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
        <div className="flex justify-between items-start w-full mb-2">
          <h3 className="text-gray-800 text-lg font-medium">{title}</h3>
          <button
            className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            data-calendar-toggle="true">
            <AiOutlineCalendar size={20} className="text-gray-800" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-1">{periodeLabel}</p>
        <p className="text-3xl font-bold text-black">{reentrantCount}</p>

        {isCalendarOpen && (
          <div
            ref={calendarRef}
            className="absolute right-0 top-14 mt-2 bg-white shadow-lg rounded-md p-2 z-50">
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
