'use client';

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { AiOutlineUpload, AiOutlineArrowLeft, AiOutlineArrowRight, AiOutlineUser, AiOutlineLogout, AiOutlineLoading3Quarters } from "react-icons/ai";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import fetchWithAuth from "@/utils/fetchWithAuth";

export default function UploadFTTHPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const popupRef = useRef(null);

  const [showUserPopup, setShowUserPopup] = useState(false);
  
  // États pour les 5 fichiers
  const [stockFile, setStockFile] = useState(null);
  const [regleFile, setRegleFile] = useState(null);
  const [ftthDataFile, setFtthDataFile] = useState(null);
  const [productiviteFile, setProductiviteFile] = useState(null);
  const [mailFtthFile, setMailFtthFile] = useState(null);
  
  // États pour les messages d'upload
  const [uploadMessages, setUploadMessages] = useState({});
  const [uploadStatuses, setUploadStatuses] = useState({});
  const [isUploading, setIsUploading] = useState({});

  // Refs pour les inputs
  const stockInputRef = useRef(null);
  const regleInputRef = useRef(null);
  const ftthDataInputRef = useRef(null);
  const productiviteInputRef = useRef(null);
  const mailFtthInputRef = useRef(null);

  // Handlers pour parcourir les fichiers
  const handleBrowseStock = () => stockInputRef.current?.click();
  const handleBrowseRegle = () => regleInputRef.current?.click();
  const handleBrowseFtthData = () => ftthDataInputRef.current?.click();
  const handleBrowseProductivite = () => productiviteInputRef.current?.click();
  const handleBrowseMailFtth = () => mailFtthInputRef.current?.click();

  const handleFileChange = (setter) => (e) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  // Handler pour upload Stock + Règle (original)
  const handleUploadStockRegle = async () => {
    if (!stockFile || !regleFile) {
      setUploadMessages(prev => ({...prev, stockRegle: "Veuillez sélectionner les deux fichiers requis."}));
      setUploadStatuses(prev => ({...prev, stockRegle: "error"}));
      return;
    }

    setIsUploading(prev => ({...prev, stockRegle: true}));
    setUploadMessages(prev => ({...prev, stockRegle: ""}));
    setUploadStatuses(prev => ({...prev, stockRegle: ""}));

    const formData = new FormData();
    formData.append("stock_file", stockFile);
    formData.append("regle_file", regleFile);

    try {
      const res = await fetchWithAuth("https://api.606510.xyz/dashboard/api/ftth/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMessages(prev => ({...prev, stockRegle: data.message || "Les fichiers FTTH ont été uploadés et les données enregistrées avec succès."}));
        setUploadStatuses(prev => ({...prev, stockRegle: "success"}));
        setStockFile(null);
        setRegleFile(null);
      } else {
        setUploadMessages(prev => ({...prev, stockRegle: data.error || "Erreur d'upload."}));
        setUploadStatuses(prev => ({...prev, stockRegle: "error"}));
      }
    } catch (error) {
      setUploadMessages(prev => ({...prev, stockRegle: "Erreur lors de l'upload."}));
      setUploadStatuses(prev => ({...prev, stockRegle: "error"}));
    } finally {
      setIsUploading(prev => ({...prev, stockRegle: false}));
    }
  };

  // Handler générique pour les nouveaux uploads
  const handleGenericUpload = async (file, endpoint, fileKey, messageKey, setFile) => {
    if (!file) {
      setUploadMessages(prev => ({...prev, [messageKey]: "Veuillez sélectionner un fichier."}));
      setUploadStatuses(prev => ({...prev, [messageKey]: "error"}));
      return;
    }

    setIsUploading(prev => ({...prev, [messageKey]: true}));
    setUploadMessages(prev => ({...prev, [messageKey]: ""}));
    setUploadStatuses(prev => ({...prev, [messageKey]: ""}));

    const formData = new FormData();
    formData.append("document", file);

    try {
      const res = await fetchWithAuth(`https://api.606510.xyz/dashboard/${endpoint}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMessages(prev => ({...prev, [messageKey]: data.message || "Fichier uploadé avec succès."}));
        setUploadStatuses(prev => ({...prev, [messageKey]: "success"}));
        setFile(null);
      } else {
        setUploadMessages(prev => ({...prev, [messageKey]: data.error || "Erreur d'upload."}));
        setUploadStatuses(prev => ({...prev, [messageKey]: "error"}));
      }
    } catch (error) {
      setUploadMessages(prev => ({...prev, [messageKey]: "Erreur lors de l'upload."}));
      setUploadStatuses(prev => ({...prev, [messageKey]: "error"}));
    } finally {
      setIsUploading(prev => ({...prev, [messageKey]: false}));
    }
  };

  // Handlers spécifiques pour chaque nouveau fichier
  const handleUploadFtthData = () => handleGenericUpload(ftthDataFile, "api/ftth-data/upload/", "document", "ftthData", setFtthDataFile);
  const handleUploadProductivite = () => handleGenericUpload(productiviteFile, "api/ftth-productivite/upload/", "document", "productivite", setProductiviteFile);
  const handleUploadMailFtth = () => handleGenericUpload(mailFtthFile, "api/mail-ftth/upload/", "document", "mailFtth", setMailFtthFile);

  const handleLogout = async () => {
    try {
      await fetchWithAuth("https://api.606510.xyz/api/logout/", {
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

      {/* Contenu principal */}
      <div className="flex flex-1 justify-center items-start pt-28 p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-4xl bg-gray-50 border border-[#31327e] rounded-2xl shadow-xl p-10"
        >
          <div className="flex flex-col items-center mb-8">
            <Image src="/logo-myit.png" alt="Logo MyIT" width={150} height={60} className="mb-6" />
            <h1 className="text-3xl font-bold text-[#31327e] text-center">Upload FTTH</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Section 1: Stock + Règle (Upload combiné) */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold text-[#31327e] mb-4">Fichiers Stock & Règle</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fichier Stock (.xlsx) :</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      readOnly
                      value={stockFile ? stockFile.name : ""}
                      placeholder="Aucun fichier sélectionné"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleBrowseStock}
                      className="px-4 py-2 border border-[#31327e] text-[#31327e] font-semibold rounded-lg hover:bg-[#31327e] hover:text-white transition text-sm"
                    >
                      Parcourir
                    </button>
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={handleFileChange(setStockFile)}
                      ref={stockInputRef}
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fichier Règle (.xlsx) :</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      readOnly
                      value={regleFile ? regleFile.name : ""}
                      placeholder="Aucun fichier sélectionné"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleBrowseRegle}
                      className="px-4 py-2 border border-[#31327e] text-[#31327e] font-semibold rounded-lg hover:bg-[#31327e] hover:text-white transition text-sm"
                    >
                      Parcourir
                    </button>
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={handleFileChange(setRegleFile)}
                      ref={regleInputRef}
                      className="hidden"
                    />
                  </div>
                </div>

                <button
                  onClick={handleUploadStockRegle}
                  disabled={isUploading.stockRegle}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#31327e] hover:bg-[#4547b3] text-white font-semibold rounded-lg transition"
                >
                  {isUploading.stockRegle ? <AiOutlineLoading3Quarters className="animate-spin" size={18} /> : <AiOutlineUpload size={18} />}
                  {isUploading.stockRegle ? "Upload en cours..." : "Uploader Stock & Règle"}
                </button>

                {uploadMessages.stockRegle && (
                  <div className={`text-center p-3 rounded-lg text-sm font-semibold ${uploadStatuses.stockRegle === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {uploadMessages.stockRegle}
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Données FTTH */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold text-[#31327e] mb-4">FTTH Ticketing</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fichier Données FTTH (.xlsx) :</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      readOnly
                      value={ftthDataFile ? ftthDataFile.name : ""}
                      placeholder="Aucun fichier sélectionné"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleBrowseFtthData}
                      className="px-4 py-2 border border-[#31327e] text-[#31327e] font-semibold rounded-lg hover:bg-[#31327e] hover:text-white transition text-sm"
                    >
                      Parcourir
                    </button>
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={handleFileChange(setFtthDataFile)}
                      ref={ftthDataInputRef}
                      className="hidden"
                    />
                  </div>
                </div>

                <button
                  onClick={handleUploadFtthData}
                  disabled={isUploading.ftthData}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#31327e] hover:bg-[#4547b3] text-white font-semibold rounded-lg transition"
                >
                  {isUploading.ftthData ? <AiOutlineLoading3Quarters className="animate-spin" size={18} /> : <AiOutlineUpload size={18} />}
                  {isUploading.ftthData ? "Upload en cours..." : "Uploader Données FTTH"}
                </button>

                {uploadMessages.ftthData && (
                  <div className={`text-center p-3 rounded-lg text-sm font-semibold ${uploadStatuses.ftthData === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {uploadMessages.ftthData}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Productivité FTTH */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold text-[#31327e] mb-4">Productivité FTTH</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fichier Productivité (.xlsx):</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      readOnly
                      value={productiviteFile ? productiviteFile.name : ""}
                      placeholder="Aucun fichier sélectionné"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleBrowseProductivite}
                      className="px-4 py-2 border border-[#31327e] text-[#31327e] font-semibold rounded-lg hover:bg-[#31327e] hover:text-white transition text-sm"
                    >
                      Parcourir
                    </button>
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={handleFileChange(setProductiviteFile)}
                      ref={productiviteInputRef}
                      className="hidden"
                    />
                  </div>
                </div>

                <button
                  onClick={handleUploadProductivite}
                  disabled={isUploading.productivite}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#31327e] hover:bg-[#4547b3] text-white font-semibold rounded-lg transition"
                >
                  {isUploading.productivite ? <AiOutlineLoading3Quarters className="animate-spin" size={18} /> : <AiOutlineUpload size={18} />}
                  {isUploading.productivite ? "Upload en cours..." : "Uploader Productivité"}
                </button>

                {uploadMessages.productivite && (
                  <div className={`text-center p-3 rounded-lg text-sm font-semibold ${uploadStatuses.productivite === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {uploadMessages.productivite}
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Mail FTTH */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold text-[#31327e] mb-4">FTTH Mailing</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fichier FTTH Mailing (.xlsx):</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      readOnly
                      value={mailFtthFile ? mailFtthFile.name : ""}
                      placeholder="Aucun fichier sélectionné"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleBrowseMailFtth}
                      className="px-4 py-2 border border-[#31327e] text-[#31327e] font-semibold rounded-lg hover:bg-[#31327e] hover:text-white transition text-sm"
                    >
                      Parcourir
                    </button>
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={handleFileChange(setMailFtthFile)}
                      ref={mailFtthInputRef}
                      className="hidden"
                    />
                  </div>
                </div>

                <button
                  onClick={handleUploadMailFtth}
                  disabled={isUploading.mailFtth}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#31327e] hover:bg-[#4547b3] text-white font-semibold rounded-lg transition"
                >
                  {isUploading.mailFtth ? <AiOutlineLoading3Quarters className="animate-spin" size={18} /> : <AiOutlineUpload size={18} />}
                  {isUploading.mailFtth ? "Upload en cours..." : "Uploader Mail FTTH"}
                </button>

                {uploadMessages.mailFtth && (
                  <div className={`text-center p-3 rounded-lg text-sm font-semibold ${uploadStatuses.mailFtth === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {uploadMessages.mailFtth}
                  </div>
                )}
              </div>
            </div>

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