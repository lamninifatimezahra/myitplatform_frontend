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
    disable: process.env.NODE_ENV === "development",
  },
});

const nextConfig = {
  ...pwaConfig,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['127.0.0.1', 'localhost','myit-backend-ed72239b4b8e.herokuapp.com'],
  },
};

export default nextConfig;
