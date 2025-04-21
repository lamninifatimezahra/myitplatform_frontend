'use client';

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { AiOutlineArrowLeft, AiOutlineArrowRight, AiOutlineBell, AiOutlineUser } from "react-icons/ai";
import useAuth from "@/hooks/useAuth";

export default function HomePage() {
  const { user, loading } = useAuth();

  const [showUserPopup, setShowUserPopup] = useState(false);
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const notifications = [
    "Nouvelle tâche assignée",
    "Maintenance prévue demain",
    "Message du support technique",
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".popup-container")) {
        setShowUserPopup(false);
        setShowAlertPopup(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (loading || !user) return <div>Chargement sécurisé...</div>;

  return (
    <div className="relative flex flex-col h-screen overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 w-full flex justify-between items-center p-4 z-30">
        <div className="flex space-x-3">
          <button className="p-2 bg-[#465b91] text-white rounded-full shadow-md hover:bg-[#68bddd] transition-all duration-300">
            <AiOutlineArrowLeft size={24} />
          </button>
          <button className="p-2 bg-[#465b91] text-white rounded-full shadow-md hover:bg-[#68bddd] transition-all duration-300">
            <AiOutlineArrowRight size={24} />
          </button>
        </div>
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <div className="relative popup-container">
            <AiOutlineBell
              size={24}
              className="text-[#465b91] cursor-pointer hover:text-[#68bddd]"
              onClick={(e) => {
                e.stopPropagation();
                setShowAlertPopup(!showAlertPopup);
              }}
            />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 transform translate-x-1 -translate-y-1">
                {notifications.length}
              </span>
            )}
          </div>

          {/* User Profile */}
          <div className="relative popup-container">
            <div
              className="flex items-center space-x-2 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setShowUserPopup(!showUserPopup);
              }}
            >
              <AiOutlineUser size={24} className="text-[#465b91]" />
              <span className="text-[#465b91] font-semibold">User</span>
            </div>
          </div>
        </div>
      </div>

      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center backdrop-blur-md opacity-100 transition-opacity duration-700"
        style={{
          backgroundImage: "url('/background-office.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.40,
        }}
      ></div>

      {/* Main Content */}
      <div className="relative flex items-center justify-center w-full h-full px-24">
        {/* Left Side - Logo Centré */}
        <div className="w-[40%] flex justify-end">
          <Image src="/logo-myit.png" alt="MyIT Logo" width={700} height={700} priority />
        </div>

        {/* Right Side - Catalogue Dashboards */}
        <div className="w-[40%] flex justify-start">
          <div className="bg-white/50 p-16 rounded-3xl shadow-2xl max-w-xl w-full text-center space-y-6">
            {["HISPEED", "FTTH", "DSL", "FTTB", "EARF", "ARTHIUS"].map((dept) => {
              const hasAccess = user.role === "admin" || user.dashboards?.includes(dept);
              return (
                <motion.div
                  key={dept}
                  whileHover={{ scale: hasAccess ? 1.05 : 1 }}
                  whileTap={{ scale: hasAccess ? 0.95 : 1 }}
                  className="w-full"
                >
                  {hasAccess ? (
                    <Link href={`/${dept.toLowerCase()}`}>
                      <div className="w-full p-6 border border-[#465b91] text-[#465b91] font-bold text-2xl rounded-lg hover:bg-[#465b91] hover:text-white transition-all duration-300 cursor-pointer mb-6">
                        {dept}
                      </div>
                    </Link>
                  ) : (
                    <div className="w-full p-6 border border-gray-300 text-gray-400 text-2xl font-bold rounded-lg bg-gray-100 cursor-not-allowed mb-6">
                      {dept}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
