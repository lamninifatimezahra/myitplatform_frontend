import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MyIT – Plateforme Intranet",
  description:
    "Portail collaboratif, connecté et intelligent pour les équipes d’Intelcia IT Solutions",
  icons: {
    icon: "/logo-myit.png", // ✅ Ici on utilise ton vrai logo
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        {/* ✅ Meta PWA */}
        <link rel="icon" href="/logo-myit.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#004aad" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-800`}
      >
        {children}
      </body>
    </html>
  );
}
