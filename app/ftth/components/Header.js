"use client";
import { FaSearch, FaBell } from "react-icons/fa";
import ProfileMenu from "./ProfileMenu";
import NotificationMenu from "./NotificationMenu";
import DateFilter from "./DateFilter"; // ✅ Intégration du filtre de date

const Header = () => {
  return (
    <header className="bg-white shadow-md px-6 py-4 flex flex-col">
      {/* Première ligne : Titre + Barre de recherche + Profil */}
      <div className="flex items-center justify-between">
        {/* Titre et message de bienvenue */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            <span className="text-blue-600">Dashboard FTTH</span>
          </h1>
          <p className="text-gray-500">Bienvenue, Ayoub!</p>
        </div>

        {/* Barre de recherche + Icônes */}
        <div className="flex items-center space-x-6">
          {/* Barre de recherche */}
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ease-in-out"
            />
            <FaSearch className="absolute right-3 top-3 text-gray-400" />
          </div>

          {/* Menu Notifications */}
          <NotificationMenu />

          {/* Menu Profil */}
          <ProfileMenu />
        </div>
      </div>

      {/* Deuxième ligne : Filtre de date + Actions */}
      <div className="mt-4 flex items-center justify-between">
        <DateFilter /> 
      </div>
    </header>
  );
};

export default Header;
