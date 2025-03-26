"use client";

import { useState, useRef, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import PeriodSelector from "./PeriodSelector";
import ZoomModal from "./ZoomModal";
import { Maximize2, Pencil } from "lucide-react";
import AnnotationPopup from "./AnnotationPopup";

export default function HistogramChart({ title, data, dataKey, color }) {
  const [period, setPeriod] = useState("year");
  const [isZoomed, setIsZoomed] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [annotations, setAnnotations] = useState([]);

  const containerRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const getColorClass = (color) => {
    switch (color) {
      case "green":
        return "bg-green-500";
      case "yellow":
        return "bg-yellow-400";
      case "red":
        return "bg-red-500";
      default:
        return "bg-gray-300";
    }
  };

  const handleSaveAnnotation = (annotation) => {
    const newAnnotation = {
      id: Date.now(),
      text: annotation.text,
      color: annotation.color,
      x: 100,
      y: 100,
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
  };

  const handleMouseDown = (e, id) => {
    const comment = annotations.find((c) => c.id === id);
    setDraggingId(id);
    setOffset({ x: e.clientX - comment.x, y: e.clientY - comment.y });
  };

  const handleMouseMove = (e) => {
    if (draggingId !== null) {
      const newAnnotations = annotations.map((a) =>
        a.id === draggingId
          ? {
              ...a,
              x: e.clientX - offset.x,
              y: e.clientY - offset.y,
            }
          : a
      );
      setAnnotations(newAnnotations);
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  });

  const renderAnnotations = () =>
    annotations.map((a) => (
      <div
        key={a.id}
        onMouseDown={(e) => handleMouseDown(e, a.id)}
        className={`absolute z-10 text-white text-xs rounded shadow-md ${getColorClass(
          a.color
        )}`}
        style={{
          left: `${a.x}px`,
          top: `${a.y}px`,
          whiteSpace: "nowrap",
          padding: "8px 12px",
          fontWeight: "500",
          userSelect: "none",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >
        {a.text}
      </div>
    ));

  return (
    <div
      ref={containerRef}
      className="bg-gray-200 shadow-md rounded-lg p-4 relative overflow-hidden"
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-gray-700 font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <PeriodSelector onChange={setPeriod} />
          <button
            onClick={() => setIsPopupOpen(true)}
            className="p-1 rounded hover:bg-gray-300 text-gray-600"
            title="Ajouter une annotation"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setIsZoomed(true)}
            className="p-1 rounded hover:bg-gray-300 text-gray-600"
            title="Agrandir"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* 🟢 Commentaires visibles */}
      {renderAnnotations()}

      {/* 📊 Graphique principal */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey={dataKey} fill={color} />
        </BarChart>
      </ResponsiveContainer>

      {/* ✏️ Ajout de commentaire */}
      <AnnotationPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onSave={handleSaveAnnotation}
      />

      {/* 🔍 Vue agrandie */}
      <ZoomModal
        isOpen={isZoomed}
        onClose={() => setIsZoomed(false)}
        title={title}
      >
        <div className="relative w-full h-full">
          {renderAnnotations()}
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey={dataKey} fill={color} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ZoomModal>
    </div>
  );
}
