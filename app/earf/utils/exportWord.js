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
  console.log("DEBUG: Contenu de imageList :", imageList);

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

  // Tableau fixe des KPI à inclure dans tous les compte-rendus
  const fixedKpiLabels = [
    "KPI Total Documents",
    "KPI Total Migration",
    "KPI Total Création"
  ];

  // Création d'une version normalisée des labels (trim + lowercase)
  const normalizedFixedLabels = fixedKpiLabels.map(label => label.trim().toLowerCase());

  // Extraction des images KPI depuis l'imageList en utilisant item.label si disponible sinon item.id
  const kpiImages = fixedKpiLabels.map(label => {
    const normalizedLabel = label.trim().toLowerCase();
    const found = imageList.find(item => {
      // Utiliser label si présent, sinon id
      const currentLabel = (item.label != null ? item.label : item.id);
      return currentLabel.trim().toLowerCase() === normalizedLabel;
    });
    return found ? found : { label, image: null };
  });

  // Extraction des images graphiques qui ne font pas partie des KPI fixes
  const graphImagesList = imageList.filter(item => {
    const currentLabel = (item.label != null ? item.label : item.id);
    return !normalizedFixedLabels.includes(currentLabel.trim().toLowerCase());
  });

  // Disposition des KPI - strictement 3 par ligne
  let kpiHtml = '';
  // Calcul du nombre de lignes nécessaires
  const numRows = Math.ceil(kpiImages.length / 3);
  
  for (let row = 0; row < numRows; row++) {
    kpiHtml += '<table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>';
    
    // Traiter chaque colonne de cette ligne
    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      if (index < kpiImages.length) {
        const kpi = kpiImages[index];
        const imageHtml = kpi.image
          ? `<img src="${kpi.image}" width="200" height="120" style="width:200px; height:120px; object-fit:contain;" />`
          : `<div style="width:300px; height:100px; border:1px dashed #cdcdcd; text-align:center; color:#999;">N/A</div>`;
          
        kpiHtml += `
          <td width="33.33%" align="center" valign="middle" style="padding:5pt;">
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

  // Génération des pages graphiques avec une page complète par graphique
  let graphPagesHtml = '';
  
  // Traiter chaque graphique individuellement (une page par graphique)
  graphImagesList.forEach((item, index) => {
    const currentLabel = item.label != null ? item.label : item.id;
    
    // Forcer un saut de page pour chaque nouveau graphique avec style pour contenir tout dans une page
    graphPagesHtml += `
      <div style="page-break-before: always; page-break-after: always; height: 26cm; overflow: hidden; display: block;">
        <table style="width:99.8%; border:2.8pt solid #d1d5db; border-radius:22pt; margin-top:0; margin-bottom:0; height: 25cm; max-height: 25cm;">
          <tr><td style="padding:14pt 24pt; vertical-align: top;">
            <table class="header-logos"><tr>
              <td><img src="https://myit-its.vercel.app/logo-intelcia-small_1.png" style="height:28pt;"></td>
              <td style="text-align:right;"><img src="https://myit-its.vercel.app/logo_sfr_small.png" style="height:28pt;"></td>
            </tr></table>
            <table class="date-row"><tr><td class="date-cell">Généré le : ${todayStr}</td></tr></table>
            ${periodLine}
            <p class="subtitle">📊 ${currentLabel}</p>
            <div style="margin-top:4pt; text-align:center;">
              <div style="margin-bottom:6pt;">
                <img src="${item.image}" width="700" height="500" style="width:700px; height:500px; object-fit:contain; display:block; margin:0 auto;" />
              </div>
            </div>
            <div class="comment-block" style="margin-top:8pt; min-height: 100px;">
              <div class="comment-block-title">💬 Votre commentaire</div>
              <div class="comment-text" style="min-height: 100px; padding-top: 10px; padding-bottom: 10px;">
                ___________________________________________<br/>
                ___________________________________________<br/>
                ___________________________________________<br/>
                ___________________________________________<br/>
                ___________________________________________<br/>
              </div>
            </div>
          </td></tr>
        </table>
      </div>
    `;
  });

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

  <!-- PAGE 1 - KPI -->
  <div style="page-break-after: always; height: 30cm; overflow: hidden; display: block;">
    <table style="width:99.8%; border:2.8pt solid #d1d5db; border-radius:22pt; margin-top:0; margin-bottom:0; height: 35cm; max-height: 35cm;">
      <tr><td style="padding:14pt 24pt; vertical-align: top;">
        <table class="header-logos"><tr>
          <td><img src="https://myit-its.vercel.app/logo-intelcia-small_1.png" style="height:28pt;"></td>
          <td style="text-align:right;"><img src="https://myit-its.vercel.app/logo_sfr_small.png" style="height:28pt;"></td>
        </tr></table>
        <table class="date-row"><tr><td class="date-cell">Généré le : ${todayStr}</td></tr></table>
        <h1 class="title" style="font-size:20pt;">Compte rendu détaillé de l'activité Migration Docs</h1>
        ${periodLine}
        
        <!-- Section des KPI -->
        <p class="subtitle" style="margin-top:10pt; margin-bottom:5pt;">📊 KPI – Key Performance Indicators</p>
        <div style="margin-top:5pt;">
          ${kpiHtml}
        </div>
        
        <div class="comment-block" style="margin-top:8pt; min-height: 100px;">
          <div class="comment-block-title">💬 Votre commentaire</div>
          <div class="comment-text" style="min-height: 100px; padding-top: 10px; padding-bottom: 10px;">
            ___________________________________________<br/>
            ___________________________________________<br/>
            ___________________________________________<br/>
            ___________________________________________<br/>
            ___________________________________________<br/>
            ___________________________________________<br/>

          </div>
        </div>
      </td></tr>
    </table>
  </div>

  <!-- Pages des graphiques -->
  ${graphPagesHtml}

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
    <a href="https://myit-its.vercel.app" target="_blank" style="text-decoration: none; color: #004aad; font-weight: bold;">
      Dashboard Migration Docs, Plateforme <span style="font-family:'Segoe UI Black', sans-serif; color:#000;">MyIT</span>
    </a>
  </div>

</body>
</html>
  `;

  console.log("DEBUG: HTML final :", html);

  const blob = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Compte-rendu_MIGRATION_${todayStr.replace(/\//g, "-")}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}