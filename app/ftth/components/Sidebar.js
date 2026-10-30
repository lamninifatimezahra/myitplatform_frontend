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
  AiOutlineSetting,
  AiOutlineLogout,
  AiOutlineArrowLeft,
  AiOutlineUser,
} from 'react-icons/ai';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import useAuth from '@/hooks/useAuth';
import fetchWithAuth from '@/utils/fetchWithAuth';

export default function SidebarGeneral({ sidebarOpen, setSidebarOpen }) {
  const [showDashboards, setShowDashboards] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const dashboards = ['hispeed', 'ftth', 'dsl', 'fttb', 'earf', 'arthuis'];
  const accessibleDashboards = user?.role === 'admin'
    ? dashboards
    : dashboards.filter(d => user?.dashboards?.includes(d.toUpperCase()));

  const isDashboardPage = dashboards.some(d => pathname.includes(d));

  const handleLogout = async () => {
    try {
      await fetchWithAuth("https://api.606510.xyz/api/logout/", {
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
    <>
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-30"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              key="sidebar"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3 }}
              className="fixed top-0 left-0 w-64 h-full bg-white shadow-lg z-[100] flex flex-col justify-between p-6 overflow-y-auto"
              >
              <SidebarContent
                pathname={pathname}
                handleLogout={handleLogout}
                closeSidebar={() => setSidebarOpen(false)}
                showDashboards={showDashboards}
                setShowDashboards={setShowDashboards}
                isDashboardPage={isDashboardPage}
                accessibleDashboards={accessibleDashboards}
                user={user}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 h-screen bg-white shadow flex-col">
        <div className="flex flex-col p-6 gap-4 overflow-y-auto scrollbar-hide flex-grow max-h-[calc(100vh-100px)]">
          <SidebarContent
            pathname={pathname}
            handleLogout={handleLogout}
            showDashboards={showDashboards}
            setShowDashboards={setShowDashboards}
            isDashboardPage={isDashboardPage}
            accessibleDashboards={accessibleDashboards}
            user={user}
          />
        </div>

        {/* Logos en bas */}
        <div className="flex justify-center items-center space-x-2 p-4 border-t border-gray-200">
          <Image src="/logo-sfr.png" alt="SFR" width={40} height={40} />
          <Image src="/intelcia_it_solutions_logov7.png" alt="Intelcia IT Solutions" width={100} height={40} />
        </div>
      </div>
    </>
  );
}

function SidebarContent({
  pathname, handleLogout, closeSidebar,
  showDashboards, setShowDashboards,
  isDashboardPage, accessibleDashboards, user,
}) {
  return (
    <>
      <div className="flex justify-center shrink-0 mb-4">
        <Link href="/modules" onClick={closeSidebar}>
          <Image src="/logo-myitv4.png" alt="MyIT Logo" width={250} height={40} className="cursor-pointer" />
        </Link>
      </div>

      <nav className="flex flex-col space-y-3">
        <button
          onClick={() => setShowDashboards(!showDashboards)}
          className={`flex items-center px-3 py-2 rounded-lg w-full transition-all duration-200 ${
            isDashboardPage ? 'bg-[#31327e] text-white font-semibold' : 'text-gray-700 hover:text-[#31327e] hover:bg-gray-100'
          }`}
        >
          <AiOutlineDashboard size={22} />
          <span className="ml-3">Dashboard</span>
          <span className="ml-auto pr-2">
            {showDashboards ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
          </span>
        </button>

        {showDashboards && (
          <ul className="ml-6 mt-1 space-y-1 text-sm">
            {accessibleDashboards.map((dash) => (
              <li key={dash}>
                <Link
                  href={`/${dash}`}
                  className={`block px-3 py-1.5 rounded transition ${
                    pathname === `/${dash}` ? 'bg-[#e0e7ff] text-[#31327e] font-bold' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={closeSidebar}
                >
                  {dash.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <SidebarItem icon={<AiOutlineMessage size={22} />} text="MyForum" href="/myforum" pathname={pathname} onClick={closeSidebar} />
        <SidebarItem icon={<AiOutlineRobot size={22} />} text="MyAI" href="/myai" pathname={pathname} onClick={closeSidebar} />
        <SidebarItem icon={<AiOutlineFile size={22} />} text="MyFile" href="/myfile" pathname={pathname} onClick={closeSidebar} />
        <SidebarItem icon={<AiOutlineSetting size={22} />} text="Guide" href="/guide" pathname={pathname} onClick={closeSidebar} />

        {user?.role === 'admin' && (
          <div className="mt-6 pt-4 border-t border-gray-300">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 px-3">Espace Admin</h4>
            <SidebarItem
              icon={<AiOutlineUser size={22} />}
              text="Tableau de bord Admin"
              href="/admin"
              pathname={pathname}
              onClick={closeSidebar}
            />
          </div>
        )}

        <div className="pt-4 border-t border-gray-300 mt-4">
          <SidebarItem
            icon={<AiOutlineArrowLeft size={22} />}
            text="Retour en IT"
            href="/modules"
            pathname={pathname}
            onClick={closeSidebar}
          />
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 mt-2 text-red-500 hover:text-red-600 hover:bg-gray-100 rounded transition w-full"
          >
            <AiOutlineLogout size={22} />
            <span className="ml-3">Se Déconnecter</span>
          </button>
        </div>

        {closeSidebar && (
          <button onClick={closeSidebar} className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline">
            Fermer le menu
          </button>
        )}
      </nav>
    </>
  );
}

function SidebarItem({ icon, text, href, pathname, onClick }) {
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center px-3 py-2 rounded transition w-full ${
        isActive ? 'bg-[#31327e] text-white font-semibold' : 'text-gray-700 hover:text-[#31327e] hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="ml-3">{text}</span>
    </Link>
  );
}
