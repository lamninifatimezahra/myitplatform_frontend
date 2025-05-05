export default async function fetchWithAuth(url, options = {}) {
  options.credentials = 'include';

  try {
    let res = await fetch(url, options);

    if (res.status === 401) {
      console.log("Token expiré, tentative de rafraîchissement...");
      
      // Tenter de rafraîchir le token
      const refreshRes = await fetch("https://myit-backend-ed72239b4b8e.herokuapp.com/api/refresh/", {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        console.log("Token rafraîchi avec succès");
        // Réessayer la requête originale avec le nouveau token
        res = await fetch(url, options);
        
        if (res.status === 401) {
          // Si on reçoit encore 401 même après rafraîchissement
          console.error("Authentification échouée même après rafraîchissement");
          window.location.href = '/login'; // Rediriger vers login
          const error = new Error("Session invalide");
          error.status = 401;
          throw error;
        }
      } else {
        console.error("Échec du rafraîchissement du token");
        // Gestion plus explicite de l'échec de rafraîchissement
        if (refreshRes.status === 401) {
          // Si refresh token est invalide/expiré
          window.location.href = '/login'; // Forcer redirection vers login
        }
        
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