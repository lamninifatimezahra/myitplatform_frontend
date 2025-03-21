import React from "react";
import { FaFilter, FaDownload } from "react-icons/fa";

const DateFilter = () => {
  return (
    <div className="flex w-full justify-between items-center bg-white px-6 py-3 shadow-lg rounded-lg">
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
      <div className="flex items-center space-x-4">
        <button className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg shadow-md hover:bg-gray-200 transition duration-200">
          <FaFilter className="text-gray-700" />
          <span className="text-gray-700 font-medium">Filtrer</span>
        </button>

        <button className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition duration-200">
          <FaDownload />
          <span>Télécharger CR</span>
        </button>
      </div>
    </div>
  );
};

export default DateFilter;
