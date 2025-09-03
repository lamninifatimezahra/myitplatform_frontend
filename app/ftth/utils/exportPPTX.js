import pptxgen from "pptxgenjs";

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export async function generatePPTFromImages(imageList, startDate = null, endDate = null) {
  // Debug : Affichage complet de l'imageList reçue
  console.log("DEBUG FTTH PPT: Contenu de imageList :", imageList);

  const pptx = new pptxgen();
  const todayStr = new Date().toLocaleDateString("fr-FR");
  const fileDate = todayStr.replace(/\//g, "-");

  const blue = "#0B2F5A";
  const introBackground = "/ftth_intro.png";
  const kpiTitleBackground = "/ftth_1.png";
  const transverseBackground = "/ftth_2.png";
  const tyBackground = "/ftth_ty.png";
  const endBackground = "/fin.png";
  const contentBackground = "/ftth_diapo.png";

  let weekStr = "Date";
  let dateRangeText = "";

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const allWeeks = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      allWeeks.push(getWeekNumber(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    const uniqueWeeks = [...new Set(allWeeks)].sort((a, b) => a - b);
    weekStr = `S${uniqueWeeks.join("-")}`;
    dateRangeText = `Période : ${weekStr} | Du ${start.toLocaleDateString()} au ${end.toLocaleDateString()}`;
  }

  // Tableau fixe des KPI à exclure des slides (seront dans la slide KPI)
  const fixedKpiLabels = [
    "KPI Backlog J",
    "KPI Backlog J1"
  ];
  const normalizedFixedLabels = fixedKpiLabels.map(label => label.trim().toLowerCase());

  // Extraction des images graphiques qui ne sont pas des KPI
  const graphImagesList = imageList.filter(item => {
    const currentLabel = (item.label != null ? item.label : item.id);
    return !normalizedFixedLabels.includes(currentLabel.trim().toLowerCase());
  });

  console.log("DEBUG FTTH PPT: Graphiques filtrés (sans KPI) :", graphImagesList);

  // Slide 1 – Intro
  const cover = pptx.addSlide();
  cover.addImage({ path: introBackground, x: 0, y: 0, w: "100%", h: "100%" });
  cover.addText("Comité Opérationnel Bimensuel\nEA FTTH", {
    x: 0.5, y: 2.1, w: 9, h: 1.0, align: "center", fontSize: 30, bold: true, color: "FFFFFF"
  });
  if (dateRangeText) {
    cover.addShape(pptx.ShapeType.rect, {
      x: 2.2, y: 3.3, w: 5.6, h: 0.6, fill: { color: "#2E2E2E" }, roundRadius: 6
    });
    cover.addText(dateRangeText, {
      x: 2.2, y: 3.3, w: 5.6, h: 0.6, align: "center", fontSize: 14, color: "FFFFFF", bold: true
    });
  }
  cover.addText(`Édité le : ${todayStr}`, {
    x: 7.0, y: 5.2, w: 2.8, h: 0.3, align: "right", fontSize: 10, color: "D0D0D0"
  });

  // Slide 2 – KPI Title
  const kpiTitle = pptx.addSlide();
  kpiTitle.addImage({ path: kpiTitleBackground, x: 0, y: 0, w: "100%", h: "100%" });
  kpiTitle.addText("KPIs Opérationnels", {
    x: 1, y: 2.3, w: 9, h: 1, align: "center", fontSize: 60, bold: true, color: "FFFFFF"
  });

  // Fonction pour créer une slide à partir d'une image capturée
  function createSlideFromImage(imageItem, defaultTitle = "") {
    const slide = pptx.addSlide();
    slide.addImage({ path: contentBackground, x: 0, y: 0, w: "100%", h: "100%" });
    
    const title = imageItem.label || imageItem.id || defaultTitle;
    
    // Titre de la slide
    slide.addText(title, {
      x: 0.5, y: 0.7, w: 9.0, h: 0.4, 
      fontSize: 18, bold: true, color: blue, align: "left"
    });

    // Image du graphique
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.7, y: 1.4, w: 5.2, h: 3.1,
      fill: { color: "#ffffff" }, line: { color: "#d1d5db", width: 1 }
    });
    
    slide.addImage({ 
      data: imageItem.image, 
      x: 0.8, y: 1.5, w: 5.0, h: 2.9 
    });

    // Zone de commentaire
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.0, y: 1.4, w: 3.0, h: 3.2,
      fill: { color: "#f9fafb" },
      line: { color: "#DDEEFF", width: 1 },
      shadow: { type: "outer", blur: 1, offset: 1, angle: 45, color: "E0E0E0" }
    });

    slide.addText([
      { text: "Observations clés:", options: { fontSize: 11, color: blue, bold: true, breakLine: true } },
      { text: "• ", options: { fontSize: 11, color: "#4B5563" } },
      { text: "[Aucune observation ajoutée]", options: { fontSize: 11, color: "#4B5563" } }
    ], {
      x: 6.2, y: 1.9, w: 2.6, h: 2.6, valign: "top"
    });

    // Affichage de la plage de dates sous le graphe
    if (dateRangeText) {
      slide.addText(dateRangeText, {
        x: 0.7, y: 4.7, w: 5.2, h: 0.4,
        align: "center", fontSize: 12, color: "#6b7280"
      });
    }
  }

  // Créer les slides pour tous les graphiques (pas les KPI)
  graphImagesList.forEach(imageItem => {
    createSlideFromImage(imageItem);
  });

  // Slides fixes du template FTTH

  // Slide – Transverse
  const transverse = pptx.addSlide();
  transverse.addImage({ path: transverseBackground, x: 0, y: 0, w: "100%", h: "100%" });
  transverse.addText("Suivi Transverse", {
    x: 1, y: 2.3, w: 9, h: 1, align: "center", fontSize: 60, bold: true, color: "FFFFFF"
  });

  // Slide – Sujets Transverses
  const sujetsTransverses = pptx.addSlide();
  sujetsTransverses.addImage({ path: contentBackground, x: 0, y: 0, w: "100%", h: "100%" });

  sujetsTransverses.addText("Sujets Transverses", {
    x: 0.6, y: 0.7, w: 8, h: 0.4,
    fontSize: 20, bold: true, color: blue, align: "left"
  });

  // Bloc 1 – Sujet à Gauche
  sujetsTransverses.addText("📌 **Titre du Sujet 1**", {
    x: 0.6, y: 1.3, w: 3.5, h: 0.4,
    fontSize: 14, bold: true, color: blue, align: "left"
  });
  sujetsTransverses.addText("Description :\nIci votre description détaillée.", {
    x: 0.6, y: 1.8, w: 3.5, h: 1.2,
    fontSize: 12, color: "#374151", lineSpacingMultiple: 1.3
  });
  sujetsTransverses.addText("Action :\nIci votre action à définir.", {
    x: 0.6, y: 3.1, w: 3.5, h: 0.6,
    fontSize: 12, color: "#374151"
  });

  // Bloc 2 – Sujet à Droite
  sujetsTransverses.addText("📌 **Titre du Sujet 2**", {
    x: 5.0, y: 1.3, w: 3.5, h: 0.4,
    fontSize: 14, bold: true, color: blue, align: "left"
  });
  sujetsTransverses.addText("Description :\nIci une autre description de sujet.", {
    x: 5.0, y: 1.8, w: 3.5, h: 1.2,
    fontSize: 12, color: "#374151", lineSpacingMultiple: 1.3
  });
  sujetsTransverses.addText("Action :\nDéfinissez ici l'action associée.", {
    x: 5.0, y: 3.1, w: 3.5, h: 0.6,
    fontSize: 12, color: "#374151"
  });

  // Séparateur Horizontal
  sujetsTransverses.addShape(pptx.ShapeType.line, { 
    x: 0.6, y: 4.0, w: 8.0, 
    line: { color: "#d1d5db", width: 1 } 
  });

  // Bloc Conclusion
  sujetsTransverses.addShape(pptx.ShapeType.roundRect, {
    x: 1.5, y: 3.9, w: 7.0, h: 1.0,
    fill: { color: "#F0F5FF" },
    line: { color: "#93c5fd", width: 1 },
    roundRadius: 12,
    shadow: { type: "outer", blur: 3, offset: 2, angle: 45, color: "999999" }
  });

  sujetsTransverses.addText("💡 La gestion des sujets transverses demande de la rigueur, de la coordination et une communication efficace entre les équipes.", {
    x: 1.7, y: 4.0, w: 6.6, h: 0.8,
    fontSize: 13, bold: true, color: blue, align: "center", lineSpacingMultiple: 1.4
  });

  // Slide – Météo & Humeur Générale
  const moodSlide = pptx.addSlide();
  moodSlide.addImage({ path: contentBackground, x: 0, y: 0, w: "100%", h: "100%" });

  moodSlide.addText("Météo & Humeur Générale", {
    x: 0.6, y: 0.7, w: 8, h: 0.4, fontSize: 20, bold: true, color: blue
  });

  const moodBlocks = [
    { title: "Météo Delivery", icons: ["☀", "🌥", "⚡"], colors: ["#facc15", "#9ca3af", "#ef4444"] },
    { title: "Mood Équipe", icons: ["🙂", "😐", "🙁"], colors: ["#10b981", "#fbbf24", "#ef4444"] },
    { title: "Mood SFR", icons: ["🙂", "😐", "🙁"], colors: ["#10b981", "#fbbf24", "#ef4444"] }
  ];

  const blockW = 2.8;
  const blockH = 1.6;
  const blockSpacing = 0.25;
  const moodTotalWidth = moodBlocks.length * blockW + (moodBlocks.length - 1) * blockSpacing;
  const moodStartX = (10 - moodTotalWidth) / 2;
  const blockY = 2.4;

  moodBlocks.forEach((block, i) => {
    const x = moodStartX + i * (blockW + blockSpacing);

    moodSlide.addShape(pptx.ShapeType.rect, { x, y: blockY, w: blockW, h: 0.35, fill: { color: "#2563eb" } });
    moodSlide.addText(block.title, {
      x: x + 0.1, y: blockY + 0.05, w: blockW - 0.2, h: 0.3,
      fontSize: 11, bold: true, color: "#ffffff", align: "center"
    });

    const emojiY = blockY + 0.4;
    const cellW = blockW / 3;
    const cellH = 1.1;

    for (let j = 0; j < 3; j++) {
      moodSlide.addShape(pptx.ShapeType.rect, {
        x: x + j * cellW, y: emojiY, w: cellW, h: cellH,
        fill: { color: "#ffffff" }, line: { color: "#cbd5e1", width: 1 }
      });

      moodSlide.addText(block.icons[j], {
        x: x + j * cellW, y: emojiY + 0.2, w: cellW, h: 0.7,
        align: "center", fontSize: 24, bold: true, color: block.colors[j]
      });
    }

    moodSlide.addShape(pptx.ShapeType.rect, {
      x: x, y: emojiY, w: cellW, h: cellH,
      line: { color: "#2563eb", width: 2 },
      fill: { color: "FFFFFF", transparency: 100 }
    });
  });

  // Slide – Synthèse
  const synthese = pptx.addSlide();
  synthese.addImage({ path: contentBackground, x: 0, y: 0, w: "100%", h: "100%" });
  synthese.addText("Synthèse opérationnelle", {
    x: 0.6, y: 0.7, w: 8, h: 0.4, fontSize: 20, bold: true, color: blue
  });

  const cardW = 2.9, cardH = 3.3, cardY = 1.5, headerH = 0.4, cardSpacing = 0.2;
  const synthTotalWidth = 3 * cardW + 2 * cardSpacing;
  const synthStartX = (10 - synthTotalWidth) / 2;
  const bodyY = cardY + headerH + 0.2;
  const bulletText = Array(5).fill("• Saisissez votre point").join("\n\n");

  function addStyledCard(slide, { x, headerColor, title }) {
    slide.addShape(pptx.ShapeType.rect, { x, y: cardY, w: cardW, h: cardH, fill: { color: "#ffffff" }, line: { color: headerColor, width: 1.5 } });
    slide.addShape(pptx.ShapeType.rect, { x, y: cardY, w: cardW, h: headerH, fill: { color: headerColor } });
    slide.addText(title, {
      x: x + 0.1, y: cardY + 0.05, w: cardW - 0.2, h: 0.3,
      fontSize: 12, bold: true, color: "#ffffff", align: "center"
    });
    slide.addText(bulletText, {
      x: x + 0.2, y: bodyY, w: cardW - 0.4, h: cardH - headerH - 0.4,
      fontSize: 11, color: "#1f2937", lineSpacingMultiple: 1.5
    });
  }

  addStyledCard(synthese, { x: synthStartX, headerColor: "#ef4444", title: "Faits marquants" });
  addStyledCard(synthese, { x: synthStartX + cardW + cardSpacing, headerColor: "#10b981", title: "Amélioration continue" });
  addStyledCard(synthese, { x: synthStartX + 2 * (cardW + cardSpacing), headerColor: "#facc15", title: "Points d'attention" });

  // Slide – Merci
  const tySlide = pptx.addSlide();
  tySlide.addImage({ path: tyBackground, x: 0, y: 0, w: "100%", h: "100%" });

  // Slide – Fin
  const end = pptx.addSlide();
  end.addImage({ path: endBackground, x: 0, y: 0, w: "100%", h: "100%" });

  await pptx.writeFile({ fileName: `COMOP FTTH (${weekStr}) ${fileDate}.pptx` });
  console.log("DEBUG FTTH PPT: Présentation générée avec succès");
}

// Garde aussi l'ancienne fonction pour compatibilité si nécessaire
export async function generatePPTFromGraphs({
  graphList = [],
  commentMap = {},
  globalStartDate,
  globalEndDate,
}) {
  console.warn("FTTH PPT: generatePPTFromGraphs est dépréciée, utilisez generatePPTFromImages");
  // Convertir l'ancien format vers le nouveau
  return generatePPTFromImages(graphList, globalStartDate, globalEndDate);
}

export default generatePPTFromImages;