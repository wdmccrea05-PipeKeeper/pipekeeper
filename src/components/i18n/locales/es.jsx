// Spanish Translations

const translations = {
    auth: {
        loginRequired: 'Se requiere inicio de sesión',
    },
    nav: {
        following: 'Siguiendo',
    },
    community: {
        commentsEnabled: 'Comentarios habilitados',
        commentsDisabled: 'Comentarios deshabilitados',
    },
    footer: {
        copyright: 'Derechos de autor © 2026',
    },
    units: {
        tin: 'lata',
        tinPlural: 'latas',
        outOf5: 'de 5',
    },

  subscription: {
    free: "Gratis",
    premium: "Premium",
    pro: "Pro"
  },

  helpCenter: {
    faqDesc: "Definiciones, información general y avisos",
    howToDesc: "Respuestas rápidas con rutas de navegación claras",
    troubleshootingDesc: "Problemas comunes y soluciones",
    topicGeneral: "General",
    topicGettingStarted: "Comenzando",
    topicFieldDefinitions: "Definiciones de campos",
    topicTobaccoValuation: "Valoración de tabaco",
    topicFeaturesAndTools: "Características y herramientas",
    topicPlansAndSubscriptions: "Planes y suscripciones",
    topicAccountsAndData: "Cuentas y datos",
    topicAI: "Características de IA y precisión",
    topicSupport: "Soporte",
    topicManagingCollection: "Administrar su colección",
    topicAITools: "Herramientas de IA",
    topicSubscriptions: "Suscripciones",
    topicTroubleshooting: "Solución de problemas",
    topicPageRefresh: "Actualización de página y problemas de caché",
    topicAIFeatures: "Características de IA y generación",
    topicBlendTypes: "Clasificación de mezclas de tabaco",
    topicSpecialization: "Enfoque y especialización de pipas",
    topicProFeatures: "Características Pro",
    topicAppFunctions: "Funciones generales de la aplicación"
  },

  aiUpdates: {
    description: "Actualice y regenere automáticamente matrices de emparejamiento, optimización de colecciones, clasificaciones de mezclas y medidas de pipas usando IA. Disponible para usuarios Premium heredados o nivel Pro.",
    pairingsUpToDate: "Los emparejamientos ya están actualizados",
    alreadyUpToDate: "Ya está actualizado",
    regenerateSuccess: "Regenerado exitosamente",
    regenerateFailed: "Fallo al regenerar",
    outOfDate: "Desactualizado - Se recomienda regeneración"
  },

  inviteFull: {
    pageTitle: "Invitar amigos a PipeKeeper",
    pageSubtitle: "Comparte PipeKeeper con otros entusiastas de las pipas y construye tu comunidad.",
    backToHome: "Volver al inicio",
    emailLabel: "Direcciones de correo electrónico de amigos",
    emailPlaceholder: "amigo@ejemplo.com",
    addAnother: "Agregar otro correo electrónico",
    personalMessage: "Mensaje personal (opcional)",
    messagePlaceholder: "Agrega una nota personal a tu invitación...",
    sendInvitations: "Enviar invitaciones",
    sending: "Enviando invitaciones...",
    successTitle: "¡Invitaciones enviadas!",
    successMessage: "Tus amigos recibirán sus correos de invitación en breve.",
    inviteMore: "Invitar más amigos"
  },

  supportFull: {
    backToHome: "Volver al inicio",
    requestSubmitted: "¡Solicitud enviada!",
    thankYou: "Gracias por contactarnos. Te responderemos lo antes posible.",
    submitAnother: "Enviar otra solicitud",
    contactSupport: "Contactar soporte",
    description: "¿Tienes una pregunta o necesitas ayuda? Envíanos un mensaje y te responderemos pronto.",
    emailVerifIssues: "¿Problemas con la verificación de correo electrónico?",
    verificationHelp: "Si tienes problemas con la verificación de correo electrónico o no puedes iniciar sesión, contáctanos directamente en:",
    adminEmail: "admin@pipekeeperapp.com",
    whatCanWeHelp: "¿En qué podemos ayudarte?",
    selectTopic: "Selecciona un tema...",
    yourName: "Tu nombre",
    namePlaceholder: "Juan Pérez",
    yourEmail: "Tu correo electrónico",
    emailPlaceholder: "juan@ejemplo.com",
    message: "Mensaje",
    messagePlaceholder: "Por favor describe tu pregunta o problema en detalle...",
    sending: "Enviando...",
    sendMessage: "Enviar mensaje",
    bulkLogoLink: "→ Herramienta de carga masiva de logos",
    topicGeneral: "Solicitud de soporte general",
    topicAccount: "Problemas de cuenta",
    topicFeature: "Sugerencia de característica",
    topicError: "Reportar un error",
    topicBilling: "Pregunta de facturación",
    topicTechnical: "Problema técnico",
    topicOther: "Otro"
  },

  faqExtended: {
    appleTitle: "Preguntas Frecuentes",
    appleDesc: "Todo lo que necesitas saber sobre PipeKeeper para iOS",
    whatIsApp: "¿Qué es PipeKeeper?",
    whatIsAppAnswer: "PipeKeeper es una aplicación completa de gestión de colecciones de pipas y tabaco para entusiastas de las pipas. Rastrea tus pipas, gestiona tu bodega de tabaco, registra tus sesiones de fumado y obtén recomendaciones impulsadas por IA.",
    notRecommendations: "Esta aplicación proporciona herramientas de organización y no hace recomendaciones de salud o estilo de vida.",
    whatCanDo: "¿Qué puedo hacer con PipeKeeper?",
    whatCanDoList1: "Catalogar tu colección de pipas con especificaciones detalladas",
    whatCanDoList2: "Rastrear el inventario de tu bodega de tabaco y horarios de envejecimiento",
    whatCanDoList3: "Registrar sesiones de fumado y rastrear el uso de cazoletas",
    whatCanDoList4: "Obtener sugerencias de emparejamiento pipa-tabaco impulsadas por IA",
    whatCanDoList5: "Optimizar tu colección según tus preferencias",
    whyMissingFeatures: "¿Por qué algunas funciones no están disponibles?",
    whyMissingFeaturesAnswer: "Ciertas funciones sociales y de IA no están disponibles actualmente en la versión de iOS debido a las directrices de la plataforma. Estamos trabajando para llevar más funciones a los usuarios de iOS mientras mantenemos el cumplimiento.",
    whatAreTiers: "¿Cuáles son los niveles de suscripción?",
    freeTierDesc: "Gestión básica de colecciones y registro",
    premiumTierDesc: "Recomendaciones de IA, pipas/tabaco ilimitados, funciones avanzadas",
    proTierDesc: "Todas las funciones Premium más valoración de IA e información del mercado (lanzamiento {{date}})",
    earlySubscriberNote: "Nota: Los suscriptores tempranos que se unan antes del {{date}} reciben beneficios de miembro fundador de por vida.",
    howGetSupport: "¿Cómo obtengo soporte?",
    howGetSupportAnswer: "Visita la página de Soporte en el menú de la aplicación o envíanos un correo electrónico directamente para obtener ayuda con cualquier pregunta o problema."
  },

  optimizer: {
    wellMatchedBlends: "Mezclas bien emparejadas",
    unmatchedBlends: "Mezclas sin coincidencia",
    coverageRate: "Tasa de cobertura",
    redundancies: "Redundancias de especialización",
    purchaseSuggestions: "Adquisiciones sugeridas",
    avgScoreImprovement: "mejora promedio de puntuación",
    fillsGapFor: "Cubre la brecha",
  },

  insights: {
    reportsTooltip: "Genera resúmenes exportables de tu colección para referencia o documentación.",
    agingTooltip: "Monitorea el tabaco en bodega y obtén recomendaciones sobre tiempos de envejecimiento óptimos según las características de la mezcla.",
  },

export default translations;