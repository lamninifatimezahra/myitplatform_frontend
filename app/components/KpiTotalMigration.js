"use client";

import { useEffect, useState, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { AiOutlineCalendar } from "react-icons/ai";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useGlobalFilter } from "./GlobalFilterContext"; 

// Fonction pour calculer le numéro ISO de la semaine
const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

// Header du calendrier personnalisé
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

export default function KpiTotalMigration({ 
  apiUrl,  // URL de l'API requise sans valeur par défaut
  title = "Total Migration",
  dateField = "date",
  typeField = "type_modop",
  typeValue = "Migration"
}) {
  const id = `KPI ${title}`;
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Référence pour le composant DatePicker
  const calendarRef = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  // État local pour le filtre (pour une modification locale)
  const [localStartDate, setLocalStartDate] = useState(null);
  const [localEndDate, setLocalEndDate] = useState(null);
  const [localModifiedAt, setLocalModifiedAt] = useState(0);
  const [totalMigrations, setTotalMigrations] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [error, setError] = useState(null);

  // Effet pour gérer les clics extérieurs au calendrier
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
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Synchronise l'état local avec la valeur globale si celle-ci est plus récente
  useEffect(() => {
    if (globalModifiedAt > localModifiedAt) {
      setLocalStartDate(globalStartDate);
      setLocalEndDate(globalEndDate);
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt, localModifiedAt]);

  // La valeur effective du filtre est celle qui a été modifiée en dernier (global ou locale)
  const effectiveStartDate = (globalModifiedAt > localModifiedAt && globalStartDate) ? globalStartDate : localStartDate;
  const effectiveEndDate = (globalModifiedAt > localModifiedAt && globalEndDate) ? globalEndDate : localEndDate;

  // Vérification que l'URL d'API est fournie
  useEffect(() => {
    if (!apiUrl) {
      setError("L'URL de l'API est requise");
      setLoading(false);
      return;
    }
    
    setError(null);
    setLoading(true);
    
    // Construire l'URL avec les paramètres de filtrage si nécessaire
    let url = apiUrl;
    if (effectiveStartDate && effectiveEndDate) {
      const startFormatted = effectiveStartDate.toISOString().split("T")[0];
      const endFormatted = effectiveEndDate.toISOString().split("T")[0];
      url = `${apiUrl}?start_date=${startFormatted}&end_date=${endFormatted}`;
    }
    
    // Chargement des données avec l'URL de l'API fournie
    fetchWithAuth(url)
      .then(async (response) => {
        if (!response.ok) {
          // Si la réponse n'est pas OK, on extrait le texte pour un meilleur message d'erreur
          const text = await response.text();
          console.error("Réponse non-OK:", response.status, text.substring(0, 100));
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((jsonData) => {
        if (!Array.isArray(jsonData)) {
          console.error("Données non conformes:", jsonData);
          throw new Error("Format de données invalide. Un tableau était attendu.");
        }
        setData(jsonData);
        calculateTotalMigrations(jsonData, effectiveStartDate, effectiveEndDate);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Erreur de chargement des données :", error);
        setError(`Erreur: ${error.message}`);
        setLoading(false);
      });
  }, [apiUrl, effectiveStartDate, effectiveEndDate]);

  // Recalculer quand les données ou le filtre effectif changent
  useEffect(() => {
    calculateTotalMigrations(data, effectiveStartDate, effectiveEndDate);
  }, [data, effectiveStartDate, effectiveEndDate, dateField, typeField, typeValue]);

  const calculateTotalMigrations = (documents, start, end) => {
    if (!documents || documents.length === 0) {
      setTotalMigrations(0);
      return;
    }

    let filteredDocuments = documents;
    
    // Filtrer par période si spécifiée
    if (start && end) {
      const startFormatted = start.toISOString().split("T")[0];
      const endFormatted = end.toISOString().split("T")[0];
      filteredDocuments = filteredDocuments.filter(doc => {
        // Vérification de l'existence du champ dateField
        if (!doc[dateField]) {
          console.warn(`Document sans champ ${dateField}:`, doc);
          return false;
        }
        return doc[dateField] >= startFormatted && doc[dateField] <= endFormatted;
      });
    }
    
    // Filtrer par type_modop (Migration)
    const migrationsCount = filteredDocuments.filter(doc => {
      return doc[typeField] === typeValue;
    }).length;
    
    setTotalMigrations(migrationsCount);
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

  // Gestion du DatePicker local
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

  // Afficher l'état de chargement
  if (loading) {
    return (
      <div className="visualisation relative w-64" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <h3 className="text-gray-800 text-lg font-medium">{title}</h3>
          <div className="w-full h-16 flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Chargement...</div>
          </div>
        </div>
      </div>
    );
  }

  // Afficher une erreur si l'URL d'API n'est pas fournie
  if (error) {
    return (
      <div className="visualisation relative w-64" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <h3 className="text-gray-800 text-lg font-medium">{title}</h3>
          <p className="text-red-500 text-sm mt-2 break-words">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="visualisation relative w-64" data-id={id}>
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
        <p className="text-3xl font-bold text-black">{totalMigrations}</p>
        
        {/* Calendrier flottant qui se ferme en cliquant ailleurs */}
        {isCalendarOpen && (
          <div 
            ref={calendarRef} 
            className="absolute right-0 top-14 mt-2 bg-white shadow-lg rounded-md p-2 z-50">
            <DatePicker
              selectsRange={true}
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