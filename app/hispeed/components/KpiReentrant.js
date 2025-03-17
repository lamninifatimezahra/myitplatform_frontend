"use client";

import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { AiOutlineCalendar } from "react-icons/ai";

// Fonction pour obtenir le numéro de la semaine
const getWeekNumber = (date) => {
  const oneJan = new Date(date.getFullYear(), 0, 1);
  const millisecsInDay = 86400000;
  return Math.ceil(((date - oneJan) / millisecsInDay + oneJan.getDay() + 1) / 7);
};

// Composant pour afficher le numéro de la semaine dans le calendrier
const renderCustomHeader = ({
  date,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}) => (
  <div className="flex justify-between items-center p-2 bg-gray-100 rounded-t-md">
    <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>
      {"<"}
    </button>
    <span className="font-medium">{date.toLocaleString("fr-FR", { month: "long", year: "numeric" })}</span>
    <button onClick={increaseMonth} disabled={nextMonthButtonDisabled}>
      {">"}
    </button>
  </div>
);

export default function KpiReentrant() {
  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reentrantCount, setReentrantCount] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Fetch des données depuis le backend
  useEffect(() => {
    fetch("http://127.0.0.1:8000/dashboard/api/hispeed/data/")
      .then((response) => response.json())
      .then((jsonData) => {
        setData(jsonData);
        calculateReentrantTickets(jsonData, startDate, endDate);
      })
      .catch((error) => console.error("Erreur de chargement des données :", error));
  }, []);

  // Calcul des tickets réentrants en fonction de la période sélectionnée
  const calculateReentrantTickets = (tickets, start, end) => {
    if (!start || !end) {
      // Si aucune période n'est sélectionnée, afficher le total des tickets avec un tag_reentrant non vide
      setReentrantCount(tickets.filter(ticket => ticket.tag_reentrant.trim() !== "").length);
    } else {
      const startFormatted = start.toISOString().split("T")[0]; // Format YYYY-MM-DD
      const endFormatted = end.toISOString().split("T")[0];

      const filteredTickets = tickets.filter(ticket =>
        ticket.date_sortie >= startFormatted && ticket.date_sortie <= endFormatted &&
        ticket.tag_reentrant.trim() !== ""
      );

      setReentrantCount(filteredTickets.length);
    }
  };

  // Mettre à jour le KPI lorsque la période change
  useEffect(() => {
    calculateReentrantTickets(data, startDate, endDate);
  }, [startDate, endDate]);

  // Gérer le changement de dates
  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
    
    // Fermer le calendrier quand la plage est complètement sélectionnée
    if (start && end) {
      setTimeout(() => {
        setIsCalendarOpen(false);
      }, 500); // Un petit délai pour permettre à l'utilisateur de voir sa sélection
    }
  };

  return (
    <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-64">
      <h3 className="text-gray-600 text-lg font-medium">Tickets Réentrants</h3>
      <p className="text-3xl font-bold text-black">{reentrantCount}</p>

      {/* Bouton Sélecteur de Période */}
      <div className="absolute top-3 right-3">
        <button
          className="bg-gray-300 p-2 rounded-full hover:bg-gray-700 transition"
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
        >
          <AiOutlineCalendar size={20} className="text-gray-800" />
        </button>

        {/* Popup du calendrier */}
        {isCalendarOpen && (
          <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-2 z-50">
            <DatePicker
              selectsRange={true} // Active le mode plage de dates
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
              dateFormat="yyyy-MM-dd"
              placeholderText="Sélectionner une période"
              renderCustomHeader={renderCustomHeader}
              formatWeekNumber={getWeekNumber} // Ajoute le numéro de la semaine
              showWeekNumbers // Affiche les numéros de semaine
              inline
            />
          </div>
        )}
      </div>
    </div>
  );
}