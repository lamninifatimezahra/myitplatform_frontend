"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import fetchWithAuth from "@/utils/fetchWithAuth";

import {
  AiOutlineDashboard,
  AiOutlineMessage,
  AiOutlineRobot,
  AiOutlineFile,
  AiOutlineUser,
  AiOutlineSetting,
  AiOutlineLogout,
  AiOutlineArrowLeft,
} from "react-icons/ai";
import fetchWithAuth from "@/utils/fetchWithAuth";
import useAuth from "@/hooks/useAuth";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
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
    <div
      className={`h-screen bg-white shadow-md flex flex-col justify-between py-6 transition-[width] duration-100 ease-in-out 
      ${isOpen ? "w-56" : "w-16"}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Logo + retour admin */}
      <div className="flex flex-col items-center mb-4 space-y-2">
        <Image src="/logo-myit.png" alt="MyIT Logo" width={isOpen ? 200 : 100} height={40} />
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
        <SidebarItem
          icon={<AiOutlineDashboard size={24} />}
          text="Dashboard"
          href="/ftth"
          pathname={pathname}
          isOpen={isOpen}
          isFixed={true}
        />
        <SidebarItem icon={<AiOutlineMessage size={24} />} text="MyForum" href="/forum" pathname={pathname} isOpen={isOpen} />
        <SidebarItem icon={<AiOutlineRobot size={24} />} text="MyAI" href="/ai" pathname={pathname} isOpen={isOpen} />
        <SidebarItem icon={<AiOutlineFile size={24} />} text="MyFile" href="/file" pathname={pathname} isOpen={isOpen} />

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
      </nav>

      {/* Logos bas */}
      {isOpen && (
        <div className="flex justify-center items-center space-x-2">
          <Image src="/logo-sfr.png" alt="SFR" width={40} height={40} />
          <Image src="/logo-intelcia.png" alt="Intelcia IT Solutions" width={100} height={40} />
        </div>
      )}
    </div>
  );
}

function SidebarItem({ icon, text, href, pathname, isOpen, isFixed, isLogout = false, onClick }) {
  const isActive = pathname === href;

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
      className={`flex items-center px-3 py-2 rounded-lg transition-colors duration-100 cursor-pointer 
        ${isActive ? "bg-[#4f72c3] text-white font-semibold" : "text-gray-700 hover:text-[#4f72c3] hover:bg-gray-100"}
        ${isFixed ? "w-full" : ""}`}
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
