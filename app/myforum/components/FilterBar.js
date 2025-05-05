'use client';

import { useState } from 'react';

export default function FilterBar({ onFilterChange }) {
  const filters = ["Tous", "FTTH", "SI3C", "DOOR", "B2B", "Support"];
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onFilterChange({ category: selectedCategory, search: value });
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    onFilterChange({ category, search: searchTerm });
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Rechercher par titre..."
        value={searchTerm}
        onChange={handleSearchChange}
        className="w-full p-3 rounded-xl bg-blue-50 text-sm"
      />
      <div className="flex gap-2 mt-4 flex-wrap">
        {filters.map((category, i) => (
          <button
            key={i}
            onClick={() => handleCategoryClick(category)}
            className={`px-4 py-1 rounded-full text-sm font-medium transition ${
              selectedCategory === category
                ? "bg-blue-600 text-white"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}
