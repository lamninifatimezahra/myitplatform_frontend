"use client";
import { motion } from "framer-motion";

export default function ContactSection() {
  return (
    <section id="contact" className="bg-white py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2 className="text-4xl font-extrabold text-[#004aad] mb-4">📬 Contactez-nous</h2>
        <p className="text-gray-600 mb-12 max-w-xl mx-auto">
          Une question, un besoin ou une collaboration ? Envoyez-nous un message, notre équipe vous répondra rapidement.
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto bg-[#eef4fa]/60 backdrop-blur-md border border-gray-200 p-8 rounded-2xl shadow-lg grid gap-6 transition-all"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Nom complet"
            className="rounded-full px-5 py-3 border border-gray-300 focus:ring-2 focus:ring-[#5de0e6] outline-none transition"
          />
          <input
            type="email"
            placeholder="Adresse email"
            className="rounded-full px-5 py-3 border border-gray-300 focus:ring-2 focus:ring-[#5de0e6] outline-none transition"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="tel"
            placeholder="Téléphone"
            className="rounded-full px-5 py-3 border border-gray-300 focus:ring-2 focus:ring-[#5de0e6] outline-none transition"
          />
          <input
            type="text"
            placeholder="Objet"
            className="rounded-full px-5 py-3 border border-gray-300 focus:ring-2 focus:ring-[#5de0e6] outline-none transition"
          />
        </div>
        <textarea
          rows="5"
          placeholder="Votre message..."
          className="rounded-2xl px-5 py-3 border border-gray-300 focus:ring-2 focus:ring-[#5de0e6] outline-none transition resize-none"
        ></textarea>
        <button
          type="submit"
          className="bg-gradient-to-r from-[#5de0e6] to-[#004aad] text-white font-semibold py-3 px-8 rounded-full hover:scale-105 hover:opacity-90 transition mx-auto"
        >
          Envoyer le message
        </button>
      </motion.form>
    </section>
  );
}
