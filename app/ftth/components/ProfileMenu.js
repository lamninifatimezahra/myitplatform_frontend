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

  // Récupération des infos utilisateur via /me
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

  // Fermer le menu si clic en dehors
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition duration-300"
      >
        <AiOutlineUser className="w-6 h-6 text-gray-700" />
        <span className="font-medium text-gray-800">
          {user?.email || "Utilisateur"}
        </span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg overflow-hidden z-50"
        >
          <div className="p-4 text-center border-b">
            <AiOutlineUser className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="font-semibold">{user?.email || "—"}</p>
            <p className="text-sm text-gray-600">Département : DOOR</p>
            <p className="text-sm text-gray-500">Activité : FTTH</p>
          </div>
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-red-500 hover:bg-gray-100 flex items-center justify-center"
            >
              <LogOut className="w-5 h-5 mr-2" /> Se Déconnecter
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
