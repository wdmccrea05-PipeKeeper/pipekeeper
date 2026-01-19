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

// Add more languages by adding new objects and including them in resources
const resources = {
  en: { common: enCommon },
  es: { common: esCommon },
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