export default async function fetchWithAuth(url, options = {}) {
  options.credentials = 'include';

  try {
    let res = await fetch(url, options);

    if (res.status === 401) {
      const refreshRes = await fetch("https://myit-backend-ed72239b4b8e.herokuapp.com/api/refresh/", {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        res = await fetch(url, options);
      } else {
        const error = new Error("Session expirée");
        error.status = 401;
        throw error;
      }
    }

    return res;
  } catch (error) {
    console.error("Erreur fetchWithAuth:", error);
    throw error;
  }
}
