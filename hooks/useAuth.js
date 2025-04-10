import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function useAuth(requiredRole = null, requiredDashboard = null) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    setHydrated(true);

    const checkAuth = async () => {
      try {
        const res = await fetchWithAuth(`https://myit-backend-ed72239b4b8e.herokuapp.com/api/me/`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) throw new Error("Non autorisé");
        const data = await res.json();
        if (!isMounted) return;

        setUser(data);

        if (requiredRole && data.role !== requiredRole) {
          router.push('/unauthorized');
          return;
        }

        if (
          requiredDashboard &&
          data.role !== 'admin' &&
          !data.dashboards.includes(requiredDashboard)
        ) {
          router.push('/unauthorized');
          return;
        }

        setAuthorized(true);
      } catch (err) {
        if (isMounted) router.push('/login');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [requiredRole, requiredDashboard]);

  return { user, loading, authorized, hydrated };
}
