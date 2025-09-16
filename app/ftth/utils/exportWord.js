import htmlDocx from "html-docx-js/dist/html-docx";

// Fonction pour calculer le numéro de semaine d'une date
const getWeekNumber = (date) => {
  if (!date) return null;
  
  // Création d'une copie de la date pour ne pas modifier l'originale
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  
  // Définir le premier jour de l'année
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  
  // Calculer le numéro de semaine
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

export async function generateWordFromImages(imageList, startDate = null, endDate = null) {
  // Debug : Affichage complet de l'imageList reçue
  console.log("DEBUG FTTH: Contenu de imageList :", imageList);

  const today = new Date();
  const todayStr = today.toLocaleDateString("fr-FR");

  // Formater information de période sélectionnée
  let periodLine = "";
  let weekPart = "";

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const startStr = start.toLocaleDateString("fr-FR");
    const endStr = end.toLocaleDateString("fr-FR");
    
    // Collecter toutes les semaines dans la période
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

  // Fonction helper pour trouver une image par son ID (même logique que PPTX)
  function findImageById(id) {
    return imageList.find(item => {
      const currentId = (item.id || item.label || "").toString().toLowerCase();
      const currentLabel = (item.label || item.id || "").toString().toLowerCase();
      const searchId = id.toLowerCase();
      
      // Recherche exacte par ID ou label
      return currentId === searchId || currentLabel === searchId;
    });
  }

  // Définition des sections et leurs composants (exactement comme dans PPTX)
  const sections = {
    manuel: {
      title: "Manuel FTTH",
      kpis: ["kpi-backlog-j1", "kpi-backlog-j", "kpi-manuel-7j"],
      singles: [
        "vue-ensemble-backlog",
        "repartition-manuelle", 
        "top-5-regles",
        "top-regles-par-jour",
        "graph-entrants-sortants"
      ]
    },
    ticketing: {
      title: "Ticketing FTTH",
      kpis: [
        "KPI Tickets Entrants",
        "KPI Tickets Traités",
        "KPI Tickets Réentrants",
        "KPI Tickets en Cours",
        "KPI Tickets en Cours +Semaine"
      ],
      singles: [
        "Tickets Entrants/Sortants",
        "Backlog J",
        "Transité / Criticité",
        "Ancienneté des Tickets Traités",
        "Volume des Tickets par Division",
        "Rapport Sortants/Entrants",
        "Taux des Réentrants",
        "Volume des Réentrants"
      ],
      noComments: [
        "Détail des Réitérations des Tickets",
        "Tickets en cours - Plus de une semaine"
      ]
    },
    mailing: {
      title: "Mailing FTTH",
      singles: [
        "Traitement des E-mails",
        "Répartition des E-mails par type"
      ]
    }
  };

  // Fonction pour générer le HTML des KPI d'une section
  function generateKpiSectionHtml(kpiIds, sectionTitle) {
    if (!kpiIds || kpiIds.length === 0) return '';

    // Récupération des images KPI
    const kpiImages = kpiIds.map(kpiId => {
      const found = findImageById(kpiId);
      return found ? found : { label: kpiId, image: null };
    });

    // Disposition des KPI - 3 par ligne
    let kpiHtml = '';
    const numRows = Math.ceil(kpiImages.length / 3);
    
    for (let row = 0; row < numRows; row++) {
      kpiHtml += '<table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:8pt;"><tr>';
      
      for (let col = 0; col < 3; col++) {
        const index = row * 3 + col;
        if (index < kpiImages.length) {
          const kpi = kpiImages[index];
          const kpiLabel = kpi.label || kpi.id || "KPI Inconnu";
          // 🎯 PARAMÈTRES DIMENSIONS KPI: width="200" height="120" et style="width:200px; height:120px;"
          const imageHtml = kpi.image
            ? `<img src="${kpi.image}" width="200" height="120" style="width:200px; height:120px; object-fit:contain;" />`
            : `<div style="width:200px; height:120px; border:1px dashed #cdcdcd; text-align:center; color:#999; display:flex; align-items:center; justify-content:center; font-size:10pt;">KPI N/A<br/>${kpiLabel}</div>`;
            
          kpiHtml += `
            <td width="33.33%" align="center" valign="middle" style="padding:5pt;">
              <div style="text-align:center; margin-bottom:4pt;">
                <strong style="font-size:9pt; color:#004aad;">${kpiLabel}</strong>
              </div>
              ${imageHtml}
            </td>
          `;
        } else {
          // Cellule vide pour maintenir 3 colonnes
          kpiHtml += '<td width="33.33%"></td>';
        }
      }
      
      kpiHtml += '</tr></table>';
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
            <p class="subtitle">📊 KPIs ${sectionTitle}</p>
            <div style="margin-top:10pt;">
              ${kpiHtml}
            </div>
            <div class="comment-block" style="margin-top:8pt; min-height: 100px;">
              <div class="comment-block-title"></div>
              <div class="comment-text" style="min-height: 100px; padding-top: 10px; padding-bottom: 10px;">
            <p>-</p>
            <p>-</p>
            <p>-</p>
            <p>-</p>
            <p>-</p>
            <p>-</p>


              </div>
            </div>
          </td></tr>
        </table>
      </div>
    `;
  }

  // Fonction pour générer le HTML d'un graphique individuel
  function generateSingleGraphHtml(imageId, showComments = true) {
    const imageItem = findImageById(imageId);
    if (!imageItem) {
      console.warn(`Image non trouvée pour l'ID: ${imageId}`);
      return '';
    }

    const title = imageItem.label || imageItem.id || imageId;
    const commentSection = showComments ? `
      <div class="comment-block" style="margin-top:8pt; min-height: 100px;">
        <div class="comment-block-title"></div>
        <div class="comment-text" style="min-height: 100px; padding-top: 10px; padding-bottom: 10px;">
            <p>-</p>
            <p>-</p>
            <p>-</p>
            <p>-</p>
            <p>-</p>
            <p>-</p>

      
        </div>
      </div>
    ` : '';

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
            <p class="subtitle">📊 ${title}</p>
            <div style="margin-top:4pt; text-align:center;">
              <div style="margin-bottom:6pt;">
                <!-- 🎯 PARAMÈTRES DIMENSIONS GRAPHIQUES: width="700" height="500" et style="width:700px; height:500px;" -->
                <img src="${imageItem.image}" width="700" height="400" style="width:700px; height:400px; object-fit:contain; display:block; margin:0 auto;" />
              </div>
            </div>
            ${commentSection}
          </td></tr>
        </table>
      </div>
    `;
  }

  // Génération du contenu par sections - SANS LES PAGES DE TITRES DE SECTIONS
  let sectionsHtml = '';

  Object.values(sections).forEach(section => {

    // Page des KPIs si elle existe
    if (section.kpis && section.kpis.length > 0) {
      sectionsHtml += generateKpiSectionHtml(section.kpis, section.title);
    }

    // Pages des graphiques individuels avec commentaires
    if (section.singles) {
      section.singles.forEach(imageId => {
        sectionsHtml += generateSingleGraphHtml(imageId, true);
      });
    }

    // Pages des graphiques sans commentaires
    if (section.noComments) {
      section.noComments.forEach(imageId => {
        sectionsHtml += generateSingleGraphHtml(imageId, false);
      });
    }
  });

  // Page d'introduction/couverture
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
            <h1 style="font-size:36pt; font-weight:bold; color:#004aad; margin:20pt 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">
              Comité Opérationnel Bimensuel<br/>
              EA FTTH
            </h1>
            ${periodLine}
            
            <div style="margin-top:40pt; padding:20pt; background:#ffffff; border-radius:15pt; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="font-size:16pt; color:#1f2937; margin-bottom:15pt;">📋 Sections du rapport :</h2>
              <ul style="text-align:left; font-size:14pt; color:#4b5563; line-height:1.8; list-style:none; padding:0;">
                <li style="margin:8pt 0;">🔧 <strong>Manuel FTTH</strong> - KPIs et analyses du traitement manuel</li>
                <li style="margin:8pt 0;">🎫 <strong>Ticketing FTTH</strong> - Gestion et suivi des tickets</li>
                <li style="margin:8pt 0;">📧 <strong>Mailing FTTH</strong> - Traitement des e-mails</li>
              </ul>
            </div>
          </div>
        </td></tr>
      </table>
    </div>
  `;

  // Construction complète du document Word
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0pt; size: 21cm 29.7cm; }
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; color: #111827; }
    .title {
      font-size: 24pt;
      font-weight: bold;
      text-align: center;
      color: #004aad;
      margin: 2pt 0 2pt 0;
    }
    .subtitle {
      font-size: 16pt;
      font-weight: bold;
      color: #004aad;
      text-align: center;
      margin-top: 14pt;
      margin-bottom: 10pt;
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

  <!-- PAGE COUVERTURE -->
  ${coverHtml}

  <!-- SECTIONS ORGANISÉES (SANS TITRES DE SECTIONS) -->
  ${sectionsHtml}

  <!-- Pied de page esthétique -->
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

  console.log("DEBUG FTTH: HTML final généré SANS titres de sections");

  const blob = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Compte-rendu_FTTH_${weekPart}_${todayStr.replace(/\//g, "-")}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Garde aussi l'ancienne fonction pour compatibilité si nécessaire
export async function generateWordFromGraphs(selectedGraphIds = [], graphList = [], commentMap = {}, globalStartDate, globalEndDate) {
  console.warn("FTTH: generateWordFromGraphs est dépréciée, utilisez generateWordFromImages");
  // Rediriger vers la nouvelle fonction
  return generateWordFromImages(selectedGraphIds, globalStartDate, globalEndDate);
}

export default generateWordFromImages;