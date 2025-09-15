"use client";

import React from "react";
import { Target } from "lucide-react";
import { motion } from "framer-motion";

export default function KPISPA({ onComponentReady }) {
  return (
    <motion.div
      id="kpi-spa"
      className="visualisation relative w-64"
      data-id="kpi-spa"
      data-graph-label="KPI SPA"
      whileHover={{ scale: 1.05 }}
    >
      <div className="relative bg-white p-6 rounded-xl shadow-md flex flex-col items-start w-full">
        <div className="flex justify-between items-start w-full mb-2">
          <h3 className="text-gray-800 text-lg font-medium">SPA</h3>
          <Target className="text-gray-800 w-5 h-5" />
        </div>
                
        <p className="text-3xl font-bold text-black">...</p>

        <p className="text-xs text-gray-500 mt-1">...% (... unités)</p>
      </div>
    </motion.div>
  );
}