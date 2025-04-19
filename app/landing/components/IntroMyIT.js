"use client";
import { motion } from "framer-motion";

export default function IntroMyIT() {
  return (
    <section
      id="intro"
      className="relative py-28 px-6 md:px-10 bg-gradient-to-b from-[#e0f7fa] to-[#ffffff] overflow-hidden"
    >
      {/* SVG deco */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none rotate-180 opacity-10 pointer-events-none">
        <svg
          viewBox="0 0 500 150"
          preserveAspectRatio="none"
          className="w-full h-20"
        >
          <path
            d="M0.00,49.98 C150.00,150.00 349.67,-49.98 500.00,49.98 L500.00,150.00 L0.00,150.00 Z"
            style={{ stroke: "none", fill: "#004aad" }}
          ></path>
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-5xl mx-auto bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-10 md:p-16 border border-[#d1eaff]"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-6"
        >
          <div className="text-5xl md:text-6xl animate-bounce text-[#004aad]">🔍</div>
        </motion.div>

        <motion.h2
          className="text-3xl md:text-5xl font-extrabold text-[#004aad] mb-8 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Qu’est-ce que MyIT ?
        </motion.h2>

        <motion.p
          className="text-gray-800 text-lg md:text-xl leading-relaxed text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <strong>MyIT</strong> est un portail intranet nouvelle génération, centralisant l’ensemble des outils et informations
          utiles pour les collaborateurs. Il offre une vision claire, pilotable et personnalisée des activités
          <strong> SI OSS</strong>.
        </motion.p>

        <motion.p
          className="text-gray-600 mt-6 text-base md:text-lg text-center leading-relaxed"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          Il vise à <strong>réinventer les usages internes</strong>, améliorer la gestion technologique
          et favoriser une collaboration intelligente et intuitive à travers une interface moderne,
          évolutive et connectée aux vrais besoins métier.
        </motion.p>
      </motion.div>
    </section>
  );
}
