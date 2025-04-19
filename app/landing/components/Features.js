"use client";
import { motion } from "framer-motion";
import { FiBarChart2, FiUsers, FiMessageCircle, FiTarget } from "react-icons/fi";

const features = [
  {
    title: "Tableaux de bord SI OSS",
    desc: "Suivez la santé des systèmes, la performance applicative et les KPIs d’exploitation en temps réel via des dashboards dynamiques.",
    icon: <FiBarChart2 size={32} />,
    emoji: "📊",
    color: "from-blue-100 to-blue-50",
  },
  {
    title: "Onboarding & Compétences",
    desc: "Parcours guidés, évolutifs et contextualisés pour accueillir les nouveaux et faire progresser les équipes à chaque étape.",
    icon: <FiUsers size={32} />,
    emoji: "🚀",
    color: "from-green-100 to-green-50",
  },
  {
    title: "Forum Collaboratif",
    desc: "Un espace d’échange vivant et modéré pour partager des bonnes pratiques, poser des questions et valoriser le savoir collectif.",
    icon: <FiMessageCircle size={32} />,
    emoji: "💬",
    color: "from-yellow-100 to-yellow-50",
  },
  {
    title: "MYPROPO : Innovation",
    desc: "Un espace d’idéation pour soumettre vos idées, participer à des challenges internes et suivre les tendances technologiques.",
    icon: <FiTarget size={32} />,
    emoji: "🎯",
    color: "from-purple-100 to-purple-50",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="relative z-10 bg-gradient-to-b from-[#f7fbff] to-[#ffffff] py-28 px-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-5xl mx-auto text-center mb-20"
      >
        <h2 className="text-4xl md:text-5xl font-extrabold text-[#004aad] mb-4">
          ✨ Fonctionnalités Clés
        </h2>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          MyIT vous propose un écosystème complet pour booster votre efficacité, renforcer la collaboration
          et encourager l’innovation au cœur des métiers.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-10 max-w-6xl mx-auto">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2, duration: 0.5 }}
            className={`bg-gradient-to-br ${feature.color} rounded-3xl p-8 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 backdrop-blur-md`}
          >
            <div className="flex items-center mb-4 gap-4">
              <div className="text-4xl animate-pulse">{feature.emoji}</div>
              <div className="text-[#004aad]">{feature.icon}</div>
            </div>
            <h3 className="text-2xl font-bold text-[#004aad] mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-700 text-[15px] leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
