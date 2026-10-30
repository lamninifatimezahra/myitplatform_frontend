"use client";
import { useState } from "react";
import fetchWithAuth from "@/utils/fetchWithAuth";


export default function PeriodSelector({ onChange }) {
  const [selected, setSelected] = useState("year");

  const handleChange = (e) => {
    const value = e.target.value;
    setSelected(value);
    onChange(value);
  };

  return (
    <select
      value={selected}
      onChange={handleChange}
      className="text-xs bg-white border border-gray-300 rounded px-2 py-1 ml-auto text-gray-600 hover:shadow-sm"
    >
      <option value="day">Aujourd'hui</option>
      <option value="week">Cette semaine</option>
      <option value="month">Ce mois</option>
      <option value="quarter">Ce trimestre</option>
      <option value="year">Cette année</option>
    </select>
  );
}
