'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  AiOutlineHome, AiOutlinePlus, AiOutlineStar, AiOutlineCheckCircle,
  AiOutlineArrowLeft, AiOutlineLogout
} from 'react-icons/ai';
import { MdForum } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import useAuth from '@/hooks/useAuth';
import fetchWithAuth from '@/utils/fetchWithAuth';

export default function SidebarMyForum({ sidebarOpen, setSidebarOpen }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

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
    <>
      {/* Mobile menu (slide-in + overlay) */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-30"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Slide-in sidebar */}
            <motion.div
              key="sidebar"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3 }}
              className="fixed top-0 left-0 w-64 h-full md:h-screen bg-white shadow-lg z-40 flex flex-col justify-between p-6 overflow-y-auto"
            >
              <SidebarContent
                pathname={pathname}
                handleLogout={handleLogout}
                closeSidebar={() => setSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 h-screen bg-white shadow flex-col justify-between p-6">
        <SidebarContent pathname={pathname} handleLogout={handleLogout} />
      </div>
    </>
  );
}

function SidebarContent({ pathname, handleLogout, closeSidebar }) {
  const items = [
    { icon: <AiOutlineHome size={22} />, text: "Accueil", href: "/myforum" },
    { icon: <AiOutlinePlus size={22} />, text: "Créer un post", href: "/myforum/new" },
    { icon: <MdForum size={22} />, text: "Mes discussions", href: "/myforum/mine" },
    { icon: <AiOutlineCheckCircle size={22} />, text: "Résolus", href: "/myforum/resolved" },
    { icon: <AiOutlineStar size={22} />, text: "Favoris", href: "/myforum/favorites" },
  ];

  return (
    <>
      <div>
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Image src="/logo-myit.png" alt="MyIT Logo" width={250} height={40} />
        </div>

        {/* Navigation */}
        <nav className="flex flex-col space-y-3">
          {items.map(({ icon, text, href }) => (
            <SidebarItem
              key={href}
              icon={icon}
              text={text}
              href={href}
              pathname={pathname}
              onClick={closeSidebar}
            />
          ))}

          {/* Retour / logout */}
          <div className="pt-4 border-t border-gray-300">
            <SidebarItem
              icon={<AiOutlineArrowLeft size={22} />}
              text="Retour MyIT"
              href="/dashboard"
              pathname={pathname}
              onClick={closeSidebar}
            />
          </div>

          {/* Déconnexion */}
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 text-red-500 hover:text-red-600 hover:bg-gray-100 rounded transition"
          >
            <AiOutlineLogout size={22} />
            <span className="ml-3">Se Déconnecter</span>
          </button>

          {/* Bouton fermeture sur mobile */}
          {closeSidebar && (
            <button onClick={closeSidebar} className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline">
              Fermer le menu
            </button>
          )}
        </nav>
      </div>

      {/* Logos en bas */}
      <div className="mt-8 flex justify-center items-center space-x-2">
        <Image src="/logo-sfr.png" alt="SFR" width={40} height={40} />
        <Image src="/intelcia_it_solutions_logo.jpg" alt="Intelcia IT Solutions" width={100} height={40} />
      </div>
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
