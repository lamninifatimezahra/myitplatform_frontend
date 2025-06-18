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
    EARF: false,      // Migration Docs
    EARFT: false,     // EARF-T
    ARTHUIS: false,
    MYFILE: false,    // non coché par défaut
    MYFORUM: true,    // coché par défaut
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

  // Configuration des dashboards avec leur affichage
  const dashboardConfig = {
    HISPEED: "HISPEED",
    FTTH: "FTTH",
    DSL: "DSL",
    FTTB: "FTTB",
    EARF: "Migration Docs",
    EARFT: "EARF-T",
    ARTHUIS: "ARTHUIS"
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+";
    let gen = "";
    for (let i = 0; i < 12; i++) {
      gen += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(gen);
    setShowCredentials(false);
  };

  const handleAccessChange = (key) => {
    setAccess(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const extractNameFromEmail = () => {
    if (!email) return;
    try {
      const parts = email.split("@")[0].split(".");
      if (parts[0] && !name) setName(parts[0][0].toUpperCase() + parts[0].slice(1));
      if (parts[1] && !surname) setSurname(parts[1][0].toUpperCase() + parts[1].slice(1));
    } catch (e) {
      console.error("Erreur extraction nom:", e);
    }
  };

  const handleAddUser = async () => {
    if (!email.trim()) return showMessage("Veuillez saisir une adresse email valide", "error");
    if (password.length < 8) return showMessage("Le mot de passe doit contenir au moins 8 caractères", "error");
    if (!name || !surname || !position || !department)
      return showMessage("Veuillez remplir tous les champs obligatoires", "error");

    const domain = email.split("@")[1];
    if (!["intelcia.com","sfr.com"].includes(domain))
      return showMessage("L'email doit être intelcia.com ou sfr.com", "error");

    try {
      const dash = Object.entries(access).filter(([_,v])=>v).map(([k])=>k);
      const payload = { email, password, role, name, surname, position, department, activity, competence: [], dashboards: dash };

      const res = await fetchWithAuth(
        "https://myit-backend-its-c20c9354ce42.herokuapp.com/api/admin/create-user/",
        { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify(payload) }
      );
      if (!res.ok) {
        if (res.status === 409)
          return showMessage(`Un utilisateur avec l'email ${email} existe déjà`, "error");
        let err = "Erreur serveur";
        try { const errData = await res.json(); err = errData.detail||err; } catch {}
        throw new Error(err);
      }

      await res.json();
      setCreatedUser({ email, password, name, surname, position, department, role, access: dash });
      setShowCredentials(true);
      showMessage("Utilisateur ajouté avec succès !");
      // reset form
      setEmail(""); setPassword(""); setName(""); setSurname("");
      setPosition(""); setDepartment(""); setActivity("");
      setAccess({ HISPEED:false, FTTH:false, DSL:false, FTTB:false, EARF:false, EARFT:false, ARTHUIS:false, MYFILE:false, MYFORUM:true });
    } catch (err) {
      showMessage("Erreur lors de l'ajout : " + err.message, "error");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteEmail.trim()) return showMessage("Veuillez saisir une adresse email valide", "error");
    try {
      const res = await fetchWithAuth(
        "https://myit-backend-its-c20c9354ce42.herokuapp.com/api/admin/delete-user/",
        { method:"DELETE", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify({email:deleteEmail}) }
      );
      if (!res.ok) {
        let err="Erreur de suppression";
        try { const ed=await res.json(); err=ed.detail||err; } catch {}
        throw new Error(err);
      }
      await res.json();
      showMessage("Utilisateur supprimé avec succès !");
      setDeleteEmail("");
    } catch (err) {
      showMessage("Erreur : " + err.message, "error");
    }
  };

  const copyToClipboard = () => {
    // Utiliser les noms d'affichage pour la copie
    const accessDisplay = createdUser.access.map(key => dashboardConfig[key] || key).join(", ") || "Aucun";
    const txt = `Identifiants utilisateur :\nEmail : ${createdUser.email}\nMot de passe : ${createdUser.password}\nAccès : ${accessDisplay}`;
    navigator.clipboard.writeText(txt);
    setCopyMessage("✅ Identifiants copiés !");
    setTimeout(()=>setCopyMessage(""),2000);
  };

  const selectAll = () => {
    const all = {}; Object.keys(access).forEach(k=>all[k]=true);
    setAccess(all);
  };
  const clearAll = () => {
    const none = {}; Object.keys(access).forEach(k=>none[k]=false);
    none.MYFORUM = true;
    setAccess(none);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {message.text && (
        <div className={`p-4 rounded-md ${message.type==="error"?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>
          {message.type==="error"?"❌ ":"✅ "}{message.text}
        </div>
      )}

      {/* Ajouter un utilisateur */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-100">
        <div className="flex items-center mb-6">
          <User className="mr-3 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">Ajouter Un Utilisateur</h2>
        </div>

        <div className="space-y-4">
          {/* E-mail */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">
              E-mail <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="Adresse E-mail"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={extractNameFromEmail}
            />
          </div>

          {/* Mot de passe */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="flex-1 flex items-center space-x-3">
              <input
                type="text"
                readOnly
                className="flex-grow border border-gray-300 rounded-md p-2 bg-gray-50 text-black"
                value={password}
              />
              <button
                onClick={generatePassword}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
              >
                <Key size={18} /><span>Générer</span>
              </button>
            </div>
          </div>

          {/* Prénom */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Prénom"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Nom */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nom"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black"
              value={surname}
              onChange={e => setSurname(e.target.value)}
            />
          </div>

          {/* Poste */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">
              Poste <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Poste occupé"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black"
              value={position}
              onChange={e => setPosition(e.target.value)}
            />
          </div>

          {/* Département */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">
              Département <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Département"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black"
              value={department}
              onChange={e => setDepartment(e.target.value)}
            />
          </div>

          {/* Activité */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-2">
            <label className="w-32 text-gray-700 font-medium pt-2">Activité</label>
            <textarea
              placeholder="Description de l'activité (optionnel)"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black h-24"
              value={activity}
              onChange={e => setActivity(e.target.value)}
            />
          </div>

          {/* Rôle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">
              Rôle <span className="text-red-500">*</span>
            </label>
            <select
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black"
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>

          {/* Accès Dashboards */}
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="w-32 text-gray-700 font-medium pt-1">Dashboards</label>
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <button onClick={selectAll} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Shield size={16}/> Tout sélectionner
                </button>
                <button onClick={clearAll} className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1">
                  <Shield size={16}/> Tout désélectionner
                </button>
              </div>
              {/* grille pour les dashboards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border border-gray-100 rounded-md p-3 bg-gray-50">
                {Object.entries(dashboardConfig).map(([key, displayName]) => (
                  <label key={key} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded">
                    <input
                      type="checkbox"
                      checked={access[key]}
                      onChange={()=>handleAccessChange(key)}
                      className="rounded text-blue-500 focus:ring-blue-200"
                    />
                    <span className="text-gray-700">{displayName}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* MyForum - maintenant présenté comme les autres champs du formulaire */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">MyForum</label>
            <div className="flex-1">
              <label className="flex items-center gap-2 hover:bg-gray-50 rounded inline-block p-1">
                <input
                  type="checkbox"
                  checked={access.MYFORUM}
                  onChange={()=>handleAccessChange("MYFORUM")}
                  className="rounded text-blue-500 focus:ring-blue-200"
                />
                <span className="text-gray-700">Activer l'accès MyForum</span>
              </label>
            </div>
          </div>

          {/* MyFile - maintenant présenté comme les autres champs du formulaire */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">MyFile</label>
            <div className="flex-1">
              <label className="flex items-center gap-2 hover:bg-gray-50 rounded inline-block p-1">
                <input
                  type="checkbox"
                  checked={access.MYFILE}
                  onChange={()=>handleAccessChange("MYFILE")}
                  className="rounded text-blue-500 focus:ring-blue-200"
                />
                <span className="text-gray-700">Activer l'accès MyFile</span>
                <span className="text-gray-500 text-sm">(pour les techleads)</span>
              </label>
            </div>
          </div>

          {/* Bouton Ajouter */}
          <div className="flex justify-end">
            <button
              onClick={handleAddUser}
              className="mt-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md flex items-center gap-2"
            >
              <User size={18}/> <span>Ajouter l'utilisateur</span>
            </button>
          </div>
        </div>
      </div>

      {/* Identifiants générés */}
      {showCredentials && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-md shadow space-y-3">
          <h3 className="flex items-center gap-2 font-semibold text-gray-800">
            <FileText size={18} className="text-blue-600"/> Identifiants à transmettre :
          </h3>
          <div className="bg-white p-3 rounded border border-gray-200">
            <p><strong>Email :</strong> {createdUser.email}</p>
            <p><strong>Mot de passe :</strong> {createdUser.password}</p>
            <p><strong>Accès :</strong> {createdUser.access.map(key => dashboardConfig[key] || key).join(", ") || "Aucun"}</p>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              <Copy size={18}/> Copier
            </button>
            {copyMessage && <span className="text-green-600 text-sm">{copyMessage}</span>}
          </div>
        </div>
      )}

      {/* Supprimer un utilisateur */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-100">
        <div className="flex items-center mb-6">
          <Trash2 className="mr-3 text-red-600"/>
          <h2 className="text-xl font-bold text-gray-800">Supprimer Un Utilisateur</h2>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-32 text-gray-700 font-medium">E-mail</label>
            <input
              type="email"
              placeholder="Adresse E-mail à supprimer"
              className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-red-200 text-black"
              value={deleteEmail}
              onChange={e => setDeleteEmail(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleDeleteUser}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md flex items-center gap-2"
            >
              <Trash2 size={18}/> <span>Supprimer l'utilisateur</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}