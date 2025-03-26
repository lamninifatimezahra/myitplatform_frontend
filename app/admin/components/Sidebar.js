'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import {
  AiOutlineDashboard,
  AiOutlineMessage,
  AiOutlineRobot,
  AiOutlineFile,
  AiOutlineUser,
  AiOutlineSetting,
  AiOutlineLogout,
  AiOutlineQuestionCircle,
} from 'react-icons/ai';

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="h-screen w-56 bg-white shadow-md flex flex-col justify-between py-6">
      <div className="flex flex-col items-center">
        <Image src="/logo-myit.png" alt="MyIT Logo" width={200} height={200} />
      </div>

      <nav className="flex flex-col space-y-4 flex-1 px-6 mt-4">
        <div className="space-y-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-[#4f72c3] font-semibold focus:outline-none"
          >
            <AiOutlineDashboard size={18} />
            <span>Dashboard</span>
          </button>
          {isExpanded && (
            <ul className="ml-6 space-y-1 text-sm text-gray-700">
              <li><Link href="/hispeed" className="hover:text-[#4f72c3]">HISPEED</Link></li>
              <li><Link href="/ftth" className="hover:text-[#4f72c3]">FTTH</Link></li>
              <li><Link href="/fttb" className="hover:text-[#4f72c3]">FTTB</Link></li>
              <li><Link href="/dsl" className="hover:text-[#4f72c3]">DSL</Link></li>
            </ul>
          )}
          <Link href="/forum" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
            <AiOutlineMessage size={18} />
            <span>MyForum</span>
          </Link>
          <Link href="/ai" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
            <AiOutlineRobot size={18} />
            <span>MyAI</span>
          </Link>
          <Link href="/files" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
            <AiOutlineFile size={18} />
            <span>MyFile</span>
          </Link>
        </div>

        <div className="border-t border-gray-300 pt-4 space-y-4">
          <Link href="/admin" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
            <AiOutlineUser size={18} />
            <span>Mon Profil</span>
          </Link>
          <Link href="/settings" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
            <AiOutlineSetting size={18} />
            <span>Paramètres</span>
          </Link>
          <Link href="/logout" className="flex items-center space-x-2 text-red-500 hover:text-red-600">
            <AiOutlineLogout size={18} />
            <span>Se Déconnecter</span>
          </Link>
        </div>

        <div className="border-t border-gray-300 pt-4 space-y-4">
          <Link href="/help" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
            <AiOutlineQuestionCircle size={18} />
            <span>Aide</span>
          </Link>
        </div>
      </nav>

      <div className="flex justify-center items-center space-x-2 px-6">
        <Image src="/logo-sfr.png" alt="SFR" width={40} height={40} />
        <Image src="/intelcia_it_solutions_logo.jpg" alt="Intelcia IT Solutions" width={100} height={40} />
      </div>
    </div>
  );
}
