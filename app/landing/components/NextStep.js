"use client";
import { motion } from "framer-motion";
import { FaCalendarAlt } from "react-icons/fa";

export default function NextStep() {
  return (
    <section className="py-24 px-6 bg-gradient-to-r from-[#f0f4fa] to-white text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-4xl text-[#004aad] mb-3 flex justify-center"
        >
          <FaCalendarAlt />
        </motion.div>

        <h2 className="text-4xl font-extrabold text-[#004aad] mb-6">
          Prochaine étape
        </h2>

        <p className="text-gray-700 text-lg leading-relaxed">
          Le lancement progressif du portail <span className="font-medium text-[#004aad]">MyIT</span> sera accompagné de sessions de découverte,
          d’ateliers participatifs et de supports de prise en main.
        </p>

        <p className="text-[#004aad] mt-6 italic text-md font-medium">
          🛠 MyIT, bien plus qu’un portail : un levier de transformation digitale et humaine.
        </p>
      </motion.div>
    </section>
  );
}
