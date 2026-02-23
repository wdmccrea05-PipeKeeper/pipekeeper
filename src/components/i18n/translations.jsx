// src/components/i18n/translations.jsx
/**
 * PipeKeeper i18n base translations
 *
 * IMPORTANT:
 * This file must contain the canonical EN strings (and essential ES/DE/JA strings)
 * so the UI never falls back to placeholder text like “Pipe Collection Title” or
 * “[MISSING] search.trigger”.
 *
 * The app further deep-merges `translations-complete.jsx` on top of this base.
 */

export const translations = {
  en: {
    ageGate: {
      title: "Adults Only",
      intendedForAdults: "PipeKeeper is intended for adult users only.",
      disclaimer:
        "This app is a collection management tool for pipe smoking enthusiasts. It does not sell or facilitate the purchase of tobacco products.",
      confirmAge: "I confirm I am of legal age",
    },

    termsGate: {
      beforeContinue: "Before you continue",
      reviewAccept: "Please review and accept the Terms of Service and Privacy Policy.",
      termsOfService: "Terms of Service",
      privacyPolicy: "Privacy Policy",
      agreeCheckbox: "I have read and agree to the Terms of Service and Privacy Policy.",
      acceptContinue: "Accept and Continue",
      saving: "Saving…",
      savedContinuing: "Saved. Continuing…",
      rateLimitedTemporary: "Rate-limited right now. Continuing temporarily…",
      couldntSave: "We couldn't save your acceptance. Please try again.",
      rateLimitNote:
        "If requests are rate-limited, the app may temporarily allow access to avoid loops.",
    },

    common: {
      loading: "Loading…",
      refresh: "Refresh",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      close: "Close",
      yes: "Yes",
      no: "No",
      edit: "Edit",
      add: "Add",
      back: "Back",
      done: "Done",
      apply: "Apply",
      clear: "Clear",
      reset: "Reset",
      submit: "Submit",
      update: "Update",
      create: "Create",
      remove: "Remove",
      view: "View",
      show: "Show",
      hide: "Hide",
      search: "Search",
      searchPlaceholder: "Search…",
      noResults: "No results found",
      noData: "No data available",
      appName: "PipeKeeper",
    },

    nav: {
      home: "Home",
      pipes: "Pipes",
      tobacco: "Tobacco",
      cellar: "Cellar",
      community: "Community",
      profile: "Profile",
      help: "Help",
      faq: "FAQ",
      support: "Support",
      reports: "Reports",
    },

    layout: {
      toggleMenu: "Toggle menu",
      admin: "Admin",
    },

    home: {
      heroTitle: "Pipe & Tobacco Collection",
      heroSubtitle:
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

    insights: {
      title: "Collection Insights",
      subtitle: "Track usage, optimize pairings, and monitor your collection",
      log: "Usage Log",
      pairingGrid: "Pairing Grid",
      rotation: "Rotation",
      stats: "Stats",
      trends: "Trends",
      aging: "Aging",
      reports: "Reports",
    },

    smokingLog: {
      logSession: "Log Session",
    },

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

    search: {
      trigger: "Search…",
      openAria: "Open search",
      hintTitle: "Start typing to search",
      hintSubtitle: "Search pipes, tobacco, makers, shapes, and more",
      kbdNavigate: "Navigate",
      kbdSelect: "Select",
      kbdClose: "Close",
      commandDialogTitle: "Search",
      commandInputPlaceholder: "Type to search pipes, tobacco, makers…",
      noResultsFound: "No results found",
      noResultsMessage: "Try searching for a pipe name, maker, tobacco blend, or shape",
      sectionPipes: "Pipes",
      sectionTobacco: "Tobacco",
      sectionQuickActions: "Quick Actions",
      actionAddPipe: "Add New Pipe",
      actionAddBlend: "Add New Blend",
      actionViewStats: "View Collection Stats",
      actionExportData: "Export Collection Data",
    },
  },

  es: {
    ageGate: {
      title: "Solo adultos",
      intendedForAdults: "PipeKeeper está destinado solo a usuarios adultos.",
      disclaimer:
        "Esta app es una herramienta de gestión de colecciones para aficionados a la pipa. No vende ni facilita la compra de productos de tabaco.",
      confirmAge: "Confirmo que soy mayor de edad",
    },

    termsGate: {
      beforeContinue: "Antes de continuar",
      reviewAccept: "Revisa y acepta los Términos del servicio y la Política de privacidad.",
      termsOfService: "Términos del servicio",
      privacyPolicy: "Política de privacidad",
      agreeCheckbox: "He leído y acepto los Términos del servicio y la Política de privacidad.",
      acceptContinue: "Aceptar y continuar",
      saving: "Guardando…",
      savedContinuing: "Guardado. Continuando…",
      rateLimitedTemporary: "Límite de solicitudes por ahora. Continuando temporalmente…",
      couldntSave: "No pudimos guardar tu aceptación. Inténtalo de nuevo.",
      rateLimitNote:
        "Si las solicitudes están limitadas, la app puede permitir el acceso temporalmente para evitar bucles.",
    },

    common: {
      loading: "Cargando…",
      refresh: "Actualizar",
      cancel: "Cancelar",
      save: "Guardar",
      delete: "Eliminar",
      close: "Cerrar",
      yes: "Sí",
      no: "No",
      edit: "Editar",
      add: "Agregar",
      back: "Atrás",
      done: "Listo",
      apply: "Aplicar",
      clear: "Limpiar",
      reset: "Restablecer",
      submit: "Enviar",
      update: "Actualizar",
      create: "Crear",
      remove: "Quitar",
      view: "Ver",
      show: "Mostrar",
      hide: "Ocultar",
      search: "Buscar",
      searchPlaceholder: "Buscar…",
      noResults: "No se encontraron resultados",
      noData: "No hay datos disponibles",
      appName: "PipeKeeper",
    },

    nav: {
      home: "Inicio",
      pipes: "Pipas",
      tobacco: "Tabaco",
      cellar: "Bodega",
      community: "Comunidad",
      profile: "Perfil",
      help: "Ayuda",
      faq: "FAQ",
      support: "Soporte",
      reports: "Informes",
    },

    layout: {
      toggleMenu: "Alternar menú",
      admin: "Administración",
    },

    home: {
      heroTitle: "Colección de pipas y tabaco",
      heroSubtitle:
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

    search: {
      trigger: "Buscar…",
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
  },

  de: {
    ageGate: {
      title: "Nur für Erwachsene",
      intendedForAdults: "PipeKeeper ist nur für erwachsene Nutzer bestimmt.",
      disclaimer:
        "Diese App ist ein Sammlungs-Tool für Pfeifenliebhaber. Sie verkauft keine Tabakprodukte und erleichtert deren Kauf nicht.",
      confirmAge: "Ich bestätige, dass ich volljährig bin",
    },
    search: {
      trigger: "Suchen…",
      openAria: "Suche öffnen",
      hintTitle: "Zum Suchen tippen",
      hintSubtitle: "Suche Pfeifen, Tabak, Hersteller, Formen und mehr",
      kbdNavigate: "Navigieren",
      kbdSelect: "Auswählen",
      kbdClose: "Schließen",
    },
  },

  ja: {
    ageGate: {
      title: "成人のみ",
      intendedForAdults: "PipeKeeper は成人ユーザー向けです。",
      disclaimer:
        "このアプリはパイプ愛好家向けのコレクション管理ツールです。タバコ製品の販売や購入の仲介は行いません。",
      confirmAge: "法定年齢であることを確認します",
    },
    search: {
      trigger: "検索…",
      openAria: "検索を開く",
      hintTitle: "入力して検索",
      hintSubtitle: "パイプ、タバコ、メーカー、形状などを検索",
      kbdNavigate: "移動",
      kbdSelect: "選択",
      kbdClose: "閉じる",
    },
  },
};
