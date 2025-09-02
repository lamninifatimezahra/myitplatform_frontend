"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts";
import { FaExpand, FaPencilAlt, FaSyncAlt } from "react-icons/fa";
import { AiOutlineFilter } from "react-icons/ai";
import Modal from "react-modal";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

const COLORS = ["#3b82f6", "#6f80ac"]; // ITS = bleu, SFR = rouge

// Noms des mois en français
const moisFrancais = {
  1: "Janvier",
  2: "Février",
  3: "Mars",
  4: "Avril",
  5: "Mai",
  6: "Juin",
  7: "Juillet",
  8: "Août",
  9: "Septembre",
  10: "Octobre",
  11: "Novembre",
  12: "Décembre"
};

// Noms des trimestres
const trimestres = {
  1: "T1",
  2: "T2",
  3: "T3",
  4: "T4"
};

// Noms des semestres
const semestres = {
  1: "S1",
  2: "S2"
};

// Fonction pour obtenir le numéro de semaine ISO
const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

// Fonction pour obtenir le trimestre d'une date
const getQuarter = (date) => {
  const month = date.getMonth() + 1;
  return Math.ceil(month / 3);
};

// Fonction pour obtenir le semestre d'une date
const getSemester = (date) => {
  const month = date.getMonth() + 1;
  return month <= 6 ? 1 : 2;
};

// Composant de label externe avec pourcentage dynamique
const CustomLabelOutside = ({ name, value, cx, cy, midAngle, outerRadius, fill, total }) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const percentage = ((value / total) * 100).toFixed(1);

  return (
    <text
      x={x}
      y={y}
      fill={fill}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={15}
    >
      <tspan x={x} dy="-0.5em">{name}</tspan>
      <tspan x={x} dy="1.2em">({percentage}%)</tspan>
    </text>
  );
};

// Composant CommentButton simplifié qui simule l'import externe
const CommentButton = ({ containerRef, hideButton = false, comments, onAddComment, onUpdateComment, onDeleteComment }) => {
  if (hideButton) return null;
  
  return (
    <button 
      className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
      onClick={() => {
        // Simulation d'ajout de commentaire pour la démo
        const newComment = {
          id: Date.now(),
          text: `Commentaire ajouté le ${new Date().toLocaleTimeString()}`,
          timestamp: new Date().toISOString()
        };
        onAddComment(newComment);
      }}
    >
      <FaPencilAlt size={18} className="text-gray-600" />
    </button>
  );
};

export default function GraphTraitementTicketsITS_SFR() {
  // Références
  const prevViewMode = useRef(null);
  const filterPanelRef = useRef(null);
  const chartRef = useRef(null);
  const modalChartRef = useRef(null);

  // États principaux
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [comments, setComments] = useState([]);

  // États de filtrage (identiques à TauxReentrants)
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2024);
  const [availableYears] = useState([2023, 2024]);
  const [multipleYearsExist] = useState(true);

  // États pour mémoriser les sélections selon la vue (toutes les semaines sélectionnées par défaut)
  const [weekViewSelection, setWeekViewSelection] = useState({
    values: [1, 2, 3, 4, 5],
    year: 2024
  });
  const [monthViewSelection, setMonthViewSelection] = useState({
    values: [1, 2, 3, 4],
    year: 2024
  });
  const [quarterViewSelection, setQuarterViewSelection] = useState({
    values: [1, 2],
    year: 2024
  });
  const [semesterViewSelection, setSemesterViewSelection] = useState({
    values: [1, 2],
    year: 2024
  });

  // Gestion des commentaires
  const handleAddComment = (comment) => {
    setComments(prevComments => [...prevComments, comment]);
  };

  const handleUpdateComment = (updatedComment) => {
    setComments(prevComments => 
      prevComments.map(c => c.id === updatedComment.id ? updatedComment : c)
    );
  };

  const handleDeleteComment = (commentId) => {
    setComments(prevComments => prevComments.filter(c => c.id !== commentId));
  };

  // Gestion des clics extérieurs pour fermer le panneau de filtre
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isFilterOpen &&
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target) &&
        !event.target.closest('button[data-filter-toggle]')
      ) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  // Conserver l'état de la vue quand celle-ci change
  useEffect(() => {
    if (!prevViewMode.current) {
      prevViewMode.current = viewMode;
      return;
    }
    
    // Sauvegarder l'état de la vue précédente
    if (prevViewMode.current === "week") {
      setWeekViewSelection({
        values: selectedValues,
        year: selectedYear,
      });
    } else if (prevViewMode.current === "month") {
      setMonthViewSelection({
        values: selectedValues,
        year: selectedYear,
      });
    } else if (prevViewMode.current === "quarter") {
      setQuarterViewSelection({
        values: selectedValues,
        year: selectedYear,
      });
    } else if (prevViewMode.current === "semester") {
      setSemesterViewSelection({
        values: selectedValues,
        year: selectedYear,
      });
    }
    
    // Restaurer l'état de la nouvelle vue
    if (viewMode === "week" && weekViewSelection.values.length > 0) {
      setSelectedValues(weekViewSelection.values);
      setSelectedYear(weekViewSelection.year || selectedYear);
    } else if (viewMode === "month" && monthViewSelection.values.length > 0) {
      setSelectedValues(monthViewSelection.values);
      setSelectedYear(monthViewSelection.year || selectedYear);
    } else if (viewMode === "quarter" && quarterViewSelection.values.length > 0) {
      setSelectedValues(quarterViewSelection.values);
      setSelectedYear(quarterViewSelection.year || selectedYear);
    } else if (viewMode === "semester" && semesterViewSelection.values.length > 0) {
      setSelectedValues(semesterViewSelection.values);
      setSelectedYear(semesterViewSelection.year || selectedYear);
    }
    
    prevViewMode.current = viewMode;
  }, [viewMode]);

  const processData = () => {
    const raw = [
      { name: "ITS", value: 101 },
      { name: "SFR", value: 15 }
    ];
    setData(raw);
  };

  useEffect(() => {
    setLoading(true);
    // Initialisation des valeurs par défaut - toutes les semaines disponibles
    setSelectedValues([1, 2, 3, 4, 5]);
    setTimeout(() => {
      processData();
      setLoading(false);
    }, 500);
  }, []);

  // Fonction pour obtenir les périodes disponibles pour l'année sélectionnée
  const getAvailablePeriodsForYear = (year) => {
    // Simulation de données disponibles selon l'année et le mode de vue
    if (viewMode === "week") {
      return year === 2024 ? [1, 2, 3, 4, 5] : [1, 2, 3];
    } else if (viewMode === "month") {
      return year === 2024 ? [1, 2, 3, 4] : [1, 2];
    } else if (viewMode === "quarter") {
      return year === 2024 ? [1, 2] : [1];
    } else if (viewMode === "semester") {
      return [1, 2];
    }
    return [];
  };

  const availablePeriods = getAvailablePeriodsForYear(selectedYear);

  const allPeriodsSelected =
    availablePeriods.length > 0 &&
    availablePeriods.every(period => selectedValues.includes(period));

  const toggleSelectAll = () => {
    const newSelectedValues = allPeriodsSelected ? [] : [...availablePeriods];
    setSelectedValues(newSelectedValues);
    
    if (viewMode === "week") {
      setWeekViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
    } else if (viewMode === "month") {
      setMonthViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
    } else if (viewMode === "quarter") {
      setQuarterViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
    } else if (viewMode === "semester") {
      setSemesterViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
    }
  };

  const handleSelectionChange = (value) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    setSelectedValues(newSelectedValues);
    
    if (viewMode === "week") {
      setWeekViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
    } else if (viewMode === "month") {
      setMonthViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
    } else if (viewMode === "quarter") {
      setQuarterViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
    } else if (viewMode === "semester") {
      setSemesterViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
    }
  };

  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    const availablePeriods = getAvailablePeriodsForYear(year);
    
    if (viewMode === "week") {
      const intersection = weekViewSelection.values.filter(w => availablePeriods.includes(w));
      if (intersection.length > 0) {
        setSelectedValues(intersection);
        setWeekViewSelection({ values: intersection, year: year });
      } else {
        setSelectedValues(availablePeriods);
        setWeekViewSelection({ values: availablePeriods, year: year });
      }
    } else if (viewMode === "month") {
      const intersection = monthViewSelection.values.filter(m => availablePeriods.includes(m));
      if (intersection.length > 0) {
        setSelectedValues(intersection);
        setMonthViewSelection({ values: intersection, year: year });
      } else {
        setSelectedValues(availablePeriods);
        setMonthViewSelection({ values: availablePeriods, year: year });
      }
    } else if (viewMode === "quarter") {
      const intersection = quarterViewSelection.values.filter(q => availablePeriods.includes(q));
      if (intersection.length > 0) {
        setSelectedValues(intersection);
        setQuarterViewSelection({ values: intersection, year: year });
      } else {
        setSelectedValues(availablePeriods);
        setQuarterViewSelection({ values: availablePeriods, year: year });
      }
    } else if (viewMode === "semester") {
      const intersection = semesterViewSelection.values.filter(s => availablePeriods.includes(s));
      if (intersection.length > 0) {
        setSelectedValues(intersection);
        setSemesterViewSelection({ values: intersection, year: year });
      } else {
        setSelectedValues(availablePeriods);
        setSemesterViewSelection({ values: availablePeriods, year: year });
      }
    }
  };

  const total = data.reduce((acc, entry) => acc + entry.value, 0);

  const periodeLabel = selectedValues.length > 0
    ? viewMode === "week"
      ? `Semaine(s) : ${selectedValues.join(", ")}`
      : viewMode === "month"
        ? `Mois : ${selectedValues.map(m => moisFrancais[m]).join(", ")}`
        : viewMode === "quarter"
          ? `Trimestre(s) : ${selectedValues.map(q => trimestres[q]).join(", ")}`
          : `Semestre(s) : ${selectedValues.map(s => semestres[s]).join(", ")}`
    : "Aucune période sélectionnée";

  return (
    <div className="visualisation relative" data-id="traitement-tickets-its-sfr">
      <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
        {/* Spinner de chargement */}
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-60 backdrop-blur-sm rounded-lg">
            <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-blue-800 font-semibold text-sm">
              Chargement <span className="text-blue-500">MyIT</span>…
            </p>
          </div>
        )}

        {/* En-tête avec titre, sous-titre et boutons */}
        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <h3 className="no-export text-lg font-semibold text-gray-800">Traitement des Tickets ITS & SFR</h3>
            <p className="text-sm text-gray-500">
              {selectedYear && `Année : ${selectedYear} - `}
              {periodeLabel}
            </p>
          </div>
          <div className="no-export flex gap-2">
            <button 
              className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              data-filter-toggle="true"
            >
              <AiOutlineFilter size={20} className="text-gray-600" />
            </button>
            <CommentButton 
              containerRef={chartRef}
              comments={comments}
              onAddComment={handleAddComment}
              onUpdateComment={handleUpdateComment}
              onDeleteComment={handleDeleteComment}
            />
            <button 
              onClick={() => setModalIsOpen(true)} 
              className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
            >
              <FaExpand size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Panneau de filtres (identique à TauxReentrants) */}
          {isFilterOpen && (
            <div ref={filterPanelRef} className="no-export absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
              <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
              <div className="flex space-x-2 mb-2 mt-2 flex-wrap">
                <button
                  className={`px-3 py-1 rounded-md mb-2 ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                  onClick={() => handleViewModeChange("week")}
                >
                  Semaine
                </button>
                <button
                  className={`px-3 py-1 rounded-md mb-2 ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                  onClick={() => handleViewModeChange("month")}
                >
                  Mois
                </button>
                <button
                  className={`px-3 py-1 rounded-md mb-2 ${viewMode === "quarter" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                  onClick={() => handleViewModeChange("quarter")}
                >
                  Trimestre
                </button>
                <button
                  className={`px-3 py-1 rounded-md mb-2 ${viewMode === "semester" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
                  onClick={() => handleViewModeChange("semester")}
                >
                  Semestre
                </button>
              </div>
              {multipleYearsExist && (
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-gray-500 mb-1">Années :</h5>
                  <div className="flex flex-wrap gap-1">
                    {availableYears.map(year => (
                      <button
                        key={year}
                        onClick={() => handleYearChange(year)}
                        className={`px-2 py-1 text-xs rounded-md ${selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mb-2">
                <button
                  onClick={toggleSelectAll}
                  className={`text-xs px-2 py-1 rounded-md w-full ${
                    allPeriodsSelected 
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
                >
                  {allPeriodsSelected ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
                {availablePeriods.map(value => (
                  <div key={value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(value)}
                      onChange={() => handleSelectionChange(value)}
                    />
                    <span className="text-gray-500">
                      {viewMode === "week" 
                        ? `Semaine ${value}` 
                        : viewMode === "month"
                          ? moisFrancais[value]
                          : viewMode === "quarter"
                            ? trimestres[value]
                            : semestres[value]
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Graphique principal */}
        <div className="flex-grow flex justify-center items-center w-full" ref={chartRef}>
          {!loading && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  dataKey="value"
                  labelLine
                  label={(props) => <CustomLabelOutside {...props} total={total} />}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Modal d'agrandissement */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-800">Traitement des Tickets ITS & SFR</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedYear && `Année : ${selectedYear} - `}{periodeLabel}
              </p>
            </div>
            <button 
              onClick={() => setModalIsOpen(false)} 
              className="text-gray-500 hover:text-red-500"
            >
              ❌
            </button>
          </div>
          <div className="relative h-[400px] flex items-center justify-center" ref={modalChartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={160}
                  dataKey="value"
                  labelLine
                  label={(props) => <CustomLabelOutside {...props} total={total} />}
                >
                  {data.map((entry, index) => (
                    <Cell key={`modal-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <CommentButton 
              containerRef={modalChartRef} 
              hideButton={true}
              comments={comments}
              onAddComment={handleAddComment}
              onUpdateComment={handleUpdateComment}
              onDeleteComment={handleDeleteComment}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}