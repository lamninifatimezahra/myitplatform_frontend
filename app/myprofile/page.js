'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import Header from './components/Header'
import fetchWithAuth from '@/utils/fetchWithAuth';
import useAuth from '@/hooks/useAuth';
import Image from 'next/image';

export default function MyProfile() {
  const { user, loading, hydrated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    position: '',
    department: '',
    activity: '',
    competence: [],
  });
  const [competenceInput, setCompetenceInput] = useState('');
  const [userId, setUserId] = useState(null);
  const [message, setMessage] = useState('');
  const [passwords, setPasswords] = useState({ new_password: '', confirm_password: '' });
  const [pwdMessage, setPwdMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetchData() {
      try {
        const meRes = await fetchWithAuth('https://myit-backend-ed72239b4b8e.herokuapp.com/api/me/', { method: 'GET', credentials: 'include' });
        const usersRes = await fetchWithAuth('https://myit-backend-ed72239b4b8e.herokuapp.com/api/admin/users/', { method: 'GET', credentials: 'include' });

        if (!meRes.ok || !usersRes.ok) throw new Error('Erreur chargement');
        const me = await meRes.json();
        const allUsers = await usersRes.json();
        const current = allUsers.find(u => u.email === me.email);
        if (!current) throw new Error('Utilisateur introuvable');

        setUserId(current.id);
        setFormData({
          name: me.name || '',
          surname: me.surname || '',
          email: me.email || '',
          position: me.position || '',
          department: me.department || '',
          activity: me.activity || '',
          competence: me.competence || [],
        });
      } catch (err) {
        setMessage('❌ ' + err.message);
      }
    }
    fetchData();
  }, []);

  const handleUpdate = async () => {
    // ✅ Vérification des champs obligatoires
    const fieldLabels = {
      name: 'Prénom',
      surname: 'Nom',
      position: 'Poste',
      department: 'Département',
    };

    for (const field in fieldLabels) {
      if (!formData[field] || formData[field].trim() === '') {
        setMessage(`❌ Le champ "${fieldLabels[field]}" est requis.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await fetchWithAuth(
        `https://myit-backend-ed72239b4b8e.herokuapp.com/api/me/update/`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || 'Échec de la mise à jour');
      setMessage('✅ Informations mises à jour avec succès.');
    } catch (err) {
      setMessage('❌ ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    const { new_password, confirm_password } = passwords;
    if (new_password !== confirm_password) {
      return setPwdMessage('❌ Les mots de passe ne correspondent pas.');
    }

    try {
      const res = await fetchWithAuth('https://myit-backend-ed72239b4b8e.herokuapp.com/api/change-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(passwords),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Erreur serveur');
      }
      setPwdMessage('✅ Mot de passe modifié avec succès.');
      setPasswords({ new_password: '', confirm_password: '' });
    } catch (err) {
      setPwdMessage('❌ ' + err.message);
    }
  };

  const handleCompetenceAdd = () => {
    const value = competenceInput.trim();
    if (value && !formData.competence.includes(value)) {
      setFormData((prev) => ({ ...prev, competence: [...prev.competence, value] }));
    }
    setCompetenceInput('');
  };

  const handleCompetenceRemove = (index) => {
    setFormData((prev) => ({
      ...prev,
      competence: prev.competence.filter((_, i) => i !== index),
    }));
  };

  if (!hydrated || !mounted || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white relative">
        <div className="relative w-24 h-24">
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

        <div className="p-6 max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-[#31327e] mb-6">Mon Profil</h1>

          {message && <p className="mb-4 text-sm">{message}</p>}

          <div className="space-y-4 bg-white p-6 rounded shadow-md border border-gray-100">
            {[{ label: 'Prénom', name: 'name' },
              { label: 'Nom', name: 'surname' },
              { label: 'Email', name: 'email', disabled: true },
              { label: 'Poste', name: 'position' },
              { label: 'Département', name: 'department' }].map(({ label, name, disabled }) => (
              <div className="flex flex-col sm:flex-row gap-2 items-center" key={name}>
                <label className="w-32 text-gray-700 font-medium">{label}</label>
                <input
                  name={name}
                  disabled={disabled}
                  className={`flex-1 border border-gray-300 rounded-md p-2 text-black ${disabled ? 'bg-gray-100' : 'bg-white'}`}
                  value={formData[name]}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [name]: e.target.value }))}
                />
              </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-2">
              <label className="w-32 text-gray-700 font-medium">Activité</label>
              <textarea
                className="flex-1 border border-gray-300 rounded-md p-2 text-black"
                rows={3}
                value={formData.activity}
                onChange={(e) => setFormData((prev) => ({ ...prev, activity: e.target.value }))}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-start">
              <label className="w-32 text-gray-700 font-medium pt-2">Compétences</label>
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-grow border border-gray-300 rounded-md p-2 text-black"
                    value={competenceInput}
                    onChange={(e) => setCompetenceInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCompetenceAdd()}
                    placeholder="Ajouter une compétence et appuyer sur Entrée"
                  />
                  <button
                    onClick={handleCompetenceAdd}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  >
                    Ajouter
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.competence.map((c, i) => (
                    <div
                      key={i}
                      className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full flex items-center gap-2"
                    >
                      {c}
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleCompetenceRemove(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleUpdate}
                disabled={isSaving}
                className={`px-6 py-2 rounded-md text-white flex items-center gap-2 ${
                  isSaving ? 'bg-green-400' : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isSaving && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}
                {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>

          <div className="mt-10 bg-white p-6 rounded shadow-md border border-gray-100 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Changer le mot de passe</h2>
            {pwdMessage && <p className="text-sm">{pwdMessage}</p>}

            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <label className="w-32 text-gray-700 font-medium">Nouveau mot de passe</label>
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-md p-2 text-black"
                value={passwords.new_password}
                onChange={(e) =>
                  setPasswords((prev) => ({ ...prev, new_password: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <label className="w-32 text-gray-700 font-medium">Confirmer</label>
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-md p-2 text-black"
                value={passwords.confirm_password}
                onChange={(e) =>
                  setPasswords((prev) => ({ ...prev, confirm_password: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handlePasswordChange}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
              >
                Modifier le mot de passe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
