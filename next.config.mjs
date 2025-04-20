// next.config.js
import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ⛔ Ignore les erreurs ESLint pendant le build (utile pour Vercel)
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
};

export default withPWA({
  ...nextConfig,
  pwa: {
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development", // désactive PWA en dev
  },
});
