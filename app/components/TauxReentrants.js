"use client";

import { useState, useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { AiOutlineFilter } from "react-icons/ai";
import { FaExpand } from "react-icons/fa";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useGlobalFilter } from "./GlobalFilterContext";
import Modal from "react-modal";
import CommentButton from "./CommentButton";

// Configurer le Modal pour l'accessibilité
if (typeof window !== "undefined") Modal.setAppElement(document.body);

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

// Enregistrement des éléments ChartJS nécessaires
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

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

export default function TauxReentrants({
  // Propriété obligatoire
  apiUrl,
  // Props configurables avec des valeurs par défaut
  title = "Taux des Réentrants",
  id = "Taux des Réentrants",
  dateField = "date_derniere_maj", // champ contenant la date de mise à jour
  weekField = "semaine",           // champ indiquant la semaine
  colors = {
    "Réentrant": "#68bddd",
    "Non Réentrant": "#1b2b6b"
  }
}) {
  // Vérification de la présence de l'URL de l'API
  if (!apiUrl) {
    return (
      <div className="visualisation relative" data-id={id}>
        <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
          <p className="text-red-500 text-sm mt-2">Erreur : L'URL de l'API est requise.</p>
        </div>
      </div>
    );
  }

  // Références et contextes
  const initializationCompleted = useRef(false);
  const globalFilterApplied = useRef(false);
  const prevViewMode = useRef(null);
  const filterPanelRef = useRef(null);
  const chartContainerRef = useRef(null);
  const modalChartContainerRef = useRef(null);

  // États de gestion des données et de l'affichage
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [selectedValues, setSelectedValues] = useState([]);
  const [disabledCategories, setDisabledCategories] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [multipleYearsExist, setMultipleYearsExist] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
  const [comments, setComments] = useState([]);

  // États pour mémoriser les sélections selon la vue
  const [weekViewSelection, setWeekViewSelection] = useState({
    values: [],
    year: null
  });
  const [monthViewSelection, setMonthViewSelection] = useState({
    values: [],
    year: null
  });
  const [quarterViewSelection, setQuarterViewSelection] = useState({
    values: [],
    year: null
  });
  const [semesterViewSelection, setSemesterViewSelection] = useState({
    values: [],
    year: null
  });

  // États pour la gestion de la priorisation des filtres locaux vs globaux
  const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
  const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);
  const [quarterSelectionModifiedAt, setQuarterSelectionModifiedAt] = useState(0);
  const [semesterSelectionModifiedAt, setSemesterSelectionModifiedAt] = useState(0);

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

  // Extraction du filtre global via le contexte
  const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

  // Gestion des clics extérieurs pour fermer le panneau de filtre
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isOpen &&
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target) &&
        !event.target.closest('button[data-filter-toggle]')
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fonctions utilitaires pour générer les listes de périodes entre deux dates
  function getAllWeeksBetween(startDate, endDate) {
    if (!startDate || !endDate) return [];
    const weeksArray = [];
    const startWeek = getWeekNumber(startDate);
    const endWeek = getWeekNumber(endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    if (startYear === endYear) {
      for (let week = startWeek; week <= endWeek; week++) {
        weeksArray.push(week);
      }
    } else {
      for (let year = startYear; year <= endYear; year++) {
        const maxWeeks = year === endYear ? endWeek : 52;
        const minWeeks = year === startYear ? startWeek : 1;
        for (let week = minWeeks; week <= maxWeeks; week++) {
          weeksArray.push(week);
        }
      }
    }
    return weeksArray;
  }

  function getAllMonthsBetween(startDate, endDate) {
    if (!startDate || !endDate) return [];
    const monthsArray = [];
    const startMonth = startDate.getMonth() + 1;
    const endMonth = endDate.getMonth() + 1;
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    if (startYear === endYear) {
      for (let month = startMonth; month <= endMonth; month++) {
        monthsArray.push(month);
      }
    } else {
      for (let year = startYear; year <= endYear; year++) {
        const maxMonth = year === endYear ? endMonth : 12;
        const minMonth = year === startYear ? startMonth : 1;
        for (let month = minMonth; month <= maxMonth; month++) {
          monthsArray.push(month);
        }
      }
    }
    return monthsArray;
  }

  function getAllQuartersBetween(startDate, endDate) {
    if (!startDate || !endDate) return [];
    const quartersArray = [];
    const startQuarter = getQuarter(startDate);
    const endQuarter = getQuarter(endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    if (startYear === endYear) {
      for (let quarter = startQuarter; quarter <= endQuarter; quarter++) {
        quartersArray.push(quarter);
      }
    } else {
      for (let year = startYear; year <= endYear; year++) {
        const maxQuarter = year === endYear ? endQuarter : 4;
        const minQuarter = year === startYear ? startQuarter : 1;
        for (let quarter = minQuarter; quarter <= maxQuarter; quarter++) {
          quartersArray.push(quarter);
        }
      }
    }
    return quartersArray;
  }

  function getAllSemestersBetween(startDate, endDate) {
    if (!startDate || !endDate) return [];
    const semestersArray = [];
    const startSemester = getSemester(startDate);
    const endSemester = getSemester(endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    if (startYear === endYear) {
      for (let semester = startSemester; semester <= endSemester; semester++) {
        semestersArray.push(semester);
      }
    } else {
      for (let year = startYear; year <= endYear; year++) {
        const maxSemester = year === endYear ? endSemester : 2;
        const minSemester = year === startYear ? startSemester : 1;
        for (let semester = minSemester; semester <= maxSemester; semester++) {
          semestersArray.push(semester);
        }
      }
    }
    return semestersArray;
  }

  // Application du filtre global sur les différentes vues
  const applyGlobalFilter = () => {
    if (!globalStartDate || !globalEndDate) return;
    const weekList = getAllWeeksBetween(globalStartDate, globalEndDate);
    setWeekViewSelection({
      values: weekList,
      year: globalStartDate.getFullYear()
    });
    const monthList = getAllMonthsBetween(globalStartDate, globalEndDate);
    setMonthViewSelection({
      values: monthList,
      year: globalStartDate.getFullYear()
    });
    const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate);
    setQuarterViewSelection({
      values: quarterList,
      year: globalStartDate.getFullYear()
    });
    const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate);
    setSemesterViewSelection({
      values: semesterList,
      year: globalStartDate.getFullYear()
    });
    
    if (viewMode === "week") {
      setSelectedValues(weekList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "month") {
      setSelectedValues(monthList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "quarter") {
      setSelectedValues(quarterList);
      setSelectedYear(globalStartDate.getFullYear());
    } else if (viewMode === "semester") {
      setSelectedValues(semesterList);
      setSelectedYear(globalStartDate.getFullYear());
    }
    setHasGlobalFilter(true);
  };

  // Conserver l'état de la vue quand celle-ci change
  useEffect(() => {
    if (!prevViewMode.current) {
      prevViewMode.current = viewMode;
      return;
    }
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

  // Récupération initiale des données depuis l'API (en utilisant la prop apiUrl)
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth(apiUrl);
        const result = await response.json();
        setData(result);

        // Extraction des années à partir du champ dateField
        const years = [...new Set(result.map(t => new Date(t[dateField]).getFullYear()))].sort();
        setAvailableYears(years);
        setMultipleYearsExist(years.length > 1);
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);

        if (!initializationCompleted.current) {
          const ticketsForYear = result.filter(t => new Date(t[dateField]).getFullYear() === latestYear);
          if (viewMode === "week") {
            const weeks = [...new Set(ticketsForYear.map(t => t[weekField]))]
              .filter(week => !isNaN(Number(week)))
              .sort((a, b) => a - b);
            setSelectedValues(weeks);
            setWeekViewSelection({
              values: weeks,
              year: latestYear,
            });
          } else if (viewMode === "month") {
            const months = [...new Set(ticketsForYear.map(t => new Date(t[dateField]).getMonth() + 1))]
              .sort((a, b) => a - b);
            setSelectedValues(months);
            setMonthViewSelection({
              values: months,
              year: latestYear,
            });
          } else if (viewMode === "quarter") {
            const quarters = [...new Set(ticketsForYear.map(t => getQuarter(new Date(t[dateField]))))]
              .sort((a, b) => a - b);
            setSelectedValues(quarters);
            setQuarterViewSelection({
              values: quarters,
              year: latestYear,
            });
          } else if (viewMode === "semester") {
            const semesters = [...new Set(ticketsForYear.map(t => getSemester(new Date(t[dateField]))))]
              .sort((a, b) => a - b);
            setSelectedValues(semesters);
            setSemesterViewSelection({
              values: semesters,
              year: latestYear,
            });
          }
          initializationCompleted.current = true;
        }

        if (globalStartDate && globalEndDate && !globalFilterApplied.current) {
          applyGlobalFilter();
          globalFilterApplied.current = true;
        }

        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du fetch :", error);
        setLoading(false);
      }
    }
    fetchData();
  }, [apiUrl, dateField, weekField]);

  useEffect(() => {
    if (globalStartDate && globalEndDate && globalModifiedAt > 0) {
      applyGlobalFilter();
    }
  }, [globalStartDate, globalEndDate, globalModifiedAt]);

  if (loading) {
    return <p className="text-center text-gray-500">Chargement des données...</p>;
  }

  // Fonction pour obtenir les périodes disponibles pour l'année sélectionnée
  const getAvailablePeriodsForYear = (year) => {
    const ticketsForYear = data.filter(t => new Date(t[dateField]).getFullYear() === year);
    if (viewMode === "week") {
      return [...new Set(ticketsForYear.map(t => t[weekField]))]
        .filter(week => !isNaN(Number(week)))
        .sort((a, b) => a - b);
    } else if (viewMode === "month") {
      return [...new Set(ticketsForYear.map(t => new Date(t[dateField]).getMonth() + 1))]
        .sort((a, b) => a - b);
    } else if (viewMode === "quarter") {
      return [...new Set(ticketsForYear.map(t => getQuarter(new Date(t[dateField]))))]
        .sort((a, b) => a - b);
    } else if (viewMode === "semester") {
      return [...new Set(ticketsForYear.map(t => getSemester(new Date(t[dateField]))))]
        .sort((a, b) => a - b);
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
      setWeekSelectionModifiedAt(Date.now());
    } else if (viewMode === "month") {
      setMonthViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
      setMonthSelectionModifiedAt(Date.now());
    } else if (viewMode === "quarter") {
      setQuarterViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
      setQuarterSelectionModifiedAt(Date.now());
    } else if (viewMode === "semester") {
      setSemesterViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
      setSemesterSelectionModifiedAt(Date.now());
    }
    setHasGlobalFilter(false);
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
      setWeekSelectionModifiedAt(Date.now());
    } else if (viewMode === "month") {
      setMonthViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
      setMonthSelectionModifiedAt(Date.now());
    } else if (viewMode === "quarter") {
      setQuarterViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
      setQuarterSelectionModifiedAt(Date.now());
    } else if (viewMode === "semester") {
      setSemesterViewSelection({
        values: newSelectedValues,
        year: selectedYear,
      });
      setSemesterSelectionModifiedAt(Date.now());
    }
    setHasGlobalFilter(false);
  };

  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    const availablePeriods = getAvailablePeriodsForYear(year);
    if (viewMode === "week") {
      if (hasGlobalFilter && globalStartDate && globalEndDate) {
        const weekList = getAllWeeksBetween(globalStartDate, globalEndDate)
          .filter(w => availablePeriods.includes(w));
        setSelectedValues(weekList);
        setWeekViewSelection({
          values: weekList,
          year: year,
        });
      } else {
        const intersection = weekViewSelection.values.filter(w => availablePeriods.includes(w));
        if (intersection.length > 0) {
          setSelectedValues(intersection);
          setWeekViewSelection({
            values: intersection,
            year: year,
          });
        } else {
          setSelectedValues(availablePeriods);
          setWeekViewSelection({
            values: availablePeriods,
            year: year,
          });
        }
      }
    } else if (viewMode === "month") {
      if (hasGlobalFilter && globalStartDate && globalEndDate) {
        const monthList = getAllMonthsBetween(globalStartDate, globalEndDate)
          .filter(m => availablePeriods.includes(m));
        setSelectedValues(monthList);
        setMonthViewSelection({
          values: monthList,
          year: year,
        });
      } else {
        const intersection = monthViewSelection.values.filter(m => availablePeriods.includes(m));
        if (intersection.length > 0) {
          setSelectedValues(intersection);
          setMonthViewSelection({
            values: intersection,
            year: year,
          });
        } else {
          setSelectedValues(availablePeriods);
          setMonthViewSelection({
            values: availablePeriods,
            year: year,
          });
        }
      }
    } else if (viewMode === "quarter") {
      if (hasGlobalFilter && globalStartDate && globalEndDate) {
        const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate)
          .filter(q => availablePeriods.includes(q));
        setSelectedValues(quarterList);
        setQuarterViewSelection({
          values: quarterList,
          year: year,
        });
      } else {
        const intersection = quarterViewSelection.values.filter(q => availablePeriods.includes(q));
        if (intersection.length > 0) {
          setSelectedValues(intersection);
          setQuarterViewSelection({
            values: intersection,
            year: year,
          });
        } else {
          setSelectedValues(availablePeriods);
          setQuarterViewSelection({
            values: availablePeriods,
            year: year,
          });
        }
      }
    } else if (viewMode === "semester") {
      if (hasGlobalFilter && globalStartDate && globalEndDate) {
        const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate)
          .filter(s => availablePeriods.includes(s));
        setSelectedValues(semesterList);
        setSemesterViewSelection({
          values: semesterList,
          year: year,
        });
      } else {
        const intersection = semesterViewSelection.values.filter(s => availablePeriods.includes(s));
        if (intersection.length > 0) {
          setSelectedValues(intersection);
          setSemesterViewSelection({
            values: intersection,
            year: year,
          });
        } else {
          setSelectedValues(availablePeriods);
          setSemesterViewSelection({
            values: availablePeriods,
            year: year,
          });
        }
      }
    }
  };


  // Regrouper les tickets par identifiant afin de calculer le nombre de réentrants
// Étape 1 — Calculer le nombre global d'itérations par ticket
const ticketIterationsMap = {};
data.forEach((t) => {
  const id = t.id_ticket;
  if (!ticketIterationsMap[id]) ticketIterationsMap[id] = [];
  ticketIterationsMap[id].push(t);
});

// Étape 2 — Trier les itérations de chaque ticket par date
Object.keys(ticketIterationsMap).forEach((id) => {
  ticketIterationsMap[id].sort((a, b) =>
    new Date(a.date_derniere_maj) - new Date(b.date_derniere_maj)
  );
});

// Étape 3 — Analyser les itérations pour ne compter que les 2e+ dans la période sélectionnée
let reentrantCount = 0;
let nonReentrantCount = 0;

for (const [ticketId, iterations] of Object.entries(ticketIterationsMap)) {
  iterations.forEach((t, idx) => {
    const date = new Date(t[dateField]);
    const period =
      viewMode === "week"
        ? Number(t[weekField]) || getWeekNumber(date)
        : viewMode === "month"
        ? date.getMonth() + 1
        : viewMode === "quarter"
        ? getQuarter(date)
        : getSemester(date);

    if (!selectedValues.includes(period)) return;

    if (iterations.length === 1) {
      // Ticket avec une seule itération
      nonReentrantCount += 1;
    } else if (idx === 0) {
      // Première itération (même si elle est dans la période), jamais considérée réentrante
      nonReentrantCount += 1;
    } else {
      // Itérations ≥ 2 comptées comme réentrantes si dans la période
      reentrantCount += 1;
    }
  });
}



  const total = nonReentrantCount + reentrantCount;

  const chartData = {
    labels: ["Réentrant", "Non Réentrant"],
    datasets: [
      {
        data: [
          disabledCategories.includes("Réentrant") ? 0 : reentrantCount,
          disabledCategories.includes("Non Réentrant") ? 0 : nonReentrantCount,
        ],
        backgroundColor: [colors["Réentrant"], colors["Non Réentrant"]],
        cutout: "45%",
        borderWidth: 1,
        rotation: -90,
      },
    ],
  };

  const toggleCategory = (category) => {
    setDisabledCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const periodeLabel = selectedValues.length > 0
    ? viewMode === "week"
      ? `Semaine(s) : ${selectedValues.join(", ")}`
      : viewMode === "month"
        ? `Mois : ${selectedValues.map(m => moisFrancais[m]).join(", ")}`
        : viewMode === "quarter"
          ? `Trimestre(s) : ${selectedValues.map(q => trimestres[q]).join(", ")}`
          : `Semestre(s) : ${selectedValues.map(s => semestres[s]).join(", ")}`
    : "Aucune période sélectionnée";

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "right",
        labels: {
          color: "black",
          font: { size: 11 },
          boxWidth: 12,
          padding: 8,
          generateLabels: (chart) =>
            chart.data.labels.map((label) => ({
              text: label,
              fillStyle: colors[label],
              hidden: disabledCategories.includes(label),
            })),
        },
        onClick: (_, legendItem) => toggleCategory(legendItem.text),
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label;
            const value = context.raw;
            if (disabledCategories.includes(label)) return null;
            const percent = total ? ((value / total) * 100).toFixed(2) : "0.0";
            return `${label}: ${percent}%`;
          },
        },
      },
      datalabels: {
        color: "black",
        font: { size: 10 },
        formatter: (value, context) => {
          const label = context.chart.data.labels[context.dataIndex];
          if (value === 0 || disabledCategories.includes(label)) return "";
          const percent = ((value / total) * 100).toFixed(2);
          return `${percent}%`;
        },
        anchor: "end",
        align: "end",
        offset: 8,
      },
    },
    layout: { padding: 10 },
  };

return (
  <div className="visualisation relative" data-id={id}>
    <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
      {/* En-tête avec titre, sous-titre et boutons */}
      <div className="flex justify-between items-start mb-4 relative">
        <div>
          <h3 className="no-export text-lg font-semibold text-gray-800">Taux des Réentrants</h3>
          <p className="text-sm text-gray-500">
            {selectedYear && `Année : ${selectedYear} - `}
            {periodeLabel}
          </p>
        </div>
        <div className="no-export flex gap-2">
          <button 
            className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" 
            onClick={() => setIsOpen(!isOpen)}
            data-filter-toggle="true">
            <AiOutlineFilter size={20} className="text-gray-600" />
          </button>
          <CommentButton 
            containerRef={chartContainerRef} 
            comments={comments}
            onAddComment={handleAddComment}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
          />
          <button 
            className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" 
            onClick={() => setModalIsOpen(true)}>
            <FaExpand size={18} className="text-gray-600" />
          </button>
        </div>

        {isOpen && (
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

      <div className="flex-grow flex justify-center items-center w-full" ref={chartContainerRef}>
        <Doughnut
          data={chartData}
          options={chartOptions}
        />
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
            <h3 className="text-2xl font-semibold text-gray-800">Taux des Réentrants</h3>
            <p className="text-sm text-gray-500 mt-1">
              {selectedYear && `Année : ${selectedYear} - `}{periodeLabel}
            </p>
          </div>
          <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">
            ❌
          </button>
        </div>
        <div className="relative h-[400px] flex items-center justify-center" ref={modalChartContainerRef}>
          <Doughnut
            data={chartData}
            options={chartOptions}
          />
          <CommentButton 
            containerRef={modalChartContainerRef} 
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