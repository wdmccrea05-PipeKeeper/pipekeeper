import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// English translations
const enCommon = {
  app: { name: "PipeKeeper" },
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
    privacy: "Privacy Policy",
  },
  subscription: {
    title: "Subscription",
    manage: "Manage subscription",
    subscribe: "Subscribe",
    continueFree: "Continue Free",
    trialEndedTitle: "Your free trial has ended",
    trialEndedBody:
      "To continue using Premium features, please start a subscription. You can keep using free collection features anytime.",
    features: {
      free: [
        "Add up to 5 pipes",
        "Add up to 10 tobacco blends",
        "View, edit, and organize your collection",
        "Basic notes and ratings",
        "Search pipes and tobaccos",
        "Multilingual support (10 languages)",
        "Cloud sync",
      ],
      premium: [
        "Unlimited pipes and tobacco blends",
        "Unlimited notes and photos",
        "Cellar tracking and aging logs",
        "Smoking logs and history",
        "Pipe maintenance and condition tracking",
        "Advanced filters and sorting",
        "Manual pipe ↔ tobacco pairings",
        "Tobacco library sync",
        "Multilingual support (10 languages)",
        "Cloud sync across devices",
      ],
      pro: [
        "Everything in Premium",
        "AI Updates (Pro for new users starting Feb 1, 2026)",
        "AI Identification tools (Pro for new users starting Feb 1, 2026)",
        "Advanced analytics & insights",
        "Bulk editing tools",
        "Export & reports (CSV / PDF)",
        "Collection optimization tools",
        "Early access to new advanced features",
      ],
    },
  },
  common: {
    loading: "Loading…",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
  },
};

// Spanish translations
const esCommon = {
  app: { name: "PipeKeeper" },
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
    privacy: "Política de privacidad",
  },
  subscription: {
    title: "Suscripción",
    manage: "Administrar suscripción",
    subscribe: "Suscribirse",
    continueFree: "Continuar gratis",
    trialEndedTitle: "Tu prueba gratuita terminó",
    trialEndedBody:
      "Para seguir usando las funciones Premium, inicia una suscripción. Puedes seguir usando las funciones gratuitas en cualquier momento.",
  },
  common: { loading: "Cargando…", save: "Guardar", cancel: "Cancelar", close: "Cerrar" },
};

// French
const frCommon = {
  app: { name: "PipeKeeper" },
  nav: {
    home: "Accueil",
    pipes: "Pipes",
    tobacco: "Tabac",
    cellar: "Cave",
    community: "Communauté",
    profile: "Profil",
    help: "Aide",
    faq: "FAQ",
    support: "Assistance",
    terms: "Conditions d'utilisation",
    privacy: "Politique de confidentialité",
  },
  subscription: {
    title: "Abonnement",
    manage: "Gérer l'abonnement",
    subscribe: "S'abonner",
    continueFree: "Continuer gratuitement",
    trialEndedTitle: "Votre essai gratuit est terminé",
    trialEndedBody:
      "Pour continuer à utiliser les fonctionnalités Premium, démarrez un abonnement. Vous pouvez continuer à utiliser les fonctionnalités gratuites à tout moment.",
  },
  common: { loading: "Chargement…", save: "Enregistrer", cancel: "Annuler", close: "Fermer" },
};

// German
const deCommon = {
  app: { name: "PipeKeeper" },
  nav: {
    home: "Start",
    pipes: "Pfeifen",
    tobacco: "Tabak",
    cellar: "Keller",
    community: "Community",
    profile: "Profil",
    help: "Hilfe",
    faq: "FAQ",
    support: "Support",
    terms: "Nutzungsbedingungen",
    privacy: "Datenschutzrichtlinie",
  },
  subscription: {
    title: "Abonnement",
    manage: "Abonnement verwalten",
    subscribe: "Abonnieren",
    continueFree: "Kostenlos fortfahren",
    trialEndedTitle: "Ihre kostenlose Testversion ist abgelaufen",
    trialEndedBody:
      "Um Premium-Funktionen weiter zu nutzen, starten Sie bitte ein Abonnement. Die kostenlosen Funktionen können jederzeit weiter genutzt werden.",
  },
  common: { loading: "Wird geladen…", save: "Speichern", cancel: "Abbrechen", close: "Schließen" },
};

// Italian
const itCommon = {
  app: { name: "PipeKeeper" },
  nav: {
    home: "Home",
    pipes: "Pipe",
    tobacco: "Tabacco",
    cellar: "Cantina",
    community: "Community",
    profile: "Profilo",
    help: "Aiuto",
    faq: "FAQ",
    support: "Supporto",
    terms: "Termini di servizio",
    privacy: "Informativa sulla privacy",
  },
  subscription: {
    title: "Abbonamento",
    manage: "Gestisci abbonamento",
    subscribe: "Abbonati",
    continueFree: "Continua gratis",
    trialEndedTitle: "La prova gratuita è terminata",
    trialEndedBody:
      "Per continuare a usare le funzioni Premium, avvia un abbonamento. Puoi continuare a usare le funzioni gratuite in qualsiasi momento.",
  },
  common: { loading: "Caricamento…", save: "Salva", cancel: "Annulla", close: "Chiudi" },
};

// Portuguese (Brazil)
const ptBRCommon = {
  app: { name: "PipeKeeper" },
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
    privacy: "Política de privacidade",
  },
  subscription: {
    title: "Assinatura",
    manage: "Gerenciar assinatura",
    subscribe: "Assinar",
    continueFree: "Continuar grátis",
    trialEndedTitle: "Seu teste grátis terminou",
    trialEndedBody:
      "Para continuar usando os recursos Premium, inicie uma assinatura. Você pode continuar usando os recursos gratuitos a qualquer momento.",
  },
  common: { loading: "Carregando…", save: "Salvar", cancel: "Cancelar", close: "Fechar" },
};

// Dutch
const nlCommon = {
  app: { name: "PipeKeeper" },
  nav: {
    home: "Home",
    pipes: "Pijpen",
    tobacco: "Tabak",
    cellar: "Kelder",
    community: "Community",
    profile: "Profiel",
    help: "Help",
    faq: "FAQ",
    support: "Support",
    terms: "Servicevoorwaarden",
    privacy: "Privacybeleid",
  },
  subscription: {
    title: "Abonnement",
    manage: "Abonnement beheren",
    subscribe: "Abonneren",
    continueFree: "Gratis doorgaan",
    trialEndedTitle: "Je gratis proefperiode is afgelopen",
    trialEndedBody:
      "Om Premium-functies te blijven gebruiken, start je een abonnement. Je kunt de gratis functies altijd blijven gebruiken.",
  },
  common: { loading: "Laden…", save: "Opslaan", cancel: "Annuleren", close: "Sluiten" },
};

// Polish
const plCommon = {
  app: { name: "PipeKeeper" },
  nav: {
    home: "Strona główna",
    pipes: "Fajki",
    tobacco: "Tytoń",
    cellar: "Piwniczka",
    community: "Społeczność",
    profile: "Profil",
    help: "Pomoc",
    faq: "FAQ",
    support: "Wsparcie",
    terms: "Warunki korzystania",
    privacy: "Polityka prywatności",
  },
  subscription: {
    title: "Subskrypcja",
    manage: "Zarządzaj subskrypcją",
    subscribe: "Subskrybuj",
    continueFree: "Kontynuuj bezpłatnie",
    trialEndedTitle: "Bezpłatny okres próbny dobiegł końca",
    trialEndedBody:
      "Aby dalej korzystać z funkcji Premium, rozpocznij subskrypcję. Możesz nadal korzystać z funkcji bezpłatnych w dowolnym momencie.",
  },
  common: { loading: "Ładowanie…", save: "Zapisz", cancel: "Anuluj", close: "Zamknij" },
};

// Japanese
const jaCommon = {
  app: { name: "PipeKeeper" },
  nav: {
    home: "ホーム",
    pipes: "パイプ",
    tobacco: "タバコ",
    cellar: "セラー",
    community: "コミュニティ",
    profile: "プロフィール",
    help: "ヘルプ",
    faq: "FAQ",
    support: "サポート",
    terms: "利用規約",
    privacy: "プライバシーポリシー",
  },
  subscription: {
    title: "サブスクリプション",
    manage: "サブスクリプションを管理",
    subscribe: "購読する",
    continueFree: "無料で続ける",
    trialEndedTitle: "無料トライアルが終了しました",
    trialEndedBody:
      "Premium 機能を引き続き使用するには、サブスクリプションを開始してください。無料機能はいつでも利用できます。",
  },
  common: { loading: "読み込み中…", save: "保存", cancel: "キャンセル", close: "閉じる" },
};

// Simplified Chinese
const zhHansCommon = {
  app: { name: "PipeKeeper" },
  nav: {
    home: "首页",
    pipes: "烟斗",
    tobacco: "烟草",
    cellar: "窖藏",
    community: "社区",
    profile: "个人资料",
    help: "帮助",
    faq: "常见问题",
    support: "支持",
    terms: "服务条款",
    privacy: "隐私政策",
  },
  subscription: {
    title: "订阅",
    manage: "管理订阅",
    subscribe: "订阅",
    continueFree: "继续免费使用",
    trialEndedTitle: "您的免费试用已结束",
    trialEndedBody: "要继续使用高级功能，请开始订阅。您可以随时继续使用免费功能。",
  },
  common: { loading: "加载中…", save: "保存", cancel: "取消", close: "关闭" },
};

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

// Normalize raw browser languages to our supported list
function normalizeLng(raw) {
  const l = (raw || "en").replace("_", "-");
  if (l.startsWith("pt")) return "pt-BR";
  if (l.startsWith("zh")) return "zh-Hans";
  // Prefer exact match, else base language
  if (resources[l]) return l;
  const base = l.split("-")[0];
  return resources[base] ? base : "en";
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    detection: {
      // Detect from localStorage first, then browser
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "pk_lang",
    },
    react: { useSuspense: false },
  });

// If detector yields something like "en-US", normalize it once at startup
try {
  const current = i18n.language;
  const normalized = normalizeLng(current);
  if (current && normalized && current !== normalized) {
    i18n.changeLanguage(normalized);
  }
} catch {}

export default i18n;