import Link from "next/link";
import Image from "next/image";
import { AiOutlineDashboard, AiOutlineMessage, AiOutlineSetting, AiOutlineUser, AiOutlineLogout, AiOutlineQuestionCircle } from "react-icons/ai";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white shadow-md min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 flex justify-center">
        <Image src="/logo-myit.png" alt="Logo" width={120} height={50} priority />
      </div>
      {/* Menu Links */}
      <nav className="flex-1 px-4">
        <ul className="space-y-4">
          <li>
            <Link href="/hispeed" className="flex items-center space-x-3 text-blue-700 font-bold">
              <AiOutlineDashboard size={24} />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/forum" className="flex items-center space-x-3 text-gray-600 hover:text-blue-500">
              <AiOutlineMessage size={24} />
              <span>MyForum</span>
            </Link>
          </li>
          <li>
            <Link href="/ai" className="flex items-center space-x-3 text-gray-600 hover:text-blue-500">
              <AiOutlineMessage size={24} />
              <span>MyAI</span>
            </Link>
          </li>
          <li>
            <Link href="/files" className="flex items-center space-x-3 text-gray-600 hover:text-blue-500">
              <AiOutlineMessage size={24} />
              <span>MyFile</span>
            </Link>
          </li>
        </ul>
      </nav>
      {/* Footer Links */}
      <div className="p-4 border-t">
        <ul className="space-y-4">
          <li>
            <Link href="/profile" className="flex items-center space-x-3 text-gray-600 hover:text-blue-500">
              <AiOutlineUser size={24} />
              <span>Mon Profil</span>
            </Link>
          </li>
          <li>
            <Link href="/settings" className="flex items-center space-x-3 text-gray-600 hover:text-blue-500">
              <AiOutlineSetting size={24} />
              <span>Paramètres</span>
            </Link>
          </li>
          <li>
            <Link href="/logout" className="flex items-center space-x-3 text-red-600 hover:text-red-800">
              <AiOutlineLogout size={24} />
              <span>Se Déconnecter</span>
            </Link>
          </li>
          <li>
            <Link href="/help" className="flex items-center space-x-3 text-gray-600 hover:text-blue-500">
              <AiOutlineQuestionCircle size={24} />
              <span>Aide</span>
            </Link>
          </li>
        </ul>
      </div>
      
      {/* Logo Intelcia IT Solutions */}
      <div className="p-4 flex justify-center border-t">
        <Image 
          src="/intelcia_it_solutions_logo.jpg" 
          alt="Intelcia IT Solutions" 
          width={200} 
          height={200} 
        />
      </div>
    </aside>
  );
}