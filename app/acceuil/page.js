"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function AccueilPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10 sm:px-8 text-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto text-center"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/logo-myit.png" alt="MyIT Logo" width={200} height={60} />
        </div>

        {/* Titre */}
        <h1 className="text-4xl font-bold text-[#31327e] mb-4">
          Bienvenue sur la plateforme MyIT
        </h1>

        {/* Sous-titre */}
        <p className="text-lg text-gray-600 mb-8">
          Accédez facilement à vos dashboards, forums, outils et espaces d'administration selon vos droits.
        </p>

        {/* Boutons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/ftth">
            <button className="bg-[#31327e] text-white px-6 py-3 rounded-xl hover:bg-[#4547b3] transition shadow-md">
              Accéder au Dashboard FTTH
            </button>
          </Link>

          <Link href="/myforum">
            <button className="border border-[#31327e] px-6 py-3 rounded-xl text-[#31327e] hover:bg-gray-100 transition shadow-md">
              Ouvrir MyForum
            </button>
          </Link>

          <Link href="/guide">
            <button className="text-white bg-[#68bddd] px-6 py-3 rounded-xl hover:bg-[#7ecaf1] transition shadow-md">
              Voir le Guide MyIT
            </button>
          </Link>
        </div>

        {/* Pied de page simplifié */}
        <div className="mt-16 text-sm text-gray-400">
          © {new Date().getFullYear()} MyIT – Plateforme interne Intelcia IT Solutions
        </div>
      </motion.div>
    </main>
  );
}
