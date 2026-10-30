"use client";

import { useEffect, useState, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { AiOutlineCalendar } from "react-icons/ai";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useGlobalFilter } from "./GlobalFilterContext";
import { buildBacklogHistory, getBacklogValuesForDates } from "@/app/ftth/utils/backlogHistory";

const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

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

// Normalisation des dates (ignorer l'heure)
const normalizeDate = (input) => {
  if (!input) return null;
  const date = typeof input === "string" ? new Date(input) : input;
  if (isNaN(date)) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getWorkingDaysBetween = (startDate, endDate) => {
  const currentDate = normalizeDate(startDate);
  const finalDate = normalizeDate(endDate);
  if (!currentDate || !finalDate || currentDate > finalDate) return [];

  const dates = [];
  while (currentDate <= finalDate) {
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

export default function KpiTicketsEnCours({
  apiUrl,
  title = "Tickets en Cours",
  averageTitle,
  averageOnFilter = false,
  dateSortieField = "date_sortie",
  dateDerniereMajField = "date_derniere_maj"
}) {
  const id = `KPI ${title}`;
  const calendarRef = useRef(null);

  const [data, setData] = useState([]);
  const [ticketsEnCours, setTicketsEnCours] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [error, setError] = useState(null);

  const [localStartDate, setLocalStartDate] = useState(null);
  const [localEndDate, setLocalEndDate] = useState(null);
  const [localModifiedAt, setLocalModifiedAt] = useState(0);
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  const effectiveStartDate = globalModifiedAt > localModifiedAt && globalStartDate ? globalStartDate : localStartDate;
  const effectiveEndDate = globalModifiedAt > localModifiedAt && globalEndDate ? globalEndDate : localEndDate;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCalendarOpen &&
        calendarRef.current &&
        !calendarRef.current.contains(event.target) &&
        !event.target.closest('button[data-calendar-toggle]')) {
        setIsCalendarOpen(false);
      }
    };
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
      .then(res => res.json())
      .then(json => {
        setData(json);
        calculateKPI(json, effectiveStartDate, effectiveEndDate);
      })
      .catch(err => {
        setError("Erreur lors du chargement des données");
      });
  }, [apiUrl, effectiveStartDate, effectiveEndDate]);

  useEffect(() => {
    calculateKPI(data, effectiveStartDate, effectiveEndDate);
  }, [data, effectiveStartDate, effectiveEndDate]);

  const calculateKPI = (tickets, startDate, endDate) => {
    if (!tickets || tickets.length === 0) return setTicketsEnCours(0);

    const start = startDate ? normalizeDate(startDate) : null;
    const end = endDate ? normalizeDate(endDate) : null;

    if (averageOnFilter) {
      const { backlogByDate } = buildBacklogHistory(tickets, dateDerniereMajField, dateSortieField);
      if (start && end) {
        const values = getBacklogValuesForDates(getWorkingDaysBetween(start, end), backlogByDate);
        const average = values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : 0;
        setTicketsEnCours(Math.round(average));
      } else {
        const latestDate = Object.keys(backlogByDate).sort().at(-1);
        setTicketsEnCours(latestDate ? backlogByDate[latestDate] : 0);
      }
      return;
    }

    const filtered = tickets.filter(ticket => {
      const sortie = ticket[dateSortieField];
      const maj = normalizeDate(ticket[dateDerniereMajField]);
      return !sortie && (!start || !end || (maj && maj >= start && maj <= end));
    });

    setTicketsEnCours(filtered.length);
  };

  const formatDate = (date) => {
    if (!date) return "";
    const formatted = date.toLocaleDateString("fr-FR");
    const week = getWeekNumber(date);
    return `${formatted} (S-${week})`;
  };

  const hasDateRange = Boolean(effectiveStartDate && effectiveEndDate);
  const displayTitle = averageOnFilter && hasDateRange
    ? averageTitle || `Moyenne ${title}`
    : title;
  const periodeLabel = hasDateRange
    ? `${averageOnFilter ? "Moyenne : " : "Période : "}${formatDate(effectiveStartDate)} → ${formatDate(effectiveEndDate)}`
    : averageOnFilter ? "Dernière valeur connue du backlog" : "Toutes les périodes";

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
          <h3 className="text-gray-800 text-lg font-medium">{displayTitle}</h3>
          <p className="text-red-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="visualisation relative w-64" data-id={id}>
      <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
        <div className="no-export flex justify-between items-start w-full mb-2">
          <h3 className="text-gray-800 text-lg font-medium">{displayTitle}</h3>
          <button
            className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            data-calendar-toggle="true">
            <AiOutlineCalendar size={20} className="text-gray-800" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-1">{periodeLabel}</p>
        <p className="text-3xl font-bold text-black">
          {Number(ticketsEnCours).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
        </p>

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
