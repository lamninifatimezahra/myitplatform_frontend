"use client";
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { AiOutlineBell, AiOutlineUser, AiOutlineDownload } from "react-icons/ai";
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

  // Fonction pour précharger les images et les convertir en base64
  const preloadImageAsBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => {
        console.warn(`Impossible de charger l'image: ${url}`);
        resolve(null); // On résout avec null pour éviter de bloquer le processus
      };
      img.src = url;
    });
  };

  const generateWord = async () => {
    if (selectedGraphs.length === 0) return alert("Sélectionnez au moins une visualisation.");
    const images = await captureScreenshots();
    await generateWordFromImages(images);
  };

  const generatePPT = async () => {
    if (selectedGraphs.length === 0)
      return alert("Sélectionnez au moins une visualisation.");
    
    const images = await captureScreenshots();
    const ppt = new PptxGenJS();

    // Préchargement des logos
    const intelciaLogoUrl = "https://myit-three.vercel.app/logo-intelcia-small.png";
    const sfrLogoUrl = "https://myit-three.vercel.app/logo_sfr_small.png";
    
    let intelciaLogoBase64 = null;
    let sfrLogoBase64 = null;
    
    try {
      intelciaLogoBase64 = await preloadImageAsBase64(intelciaLogoUrl);
      sfrLogoBase64 = await preloadImageAsBase64(sfrLogoUrl);
    } catch (err) {
      console.error("Erreur lors du préchargement des logos:", err);
    }

    const fixedKpiLabels = [
      "KPI Tickets Entrants",
      "KPI Tickets Traités",
      "KPI Tickets Réentrants",
      "KPI Tickets en Cours",
      "KPI Tickets en Cours +14j"
    ];
    const normalizedLabels = fixedKpiLabels.map((l) => l.toLowerCase());
    const kpiImages = images.filter(img => normalizedLabels.some(label => 
      (img.label || img.id).toLowerCase().includes(label.replace("kpi ", "").toLowerCase())
    ));
    const graphImages = images.filter(img => !kpiImages.includes(img));
    const tableImages = graphImages.filter(img => 
      ["Tickets en cours - Plus de 2 semaines", "Détail des Réitérations des Tickets"].some(id => 
        (img.id || "").includes(id) || (img.label || "").includes(id)
      )
    );
    const standardGraphImages = graphImages.filter(img => !tableImages.includes(img));

    // Slide d'introduction
    const intro = ppt.addSlide();
    intro.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "F5F7FA" } });
    intro.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 1.5, w: "100%", h: 1.5, fill: { color: "31327E" } });
    
    // Ajouter les logos en base64 au lieu des URLs
    if (intelciaLogoBase64) {
      intro.addImage({ data: intelciaLogoBase64, x: 0.5, y: 0.4, w: 1.2, h: 0.6 });
    } else {
      intro.addText("INTELCIA", { x: 0.5, y: 0.4, w: 1.2, h: 0.6, color: "31327E", fontSize: 10, bold: true });
    }
    
    if (sfrLogoBase64) {
      intro.addImage({ data: sfrLogoBase64, x: 8.3, y: 0.4, w: 1.2, h: 1 });
    } else {
      intro.addText("SFR", { x: 8.3, y: 0.4, w: 1.2, h: 0.6, color: "FF0000", fontSize: 14, bold: true });
    }
    
    intro.addText("Compte Rendu HISPEED", { x: 2, y: 1.8, w: 6, fontSize: 28, bold: true, color: "FFFFFF", align: "center" });
    intro.addText("Suivi d'activité et analyse des performances", { x: 2, y: 2.2, w: 6, fontSize: 16, color: "FFFFFF", align: "center" });
    intro.addText(`Date : ${formattedDate}`, { x: 7, y: 5.3, w: 2.5, fontSize: 14, color: "363636", align: "right" });

    // KPI Slide
    if (kpiImages.length > 0) {
      const slide = ppt.addSlide();
      slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "F5F7FA" } });
      slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: 0.8, fill: { color: "31327E" } });
      slide.addText("KPI - Key Performance Indicators", { x: 0.5, y: 0.15, fontSize: 24, bold: true, color: "FFFFFF" });
      slide.addText("Suivi des indicateurs essentiels de performance HISPEED", { x: 0.5, y: 0.9, fontSize: 14, color: "6b7280" });
      
      let x = 0.5, y = 1.4;
      const w = 1.8, h = 1.6, sx = 0.2, sy = 0.3;
      
      const createKPI = (kpiImage, posX, posY) => {
        // Vérifier si kpiImage est défini avant d'accéder à ses propriétés
        if (!kpiImage) {
          // Créer un KPI vide si l'image n'est pas disponible
          slide.addShape(ppt.shapes.RECTANGLE, { x: posX, y: posY, w, h, fill: { color: "FFFFFF" }, line: { color: "DDDDDD" }, shadow: { type: "outer", blur: 3, offset: 1, angle: 45, color: "CFCFCF" } });
          slide.addShape(ppt.shapes.RECTANGLE, { x: posX, y: posY, w, h: 0.3, fill: { color: "68BDDD" } });
          slide.addText("KPI", { x: posX, y: posY + 0.05, w, fontSize: 9, bold: true, color: "FFFFFF", align: "center" });
          slide.addText("⚠️ Image non disponible", { x: posX + 0.1, y: posY + 0.6, w: w - 0.2, fontSize: 9, color: "FF0000", bold: true, align: "center" });
          return;
        }
        
        // Si kpiImage est défini, on l'utilise
        slide.addShape(ppt.shapes.RECTANGLE, { x: posX, y: posY, w, h, fill: { color: "FFFFFF" }, line: { color: "DDDDDD" }, shadow: { type: "outer", blur: 3, offset: 1, angle: 45, color: "CFCFCF" } });
        slide.addShape(ppt.shapes.RECTANGLE, { x: posX, y: posY, w, h: 0.3, fill: { color: "68BDDD" } });
        slide.addText(kpiImage.label || "KPI", { x: posX, y: posY + 0.05, w, fontSize: 9, bold: true, color: "FFFFFF", align: "center" });
        
        if (kpiImage.image) {
          slide.addImage({ data: kpiImage.image, x: posX + 0.1, y: posY + 0.35, w: w - 0.2, h: h - 0.5 });
        } else {
          slide.addText("⚠️ Image non disponible", { x: posX + 0.1, y: posY + 0.6, w: w - 0.2, fontSize: 9, color: "FF0000", bold: true, align: "center" });
        }
      };

      // Fonction pour trouver un KPI correspondant à un mot-clé
      const mapToKpi = (keyword) => {
        return kpiImages.find(kpi => {
          const label = (kpi.label || kpi.id || "").toLowerCase();
          return label.includes(keyword);
        });
      };

      // Affichage des KPIs
      const keywords = ["entrants", "traités", "réentrants", "en cours"];
      for (let i = 0; i < 4; i++) {
        const kpi = mapToKpi(keywords[i]);
        createKPI(kpi, x + i * (w + sx), y);
      }
      
      // KPI "+14j" au centre en bas
      const kpi14j = mapToKpi("+14j");
      createKPI(kpi14j, (10 - w) / 2, y + h + sy);
      
      // Zone de commentaire
      slide.addShape(ppt.shapes.RECTANGLE, { x: 0.5, y: 5, w: 9, h: 0.6, fill: { color: "FFFFFF" }, line: { color: "68BDDD", width: 1, dashType: "dash" } });
      slide.addText("💬 Commentaire global : ___________________________________________", { x: 0.7, y: 5.15, fontSize: 12, color: "4B5563" });
    }

    // Graphiques standards
    for (const item of standardGraphImages) {
      const slide = ppt.addSlide();
      slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "F5F7FA" } });
      slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: 0.6, fill: { color: "68BDDD" } });
      slide.addText(item.label || "Graphique", { x: 0.5, y: 0.15, fontSize: 16, bold: true, color: "FFFFFF" });
      
      // Diviser la slide en 3 tiers verticaux
      const slideWidth = 10; // PowerPoint utilise 10 pouces de largeur
      const slideHeight = 5.63; // ~5.63 pouces de hauteur 
      const headerHeight = 0.6; // Hauteur de l'en-tête bleu
      const contentHeight = slideHeight - headerHeight - 0.2; // Hauteur disponible après le header avec une petite marge
      const tierHeight = contentHeight / 3; // Hauteur d'un tiers
      
      // Calculer les positions pour l'image (2/3 de la largeur)
      const imageWidth = (slideWidth * 2/3) - 1; // 2/3 de la largeur avec marge
      const imageHeight = tierHeight * 3 - 0.8; // 3 tiers avec marge
      const imageX = 0.5; // Marge gauche
      const imageY = headerHeight + 0.2; // Position Y après le header avec marge
      
      // Calculer les positions pour la section commentaire (1/3 de la largeur)
      const commentWidth = (slideWidth * 1/3) - 0.5; // 1/3 de la largeur avec marge
      const commentX = imageX + imageWidth + 0.2; // Position X après l'image avec marge
      const commentY = headerHeight + 0.2; // Même niveau Y que l'image
      const commentHeight = imageHeight; // Même hauteur que l'image
      
      // Ajouter le conteneur pour l'image
      slide.addShape(ppt.shapes.RECTANGLE, { 
        x: imageX, 
        y: imageY, 
        w: imageWidth, 
        h: imageHeight, 
        fill: { color: "FFFFFF" }, 
        line: { color: "DDDDDD" }, 
        shadow: { type: "outer", blur: 3, offset: 1, angle: 45, color: "CFCFCF" } 
      });
      
      // Ajouter l'image
      if (item.image) {
        slide.addImage({ 
          data: item.image, 
          x: imageX + 0.3, 
          y: imageY + 0.3, 
          w: imageWidth - 0.6, 
          h: imageHeight - 0.6 
        });
      } else {
        slide.addText("⚠️ Image non disponible", { 
          x: imageX + 0.5, 
          y: imageY + imageHeight/2 - 0.2, 
          fontSize: 16, 
          color: "FF0000", 
          bold: true, 
          align: "center" 
        });
      }
      
      // Ajouter la section commentaire avec titre
      slide.addShape(ppt.shapes.RECTANGLE, { 
        x: commentX, 
        y: commentY, 
        w: commentWidth, 
        h: commentHeight, 
        fill: { color: "FFFFFF" }, 
        line: { color: "68BDDD", width: 1, dashType: "dash" } 
      });
      
      // Titre de la section commentaire
      slide.addShape(ppt.shapes.RECTANGLE, { 
        x: commentX, 
        y: commentY, 
        w: commentWidth, 
        h: 0.4, 
        fill: { color: "E6F2F8" } 
      });
      
      slide.addText("💬 Commentaire", { 
        x: commentX , 
        y: commentY + 0.15, 
        w: commentWidth - 0.2, 
        fontSize: 14, 
        bold: true, 
        color: "31327E", 
        align: "center" 
      });
      
      // Zone de commentaire
      slide.addText(
        "Observations clés:\n\n" +
        "___________________________\n\n" +
        "___________________________\n\n" +
        "___________________________\n\n" +
        "Points d'action:\n\n" +
        "□ ________________________\n\n" +
        "□ ________________________\n\n" +
        "□ ________________________", 
        { 
          x: commentX + 0.2, 
          y: commentY + 0.5, 
          w: commentWidth - 0.4, 
          h: commentHeight - 0.7,
          fontSize: 11, 
          color: "4B5563" 
        }
      );
    }

    // Tableaux à la fin de la présentation
    for (const item of tableImages) {
      const slide = ppt.addSlide();
      slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "F5F7FA" } });
      slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: 0.6, fill: { color: "68BDDD" } });
      slide.addText(item.label || "Tableau", { x: 0.5, y: 0.15, fontSize: 16, bold: true, color: "FFFFFF" });
      slide.addShape(ppt.shapes.RECTANGLE, { x: 1, y: 0.8, w: 8, h: 4.2, fill: { color: "FFFFFF" }, line: { color: "DDDDDD" }, shadow: { type: "outer", blur: 3, offset: 1, angle: 45, color: "CFCFCF" } });

      let imageX = 1.4, imageY = 1.2, imageW = 7.0, imageH = 2.0;
      if (item.image) {
        slide.addImage({ 
          data: item.image, 
          x: imageX, 
          y: imageY, 
          w: imageW, 
          h: imageH 
        });
      } else {
        slide.addText("⚠️ Image non disponible", { 
          x: 3, 
          y: 2.5, 
          fontSize: 16, 
          color: "FF0000", 
          bold: true, 
          align: "center" 
        });
      }
      const commentY = imageY + imageH + 0.2;
      slide.addShape(ppt.shapes.RECTANGLE, { 
        x: 1, 
        y: commentY, 
        w: 8, 
        h: 0.6, 
        fill: { color: "FFFFFF" }, 
        line: { color: "68BDDD", width: 1, dashType: "dash" } 
      });
      slide.addText("💬 Commentaire détaillé : ___________________________________________", { 
        x: 1.2, 
        y: commentY + 0.15, 
        fontSize: 12, 
        color: "4B5563" 
      });
    }

    await ppt.writeFile({ fileName: `compte_rendu_HISPEED_${todayStr}.pptx` });
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
          <div onClick={generateWord} className="cursor-pointer hover:bg-gray-100 px-3 py-2 rounded text-gray-700">
            📄 CR (Format Word)
          </div>
          <div onClick={generatePPT} className="cursor-pointer hover:bg-gray-100 px-3 py-2 rounded text-gray-700">
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
            <span className="text-blue-600">Dashboard FTTB</span>
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