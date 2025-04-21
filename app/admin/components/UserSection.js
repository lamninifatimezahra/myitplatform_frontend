"use client";

import { useState } from "react";
import { User, Trash2, Key, Copy, FileText, Shield } from "lucide-react";
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function UserSection() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [access, setAccess] = useState({
    HISPEED: false,
    FTTH: false,
    DSL: false,
    FTTB: false,
    EARF: false,
    ARTHIUS: false
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

  const handleAddUser = async () => {
    // Validation de base
    if (!email || !email.trim()) {
      return showMessage("Veuillez saisir une adresse email valide", "error");
    }
    
    if (!password || password.length < 8) {
      return showMessage("Le mot de passe doit contenir au moins 8 caractères", "error");
    }

    // Validation de domaine email
    const validDomains = ["intelcia.com", "sfr.com"];
    const emailDomain = email.split('@')[1];
    if (!validDomains.includes(emailDomain)) {
      return showMessage("L'email doit être un domaine intelcia.com ou sfr.com", "error");
    }

    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/api/admin/create-user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          role,
          dashboards: Object.entries(access)
            .filter(([_, val]) => val)
            .map(([key]) => key),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Erreur serveur");
      }

      setShowCredentials(true);
      setCopyMessage("");
      showMessage("Utilisateur ajouté avec succès !");
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
        const data = await res.json();
        throw new Error(data.detail || "Erreur de suppression");
      }

      showMessage("Utilisateur supprimé avec succès !");
      setDeleteEmail("");
    } catch (err) {
      showMessage("Erreur : " + err.message, "error");
    }
  };

  const copyToClipboard = () => {
    const text = `Identifiants utilisateur :
Email : ${email}
Mot de passe : ${password}
Rôle : ${role}
Accès : ${Object.entries(access).filter(([_, v]) => v).map(([k]) => k).join(", ") || "Aucun"}`;
    navigator.clipboard.writeText(text);
    setCopyMessage("✅ Identifiants copiés !");
    setTimeout(() => setCopyMessage(""), 2000);
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
            <label className="w-32 text-gray-700 font-medium">E-mail</label>
            <input
              type="email"
              placeholder="Adresse E-mail (intelcia.com ou sfr.com)"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black placeholder:text-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">Mot de passe</label>
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

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">Rôle</label>
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
            <div className="mb-1"><span className="font-medium">Email :</span> {email}</div>
            <div className="mb-1"><span className="font-medium">Mot de passe :</span> {password}</div>
            <div className="mb-1"><span className="font-medium">Rôle :</span> {role === 'admin' ? 'Administrateur' : 'Utilisateur'}</div>
            <div>
              <span className="font-medium">Accès :</span> {Object.entries(access).filter(([_, v]) => v).map(([k]) => k).join(", ") || "Aucun"}
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