"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { month: "Jan", entrants: 20000, sortants: 10000 },
  { month: "Feb", entrants: 25000, sortants: 15000 },
  { month: "Mar", entrants: 30000, sortants: 20000 },
  { month: "Apr", entrants: 35000, sortants: 25000 },
  { month: "May", entrants: 40000, sortants: 30000 },
  { month: "Jun", entrants: 45000, sortants: 35000 },
];

export default function CustomLineChart() {
  return (
    <div className="bg-gray-300 p-6 rounded-xl shadow-md">
      <h2 className="text-lg font-semibold text-gray-700">Entrants vs Sortants</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="entrants" stroke="#4A90E2" strokeWidth={3} />
          <Line type="monotone" dataKey="sortants" stroke="#FF6B6B" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
