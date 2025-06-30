"use client";
import { useEffect, useState } from "react";
import { FiSearch, FiMoon, FiMenu } from "react-icons/fi";
import { motion } from "framer-motion";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Présentation", href: "#intro" },
    { label: "Fonctionnalités", href: "#features" },
    { label: "Collaboration", href: "#forum" },
    { label: "Avantages", href: "#benefits" },
    { label: "Nous Rejoindre", href: "#footer" },
  ];

  return (
    <motion.header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white shadow-md"
          : "bg-gradient-to-r from-[#5de0e6] to-[#004aad]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-2 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <img
            src="/logo-myit-blanc.png"
            alt="Logo MyIT"
            className="w-16 h-16 object-contain transition-transform duration-300 hover:scale-110"
          />
        </div>

        {/* Menu principal */}
        <nav className="hidden md:flex gap-8 items-center text-[16px] font-medium">
          {navLinks.map((item, i) => (
            <motion.a
              key={i}
              href={item.href}
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className={`transition-all tracking-wide ${
                scrolled
                  ? "text-[#004aad] hover:text-[#5de0e6]"
                  : "text-white hover:text-[#d4f4f6]"
              }`}
            >
              {item.label}
            </motion.a>
          ))}
        </nav>

        {/* CTA & Tools */}
        <div className="flex items-center gap-4">
          <a href="/login">
            <motion.button
              whileHover={{ scale: 1.05 }}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition border-2 ${
                scrolled
                  ? "bg-white text-[#004aad] border-[#004aad] hover:bg-[#5de0e6] hover:text-white"
                  : "bg-white text-[#004aad] border-white hover:bg-[#5de0e6] hover:text-white"
              }`}
            >
              Connexion
            </motion.button>
          </a>

          <a href="/signup">
            <motion.button
              whileHover={{ scale: 1.05 }}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition border-2 ${
                scrolled
                  ? "bg-[#004aad] text-white border-[#004aad] hover:bg-[#5de0e6]"
                  : "bg-white text-[#004aad] border-white hover:bg-[#5de0e6] hover:text-white"
              }`}
            >
              Inscription
            </motion.button>
          </a>

          <FiSearch className={`text-xl transition ${scrolled ? "text-[#004aad]" : "text-white"}`} />
          <FiMoon className={`text-xl transition ${scrolled ? "text-[#004aad]" : "text-white"}`} />
          <FiMenu className={`text-2xl md:hidden ${scrolled ? "text-[#004aad]" : "text-white"}`} />
        </div>
      </div>
    </motion.header>
  );
}
