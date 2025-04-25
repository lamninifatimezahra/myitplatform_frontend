"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown, LogOut } from "lucide-react";
import { AiOutlineUser } from "react-icons/ai";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { useRouter } from "next/navigation";

export default function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/api/me/", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Erreur lors de la récupération des infos");
        const data = await res.json();
        setUser(data);
      } catch (error) {
        console.error("Erreur:", error.message);
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    const first = user?.name || "";
    const last = user?.surname || "";
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
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition duration-300"
      >
        <AiOutlineUser className="w-6 h-6 text-gray-700" />
        <span className="font-medium text-gray-800">{getFormattedName()}</span>
        <ChevronDown className="w-4 h-4 text-gray-600" />
      </button>

      {isOpen && (
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
              <LogOut className="w-4 h-4 inline mr-2" />
              Se déconnecter
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
