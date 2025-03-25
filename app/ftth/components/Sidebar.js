import Image from 'next/image';
import { AiOutlineDashboard, AiOutlineMessage, AiOutlineRobot, AiOutlineFile, AiOutlineUser, AiOutlineSetting, AiOutlineLogout, AiOutlineQuestionCircle } from 'react-icons/ai';

export default function Sidebar() {
  return (
    <div className="h-screen w-56 bg-white shadow-md flex flex-col justify-between py-6">
      
      {/* Partie supérieure : Logo */}
      <div className="flex flex-col items-center">
        <Image src="/logo-myit.png" alt="MyIT Logo" width={200} height={200} />
      </div>

      {/* Menu de navigation */}
      <nav className="flex flex-col space-y-4 flex-1 px-6 mt-4">
        {/* Groupe 1 */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-[#4f72c3] font-semibold">
            <AiOutlineDashboard size={18} />
            <span>Dashboard</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3] cursor-pointer">
            <AiOutlineMessage size={18} />
            <span>MyForum</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3] cursor-pointer">
            <AiOutlineRobot size={18} />
            <span>MyAI</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3] cursor-pointer">
            <AiOutlineFile size={18} />
            <span>MyFile</span>
          </div>
        </div>

        {/* Groupe 2 */}
        <div className="border-t border-gray-300 pt-4 space-y-4">
          <div className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3] cursor-pointer">
            <AiOutlineUser size={18} />
            <span>Mon Profil</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3] cursor-pointer">
            <AiOutlineSetting size={18} />
            <span>Paramètres</span>
          </div>
          <div className="flex items-center space-x-2 text-red-500 hover:text-red-600 cursor-pointer">
            <AiOutlineLogout size={18} />
            <span>Se déconnecter</span>
          </div>
        </div>

        {/* Groupe 3 : Aide */}
        <div className="border-t border-gray-300 pt-4 space-y-4">
          <div className="flex items-center space-x-2 text-gray-700 hover:text-[#4f72c3] cursor-pointer">
            <AiOutlineQuestionCircle size={18} />
            <span>Aide</span>
          </div>
        </div>
      </nav>

      {/* Logos alignés en bas */}
      <div className="flex justify-center items-center space-x-2 px-6">
        <Image src="/logo-sfr.png" alt="SFR" width={40} height={40} />
        <Image src="/logo-intelcia.png" alt="Intelcia IT Solutions" width={100} height={40} />
      </div>

    </div>
  );
}
