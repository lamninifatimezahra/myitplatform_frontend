import PptxGenJS from "pptxgenjs";

// Fonction pour précharger les images et les convertir en base64
const preloadImageAsBase64 = (url) => {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || url.trim() === '') { 
      console.log("URL d'image invalide ou vide");
      resolve(null); 
      return;
    }
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => { 
      // Création et configuration du canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Dessiner l'image sur le canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      // Convertir en base64
      resolve(canvas.toDataURL("image/png")); 
    };
    
    img.onerror = (err) => { 
      console.error("Erreur de chargement de l'image:", url, err);
      resolve(null); 
    };
    
    img.src = url;
  });
};

// Fonction pour calculer le numéro de semaine d'une date (ISO 8601)
const getWeekNumber = (date) => { 
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// --- Fonction Principale de Génération PPT ---
export async function generatePPTFromImages(imageList, startDate = null, endDate = null) {
  console.log("DEBUG: Appel de generatePPTFromImages.");
  console.log("DEBUG: Images reçues:", imageList.length);
  
  // Afficher la liste complète des images avec leurs IDs et labels
  console.log("LISTE COMPLÈTE DES IMAGES:");
  imageList.forEach((img, index) => {
    console.log(`Image ${index}:`, {
      id: img.id || "N/A",
      label: img.label || "N/A",
      hasImage: !!img.image
    });
  });

  if (!Array.isArray(imageList)) { 
    console.error("La liste d'images n'est pas un tableau valide");
    return; 
  }
  
  if (imageList.length === 0) { 
    console.error("La liste d'images est vide");
    return; 
  }

  const ppt = new PptxGenJS();
  const todayStr = new Date().toISOString().split("T")[0];
  const formattedDate = new Date().toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Formatage de la période
  let periodText = "";
  if (startDate instanceof Date && !isNaN(startDate) && endDate instanceof Date && !isNaN(endDate)) {
      const startWeek = getWeekNumber(startDate);
      const endWeek = getWeekNumber(endDate);
      const startDateStr = startDate.toLocaleDateString("fr-FR");
      const endDateStr = endDate.toLocaleDateString("fr-FR");
      periodText = `Période: ${startDateStr} (S${startWeek}) → ${endDateStr} (S${endWeek})`;
      console.log(`Période calculée: ${periodText}`);
  } else {
      console.log("Dates invalides ou manquantes, pas de texte de période.");
  }

  // --- Préchargement des images de fond
  const introBackgroundUrl = "/introduction.png";
  const contentBackgroundUrl = "/ftth_diapo.png";
  const finalImageUrl = "/fin.png";
  const titleSlideUrl = "/title_slide.png";

  let introBackgroundBase64 = null;
  let contentBackgroundBase64 = null;
  let finalImageBase64 = null;
  let titleSlideBase64 = null;

  try {
      console.log(`Tentative de préchargement: ${introBackgroundUrl}, ${contentBackgroundUrl}, ${finalImageUrl}, ${titleSlideUrl}`);
      [introBackgroundBase64, contentBackgroundBase64, finalImageBase64, titleSlideBase64] = await Promise.all([
          preloadImageAsBase64(introBackgroundUrl),
          preloadImageAsBase64(contentBackgroundUrl),
          preloadImageAsBase64(finalImageUrl),
          preloadImageAsBase64(titleSlideUrl)
      ]);
      console.log(`Résultat préchargement. Fond Intro: ${!!introBackgroundBase64}, Fond Contenu: ${!!contentBackgroundBase64}, Image Finale: ${!!finalImageBase64}, Title Slide: ${!!titleSlideBase64}`);
  } catch (err) {
      console.error("Erreur lors du préchargement des images de fond:", err);
  }

  // --- Slide d'introduction (Fond statique unique) ---
  const intro = ppt.addSlide();
  if (introBackgroundBase64) {
      intro.background = { data: introBackgroundBase64 };
      console.log("Image de fond de l'intro appliquée.");
  } else {
      intro.background = { color: "005A9E" };
      console.error("!!! ÉCHEC du chargement de l'image de fond de l'introduction !!!");
      intro.addText("ERREUR: Fond d'introduction manquant", { x:0.5, y:0.5, w:9, h:0.5, color:"FF0000", fontSize:18, align:"center" });
  }

  intro.addText("Compte Rendu HISPEED", { x: 0, y: 2.5, w: "100%", h: 0.7, align: "center", fontFace: "Segoe UI", fontSize: 36, bold: true, color: "FFFFFF" });
  intro.addText("Suivi d'activité et analyse des performances", { x: 0, y: 3.2, w: "100%", h: 0.5, align: "center", fontFace: "Segoe UI Light", fontSize: 20, color: "FFFFFF" });
  
  if (periodText) {
      intro.addShape(ppt.shapes.RECTANGLE, { x: 2, y: 3.9, w: 6, h: 0.6, fill: { color: "FFFFFF" }, line: { color: "68BDDD", width: 1 }, shadow: { type: "outer", blur: 2, offset: 1, angle: 45, color: "CFCFCF" } });
      intro.addText(periodText, { x: 2, y: 3.9, w: 6, h: 0.6, fontSize: 14, color: "31327E", bold: true, align: "center", valign: "middle" });
  }
  
  intro.addText(`Édité le : ${formattedDate}`, { x: 7.0, y: 5.2, w: 2.8, h: 0.3, align: "right", fontFace: "Segoe UI", fontSize: 10, color: "D0D0D0" });

  // --- Catégorisation des Images ---
  // Tableau fixe des KPI à inclure
  const fixedKpiLabels = [
    "KPI Tickets Entrants",
    "KPI Tickets Traités",
    "KPI Tickets Réentrants",
    "KPI Tickets en Cours",
    "KPI Tickets en Cours +14j"
  ];

  // Création d'une version normalisée des labels (trim + lowercase)
  const normalizedFixedLabels = fixedKpiLabels.map(label => label.trim().toLowerCase());

  // Extraction des images KPI
  const kpiImages = fixedKpiLabels.map(label => {
    const normalizedLabel = label.trim().toLowerCase();
    const found = imageList.find(item => {
      // Utiliser label si présent, sinon id
      const currentLabel = (item.label != null ? item.label : item.id || "");
      return currentLabel.trim().toLowerCase() === normalizedLabel;
    });
    return found ? found : { label, image: null };
  });

  console.log("KPIs trouvés:", kpiImages.map(img => img.label || img.id));

  // Extraction des images non-KPI
  const nonKpiImages = imageList.filter(item => {
    const currentLabel = (item.label != null ? item.label : item.id || "");
    return !normalizedFixedLabels.includes(currentLabel.trim().toLowerCase());
  });

  console.log("Images non-KPI:", nonKpiImages.length);

  // Identification des catégories spécifiques
  const reentrantLabels = [
    "Détail des Réitérations des Tickets",
    "Volume des Réentrants",
    "Taux des Réentrants"
  ];
  
  const tableLabels = [
    "Détail des Réitérations des Tickets", 
    "Tickets en cours - Plus de 2 semaines"
  ];

const reentrantImages = [];
const ticketsAnciensImage = { found: false, data: null };
const reiterationTableImage = { found: false, data: null };
const standardGraphImages = [];
const volumeTicketsDivisionImage = { found: false, data: null };

// Recherche des tableaux spécifiques et catégorisation des images
nonKpiImages.forEach(img => {
  const imgId = (img.id || "").toLowerCase();
  const imgLabel = (img.label || "").toLowerCase();
  
  // Vérifier si c'est le tableau des tickets anciens (+2 semaines)
  if (imgId.includes("plus de 2 semaines") || imgLabel.includes("plus de 2 semaines") || 
      imgId.includes("+14j") || imgLabel.includes("+14j")) {
    ticketsAnciensImage.found = true;
    ticketsAnciensImage.data = img;
  }
  // Vérifier si c'est le tableau des réitérations
  else if (imgId.includes("détail des réitérations") || imgLabel.includes("détail des réitérations") ||
           imgId.includes("detail des reiterations") || imgLabel.includes("detail des reiterations")) {
    reiterationTableImage.found = true;
    reiterationTableImage.data = img;
  }
  // Vérifier si c'est un graphique de réentrants (mais pas le volume par division)
  else if ((imgId.includes("réentrant") || imgLabel.includes("réentrant") ||
           imgId.includes("reentrant") || imgLabel.includes("reentrant") ||
           imgId.includes("taux") || imgLabel.includes("taux"))) {
    reentrantImages.push(img);
  }
  // Sinon, c'est un graphique standard
    else {
      standardGraphImages.push(img);
    }
  });

  console.log("Catégorisation finale:", {
    KPIs: kpiImages.length,
    ReentrantGraphs: reentrantImages.length,
    "Tableau tickets anciens": ticketsAnciensImage.found,
    "Tableau réitérations": reiterationTableImage.found,
    StandardGraphs: standardGraphImages.length
  });

  // --- Slide de titre: KPIs Opérationnels
  const slideKpiTitle = ppt.addSlide();
  if (titleSlideBase64) {
    slideKpiTitle.background = { data: titleSlideBase64 };
  } else {
    slideKpiTitle.background = { color: "2C5C8A" };
  }

  // Cercle avec numéro 1
  slideKpiTitle.addShape(ppt.ShapeType.ellipse, {
    x: 1.5, y: 2.6, w: 0.6, h: 0.6,
    fill: { color: "FFFFFF" },
    line: { color: "FFFFFF" }
  });
  slideKpiTitle.addText("1", {
    x: 1.5, y: 2.6, w: 0.6, h: 0.6,
    align: "center", valign: "middle",
    fontSize: 20, bold: true, color: "0B2F5A"
  });

  // Titre blanc centré
  slideKpiTitle.addText("KPIs Opérationnels​", {
    x: 2.2, y: 2.4, w: 7, h: 1,
    fontSize: 40, bold: true, color: "FFFFFF"
  });

  // --- Génération des slides KPI (Fond statique + Contenu) ---
  if (kpiImages.length > 0) {
      console.log(`Génération de la slide KPI.`);
      const slide = ppt.addSlide();

      // Appliquer le fond de contenu
      if (contentBackgroundBase64) { 
          slide.background = { data: contentBackgroundBase64 }; 
      } else { 
          slide.background = { color: "FFFFFF" };
          console.warn("Fond de contenu non chargé, utilisation d'un fond blanc par défaut");
      }

      // Ajouter le titre
      const titleY_kpi = 0.7;
      slide.addText("KPI –Vue Globale", { x: 0.5, y: titleY_kpi, w: 9.0, h: 0.4, fontSize: 18, bold: true, color: "0B2F5A" });
      
      if (periodText) { 
          slide.addText(periodText.split(': ')[1] || periodText, { x: 6.5, y: titleY_kpi + 0.1, w: 3, h: 0.25, fontSize: 9, color: "4B5563", align: "right" }); 
      }

      // Zone de contenu centrée pour les KPIs
      const contentStartY_kpi = titleY_kpi + 0.6; 
      const contentEndY_kpi = 5.2;
      const contentStartX_kpi = 0.5; // Centré horizontalement
      const contentEndX_kpi = 9.5;
      const availableWidth_kpi = Math.max(0.1, contentEndX_kpi - contentStartX_kpi);
      const availableHeight_kpi = Math.max(0.1, contentEndY_kpi - contentStartY_kpi);

      // Zone KPI centrée (plus besoin de layout 2/3 - 1/3)
      const kpiContainerWidth = availableWidth_kpi;
      const kpiContainerHeight = availableHeight_kpi - 0.2;
      const kpiContainerX = contentStartX_kpi;
      const kpiContainerY = contentStartY_kpi;
      const kpiStartX = kpiContainerX + 0.2;
      const kpiStartY = kpiContainerY + 0.15;

      // Fonction createKPI
      const createKPI = (kpiImage, posX, posY, kpiWidth, kpiHeight) => {
        const kpiBoxW = kpiWidth; 
        const kpiBoxH = kpiHeight;
        const kpiTitleH = 0.3; 
        const kpiImgH = kpiBoxH - kpiTitleH - 0.15;
        const kpiLabel = kpiImage?.label || kpiImage?.id || "KPI Inconnu"; 
        const kpiImageData = kpiImage?.image;
        
        slide.addShape(ppt.shapes.RECTANGLE, { 
            x: posX, 
            y: posY, 
            w: kpiBoxW, 
            h: kpiBoxH, 
            fill: { color: "FFFFFF" }, 
            line: { color: "DDDDDD" } 
        });
        
        slide.addShape(ppt.shapes.RECTANGLE, { 
            x: posX, 
            y: posY, 
            w: kpiBoxW, 
            h: kpiTitleH, 
            fill: { color: kpiImageData ? "00AEEF" : "6C757D" } 
        });
        
        slide.addText(kpiLabel, { 
            x: posX, 
            y: posY + 0.02, 
            w: kpiBoxW, 
            h: kpiTitleH, 
            align: "center", 
            fontSize: 8, 
            bold: true, 
            color: "FFFFFF" 
        });
        
        if (kpiImageData) { 
            slide.addImage({ 
                data: kpiImageData, 
                x: posX + 0.1, 
                y: posY + kpiTitleH + 0.1, 
                w: kpiBoxW - 0.2, 
                h: kpiImgH 
            }); 
        } else { 
            slide.addText("⚠️ Image N/D", { 
                x: posX + 0.1, 
                y: posY + kpiTitleH + 0.1, 
                w: kpiBoxW - 0.2, 
                h: kpiImgH, 
                align: "center", 
                valign: "middle", 
                fontSize: 8, 
                color: "FF0000", 
                bold: true 
            }); 
        }
      };

      // Disposition des KPIs centrée
      const kpiWidth = 1.6; 
      const kpiHeight = 1.2;
      const kpiMarginX = 0.1;
      const kpiMarginY = 0.1;

      // Calcul pour centrer les KPIs
      const totalKpiWidth = 3 * kpiWidth + 2 * kpiMarginX; // Largeur totale pour 3 KPIs
      const centerOffsetX = (kpiContainerWidth - totalKpiWidth) / 2;

      // Positions des 5 KPIs centrées
      const kpiPositions = [
          // Première ligne - 2 KPIs centrés
          { index: 0, x: kpiStartX + centerOffsetX + (kpiWidth + kpiMarginX) / 2, y: kpiStartY },
          { index: 1, x: kpiStartX + centerOffsetX + (kpiWidth + kpiMarginX) / 2 + kpiWidth + kpiMarginX, y: kpiStartY },
          
          // Deuxième ligne - 3 KPIs centrés
          { index: 2, x: kpiStartX + centerOffsetX, y: kpiStartY + kpiHeight + kpiMarginY },
          { index: 3, x: kpiStartX + centerOffsetX + kpiWidth + kpiMarginX, y: kpiStartY + kpiHeight + kpiMarginY },
          { index: 4, x: kpiStartX + centerOffsetX + 2 * (kpiWidth + kpiMarginX), y: kpiStartY + kpiHeight + kpiMarginY }
      ];

      // Créer chaque KPI en utilisant directement l'index dans le tableau kpiImages
      kpiPositions.forEach(pos => {
          const kpiData = kpiImages[pos.index];
          console.log(`Création KPI index ${pos.index}:`, kpiData ? kpiData.label || kpiData.id : "Non trouvé");
          
          // S'assurer que les coordonnées sont valides avant de créer
          if (typeof pos.x === 'number' && typeof pos.y === 'number' && !isNaN(pos.x) && !isNaN(pos.y)) {
              createKPI(kpiData, pos.x, pos.y, kpiWidth, kpiHeight);
          } else {
              console.error(`Coordonnées invalides pour KPI index ${pos.index}: x=${pos.x}, y=${pos.y}`);
          }
      });

  } else {
       console.log("Aucun KPI trouvé.");
  }

  // --- Génération des slides Graphiques standards (Centrage des images) ---
  if (standardGraphImages.length > 0) {
    console.log(`Génération de ${standardGraphImages.length} slides de graphiques standards.`);
    for (const item of standardGraphImages) {
        const graphLabel = item.label || item.id || "Graphique";
        console.log(`Traitement du graphique standard: ${graphLabel}, présence image: ${!!item.image}`);
        
        const slide = ppt.addSlide();
        if (contentBackgroundBase64) { 
            slide.background = { data: contentBackgroundBase64 }; 
        } else { 
            slide.background = { color: "FFFFFF" };
            console.warn("Fond de contenu non chargé, utilisation d'un fond blanc par défaut");
        }
        
        const titleY = 0.7;
        slide.addText(graphLabel, { x: 0.5, y: titleY, w: 9.0, h: 0.4, fontSize: 18, bold: true, color: "0B2F5A" });
        if (periodText) { slide.addText(periodText.split(': ')[1] || periodText, { x: 6.5, y: titleY + 0.1, w: 3, h: 0.25, fontSize: 9, color: "4B5563", align: "right" }); }
  
        // Zone de contenu centrée
        const contentStartY = titleY + 0.6; 
        const contentEndY = 5.2; 
        const contentStartX = 1.0; // Plus centré
        const contentEndX = 9.0;   // Plus centré
        const availableWidth = Math.max(0.1, contentEndX - contentStartX); 
        const availableHeight = Math.max(0.1, contentEndY - contentStartY);
  
        // Image centrée (pas de layout 2/3 - 1/3)
        const imageWidth = availableWidth - 0.4; // Marge de chaque côté
        const imageHeight = availableHeight - 0.2;
        const imageX = contentStartX + 0.2; // Centré avec marge
        const imageY = contentStartY + 0.1;
  
        // Image centrée
        if (item.image) { 
            slide.addImage({ 
                data: item.image, 
                x: imageX, 
                y: imageY, 
                w: imageWidth, 
                h: imageHeight 
            }); 
        } else { 
            slide.addText("⚠️ Image N/D", { 
                x: imageX, 
                y: imageY + imageHeight/2 - 0.2, 
                w: imageWidth, 
                h: 0.4,
                align: "center",
                valign: "middle",
                color: "FF0000",
                bold: true,
                fontSize: 12
            }); 
        }
    }
  } else {
    console.log("Aucun graphique standard trouvé.");
  }

    // --- Fonction pour générer un slide de tableau (avec centrage) ---
  function generateTableSlide(ppt, item, contentBackgroundBase64, periodText) {
    const tableLabel = item.label || item.id || "Tableau";
    console.log(`Traitement du tableau: ${tableLabel}, présence image: ${!!item.image}`);
    
    const slide = ppt.addSlide();
    if (contentBackgroundBase64) { 
        slide.background = { data: contentBackgroundBase64 }; 
    } else { 
        slide.background = { color: "FFFFFF" };
        console.warn("Fond de contenu non chargé, utilisation d'un fond blanc par défaut");
    }
    
    const titleY = 0.7; 
    slide.addText(tableLabel, { x: 0.5, y: titleY, w: 9.0, h: 0.4, fontSize: 18, bold: true, color: "0B2F5A" });
    if (periodText) { 
        slide.addText(periodText.split(': ')[1] || periodText, { x: 6.5, y: titleY + 0.1, w: 3, h: 0.25, fontSize: 9, color: "4B5563", align: "right" }); 
    }

    // Zone de contenu centrée
    const contentStartY = titleY + 0.6; 
    const contentEndY = 4.8; // Laisser plus d'espace pour les notes
    const contentStartX = 0.8; // Plus centré
    const contentEndX = 9.2;   // Plus centré
    const availableWidth = Math.max(0.1, contentEndX - contentStartX);
    const availableHeight = Math.max(0.1, contentEndY - contentStartY);
    
    // Image de tableau centrée
    const tableContainerX = contentStartX;
    const tableContainerY = contentStartY;
    const tableContainerW = availableWidth;
    const tableContainerH = availableHeight;

    // Image (tableau) centrée
    if (item.image) {
        const imgPadding = 0.1;
        slide.addImage({ 
            data: item.image, 
            x: tableContainerX + imgPadding, 
            y: tableContainerY + imgPadding, 
            w: tableContainerW - (2*imgPadding), 
            h: tableContainerH - (2*imgPadding) 
        });
    } else { 
        slide.addText("⚠️ Image N/D", { 
            x: tableContainerX, 
            y: tableContainerY + tableContainerH/2 - 0.2, 
            w: tableContainerW, 
            h: 0.4,
            align: "center",
            valign: "middle",
            color: "FF0000",
            bold: true,
            fontSize: 12
        }); 
    }

    
    
    return slide;
  }
  
    function addSpecialNote(slide, x, y, width, title, content, bgColor, borderColor, textColor) {
    const noteHeight = 0.4;
    
    // Vérifier si l'espace est suffisant (y+height ne dépasse pas 5.3)
    if (y + noteHeight <= 5.3) {
        slide.addShape(ppt.shapes.RECTANGLE, { 
            x: x, 
            y: y, 
            w: width, 
            h: noteHeight, 
            fill: { color: bgColor }, 
            line: { color: borderColor, width: 1 },
            shadow: { type: "outer", blur: 1, offset: 0, angle: 45, color: "E8E8E8" }
        });
        
        slide.addText([
            { text: "⚠️ ", options: { fontSize: 12 } },
            { text: title + " : ", options: { fontSize: 10, color: textColor, bold: true } },
            { text: content, options: { fontSize: 10, color: textColor } }
        ], { 
            x: x + 0.15, 
            y: y + 0.05, 
            w: width - 0.3, 
            h: noteHeight - 0.1,
            valign: "middle"
        });
        
        console.log("Note spéciale ajoutée");
    } else {
        console.warn("Espace insuffisant pour ajouter la note spéciale");
    }
  }

    
  // --- Générer le slide du tableau "Tickets en cours - Plus de 2 semaines" s'il existe ---
  if (ticketsAnciensImage.found) {
    console.log("Génération du slide pour le tableau des tickets anciens");
    generateTableSlide(ppt, ticketsAnciensImage.data, contentBackgroundBase64, periodText);
  }
  
  // --- Ajout du slide de titre pour les réentrants (si nécessaire) ---
  if (reentrantImages.length > 0 || reiterationTableImage.found) {
  // --- Slide de titre: KPIs Opérationnels
  const slideKpiTitle = ppt.addSlide();
  if (titleSlideBase64) {
    slideKpiTitle.background = { data: titleSlideBase64 };
  } else {
    slideKpiTitle.background = { color: "2C5C8A" };
  }

  // Cercle avec numéro 1
  slideKpiTitle.addShape(ppt.ShapeType.ellipse, {
    x: 1.5, y: 2.6, w: 0.6, h: 0.6,
    fill: { color: "FFFFFF" },
    line: { color: "FFFFFF" }
  });
  slideKpiTitle.addText("2", {
    x: 1.5, y: 2.6, w: 0.6, h: 0.6,
    align: "center", valign: "middle",
    fontSize: 20, bold: true, color: "0B2F5A"
  });

  // Titre blanc centré
  slideKpiTitle.addText("TT Réentrants​​", {
    x: 2.2, y: 2.4, w: 7, h: 1,
    fontSize: 40, bold: true, color: "FFFFFF"
  });

  }
  
  // --- Génération des slides pour les graphiques Réentrants (avec centrage) ---
  if (reentrantImages.length > 0) {
    console.log(`Génération de ${reentrantImages.length} slides de graphiques réentrants.`);
    for (const item of reentrantImages) {
      const graphLabel = item.label || item.id || "Graphique Réentrants";
      console.log(`Traitement du graphique réentrant: ${graphLabel}, présence image: ${!!item.image}`);
      
      const slide = ppt.addSlide();
      if (contentBackgroundBase64) { 
          slide.background = { data: contentBackgroundBase64 }; 
      } else { 
          slide.background = { color: "FFFFFF" };
          console.warn("Fond de contenu non chargé, utilisation d'un fond blanc par défaut");
      }
      
      const titleY = 0.7;
      slide.addText(graphLabel, { x: 0.5, y: titleY, w: 9.0, h: 0.4, fontSize: 18, bold: true, color: "0B2F5A" });
      if (periodText) { slide.addText(periodText.split(': ')[1] || periodText, { x: 6.5, y: titleY + 0.1, w: 3, h: 0.25, fontSize: 9, color: "4B5563", align: "right" }); }

      // Zone de contenu centrée
      const contentStartY = titleY + 0.6; 
      const contentEndY = 5.2; 
      const contentStartX = 1.0; // Plus centré
      const contentEndX = 9.0;   // Plus centré
      const availableWidth = Math.max(0.1, contentEndX - contentStartX); 
      const availableHeight = Math.max(0.1, contentEndY - contentStartY);

      // Image centrée (pas de layout 2/3 - 1/3)
      const imageWidth = availableWidth - 0.4; // Marge de chaque côté
      const imageHeight = availableHeight - 0.2;
      const imageX = contentStartX + 0.2; // Centré avec marge
      const imageY = contentStartY + 0.1;

      // Image centrée
      if (item.image) { 
          slide.addImage({ 
              data: item.image, 
              x: imageX, 
              y: imageY, 
              w: imageWidth, 
              h: imageHeight 
          }); 
      } else { 
          slide.addText("⚠️ Image N/D", { 
              x: imageX, 
              y: imageY + imageHeight/2 - 0.2, 
              w: imageWidth, 
              h: 0.4,
              align: "center",
              valign: "middle",
              color: "FF0000",
              bold: true,
              fontSize: 12
          }); 
      }
    }
  } else {
    console.log("Aucun graphique réentrants trouvé.");
  }
  
  // --- Génération du slide pour le tableau de réitérations (comme dernier slide de la section réentrants) ---
  if (reiterationTableImage.found) {
    console.log("Génération du slide pour le tableau des réitérations des tickets");
    generateTableSlide(ppt, reiterationTableImage.data, contentBackgroundBase64, periodText);
  }
  
  // --- Slide – Synthèse ---
  const slideTransverseTitle = ppt.addSlide();
  if (titleSlideBase64) {
    slideTransverseTitle.background = { data: titleSlideBase64 };
  } else {
    slideTransverseTitle.background = { color: "2C5C8A" };
  }

  // Cercle avec numéro 3
  slideTransverseTitle.addShape(ppt.ShapeType.ellipse, {
    x: 1.5, y: 2.6, w: 0.6, h: 0.6,
    fill: { color: "FFFFFF" },
    line: { color: "FFFFFF" }
  });
  slideTransverseTitle.addText("3", {
    x: 1.5, y: 2.6, w: 0.6, h: 0.6,
    align: "center", valign: "middle",
    fontSize: 20, bold: true, color: "0B2F5A"
  });

  // Titre blanc centré
  slideTransverseTitle.addText("Synthèse", {
    x: 2.2, y: 2.4, w: 7, h: 1,
    fontSize: 40, bold: true, color: "FFFFFF"
  });

    // Slide 7 – Météo & Humeur Générale
    const moodSlide = ppt.addSlide();
    moodSlide.addImage({ path: contentBackgroundUrl, x: 0, y: 0, w: "100%", h: "100%" });
  
    moodSlide.addText("Météo & Humeur Générale", {
      x: 0.6, y: 0.7, w: 8, h: 0.4, fontSize: 20, bold: true, color: "#0B2F5A"
    });
  
    const moodBlocks = [
      { title: "Météo Delivery", icons: ["☀", "🌥", "⚡"], colors: ["#facc15", "#9ca3af", "#ef4444"] },
      { title: "Mood Équipe", icons: ["🙂", "😐", "🙁"], colors: ["#10b981", "#fbbf24", "#ef4444"] },
      { title: "Mood SFR", icons: ["🙂", "😐", "🙁"], colors: ["#10b981", "#fbbf24", "#ef4444"] }
    ];
  
    const blockW = 2.8;
    const blockH = 1.6;
    const blockSpacing = 0.25;
    const moodTotalWidth = moodBlocks.length * blockW + (moodBlocks.length - 1) * blockSpacing;
    const moodStartX = (10 - moodTotalWidth) / 2;
    const blockY = 2.4;
  
    moodBlocks.forEach((block, i) => {
      const x = moodStartX + i * (blockW + blockSpacing);
  
      moodSlide.addShape(ppt.ShapeType.rect, { x, y: blockY, w: blockW, h: 0.35, fill: { color: "#2563eb" } });
      moodSlide.addText(block.title, {
        x: x + 0.1, y: blockY + 0.05, w: blockW - 0.2, h: 0.3,
        fontSize: 11, bold: true, color: "#ffffff", align: "center"
      });
  
      const emojiY = blockY + 0.4;
      const cellW = blockW / 3;
      const cellH = 1.1;
  
      for (let j = 0; j < 3; j++) {
        moodSlide.addShape(ppt.ShapeType.rect, {
          x: x + j * cellW, y: emojiY, w: cellW, h: cellH,
          fill: { color: "#ffffff" }, line: { color: "#cbd5e1", width: 1 }
        });
  
        moodSlide.addText(block.icons[j], {
          x: x + j * cellW, y: emojiY + 0.2, w: cellW, h: 0.7,
          align: "center", fontSize: 24, bold: true, color: block.colors[j]
        });
      }
  
      moodSlide.addShape(ppt.ShapeType.rect, {
        x: x, y: emojiY, w: cellW, h: cellH,
        line: { color: "#2563eb", width: 2 },
        fill: { color: "FFFFFF", transparency: 100 }
      });
    });

// --- Slide – Synthèse avec cartes ---
const synthese = ppt.addSlide();
if (contentBackgroundBase64) {
  synthese.background = { data: contentBackgroundBase64 };
} else {
  synthese.background = { color: "FFFFFF" };
}

// Titre du slide
synthese.addText("Synthèse opérationnelle", { 
  x: 0.6, y: 0.7, w: 8, h: 0.4, 
  fontSize: 20, bold: true, color: "0B2F5A" 
});

// Dimensions et position des cartes
const cardW = 3.8;
const cardH = 1.7; // Hauteur réduite
const headerH = 0.4;
const spacingX = 0.4;
const spacingY = 0.3;
const startX = (10 - (2 * cardW + spacingX)) / 2;
const startY = 1.3;

const cards = [
  { title: "Faits marquants", color: "#ef4444" },
  { title: "Activité", color: "#fbbf24" },
  { title: "Amélioration continue", color: "#facc15" },
  { title: "Points d'attention", color: "#10b981" }
];

cards.forEach((card, i) => {
  const row = Math.floor(i / 2);
  const col = i % 2;
  const x = startX + col * (cardW + spacingX);
  const y = startY + row * (cardH + spacingY);

  // Carte principale
  synthese.addShape(ppt.shapes.RECTANGLE, { 
    x, y, w: cardW, h: cardH, 
    fill: { color: "#ffffff" }, 
    line: { color: card.color, width: 2 } 
  });

  // En-tête colorée
  synthese.addShape(ppt.shapes.RECTANGLE, { 
    x, y, w: cardW, h: headerH, 
    fill: { color: card.color } 
  });

  // Titre de l'en-tête
  synthese.addText(card.title, { 
    x: x + 0.1, y: y + 0.05, w: cardW - 0.2, h: 0.3, 
    fontSize: 12, bold: true, color: "#ffffff", align: "center" 
  });

  // Contenu de la carte (réduit à 2 lignes max)
  const bullets = Array(2).fill("• Saisissez votre point").join("\n\n");
  synthese.addText(bullets, { 
    x: x + 0.2, y: y + headerH + 0.15, w: cardW - 0.4, h: cardH - headerH - 0.3, 
    fontSize: 10.5, color: "#1f2937" 
  });
});

// --- Slide de fin avec logo ---
  console.log("Génération du slide de fin avec l'image fin.png");
  const finalSlide = ppt.addSlide();
  
  // Fallback: fond bleu dégradé au cas où l'image ne se charge pas
  finalSlide.background = { 
    color: "4B93CB",
    gradient: {
      type: "linear", 
      angle: 315,
      stops: [
        { position: 0, color: "4B93CB" },
        { position: 100, color: "2C5C8A" }
      ]
    }
  };
  
  // Si l'image finale est chargée, l'utiliser comme fond
  if (finalImageBase64) {
    finalSlide.background = { data: finalImageBase64 };
    console.log("Image de fond du slide final appliquée.");
  } else {
    
    // Ajouter le texte directement sur le fond bleu en cas d'échec
    finalSlide.addText("INTELCIA IT SOLUTIONS", { 
      x: 0, 
      y: 2.2, 
      w: "100%", 
      h: 0.8, 
      align: "center", 
      fontSize: 36, 
      bold: true, 
      color: "FFFFFF" 
    });
    
    finalSlide.addText("Everything you need from I to T", { 
      x: 0, 
      y: 3.2, 
      w: "100%", 
      h: 0.6, 
      align: "center", 
      fontSize: 20, 
      color: "FFFFFF" 
    });
  }
  
  // --- Génération finale du fichier PPTX ---
  const fileName = `compte_rendu_HISPEED_${todayStr}.pptx`;
  try {
    console.log(`Tentative de génération du fichier: ${fileName}`);
    await ppt.writeFile({ fileName: fileName });
    console.log(`Fichier PPTX "${fileName}" généré avec succès.`);
  } catch (error) {
    console.error(`Erreur lors de la génération du fichier PPTX "${fileName}":`, error);
    alert(`Erreur lors de la génération du PowerPoint: ${error.message || error}.`);
  }
}