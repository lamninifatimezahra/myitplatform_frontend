import pptxgen from "pptxgenjs";

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export async function generatePPTFromImages(imageList, startDate = null, endDate = null) {
  // Debug : Affichage complet de l'imageList reçue
  console.log("DEBUG FTTH PPT: Contenu de imageList :", imageList);

  const pptx = new pptxgen();
  const todayStr = new Date().toLocaleDateString("fr-FR");
  const fileDate = todayStr.replace(/\//g, "-");

  const blue = "#0B2F5A";
  const introBackground = "/ftth_intro.png";
  const titleSlideBackground = "/title_slide.png";
  const transverseBackground = "/ftth_2.png";
  //const tyBackground = "/ftth_ty.png";
  const endBackground = "/fin.png";
  const contentBackground = "/ftth_diapo.png";

  let weekStr = "Date";
  let dateRangeText = "";

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const allWeeks = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      allWeeks.push(getWeekNumber(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    const uniqueWeeks = [...new Set(allWeeks)].sort((a, b) => a - b);
    weekStr = `S${uniqueWeeks.join("-")}`;
    dateRangeText = `Période : ${weekStr} | Du ${start.toLocaleDateString()} au ${end.toLocaleDateString()}`;
  }

  // Fonction helper pour trouver une image par son ID
  function findImageById(id) {
    return imageList.find(item => {
      const currentId = (item.id || item.label || "").toString().toLowerCase();
      const currentLabel = (item.label || item.id || "").toString().toLowerCase();
      const searchId = id.toLowerCase();
      
      // Recherche exacte par ID ou label
      return currentId === searchId || currentLabel === searchId;
    });
  }

  // Définition des sections et leurs composants
  const sections = {
    manuel: {
      title: "Manuel FTTH",
      kpis: ["kpi-backlog-j1", "kpi-backlog-j", "kpi-manuel-7j"],
      singles: [
        "Backlog FTTH J et Dossiers Traités",
        "KPI FTTH",
        "repartition-manuelle", 
        "Top 5 RÈGLES",
        "Top 5 RÈGLES par jour",
        "Entrants – Sortants – Nouveaux cas"
      ],
      noComments: []
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
        "Backlog J",
        "Évolution du Backlog",
        "Transité / Criticité",
        "Ancienneté des Tickets Traités",
        "Volume des Tickets par Division",
        "Taux des Réentrants",
        "Volume des Réentrants"
      ],
      singlesWithCommentsBelow: [
        "Tickets Entrants/Sortants",
        "Rapport Sortants/Entrants"
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

  // Slide 1 – Intro
  const cover = pptx.addSlide();
  cover.addImage({ path: introBackground, x: 0, y: 0, w: "100%", h: "100%" });
  cover.addText("Comité Opérationnel Bimensuel\nEA FTTH", {
    x: 0.5, y: 2.1, w: 9, h: 1.0, align: "center", fontSize: 30, bold: true, color: "FFFFFF"
  });
  if (dateRangeText) {
    cover.addShape(pptx.ShapeType.rect, {
      x: 2.2, y: 3.3, w: 5.6, h: 0.6, fill: { color: "#2E2E2E" }, roundRadius: 6
    });
    cover.addText(dateRangeText, {
      x: 2.2, y: 3.3, w: 5.6, h: 0.6, align: "center", fontSize: 14, color: "FFFFFF", bold: true
    });
  }
  cover.addText(`Édité le : ${todayStr}`, {
    x: 6.0, y: 5.2, w: 2.8, h: 0.3, align: "right", fontSize: 10, color: "D0D0D0"
  });

  // Fonction pour créer une slide de titre de section
  function createSectionTitleSlide(sectionTitle, sectionNumber) {
    const titleSlide = pptx.addSlide();
    titleSlide.addImage({ path: titleSlideBackground, x: 0, y: 0, w: "100%", h: "100%" });
    
    // Titre avec numérotation à côté
    titleSlide.addText(`${sectionNumber}. ${sectionTitle}`, {
      x: 1, y: 2.3, w: 9, h: 0.8, align: "center", fontSize: 50, bold: true, color: "FFFFFF"
    });
  }

  // Fonction pour créer une slide avec plusieurs KPI (sans section commentaire)
  function createMultiKpiSlide(kpiIds, sectionTitle) {
    const slide = pptx.addSlide();
    slide.addImage({ path: contentBackground, x: 0, y: 0, w: "100%", h: "100%" });
    
    const titleY = 0.7;
    slide.addText(`KPIs ${sectionTitle}`, {
      x: 0.5, y: titleY, w: 9.0, h: 0.4, 
      fontSize: 18, bold: true, color: blue, align: "left"
    });

    if (dateRangeText) { 
      slide.addText(dateRangeText.split(': ')[1] || dateRangeText, { 
        x: 6.5, y: titleY + 0.1, w: 3, h: 0.25, 
        fontSize: 9, color: "#4B5563", align: "right" 
      }); 
    }

    // Zone de contenu pour les KPIs (pleine largeur maintenant)
    const contentStartY = titleY + 0.6; 
    const contentEndY = 5.2;
    const contentStartX = 0.5; 
    const contentEndX = 9.5;
    const availableWidth = Math.max(0.1, contentEndX - contentStartX);
    const availableHeight = Math.max(0.1, contentEndY - contentStartY);

    // Récupération des images KPI disponibles seulement
    const allKpiImages = kpiIds.map(kpiId => findImageById(kpiId));
    const availableKpis = allKpiImages.filter(kpi => kpi && kpi.image);
    
    console.log(`KPIs disponibles: ${availableKpis.length}/${kpiIds.length}`);

    if (availableKpis.length === 0) {
      // Aucun KPI disponible
      slide.addText("Aucun KPI disponible", {
        x: contentStartX, y: contentStartY + availableHeight/2 - 0.2, 
        w: availableWidth, h: 0.4, 
        align: "center", valign: "middle", fontSize: 16, color: "#6b7280"
      });
      return;
    }

    // Fonction createKPI
    const createKPI = (kpiImage, posX, posY, kpiWidth, kpiHeight) => {
      const kpiBoxW = kpiWidth; 
      const kpiBoxH = kpiHeight;
      const kpiTitleH = 0.3; 
      const kpiImgH = kpiBoxH - kpiTitleH - 0.15;
      const kpiLabel = kpiImage?.label || kpiImage?.id || "KPI Inconnu"; 
      const kpiImageData = kpiImage?.image;
      
      // Boîte principale du KPI
      slide.addShape(pptx.ShapeType.rect, { 
        x: posX, y: posY, w: kpiBoxW, h: kpiBoxH, 
        fill: { color: "#ffffff" }, 
        line: { color: "#dddddd", width: 1 } 
      });
      
      // En-tête colorée du KPI
      slide.addShape(pptx.ShapeType.rect, { 
        x: posX, y: posY, w: kpiBoxW, h: kpiTitleH, 
        fill: { color: "#00AEEF" }
      });
      
      // Titre du KPI
      slide.addText(kpiLabel, { 
        x: posX, y: posY + 0.02, w: kpiBoxW, h: kpiTitleH, 
        align: "center", fontSize: 8, bold: true, color: "#ffffff" 
      });
      
      // Image
      slide.addImage({ 
        data: kpiImageData, 
        x: posX + 0.1, y: posY + kpiTitleH + 0.1, 
        w: kpiBoxW - 0.2, h: kpiImgH 
      });
    };

    // Calcul des dimensions et positions selon le nombre de KPIs disponibles
    let kpiWidth, kpiHeight, kpiPositions;
    const kpiStartX = contentStartX + 0.2;
    const kpiStartY = contentStartY + 0.5;
    const maxKpiWidth = availableWidth - 0.4;
    const maxKpiHeight = availableHeight - 1;

    if (availableKpis.length === 1) {
      // 1 KPI - centré et plus grand
      kpiWidth = Math.min(3.0, maxKpiWidth);
      kpiHeight = Math.min(2.5, maxKpiHeight);
      const centerX = contentStartX + (availableWidth - kpiWidth) / 2;
      const centerY = contentStartY + (availableHeight - kpiHeight) / 2;
      kpiPositions = [{ index: 0, x: centerX, y: centerY }];
    } else if (availableKpis.length === 2) {
      // 2 KPIs - côte à côte et plus grands
      kpiWidth = Math.min(3.5, (maxKpiWidth - 0.3) / 2);
      kpiHeight = Math.min(2.5, maxKpiHeight);
      const totalWidth = 2 * kpiWidth + 0.3;
      const startX = contentStartX + (availableWidth - totalWidth) / 2;
      const centerY = contentStartY + (availableHeight - kpiHeight) / 2;
      kpiPositions = [
        { index: 0, x: startX, y: centerY },
        { index: 1, x: startX + kpiWidth + 0.3, y: centerY }
      ];
    } else if (availableKpis.length === 3) {
      // 3 KPIs - ligne horizontale
      kpiWidth = Math.min(2.5, (maxKpiWidth - 0.6) / 3);
      kpiHeight = Math.min(2.2, maxKpiHeight);
      const totalWidth = 3 * kpiWidth + 0.6;
      const startX = contentStartX + (availableWidth - totalWidth) / 2;
      const centerY = contentStartY + (availableHeight - kpiHeight) / 2;
      kpiPositions = [
        { index: 0, x: startX, y: centerY },
        { index: 1, x: startX + kpiWidth + 0.3, y: centerY },
        { index: 2, x: startX + 2 * (kpiWidth + 0.3), y: centerY }
      ];
    } else if (availableKpis.length === 4) {
      // 4 KPIs - 2x2
      kpiWidth = Math.min(2.2, (maxKpiWidth - 0.3) / 2);
      kpiHeight = Math.min(1.8, (maxKpiHeight - 0.3) / 2);
      const totalWidth = 2 * kpiWidth + 0.3;
      const totalHeight = 2 * kpiHeight + 0.3;
      const startX = contentStartX + (availableWidth - totalWidth) / 2;
      const startY = contentStartY + (availableHeight - totalHeight) / 2;
      kpiPositions = [
        { index: 0, x: startX, y: startY },
        { index: 1, x: startX + kpiWidth + 0.3, y: startY },
        { index: 2, x: startX, y: startY + kpiHeight + 0.3 },
        { index: 3, x: startX + kpiWidth + 0.3, y: startY + kpiHeight + 0.3 }
      ];
    } else {
      // 5 KPIs ou plus - layout original (2 en haut, 3 en bas)
      kpiWidth = 1.6; 
      kpiHeight = 1.2;
      const kpiMarginX = 0.1;
      const kpiMarginY = 0.1;
      const totalKpiWidth = 3 * kpiWidth + 2 * kpiMarginX; 
      const centerOffsetX = Math.max(0, (maxKpiWidth - totalKpiWidth) / 2);

      kpiPositions = [
        // Première ligne - 2 KPIs centrés
        { index: 0, x: kpiStartX + centerOffsetX + (kpiWidth + kpiMarginX) / 2, y: kpiStartY },
        { index: 1, x: kpiStartX + centerOffsetX + (kpiWidth + kpiMarginX) / 2 + kpiWidth + kpiMarginX, y: kpiStartY },
        
        // Deuxième ligne - 3 KPIs centrés
        { index: 2, x: kpiStartX + centerOffsetX, y: kpiStartY + kpiHeight + kpiMarginY },
        { index: 3, x: kpiStartX + centerOffsetX + kpiWidth + kpiMarginX, y: kpiStartY + kpiHeight + kpiMarginY },
        { index: 4, x: kpiStartX + centerOffsetX + 2 * (kpiWidth + kpiMarginX), y: kpiStartY + kpiHeight + kpiMarginY }
      ];
    }

    // Créer chaque KPI
    availableKpis.forEach((kpiData, index) => {
      if (index < kpiPositions.length) {
        const pos = kpiPositions[index];
        console.log(`Création KPI index ${index}:`, kpiData ? kpiData.label || kpiData.id : "Non trouvé");
        
        if (typeof pos.x === 'number' && typeof pos.y === 'number' && !isNaN(pos.x) && !isNaN(pos.y)) {
          createKPI(kpiData, pos.x, pos.y, kpiWidth, kpiHeight);
        } else {
          console.error(`Coordonnées invalides pour KPI index ${index}: x=${pos.x}, y=${pos.y}`);
        }
      }
    });
  }

  // Fonction pour créer une slide standard (sans commentaires)
  function createSingleSlideNoComments(imageId) {
    const imageItem = findImageById(imageId);
    if (!imageItem) {
      console.warn(`Image non trouvée pour l'ID: ${imageId}`);
      return;
    }

    const slide = pptx.addSlide();
    slide.addImage({ path: contentBackground, x: 0, y: 0, w: "100%", h: "100%" });
    
    const title = imageItem.label || imageItem.id || imageId;
    
    // Titre de la slide
    slide.addText(title, {
      x: 0.5, y: 0.7, w: 9.0, h: 0.4, 
      fontSize: 18, bold: true, color: blue, align: "left"
    });

    // Image du graphique (sans background blanc)
    slide.addImage({ 
      data: imageItem.image, 
      x: 0.8, y: 1.5, w: 7.8, h: 3.4 
    });

    // Affichage de la plage de dates (position ajustée)
    if (dateRangeText) {
      slide.addText(dateRangeText, {
        x: 0.7, y: 5.2, w: 8.5, h: 0.4,
        align: "center", fontSize: 12, color: "#6b7280"
      });
    }
  }

  // Fonction pour créer une slide avec commentaires en bas
  function createSingleSlideCommentsBelow(imageId) {
    const imageItem = findImageById(imageId);
    if (!imageItem) {
      console.warn(`Image non trouvée pour l'ID: ${imageId}`);
      return;
    }

    const slide = pptx.addSlide();
    slide.addImage({ path: contentBackground, x: 0, y: 0, w: "100%", h: "100%" });
    
    const title = imageItem.label || imageItem.id || imageId;
    
    // Titre de la slide
    slide.addText(title, {
      x: 0.5, y: 0.7, w: 9.0, h: 0.4, 
      fontSize: 18, bold: true, color: blue, align: "left"
    });

    
    slide.addImage({ 
      data: imageItem.image, 
      x: 2, y: 1.5, w: 5.8, h: 2.4 
    });

    // Zone de commentaire en bas (position ajustée)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.7, y: 4.0, w: 8.5, h: 1.0,
      fill: { color: "#f9fafb" },
      line: { color: "#DDEEFF", width: 1 },
      shadow: { type: "outer", blur: 1, offset: 1, angle: 45, color: "E0E0E0" }
    });

    slide.addText([
      { text: "-", options: { fontSize: 11, color: "#4B5563" } }
    ], {
      x: 1.0, y: 4.2, w: 7.9, h: 0.6, valign: "top"
    });
  }

  // Fonction pour créer une slide standard (avec commentaires à droite)
  function createSingleSlide(imageId, showComments = true) {
    const imageItem = findImageById(imageId);
    if (!imageItem) {
      console.warn(`Image non trouvée pour l'ID: ${imageId}`);
      return;
    }

    const slide = pptx.addSlide();
    slide.addImage({ path: contentBackground, x: 0, y: 0, w: "100%", h: "100%" });
    
    const title = imageItem.label || imageItem.id || imageId;
    
    // Titre de la slide
    slide.addText(title, {
      x: 0.5, y: 0.7, w: 9.0, h: 0.4, 
      fontSize: 18, bold: true, color: blue, align: "left"
    });

    if (showComments) {
      // Image du graphique (avec commentaires)
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.7, y: 1.4, w: 5.2, h: 3.1,
        fill: { color: "#ffffff" }, line: { color: "#d1d5db", width: 1 }
      });
      
      slide.addImage({ 
        data: imageItem.image, 
        x: 0.8, y: 1.5, w: 5.0, h: 2.9 
      });

      // Zone de commentaire
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.0, y: 1.4, w: 3.0, h: 3.2,
        fill: { color: "#f9fafb" },
        line: { color: "#DDEEFF", width: 1 },
        shadow: { type: "outer", blur: 1, offset: 1, angle: 45, color: "E0E0E0" }
      });

      slide.addText([
        { text: "-", options: { fontSize: 11, color: "#4B5563" } }
      ], {
        x: 6.2, y: 1.9, w: 2.6, h: 2.6, valign: "top"
      });

      // Affichage de la plage de dates
      if (dateRangeText) {
        slide.addText(dateRangeText, {
          x: 0.7, y: 4.7, w: 5.2, h: 0.4,
          align: "center", fontSize: 12, color: "#6b7280"
        });
      }
    } else {
      // Image du graphique (sans commentaires, pleine largeur)
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.7, y: 1.4, w: 8.5, h: 3.1,
        fill: { color: "#ffffff" }, line: { color: "#d1d5db", width: 1 }
      });
      
      slide.addImage({ 
        data: imageItem.image, 
        x: 0.8, y: 1.5, w: 8.3, h: 2.9 
      });

      // Affichage de la plage de dates
      if (dateRangeText) {
        slide.addText(dateRangeText, {
          x: 0.7, y: 4.7, w: 8.5, h: 0.4,
          align: "center", fontSize: 12, color: "#6b7280"
        });
      }
    }
  }

  // Fonction pour créer une slide vide avec titre
  function createEmptySlide(title) {
    const slide = pptx.addSlide();
    slide.addImage({ path: contentBackground, x: 0, y: 0, w: "100%", h: "100%" });
    
    // Titre de la slide
    slide.addText(title, {
      x: 0.5, y: 0.7, w: 9.0, h: 0.4, 
      fontSize: 18, bold: true, color: blue, align: "left"
    });

  }

  // Génération des sections
  let sectionCounter = 1;
  Object.values(sections).forEach(section => {
    // Slide de titre de section
    createSectionTitleSlide(section.title, sectionCounter);
    sectionCounter++;

    // Slide des KPIs si elle existe (sans commentaires maintenant)
    if (section.kpis && section.kpis.length > 0) {
      createMultiKpiSlide(section.kpis, section.title);
    }

    // Slides individuelles selon la section manuel
    if (section.singles) {
      section.singles.forEach(imageId => {
        if (section.title === "Manuel FTTH" && 
            ["Backlog FTTH J et Dossiers Traités", "KPI FTTH", "repartition-manuelle", "Top 5 RÈGLES par jour", "Entrants – Sortants – Nouveaux cas"].includes(imageId)) {
          // Slides sans commentaires pour ces éléments spécifiques
          createSingleSlideNoComments(imageId);
        } else {
          // Slides normales avec commentaires à droite
          createSingleSlide(imageId, true);
        }
      });
    }

    // Slides avec commentaires en bas
    if (section.singlesWithCommentsBelow) {
      section.singlesWithCommentsBelow.forEach(imageId => {
        createSingleSlideCommentsBelow(imageId);
      });
    }

    // Slides sans commentaires
    if (section.noComments) {
      section.noComments.forEach(imageId => {
        createSingleSlide(imageId, false);
      });
    }
  });

  // Ajouter les 3 slides vides supplémentaires après la section Mailing
  createEmptySlide("SPA");
  createEmptySlide("Transition de compétence");
  createEmptySlide("Accès");

  // Slides fixes du template FTTH

  // Slide – Transverse
  const transverse = pptx.addSlide();
  transverse.addImage({ path: titleSlideBackground, x: 0, y: 0, w: "100%", h: "100%" });
  
  // Titre avec numérotation à côté
  transverse.addText("4. Suivi Transverse", {
    x: 1, y: 2.3, w: 9, h: 0.8, align: "center", fontSize: 50, bold: true, color: "FFFFFF"
  });

  // Slide – Sujets Transverses
  const sujetsTransverses = pptx.addSlide();
  sujetsTransverses.addImage({ path: contentBackground, x: 0, y: 0, w: "100%", h: "100%" });

  sujetsTransverses.addText("Sujets Transverses", {
    x: 0.6, y: 0.7, w: 8, h: 0.4,
    fontSize: 20, bold: true, color: blue, align: "left"
  });

  // Bloc 1 – Sujet à Gauche
  sujetsTransverses.addText("📌 **Titre du Sujet 1**", {
    x: 0.6, y: 1.3, w: 3.5, h: 0.4,
    fontSize: 14, bold: true, color: blue, align: "left"
  });
  sujetsTransverses.addText("Description :\nIci votre description détaillée.", {
    x: 0.6, y: 1.8, w: 3.5, h: 1.2,
    fontSize: 12, color: "#374151", lineSpacingMultiple: 1.3
  });
  sujetsTransverses.addText("Action :\nIci votre action à définir.", {
    x: 0.6, y: 3.1, w: 3.5, h: 0.6,
    fontSize: 12, color: "#374151"
  });

  // Bloc 2 – Sujet à Droite
  sujetsTransverses.addText("📌 **Titre du Sujet 2**", {
    x: 5.0, y: 1.3, w: 3.5, h: 0.4,
    fontSize: 14, bold: true, color: blue, align: "left"
  });
  sujetsTransverses.addText("Description :\nIci une autre description de sujet.", {
    x: 5.0, y: 1.8, w: 3.5, h: 1.2,
    fontSize: 12, color: "#374151", lineSpacingMultiple: 1.3
  });
  sujetsTransverses.addText("Action :\nDéfinissez ici l'action associée.", {
    x: 5.0, y: 3.1, w: 3.5, h: 0.6,
    fontSize: 12, color: "#374151"
  });

  // Séparateur Horizontal
  sujetsTransverses.addShape(pptx.ShapeType.line, { 
    x: 0.6, y: 4.0, w: 8.0, 
    line: { color: "#d1d5db", width: 1 } 
  });

  // Bloc Conclusion
  sujetsTransverses.addShape(pptx.ShapeType.roundRect, {
    x: 1.5, y: 3.9, w: 7.0, h: 1.0,
    fill: { color: "#F0F5FF" },
    line: { color: "#93c5fd", width: 1 },
    roundRadius: 12,
    shadow: { type: "outer", blur: 3, offset: 2, angle: 45, color: "999999" }
  });

  sujetsTransverses.addText("💡 La gestion des sujets transverses demande de la rigueur, de la coordination et une communication efficace entre les équipes.", {
    x: 1.7, y: 4.0, w: 6.6, h: 0.8,
    fontSize: 13, bold: true, color: blue, align: "center", lineSpacingMultiple: 1.4
  });

  // Slide – Météo & Humeur Générale
  const moodSlide = pptx.addSlide();
  moodSlide.addImage({ path: "/mood_background.png", x: 0, y: 0, w: "100%", h: "100%" });

  moodSlide.addText("Météo & Humeur Générale", {
    x: 0.6, y: 0.7, w: 8, h: 0.4, fontSize: 20, bold: true, color: blue
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

    moodSlide.addShape(pptx.ShapeType.rect, { x, y: blockY, w: blockW, h: 0.35, fill: { color: "#2563eb" } });
    moodSlide.addText(block.title, {
      x: x + 0.1, y: blockY + 0.05, w: blockW - 0.2, h: 0.3,
      fontSize: 11, bold: true, color: "#ffffff", align: "center"
    });

    const emojiY = blockY + 0.4;
    const cellW = blockW / 3;
    const cellH = 1.1;

    for (let j = 0; j < 3; j++) {
      moodSlide.addShape(pptx.ShapeType.rect, {
        x: x + j * cellW, y: emojiY, w: cellW, h: cellH,
        fill: { color: "#ffffff" }, line: { color: "#cbd5e1", width: 1 }
      });

      moodSlide.addText(block.icons[j], {
        x: x + j * cellW, y: emojiY + 0.2, w: cellW, h: 0.7,
        align: "center", fontSize: 24, bold: true, color: block.colors[j]
      });
    }

    moodSlide.addShape(pptx.ShapeType.rect, {
      x: x, y: emojiY, w: cellW, h: cellH,
      line: { color: "#2563eb", width: 2 },
      fill: { color: "FFFFFF", transparency: 100 }
    });
  });

  // Slide – Synthèse
  const synthese = pptx.addSlide();
  synthese.addImage({ path: contentBackground, x: 0, y: 0, w: "100%", h: "100%" });
  synthese.addText("Synthèse opérationnelle", {
    x: 0.6, y: 0.7, w: 8, h: 0.4, fontSize: 20, bold: true, color: blue
  });

  const cardW = 2.9, cardH = 3.3, cardY = 1.5, headerH = 0.4, cardSpacing = 0.2;
  const synthTotalWidth = 3 * cardW + 2 * cardSpacing;
  const synthStartX = (10 - synthTotalWidth) / 2;
  const bodyY = cardY + headerH + 0.2;
  const bulletText = Array(5).fill("• Saisissez votre point").join("\n\n");

  function addStyledCard(slide, { x, headerColor, title }) {
    slide.addShape(pptx.ShapeType.rect, { x, y: cardY, w: cardW, h: cardH, fill: { color: "#ffffff" }, line: { color: headerColor, width: 1.5 } });
    slide.addShape(pptx.ShapeType.rect, { x, y: cardY, w: cardW, h: headerH, fill: { color: headerColor } });
    slide.addText(title, {
      x: x + 0.1, y: cardY + 0.05, w: cardW - 0.2, h: 0.3,
      fontSize: 12, bold: true, color: "#ffffff", align: "center"
    });
    slide.addText(bulletText, {
      x: x + 0.2, y: bodyY, w: cardW - 0.4, h: cardH - headerH - 0.4,
      fontSize: 11, color: "#1f2937", lineSpacingMultiple: 1.5
    });
  }

  addStyledCard(synthese, { x: synthStartX, headerColor: "#ef4444", title: "Faits marquants" });
  addStyledCard(synthese, { x: synthStartX + cardW + cardSpacing, headerColor: "#10b981", title: "Amélioration continue" });
  addStyledCard(synthese, { x: synthStartX + 2 * (cardW + cardSpacing), headerColor: "#facc15", title: "Points d'attention" });

  // Slide – Merci
  //const tySlide = pptx.addSlide();
  //tySlide.addImage({ path: tyBackground, x: 0, y: 0, w: "100%", h: "100%" });

  // Slide – Fin
  const end = pptx.addSlide();
  end.addImage({ path: endBackground, x: 0, y: 0, w: "100%", h: "100%" });

  await pptx.writeFile({ fileName: `COMOP FTTH (${weekStr}) ${fileDate}.pptx` });
  console.log("DEBUG FTTH PPT: Présentation générée avec succès");
}

// Garde aussi l'ancienne fonction pour compatibilité si nécessaire
export async function generatePPTFromGraphs({
  graphList = [],
  commentMap = {},
  globalStartDate,
  globalEndDate,
}) {
  console.warn("FTTH PPT: generatePPTFromGraphs est dépréciée, utilisez generatePPTFromImages");
  // Convertir l'ancien format vers le nouveau
  return generatePPTFromImages(graphList, globalStartDate, globalEndDate);
}

export default generatePPTFromImages;