"use client";

import React from "react";
import { Target } from "lucide-react";
import { motion } from "framer-motion";

export default function KPISPA({ onComponentReady }) {
  return (
    <motion.div
      id="kpi-spa" // Changé de kpi-objectif à kpi-spa pour plus de clarté
      className="visualisation relative kpi-card bg-white rounded-lg shadow-md p-4 hover:shadow-xl transition-all duration-300"
      data-id="kpi-spa"
      data-graph-label="KPI SPA"
      whileHover={{ scale: 1.05 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-gray-700 text-sm font-semibold">SPA</h3>
        <Target className="text-blue-500 w-5 h-5" />
      </div>

      {/* Valeur masquée */}
      <p className="text-3xl font-bold text-gray-800">...</p>

      {/* Commentaire neutre */}
      <p className="text-sm text-gray-400">...% (... unités)</p>
    </motion.div>
  );
}