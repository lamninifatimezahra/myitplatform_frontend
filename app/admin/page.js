'use client';

import useAuth from "@/hooks/useAuth";
import Sidebar from "../components/Sidebar";
import Header from "./components/Header";
import PageCentrale from "./components/PageCentrale";
import Image from "next/image"; // N'oublie pas d'importer Image !

export default function AdminPage() {
  const { user, loading, authorized, hydrated } = useAuth(null, "admin");

  if (!hydrated || loading || !authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-white relative">
        <div className="relative w-24 h-24">
          {/* Spinner cercle */}
          <div className="absolute inset-0 border-[6px] border-t-[#31327e] border-b-[#6f80ac] border-l-transparent border-r-transparent rounded-full animate-spin-custom" />
          {/* Logo MyIT au centre */}
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

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-y-auto max-h-screen">
        <Header />
        <PageCentrale />
      </div>
    </div>
  );
}
