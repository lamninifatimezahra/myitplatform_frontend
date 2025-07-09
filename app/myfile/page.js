"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import fetchWithAuth from "@/utils/fetchWithAuth";
import { AiOutlineArrowLeft, AiOutlineArrowRight, AiOutlineUser, AiOutlineLogout } from "react-icons/ai";

export default function MyFilePage() {
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

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white relative">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-[6px] border-t-[#31327e] border-b-[#6f80ac] border-l-transparent border-r-transparent animate-spin-custom" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Image src="/logo-myit.png" alt="Logo MyIT" width={48} height={48} className="object-contain" />
          </div>
        </div>
        <style jsx>{`
          @keyframes spin-custom {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-spin-custom {
            animation: spin-custom 1.1s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  const dashboardsConfig = [
    { id: "HISPEED", display: "HISPEED", route: "hispeed" },
    { id: "FTTH", display: "FTTH", route: "ftth" },
    { id: "DSL", display: "DSL", route: "dsl" },
    { id: "FTTB", display: "FTTB", route: "fttb" },
    { id: "EARF", display: "Migration Docs", route: "earf" },
    { id: "EARFT", display: "EARF-T", route: "earft" },
    { id: "ARTHIUS", display: "ARTHIUS", route: "arthius" }
  ];

  const comingSoon = ["DSL", "FTTB", "EARF", "EARFT", "ARTHIUS"];

  const accessibleDashboards = dashboardsConfig.filter((dashboard) => {
    const hasAccess = user.role === "admin" || user.dashboards?.includes(dashboard.id);
    const isComingSoon = comingSoon.includes(dashboard.id);
    return hasAccess && !isComingSoon;
  });

  const handleLogout = async () => {
    try {
      await fetchWithAuth("https://myit-backend-its-c20c9354ce42.herokuapp.com/api/logout/", {
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
      <div className="absolute inset-0 bg-cover bg-center z-0" style={{
        backgroundImage: "url('/background-office.jpg')",
        filter: "brightness(1.1) blur(5px)",
        opacity: 0.2,
      }} />

      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 sm:px-12 bg-transparent">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-full bg-[#31327e] text-white hover:bg-[#4547b3] transition">
            <AiOutlineArrowLeft size={20} />
          </button>
          <button onClick={() => router.forward()} className="p-2 rounded-full bg-[#31327e] text-white hover:bg-[#4547b3] transition">
            <AiOutlineArrowRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4 relative" ref={popupRef}>
          <div
            className="flex items-center gap-2 cursor-pointer text-[#31327e] font-medium hover:underline"
            onClick={() => setShowUserPopup(!showUserPopup)}
          >
            <AiOutlineUser size={22} />
            <span>{getFormattedName()}</span>
          </div>

          <button onClick={handleLogout} className="text-red-500 hover:text-red-600 transition" title="Se déconnecter">
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
                        <span key={index} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
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
                <button onClick={handleLogout} className="text-red-600 font-semibold text-sm hover:underline">
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-start pt-28 px-6 py-12 sm:px-12">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center mb-10">
            <Image src="/logo-myit.png" alt="MyIT Logo" width={280} height={80} className="drop-shadow-lg" />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#31327e] mb-4"
          >
            Espace MyFile
          </motion.h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Uploadez vos fichiers selon votre activité métier.
          </p>

          <div className={`grid gap-8 place-items-center ${accessibleDashboards.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {accessibleDashboards.map((dashboard, index) => (
              <motion.div
                key={dashboard.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className={`w-full ${accessibleDashboards.length === 1 ? 'max-w-lg' : 'max-w-sm'}`}
              >
                <Link href={`/myfile/${dashboard.route}`}>
                  <div className="w-full py-6 px-6 border border-[#31327e] text-[#31327e] font-semibold text-lg rounded-2xl bg-white hover:bg-[#31327e] hover:text-white transition-all duration-300 cursor-pointer shadow-md hover:shadow-xl text-center">
                    {dashboard.display}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <footer className="relative z-10 text-center text-sm text-gray-400 py-4 mt-10">
        © {new Date().getFullYear()} MyIT – Plateforme interne Intelcia IT Solutions
      </footer>
    </main>
  );
}
