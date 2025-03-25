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
  AiOutlineQuestionCircle,
} from 'react-icons/ai';

export default function Sidebar() {
  return (
    <div className="h-screen w-56 bg-white shadow-md flex flex-col justify-between py-6">
      {/* Logo principal */}
      <div className="flex flex-col items-center">
        <Image src="/logo-myit.png" alt="MyIT Logo" width={200} height={200} />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-4 flex-1 px-6 mt-4">
        {/* Groupe 1 */}
        <div className="space-y-4">
          <Link href="/hispeed" className="flex items-center space-x-2 text-[#4f72c3] font-semibold">
            <AiOutlineDashboard size={18} />
            <span>Dashboard</span>
          </Link>
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

        {/* Groupe 2 */}
        <div className="border-t border-gray-300 pt-4 space-y-4">
          <Link href="/profile" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
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

        {/* Groupe 3 : Aide */}
        <div className="border-t border-gray-300 pt-4 space-y-4">
          <Link href="/help" className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3]">
            <AiOutlineQuestionCircle size={18} />
            <span>Aide</span>
          </Link>
        </div>
      </nav>

      {/* Logos partenaires en bas */}
      <div className="flex justify-center items-center space-x-2 px-6">
        <Image src="/logo-sfr.png" alt="SFR" width={40} height={40} />
        <Image src="/intelcia_it_solutions_logo.jpg" alt="Intelcia IT Solutions" width={100} height={40} />
      </div>
    </div>
  );
}
