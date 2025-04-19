"use client";
import { motion } from "framer-motion";
import { FaRocket } from "react-icons/fa";

export default function GetStartedSection() {
  return (
    <section className="relative bg-gradient-to-r from-[#5de0e6] to-[#004aad] py-24 text-center text-white overflow-hidden">
      {/* Effet lumineux flottant */}
      <div className="absolute top-[-100px] left-1/2 transform -translate-x-1/2 w-[600px] h-[600px] bg-white/10 blur-3xl rounded-full opacity-30 animate-pulse"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-3xl mx-auto"
      >
        <div className="flex justify-center mb-4 text-4xl animate-bounce">
          <FaRocket />
        </div>

        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
          Vous souhaitez collaborer ?
        </h2>

        <p className="text-white/90 text-lg mb-10">
          Rejoignez-nous et optimisez vos suivis avec la plateforme <strong>MyIT</strong>.
        </p>

        <a
          href="/login"
          className="inline-block bg-white text-[#004aad] px-8 py-4 rounded-full font-semibold hover:bg-[#5de0e6] hover:text-white hover:scale-105 transition-all duration-300 shadow-2xl"
        >
          🚀 Commencer maintenant
        </a>
      </motion.div>
    </section>
  );
}
