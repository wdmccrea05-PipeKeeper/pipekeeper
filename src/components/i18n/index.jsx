import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// English translations
const enCommon = {
  app: {
    name: "PipeKeeper"
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
    terms: "Terms of Service",
    privacy: "Privacy Policy"
  },
  subscription: {
    title: "Subscription",
    manage: "Manage subscription",
    subscribe: "Subscribe",
    continueFree: "Continue Free",
    trialEndedTitle: "Your free trial has ended",
    trialEndedBody: "To continue using Premium features, please start a subscription. You can keep using free collection features anytime."
  },
  common: {
    loading: "Loading…",
    save: "Save",
    cancel: "Cancel",
    close: "Close"
  }
};

// Spanish translations
const esCommon = {
  app: {
    name: "PipeKeeper"
  },
  nav: {
    home: "Inicio",
    pipes: "Pipas",
    tobacco: "Tabaco",
    cellar: "Bodega",
    community: "Comunidad",
    profile: "Perfil",
    help: "Ayuda",
    faq: "Preguntas frecuentes",
    support: "Soporte",
    terms: "Términos del servicio",
    privacy: "Política de privacidad"
  },
  subscription: {
    title: "Suscripción",
    manage: "Administrar suscripción",
    subscribe: "Suscribirse",
    continueFree: "Continuar gratis",
    trialEndedTitle: "Tu prueba gratuita terminó",
    trialEndedBody: "Para seguir usando las funciones Premium, inicia una suscripción. Puedes seguir usando las funciones gratuitas en cualquier momento."
  },
  common: {
    loading: "Cargando…",
    save: "Guardar",
    cancel: "Cancelar",
    close: "Cerrar"
  }
};

// French translations
const frCommon = {
  app: {
    name: "PipeKeeper"
  },
  nav: {
    home: "Accueil",
    pipes: "Pipes",
    tobacco: "Tabac",
    cellar: "Cave",
    community: "Communauté",
    profile: "Profil",
    help: "Aide",
    faq: "FAQ",
    support: "Support",
    terms: "Conditions d'utilisation",
    privacy: "Politique de confidentialité"
  },
  subscription: {
    title: "Abonnement",
    manage: "Gérer l'abonnement",
    subscribe: "S'abonner",
    continueFree: "Continuer gratuitement",
    trialEndedTitle: "Votre essai gratuit est terminé",
    trialEndedBody: "Pour continuer à utiliser les fonctionnalités Premium, veuillez commencer un abonnement. Vous pouvez continuer à utiliser les fonctionnalités gratuites à tout moment."
  },
  common: {
    loading: "Chargement…",
    save: "Enregistrer",
    cancel: "Annuler",
    close: "Fermer"
  }
};

// German translations
const deCommon = {
  app: {
    name: "PipeKeeper"
  },
  nav: {
    home: "Startseite",
    pipes: "Pfeifen",
    tobacco: "Tabak",
    cellar: "Keller",
    community: "Gemeinschaft",
    profile: "Profil",
    help: "Hilfe",
    faq: "FAQ",
    support: "Support",
    terms: "Nutzungsbedingungen",
    privacy: "Datenschutzrichtlinie"
  },
  subscription: {
    title: "Abonnement",
    manage: "Abonnement verwalten",
    subscribe: "Abonnieren",
    continueFree: "Kostenlos fortfahren",
    trialEndedTitle: "Ihre kostenlose Testversion ist abgelaufen",
    trialEndedBody: "Um weiterhin Premium-Funktionen zu nutzen, starten Sie bitte ein Abonnement. Sie können die kostenlosen Funktionen jederzeit weiter nutzen."
  },
  common: {
    loading: "Lädt…",
    save: "Speichern",
    cancel: "Abbrechen",
    close: "Schließen"
  }
};

// Italian translations
const itCommon = {
  app: {
    name: "PipeKeeper"
  },
  nav: {
    home: "Home",
    pipes: "Pipe",
    tobacco: "Tabacco",
    cellar: "Cantina",
    community: "Comunità",
    profile: "Profilo",
    help: "Aiuto",
    faq: "FAQ",
    support: "Supporto",
    terms: "Termini di servizio",
    privacy: "Informativa sulla privacy"
  },
  subscription: {
    title: "Abbonamento",
    manage: "Gestisci abbonamento",
    subscribe: "Abbonati",
    continueFree: "Continua gratis",
    trialEndedTitle: "La tua prova gratuita è terminata",
    trialEndedBody: "Per continuare a utilizzare le funzionalità Premium, avvia un abbonamento. Puoi continuare a utilizzare le funzionalità gratuite in qualsiasi momento."
  },
  common: {
    loading: "Caricamento…",
    save: "Salva",
    cancel: "Annulla",
    close: "Chiudi"
  }
};

// Portuguese (Brazil) translations
const ptBRCommon = {
  app: {
    name: "PipeKeeper"
  },
  nav: {
    home: "Início",
    pipes: "Cachimbos",
    tobacco: "Tabaco",
    cellar: "Adega",
    community: "Comunidade",
    profile: "Perfil",
    help: "Ajuda",
    faq: "Perguntas frequentes",
    support: "Suporte",
    terms: "Termos de serviço",
    privacy: "Política de privacidade"
  },
  subscription: {
    title: "Assinatura",
    manage: "Gerenciar assinatura",
    subscribe: "Assinar",
    continueFree: "Continuar grátis",
    trialEndedTitle: "Seu teste gratuito terminou",
    trialEndedBody: "Para continuar usando os recursos Premium, inicie uma assinatura. Você pode continuar usando os recursos gratuitos a qualquer momento."
  },
  common: {
    loading: "Carregando…",
    save: "Salvar",
    cancel: "Cancelar",
    close: "Fechar"
  }
};

// Dutch translations
const nlCommon = {
  app: {
    name: "PipeKeeper"
  },
  nav: {
    home: "Home",
    pipes: "Pijpen",
    tobacco: "Tabak",
    cellar: "Kelder",
    community: "Gemeenschap",
    profile: "Profiel",
    help: "Hulp",
    faq: "Veelgestelde vragen",
    support: "Ondersteuning",
    terms: "Servicevoorwaarden",
    privacy: "Privacybeleid"
  },
  subscription: {
    title: "Abonnement",
    manage: "Abonnement beheren",
    subscribe: "Abonneren",
    continueFree: "Gratis doorgaan",
    trialEndedTitle: "Uw gratis proefperiode is afgelopen",
    trialEndedBody: "Om Premium-functies te blijven gebruiken, start u een abonnement. U kunt gratis functies op elk moment blijven gebruiken."
  },
  common: {
    loading: "Laden…",
    save: "Opslaan",
    cancel: "Annuleren",
    close: "Sluiten"
  }
};

// Polish translations
const plCommon = {
  app: {
    name: "PipeKeeper"
  },
  nav: {
    home: "Strona główna",
    pipes: "Fajki",
    tobacco: "Tytoń",
    cellar: "Piwnica",
    community: "Społeczność",
    profile: "Profil",
    help: "Pomoc",
    faq: "Najczęściej zadawane pytania",
    support: "Wsparcie",
    terms: "Warunki korzystania z usługi",
    privacy: "Polityka prywatności"
  },
  subscription: {
    title: "Subskrypcja",
    manage: "Zarządzaj subskrypcją",
    subscribe: "Subskrybuj",
    continueFree: "Kontynuuj za darmo",
    trialEndedTitle: "Twój bezpłatny okres próbny zakończył się",
    trialEndedBody: "Aby nadal korzystać z funkcji Premium, rozpocznij subskrypcję. Możesz nadal korzystać z darmowych funkcji w dowolnym momencie."
  },
  common: {
    loading: "Ładowanie…",
    save: "Zapisz",
    cancel: "Anuluj",
    close: "Zamknij"
  }
};

// Japanese translations
const jaCommon = {
  app: {
    name: "PipeKeeper"
  },
  nav: {
    home: "ホーム",
    pipes: "パイプ",
    tobacco: "タバコ",
    cellar: "セラー",
    community: "コミュニティ",
    profile: "プロフィール",
    help: "ヘルプ",
    faq: "よくある質問",
    support: "サポート",
    terms: "利用規約",
    privacy: "プライバシーポリシー"
  },
  subscription: {
    title: "サブスクリプション",
    manage: "サブスクリプションを管理",
    subscribe: "購読する",
    continueFree: "無料で続ける",
    trialEndedTitle: "無料トライアルが終了しました",
    trialEndedBody: "プレミアム機能を引き続き使用するには、サブスクリプションを開始してください。無料機能はいつでもご利用いただけます。"
  },
  common: {
    loading: "読み込み中…",
    save: "保存",
    cancel: "キャンセル",
    close: "閉じる"
  }
};

// Chinese (Simplified) translations
const zhHansCommon = {
  app: {
    name: "PipeKeeper"
  },
  nav: {
    home: "主页",
    pipes: "烟斗",
    tobacco: "烟草",
    cellar: "酒窖",
    community: "社区",
    profile: "个人资料",
    help: "帮助",
    faq: "常见问题",
    support: "支持",
    terms: "服务条款",
    privacy: "隐私政策"
  },
  subscription: {
    title: "订阅",
    manage: "管理订阅",
    subscribe: "订阅",
    continueFree: "继续免费使用",
    trialEndedTitle: "您的免费试用已结束",
    trialEndedBody: "要继续使用高级功能，请开始订阅。您可以随时继续使用免费功能。"
  },
  common: {
    loading: "加载中…",
    save: "保存",
    cancel: "取消",
    close: "关闭"
  }
};

// Add more languages by adding new objects and including them in resources
const resources = {
  en: { common: enCommon },
  es: { common: esCommon },
  fr: { common: frCommon },
  de: { common: deCommon },
  it: { common: itCommon },
  "pt-BR": { common: ptBRCommon },
  nl: { common: nlCommon },
  pl: { common: plCommon },
  ja: { common: jaCommon },
  "zh-Hans": { common: zhHansCommon },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common"],
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    detection: {
      // Detect from localStorage first, then browser
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "pk_lang",
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;