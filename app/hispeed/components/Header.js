"use client";
import { useState, useEffect } from "react";
import html2canvas from "html2canvas-pro";
import { saveAs } from "file-saver";
import PptxGenJS from "pptxgenjs";
import { Document, Packer, Paragraph, ImageRun, HeadingLevel } from "docx";
import { AiOutlineSearch, AiOutlineBell, AiOutlineUser, AiOutlineFilter, AiOutlineDownload } from "react-icons/ai";
import { useExport } from "./ExportContext";

export default function Header() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [allIds, setAllIds] = useState([]);
  const { selectedIds, toggleAll } = useExport();

  const todayStr = new Date().toISOString().split("T")[0]; // ex: 2025-03-25
  const formattedDate = new Date().toLocaleDateString("fr-FR"); // ex: 25/03/2025

  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateIds = () => {
        const ids = Array.from(document.querySelectorAll(".visualisation"))
          .map((el) => el.getAttribute("data-id"))
          .filter(Boolean);
        setAllIds(ids);
      };
      updateIds();
      const observer = new MutationObserver(updateIds);
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, []);

  const allChecked = allIds.length > 0 && selectedIds.length === allIds.length;

  const captureScreenshots = async () => {
    const elements = Array.from(document.querySelectorAll(".visualisation")).filter(
      (el) => selectedIds.includes(el.getAttribute("data-id"))
    );
    const images = [];
    for (let element of elements) {
      try {
        const canvas = await html2canvas(element, {
          backgroundColor: null,
          useCORS: true,
          scale: 2,
          removeContainer: true,
          width: element.offsetWidth,
          height: element.offsetHeight,
        });
        images.push(canvas.toDataURL("image/png"));
      } catch (error) {
        console.error("Erreur de capture d'écran :", error);
      }
    }
    return images.length > 0 ? images : null;
  };

  const generateWord = async () => {
    setIsGenerating(true);
    setShowMenu(false);
    const images = await captureScreenshots();
    if (!images) {
      alert("Erreur : Aucune visualisation sélectionnée !");
      setIsGenerating(false);
      return;
    }

    const sfrLogo = await fetch("/logo-sfr.png").then(res => res.blob()).then(blob => blob.arrayBuffer());
    const intelciaLogo = await fetch("/intelcia_it_solutions_logo.jpg").then(res => res.blob()).then(blob => blob.arrayBuffer());

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new ImageRun({ data: sfrLogo, transformation: { width: 100, height: 100 } }),
              ],
              alignment: "left",
            }),
            new Paragraph({
              children: [
                new ImageRun({ data: intelciaLogo, transformation: { width: 100, height: 100 } }),
              ],
              alignment: "right",
            }),
            new Paragraph({
              text: `Compte Rendu HISPEED - ${formattedDate}`,
              heading: HeadingLevel.TITLE,
              spacing: { after: 300 },
              alignment: "center",
            }),
          ],
        },
        {
          children: images.flatMap((image) => [
            new Paragraph({
              children: [
                new ImageRun({ data: image, transformation: { width: 600, height: 300 } }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph("Commentaire : ___________________________________________"),
            new Paragraph(""),
          ]),
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `compte_rendu_hispeed_${todayStr}.docx`);
    setIsGenerating(false);
  };

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
    const firstSlide = ppt.addSlide();
    firstSlide.addText(`Compte Rendu HISPEED`, { x: 1, y: 1, fontSize: 24, bold: true });
    firstSlide.addText(`Date : ${formattedDate}`, { x: 1, y: 1.6, fontSize: 18 });

    images.forEach((image) => {
      const slide = ppt.addSlide();
      slide.addImage({ data: image, x: 0.5, y: 0.5, w: 8.5, h: 4.8 });
      slide.addText("Commentaire :", { x: 0.5, y: 5.4, fontSize: 14 });
    });

    ppt.writeFile({ fileName: `compte_rendu_hispeed_${todayStr}.pptx` });
    setIsGenerating(false);
  };

  return (
    <header className="bg-white shadow-md flex justify-between items-center px-6 py-4">
      <div>
        <h1 className="text-xl font-bold text-blue-700">Dashboard HISPEED</h1>
        <p className="text-gray-600">Bienvenue</p>
      </div>

      <div className="flex items-center space-x-4">
        <AiOutlineSearch size={24} className="text-gray-600" />
        <AiOutlineBell size={24} className="text-gray-600" />
        <AiOutlineUser size={24} className="text-gray-600" />

        <button
          className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => toggleAll(allIds, !allChecked)}
        >
          <AiOutlineFilter className="text-gray-800" />
          <span className="text-gray-600">{allChecked ? "Tout décocher" : "Tout cocher"}</span>
        </button>

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
              <button className="block px-4 py-2 hover:bg-gray-200 w-full text-left text-gray-600" onClick={generateWord}>
                📄 En Word
              </button>
              <button className="block px-4 py-2 hover:bg-gray-200 w-full text-left text-gray-600" onClick={generatePPT}>
                📊 En PowerPoint
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
