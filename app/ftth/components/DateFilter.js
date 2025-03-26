"use client";
import React, { useState, useRef, useEffect } from "react";
import { FaFilter, FaDownload } from "react-icons/fa";

const DateFilter = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  // Fermeture du dropdown si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex w-full justify-between items-center bg-white px-6 py-3 shadow-lg rounded-lg relative">
      {/* Sélection de la période */}
      <div className="flex items-center space-x-3">
        <label className="text-gray-700 font-medium">Période sélectionnée :</label>
        <input
          type="date"
          className="border border-gray-300 bg-white rounded-lg px-3 py-2 text-gray-600 focus:ring focus:ring-blue-300 shadow-sm"
        />
        <input
          type="date"
          className="border border-gray-300 bg-white rounded-lg px-3 py-2 text-gray-600 focus:ring focus:ring-blue-300 shadow-sm"
        />
      </div>

      {/* Boutons */}
      <div className="flex items-center space-x-4 relative" ref={dropdownRef}>
        {/* Bouton Filtrer */}
        <button className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg shadow-md hover:bg-gray-200 transition duration-200">
          <FaFilter className="text-gray-700" />
          <span className="text-gray-700 font-medium">Filtrer</span>
        </button>

        {/* Bouton Télécharger + Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition duration-200"
          >
            <FaDownload />
            <span>Télécharger</span>
          </button>

          {/* Dropdown animé */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg z-50 animate-fade-in">
              <ul className="text-sm text-gray-700">
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition duration-150">
                  📄 CR (Format Word)
                </li>
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition duration-150">
                  📊 CR (Format PPTX)
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DateFilter;
