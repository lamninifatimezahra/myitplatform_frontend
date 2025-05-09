"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import fetchWithAuth from "@/utils/fetchWithAuth";
import {
  AiOutlineArrowLeft,
  AiOutlineArrowRight,
  AiOutlineUser,
  AiOutlineLogout,
} from "react-icons/ai";
import { BsChevronDown } from "react-icons/bs";

export default function AccueilPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const popupRef = useRef(null);

  const [showUserPopup, setShowUserPopup] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShowUserPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollBottom = window.innerHeight + scrollTop;
      const hasMoreBelow = scrollBottom < document.body.scrollHeight - 10;
      setShowScrollHint(scrollTop < 100 && hasMoreBelow);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // ✅ Spinner custom si loading
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white relative">
        <div className="relative w-24 h-24">
          {/* Cercle animé */}
          <div className="absolute inset-0 rounded-full border-[6px] border-t-[#31327e] border-b-[#6f80ac] border-l-transparent border-r-transparent animate-spin-custom" />
          {/* Logo MyIT centré */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/logo-myit.png"
              alt="Logo MyIT"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
        </div>

        <style jsx>{`
          @keyframes spin-custom {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }

          .animate-spin-custom {
            animation: spin-custom 1.1s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  const modules = [
    { name: "Dashboard KPIs", path: "/dashboards", roles: ["admin", "user"] },
    { name: "MyProfile", path: "/myprofile", roles: ["admin", "user"] },  // ✅ Ajouté ici
    { name: "MyForum", path: "/myforum", roles: ["admin", "user"] },
    { name: "MyAI", path: "/myai", roles: ["admin", "user"] },
    { name: "MyFile", path: "/myfile", roles: ["admin", "user"] },
    { name: "Guide MyIT", path: "/guide", roles: ["admin", "user"] },
    { name: "Paramètres", path: "/settings", roles: ["admin", "user"] },
    { name: "MyPropos", path: "/mypropos", roles: ["admin", "user"] },
    { name: "Espace Admin", path: "/admin", roles: ["admin"] },
  ];

  const accessibleModules = modules.filter((mod) =>
    mod.roles.includes(user.role)
  );

  const handleLogout = async () => {
    try {
      await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/api/logout/", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
    } finally {
      router.push("/login");
    }
  };

  const getFormattedName = () => {
    const first = user.name || "";
    const last = user.surname || "";
    return `${first.toUpperCase()} ${last.toUpperCase()}`.trim();
  };

  const getDepartment = () => {
    return user.role === "admin" ? "Administrateur" : user.department || "N/A";
  };

  const getActivities = () => {
    if (user.role === "admin") return ["Accès libre"];
    if (user.dashboards && user.dashboards.length > 0) return user.dashboards;
    return [];
  };

  return (
    <main className="flex flex-col min-h-screen bg-white text-gray-800 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: "url('/background-office.jpg')",
          filter: "brightness(1.1) blur(5px)",
          opacity: 0.2,
        }}
      />

      {/* HEADER */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 sm:px-12 bg-transparent">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-[#31327e] text-white hover:bg-[#4547b3] transition"
            title="Page précédente"
          >
            <AiOutlineArrowLeft size={20} />
          </button>
          <button
            onClick={() => router.forward()}
            className="p-2 rounded-full bg-[#31327e] text-white hover:bg-[#4547b3] transition"
            title="Page suivante"
          >
            <AiOutlineArrowRight size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-4 relative" ref={popupRef}>
          <div
            className="flex items-center gap-2 cursor-pointer text-[#31327e] font-medium hover:underline"
            onClick={() => setShowUserPopup(!showUserPopup)}
          >
            <AiOutlineUser size={22} />
            <span>{getFormattedName()}</span>
          </div>

          <button
            onClick={handleLogout}
            className="text-red-500 hover:text-red-600 transition"
            title="Se déconnecter"
          >
            <AiOutlineLogout size={22} />
          </button>

          {showUserPopup && (
            <div className="absolute right-0 top-14 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 animate-fade-in">
              <div className="px-5 py-4 space-y-1">
                <p className="text-xs text-gray-500">Connecté en tant que</p>
                <p className="font-bold text-[#31327e] text-base">{getFormattedName()}</p>

                <div className="text-sm text-gray-700 mt-2 space-y-1">
                  <p><span className="font-semibold text-gray-600">Email :</span> {user.email}</p>
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
              </div>

              <div className="border-t px-5 py-3 bg-gray-50 hover:bg-red-50 transition text-center">
                <button
                  onClick={handleLogout}
                  className="text-red-600 font-semibold text-sm hover:underline"
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div className="relative z-10 flex-1 flex flex-col justify-start pt-28 px-6 py-12 sm:px-12">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center mb-10">
            <Image
              src="/logo-myit.png"
              alt="MyIT Logo"
              width={280}
              height={80}
              className="drop-shadow-lg"
            />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#31327e] mb-4"
          >
            Bienvenue sur la plateforme MyIT
          </motion.h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Explorez les outils et modules de la plateforme MyIT, conçus pour simplifier votre quotidien.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 place-items-center">
            {accessibleModules.map((mod, index) => (
              <motion.div
                key={mod.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="w-full max-w-sm"
              >
                <Link href={mod.path}>
                  <div className="w-full py-6 px-6 border border-[#31327e] rounded-2xl font-semibold text-lg text-[#31327e] bg-white transition-all duration-300 cursor-pointer shadow-md hover:bg-[#31327e] hover:text-white hover:shadow-xl">
                    {mod.name}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {showScrollHint && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <BsChevronDown className="text-[#31327e] animate-bounce text-xl" />
        </div>
      )}

      <footer className="relative z-10 text-center text-sm text-gray-400 py-4 mt-10">
        © {new Date().getFullYear()} MyIT – Plateforme interne Intelcia IT Solutions
      </footer>
    </main>
  );
}
