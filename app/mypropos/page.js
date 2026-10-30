'use client';

import { useEffect, useState } from 'react';
import HeaderMyPropos from './components/HeaderMyPropos';
import SidebarMyPropos from './components/SidebarMyPropos';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FaLightbulb, FaRegComments, FaUserEdit, FaSearch } from 'react-icons/fa';
import Image from 'next/image';

export default function MyProposHomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white relative">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-[6px] border-t-[#31327e] border-b-[#6f80ac] border-l-transparent border-r-transparent animate-spin-custom" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Image src="/logo-myitv4.png" alt="Logo MyIT" width={48} height={48} />
          </div>
        </div>

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
      icon: <FaUserEdit size={22} />,
      title: 'Proposez vos idées',
      desc: 'Exprimez vos suggestions pour faire évoluer notre environnement.',
    },
    {
      icon: <FaRegComments size={22} />,
      title: 'Partagez et discutez',
      desc: 'Favorisez l’échange entre collègues autour des propositions.',
    },
    {
      icon: <FaSearch size={22} />,
      title: 'Suivez vos propositions',
      desc: 'Consultez vos idées soumises et leur évolution.',
    },
  ];

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-[#f0f4ff] to-white overflow-hidden">
      <SidebarMyPropos sidebarOpen={isSidebarOpen} setSidebarOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col">
        <HeaderMyPropos setSidebarOpen={setIsSidebarOpen} />

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
                Bienvenue dans <span className="text-[#68bddd]">MyPropos</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/80 mb-8">
                Donnez vie à vos idées, partagez-les et faites évoluer l’innovation avec votre équipe.
              </p>

              <div className="flex justify-center gap-4 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push('/mypropos/proposer')}
                  className="bg-white text-[#31327e] px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-gray-100 transition"
                >
                  Faire une proposition
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push('/mypropos/mespropositions')}
                  className="bg-[#68bddd] text-white px-6 py-3 rounded-full font-semibold shadow-md hover:bg-[#57a9d3] transition"
                >
                  Voir mes propositions
                </motion.button>
              </div>
            </motion.div>

            {/* Arrière-plan animé */}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
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
                    className="absolute -top-5 left-6 p-3 rounded-full text-white shadow-lg transform transition-all duration-300 group-hover:scale-110 bg-gradient-to-br from-[#31327e] to-[#68bddd]"
                  >
                    {feature.icon}
                  </div>
                  <div className="pl-20">
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">{feature.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
}
