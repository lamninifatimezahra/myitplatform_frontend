import htmlDocx from "html-docx-js/dist/html-docx";
import { toPng } from "html-to-image";

// 🔢 Calcule la semaine ISO (lundi = 1)
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export async function generateWordFromGraphs(
  selectedGraphIds,
  graphList,
  commentMap = {},
  globalStartDate,
  globalEndDate
) {
  const today = new Date();
  const todayStr = today.toLocaleDateString("fr-FR");
  const fileDate = `_${todayStr.replace(/\//g, "-")}`;

  const kpiIds = [
    "kpi-backlog-j1",
    "kpi-backlog-j",
    "kpi-objectif",
    "kpi-dossiers-traites",
  ];

  const kpiImages = await Promise.all(
    kpiIds.map(async (id) => {
      const node = document.getElementById(id);
      if (!node) return null;
      try {
        const dataUrl = await toPng(node, { backgroundColor: "#ffffff" });
        return `<td style="padding:10px; text-align:center;">
                  <img src="${dataUrl}" style="width:100%; max-width:320px; border-radius:10px;" />
                </td>`;
      } catch (err) {
        console.error("Erreur KPI", id, err);
        return null;
      }
    })
  );

  const kpiSection = `
    <table style="width:100%; background:#f9fafb; border:1px solid #cdcdcd; border-radius:10px; padding:20px; margin:60px 0;">
      <tr>
        <td colspan="2" style="text-align:center; padding:20px;">
          <h2 style="font-size:20pt; color:#31327e; margin-bottom:5px;">
            📊 KPI – Key Performance Indicators
          </h2>
          <p style="color:#6b7280; font-size:10pt;">
            Suivi des indicateurs essentiels de performance FTTH.
          </p>
        </td>
      </tr>
      <tr>${kpiImages[0] || ""}${kpiImages[1] || ""}</tr>
      <tr>${kpiImages[2] || ""}${kpiImages[3] || ""}</tr>
    </table>
  `;

  const graphImages = [];

  for (const id of selectedGraphIds) {
    const label = (graphList.find((g) => g.id === id)?.label || id)
      .replace(/&/g, "&amp;")
      .replace(/'/g, "&#8217;")
      .replace(/é/g, "&eacute;")
      .replace(/è/g, "&egrave;")
      .replace(/à/g, "&agrave;")
      .replace(/ê/g, "&ecirc;");

    const comment = (commentMap[id]?.trim() || "[Aucun commentaire fourni]")
      .replace(/&/g, "&amp;")
      .replace(/'/g, "&#8217;")
      .replace(/é/g, "&eacute;")
      .replace(/è/g, "&egrave;")
      .replace(/à/g, "&agrave;")
      .replace(/ê/g, "&ecirc;");

    const node = document.querySelector(`#canvas-${id}`);
    if (!node) continue;

    try {
      const dataUrl = await toPng(node, { backgroundColor: "#ffffff" });
      graphImages.push(`
        <table style="width:100%; border-collapse:collapse; page-break-inside: avoid; margin-bottom:60px;">
          <tr>
            <td style="background:#ffffff; padding:25px; border:1px solid #cdcdcd; border-radius:12px;">
              <h2 style="color:#31327e; font-size:18pt; text-align:center; margin-bottom:20px;">
                ${label}
              </h2>
              <div style="text-align:center; margin-bottom:20px;">
                <img src="${dataUrl}" style="width:95%; max-width:700px; border-radius:10px;" />
              </div>
              <div style="background:#f9fafb; border:1px dashed #68bddd; padding:12px; border-radius:8px;">
                <p style="font-size:10.5pt; color:#4b5563; font-style:italic; margin:0;">
                  💬 ${comment}
                </p>
              </div>
            </td>
          </tr>
        </table>
      `);
    } catch (err) {
      console.error("Erreur PNG", id, err);
    }
  }

  // 🔁 Période sélectionnée + Semaine
  let periodLine = "";
  let weekPart = "";
  if (globalStartDate && globalEndDate) {
    const start = new Date(globalStartDate);
    const end = new Date(globalEndDate);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    const allWeeks = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      allWeeks.push(getWeekNumber(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    const uniqueWeeks = [...new Set(allWeeks)].sort((a, b) => a - b);
    weekPart = `S${uniqueWeeks.join("-")}`;
    periodLine = `<p style="margin-top:15px; font-size:11pt;"><strong>Période du :</strong> ${startStr} au ${endStr} (${weekPart})</p>`;
  } else {
    periodLine = `<p style="margin-top:15px; font-size:11pt;"><strong>Date du jour :</strong> ${todayStr}</p>`;
    weekPart = "Date";
  }

  const html = `
  <html>
    <head>
      <style>
        @page {
          margin: 40px 40px 80px 40px;
        }
        body {
          border: 2px solid #cdcdcd;
          padding: 30px;
          font-family: 'Segoe UI', Tahoma, sans-serif;
          position: relative;
        }
      </style>
    </head>
    <body>

      <!-- Logos -->
      <table style="width:100%; margin-bottom:10px;">
        <tr>
          <td><img src="http://localhost:3000/logo-intelcia-small.png" style="height:26px;" /></td>
          <td style="text-align:right;"><img src="http://localhost:3000/logo_sfr_small.png" style="height:26px;" /></td>
        </tr>
        <tr>
          <td></td>
          <td style="text-align:right; font-size:10pt; color:#6b7280;">Généré le : ${todayStr}</td>
        </tr>
      </table>

      <!-- Titre -->
      <div style="background:#31327e; padding:30px 20px; text-align:center; color:white; border-radius:12px;">
        <h1 style="font-size:22pt; margin:0;">Compte rendu détaillé de l'activité FTTH</h1>
      </div>

      <!-- Période -->
      ${periodLine}

      <!-- KPI -->
      ${kpiSection}

      <!-- Titre Graphiques -->
      <div style="background:#68bddd; padding:25px; text-align:center; border-radius:8px; margin:50px 0 30px;">
        <h2 style="font-size:22pt; color:#ffffff; margin:0;">Vue d’ensemble des graphiques</h2>
        <p style="font-size:10pt; color:#f0f9ff; margin-top:8px;">Rapport généré le ${todayStr}</p>
      </div>

      <!-- Graphiques -->
      ${graphImages.join("\n")}

      <!-- Footer stylisé -->
      <div style="
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        background: #f1f5f9;
        border-top: 2px solid #cbd5e1;
        padding: 14px 0;
        text-align: center;
        font-family: 'Segoe UI', Tahoma, sans-serif;
        font-size: 10pt;
        color: #374151;
        z-index: 9999;
      ">
        Générée automatiquement par
        <strong style="color:#1e3a8a; font-weight:600;">Meryem SAYOUTI</strong><br />
        <span style="color:#1d4ed8; font-weight:600;">
          Dashboard FTTH, Plateforme
          <span style="color:#0f172a; font-weight:700;">MyIT</span>
        </span>
      </div>

    </body>
  </html>
  `;

  const blob = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Compte_rendu_FTTH_(${weekPart})_${fileDate}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
