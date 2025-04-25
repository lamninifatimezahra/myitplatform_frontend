"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import fetchWithAuth from "@/utils/fetchWithAuth";
import {
  AiOutlineMail,
  AiOutlineLock,
  AiOutlineEye,
  AiOutlineEyeInvisible,
} from "react-icons/ai";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState({ email: "", password: "", general: "" });
  const [successMessage, setSuccessMessage] = useState("");
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const router = useRouter();

  // ✅ Spinner affiché pendant 1.5s au montage
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
          <div className="absolute inset-0 border-[6px] border-t-[#31327e] border-b-[#6f80ac] border-l-transparent border-r-transparent rounded-full animate-spin-custom" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/logo-myit.png"
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setShowSuccessMessage(false);

    let errors = { email: "", password: "", general: "" };

    if (!email.trim()) errors.email = "L'email est requis.";
    if (!password.trim()) errors.password = "Le mot de passe est requis.";

    if (errors.email || errors.password) {
      setError(errors);
      return;
    }

    try {
      const loginRes = await fetchWithAuth(
        "https://myit-backend-ed72239b4b8e.herokuapp.com/api/login/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        }
      );

      if (!loginRes.ok) throw new Error("Identifiants invalides");

      const userRes = await fetchWithAuth(
        "https://myit-backend-ed72239b4b8e.herokuapp.com/api/me/",
        {
          method: "GET",
          credentials: "include",
        }
      );

      const user = await userRes.json();

      if (user.first_login) {
        setIsFirstLogin(true);
      } else {
        setSuccessMessage("Connexion réussie !");
        setTimeout(() => {
          router.push("/acceuil");
        }, 1500);
      }
    } catch (err) {
      setError({
        email: "",
        password: "",
        general: "Erreur de connexion. Vérifiez vos identifiants.",
      });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setShowSuccessMessage(false);

    if (!newPassword || !confirmPassword) {
      setError({ ...error, general: "Veuillez remplir les deux champs." });
      return;
    }

    if (newPassword.length < 8) {
      setError({
        ...error,
        general: "Le mot de passe doit contenir au moins 8 caractères.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setError({
        ...error,
        general: "Les mots de passe ne correspondent pas.",
      });
      return;
    }

    try {
      const res = await fetchWithAuth(
        "https://myit-backend-ed72239b4b8e.herokuapp.com/api/change-password/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            new_password: newPassword,
            confirm_password: confirmPassword,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Erreur inconnue");
      }

      setSuccessMessage("Mot de passe changé avec succès !");
      setError({ email: "", password: "", general: "" });

      setTimeout(() => {
        router.push("/acceuil");
      }, 1500);
    } catch (err) {
      setError({ ...error, general: err.message });
    }
  };

  function Message({ type, children }) {
    return (
      <div
        className={`w-full p-3 rounded-lg text-sm text-center animate-fade-in-fast ${
          type === "error"
            ? "bg-red-100 text-red-600"
            : "bg-green-100 text-green-600"
        }`}
      >
        {children}
      </div>
    );
  }

  return (
    <main className="flex flex-col min-h-screen bg-white text-gray-800 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: "url('/background-office.jpg')",
          filter: "brightness(1.1) blur(5px)",
          opacity: 0.2,
        }}
      />
      <div className="relative z-20 flex-1 flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="max-w-md mx-auto w-full bg-white/70 backdrop-blur-md p-10 rounded-3xl shadow-2xl animate-fade-in">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo-myit.png"
              alt="MyIT Logo"
              width={220}
              height={220}
              className="drop-shadow-lg animate-pulse-slow"
              priority
            />
          </div>

          {isFirstLogin ? (
            <form onSubmit={handleChangePassword} className="space-y-6">
              <h2 className="text-xl font-semibold text-center text-[#31327e] mb-4">
                Changer le mot de passe
              </h2>
              <input
                type="password"
                placeholder="Nouveau mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 rounded-lg border bg-white/90 text-black"
              />
              <input
                type="password"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 rounded-lg border bg-white/90 text-black"
              />
              <button
                type="submit"
                className="w-full bg-[#31327e] hover:bg-[#4547b3] text-white p-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
              >
                Changer
              </button>

              {error.general && <Message type="error">{error.general}</Message>}
              {successMessage && (
                <Message type="success">{successMessage}</Message>
              )}
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-1">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#6f80ac] pointer-events-none">
                    <AiOutlineMail size={20} />
                  </span>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError({ ...error, email: "", general: "" });
                    }}
                    className="w-full pl-12 pr-4 p-3 rounded-lg border bg-white/90 text-black"
                  />
                </div>
                {error.email && <Message type="error">{error.email}</Message>}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#6f80ac] pointer-events-none">
                    <AiOutlineLock size={20} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError({ ...error, password: "", general: "" });
                    }}
                    className="w-full pl-12 pr-10 p-3 rounded-lg border bg-white/90 text-black"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#6f80ac]"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <AiOutlineEye /> : <AiOutlineEyeInvisible />}
                  </button>
                </div>
                {error.password && (
                  <Message type="error">{error.password}</Message>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-[#31327e] hover:bg-[#4547b3] text-white p-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
              >
                Se connecter
              </button>

              {error.general && <Message type="error">{error.general}</Message>}
              {successMessage && (
                <Message type="success">{successMessage}</Message>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
