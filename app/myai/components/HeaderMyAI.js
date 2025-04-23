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
  { id: 1, message: "Le chatbot pourra bientôt répondre aux questions des utilisateurs.", time: "À venir" },
  { id: 2, message: "Connexion à la documentation ITS en cours...", time: "À venir" },
];

export default function HeaderMyAI({ setSidebarOpen }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
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
      <div className="flex items-center gap-3">
        <button className="md:hidden text-[#31327e]" onClick={() => setSidebarOpen(true)}>
          <AiOutlineMenu size={24} />
        </button>
        <div className="hidden md:flex items-center gap-6">
          <span className="font-semibold text-[#31327e] border-b-2 border-[#31327e] pb-1">MyAI</span>
        </div>
      </div>

      <div className="flex-1 min-w-[200px] max-w-md mx-auto">
        <div className="relative">
          <AiOutlineSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher une fonction..."
            className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#68bddd]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"
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
