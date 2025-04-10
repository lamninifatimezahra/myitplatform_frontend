'use client';
import { useEffect, useState } from 'react';
import { AiOutlineSearch, AiOutlineBell, AiOutlineUser } from 'react-icons/ai';
import fetchWithAuth from '@/utils/fetchWithAuth';

export default function Header() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/api/me/", {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) throw new Error('Erreur lors de la récupération de l’utilisateur');

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  return (
    <header className="bg-white shadow-md flex justify-between items-center px-6 py-4">
      <div>
        <h1 className="text-xl font-bold text-blue-700">Page Admin</h1>
        <p className="text-gray-600">Bienvenue</p>
      </div>

      <div className="flex items-center space-x-4">
        <AiOutlineSearch size={24} className="text-gray-600" />
        <AiOutlineBell size={24} className="text-gray-600" />
        <div className="flex items-center text-gray-700 font-semibold">
          <AiOutlineUser size={24} className="mr-2" />
          {loading ? "Chargement..." : (user?.email || "Utilisateur")}
        </div>
      </div>
    </header>
  );
}
