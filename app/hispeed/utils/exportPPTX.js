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

  let introBackgroundBase64 = null;
  let contentBackgroundBase64 = null;
  let finalImageBase64 = null;

  try {
      console.log(`Tentative de préchargement: ${introBackgroundUrl}, ${contentBackgroundUrl}, ${finalImageUrl}`);
      [introBackgroundBase64, contentBackgroundBase64, finalImageBase64] = await Promise.all([
          preloadImageAsBase64(introBackgroundUrl),
          preloadImageAsBase64(contentBackgroundUrl),
          preloadImageAsBase64(finalImageUrl)
      ]);
      console.log(`Résultat préchargement. Fond Intro: ${!!introBackgroundBase64}, Fond Contenu: ${!!contentBackgroundBase64}, Image Finale: ${!!finalImageBase64}`);
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

  // --- Catégorisation des Images - APPROCHE INSPIRÉE DU CODE WORD ---
  
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

  // Extraction des images KPI avec la même approche que le code Word
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

  // Extraction des images graphiques qui ne font pas partie des KPI fixes
  const graphImages = imageList.filter(item => {
    const currentLabel = (item.label != null ? item.label : item.id || "");
    return !normalizedFixedLabels.includes(currentLabel.trim().toLowerCase());
  });

  console.log("Images non-KPI:", graphImages.length);

  // Identification des tableaux spécifiques
  const tableImages = [];
  const standardGraphImages = [];

  // Tableaux spécifiques à rechercher
  const tableIds = ["Détail des Réitérations des Tickets", "Tickets en cours - Plus de 2 semaines"];

  // Parcourir toutes les images graphiques et les classer
  graphImages.forEach(img => {
    const imgId = img.id || "";
    const imgLabel = img.label || "";
    
    // Vérifier si c'est un tableau
    let isTable = false;
    
    for (const tableId of tableIds) {
      if (imgId.includes(tableId) || imgLabel.includes(tableId) ||
          tableId.includes(imgId) || tableId.includes(imgLabel)) {
        isTable = true;
        break;
      }
    }
    
    // Ajout dans la catégorie appropriée
    if (isTable) {
      tableImages.push(img);
    } else {
      standardGraphImages.push(img);
    }
  });

  console.log("Tableaux:", tableImages.map(img => img.label || img.id));
  console.log("Graphiques standards:", standardGraphImages.length);

  // Vérification spécifique pour les éléments problématiques
  const missingGraphId = "Tickets Entrants/Sortants";
  const missingTableId = "Tickets en cours - Plus de 2 semaines";

  // Recherche explicite dans toutes les images
  const missingGraph = imageList.find(img => 
    (img.id || "").includes(missingGraphId) || 
    (img.label || "").includes(missingGraphId)
  );

  const missingTable = imageList.find(img => 
    (img.id || "").includes(missingTableId) || 
    (img.label || "").includes(missingTableId)
  );

  console.log("Recherche éléments manquants:", {
    missingGraphFound: !!missingGraph, 
    missingTableFound: !!missingTable,
    missingGraphDetails: missingGraph ? { id: missingGraph.id, label: missingGraph.label } : "Non trouvé",
    missingTableDetails: missingTable ? { id: missingTable.id, label: missingTable.label } : "Non trouvé"
  });

  // Ajouter manuellement aux listes appropriées s'ils sont trouvés
  if (missingGraph && !standardGraphImages.includes(missingGraph)) {
    console.log("Ajout manuel du graphique manquant");
    standardGraphImages.push(missingGraph);
  }

  if (missingTable && !tableImages.includes(missingTable)) {
    console.log("Ajout manuel du tableau manquant");
    tableImages.push(missingTable);
  }

  console.log(`Catégorisation finale: KPIs=${kpiImages.length}, Tableaux=${tableImages.length}, Graphiques=${standardGraphImages.length}`);

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
      slide.addText("KPI - Key Performance Indicators", { x: 0.5, y: titleY_kpi, w: 9.0, h: 0.4, fontSize: 18, bold: true, color: "0B2F5A" });
      
      if (periodText) { 
          slide.addText(periodText.split(': ')[1] || periodText, { x: 6.5, y: titleY_kpi + 0.1, w: 3, h: 0.25, fontSize: 9, color: "4B5563", align: "right" }); 
      }

      // Zone de contenu
      const contentStartY_kpi = titleY_kpi + 0.6; 
      const contentEndY_kpi = 5.2;
      const contentStartX_kpi = 0.3; 
      const contentEndX_kpi = 9.7;
      const availableWidth_kpi = Math.max(0.1, contentEndX_kpi - contentStartX_kpi);
      const availableHeight_kpi = Math.max(0.1, contentEndY_kpi - contentStartY_kpi);

      // Layout 2/3 - 1/3
      const kpiContainerWidth = (availableWidth_kpi * 2 / 3) - 0.3;
      const kpiContainerHeight = availableHeight_kpi - 0.2;
      const kpiContainerX = contentStartX_kpi;
      const kpiContainerY = contentStartY_kpi;
      const commentWidth = (availableWidth_kpi * 1 / 3) - 0.2;
      const commentHeight = kpiContainerHeight;
      const commentX = kpiContainerX + kpiContainerWidth + 0.2;
      const commentY = contentStartY_kpi;
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

      // Disposition des KPIs
      const kpiWidth = 1.6; 
      const kpiHeight = 1.2;
      const kpiMarginX = 0.08; // Marge horizontale réduite
      const kpiMarginY = 0.1;  // Marge verticale

      // Positions des 5 KPIs 
      // 2 KPIs sur la première ligne, 3 KPIs sur la deuxième (avec le 5ème à droite)
      const kpiPositions = [
          // Première ligne - 2 KPIs
          { index: 0, x: kpiStartX, y: kpiStartY },
          { index: 1, x: kpiStartX + kpiWidth + kpiMarginX, y: kpiStartY },
          
          // Deuxième ligne - 3 KPIs
          { index: 2, x: kpiStartX, y: kpiStartY + kpiHeight + kpiMarginY },
          { index: 3, x: kpiStartX + kpiWidth + kpiMarginX, y: kpiStartY + kpiHeight + kpiMarginY },
          { index: 4, x: kpiStartX + 2 * (kpiWidth + kpiMarginX), y: kpiStartY + kpiHeight + kpiMarginY }
      ];

      // Vérifier si la largeur est suffisante
      const thirdColumnX = kpiStartX + 2 * (kpiWidth + kpiMarginX);
      const thirdColumnRightEdge = thirdColumnX + kpiWidth;
      if (thirdColumnRightEdge > kpiContainerX + kpiContainerWidth) {
          console.warn(`La disposition des KPIs pourrait dépasser le conteneur horizontalement: ${thirdColumnRightEdge.toFixed(2)} > ${(kpiContainerX + kpiContainerWidth).toFixed(2)}`);
      }

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

      // Zone Commentaire AMÉLIORÉE
      slide.addShape(ppt.shapes.RECTANGLE, { 
          x: commentX, y: commentY, w: commentWidth, h: commentHeight, 
          fill: { color: "FFFFFF" }, 
          line: { color: "DDEEFF", width: 1 },
          shadow: { type: "outer", blur: 1, offset: 1, angle: 45, color: "E0E0E0" }
      });
      
      // En-tête du commentaire
      slide.addShape(ppt.shapes.RECTANGLE, {
          x: commentX, y: commentY, w: commentWidth, h: 0.4,
          fill: { color: "F0F5FF" },
          line: { color: "DDEEFF", width: 1 }
      });
      
      slide.addText("💬 Analyse & Commentaires", { 
          x: commentX + 0.1, y: commentY + 0.05, w: commentWidth - 0.2, h: 0.3, 
          fontSize: 14, bold: true, color: "0B2F5A", align: "center" 
      });
      
      // Contenu du commentaire avec meilleure structure
      slide.addText([
          { text: "Observations clés:", options: { fontSize: 11, color: "0B2F5A", bold: true, breakLine: true } },
          { text: "• ", options: { fontSize: 11, color: "4B5563"} }, 
          { text: "...", options: { fontSize: 11, color: "9CA3AF" } }, 
          { text: "", options: {breakLine: true} },
          { text: "• ", options: { fontSize: 11, color: "4B5563"} }, 
          { text: "...", options: { fontSize: 11, color: "9CA3AF" } }, 
          { text: "", options: {breakLine: true, paraSpaceAfter: 5} },
                    
          { text: "Points d'action:", options: { fontSize: 11, color: "0B2F5A", bold: true, breakLine: true } },
          { text: "• ", options: { fontSize: 11, color: "4B5563"} }, 
          { text: "...", options: { fontSize: 11, color: "9CA3AF" } }
      ], { 
          x: commentX + 0.2, 
          y: commentY + 0.5, 
          w: commentWidth - 0.4, 
          h: commentHeight - 0.7,
          valign: "top"
      });
  } else {
       console.log("Aucun KPI trouvé.");
  }

// --- Génération des slides Graphiques (Fond statique + Contenu) ---
if (standardGraphImages.length > 0) {
    console.log(`Génération de ${standardGraphImages.length} slides de graphiques.`);
    for (const item of standardGraphImages) {
        const graphLabel = item.label || item.id || "Graphique";
        console.log(`Traitement du graphique: ${graphLabel}, présence image: ${!!item.image}`);
        
        const slide = ppt.addSlide();
        if (contentBackgroundBase64) { 
            slide.background = { data: contentBackgroundBase64 }; 
        } else { 
            slide.background = { color: "FFFFFF" };
            console.warn("Fond de contenu non chargé, utilisation d'un fond blanc par défaut");
        }
        
        const titleY = 0.7; // Titre descendu
        slide.addText(graphLabel, { x: 0.5, y: titleY, w: 9.0, h: 0.4, fontSize: 18, bold: true, color: "0B2F5A" });
        if (periodText) { slide.addText(periodText.split(': ')[1] || periodText, { x: 6.5, y: titleY + 0.1, w: 3, h: 0.25, fontSize: 9, color: "4B5563", align: "right" }); }
  
        // Zone de contenu
        const contentStartY = titleY + 0.6; 
        const contentEndY = 5.2; 
        const contentStartX = 0.3; 
        const contentEndX = 9.7;
        const availableWidth = Math.max(0.1, contentEndX - contentStartX); 
        const availableHeight = Math.max(0.1, contentEndY - contentStartY);
  
        // Layout 2/3 - 1/3
        const imageWidth = (availableWidth * 2 / 3) - 0.3; 
        const imageHeight = availableHeight - 0.2;
        const imageX = contentStartX; 
        const imageY = contentStartY;
        const commentWidth = (availableWidth * 1 / 3) - 0.2; 
        const commentHeight = imageHeight;
        const commentX = imageX + imageWidth + 0.2; 
        const commentY = contentStartY;
  
        // Image
        if (item.image) { 
            slide.addImage({ 
                data: item.image, 
                x: imageX + 0.1, 
                y: imageY + 0.1, 
                w: imageWidth - 0.2, 
                h: imageHeight - 0.2 
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
  
        // Commentaire AMÉLIORÉ
        slide.addShape(ppt.shapes.RECTANGLE, { 
            x: commentX, y: commentY, w: commentWidth, h: commentHeight, 
            fill: { color: "FFFFFF" }, 
            line: { color: "DDEEFF", width: 1 },
            shadow: { type: "outer", blur: 1, offset: 1, angle: 45, color: "E0E0E0" }
        });
        
        // En-tête du commentaire
        slide.addShape(ppt.shapes.RECTANGLE, {
            x: commentX, y: commentY, w: commentWidth, h: 0.4,
            fill: { color: "F0F5FF" },
            line: { color: "DDEEFF", width: 1 }
        });
        
        slide.addText("💬 Analyse & Commentaires", { 
            x: commentX + 0.1, y: commentY + 0.05, w: commentWidth - 0.2, h: 0.3, 
            fontSize: 14, bold: true, color: "0B2F5A", align: "center" 
        });
        
        // Contenu du commentaire avec meilleure structure
        slide.addText([
            { text: "Observations clés:", options: { fontSize: 11, color: "0B2F5A", bold: true, breakLine: true } },
            { text: "• ", options: { fontSize: 11, color: "4B5563"} }, 
            { text: "...", options: { fontSize: 11, color: "9CA3AF" } }, 
            { text: "", options: {breakLine: true} },
            { text: "• ", options: { fontSize: 11, color: "4B5563"} }, 
            { text: "...", options: { fontSize: 11, color: "9CA3AF" } }, 
            { text: "", options: {breakLine: true, paraSpaceAfter: 5} },

            { text: "Points d'action:", options: { fontSize: 11, color: "0B2F5A", bold: true, breakLine: true } },
            { text: "• ", options: { fontSize: 11, color: "4B5563"} }, 
            { text: "...", options: { fontSize: 11, color: "9CA3AF" } }
        ], { 
            x: commentX + 0.2, 
            y: commentY + 0.5, 
            w: commentWidth - 0.4, 
            h: commentHeight - 0.7,
            valign: "top"
        });
    }
  } else {
    console.log("Aucun graphique standard trouvé.");
  }
  
  
  // --- Génération des slides Tableaux (Fond statique + Contenu + COMMENTAIRE) ---
  if (tableImages.length > 0) {
    console.log(`Génération de ${tableImages.length} slides de tableaux.`);
    for (const item of tableImages) {
        const tableLabel = item.label || item.id || "Tableau";
        console.log(`Traitement du tableau: ${tableLabel}, présence image: ${!!item.image}`);
        
        const slide = ppt.addSlide();
        if (contentBackgroundBase64) { 
            slide.background = { data: contentBackgroundBase64 }; 
        } else { 
            slide.background = { color: "FFFFFF" };
            console.warn("Fond de contenu non chargé, utilisation d'un fond blanc par défaut");
        }
        
        const titleY = 0.7; // Titre descendu
        slide.addText(tableLabel, { x: 0.5, y: titleY, w: 9.0, h: 0.4, fontSize: 18, bold: true, color: "0B2F5A" });
        if (periodText) { slide.addText(periodText.split(': ')[1] || periodText, { x: 6.5, y: titleY + 0.1, w: 3, h: 0.25, fontSize: 9, color: "4B5563", align: "right" }); }
  
        // Zone de contenu
        const contentStartY = titleY + 0.6; 
        const contentEndY = 5.2;
        const contentStartX = 0.3; 
        const contentEndX = 9.7;
        const availableWidth = Math.max(0.1, contentEndX - contentStartX);
        const availableHeight = Math.max(0.1, contentEndY - contentStartY);
  
        // Définir hauteur pour l'image et pour le commentaire
        const commentBoxHeight_table = 1.5; // Hauteur de la boîte commentaire
        const tableImageHeight = availableHeight - commentBoxHeight_table - 0.3; // Hauteur restante pour l'image + marge
  
        if (tableImageHeight < 1.0) { // Vérifier si l'espace est suffisant
            console.warn(`Espace vertical insuffisant pour l'image du tableau ${tableLabel} et le commentaire.`);
        }
  
        // Position de l'image (tableau)
        const tableContainerX = contentStartX + 0.2;
        const tableContainerY = contentStartY;
        const tableContainerW = availableWidth - 0.4;
        const tableContainerH = Math.max(0.5, tableImageHeight); // S'assurer d'une hauteur min
  
        // Image (tableau)
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
  
        // SECTION COMMENTAIRE AMÉLIORÉE POUR TABLEAUX
        const commentBoxY_table = tableContainerY + tableContainerH + 0.15; // Positionner sous l'image avec marge
        const commentBoxX_table = tableContainerX;
        const commentBoxW_table = tableContainerW;
  
        // Conteneur principal avec ombre
        slide.addShape(ppt.shapes.RECTANGLE, { 
            x: commentBoxX_table, 
            y: commentBoxY_table, 
            w: commentBoxW_table, 
            h: commentBoxHeight_table, 
            fill: { color: "FFFFFF" }, 
            line: { color: "DDEEFF", width: 1 },
            shadow: { type: "outer", blur: 1, offset: 1, angle: 45, color: "E0E0E0" }
        });
        
        // En-tête du commentaire
        slide.addShape(ppt.shapes.RECTANGLE, {
            x: commentBoxX_table, 
            y: commentBoxY_table, 
            w: commentBoxW_table, 
            h: 0.4,
            fill: { color: "F0F5FF" },
            line: { color: "DDEEFF", width: 1 }
        });
        
        slide.addText("💬 Analyse Détaillée", { 
            x: commentBoxX_table + 0.1, 
            y: commentBoxY_table + 0.05, 
            w: commentBoxW_table - 0.2, 
            h: 0.3, 
            fontSize: 14, 
            bold: true, 
            color: "0B2F5A", 
            align: "center" 
        });
        
        // Contenu du commentaire structuré en colonnes
        const colWidth = (commentBoxW_table - 0.6) / 2; // Largeur de chaque colonne
        const col1X = commentBoxX_table + 0.2;
        const col2X = col1X + colWidth + 0.2;
        const contentY = commentBoxY_table + 0.5;
        const contentH = commentBoxHeight_table - 0.7;
        
        // Colonne 1: Analyse
        slide.addText([
            { text: "Observations clés:", options: { fontSize: 11, color: "0B2F5A", bold: true, breakLine: true } },
            { text: "• ", options: { fontSize: 11, color: "4B5563"} }, 
            { text: "...", options: { fontSize: 11, color: "9CA3AF" } },
            { text: "", options: {breakLine: true} },
            { text: "• ", options: { fontSize: 11, color: "4B5563"} }, 
            { text: "...", options: { fontSize: 11, color: "9CA3AF" } },
            { text: "", options: {breakLine: true} },
        ], { 
            x: col1X, 
            y: contentY, 
            w: colWidth, 
            h: contentH,
            valign: "top"
        });
        
        // Colonne 2: Recommandations
        slide.addText([
            { text: "Points d'action:", options: { fontSize: 11, color: "0B2F5A", bold: true, breakLine: true } },
            { text: "• ", options: { fontSize: 11, color: "4B5563"} }, 
            { text: "...", options: { fontSize: 11, color: "9CA3AF" } },
            { text: "", options: {breakLine: true} },
            { text: "• ", options: { fontSize: 11, color: "4B5563"} }, 
            { text: "...", options: { fontSize: 11, color: "9CA3AF" } },
        ], { 
            x: col2X, 
            y: contentY, 
            w: colWidth, 
            h: contentH,
            valign: "top"
        });
        
        // Notes spéciales selon le type de tableau
        const lowerLabel = tableLabel.toLowerCase();
        
        // Section spéciale pour le tableau des réentrants
        if (lowerLabel.includes("réitérations") || lowerLabel.includes("reentrant")) {
            // Ajouter une note supplémentaire en bas du slide pour le tableau des réentrants
            const noteY = commentBoxY_table + commentBoxHeight_table + 0.2;
            const noteHeight = 0.4;
            
            // Vérifier si l'espace est suffisant
            if (noteY + noteHeight <= contentEndY) {
                slide.addShape(ppt.shapes.RECTANGLE, { 
                    x: tableContainerX, 
                    y: noteY, 
                    w: tableContainerW, 
                    h: noteHeight, 
                    fill: { color: "FFFBF0" }, 
                    line: { color: "F0E0B0", width: 1 },
                    shadow: { type: "outer", blur: 1, offset: 0, angle: 45, color: "E8E8E8" }
                });
                
                slide.addText([
                    { text: "⚠️ ", options: { fontSize: 12 } },
                    { text: "Note sur les réentrants : ", options: { fontSize: 10, color: "7D5700", bold: true } },
                    { text: "Ce tableau indique les tickets qui ont été réouverts, suggérant des problèmes récurrents ou non résolus. Une attention particulière doit être portée à ces cas pour améliorer la qualité du service.", options: { fontSize: 10, color: "7D5700" } }
                ], { 
                    x: tableContainerX + 0.15, 
                    y: noteY + 0.05, 
                    w: tableContainerW - 0.3, 
                    h: noteHeight - 0.1,
                    valign: "middle"
                });
                
                console.log("Note sur les réentrants ajoutée");
            } else {
                console.warn("Espace insuffisant pour ajouter la note spéciale sur les réentrants");
            }
        }
        
        // Ajouter une note spéciale pour les tickets de plus de 2 semaines
        if (lowerLabel.includes("plus de 2 semaines") || lowerLabel.includes("2 semaines") || lowerLabel.includes("+14j")) {
            const noteY = commentBoxY_table + commentBoxHeight_table + 0.2;
            const noteHeight = 0.4;
            
            // Vérifier si l'espace est suffisant
            if (noteY + noteHeight <= contentEndY) {
                slide.addShape(ppt.shapes.RECTANGLE, { 
                    x: tableContainerX, 
                    y: noteY, 
                    w: tableContainerW, 
                    h: noteHeight, 
                    fill: { color: "FFF0F0" }, 
                    line: { color: "FFB0B0", width: 1 },
                    shadow: { type: "outer", blur: 1, offset: 0, angle: 45, color: "E8E8E8" }
                });
                
                slide.addText([
                    { text: "⚠️ ", options: { fontSize: 12 } },
                    { text: "Attention tickets anciens : ", options: { fontSize: 10, color: "8B0000", bold: true } },
                    { text: "Les tickets de plus de 2 semaines nécessitent une attention urgente et une action prioritaire pour éviter l'impact sur les SLA et la satisfaction client.", options: { fontSize: 10, color: "8B0000" } }
                ], { 
                    x: tableContainerX + 0.15, 
                    y: noteY + 0.05, 
                    w: tableContainerW - 0.3, 
                    h: noteHeight - 0.1,
                    valign: "middle"
                });
                
                console.log("Note sur les tickets anciens ajoutée");
            } else {
                console.warn("Espace insuffisant pour ajouter la note spéciale sur les tickets anciens");
            }
        }
    }
  } else {
    console.log("Aucun tableau trouvé.");
  }
  
  // --- Slide de fin avec logo Intelcia ---
  console.log("Génération du slide de fin avec l'image fin.png");
  const finalSlide = ppt.addSlide();
  
  // Appliquer une couleur de fond bleu dégradé (similaire à l'image partagée)
  // Au cas où l'image ne se charge pas correctement
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
    console.error("!!! ÉCHEC du chargement de l'image de fond finale !!!");
    
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
// --- Fin de la fonction ---