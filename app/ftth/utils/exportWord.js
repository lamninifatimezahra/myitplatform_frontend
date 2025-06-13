import htmlDocx from "html-docx-js/dist/html-docx";
import { toPng } from "html-to-image";

// 🔢 Semaine ISO
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// 📸 Capture image avec redimensionnement
async function captureAndResize(id, width = 550, height = 350) {
  const el = document.getElementById(id);
  if (!el) return "<p style='color:red;'>Graphique indisponible</p>";
  try {
    await new Promise((resolve) => {
      let attempt = 0;
      const check = () => {
        const box = el.getBoundingClientRect();
        if (box.width > 50 && box.height > 50) resolve();
        else if (attempt > 20) resolve();
        else {
          attempt++;
          setTimeout(check, 100);
        }
      };
      check();
    });
    const originalUrl = await toPng(el, { backgroundColor: "#ffffff" });
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const resizedUrl = canvas.toDataURL();
        resolve(`<img src="${resizedUrl}" style="width:${width}px; height:${height}px; display:block; margin: 0 auto;" />`);
      };
      img.src = originalUrl;
    });
  } catch (err) {
    console.error("Erreur redimensionnement", id, err);
    return "<p style='color:red;'>Graphique indisponible</p>";
  }
}

// 📝 Fonction principale
export async function generateWordFromGraphs(selectedGraphIds = [], graphList = [], commentMap = {}, globalStartDate, globalEndDate) {
  const today = new Date();
  const todayStr = today.toLocaleDateString("fr-FR");

  let weekPart = "", periodLine = "";
  if (globalStartDate && globalEndDate) {
    const start = new Date(globalStartDate);
    const end = new Date(globalEndDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const startStr = start.toLocaleDateString("fr-FR");
    const endStr = end.toLocaleDateString("fr-FR");
    const allWeeks = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      allWeeks.push(getWeekNumber(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    const uniqueWeeks = [...new Set(allWeeks)].sort((a, b) => a - b);
    weekPart = `S${uniqueWeeks.join(", S")}`;
    periodLine = `<p style="text-align:center; font-size:11pt; color:#1f2937; margin-top:6pt;">
        <strong>Période :</strong> du <strong>${startStr}</strong> au <strong>${endStr}</strong> – ${diffDays} jour(s), ${weekPart}
      </p>`;
  } else {
    weekPart = `S${getWeekNumber(today)}`;
    periodLine = `<p style="text-align:center; font-size:11pt; color:#1f2937; margin-top:6pt;">
        <strong>Date du jour :</strong> ${todayStr} – ${weekPart}
      </p>`;
  }

  selectedGraphIds = selectedGraphIds.filter(id => id !== "graph-objectif");

  const idToDomId = {
    "graph-objectif": "canvas-graph-objectif",
    "graph-vue-ensemble": "canvas-graph-vue-ensemble",
    "graph-top-regles": "canvas-graph-top-regles",
    "graph-top-regles-par-jour": "canvas-graph-top-regles-par-jour",
    "graph-entrants-sortants": "canvas-graph-entrants-sortants",
    "graph-repartition-manuelle": "canvas-graph-repartition-manuelle",
    "graph-traitement-emails": "canvas-graph-traitement-emails",
    "graph-repartition-emails": "canvas-graph-repartition-emails" // ✅ Ajouté
  };

  const defaultCommentMap = {
    "graph-objectif": `“Performance satisfaisante, aucun backlog critique signalé.”<br/>“Rien à signaler cette semaine, bon équilibre global.”`,
    "graph-vue-ensemble": `“Tendance stable, aucune alerte détectée.”<br/>“Visualisation claire de l’évolution des indicateurs.”`,
    "graph-top-regles": `“Les règles critiques sont bien identifiées.”<br/>“Priorité à accorder aux plus récurrentes.”`,
    "graph-top-regles-par-jour": `“Suivi quotidien très utile.”<br/>“Permet une meilleure identification des pics d’activité.”`,
    "graph-entrants-sortants": `“Indicateurs bien structurés.”<br/>“Volume traité visible et comparé efficacement.”`,
    "graph-repartition-manuelle": `“Visualisation claire des répartitions.”<br/>“Bonne compréhension du volume traité par acteur.”`,
    "graph-traitement-emails": `“Graphique des types d’e-mails reçus sur la période sélectionnée.”<br/>“Utile pour analyser les tendances de traitement.”`,
    "graph-repartition-emails": `“Répartition claire des types d’e-mails.”<br/>“Permet d’identifier les motifs récurrents.”` // ✅ Ajouté
  };

  const kpi1 = await captureAndResize("kpi-backlog-j1", 280, 100);
  const kpi2 = await captureAndResize("kpi-backlog-j", 280, 100);
  const objectif = await captureAndResize("canvas-graph-objectif", 550, 280);

  let bodyHtml = `
  <table style="width:99.8%; border:2.8pt solid #d1d5db; border-radius:22pt;">
    <tr><td style="padding:14pt 24pt;">
      <table class="header-logos"><tr>
        <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:28pt;"></td>
        <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:28pt;"></td>
      </tr></table>
      <table class="date-row"><tr><td class="date-cell">Généré le : ${todayStr}</td></tr></table>
      <h1 class="title">Compte-rendu FTTH</h1>
      ${periodLine}
      <table style="width:100%; margin-top:2pt; text-align:center;">
        <tr><td>${kpi1}</td><td>${kpi2}</td></tr>
      </table>
      <div style="margin-top:4pt; text-align:center;">
        <h2 class="subtitle">🎯 Objectif de performance</h2>
        <div style="margin-bottom: 6pt;">${objectif}</div>
      </div>
      <div class="comment-block">
        <div class="comment-block-title">💬 Votre commentaire</div>
        <div class="comment-text">${defaultCommentMap["graph-objectif"]}</div>
      </div>
    </td></tr>
  </table>`;

  for (const graphId of selectedGraphIds) {
    const label = graphList.find(g => g.id === graphId)?.label || graphId;
    const domId = idToDomId[graphId] || graphId;
    const graphHtml = await captureAndResize(domId, 600, 400);
    const comment = commentMap[graphId] || defaultCommentMap[graphId] || "Aucun commentaire.";

    bodyHtml += `
    <div class="page-break"></div>
    <table style="width:99.8%; border:2.8pt solid #d1d5db; border-radius:22pt;"><tr><td style="padding:14pt 24pt;">
      <table class="header-logos"><tr>
        <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:28pt;"></td>
        <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:28pt;"></td>
      </tr></table>
      <table class="date-row"><tr><td class="date-cell">Généré le : ${todayStr}</td></tr></table>
      ${periodLine}
      <p class="subtitle">📊 ${label}</p>
      <div style="margin-top:4pt; text-align:center;"><div style="margin-bottom: 6pt;">${graphHtml}</div></div>
      <div class="comment-block"><div class="comment-block-title">💬 Votre commentaire</div>
        <div class="comment-text">${comment}</div>
      </div>
    </td></tr></table>`;
  }

  bodyHtml += `
  <div class="page-break"></div>
  <div style="width: 96%; margin: 20pt auto 0 auto; padding: 10pt 16pt; background: #eef2f7; border-radius: 10pt;
              font-family: 'Segoe UI', sans-serif; font-size: 9.8pt; color: #1f2937; text-align: center; line-height: 1.5;
              box-shadow: 0 0 2pt rgba(0, 0, 0, 0.05);">
    Générée automatiquement par 
    <strong style="color:#004aad;">Meryem SAYOUTI</strong><br/>
    <a href="https://myit-its.vercel.app" target="_blank"
       style="text-decoration: none; color: #004aad; font-weight: bold;">
       Dashboard FTTH, Plateforme <span style="font-family:'Segoe UI Black', sans-serif; color:#000;">MyIT</span>
    </a>
  </div>`;

  const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { margin: 0pt; }
  body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; color: #111827; }
  .title { font-size: 24pt; font-weight: bold; text-align: center; color: #004aad; margin: 2pt 0; }
  .subtitle { font-size: 13pt; font-weight: bold; color: #69b3d4; text-align: center; margin-top: 14pt; }
  .header-logos { width: 100%; border-collapse: collapse; margin: 2pt 0; }
  .header-logos td { vertical-align: top; }
  .date-row { width: 100%; }
  .date-cell { text-align: right; font-size: 9pt; color: #6b7280; padding: 1pt 24pt 1pt 0; }
  .comment-block {
    margin-top: 6pt;
    width: 92%;
    margin-left: auto;
    margin-right: auto;
    border-radius: 10pt;
    padding: 12pt;
    background: #f9fafb;
    text-align: center;
  }
  .comment-block-title { font-size: 11pt; font-weight: bold; color: #1f2937; margin-bottom: 5pt; }
  .comment-text { font-style: italic; color: #4b5563; font-size: 9.8pt; line-height: 1.4; }
  .page-break { page-break-before: always; }
</style>
</head><body>${bodyHtml}</body></html>`;

  const blob = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Compte_rendu_FTTH_(${weekPart})_${todayStr.replace(/\//g, "-")}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default generateWordFromGraphs;
