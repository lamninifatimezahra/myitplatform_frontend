"use client";
import { FaSearch } from "react-icons/fa";
import ProfileMenu from "./ProfileMenu";
import NotificationMenu from "./NotificationMenu";
import DateFilter from "./DateFilter";

const Header = () => {
  return (
    <header className="bg-white shadow-md px-6 py-4 flex flex-col space-y-3 sticky top-0 z-50">
      {/* Première ligne : Titre + Barre de recherche + Profil */}
      <div className="flex items-center justify-between">
        {/* Titre */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            <span className="text-blue-600">Dashboard FTTH</span>
          </h1>
          <p className="text-gray-500">Bienvenue, Ayoub!</p>
        </div>

        {/* Recherche + Notifications + Profil */}
        <div className="flex items-center space-x-6">
          <div className="relative w-60">
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <FaSearch className="absolute right-3 top-3 text-gray-400" />
          </div>
          <NotificationMenu />
          <ProfileMenu />
        </div>
      </div>

      {/* Deuxième ligne : Filtre de date */}
      <DateFilter />
    </header>
  );
};

export default Header;
