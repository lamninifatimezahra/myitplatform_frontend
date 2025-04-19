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

export default function LandingPage() {
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
