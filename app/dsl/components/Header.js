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
    const elements = Array.from(document.querySelectorAll(".visualisation")).filter((el) =>
      selectedGraphs.includes(el.getAttribute("data-id"))
    );
    const images = [];
    for (const el of elements) {
      try {
        const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
        images.push({
          id: el.getAttribute("data-id"),
          label: el.getAttribute("data-graph-label"),
          image: canvas.toDataURL("image/png"),
        });
      } catch (err) {
        console.error("Erreur capture image:", err);
      }
    }
    return images;
  };

  const generateWord = async () => {
    if (selectedGraphs.length === 0) return alert("Sélectionnez au moins une visualisation.");
    const images = await captureScreenshots();
    await generateWordFromImages(images);
  };

  const generatePPT = async () => {
    if (selectedGraphs.length === 0) return alert("Sélectionnez au moins une visualisation.");
    const images = await captureScreenshots();
    const ppt = new PptxGenJS();
    const intro = ppt.addSlide();
    intro.addText("Compte Rendu DSL", { x: 1, y: 1, fontSize: 24, bold: true });
    intro.addText(`Date : ${formattedDate}`, { x: 1, y: 1.5, fontSize: 18 });
    for (const item of images) {
      const slide = ppt.addSlide();
      slide.addText(item.label, { x: 0.5, y: 0.2, fontSize: 16, bold: true });
      slide.addImage({ data: item.image, x: 0.5, y: 0.6, w: 8.5, h: 4.8 });
    }
    ppt.writeFile({ fileName: `compte_rendu_dsl_${todayStr}.pptx` });
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
            <span className="text-blue-600">Dashboard DSL</span>
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
