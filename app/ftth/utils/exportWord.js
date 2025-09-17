import htmlDocx from "html-docx-js/dist/html-docx";

/* ===================== Utils ===================== */
const getWeekNumber = (date) => {
  if (!date) return null;
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* =============== Génération DOCX principale =============== */
export async function generateWordFromImages(imageList, startDate = null, endDate = null) {
  console.log("DEBUG FTTH: imageList :", imageList);

  const today = new Date();
  const todayStr = today.toLocaleDateString("fr-FR");

  /* --- Période (entête) --- */
  let periodLine = "";
  let weekPart = "";

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
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

  /* --- Helper : retrouver une image par id/label --- */
  function findImageById(id) {
    const searchId = String(id || "").toLowerCase();
    return imageList.find((item) => {
      const currentId = String(item?.id ?? item?.label ?? "").toLowerCase();
      const currentLabel = String(item?.label ?? item?.id ?? "").toLowerCase();
      return currentId === searchId || currentLabel === searchId;
    });
  }

  /* --- Sections --- */
  const sections = {
    manuel: {
      title: "Manuel FTTH",
      kpis: ["kpi-backlog-j1", "kpi-backlog-j"], // seulement ces 2 KPI
      singles: [
        "vue-ensemble-backlog",
        "repartition-manuelle",
        "top-5-regles",
        "top-regles-par-jour",
        "graph-entrants-sortants",
      ],
    },
  ticketing: {
      title: "Ticketing FTTH",
      kpis: [
        "KPI Tickets Entrants",
        "KPI Tickets Traités",
        "KPI Tickets Réentrants",
        "KPI Tickets en Cours",
        "KPI Tickets en Cours +Semaine",
      ],
      singles: [
        "Tickets Entrants/Sortants",
        "Backlog J",
        "Transité / Criticité",
        "Ancienneté des Tickets Traités",
        "Volume des Tickets par Division",
        "Rapport Sortants/Entrants",
        "Taux des Réentrants",
        "Volume des Réentrants",
      ],
      noComments: [
        "Détail des Réitérations des Tickets",
        "Tickets en cours - Plus de une semaine",
      ],
    },
    mailing: {
      title: "Mailing FTTH",
      singles: ["Traitement des E-mails", "Répartition des E-mails par type"],
    },
  };

  /* --- Zone commentaire : centrée, joli, gris très clair, 1 ligne au départ (s’agrandit dans Word) --- */
  function renderCommentBox(minLines = 1) {
    // une ligne ~ 18–22pt → on met ~28px pour le point de départ
    const minHeightPx = Math.max(1, minLines) * 28;
    return `
      <table style="
        width: 94%;
        margin: 12pt auto 8pt auto;
        border: 1.6pt dashed #93c5fd;   /* bleu clair */
        border-radius: 6pt;              /* léger arrondi pour la beauté */
        border-collapse: separate;
      ">
        <tr>
          <td style="
            padding: 10pt 12pt;
            background: #f8fafc;        /* gris TRÈS clair */
          ">
            <p style="margin:0; line-height:1.6; color:#111827;">&nbsp;</p>
          </td>
        </tr>
      </table>
    `;
  }

  /* --- Page KPIs (une seule zone commentaire pour toutes les cartes KPI) --- */
  function generateKpiSectionHtml(kpiIds, sectionTitle) {
    if (!kpiIds || kpiIds.length === 0) return "";

    const isManuel = sectionTitle === "Manuel FTTH";
    const kpiImages = kpiIds.map((kpiId) => {
      const found = findImageById(kpiId);
      return found ? found : { label: kpiId, id: kpiId, image: null };
    });

    let kpiHtml = "";
    if (isManuel) {
      // 2 colonnes (grandes cartes)
      const cols = 2, width = 340, height = 190;
      const numRows = Math.ceil(kpiImages.length / cols);
      for (let row = 0; row < numRows; row++) {
        kpiHtml += '<table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:10pt 0;"><tr>';
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          if (i < kpiImages.length) {
            const k = kpiImages[i];
            const label = escapeHtml(k.label || k.id || "KPI");
            const img = k.image
              ? `<img src="${k.image}" width="${width}" height="${height}" style="display:block; margin:0 auto;" />`
              : `<div style="width:${width}px; height:${height}px; border:1px dashed #cdcdcd; text-align:center; color:#999; display:flex; align-items:center; justify-content:center; font-size:10pt;">KPI N/A<br/>${label}</div>`;
            kpiHtml += `
              <td width="50%" align="center" valign="middle" style="padding:8pt;">
                <div style="text-align:center; margin-bottom:6pt;">
                  <strong style="font-size:10pt; color:#004aad;">${label}</strong>
                </div>
                ${img}
              </td>
            `;
          } else {
            kpiHtml += '<td width="50%"></td>';
          }
        }
        kpiHtml += "</tr></table>";
      }
    } else {
      // 3 colonnes (format standard)
      const cols = 3, width = 200, height = 120;
      const numRows = Math.ceil(kpiImages.length / cols);
      for (let row = 0; row < numRows; row++) {
        kpiHtml += '<table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:8pt;"><tr>';
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          if (i < kpiImages.length) {
            const k = kpiImages[i];
            const label = escapeHtml(k.label || k.id || "KPI");
            const img = k.image
              ? `<img src="${k.image}" width="${width}" height="${height}" style="display:block; margin:0 auto;" />`
              : `<div style="width:${width}px; height:${height}px; border:1px dashed #cdcdcd; text-align:center; color:#999; display:flex; align-items:center; justify-content:center; font-size:10pt;">KPI N/A<br/>${label}</div>`;
            kpiHtml += `
              <td width="33.33%" align="center" valign="middle" style="padding:5pt;">
                <div style="text-align:center; margin-bottom:4pt;">
                  <strong style="font-size:9pt; color:#004aad;">${label}</strong>
                </div>
                ${img}
              </td>
            `;
          } else {
            kpiHtml += '<td width="33.33%"></td>';
          }
        }
        kpiHtml += "</tr></table>";
      }
    }

    return `
      <div style="page-break-after: always; height: 26cm; overflow: hidden; display: block;">
        <table style="width:99.8%; border:2.8pt solid #d1d5db; border-radius:22pt; margin-top:0; margin-bottom:0; height: 25cm; max-height: 25cm;">
          <tr><td style="padding:14pt 24pt; vertical-align: top;">
            <table class="header-logos"><tr>
              <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:28pt;"></td>
              <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:28pt;"></td>
            </tr></table>
            <table class="date-row"><tr><td class="date-cell">Généré le : ${todayStr}</td></tr></table>
            ${periodLine}
            <p class="subtitle" style="white-space:nowrap;">📊 KPIs ${escapeHtml(sectionTitle)}</p>
            <div style="margin-top:10pt;">
              ${kpiHtml}
            </div>
            ${renderCommentBox(1)}   <!-- 1 ligne au départ -->
          </td></tr>
        </table>
      </div>
    `;
  }

  /* --- Page graphe (1 par page) + zone commentaire systématique --- */
  function generateSingleGraphHtml(imageId) {
    const item = findImageById(imageId);
    if (!item) {
      console.warn(`Image non trouvée pour l'ID: ${imageId}`);
      return "";
    }
    const title = escapeHtml(item.label || imageId);

    return `
      <div style="page-break-before: always; page-break-after: always; height: 26cm; overflow: hidden; display: block;">
        <table style="width:99.8%; border:2.8pt solid #d1d5db; border-radius:22pt; margin-top:0; margin-bottom:0; height: 25cm; max-height: 25cm;">
          <tr><td style="padding:14pt 24pt; vertical-align: top;">
            <table class="header-logos"><tr>
              <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:28pt;"></td>
              <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:28pt;"></td>
            </tr></table>
            <table class="date-row"><tr><td class="date-cell">Généré le : ${todayStr}</td></tr></table>
            ${periodLine}
            <p class="subtitle" style="white-space:nowrap;">📊 ${title}</p>
            <div style="margin-top:6pt; text-align:center;">
              <img src="${item.image}" width="700" height="500" style="width:700px; height:500px; display:block; margin:0 auto;" />
            </div>
            ${renderCommentBox(1)}   <!-- 1 ligne au départ -->
          </td></tr>
        </table>
      </div>
    `;
  }

  /* --- Construction des sections --- */
  let sectionsHtml = "";

  Object.values(sections).forEach((section) => {
    // Page de titre
    sectionsHtml += `
      <div style="page-break-after: always; height: 26cm; overflow: hidden; display: block;">
        <table style="width:99.8%; border:2.8pt solid #004aad; border-radius:22pt; margin-top:0; margin-bottom:0; height: 25cm; max-height: 25cm; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
          <tr><td style="padding:14pt 24pt; vertical-align: middle; text-align: center;">
            <h1 style="font-size:42pt; font-weight:bold; color:#004aad; margin:0; white-space:nowrap;">
              ${escapeHtml(section.title)}
            </h1>
          </td></tr>
        </table>
      </div>
    `;

    if (section.kpis?.length) sectionsHtml += generateKpiSectionHtml(section.kpis, section.title);
    if (section.singles) section.singles.forEach((id) => sectionsHtml += generateSingleGraphHtml(id));
    if (section.noComments) section.noComments.forEach((id) => sectionsHtml += generateSingleGraphHtml(id));
  });

  /* --- Page de couverture --- */
  const coverHtml = `
    <div style="page-break-after: always; height: 30cm; overflow: hidden; display: block;">
      <table style="width:99.8%; border:2.8pt solid #d1d5db; border-radius:22pt; margin-top:0; margin-bottom:0; height: 35cm; max-height: 35cm; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
        <tr><td style="padding:14pt 24pt; vertical-align: top;">
          <table class="header-logos"><tr>
            <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:28pt;"></td>
            <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:28pt;"></td>
          </tr></table>
          <table class="date-row"><tr><td class="date-cell">Généré le : ${todayStr}</td></tr></table>

          <div style="text-align:center; margin-top:60pt;">
            <h1 style="font-size:36pt; font-weight:bold; color:#004aad; margin:20pt 0; white-space:nowrap;">
              Compte-rendu FTTH<br/>EA FTTH
            </h1>
            ${periodLine}
            <div style="margin-top:40pt; padding:20pt; background:#ffffff; border-radius:12pt; box-shadow: 0 4px 6px rgba(0,0,0,0.08);">
              <h2 style="font-size:16pt; color:#1f2937; margin-bottom:12pt; white-space:nowrap;">📋 Sections du rapport :</h2>
              <ul style="text-align:left; font-size:14pt; color:#4b5563; line-height:1.7; list-style:none; padding:0; margin:0;">
                <li style="margin:6pt 0;">🔧 <strong>Manuel FTTH</strong> - KPIs et analyses du traitement manuel</li>
                <li style="margin:6pt 0;">🎫 <strong>Ticketing FTTH</strong> - Gestion et suivi des tickets</li>
                <li style="margin:6pt 0;">📧 <strong>Mailing FTTH</strong> - Traitement des e-mails</li>
              </ul>
            </div>
          </div>
        </td></tr>
      </table>
    </div>
  `;

  /* --- HTML final --- */
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0pt; size: 21cm 29.7cm; }
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; color: #111827; }
    .subtitle {
      font-size: 16pt;
      font-weight: bold;
      color: #004aad;
      text-align: center;
      margin-top: 14pt;
      margin-bottom: 10pt;
      white-space: nowrap; /* titre sur une seule ligne */
    }
    .header-logos { width: 100%; border-collapse: collapse; margin: 2pt 0 0 0; }
    .header-logos td { vertical-align: top; }
    .date-row { width: 100%; }
    .date-cell { text-align: right; font-size: 9pt; color: #6b7280; padding: 1pt 24pt 1pt 0; }
  </style>
</head>
<body>

  ${coverHtml}
  ${sectionsHtml}

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
    Rapport généré automatiquement par 
    <strong style="color:#004aad;">MyIT</strong><br/>
    <a href="https://myit-three.vercel.app" target="_blank" style="text-decoration: none; color: #004aad; font-weight: bold;">
      Dashboard FTTH, Plateforme <span style="font-family:'Segoe UI Black', sans-serif; color:#000;">MyIT</span>
    </a>
  </div>

</body>
</html>
  `;

  console.log("DEBUG FTTH: HTML final (commentaires centrés & light) prêt.");

  const blob = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Compte-rendu_FTTH_${weekPart}_${todayStr.replace(/\//g, "-")}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =============== Compat (ancienne signature) =============== */
export async function generateWordFromGraphs(
  selectedGraphIds = [],
  graphList = [],
  commentMap = {},
  globalStartDate,
  globalEndDate
) {
  console.warn("FTTH: generateWordFromGraphs est dépréciée, utilisez generateWordFromImages");
  const images = (selectedGraphIds || []).map((id) => {
    const g = (graphList || []).find((x) => x?.id === id || x?.label === id);
    return g ? { id: g.id, label: g.label, image: g.image } : { id, label: id, image: null };
  });
  return generateWordFromImages(images, globalStartDate, globalEndDate);
}

export default generateWordFromImages;
