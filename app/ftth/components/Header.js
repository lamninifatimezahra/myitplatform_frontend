'use client';

import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaDownload, FaFilter, FaTimes } from "react-icons/fa";
import { AiOutlineClockCircle, AiOutlineMenu } from "react-icons/ai";
import ProfileMenu from "./ProfileMenu";
import NotificationMenu from "./NotificationMenu";
import { generateWordFromGraphs } from "../utils/exportWord";
import { generatePPTFromGraphs } from "../utils/exportPPTX";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toPng } from "html-to-image";
import fetchWithAuth from "@/utils/fetchWithAuth";
import Modal from "react-modal";

if (typeof window !== "undefined") Modal.setAppElement("body");

function parseCustomDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes("T")) return new Date(dateStr);
  try {
    const [datePart, timePart] = dateStr.split(" ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours, minutes] = timePart ? timePart.split(":").map(Number) : [0, 0];
    return new Date(year, month - 1, day, hours, minutes);
  } catch {
    return null;
  }
}

export default function Header({ onGlobalFilter, setSidebarOpen }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [format, setFormat] = useState(null);
  const [graphList, setGraphList] = useState([]);
  const [selectedGraphs, setSelectedGraphs] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [periodText, setPeriodText] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileDownloadOpen, setMobileDownloadOpen] = useState(false);
  const [lastUploadDate, setLastUploadDate] = useState(null);
  const [isLoadingUploadDate, setIsLoadingUploadDate] = useState(true);

  const dropdownRef = useRef();
  const endDateRef = useRef();

  useEffect(() => {
    document.addEventListener("mousedown", (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    });
  }, []);

  useEffect(() => {
    const graphElements = Array.from(document.querySelectorAll("[data-graph-id]"));
    const graphs = graphElements.map((el) => ({
      id: el.getAttribute("data-graph-id"),
      label: el.getAttribute("data-graph-label") || el.getAttribute("data-graph-id"),
    }));
    setGraphList(graphs);
  }, []);

  useEffect(() => {
    const fetchLastUploadDate = async () => {
      setIsLoadingUploadDate(true);
      try {
        const res = await fetchWithAuth("https://myit-backend-its-c20c9354ce42.herokuapp.com/dashboard/api/ftth/files/");
        const data = await res.json();
        const sorted = data.sort((a, b) => parseCustomDate(b.uploaded_at) - parseCustomDate(a.uploaded_at));
        const latest = parseCustomDate(sorted[0]?.uploaded_at);
        if (latest) {
          setLastUploadDate(`${latest.toLocaleDateString("fr-FR")} à ${latest.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`);
        }
      } catch {
        setLastUploadDate(null);
      } finally {
        setIsLoadingUploadDate(false);
      }
    };

    fetchLastUploadDate();
    const interval = setInterval(fetchLastUploadDate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleGraph = (id) =>
    setSelectedGraphs((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );

  const toggleAll = (all) => setSelectedGraphs(all ? graphList.map((g) => g.id) : []);

  const handleGlobalFilter = () => {
    if (!startDate || !endDate) return alert("Veuillez sélectionner une période valide.");
    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const text = `📅 Du ${startDate.toLocaleDateString()} au ${endDate.toLocaleDateString()} – ${diffDays} jour(s)`;
    if (window.confirm(`Confirmez-vous la période sélectionnée ?\n\n${text}`)) {
      setPeriodText(text);
      onGlobalFilter(startDate, endDate);
    }
  };
  return (
    <header className="bg-white shadow-md px-4 sm:px-6 py-4 flex flex-col gap-y-3 sticky top-0 z-50 w-full">
      {/* 🧭 Ligne principale : titre à gauche mobile & desktop */}
      <div className="flex flex-wrap items-center justify-between w-full gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-start">
          <button className="sm:hidden text-[#31327e]" onClick={() => setSidebarOpen(true)}>
            <AiOutlineMenu size={24} />
          </button>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#31327e]">Dashboard FTTH</h1>
        </div>

        <div className="flex flex-wrap items-center justify-end w-full sm:w-auto gap-2">
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <FaSearch className="absolute right-3 top-3 text-gray-400" />
          </div>

          <NotificationMenu />
          <ProfileMenu />
        </div>
      </div>

      {/* 👋 Bienvenue + date MAJ desktop uniquement */}
      <div className="hidden sm:flex items-center text-sm text-gray-500 gap-2 pl-1">
        <span>Bienvenue</span>
        {lastUploadDate && (
          <span className="flex items-center gap-1 text-blue-700">
            <AiOutlineClockCircle />
            Dernière mise à jour :
            <span className="font-medium">{lastUploadDate}</span>
          </span>
        )}
        {isLoadingUploadDate && <span className="text-gray-400 animate-pulse">Chargement…</span>}
      </div>

      {/* 📱 Boutons filtres et download mobile */}
      <div className="flex sm:hidden justify-start gap-3">
        <button
          onClick={() => setMobileFilterOpen(true)}
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
          aria-label="Filtrer"
        >
          <FaFilter className="text-gray-600" />
        </button>
        <button
          onClick={() => setMobileDownloadOpen(true)}
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
          aria-label="Télécharger"
        >
          <FaDownload className="text-gray-600" />
        </button>
      </div>

      {/* 🖥️ Desktop - filtres & téléchargement */}
      <div className="hidden md:flex bg-gray-50 border border-gray-200 shadow-sm rounded-xl px-4 py-3 justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-gray-700 font-medium">Période sélectionnée :</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => {
              setStartDate(date);
              setTimeout(() => endDateRef.current?.setFocus(), 200);
            }}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            placeholderText="Date de début"
            className="border border-gray-300 rounded-md px-3 py-2 text-gray-600 shadow-sm text-sm"
          />
          <DatePicker
            ref={endDateRef}
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            placeholderText="Date de fin"
            className="border border-gray-300 rounded-md px-3 py-2 text-gray-600 shadow-sm text-sm"
          />
          <button
            className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg shadow hover:bg-gray-200"
            onClick={handleGlobalFilter}
          >
            <FaFilter />
            <span>Filtrer</span>
          </button>
          {periodText && (
            <span className="text-sm text-blue-700 font-medium whitespace-nowrap ml-3">
              {periodText}
            </span>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
          >
            <FaDownload />
            <span>Télécharger</span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 p-3 space-y-2">
              <div className="space-y-1">
                <div
                  onClick={() => setFormat("word")}
                  className="cursor-pointer hover:bg-gray-100 px-3 py-2 rounded"
                >
                  📄 CR (Format Word)
                </div>
                <div
  onClick={() => setFormat("pptx")}
  className="cursor-pointer hover:bg-gray-100 px-3 py-2 rounded"
>
  📊 COMOP FTTH (Format PPTX)
</div>

              </div>

              {format === "word" && (
  <div className="border-t pt-2 space-y-2">
    <div className="flex justify-between text-sm px-2 font-medium">
      <button onClick={() => toggleAll(true)} className="text-blue-600">Tout cocher</button>
      <button onClick={() => toggleAll(false)} className="text-red-600">Tout décocher</button>
    </div>
    <div className="border-b border-gray-300 mt-2 mb-2"></div>
    <div className="max-h-48 overflow-y-auto">
      {graphList.map((graph) => (
        <label key={graph.id} className="flex items-center gap-2 px-2 py-1">
          <input
            type="checkbox"
            checked={selectedGraphs.includes(graph.id)}
            onChange={() => toggleGraph(graph.id)}
          />
          <span className="text-sm text-gray-700">{graph.label}</span>
        </label>
      ))}
    </div>
    <button
      disabled={selectedGraphs.length === 0}
      className={`w-full mt-2 py-2 text-white rounded-lg ${
        selectedGraphs.length === 0
          ? "bg-gray-300 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700"
      }`}
      onClick={async () => {
        const confirmed = window.confirm(
          `Vous avez sélectionné ${selectedGraphs.length} graphique(s).\nLe téléchargement va commencer.`
        );
        if (!confirmed) return;

        await generateWordFromGraphs(selectedGraphs, graphList, {}, startDate, endDate);
      }}
    >
      Télécharger le CR WORD
    </button>
  </div>
)}

{format === "pptx" && (
  <div className="border-t pt-3 space-y-2">
    <button
      className="w-full py-2 text-white rounded-lg bg-blue-600 hover:bg-blue-700"
      onClick={async () => {
        const confirmed = window.confirm("Télécharger le COMOP FTTH (Format PPTX) ?");
        if (!confirmed) return;

        await generatePPTFromGraphs({
          selectedGraphIds: [], // vide ou spécifique à un preset COMOP
          graphList,
          commentMap: {},
          globalStartDate: startDate,
          globalEndDate: endDate,
        });
      }}
    >
      Télécharger le COMOP FTTH PPTX
    </button>
  </div>
)}

            </div>
          )}
        </div>
      </div>

  {/* 📱 Modal – Filtres mobile */}
<Modal
  isOpen={mobileFilterOpen}
  onRequestClose={() => setMobileFilterOpen(false)}
  className="bg-white rounded-2xl p-6 w-full max-w-sm mx-auto mt-24 shadow-xl relative"
  overlayClassName="fixed inset-0 bg-black/50 z-[80] flex items-start justify-center"
>
  <button
    onClick={() => setMobileFilterOpen(false)}
    className="absolute top-3 right-3 text-gray-500 hover:text-red-500"
  >
    <FaTimes />
  </button>
  <h2 className="text-lg font-semibold mb-4 text-[#31327e]">Filtrer les données</h2>
  <div className="space-y-4">
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">Date de début</label>
      <DatePicker
        selected={startDate}
        onChange={(date) => {
          setStartDate(date);
          setTimeout(() => endDateRef.current?.setFocus(), 200);
        }}
        selectsStart
        startDate={startDate}
        endDate={endDate}
        placeholderText="Sélectionner une date"
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm"
      />
    </div>
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">Date de fin</label>
      <DatePicker
        ref={endDateRef}
        selected={endDate}
        onChange={(date) => setEndDate(date)}
        selectsEnd
        startDate={startDate}
        endDate={endDate}
        minDate={startDate}
        placeholderText="Sélectionner une date"
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm"
      />
    </div>
    <button
      onClick={() => {
        handleGlobalFilter();
        setMobileFilterOpen(false);
      }}
      className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition"
    >
      Appliquer le filtre
    </button>
  </div>
</Modal>

{/* 📱 Modal – Téléchargement mobile */}
<Modal
  isOpen={mobileDownloadOpen}
  onRequestClose={() => setMobileDownloadOpen(false)}
  className="bg-white rounded-2xl p-6 w-full max-w-sm mx-auto mt-24 shadow-xl relative"
  overlayClassName="fixed inset-0 bg-black/50 z-[80] flex items-start justify-center"
>
  <button
    onClick={() => setMobileDownloadOpen(false)}
    className="absolute top-3 right-3 text-gray-500 hover:text-red-500"
  >
    <FaTimes />
  </button>
  <h2 className="text-lg font-semibold mb-4 text-[#31327e]">Télécharger le compte-rendu</h2>
  <div className="space-y-4">
    <div className="flex gap-3">
      <button
        onClick={() => setFormat("word")}
        className={`flex-1 py-2 rounded-md ${
          format === "word" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
        }`}
      >
        📄 Word
      </button>
      <button
        onClick={() => setFormat("pptx")}
        className={`flex-1 py-2 rounded-md ${
          format === "pptx" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
        }`}
      >
        📊 PPTX
      </button>
    </div>

    {format === "word" && (
  <>
    <div className="flex justify-between text-sm font-medium mb-2">
      <button onClick={() => toggleAll(true)} className="text-blue-600">Tout cocher</button>
      <button onClick={() => toggleAll(false)} className="text-red-600">Tout décocher</button>
    </div>
    <div className="border-b border-gray-300 mt-2 mb-2"></div>
    <div className="max-h-48 overflow-y-auto">
      {graphList.map((graph) => (
        <label key={graph.id} className="flex items-center gap-2 px-2 py-1">
          <input
            type="checkbox"
            checked={selectedGraphs.includes(graph.id)}
            onChange={() => toggleGraph(graph.id)}
          />
          <span className="text-sm text-gray-700">{graph.label}</span>
        </label>
      ))}
    </div>
    <button
      disabled={selectedGraphs.length === 0}
      className={`w-full mt-2 py-2 text-white rounded-lg ${
        selectedGraphs.length === 0
          ? "bg-gray-300 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700"
      }`}
      onClick={async () => {
        const confirmed = window.confirm(
          `Vous avez sélectionné ${selectedGraphs.length} graphique(s).\nLe téléchargement va commencer.`
        );
        if (!confirmed) return;
        await generateWordFromGraphs(selectedGraphs, graphList, {}, startDate, endDate);
      }}
    >
      Télécharger le CR WORD
    </button>
  </>
)}

{format === "pptx" && (
  <div className="pt-2">
    <button
      className="w-full py-2 text-white rounded-lg bg-blue-600 hover:bg-blue-700"
      onClick={async () => {
        const confirmed = window.confirm("Télécharger le COMOP FTTH (Format PPTX) ?");
        if (!confirmed) return;
        await generatePPTFromGraphs({
          selectedGraphIds: [],
          graphList,
          commentMap: {},
          globalStartDate: startDate,
          globalEndDate: endDate,
        });
      }}
    >
      Télécharger le COMOP FTTH PPTX
    </button>
  </div>
)}

  </div>
</Modal>

    </header>
  );
}
