// ✅ fttb/utils/exportWord.js harmonisé avec HISPEED

import htmlDocx from "html-docx-js/dist/html-docx";

export async function generateWordFromImages(imageList) {
  const today = new Date().toLocaleDateString("fr-FR");

  const fixedKpiLabels = [
    "KPI Tickets Entrants",
    "KPI Tickets Traités",
    "KPI Tickets Réentrants",
    "KPI Tickets en Cours",
    "KPI Tickets en Cours +14j"
  ];

  const normalizedFixedLabels = fixedKpiLabels.map(label => label.trim().toLowerCase());

  const kpiImages = fixedKpiLabels.map(label => {
    const normalizedLabel = label.trim().toLowerCase();
    const found = imageList.find(item => {
      const currentLabel = (item.label != null ? item.label : item.id);
      return currentLabel.trim().toLowerCase() === normalizedLabel;
    });
    return found ? found : { label, image: null };
  });

  const graphImagesList = imageList.filter(item => {
    const currentLabel = (item.label != null ? item.label : item.id);
    return !normalizedFixedLabels.includes(currentLabel.trim().toLowerCase());
  });

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

  let kpiRowsHtml = "";
  for (let i = 0; i < kpiImages.length; i += 2) {
    if (i + 1 < kpiImages.length) {
      kpiRowsHtml += `
        <tr>
          <td style="padding:10px; text-align:center; width:50%;">${generateKpiBlock(kpiImages[i])}</td>
          <td style="padding:10px; text-align:center; width:50%;">${generateKpiBlock(kpiImages[i + 1])}</td>
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

  const kpiSection = `
    <table style="width:100%; background:#f9fafb; border:1px solid #cdcdcd; padding:20px; margin-top:30px; margin-bottom:30px; border-collapse:collapse;">
      <tr>
        <td colspan="2" style="text-align:center; padding:20px;">
          <h2 style="font-size:14pt; color:#31327e; margin-bottom:5px;">
            📊 KPI – Key Performance Indicators
          </h2>
          <p style="color:#6b7280; font-size:8pt;">
            Suivi des indicateurs essentiels de performance FTTB.
          </p>
        </td>
      </tr>
      ${kpiRowsHtml}
    </table>
  `;

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

  let pagesHtml = "";
  for (let i = 0; i < graphBlocks.length; i += 2) {
    let pageContent = graphBlocks[i];
    if (i + 1 < graphBlocks.length) {
      pageContent += graphBlocks[i + 1];
    }
    pagesHtml += `<div style="page-break-after:always;">${pageContent}</div>`;
  }

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
        <table style="width:100%; margin-bottom:10px; border-collapse:collapse;">
          <tr>
            <td><img src="https://myit-three.vercel.app/logo-intelcia-small_1.png" style="height:26px;" /></td>
            <td style="text-align:right;"><img src="https://myit-three.vercel.app/logo_sfr_small.png" style="height:26px;" /></td>
          </tr>
          <tr>
            <td></td>
            <td style="text-align:right; font-size:8pt; color:#6b7280;">
              Généré le : ${today}
            </td>
          </tr>
        </table>

        <div style="background:#31327e; padding:20px; text-align:center; color:white;">
          <h1 style="font-size:16pt; margin:0;">
            Compte rendu détaillé de l'activité FTTB
          </h1>
        </div>

        <p style="margin-top:15px; font-size:10pt;">
          <strong>Date du jour :</strong> ${today}
        </p>

        ${kpiSection}

        <div style="background:#68bddd; padding:15px; text-align:center; margin-top:20px; margin-bottom:20px;">
          <h2 style="font-size:16pt; color:#ffffff; margin:0;">Vue d'ensemble des graphiques</h2>
          <p style="font-size:8pt; color:#f0f9ff; margin-top:5px;">Rapport généré le ${today}</p>
        </div>

        ${pagesHtml}

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

  const blob = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Compte-rendu_FTTB_${today.replace(/\//g, "-")}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
