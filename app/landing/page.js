"use client";

import { useEffect, useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import IntroMyIT from "./components/IntroMyIT";
import Features from "./components/Features";
import Benefits from "./components/Benefits";
import ForumSection from "./components/ForumSection";
import Team from "./components/Team";
import NextStep from "./components/NextStep";
import GetStartedSection from "./components/GetStartedSection";
import Footer from "./components/Footer";
import ContactSection from "./components/ContactSection"; // 👈 Ajout
import Image from "next/image";

export default function LandingPage() {
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white relative">
        <div className="relative w-24 h-24">
          {/* Cercle Spinner */}
          <div className="absolute inset-0 border-[6px] border-t-[#31327e] border-b-[#6f80ac] border-l-transparent border-r-transparent rounded-full animate-spin-custom" />
          {/* Logo MyIT au centre */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/logo-myit-blanc.png"
              alt="Logo MyIT"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
        </div>

        <style jsx>{`
          @keyframes spin-custom {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
          .animate-spin-custom {
            animation: spin-custom 1.1s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-20">
        <Hero />
        <IntroMyIT />
        <Features />
        <Benefits />
        <ForumSection />
        <Team />
        <NextStep />
        <GetStartedSection />
        <ContactSection /> {/* 👈 Ajout ici juste avant le Footer */}
        <Footer />
      </main>
    </>
  );
}
