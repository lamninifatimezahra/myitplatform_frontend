import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const baseConfig = {
  reactStrictMode: true,
};

const pwaConfig = withPWA({
  ...baseConfig,
  pwa: {
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development", // désactive PWA en dev
  },
});

const nextConfig = {
  ...pwaConfig,
  eslint: {
    ignoreDuringBuilds: true, // ✅ maintenant ici ça ne casse rien
  },
};

export default nextConfig;
