"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler
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

ChartJS.register(
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartDataLabels
);

// ... (Vos fonctions getWeekNumber, getQuarter, getSemester restent inchangées)
const getWeekNumber = (date) => {
    const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tempDate.getUTCDay() || 7;
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};
const getQuarter = (date) => Math.ceil((date.getMonth() + 1) / 3);
const getSemester = (date) => (date.getMonth() + 1 <= 6 ? 1 : 2);


export default function VolumeReentrantsLineChart({
    apiUrl,
    id = "Volume des Réentrants - Evolution",
    title = "Volume des Réentrants - Évolution",
    idField = "id_ticket",
    dateUpdateField = "date_derniere_maj",
    weekField = "semaine",
    yAxisLabel = "Nombre de tickets réentrants",
    lineColor = "#2196f3",
    periodLabels = {
        month: { 1: "Janv", 2: "Févr", 3: "Mars", 4: "Avr", 5: "Mai", 6: "Juin", 7: "Juil", 8: "Août", 9: "Sept", 10: "Oct", 11: "Nov", 12: "Déc" },
        quarter: { 1: "T1", 2: "T2", 3: "T3", 4: "T4" },
        semester: { 1: "S1", 2: "S2" }
    },
    defaultViewMode = "week",
    defaultNumPeriods = 5,
    enableYearFilter = true,
    enableToggleView = true,
    lineTension = 0.3,
    enableFill = true
}) {
    if (!apiUrl) {
        return (
            <div className="visualisation relative" data-id={id}>
                <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
                    <h3 className="text-lg font-semibold text-black">{title}</h3>
                    <p className="text-red-500 text-sm mt-2">Erreur : L'URL de l'API est requise.</p>
                </div>
            </div>
        );
    }

    // =================================================================
    // SECTION 1 : HOOKS (TOUJOURS AU DÉBUT)
    // =================================================================
    const initializationCompleted = useRef(false);
    const globalFilterApplied = useRef(false);
    const prevViewMode = useRef(null);
    const filterPanelRef = useRef(null);
    const chartContainerRef = useRef(null);
    const modalChartContainerRef = useRef(null);

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState(defaultViewMode);
    const [selectedValues, setSelectedValues] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [groupedData, setGroupedData] = useState({});
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [hasGlobalFilter, setHasGlobalFilter] = useState(false);
    const [annotations, setAnnotations] = useState([]);
    const [weekViewSelection, setWeekViewSelection] = useState({ values: [], year: null });
    const [monthViewSelection, setMonthViewSelection] = useState({ values: [], year: null });
    const [quarterViewSelection, setQuarterViewSelection] = useState({ values: [], year: null });
    const [semesterViewSelection, setSemesterViewSelection] = useState({ values: [], year: null });
    const [availableYears, setAvailableYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState(null);
    const [multipleYearsExist, setMultipleYearsExist] = useState(false);
    const [weekSelectionModifiedAt, setWeekSelectionModifiedAt] = useState(0);
    const [monthSelectionModifiedAt, setMonthSelectionModifiedAt] = useState(0);
    const [quarterSelectionModifiedAt, setQuarterSelectionModifiedAt] = useState(0);
    const [semesterSelectionModifiedAt, setSemesterSelectionModifiedAt] = useState(0);

    const { globalStartDate, globalEndDate, globalModifiedAt } = useGlobalFilter();

    // ... (Vos fonctions utilitaires comme getAllWeeksBetween etc. peuvent rester ici)
    function getAllWeeksBetween(startDate, endDate) { if (!startDate || !endDate) return []; const weeksArray = []; const startWeek = getWeekNumber(startDate); const endWeek = getWeekNumber(endDate); const startYear = startDate.getFullYear(); const endYear = endDate.getFullYear(); if (startYear === endYear) { for (let week = startWeek; week <= endWeek; week++) weeksArray.push(week); } else { for (let year = startYear; year <= endYear; year++) { const maxWeeks = year === endYear ? endWeek : 52; const minWeeks = year === startYear ? startWeek : 1; for (let week = minWeeks; week <= maxWeeks; week++) weeksArray.push(week); } } return weeksArray; }
    function getAllMonthsBetween(startDate, endDate) { if (!startDate || !endDate) return []; const monthsArray = []; const startMonth = startDate.getMonth() + 1; const endMonth = endDate.getMonth() + 1; const startYear = startDate.getFullYear(); const endYear = endDate.getFullYear(); if (startYear === endYear) { for (let month = startMonth; month <= endMonth; month++) monthsArray.push(month); } else { for (let year = startYear; year <= endYear; year++) { const maxMonth = year === endYear ? endMonth : 12; const minMonth = year === startYear ? startMonth : 1; for (let month = minMonth; month <= maxMonth; month++) monthsArray.push(month); } } return monthsArray; }
    function getAllQuartersBetween(startDate, endDate) { if (!startDate || !endDate) return []; const quartersArray = []; const startQuarter = getQuarter(startDate); const endQuarter = getQuarter(endDate); const startYear = startDate.getFullYear(); const endYear = endDate.getFullYear(); if (startYear === endYear) { for (let quarter = startQuarter; quarter <= endQuarter; quarter++) quartersArray.push(quarter); } else { for (let year = startYear; year <= endYear; year++) { const maxQuarter = year === endYear ? endQuarter : 4; const minQuarter = year === startYear ? startQuarter : 1; for (let quarter = minQuarter; quarter <= maxQuarter; quarter++) quartersArray.push(quarter); } } return quartersArray; }
    function getAllSemestersBetween(startDate, endDate) { if (!startDate || !endDate) return []; const semestersArray = []; const startSemester = getSemester(startDate); const endSemester = getSemester(endDate); const startYear = startDate.getFullYear(); const endYear = endDate.getFullYear(); if (startYear === endYear) { for (let semester = startSemester; semester <= endSemester; semester++) semestersArray.push(semester); } else { for (let year = startYear; year <= endYear; year++) { const maxSemester = year === endYear ? endSemester : 2; const minSemester = year === startYear ? startSemester : 1; for (let semester = minSemester; semester <= maxSemester; semester++) semestersArray.push(semester); } } return semestersArray; }

    const getAvailablePeriodsForYear = (year, mode) => {
        if (!year || data.length === 0) return [];
        const filteredByYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === year);
        if (mode === "week") { return [...new Set(filteredByYear.map((t) => { const weekVal = t[weekField]; if (!isNaN(Number(weekVal))) { return Number(weekVal); } const date = new Date(t[dateUpdateField]); if (!isNaN(date.getTime())) { return getWeekNumber(date); } return null; }))].filter(week => week !== null).sort((a, b) => a - b); }
        else if (mode === "month") { return [...new Set(filteredByYear.map((t) => new Date(t[dateUpdateField]).getMonth() + 1))].sort((a, b) => a - b); }
        else if (mode === "quarter") { return [...new Set(filteredByYear.map((t) => getQuarter(new Date(t[dateUpdateField]))))].sort((a, b) => a - b); }
        else if (mode === "semester") { return [...new Set(filteredByYear.map((t) => getSemester(new Date(t[dateUpdateField]))))].sort((a, b) => a - b); }
        return [];
    };

    const processReentrantData = (tickets, mode, currentSelectedValues = []) => { const byId = {}; tickets.forEach(ticket => { const ticketId = ticket[idField]; const dt = new Date(ticket[dateUpdateField]); let period; if (mode === "week") { const w = ticket[weekField]; period = (!w || isNaN(Number(w))) ? getWeekNumber(dt) : Number(w); } else if (mode === "month") { period = dt.getMonth() + 1; } else if (mode === "quarter") { period = getQuarter(dt); } else { period = getSemester(dt); } if (!byId[ticketId]) byId[ticketId] = []; byId[ticketId].push(period); }); const result = {}; Object.entries(byId).forEach(([ticketId, periods]) => { if (periods.length < 2) return; const sorted = periods.sort((a, b) => a - b); const lastPeriod = sorted[sorted.length - 1]; if (currentSelectedValues.length && !currentSelectedValues.includes(lastPeriod)) { return; } result[lastPeriod] = (result[lastPeriod] || 0) + 1; }); setGroupedData(result); };
    const applyGlobalFilter = () => { if (!globalStartDate || !globalEndDate) return; const currentGlobalYear = globalStartDate.getFullYear(); const weekList = getAllWeeksBetween(globalStartDate, globalEndDate); setWeekViewSelection({ values: weekList, year: currentGlobalYear }); const monthList = getAllMonthsBetween(globalStartDate, globalEndDate); setMonthViewSelection({ values: monthList, year: currentGlobalYear }); const quarterList = getAllQuartersBetween(globalStartDate, globalEndDate); setQuarterViewSelection({ values: quarterList, year: currentGlobalYear }); const semesterList = getAllSemestersBetween(globalStartDate, globalEndDate); setSemesterViewSelection({ values: semesterList, year: currentGlobalYear }); let valuesToUse = []; if (viewMode === "week") { valuesToUse = weekList; setSelectedValues(weekList); } else if (viewMode === "month") { valuesToUse = monthList; setSelectedValues(monthList); } else if (viewMode === "quarter") { valuesToUse = quarterList; setSelectedValues(quarterList); } else if (viewMode === "semester") { valuesToUse = semesterList; setSelectedValues(semesterList); } setSelectedYear(currentGlobalYear); setHasGlobalFilter(true); if (data.length > 0) { const ticketsForYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === currentGlobalYear); processReentrantData(ticketsForYear, viewMode, valuesToUse); } };

    // =================================================================
    // SECTION 2 : EFFETS (useEffect)
    // =================================================================
    useEffect(() => { function handleClickOutside(event) { if (isOpen && filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest('button[data-filter-toggle]')) { setIsOpen(false); } } document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); }, [isOpen]);
    useEffect(() => { if (!prevViewMode.current) { prevViewMode.current = viewMode; return; } if (prevViewMode.current === "week") { setWeekViewSelection({ values: selectedValues, year: selectedYear }); } else if (prevViewMode.current === "month") { setMonthViewSelection({ values: selectedValues, year: selectedYear }); } else if (prevViewMode.current === "quarter") { setQuarterViewSelection({ values: selectedValues, year: selectedYear }); } else if (prevViewMode.current === "semester") { setSemesterViewSelection({ values: selectedValues, year: selectedYear }); } let restoredValues = []; let restoredYear = selectedYear; if (viewMode === "week" && weekViewSelection.values.length > 0) { restoredValues = weekViewSelection.values; restoredYear = weekViewSelection.year || selectedYear; } else if (viewMode === "month" && monthViewSelection.values.length > 0) { restoredValues = monthViewSelection.values; restoredYear = monthViewSelection.year || selectedYear; } else if (viewMode === "quarter" && quarterViewSelection.values.length > 0) { restoredValues = quarterViewSelection.values; restoredYear = quarterViewSelection.year || selectedYear; } else if (viewMode === "semester" && semesterViewSelection.values.length > 0) { restoredValues = semesterViewSelection.values; restoredYear = semesterViewSelection.year || selectedYear; } else { if (selectedYear && data.length > 0) { const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode); restoredValues = availablePeriods.slice(-defaultNumPeriods); } } setSelectedValues(restoredValues); if (restoredYear !== selectedYear) { setSelectedYear(restoredYear); } if (data.length > 0 && restoredYear) { const ticketsForYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === restoredYear); processReentrantData(ticketsForYear, viewMode, restoredValues); } prevViewMode.current = viewMode; }, [viewMode, data]);
    useEffect(() => { async function fetchData() { try { setLoading(true); const response = await fetchWithAuth(apiUrl); const result = await response.json(); setData(result); const years = [...new Set(result.map((t) => new Date(t[dateUpdateField]).getFullYear()))].sort(); setAvailableYears(years); setMultipleYearsExist(years.length > 1); const latestYear = years[years.length - 1]; let initialYear = latestYear; if (globalStartDate && globalEndDate && !initializationCompleted.current && !globalFilterApplied.current) { applyGlobalFilter(); initialYear = selectedYear; globalFilterApplied.current = true; } else { setSelectedYear(latestYear); } if (!initializationCompleted.current && !globalFilterApplied.current) { const ticketsForYear = result.filter((t) => new Date(t[dateUpdateField]).getFullYear() === initialYear); const availablePeriods = getAvailablePeriodsForYear(initialYear, viewMode); const lastPeriods = availablePeriods.slice(-defaultNumPeriods); setSelectedValues(lastPeriods); if (viewMode === "week") { setWeekViewSelection({ values: lastPeriods, year: initialYear }); } else if (viewMode === "month") { setMonthViewSelection({ values: lastPeriods, year: initialYear }); } else if (viewMode === "quarter") { setQuarterViewSelection({ values: lastPeriods, year: initialYear }); } else if (viewMode === "semester") { setSemesterViewSelection({ values: lastPeriods, year: initialYear }); } processReentrantData(ticketsForYear, viewMode, lastPeriods); initializationCompleted.current = true; } else if (initializationCompleted.current && selectedYear) { const ticketsForYear = result.filter((t) => new Date(t[dateUpdateField]).getFullYear() === selectedYear); processReentrantData(ticketsForYear, viewMode, selectedValues); } setLoading(false); } catch (error) { console.error("Erreur lors du chargement des données:", error); setLoading(false); } } fetchData(); }, [apiUrl, dateUpdateField, idField, weekField, defaultNumPeriods]);
    useEffect(() => { if (initializationCompleted.current && data.length > 0 && selectedYear) { const ticketsForYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === selectedYear); processReentrantData(ticketsForYear, viewMode, selectedValues); } }, [selectedYear, viewMode, data, dateUpdateField, selectedValues]);
    useEffect(() => { if (initializationCompleted.current && globalStartDate && globalEndDate && globalModifiedAt > 0) { const lastLocalModification = Math.max(weekSelectionModifiedAt, monthSelectionModifiedAt, quarterSelectionModifiedAt, semesterSelectionModifiedAt); if (globalModifiedAt > lastLocalModification || lastLocalModification === 0) { applyGlobalFilter(); globalFilterApplied.current = true; } } }, [globalStartDate, globalEndDate, globalModifiedAt]);


    // =================================================================
    // SECTION 3 : PRÉPARATION DES DONNÉES (AVANT LES RETOURS)
    // =================================================================
    const availablePeriods = getAvailablePeriodsForYear(selectedYear, viewMode);
    const allPeriodsSelected = availablePeriods.length > 0 && availablePeriods.every((period) => selectedValues.includes(period));

    const filteredPeriodsData = Object.entries(groupedData)
        .map(([periodStr, count]) => ({ period: parseInt(periodStr), count }))
        .filter(({ period }) => selectedValues.includes(period))
        .sort((a, b) => a.period - b.period);

    const createOptimizedLabels = () => {
        const numPeriods = filteredPeriodsData.length;
        return filteredPeriodsData.map(({ period }) => {
            let periodLabel = String(period);
            if (viewMode === "week") { periodLabel = numPeriods > 10 ? `S${period}` : `S ${period}`; }
            else if (viewMode === "month" && periodLabels.month[period]) { periodLabel = periodLabels.month[period]; }
            else if (viewMode === "quarter" && periodLabels.quarter[period]) { periodLabel = periodLabels.quarter[period]; }
            else if (viewMode === "semester" && periodLabels.semester[period]) { periodLabel = periodLabels.semester[period]; }
            if (multipleYearsExist && numPeriods <= 8) { return `${periodLabel} ${selectedYear}`; }
            return periodLabel;
        });
    };

    const labels = createOptimizedLabels();

    const periodeLabelText = selectedValues.length > 0
        ? viewMode === "week"
            ? `Semaine(s) : ${selectedValues.sort((a, b) => a - b).join(", ")}`
            : viewMode === "month"
                ? `Mois : ${selectedValues.sort((a, b) => a - b).map(m => periodLabels.month[m] || m).join(", ")}`
                : viewMode === "quarter"
                    ? `Trimestre(s) : ${selectedValues.sort((a, b) => a - b).map(q => periodLabels.quarter[q] || q).join(", ")}`
                    : `Semestre(s) : ${selectedValues.sort((a, b) => a - b).map(s => periodLabels.semester[s] || s).join(", ")}`
        : "Aucune période sélectionnée";

    const chartOptions = useMemo(() => {
        const numLabels = labels.length;
        const centerScale = numLabels === 1;

        let rotation = 0;
        let fontSize = 12;
        if (numLabels > 20) { rotation = 45; fontSize = 10; }
        else if (numLabels > 8) { rotation = 45; fontSize = 11; }

        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: 'white', bodyColor: 'white', borderColor: lineColor, borderWidth: 1, cornerRadius: 6, displayColors: false, },
                datalabels: { display: true, anchor: 'end', align: 'top', offset: 8, color: '#333', font: { weight: 'bold', size: 12, }, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 4, padding: 4, }
            },
            scales: {
                x: {
                    ticks: { autoSkip: false, color: "black", maxRotation: rotation, minRotation: rotation, font: { size: fontSize } },
                    title: { display: true, text: viewMode === "week" ? "Semaines" : viewMode === "month" ? "Mois" : viewMode === 'quarter' ? 'Trimestres' : 'Semestres', color: "black" },
                    grid: { display: false },
                    min: centerScale ? -0.5 : undefined,
                    max: centerScale ? 0.5 : undefined,
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "black", precision: 0 },
                    title: { display: true, text: yAxisLabel, color: "black" },
                    grid: { color: "rgba(0, 0, 0, 0.1)" },
                    grace: '20%'
                },
            },
            interaction: { intersect: false, mode: 'index' },
            elements: { point: { hoverBackgroundColor: "#1d4ed8", hoverBorderColor: "#ffffff", hoverBorderWidth: 3, } }
        };
    }, [labels, lineColor, yAxisLabel, viewMode]);

    const chartData = {
        labels,
        datasets: [{
            label: "Tickets Réentrants",
            data: filteredPeriodsData.map(({ count }) => count),
            borderColor: "#2196f3",
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            pointBackgroundColor: "#2196f3",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: lineTension,
            fill: enableFill
        }]
    };

    // =================================================================
    // SECTION 4 : RETOURS CONDITIONNELS
    // =================================================================
    if (loading) {
        return (
            <div className="visualisation relative" data-id={id}>
                <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-[450px] flex justify-center items-center">
                    <p className="text-center text-gray-500">Chargement des données...</p>
                </div>
            </div>
        );
    }

    // =================================================================
    // SECTION 5 : GESTIONNAIRES D'ÉVÉNEMENTS ET RETOUR FINAL
    // =================================================================
    const toggleSelectAll = () => { const newSelectedValues = allPeriodsSelected ? [] : [...availablePeriods]; setSelectedValues(newSelectedValues); const now = Date.now(); if (viewMode === "week") { setWeekViewSelection({ values: newSelectedValues, year: selectedYear }); setWeekSelectionModifiedAt(now); } else if (viewMode === "month") { setMonthViewSelection({ values: newSelectedValues, year: selectedYear }); setMonthSelectionModifiedAt(now); } else if (viewMode === "quarter") { setQuarterViewSelection({ values: newSelectedValues, year: selectedYear }); setQuarterSelectionModifiedAt(now); } else if (viewMode === "semester") { setSemesterViewSelection({ values: newSelectedValues, year: selectedYear }); setSemesterSelectionModifiedAt(now); } setHasGlobalFilter(false); if (data.length > 0 && selectedYear) { const ticketsForYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === selectedYear); processReentrantData(ticketsForYear, viewMode, newSelectedValues); } };
    const handleSelectionChange = (value) => { const newSelectedValues = selectedValues.includes(value) ? selectedValues.filter(v => v !== value) : [...selectedValues, value]; setSelectedValues(newSelectedValues); const now = Date.now(); if (viewMode === "week") { setWeekViewSelection({ values: newSelectedValues, year: selectedYear }); setWeekSelectionModifiedAt(now); } else if (viewMode === "month") { setMonthViewSelection({ values: newSelectedValues, year: selectedYear }); setMonthSelectionModifiedAt(now); } else if (viewMode === "quarter") { setQuarterViewSelection({ values: newSelectedValues, year: selectedYear }); setQuarterSelectionModifiedAt(now); } else if (viewMode === "semester") { setSemesterViewSelection({ values: newSelectedValues, year: selectedYear }); setSemesterSelectionModifiedAt(now); } setHasGlobalFilter(false); if (data.length > 0 && selectedYear) { const ticketsForYear = data.filter((t) => new Date(t[dateUpdateField]).getFullYear() === selectedYear); processReentrantData(ticketsForYear, viewMode, newSelectedValues); } };
    const handleViewModeChange = (newMode) => { setViewMode(newMode); };
    const handleYearChange = (year) => { setSelectedYear(year); const newAvailablePeriods = getAvailablePeriodsForYear(year, viewMode); let newSelectedValues = []; if (hasGlobalFilter && globalStartDate && globalEndDate) { let globalPeriods = []; if (viewMode === "week") globalPeriods = getAllWeeksBetween(globalStartDate, globalEndDate); else if (viewMode === "month") globalPeriods = getAllMonthsBetween(globalStartDate, globalEndDate); else if (viewMode === "quarter") globalPeriods = getAllQuartersBetween(globalStartDate, globalEndDate); else if (viewMode === "semester") globalPeriods = getAllSemestersBetween(globalStartDate, globalEndDate); newSelectedValues = globalPeriods.filter(p => newAvailablePeriods.includes(p)); } else { let previousSelection = []; if (viewMode === "week") previousSelection = weekViewSelection.values; else if (viewMode === "month") previousSelection = monthViewSelection.values; else if (viewMode === "quarter") previousSelection = quarterViewSelection.values; else if (viewMode === "semester") previousSelection = semesterViewSelection.values; const intersection = previousSelection.filter(p => newAvailablePeriods.includes(p)); if (intersection.length > 0) { newSelectedValues = intersection; } else { newSelectedValues = newAvailablePeriods.slice(-defaultNumPeriods); } } setSelectedValues(newSelectedValues); if (viewMode === "week") setWeekViewSelection({ values: newSelectedValues, year: year }); else if (viewMode === "month") setMonthViewSelection({ values: newSelectedValues, year: year }); else if (viewMode === "quarter") setQuarterViewSelection({ values: newSelectedValues, year: year }); else if (viewMode === "semester") setSemesterViewSelection({ values: newSelectedValues, year: year }); };

    return (
        <div className="visualisation relative" data-id={id}>
            <div className="relative bg-white p-5 shadow-md rounded-lg w-full h-full flex flex-col">
                {/* Header avec titre, sous-titre et boutons */}
                <div className="flex justify-between items-start mb-4 relative">
                    <div>
                        <h3 className="no-export text-lg font-semibold text-gray-800">{title}</h3>
                        <p className="text-sm text-gray-500">
                            {selectedYear && `Année : ${selectedYear} - `}
                            {periodeLabelText}
                        </p>
                    </div>
                    <div className="no-export flex gap-2">
                        <button className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" onClick={() => setIsOpen(!isOpen)} data-filter-toggle="true">
                            <AiOutlineFilter size={20} className="text-gray-600" />
                        </button>
                        <CommentButton containerRef={chartContainerRef} comments={annotations} onAddComment={(newComment) => setAnnotations([...annotations, newComment])} onUpdateComment={(updatedComment) => setAnnotations(annotations.map(a => a.id === updatedComment.id ? updatedComment : a))} onDeleteComment={(commentId) => setAnnotations(annotations.filter(a => a.id !== commentId))} />
                        <button className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" onClick={() => setModalIsOpen(true)}>
                            <FaExpand size={18} className="text-gray-600" />
                        </button>
                    </div>
                    {isOpen && (
                        <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50">
                            <h4 className="font-semibold text-gray-500">Filtrer par :</h4>
                            {enableToggleView && (
                                <div className="flex space-x-2 mb-2 mt-2 flex-wrap">
                                    <button className={`px-3 py-1 rounded-md mb-1 ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`} onClick={() => handleViewModeChange("week")} > Semaine </button>
                                    <button className={`px-3 py-1 rounded-md mb-1 ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`} onClick={() => handleViewModeChange("month")} > Mois </button>
                                    <button className={`px-3 py-1 rounded-md mb-1 ${viewMode === "quarter" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`} onClick={() => handleViewModeChange("quarter")} > Trimestre </button>
                                    <button className={`px-3 py-1 rounded-md mb-1 ${viewMode === "semester" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`} onClick={() => handleViewModeChange("semester")} > Semestre </button>
                                </div>
                            )}
                            {enableYearFilter && multipleYearsExist && (
                                <div className="mb-3">
                                    <h5 className="text-sm font-medium text-gray-500 mb-1">Années :</h5>
                                    <div className="flex flex-wrap gap-1">
                                        {availableYears.map((year) => (
                                            <button key={year} onClick={() => handleYearChange(year)} className={`px-2 py-1 text-xs rounded-md ${selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`} > {year} </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="mb-2">
                                <button onClick={toggleSelectAll} className={`text-xs px-2 py-1 rounded-md w-full ${allPeriodsSelected ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`} > {allPeriodsSelected ? "Tout désélectionner" : "Tout sélectionner"} </button>
                            </div>
                            <div className="max-h-32 overflow-y-auto border p-2 rounded-md">
                                {availablePeriods.map((value) => (
                                    <div key={value} className="flex items-center space-x-2">
                                        <input type="checkbox" id={`period-${value}-${viewMode}`} checked={selectedValues.includes(value)} onChange={() => handleSelectionChange(value)} />
                                        <label htmlFor={`period-${value}-${viewMode}`} className="text-gray-500 cursor-pointer">
                                            {viewMode === "week" ? `S${value}` : viewMode === "month" ? periodLabels.month[value] || `Mois ${value}` : viewMode === "quarter" ? periodLabels.quarter[value] || `Trim. ${value}` : viewMode === "semester" ? periodLabels.semester[value] || `Sem. ${value}` : value}
                                        </label>
                                    </div>
                                ))}
                                {availablePeriods.length === 0 && (<p className="text-xs text-gray-400 text-center">Aucune période disponible pour {selectedYear}.</p>)}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex-grow flex justify-center items-center h-[350px]" ref={chartContainerRef}>
                    {filteredPeriodsData.length > 0 ? (
                        <Line data={chartData} options={chartOptions} />
                    ) : (
                        <p className="text-gray-500 italic">Aucune donnée à afficher pour la sélection actuelle.</p>
                    )}
                </div>
            </div>

            <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)} className="flex items-center justify-center fixed inset-0 z-50" overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm" contentLabel={`Modal ${title}`} >
                <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                    <div className="flex items-center justify-between mb-6 flex-shrink-0">
                        <div>
                            <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
                            <p className="text-sm text-gray-500 mt-1"> {selectedYear && `Année : ${selectedYear} - `}{periodeLabelText} </p>
                        </div>
                        <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-red-100 transition-colors" > ❌ </button>
                    </div>
                    <div className="relative flex-grow min-h-[400px] flex items-center justify-center" ref={modalChartContainerRef}>
                        {filteredPeriodsData.length > 0 ? (
                            <Line data={chartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
                        ) : (
                            <p className="text-gray-500 italic">Aucune donnée à afficher.</p>
                        )}
                        <CommentButton containerRef={modalChartContainerRef} hideButton={true} comments={annotations} onAddComment={(newComment) => setAnnotations([...annotations, newComment])} onUpdateComment={(updatedComment) => setAnnotations(annotations.map(a => a.id === updatedComment.id ? updatedComment : a))} onDeleteComment={(commentId) => setAnnotations(annotations.filter(a => a.id !== commentId))} />
                    </div>
                </div>
            </Modal>
        </div>
    );
}