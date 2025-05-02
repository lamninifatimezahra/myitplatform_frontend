'use client';

import { useState, useEffect } from 'react';
import SidebarMyPropos from '../components/SidebarMyPropos';
import HeaderMyPropos from '../components/HeaderMyPropos';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUsers } from 'react-icons/fa';
import { Download } from 'lucide-react';
import Image from 'next/image';

export default function CollaborateursPropositionsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [propositions, setPropositions] = useState([]);

  useEffect(() => {
    const fetchPropositions = async () => {
      try {
        const res = await fetch('/api/propositions/collaborateurs'); // 🔁 endpoint à adapter
        const data = await res.json();
        setPropositions(data);
      } catch (error) {
        console.error('Erreur :', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPropositions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white relative">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-[6px] border-t-[#31327e] border-b-[#6f80ac] border-l-transparent border-r-transparent animate-spin-custom" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Image src="/logo-myit.png" alt="Logo MyIT" width={48} height={48} />
          </div>
        </div>
        <style jsx>{`
          @keyframes spin-custom {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-spin-custom {
            animation: spin-custom 1.1s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#f5f7ff] to-white">
      <SidebarMyPropos sidebarOpen={isSidebarOpen} setSidebarOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col">
        <HeaderMyPropos setSidebarOpen={setIsSidebarOpen} />

        <main className="flex-1 px-6 py-14">
          {/* Titre + icône */}
          <div className="flex justify-center items-center gap-3 mb-10">
            <FaUsers className="h-7 w-7 text-[#31327e]" />
            <h1 className="text-3xl font-bold text-[#31327e] text-center">
              Propositions des collaborateurs
            </h1>
          </div>

          {/* Contenu */}
          <AnimatePresence>
            {propositions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="text-center text-gray-500 text-lg mt-10"
              >
                Aucune proposition trouvée.
              </motion.div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.12 } },
                  hidden: {},
                }}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {propositions.map((idea) => (
                  <motion.div
                    key={idea.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    className="bg-white border border-gray-200 shadow-lg rounded-xl p-6 flex flex-col justify-between hover:shadow-xl transition"
                  >
                    <div>
                      <h2 className="text-xl font-semibold text-[#31327e] mb-2 line-clamp-2">
                        {idea.titre}
                      </h2>
                      <p className="text-sm text-gray-500 mb-2">
                        🧑 Par {idea.auteur || 'un collaborateur'}
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        📅 {new Date(idea.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-gray-700 text-sm whitespace-pre-line line-clamp-5">
                        {idea.description.replace(/<\/?[^>]+(>|$)/g, '')}
                      </p>
                    </div>

                    {idea.fichier && (
                      <a
                        href={idea.fichier}
                        download
                        className="mt-4 inline-flex items-center text-sm text-blue-600 hover:underline"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger la pièce jointe
                      </a>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
