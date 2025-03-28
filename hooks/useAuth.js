import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function useAuth(requiredRole = null, requiredDashboard = null) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [hydrated, setHydrated] = useState(false); // ✅
  const router = useRouter();

  useEffect(() => {
    // ✅ Marque que le composant est monté côté client
    setHydrated(true);

    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('http://localhost:8000/api/me/', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
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
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [requiredRole, requiredDashboard]);

  return { user, loading, authorized, hydrated };
}
