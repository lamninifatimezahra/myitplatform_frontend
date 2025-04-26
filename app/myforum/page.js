'use client';

import { useEffect, useState } from "react";
import LayoutForum from "./components/LayoutForum";
import ForumHome from "./components/ForumHome";
import Image from "next/image";

export default function MyForumPage() {
  const [loading, setLoading] = useState(true);

  // ✅ Simulation d'un petit chargement initial (1.5s)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
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

        {/* Animation personnalisée */}
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

  return (
    <LayoutForum>
      <ForumHome />
    </LayoutForum>
  );
}
