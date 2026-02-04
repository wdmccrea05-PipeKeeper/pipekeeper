/**
 * Complete translation map for all locales
 * Fills all missing keys identified in audit
 */

export const translationsComplete = {
  en: {
    collectionInsights: {
      summaryTooltip: "This section summarizes patterns and totals across your collection based on the data you've entered."
    },
    smokingLog: {
      totalBowls: "{{total}} total bowls",
      breakInBowls: "{{breakIn}} break-in",
      totalBreakIn: "{{total}} break-in",
      title: "Usage Log",
      addSession: "Add Session"
    },
    blendTypes: {
      american: "American",
      aromatic: "Aromatic",
      balkan: "Balkan",
      burley: "Burley",
      burleyBased: "Burley-based",
      cavendish: "Cavendish",
      codgerBlend: "Codger Blend",
      darkFiredKentucky: "Dark Fired Kentucky",
      english: "English",
      englishAromatic: "English Aromatic",
      englishBalkan: "English Balkan",
      fullEnglishOriental: "Full English/Oriental",
      kentucky: "Kentucky",
      lakeland: "Lakeland",
      latakiaBlend: "Latakia Blend",
      navyFlake: "Navy Flake",
      orientalTurkish: "Oriental/Turkish",
      other: "Other",
      perique: "Perique",
      shag: "Shag",
      virginia: "Virginia",
      virginiaburley: "Virginia/Burley",
      virginiaoriental: "Virginia/Oriental",
      virginiaperique: "Virginia/Perique"
    },
    aiTools: {
      outOfDate: "Your collection has changed since the last optimization. Regenerate to get updated recommendations.",
      regenerate: "Regenerate",
      undo: "Undo",
      notNow: "Not Now",
      undoLastChange: "Undo Last Change"
    },
    tobaccoPage: {
      exportCSV: "Export CSV"
    },
    helpContent: {
      faqFull: {
        pageTitle: "PipeKeeper FAQ",
        pageSubtitle: "Definitions, general information, and disclaimers",
        navHowTo: "How-To Guides",
        navTroubleshooting: "Troubleshooting",
        verificationHelp: {
          q: "🔒 I can't log in / My verification code expired - What do I do?",
          intro: "If you're having trouble with email verification or login:",
          steps: [
            "Try logging in again - the system will send a new verification code automatically",
            "Check your spam/junk folder for the verification email",
            "Visit our Verification Help page for detailed instructions",
            "Contact support directly at admin@pipekeeperapp.com"
          ],
          note: "Include your email address when contacting support so we can help you quickly."
        }
      }
    }
  },
  es: {
    collectionInsights: {
      summaryTooltip: "Esta sección resume patrones y totales en tu colección según los datos que has ingresado."
    },
    smokingLog: {
      totalBowls: "{{total}} cuencos totales",
      breakInBowls: "{{breakIn}} rodaje",
      totalBreakIn: "{{total}} rodaje",
      title: "Registro de Uso",
      addSession: "Agregar Sesión"
    },
    blendTypes: {
      american: "Americano",
      aromatic: "Aromático",
      balkan: "Balcan",
      burley: "Burley",
      burleyBased: "Basado en Burley",
      cavendish: "Cavendish",
      codgerBlend: "Mezcla Codger",
      darkFiredKentucky: "Kentucky Oscuro Ahumado",
      english: "Inglés",
      englishAromatic: "Inglés Aromático",
      englishBalkan: "Inglés Balcan",
      fullEnglishOriental: "Inglés/Oriental Completo",
      kentucky: "Kentucky",
      lakeland: "Lakeland",
      latakiaBlend: "Mezcla Latakia",
      navyFlake: "Navy Flake",
      orientalTurkish: "Oriental/Turco",
      other: "Otro",
      perique: "Perique",
      shag: "Shag",
      virginia: "Virginia",
      virginiaburley: "Virginia/Burley",
      virginiaoriental: "Virginia/Oriental",
      virginiaperique: "Virginia/Perique"
    },
    aiTools: {
      outOfDate: "Tu colección ha cambiado desde la última optimización. Regenera para obtener recomendaciones actualizadas.",
      regenerate: "Regenerar",
      undo: "Deshacer",
      notNow: "Ahora No",
      undoLastChange: "Deshacer Último Cambio"
    },
    tobaccoPage: {
      exportCSV: "Exportar CSV"
    },
    pipes: { search: 'Buscar', filter: 'Filtrar', shape: 'Forma', material: 'Material', allShapes: 'Todas las formas', allMaterials: 'Todos los materiales' },
    tobacco: { allTypes: 'Todos los tipos', allStrengths: 'Todas las fuerzas', search: 'Buscar' },
    common: { loading: 'Cargando...', refresh: 'Actualizar', cancel: 'Cancelar', save: 'Guardar', delete: 'Eliminar', close: 'Cerrar', unknown: 'Desconocido', of: 'de' },
    units: { tin: 'lata', tinPlural: 'latas' },
    helpContent: {
      faqFull: {
        pageTitle: "Preguntas Frecuentes de PipeKeeper",
        pageSubtitle: "Definiciones, información general y descargos de responsabilidad",
        navHowTo: "Guías de Cómo Hacer",
        navTroubleshooting: "Solución de Problemas",
        verificationHelp: {
          q: "🔒 No puedo iniciar sesión / Mi código de verificación expiró - ¿Qué hago?",
          intro: "Si tiene problemas con la verificación de correo electrónico o inicio de sesión:",
          steps: [
            "Intente iniciar sesión nuevamente - el sistema enviará un nuevo código de verificación automáticamente",
            "Verifique su carpeta de spam/correo no deseado para el correo de verificación",
            "Visite nuestra página de Ayuda de Verificación para obtener instrucciones detalladas",
            "Póngase en contacto con el soporte directamente en admin@pipekeeperapp.com"
          ],
          note: "Incluya su dirección de correo electrónico al ponerse en contacto con el soporte para que podamos ayudarle rápidamente."
        }
      },
      tooltips: {
        collectionPatterns: "This section summarizes patterns and totals across your collection based on the data you've entered.",
        reports: "Generate exportable summaries of your collection for reference or documentation.",
        agingDashboard: "Monitor cellared tobacco and get recommendations on optimal aging times based on blend characteristics."
      }
    },
    tobacconist: {
      title: 'Tabaquista Experto',
      subtitle: 'Consulta de expertos y actualizaciones de IA',
      welcomeTitle: 'Bienvenido a tu Tabaquista Personal',
      welcomeMessage: 'Pregúntame sobre recomendaciones de pipas, maridajes de tabaco u optimización de colecciones.',
      generatePairings: 'Generar Maridajes',
      generatePairingsPrompt: 'Generar recomendaciones de maridaje para mi colección',
      runOptimization: 'Ejecutar Optimización',
      runOptimizationPrompt: 'Ejecutar análisis de optimización en mi colección',
      newConversation: 'Nueva Conversación',
      inputPlaceholder: 'Pregunta sobre maridajes, recomendaciones o tu colección...',
      chatTab: 'Chat',
      updatesTab: 'Actualizaciones de IA',
      startingConversation: 'Iniciando conversación...',
      pairingMatrix: 'Matriz de Maridaje',
      collectionOptimization: 'Optimización de Colección',
      outOfDate: 'Desactualizado - se recomienda regeneración',
      upToDate: 'Actualizado',
      undo: 'Deshacer',
      regenerate: 'Regenerar',
      breakInSchedules: 'Programas de Rodaje',
      breakInNote: 'La regeneración se maneja por pipa en la página de detalle de pipa (con deshacer/historial).'
    }
  },
  fr: {
    collectionInsights: {
      summaryTooltip: "Cette section résume les modèles et les totaux de votre collection en fonction des données saisies."
    },
    smokingLog: {
      totalBowls: "{{total}} bols au total",
      breakInBowls: "{{breakIn}} rodage",
      totalBreakIn: "{{total}} rodage",
      title: "Journal d'Utilisation",
      addSession: "Ajouter une Session"
    },
    blendTypes: {
      american: "Américain",
      aromatic: "Aromatique",
      balkan: "Balkans",
      burley: "Burley",
      burleyBased: "À base de Burley",
      cavendish: "Cavendish",
      codgerBlend: "Mélange Codger",
      darkFiredKentucky: "Kentucky Noir Fumé",
      english: "Anglais",
      englishAromatic: "Anglais Aromatique",
      englishBalkan: "Anglais Balkans",
      fullEnglishOriental: "Anglais/Oriental Complet",
      kentucky: "Kentucky",
      lakeland: "Lakeland",
      latakiaBlend: "Mélange Latakia",
      navyFlake: "Navy Flake",
      orientalTurkish: "Oriental/Turc",
      other: "Autre",
      perique: "Perique",
      shag: "Shag",
      virginia: "Virginie",
      virginiaburley: "Virginie/Burley",
      virginiaoriental: "Virginie/Oriental",
      virginiaperique: "Virginie/Perique"
    },
    aiTools: {
      outOfDate: "Votre collection a changé depuis la dernière optimisation. Régénérez pour obtenir des recommandations mises à jour.",
      regenerate: "Régénérer",
      undo: "Annuler",
      notNow: "Pas Maintenant",
      undoLastChange: "Annuler la Dernière Modification"
    },
    tobaccoPage: {
      exportCSV: "Exporter CSV"
    },
    pipes: { search: 'Rechercher', filter: 'Filtrer', shape: 'Forme', material: 'Matériau', allShapes: 'Toutes les formes', allMaterials: 'Tous les matériaux' },
    tobacco: { allTypes: 'Tous les types', allStrengths: 'Toutes les puissances', search: 'Rechercher' },
    common: { loading: 'Chargement...', refresh: 'Rafraîchir', cancel: 'Annuler', save: 'Enregistrer', delete: 'Supprimer', close: 'Fermer', unknown: 'Inconnu', of: 'de' },
    units: { tin: 'boîte', tinPlural: 'boîtes' },
    helpContent: {
      faqFull: {
        pageTitle: "FAQ de PipeKeeper",
        pageSubtitle: "Définitions, informations générales et avis de non-responsabilité",
        navHowTo: "Guides Comment Faire",
        navTroubleshooting: "Dépannage",
        verificationHelp: {
          q: "🔒 Je ne peux pas me connecter / Mon code de vérification a expiré - Que faire?",
          intro: "Si vous avez des problèmes de vérification d'e-mail ou de connexion:",
          steps: [
            "Essayez de vous reconnecter - le système enverra un nouveau code de vérification automatiquement",
            "Consultez votre dossier spam/indésirables pour l'e-mail de vérification",
            "Visitez notre page d'aide à la vérification pour des instructions détaillées",
            "Contactez le support directement à admin@pipekeeperapp.com"
          ],
          note: "Incluez votre adresse e-mail lorsque vous contactez le support afin que nous puissions vous aider rapidement."
        }
      }
    },
    tobacconist: {
      title: 'Maître Tabaccologue',
      subtitle: 'Consultation d\'expert et mises à jour IA',
      welcomeTitle: 'Bienvenue chez votre Tabaccologue Personnel',
      welcomeMessage: 'Posez-moi des questions sur les recommandations de pipes, les accords de tabac ou l\'optimisation de votre collection.',
      generatePairings: 'Générer des Accords',
      generatePairingsPrompt: 'Générer des recommandations d\'accords pour ma collection',
      runOptimization: 'Exécuter l\'Optimisation',
      runOptimizationPrompt: 'Exécuter une analyse d\'optimisation sur ma collection',
      newConversation: 'Nouvelle Conversation',
      inputPlaceholder: 'Posez des questions sur les accords, les recommandations ou votre collection...',
      chatTab: 'Chat',
      updatesTab: 'Mises à Jour IA',
      startingConversation: 'Lancement de la conversation...',
      pairingMatrix: 'Matrice d\'Accords',
      collectionOptimization: 'Optimisation de Collection',
      outOfDate: 'Obsolète - régénération recommandée',
      upToDate: 'À jour',
      undo: 'Annuler',
      regenerate: 'Régénérer',
      breakInSchedules: 'Calendriers de Rodage',
      breakInNote: 'La régénération est gérée par pipe sur la page de détail de pipe (avec annulation/historique).'
    }
  },
  de: {
    collectionInsights: {
      summaryTooltip: "Dieser Abschnitt fasst Muster und Gesamtwerte Ihrer Sammlung zusammen."
    },
    smokingLog: {
      totalBowls: "{{total}} Schüsseln gesamt",
      breakInBowls: "{{breakIn}} Einrauchung",
      totalBreakIn: "{{total}} Einrauchung",
      title: "Verwendungsprotokoll",
      addSession: "Sitzung Hinzufügen"
    },
    blendTypes: {
      american: "Amerikanisch",
      aromatic: "Aromatisch",
      balkan: "Balkan",
      burley: "Burley",
      burleyBased: "Burley-basiert",
      cavendish: "Cavendish",
      codgerBlend: "Codger-Mischung",
      darkFiredKentucky: "Dunkel geräuchertes Kentucky",
      english: "Englisch",
      englishAromatic: "Englisch Aromatisch",
      englishBalkan: "Englisch Balkan",
      fullEnglishOriental: "Vollständig Englisch/Orientalisch",
      kentucky: "Kentucky",
      lakeland: "Lakeland",
      latakiaBlend: "Latakia-Mischung",
      navyFlake: "Navy Flake",
      orientalTurkish: "Orientalisch/Türkisch",
      other: "Sonstiges",
      perique: "Perique",
      shag: "Shag",
      virginia: "Virginia",
      virginiaburley: "Virginia/Burley",
      virginiaoriental: "Virginia/Orientalisch",
      virginiaperique: "Virginia/Perique"
    },
    aiTools: {
      outOfDate: "Ihre Sammlung hat sich seit der letzten Optimierung geändert. Regenerieren Sie, um aktualisierte Empfehlungen zu erhalten.",
      regenerate: "Neu Generieren",
      undo: "Rückgängig",
      notNow: "Nicht Jetzt",
      undoLastChange: "Letzte Änderung Rückgängig Machen"
    },
    tobaccoPage: {
      exportCSV: "CSV Exportieren"
    },
    pipes: { search: 'Suchen', filter: 'Filtern', shape: 'Form', material: 'Material', allShapes: 'Alle Formen', allMaterials: 'Alle Materialien' },
    tobacco: { allTypes: 'Alle Typen', allStrengths: 'Alle Stärken', search: 'Suchen' },
    common: { loading: 'Lädt...', refresh: 'Aktualisieren', cancel: 'Abbrechen', save: 'Speichern', delete: 'Löschen', close: 'Schließen', unknown: 'Unbekannt', of: 'von' },
    units: { tin: 'Dose', tinPlural: 'Dosen' },
    helpContent: {
      faqFull: {
        pageTitle: "PipeKeeper Häufig Gestellte Fragen",
        pageSubtitle: "Definitionen, allgemeine Informationen und Haftungsausschlüsse",
        navHowTo: "Anleitungen",
        navTroubleshooting: "Fehlerbehebung",
        verificationHelp: {
          q: "🔒 Ich kann mich nicht anmelden / Mein Verifizierungscode ist abgelaufen - Was soll ich tun?",
          intro: "Wenn Sie Probleme bei der E-Mail-Verifizierung oder Anmeldung haben:",
          steps: [
            "Versuchen Sie sich erneut anzumelden - das System sendet automatisch einen neuen Verifizierungscode",
            "Überprüfen Sie Ihren Spam-/Junk-Ordner auf die Verifizierungs-E-Mail",
            "Besuchen Sie unsere Verifizierungshilfseite für detaillierte Anweisungen",
            "Kontaktieren Sie den Support direkt unter admin@pipekeeperapp.com"
          ],
          note: "Geben Sie Ihre E-Mail-Adresse an, wenn Sie den Support kontaktieren, damit wir Ihnen schnell helfen können."
        }
      }
    },
    tobacconist: {
      title: 'Meister Tabakkenner',
      subtitle: 'Expertenberatung und KI-Updates',
      welcomeTitle: 'Willkommen bei Ihrem persönlichen Tabakkenner',
      welcomeMessage: 'Fragen Sie mich nach Pfeifenempfehlungen, Tabakpaarungen oder Sammlungsoptimierung.',
      generatePairings: 'Paarungen Generieren',
      generatePairingsPrompt: 'Generieren Sie Paarungsempfehlungen für meine Sammlung',
      runOptimization: 'Optimierung Ausführen',
      runOptimizationPrompt: 'Führen Sie eine Optimierungsanalyse meiner Sammlung durch',
      newConversation: 'Neues Gespräch',
      inputPlaceholder: 'Fragen Sie nach Paarungen, Empfehlungen oder Ihrer Sammlung...',
      chatTab: 'Chat',
      updatesTab: 'KI-Updates',
      startingConversation: 'Starten des Gesprächs...',
      pairingMatrix: 'Paarungsmatrix',
      collectionOptimization: 'Sammlungsoptimierung',
      outOfDate: 'Veraltet - Neugenerierung empfohlen',
      upToDate: 'Aktuell',
      undo: 'Rückgängig',
      regenerate: 'Neu Generieren',
      breakInSchedules: 'Einrauchpläne',
      breakInNote: 'Die Neugenerierung wird pro Pfeife auf der Pfeifendetailseite verwaltet (mit Rückgängig/Verlauf).'
    }
  },
  it: {
    pipes: { search: 'Cerca', filter: 'Filtro', shape: 'Forma', material: 'Materiale', allShapes: 'Tutte le forme', allMaterials: 'Tutti i materiali' },
    tobacco: { allTypes: 'Tutti i tipi', allStrengths: 'Tutte le intensità', search: 'Cerca' },
    common: { loading: 'Caricamento...', refresh: 'Aggiorna', cancel: 'Annulla', save: 'Salva', delete: 'Elimina', close: 'Chiudi', unknown: 'Sconosciuto', of: 'di' },
    units: { tin: 'scatola', tinPlural: 'scatole' },
    helpContent: {
      faqFull: {
        pageTitle: "Domande Frequenti su PipeKeeper",
        pageSubtitle: "Definizioni, informazioni generali e clausole di esonero",
        navHowTo: "Guide Pratiche",
        navTroubleshooting: "Risoluzione dei Problemi",
        verificationHelp: {
          q: "🔒 Non riesco ad accedere / Il mio codice di verifica è scaduto - Cosa faccio?",
          intro: "Se hai problemi con la verifica e-mail o l'accesso:",
          steps: [
            "Prova ad accedere di nuovo - il sistema invierà automaticamente un nuovo codice di verifica",
            "Controlla la cartella spam/posta indesiderata per l'e-mail di verifica",
            "Visita la nostra pagina di aiuto per la verifica per le istruzioni dettagliate",
            "Contatta il supporto direttamente a admin@pipekeeperapp.com"
          ],
          note: "Includi il tuo indirizzo e-mail quando contatti il supporto in modo da potervi aiutare rapidamente."
        }
      }
    },
    tobacconist: {
      title: 'Maestro Tabaccaio',
      subtitle: 'Consulenza di esperti e aggiornamenti IA',
      welcomeTitle: 'Benvenuto nel Tuo Tabaccaio Personale',
      welcomeMessage: 'Chiedimi consigli sulle pipe, abbinamenti di tabacco o ottimizzazione della collezione.',
      generatePairings: 'Genera Abbinamenti',
      generatePairingsPrompt: 'Genera raccomandazioni di abbinamenti per la mia collezione',
      runOptimization: 'Esegui Ottimizzazione',
      runOptimizationPrompt: 'Esegui analisi di ottimizzazione sulla mia collezione',
      newConversation: 'Nuova Conversazione',
      inputPlaceholder: 'Fai domande su abbinamenti, consigli o la tua collezione...',
      chatTab: 'Chat',
      updatesTab: 'Aggiornamenti IA',
      startingConversation: 'Avvio della conversazione...',
      pairingMatrix: 'Matrice di Abbinamenti',
      collectionOptimization: 'Ottimizzazione Collezione',
      outOfDate: 'Non aggiornato - rigenerazione consigliata',
      upToDate: 'Aggiornato',
      undo: 'Annulla',
      regenerate: 'Rigenera',
      breakInSchedules: 'Programmi di Rodaggio',
      breakInNote: 'La rigenerazione è gestita per pipe nella pagina dei dettagli della pipe (con annulla/cronologia).'
    }
  },
  'pt-BR': {
    pipes: { search: 'Pesquisar', filter: 'Filtrar', shape: 'Forma', material: 'Material', allShapes: 'Todas as formas', allMaterials: 'Todos os materiais' },
    tobacco: { allTypes: 'Todos os tipos', allStrengths: 'Todas as potências', search: 'Pesquisar' },
    common: { loading: 'Carregando...', refresh: 'Atualizar', cancel: 'Cancelar', save: 'Salvar', delete: 'Excluir', close: 'Fechar', unknown: 'Desconhecido', of: 'de' },
    units: { tin: 'lata', tinPlural: 'latas' },
    helpContent: {
      faqFull: {
        pageTitle: "Perguntas Frequentes do PipeKeeper",
        pageSubtitle: "Definições, informações gerais e isenções de responsabilidade",
        navHowTo: "Guias Práticos",
        navTroubleshooting: "Solução de Problemas",
        verificationHelp: {
          q: "🔒 Não consigo fazer login / Meu código de verificação expirou - O que faço?",
          intro: "Se você está tendo problemas com verificação de e-mail ou login:",
          steps: [
            "Tente fazer login novamente - o sistema enviará um novo código de verificação automaticamente",
            "Verifique sua pasta de spam/lixo para o e-mail de verificação",
            "Visite nossa página de Ajuda de Verificação para instruções detalhadas",
            "Entre em contato com o suporte diretamente em admin@pipekeeperapp.com"
          ],
          note: "Inclua seu endereço de e-mail ao entrar em contato com o suporte para que possamos ajudá-lo rapidamente."
        }
      }
    },
    tobacconist: {
      title: 'Mestre Tabacário',
      subtitle: 'Consultoria de especialistas e atualizações de IA',
      welcomeTitle: 'Bem-vindo ao Seu Tabacário Pessoal',
      welcomeMessage: 'Pergunte-me sobre recomendações de cachimbos, combinações de tabaco ou otimização de coleção.',
      generatePairings: 'Gerar Combinações',
      generatePairingsPrompt: 'Gerar recomendações de combinações para minha coleção',
      runOptimization: 'Executar Otimização',
      runOptimizationPrompt: 'Execute análise de otimização na minha coleção',
      newConversation: 'Nova Conversa',
      inputPlaceholder: 'Faça perguntas sobre combinações, recomendações ou sua coleção...',
      chatTab: 'Chat',
      updatesTab: 'Atualizações de IA',
      startingConversation: 'Iniciando conversa...',
      pairingMatrix: 'Matriz de Combinações',
      collectionOptimization: 'Otimização de Coleção',
      outOfDate: 'Desatualizado - regeneração recomendada',
      upToDate: 'Atualizado',
      undo: 'Desfazer',
      regenerate: 'Regenerar',
      breakInSchedules: 'Cronogramas de Amaciamento',
      breakInNote: 'A regeneração é feita por cachimbo na página de detalhes do cachimbo (com desfazer/histórico).'
    }
  },
  nl: {
    pipes: { search: 'Zoeken', filter: 'Filteren', shape: 'Vorm', material: 'Materiaal', allShapes: 'Alle vormen', allMaterials: 'Alle materialen' },
    tobacco: { allTypes: 'Alle typen', allStrengths: 'Alle sterktes', search: 'Zoeken' },
    common: { loading: 'Bezig met laden...', refresh: 'Vernieuwen', cancel: 'Annuleren', save: 'Opslaan', delete: 'Verwijderen', close: 'Sluiten', unknown: 'Onbekend', of: 'van' },
    units: { tin: 'blik', tinPlural: 'blikken' },
    helpContent: {
      faqFull: {
        pageTitle: "PipeKeeper Veelgestelde Vragen",
        pageSubtitle: "Definities, algemene informatie en disclaimers",
        navHowTo: "Handleidingen",
        navTroubleshooting: "Probleemoplossing",
        verificationHelp: {
          q: "🔒 Ik kan niet inloggen / Mijn verificatiecode is verlopen - Wat moet ik doen?",
          intro: "Als u problemen ondervindt met e-mailverificatie of inloggen:",
          steps: [
            "Probeer opnieuw in te loggen - het systeem verzendt automatisch een nieuwe verificatiecode",
            "Controleer uw map voor ongewenste e-mail op de verificatie-e-mail",
            "Bezoek onze verificatiehulpagina voor gedetailleerde instructies",
            "Neem rechtstreeks contact op met ondersteuning op admin@pipekeeperapp.com"
          ],
          note: "Voeg uw e-mailadres toe wanneer u contact opneemt met ondersteuning, zodat we u snel kunnen helpen."
        }
      }
    },
    tobacconist: {
      title: 'Meesterbesteller',
      subtitle: 'Deskundig advies en AI-updates',
      welcomeTitle: 'Welkom bij uw Persoonlijke Besteller',
      welcomeMessage: 'Vraag mij om pipenaanbevelingen, tabaksparingen of optimalisatie van verzamelingen.',
      generatePairings: 'Paarverificaties Genereren',
      generatePairingsPrompt: 'Genereer paaringsaanbevelingen voor mijn collectie',
      runOptimization: 'Optimalisatie Uitvoeren',
      runOptimizationPrompt: 'Voer optimalisatieanalyse uit op mijn verzameling',
      newConversation: 'Nieuw Gesprek',
      inputPlaceholder: 'Stel vragen over paarverificaties, aanbevelingen of uw verzameling...',
      chatTab: 'Chat',
      updatesTab: 'AI-updates',
      startingConversation: 'Gesprek starten...',
      pairingMatrix: 'Paaringsmatrix',
      collectionOptimization: 'Verzamelingsoptimalisatie',
      outOfDate: 'Verouderd - regeneratie aanbevolen',
      upToDate: 'Actueel',
      undo: 'Ongedaan Maken',
      regenerate: 'Opnieuw Genereren',
      breakInSchedules: 'Inrij-schema\'s',
      breakInNote: 'Regeneratie wordt per pijp op de pijpdetailpagina afgehandeld (met ongedaan maken/geschiedenis).'
    }
  },
  pl: {
    pipes: { search: 'Szukaj', filter: 'Filtruj', shape: 'Kształt', material: 'Materiał', allShapes: 'Wszystkie kształty', allMaterials: 'Wszystkie materiały' },
    tobacco: { allTypes: 'Wszystkie typy', allStrengths: 'Wszystkie moce', search: 'Szukaj' },
    common: { loading: 'Ładowanie...', refresh: 'Odśwież', cancel: 'Anuluj', save: 'Zapisz', delete: 'Usuń', close: 'Zamknij', unknown: 'Nieznany', of: 'z' },
    units: { tin: 'puszka', tinPlural: 'puszki' },
    helpContent: {
      faqFull: {
        pageTitle: "Pytania Часто Zadawane PipeKeeper",
        pageSubtitle: "Definicje, informacje ogólne i zastrzeżenia",
        navHowTo: "Przewodniki",
        navTroubleshooting: "Rozwiązywanie Problemów",
        verificationHelp: {
          q: "🔒 Nie mogę się zalogować / Mój kod weryfikacyjny wygasł - Co robić?",
          intro: "Jeśli masz problemy z weryfikacją e-mail lub logowaniem:",
          steps: [
            "Spróbuj zalogować się ponownie - system automatycznie wyśle nowy kod weryfikacyjny",
            "Sprawdź folder spam/niechcianych wiadomości w poszukiwaniu e-maila weryfikacyjnego",
            "Odwiedź naszą stronę pomocy weryfikacji, aby uzyskać szczegółowe instrukcje",
            "Skontaktuj się z obsługą bezpośrednio na admin@pipekeeperapp.com"
          ],
          note: "Podaj swój adres e-mail podczas kontaktowania się z obsługą, abyśmy mogli Ci szybko pomóc."
        }
      }
    },
    tobacconist: {
      title: 'Mistrz Tytoniowy',
      subtitle: 'Porada ekspertów i aktualizacje AI',
      welcomeTitle: 'Witaj w Twojej Osobistej Kancelarii Tytoniowej',
      welcomeMessage: 'Zapytaj mnie o rekomendacje pipa, połączenia tytoniu lub optymalizację kolekcji.',
      generatePairings: 'Generuj Połączenia',
      generatePairingsPrompt: 'Generuj rekomendacje połączeń dla mojej kolekcji',
      runOptimization: 'Uruchom Optymalizację',
      runOptimizationPrompt: 'Uruchom analizę optymalizacji mojej kolekcji',
      newConversation: 'Nowa Rozmowa',
      inputPlaceholder: 'Zadaj pytania dotyczące połączeń, rekomendacji lub Twojej kolekcji...',
      chatTab: 'Chat',
      updatesTab: 'Aktualizacje AI',
      startingConversation: 'Rozpoczynanie rozmowy...',
      pairingMatrix: 'Macierz Połączeń',
      collectionOptimization: 'Optymalizacja Kolekcji',
      outOfDate: 'Nieaktualne - zalecana regeneracja',
      upToDate: 'Aktualne',
      undo: 'Cofnij',
      regenerate: 'Regeneruj',
      breakInSchedules: 'Harmonogramy Przećwiczenia',
      breakInNote: 'Regeneracja jest obsługiwana dla każdego pipa na stronie szczegółów pipa (z cofnięciem/historią).'
    }
  },
  ja: {
    pipes: { search: '検索', filter: 'フィルター', shape: '形状', material: '素材', allShapes: 'すべての形状', allMaterials: 'すべての素材' },
    tobacco: { allTypes: 'すべてのタイプ', allStrengths: 'すべての強度', search: '検索' },
    common: { loading: '読み込み中...', refresh: '更新', cancel: 'キャンセル', save: '保存', delete: '削除', close: '閉じる', unknown: '不明', of: 'の' },
    units: { tin: '缶', tinPlural: '缶' },
    helpContent: {
      faqFull: {
        pageTitle: "PipeKeeper よくある質問",
        pageSubtitle: "定義、一般情報、および免責事項",
        navHowTo: "ハウツーガイド",
        navTroubleshooting: "トラブルシューティング",
        verificationHelp: {
          q: "🔒 ログインできません / 確認コードの有効期限が切れました - どうすればいいですか?",
          intro: "メール確認またはログインに問題がある場合:",
          steps: [
            "もう一度ログインしてください - システムが自動的に新しい確認コードを送信します",
            "確認メールのスパム/迷惑メールフォルダをチェックしてください",
            "詳細な手順については、確認ヘルプページにアクセスしてください",
            "admin@pipekeeperapp.com でサポートに直接お問い合わせください"
          ],
          note: "サポートにお問い合わせの際は、メールアドレスを含めてください。迅速にお手伝いできます。"
        }
      }
    },
    tobacconist: {
      title: 'マスター・タバコニスト',
      subtitle: 'エキスパート・コンサルテーション & AI アップデート',
      welcomeTitle: 'あなたの個人的なタバコニストへようこそ',
      welcomeMessage: 'パイプの推奨、タバコのペアリング、またはコレクション最適化についてお聞きください。',
      generatePairings: 'ペアリングを生成',
      generatePairingsPrompt: 'コレクションのペアリング推奨を生成',
      runOptimization: '最適化を実行',
      runOptimizationPrompt: 'コレクションの最適化分析を実行',
      newConversation: '新しい会話',
      inputPlaceholder: 'ペアリング、推奨、またはコレクションについて質問してください...',
      chatTab: 'チャット',
      updatesTab: 'AI アップデート',
      startingConversation: '会話を開始中...',
      pairingMatrix: 'ペアリングマトリックス',
      collectionOptimization: 'コレクション最適化',
      outOfDate: '期限切れ - 再生成推奨',
      upToDate: '最新',
      undo: '元に戻す',
      regenerate: '再生成',
      breakInSchedules: 'ブレイク・イン スケジュール',
      breakInNote: '再生成はパイプ詳細ページでパイプごとに処理されます (取り消し/履歴付き)。'
    }
  },
  'zh-Hans': {
    pipes: { search: '搜索', filter: '筛选', shape: '形状', material: '材料', allShapes: '所有形状', allMaterials: '所有材料' },
    tobacco: { allTypes: '所有类型', allStrengths: '所有强度', search: '搜索' },
    common: { loading: '加载中...', refresh: '刷新', cancel: '取消', save: '保存', delete: '删除', close: '关闭', unknown: '未知', of: '的' },
    units: { tin: '罐', tinPlural: '罐' },
    helpContent: {
      faqFull: {
        pageTitle: "PipeKeeper 常见问题",
        pageSubtitle: "定义、一般信息和免责声明",
        navHowTo: "操作指南",
        navTroubleshooting: "故障排除",
        verificationHelp: {
          q: "🔒 我无法登录 / 我的验证代码已过期 - 我该怎么办?",
          intro: "如果您在电子邮件验证或登录时遇到问题:",
          steps: [
            "尝试重新登录 - 系统将自动发送新的验证码",
            "检查您的垃圾邮件/垃圾邮件文件夹中是否有验证电子邮件",
            "访问我们的验证帮助页面获取详细说明",
            "直接通过 admin@pipekeeperapp.com 联系支持"
          ],
          note: "联系支持时请附上您的电子邮件地址，以便我们为您提供快速帮助。"
        }
      }
    },
    tobacconist: {
      title: '烟草大师',
      subtitle: '专家咨询和AI更新',
      welcomeTitle: '欢迎来到您的个人烟草商',
      welcomeMessage: '询问我关于烟斗推荐、烟草配对或收集优化的问题。',
      generatePairings: '生成配对',
      generatePairingsPrompt: '为我的收集生成配对建议',
      runOptimization: '运行优化',
      runOptimizationPrompt: '对我的收集运行优化分析',
      newConversation: '新对话',
      inputPlaceholder: '询问关于配对、建议或您的收集的问题...',
      chatTab: '聊天',
      updatesTab: 'AI更新',
      startingConversation: '启动对话中...',
      pairingMatrix: '配对矩阵',
      collectionOptimization: '收集优化',
      outOfDate: '过期-建议重新生成',
      upToDate: '最新的',
      undo: '撤销',
      regenerate: '重新生成',
      breakInSchedules: '磨合时间表',
      breakInNote: '重新生成由烟斗详细信息页面上的每根烟斗处理(带撤销/历史记录)。'
    }
  }
};