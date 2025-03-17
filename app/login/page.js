import { useState } from "react";
import { AiOutlineFilter } from "react-icons/ai";

export default function FilterBubble({ selectedPeriod, setSelectedPeriod, selectedValues, setSelectedValues, data }) {
  const [isOpen, setIsOpen] = useState(false);

  const periods = ["day", "week", "month"];
  const availableValues = {
    day: [...new Set(data.map(ticket => ticket.date_derniere_maj))],
    week: [...new Set(data.map(ticket => ticket.semaine))],
    month: [...new Set(data.map(ticket => new Date(ticket.date_derniere_maj).getMonth() + 1))]
  };

  return (
    <div className="relative">
      {/* Bouton Bulle */}
      <button 
        className="absolute top-2 right-2 bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <AiOutlineFilter size={20} />
      </button>

      {/* Popup Filtre */}
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-4 w-48 z-50">
          {/* Sélecteur de période */}
          <div className="flex space-x-2 mb-2">
            {periods.map(period => (
              <button 
                key={period}
                className={`px-3 py-1 rounded-md ${selectedPeriod === period ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                onClick={() => setSelectedPeriod(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          {/* Liste des valeurs */}
          <select 
            multiple
            className="border p-2 w-full rounded-md"
            value={selectedValues}
            onChange={(e) => setSelectedValues([...e.target.selectedOptions].map(o => o.value))}
          >
            {availableValues[selectedPeriod].map(value => (
              <option key={value} value={value}>
                {selectedPeriod === "month" ? `Mois ${value}` : `Semaine ${value}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
