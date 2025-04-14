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

export default function KpiTicketsEnCours({
  apiUrl, // URL de l'API requise sans valeur par défaut
  title = "Tickets en Cours",
  dateSortieField = "date_sortie",
  dateDerniereMajField = "date_derniere_maj"
}) {
  const id = `KPI ${title}`;

  // Référence pour le composant DatePicker
  const calendarRef = useRef(null);

  // États de données et de récupération
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  
  // États locaux pour le filtre (localStartDate, localEndDate, et son timestamp)
  const [localStartDate, setLocalStartDate] = useState(null);
  const [localEndDate, setLocalEndDate] = useState(null);
  const [localModifiedAt, setLocalModifiedAt] = useState(0);

  // Import du filtre global via le contexte
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Synchroniser l'état local avec le global si celui-ci est plus récent
  useEffect(() => {
    if (globalModifiedAt > localModifiedAt) {
      setLocalStartDate(globalStartDate);
      setLocalEndDate(globalEndDate);
      // Optionnel : mettre à jour localModifiedAt pour conserver la consistance
      // setLocalModifiedAt(globalModifiedAt);
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt, localModifiedAt]);

  // Déterminer la plage de dates effective en fonction de la dernière modification
  const effectiveStartDate = (globalModifiedAt > localModifiedAt && globalStartDate) ? globalStartDate : localStartDate;
  const effectiveEndDate = (globalModifiedAt > localModifiedAt && globalEndDate) ? globalEndDate : localEndDate;

  const [ticketsEnCours, setTicketsEnCours] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Effet pour gérer les clics extérieurs au calendrier
  useEffect(() => {
    function handleClickOutside(event) {
      // Si le calendrier est ouvert et que le clic est en dehors du calendrier et du bouton d'ouverture
      if (isCalendarOpen && 
          calendarRef.current && 
          !calendarRef.current.contains(event.target) &&
          !event.target.closest('button[data-calendar-toggle]')) {
        setIsCalendarOpen(false);
      }
    }
    
    // Ajouter l'écouteur d'événements
    document.addEventListener("mousedown", handleClickOutside);
    
    // Nettoyer l'écouteur d'événements
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Chargement initial des données
  useEffect(() => {
    if (!apiUrl) {
      setError("L'URL de l'API est requise");
      return;
    }

    setError(null);
    fetchWithAuth(apiUrl)
      .then((response) => response.json())
      .then((jsonData) => {
        setData(jsonData);
        calculateTicketsEnCours(jsonData, effectiveStartDate, effectiveEndDate);
      })
      .catch((error) => {
        console.error("Erreur de chargement des données :", error);
        setError("Erreur lors du chargement des données");
      });
  }, [apiUrl, effectiveStartDate, effectiveEndDate]);

  // Recalculer quand le filtre effectif change
  useEffect(() => {
    calculateTicketsEnCours(data, effectiveStartDate, effectiveEndDate);
  }, [data, effectiveStartDate, effectiveEndDate, dateSortieField, dateDerniereMajField]);

  const calculateTicketsEnCours = (tickets, start, end) => {
    if (!tickets || tickets.length === 0) {
      setTicketsEnCours(0);
      return;
    }

    if (!start || !end) {
      setTicketsEnCours(tickets.filter(ticket => !ticket[dateSortieField]).length);
    } else {
      const startFormatted = start.toISOString().split("T")[0];
      const endFormatted = end.toISOString().split("T")[0];

      const filtered = tickets.filter(ticket =>
        !ticket[dateSortieField] &&
        ticket[dateDerniereMajField] >= startFormatted &&
        ticket[dateDerniereMajField] <= endFormatted
      );

      setTicketsEnCours(filtered.length);
    }
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

  // Gestion locale du DatePicker : mise à jour de l'état local et timestamp local
  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setLocalStartDate(start);
    setLocalEndDate(end);
    setLocalModifiedAt(Date.now());
    if (start && end) {
      setTimeout(() => {
        setIsCalendarOpen(false);
      }, 300);
    }
  };

  // Afficher une erreur si l'URL d'API n'est pas fournie
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
        {/* Header flexible avec titre et bouton */}
        <div className="flex justify-between items-start w-full mb-2">
          <h3 className="text-gray-800 text-lg font-medium">{title}</h3>
          <button
            className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            data-calendar-toggle="true">
            <AiOutlineCalendar size={20} className="text-gray-800" />
          </button>
        </div>
        
        {/* Contenu principal */}
        <p className="text-xs text-gray-500 mb-1">{periodeLabel}</p>
        <p className="text-3xl font-bold text-black">{ticketsEnCours}</p>
        
        {/* Calendrier flottant qui se ferme en cliquant ailleurs */}
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