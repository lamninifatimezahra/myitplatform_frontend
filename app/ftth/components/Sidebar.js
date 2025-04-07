'use client';
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  AiOutlineDashboard, AiOutlineMessage, AiOutlineRobot, AiOutlineFile,
  AiOutlineUser, AiOutlineSetting, AiOutlineLogout, AiOutlineQuestionCircle,
  AiOutlineArrowLeft
} from "react-icons/ai";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import useAuth from "@/hooks/useAuth";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDashboards, setShowDashboards] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const dashboards = ['hispeed', 'ftth', 'dsl', 'fttb'];

  const userDashboards = user?.role === 'admin'
    ? dashboards
    : dashboards.filter(d => user?.dashboards?.includes(d.toUpperCase()));

    const handleLogout = async () => {
      try {
        await fetch('http://localhost:8000/api/logout/', {
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
      className={`h-screen bg-white shadow-md flex flex-col justify-between py-6 transition-all duration-300
      ${isOpen ? "w-56" : "w-16"}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Logo + lien Admin */}
      <div className="flex flex-col items-center mb-4 space-y-2">
        <Image src="/logo-myit.png" alt="MyIT Logo" width={isOpen ? 300 : 40} height={40} />
        {user?.role === "admin" && (
          <a
            href="/admin"
            className={`flex items-center text-blue-600 hover:text-blue-800 transition-all duration-200 ${
              isOpen ? "space-x-2" : "justify-center"
            }`}
          >
            <AiOutlineArrowLeft size={18} />
            {isOpen && <span className="text-sm font-semibold">Admin</span>}
          </a>
        )}
      </div>

      {/* Menu de navigation */}
      <nav className="flex flex-col flex-1 space-y-4 px-2">
        {/* Dashboard group expandable */}
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
            <ul className="ml-4 mt-2 space-y-1 text-sm">
              {userDashboards.map((dash) => (
                <li key={dash}>
                  <a
                    href={`/${dash}`}
                    className={`block ${
                      pathname === `/${dash}` ? "text-[#4f72c3] font-bold" : "text-gray-700"
                    } hover:text-[#4f72c3]`}
                  >
                    {isOpen ? dash.toUpperCase() : dash.charAt(0).toUpperCase()}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <SidebarItem icon={<AiOutlineMessage size={24} />} text="MyForum" href="/forum" pathname={pathname} isOpen={isOpen} />
        <SidebarItem icon={<AiOutlineRobot size={24} />} text="MyAI" href="/ai" pathname={pathname} isOpen={isOpen} />
        <SidebarItem icon={<AiOutlineFile size={24} />} text="MyFile" href="/file" pathname={pathname} isOpen={isOpen} />

        <div className="border-t border-gray-300 pt-4 space-y-4">
          <SidebarItem icon={<AiOutlineUser size={24} />} text="Mon Profil" href="/profile" pathname={pathname} isOpen={isOpen} />
          <SidebarItem icon={<AiOutlineSetting size={24} />} text="Paramètres" href="/settings" pathname={pathname} isOpen={isOpen} />
          <SidebarItem
            icon={<AiOutlineLogout size={24} className="text-red-500" />}
            text="Se déconnecter"
            isOpen={isOpen}
            isLogout={true}
            onClick={handleLogout}
          />
        </div>

        <div className="border-t border-gray-300 pt-4 space-y-4">
          <SidebarItem icon={<AiOutlineQuestionCircle size={24} />} text="Aide" href="/help" pathname={pathname} isOpen={isOpen} />
        </div>
      </nav>

      <div className={`flex justify-center items-center space-x-2 transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0 hidden"}`}>
        <Image src="/logo-sfr.png" alt="SFR" width={40} height={40} />
        <Image src="/logo-intelcia.png" alt="Intelcia IT Solutions" width={100} height={40} />
      </div>
    </div>
  );
}

function SidebarItem({ icon, text, href, pathname, isOpen, isLogout, onClick }) {
  const isActive = pathname === href;

  if (isLogout) {
    return (
      <button
        onClick={onClick}
        className="flex items-center px-3 py-2 text-red-500 hover:text-red-600 hover:bg-gray-100 w-full rounded-lg"
        style={{ justifyContent: isOpen ? "flex-start" : "center" }}
      >
        {icon}
        {isOpen && <span className="ml-3">{text}</span>}
      </button>
    );
  }

  return (
    <a
      href={href}
      className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer 
        ${isActive ? "bg-[#4f72c3] text-white font-semibold" : "text-gray-700 hover:text-[#4f72c3] hover:bg-gray-100"}`}
      style={{ justifyContent: isOpen ? "flex-start" : "center" }}
    >
      {icon}
      {isOpen && <span className="ml-3">{text}</span>}
    </a>
  );
}
