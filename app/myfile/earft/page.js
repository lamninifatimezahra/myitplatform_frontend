'use client';

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { AiOutlineUpload, AiOutlineArrowLeft, AiOutlineArrowRight, AiOutlineUser, AiOutlineLogout, AiOutlineLoading3Quarters } from "react-icons/ai";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function UploadEARFTPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const popupRef = useRef(null);

  const [showUserPopup, setShowUserPopup] = useState(false);
  const [earftFile, setEarftFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const earftInputRef = useRef(null);

  const handleBrowseEARFT = () => earftInputRef.current?.click();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setEarftFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!earftFile) {
      setUploadMessage("Veuillez sélectionner un fichier EARF-T.");
      setUploadStatus("error");
      return;
    }

    setIsUploading(true);
    setUploadMessage("");
    setUploadStatus("");

    const formData = new FormData();
    formData.append("document", earftFile);

    try {
      const res = await fetchWithAuth("https://myit-backend-its-c20c9354ce42.herokuapp.com/dashboard/api/earft/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMessage(data.message || "Le fichier EARF-T a été uploadé avec succès.");
        setUploadStatus("success");
        setEarftFile(null);
      } else {
        setUploadMessage(data.error || "Erreur lors de l'upload.");
        setUploadStatus("error");
      }
    } catch (error) {
      setUploadMessage("Erreur lors de l'upload.");
      setUploadStatus("error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetchWithAuth("https://myit-backend-its-c20c9354ce42.herokuapp.com/api/logout/", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
    } finally {
      router.push("/login");
    }
  };

  const getFormattedName = () => {
    const first = user?.name || "";
    const last = user?.surname || "";
    const formattedFirst = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
const formattedLast = last.toUpperCase();
return `${formattedFirst} ${formattedLast}`.trim();
  };

  const getDepartment = () => {
    return user?.role === "admin" ? "Administrateur" : user?.department || "N/A";
  };

  const getActivities = () => {
    if (user?.role === "admin") return ["Accès libre"];
    if (user?.dashboards && user.dashboards.length > 0) return user.dashboards;
    return [];
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShowUserPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white relative">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-[6px] border-t-[#31327e] border-b-[#6f80ac] border-l-transparent border-r-transparent animate-spin-custom" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Image src="/logo-myit.png" alt="Logo MyIT" width={48} height={48} className="object-contain" />
          </div>
        </div>
        <style jsx>{`
          @keyframes spin-custom {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-spin-custom {
            animation: spin-custom 1.1s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 sm:px-12 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-[#31327e] text-white hover:bg-[#4547b3] transition"
          >
            <AiOutlineArrowLeft size={20} />
          </button>
          <button
            onClick={() => router.forward()}
            className="p-2 rounded-full bg-[#31327e] text-white hover:bg-[#4547b3] transition"
          >
            <AiOutlineArrowRight size={20} />
          </button>
        </div>

        {/* Utilisateur */}
        <div className="flex items-center gap-4 relative" ref={popupRef}>
          <div
            className="flex items-center gap-2 cursor-pointer text-[#31327e] font-medium hover:underline"
            onClick={() => setShowUserPopup(!showUserPopup)}
          >
            <AiOutlineUser size={22} />
            <span>{getFormattedName()}</span>
          </div>

          <button
            onClick={handleLogout}
            className="text-red-500 hover:text-red-600 transition"
          >
            <AiOutlineLogout size={22} />
          </button>

          {showUserPopup && (
            <div className="absolute right-0 top-14 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 animate-fade-in">
              <div className="px-5 py-4 space-y-1">
                <p className="text-xs text-gray-500">Connecté en tant que</p>
                <p className="font-bold text-[#31327e] text-base">{getFormattedName()}</p>
                <div className="text-sm text-gray-700 mt-2 space-y-1">
                  <p><span className="font-semibold text-gray-600">Email :</span> {user.email}</p>
                  <p><span className="font-semibold text-gray-600">Département :</span> {getDepartment()}</p>
                  <p className="font-semibold text-gray-600">Activités :</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {getActivities().length > 0 ? (
                      getActivities().map((item, index) => (
                        <span key={index} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{item}</span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-xs italic">Aucune activité</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="border-t px-5 py-3 bg-gray-50 hover:bg-red-50 transition text-center">
<button
  onClick={handleLogout}
  className="flex items-center justify-center gap-2 text-red-600 font-semibold text-sm hover:underline w-full"
>
  <AiOutlineLogout className="w-4 h-4" />
  Se déconnecter
</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Carte Upload */}
      <div className="flex flex-1 justify-center items-center pt-28 p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl bg-gray-50 border border-[#31327e] rounded-2xl shadow-xl p-10 flex flex-col items-center"
        >
          <Image src="/logo-myit.png" alt="Logo MyIT" width={150} height={60} className="mb-6" />

          <h1 className="text-3xl font-bold text-[#31327e] mb-6 text-center">Upload EARF-T</h1>

          <div className="w-full space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fichier EARF-T :</label>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  readOnly
                  value={earftFile ? earftFile.name : ""}
                  placeholder="Aucun fichier sélectionné"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleBrowseEARFT}
                  className="px-6 py-2 border border-[#31327e] text-[#31327e] font-semibold rounded-2xl hover:bg-[#31327e] hover:text-white transition"
                >
                  Parcourir
                </button>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  ref={earftInputRef}
                  className="hidden"
                />
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#31327e] hover:bg-[#4547b3] text-white font-semibold text-lg rounded-2xl transition"
            >
              {isUploading ? <AiOutlineLoading3Quarters className="animate-spin" size={20} /> : <AiOutlineUpload size={20} />}
              {isUploading ? "Uploading..." : "Uploader"}
            </button>

            {uploadMessage && (
              <div className={`text-center p-3 rounded-lg text-sm font-semibold ${uploadStatus === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {uploadMessage}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Copyright */}
      <footer className="relative z-10 text-center text-sm text-gray-400 py-4 mt-10">
        © {new Date().getFullYear()} MyIT – Plateforme interne Intelcia IT Solutions
      </footer>
    </main>
  );
}