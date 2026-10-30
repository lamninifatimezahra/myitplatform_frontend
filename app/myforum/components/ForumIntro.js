'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function ForumIntro() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-r from-[#68bddd] to-[#6f80ac] rounded-xl p-6 sm:p-10 text-white flex flex-col md:flex-row justify-between items-center gap-10 shadow-lg"
    >
      {/* Texte à gauche */}
      <div className="flex-1">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">MY FORUM</h1>
        <p className="mt-3 text-sm sm:text-lg text-white/90">
          Échangez, posez vos questions, et avancez ensemble sur MyForum !
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mt-6 bg-white text-[#31327e] px-6 py-2 rounded-full font-semibold shadow-md hover:shadow-xl transition-all duration-300"
        >
          Join Now →
        </motion.button>
      </div>

      {/* Image sans conteneur supplémentaire ni fond */}
      <Image
        src="/myformum.png"
        alt="Forum illustration"
        width={300}
        height={300}
        className="rounded-lg object-contain w-auto h-auto"
      />
    </motion.section>
  );
}
