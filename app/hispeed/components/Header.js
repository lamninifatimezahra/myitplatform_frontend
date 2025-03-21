"use client";
import { useState } from "react";
import html2canvas from "html2canvas-pro"; // Utilisation de html2canvas-pro
import { saveAs } from "file-saver";
import PptxGenJS from "pptxgenjs";
import { Document, Packer, Paragraph, ImageRun } from "docx";
import {
  AiOutlineSearch,
  AiOutlineBell,
  AiOutlineUser,
  AiOutlineFilter,
  AiOutlineDownload
} from "react-icons/ai";

export default function Header() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // 📌 Fonction pour capturer les visualisations
  const captureScreenshots = async () => {
    const elements = document.querySelectorAll(".visualisation");
    const images = [];

    for (let element of elements) {
      try {
        // Capture de l'image avec html2canvas-pro
        const canvas = await html2canvas(element, {
          backgroundColor: "#ffffff", // Forcer un fond blanc
          removeContainer: true,
          useCORS: true,
        });

        const imageData = canvas.toDataURL("image/png");
        images.push(imageData);
      } catch (error) {
        console.error("Erreur de capture d'écran :", error);
      }
    }

    return images.length > 0 ? images : null; // Vérifie qu'on a bien des images
  };

  // 📌 Générer un fichier Word
  const generateWord = async () => {
    setIsGenerating(true);
    setShowMenu(false); // Fermer le menu après sélection
    const images = await captureScreenshots();

    if (!images) {
      alert("Erreur : Impossible de capturer les visuels !");
      setIsGenerating(false);
      return;
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: images.map(image => [
            new Paragraph({
              children: [
                new ImageRun({ data: image, transformation: { width: 600, height: 300 } })
              ]
            }),
            new Paragraph("Commentaire : ____________________________________________________"),
            new Paragraph(""),
          ]).flat(),
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Compte_Rendu.docx");
    setIsGenerating(false);
  };

  // 📌 Générer un fichier PowerPoint
  const generatePPT = async () => {
    setIsGenerating(true);
    setShowMenu(false);
    const images = await captureScreenshots();

    if (!images) {
      alert("Erreur : Impossible de capturer les visuels !");
      setIsGenerating(false);
      return;
    }

    const ppt = new PptxGenJS();
    images.forEach(image => {
      const slide = ppt.addSlide();
      slide.addImage({ data: image, x: 1, y: 1, w: 7, h: 3.5 });
      slide.addText("Commentaire :", { x: 1, y: 4.5, fontSize: 14, color: "000000" });
    });

    ppt.writeFile({ fileName: "Compte_Rendu.pptx" });
    setIsGenerating(false);
  };

  return (
    <header className="bg-white shadow-md flex justify-between items-center px-6 py-4">
      {/* Titre */}
      <div>
        <h1 className="text-xl font-bold text-blue-700">Dashboard HISPEED</h1>
        <p className="text-gray-600">Bienvenue</p>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-6">
        <AiOutlineSearch size={24} className="text-gray-600 cursor-pointer hover:text-blue-500" />
        <AiOutlineBell size={24} className="text-gray-600 cursor-pointer hover:text-blue-500" />
        <AiOutlineUser size={24} className="text-gray-600 cursor-pointer hover:text-blue-500" />

        <button className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition">
          <AiOutlineFilter className="text-gray-800" />
          <span className="text-gray-800">Filtrer</span>
        </button>

        {/* 📌 Bouton Télécharger CR avec menu déroulant */}
        <div className="relative">
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
            onClick={() => setShowMenu(!showMenu)}
          >
            <AiOutlineDownload className="text-gray-800" />
            <span className="text-gray-800">{isGenerating ? "Génération..." : "Télécharger CR"}</span>
          </button>

          {/* 📌 Menu déroulant pour choisir le format */}
          {showMenu && (
            <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-2 w-48 z-50">
              <button
                className="block px-4 py-2 text-gray-800 hover:bg-gray-200 w-full text-left"
                onClick={generateWord}
              >
                📄 Télécharger en Word
              </button>
              <button
                className="block px-4 py-2 text-gray-800 hover:bg-gray-200 w-full text-left"
                onClick={generatePPT}
              >
                📊 Télécharger en PowerPoint
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
