// src/components/i18n/translations.js
// Single source of truth for all PipeKeeper UI translations.
// Supports 10 languages: en, es, fr, de, it, pt-BR, nl, pl, ja, zh-Hans
export const translations = {
  en: {
    common: { loading: "Loading...", error: "Error", success: "Success" },
    nav: { home: "Home", pipes: "Pipes", tobacco: "Tobacco", following: "Following" },

    ageGate: {
      title: "Adults Only",
      intendedForAdults: "PipeKeeper is intended for adult users only.",
      disclaimer:
        "This app is a collection tool for pipe enthusiasts. It does not sell tobacco products or facilitate their purchase.",
      confirmAge: "I confirm I am of legal age",
    },

    // Keep "search.trigger" because the UI uses it in the header.
    search: {
      trigger: "Search",
      openAria: "Open search",
      hintTitle: "Start typing to search",
      hintSubtitle: "Search pipes, tobacco, makers, shapes, and more",
      kbdNavigate: "Navigate",
      kbdSelect: "Select",
      kbdClose: "Close",
      commandDialogTitle: "Search",
      commandInputPlaceholder: "Type to search pipes, tobacco, makers…",
      noResultsFound: "No results found",
      noResultsMessage: "Try searching for a pipe, brand, tobacco blend, or shape",
      sectionPipes: "Pipes",
      sectionTobacco: "Tobacco",
      sectionQuickActions: "Quick actions",
      actionAddPipe: "Add new pipe",
      actionAddBlend: "Add new blend",
      actionViewStats: "View stats",
      actionExportData: "Export data",
    },

    // Home
    home: {
      title: "Pipe & Tobacco Collection",
      subtitle:
        "Manage your pipes and tobacco blends with AI-powered search, photo identification, pairing suggestions, and market valuations.",

      pipeCollectionTitle: "Pipe Collection",
      pipeCollectionSubtitle: "Track and value your pipes",
      pipesInCollection: "Pipes in Collection",
      collectionValue: "Collection Value",
      viewCollection: "View Collection",

      tobaccoCellarTitle: "Tobacco Cellar",
      tobaccoCellarSubtitle: "Manage your blends",
      tobaccoBlends: "Tobacco Blends",
      cellared: "Cellared",
      viewCellar: "View Cellar",
    },

    // Insights / collection info tabs
    insights: {
      title: "Collection Insights",
      subtitle: "Track usage and optimize pairings",
      log: "Usage Log",
      pairingGrid: "Pairing Grid",
      rotation: "Rotation",
      stats: "Statistics",
      trends: "Trends",
      aging: "Aging",
      reports: "Reports",
    },

    smokingLog: {
      totalBowls: "Total Bowls",
      breakIn: "break-in",
      logSession: "Log Session",
    },

    // Tobacconist Consultation module
    tobacconist: {
      title: "Tobacconist Consultation",
      subtitle: "Personalized pipe and tobacco advice",
      optional: "Optional",
      identify: "Identify",
      optimize: "Optimize",
      whatIf: "What If",
      updatesTitle: "AI Updates",
      identificationTitle: "AI Pipe Identifier",
      identificationSubtitle: "Upload photos for quick identification help",
    },

    auth: {
      loginRequired: "Login Required",
    },

    community: {
      commentsEnabled: "Comments Enabled",
      commentsDisabled: "Comments Disabled",
    },

    footer: {
      copyright: "© 2025 PipeKeeper. All rights reserved.",
    },

    units: {
      tin: "tin",
      tinPlural: "tins",
      outOf5: "out of 5",
    },
  },

  es: {
    common: { loading: "Cargando...", error: "Error", success: "Éxito" },
    nav: { home: "Inicio", pipes: "Pipas", tobacco: "Tabaco", following: "Siguiendo" },

    ageGate: {
      title: "Solo para adultos",
      intendedForAdults: "PipeKeeper está destinado solo a usuarios adultos.",
      disclaimer:
        "Esta app es una herramienta de colección para aficionados a la pipa. No vende productos de tabaco ni facilita su compra.",
      confirmAge: "Confirmo que soy mayor de edad",
    },

    search: {
      trigger: "Buscar",
      openAria: "Abrir búsqueda",
      hintTitle: "Empieza a escribir para buscar",
      hintSubtitle: "Busca pipas, tabaco, marcas, formas y más",
      kbdNavigate: "Navegar",
      kbdSelect: "Seleccionar",
      kbdClose: "Cerrar",
      commandDialogTitle: "Buscar",
      commandInputPlaceholder: "Escribe para buscar pipas, tabaco, marcas…",
      noResultsFound: "No se encontraron resultados",
      noResultsMessage: "Prueba a buscar una pipa, marca, mezcla de tabaco o forma",
      sectionPipes: "Pipas",
      sectionTobacco: "Tabaco",
      sectionQuickActions: "Acciones rápidas",
      actionAddPipe: "Agregar nueva pipa",
      actionAddBlend: "Agregar nueva mezcla",
      actionViewStats: "Ver estadísticas",
      actionExportData: "Exportar datos",
    },

    home: {
      title: "Colección de pipas y tabaco",
      subtitle:
        "Gestiona tus pipas y mezclas de tabaco con búsqueda con IA, identificación por fotos, sugerencias de emparejamiento y valoraciones de mercado.",

      pipeCollectionTitle: "Colección de pipas",
      pipeCollectionSubtitle: "Rastrea y valora tus pipas",
      pipesInCollection: "Pipas en colección",
      collectionValue: "Valor de la colección",
      viewCollection: "Ver colección",

      tobaccoCellarTitle: "Bodega de tabaco",
      tobaccoCellarSubtitle: "Gestiona tus mezclas",
      tobaccoBlends: "Mezclas de tabaco",
      cellared: "En bodega",
      viewCellar: "Ver bodega",
    },

    insights: {
      title: "Información de colección",
      subtitle: "Rastrear uso y optimizar emparejamientos",
      log: "Registro de uso",
      pairingGrid: "Cuadrícula de emparejamiento",
      rotation: "Rotación",
      stats: "Estadísticas",
      trends: "Tendencias",
      aging: "Añejamiento",
      reports: "Informes",
    },

    smokingLog: {
      totalBowls: "Cargas totales",
      breakIn: "asentado",
      logSession: "Registrar sesión",
    },

    tobacconist: {
      title: "Consulta con tabaquero",
      subtitle: "Asesoramiento personalizado sobre pipas y tabaco",
      optional: "Opcional",
      identify: "Identificar",
      optimize: "Optimizar",
      whatIf: "¿Y si…?",
      updatesTitle: "Actualizaciones de IA",
      identificationTitle: "Identificador de pipas con IA",
      identificationSubtitle: "Sube fotos para ayuda rápida de identificación",
    },

    auth: {
      loginRequired: "Inicio de sesión requerido",
    },

    community: {
      commentsEnabled: "Comentarios habilitados",
      commentsDisabled: "Comentarios deshabilitados",
    },

    footer: {
      copyright: "© 2025 PipeKeeper. Todos los derechos reservados.",
    },

    units: {
      tin: "lata",
      tinPlural: "latas",
      outOf5: "de 5",
    },
  },

  fr: {
    common: { loading: "Chargement...", error: "Erreur", success: "Succès" },
    nav: { home: "Accueil", pipes: "Pipes", tobacco: "Tabac", following: "Abonnements" },

    ageGate: {
      title: "Réservé aux adultes",
      intendedForAdults: "PipeKeeper est destiné uniquement aux utilisateurs adultes.",
      disclaimer:
        "Cette application est un outil de collection pour les amateurs de pipes. Elle ne vend pas de produits du tabac et n'en facilite pas l'achat.",
      confirmAge: "Je confirme avoir l'âge légal",
    },

    search: {
      trigger: "Rechercher",
      openAria: "Ouvrir la recherche",
      hintTitle: "Commencez à taper pour rechercher",
      hintSubtitle: "Recherchez des pipes, tabacs, fabricants, formes et plus",
      kbdNavigate: "Naviguer",
      kbdSelect: "Sélectionner",
      kbdClose: "Fermer",
      commandDialogTitle: "Rechercher",
      commandInputPlaceholder: "Tapez pour rechercher des pipes, tabacs, fabricants…",
      noResultsFound: "Aucun résultat trouvé",
      noResultsMessage: "Essayez de rechercher une pipe, une marque, un mélange ou une forme",
      sectionPipes: "Pipes",
      sectionTobacco: "Tabac",
      sectionQuickActions: "Actions rapides",
      actionAddPipe: "Ajouter une pipe",
      actionAddBlend: "Ajouter un mélange",
      actionViewStats: "Voir les statistiques",
      actionExportData: "Exporter les données",
    },

    home: {
      title: "Collection de pipes et tabacs",
      subtitle:
        "Gérez vos pipes et mélanges de tabac avec recherche IA, identification photo, suggestions de mariage et estimations de marché.",

      pipeCollectionTitle: "Collection de pipes",
      pipeCollectionSubtitle: "Suivez et évaluez vos pipes",
      pipesInCollection: "Pipes en collection",
      collectionValue: "Valeur de la collection",
      viewCollection: "Voir la collection",

      tobaccoCellarTitle: "Cave à tabac",
      tobaccoCellarSubtitle: "Gérez vos mélanges",
      tobaccoBlends: "Mélanges de tabac",
      cellared: "En cave",
      viewCellar: "Voir la cave",
    },

    insights: {
      title: "Aperçus de collection",
      subtitle: "Suivez l'utilisation et optimisez les mariages",
      log: "Journal d'utilisation",
      pairingGrid: "Grille de mariages",
      rotation: "Rotation",
      stats: "Statistiques",
      trends: "Tendances",
      aging: "Vieillissement",
      reports: "Rapports",
    },

    smokingLog: {
      totalBowls: "Total de fourneaux",
      breakIn: "rodage",
      logSession: "Enregistrer une session",
    },

    tobacconist: {
      title: "Consultation buraliste",
      subtitle: "Conseils personnalisés sur les pipes et tabacs",
      optional: "Optionnel",
      identify: "Identifier",
      optimize: "Optimiser",
      whatIf: "Et si…",
      updatesTitle: "Mises à jour IA",
      identificationTitle: "Identificateur de pipe IA",
      identificationSubtitle: "Téléchargez des photos pour une aide rapide à l'identification",
    },

    auth: {
      loginRequired: "Connexion requise",
    },

    community: {
      commentsEnabled: "Commentaires activés",
      commentsDisabled: "Commentaires désactivés",
    },

    footer: {
      copyright: "© 2025 PipeKeeper. Tous droits réservés.",
    },

    units: {
      tin: "boîte",
      tinPlural: "boîtes",
      outOf5: "sur 5",
    },
  },

  de: {
    common: { loading: "Wird geladen...", error: "Fehler", success: "Erfolg" },
    nav: { home: "Startseite", pipes: "Pfeifen", tobacco: "Tabak", following: "Folge ich" },

    ageGate: {
      title: "Nur für Erwachsene",
      intendedForAdults: "PipeKeeper ist nur für erwachsene Nutzer bestimmt.",
      disclaimer:
        "Diese App ist ein Sammlungs-Tool für Pfeifenliebhaber. Sie verkauft keine Tabakprodukte und erleichtert deren Kauf nicht.",
      confirmAge: "Ich bestätige, dass ich volljährig bin",
    },

    search: {
      trigger: "Suchen",
      openAria: "Suche öffnen",
      hintTitle: "Zum Suchen tippen",
      hintSubtitle: "Suche Pfeifen, Tabak, Hersteller, Formen und mehr",
      kbdNavigate: "Navigieren",
      kbdSelect: "Auswählen",
      kbdClose: "Schließen",
      commandDialogTitle: "Suchen",
      commandInputPlaceholder: "Tippe, um Pfeifen, Tabak, Hersteller… zu suchen",
      noResultsFound: "Keine Ergebnisse gefunden",
      noResultsMessage: "Versuche nach Pfeife, Marke, Tabakmischung oder Form zu suchen",
      sectionPipes: "Pfeifen",
      sectionTobacco: "Tabak",
      sectionQuickActions: "Schnellaktionen",
      actionAddPipe: "Neue Pfeife hinzufügen",
      actionAddBlend: "Neue Mischung hinzufügen",
      actionViewStats: "Statistiken ansehen",
      actionExportData: "Daten exportieren",
    },

    home: {
      title: "Pfeifen- & Tabaksammlung",
      subtitle:
        "Verwalte deine Pfeifen und Tabakmischungen mit KI-Suche, Fotoerkennung, Pairing-Vorschlägen und Marktwerten.",

      pipeCollectionTitle: "Pfeifensammlung",
      pipeCollectionSubtitle: "Pfeifen verfolgen und bewerten",
      pipesInCollection: "Pfeifen in der Sammlung",
      collectionValue: "Sammlungswert",
      viewCollection: "Sammlung ansehen",

      tobaccoCellarTitle: "Tabaklager",
      tobaccoCellarSubtitle: "Mischungen verwalten",
      tobaccoBlends: "Tabakmischungen",
      cellared: "Gelagert",
      viewCellar: "Lager ansehen",
    },

    insights: {
      title: "Sammlungs-Einblicke",
      subtitle: "Nutzung verfolgen und Pairings optimieren",
      log: "Nutzungsprotokoll",
      pairingGrid: "Pairing-Raster",
      rotation: "Rotation",
      stats: "Statistiken",
      trends: "Trends",
      aging: "Reifung",
      reports: "Berichte",
    },

    smokingLog: {
      totalBowls: "Gesamtfüllungen",
      breakIn: "Einrauchen",
      logSession: "Sitzung protokollieren",
    },

    tobacconist: {
      title: "Tabakberater-Beratung",
      subtitle: "Personalisierte Pfeifen- und Tabakberatung",
      optional: "Optional",
      identify: "Identifizieren",
      optimize: "Optimieren",
      whatIf: "Was wäre wenn",
      updatesTitle: "KI-Updates",
      identificationTitle: "KI-Pfeifen-Identifikator",
      identificationSubtitle: "Fotos hochladen für schnelle Identifikationshilfe",
    },

    auth: {
      loginRequired: "Anmeldung erforderlich",
    },

    community: {
      commentsEnabled: "Kommentare aktiviert",
      commentsDisabled: "Kommentare deaktiviert",
    },

    footer: {
      copyright: "© 2025 PipeKeeper. Alle Rechte vorbehalten.",
    },

    units: {
      tin: "Dose",
      tinPlural: "Dosen",
      outOf5: "von 5",
    },
  },

  it: {
    common: { loading: "Caricamento...", error: "Errore", success: "Successo" },
    nav: { home: "Home", pipes: "Pipe", tobacco: "Tabacco", following: "Seguiti" },

    ageGate: {
      title: "Solo per adulti",
      intendedForAdults: "PipeKeeper è destinato solo agli utenti adulti.",
      disclaimer:
        "Questa app è uno strumento di collezione per gli appassionati di pipa. Non vende prodotti del tabacco né ne facilita l'acquisto.",
      confirmAge: "Confermo di avere l'età legale",
    },

    search: {
      trigger: "Cerca",
      openAria: "Apri la ricerca",
      hintTitle: "Inizia a digitare per cercare",
      hintSubtitle: "Cerca pipe, tabacchi, produttori, forme e altro",
      kbdNavigate: "Naviga",
      kbdSelect: "Seleziona",
      kbdClose: "Chiudi",
      commandDialogTitle: "Cerca",
      commandInputPlaceholder: "Digita per cercare pipe, tabacchi, produttori…",
      noResultsFound: "Nessun risultato trovato",
      noResultsMessage: "Prova a cercare una pipa, un marchio, una miscela o una forma",
      sectionPipes: "Pipe",
      sectionTobacco: "Tabacco",
      sectionQuickActions: "Azioni rapide",
      actionAddPipe: "Aggiungi pipa",
      actionAddBlend: "Aggiungi miscela",
      actionViewStats: "Vedi statistiche",
      actionExportData: "Esporta dati",
    },

    home: {
      title: "Collezione di pipe e tabacchi",
      subtitle:
        "Gestisci le tue pipe e miscele di tabacco con ricerca IA, identificazione foto, suggerimenti di abbinamento e stime di mercato.",

      pipeCollectionTitle: "Collezione di pipe",
      pipeCollectionSubtitle: "Traccia e valuta le tue pipe",
      pipesInCollection: "Pipe in collezione",
      collectionValue: "Valore della collezione",
      viewCollection: "Vedi la collezione",

      tobaccoCellarTitle: "Cantina del tabacco",
      tobaccoCellarSubtitle: "Gestisci le tue miscele",
      tobaccoBlends: "Miscele di tabacco",
      cellared: "In cantina",
      viewCellar: "Vedi la cantina",
    },

    insights: {
      title: "Approfondimenti della collezione",
      subtitle: "Traccia l'utilizzo e ottimizza gli abbinamenti",
      log: "Registro d'uso",
      pairingGrid: "Griglia abbinamenti",
      rotation: "Rotazione",
      stats: "Statistiche",
      trends: "Tendenze",
      aging: "Invecchiamento",
      reports: "Rapporti",
    },

    smokingLog: {
      totalBowls: "Fornelli totali",
      breakIn: "rodaggio",
      logSession: "Registra sessione",
    },

    tobacconist: {
      title: "Consulenza tabaccaio",
      subtitle: "Consigli personalizzati su pipe e tabacchi",
      optional: "Opzionale",
      identify: "Identifica",
      optimize: "Ottimizza",
      whatIf: "E se…",
      updatesTitle: "Aggiornamenti IA",
      identificationTitle: "Identificatore di pipa IA",
      identificationSubtitle: "Carica foto per un rapido aiuto all'identificazione",
    },

    auth: {
      loginRequired: "Accesso richiesto",
    },

    community: {
      commentsEnabled: "Commenti abilitati",
      commentsDisabled: "Commenti disabilitati",
    },

    footer: {
      copyright: "© 2025 PipeKeeper. Tutti i diritti riservati.",
    },

    units: {
      tin: "barattolo",
      tinPlural: "barattoli",
      outOf5: "su 5",
    },
  },

  'pt-BR': {
    common: { loading: "Carregando...", error: "Erro", success: "Sucesso" },
    nav: { home: "Início", pipes: "Cachimbos", tobacco: "Tabaco", following: "Seguindo" },

    ageGate: {
      title: "Somente adultos",
      intendedForAdults: "PipeKeeper é destinado apenas a usuários adultos.",
      disclaimer:
        "Este aplicativo é uma ferramenta de coleção para entusiastas de cachimbo. Não vende produtos de tabaco nem facilita sua compra.",
      confirmAge: "Confirmo que tenho idade legal",
    },

    search: {
      trigger: "Pesquisar",
      openAria: "Abrir pesquisa",
      hintTitle: "Comece a digitar para pesquisar",
      hintSubtitle: "Pesquise cachimbos, tabaco, fabricantes, formas e mais",
      kbdNavigate: "Navegar",
      kbdSelect: "Selecionar",
      kbdClose: "Fechar",
      commandDialogTitle: "Pesquisar",
      commandInputPlaceholder: "Digite para pesquisar cachimbos, tabaco, fabricantes…",
      noResultsFound: "Nenhum resultado encontrado",
      noResultsMessage: "Tente pesquisar um cachimbo, marca, mistura de tabaco ou forma",
      sectionPipes: "Cachimbos",
      sectionTobacco: "Tabaco",
      sectionQuickActions: "Ações rápidas",
      actionAddPipe: "Adicionar cachimbo",
      actionAddBlend: "Adicionar mistura",
      actionViewStats: "Ver estatísticas",
      actionExportData: "Exportar dados",
    },

    home: {
      title: "Coleção de cachimbos e tabaco",
      subtitle:
        "Gerencie seus cachimbos e misturas de tabaco com pesquisa por IA, identificação por foto, sugestões de combinação e avaliações de mercado.",

      pipeCollectionTitle: "Coleção de cachimbos",
      pipeCollectionSubtitle: "Rastreie e avalie seus cachimbos",
      pipesInCollection: "Cachimbos na coleção",
      collectionValue: "Valor da coleção",
      viewCollection: "Ver coleção",

      tobaccoCellarTitle: "Adega de tabaco",
      tobaccoCellarSubtitle: "Gerencie suas misturas",
      tobaccoBlends: "Misturas de tabaco",
      cellared: "Na adega",
      viewCellar: "Ver adega",
    },

    insights: {
      title: "Insights da coleção",
      subtitle: "Acompanhe o uso e otimize combinações",
      log: "Registro de uso",
      pairingGrid: "Grade de combinações",
      rotation: "Rotação",
      stats: "Estatísticas",
      trends: "Tendências",
      aging: "Envelhecimento",
      reports: "Relatórios",
    },

    smokingLog: {
      totalBowls: "Total de fornadas",
      breakIn: "aquecimento",
      logSession: "Registrar sessão",
    },

    tobacconist: {
      title: "Consulta com tabacalista",
      subtitle: "Conselhos personalizados sobre cachimbos e tabaco",
      optional: "Opcional",
      identify: "Identificar",
      optimize: "Otimizar",
      whatIf: "E se…",
      updatesTitle: "Atualizações de IA",
      identificationTitle: "Identificador de cachimbo IA",
      identificationSubtitle: "Faça upload de fotos para ajuda rápida de identificação",
    },

    auth: {
      loginRequired: "Login necessário",
    },

    community: {
      commentsEnabled: "Comentários ativados",
      commentsDisabled: "Comentários desativados",
    },

    footer: {
      copyright: "© 2025 PipeKeeper. Todos os direitos reservados.",
    },

    units: {
      tin: "lata",
      tinPlural: "latas",
      outOf5: "de 5",
    },
  },

  nl: {
    common: { loading: "Laden...", error: "Fout", success: "Succes" },
    nav: { home: "Startpagina", pipes: "Pijpen", tobacco: "Tabak", following: "Volgend" },

    ageGate: {
      title: "Alleen voor volwassenen",
      intendedForAdults: "PipeKeeper is uitsluitend bedoeld voor volwassen gebruikers.",
      disclaimer:
        "Deze app is een verzameltool voor pijpenliefhebbers. Het verkoopt geen tabaksproducten en faciliteert de aankoop ervan niet.",
      confirmAge: "Ik bevestig dat ik de wettelijke leeftijd heb",
    },

    search: {
      trigger: "Zoeken",
      openAria: "Zoeken openen",
      hintTitle: "Begin te typen om te zoeken",
      hintSubtitle: "Zoek pijpen, tabak, makers, vormen en meer",
      kbdNavigate: "Navigeren",
      kbdSelect: "Selecteren",
      kbdClose: "Sluiten",
      commandDialogTitle: "Zoeken",
      commandInputPlaceholder: "Typ om pijpen, tabak, makers te zoeken…",
      noResultsFound: "Geen resultaten gevonden",
      noResultsMessage: "Probeer te zoeken op pijp, merk, tabaksmengsel of vorm",
      sectionPipes: "Pijpen",
      sectionTobacco: "Tabak",
      sectionQuickActions: "Snelle acties",
      actionAddPipe: "Pijp toevoegen",
      actionAddBlend: "Mengsel toevoegen",
      actionViewStats: "Statistieken bekijken",
      actionExportData: "Gegevens exporteren",
    },

    home: {
      title: "Pijpen- & tabakcollectie",
      subtitle:
        "Beheer uw pijpen en tabaksmengsels met AI-zoeken, fotoherkenning, pairingsuggesties en marktwaarden.",

      pipeCollectionTitle: "Pijpencollectie",
      pipeCollectionSubtitle: "Volg en waardeer uw pijpen",
      pipesInCollection: "Pijpen in collectie",
      collectionValue: "Collectiewaarde",
      viewCollection: "Collectie bekijken",

      tobaccoCellarTitle: "Tabakskelder",
      tobaccoCellarSubtitle: "Beheer uw mengsels",
      tobaccoBlends: "Tabaksmengsels",
      cellared: "Opgeslagen",
      viewCellar: "Kelder bekijken",
    },

    insights: {
      title: "Collectie-inzichten",
      subtitle: "Gebruik bijhouden en pairings optimaliseren",
      log: "Gebruikslogboek",
      pairingGrid: "Pairingraster",
      rotation: "Rotatie",
      stats: "Statistieken",
      trends: "Trends",
      aging: "Veroudering",
      reports: "Rapporten",
    },

    smokingLog: {
      totalBowls: "Totaal kommetjes",
      breakIn: "inroken",
      logSession: "Sessie registreren",
    },

    tobacconist: {
      title: "Tabakshandelaar consult",
      subtitle: "Persoonlijk advies over pijpen en tabak",
      optional: "Optioneel",
      identify: "Identificeren",
      optimize: "Optimaliseren",
      whatIf: "Wat als…",
      updatesTitle: "AI-updates",
      identificationTitle: "AI-pijpidentificator",
      identificationSubtitle: "Upload foto's voor snelle identificatiehulp",
    },

    auth: {
      loginRequired: "Inloggen vereist",
    },

    community: {
      commentsEnabled: "Reacties ingeschakeld",
      commentsDisabled: "Reacties uitgeschakeld",
    },

    footer: {
      copyright: "© 2025 PipeKeeper. Alle rechten voorbehouden.",
    },

    units: {
      tin: "blikje",
      tinPlural: "blikjes",
      outOf5: "van 5",
    },
  },

  pl: {
    common: { loading: "Ładowanie...", error: "Błąd", success: "Sukces" },
    nav: { home: "Strona główna", pipes: "Fajki", tobacco: "Tytoń", following: "Obserwowani" },

    ageGate: {
      title: "Tylko dla dorosłych",
      intendedForAdults: "PipeKeeper jest przeznaczony wyłącznie dla dorosłych użytkowników.",
      disclaimer:
        "Ta aplikacja jest narzędziem kolekcjonerskim dla miłośników fajek. Nie sprzedaje produktów tytoniowych ani nie ułatwia ich zakupu.",
      confirmAge: "Potwierdzam, że jestem w wieku prawnym",
    },

    search: {
      trigger: "Szukaj",
      openAria: "Otwórz wyszukiwanie",
      hintTitle: "Zacznij pisać, aby wyszukać",
      hintSubtitle: "Szukaj fajek, tytoniu, producentów, kształtów i więcej",
      kbdNavigate: "Nawiguj",
      kbdSelect: "Wybierz",
      kbdClose: "Zamknij",
      commandDialogTitle: "Szukaj",
      commandInputPlaceholder: "Wpisz, aby wyszukać fajki, tytoń, producentów…",
      noResultsFound: "Nie znaleziono wyników",
      noResultsMessage: "Spróbuj wyszukać fajkę, markę, mieszankę tytoniu lub kształt",
      sectionPipes: "Fajki",
      sectionTobacco: "Tytoń",
      sectionQuickActions: "Szybkie akcje",
      actionAddPipe: "Dodaj fajkę",
      actionAddBlend: "Dodaj mieszankę",
      actionViewStats: "Zobacz statystyki",
      actionExportData: "Eksportuj dane",
    },

    home: {
      title: "Kolekcja fajek i tytoniu",
      subtitle:
        "Zarządzaj fajkami i mieszankami tytoniu z wyszukiwaniem AI, identyfikacją zdjęć, sugestiami parowania i wycenami rynkowymi.",

      pipeCollectionTitle: "Kolekcja fajek",
      pipeCollectionSubtitle: "Śledź i wyceniaj swoje fajki",
      pipesInCollection: "Fajki w kolekcji",
      collectionValue: "Wartość kolekcji",
      viewCollection: "Zobacz kolekcję",

      tobaccoCellarTitle: "Piwnica tytoniu",
      tobaccoCellarSubtitle: "Zarządzaj swoimi mieszankami",
      tobaccoBlends: "Mieszanki tytoniu",
      cellared: "W piwnicy",
      viewCellar: "Zobacz piwnicę",
    },

    insights: {
      title: "Wgląd w kolekcję",
      subtitle: "Śledź użycie i optymalizuj parowania",
      log: "Dziennik użycia",
      pairingGrid: "Siatka parowań",
      rotation: "Rotacja",
      stats: "Statystyki",
      trends: "Trendy",
      aging: "Dojrzewanie",
      reports: "Raporty",
    },

    smokingLog: {
      totalBowls: "Łącznie główek",
      breakIn: "docieranie",
      logSession: "Zarejestruj sesję",
    },

    tobacconist: {
      title: "Konsultacja tytoniara",
      subtitle: "Spersonalizowane porady dotyczące fajek i tytoniu",
      optional: "Opcjonalnie",
      identify: "Zidentyfikuj",
      optimize: "Optymalizuj",
      whatIf: "Co jeśli…",
      updatesTitle: "Aktualizacje AI",
      identificationTitle: "Identyfikator fajek AI",
      identificationSubtitle: "Prześlij zdjęcia, aby uzyskać szybką pomoc w identyfikacji",
    },

    auth: {
      loginRequired: "Wymagane logowanie",
    },

    community: {
      commentsEnabled: "Komentarze włączone",
      commentsDisabled: "Komentarze wyłączone",
    },

    footer: {
      copyright: "© 2025 PipeKeeper. Wszelkie prawa zastrzeżone.",
    },

    units: {
      tin: "puszka",
      tinPlural: "puszki",
      outOf5: "na 5",
    },
  },

  ja: {
    common: { loading: "読み込み中...", error: "エラー", success: "成功" },
    nav: { home: "ホーム", pipes: "パイプ", tobacco: "タバコ", following: "フォロー中" },

    ageGate: {
      title: "成人のみ",
      intendedForAdults: "PipeKeeperは成人ユーザーのみを対象としています。",
      disclaimer:
        "このアプリはパイプ愛好家向けのコレクション管理ツールです。タバコ製品の販売や購入の支援は行いません。",
      confirmAge: "私は法定年齢以上であることを確認します",
    },

    search: {
      trigger: "検索",
      openAria: "検索を開く",
      hintTitle: "入力して検索",
      hintSubtitle: "パイプ、タバコ、メーカー、形状などを検索",
      kbdNavigate: "移動",
      kbdSelect: "選択",
      kbdClose: "閉じる",
      commandDialogTitle: "検索",
      commandInputPlaceholder: "入力して検索…",
      noResultsFound: "結果が見つかりません",
      noResultsMessage: "パイプ、ブランド、ブレンド、形状で検索してみてください",
      sectionPipes: "パイプ",
      sectionTobacco: "タバコ",
      sectionQuickActions: "クイック操作",
      actionAddPipe: "新しいパイプを追加",
      actionAddBlend: "新しいブレンドを追加",
      actionViewStats: "統計を見る",
      actionExportData: "データを書き出す",
    },

    home: {
      title: "パイプ＆タバコ コレクション",
      subtitle:
        "AI検索、写真識別、ペアリング提案、市場評価でパイプとブレンドを管理します。",

      pipeCollectionTitle: "パイプコレクション",
      pipeCollectionSubtitle: "パイプを記録して評価",
      pipesInCollection: "コレクション内のパイプ",
      collectionValue: "コレクション価値",
      viewCollection: "コレクションを見る",

      tobaccoCellarTitle: "タバコ保管庫",
      tobaccoCellarSubtitle: "ブレンドを管理",
      tobaccoBlends: "タバコブレンド",
      cellared: "保管中",
      viewCellar: "保管庫を見る",
    },

    insights: {
      title: "コレクション分析",
      subtitle: "使用状況を追跡しペアリングを最適化",
      log: "使用ログ",
      pairingGrid: "ペアリング表",
      rotation: "ローテーション",
      stats: "統計",
      trends: "トレンド",
      aging: "熟成",
      reports: "レポート",
    },

    smokingLog: {
      totalBowls: "合計ボウル数",
      breakIn: "慣らし",
      logSession: "セッションを記録",
    },

    tobacconist: {
      title: "タバコ相談",
      subtitle: "パイプとタバコの個別アドバイス",
      optional: "任意",
      identify: "識別",
      optimize: "最適化",
      whatIf: "もしも",
      updatesTitle: "AI更新",
      identificationTitle: "AIパイプ識別",
      identificationSubtitle: "写真をアップロードして簡易識別",
    },

    auth: {
      loginRequired: "ログインが必要です",
    },

    community: {
      commentsEnabled: "コメント有効",
      commentsDisabled: "コメント無効",
    },

    footer: {
      copyright: "© 2025 PipeKeeper. 全著作権所有。",
    },

    units: {
      tin: "缶",
      tinPlural: "缶",
      outOf5: "5点中",
    },
  },

  'zh-Hans': {
    common: { loading: "加载中...", error: "错误", success: "成功" },
    nav: { home: "主页", pipes: "烟斗", tobacco: "烟草", following: "关注中" },

    ageGate: {
      title: "仅限成人",
      intendedForAdults: "PipeKeeper 仅面向成年用户。",
      disclaimer:
        "本应用是烟斗爱好者的收藏工具，不销售烟草制品，也不协助其购买。",
      confirmAge: "我确认已达法定年龄",
    },

    search: {
      trigger: "搜索",
      openAria: "打开搜索",
      hintTitle: "开始输入以搜索",
      hintSubtitle: "搜索烟斗、烟草、制造商、形状等",
      kbdNavigate: "导航",
      kbdSelect: "选择",
      kbdClose: "关闭",
      commandDialogTitle: "搜索",
      commandInputPlaceholder: "输入搜索烟斗、烟草、制造商…",
      noResultsFound: "未找到结果",
      noResultsMessage: "请尝试搜索烟斗、品牌、烟草混合物或形状",
      sectionPipes: "烟斗",
      sectionTobacco: "烟草",
      sectionQuickActions: "快捷操作",
      actionAddPipe: "添加烟斗",
      actionAddBlend: "添加混合物",
      actionViewStats: "查看统计",
      actionExportData: "导出数据",
    },

    home: {
      title: "烟斗与烟草收藏",
      subtitle:
        "通过AI搜索、照片识别、搭配建议和市场估价管理您的烟斗和烟草混合物。",

      pipeCollectionTitle: "烟斗收藏",
      pipeCollectionSubtitle: "追踪并评估您的烟斗",
      pipesInCollection: "收藏中的烟斗",
      collectionValue: "收藏价值",
      viewCollection: "查看收藏",

      tobaccoCellarTitle: "烟草储藏室",
      tobaccoCellarSubtitle: "管理您的混合物",
      tobaccoBlends: "烟草混合物",
      cellared: "已储藏",
      viewCellar: "查看储藏室",
    },

    insights: {
      title: "收藏分析",
      subtitle: "追踪使用情况并优化搭配",
      log: "使用日志",
      pairingGrid: "搭配表格",
      rotation: "轮换",
      stats: "统计",
      trends: "趋势",
      aging: "陈化",
      reports: "报告",
    },

    smokingLog: {
      totalBowls: "总碗数",
      breakIn: "开锅",
      logSession: "记录会话",
    },

    tobacconist: {
      title: "烟草师咨询",
      subtitle: "烟斗和烟草的个性化建议",
      optional: "可选",
      identify: "识别",
      optimize: "优化",
      whatIf: "如果…",
      updatesTitle: "AI更新",
      identificationTitle: "AI烟斗识别",
      identificationSubtitle: "上传照片以快速获取识别帮助",
    },

    auth: {
      loginRequired: "需要登录",
    },

    community: {
      commentsEnabled: "评论已启用",
      commentsDisabled: "评论已禁用",
    },

    footer: {
      copyright: "© 2025 PipeKeeper. 保留所有权利。",
    },

    units: {
      tin: "罐",
      tinPlural: "罐",
      outOf5: "满5分",
    },
  },
};

export default translations;
