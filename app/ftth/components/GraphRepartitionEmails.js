"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts";
import { FaExpand, FaPencilAlt, FaSyncAlt } from "react-icons/fa";
import Modal from "react-modal";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

const rawData = [
{ type: "Renonciation" },
{ type: "REF PMT" },
{ type: "Renonciation" },
{ type: "REF PMT" },
{ type: "Renonciation" },
{ type: "REF PMT" },
{ type: "Renonciation" },
{ type: "REF PMT" },
{ type: "Renonciation" },
{ type: "REF PMT" },
{ type: "Renonciation" },
{ type: "REF PMT" },
{ type: "Renonciation" },
{ type: "REF PMT" },
{ type: "d'abandon de commande" },
{ type: "Intervention" },
{ type: "Renonciation" },
{ type: "MAJ CR STOC" },
{ type: "MAJ CR STOC" },


]
;

const COLORS = ["#3b82f6", "#f59e0b", "#111827", "#4b5563", "#68bddd", "#6366f1"];
const iconBtnClass = "w-11 h-11 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition";

const CustomLabelOutside = ({ name, value, cx, cy, midAngle, outerRadius, fill }) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill={fill}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={15}
    >
      <tspan x={x} dy="-0.5em">{name}</tspan>
      <tspan x={x} dy="1.2em">({value.toFixed(1)}%)</tspan>
    </text>
  );
};

export default function GraphRepartitionParType() {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [data, setData] = useState([]);
  const chartRef = useRef(null);

  const processData = () => {
    const count = {};
    rawData.forEach((item) => {
      const type = item.type;
      count[type] = (count[type] || 0) + 1;
    });

    const total = Object.values(count).reduce((a, b) => a + b, 0);
    const formatted = Object.entries(count).map(([name, val], i) => ({
      name,
      value: parseFloat(((val / total) * 100).toFixed(2)),
      color: COLORS[i % COLORS.length],
    }));

    setData(formatted);
  };

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      processData();
      setLoading(false);
    }, 500);
  }, [selectedPeriod]);

  return (
    <div
      data-graph-id="graph-repartition-emails"
      data-graph-label="Répartition des e-mails par type"
      className="bg-white shadow-xl rounded-2xl p-6 relative"
    >
      {/* Spinner stylisé MyIT */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl">
          <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-blue-800 font-semibold text-sm">
            Chargement <span className="text-blue-500">MyIT</span>…
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-semibold text-gray-800">Répartition des e-mails par type</h3>
        <div className="flex gap-2">
          <button className={iconBtnClass}><FaPencilAlt className="text-gray-700" /></button>
          <button onClick={() => processData()} className={iconBtnClass}><FaSyncAlt className="text-gray-700" /></button>
          <button onClick={() => setModalIsOpen(true)} className={iconBtnClass}><FaExpand className="text-gray-700" /></button>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-4">
        <select
          className="p-2 rounded-xl border border-gray-300 bg-white shadow text-sm"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          <option value="day">Aujourd’hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="quarter">Trimestre</option>
          <option value="year">Cette année</option>
        </select>
      </div>

      {/* Graphique */}
      <div
        id="canvas-graph-repartition-emails"
        ref={chartRef}
        className="relative flex items-center justify-center bg-white shadow-inner p-4 rounded-xl"
        style={{ height: 440 }}
      >
        {!loading && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={120}
                outerRadius={170}
                dataKey="value"
                labelLine
                label={CustomLabelOutside}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Modal agrandi */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-semibold text-gray-800">Répartition des e-mails par type</h3>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500 text-2xl">❌</button>
          </div>
          <div className="flex justify-center items-center" style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={160}
                  dataKey="value"
                  labelLine
                  label={CustomLabelOutside}
                >
                  {data.map((entry, index) => (
                    <Cell key={`modal-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Modal>
    </div>
  );
}
