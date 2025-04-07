"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown, LogOut } from "lucide-react";

export default function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const user = {
    name: "Ayoub LAHDOUD",
    department: "DOOR",
    activity: "FTTH",
    avatar: "/profile.png",
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition duration-300"
      >
        <img src={user.avatar} alt="User" className="w-10 h-10 rounded-full border" />
        <span className="font-medium">{user.name}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg overflow-hidden z-100"
        >
          <div className="p-4 text-center border-b">
            <img src={user.avatar} alt="User" className="w-12 h-12 rounded-full mx-auto" />
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-gray-600">{user.department}</p>
            <p className="text-sm text-gray-500">Activité: {user.activity}</p>
          </div>
          <div className="p-2">
            <button className="w-full px-4 py-2 text-red-500 hover:bg-gray-100 flex items-center justify-center">
              <LogOut className="w-5 h-5 mr-2" /> Se Déconnecter
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
