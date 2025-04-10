'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  AiOutlineDashboard,
  AiOutlineMessage,
  AiOutlineRobot,
  AiOutlineFile,
  AiOutlineUser,
  AiOutlineSetting,
  AiOutlineLogout,
  AiOutlineArrowLeft,
} from 'react-icons/ai';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import fetchWithAuth from '@/utils/fetchWithAuth';
import useAuth from '@/hooks/useAuth';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDashboards, setShowDashboards] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const dashboards = ['hispeed', 'ftth', 'dsl', 'fttb'];
  const accessibleDashboards = user?.role === 'admin'
    ? dashboards
    : dashboards.filter(d => user?.dashboards?.includes(d.toUpperCase()));

  const isDashboardPage = dashboards.some(d => pathname.includes(d));

  const handleLogout = async () => {
    try {
      await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/api/logout/", {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Erreur de déconnexion :', error);
    } finally {
      router.push('/login');
    }
  };

  return (
    <div
      className={`h-screen bg-white shadow-md flex flex-col justify-between py-6 transition-all duration-300
        ${isOpen ? 'w-56' : 'w-16'}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Logo + retour admin */}
      <div className="flex flex-col items-center mb-4 space-y-2">
        <Image src="/logo-myit.png" alt="MyIT Logo" width={isOpen ? 200 : 40} height={40} />
        {user?.role === 'admin' && (
          <Link
            href="/admin"
            className={`flex items-center text-blue-600 hover:text-blue-800 transition-all duration-200 ${
              isOpen ? 'space-x-2' : 'justify-center'
            }`}
          >
            <AiOutlineArrowLeft size={18} />
            {isOpen && <span className="text-sm font-semibold">Admin</span>}
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-1 space-y-2 px-2">
        {/* Dashboard avec sous-menu */}
        <div>
          <button
            onClick={() => setShowDashboards(!showDashboards)}
            className={`flex items-center px-3 py-2 rounded-lg w-full transition-all duration-200 ${
              isDashboardPage ? 'bg-[#4f72c3] text-white font-semibold' : 'text-gray-700 hover:text-[#4f72c3] hover:bg-gray-100'
            } ${isOpen ? 'justify-start' : 'justify-center'}`}
          >
            <AiOutlineDashboard size={28} className={isDashboardPage ? 'text-white' : 'text-gray-700'} />
            {isOpen && (
              <>
                <span className="ml-3 text-base">Dashboard</span>
                <span className="ml-auto pr-2">
                  {showDashboards ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                </span>
              </>
            )}
          </button>

          {showDashboards && isOpen && (
            <ul className="ml-8 mt-2 space-y-1 text-sm text-gray-100">
              {accessibleDashboards.map((dash) => (
                <li key={dash}>
                  <Link
                    href={`/${dash}`}
                    className={`block px-2 py-1 rounded hover:text-[#4f72c3] ${
                      pathname === `/${dash}` ? 'font-bold text-[#4f72c3] bg-gray-100' : 'text-gray-700'
                    }`}
                  >
                    {dash.toUpperCase()}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Autres liens */}
        <SidebarItem icon={<AiOutlineMessage size={24} />} text="MyForum" href="/forum" pathname={pathname} isOpen={isOpen} />
        <SidebarItem icon={<AiOutlineRobot size={24} />} text="MyAI" href="/ai" pathname={pathname} isOpen={isOpen} />
        <SidebarItem icon={<AiOutlineFile size={24} />} text="MyFile" href="/file" pathname={pathname} isOpen={isOpen} />

        <div className="border-t border-gray-300 pt-4 space-y-2 mt-2">
          <SidebarItem icon={<AiOutlineUser size={24} />} text="Mon Profil" href="/profile" pathname={pathname} isOpen={isOpen} />
          <SidebarItem icon={<AiOutlineSetting size={24} />} text="Paramètres" href="/settings" pathname={pathname} isOpen={isOpen} />

          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-red-500 hover:text-red-600 hover:bg-gray-100 w-full"
            style={{ justifyContent: isOpen ? 'flex-start' : 'center' }}
          >
            <AiOutlineLogout size={24} />
            {isOpen && <span className="ml-3">Se Déconnecter</span>}
          </button>
        </div>
      </nav>

      {/* Logos SFR et Intelcia */}
      {isOpen && (
        <div className="flex justify-center items-center space-x-2 px-4">
          <Image src="/logo-sfr.png" alt="SFR" width={40} height={40} />
          <Image src="/logo-intelcia.png" alt="Intelcia IT Solutions" width={100} height={40} />
        </div>
      )}
    </div>
  );
}

// Item générique
function SidebarItem({ icon, text, href, pathname, isOpen, isLogout = false, onClick }) {
  const isActive = pathname === href;

  if (isLogout) {
    return (
      <button
        onClick={onClick}
        className="flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-red-500 hover:text-red-600 hover:bg-gray-100 w-full"
        style={{ justifyContent: isOpen ? 'flex-start' : 'center' }}
      >
        {icon}
        {isOpen && <span className="ml-3">{text}</span>}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 w-full
        ${isActive ? 'bg-[#4f72c3] text-white font-semibold' : 'text-gray-700 hover:text-[#4f72c3] hover:bg-gray-100'}`}
      style={{ justifyContent: isOpen ? 'flex-start' : 'center' }}
    >
      {icon}
      {isOpen && <span className="ml-3">{text}</span>}
    </Link>
  );
}
