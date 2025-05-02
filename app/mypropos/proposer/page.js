'use client';

import { useEffect, useState } from 'react';
import HeaderMyPropos from '../components/HeaderMyPropos';
import SidebarMyPropos from '../components/SidebarMyPropos';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import Image from 'next/image';

export default function ProposerPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.size > 100 * 1024 * 1024) {
      setFile(null);
      setFileError('❌ Fichier trop volumineux (100 Mo max)');
    } else {
      setFile(selected);
      setFileError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fileError) return;

    setLoading(true);
    try {
      await new Promise((res) => setTimeout(res, 1500));
      setTitre('');
      setContenu('');
      setFile(null);
      setMessage({ type: 'success', text: '✅ Proposition soumise avec succès.' });
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Une erreur est survenue. Veuillez réessayer.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  if (pageLoading) {
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
    <div className="flex min-h-screen bg-gradient-to-b from-[#f0f4ff] to-white">
      <SidebarMyPropos sidebarOpen={isSidebarOpen} setSidebarOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <HeaderMyPropos setSidebarOpen={setIsSidebarOpen} />

        <main className="flex-1 flex items-start justify-center py-16 px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-3xl bg-white border border-gray-100 shadow-xl rounded-3xl p-10"
          >
            <div className="flex justify-center items-center gap-3 mb-2">
              <Lightbulb className="h-8 w-8 text-yellow-500" />
              <h1 className="text-3xl font-bold text-[#31327e] text-center">
                Proposer une idée
              </h1>
            </div>

            <p className="text-gray-600 text-center mb-8">
              Vous avez une amélioration en tête ? Partagez-la ici.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre de la proposition
                </label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  required
                  placeholder="Ex : Nouvelle fonctionnalité de collaboration"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#68bddd] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={contenu}
                  onChange={(e) => setContenu(e.target.value)}
                  rows="6"
                  required
                  placeholder="Décrivez votre proposition, ses bénéfices et son impact..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#68bddd] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pièce jointe (optionnelle – max 100 Mo)
                </label>
                <input
                  key={file ? file.name : Date.now()}
                  type="file"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-[#68bddd]/10 file:text-[#31327e] hover:file:bg-[#68bddd]/20"
                />
                {file && (
                  <p className="mt-1 text-sm text-gray-600">
                    Fichier sélectionné : <strong>{file.name}</strong>
                  </p>
                )}
                {fileError && <p className="text-sm text-red-600 mt-1">{fileError}</p>}
              </div>

              <div className="text-center">
                <motion.button
                  whileHover={{ scale: !loading ? 1.03 : 1 }}
                  whileTap={{ scale: !loading ? 0.97 : 1 }}
                  disabled={loading}
                  type="submit"
                  className={`px-6 py-2 rounded-full font-semibold transition text-white ${
                    loading ? 'bg-gray-400 cursor-wait' : 'bg-[#31327e] hover:bg-[#262666]'
                  }`}
                >
                  {loading ? 'Soumission...' : 'Soumettre la proposition'}
                </motion.button>
              </div>

              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`text-center mt-4 py-3 px-4 rounded-md text-sm font-medium ${
                      message.type === 'success'
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-red-100 text-red-700 border border-red-300'
                    }`}
                  >
                    {message.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
