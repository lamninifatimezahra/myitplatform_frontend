'use client';

import { useEffect, useState } from 'react';
import HeaderMyAI from './components/HeaderMyAI';
import SidebarMyAI from './components/SidebarMyAI';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { FaCogs, FaComments, FaLightbulb, FaQuestionCircle } from 'react-icons/fa';
import { Wrench } from 'lucide-react';

export default function MyAIPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Simulation d'un petit chargement initial (1.5s)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white relative">
        <div className="relative w-24 h-24">
          {/* Cercle animé */}
          <div className="absolute inset-0 rounded-full border-[6px] border-t-[#31327e] border-b-[#6f80ac] border-l-transparent border-r-transparent animate-spin-custom" />
          {/* Logo centré */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/logo-myit.png"
              alt="Logo MyIT"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
        </div>

        {/* Animation personnalisée */}
        <style jsx>{`
          @keyframes spin-custom {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
          .animate-spin-custom {
            animation: spin-custom 1.1s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  const features = [
    {
      title: 'Assistant contextuel',
      icon: <FaComments size={22} />,
      desc: 'Un chatbot intelligent qui comprend votre contexte métier.',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Workflows automatisés',
      icon: <FaQuestionCircle size={22} />,
      desc: 'Déclaration d’incidents, procédures... tout devient plus fluide.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Suggestions IA',
      icon: <FaLightbulb size={22} />,
      desc: 'Recommandations dynamiques selon les habitudes des utilisateurs.',
      color: 'from-yellow-400 to-orange-500',
    },
    {
      title: 'Interface personnalisée',
      icon: <FaCogs size={22} />,
      desc: 'Adaptée à votre charte graphique, responsive, et élégante.',
      color: 'from-gray-600 to-gray-800',
    },
  ];

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-[#f0f4ff] to-white overflow-hidden">
      <SidebarMyAI sidebarOpen={isSidebarOpen} setSidebarOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col">
        <HeaderMyAI setSidebarOpen={setIsSidebarOpen} />

        <main className="flex-1 overflow-auto">
          {/* HERO Section */}
          <div className="relative w-full py-20 bg-gradient-to-r from-[#31327e] via-[#4a4ca4] to-[#7f81ff] text-white text-center shadow-xl overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto px-6 relative z-10"
            >
              <h1 className="text-5xl font-extrabold leading-tight mb-4 drop-shadow-lg tracking-tight">
                MyAI : l’assistant intelligent
              </h1>
              <p className="text-lg sm:text-xl text-white/80 mb-8">
                Une IA contextuelle, connectée à votre documentation métier.
              </p>

              {/* Bandeau rouge dynamique */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                className="relative inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 via-red-400 to-red-300 text-white font-semibold text-sm shadow-lg animate-flow hover:scale-105 transition-all"
              >
                <Wrench className="w-5 h-5 text-white" />
                <span>Le module MyAI est en construction – Disponible bientôt</span>

                {/* Halo rouge doux */}
                <div className="absolute -inset-1 rounded-xl bg-red-400 opacity-20 blur-md animate-pulse-smooth" />
              </motion.div>
            </motion.div>

            {/* Arrière plan animé */}
            <div className="absolute top-14 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-400 blur-3xl rounded-full opacity-20 animate-pulse z-0" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] bg-repeat opacity-10" />
          </div>

          {/* FEATURES Section */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.15 } },
              hidden: {},
            }}
            className="max-w-7xl mx-auto px-6 sm:px-10 py-16"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 40 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ scale: 1.03 }}
                  className="relative p-6 rounded-2xl bg-white border border-gray-100 shadow-md hover:shadow-2xl transition-all group"
                >
                  <div
                    className={`absolute -top-5 left-6 p-3 rounded-full text-white shadow-lg transform transition-all duration-300 group-hover:scale-110 bg-gradient-to-br ${feature.color}`}
                  >
                    {feature.icon}
                  </div>
                  <div className="pl-20">
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </main>
      </div>

      {/* ✅ Animation personnalisée */}
      <style jsx>{`
        @keyframes flow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-flow {
          background-size: 200% 200%;
          animation: flow 4s ease infinite;
        }

        @keyframes pulse-smooth {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.05);
          }
        }
        .animate-pulse-smooth {
          animation: pulse-smooth 3s ease-in-out infinite;
        }

        @keyframes spin-custom {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .animate-spin-custom {
          animation: spin-custom 1.1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
