'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AiOutlineBell,
  AiOutlineSearch,
  AiOutlineMenu,
  AiOutlineUser,
  AiOutlineLogout,
} from 'react-icons/ai';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import fetchWithAuth from '@/utils/fetchWithAuth';
import { useRouter } from 'next/navigation';

const notifications = [
  { id: 1, message: "Une nouvelle idée a été soumise.", time: "Il y a 10 min" },
  { id: 2, message: "Une idée a reçu 5 votes.", time: "Aujourd’hui" },
];

export default function HeaderMyPropos({ setSidebarOpen }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUserPopup, setShowUserPopup] = useState(false);

  const notifRef = useRef(null);
  const userRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetchWithAuth("https://myit-backend-its-c20c9354ce42.herokuapp.com/api/me/", {
          method: 'GET',
          credentials: 'include',
        });
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserPopup(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetchWithAuth("https://myit-backend-its-c20c9354ce42.herokuapp.com/api/logout/", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Erreur de déconnexion :", err.message);
    } finally {
      router.push("/login");
    }
  };

  const getFormattedName = () => {
    const first = user?.name || '';
    const last = user?.surname || '';
    return `${first.toUpperCase()} ${last.toUpperCase()}`.trim();
  };

  const getDepartment = () => {
    return user?.role === "admin" ? "Administrateur" : user?.department || "N/A";
  };

  const getActivities = () => {
    if (user?.role === "admin") return ["Accès libre"];
    return user?.dashboards || [];
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 bg-white shadow-md px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-4"
    >
      {/* Gauche */}
      <div className="flex items-center gap-3">
        <button className="md:hidden text-[#31327e]" onClick={() => setSidebarOpen(true)}>
          <AiOutlineMenu size={24} />
        </button>
        <div className="hidden md:flex items-center gap-6">
          <span className="font-semibold text-[#31327e] border-b-2 border-[#31327e] pb-1">
            MyPropos
          </span>
        </div>
      </div>

      {/* Centre */}
      <div className="flex-1 min-w-[200px] max-w-md mx-auto">
        <div className="relative">
          <AiOutlineSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher une idée..."
            className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#68bddd]"
          />
        </div>
      </div>

      {/* Droite */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
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

        {/* User profile */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setShowUserPopup(!showUserPopup)}
            className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition whitespace-nowrap"
          >
            {user?.avatar ? (
              <Image src={user.avatar} alt="Avatar" width={32} height={32} className="rounded-full object-cover" />
            ) : (
              <AiOutlineUser className="w-7 h-7 text-gray-600" />
            )}
            <span className="text-sm font-medium text-gray-700 hidden sm:inline">
              {loading ? "..." : getFormattedName()}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>

          {showUserPopup && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
            >
              <div className="px-5 py-4 text-sm space-y-1">
                <p className="text-xs text-gray-500">Connecté en tant que</p>
                <p className="font-bold text-[#31327e] text-base">{getFormattedName()}</p>
                <p><span className="font-semibold text-gray-600">Email :</span> {user?.email}</p>
                <p><span className="font-semibold text-gray-600">Département :</span> {getDepartment()}</p>
                <p className="font-semibold text-gray-600">Activités :</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {getActivities().length > 0 ? (
                    getActivities().map((item, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs italic">Aucune activité</span>
                  )}
                </div>
              </div>

              <div className="border-t px-5 py-3 bg-gray-50 hover:bg-red-50 transition text-center">
                <button
                  onClick={handleLogout}
                  className="text-red-600 font-semibold text-sm hover:underline"
                >
                  <AiOutlineLogout className="w-4 h-4 inline mr-2" />
                  Se déconnecter
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
