// ✅ fttb/header.js harmonisé avec HISPEED

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

    const fixedKpiLabels = [
      "KPI Tickets Entrants",
      "KPI Tickets Traités",
      "KPI Tickets Réentrants",
      "KPI Tickets en Cours",
      "KPI Tickets en Cours +14j"
    ];
    const normalizedLabels = fixedKpiLabels.map((l) => l.toLowerCase());
    const kpiImages = images.filter(img => normalizedLabels.includes((img.label || img.id).toLowerCase()));
    const graphImages = images.filter(img => !normalizedLabels.includes((img.label || img.id).toLowerCase()));

    const intro = ppt.addSlide();
    intro.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "F5F7FA" } });
    intro.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 1.5, w: "100%", h: 1.5, fill: { color: "31327E" } });
    intro.addImage({ path: "https://myit-three.vercel.app/logo-intelcia-small.png", x: 0.5, y: 0.4, w: 1.2, h: 0.6 });
    intro.addImage({ path: "https://myit-three.vercel.app/logo_sfr_small.png", x: 8.3, y: 0.4, w: 1.2, h: 1 });
    intro.addText("Compte Rendu FTTB", { x: 2, y: 1.8, w: 6, fontSize: 28, bold: true, color: "FFFFFF", align: "center" });
    intro.addText("Suivi d'activité et analyse des performances", { x: 2, y: 2.2, w: 6, fontSize: 16, color: "FFFFFF", align: "center" });
    intro.addText(`Date : ${formattedDate}`, { x: 7, y: 5.3, w: 2.5, fontSize: 14, color: "363636", align: "right" });

    if (kpiImages.length > 0) {
      const slide = ppt.addSlide();
      slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "F5F7FA" } });
      slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: 0.8, fill: { color: "31327E" } });
      slide.addText("KPI - Key Performance Indicators", { x: 0.5, y: 0.15, fontSize: 24, bold: true, color: "FFFFFF" });
      slide.addText("Suivi des indicateurs essentiels de performance FTTB", { x: 0.5, y: 0.9, fontSize: 14, color: "6b7280" });
      let x = 0.5, y = 1.4;
      const w = 1.8, h = 1.6, sx = 0.2, sy = 0.3;
      const createKPI = (item, posX, posY) => {
        slide.addShape(ppt.shapes.RECTANGLE, { x: posX, y: posY, w, h, fill: { color: "FFFFFF" }, line: { color: "DDDDDD" }, shadow: { type: "outer", blur: 3, offset: 1, angle: 45, color: "CFCFCF" } });
        slide.addShape(ppt.shapes.RECTANGLE, { x: posX, y: posY, w, h: 0.3, fill: { color: "68BDDD" } });
        slide.addText(item.label || "KPI", { x: posX, y: posY + 0.05, w, fontSize: 9, bold: true, color: "FFFFFF", align: "center" });
        if (item.image) {
          slide.addImage({ data: item.image, x: posX + 0.1, y: posY + 0.35, w: w - 0.2, h: h - 0.5 });
        } else {
          slide.addText("⚠️ Image non disponible", { x: posX + 0.1, y: posY + 0.6, w: w - 0.2, fontSize: 9, color: "FF0000", bold: true, align: "center" });
        }
      };
      const mapping = ["entrants", "traités", "réentrants", "en cours", "+14j"];
      const mapToKpi = (key) => kpiImages.find(kpi => (kpi.label || kpi.id).toLowerCase().includes(key));
      for (let i = 0; i < 4; i++) createKPI(mapToKpi(mapping[i]), x + i * (w + sx), y);
      createKPI(mapToKpi(mapping[4]), (10 - w) / 2, y + h + sy);
      slide.addShape(ppt.shapes.RECTANGLE, { x: 0.5, y: 5, w: 9, h: 0.6, fill: { color: "FFFFFF" }, line: { color: "68BDDD", width: 1, dashType: "dash" } });
      slide.addText("💬 Commentaire global : ___________________________________________", { x: 0.7, y: 5.15, fontSize: 12, color: "4B5563" });
    }

    for (const item of graphImages) {
      const slide = ppt.addSlide();
      slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "F5F7FA" } });
      slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: 0.6, fill: { color: "68BDDD" } });
      slide.addText(item.label || "Graphique", { x: 0.5, y: 0.15, fontSize: 16, bold: true, color: "FFFFFF" });
      slide.addShape(ppt.shapes.RECTANGLE, { x: 1, y: 0.8, w: 8, h: 4.2, fill: { color: "FFFFFF" }, line: { color: "DDDDDD" }, shadow: { type: "outer", blur: 3, offset: 1, angle: 45, color: "CFCFCF" } });
      if (item.image) {
        slide.addImage({ data: item.image, x: 1.2, y: 1, w: 7.6, h: 3.8 });
      } else {
        slide.addText("⚠️ Image non disponible", { x: 3, y: 2.5, fontSize: 16, color: "FF0000", bold: true, align: "center" });
      }
      slide.addShape(ppt.shapes.RECTANGLE, { x: 1, y: 5.2, w: 8, h: 0.6, fill: { color: "FFFFFF" }, line: { color: "68BDDD", width: 1, dashType: "dash" } });
      slide.addText("💬 Commentaire détaillé : ___________________________________________", { x: 1.2, y: 5.35, fontSize: 12, color: "4B5563" });
    }

    await ppt.writeFile({ fileName: `compte_rendu_fttb_${todayStr}.pptx` });
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
