'use client';

import { useState } from 'react';
import SidebarMyForum from './SidebarMyForum';
import HeaderForum from './HeaderForum';

export default function LayoutForum({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarMyForum sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <HeaderForum setSidebarOpen={setSidebarOpen} />
        <main className="p-4 md:p-8 space-y-8">{children}</main>
      </div>
    </div>
  );
}
