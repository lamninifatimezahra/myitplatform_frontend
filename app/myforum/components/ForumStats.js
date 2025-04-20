'use client';

import { motion } from 'framer-motion';
import { HiLightningBolt, HiOutlineUserGroup, HiOutlineLightBulb } from 'react-icons/hi';

const stats = [
  {
    icon: <HiOutlineUserGroup className="w-7 h-7 text-white" />,
    bg: "bg-[#68bddd]",
    title: "Collaboration inter-équipes",
    description: "Facilitez les échanges entre les départements et gagnez en efficacité.",
  },
  {
    icon: <HiOutlineLightBulb className="w-7 h-7 text-white" />,
    bg: "bg-[#6f80ac]",
    title: "Capitalisation des connaissances",
    description: "Partagez les bonnes pratiques et retrouvez facilement les réponses.",
  },
  {
    icon: <HiLightningBolt className="w-7 h-7 text-white" />,
    bg: "bg-[#31327e]",
    title: "Réactivité & résolution rapide",
    description: "Obtenez des réponses concrètes en quelques minutes.",
  },
];

export default function ForumStats() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 250 }}
          className="group bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition"
        >
          {/* Icone stylisée */}
          <div className={`w-12 h-12 flex items-center justify-center rounded-full ${stat.bg} shadow-md`}>
            {stat.icon}
          </div>

          {/* Titre */}
          <h3 className="text-lg font-semibold text-[#31327e] group-hover:underline">
            {stat.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed">{stat.description}</p>
        </motion.div>
      ))}
    </motion.section>
  );
}
