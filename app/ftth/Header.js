'use client';
import { AiOutlineBell } from 'react-icons/ai';
import Image from 'next/image';

export default function Header() {
  return (
    <div className="flex justify-between items-center p-4 bg-white shadow-md">
      <div>
        <h1 className="text-xl font-semibold text-[#6f80ac]">Dashboard <span className="font-bold">FTTH</span></h1>
        <p className="text-gray-500">Bienvenue, Ayoub !</p>
      </div>

      <div className="flex items-center space-x-4">
        <AiOutlineBell size={24} className="text-[#6f80ac] cursor-pointer hover:text-[#68bddd]" />
        <div className="flex items-center space-x-2">
          <Image src="/profile.png" alt="User Profile" width={40} height={40} className="rounded-full" />
          <span className="font-semibold text-[#6f80ac]">Ayoub LAHDOUD</span>
        </div>
      </div>
    </div>
  );
}
