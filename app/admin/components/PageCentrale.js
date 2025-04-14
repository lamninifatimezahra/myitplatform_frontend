"use client";
import { useState } from "react";
import UploadSection from "./UploadSection";
import UserSection from "./UserSection";

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
      </div>

      {/* Composants selon la vue sélectionnée */}
      {view === "upload" && <UploadSection />}
      {view === "user" && <UserSection />}
    </div>
  );
}
