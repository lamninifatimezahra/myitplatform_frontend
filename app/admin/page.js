'use client';

import { useState } from "react";
import useAuth from "@/hooks/useAuth";
import Sidebar from "../components/Sidebar";
import Header from "./components/Header";
import UserSection from "./components/UserSection";       // Formulaire Ajouter/Supprimer utilisateur
import ListeUtilisateurs from "./components/ListeUtilisateurs"; // Tableau Liste utilisateurs
import Image from "next/image";

export default function AdminPage() {
  const { user, loading, authorized, hydrated } = useAuth(null, "admin");
  const [selectedSection, setSelectedSection] = useState("user"); // "user" ou "list"

  if (!hydrated || loading || !authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-white relative">
        <div className="relative w-24 h-24">
          {/* Spinner cercle */}
          <div className="absolute inset-0 border-[6px] border-t-[#31327e] border-b-[#6f80ac] border-l-transparent border-r-transparent rounded-full animate-spin-custom" />
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

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-y-auto max-h-screen">
        <Header />

        {/* Menu de sélection */}
        <div className="flex justify-center mt-6 gap-4">
          <button
            onClick={() => setSelectedSection("user")}
            className={`px-6 py-2 rounded-full text-sm font-semibold ${
              selectedSection === "user" 
                ? "bg-[#31327e] text-white" 
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            } transition`}
          >
            Ajouter / Supprimer Utilisateur
          </button>
          <button
            onClick={() => setSelectedSection("list")}
            className={`px-6 py-2 rounded-full text-sm font-semibold ${
              selectedSection === "list" 
                ? "bg-[#31327e] text-white" 
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            } transition`}
          >
            Liste des Utilisateurs
          </button>
        </div>

        {/* Section dynamique */}
        <div className="p-6">
          {selectedSection === "user" && <UserSection />}
          {selectedSection === "list" && <ListeUtilisateurs />}
        </div>

      </div>
    </div>
  );
}
