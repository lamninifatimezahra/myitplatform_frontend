"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";

export default function NotificationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const [notifications] = useState([
    { id: 1, message: "Nouvelle commande ajoutée", time: "Il y a 2 min" },
    { id: 2, message: "Mise à jour du backlog", time: "Il y a 10 min" },
    { id: 3, message: "Maintenance prévue demain", time: "Il y a 1h" },
  ]);

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
        className="relative p-2 rounded-full hover:bg-gray-100 transition duration-300"
      >
        <Bell className="w-6 h-6" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg overflow-hidden z-100"
        >
          <div className="p-4 border-b font-semibold">Notifications</div>
          <div className="max-h-56 overflow-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-gray-500">Aucune notification</p>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="p-3 border-b hover:bg-gray-100">
                  <p className="text-sm">{notif.message}</p>
                  <span className="text-xs text-gray-500">{notif.time}</span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
