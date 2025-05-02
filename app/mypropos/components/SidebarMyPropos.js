'use client';

import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  AiOutlineHome,
  AiOutlineArrowLeft,
  AiOutlineLogout,
  AiOutlineUser,
  AiOutlineBulb,
  AiOutlineSend,
  AiOutlineFileSearch,
  AiOutlineTeam,
} from 'react-icons/ai';
import { motion, AnimatePresence } from 'framer-motion';
import useAuth from '@/hooks/useAuth';
import fetchWithAuth from '@/utils/fetchWithAuth';

export default function SidebarMyPropos({ sidebarOpen, setSidebarOpen }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await fetchWithAuth('https://myit-backend-ed72239b4b8e.herokuapp.com/api/logout/', {
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
      {/* Sidebar mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-[90]"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              key="sidebar"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3 }}
              className="fixed top-0 left-0 w-64 h-screen bg-white shadow-lg z-[100] flex flex-col justify-between p-6 overflow-y-auto"
            >
              <SidebarContent
                pathname={pathname}
                handleLogout={handleLogout}
                closeSidebar={() => setSidebarOpen(false)}
                user={user}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar desktop */}
      <div className="hidden md:flex w-64 h-screen bg-white shadow flex-col">
        <div className="flex flex-col p-6 gap-4 overflow-y-auto flex-grow max-h-[calc(100vh-100px)]">
          <SidebarContent pathname={pathname} handleLogout={handleLogout} user={user} />
        </div>

        {/* Logos */}
        <div className="flex justify-center items-center space-x-2 p-4 border-t border-gray-200">
          <Image src="/logo-sfr.png" alt="SFR" width={40} height={40} />
          <Image src="/intelcia_it_solutions_logo.jpg" alt="Intelcia IT Solutions" width={100} height={40} />
        </div>
      </div>
    </>
  );
}

function SidebarContent({ pathname, handleLogout, closeSidebar, user }) {
  const items = [
    { icon: <AiOutlineHome size={22} />, text: 'Accueil', href: '/mypropos' },
    { icon: <AiOutlineSend size={22} />, text: 'Proposer', href: '/mypropos/proposer' },
    { icon: <AiOutlineFileSearch size={22} />, text: 'Mes propositions', href: '/mypropos/mespropositions' },
    { icon: <AiOutlineTeam size={22} />, text: 'Collaborateurs', href: '/mypropos/collaborateurs' },
  ];

  return (
    <>
      {/* Logo */}
      <div className="flex justify-center shrink-0 mb-4">
        <a href="/acceuil" className="hover:opacity-90 transition">
          <Image src="/logo-myit.png" alt="MyIT Logo" width={250} height={40} />
        </a>
      </div>

      {/* Liens */}
      <nav className="flex flex-col space-y-3">
        {items.map(({ icon, text, href }) => (
          <SidebarItem
            key={text}
            icon={icon}
            text={text}
            href={href}
            pathname={pathname}
            onClick={closeSidebar}
          />
        ))}

        {/* Admin */}
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

        {/* Retour / Déconnexion */}
        <div className="pt-4 border-t border-gray-300 mt-4">
          <SidebarItem
            icon={<AiOutlineArrowLeft size={22} />}
            text="Retour MyIT"
            href="/acceuil"
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
  const isInactive = href === "#";

  const baseClass = `flex items-center px-3 py-2 rounded transition w-full`;
  const activeClass = isActive ? 'bg-[#31327e] text-white font-semibold' : '';
  const hoverClass = isInactive
    ? 'cursor-not-allowed text-gray-400'
    : 'text-gray-700 hover:text-[#31327e] hover:bg-gray-100';

  return (
    <a
      href={href}
      onClick={isInactive ? (e) => e.preventDefault() : onClick}
      className={`${baseClass} ${hoverClass} ${activeClass}`}
    >
      {icon}
      <span className="ml-3">{text}</span>
    </a>
  );
}
