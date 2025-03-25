"use client";
import { useState, useEffect } from "react";
import html2canvas from "html2canvas-pro";
import { saveAs } from "file-saver";
import PptxGenJS from "pptxgenjs";
import { Document, Packer, Paragraph, ImageRun } from "docx";
import {
  AiOutlineSearch,
  AiOutlineBell,
  AiOutlineUser,
  AiOutlineFilter,
  AiOutlineDownload,
} from "react-icons/ai";
import { useExport } from "./ExportContext";

export default function Header() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [allIds, setAllIds] = useState([]);
  const { selectedIds, toggleAll } = useExport();

  // 🔁 Met à jour dynamiquement la liste des visualisations visibles
  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateIds = () => {
        const ids = Array.from(document.querySelectorAll(".visualisation"))
          .map((el) => el.getAttribute("data-id"))
          .filter(Boolean);
        setAllIds(ids);
      };

      updateIds(); // Initial

      const observer = new MutationObserver(updateIds);
      observer.observe(document.body, { childList: true, subtree: true });

      return () => observer.disconnect();
    }
  }, []);

  const allChecked = allIds.length > 0 && selectedIds.length === allIds.length;

  // 📸 Capture des visualisations sélectionnées avec styles et taille réels
  const captureScreenshots = async () => {
    const elements = Array.from(document.querySelectorAll(".visualisation")).filter(
      (el) => selectedIds.includes(el.getAttribute("data-id"))
    );

    const images = [];
    for (let element of elements) {
      try {
        const { width, height } = element.getBoundingClientRect();

        const canvas = await html2canvas(element, {
          backgroundColor: null,        // ✅ garde le style original
          useCORS: true,                // ✅ images externes
          scale: 2,                     // ✅ haute résolution
          removeContainer: true,
          width: Math.ceil(width),
          height: Math.ceil(height),
        });

        images.push(canvas.toDataURL("image/png"));
      } catch (error) {
        console.error("Erreur de capture d'écran :", error);
      }
    }

    return images.length > 0 ? images : null;
  };

  // 📄 Génération du Word
  const generateWord = async () => {
    setIsGenerating(true);
    setShowMenu(false);
    const images = await captureScreenshots();

    if (!images) {
      alert("Erreur : Aucune visualisation sélectionnée !");
      setIsGenerating(false);
      return;
    }

    const doc = new Document({
      sections: [
        {
          children: images.flatMap((image) => [
            new Paragraph({
              children: [
                new ImageRun({ data: image, transformation: { width: 600, height: 300 } }),
              ],
            }),
            new Paragraph("Commentaire : ________________________________________"),
            new Paragraph(""),
          ]),
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Compte_Rendu.docx");
    setIsGenerating(false);
  };

  // 📊 Génération du PPT
  const generatePPT = async () => {
    setIsGenerating(true);
    setShowMenu(false);
    const images = await captureScreenshots();

    if (!images) {
      alert("Erreur : Aucune visualisation sélectionnée !");
      setIsGenerating(false);
      return;
    }

    const ppt = new PptxGenJS();
    images.forEach((image) => {
      const slide = ppt.addSlide();
      slide.addImage({ data: image, x: 1, y: 1, w: 7, h: 3.5 });
      slide.addText("Commentaire :", { x: 1, y: 4.5, fontSize: 14 });
    });

    ppt.writeFile({ fileName: "Compte_Rendu.pptx" });
    setIsGenerating(false);
  };

  return (
    <header className="bg-white shadow-md flex justify-between items-center px-6 py-4">
      {/* Titre principal */}
      <div>
        <h1 className="text-xl font-bold text-blue-700">Dashboard HISPEED</h1>
        <p className="text-gray-600">Bienvenue</p>
      </div>

      {/* Actions à droite */}
      <div className="flex items-center space-x-4">
        <AiOutlineSearch size={24} className="text-gray-600" />
        <AiOutlineBell size={24} className="text-gray-600" />
        <AiOutlineUser size={24} className="text-gray-600" />

        {/* ✅ Bouton de sélection groupée */}
        <button
          className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => toggleAll(allIds, !allChecked)}
        >
          <AiOutlineFilter className="text-gray-800"/>
          <span className="text-gray-600">{allChecked ? "Tout décocher" : "Tout cocher"}</span>
        </button>

        {/* 📥 Menu export */}
        <div className="relative">
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
            onClick={() => setShowMenu(!showMenu)}
          >
            <AiOutlineDownload className="text-gray-800" />
            <span className="text-gray-600">{isGenerating ? "Génération..." : "Télécharger CR"}</span>
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-2 w-48 z-50">
              <button
                className="block px-4 py-2 hover:bg-gray-200 w-full text-left text-gray-600"
                onClick={generateWord}
              >
                📄 En Word
              </button>
              <button
                className="block px-4 py-2 hover:bg-gray-200 w-full text-left text-gray-600"
                onClick={generatePPT}
              >
                📊 En PowerPoint
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
