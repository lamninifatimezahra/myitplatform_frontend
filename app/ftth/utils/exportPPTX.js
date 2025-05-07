import pptxgen from "pptxgenjs";
import { toPng } from "html-to-image";

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export async function generatePPTFromGraphs({
  graphList = [],
  commentMap = {},
  globalStartDate,
  globalEndDate,
}) {
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

  if (globalStartDate && globalEndDate) {
    const start = new Date(globalStartDate);
    const end = new Date(globalEndDate);
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

    // Slides 3, 4, 5
    await createGraphSlide(
      pptx,
      "graph-objectif",
      graphList,
      commentMap,
      contentBackground,
      blue,
      dateRangeText
    );
  
    await createGraphSlide(
      pptx,
      "graph-top-regles-par-jour",
      graphList,
      commentMap,
      contentBackground,
      blue,
      dateRangeText
    );
  
    await createGraphSlide(
      pptx,
      "graph-entrants-sortants",
      graphList,
      commentMap,
      contentBackground,
      blue,
      dateRangeText
    );
  
    // Slide 6 – Transverse
    const transverse = pptx.addSlide();
    transverse.addImage({ path: transverseBackground, x: 0, y: 0, w: "100%", h: "100%" });
    transverse.addText("Suivi Transverse", {
      x: 1, y: 2.3, w: 9, h: 1, align: "center", fontSize: 60, bold: true, color: "FFFFFF"
    });
  
    // Slide 7 – Synthèse
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
    addStyledCard(synthese, { x: synthStartX + 2 * (cardW + cardSpacing), headerColor: "#facc15", title: "Points d’attention" });
  
    // Slide 8 – Météo & Humeur Générale
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
  
    // Slide 9 – Merci
    const tySlide = pptx.addSlide();
    tySlide.addImage({ path: tyBackground, x: 0, y: 0, w: "100%", h: "100%" });
  
    // Slide 10 – Fin
    const end = pptx.addSlide();
    end.addImage({ path: endBackground, x: 0, y: 0, w: "100%", h: "100%" });
  

  await pptx.writeFile({ fileName: `COMOP FTTH (${weekStr}) ${fileDate}.pptx` });
}

// 🔧 Fonction utilitaire mise à jour pour afficher la plage dans TOUS les graphes
async function createGraphSlide(pptx, id, graphList, commentMap, background, blue, dateRangeText = "") {
  const el = document.querySelector(`#canvas-${id}`);
  if (!el) return;

  try {
    const image = await toPng(el, { backgroundColor: "#ffffff" });
    const label = graphList.find((g) => g.id === id)?.label || id;
    const comment = commentMap[id]?.trim() || "[Aucune observation ajoutée]";
    const slide = pptx.addSlide();
    slide.addImage({ path: background, x: 0, y: 0, w: "100%", h: "100%" });
    slide.addText(label, { x: 0.5, y: 0.7, w: 9.0, h: 0.4, fontSize: 18, bold: true, color: blue });

    const isObjectif = id === "graph-objectif";

    if (isObjectif) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 2.0, y: 1.5, w: 6.0, h: 3.2,
        fill: { color: "#ffffff" },
        line: { color: "#d1d5db", width: 1 }
      });
      
      slide.addImage({ data: image, x: 2.1, y: 1.6, w: 5.8, h: 3.0 });
    } else {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.7, y: 1.4, w: 5.2, h: 3.1,
        fill: { color: "#ffffff" }, line: { color: "#d1d5db", width: 1 }
      });
      
      slide.addImage({ data: image, x: 0.8, y: 1.5, w: 5.0, h: 2.9 });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.0, y: 1.4, w: 3.0, h: 3.2,
        fill: { color: "#ffffff" }, line: { color: "#DDEEFF", width: 1 },
        shadow: { type: "outer", blur: 1, offset: 1, angle: 45, color: "E0E0E0" }
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 6.0, y: 1.4, w: 3.0, h: 0.4, fill: { color: "#F0F5FF" }, line: { color: "#DDEEFF", width: 1 }
      });
      slide.addText("Observations clés", {
        x: 6.1, y: 1.45, w: 2.8, h: 0.3, fontSize: 13, bold: true, color: blue, align: "center"
      });
      slide.addText([
        { text: "Observations clés:", options: { fontSize: 11, color: blue, bold: true, breakLine: true } },
        { text: "• ", options: { fontSize: 11, color: "#4B5563" } },
        { text: comment, options: { fontSize: 11, color: "#4B5563" } }
      ], {
        x: 6.2, y: 1.9, w: 2.6, h: 2.6, valign: "top"
      });
    }

    // 📆 Affichage de la plage de dates dans tous les cas
    if (dateRangeText) {
      slide.addText(dateRangeText, {
        x: isObjectif ? 2.1 : 0.7,
        y: 4.7,
        w: isObjectif ? 6.0 : 5.2,
        h: 0.4,
        align: "center",
        fontSize: 12,
        color: "#6b7280"
      });
    }
  } catch (err) {
    console.error("Erreur slide", id, err);
  }
}
