"use client";
import { useState } from "react";
import UploadSection from "./UploadSection";
import UserSection from "./UserSection";
import ListeUtilisateurs from "./ListeUtilisateurs";

export default function PageCentrale() {
  const [view, setView] = useState("upload");

  return (
    <div className="p-8 bg-gray-50">
      {/* Choix de la vue */}
      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={() => setView("upload")}
          className={`px-4 py-2 rounded ${view === "upload" ? "bg-gray-500 text-white" : "bg-gray-200 text-black"}`}
        >
          Uploader les fichiers
        </button>
        <button
          onClick={() => setView("user")}
          className={`px-4 py-2 rounded ${view === "user" ? "bg-gray-500 text-white" : "bg-gray-200 text-black"}`}
        >
          Ajouter/Supprimer Utilisateur
        </button>
        <button
          onClick={() => setView("liste")}
          className={`px-4 py-2 rounded ${view === "liste" ? "bg-gray-500 text-white" : "bg-gray-200 text-black"}`}
        >
          Liste des utilisateurs
        </button>
      </div>

      {/* Composants selon la vue sélectionnée */}
      {view === "upload" && <UploadSection />}
      {view === "user" && <UserSection />}
      {view === "liste" && <ListeUtilisateurs />}
    </div>
  );
}
