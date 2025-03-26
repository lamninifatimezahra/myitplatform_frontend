"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import PeriodSelector from "./PeriodSelector";
import ZoomModal from "./ZoomModal";
import { Maximize2, Pencil } from "lucide-react";

export default function StackedHistogram({ title, data }) {
  const [period, setPeriod] = useState("year");
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="bg-gray-200 shadow-md rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-gray-700 font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <PeriodSelector onChange={setPeriod} />

          {/* ✏️ Crayon */}
          <button
            onClick={() => console.log("Ajouter annotation")}
            className="p-1 rounded hover:bg-gray-300 text-gray-600"
            title="Ajouter une annotation"
          >
            <Pencil size={16} />
          </button>

          {/* ⤢ Agrandir */}
          <button
            onClick={() => setIsZoomed(true)}
            className="p-1 rounded hover:bg-gray-300 text-gray-600"
            title="Agrandir"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="entrants" stackId="a" fill="#4A90E2" />
          <Bar dataKey="sortants" stackId="a" fill="#FF6B6B" />
        </BarChart>
      </ResponsiveContainer>

      <ZoomModal isOpen={isZoomed} onClose={() => setIsZoomed(false)} title={title}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="entrants" stackId="a" fill="#4A90E2" />
            <Bar dataKey="sortants" stackId="a" fill="#FF6B6B" />
          </BarChart>
        </ResponsiveContainer>
      </ZoomModal>
    </div>
  );
}
