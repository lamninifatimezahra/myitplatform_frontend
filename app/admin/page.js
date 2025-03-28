'use client';

import useAuth from "@/hooks/useAuth";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import PageCentrale from "./components/PageCentrale";

export default function AdminPage() {
  const { user, loading } = useAuth("admin"); // 🔐 admin seulement

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        Chargement sécurisé...
      </div>
    );
  }

  return (
    <div className="flex bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <PageCentrale />
      </div>
    </div>
  );
}
