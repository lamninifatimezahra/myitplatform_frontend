import htmlDocx from "html-docx-js/dist/html-docx";
import { toPng } from "html-to-image";

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function captureAndResize(id, width = 280, height = 180) {
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

export async function generateWordFromGraphs(_, __, ___, globalStartDate, globalEndDate) {
  const today = new Date();
  const todayStr = today.toLocaleDateString("fr-FR");
  let periodLine = "";
  let weekPart = "";

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
    periodLine = `
      <p style="text-align:center; font-size:11pt; color:#1f2937; margin-top:6pt;">
        <strong>Période :</strong> du <strong>${startStr}</strong> au <strong>${endStr}</strong> – ${diffDays} jour(s), ${weekPart}
      </p>`;
  } else {
    weekPart = `S${getWeekNumber(today)}`;
    periodLine = `
      <p style="text-align:center; font-size:11pt; color:#1f2937; margin-top:6pt;">
        <strong>Date du jour :</strong> ${todayStr} – ${weekPart}
      </p>`;
  }

  const kpi1 = await captureAndResize("kpi-backlog-j1", 380, 100);
  const kpi2 = await captureAndResize("kpi-backlog-j", 380, 100);
  const objectif = await captureAndResize("canvas-graph-objectif", 500, 280);
  const vueBacklog = await captureAndResize("canvas-graph-vue-ensemble", 650, 350);
  const topRegles = await captureAndResize("canvas-graph-top-regles", 650, 350);
  const topReglesParJour = await captureAndResize("canvas-graph-top-regles-par-jour", 650, 350);
  const entrantsSortants = await captureAndResize("canvas-graph-entrants-sortants", 650, 350);
  const repartitionManuelle = await captureAndResize("canvas-graph-repartition-manuelle", 650, 350);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0pt; }
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; color: #111827; }
    .title {
      font-size: 24pt;
      font-weight: bold;
      text-align: center;
      color: #004aad;
      margin: 2pt 0 2pt 0;
    }
    .subtitle {
      font-size: 13pt;
      font-weight: bold;
      color: #69b3d4;
      text-align: center;
      margin-top: 14pt;
    }
    .header-logos { width: 100%; border-collapse: collapse; margin: 2pt 0 0 0; }
    .header-logos td { vertical-align: top; }
    .date-row { width: 100%; }
    .date-cell { text-align: right; font-size: 9pt; color: #6b7280; padding: 1pt 24pt 1pt 0; }
    .comment-block {
      margin-top: 6pt;
      width: 92%;
      margin-left: auto;
      margin-right: auto;
      border: 1.5pt dashed #69b3d4;
      border-radius: 10pt;
      padding: 12pt;
      background: #f9fafb;
      text-align: center;
    }
    .comment-block-title { font-size: 11pt; font-weight: bold; color: #1f2937; margin-bottom: 5pt; }
    .comment-text {
      font-style: italic;
      color: #4b5563;
      font-size: 9.8pt;
      line-height: 1.4;
    }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>

  <!-- PAGE 1 -->
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
        <div class="comment-text">“Performance satisfaisante, aucun backlog critique signalé.”<br/>“Rien à signaler cette semaine, bon équilibre global.”</div>
      </div>
    </td></tr>
  </table>

  <!-- PAGE 2 -->
  <div class="page-break"></div>
  <table style="width:99.8%; border:2.8pt solid #d1d5db; border-radius:22pt;"><tr><td style="padding:14pt 24pt;">
    <table class="header-logos"><tr>
      <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:28pt;"></td>
      <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:28pt;"></td>
    </tr></table>
    <table class="date-row"><tr><td class="date-cell">Généré le : ${todayStr}</td></tr></table>
    <h1 class="title">Vue d’ensemble des graphiques</h1>
    ${periodLine}
    <p class="subtitle">📊 Vue combinée du Backlog</p>
    <div style="margin-top:4pt; text-align:center;"><div style="margin-bottom: 6pt;">${vueBacklog}</div></div>
    <div class="comment-block"><div class="comment-block-title">💬 Votre commentaire</div>
      <div class="comment-text">“Tendance stable, aucune alerte détectée.”<br/>“Visualisation claire de l’évolution des indicateurs.”</div>
    </div>
  </td></tr></table>

  <!-- PAGE 3 -->
  <div class="page-break"></div>
  <table style="width:99.8%; border:2.8pt solid #d1d5db; border-radius:22pt;"><tr><td style="padding:14pt 24pt;">
    <table class="header-logos"><tr>
      <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:28pt;"></td>
      <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:28pt;"></td>
    </tr></table>
    <table class="date-row"><tr><td class="date-cell">Généré le : ${todayStr}</td></tr></table>
    ${periodLine}
    <p class="subtitle">🏆 Top 5 RÈGLES</p>
    <div style="margin-top:4pt; text-align:center;"><div style="margin-bottom: 6pt;">${topRegles}</div></div>
    <div class="comment-block"><div class="comment-block-title">💬 Votre commentaire</div>
      <div class="comment-text">“Les règles critiques sont bien identifiées.”<br/>“Priorité à accorder aux plus récurrentes.”</div>
    </div>
  </td></tr></table>

  <!-- PAGE 4 -->
  <div class="page-break"></div>
  <table style="width:99.8%; border:2.8pt solid #d1d5db; border-radius:22pt;"><tr><td style="padding:14pt 24pt;">
    <table class="header-logos"><tr>
      <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:28pt;"></td>
      <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:28pt;"></td>
    </tr></table>
    <table class="date-row"><tr><td class="date-cell">Généré le : ${todayStr}</td></tr></table>
    ${periodLine}
    <p class="subtitle">📅 Top 5 RÈGLES par jour</p>
    <div style="margin-top:4pt; text-align:center;"><div style="margin-bottom: 6pt;">${topReglesParJour}</div></div>
    <div class="comment-block"><div class="comment-block-title">💬 Votre commentaire</div>
      <div class="comment-text">“Suivi quotidien très utile.”<br/>“Permet une meilleure identification des pics d’activité.”</div>
    </div>
  </td></tr></table>

  <!-- PAGE 5 -->
  <div class="page-break"></div>
  <table style="width:99.8%; border:2.8pt solid #d1d5db; border-radius:22pt;"><tr><td style="padding:14pt 24pt;">
    <table class="header-logos"><tr>
      <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:28pt;"></td>
      <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:28pt;"></td>
    </tr></table>
    <table class="date-row"><tr><td class="date-cell">Généré le : ${todayStr}</td></tr></table>
    ${periodLine}
    <p class="subtitle">📦 Entrants – Sortants – Nouveaux cas</p>
    <div style="margin-top:4pt; text-align:center;"><div style="margin-bottom: 6pt;">${entrantsSortants}</div></div>
    <div class="comment-block"><div class="comment-block-title">💬 Votre commentaire</div>
      <div class="comment-text">“Indicateurs bien structurés.”<br/>“Volume traité visible et comparé efficacement.”</div>
    </div>
  </td></tr></table>

  <!-- ✅ PAGE 6 – Répartition Manuelle -->
<div class="page-break"></div>
<table style="width:99.8%; border:2.8pt solid #d1d5db; border-radius:22pt;"><tr><td style="padding:14pt 24pt;">
  <table class="header-logos"><tr>
    <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:28pt;"></td>
    <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:28pt;"></td>
  </tr></table>

  <table class="date-row"><tr><td class="date-cell">Généré le : ${todayStr}</td></tr></table>
  ${periodLine}

  <p class="subtitle">👥 Répartition Manuelle (Acteur)</p>
  <div style="margin-top:4pt; text-align:center;">
    <div style="margin-bottom: 6pt;">${repartitionManuelle}</div>
  </div>

  <div class="comment-block">
    <div class="comment-block-title">💬 Votre commentaire</div>
    <div class="comment-text">
      “Visualisation claire des répartitions.”<br/>
      “Bonne compréhension du volume traité par acteur.”
    </div>
  </div>
</td></tr></table>

<!-- 🌟 Pied de page esthétique et unifié -->
<div style="
  width: 96%;
  margin: 20pt auto 0 auto;
  padding: 10pt 16pt;
  background: #eef2f7;
  border-radius: 10pt;
  font-family: 'Segoe UI', sans-serif;
  font-size: 9.8pt;
  color: #1f2937;
  text-align: center;
  line-height: 1.5;
  box-shadow: 0 0 2pt rgba(0, 0, 0, 0.05);
">
  Générée automatiquement par 
  <strong style="color:#004aad;">${author}</strong><br/>
  <a href="https://myit-its.vercel.app" target="_blank" style="text-decoration: none; color: #004aad; font-weight: bold;">
    Dashboard FTTH, Plateforme <span style="font-family:'Segoe UI Black', sans-serif; color:#000;">MyIT</span>
  </a>
</div>



</body>
</html>`;

  const blob = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Compte_rendu_FTTH_${weekPart}_${todayStr.replace(/\//g, "-")}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default generateWordFromGraphs;
