"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaDownload, FaFilter } from "react-icons/fa";
import ProfileMenu from "./ProfileMenu";
import NotificationMenu from "./NotificationMenu";
import { generateWordFromGraphs } from "../utils/exportWord";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function Header({ onGlobalFilter }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [format, setFormat] = useState(null);
  const [graphList, setGraphList] = useState([]);
  const [selectedGraphs, setSelectedGraphs] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const dropdownRef = useRef();
  const endDateRef = useRef(null);

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
    alert(`Filtrage global du ${startDate.toLocaleDateString()} au ${endDate.toLocaleDateString()}`);
    onGlobalFilter(startDate, endDate);
  };

  return (
    <header className="bg-white shadow-md px-4 sm:px-6 py-4 flex flex-col gap-y-4 sticky top-0 z-50">
      <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
            <span className="text-blue-600">Dashboard FTTH</span>
          </h1>
          <p className="text-gray-500 text-sm">Bienvenue, Ayoub!</p>
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
                  onClick={() => alert("Format PPTX en cours de développement")}
                  className="cursor-pointer hover:bg-gray-100 px-3 py-2 rounded"
                >
                  📊 CR (Format PPTX)
                </div>
              </div>

              {format === "word" && (
                <div className="border-t pt-2 space-y-2">
                  <div className="flex justify-between text-sm px-2 text-blue-600 font-medium">
                    <button onClick={() => toggleAll(true)}>Tout cocher</button>
                    <button onClick={() => toggleAll(false)}>Tout décocher</button>
                  </div>

                  <div className="border-b border-gray-300 mt-2 mb-2"></div>

                  <div className="grid grid-cols-2 gap-2 px-2 text-sm text-gray-800 font-semibold">
                    <div># KPI Backlog J-1</div>
                    <div># KPI Backlog J</div>
                    <div># KPI Objectif</div>
                    <div># KPI Dossiers Traités</div>
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
                        `Vous avez sélectionné ${selectedGraphs.length} graphique(s).\nLe téléchargement du document Word va commencer.`
                      );
                      if (confirmed) {
                        await generateWordFromGraphs(selectedGraphs, graphList, {}, startDate, endDate);
                      }
                    }}
                  >
                    Télécharger le CR WORD
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
