'use client';

import { useEffect, useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import fetchWithAuth from '@/utils/fetchWithAuth';

export default function ListeUtilisateurs() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetchWithAuth('https://myit-backend-ed72239b4b8e.herokuapp.com/api/admin/users/');

      if (!res.ok) {
        throw new Error(`Erreur serveur (${res.status})`);
      }

      const data = await res.json();
      setUsers(data || []);
    } catch (err) {
      console.error("Erreur lors du fetch:", err);
      setError("Impossible de récupérer les utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Liste des Utilisateurs</h2>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-[6px] border-t-[#31327e] border-b-[#6f80ac] border-l-transparent border-r-transparent animate-spin-custom" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[#31327e] font-bold">MyIT</span>
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
      ) : error ? (
        <div className="text-center text-red-600 font-semibold">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left border">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-2 border">Prénom</th>
                <th className="p-2 border">Nom</th>
                <th className="p-2 border">Poste</th>
                <th className="p-2 border">Département</th>
                <th className="p-2 border">Activité</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Rôle</th>
                <th className="p-2 border">Accès</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="p-2">{user.name || '-'}</td>
                  <td className="p-2">{user.surname || '-'}</td>
                  <td className="p-2">{user.position || '-'}</td>
                  <td className="p-2">{user.department || '-'}</td>
                  <td className="p-2">{user.activity || '-'}</td>
                  <td className="p-2">{user.email}</td>
                  <td className="p-2 capitalize">{user.role}</td>
                  <td className="p-2">{user.dashboards?.join(', ') || '-'}</td>
                  <td className="p-2 flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800" title="Modifier">
                      <Edit2 size={18} />
                    </button>
                    <button className="text-red-600 hover:text-red-800" title="Supprimer">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center text-gray-500 mt-6">
              Aucun utilisateur trouvé.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
