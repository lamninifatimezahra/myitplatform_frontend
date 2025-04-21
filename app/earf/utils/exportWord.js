import htmlDocx from "html-docx-js/dist/html-docx";

// Fonction pour calculer le numéro de semaine d'une date
const getWeekNumber = (date) => {
  if (!date) return null;
  
  // Création d'une copie de la date pour ne pas modifier l'originale
  const d = new Date(date);
  
  // Définir le premier jour de l'année
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  
  // Nombre de jours écoulés depuis le début de l'année
  const days = Math.floor((d - startOfYear) / (24 * 60 * 60 * 1000));
  
  // Calculer le numéro de semaine
  // getDay() retourne 0 pour dimanche, donc on ajuste pour que lundi soit le premier jour
  const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  
  return weekNum;
};

export async function generateWordFromImages(imageList, startDate = null, endDate = null) {
  // Debug : Affichage complet de l'imageList reçue
  console.log("DEBUG: Contenu de imageList :", imageList);

  const today = new Date().toLocaleDateString("fr-FR");
  
  // Formatage de la période sélectionnée si disponible
  let periodText = "";
  if (startDate && endDate) {
    const startWeek = getWeekNumber(startDate);
    const endWeek = getWeekNumber(endDate);
    periodText = `${startDate.toLocaleDateString("fr-FR")} (S${startWeek}) → ${endDate.toLocaleDateString("fr-FR")} (S${endWeek})`;
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

  // Fonction générant un bloc HTML pour un KPI
  // Utilisation de dimensions fixes
  const generateKpiBlock = (kpi) => {
    const currentLabel = kpi.label != null ? kpi.label : kpi.id;
    const imageHtml = kpi.image
      ? `<img src="${kpi.image}" width="150" height="150" style="border-radius:5px;" />`
      : `<div style="width:40px; height:40px; border:1px dashed #cdcdcd; text-align:center; color:#999;">N/A</div>`;
    
    return `
      <div style="background:#ffffff; padding:15px; border:1px solid #cdcdcd;">
        <h2 style="color:#31327e; font-size:12pt; text-align:center; margin-bottom:10px;">
          ${currentLabel}
        </h2>
        <div style="text-align:center; margin-bottom:10px;">
          ${imageHtml}
        </div>
        <div style="background:#f9fafb; border:1px dashed #68bddd; padding:10px;">
          <p style="font-size:8pt; color:#4b5563; font-style:italic; margin:0;">
            💬 Commentaire : ___________
          </p>
        </div>
      </div>
    `;
  };

  // Regroupement des KPI en lignes de deux
  let kpiRowsHtml = "";
  for (let i = 0; i < kpiImages.length; i += 2) {
    if (i + 1 < kpiImages.length) {
      kpiRowsHtml += `
        <tr>
          <td style="padding:10px; text-align:center; width:50%;">${generateKpiBlock(kpiImages[i])}</td>
          <td style="padding:10px; text-align:center; width:50%;">${generateKpiBlock(kpiImages[i+1])}</td>
        </tr>
      `;
    } else {
      kpiRowsHtml += `
        <tr>
          <td colspan="2" style="padding:10px; text-align:center;">${generateKpiBlock(kpiImages[i])}</td>
        </tr>
      `;
    }
  }

  // Ajout du bloc de période sélectionnée dans la section KPI si disponible
  const periodBlock = periodText ? `
    <tr>
      <td colspan="2" style="text-align:center; padding:10px;">
        <div style="background:#e6f7ff; border:1px solid #68bddd; padding:10px; display:inline-block; margin:0 auto;">
          <p style="font-size:10pt; color:#31327e; font-weight:bold; margin:0;">
            <span style="font-weight:normal;">Période sélectionnée :</span> ${periodText}
          </p>
        </div>
      </td>
    </tr>
  ` : '';

  const kpiSection = `
    <table style="width:100%; background:#f9fafb; border:1px solid #cdcdcd; padding:20px; margin-top:30px; margin-bottom:30px; border-collapse:collapse;">
      <tr>
        <td colspan="2" style="text-align:center; padding:20px;">
          <h2 style="font-size:14pt; color:#31327e; margin-bottom:5px;">
            📊 KPI – Key Performance Indicators
          </h2>
          <p style="color:#6b7280; font-size:8pt;">
            Suivi des indicateurs essentiels de performance EARF.
          </p>
        </td>
      </tr>
      ${periodBlock}
      ${kpiRowsHtml}
    </table>
  `;

  // Génération des graphiques avec dimensions fixes
  const graphBlocks = graphImagesList.map(item => {
    const currentLabel = item.label != null ? item.label : item.id;
    return `
      <div style="background:#ffffff; padding:15px; border:1px solid #cdcdcd; margin-bottom:20px;">
        <h2 style="color:#31327e; font-size:14pt; text-align:center; margin-bottom:15px;">
          ${currentLabel}
        </h2>
        <div style="text-align:center; margin-bottom:15px;">
          <img src="${item.image}" width="600" height="450" style="border:1px solid #e5e7eb;" />
        </div>
        <div style="background:#f9fafb; border:1px dashed #68bddd; padding:10px;">
          <p style="font-size:8pt; color:#4b5563; font-style:italic; margin:0;">
            💬 Commentaire : ___________________________________________
          </p>
        </div>
      </div>
    `;
  });

  // Regroupement des graphiques par paires pour les sauts de page
  let pagesHtml = "";
  for (let i = 0; i < graphBlocks.length; i += 2) {
    let pageContent = graphBlocks[i];
    if (i + 1 < graphBlocks.length) {
      pageContent += graphBlocks[i + 1];
    }
    pagesHtml += `<div style="page-break-after:always;">${pageContent}</div>`;
  }

  // Préparation du bloc de période pour la section "Date du jour"
  const periodDateBlock = periodText ? `
    <p style="margin-top:10px; font-size:10pt;">
      <strong>Période sélectionnée :</strong> ${periodText}
    </p>
  ` : '';

  // Préparation du bloc de période pour l'en-tête de la section Graphiques
  const periodGraphHeaderBlock = periodText ? `
    <p style="font-size:9pt; color:#f0f9ff; margin-top:5px;">Période : ${periodText}</p>
  ` : '';

  // Construction complète du document Word
  const html = `
  <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 2cm; }
        body { font-family: Arial, sans-serif; }
      </style>
    </head>
    <body>
        <!-- Entête -->
        <table style="width:100%; margin-bottom:10px; border-collapse:collapse;">
          <tr>
            <td><img src="https://myit-its.vercel.app/logo-intelcia-small_1.png" style="height:26px;" /></td>
            <td style="text-align:right;"><img src="https://myit-its.vercel.app/logo_sfr_small.png" style="height:26px;" /></td>
          </tr>
          <tr>
            <td></td>
            <td style="text-align:right; font-size:8pt; color:#6b7280;">
              Généré le : ${today}
            </td>
          </tr>
        </table>

        <!-- Titre principal -->
        <div style="background:#31327e; padding:20px; text-align:center; color:white;">
          <h1 style="font-size:16pt; margin:0;">
            Compte rendu détaillé de l'activité EARF
          </h1>
        </div>

        <!-- Date -->
        <p style="margin-top:15px; font-size:10pt;">
          <strong>Date du jour :</strong> ${today}
        </p>
        ${periodDateBlock}

        <!-- Section KPI -->
        ${kpiSection}

        <!-- Titre section Graphiques -->
        <div style="background:#68bddd; padding:15px; text-align:center; margin-top:20px; margin-bottom:20px;">
          <h2 style="font-size:16pt; color:#ffffff; margin:0;">Vue d'ensemble des graphiques</h2>
          <p style="font-size:8pt; color:#f0f9ff; margin-top:5px;">Rapport généré le ${today}</p>
          ${periodGraphHeaderBlock}
        </div>

        <!-- Section Graphiques (2 par page) -->
        ${pagesHtml}

        <!-- Pied de page -->
        <table style="width:100%; margin-top:30px; background:#cdcdcd; padding:10px 0; border-collapse:collapse;">
          <tr>
            <td style="text-align:center; font-size:8pt; color:#374151;">
              Rapport généré automatiquement par <strong style="color:#31327e;">MyIT</strong>
            </td>
          </tr>
        </table>
    </body>
  </html>
  `;

  console.log("DEBUG: HTML final :", html);

  const blob = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Compte-rendu_EARF_${today.replace(/\//g, "-")}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}