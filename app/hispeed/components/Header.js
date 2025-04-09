"use client";
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { AiOutlineSearch, AiOutlineBell, AiOutlineUser, AiOutlineDownload } from "react-icons/ai";
import { generateWordFromImages } from "../utils/exportWord";
import html2canvas from "html2canvas-pro";
import PptxGenJS from "pptxgenjs";

export default function Header() {
  const [showMenu, setShowMenu] = useState(false);
  const [graphList, setGraphList] = useState([]);
  const [selectedGraphs, setSelectedGraphs] = useState([]);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [portalContainer, setPortalContainer] = useState(null);
  const todayStr = new Date().toISOString().split("T")[0];
  const formattedDate = new Date().toLocaleDateString("fr-FR");

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
    await generateWordFromImages(images);
  };

  const generatePPT = async () => {
    if (selectedGraphs.length === 0)
      return alert("Sélectionnez au moins une visualisation.");
    
    try {
      const images = await captureScreenshots();
      const ppt = new PptxGenJS();
      
      // --- Définir les KPI fixes comme dans exportWord.js ---
      const fixedKpiLabels = [
        "KPI Tickets Entrants",
        "KPI Tickets Traités",
        "KPI Tickets Réentrants",
        "KPI Tickets en Cours",
        "KPI Tickets en Cours +14j"
      ];
      
      // Conversion en minuscules pour la comparaison
      const normalizedFixedLabels = fixedKpiLabels.map(label => label.trim().toLowerCase());
      
      // Filtrer les images pour séparer les KPI des autres graphes
      const kpiImages = images.filter(item => {
        const currentLabel = (item.label != null ? item.label : item.id);
        return normalizedFixedLabels.includes(currentLabel.trim().toLowerCase());
      });
      
      const graphImages = images.filter(item => {
        const currentLabel = (item.label != null ? item.label : item.id);
        return !normalizedFixedLabels.includes(currentLabel.trim().toLowerCase());
      });
      
      // --- Diapositive d'introduction avec logos dans les coins ---
      const introSlide = ppt.addSlide();
      
      // Arrière-plan léger
      introSlide.addShape(ppt.shapes.RECTANGLE, {
        x: 0,
        y: 0,
        w: "100%",
        h: "100%",
        fill: { color: "F5F7FA" },
      });
      
      // Bande supérieure pour le titre
      introSlide.addShape(ppt.shapes.RECTANGLE, {
        x: 0,
        y: 1.5,
        w: "100%",
        h: 1.5,
        fill: { color: "31327E" },
      });
      
      // Logos dans les coins supérieurs
      introSlide.addImage({
        path: "http://localhost:3000/logo-intelcia-small.png",
        x: 0.5,
        y: 0.4,
        w: 1.2,
        h: 0.6,
      });
      
      introSlide.addImage({
        path: "http://localhost:3000/logo_sfr_small.png",
        x: 8.3,
        y: 0.4,
        w: 1.2,
        h: 1,
      });
      
      // Titre principal au centre de la bande bleue
      introSlide.addText("Compte Rendu HISPEED", {
        x: 2.0,
        y: 1.8,
        w: 6.0,
        fontSize: 28,
        bold: true,
        color: "FFFFFF",
        align: "center",
      });
      
      // Sous-titre également au centre de la bande bleue
      introSlide.addText("Suivi d'activité et analyse des performances", {
        x: 2.0,
        y: 2.2,
        w: 6.0,
        fontSize: 16,
        color: "FFFFFF",
        align: "center",
      });
      
      // Date en bas à droite
      introSlide.addText(`Date : ${formattedDate}`, {
        x: 7.0,
        y: 5.3,
        w: 2.5,
        fontSize: 14,
        color: "363636",
        align: "right",
      });
      
      // --- Diapositive KPI avec ajustement pour "KPI Tickets en Cours +14j" ---
      if (kpiImages.length > 0) {
        const kpiSlide = ppt.addSlide();
        
        // Arrière-plan léger
        kpiSlide.addShape(ppt.shapes.RECTANGLE, {
          x: 0,
          y: 0,
          w: "100%",
          h: "100%",
          fill: { color: "F5F7FA" },
        });
        
        // Bande de titre en haut
        kpiSlide.addShape(ppt.shapes.RECTANGLE, {
          x: 0,
          y: 0,
          w: "100%",
          h: 0.8,
          fill: { color: "31327E" },
        });
        
        kpiSlide.addText("KPI - Key Performance Indicators", {
          x: 0.5,
          y: 0.15,
          fontSize: 24,
          bold: true,
          color: "FFFFFF",
        });
        
        kpiSlide.addText("Suivi des indicateurs essentiels de performance HISPEED", {
          x: 0.5,
          y: 0.9,
          fontSize: 14,
          color: "6b7280",
        });
        
        // Paramètres pour la disposition des KPI
        const imageWidth = 1.8; // Taille de chaque KPI
        const imageHeight = 1.6;
        const startX = 0.5; // Position de départ
        const startY = 1.4; // Position après le titre
        const spacingX = 0.2; // Espacement horizontal
        const spacingY = 0.3; // Espacement vertical entre lignes
        
        // Fonction pour créer un KPI à une position donnée
        const createKPI = (item, posX, posY) => {
          if (!item) return;
          
          // Fond pour le KPI avec ombre légère
          kpiSlide.addShape(ppt.shapes.RECTANGLE, {
            x: posX,
            y: posY,
            w: imageWidth,
            h: imageHeight,
            fill: { color: "FFFFFF" },
            line: { color: "DDDDDD", width: 1 },
            shadow: { type: "outer", blur: 3, offset: 1, angle: 45, color: "CFCFCF" }
          });
          
          // Bande de titre pour le KPI
          kpiSlide.addShape(ppt.shapes.RECTANGLE, {
            x: posX,
            y: posY,
            w: imageWidth,
            h: 0.3,
            fill: { color: "68BDDD" },
          });
          
          // Titre du KPI
          kpiSlide.addText(item.label || "KPI", {
            x: posX,
            y: posY + 0.05,
            w: imageWidth,
            fontSize: 9,
            bold: true,
            color: "FFFFFF",
            align: 'center',
          });
          
          // Image du KPI
          if (item.image && typeof item.image === 'string' && item.image.startsWith('data:image/')) {
            kpiSlide.addImage({
              data: item.image,
              x: posX + 0.1,
              y: posY + 0.35,
              w: imageWidth - 0.2,
              h: imageHeight - 0.5,
            });
          } else {
            kpiSlide.addText("⚠️ Image non disponible", {
              x: posX + 0.1,
              y: posY + 0.6,
              w: imageWidth - 0.2,
              fontSize: 9,
              color: "FF0000",
              bold: true,
              align: 'center',
            });
          }
        };
        
        // Réorganiser les KPI pour placer le "KPI Tickets en Cours +14j" au centre de la deuxième ligne
        const kpiEntrants = kpiImages.find(item => {
          const label = item.label || item.id;
          return label.toLowerCase().includes("entrants");
        });
        
        const kpiTraites = kpiImages.find(item => {
          const label = item.label || item.id;
          return label.toLowerCase().includes("traités");
        });
        
        const kpiReentrants = kpiImages.find(item => {
          const label = item.label || item.id;
          return label.toLowerCase().includes("réentrants");
        });
        
        const kpiEnCours = kpiImages.find(item => {
          const label = item.label || item.id;
          return label.toLowerCase().includes("en cours") && !label.toLowerCase().includes("+14j");
        });
        
        const kpiEnCoursPlus14j = kpiImages.find(item => {
          const label = item.label || item.id;
          return label.toLowerCase().includes("en cours") && label.toLowerCase().includes("+14j");
        });
        
        // Première ligne : 4 KPI
        if (kpiEntrants) createKPI(kpiEntrants, startX, startY);
        if (kpiTraites) createKPI(kpiTraites, startX + imageWidth + spacingX, startY);
        if (kpiReentrants) createKPI(kpiReentrants, startX + (imageWidth + spacingX) * 2, startY);
        if (kpiEnCours) createKPI(kpiEnCours, startX + (imageWidth + spacingX) * 3, startY);
        
        // Deuxième ligne : 1 KPI au centre
        // Calculer la position centrale
        const centerX = (10 - imageWidth) / 2; // 10 est la largeur standard de la diapo
        if (kpiEnCoursPlus14j) createKPI(kpiEnCoursPlus14j, centerX, startY + imageHeight + spacingY);
        
        // Autres KPI qui ne correspondraient pas aux recherches ci-dessus
        const otherKpis = kpiImages.filter(item => {
          const label = item.label || item.id;
          return !(label.toLowerCase().includes("entrants") || 
                  label.toLowerCase().includes("traités") || 
                  label.toLowerCase().includes("réentrants") || 
                  label.toLowerCase().includes("en cours"));
        });
        
        // Placer les autres KPI éventuels après le KPI central
        for (let i = 0; i < otherKpis.length; i++) {
          const row = Math.floor(i / 4) + 2;  // Commencer à la 3ème ligne
          const col = i % 4;
          createKPI(otherKpis[i], startX + col * (imageWidth + spacingX), startY + row * (imageHeight + spacingY));
        }
        
        // Zone de commentaire globale pour les KPI
        kpiSlide.addShape(ppt.shapes.RECTANGLE, {
          x: 0.5,
          y: 5.0,
          w: 9.0,
          h: 0.6,
          fill: { color: "FFFFFF" },
          line: { color: "68BDDD", width: 1, dashType: "dash" },
        });
        
        kpiSlide.addText("💬 Commentaire global : ___________________________________________", {
          x: 0.7,
          y: 5.15,
          fontSize: 12,
          color: "4B5563",
        });
      }
      
      // --- Création d'une diapositive détaillée pour chaque graphique non-KPI ---
      for (const item of graphImages) {
        const slide = ppt.addSlide();
        
        // Arrière-plan léger
        slide.addShape(ppt.shapes.RECTANGLE, {
          x: 0,
          y: 0,
          w: "100%",
          h: "100%",
          fill: { color: "F5F7FA" },
        });
        
        // Bande de titre en haut
        slide.addShape(ppt.shapes.RECTANGLE, {
          x: 0,
          y: 0,
          w: "100%",
          h: 0.6,
          fill: { color: "68BDDD" },
        });
    
        // Titre du graphique sur la bande bleue
        slide.addText(item.label || "Visualisation", {
          x: 0.5,
          y: 0.15,
          fontSize: 16,
          bold: true,
          color: "FFFFFF",
        });
        
        // Cadre pour l'image avec ombre légère
        slide.addShape(ppt.shapes.RECTANGLE, {
          x: 1,
          y: 0.8,
          w: 8,
          h: 4.2,
          fill: { color: "FFFFFF" },
          line: { color: "DDDDDD", width: 1 },
          shadow: { type: "outer", blur: 3, offset: 1, angle: 45, color: "CFCFCF" }
        });
    
        // Vérification et ajout de l'image
        if (item.image && typeof item.image === 'string' && item.image.startsWith('data:image/')) {
          slide.addImage({
            data: item.image,
            x: 1.2,
            y: 1,
            w: 7.6,
            h: 3.8,
          });
        } else {
          slide.addText("⚠️ Image non disponible", {
            x: 3,
            y: 2.5,
            fontSize: 16,
            color: "FF0000",
            bold: true,
            align: 'center',
          });
        }
    
        // Zone de commentaire avec style amélioré
        slide.addShape(ppt.shapes.RECTANGLE, {
          x: 1,
          y: 5.2,
          w: 8,
          h: 0.6,
          fill: { color: "FFFFFF" },
          line: { color: "68BDDD", width: 1, dashType: "dash" },
        });
        
        slide.addText("💬 Commentaire détaillé : ___________________________________________", {
          x: 1.2,
          y: 5.35,
          fontSize: 12,
          color: "4B5563",
        });
      }
    
      // Générer et télécharger le fichier
      await ppt.writeFile({ fileName: `compte_rendu_hispeed_${todayStr}.pptx` });
      console.log("PowerPoint généré avec succès!");
    } catch (error) {
      console.error("Erreur lors de la génération du PowerPoint:", error);
      alert("Une erreur est survenue lors de la création du PowerPoint. Veuillez consulter la console pour plus de détails.");
    }
  };
  
  const renderDropdown = () => {
    if (!portalContainer || !showMenu) return null;
    const rect = buttonRef.current?.getBoundingClientRect();
    return ReactDOM.createPortal(
      <div
        ref={dropdownRef}
        className="absolute w-80 bg-white rounded-lg shadow-lg z-[9999] p-3 space-y-2"
        style={{
          position: "fixed",
          top: rect ? rect.bottom + 8 : 100,
          right: rect ? window.innerWidth - rect.right : 20,
        }}
      >
        <div className="space-y-1">
          <div
            onClick={() => generateWord()}
            className="cursor-pointer hover:bg-gray-100 px-3 py-2 rounded text-gray-700"
          >
            📄 CR (Format Word)
          </div>
          <div
            onClick={() => generatePPT()}
            className="cursor-pointer hover:bg-gray-100 px-3 py-2 rounded text-gray-700"
          >
            📊 CR (Format PPTX)
          </div>
        </div>

        <div className="border-t pt-2 space-y-2">
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
        </div>
      </div>,
      portalContainer
    );
  };

  return (
    <header className="bg-white shadow-md px-4 sm:px-6 py-4 flex flex-col gap-y-4 sticky top-0 z-50">
      <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
            <span className="text-blue-600">Dashboard HISPEED</span>
          </h1>
          <p className="text-gray-500 text-sm">Bienvenue !</p>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-end flex-1">
          <AiOutlineBell className="text-gray-600" size={20} />
          <AiOutlineUser className="text-gray-600" size={20} />
        
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
          >
            <AiOutlineDownload />
            <span>Télécharger CR</span>
          </button>
        </div>
      </div>

        </div>


      {renderDropdown()}
    </header>
  );
}