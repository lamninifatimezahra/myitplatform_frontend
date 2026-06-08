import htmlDocx from "html-docx-js/dist/html-docx";

/* ===================== CONFIGURATION DES TAILLES ===================== */
/* 
  Modifiez les dimensions ici pour chaque KPI et graphique.
  Format: { width: nombre_en_pixels, height: nombre_en_pixels }
*/

const SIZE_CONFIG = {
  // === KPIs Manuel FTTH ===
  "kpi-backlog-j1": { width: 300, height: 180 },
  "kpi-backlog-j": { width: 300, height: 180 },
  
  // === KPIs Ticketing FTTH ===
  "KPI Tickets Entrants": { width: 190, height: 110 },
  "KPI Tickets Traités": { width: 190, height: 110 },
  "KPI Tickets Réentrants": { width: 190, height: 110 },
  "KPI Tickets en Cours": { width: 190, height: 110 },
  "KPI Tickets en Cours +Semaine": { width: 190, height: 110 },
  
  // === Graphiques Manuel FTTH ===
  "Backlog FTTH J et Dossiers Traités": { width: 750, height: 380 },
  "KPI FTTH Manuel": { width: 750, height: 380 },
  "repartition-manuelle": { width: 750, height: 380 },
  "Top 5 RÈGLES": { width: 750, height: 380 },
  "Top 5 RÈGLES par jour": { width: 750, height: 380 },
  "KPI FTTH Manuel": { width: 750, height: 380 },
  "Entrants – Sortants – Nouveaux cas": { width: 750, height: 380 },
  
  // === Graphiques Ticketing FTTH ===
  "Tickets Entrants/Sortants": { width: 750, height: 380 },
  "Backlog J": { width: 700, height: 320 },
  "Évolution du Backlog": { width: 750, height: 380 },
  "Transité / Criticité": { width: 800, height: 320 },
  "Ancienneté des Tickets Traités": { width: 800, height: 420 },
  "Volume des Tickets par Division": { width: 800, height: 420 },
  "Rapport Sortants/Entrants": { width: 800, height: 420 },
  "Taux des Réentrants": { width: 800, height: 420 },
  "Volume des Réentrants": { width: 800, height: 420 },
  "Détail des Réitérations des Tickets": { width: 800, height: 280 },
  "Tickets en cours - Plus de une semaine": { width: 800, height: 280 },
  
  // === Graphiques Mailing FTTH ===
  "Traitement des E-mails": { width: 800, height: 420 },
  "Répartition des E-mails par type": { width: 800, height: 420 },
};

// Tailles par défaut si un élément n'est pas configuré
const DEFAULT_KPI_SIZE = { width: 200, height: 120 };
const DEFAULT_GRAPH_SIZE = { width: 800, height: 420 };

/* ===================== Fonction pour obtenir la taille ===================== */
function getSize(id, isKpi = false) {
  // Chercher dans la config personnalisée
  if (SIZE_CONFIG[id]) {
    return SIZE_CONFIG[id];
  }
  
  // Utiliser la taille par défaut selon le type
  return isKpi ? DEFAULT_KPI_SIZE : DEFAULT_GRAPH_SIZE;
}

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

  function sectionHasSelectedItems(section) {
  const allIds = [
    ...(section.kpis || []),
    ...(section.singles || []),
    ...(section.noComments || []),
  ];

  return allIds.some((id) => findImageById(id));
}

  /* --- Sections --- */
  const sections = {
    manuel: {
      title: "Manuel FTTH",
      kpis: ["kpi-backlog-j1", "kpi-backlog-j"],
      singles: [
        "Backlog FTTH J et Dossiers Traités",
        "KPI FTTH Manuel",
        "repartition-manuelle",
        "Top 5 RÈGLES",
        "Top 5 RÈGLES par jour",
        "Entrants – Sortants – Nouveaux cas",
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
        "Évolution du Backlog",
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

  /* --- Zone commentaire --- */
  function renderCommentBox(minLines = 1) {
    return `
      <table style="
        width: 94%;
        margin: 12pt auto 8pt auto;
        border: 1.6pt dashed #93c5fd;
        border-radius: 6pt;
        border-collapse: separate;
      ">
        <tr>
          <td style="
            padding: 10pt 12pt;
            background: #f8fafc;
          ">
            <p style="margin:0; line-height:1.6; color:#111827;">&nbsp;</p>
          </td>
        </tr>
      </table>
    `;
  }

  /* --- Page titre de section (nouvelle page dédiée) --- */
  function generateSectionTitlePage(sectionTitle) {
    return `
      <div style="page-break-before: always; page-break-after: always; height: 29.7cm; display: flex; align-items: center; justify-content: center;">
        <div style="text-align: center; width: 100%;">
          <h1 style="
            font-size: 48pt;
            font-weight: bold;
            color: #004aad;
            margin: 0;
            padding: 40pt 20pt;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-top: 4pt solid #004aad;
            border-bottom: 4pt solid #004aad;
          ">${escapeHtml(sectionTitle)}</h1>
        </div>
      </div>
    `;
  }

  /* --- Page KPIs (tous regroupés sur une seule page) --- */
  function generateKpiPages(kpiIds, sectionTitle) {
    if (!kpiIds || kpiIds.length === 0) return "";

    const kpiImages = kpiIds
      .map((kpiId) => findImageById(kpiId))
      .filter(Boolean);
    let pagesHtml = "";

    // Pour Manuel FTTH : 2 colonnes avec KPIs plus grands
    const isManuel = sectionTitle === "Manuel FTTH";
    
    if (isManuel) {
      // 2 colonnes pour Manuel FTTH
      const cols = 2;
      let kpiHtml = "";
      const numRows = Math.ceil(kpiImages.length / cols);
      
      for (let row = 0; row < numRows; row++) {
        kpiHtml += '<table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:15pt;"><tr>';
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          if (i < kpiImages.length) {
            const k = kpiImages[i];
            const kpiId = k.id || k.label;
            const size = getSize(kpiId, true); // true = c'est un KPI
            const label = escapeHtml(k.label || k.id || "KPI");
            const img = k.image
              ? `<img src="${k.image}" width="${size.width}" height="${size.height}" style="display:block; margin:0 auto;" />`
              : `<div style="width:${size.width}px; height:${size.height}px; border:2px dashed #cdcdcd; text-align:center; color:#999; display:flex; align-items:center; justify-content:center; font-size:11pt;">KPI N/A<br/>${label}</div>`;
            kpiHtml += `
              <td width="50%" align="center" valign="middle" style="padding:10pt;">
                <div style="text-align:center; margin-bottom:8pt;">
                  <strong style="font-size:12pt; color:#004aad;">${label}</strong>
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

      pagesHtml += `
        <div style="page-break-before: always; page-break-after: always; height: 29.7cm; overflow: hidden; display: block;">
          <table style="width:99%; border:3pt solid #d1d5db; border-radius:20pt; margin:10pt auto; height: 28cm;">
            <tr><td style="padding:20pt 30pt; vertical-align: top;">
              <!-- Logos -->
              <table style="width:100%; margin-bottom:10pt;"><tr>
                <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:35pt;"></td>
                <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:35pt;"></td>
              </tr></table>
              
              <p style="text-align:right; font-size:10pt; color:#6b7280; margin:5pt 0;">Généré le : ${todayStr}</p>
              
              ${periodLine}
              
              <h2 style="text-align:center; font-size:18pt; color:#004aad; margin:20pt 0;">
                📊 KPIs ${escapeHtml(sectionTitle)}
              </h2>
              
              <div style="margin-top:30pt;">
                ${kpiHtml}
              </div>
              
              ${renderCommentBox(1)}
            </td></tr>
          </table>
        </div>
      `;
    } else {
      // Pour les autres sections : grille 3 colonnes
      const cols = 3;
      let kpiHtml = "";
      const numRows = Math.ceil(kpiImages.length / cols);
      
      for (let row = 0; row < numRows; row++) {
        kpiHtml += '<table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:10pt;"><tr>';
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          if (i < kpiImages.length) {
            const k = kpiImages[i];
            const kpiId = k.id || k.label;
            const size = getSize(kpiId, true); // true = c'est un KPI
            const label = escapeHtml(k.label || k.id || "KPI");
            const img = k.image
              ? `<img src="${k.image}" width="${size.width}" height="${size.height}" style="display:block; margin:0 auto;" />`
              : `<div style="width:${size.width}px; height:${size.height}px; border:1px dashed #cdcdcd; text-align:center; color:#999; display:flex; align-items:center; justify-content:center; font-size:10pt;">KPI N/A<br/>${label}</div>`;
            kpiHtml += `
              <td width="33.33%" align="center" valign="middle" style="padding:8pt;">
                <div style="text-align:center; margin-bottom:6pt;">
                  <strong style="font-size:10pt; color:#004aad;">${label}</strong>
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

      pagesHtml += `
        <div style="page-break-before: always; page-break-after: always; height: 29.7cm; overflow: hidden; display: block;">
          <table style="width:99%; border:3pt solid #d1d5db; border-radius:20pt; margin:10pt auto; height: 28cm;">
            <tr><td style="padding:20pt 30pt; vertical-align: top;">
              <!-- Logos -->
              <table style="width:100%; margin-bottom:10pt;"><tr>
                <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:35pt;"></td>
                <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:35pt;"></td>
              </tr></table>
              
              <p style="text-align:right; font-size:10pt; color:#6b7280; margin:5pt 0;">Généré le : ${todayStr}</p>
              
              ${periodLine}
              
              <h2 style="text-align:center; font-size:18pt; color:#004aad; margin:20pt 0;">
                📊 KPIs ${escapeHtml(sectionTitle)}
              </h2>
              
              <div style="margin-top:20pt;">
                ${kpiHtml}
              </div>
              
              ${renderCommentBox(1)}
            </td></tr>
          </table>
        </div>
      `;
    }

    return pagesHtml;
  }

  /* --- Page graphe individuel --- */
  function generateSingleGraphPage(imageId) {
    const item = findImageById(imageId);
    if (!item) {
      console.warn(`Image non trouvée pour l'ID: ${imageId}`);
      return "";
    }
    const title = escapeHtml(item.label || imageId);
    
    // Utiliser la fonction getSize pour obtenir les dimensions configurées
    const size = getSize(imageId, false); // false = c'est un graphique

    return `
      <div style="page-break-before: always; page-break-after: always; height: 29.7cm; overflow: hidden; display: block;">
        <table style="width:99%; border:3pt solid #d1d5db; border-radius:20pt; margin:10pt auto; height: 28cm;">
          <tr><td style="padding:20pt 30pt; vertical-align: top;">
            <!-- Logos -->
            <table style="width:100%; margin-bottom:10pt;"><tr>
              <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:35pt;"></td>
              <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:35pt;"></td>
            </tr></table>
            
            <p style="text-align:right; font-size:10pt; color:#6b7280; margin:5pt 0;">Généré le : ${todayStr}</p>
            
            ${periodLine}
            
            <h2 style="text-align:center; font-size:18pt; color:#004aad; margin:20pt 0;">
              📊 ${title}
            </h2>
            
            <div style="margin-top:20pt; text-align:center;">
              <img src="${item.image}" width="${size.width}" height="${size.height}" style="max-width:100%; height:auto; display:block; margin:0 auto;" />
            </div>
            
            ${renderCommentBox(1)}
          </td></tr>
        </table>
      </div>
    `;
  }

  /* --- Construction du document complet --- */
  let documentHtml = "";

  // Page de couverture
  documentHtml += `
    <div style="page-break-after: always; height: 29.7cm; display: block;">
      <table style="width:99%; border:3pt solid #d1d5db; border-radius:20pt; margin:10pt auto; height: 28cm; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
        <tr><td style="padding:30pt; vertical-align: middle;">
          <!-- Logos -->
          <table style="width:100%; margin-bottom:40pt;"><tr>
            <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:40pt;"></td>
            <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:40pt;"></td>
          </tr></table>

          <div style="text-align:center;">
            <h1 style="font-size:42pt; font-weight:bold; color:#004aad; margin:30pt 0;">
              Compte-rendu FTTH<br/>EA FTTH
            </h1>
            
            ${periodLine}
            
            <div style="margin-top:50pt; padding:25pt; background:#ffffff; border-radius:15pt; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
              <h2 style="font-size:18pt; color:#1f2937; margin-bottom:15pt;">📋 Sections du rapport</h2>
              <ul style="text-align:left; font-size:14pt; color:#4b5563; line-height:2; list-style:none; padding:0 30pt;">
                <li>🔧 <strong>Manuel FTTH</strong> - KPIs et analyses du traitement manuel</li>
                <li>🎫 <strong>Ticketing FTTH</strong> - Gestion et suivi des tickets</li>
                <li>📧 <strong>Mailing FTTH</strong> - Traitement des e-mails</li>
              </ul>
            </div>
            
            <p style="margin-top:40pt; font-size:10pt; color:#6b7280;">Généré le : ${todayStr}</p>
          </div>
        </td></tr>
      </table>
    </div>
  `;

  // Génération des sections
  Object.values(sections).forEach((section) => {

  // Ne rien générer si aucun élément de la section n'est sélectionné
  if (!sectionHasSelectedItems(section)) {
    return;
  }

  documentHtml += generateSectionTitlePage(section.title);

  if (section.kpis?.length) {
    documentHtml += generateKpiPages(section.kpis, section.title);
  }

  if (section.singles) {
    section.singles.forEach((id) => {
      if (findImageById(id)) {
        documentHtml += generateSingleGraphPage(id);
      }
    });
  }

  if (section.noComments) {
    section.noComments.forEach((id) => {
      if (findImageById(id)) {
        documentHtml += generateSingleGraphPage(id);
      }
    });
  }
});

  // Footer final
// Footer final
documentHtml += `
  <div style="padding: 30pt;">
    <div style="
      width: 90%;
      margin: 40pt auto;
      padding: 20pt;
      background: #eef2f7;
      border-radius: 12pt;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    ">
      <p style="font-size:11pt; color:#1f2937; line-height:1.8; margin:0;">
        Rapport généré automatiquement par <strong style="color:#004aad;">MyIT</strong><br/>
        <a href="https://myit-three.vercel.app" target="_blank" style="text-decoration:none; color:#004aad; font-weight:bold;">
          Dashboard FTTH - Plateforme MyIT
        </a>
      </p>
    </div>
  </div>
`;

  /* --- HTML final avec styles globaux --- */
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { 
      margin: 0.5cm; 
      size: A4;
    }
    body { 
      margin: 0; 
      padding: 0; 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      color: #111827;
      line-height: 1.4;
    }
    * {
      box-sizing: border-box;
    }
    table {
      border-collapse: collapse;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  ${documentHtml}
</body>
</html>
  `;

  console.log("DEBUG FTTH: Document Word avec pages séparées prêt.");

  const blob = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Compte-rendu_FTTH_${weekPart}_${todayStr.replace(/\//g, "-")}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =============== Compatibilité avec l'ancienne signature =============== */
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