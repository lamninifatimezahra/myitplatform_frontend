'use client';

import { useState, useEffect } from 'react';
import SidebarMyPropos from '../components/SidebarMyPropos';
import HeaderMyPropos from '../components/HeaderMyPropos';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download } from 'lucide-react';
import Image from 'next/image';

export default function MesPropositionsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [propositions, setPropositions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPropositions = async () => {
      try {
        const response = await fetch('/api/propositions'); // ← ton API réelle
        const data = await response.json();
        setPropositions(data);
      } catch (error) {
        console.error('Erreur lors du chargement :', error);
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
            <Image src="/logo-myit.png" alt="Logo" width={48} height={48} />
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

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#f0f4ff] to-white">
      <SidebarMyPropos sidebarOpen={isSidebarOpen} setSidebarOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col">
        <HeaderMyPropos setSidebarOpen={setIsSidebarOpen} />

        <main className="flex-1 px-6 py-14">
          <div className="flex justify-center items-center gap-3 mb-10">
            <FileText className="h-8 w-8 text-[#31327e]" />
            <h1 className="text-3xl font-bold text-[#31327e] text-center">Mes propositions</h1>
          </div>

          <AnimatePresence>
            {propositions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="text-center text-gray-500 text-lg mt-16"
              >
                Aucune proposition trouvée.
              </motion.div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.15 } },
                  hidden: {},
                }}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {propositions.map((p) => (
                  <motion.div
                    key={p.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    className="bg-white border border-gray-200 shadow-md rounded-xl p-6 hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      <h2 className="text-xl font-semibold text-[#31327e] mb-2 line-clamp-2">
                        {p.titre}
                      </h2>
                      <p className="text-sm text-gray-500 mb-3">
                        🗓️ {new Date(p.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-5">
                        {p.description.replace(/<\/?[^>]+(>|$)/g, '')}
                      </p>
                    </div>

                    {p.fichier && (
                      <a
                        href={p.fichier}
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
