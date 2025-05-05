"use client";

import useAuth from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MyForumLayout({ children }) {
  const { user, loading, authorized, hydrated } = useAuth(null, "MYFORUM");
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (hydrated && !loading && !authorized) {
      setRedirecting(true);
      router.replace("/unauthorized");
    }
  }, [hydrated, loading, authorized, router]);

  if (!hydrated || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white text-gray-600 text-xl">
        Chargement…
      </div>
    );
  }

  if (redirecting) return null; // éviter de voir un flash avant redirection

  return <>{children}</>;
}
