"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { AiOutlineArrowLeft, AiOutlineArrowRight, AiOutlineBell, AiOutlineUser } from "react-icons/ai";
import { FaFacebook, FaLinkedin, FaExclamationCircle } from "react-icons/fa";

export default function HomePage() {
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const notifications = [
    "Nouvelle tâche assignée",
    "Maintenance prévue demain",
    "Message du support technique",
  ];

  // Fermer les popups lorsqu'on clique en dehors
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

  return (
    <div className="relative flex flex-col h-screen overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 w-full flex justify-between items-center p-4 z-30">
        <div className="flex space-x-3">
          <button className="p-2 bg-[#6f80ac] text-white rounded-full shadow-md hover:bg-[#68bddd] transition-all duration-300">
            <AiOutlineArrowLeft size={24} />
          </button>
          <button className="p-2 bg-[#6f80ac] text-white rounded-full shadow-md hover:bg-[#68bddd] transition-all duration-300">
            <AiOutlineArrowRight size={24} />
          </button>
        </div>
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <div className="relative popup-container">
            <AiOutlineBell
              size={24}
              className="text-[#6f80ac] cursor-pointer hover:text-[#68bddd]"
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
              <AiOutlineUser size={24} className="text-[#6f80ac]" />
              <span className="text-[#6f80ac] font-semibold">Ayoub LAHDOUD</span>
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

        {/* Right Side - Agrandissement du Catalogue + Espacement */}
        <div className="w-[40%] flex justify-start">
          <div className="bg-white/50 p-16 rounded-3xl shadow-2xl max-w-xl w-full text-center space-y-6">
            {["DOOR", "B2B", "B2C", "SI3C", "GUIDE", "About Us"].map((dept) => (
              <Link key={dept} href={`/${dept.toLowerCase()}`}>
                <div className="w-full p-6 border border-[#6f80ac] text-[#6f80ac] font-bold text-2xl rounded-lg hover:bg-[#68bddd] hover:text-white transition-all duration-300 cursor-pointer mb-6">
                  {dept}
                </div>
              </Link>
            ))}

            {/* Social Links */}
            <div className="flex justify-center space-x-6 mt-8">
              <Link href="#"><FaFacebook size={36} className="text-[#6f80ac] hover:text-[#68bddd]" /></Link>
              <Link href="#"><FaLinkedin size={36} className="text-[#6f80ac] hover:text-[#68bddd]" /></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
