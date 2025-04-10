/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
      // ⛔ Ignore les erreurs ESLint pendant le build (utile pour Vercel)
      ignoreDuringBuilds: true,
    },
  };
  
  export default nextConfig;
  