"use client";
import { motion } from "framer-motion";
import { FaUsers } from "react-icons/fa";

export default function ForumSection() {
  return (
    <section
      id="forum"
      className="relative py-28 px-6 bg-gradient-to-b from-[#f0f4fa] to-white overflow-hidden"
    >
      {/* Vague SVG déco */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none rotate-180 opacity-10 pointer-events-none">
        <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-20">
          <path
            d="M0.00,49.98 C150.00,150.00 349.67,-49.98 500.00,49.98 L500.00,150.00 L0.00,150.00 Z"
            fill="#004aad"
          />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-3xl mx-auto bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-10 border border-[#dbeafe] text-center relative z-10"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center mb-4 text-[#004aad]"
        >
          <FaUsers size={42} className="animate-pulse" />
        </motion.div>

        <h2 className="text-4xl md:text-5xl font-extrabold text-[#004aad] mb-6">
          Forum Collaboratif
        </h2>

        <p className="text-gray-700 text-lg leading-relaxed mb-4">
          Un espace dynamique pour partager des bonnes pratiques, échanger sur des
          problématiques communes et suivre les évolutions internes.
        </p>

        <p className="text-gray-600 italic text-base">
          Conçu pour <strong>valoriser le savoir collectif</strong> et stimuler les synergies entre collaborateurs.
        </p>
      </motion.div>
    </section>
  );
}
