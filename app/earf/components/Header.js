"use client";
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import fr from 'date-fns/locale/fr';
import { FaFilter, FaInfoCircle } from "react-icons/fa";
import { AiOutlineBell, AiOutlineUser, AiOutlineDownload, AiOutlineClockCircle } from "react-icons/ai";
import { generateWordFromImages } from "../utils/exportWord";
import { generatePPTFromImages } from "../utils/exportPPTX";
import html2canvas from "html2canvas-pro";
import fetchWithAuth from "@/utils/fetchWithAuth";
// Import du contexte global de filtre
import { useGlobalFilter } from "@/app/components/GlobalFilterContext";

// Enregistrement de la localisation française
registerLocale('fr', fr);
setDefaultLocale('fr');

// Fonction pour calculer le numéro de semaine d'une date
const getWeekNumber = (date) => {
  if (!date) return null;
  
  // Création d'une copie de la date pour ne pas modifier l'originale
  const d = new Date(date);
  
  // Définir le premier jour de l'année
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  
  // Nombre de jours écoulés depuis le début de l'année
  const days = Math.floor((d - startOfYear) / (24 * 60 * 60 * 1000));
  
  // Calculer le numéro de semaine
  // getDay() retourne 0 pour dimanche, donc on ajuste pour que lundi soit le premier jour
  const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  
  return weekNum;
};

export default function Header({ type = "EARF" }) {
  const [showMenu, setShowMenu] = useState(false);
  const [downloadStep, setDownloadStep] = useState("chooseFormat"); // "chooseFormat" ou "selectGraphs"
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [graphList, setGraphList] = useState([]);
  const [selectedGraphs, setSelectedGraphs] = useState([]);
  const [lastUploadDate, setLastUploadDate] = useState(null);
  const [isLoadingUploadDate, setIsLoadingUploadDate] = useState(true);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [portalContainer, setPortalContainer] = useState(null);
  const todayStr = new Date().toISOString().split("T")[0];
  const formattedDate = new Date().toLocaleDateString("fr-FR");

  // Accès au filtre global du contexte
  const { globalStartDate, globalEndDate, setGlobalFilter } = useGlobalFilter();

  // États locaux pour le DatePicker global
  const [localStartDate, setLocalStartDate] = useState(globalStartDate);
  const [localEndDate, setLocalEndDate] = useState(globalEndDate);
  const endDateRef = useRef(null);

  // Fonction pour appliquer le filtre global (mise à jour du contexte)
  const handleGlobalFilter = () => {
    setGlobalFilter(localStartDate, localEndDate);
  };

  // Pour afficher une étiquette de la période sélectionnée
  const periodText =
    localStartDate && localEndDate
      ? `${localStartDate.toLocaleDateString("fr-FR")} (S${getWeekNumber(localStartDate)}) → ${localEndDate.toLocaleDateString("fr-FR")} (S${getWeekNumber(localEndDate)})`
      : "Aucune période sélectionnée";

  // Fonction pour récupérer la date du dernier upload
  const fetchLastUploadDate = async () => {
    setIsLoadingUploadDate(true);
    try {
      // Déterminer l'URL en fonction du type de dashboard
      const apiUrl = `https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/${type.toLowerCase()}/files/`;
      
      const response = await fetchWithAuth(apiUrl);
      
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des données");
      }
      
      const data = await response.json();
      
      // Si des fichiers existent, prendre la date du plus récent
      if (data && data.length > 0) {
        // Trier les fichiers par date d'upload (descendant)
        const sortedFiles = [...data].sort((a, b) => {
          // Convertir les dates au format français (DD/MM/YYYY HH:MM) en objets Date
          const dateA = parseCustomDate(a.uploaded_at);
          const dateB = parseCustomDate(b.uploaded_at);
          return dateB - dateA;
        });
        
        setLastUploadDate(sortedFiles[0].uploaded_at);
      } else {
        setLastUploadDate(null);
      }
    } catch (error) {
      console.error("Erreur de récupération des données d'upload:", error);
      setLastUploadDate(null);
    } finally {
      setIsLoadingUploadDate(false);
    }
  };

  // Fonction pour parser une date au format "DD/MM/YYYY HH:MM"
  const parseCustomDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hours, minutes] = timePart ? timePart.split(':') : ['0', '0'];
    
    return new Date(year, month - 1, day, hours, minutes);
  };

  useEffect(() => {
    // Récupérer la date du dernier upload au chargement du composant
    fetchLastUploadDate();
    
    // Actualiser la date toutes les 5 minutes
    const interval = setInterval(() => {
      fetchLastUploadDate();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [type]);

  useEffect(() => {
    const container = document.createElement("div");
    container.style.zIndex = "9999";
    container.style.position = "absolute";
    document.body.appendChild(container);
    setPortalContainer(container);
    return () => document.body.removeChild(container);
  }, []);

  useEffect(() => {
    const detectGraphs = () => {
      const graphs = Array.from(document.querySelectorAll(".visualisation")).map((el) => ({
        id: el.getAttribute("data-id"),
        label: el.getAttribute("data-graph-label") || el.getAttribute("data-id"),
      }));
      setGraphList(graphs);
    };
    detectGraphs();
    const observer = new MutationObserver(detectGraphs);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showMenu &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setShowMenu(false);
        // Réinitialiser l'étape et le format sélectionné lors de la fermeture du menu
        setDownloadStep("chooseFormat");
        setSelectedFormat(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const toggleGraph = (id) => {
    setSelectedGraphs((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleAll = (check) => {
    setSelectedGraphs(check ? graphList.map((g) => g.id) : []);
  };

  const captureScreenshots = async () => {
    document.body.classList.add("disable-animations");
    await new Promise((resolve) => setTimeout(resolve, 100));

    const elements = Array.from(document.querySelectorAll(".visualisation")).filter((el) =>
      selectedGraphs.includes(el.getAttribute("data-id"))
    );
    const images = [];
    for (const el of elements) {
      try {
        const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
        images.push({
          id: el.getAttribute("data-id"),
          label: el.getAttribute("data-graph-label") || el.getAttribute("data-id"),
          image: canvas.toDataURL("image/png"),
        });
      } catch (err) {
        console.error("Erreur capture image:", err);
      }
    }
    document.body.classList.remove("disable-animations");
    return images;
  };

  const generateWord = async () => {
    if (selectedGraphs.length === 0) return alert("Sélectionnez au moins une visualisation.");
    const images = await captureScreenshots();
    // Passage des dates du filtre global à la fonction generateWordFromImages
    await generateWordFromImages(images, globalStartDate, globalEndDate);
  };
  
  const generatePPT = async () => {
    if (selectedGraphs.length === 0)
      return alert("Sélectionnez au moins une visualisation.");
    
    const images = await captureScreenshots();
    
    // Passage des dates du filtre global à la fonction generatePPTFromImages
    await generatePPTFromImages(images, globalStartDate, globalEndDate);
  };

  const handleDownload = () => {
    // Selon le format sélectionné, lancez la bonne fonction
    if (selectedFormat === "word") {
      generateWord();
    } else if (selectedFormat === "pptx") {
      // Passage des dates du filtre global à la fonction generatePPTFromImages
      generatePPT(globalStartDate, globalEndDate);
    }
  };

  const renderDropdown = () => {
    if (!portalContainer || !showMenu) return null;
    const rect = buttonRef.current?.getBoundingClientRect();
    return ReactDOM.createPortal(
      <div
        ref={dropdownRef}
        className="absolute w-80 bg-white rounded-lg shadow-lg z-[9999] p-3 space-y-3"
        style={{
          position: "fixed",
          top: rect ? rect.bottom + 8 : 100,
          right: rect ? window.innerWidth - rect.right : 20,
        }}
      >
        {downloadStep === "chooseFormat" ? (
          // Étape 1 : Choix du format de CR
          <div className="space-y-2">
            <div
              onClick={() => {
                setSelectedFormat("word");
                setDownloadStep("selectGraphs");
              }}
              className="cursor-pointer hover:bg-gray-100 px-3 py-2 rounded text-gray-700 border border-gray-200"
            >
              📄 CR (Format Word)
            </div>
            <div
              onClick={() => {
                setSelectedFormat("pptx");
                setDownloadStep("selectGraphs");
              }}
              className="cursor-pointer hover:bg-gray-100 px-3 py-2 rounded text-gray-700 border border-gray-200"
            >
              📊 CR (Format PPTX)
            </div>
          </div>
        ) : (
          // Étape 2 : Sélection des graphes/KPI et bouton de téléchargement final
          <div className="space-y-3">
            <button
              onClick={() => {
                // Permet de revenir à l'étape précédente pour changer le format
                setDownloadStep("chooseFormat");
                setSelectedFormat(null);
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Retour au choix du format
            </button>
            <div className="flex justify-between text-sm px-2 text-blue-600 font-medium">
              <button onClick={() => toggleAll(true)}>Tout cocher</button>
              <button onClick={() => toggleAll(false)}>Tout décocher</button>
            </div>
            <div className="max-h-48 overflow-y-auto px-2 text-sm text-gray-800 font-medium space-y-1">
              {graphList.map((graph) => (
                <label key={graph.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedGraphs.includes(graph.id)}
                    onChange={() => toggleGraph(graph.id)}
                  />
                  <span>{graph.label}</span>
                </label>
              ))}
            </div>
            <div className="border-t pt-2">
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
              >
                Télécharger CR
              </button>
            </div>
          </div>
        )}
      </div>,
      portalContainer
    );
  };

  return (
    <header className="bg-white shadow-md px-4 sm:px-6 py-4 flex flex-col gap-y-4 sticky top-0 z-50">
      {/* Bloc supérieur (titre et bienvenue) */}
      <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
            <span className="text-blue-600">Dashboard de la documentation Confluence ARTHUIS</span>
          </h1>
          <div className="flex items-center text-gray-500 text-sm">
            <span>Bienvenue !</span>
            {lastUploadDate && (
              <div className="ml-4 flex items-center text-gray-600">
                <AiOutlineClockCircle className="mr-1" />
                <span>
                  Dernière mise à jour : <span className="font-medium text-blue-600">{lastUploadDate}</span>
                </span>
              </div>
            )}
            {isLoadingUploadDate && (
              <div className="ml-4 text-gray-400 flex items-center">
                <span className="animate-pulse">Chargement des données...</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end flex-1">
          <AiOutlineBell className="text-gray-600" size={20} />
          <AiOutlineUser className="text-gray-600" size={20} />
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => {
                setShowMenu(!showMenu);
                // Réinitialiser l'étape à chaque ouverture du menu
                if (!showMenu) {
                  setDownloadStep("chooseFormat");
                  setSelectedFormat(null);
                }
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
            >
              <AiOutlineDownload />
              <span>Télécharger CR</span>
            </button>
          </div>
        </div>
      </div>
      {/* Bloc de filtre global */}
      <div className="bg-gray-50 border border-gray-200 shadow-sm rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-gray-700 font-medium">Période sélectionnée :</label>
          <DatePicker
            selected={localStartDate}
            onChange={(date) => {
              setLocalStartDate(date);
              setTimeout(() => endDateRef.current?.setFocus(), 200);
            }}
            selectsStart
            startDate={localStartDate}
            endDate={localEndDate}
            placeholderText="Date de début"
            className="border border-gray-300 rounded-md px-3 py-2 text-gray-600 shadow-sm text-sm"
            locale="fr"  // Utilisation de la locale française
            dateFormat="dd/MM/yyyy"  // Format de date français
          />
          <DatePicker
            ref={endDateRef}
            selected={localEndDate}
            onChange={(date) => setLocalEndDate(date)}
            selectsEnd
            startDate={localStartDate}
            endDate={localEndDate}
            minDate={localStartDate}
            placeholderText="Date de fin"
            className="border border-gray-300 rounded-md px-3 py-2 text-gray-600 shadow-sm text-sm"
            locale="fr"  // Utilisation de la locale française
            dateFormat="dd/MM/yyyy"  // Format de date français
          />
          <button
            onClick={handleGlobalFilter}
            className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg shadow hover:bg-gray-200"
          >
            <FaFilter />
            <span>Filtrer</span>
          </button>
          {periodText && (
            <span className="text-sm text-blue-700 font-medium whitespace-nowrap ml-3">
              {periodText}
            </span>
          )}
        </div>
      </div>
      {renderDropdown()}
    </header>
  );
}