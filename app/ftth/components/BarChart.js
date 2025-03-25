"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "R105", value: 65 },
  { name: "R1730", value: 35 },
  { name: "R1676", value: 25 },
  { name: "R1556", value: 15 },
  { name: "R1517", value: 10 },
];

export default function CustomBarChart() {
  return (
    <div className="bg-gray-300 p-6 rounded-xl shadow-md">
      <h2 className="text-lg font-semibold text-gray-700">Top 5 RÈGLES (Semaine en cours)</h2>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#4A56E2" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
