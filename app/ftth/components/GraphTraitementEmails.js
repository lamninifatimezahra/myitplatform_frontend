"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Legend
} from "recharts";
import { FaExpand, FaPencilAlt, FaSyncAlt } from "react-icons/fa";
import Modal from "react-modal";

if (typeof window !== "undefined") Modal.setAppElement(document.body);

const COLORS = {
  "Finalisation commande": "#6366f1",
  "Intervention": "#111827",
  "MAJ CR STOC": "#4b5563",
  "Rattrapage B57": "#68bddd",
  "REF PMT": "#f59e0b",
  "Renonciation": "#3b82f6",
};

const rawData = [
  { type: "Renonciation", date: "18/06/2025" },
  { type: "REF PMT", date: "18/06/2025" },
  { type: "MAJ CR STOC", date: "18/06/2025" },
  { type: "MAJ CR STOC", date: "18/06/2025" },
  { type: "Intervention", date: "18/06/2025" },
  { type: "Intervention", date: "18/06/2025" },
  { type: "Intervention", date: "18/06/2025" },
  { type: "Intervention", date: "18/06/2025" },
  { type: "Arthius", date: "18/06/2025" },
  { type: "Renonciation", date: "19/06/2025" },
  { type: "REF PMT", date: "19/06/2025" },
  { type: "Intervention", date: "19/06/2025" },
  { type: "Intervention", date: "19/06/2025" },
  { type: "Renonciation", date: "20/06/2025" },
  { type: "REF PMT", date: "20/06/2025" },
  { type: "Intervention", date: "20/06/2025" },
  { type: "Intervention", date: "20/06/2025" },
  { type: "Rattrapage B57", date: "20/06/2025" },
  { type: "Renonciation", date: "23/06/2025" },
  { type: "REF PMT", date: "23/06/2025" },
  { type: "Intervention", date: "23/06/2025" },
  { type: "Intervention", date: "23/06/2025" },
  { type: "Intervention", date: "23/06/2025" },
  { type: "Intervention", date: "23/06/2025" },
  { type: "Renonciation", date: "24/06/2025" },
  { type: "REF PMT", date: "24/06/2025" },
  { type: "Renonciation", date: "25/06/2025" },
  { type: "REF PMT", date: "25/06/2025" },
  { type: "Rattrapage B57", date: "25/06/2025" },
  { type: "Incohérence statuts", date: "25/06/2025" },
  { type: "MAJ CR STOC", date: "25/06/2025" },
  { type: "MAJ CR STOC", date: "25/06/2025" },
  { type: "Renonciation", date: "26/06/2025" },
  { type: "REF PMT", date: "26/06/2025" }
]
;

const aggregateByDateAndType = (data) => {
  const grouped = {};
  data.forEach(({ type, date }) => {
    if (!grouped[date]) grouped[date] = {};
    grouped[date][type] = (grouped[date][type] || 0) + 1;
  });
  return Object.entries(grouped).map(([date, types]) => ({ date, ...types }));
};

export default function GraphTraitementEmails() {
  const [data, setData] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [loading, setLoading] = useState(true);

  const chartRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData(aggregateByDateAndType(rawData));
      setLoading(false);
    }, 2000); // ⏳ Durée du spinner augmentée à 2s
  }, []);

  const getYAxisMax = () => {
    const max = Math.max(...data.flatMap(item => Object.values(item).filter(v => typeof v === "number")));
    return max < 10 ? 12 : Math.ceil((max + 5) / 10) * 10;
  };

  const getLabelStyle = (color) => ({
    fill: color === "#68bddd" ? "#111827" : "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  });

  const renderBars = () => {
    const keys = Object.keys(COLORS);
    return keys.map((type, i) => (
      <Bar
        key={type}
        dataKey={type}
        stackId="a"
        fill={COLORS[type]}
        radius={i === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
      >
        <LabelList dataKey={type} position="center" style={getLabelStyle(COLORS[type])} />
      </Bar>
    ));
  };

  const iconBtnClass = "w-11 h-11 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition";

  return (
    <div
      data-graph-id="graph-traitement-emails"
      data-graph-label="Traitement des e-mails"
      className="bg-white shadow-xl rounded-2xl p-6 relative"
    >
      {/* Spinner stylisé MyIT */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-blue-800 font-semibold text-sm">
              Chargement <span className="text-blue-500">MyIT</span>…
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-semibold text-slate-800">Traitement des e-mails</h3>
        <div className="flex gap-2">
          <button className={iconBtnClass}><FaPencilAlt className="text-gray-700" /></button>
          <button onClick={() => setData(aggregateByDateAndType(rawData))} className={iconBtnClass}><FaSyncAlt className="text-gray-700" /></button>
          <button onClick={() => setModalIsOpen(true)} className={iconBtnClass}><FaExpand className="text-gray-700" /></button>
        </div>
      </div>

      {/* Période */}
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
        id="canvas-graph-traitement-emails"
        ref={chartRef}
        className="relative rounded-xl bg-white shadow-inner p-4"
        style={{ height: 480 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={72}>
            <XAxis
              dataKey="date"
              angle={-35}
              textAnchor="end"
              height={110}
              tick={{ fontSize: 14, fill: "#1f2937", fontWeight: 600 }}
            />
            <YAxis domain={[0, getYAxisMax()]} />
            <Tooltip />
            <Legend wrapperStyle={{ paddingTop: 20 }} />
            {renderBars()}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="flex items-center justify-center fixed inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <div className="bg-white rounded-2xl p-6 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-gray-800">Traitement des e-mails</h3>
            <button onClick={() => setModalIsOpen(false)} className="text-gray-500 hover:text-red-500">❌</button>
          </div>
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barSize={28}>
                <XAxis
                  dataKey="date"
                  angle={-35}
                  textAnchor="end"
                  height={110}
                  tick={{ fontSize: 14, fill: "#1f2937", fontWeight: 600 }}
                />
                <YAxis domain={[0, getYAxisMax()]} />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: 20 }} />
                {renderBars()}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Modal>
    </div>
  );
}
