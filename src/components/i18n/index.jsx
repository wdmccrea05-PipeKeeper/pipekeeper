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
    nav: { home:"Home", pipes:"Pipes", tobacco:"Tobacco", cellar:"Cellar", community:"Community", profile:"Profile", help:"Help", faq:"FAQ", support:"Support", terms:"Terms", privacy:"Privacy" },
    subscription: { title:"Subscription", manage:"Manage subscription", subscribe:"Subscribe", continueFree:"Continue Free",
      trialEndedTitle:"Your free trial has ended",
      trialEndedBody:"To continue using Premium features, please start a subscription. You can keep using free collection features anytime."
    },
    common: { loading:"Loading…", save:"Save", cancel:"Cancel", close:"Close" },
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
      trialEndedBody:"Para seguir usando las funciones Premium, inicia una suscripción. Puedes seguir usando las funciones gratuitas en cualquier momento."
    },
    common: { loading:"Cargando…", save:"Guardar", cancel:"Cancelar", close:"Cerrar" },
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
      trialEndedBody:"Pour continuer à utiliser les fonctionnalités Premium, démarrez un abonnement. Vous pouvez continuer à utiliser les fonctionnalités gratuites à tout moment."
    },
    common: { loading:"Chargement…", save:"Enregistrer", cancel:"Annuler", close:"Fermer" },
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
      trialEndedBody:"Um Premium-Funktionen weiter zu nutzen, starten Sie bitte ein Abonnement. Kostenlose Funktionen können jederzeit genutzt werden."
    },
    common: { loading:"Wird geladen…", save:"Speichern", cancel:"Abbrechen", close:"Schließen" },
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
      trialEndedBody:"Per continuare a usare le funzioni Premium, avvia un abbonamento. Puoi continuare a usare le funzioni gratuite in qualsiasi momento."
    },
    common: { loading:"Caricamento…", save:"Salva", cancel:"Annulla", close:"Chiudi" },
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
      trialEndedBody:"Para continuar usando os recursos Premium, inicie uma assinatura. Você pode continuar usando os recursos gratuitos a qualquer momento."
    },
    common: { loading:"Carregando…", save:"Salvar", cancel:"Cancelar", close:"Fechar" },
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
      trialEndedBody:"Om Premium-functies te blijven gebruiken, start je een abonnement. Je kunt de gratis functies altijd blijven gebruiken."
    },
    common: { loading:"Laden…", save:"Opslaan", cancel:"Annuleren", close:"Sluiten" },
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
      trialEndedBody:"Aby dalej korzystać z funkcji Premium, rozpocznij subskrypcję. Możesz korzystać z funkcji bezpłatnych w dowolnym momencie."
    },
    common: { loading:"Ładowanie…", save:"Zapisz", cancel:"Anuluj", close:"Zamknij" },
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
      trialEndedBody:"Premium 機能を継続して使用するには、サブスクリプションを開始してください。無料機能はいつでも利用できます。"
    },
    common: { loading:"読み込み中…", save:"保存", cancel:"キャンセル", close:"閉じる" },
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
      trialEndedBody:"要继续使用高级功能，请开始订阅。您可以随时继续使用免费功能。"
    },
    common: { loading:"加载中…", save:"保存", cancel:"取消", close:"关闭" },
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