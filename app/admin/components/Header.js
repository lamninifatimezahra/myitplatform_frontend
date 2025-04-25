'use client';

import { useEffect, useState, useRef } from 'react';
import { AiOutlineSearch, AiOutlineBell, AiOutlineUser, AiOutlineLogout } from 'react-icons/ai';
import { ChevronDown } from 'lucide-react';
import fetchWithAuth from '@/utils/fetchWithAuth';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Header() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const popupRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/api/me/", {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Erreur lors de la récupération de l’utilisateur');

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
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowUserPopup(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/api/logout/", {
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
    if (user?.dashboards?.length) return user.dashboards;
    return [];
  };

  return (
    <header className="bg-white shadow-md flex justify-between items-center px-6 py-4 relative">
      <div>
        <h1 className="text-xl font-bold text-blue-700">Page Admin</h1>
        <p className="text-gray-600">Bienvenue sur votre espace</p>
      </div>

      <div className="flex items-center space-x-4" ref={popupRef}>
        <AiOutlineSearch size={24} className="text-gray-600 cursor-pointer" />
        <AiOutlineBell size={24} className="text-gray-600 cursor-pointer" />
        
        <button
          onClick={() => setShowUserPopup(!showUserPopup)}
          className="flex items-center gap-2 bg-white rounded-lg shadow p-2 hover:shadow-lg transition"
        >
          <AiOutlineUser className="w-6 h-6 text-gray-700" />
          <span className="font-medium text-gray-800">{loading ? "..." : getFormattedName()}</span>
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </button>

        {showUserPopup && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-6 top-20 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
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
    </header>
  );
}
