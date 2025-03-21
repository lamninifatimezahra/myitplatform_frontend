"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const data = [
  { month: "Jan", backlog: 10 },
  { month: "Feb", backlog: 15 },
  { month: "Mar", backlog: 20 },
  { month: "Apr", backlog: 25 },
  { month: "May", backlog: 30 },
  { month: "Jun", backlog: 35 },
  { month: "Jul", backlog: 40 },
  { month: "Aug", backlog: 45 },
  { month: "Sep", backlog: 50 },
  { month: "Oct", backlog: 55 },
  { month: "Nov", backlog: 60 },
  { month: "Dec", backlog: 65 },
];

export default function StackedBarChart() {
  return (
    <div className="bg-gray-300 p-6 rounded-xl shadow-md">
      <h2 className="text-lg font-semibold text-gray-700">Vue d’ensemble combinée du Backlog</h2>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="backlog" stackId="a" fill="#2196F3" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
