// next.config.js
import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true, // ✅ Ne bloque pas le build Vercel
  },

  // ✅ PWA activée uniquement en prod
  pwa: {
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
  },
};

export default withPWA(nextConfig);
