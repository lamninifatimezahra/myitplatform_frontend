"use client";

import { useState } from "react";
import { User, Trash2, Key, Copy } from "lucide-react";
import fetchWithAuth from "@/utils/fetchWithAuth";


export default function UserSection() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("user"); // ✅ Rôle de l'utilisateur
    const [deleteEmail, setDeleteEmail] = useState("");
    const [access, setAccess] = useState({
        HISPEED: false,
        FTTH: false,
        DSL: false,
        FTTB: false,
    });
    const [showCredentials, setShowCredentials] = useState(false);
    const [copyMessage, setCopyMessage] = useState("");

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let generated = "";
        for (let i = 0; i < 10; i++) {
            generated += chars[Math.floor(Math.random() * chars.length)];
        }
        setPassword(generated);
        setShowCredentials(false);
    };

    const handleAccessChange = (key) => {
        setAccess((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleAddUser = async () => {
        try {
            const res = await fetchWithAuth(`https://myit-backend-ed72239b4b8e.herokuapp.com/api/admin/create-user/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include", // ✅ ENVOI DES COOKIES
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
            alert("✅ Utilisateur ajouté avec succès !");
        } catch (err) {
            alert("❌ Erreur lors de l'ajout : " + err.message);
        }
    };
    
    const handleDeleteUser = async () => {
        try {
            const res = await fetchWithAuth(`https://myit-backend-ed72239b4b8e.herokuapp.com/api/admin/delete-user/`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include", // ✅ ENVOI DES COOKIES
                body: JSON.stringify({ email: deleteEmail }),
            });
    
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Erreur de suppression");
            }
    
            alert("✅ Utilisateur supprimé avec succès !");
        } catch (err) {
            alert("❌ Erreur : " + err.message);
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

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-8">
            {/* Ajouter un utilisateur */}
            <div className="bg-white shadow-md rounded-lg p-6 border border-gray-100">
                <div className="flex items-center mb-6">
                    <User className="mr-3 text-gray-600" />
                    <h2 className="text-xl font-bold text-gray-800">Ajouter Un Utilisateur</h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center">
                        <label className="w-32 text-gray-700 font-medium">E-mail</label>
                        <input
                            type="email"
                            placeholder="Adresse E-mail (intelcia.com ou sfr.com)"
                            className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-200 text-black placeholder:text-black"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center">
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

                    <div className="flex items-center">
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

                    <div className="flex items-start">
                        <label className="w-32 text-gray-700 font-medium pt-1">Accès au Dashboard</label>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                            {Object.keys(access).map((key) => (
                                <label key={key} className="flex items-center space-x-2">
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

                    <div className="flex justify-end">
                        <button
                            onClick={handleAddUser}
                            className="mt-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md flex items-center space-x-2"
                        >
                            <User size={18} />
                            <span>Ajouter l'utilisateur</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Section des identifiants copiables */}
            {showCredentials && (
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-md shadow space-y-3">
                    <h3 className="font-semibold text-gray-800">Identifiants à transmettre :</h3>
                    <pre className="bg-white p-3 rounded text-sm text-black overflow-x-auto whitespace-pre-wrap">
                        {`Email : ${email}
Mot de passe : ${password}
Rôle : ${role}
Accès : ${Object.entries(access).filter(([_, v]) => v).map(([k]) => k).join(", ") || "Aucun"}`}
                    </pre>
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
                    <Trash2 className="mr-3 text-gray-600" />
                    <h2 className="text-xl font-bold text-gray-800">Supprimer Un Utilisateur</h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center">
                        <label className="w-32 text-gray-700 font-medium">E-mail</label>
                        <input
                            type="email"
                            placeholder="Adresse E-mail (intelcia.com ou sfr.com)"
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
