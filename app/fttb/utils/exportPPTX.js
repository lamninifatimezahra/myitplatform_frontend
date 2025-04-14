import PptxGenJS from "pptxgenjs";

// Fonction pour précharger les images et les convertir en base64
const preloadImageAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      console.warn(`Impossible de charger l'image: ${url}`);
      resolve(null); // On résout avec null pour éviter de bloquer le processus
    };
    img.src = url;
  });
};

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

export async function generatePPTFromImages(imageList, startDate = null, endDate = null) {
  // Debug : Affichage du contenu de imageList
  console.log("DEBUG: Contenu de imageList pour PPTX:", imageList);

  if (imageList.length === 0) {
    return alert("Aucune visualisation à exporter");
  }
  
  const ppt = new PptxGenJS();
  const todayStr = new Date().toISOString().split("T")[0];
  const formattedDate = new Date().toLocaleDateString("fr-FR");

  // Formatage de la période sélectionnée si disponible
  let periodText = "";
  if (startDate && endDate) {
    const startWeek = getWeekNumber(startDate);
    const endWeek = getWeekNumber(endDate);
    periodText = `Période: ${startDate.toLocaleDateString("fr-FR")} (S${startWeek}) → ${endDate.toLocaleDateString("fr-FR")} (S${endWeek})`;
  }

  // Préchargement des logos
  const intelciaLogoUrl = "https://myit-three.vercel.app/logo-intelcia-small.png";
  const sfrLogoUrl = "https://myit-three.vercel.app/logo_sfr_small.png";
  
  let intelciaLogoBase64 = null;
  let sfrLogoBase64 = null;
  
  try {
    intelciaLogoBase64 = await preloadImageAsBase64(intelciaLogoUrl);
    sfrLogoBase64 = await preloadImageAsBase64(sfrLogoUrl);
  } catch (err) {
    console.error("Erreur lors du préchargement des logos:", err);
  }

  // Définition des KPI fixes 
  const fixedKpiLabels = [
    "KPI Tickets Entrants",
    "KPI Tickets Traités",
    "KPI Tickets Réentrants",
    "KPI Tickets en Cours",
    "KPI Tickets en Cours +14j"
  ];
  
  const normalizedLabels = fixedKpiLabels.map((l) => l.toLowerCase());
  
  // Filtrer les images en différentes catégories
  const kpiImages = imageList.filter(img => normalizedLabels.some(label => 
    (img.label || img.id).toLowerCase().includes(label.replace("kpi ", "").toLowerCase())
  ));
  
  const graphImages = imageList.filter(img => !kpiImages.includes(img));
  
  const tableImages = graphImages.filter(img => 
    ["Tickets en cours - Plus de 2 semaines", "Détail des Réitérations des Tickets"].some(id => 
      (img.id || "").includes(id) || (img.label || "").includes(id)
    )
  );
  
  const standardGraphImages = graphImages.filter(img => !tableImages.includes(img));

  // Slide d'introduction
  const intro = ppt.addSlide();
  intro.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "F5F7FA" } });
  intro.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 1.5, w: "100%", h: 1.5, fill: { color: "31327E" } });
  
  // Ajouter les logos en base64 au lieu des URLs
  if (intelciaLogoBase64) {
    intro.addImage({ data: intelciaLogoBase64, x: 0.5, y: 0.4, w: 1.2, h: 0.6 });
  } else {
    intro.addText("INTELCIA", { x: 0.5, y: 0.4, w: 1.2, h: 0.6, color: "31327E", fontSize: 10, bold: true });
  }
  
  if (sfrLogoBase64) {
    intro.addImage({ data: sfrLogoBase64, x: 8.3, y: 0.4, w: 1.2, h: 1 });
  } else {
    intro.addText("SFR", { x: 8.3, y: 0.4, w: 1.2, h: 0.6, color: "FF0000", fontSize: 14, bold: true });
  }
  
  intro.addText("Compte Rendu FTTB", { x: 2, y: 1.8, w: 6, fontSize: 28, bold: true, color: "FFFFFF", align: "center" });
  intro.addText("Suivi d'activité et analyse des performances", { x: 2, y: 2.2, w: 6, fontSize: 16, color: "FFFFFF", align: "center" });
  
  // Ajout de la date d'édition
  intro.addText(`Date d'édition : ${formattedDate}`, { x: 7, y: 5.0, w: 2.5, fontSize: 14, color: "363636", align: "right" });
  
  // Ajout de la période sélectionnée si disponible
  if (periodText) {
    intro.addShape(ppt.shapes.RECTANGLE, { 
      x: 2, y: 3.5, w: 6, h: 0.6, 
      fill: { color: "FFFFFF" }, 
      line: { color: "68BDDD", width: 1 },
      shadow: { type: "outer", blur: 2, offset: 1, angle: 45, color: "CFCFCF" }
    });
    
    intro.addText(periodText, { 
      x: 2, y: 3.5, w: 6, h: 0.6, 
      fontSize: 14, color: "31327E", bold: true, align: "center", valign: "middle" 
    });
  }

  // KPI Slide - MODIFIÉ pour suivre la même structure que les graphiques
  if (kpiImages.length > 0) {
    const slide = ppt.addSlide();
    slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "F5F7FA" } });
    slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: 0.6, fill: { color: "68BDDD" } });
    slide.addText("KPI - Key Performance Indicators", { x: 0.5, y: 0.15, fontSize: 16, bold: true, color: "FFFFFF" });
    
    // Ajout de la période sélectionnée en sous-titre si disponible
    if (periodText) {
      slide.addText(periodText, { x: 7, y: 0.15, fontSize: 10, color: "FFFFFF", bold: true, align: "right" });
    }
    
    // Calculer les dimensions pour le layout 2/3 - 1/3
    const slideWidth = 10; // PowerPoint utilise 10 pouces de largeur
    const slideHeight = 5.63; // ~5.63 pouces de hauteur 
    const headerHeight = 0.6; // Hauteur de l'en-tête bleu
    const contentHeight = slideHeight - headerHeight - 0.2; // Hauteur disponible après le header
    
    // Zone pour les KPIs (2/3 de la largeur)
    const kpiContainerWidth = (slideWidth * 2/3) - 1; // 2/3 de la largeur avec marge
    const kpiContainerHeight = contentHeight - 0.4; // Hauteur avec marge
    const kpiContainerX = 0.5; // Marge gauche
    const kpiContainerY = headerHeight + 0.2; // Position Y après le header
    
    // Zone pour les commentaires (1/3 de la largeur)
    const commentWidth = (slideWidth * 1/3) - 0.5; // 1/3 de la largeur avec marge
    const commentX = kpiContainerX + kpiContainerWidth + 0.2; // Position X après les KPIs
    const commentY = headerHeight + 0.2; // Même niveau Y que les KPIs
    const commentHeight = kpiContainerHeight; // Même hauteur que les KPIs
    
    // Ajouter le conteneur pour les KPIs - s'assurer qu'il a un padding suffisant
    slide.addShape(ppt.shapes.RECTANGLE, { 
      x: kpiContainerX, 
      y: kpiContainerY, 
      w: kpiContainerWidth, 
      h: kpiContainerHeight, 
      fill: { color: "FFFFFF" }, 
      line: { color: "DDDDDD" }, 
      shadow: { type: "outer", blur: 3, offset: 1, angle: 45, color: "CFCFCF" } 
    });
    
    // Ajouter une bordure visuelle à l'intérieur du conteneur pour mieux visualiser les limites
    slide.addShape(ppt.shapes.RECTANGLE, { 
      x: kpiContainerX + 0.1, 
      y: kpiContainerY + 0.1, 
      w: kpiContainerWidth - 0.2, 
      h: kpiContainerHeight - 0.2, 
      fill: { color: "FFFFFF" }, 
      line: { color: "E6F2F8", width: 1, dashType: "dash" } 
    });
    
    // Disposition des KPIs dans leur conteneur
    // Calculer la taille des KPIs individuels - taille réduite pour s'adapter au conteneur
    const kpiWidth = 1.7; // Encore plus réduit pour s'assurer qu'ils tiennent
    const kpiHeight = 1.3; // Réduit pour s'assurer qu'ils tiennent verticalement
    const kpiMarginX = 0.1; // Réduit l'espace entre les KPIs horizontalement
    const kpiMarginY = 0.15; // Réduit l'espace entre les KPIs verticalement
    
    // Ajuster les positions de départ pour un meilleur centrage
    const kpiStartX = kpiContainerX + 0.3;
    const kpiStartY = kpiContainerY + 0.2;
    
    // Fonction pour créer un KPI à une position donnée
    const createKPI = (kpiImage, posX, posY) => {
      // Vérifier si kpiImage est défini
      if (!kpiImage) {
        slide.addShape(ppt.shapes.RECTANGLE, { 
          x: posX, 
          y: posY, 
          w: kpiWidth, 
          h: kpiHeight, 
          fill: { color: "FFFFFF" }, 
          line: { color: "DDDDDD" }
        });
        slide.addShape(ppt.shapes.RECTANGLE, { 
          x: posX, 
          y: posY, 
          w: kpiWidth, 
          h: 0.3, 
          fill: { color: "68BDDD" } 
        });
        slide.addText("KPI", { 
          x: posX, 
          y: posY + 0.05, 
          w: kpiWidth, 
          fontSize: 9, 
          bold: true, 
          color: "FFFFFF", 
          align: "center" 
        });
        slide.addText("⚠️ Image non disponible", { 
          x: posX + 0.1, 
          y: posY + 0.6, 
          w: kpiWidth - 0.2, 
          fontSize: 9, 
          color: "FF0000", 
          bold: true, 
          align: "center" 
        });
        return;
      }
      
      slide.addShape(ppt.shapes.RECTANGLE, { 
        x: posX, 
        y: posY, 
        w: kpiWidth, 
        h: kpiHeight, 
        fill: { color: "FFFFFF" }, 
        line: { color: "DDDDDD" } 
      });
      slide.addShape(ppt.shapes.RECTANGLE, { 
        x: posX, 
        y: posY, 
        w: kpiWidth, 
        h: 0.3, 
        fill: { color: "68BDDD" } 
      });
      slide.addText(kpiImage.label || "KPI", { 
        x: posX, 
        y: posY + 0.05, 
        w: kpiWidth, 
        fontSize: 9, 
        bold: true, 
        color: "FFFFFF", 
        align: "center" 
      });
      
      if (kpiImage.image) {
        slide.addImage({ 
          data: kpiImage.image, 
          x: posX + 0.1, 
          y: posY + 0.35, 
          w: kpiWidth - 0.2, 
          h: kpiHeight - 0.5 
        });
      } else {
        slide.addText("⚠️ Image non disponible", { 
          x: posX + 0.1, 
          y: posY + 0.6, 
          w: kpiWidth - 0.2, 
          fontSize: 9, 
          color: "FF0000", 
          bold: true, 
          align: "center" 
        });
      }
    };

    // Fonction pour trouver un KPI correspondant à un mot-clé
    const mapToKpi = (keyword) => {
      return kpiImages.find(kpi => {
        const label = (kpi.label || kpi.id || "").toLowerCase();
        return label.includes(keyword);
      });
    };

    // Disposition en grille - ajustée pour une meilleure organisation
    const keywords = ["entrants", "traités", "réentrants", "en cours", "+14j"];
    
    // Calculer l'espace disponible pour placer les KPIs
    const availableWidth = kpiContainerWidth - 0.6; // Espace disponible en largeur (moins les marges)
    const totalWidthPerKPI = kpiWidth + kpiMarginX; // Largeur totale occupée par chaque KPI
    const maxKPIsPerRow = Math.floor(availableWidth / totalWidthPerKPI); // Nombre max de KPIs par ligne
    
    // Vérifier que le dernier KPI ne dépasse pas la hauteur du conteneur
    const lastKpiY = kpiStartY + 2 * (kpiHeight + kpiMarginY);
    const lastKpiBottom = lastKpiY + kpiHeight;
    const containerBottom = kpiContainerY + kpiContainerHeight;
    
    // Si le dernier KPI dépasse le conteneur, réajuster les marges verticales
    if (lastKpiBottom > containerBottom - 0.1) {
      // Calculer un nouveau kpiMarginY pour que tout tienne
      const availableHeight = kpiContainerHeight - 0.4; // Hauteur disponible avec marge
      const totalHeightNeeded = 3 * kpiHeight; // Hauteur totale nécessaire pour 3 lignes
      const newMarginY = Math.max(0.05, (availableHeight - totalHeightNeeded) / 2); // Calculer nouvelle marge
      
      // Repositionner tous les KPIs avec la nouvelle marge
      // Première ligne - 2 KPIs
      createKPI(mapToKpi(keywords[0]), kpiStartX, kpiStartY);
      createKPI(mapToKpi(keywords[1]), kpiStartX + totalWidthPerKPI, kpiStartY);
      
      // Deuxième ligne - 2 KPIs
      const secondRowY = kpiStartY + kpiHeight + newMarginY;
      createKPI(mapToKpi(keywords[2]), kpiStartX, secondRowY);
      createKPI(mapToKpi(keywords[3]), kpiStartX + totalWidthPerKPI, secondRowY);
      
      // Troisième ligne - 1 KPI (centré)
      const thirdRowY = secondRowY + kpiHeight + newMarginY;
      const centerOffsetX = (availableWidth - kpiWidth) / 2;
      createKPI(mapToKpi(keywords[4]), kpiStartX + centerOffsetX, thirdRowY);
    } else {
      // Disposition 2+2+1 pour garantir que tout reste dans le conteneur
      // Première ligne - 2 KPIs
      createKPI(mapToKpi(keywords[0]), kpiStartX, kpiStartY);
      createKPI(mapToKpi(keywords[1]), kpiStartX + totalWidthPerKPI, kpiStartY);
      
      // Deuxième ligne - 2 KPIs
      createKPI(mapToKpi(keywords[2]), kpiStartX, kpiStartY + kpiHeight + kpiMarginY);
      createKPI(mapToKpi(keywords[3]), kpiStartX + totalWidthPerKPI, kpiStartY + kpiHeight + kpiMarginY);
      
      // Troisième ligne - 1 KPI (centré)
      const centerOffsetX = (availableWidth - kpiWidth) / 2;
      createKPI(mapToKpi(keywords[4]), kpiStartX + centerOffsetX, kpiStartY + 2 * (kpiHeight + kpiMarginY));
    }
    
    // Ajouter la section commentaire avec titre
    slide.addShape(ppt.shapes.RECTANGLE, { 
      x: commentX, 
      y: commentY, 
      w: commentWidth, 
      h: commentHeight, 
      fill: { color: "FFFFFF" }, 
      line: { color: "68BDDD", width: 1, dashType: "dash" } 
    });
    
    // Titre de la section commentaire
    slide.addShape(ppt.shapes.RECTANGLE, { 
      x: commentX, 
      y: commentY, 
      w: commentWidth, 
      h: 0.4, 
      fill: { color: "E6F2F8" } 
    });
    
    slide.addText("💬 Commentaire", { 
      x: commentX, 
      y: commentY + 0.15, 
      w: commentWidth - 0.2, 
      fontSize: 14, 
      bold: true, 
      color: "31327E", 
      align: "center" 
    });
    
    // Zone de commentaire
    slide.addText(
      "Observations clés:\n\n" +
      "___________________________\n\n" +
      "___________________________\n\n" +
      "___________________________\n\n" +
      "Points d'action:\n\n" +
      "□ ________________________\n\n" +
      "□ ________________________\n\n" +
      "□ ________________________", 
      { 
        x: commentX + 0.2, 
        y: commentY + 0.5, 
        w: commentWidth - 0.4, 
        h: commentHeight - 0.7,
        fontSize: 11, 
        color: "4B5563" 
      }
    );
  }

  // Graphiques standards
  for (const item of standardGraphImages) {
    const slide = ppt.addSlide();
    slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "F5F7FA" } });
    slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: 0.6, fill: { color: "68BDDD" } });
    slide.addText(item.label || "Graphique", { x: 0.5, y: 0.15, fontSize: 16, bold: true, color: "FFFFFF" });
    
    // Ajout de la période sélectionnée en sous-titre si disponible
    if (periodText) {
      slide.addText(periodText, { x: 7, y: 0.15, fontSize: 10, color: "FFFFFF", bold: true, align: "right" });
    }
    
    // Diviser la slide en 3 tiers verticaux
    const slideWidth = 10; // PowerPoint utilise 10 pouces de largeur
    const slideHeight = 5.63; // ~5.63 pouces de hauteur 
    const headerHeight = 0.6; // Hauteur de l'en-tête bleu
    const contentHeight = slideHeight - headerHeight - 0.2; // Hauteur disponible après le header avec une petite marge
    const tierHeight = contentHeight / 3; // Hauteur d'un tiers
    
    // Calculer les positions pour l'image (2/3 de la largeur)
    const imageWidth = (slideWidth * 2/3) - 1; // 2/3 de la largeur avec marge
    const imageHeight = tierHeight * 3 - 0.8; // 3 tiers avec marge
    const imageX = 0.5; // Marge gauche
    const imageY = headerHeight + 0.2; // Position Y après le header avec marge
    
    // Calculer les positions pour la section commentaire (1/3 de la largeur)
    const commentWidth = (slideWidth * 1/3) - 0.5; // 1/3 de la largeur avec marge
    const commentX = imageX + imageWidth + 0.2; // Position X après l'image avec marge
    const commentY = headerHeight + 0.2; // Même niveau Y que l'image
    const commentHeight = imageHeight; // Même hauteur que l'image
    
    // Ajouter le conteneur pour l'image
    slide.addShape(ppt.shapes.RECTANGLE, { 
      x: imageX, 
      y: imageY, 
      w: imageWidth, 
      h: imageHeight, 
      fill: { color: "FFFFFF" }, 
      line: { color: "DDDDDD" }, 
      shadow: { type: "outer", blur: 3, offset: 1, angle: 45, color: "CFCFCF" } 
    });
    
    // Ajouter l'image
    if (item.image) {
      slide.addImage({ 
        data: item.image, 
        x: imageX + 0.3, 
        y: imageY + 0.3, 
        w: imageWidth - 0.6, 
        h: imageHeight - 0.6 
      });
    } else {
      slide.addText("⚠️ Image non disponible", { 
        x: imageX + 0.5, 
        y: imageY + imageHeight/2 - 0.2, 
        fontSize: 16, 
        color: "FF0000", 
        bold: true, 
        align: "center" 
      });
    }
    
    // Ajouter la section commentaire avec titre
    slide.addShape(ppt.shapes.RECTANGLE, { 
      x: commentX, 
      y: commentY, 
      w: commentWidth, 
      h: commentHeight, 
      fill: { color: "FFFFFF" }, 
      line: { color: "68BDDD", width: 1, dashType: "dash" } 
    });
    
    // Titre de la section commentaire
    slide.addShape(ppt.shapes.RECTANGLE, { 
      x: commentX, 
      y: commentY, 
      w: commentWidth, 
      h: 0.4, 
      fill: { color: "E6F2F8" } 
    });
    
    slide.addText("💬 Commentaire", { 
      x: commentX , 
      y: commentY + 0.15, 
      w: commentWidth - 0.2, 
      fontSize: 14, 
      bold: true, 
      color: "31327E", 
      align: "center" 
    });
    
    // Zone de commentaire
    slide.addText(
      "Observations clés:\n\n" +
      "___________________________\n\n" +
      "___________________________\n\n" +
      "___________________________\n\n" +
      "Points d'action:\n\n" +
      "□ ________________________\n\n" +
      "□ ________________________\n\n" +
      "□ ________________________", 
      { 
        x: commentX + 0.2, 
        y: commentY + 0.5, 
        w: commentWidth - 0.4, 
        h: commentHeight - 0.7,
        fontSize: 11, 
        color: "4B5563" 
      }
    );
  }

  // Tableaux à la fin de la présentation
  for (const item of tableImages) {
    const slide = ppt.addSlide();
    slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "F5F7FA" } });
    slide.addShape(ppt.shapes.RECTANGLE, { x: 0, y: 0, w: "100%", h: 0.6, fill: { color: "68BDDD" } });
    slide.addText(item.label || "Tableau", { x: 0.5, y: 0.15, fontSize: 16, bold: true, color: "FFFFFF" });
    
    // Ajout de la période sélectionnée en sous-titre si disponible
    if (periodText) {
      slide.addText(periodText, { x: 7, y: 0.15, fontSize: 10, color: "FFFFFF", bold: true, align: "right" });
    }
    
    slide.addShape(ppt.shapes.RECTANGLE, { x: 1, y: 0.8, w: 8, h: 4.2, fill: { color: "FFFFFF" }, line: { color: "DDDDDD" }, shadow: { type: "outer", blur: 3, offset: 1, angle: 45, color: "CFCFCF" } });

    let imageX = 1.4, imageY = 1.2, imageW = 7.0, imageH = 2.0;
    if (item.image) {
      slide.addImage({ 
        data: item.image, 
        x: imageX, 
        y: imageY, 
        w: imageW, 
        h: imageH 
      });
    } else {
      slide.addText("⚠️ Image non disponible", { 
        x: 3, 
        y: 2.5, 
        fontSize: 16, 
        color: "FF0000", 
        bold: true, 
        align: "center" 
      });
    }
    const commentY = imageY + imageH + 0.2;
    slide.addShape(ppt.shapes.RECTANGLE, { 
      x: 1, 
      y: commentY, 
      w: 8, 
      h: 0.6, 
      fill: { color: "FFFFFF" }, 
      line: { color: "68BDDD", width: 1, dashType: "dash" } 
    });
    slide.addText("💬 Commentaire détaillé : ___________________________________________", { 
      x: 1.2, 
      y: commentY + 0.15, 
      fontSize: 12, 
      color: "4B5563" 
    });
  }

  try {
    await ppt.writeFile({ fileName: `compte_rendu_FTTB_${todayStr}.pptx` });
    console.log("Fichier PPTX généré avec succès");
  } catch (error) {
    console.error("Erreur lors de la génération du fichier PPTX:", error);
    alert("Erreur lors de la génération du PowerPoint. Veuillez réessayer.");
  }
}