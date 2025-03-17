import { AiOutlineSearch, AiOutlineBell, AiOutlineUser, AiOutlineFilter, AiOutlineDownload } from "react-icons/ai";

export default function Header() {
  return (
    <header className="bg-white shadow-md flex justify-between items-center px-6 py-4">
      {/* Titre */}
      <div>
        <h1 className="text-xl font-bold text-blue-700">Dashboard HISPEED</h1>
        <p className="text-gray-600">Bienvenue</p>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-6">
        {/* Icônes */}
        <AiOutlineSearch size={24} className="text-gray-600 cursor-pointer hover:text-blue-500" />
        <AiOutlineBell size={24} className="text-gray-600 cursor-pointer hover:text-blue-500" />
        <AiOutlineUser size={24} className="text-gray-600 cursor-pointer hover:text-blue-500" />

        {/* Boutons */}
        <button className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition">
          <AiOutlineFilter className="text-gray-800" />
          <span className="text-gray-800">Filtrer</span>
        </button>
        <button className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition">
          <AiOutlineDownload className="text-gray-800" />
          <span className="text-gray-800">Télécharger CR</span>
        </button>
      </div>
    </header>
  );
}