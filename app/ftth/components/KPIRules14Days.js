"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function KPIRules14Days({
  onComponentReady,
  apiUrl = "https://api.606510.xyz/dashboard/api/ftth/regle/",
  days = 14,
}) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const readySentRef = useRef(false);

  // Date window (last N days)
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const toISO = (d) => d.toISOString().split("T")[0];

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await fetchWithAuth(`${apiUrl}?since=${toISO(start)}`);
        if (!res?.ok) throw new Error(`HTTP ${res?.status ?? "??"}`);
        const data = await res.json();

        // déduplication par regle::consigne (même logique que le ticker)
        const map = new Map();
        (Array.isArray(data) ? data : []).forEach((item) => {
          const key = `${item?.regle ?? ""}::${item?.consigne ?? ""}`;
          if (!map.has(key)) map.set(key, 1);
        });

        if (alive) setCount(map.size);
      } catch {
        if (alive) setError("Impossible de charger les règles (réseau/CORS/API).");
      } finally {
        if (alive) {
          setLoading(false);
          if (!readySentRef.current && typeof onComponentReady === "function") {
            readySentRef.current = true; onComponentReady();
          }
        }
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, days]);

  const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString("fr-FR") : "—");

  // Palette — toujours rouge
  const palette = {
    bg: "#dc2626",        // red-600
    fg: "#ffffff",
    fgSoft: "rgba(255,255,255,.92)",
    dot: "#7f1d1d",       // red-900 (plus sombre => visible)
  };

  return (
    <motion.div
      id="kpi-regles-14j"
      className="visualisation relative rounded-lg shadow-md p-4 hover:shadow-xl transition-all duration-300 overflow-hidden min-h-[120px]"
      data-id="kpi-regles-14j"
      data-graph-label="Règles FTTH (14j)"
      whileHover={{ scale: 1.05 }}
    >
      {/* fond plein via calque pour contourner tout bg blanc global */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-lg z-0 pointer-events-none"
        style={{ backgroundColor: palette.bg }}
      />

      {/* overlay de chargement */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-50 rounded-lg bg-black/10 backdrop-blur-[1px]">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm font-semibold text-white">
              Chargement <span className="text-white/80">MyIT</span>...
            </p>
          </div>
        </div>
      )}

      {/* contenu */}
      <div className="relative z-10 flex flex-col h-full" style={{ color: palette.fg }}>
        {/* header : titre + plage + icône à droite */}
        <div className="flex justify-between items-center h-5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold leading-none whitespace-nowrap">
              Règles FTTH (14 jours)
            </h3>
            <span className="select-none leading-none" style={{ color: palette.fgSoft }}>
              {"------"}
            </span>
            <span
              className="text-[12px] font-medium leading-none whitespace-nowrap"
              style={{ color: palette.fgSoft }}
            >
              Du {toISO(start)} au {toISO(end)}
            </span>
          </div>
          <AlertTriangle className="w-5 h-5" color={palette.fgSoft} aria-hidden="true" />
        </div>

        {/* valeur centrée + très légère descente */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center translate-y-[4px] sm:translate-y-[6px]">
            <p className="text-4xl sm:text-5xl font-bold leading-none tabular-nums tracking-tight">
              {fmt(count)}
            </p>
            <span
              className="block text-lg leading-none mt-1 select-none"
              style={{ color: palette.dot }}
              aria-hidden="true"
            >
              .
            </span>
          </div>
        </div>

        {/* message d'erreur éventuel */}
        {error ? (
          <p className="mt-1 text-sm">{error}</p>
        ) : null}
      </div>
    </motion.div>
  );
}
