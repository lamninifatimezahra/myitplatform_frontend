"use client";

import { useState } from "react";
import { User, Trash2, Key, Copy, FileText, Shield } from "lucide-react";
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function UserSection() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [activity, setActivity] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [access, setAccess] = useState({
    HISPEED: false,
    FTTH: false,
    DSL: false,
    FTTB: false,
    EARF: false,
    ARTHIUS: false
  });
  const [createdUser, setCreatedUser] = useState({
    email: "",
    password: "",
    name: "",
    surname: "",
    position: "",
    department: "",
    role: "",
    access: []
  });
  const [showCredentials, setShowCredentials] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(generated);
    setShowCredentials(false);
  };

  const handleAccessChange = (key) => {
    setAccess((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const extractNameFromEmail = () => {
    if (!email) return;
    
    try {
      const emailParts = email.split('@')[0].split('.');
      if (emailParts.length >= 1 && !name) {
        setName(emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1));
      }
      if (emailParts.length >= 2 && !surname) {
        setSurname(emailParts[1].charAt(0).toUpperCase() + emailParts[1].slice(1));
      }
    } catch (error) {
      console.error("Erreur lors de l'extraction du nom depuis l'email:", error);
    }
  };

  const handleAddUser = async () => {
    // Validation de base
    if (!email || !email.trim()) {
      return showMessage("Veuillez saisir une adresse email valide", "error");
    }
    
    if (!password || password.length < 8) {
      return showMessage("Le mot de passe doit contenir au moins 8 caractères", "error");
    }

    if (!name || !surname || !position || !department) {
      return showMessage("Veuillez remplir tous les champs obligatoires", "error");
    }

    // Validation de domaine email
    const validDomains = ["intelcia.com", "sfr.com"];
    const emailDomain = email.split('@')[1];
    if (!validDomains.includes(emailDomain)) {
      return showMessage("L'email doit être un domaine intelcia.com ou sfr.com", "error");
    }

    try {
      // Création du payload avec tous les champs requis
      const dashboardAccess = Object.entries(access)
        .filter(([_, val]) => val)
        .map(([key]) => key);
        
      const payload = {
        email,
        password,
        role,
        name,
        surname,
        position,
        department,
        activity: "",
        competence: [], // Pas de champ pour competence dans l'UI pour le moment
        dashboards: dashboardAccess,
      };
      
      console.log("Sending payload:", JSON.stringify(payload));
      
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/api/admin/create-user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorMessage = "Erreur serveur";
        
        // Check if status is 409 (Conflict) - typically used for "already exists" errors
        if (res.status === 409) {
          return showMessage(`Un utilisateur avec l'email ${email} existe déjà`, "error");
        }
        
        try {
          // Try to parse the error response as JSON
          const errorData = await res.json();
          
          // Check for specific user exists error message patterns
          if (errorData.detail && 
              (errorData.detail.includes("already exists") || 
               errorData.detail.includes("déjà existant") ||
               errorData.detail.includes("existe déjà"))) {
            return showMessage(`Un utilisateur avec l'email ${email} existe déjà`, "error");
          }
          
          errorMessage = errorData.detail || "Erreur serveur";
        } catch (jsonError) {
          // If not JSON, get text content or use status text
          try {
            const textContent = await res.text();
            
            // Check if the error text contains any indication of duplicate user
            if (textContent.includes("already exists") || 
                textContent.includes("déjà existant") ||
                textContent.includes("existe déjà") ||
                textContent.includes("duplicate key") ||
                textContent.includes("Duplicate entry")) {
              return showMessage(`Un utilisateur avec l'email ${email} existe déjà`, "error");
            }
            
            // Extract a meaningful error if possible
            const htmlErrorMatch = textContent.match(/<title>(.*?)<\/title>/);
            errorMessage = htmlErrorMatch ? htmlErrorMatch[1] : `Erreur serveur (${res.status})`;
          } catch (textError) {
            // If we can't even get text
            errorMessage = `Erreur serveur (${res.status}): ${res.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Now parse the successful response
      const data = await res.json();

      // Sauvegarder les informations de l'utilisateur créé
      setCreatedUser({
        email,
        password,
        name,
        surname,
        position,
        department,
        role,
        access: dashboardAccess
      });

      setShowCredentials(true);
      setCopyMessage("");
      showMessage("Utilisateur ajouté avec succès !");
      
      // Réinitialiser le formulaire
      setEmail("");
      setPassword("");
      setName("");
      setSurname("");
      setPosition("");
      setDepartment("");
      setActivity("");
      const resetAccess = {};
      Object.keys(access).forEach(key => {
        resetAccess[key] = false;
      });
      setAccess(resetAccess);
    } catch (err) {
      showMessage("Erreur lors de l'ajout : " + err.message, "error");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteEmail || !deleteEmail.trim()) {
      return showMessage("Veuillez saisir une adresse email valide", "error");
    }

    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/api/admin/delete-user/", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: deleteEmail }),
      });

      if (!res.ok) {
        let errorMessage = "Erreur de suppression";
        try {
          const errorData = await res.json();
          errorMessage = errorData.detail || "Erreur de suppression";
        } catch (jsonError) {
          try {
            const textContent = await res.text();
            const htmlErrorMatch = textContent.match(/<title>(.*?)<\/title>/);
            errorMessage = htmlErrorMatch ? htmlErrorMatch[1] : `Erreur de suppression (${res.status})`;
          } catch (textError) {
            errorMessage = `Erreur de suppression (${res.status}): ${res.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      const data = await res.json();
      
      showMessage("Utilisateur supprimé avec succès !");
      setDeleteEmail("");
    } catch (err) {
      showMessage("Erreur : " + err.message, "error");
    }
  };


  const copyToClipboard = () => {
    try {
      // Utiliser les informations de l'utilisateur créé 
      const selectedAccess = createdUser.access.join(", ");
      
      // Créer le texte complet avec uniquement email, mot de passe et accès
      const textToCopy = `Identifiants utilisateur :
        Email : ${createdUser.email}
        Mot de passe : ${createdUser.password}
        Accès : ${selectedAccess || "Aucun"}`;
    
      // Copier dans le presse-papiers
      navigator.clipboard.writeText(textToCopy);
      
      // Message de confirmation
      setCopyMessage("✅ Identifiants copiés !");
      setTimeout(() => setCopyMessage(""), 2000);
      
      // Pour le débogage (optionnel, peut être retiré en production)
      console.log("Texte copié :", textToCopy);
    } catch (error) {
      console.error("Erreur lors de la copie :", error);
      setCopyMessage("❌ Erreur lors de la copie");
    }
  };
  
  const selectAllAccess = () => {
    const newAccess = {};
    Object.keys(access).forEach(key => {
      newAccess[key] = true;
    });
    setAccess(newAccess);
  };

  const clearAllAccess = () => {
    const newAccess = {};
    Object.keys(access).forEach(key => {
      newAccess[key] = false;
    });
    setAccess(newAccess);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {message.text && (
        <div className={`p-4 rounded-md ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.type === 'error' ? '❌ ' : '✅ '}
          {message.text}
        </div>
      )}

      {/* Ajouter un utilisateur */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-100">
        <div className="flex items-center mb-6">
          <User className="mr-3 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">Ajouter Un Utilisateur</h2>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">E-mail <span className="text-red-500">*</span></label>
            <input
              type="email"
              placeholder="Adresse E-mail (intelcia.com ou sfr.com)"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black placeholder:text-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={extractNameFromEmail}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">Mot de passe <span className="text-red-500">*</span></label>
            <div className="flex-1 flex items-center space-x-3">
              <input
                type="text"
                className="flex-grow border border-gray-300 rounded-md p-2 bg-gray-50 text-black"
                value={password}
                readOnly
              />
              <button
                onClick={generatePassword}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center space-x-2"
              >
                <Key size={18} />
                <span>Générer</span>
              </button>
            </div>
          </div>

          {/* Informations personnelles */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">Prénom <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Prénom"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">Nom <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Nom"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">Poste <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Poste occupé"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">Département <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Département"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-2">
            <label className="w-32 text-gray-700 font-medium pt-2">Activité</label>
            <textarea
              placeholder="Description de l'activité (optionnel)"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black h-24"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">Rôle <span className="text-red-500">*</span></label>
            <select
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user" className="text-black">Utilisateur</option>
              <option value="admin" className="text-black">Administrateur</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <label className="w-32 text-gray-700 font-medium pt-1">Accès au Dashboard</label>
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <button 
                  onClick={selectAllAccess}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Shield size={16} /> Tout sélectionner
                </button>
                <button 
                  onClick={clearAllAccess}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                >
                  <Shield size={16} /> Tout désélectionner
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border border-gray-100 rounded-md p-3 bg-gray-50">
                {Object.keys(access).map((key) => (
                  <label key={key} className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded">
                    <input
                      type="checkbox"
                      checked={access[key]}
                      onChange={() => handleAccessChange(key)}
                      className="rounded text-blue-500 focus:ring-blue-200"
                    />
                    <span className="text-gray-700">{key}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleAddUser}
              className="mt-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md flex items-center space-x-2"
            >
              <User size={18} />
              <span>Ajouter l&#39;utilisateur</span>
            </button>
          </div>
        </div>
      </div>

      {/* Identifiants générés */}
      {showCredentials && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-md shadow space-y-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            Identifiants à transmettre :
          </h3>
          <div className="bg-white p-3 rounded border border-gray-200">
            <div className="mb-1"><span className="font-medium">Email :</span> {createdUser.email}</div>
            <div className="mb-1"><span className="font-medium">Mot de passe :</span> {createdUser.password}</div>
            <div>
              <span className="font-medium">Accès :</span> {createdUser.access.join(", ") || "Aucun"}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
            >
              <Copy size={18} />
              Copier
            </button>
            {copyMessage && <span className="text-green-600 text-sm">{copyMessage}</span>}
          </div>
        </div>
      )}

      {/* Supprimer un utilisateur */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-100">
        <div className="flex items-center mb-6">
          <Trash2 className="mr-3 text-red-600" />
          <h2 className="text-xl font-bold text-gray-800">Supprimer Un Utilisateur</h2>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">E-mail</label>
            <input
              type="email"
              placeholder="Adresse E-mail à supprimer"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-red-200 text-black placeholder:text-black"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleDeleteUser}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md flex items-center space-x-2"
            >
              <Trash2 size={18} />
              <span>Supprimer l'utilisateur</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}