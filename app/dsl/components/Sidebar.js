'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  AiOutlineDashboard, AiOutlineMessage, AiOutlineRobot, AiOutlineFile,
  AiOutlineUser, AiOutlineSetting, AiOutlineLogout, AiOutlineQuestionCircle,
  AiOutlineArrowLeft
} from 'react-icons/ai';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import fetchWithAuth from "@/utils/fetchWithAuth";
import useAuth from '@/hooks/useAuth';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDashboards, setShowDashboards] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const dashboards = ['hispeed', 'ftth', 'dsl', 'fttb'];
  const accessibleDashboards = user?.role === 'admin'
    ? dashboards
    : dashboards.filter(d => user?.dashboards?.includes(d.toUpperCase()));

    const handleLogout = async () => {
      try {
        await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/logout/`, {
          method: 'POST',
          credentials: 'include', // Envoie les cookies
        });
      } catch (error) {
        console.error('Erreur de déconnexion :', error);
      } finally {
        router.push('/login');
      }
    };

  return (
    <div
      className={`h-screen bg-white shadow-md flex flex-col justify-between py-6 transition-all duration-300 ${
        isOpen ? 'w-56' : 'w-16'
      }`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Logo + retour admin */}
      <div className="flex flex-col items-center mb-4 space-y-2">
        <Image src="/logo-myit.png" alt="MyIT Logo" width={isOpen ? 300 : 40} height={40} />
        {user?.role === 'admin' && (
          <a
            href="/admin"
            className={`flex items-center text-blue-600 hover:text-blue-800 transition-all duration-200 ${
              isOpen ? 'space-x-2' : 'justify-center'
            }`}
          >
            <AiOutlineArrowLeft size={18} />
            {isOpen && <span className="text-sm font-semibold">Admin</span>}
          </a>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-1 space-y-4 px-2">
        {/* Menu Dashboards */}
        <div>
          <button
            onClick={() => setShowDashboards(!showDashboards)}
            className="flex items-center space-x-2 text-[#4f72c3] font-semibold w-full"
          >
            <AiOutlineDashboard size={18} />
            {isOpen && <span>Dashboard</span>}
            {isOpen && (showDashboards ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />)}
          </button>

          {showDashboards && (
            <ul className="ml-6 mt-2 space-y-1 text-sm text-gray-700">
              {accessibleDashboards.map(dash => (
                <li key={dash}>
                  <Link href={`/${dash}`} className="hover:text-[#4f72c3]">
                    {dash.toUpperCase()}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <SidebarItem icon={<AiOutlineMessage size={24} />} text="MyForum" href="/forum" pathname={pathname} isOpen={isOpen} />
        <SidebarItem icon={<AiOutlineRobot size={24} />} text="MyAI" href="/ai" pathname={pathname} isOpen={isOpen} />
        <SidebarItem icon={<AiOutlineFile size={24} />} text="MyFile" href="/files" pathname={pathname} isOpen={isOpen} />

        <div className="border-t border-gray-300 pt-4 space-y-4">
          <SidebarItem icon={<AiOutlineUser size={24} />} text="Mon Profil" href="/profile" pathname={pathname} isOpen={isOpen} />
          <SidebarItem icon={<AiOutlineSetting size={24} />} text="Paramètres" href="/settings" pathname={pathname} isOpen={isOpen} />
          <SidebarItem
            icon={<AiOutlineLogout size={24} className="text-red-500" />}
            text="Se Déconnecter"
            isOpen={isOpen}
            isLogout={true}
            onClick={handleLogout}
          />
        </div>

        <div className="border-t border-gray-300 pt-4 space-y-4">
          <SidebarItem icon={<AiOutlineQuestionCircle size={24} />} text="Aide" href="/help" pathname={pathname} isOpen={isOpen} />
        </div>
      </nav>

      {/* Logos */}
      <div className={`flex justify-center items-center space-x-2 transition-all duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 hidden'
      }`}>
        <Image src="/logo-sfr.png" alt="SFR" width={40} height={40} />
        <Image src="/intelcia_it_solutions_logo.jpg" alt="Intelcia IT Solutions" width={100} height={40} />
      </div>
    </div>
  );
}

function SidebarItem({ icon, text, href, pathname, isOpen, isLogout = false, onClick }) {
  const isActive = pathname === href;

  const commonClasses = `flex items-center px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
    isActive ? 'bg-[#4f72c3] text-white font-semibold' : 'text-gray-700 hover:text-[#4f72c3] hover:bg-gray-100'
  }`;

  if (isLogout) {
    return (
      <button
        onClick={onClick}
        className="flex items-center px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer text-red-500 hover:text-red-600 hover:bg-gray-100 w-full"
        style={{
          justifyContent: isOpen ? 'flex-start' : 'center',
          textAlign: 'left',
        }}
      >
        {icon}
        {isOpen && <span className="ml-3">{text}</span>}
      </button>
    );
  }

  return (
    <a
      href={href}
      className={commonClasses}
      style={{
        justifyContent: isOpen ? 'flex-start' : 'center',
        textAlign: 'left',
        width: '100%',
      }}
    >
      {icon}
      {isOpen && <span className="ml-3">{text}</span>}
    </a>
  );
}
