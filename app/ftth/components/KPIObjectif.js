"use client";
import React, { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { motion } from "framer-motion";
import fetchWithAuth from "@/utils/fetchWithAuth";


export default function KPIObjectif({ onComponentReady }) {
  const [value, setValue] = useState(null);
  const [status, setStatus] = useState("");
  const [color, setColor] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNonTraite = async () => {
      try {
        const res = await fetchWithAuth("https://ftth-backend-ayoub-31fb8bb58dc2.herokuapp.com/dashboard/api/stock/");
        const json = await res.json();

        const sorted = json.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latest = sorted[0];
        const nonTraite = latest?.non_traite ?? 0;

        const objectif = 100;
        const percentage = Math.min((nonTraite / objectif) * 100, 200); // max 200% visuellement
        setValue(percentage);

        if (nonTraite <= objectif) {
          setStatus("✓ Dans l’objectif");
          setColor("text-green-500");
        } else {
          setStatus("✗ Au-dessus de l’objectif");
          setColor("text-red-500");
        }

        if (!isReady && typeof onComponentReady === "function") {
          onComponentReady();
          setIsReady(true);
        }
      } catch (err) {
        console.error("Erreur KPI Objectif:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNonTraite();
  }, [isReady, onComponentReady]);

  return (
    <motion.div
      id="kpi-objectif"
      className="relative kpi-card bg-white rounded-lg shadow-md p-4 hover:shadow-xl transition-all duration-300"
      whileHover={{ scale: 1.05 }}
    >
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-70 backdrop-blur-sm rounded-lg">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-blue-700 font-semibold">
              Chargement <span className="text-blue-500">MyIT</span>...
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-gray-700 text-sm font-semibold">Objectif</h3>
        <Target className="text-blue-500 w-5 h-5" />
      </div>
      <p className="text-3xl font-bold">
        {value !== null ? `${Math.round(value)}` : "--"}
      </p>
      <p className={`text-sm font-medium ${color}`}>{status}</p>
    </motion.div>
  );
}
