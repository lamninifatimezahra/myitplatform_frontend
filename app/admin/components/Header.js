'use client';
import { AiOutlineSearch, AiOutlineBell, AiOutlineUser } from 'react-icons/ai';

export default function Header() {
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
          ALI Toumzite
        </div>
      </div>
    </header>
  );
}
