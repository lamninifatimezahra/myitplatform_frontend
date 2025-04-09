import pptxgen from "pptxgenjs";
import { toPng } from "html-to-image";

// 🔢 Calcule la semaine ISO
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export async function generatePPTFromGraphs({
  selectedGraphIds = [],
  graphList = [],
  commentMap = {},
  globalStartDate,
  globalEndDate,
}) {
  const pptx = new pptxgen();
  const todayStr = new Date().toLocaleDateString("fr-FR");
  const fileDate = todayStr.replace(/\//g, "-");

  const LOGO_INTELCIA = "/logo-intelcia-small.png";
  const LOGO_SFR = "/logo_sfr_small.png";

  const blue = "#31327e";
  const lightBlue = "#e6f5f2"; // bleu ciel très clair
  const footerText = "#1e3a8a";

  // 📆 Période
  let weekStr = "Date";
  let periodeStr = `Généré le : ${todayStr}`;
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
    periodeStr = `Période : ${weekStr}\nDu ${start.toLocaleDateString()} au ${end.toLocaleDateString()}\nGénéré le : ${todayStr}`;
  }

  // 🟦 Couverture
  const cover = pptx.addSlide();
  cover.background = { fill: lightBlue };
  cover.addImage({ path: LOGO_INTELCIA, x: 0.3, y: 0.2, w: 1.7, h: 0.45 });
  cover.addImage({ path: LOGO_SFR, x: 9.1, y: 0.2, w: 0.5, h: 0.45 });

  cover.addText("📘 Compte-rendu FTTH", {
    x: 0.5, y: 1.6, w: 9, fontSize: 32, color: blue, bold: true, align: "center",
  });
  cover.addText(periodeStr, {
    x: 1, y: 3.2, w: 8, fontSize: 14, color: "#1f2937", align: "center",
  });
  cover.addText("Dashboard FTTH – Plateforme MyIT", {
    x: 1, y: 4.2, w: 8, fontSize: 16, color: blue, bold: true, align: "center",
  });


// 📊 Slide KPI
const kpiSlide = pptx.addSlide();
kpiSlide.addImage({ path: LOGO_INTELCIA, x: 0.3, y: 0.2, w: 1.7, h: 0.45 });
kpiSlide.addImage({ path: LOGO_SFR, x: 9.1, y: 0.2, w: 0.5, h: 0.45 });

kpiSlide.addText("📊 KPI – Indicateurs Clés de Performance", {
  x: 0.5, y: 0.7, w: 9, fontSize: 20, bold: true, align: "center", color: blue,
});

const kpiIds = [
  "kpi-backlog-j1",
  "kpi-backlog-j",
  "kpi-objectif",
  "kpi-dossiers-traites",
];

const kpiImages = await Promise.all(
  kpiIds.map(async (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    try {
      return await toPng(el, { backgroundColor: "#ffffff" });
    } catch {
      return null;
    }
  })
);

const positions = [
  { x: 0.6, y: 1.3 }, { x: 5.0, y: 1.3 },
  { x: 0.6, y: 2.6 }, { x: 5.0, y: 2.6 }
];

kpiImages.forEach((img, i) => {
  if (img) {
    kpiSlide.addImage({
      data: img,
      ...positions[i],
      w: 4.2,
      h: 1.4,
    });
  }
});

// ✅ 🔽 ICI TU AJOUTES ton commentaire (modifiable dynamiquement si tu veux)
kpiSlide.addText(`💬 [Aucun commentaire fourni]`, {
  x: 0.7,
  y: 4.25,
  w: 8.5,
  fontSize: 12,
  italic: true,
  color: "#4b5563",
});

// ✅ Footer harmonisé
kpiSlide.addText("Dashboard FTTH – Plateforme MyIT", {
  x: 3.9, y: 5.5, w: 10, fontSize: 10, align: "center", color: "#1d4ed8", bold: true,
});

  
  // 📈 Slides des graphes
  for (const id of selectedGraphIds || []) {
    const node = document.querySelector(`#canvas-${id}`);
    if (!node) continue;

    try {
      const image = await toPng(node, { backgroundColor: "#ffffff" });
      const label = graphList.find((g) => g.id === id)?.label || id;
      const comment = commentMap[id]?.trim() || "[Aucun commentaire fourni]";

      const slide = pptx.addSlide();
      slide.addImage({ path: LOGO_INTELCIA, x: 0.3, y: 0.2, w: 1.7, h: 0.45 });
      slide.addImage({ path: LOGO_SFR, x: 9.1, y: 0.2, w: 0.5, h: 0.45 });

      slide.addText(`📊 ${label}`, {
        x: 0.5, y: 0.8, w: 9, fontSize: 18, bold: true, align: "center", color: "#1e40af",
      });

      slide.addImage({
        data: image,
        x: 2.5,
        y: 1.2,
        w: 5,
        h: 3.3,
      });

      slide.addText(`💬 ${comment}`, {
        x: 0.7, y: 4.5, w: 8.5, fontSize: 12, italic: true, color: "#4b5563",
      });

      slide.addText("Dashboard FTTH – Plateforme MyIT", {
        x: 3.9, y: 5.5, w: 10, fontSize: 10, align: "center", color: "#1d4ed8", bold: true,
      });
    } catch (err) {
      console.error("Erreur slide", id, err);
    }
  }

  // ✅ Slide de fin stylée
  const fin = pptx.addSlide();
  fin.background = { fill: "#f3f4f6" };
  fin.addImage({ path: LOGO_INTELCIA, x: 0.3, y: 0.2, w: 1.7, h: 0.45 });
  fin.addImage({ path: LOGO_SFR, x: 9.1, y: 0.2, w: 0.5, h: 0.45 });

  fin.addText("✅ Merci pour votre attention", {
    x: 0.5, y: 2.2, w: 9, fontSize: 30, bold: true, align: "center", color: "#059669",
  });

  fin.addText("📊 Rapport généré via la plateforme MyIT – Dashboard FTTH", {
    x: 0.5, y: 3.6, w: 9, fontSize: 14, align: "center", color: footerText,
  });

  await pptx.writeFile({
    fileName: `Compte_rendu_FTTH_(${weekStr})_${fileDate}.pptx`,
  });
}
