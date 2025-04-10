'use client';
import { useEffect, useState } from 'react';
import fetchWithAuth from '@/utils/fetchWithAuth';

export default function ListeUtilisateurs() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/api/me/", {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) throw new Error('Impossible de récupérer l’utilisateur');

        const data = await res.json();
        setUser(data);
      } catch (err) {
        setError(err.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  return (
    <div className="bg-white p-6 rounded shadow-md">
      <h2 className="text-xl font-bold mb-4">Mon profil</h2>

      {loading && <p className="text-gray-600">Chargement...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && user && (
        <table className="w-full text-sm border border-gray-200">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-2 border">Email</th>
              <th className="px-4 py-2 border">Rôle</th>
              <th className="px-4 py-2 border">Dashboards</th>
              <th className="px-4 py-2 border">Date de création</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-center">
              <td className="px-4 py-2 border">{user.email}</td>
              <td className="px-4 py-2 border capitalize">{user.role}</td>
              <td className="px-4 py-2 border">
                {Array.isArray(user.dashboards) && user.dashboards.length > 0
                  ? user.dashboards.join(', ')
                  : 'Aucun'}
              </td>
              <td className="px-4 py-2 border">
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
