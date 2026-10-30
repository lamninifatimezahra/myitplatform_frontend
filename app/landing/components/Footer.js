"use client";
import { FiFacebook, FiLinkedin } from "react-icons/fi";

export default function Footer() {
  return (
    <footer className="bg-[#f8f9fc] pt-16 pb-10 px-6 text-sm text-gray-600">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12 items-start">
        {/* Logo + Intro */}
        <div className="col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <img src="/logo-myitv4.png" alt="MyIT" className="w-12 h-12" />
            <h3 className="text-2xl font-extrabold text-[#004aad]">MyIT</h3>
          </div>
          <p className="text-gray-500">
            Plateforme intelligente, connectée et unifiée. Un intranet nouvelle génération pour les équipes d’Intelcia IT SOLUTIONS.
          </p>
          <div className="flex gap-4 mt-4 text-[#004aad] text-xl">
            <FiFacebook className="hover:text-[#5de0e6] transition cursor-pointer" />
            <FiLinkedin className="hover:text-[#5de0e6] transition cursor-pointer" />
          </div>
        </div>

        {/* Entreprise */}
        <div>
          <h4 className="font-semibold text-[#004aad] mb-3">Entreprise</h4>
          <ul className="space-y-2">
            <li className="hover:text-[#004aad] cursor-pointer">Notre équipe</li>
            <li className="hover:text-[#004aad] cursor-pointer">Projets internes</li>
            <li className="hover:text-[#004aad] cursor-pointer">Engagement qualité</li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-semibold text-[#004aad] mb-3">Support</h4>
          <ul className="space-y-2">
            <li className="hover:text-[#004aad] cursor-pointer">Documentation</li>
            <li className="hover:text-[#004aad] cursor-pointer">Centre d’aide</li>
            <li className="hover:text-[#004aad] cursor-pointer">Contact IT</li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold text-[#004aad] mb-3">Contact</h4>
          <p className="mb-1">
            Tél : <span className="text-[#004aad] font-medium">+212 6 12 34 56 78</span>
          </p>
          <p>
            Email : <span className="text-[#004aad] font-medium">myit@intelcia.com</span>
          </p>
        </div>

        {/* Newsletter propre et esthétique */}
        <div>
          <h4 className="font-semibold text-[#004aad] mb-3">Newsletter</h4>
          <p className="text-gray-500 mb-4">
            Abonnez-vous pour recevoir les mises à jour.
          </p>
          <div className="relative w-full">
            <input
              type="email"
              placeholder="Email address"
              className="w-full rounded-full border border-gray-300 py-2.5 px-5 pr-12 shadow-sm outline-none text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#5de0e6] transition"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#004aad] transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-200 mt-12 pt-6 text-center text-xs text-gray-500">
        <div className="flex flex-wrap justify-center gap-4 mb-2">
          <a href="#" className="hover:text-[#004aad]">Français</a>
          <a href="#" className="hover:text-[#004aad]">Politique de confidentialité</a>
          <a href="#" className="hover:text-[#004aad]">Assistance</a>
        </div>
        <p>© {new Date().getFullYear()} MyIT – Intelcia IT Solutions. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
