'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AiOutlineDashboard,
  AiOutlineMessage,
  AiOutlineRobot,
  AiOutlineFile,
  AiOutlineUser,
  AiOutlineSetting,
  AiOutlineLogout,
  AiOutlineQuestionCircle
} from 'react-icons/ai';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDashboards, setShowDashboards] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <div
      className={`h-screen bg-white shadow-md flex flex-col justify-between py-6 transition-all duration-300 ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div className="flex justify-center mb-4">
        <Image src="/logo-myit.png" alt="MyIT Logo" width={isExpanded ? 300 : 40} height={40} />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-4 flex-1 px-2">
        {/* Dashboards Expandable */}
        <div>
          <button
            onClick={() => setShowDashboards(!showDashboards)}
            className="flex items-center space-x-2 text-[#4f72c3] font-semibold w-full"
          >
            <AiOutlineDashboard size={18} />
            {isExpanded && <span>Dashboard</span>}
            {isExpanded && (showDashboards ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />)}
          </button>

          {showDashboards && (
            <ul className="ml-6 mt-2 space-y-1 text-sm text-gray-700">
              <li><Link href="/hispeed" className="hover:text-[#4f72c3]">HISPEED</Link></li>
              <li><Link href="/ftth" className="hover:text-[#4f72c3]">FTTH</Link></li>
              <li><Link href="/fttb" className="hover:text-[#4f72c3]">FTTB</Link></li>
              <li><Link href="/dsl" className="hover:text-[#4f72c3]">DSL</Link></li>
            </ul>
          )}
        </div>

        {/* Autres liens */}
        <Link href="/forum" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
          <AiOutlineMessage size={18} />
          {isExpanded && <span>MyForum</span>}
        </Link>
        <Link href="/ai" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
          <AiOutlineRobot size={18} />
          {isExpanded && <span>MyAI</span>}
        </Link>
        <Link href="/files" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
          <AiOutlineFile size={18} />
          {isExpanded && <span>MyFile</span>}
        </Link>

        {/* Profil & paramètres */}
        <div className="border-t border-gray-300 pt-4 space-y-4">
          <Link href="/admin" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
            <AiOutlineUser size={18} />
            {isExpanded && <span>Mon Profil</span>}
          </Link>
          <Link href="/settings" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
            <AiOutlineSetting size={18} />
            {isExpanded && <span>Paramètres</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-red-500 hover:text-red-600 w-full"
          >
            <AiOutlineLogout size={18} />
            {isExpanded && <span>Se Déconnecter</span>}
          </button>
        </div>

        {/* Aide */}
        <div className="border-t border-gray-300 pt-4 space-y-4">
          <Link href="/help" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
            <AiOutlineQuestionCircle size={18} />
            {isExpanded && <span>Aide</span>}
          </Link>
        </div>
      </nav>

      {/* Logos partenaires */}
      <div className={`flex justify-center items-center space-x-2 transition-all duration-300 ${
        isExpanded ? 'opacity-100' : 'opacity-0 hidden'
      }`}>
        <Image src="/logo-sfr.png" alt="SFR" width={40} height={40} />
        <Image src="/intelcia_it_solutions_logo.jpg" alt="Intelcia IT Solutions" width={100} height={40} />
      </div>
    </div>
  );
}
