'use client';

import useAuth from "@/hooks/useAuth";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import PageCentrale from "./components/PageCentrale";

export default function AdminPage() {
  const { user, loading, authorized, hydrated } = useAuth(null, "admin");

  if (!hydrated || loading || !authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-white text-gray-600 text-xl">
        Chargement...
      </div>
    );
  }


  return (
<div className="flex bg-gray-50 min-h-screen">
  <Sidebar />
  <div className="flex flex-col flex-1 overflow-y-auto max-h-screen">
    <Header />
    <PageCentrale />
  </div>
</div>
  );
}
