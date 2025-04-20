// ✅ next.config.js
import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // doit être à ce niveau, avant le wrap

  eslint: {
    ignoreDuringBuilds: true, // évite de bloquer le build sur Vercel
  },

  // ✅ PWA config correcte
  pwa: {
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development", // seulement en prod
  },
};

export default withPWA(nextConfig);
