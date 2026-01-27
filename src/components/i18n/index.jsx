import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

/**
 * IMPORTANT:
 * - pk_lang is the single source of truth
 * - normalizeLng maps browser languages to our supported set
 */

const SUPPORTED = ["en","es","fr","de","it","pt-BR","nl","pl","ja","zh-Hans"];

// --- Translations (keep concise; expand over time) ---
const resources = {
  en: { common: {
    nav: { home:"Home", pipes:"Pipes", tobacco:"Tobacco", cellar:"Cellar", community:"Community", profile:"Profile", help:"Help", faq:"FAQ" },
    subscription: { title:"Subscription", manage:"Manage subscription", subscribe:"Subscribe", continueFree:"Continue Free",
      trialEndedTitle:"Your free trial has ended",
      trialEndedBody:"To continue using Premium features, please start a subscription. You can keep using free collection features anytime."
    },
    common: { loading:"Loading…", save:"Save", cancel:"Cancel", close:"Close" }
  }},
  es: { common: {
    nav: { home:"Inicio", pipes:"Pipas", tobacco:"Tabaco", cellar:"Bodega", community:"Comunidad", profile:"Perfil", help:"Ayuda", faq:"Preguntas frecuentes" },
    subscription: { title:"Suscripción", manage:"Administrar suscripción", subscribe:"Suscribirse", continueFree:"Continuar gratis",
      trialEndedTitle:"Tu prueba gratuita terminó",
      trialEndedBody:"Para seguir usando las funciones Premium, inicia una suscripción. Puedes seguir usando las funciones gratuitas en cualquier momento."
    },
    common: { loading:"Cargando…", save:"Guardar", cancel:"Cancelar", close:"Cerrar" }
  }},
  fr: { common: {
    nav: { home:"Accueil", pipes:"Pipes", tobacco:"Tabac", cellar:"Cave", community:"Communauté", profile:"Profil", help:"Aide", faq:"FAQ" },
    subscription: { title:"Abonnement", manage:"Gérer l'abonnement", subscribe:"S'abonner", continueFree:"Continuer gratuitement",
      trialEndedTitle:"Votre essai gratuit est terminé",
      trialEndedBody:"Pour continuer à utiliser les fonctionnalités Premium, démarrez un abonnement. Vous pouvez continuer à utiliser les fonctionnalités gratuites à tout moment."
    },
    common: { loading:"Chargement…", save:"Enregistrer", cancel:"Annuler", close:"Fermer" }
  }},
  de: { common: {
    nav: { home:"Start", pipes:"Pfeifen", tobacco:"Tabak", cellar:"Keller", community:"Community", profile:"Profil", help:"Hilfe", faq:"FAQ" },
    subscription: { title:"Abonnement", manage:"Abonnement verwalten", subscribe:"Abonnieren", continueFree:"Kostenlos fortfahren",
      trialEndedTitle:"Ihre kostenlose Testversion ist abgelaufen",
      trialEndedBody:"Um Premium-Funktionen weiter zu nutzen, starten Sie bitte ein Abonnement. Kostenlose Funktionen können jederzeit genutzt werden."
    },
    common: { loading:"Wird geladen…", save:"Speichern", cancel:"Abbrechen", close:"Schließen" }
  }},
  it: { common: {
    nav: { home:"Home", pipes:"Pipe", tobacco:"Tabacco", cellar:"Cantina", community:"Community", profile:"Profilo", help:"Aiuto", faq:"FAQ" },
    subscription: { title:"Abbonamento", manage:"Gestisci abbonamento", subscribe:"Abbonati", continueFree:"Continua gratis",
      trialEndedTitle:"La prova gratuita è terminata",
      trialEndedBody:"Per continuare a usare le funzioni Premium, avvia un abbonamento. Puoi continuare a usare le funzioni gratuite in qualsiasi momento."
    },
    common: { loading:"Caricamento…", save:"Salva", cancel:"Annulla", close:"Chiudi" }
  }},
  "pt-BR": { common: {
    nav: { home:"Início", pipes:"Cachimbos", tobacco:"Tabaco", cellar:"Adega", community:"Comunidade", profile:"Perfil", help:"Ajuda", faq:"Perguntas frequentes" },
    subscription: { title:"Assinatura", manage:"Gerenciar assinatura", subscribe:"Assinar", continueFree:"Continuar grátis",
      trialEndedTitle:"Seu teste grátis terminou",
      trialEndedBody:"Para continuar usando os recursos Premium, inicie uma assinatura. Você pode continuar usando os recursos gratuitos a qualquer momento."
    },
    common: { loading:"Carregando…", save:"Salvar", cancel:"Cancelar", close:"Fechar" }
  }},
  nl: { common: {
    nav: { home:"Home", pipes:"Pijpen", tobacco:"Tabak", cellar:"Kelder", community:"Community", profile:"Profiel", help:"Help", faq:"FAQ" },
    subscription: { title:"Abonnement", manage:"Abonnement beheren", subscribe:"Abonneren", continueFree:"Gratis doorgaan",
      trialEndedTitle:"Je gratis proefperiode is afgelopen",
      trialEndedBody:"Om Premium-functies te blijven gebruiken, start je een abonnement. Je kunt de gratis functies altijd blijven gebruiken."
    },
    common: { loading:"Laden…", save:"Opslaan", cancel:"Annuleren", close:"Sluiten" }
  }},
  pl: { common: {
    nav: { home:"Strona główna", pipes:"Fajki", tobacco:"Tytoń", cellar:"Piwniczka", community:"Społeczność", profile:"Profil", help:"Pomoc", faq:"FAQ" },
    subscription: { title:"Subskrypcja", manage:"Zarządzaj subskrypcją", subscribe:"Subskrybuj", continueFree:"Kontynuuj bezpłatnie",
      trialEndedTitle:"Bezpłatny okres próbny dobiegł końca",
      trialEndedBody:"Aby dalej korzystać z funkcji Premium, rozpocznij subskrypcję. Możesz korzystać z funkcji bezpłatnych w dowolnym momencie."
    },
    common: { loading:"Ładowanie…", save:"Zapisz", cancel:"Anuluj", close:"Zamknij" }
  }},
  ja: { common: {
    nav: { home:"ホーム", pipes:"パイプ", tobacco:"タバコ", cellar:"セラー", community:"コミュニティ", profile:"プロフィール", help:"ヘルプ", faq:"FAQ" },
    subscription: { title:"サブスクリプション", manage:"サブスクリプションを管理", subscribe:"購読する", continueFree:"無料で続ける",
      trialEndedTitle:"無料トライアルが終了しました",
      trialEndedBody:"Premium 機能を継続して使用するには、サブスクリプションを開始してください。無料機能はいつでも利用できます。"
    },
    common: { loading:"読み込み中…", save:"保存", cancel:"キャンセル", close:"閉じる" }
  }},
  "zh-Hans": { common: {
    nav: { home:"首页", pipes:"烟斗", tobacco:"烟草", cellar:"窖藏", community:"社区", profile:"个人资料", help:"帮助", faq:"常见问题" },
    subscription: { title:"订阅", manage:"管理订阅", subscribe:"订阅", continueFree:"继续免费使用",
      trialEndedTitle:"您的免费试用已结束",
      trialEndedBody:"要继续使用高级功能，请开始订阅。您可以随时继续使用免费功能。"
    },
    common: { loading:"加载中…", save:"保存", cancel:"取消", close:"关闭" }
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