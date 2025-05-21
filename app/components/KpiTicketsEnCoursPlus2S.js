"use client";

import { useEffect, useState, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { AiOutlineCalendar } from "react-icons/ai";
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

export default function KpiTicketsEnCoursPlus2S({
  apiUrl, // URL de l'API requise sans valeur par défaut
  title = "Tickets +14j",
  dateSortieField = "date_sortie",
  dateDerniereMajField = "date_derniere_maj",
  retardDays = 14,
  blinkWhenPositive = true,
  dataIdSuffix = "KPI Tickets en Cours +14j"  // Modifié ici pour correspondre à l'ID
}) {
  const id = "KPI Tickets en Cours +14j";

  // Référence pour le composant DatePicker
  const calendarRef = useRef(null);

  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  
  // États locaux pour le filtre spécifique à ce composant
  const [localStartDate, setLocalStartDate] = useState(null);
  const [localEndDate, setLocalEndDate] = useState(null);
  
  const [ticketsRetard, setTicketsRetard] = useState(0);
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

  // Fonction pour calculer les tickets en retard
  const calculateTicketsRetard = (tickets, start, end) => {
    if (!tickets || tickets.length === 0) {
      return 0;
    }

    const now = new Date();
    const filteredTickets = tickets.filter(ticket => {
      // On ne prend que les tickets qui n'ont pas de date_sortie (toujours en cours)
      if (ticket[dateSortieField]) return false;

      // Calcul du délai en jours depuis la dernière maj
      const lastUpdate = new Date(ticket[dateDerniereMajField]);
      const delay = Math.ceil((now - lastUpdate) / (1000 * 60 * 60 * 24));

      // On ne garde que ceux dont le délai > retardDays
      if (delay <= retardDays) return false;

      // Si l'utilisateur a défini une plage de dates
      if (start && end) {
        const startFormatted = start.toISOString().split("T")[0];
        const endFormatted = end.toISOString().split("T")[0];
        const lastUpdateFormatted = ticket[dateDerniereMajField].split("T")[0];

        // Vérifie si la dernière maj est dans la plage [start, end]
        return lastUpdateFormatted >= startFormatted && lastUpdateFormatted <= endFormatted;
      }

      // Pas de plage => on prend juste les retards > retardDays
      return true;
    });

    return filteredTickets.length;
  };

  // Effet pour charger les données initiales
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
      })
      .catch((error) => {
        console.error("Erreur de chargement des données :", error);
        setError("Erreur lors du chargement des données");
      });
  }, [apiUrl]);

  // Effet pour recalculer le nombre de tickets en retard
  useEffect(() => {
    const count = calculateTicketsRetard(data, localStartDate, localEndDate);
    setTicketsRetard(count);
  }, [data, localStartDate, localEndDate, retardDays, dateSortieField, dateDerniereMajField]);

  const formatDate = (date) => {
    if (!date) return "";
    const formatted = date.toLocaleDateString("fr-FR");
    const week = getWeekNumber(date);
    return `${formatted} (S-${week})`;
  };

  const periodeLabel = localStartDate && localEndDate
    ? `Période : ${formatDate(localStartDate)} → ${formatDate(localEndDate)}`
    : "Toutes les périodes";

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setLocalStartDate(start);
    setLocalEndDate(end);
    
    if (start && end) {
      setTimeout(() => {
        setIsCalendarOpen(false);
      }, 300);
    }
  };

  // Condition pour faire clignoter le KPI
  const shouldBlink = blinkWhenPositive && ticketsRetard > 0;

  // Afficher une erreur si l'URL d'API n'est pas fournie
  if (error) {
    return (
      <div className="visualisation relative w-64" data-id={id} data-graph-label={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <h3 className="text-gray-800 text-lg font-medium">{title}</h3>
          <p className="text-red-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="visualisation relative w-64" data-id={id} data-graph-label={id}>
      <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
        {/* Header flexible avec titre et bouton */}
        <div className="no-export flex justify-between items-start w-full mb-2">
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
        <p
          className={`text-3xl font-bold ${shouldBlink ? "blink-red" : "text-black"}`}
          style={{ minHeight: "40px" }}
        >
          {ticketsRetard}
        </p>
        
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
              dateFormat="dd/MM/yyyy"
              placeholderText="Sélectionner une période"
              renderCustomHeader={renderCustomHeader}
              formatWeekNumber={getWeekNumber}
              showWeekNumbers
              inline
              locale="fr"
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