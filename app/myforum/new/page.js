'use client';

import LayoutForum from "../components/LayoutForum";
import CreatePostForm from "../components/CreatePostForm";
import { motion } from "framer-motion";
import { FiEdit3 } from "react-icons/fi";

export default function CreatePostPage() {
  return (
    <LayoutForum>
      <section className="relative min-h-screen bg-gradient-to-br from-[#eef2f9] to-white px-4 pt-[10px] sm:px-6 md:px-10">
        {/* ✅ Halo supprimé ici */}

        {/* Titre animé avec icône pro */}
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center text-4xl font-bold text-[#31327e] mb-4 flex items-center justify-center gap-3"
        >
          <FiEdit3 className="text-[#31327e] text-4xl" />
          Créer un nouveau post
        </motion.h1>

        <p className="relative z-10 text-center text-gray-500 text-sm sm:text-base mb-10 max-w-xl mx-auto">
          Partagez votre question ou suggestion avec la communauté MyIT.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative z-10 mx-auto max-w-2xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-200"
        >
          <CreatePostForm />
        </motion.div>
      </section>
    </LayoutForum>
  );
}
