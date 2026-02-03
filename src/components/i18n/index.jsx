import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

/**
 * IMPORTANT:
 * - pk_lang is the single source of truth
 * - normalizeLng maps browser languages to our supported set
 */

import { translationsExtended } from './translations-extended';

const SUPPORTED = ["en","es","fr","de","it","pt-BR","nl","pl","ja","zh-Hans"];

// --- Merge base + extended translations ---
const mergeTranslations = () => {
  const merged = {};
  SUPPORTED.forEach(lng => {
    merged[lng] = {
      common: {
        ...resources[lng]?.common,
        ...translationsExtended[lng]?.common
      }
    };
  });
  return merged;
};

// --- Translations (keep concise; expand over time) ---
const resources = {
  en: { common: {
    nav: { home:"Home", pipes:"Pipes", tobacco:"Tobacco", cellar:"Cellar", community:"Community", profile:"Profile", help:"Help", faq:"FAQ", support:"Support", terms:"Terms", privacy:"Privacy" },
    subscription: { title:"Subscription", manage:"Manage subscription", subscribe:"Subscribe", continueFree:"Continue Free",
      trialEndedTitle:"Your free trial has ended",
      trialEndedBody:"To continue using Premium features, please start a subscription. You can keep using free collection features anytime.",
      continueWithPremium:"Continue with Premium",
      upgradeNow:"Upgrade Now",
      startsAfterTrial:"Starts after your 7-day Premium access ends. Cancel anytime.",
      renewsAuto:"Renews automatically. Cancel anytime.",
      managedThrough:"Managed through Apple",
      dataNotAffected:"Your data is never affected",
      premiumActive:"Premium active",
      premiumActiveSubtextTrial:"You have full access to Premium tools.",
      premiumActiveSubtextPaid:"Your Premium tools are active.",
      annualSavings:"Annual saves compared to monthly."
    },
    common: { loading:"Loading…", save:"Save", cancel:"Cancel", close:"Close" },
    empty: {
      pairingNoPipes:"Pairing recommendations require pipes and tobacco",
      pairingAction:"Track which pipes work best with which blends",
      usageLogNoPipes:"Usage history requires pipes and tobacco",
      usageLogAction:"Track which pipes you use with which blends to build recommendations",
      rotationNoPipes:"Rotation planner requires pipes in your collection",
      rotationAction:"Track rest periods and optimize pipe health with usage rotation",
      agingNoBlends:"Aging dashboard requires tobacco in your cellar",
      agingAction:"Track time cellared and optimal aging recommendations",
      identifyNoData:"AI identification works once you have items to analyze",
      optimizeNoPipes:"Optimization requires pipes in your collection",
      whatIfNoData:"What-if scenarios require pipes and tobacco data"
    },
    docs: {
      tobaccoValuation: {
        title: "Tobacco Valuation",
        manualValue: "Manual Market Value",
        costBasis: "Cost Basis",
        aiValuation: "AI Assisted Valuation",
        runAI: "Run AI Valuation",
        estimatedValue: "Estimated Value (per oz)",
        estimatedRange: "Estimated Range",
        confidence: "Confidence",
        evidenceSources: "Evidence Sources",
        projections: "Predictive Value Projections",
        projection12m: "Estimated Projection (12 months)",
        projection36m: "Estimated Projection (36 months)",
        lastUpdated: "Last updated",
        disclaimer: "AI-assisted estimate based on public listings. Not a guarantee.",
        upgradePro: "Upgrade to Pro to unlock AI-assisted valuation and predictive insights.",
        premiumOnly: "Premium",
        proOnly: "Pro",
      },
    },
  }},
  es: { common: {
    nav: { home:"Inicio", pipes:"Pipas", tobacco:"Tabaco", cellar:"Bodega", community:"Comunidad", profile:"Perfil", help:"Ayuda", faq:"Preguntas frecuentes", support:"Soporte", terms:"Términos", privacy:"Privacidad" },
    subscription: { title:"Suscripción", manage:"Administrar suscripción", subscribe:"Suscribirse", continueFree:"Continuar gratis",
      trialEndedTitle:"Tu prueba gratuita terminó",
      trialEndedBody:"Para seguir usando las funciones Premium, inicia una suscripción. Puedes seguir usando las funciones gratuitas en cualquier momento.",
      continueWithPremium:"Continuar con Premium",
      upgradeNow:"Actualizar Ahora",
      startsAfterTrial:"Comienza después de que termine tu acceso Premium de 7 días. Cancela en cualquier momento.",
      renewsAuto:"Se renueva automáticamente. Cancela en cualquier momento.",
      managedThrough:"Gestionado a través de Apple",
      dataNotAffected:"Tus datos nunca se ven afectados",
      premiumActive:"Premium activo",
      premiumActiveSubtextTrial:"Tienes acceso completo a las herramientas Premium.",
      premiumActiveSubtextPaid:"Tus herramientas Premium están activas.",
      annualSavings:"Anual ahorra comparado con mensual."
    },
    common: { loading:"Cargando…", save:"Guardar", cancel:"Cancelar", close:"Cerrar" },
    empty: {
      pairingNoPipes:"Las recomendaciones de emparejamiento requieren pipas y tabaco",
      pairingAction:"Rastrea qué pipas funcionan mejor con qué mezclas",
      usageLogNoPipes:"El historial de uso requiere pipas y tabaco",
      usageLogAction:"Rastrea qué pipas usas con qué mezclas para generar recomendaciones",
      rotationNoPipes:"El planificador de rotación requiere pipas en tu colección",
      rotationAction:"Rastrea períodos de descanso y optimiza la salud de la pipa con rotación de uso",
      agingNoBlends:"El panel de envejecimiento requiere tabaco en tu bodega",
      agingAction:"Rastrea el tiempo almacenado y las recomendaciones de envejecimiento óptimas",
      identifyNoData:"La identificación por IA funciona una vez que tengas elementos para analizar",
      optimizeNoPipes:"La optimización requiere pipas en tu colección",
      whatIfNoData:"Los escenarios hipotéticos requieren datos de pipas y tabaco"
    },
    docs: {
      tobaccoValuation: {
        title: "Valoración de Tabaco",
        manualValue: "Valor de Mercado Manual",
        costBasis: "Costo Base",
        aiValuation: "Valoración Asistida por IA",
        runAI: "Ejecutar Valoración IA",
        estimatedValue: "Valor Estimado (por oz)",
        estimatedRange: "Rango Estimado",
        confidence: "Confianza",
        evidenceSources: "Fuentes de Evidencia",
        projections: "Proyecciones de Valor Predictivas",
        projection12m: "Proyección Estimada (12 meses)",
        projection36m: "Proyección Estimada (36 meses)",
        lastUpdated: "Última actualización",
        disclaimer: "Estimación asistida por IA basada en listados públicos. No es una garantía.",
        upgradePro: "Actualiza a Pro para desbloquear valoración asistida por IA y perspectivas predictivas.",
        premiumOnly: "Premium",
        proOnly: "Pro",
      },
    },
  }},
  fr: { common: {
    nav: { home:"Accueil", pipes:"Pipes", tobacco:"Tabac", cellar:"Cave", community:"Communauté", profile:"Profil", help:"Aide", faq:"FAQ", support:"Support", terms:"Conditions", privacy:"Confidentialité" },
    subscription: { title:"Abonnement", manage:"Gérer l'abonnement", subscribe:"S'abonner", continueFree:"Continuer gratuitement",
      trialEndedTitle:"Votre essai gratuit est terminé",
      trialEndedBody:"Pour continuer à utiliser les fonctionnalités Premium, démarrez un abonnement. Vous pouvez continuer à utiliser les fonctionnalités gratuites à tout moment.",
      continueWithPremium:"Continuer avec Premium",
      upgradeNow:"Mettre à niveau maintenant",
      startsAfterTrial:"Commence après la fin de votre accès Premium de 7 jours. Annulez à tout moment.",
      renewsAuto:"Se renouvelle automatiquement. Annulez à tout moment.",
      managedThrough:"Géré via Apple",
      dataNotAffected:"Vos données ne sont jamais affectées",
      premiumActive:"Premium actif",
      premiumActiveSubtextTrial:"Vous avez un accès complet aux outils Premium.",
      premiumActiveSubtextPaid:"Vos outils Premium sont actifs.",
      annualSavings:"L'annuel économise par rapport au mensuel."
    },
    common: { loading:"Chargement…", save:"Enregistrer", cancel:"Annuler", close:"Fermer" },
    empty: {
      pairingNoPipes:"Les recommandations d'appariement nécessitent des pipes et du tabac",
      pairingAction:"Suivez quelles pipes fonctionnent le mieux avec quelles mélanges",
      usageLogNoPipes:"L'historique d'utilisation nécessite des pipes et du tabac",
      usageLogAction:"Suivez quelles pipes vous utilisez avec quelles mélanges pour générer des recommandations",
      rotationNoPipes:"Le planificateur de rotation nécessite des pipes dans votre collection",
      rotationAction:"Suivez les périodes de repos et optimisez la santé de la pipe avec la rotation d'utilisation",
      agingNoBlends:"Le tableau de vieillissement nécessite du tabac dans votre cave",
      agingAction:"Suivez le temps de stockage et les recommandations de vieillissement optimales",
      identifyNoData:"L'identification par IA fonctionne une fois que vous avez des éléments à analyser",
      optimizeNoPipes:"L'optimisation nécessite des pipes dans votre collection",
      whatIfNoData:"Les scénarios hypothétiques nécessitent des données de pipes et de tabac"
    },
    docs: {
      tobaccoValuation: {
        title: "Évaluation du Tabac",
        manualValue: "Valeur Manuelle du Marché",
        costBasis: "Coût de Base",
        aiValuation: "Évaluation Assistée par IA",
        runAI: "Lancer l'Évaluation IA",
        estimatedValue: "Valeur Estimée (par oz)",
        estimatedRange: "Fourchette Estimée",
        confidence: "Confiance",
        evidenceSources: "Sources de Preuves",
        projections: "Projections de Valeur Prédictives",
        projection12m: "Projection Estimée (12 mois)",
        projection36m: "Projection Estimée (36 mois)",
        lastUpdated: "Dernière mise à jour",
        disclaimer: "Estimation assistée par IA basée sur des annonces publiques. Pas une garantie.",
        upgradePro: "Passez à Pro pour débloquer l'évaluation assistée par IA et les perspectives prédictives.",
        premiumOnly: "Premium",
        proOnly: "Pro",
      },
    },
  }},
  de: { common: {
    nav: { home:"Start", pipes:"Pfeifen", tobacco:"Tabak", cellar:"Keller", community:"Community", profile:"Profil", help:"Hilfe", faq:"FAQ", support:"Support", terms:"Bedingungen", privacy:"Datenschutz" },
    subscription: { title:"Abonnement", manage:"Abonnement verwalten", subscribe:"Abonnieren", continueFree:"Kostenlos fortfahren",
      trialEndedTitle:"Ihre kostenlose Testversion ist abgelaufen",
      trialEndedBody:"Um Premium-Funktionen weiter zu nutzen, starten Sie bitte ein Abonnement. Kostenlose Funktionen können jederzeit genutzt werden.",
      continueWithPremium:"Mit Premium fortfahren",
      upgradeNow:"Jetzt upgraden",
      startsAfterTrial:"Beginnt nach Ende Ihres 7-tägigen Premium-Zugangs. Jederzeit kündbar.",
      renewsAuto:"Wird automatisch verlängert. Jederzeit kündbar.",
      managedThrough:"Verwaltet über Apple",
      dataNotAffected:"Ihre Daten sind niemals betroffen",
      premiumActive:"Premium aktiv",
      premiumActiveSubtextTrial:"Sie haben vollen Zugriff auf Premium-Tools.",
      premiumActiveSubtextPaid:"Ihre Premium-Tools sind aktiv.",
      annualSavings:"Jährlich spart gegenüber monatlich."
    },
    common: { loading:"Wird geladen…", save:"Speichern", cancel:"Abbrechen", close:"Schließen" },
    empty: {
      pairingNoPipes:"Paarungsempfehlungen erfordern Pfeifen und Tabak",
      pairingAction:"Verfolgen Sie, welche Pfeifen am besten mit welchen Mischungen funktionieren",
      usageLogNoPipes:"Nutzungsverlauf erfordert Pfeifen und Tabak",
      usageLogAction:"Verfolgen Sie, welche Pfeifen Sie mit welchen Mischungen verwenden, um Empfehlungen zu erstellen",
      rotationNoPipes:"Der Rotationsplaner erfordert Pfeifen in Ihrer Sammlung",
      rotationAction:"Verfolgen Sie Ruhephasen und optimieren Sie die Pfeifengesundheit mit Nutzungsrotation",
      agingNoBlends:"Das Reifungs-Dashboard erfordert Tabak in Ihrem Keller",
      agingAction:"Verfolgen Sie die Lagerzeit und optimale Reifungsempfehlungen",
      identifyNoData:"KI-Identifikation funktioniert, sobald Sie Elemente zum Analysieren haben",
      optimizeNoPipes:"Optimierung erfordert Pfeifen in Ihrer Sammlung",
      whatIfNoData:"Was-wäre-wenn-Szenarien erfordern Pfeifen- und Tabakdaten"
    },
    docs: {
      tobaccoValuation: {
        title: "Tabakbewertung",
        manualValue: "Manueller Marktwert",
        costBasis: "Kostenbasis",
        aiValuation: "KI-gestützte Bewertung",
        runAI: "KI-Bewertung Ausführen",
        estimatedValue: "Geschätzter Wert (pro oz)",
        estimatedRange: "Geschätzter Bereich",
        confidence: "Vertrauen",
        evidenceSources: "Beweisquellen",
        projections: "Prädiktive Wertprognosen",
        projection12m: "Geschätzte Prognose (12 Monate)",
        projection36m: "Geschätzte Prognose (36 Monate)",
        lastUpdated: "Zuletzt aktualisiert",
        disclaimer: "KI-gestützte Schätzung basierend auf öffentlichen Angeboten. Keine Garantie.",
        upgradePro: "Upgrade auf Pro für KI-gestützte Bewertung und prädiktive Einblicke.",
        premiumOnly: "Premium",
        proOnly: "Pro",
      },
    },
  }},
  it: { common: {
    nav: { home:"Home", pipes:"Pipe", tobacco:"Tabacco", cellar:"Cantina", community:"Community", profile:"Profilo", help:"Aiuto", faq:"FAQ", support:"Supporto", terms:"Termini", privacy:"Privacy" },
    subscription: { title:"Abbonamento", manage:"Gestisci abbonamento", subscribe:"Abbonati", continueFree:"Continua gratis",
      trialEndedTitle:"La prova gratuita è terminata",
      trialEndedBody:"Per continuare a usare le funzioni Premium, avvia un abbonamento. Puoi continuare a usare le funzioni gratuite in qualsiasi momento.",
      continueWithPremium:"Continua con Premium",
      upgradeNow:"Aggiorna ora",
      startsAfterTrial:"Inizia dopo la fine del tuo accesso Premium di 7 giorni. Annulla in qualsiasi momento.",
      renewsAuto:"Si rinnova automaticamente. Annulla in qualsiasi momento.",
      managedThrough:"Gestito tramite Apple",
      dataNotAffected:"I tuoi dati non sono mai interessati",
      premiumActive:"Premium attivo",
      premiumActiveSubtextTrial:"Hai accesso completo agli strumenti Premium.",
      premiumActiveSubtextPaid:"I tuoi strumenti Premium sono attivi.",
      annualSavings:"Annuale risparmia rispetto a mensile."
    },
    common: { loading:"Caricamento…", save:"Salva", cancel:"Annulla", close:"Chiudi" },
    empty: {
      pairingNoPipes:"Le raccomandazioni di abbinamento richiedono pipe e tabacco",
      pairingAction:"Traccia quali pipe funzionano meglio con quali miscele",
      usageLogNoPipes:"La cronologia di utilizzo richiede pipe e tabacco",
      usageLogAction:"Traccia quali pipe usi con quali miscele per creare raccomandazioni",
      rotationNoPipes:"Il pianificatore di rotazione richiede pipe nella tua collezione",
      rotationAction:"Traccia i periodi di riposo e ottimizza la salute della pipa con la rotazione di utilizzo",
      agingNoBlends:"Il dashboard di invecchiamento richiede tabacco nella tua cantina",
      agingAction:"Traccia il tempo di conservazione e le raccomandazioni di invecchiamento ottimali",
      identifyNoData:"L'identificazione AI funziona una volta che hai elementi da analizzare",
      optimizeNoPipes:"L'ottimizzazione richiede pipe nella tua collezione",
      whatIfNoData:"Gli scenari ipotetici richiedono dati di pipe e tabacco"
    },
    docs: {
      tobaccoValuation: {
        title: "Valutazione del Tabacco",
        manualValue: "Valore di Mercato Manuale",
        costBasis: "Base di Costo",
        aiValuation: "Valutazione Assistita da IA",
        runAI: "Esegui Valutazione IA",
        estimatedValue: "Valore Stimato (per oz)",
        estimatedRange: "Intervallo Stimato",
        confidence: "Fiducia",
        evidenceSources: "Fonti di Prova",
        projections: "Proiezioni di Valore Predittive",
        projection12m: "Proiezione Stimata (12 mesi)",
        projection36m: "Proiezione Stimata (36 mesi)",
        lastUpdated: "Ultimo aggiornamento",
        disclaimer: "Stima assistita da IA basata su elenchi pubblici. Non una garanzia.",
        upgradePro: "Passa a Pro per sbloccare la valutazione assistita da IA e le intuizioni predittive.",
        premiumOnly: "Premium",
        proOnly: "Pro",
      },
    },
  }},
  "pt-BR": { common: {
    nav: { home:"Início", pipes:"Cachimbos", tobacco:"Tabaco", cellar:"Adega", community:"Comunidade", profile:"Perfil", help:"Ajuda", faq:"Perguntas frequentes", support:"Suporte", terms:"Termos", privacy:"Privacidade" },
    subscription: { title:"Assinatura", manage:"Gerenciar assinatura", subscribe:"Assinar", continueFree:"Continuar grátis",
      trialEndedTitle:"Seu teste grátis terminou",
      trialEndedBody:"Para continuar usando os recursos Premium, inicie uma assinatura. Você pode continuar usando os recursos gratuitos a qualquer momento.",
      continueWithPremium:"Continuar com Premium",
      upgradeNow:"Atualizar agora",
      startsAfterTrial:"Começa após o término do seu acesso Premium de 7 dias. Cancele a qualquer momento.",
      renewsAuto:"Renova automaticamente. Cancele a qualquer momento.",
      managedThrough:"Gerenciado via Apple",
      dataNotAffected:"Seus dados nunca são afetados",
      premiumActive:"Premium ativo",
      premiumActiveSubtextTrial:"Você tem acesso total às ferramentas Premium.",
      premiumActiveSubtextPaid:"Suas ferramentas Premium estão ativas.",
      annualSavings:"Anual economiza em comparação com mensal."
    },
    common: { loading:"Carregando…", save:"Salvar", cancel:"Cancelar", close:"Fechar" },
    empty: {
      pairingNoPipes:"As recomendações de combinação exigem cachimbos e tabaco",
      pairingAction:"Rastreie quais cachimbos funcionam melhor com quais misturas",
      usageLogNoPipes:"O histórico de uso requer cachimbos e tabaco",
      usageLogAction:"Rastreie quais cachimbos você usa com quais misturas para gerar recomendações",
      rotationNoPipes:"O planejador de rotação requer cachimbos em sua coleção",
      rotationAction:"Rastreie períodos de descanso e otimize a saúde do cachimbo com rotação de uso",
      agingNoBlends:"O painel de envelhecimento requer tabaco em sua adega",
      agingAction:"Rastreie o tempo armazenado e recomendações de envelhecimento ideais",
      identifyNoData:"A identificação por IA funciona quando você tem itens para analisar",
      optimizeNoPipes:"A otimização requer cachimbos em sua coleção",
      whatIfNoData:"Cenários hipotéticos requerem dados de cachimbos e tabaco"
    },
    docs: {
      tobaccoValuation: {
        title: "Avaliação de Tabaco",
        manualValue: "Valor de Mercado Manual",
        costBasis: "Base de Custo",
        aiValuation: "Avaliação Assistida por IA",
        runAI: "Executar Avaliação IA",
        estimatedValue: "Valor Estimado (por oz)",
        estimatedRange: "Faixa Estimada",
        confidence: "Confiança",
        evidenceSources: "Fontes de Evidência",
        projections: "Projeções de Valor Preditivas",
        projection12m: "Projeção Estimada (12 meses)",
        projection36m: "Projeção Estimada (36 meses)",
        lastUpdated: "Última atualização",
        disclaimer: "Estimativa assistida por IA baseada em listas públicas. Não é uma garantia.",
        upgradePro: "Atualize para Pro para desbloquear avaliação assistida por IA e insights preditivos.",
        premiumOnly: "Premium",
        proOnly: "Pro",
      },
    },
  }},
  nl: { common: {
    nav: { home:"Home", pipes:"Pijpen", tobacco:"Tabak", cellar:"Kelder", community:"Community", profile:"Profiel", help:"Help", faq:"FAQ", support:"Ondersteuning", terms:"Voorwaarden", privacy:"Privacy" },
    subscription: { title:"Abonnement", manage:"Abonnement beheren", subscribe:"Abonneren", continueFree:"Gratis doorgaan",
      trialEndedTitle:"Je gratis proefperiode is afgelopen",
      trialEndedBody:"Om Premium-functies te blijven gebruiken, start je een abonnement. Je kunt de gratis functies altijd blijven gebruiken.",
      continueWithPremium:"Doorgaan met Premium",
      upgradeNow:"Nu upgraden",
      startsAfterTrial:"Begint na afloop van je 7-daagse Premium-toegang. Altijd opzegbaar.",
      renewsAuto:"Verlengt automatisch. Altijd opzegbaar.",
      managedThrough:"Beheerd via Apple",
      dataNotAffected:"Je gegevens worden nooit beïnvloed",
      premiumActive:"Premium actief",
      premiumActiveSubtextTrial:"Je hebt volledige toegang tot Premium-tools.",
      premiumActiveSubtextPaid:"Je Premium-tools zijn actief.",
      annualSavings:"Jaarlijks bespaart vergeleken met maandelijks."
    },
    common: { loading:"Laden…", save:"Opslaan", cancel:"Annuleren", close:"Sluiten" },
    empty: {
      pairingNoPipes:"Koppelingsaanbevelingen vereisen pijpen en tabak",
      pairingAction:"Volg welke pijpen het beste werken met welke mengsels",
      usageLogNoPipes:"Gebruiksgeschiedenis vereist pijpen en tabak",
      usageLogAction:"Volg welke pijpen je gebruikt met welke mengsels om aanbevelingen te genereren",
      rotationNoPipes:"De rotatieplanner vereist pijpen in je collectie",
      rotationAction:"Volg rustperiodes en optimaliseer pijpgezondheid met gebruiksrotatie",
      agingNoBlends:"Het verouderingsdashboard vereist tabak in je kelder",
      agingAction:"Volg de opslagtijd en optimale verouderingsaanbevelingen",
      identifyNoData:"AI-identificatie werkt zodra je items hebt om te analyseren",
      optimizeNoPipes:"Optimalisatie vereist pijpen in je collectie",
      whatIfNoData:"Wat-als-scenario's vereisen pijp- en tabaksgegevens"
    },
    docs: {
      tobaccoValuation: {
        title: "Tabakwaardering",
        manualValue: "Handmatige Marktwaarde",
        costBasis: "Kostenbasis",
        aiValuation: "AI-Ondersteunde Waardering",
        runAI: "AI-Waardering Uitvoeren",
        estimatedValue: "Geschatte Waarde (per oz)",
        estimatedRange: "Geschat Bereik",
        confidence: "Vertrouwen",
        evidenceSources: "Bewijsbronnen",
        projections: "Voorspellende Waardeprojecties",
        projection12m: "Geschatte Projectie (12 maanden)",
        projection36m: "Geschatte Projectie (36 maanden)",
        lastUpdated: "Laatst bijgewerkt",
        disclaimer: "AI-ondersteunde schatting op basis van openbare lijsten. Geen garantie.",
        upgradePro: "Upgrade naar Pro om AI-ondersteunde waardering en voorspellende inzichten te ontgrendelen.",
        premiumOnly: "Premium",
        proOnly: "Pro",
      },
    },
  }},
  pl: { common: {
    nav: { home:"Strona główna", pipes:"Fajki", tobacco:"Tytoń", cellar:"Piwniczka", community:"Społeczność", profile:"Profil", help:"Pomoc", faq:"FAQ", support:"Wsparcie", terms:"Warunki", privacy:"Prywatność" },
    subscription: { title:"Subskrypcja", manage:"Zarządzaj subskrypcją", subscribe:"Subskrybuj", continueFree:"Kontynuuj bezpłatnie",
      trialEndedTitle:"Bezpłatny okres próbny dobiegł końca",
      trialEndedBody:"Aby dalej korzystać z funkcji Premium, rozpocznij subskrypcję. Możesz korzystać z funkcji bezpłatnych w dowolnym momencie.",
      continueWithPremium:"Kontynuuj z Premium",
      upgradeNow:"Uaktualnij teraz",
      startsAfterTrial:"Rozpoczyna się po zakończeniu 7-dniowego dostępu Premium. Anuluj w dowolnym momencie.",
      renewsAuto:"Odnawia się automatycznie. Anuluj w dowolnym momencie.",
      managedThrough:"Zarządzane przez Apple",
      dataNotAffected:"Twoje dane nigdy nie są dotknięte",
      premiumActive:"Premium aktywne",
      premiumActiveSubtextTrial:"Masz pełny dostęp do narzędzi Premium.",
      premiumActiveSubtextPaid:"Twoje narzędzia Premium są aktywne.",
      annualSavings:"Roczna oszczędza w porównaniu z miesięczną."
    },
    common: { loading:"Ładowanie…", save:"Zapisz", cancel:"Anuluj", close:"Zamknij" },
    empty: {
      pairingNoPipes:"Rekomendacje parowania wymagają fajek i tytoniu",
      pairingAction:"Śledź, które fajki najlepiej współpracują z którymi mieszankami",
      usageLogNoPipes:"Historia użytkowania wymaga fajek i tytoniu",
      usageLogAction:"Śledź, których fajek używasz z którymi mieszankami, aby generować rekomendacje",
      rotationNoPipes:"Planer rotacji wymaga fajek w Twojej kolekcji",
      rotationAction:"Śledź okresy odpoczynku i optymalizuj zdrowie fajki dzięki rotacji użytkowania",
      agingNoBlends:"Panel starzenia wymaga tytoniu w Twojej piwnicy",
      agingAction:"Śledź czas przechowywania i optymalne zalecenia dotyczące starzenia",
      identifyNoData:"Identyfikacja AI działa, gdy masz elementy do analizy",
      optimizeNoPipes:"Optymalizacja wymaga fajek w Twojej kolekcji",
      whatIfNoData:"Scenariusze co-jeśli wymagają danych o fajkach i tytoniu"
    },
    docs: {
      tobaccoValuation: {
        title: "Wycena Tytoniu",
        manualValue: "Ręczna Wartość Rynkowa",
        costBasis: "Podstawa Kosztowa",
        aiValuation: "Wycena Wspierana przez AI",
        runAI: "Uruchom Wycenę AI",
        estimatedValue: "Szacowana Wartość (za oz)",
        estimatedRange: "Szacowany Zakres",
        confidence: "Pewność",
        evidenceSources: "Źródła Dowodów",
        projections: "Predykcyjne Projekcje Wartości",
        projection12m: "Szacowana Projekcja (12 miesięcy)",
        projection36m: "Szacowana Projekcja (36 miesięcy)",
        lastUpdated: "Ostatnia aktualizacja",
        disclaimer: "Szacowanie wspierane przez AI na podstawie publicznych ofert. Nie jest gwarancją.",
        upgradePro: "Przejdź na Pro, aby odblokować wycenę wspieraną przez AI i predykcyjne spostrzeżenia.",
        premiumOnly: "Premium",
        proOnly: "Pro",
      },
    },
  }},
  ja: { common: {
    nav: { home:"ホーム", pipes:"パイプ", tobacco:"タバコ", cellar:"セラー", community:"コミュニティ", profile:"プロフィール", help:"ヘルプ", faq:"FAQ", support:"サポート", terms:"利用規約", privacy:"プライバシー" },
    subscription: { title:"サブスクリプション", manage:"サブスクリプションを管理", subscribe:"購読する", continueFree:"無料で続ける",
      trialEndedTitle:"無料トライアルが終了しました",
      trialEndedBody:"Premium 機能を継続して使用するには、サブスクリプションを開始してください。無料機能はいつでも利用できます。",
      continueWithPremium:"Premiumを続ける",
      upgradeNow:"今すぐアップグレード",
      startsAfterTrial:"7日間のPremiumアクセス終了後に開始されます。いつでもキャンセルできます。",
      renewsAuto:"自動的に更新されます。いつでもキャンセルできます。",
      managedThrough:"Apple経由で管理",
      dataNotAffected:"データは影響を受けません",
      premiumActive:"Premiumアクティブ",
      premiumActiveSubtextTrial:"Premiumツールへの完全なアクセスがあります。",
      premiumActiveSubtextPaid:"Premiumツールがアクティブです。",
      annualSavings:"年間は月間と比較して節約されます。"
    },
    common: { loading:"読み込み中…", save:"保存", cancel:"キャンセル", close:"閉じる" },
    empty: {
      pairingNoPipes:"ペアリング推奨にはパイプとタバコが必要です",
      pairingAction:"どのパイプがどのブレンドに最適かを追跡",
      usageLogNoPipes:"使用履歴にはパイプとタバコが必要です",
      usageLogAction:"どのパイプをどのブレンドで使用するかを追跡して推奨事項を作成",
      rotationNoPipes:"ローテーションプランナーにはコレクション内のパイプが必要です",
      rotationAction:"休憩期間を追跡し、使用ローテーションでパイプの健康を最適化",
      agingNoBlends:"エイジングダッシュボードにはセラー内のタバコが必要です",
      agingAction:"保管時間と最適なエイジング推奨事項を追跡",
      identifyNoData:"分析するアイテムがあるとAI識別が機能します",
      optimizeNoPipes:"最適化にはコレクション内のパイプが必要です",
      whatIfNoData:"仮定シナリオにはパイプとタバコのデータが必要です"
    },
    docs: {
      tobaccoValuation: {
        title: "タバコ評価",
        manualValue: "手動市場価値",
        costBasis: "コストベース",
        aiValuation: "AI支援評価",
        runAI: "AI評価を実行",
        estimatedValue: "推定価値（オンスあたり）",
        estimatedRange: "推定範囲",
        confidence: "信頼度",
        evidenceSources: "証拠源",
        projections: "予測的価値予測",
        projection12m: "推定予測（12か月）",
        projection36m: "推定予測（36か月）",
        lastUpdated: "最終更新",
        disclaimer: "公開リストに基づくAI支援推定。保証ではありません。",
        upgradePro: "Proにアップグレードして、AI支援評価と予測的洞察をロック解除します。",
        premiumOnly: "プレミアム",
        proOnly: "プロ",
      },
    },
  }},
  "zh-Hans": { common: {
    nav: { home:"首页", pipes:"烟斗", tobacco:"烟草", cellar:"窖藏", community:"社区", profile:"个人资料", help:"帮助", faq:"常见问题", support:"支持", terms:"条款", privacy:"隐私" },
    subscription: { title:"订阅", manage:"管理订阅", subscribe:"订阅", continueFree:"继续免费使用",
      trialEndedTitle:"您的免费试用已结束",
      trialEndedBody:"要继续使用高级功能，请开始订阅。您可以随时继续使用免费功能。",
      continueWithPremium:"继续使用高级版",
      upgradeNow:"立即升级",
      startsAfterTrial:"在您的7天高级访问结束后开始。随时取消。",
      renewsAuto:"自动续订。随时取消。",
      managedThrough:"通过Apple管理",
      dataNotAffected:"您的数据永远不会受到影响",
      premiumActive:"高级版活跃",
      premiumActiveSubtextTrial:"您可以完全访问高级工具。",
      premiumActiveSubtextPaid:"您的高级工具处于活动状态。",
      annualSavings:"年度订阅相比月度订阅可节省费用。"
    },
    common: { loading:"加载中…", save:"保存", cancel:"取消", close:"关闭" },
    empty: {
      pairingNoPipes:"配对建议需要烟斗和烟草",
      pairingAction:"跟踪哪些烟斗最适合哪些混合物",
      usageLogNoPipes:"使用历史需要烟斗和烟草",
      usageLogAction:"跟踪您使用哪些烟斗搭配哪些混合物以生成建议",
      rotationNoPipes:"轮换计划需要收藏中的烟斗",
      rotationAction:"跟踪休息期并通过使用轮换优化烟斗健康",
      agingNoBlends:"陈化仪表板需要窖藏中的烟草",
      agingAction:"跟踪存储时间和最佳陈化建议",
      identifyNoData:"一旦您有要分析的项目，AI识别就会起作用",
      optimizeNoPipes:"优化需要收藏中的烟斗",
      whatIfNoData:"假设场景需要烟斗和烟草数据"
    },
    docs: {
      tobaccoValuation: {
        title: "烟草估值",
        manualValue: "手动市场价值",
        costBasis: "成本基础",
        aiValuation: "AI辅助估值",
        runAI: "运行AI估值",
        estimatedValue: "估计价值（每盎司）",
        estimatedRange: "估计范围",
        confidence: "置信度",
        evidenceSources: "证据来源",
        projections: "预测性价值预测",
        projection12m: "估计预测（12个月）",
        projection36m: "估计预测（36个月）",
        lastUpdated: "最后更新",
        disclaimer: "基于公开列表的AI辅助估计。不是保证。",
        upgradePro: "升级到Pro以解锁AI辅助估值和预测性见解。",
        premiumOnly: "高级版",
        proOnly: "专业版",
      },
    },
  }},
};

function normalizeLng(raw) {
  const l = (raw || "en").replace("_", "-");
  if (l.startsWith("pt")) return "pt-BR";
  if (l.startsWith("zh")) return "zh-Hans";
  if (resources[l]) return l;
  const base = l.split("-")[0];
  return resources[base] ? base : "en";
}

function ensurePkLangDefault() {
  try {
    const existing = localStorage.getItem("pk_lang");
    if (existing) return normalizeLng(existing);
    const fromBrowser = normalizeLng(navigator.language || "en");
    localStorage.setItem("pk_lang", fromBrowser);
    return fromBrowser;
  } catch {
    return "en";
  }
}

const initial = ensurePkLangDefault();

const mergedResources = mergeTranslations();

i18n
   .use(LanguageDetector)
   .use(initReactI18next)
   .init({
     resources: mergedResources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "pk_lang",
    },
    react: { useSuspense: false },
  });

try {
  const normalized = normalizeLng(i18n.language || initial);
  if (normalized && i18n.language !== normalized) i18n.changeLanguage(normalized);
} catch {}

// ✅ Keep HTML lang attribute updated
i18n.on("languageChanged", (lng) => {
  try {
    document.documentElement.lang = lng;
    window.dispatchEvent(new CustomEvent("pk_lang_changed", { detail: { lang: lng } }));
  } catch {}
});

// ✅ Sync across tabs/windows
window.addEventListener("storage", (e) => {
  if (e.key === "pk_lang" && e.newValue) {
    const next = normalizeLng(e.newValue);
    if (next !== i18n.language) i18n.changeLanguage(next);
  }
});

// ✅ Dev-only missing key visibility
i18n.on("missingKey", (lng, ns, key) => {
  if (import.meta?.env?.DEV) {
    // eslint-disable-next-line no-console
    console.warn("Missing i18n key:", { lng, ns, key });
  }
});

export default i18n;