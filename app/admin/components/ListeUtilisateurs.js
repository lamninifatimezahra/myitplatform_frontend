'use client';
import React, { useEffect, useState } from 'react';
import fetchWithAuth from '@/utils/fetchWithAuth';
import { Copy, Key, RefreshCw } from 'lucide-react';

export default function ListeUtilisateurs() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({});
  const [credentialsToShow, setCredentialsToShow] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  const availableDashboards = ["HISPEED", "FTTH", "DSL", "FTTB", "EARF", "ARTHUIS", "MYFILE", "MYFORUM"];

  useEffect(() => {
    async function fetchUserAndList() {
      try {
        const res = await fetchWithAuth("https://api.606510.xyz/api/me/", { method: 'GET', credentials: 'include' });
        if (!res.ok) throw new Error('Utilisateur non trouvé');
        const user = await res.json();
        setCurrentUser(user);

        if (user.role === 'admin') {
          const allRes = await fetchWithAuth("https://api.606510.xyz/api/admin/users/", { method: 'GET', credentials: 'include' });
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
    setFormData({ 
      ...user,
      dashboards: user.dashboards || [] 
    });
    setCredentialsToShow(null);
    setMessage('');
    setShowResetConfirmation(false);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setFormData({});
    setCredentialsToShow(null);
    setShowResetConfirmation(false);
  };

  const handleUpdateUser = async () => {
    try {
      const res = await fetchWithAuth(`https://api.606510.xyz/api/admin/update-user/${editingUserId}/`, {
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
    return generated;
  };

  const handleResetPasswordClick = () => {
    setShowResetConfirmation(true);
  };

  const confirmResetPassword = async () => {
    setIsResettingPassword(true);
    
    // Générer automatiquement un nouveau mot de passe
    const newPassword = generatePassword();
    
    try {
      const res = await fetchWithAuth("https://api.606510.xyz/api/admin/reset-password/", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: editingUserId, new_password: newPassword }),
      });
      if (!res.ok) throw new Error("Échec de la réinitialisation du mot de passe");

      setCredentialsToShow({
        email: formData.email,
        password: newPassword,
        userId: editingUserId, // Ajouter l'ID de l'utilisateur
      });
      setMessage('Mot de passe réinitialisé avec succès');
      setShowResetConfirmation(false);
      // NE PAS appeler handleCancelEdit() ici pour garder l'affichage
    } catch (err) {
      setMessage(err.message || "Erreur lors de la réinitialisation");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const cancelResetPassword = () => {
    setShowResetConfirmation(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDashboardChange = (dashboard) => {
    setFormData((prev) => {
      const currentDashboards = prev.dashboards || [];
      const isSelected = currentDashboards.includes(dashboard);
      
      if (isSelected) {
        return {
          ...prev,
          dashboards: currentDashboards.filter(d => d !== dashboard)
        };
      } else {
        return {
          ...prev,
          dashboards: [...currentDashboards, dashboard]
        };
      }
    });
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

      <table className="w-full text-sm border border-gray-300 mb-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Nom</th>
            <th className="border px-2 py-1">Prénom</th>
            <th className="border px-2 py-1">Email</th>
            <th className="border px-2 py-1">Rôle</th>
            <th className="border px-2 py-1">Département</th>
            <th className="border px-2 py-1">Accès</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <React.Fragment key={u.id}>
              <tr className="text-center">
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
                    <td className="border px-2 py-1">
                      {formData.role === "admin" ? (
                        <span className="text-gray-500 italic">Accès libre</span>
                      ) : (
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {availableDashboards.map((dashboard) => (
                            <label key={dashboard} className="flex items-center space-x-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.dashboards?.includes(dashboard) || false}
                                onChange={() => handleDashboardChange(dashboard)}
                                className="w-3 h-3"
                              />
                              <span className="text-xs">{dashboard}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="border px-2 py-1">
                      <div className="space-y-2">
                        {/* Actions principales */}
                        <div className="flex gap-2">
                          <button 
                            onClick={handleUpdateUser} 
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                            ✓ Valider
                          </button>
                          <button 
                            onClick={handleCancelEdit} 
                            className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            ✕ Annuler
                          </button>
                        </div>
                        
                        {/* Bouton de réinitialisation ou confirmation */}
                        {!showResetConfirmation ? (
                          <button 
                            onClick={handleResetPasswordClick}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors"
                          >
                            <Key size={14} />
                            Réinitialiser le mot de passe
                          </button>
                        ) : (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 space-y-2">
                            <p className="text-sm text-yellow-800 font-medium">
                              ⚠️ Confirmer la réinitialisation ?
                            </p>
                            <p className="text-xs text-yellow-700">
                              Un nouveau mot de passe sera généré automatiquement.
                            </p>
                            <div className="flex gap-2">
                              <button 
                                onClick={confirmResetPassword}
                                disabled={isResettingPassword}
                                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-2 py-1 rounded text-xs flex items-center justify-center gap-1 transition-colors"
                              >
                                {isResettingPassword ? (
                                  <>
                                    <RefreshCw size={12} className="animate-spin" />
                                    Réinitialisation...
                                  </>
                                ) : (
                                  <>
                                    <Key size={12} />
                                    Confirmer
                                  </>
                                )}
                              </button>
                              <button 
                                onClick={cancelResetPassword}
                                disabled={isResettingPassword}
                                className="flex-1 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white px-2 py-1 rounded text-xs transition-colors"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
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
                    <td className="border px-2 py-1 text-xs">
                      {u.role === "admin" ? "Accès libre" : (u.dashboards?.length > 0 ? u.dashboards.join(', ') : 'Aucun')}
                    </td>
                    <td className="border px-2 py-1">
                      <button 
                        onClick={() => handleEditClick(u)} 
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        ✏️ Modifier
                      </button>
                    </td>
                  </>
                )}
              </tr>
              
              {/* Affichage des identifiants directement sous la ligne de l'utilisateur */}
              {credentialsToShow && credentialsToShow.userId === u.id && (
                <tr>
                  <td colSpan="7" className="border px-2 py-3 bg-green-50">
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Key size={16} className="text-green-600" />
                        </div>
                        <h3 className="font-semibold text-green-800">Mot de passe réinitialisé avec succès !</h3>
                      </div>
                      
                      <div className="bg-white border border-green-200 rounded-md p-4 mb-3">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <span className="block text-sm font-medium text-gray-700 mb-1">Email de connexion :</span>
                            <div className="font-mono text-sm bg-gray-50 p-2 rounded border">
                              {credentialsToShow.email}
                            </div>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe :</span>
                            <div className="font-mono text-sm bg-gray-50 p-2 rounded border">
                              {credentialsToShow.password}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <button 
                          onClick={copyCredentials} 
                          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors"
                        >
                          <Copy size={16} /> 
                          Copier les identifiants
                        </button>
                        {copyMessage && (
                          <span className="text-green-700 font-medium text-sm bg-green-100 px-3 py-1 rounded-full">
                            {copyMessage}
                          </span>
                        )}
                      </div>
                      
                      {/* Bouton pour fermer la zone des identifiants */}
                      <button 
                        onClick={() => setCredentialsToShow(null)}
                        className="mt-2 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Fermer
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}