"use client";
import { motion } from "framer-motion";
import { FaCheckCircle } from "react-icons/fa";
import { FiTrendingUp } from "react-icons/fi";

const benefits = [
  "Amélioration de l’efficacité opérationnelle",
  "Accélération de l’onboarding et du transfert de compétences",
  "Valorisation de la collaboration transversale",
  "Promotion d’une culture d’amélioration continue et d’innovation",
];

export default function Benefits() {
  return (
    <section
      id="benefits"
      className="relative py-28 px-6 bg-gradient-to-b from-[#f0f4fa] to-white overflow-hidden"
    >
      {/* SVG déco */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none rotate-180 opacity-5 pointer-events-none">
        <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-20">
          <path
            d="M0.00,49.98 C150.00,150.00 349.67,-49.98 500.00,49.98 L500.00,150.00 L0.00,150.00 Z"
            style={{ stroke: "none", fill: "#004aad" }}
          />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-4xl mx-auto text-center relative z-10"
      >
 <motion.h2
  className="text-4xl md:text-5xl font-extrabold text-[#004aad] mb-12 flex items-center justify-center gap-3"
  initial={{ scale: 0.9 }}
  whileInView={{ scale: 1 }}
  transition={{ duration: 0.4 }}
>
  <FiTrendingUp className="text-[#004aad]" size={36} />
  Les bénéfices pour l’entreprise
</motion.h2>


        <ul className="space-y-6 text-left">
          {benefits.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2, duration: 0.4 }}
              className="flex items-start gap-4 bg-white/60 backdrop-blur-sm border border-[#dbeafe] p-5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
            >
              <FaCheckCircle className="text-[#22c55e] mt-1" />
              <span className="text-gray-700 text-lg leading-relaxed">{item}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
