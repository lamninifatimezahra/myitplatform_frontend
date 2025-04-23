"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaDownload, FaFilter } from "react-icons/fa";
import { AiOutlineClockCircle } from "react-icons/ai";
import ProfileMenu from "./ProfileMenu";
import NotificationMenu from "./NotificationMenu";
import { generateWordFromGraphs } from "../utils/exportWord";
import { generatePPTFromGraphs } from "../utils/exportPPTX";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toPng } from "html-to-image";
import fetchWithAuth from "@/utils/fetchWithAuth";

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

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

export default function Header({ onGlobalFilter }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [format, setFormat] = useState(null);
  const [graphList, setGraphList] = useState([]);
  const [selectedGraphs, setSelectedGraphs] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [periodText, setPeriodText] = useState("");

  const [lastUploadDate, setLastUploadDate] = useState(null);
  const [isLoadingUploadDate, setIsLoadingUploadDate] = useState(true);

  const dropdownRef = useRef();
  const endDateRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        const res = await fetchWithAuth(
          "https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/ftth/files/"
        );
        const data = await res.json();
        const sorted = data.sort((a, b) => parseCustomDate(b.uploaded_at) - parseCustomDate(a.uploaded_at));
        const latestDate = parseCustomDate(sorted[0]?.uploaded_at);
        if (latestDate) {
          const formatted =
            latestDate.toLocaleDateString("fr-FR") +
            " à " +
            latestDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
          setLastUploadDate(formatted);
        }
      } catch (err) {
        console.error("Erreur récupération upload date :", err);
        setLastUploadDate(null);
      } finally {
        setIsLoadingUploadDate(false);
      }
    };

    fetchLastUploadDate();
    const interval = setInterval(fetchLastUploadDate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleGraph = (id) => {
    setSelectedGraphs((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleAll = (checkAll) => {
    setSelectedGraphs(checkAll ? graphList.map((g) => g.id) : []);
  };

  const handleGlobalFilter = () => {
    if (!startDate || !endDate) {
      alert("Veuillez sélectionner une période valide.");
      return;
    }

    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const startWeek = getWeekNumber(startDate);
    const endWeek = getWeekNumber(endDate);

    const text = `📅 Du ${startDate.toLocaleDateString()} au ${endDate.toLocaleDateString()} 
      (S${startWeek}-${endWeek}) – ${diffDays} jour(s)`;
    const confirmed = window.confirm(`Confirmez-vous la période sélectionnée ?\n\n${text}`);

    if (!confirmed) return;

    setPeriodText(text);
    onGlobalFilter(startDate, endDate);
  };
  return (
    <header className="bg-white shadow-md px-4 sm:px-6 py-4 flex flex-col gap-y-4 sticky top-0 z-50">
      <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
            <span className="text-blue-600">Dashboard FTTH</span>
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Bienvenue</span>
            {lastUploadDate && (
              <span className="flex items-center gap-1 text-blue-700 ml-3">
                <AiOutlineClockCircle /> Dernière mise à jour :{" "}
                <span className="font-medium">{lastUploadDate}</span>
              </span>
            )}
            {isLoadingUploadDate && (
              <span className="ml-3 text-gray-400 animate-pulse">Chargement…</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-end flex-1">
          <div className="relative w-full sm:w-60">
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

      {/* 🔁 Garde exactement ce que tu avais pour les filtres + export dropdown */}
      {/* ✅ Ton ancien bloc de filtres + export continue ici… */}
      <div className="bg-gray-50 border border-gray-200 shadow-sm rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                  📊 CR (Format PPTX)
                </div>
              </div>

              {(format === "word" || format === "pptx") && (
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
                        `Vous avez sélectionné ${selectedGraphs.length} graphique(s).\nLe téléchargement du document ${format.toUpperCase()} va commencer.`
                      );
                      if (!confirmed) return;

                      const graphs = await Promise.all(
                        selectedGraphs.map(async (id) => {
                          const el = document.querySelector(`#canvas-${id}`);
                          if (!el) return null;
                          const dataUrl = await toPng(el);
                          return {
                            title: graphList.find((g) => g.id === id)?.label,
                            imagePath: dataUrl,
                            comment: "[Aucun commentaire fourni]",
                          };
                        })
                      );

                      if (format === "word") {
                        await generateWordFromGraphs(
                          selectedGraphs,
                          graphList,
                          {},
                          startDate,
                          endDate
                        );
                      } else if (format === "pptx") {
                        await generatePPTFromGraphs({
                          selectedGraphIds: selectedGraphs,
                          graphList,
                          commentMap: {},
                          globalStartDate: startDate,
                          globalEndDate: endDate,
                        });
                      }
                    }}
                  >
                    Télécharger le CR {format === "pptx" ? "PPTX" : "WORD"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}