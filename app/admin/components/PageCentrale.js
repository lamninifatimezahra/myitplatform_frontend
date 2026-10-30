"use client";
import { useState } from "react";
import ListeUtilisateurs from "./ListeUtilisateurs"; // remplacement ici
import UserSection from "./UserSection";

export default function PageCentrale() {
  const [view, setView] = useState("utilisateurs");

  return (
    <div className="p-8 bg-gray-50">
      {/* Choix de la vue */}
      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={() => setView("utilisateurs")}
          className={`px-4 py-2 rounded ${view === "utilisateurs" ? "bg-gray-500 text-white" : "bg-gray-200 text-black"}`}
        >
          Liste des Utilisateurs
        </button>
        <button
          onClick={() => setView("user")}
          className={`px-4 py-2 rounded ${view === "user" ? "bg-gray-500 text-white" : "bg-gray-200 text-black"}`}
        >
          Ajouter/Supprimer Utilisateur
        </button>
      </div>

      {/* Composants selon la vue sélectionnée */}
      {view === "utilisateurs" && <ListeUtilisateurs />}
      {view === "user" && <UserSection />}
    </div>
  );
}
