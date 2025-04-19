"use client";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative pt-[110px] pb-32 px-6 text-center bg-gradient-to-r from-[#5de0e6] to-[#004aad] text-white overflow-hidden"
    >
      {/* Décoration lumière flottante */}
      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl opacity-30 animate-pulse"></div>

      {/* Wave SVG */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none rotate-180 opacity-10 pointer-events-none">
        <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-24">
          <path
            d="M0.00,49.98 C150.00,150.00 349.67,-49.98 500.00,49.98 L500.00,150.00 L0.00,150.00 Z"
            style={{ stroke: "none", fill: "#ffffff" }}
          ></path>
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 max-w-3xl mx-auto"
      >
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 drop-shadow-md">
          Bienvenue sur <span className="text-white">MyIT</span>
        </h1>
        <p className="text-lg md:text-xl mb-10 text-white/90">
          Le Portail Intranet Collaboratif et Opérationnel de Nouvelle Génération
        </p>
        <a
          href="/login"
          className="inline-block bg-white text-[#004aad] px-8 py-4 rounded-full font-semibold hover:bg-[#5de0e6] hover:text-white transition-all duration-300 shadow-xl hover:shadow-2xl"
        >
          🚀 Accéder à la plateforme
        </a>
      </motion.div>
    </section>
  );
}
