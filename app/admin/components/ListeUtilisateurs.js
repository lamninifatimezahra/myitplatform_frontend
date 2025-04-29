'use client';
import { useEffect, useState } from 'react';
import fetchWithAuth from '@/utils/fetchWithAuth';
import { Copy, Key } from 'lucide-react';

export default function ListeUtilisateurs() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({});
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [credentialsToShow, setCredentialsToShow] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    async function fetchUserAndList() {
      try {
        const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/api/me/", { method: 'GET', credentials: 'include' });
        if (!res.ok) throw new Error('Utilisateur non trouvé');
        const user = await res.json();
        setCurrentUser(user);

        if (user.role === 'admin') {
          const allRes = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/api/admin/users/", { method: 'GET', credentials: 'include' });
          if (!allRes.ok) throw new Error('Impossible de charger les utilisateurs');
          const allUsers = await allRes.json();
          setUsers(allUsers);
        }
      } catch (err) {
        setMessage(err.message || 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }

    fetchUserAndList();
  }, []);

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setFormData({ ...user });
    setGeneratedPassword('');
    setCredentialsToShow(null);
    setMessage('');
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setFormData({});
    setGeneratedPassword('');
    setCredentialsToShow(null);
  };

  const handleUpdateUser = async () => {
    try {
      const res = await fetchWithAuth(`https://myit-backend-ed72239b4b8e.herokuapp.com/api/admin/update-user/${editingUserId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour de l'utilisateur");

      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      );
      setMessage('Utilisateur mis à jour avec succès');
      if (generatedPassword) {
        setCredentialsToShow({
          email: updated.email,
          password: generatedPassword,
        });
      }
      handleCancelEdit();
    } catch (err) {
      setMessage(err.message || "Erreur lors de la mise à jour");
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }
    setGeneratedPassword(generated);
  };

  const handleResetPassword = async () => {
    if (!generatedPassword) {
      setMessage('Veuillez générer un mot de passe d\'abord.');
      return;
    }

    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/api/admin/reset-password/", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: editingUserId, new_password: generatedPassword }),
      });
      if (!res.ok) throw new Error("Échec de la réinitialisation du mot de passe");

      setCredentialsToShow({
        email: formData.email,
        password: generatedPassword,
      });
      setMessage('Mot de passe réinitialisé avec succès');
    } catch (err) {
      setMessage(err.message || "Erreur lors de la réinitialisation");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const copyCredentials = () => {
    if (credentialsToShow) {
      const text = `Email : ${credentialsToShow.email}\nMot de passe : ${credentialsToShow.password}`;
      navigator.clipboard.writeText(text);
      setCopyMessage("✅ Identifiants copiés !");
      setTimeout(() => setCopyMessage(''), 3000);
    }
  };

  if (loading) return <p>Chargement...</p>;
  if (currentUser?.role !== 'admin') return <p className="text-red-500">Accès réservé aux administrateurs.</p>;

  return (
    <div className="bg-white p-6 rounded shadow-md">
      <h2 className="text-xl font-bold mb-4">Gestion des utilisateurs</h2>
      {message && <p className="text-blue-600 mb-4">{message}</p>}

      {/* Tableau Utilisateurs */}
      <table className="w-full text-sm border border-gray-300 mb-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Nom</th>
            <th className="border px-2 py-1">Prénom</th>
            <th className="border px-2 py-1">Email</th>
            <th className="border px-2 py-1">Rôle</th>
            <th className="border px-2 py-1">Département</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="text-center">
              {editingUserId === u.id ? (
                <>
                  <td className="border px-2 py-1">
                    <input name="name" value={formData.name} onChange={handleChange} className="w-full border rounded px-1" />
                  </td>
                  <td className="border px-2 py-1">
                    <input name="surname" value={formData.surname} onChange={handleChange} className="w-full border rounded px-1" />
                  </td>
                  <td className="border px-2 py-1">{u.email}</td>
                  <td className="border px-2 py-1">
                    <select name="role" value={formData.role} onChange={handleChange} className="w-full border rounded">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="border px-2 py-1">
                    <input name="department" value={formData.department} onChange={handleChange} className="w-full border rounded px-1" />
                  </td>
                  <td className="border px-2 py-1 space-y-1">
                    <div className="flex flex-col gap-2">
                      <button onClick={handleUpdateUser} className="bg-green-500 text-white px-2 py-1 rounded">Valider</button>
                      <button onClick={handleCancelEdit} className="bg-gray-300 px-2 py-1 rounded">Annuler</button>
                      <button onClick={generatePassword} className="bg-blue-500 text-white px-2 py-1 rounded flex items-center justify-center gap-1">
                        <Key size={16} /> Générer mot de passe
                      </button>
                      {generatedPassword && (
                        <button onClick={handleResetPassword} className="bg-indigo-500 text-white px-2 py-1 rounded">
                          Réinitialiser avec le mot de passe généré
                        </button>
                      )}
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="border px-2 py-1">{u.name}</td>
                  <td className="border px-2 py-1">{u.surname}</td>
                  <td className="border px-2 py-1">{u.email}</td>
                  <td className="border px-2 py-1 capitalize">{u.role}</td>
                  <td className="border px-2 py-1">{u.department}</td>
                  <td className="border px-2 py-1">
                    <button onClick={() => handleEditClick(u)} className="bg-yellow-500 text-white px-2 py-1 rounded">Modifier</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Identifiants générés affichés */}
      {credentialsToShow && (
        <div className="bg-gray-50 border border-gray-300 p-4 rounded-md shadow space-y-3">
          <h3 className="font-semibold text-gray-800">Identifiants :</h3>
          <div className="bg-white p-3 rounded border border-gray-200">
            <p><span className="font-semibold">Email :</span> {credentialsToShow.email}</p>
            <p><span className="font-semibold">Mot de passe :</span> {credentialsToShow.password}</p>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={copyCredentials} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              <Copy size={18} /> Copier
            </button>
            {copyMessage && <span className="text-green-600 text-sm">{copyMessage}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
