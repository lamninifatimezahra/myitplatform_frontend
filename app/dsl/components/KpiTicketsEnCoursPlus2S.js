"use client";

import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { AiOutlineCalendar } from "react-icons/ai";
import { useExport } from "./ExportContext";
import fetchWithAuth from "@/utils/fetchWithAuth";

// Fonction pour obtenir le numéro de la semaine ISO
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

export default function KpiTicketsEnCoursPlus2S() {
  const id = "KPI Tickets en Cours +14j";
  const { selectedIds, toggleId } = useExport();

  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [ticketsRetard, setTicketsRetard] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/dsl/data/")
      .then((response) => response.json())
      .then((jsonData) => {
        setData(jsonData);
        calculateTicketsRetard(jsonData, startDate, endDate);
      })
      .catch((error) => console.error("Erreur de chargement des données :", error));
  }, []);

  useEffect(() => {
    calculateTicketsRetard(data, startDate, endDate);
  }, [startDate, endDate, data]);

  const calculateTicketsRetard = (tickets, start, end) => {
    const now = new Date();
    const filteredTickets = tickets.filter(ticket => {
      // On ne prend que les tickets qui n'ont pas de date_sortie (toujours en cours)
      if (ticket.date_sortie) return false;

      // Calcul du délai en jours depuis la dernière maj
      const lastUpdate = new Date(ticket.date_derniere_maj);
      const delay = Math.ceil((now - lastUpdate) / (1000 * 60 * 60 * 24));

      // On ne garde que ceux dont le délai > 14
      if (delay <= 14) return false;

      // Si l’utilisateur a défini une plage de dates
      if (start && end) {
        const startFormatted = start.toISOString().split("T")[0];
        const endFormatted = end.toISOString().split("T")[0];
        const lastUpdateFormatted = ticket.date_derniere_maj.split("T")[0];

        // Vérifie si la dernière maj est dans la plage [start, end]
        return lastUpdateFormatted >= startFormatted && lastUpdateFormatted <= endFormatted;
      }

      // Pas de plage => on prend juste les retards > 14
      return true;
    });

    setTicketsRetard(filteredTickets.length);
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

  // Condition pour faire clignoter le KPI
  const shouldBlink = ticketsRetard > 0;

  return (
    <div className="visualisation relative w-64" data-id={id}>
      <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
        
        {/* Bouton filtre */}
        <div className="absolute top-3 right-3 z-50">
          <button
            className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          >
            <AiOutlineCalendar size={20} className="text-gray-800" />
          </button>
        </div>

        {/* Titre & Période */}
        <h3 className="text-gray-800 text-lg font-medium">Tickets +14j</h3>
        <p className="text-xs text-gray-500 mb-1">{periodeLabel}</p>

        {/* Valeur KPI (clignotement si > 0) */}
        <p
          className={`text-3xl font-bold ${shouldBlink ? "blink-red" : "text-black"}`}
          style={{ minHeight: "40px" }}
        >
          {ticketsRetard}
        </p>

        {/* Calendrier */}
        {isCalendarOpen && (
          <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-2 z-50">
            <DatePicker
              selectsRange
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

      {/* Style de clignotement */}
      <style jsx>{`
        @keyframes blinkRed {
          0%, 100% {
            color: red;
          }
          50% {
            color: transparent;
          }
        }
        .blink-red {
          animation: blinkRed 1s infinite;
        }
      `}</style>
    </div>
  );
}
