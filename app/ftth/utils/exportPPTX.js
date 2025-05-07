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

  // 🟦 Slide 1 – Intro
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

  // 🟦 Slide 2 – Titre KPI
  const kpiTitle = pptx.addSlide();
  kpiTitle.addImage({ path: kpiTitleBackground, x: 0, y: 0, w: "100%", h: "100%" });
  kpiTitle.addText("KPIs Opérationnels", {
    x: 1, y: 2.3, w: 9, h: 1, align: "center", fontSize: 60, bold: true, color: "FFFFFF"
  });

  // 🟦 Slide 3 – Objectif
  await createGraphSlide(pptx, "graph-objectif", graphList, commentMap, contentBackground, blue);

  // 🟦 Slide 4 – Top 5 Règles par jour
  await createGraphSlide(pptx, "graph-top-regles-par-jour", graphList, commentMap, contentBackground, blue);

  // 🟦 Slide 5 – Entrants / Sortants
  await createGraphSlide(pptx, "graph-entrants-sortants", graphList, commentMap, contentBackground, blue);

  // 🟦 Slide 6 – Suivi Transverse
  const transverse = pptx.addSlide();
  transverse.addImage({ path: transverseBackground, x: 0, y: 0, w: "100%", h: "100%" });
  transverse.addText("Suivi Transverse", {
    x: 1, y: 2.3, w: 9, h: 1, align: "center", fontSize: 60, bold: true, color: "FFFFFF"
  });

// 🟦 Slide 7 – Synthèse opérationnelle
const synthese = pptx.addSlide();
synthese.addImage({ path: contentBackground, x: 0, y: 0, w: "100%", h: "100%" });

// ✅ Titre bien aligné comme les autres
synthese.addText("Synthèse opérationnelle", {
  x: 0.6, y: 0.7, w: 8, h: 0.4,
  fontSize: 20, bold: true, color: blue
});

// 📐 Dimensions & espacement réduit
const cardW = 2.9;
const cardH = 3.3;
const cardY = 1.5;
const headerH = 0.4;
const cardSpacing = 0.2; // ⬅️ Réduction plus forte
const totalWidth = 3 * cardW + 2 * cardSpacing;
const startX = (10 - totalWidth) / 2; // Centrage horizontal

const bodyY = cardY + headerH + 0.2;
const bulletText = Array(5).fill("• Saisissez votre point").join("\n\n");

// 🔁 Fonction pour les cartes stylisées
function addStyledCard(slide, { x, headerColor, title }) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y: cardY, w: cardW, h: cardH,
    fill: { color: "#ffffff" },
    line: { color: headerColor, width: 1.5 }
  });

  slide.addShape(pptx.ShapeType.rect, {
    x, y: cardY, w: cardW, h: headerH,
    fill: { color: headerColor }
  });

  slide.addText(title, {
    x: x + 0.1, y: cardY + 0.05, w: cardW - 0.2, h: 0.3,
    fontSize: 12, bold: true, color: "#ffffff", align: "center"
  });

  slide.addText(bulletText, {
    x: x + 0.2, y: bodyY, w: cardW - 0.4, h: cardH - headerH - 0.4,
    fontSize: 11, color: "#1f2937", lineSpacingMultiple: 1.5
  });
}

// 📦 Cartes centrées et rapprochées
addStyledCard(synthese, {
  x: startX, headerColor: "#ef4444", title: "Faits marquants"
});
addStyledCard(synthese, {
  x: startX + cardW + cardSpacing, headerColor: "#10b981", title: "Amélioration continue"
});
addStyledCard(synthese, {
  x: startX + 2 * (cardW + cardSpacing), headerColor: "#facc15", title: "Points d’attention"
});

  
  // 🟦 Slide 8 – Merci
  const tySlide = pptx.addSlide();
  tySlide.addImage({ path: tyBackground, x: 0, y: 0, w: "100%", h: "100%" });

  // 🟦 Slide 9 – Fin
  const end = pptx.addSlide();
  end.addImage({ path: endBackground, x: 0, y: 0, w: "100%", h: "100%" });

  // 💾 Génération du fichier
  await pptx.writeFile({
    fileName: `COMOP FTTH (${weekStr}) ${fileDate}.pptx`,
  });
}

// 🔁 Fonction utilitaire pour les slides de graphes
async function createGraphSlide(pptx, id, graphList, commentMap, background, blue) {
  const el = document.querySelector(`#canvas-${id}`);
  if (!el) return;

  try {
    const image = await toPng(el, { backgroundColor: "#ffffff" });
    const label = graphList.find((g) => g.id === id)?.label || id;
    const comment = commentMap[id]?.trim() || "[Aucun commentaire ajouté]";
    const slide = pptx.addSlide();

    slide.addImage({ path: background, x: 0, y: 0, w: "100%", h: "100%" });
    slide.addText(label, {
      x: 0.5, y: 0.7, w: 9.0, h: 0.4, fontSize: 18, bold: true, color: blue
    });

    const graphX = 0.8, graphY = 1.5, graphW = 5.0, graphH = 2.9;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: graphX - 0.1, y: graphY - 0.1, w: graphW + 0.2, h: graphH + 0.2,
      fill: { color: "#ffffff" },
      line: { color: "#d1d5db", width: 1 },
      roundRadius: 5,
    });
    slide.addImage({ data: image, x: graphX, y: graphY, w: graphW, h: graphH });

    const commentX = 6.0, commentY = 1.4, commentW = 3.0, commentH = 3.2;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: commentX, y: commentY, w: commentW, h: commentH,
      fill: { color: "#ffffff" },
      line: { color: "#DDEEFF", width: 1 },
      shadow: { type: "outer", blur: 1, offset: 1, angle: 45, color: "E0E0E0" }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: commentX, y: commentY, w: commentW, h: 0.4,
      fill: { color: "#F0F5FF" },
      line: { color: "#DDEEFF", width: 1 }
    });
    slide.addText("💬 Analyse & Commentaires", {
      x: commentX + 0.1, y: commentY + 0.05, w: commentW - 0.2, h: 0.3,
      fontSize: 13, bold: true, color: blue, align: "center"
    });
    slide.addText([
      { text: "Observations clés:", options: { fontSize: 11, color: blue, bold: true, breakLine: true } },
      { text: "• ", options: { fontSize: 11, color: "#4B5563" } },
      { text: comment, options: { fontSize: 11, color: "#4B5563" } }
    ], {
      x: commentX + 0.2,
      y: commentY + 0.5,
      w: commentW - 0.4,
      h: commentH - 0.6,
      valign: "top"
    });
  } catch (err) {
    console.error("Erreur slide", id, err);
  }
}
