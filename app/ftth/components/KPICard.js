"use client";
import { useState } from "react";
import PeriodSelector from "./PeriodSelector";

export default function KPICard({ title, value, percentage, description }) {
  const [period, setPeriod] = useState("year");

  return (
    <div className="bg-white shadow-md rounded-lg p-4 relative">
      <div className="absolute top-2 right-2">
        <PeriodSelector onChange={setPeriod} />
      </div>
      <h3 className="text-gray-600 text-sm font-semibold">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
      <p className={`text-sm ${percentage.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
        {percentage}
      </p>
      {description && <p className="text-gray-500 text-xs">{description}</p>}
    </div>
  );
}
