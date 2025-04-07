import htmlDocx from "html-docx-js/dist/html-docx";

export async function generateWordFromImages(imageList) {
  const today = new Date().toLocaleDateString("fr-FR");

  const graphImages = imageList.map((item) => {
    const label = item.label || item.id;
    return `
      <table style="width:100%; border-collapse:collapse; margin-bottom:60px;">
        <tr>
          <td style="background:#ffffff; padding:25px; border:1px solid #cdcdcd; border-radius:12px;">
            <h2 style="color:#31327e; font-size:18pt; text-align:center; margin-bottom:20px;">
              ${label}
            </h2>
            <div style="text-align:center; margin-bottom:20px;">
              <img src="${item.image}" style="width:95%; max-width:700px; border-radius:10px;" />
            </div>
            <div style="background:#f9fafb; border:1px dashed #68bddd; padding:12px; border-radius:8px;">
              <p style="font-size:10.5pt; color:#4b5563; font-style:italic; margin:0;">
                💬 Commentaire : ___________________________________________
              </p>
            </div>
          </td>
        </tr>
      </table>
    `;
  });

  const html = `
  <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body style="font-family:Segoe UI,Tahoma,sans-serif; padding:20px;">
    
        <table style="width:100%; margin-bottom:10px;">
          <tr>
            <td><img src="/logo-intelcia-small.png" style="height:26px;" /></td>
            <td style="text-align:right;"><img src="/logo_sfr_small.png" style="height:26px;" /></td>
          </tr>
          <tr>
            <td></td>
            <td style="text-align:right; font-size:10pt; color:#6b7280;">Généré le : ${today}</td>
          </tr>
        </table>

        <div style="background:#31327e; padding:30px 20px; text-align:center; color:white; border-radius:12px;">
          <h1 style="font-size:22pt; margin:0;">Compte rendu détaillé de l'activité HISPEED</h1>
        </div>

        <p style="margin-top:15px; font-size:11pt;"><strong>Date du jour :</strong> ${today}</p>

        <div style="background:#68bddd; padding:25px; text-align:center; border-radius:8px; margin:50px 0 30px;">
          <h2 style="font-size:22pt; color:#ffffff; margin:0;">Vue d’ensemble des graphiques</h2>
          <p style="font-size:10pt; color:#f0f9ff; margin-top:8px;">Rapport généré le ${today}</p>
        </div>

        ${graphImages.join("\n")}

        <table style="width:100%; margin-top:60px; background:#cdcdcd; padding:10px 0;">
          <tr>
            <td style="text-align:center; font-size:10pt; color:#374151;">
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
  a.download = `Compte-rendu_HISPEED_${today.replace(/\//g, "-")}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
