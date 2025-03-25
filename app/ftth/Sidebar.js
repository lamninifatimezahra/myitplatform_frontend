'use client';
import { AiOutlineDashboard, AiOutlineFileText, AiOutlineSetting, AiOutlineLogout, AiOutlineQuestionCircle } from 'react-icons/ai';
import { MdForum, MdPerson } from 'react-icons/md';
import Image from 'next/image';

export default function Sidebar() {
  return (
    <div className="h-screen w-64 bg-white shadow-lg flex flex-col p-4">
      {/* Logo */}
      <div className="flex items-center justify-center mb-6">
        <Image src="/logo-myit.png" alt="MyIT Logo" width={150} height={150} />
      </div>

      {/* Navigation */}
      <nav className="space-y-4">
        <a href="#" className="flex items-center text-[#6f80ac] font-semibold p-3 hover:bg-gray-100 rounded-lg">
          <AiOutlineDashboard className="mr-3" size={20} /> Dashboard
        </a>
        <a href="#" className="flex items-center p-3 hover:bg-gray-100 rounded-lg">
          <MdForum className="mr-3" size={20} /> MyForum
        </a>
        <a href="#" className="flex items-center p-3 hover:bg-gray-100 rounded-lg">
          <AiOutlineFileText className="mr-3" size={20} /> MyFile
        </a>
        <a href="#" className="flex items-center p-3 hover:bg-gray-100 rounded-lg">
          <MdPerson className="mr-3" size={20} /> Mon Profil
        </a>
        <a href="#" className="flex items-center p-3 hover:bg-gray-100 rounded-lg">
          <AiOutlineSetting className="mr-3" size={20} /> Paramètres
        </a>
        <a href="#" className="flex items-center text-red-600 p-3 hover:bg-gray-100 rounded-lg">
          <AiOutlineLogout className="mr-3" size={20} /> Se déconnecter
        </a>
        <a href="#" className="flex items-center p-3 hover:bg-gray-100 rounded-lg">
          <AiOutlineQuestionCircle className="mr-3" size={20} /> Aide
        </a>
      </nav>
    </div>
  );
}
