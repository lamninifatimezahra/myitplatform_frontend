'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AiOutlineBell, AiOutlineSearch, AiOutlineMenu } from 'react-icons/ai';
import Image from 'next/image';

const user = {
  name: "Ayoub LAHDOUD",
  avatar: "/avatar.png",
};

const notifications = [
  { id: 1, message: "Nouvelle réponse à votre post.", time: "Il y a 2 min" },
  { id: 2, message: "Votre post a été marqué comme résolu.", time: "Il y a 12 min" },
  { id: 3, message: "Vous avez été mentionné dans un commentaire.", time: "Il y a 1h" },
];

export default function HeaderForum({ setSidebarOpen }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 bg-white shadow-md px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-4"
    >
      {/* Menu burger visible sur mobile */}
      <div className="flex items-center gap-3">
        <button className="md:hidden text-[#31327e]" onClick={() => setSidebarOpen(true)}>
          <AiOutlineMenu size={24} />
        </button>

        {/* Navigation desktop */}
        <div className="hidden md:flex items-center gap-6">
          <a className="font-semibold text-[#31327e] border-b-2 border-[#31327e] pb-1" href="#">
            Accueil
          </a>
          <a className="text-gray-500 hover:text-[#31327e] hover:underline" href="#">
            Top posts
          </a>
        </div>
      </div>

      {/* Barre de recherche centrée */}
      <div className="flex-1 min-w-[200px] max-w-md mx-auto">
        <div className="relative">
          <AiOutlineSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#68bddd]"
          />
        </div>
      </div>

      {/* Notifications + profil */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition relative"
          >
            <AiOutlineBell size={20} className="text-[#31327e]" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
            )}
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
              >
                <div className="p-4 border-b font-semibold text-sm text-[#31327e]">
                  Notifications
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="p-3 border-b hover:bg-gray-50 transition">
                      <p className="text-sm">{notif.message}</p>
                      <span className="text-xs text-gray-500">{notif.time}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Utilisateur */}
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition whitespace-nowrap">
          <Image
            src={user.avatar}
            alt={user.name}
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
          <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user.name}</span>
        </div>
      </div>
    </motion.header>
  );
}
