/**
 * Collector appreciation EMAIL campaign — pure rules and copy.
 *
 * No SDK imports here on purpose: every function imports these rules and the
 * test suite imports them directly, so eligibility, localization and link
 * building can never drift between the sender, the dashboard and the tests.
 */

import { evaluateEligibility, normEmail, resolveRedemptionWindow } from "./appreciationCampaign.ts";

export const EMAIL_TEMPLATE_KEY = "collector_appreciation_email";
export const EMAIL_TEMPLATE_NAME = "CollectorAppreciation";
export const APP_URL = "https://collection-keeper.app";
export const APP_ORIGIN = "https://collectionkeeper.base44.app";
export const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61585481946188";
export const BRAND_NAME = "CollectionKeeper";
export const LOGO_URL =
  "https://media.base44.com/images/public/694956e18d119cc497192525/b5c3204ab_CollectionKeeperWB.png";
export const CLICK_PATH = "/functions/trackAppreciationEmailClick";
export const UNSUBSCRIBE_PATH = "/functions/unsubscribeAppreciationEmail";
export const HERO_URL =
  "https://media.base44.com/images/public/694956e18d119cc497192525/211a3c29fb2c62912e3ca40c77afb2b1_generated_image.png";
export const DEFAULT_MAILING_ADDRESS = "";

export const EMAIL_LANGS = ["en", "es", "fr", "de", "it", "pt-BR", "nl", "pl", "ja", "zh-Hans"];

const MODULES = ["PipeKeeper", "WhiskeyKeeper", "CigarKeeper", "WineKeeper"];

const en = {
  subject: "We Would Never Leave a Fellow Collector Out — Your Free Week of Pro!",
  preview:
    "A special thank-you to our existing collectors. Activate your complimentary Pro access through Cyber Monday.",
  headline: "We Would Never Leave a Fellow Collector Out!",
  intro:
    "We're welcoming new CollectionKeeper users with a complimentary week of Pro access, and we want our existing collectors to enjoy the same experience.",
  gift: "As a thank-you for being part of our community, we're giving you seven days of FREE CollectionKeeper Pro access across all four collection modules:",
  featuresIntro: "Discover everything CollectionKeeper Pro has to offer:",
  features: [
    "Unlimited collection inventory",
    "AI-powered Collection Curator",
    "Personalized pairing recommendations",
    "Collection optimization and specialization insights",
    "Advanced analytics and valuations",
    "Printable reports and collection summaries",
    "Cross-collection recommendations",
    "And so much more!",
  ],
  deadline:
    "Activate your complimentary week by Cyber Monday, November 30, 2026, at 11:59 p.m. Eastern Time.",
  timing:
    "Your full seven days begin when you activate your offer, even if you wait until Monday.",
  promise: "No credit card. No commitment. No automatic charges.",
  cta: "Activate My Free Week",
  thanks: "Thank you for being part of the CollectionKeeper community.",
  signoff: "Happy collecting!",
  tagline: "One App. Every Collection.",
  builtBy: "Built by collectors, for collectors.",
  follow: "Follow us on Facebook",
  footerWhy: "You're receiving this email because you have a CollectionKeeper account.",
  unsubscribe: "Unsubscribe",
};

const es = {
  subject: "¡Nunca dejaríamos fuera a un coleccionista — tu semana Pro gratis!",
  preview:
    "Un agradecimiento especial a nuestros coleccionistas. Activa tu acceso Pro de cortesía antes del Cyber Monday.",
  headline: "¡Nunca dejaríamos fuera a un coleccionista!",
  intro:
    "Estamos recibiendo a los nuevos usuarios de CollectionKeeper con una semana de acceso Pro de cortesía, y queremos que nuestros coleccionistas actuales disfruten de la misma experiencia.",
  gift: "Como agradecimiento por formar parte de nuestra comunidad, te damos siete días de acceso Pro GRATIS a CollectionKeeper en los cuatro módulos de colección:",
  featuresIntro: "Descubre todo lo que ofrece CollectionKeeper Pro:",
  features: [
    "Inventario de colección ilimitado",
    "Curador de colecciones con IA",
    "Recomendaciones de maridaje personalizadas",
    "Optimización de la colección e ideas de especialización",
    "Análisis avanzados y valoraciones",
    "Informes imprimibles y resúmenes de la colección",
    "Recomendaciones entre colecciones",
    "¡Y mucho más!",
  ],
  deadline:
    "Activa tu semana de cortesía antes del Cyber Monday, 30 de noviembre de 2026, a las 11:59 p. m. hora del Este.",
  timing:
    "Tus siete días completos comienzan cuando activas tu oferta, aunque esperes hasta el lunes.",
  promise: "Sin tarjeta de crédito. Sin compromiso. Sin cargos automáticos.",
  cta: "Activar mi semana gratis",
  thanks: "Gracias por formar parte de la comunidad de CollectionKeeper.",
  signoff: "¡Feliz colección!",
  tagline: "Una app. Todas tus colecciones.",
  builtBy: "Creada por coleccionistas, para coleccionistas.",
  follow: "Síguenos en Facebook",
  footerWhy: "Recibes este correo porque tienes una cuenta de CollectionKeeper.",
  unsubscribe: "Darse de baja",
};

const fr = {
  subject: "Nous ne laisserions jamais un collectionneur de côté — votre semaine Pro offerte !",
  preview:
    "Un merci tout particulier à nos collectionneurs. Activez votre accès Pro offert avant le Cyber Monday.",
  headline: "Nous ne laisserions jamais un collectionneur de côté !",
  intro:
    "Nous accueillons les nouveaux utilisateurs de CollectionKeeper avec une semaine d’accès Pro offerte, et nous voulons que nos collectionneurs actuels vivent la même expérience.",
  gift: "Pour vous remercier de faire partie de notre communauté, nous vous offrons sept jours d’accès Pro GRATUIT à CollectionKeeper sur les quatre modules de collection :",
  featuresIntro: "Découvrez tout ce que CollectionKeeper Pro propose :",
  features: [
    "Inventaire de collection illimité",
    "Conservateur de collection assisté par IA",
    "Recommandations d’accords personnalisées",
    "Optimisation de la collection et idées de spécialisation",
    "Analyses avancées et estimations de valeur",
    "Rapports imprimables et synthèses de collection",
    "Recommandations entre collections",
    "Et bien plus encore !",
  ],
  deadline:
    "Activez votre semaine offerte avant le Cyber Monday, le 30 novembre 2026 à 23 h 59 (heure de l’Est).",
  timing:
    "Vos sept jours complets commencent lorsque vous activez votre offre, même si vous attendez lundi.",
  promise: "Pas de carte bancaire. Aucun engagement. Aucun prélèvement automatique.",
  cta: "Activer ma semaine offerte",
  thanks: "Merci de faire partie de la communauté CollectionKeeper.",
  signoff: "Belles collections !",
  tagline: "Une app. Toutes vos collections.",
  builtBy: "Conçue par des collectionneurs, pour des collectionneurs.",
  follow: "Suivez-nous sur Facebook",
  footerWhy: "Vous recevez cet e-mail parce que vous avez un compte CollectionKeeper.",
  unsubscribe: "Se désabonner",
};

const de = {
  subject: "Wir lassen keinen Sammler zurück — deine kostenlose Pro-Woche!",
  preview:
    "Ein besonderes Dankeschön an unsere Sammler. Aktiviere deinen kostenlosen Pro-Zugang bis Cyber Monday.",
  headline: "Wir lassen keinen Sammler zurück!",
  intro:
    "Wir begrüßen neue CollectionKeeper-Nutzer mit einer kostenlosen Pro-Woche, und unsere bestehenden Sammler sollen dieselbe Erfahrung genießen.",
  gift: "Als Dankeschön dafür, dass du Teil unserer Community bist, schenken wir dir sieben Tage KOSTENLOSEN CollectionKeeper-Pro-Zugang für alle vier Sammlungsmodule:",
  featuresIntro: "Entdecke alles, was CollectionKeeper Pro bietet:",
  features: [
    "Unbegrenztes Sammlungsinventar",
    "KI-gestützter Sammlungs-Kurator",
    "Personalisierte Pairing-Empfehlungen",
    "Optimierung der Sammlung und Spezialisierungs-Einblicke",
    "Erweiterte Analysen und Wertschätzungen",
    "Druckbare Berichte und Sammlungsübersichten",
    "Empfehlungen über alle Sammlungen hinweg",
    "Und vieles mehr!",
  ],
  deadline:
    "Aktiviere deine kostenlose Woche bis Cyber Monday, 30. November 2026, 23:59 Uhr Eastern Time.",
  timing:
    "Deine vollen sieben Tage beginnen, sobald du dein Angebot aktivierst, auch wenn du bis Montag wartest.",
  promise: "Keine Kreditkarte. Keine Verpflichtung. Keine automatischen Abbuchungen.",
  cta: "Meine Gratiswoche aktivieren",
  thanks: "Danke, dass du Teil der CollectionKeeper-Community bist.",
  signoff: "Viel Freude beim Sammeln!",
  tagline: "Eine App. Alle Sammlungen.",
  builtBy: "Von Sammlern für Sammler gebaut.",
  follow: "Folge uns auf Facebook",
  footerWhy: "Du erhältst diese E-Mail, weil du ein CollectionKeeper-Konto hast.",
  unsubscribe: "Abmelden",
};

const it = {
  subject: "Non lasceremo mai fuori un collezionista — la tua settimana Pro gratis!",
  preview:
    "Un ringraziamento speciale ai nostri collezionisti. Attiva il tuo accesso Pro in omaggio entro il Cyber Monday.",
  headline: "Non lasceremo mai fuori un collezionista!",
  intro:
    "Stiamo accogliendo i nuovi utenti di CollectionKeeper con una settimana di accesso Pro in omaggio, e vogliamo che i nostri collezionisti attuali vivano la stessa esperienza.",
  gift: "Come ringraziamento per far parte della nostra comunità, ti regaliamo sette giorni di accesso Pro GRATUITO a CollectionKeeper su tutti e quattro i moduli di collezione:",
  featuresIntro: "Scopri tutto ciò che CollectionKeeper Pro offre:",
  features: [
    "Inventario di collezione illimitato",
    "Curatore di collezioni con IA",
    "Consigli di abbinamento personalizzati",
    "Ottimizzazione della collezione e approfondimenti di specializzazione",
    "Analisi avanzate e valutazioni",
    "Report stampabili e riepiloghi della collezione",
    "Consigli tra collezioni diverse",
    "E molto altro ancora!",
  ],
  deadline:
    "Attiva la tua settimana in omaggio entro il Cyber Monday, 30 novembre 2026, alle 23:59 ora della Costa Orientale.",
  timing:
    "I tuoi sette giorni completi iniziano quando attivi l’offerta, anche se aspetti lunedì.",
  promise: "Nessuna carta di credito. Nessun impegno. Nessun addebito automatico.",
  cta: "Attiva la mia settimana gratis",
  thanks: "Grazie per far parte della comunità di CollectionKeeper.",
  signoff: "Buona collezione!",
  tagline: "Una app. Tutte le collezioni.",
  builtBy: "Creata da collezionisti, per i collezionisti.",
  follow: "Seguici su Facebook",
  footerWhy: "Ricevi questa email perché hai un account CollectionKeeper.",
  unsubscribe: "Annulla iscrizione",
};

const ptBR = {
  subject: "Nunca deixaríamos um colecionador de fora — sua semana Pro grátis!",
  preview:
    "Um agradecimento especial aos nossos colecionadores. Ative seu acesso Pro de cortesia até a Cyber Monday.",
  headline: "Nunca deixaríamos um colecionador de fora!",
  intro:
    "Estamos recebendo os novos usuários do CollectionKeeper com uma semana de acesso Pro de cortesia, e queremos que nossos colecionadores atuais tenham a mesma experiência.",
  gift: "Como agradecimento por fazer parte da nossa comunidade, estamos dando sete dias de acesso Pro GRÁTIS ao CollectionKeeper nos quatro módulos de coleção:",
  featuresIntro: "Descubra tudo o que o CollectionKeeper Pro oferece:",
  features: [
    "Inventário de coleção ilimitado",
    "Curador de coleções com IA",
    "Recomendações de harmonização personalizadas",
    "Otimização da coleção e insights de especialização",
    "Análises avançadas e avaliações",
    "Relatórios imprimíveis e resumos da coleção",
    "Recomendações entre coleções",
    "E muito mais!",
  ],
  deadline:
    "Ative sua semana de cortesia até a Cyber Monday, 30 de novembro de 2026, às 23h59 no horário do Leste.",
  timing:
    "Seus sete dias completos começam quando você ativa a oferta, mesmo que espere até segunda.",
  promise: "Sem cartão de crédito. Sem compromisso. Sem cobranças automáticas.",
  cta: "Ativar minha semana grátis",
  thanks: "Obrigado por fazer parte da comunidade CollectionKeeper.",
  signoff: "Boas coleções!",
  tagline: "Um app. Todas as coleções.",
  builtBy: "Feito por colecionadores, para colecionadores.",
  follow: "Siga-nos no Facebook",
  footerWhy: "Você recebe este e-mail porque tem uma conta CollectionKeeper.",
  unsubscribe: "Cancelar inscrição",
};

const nl = {
  subject: "Wij laten een mede-verzamelaar nooit buiten — jouw gratis Pro-week!",
  preview:
    "Een speciaal dankjewel aan onze verzamelaars. Activeer je gratis Pro-toegang vóór Cyber Monday.",
  headline: "Wij laten een mede-verzamelaar nooit buiten!",
  intro:
    "We verwelkomen nieuwe CollectionKeeper-gebruikers met een gratis week Pro-toegang, en onze huidige verzamelaars gunnen we dezelfde ervaring.",
  gift: "Als dank dat je deel uitmaakt van onze community geven we je zeven dagen GRATIS CollectionKeeper Pro-toegang voor alle vier verzamelmodules:",
  featuresIntro: "Ontdek alles wat CollectionKeeper Pro biedt:",
  features: [
    "Onbeperkte verzamelvoorraad",
    "AI-gestuurde verzamelcurator",
    "Persoonlijke pairing-aanbevelingen",
    "Optimalisatie van je verzameling en specialisatie-inzichten",
    "Geavanceerde analyses en waarderingen",
    "Afdrukbare rapporten en verzameloverzichten",
    "Aanbevelingen over alle verzamelingen heen",
    "En nog veel meer!",
  ],
  deadline:
    "Activeer je gratis week vóór Cyber Monday, 30 november 2026, om 23:59 uur Eastern Time.",
  timing:
    "Je volledige zeven dagen beginnen zodra je je aanbieding activeert, ook als je tot maandag wacht.",
  promise: "Geen creditcard. Geen verplichting. Geen automatische afschrijvingen.",
  cta: "Mijn gratis week activeren",
  thanks: "Bedankt dat je deel uitmaakt van de CollectionKeeper-community.",
  signoff: "Veel verzamelplezier!",
  tagline: "Eén app. Alle verzamelingen.",
  builtBy: "Gebouwd door verzamelaars, voor verzamelaars.",
  follow: "Volg ons op Facebook",
  footerWhy: "Je ontvangt deze e-mail omdat je een CollectionKeeper-account hebt.",
  unsubscribe: "Afmelden",
};

const pl = {
  subject: "Nigdy nie zostawilibyśmy kolekcjonera samego — Twój bezpłatny tydzień Pro!",
  preview:
    "Wyjątkowe podziękowanie dla naszych kolekcjonerów. Aktywuj bezpłatny dostęp Pro do Cyber Monday.",
  headline: "Nigdy nie zostawilibyśmy kolekcjonera samego!",
  intro:
    "Witamy nowych użytkowników CollectionKeeper bezpłatnym tygodniem dostępu Pro i chcemy, aby nasi obecni kolekcjonerzy doświadczyli tego samego.",
  gift: "W podziękowaniu za bycie częścią naszej społeczności dajemy Ci siedem dni BEZPŁATNEGO dostępu CollectionKeeper Pro we wszystkich czterech modułach kolekcji:",
  featuresIntro: "Odkryj wszystko, co oferuje CollectionKeeper Pro:",
  features: [
    "Nieograniczony inwentarz kolekcji",
    "Kurator kolekcji oparty na AI",
    "Spersonalizowane rekomendacje parowania",
    "Optymalizacja kolekcji i analizy specjalizacji",
    "Zaawansowane analizy i wyceny",
    "Raporty do druku i podsumowania kolekcji",
    "Rekomendacje między kolekcjami",
    "I wiele więcej!",
  ],
  deadline:
    "Aktywuj bezpłatny tydzień do Cyber Monday, 30 listopada 2026, godz. 23:59 czasu wschodniego USA.",
  timing:
    "Twoje pełne siedem dni zaczyna się w momencie aktywacji oferty, nawet jeśli poczekasz do poniedziałku.",
  promise: "Bez karty kredytowej. Bez zobowiązań. Bez automatycznych obciążeń.",
  cta: "Aktywuj mój bezpłatny tydzień",
  thanks: "Dziękujemy, że jesteś częścią społeczności CollectionKeeper.",
  signoff: "Miłego kolekcjonowania!",
  tagline: "Jedna aplikacja. Wszystkie kolekcje.",
  builtBy: "Stworzona przez kolekcjonerów dla kolekcjonerów.",
  follow: "Obserwuj nas na Facebooku",
  footerWhy: "Otrzymujesz tę wiadomość, ponieważ masz konto CollectionKeeper.",
  unsubscribe: "Wypisz się",
};

const ja = {
  subject: "仲間のコレクターを置き去りにはしません — Proの無料1週間をどうぞ！",
  preview:
    "既存のコレクターの皆様へ、感謝を込めて。サイバーマンデーまでに無料のProアクセスを有効にしてください。",
  headline: "仲間のコレクターを置き去りにはしません！",
  intro:
    "CollectionKeeperでは新しいユーザーにProアクセスの無料1週間をお届けしています。既存のコレクターの皆様にも同じ体験をお楽しみいただきたいと考えています。",
  gift: "コミュニティに参加してくださっているお礼として、4つのコレクションモジュールすべてで使えるCollectionKeeper Proアクセスを7日間無料で差し上げます：",
  featuresIntro: "CollectionKeeper Proのすべてをご覧ください：",
  features: [
    "コレクション在庫は無制限",
    "AIによるコレクション・キュレーター",
    "パーソナライズされたペアリング提案",
    "コレクション最適化と専門化のインサイト",
    "高度な分析と評価額",
    "印刷できるレポートとコレクション概要",
    "コレクションを横断したレコメンド",
    "さらに多くの機能！",
  ],
  deadline:
    "無料の1週間は、サイバーマンデー（2026年11月30日）東部時間午後11時59分までに有効にしてください。",
  timing:
    "7日間は有効にした時点から始まります。月曜日まで待っても期間は短くなりません。",
  promise: "クレジットカード不要。契約不要。自動請求なし。",
  cta: "無料の1週間を有効にする",
  thanks: "CollectionKeeperコミュニティに参加してくださりありがとうございます。",
  signoff: "よいコレクションを！",
  tagline: "ひとつのアプリで、すべてのコレクションを。",
  builtBy: "コレクターが、コレクターのために。",
  follow: "Facebookでフォローする",
  footerWhy: "このメールは、CollectionKeeperのアカウントをお持ちの方にお送りしています。",
  unsubscribe: "配信停止",
};

const zhHans = {
  subject: "我们绝不会把任何一位收藏家落下 — 您的免费 Pro 一周！",
  preview: "致我们收藏家的一份特别感谢。请在网络星期一之前激活您的免费 Pro 权限。",
  headline: "我们绝不会把任何一位收藏家落下！",
  intro:
    "我们正以一周免费 Pro 权限欢迎 CollectionKeeper 的新用户，也希望我们的老收藏家享受同样的体验。",
  gift: "为感谢您加入我们的社区，我们赠送您七天免费的 CollectionKeeper Pro 权限，涵盖全部四个收藏模块：",
  featuresIntro: "了解 CollectionKeeper Pro 的全部功能：",
  features: [
    "无限收藏库存",
    "AI 智能收藏策展人",
    "个性化搭配推荐",
    "收藏优化与专业化洞察",
    "进阶分析与估值",
    "可打印报告与收藏摘要",
    "跨收藏推荐",
    "还有更多！",
  ],
  deadline: "请在网络星期一（2026年11月30日）美国东部时间晚上11:59之前激活您的免费一周。",
  timing: "完整的七天从您激活之时开始计算，即使您等到星期一才激活也不会缩短。",
  promise: "无需信用卡。无需承诺。不会自动扣费。",
  cta: "激活我的免费一周",
  thanks: "感谢您成为 CollectionKeeper 社区的一员。",
  signoff: "收藏愉快！",
  tagline: "一个应用，所有收藏。",
  builtBy: "由收藏家打造，为收藏家而生。",
  follow: "在 Facebook 上关注我们",
  footerWhy: "您收到这封邮件，是因为您拥有 CollectionKeeper 账户。",
  unsubscribe: "取消订阅",
};

export const EMAIL_COPY = {
  en,
  es,
  fr,
  de,
  it,
  "pt-BR": ptBR,
  nl,
  pl,
  ja,
  "zh-Hans": zhHans,
};

export function normalizeEmailLang(value) {
  const raw = String(value || "").trim();
  if (!raw) return "en";
  const exact = EMAIL_LANGS.find((code) => code.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const base = raw.split(/[-_]/)[0].toLowerCase();
  const match = EMAIL_LANGS.find((code) => code.toLowerCase().split("-")[0] === base);
  return match || "en";
}

export function languageForUser(user) {
  return normalizeEmailLang(user?.preferred_language || user?.language || "en");
}

export function copyFor(lang) {
  return EMAIL_COPY[normalizeEmailLang(lang)] || EMAIL_COPY.en;
}

export function clickUrlFor(token) {
  const safe = encodeURIComponent(String(token || ""));
  return `${APP_ORIGIN}${CLICK_PATH}?t=${safe}`;
}

export function unsubscribeUrlFor(token) {
  const safe = encodeURIComponent(String(token || "test"));
  return `${APP_ORIGIN}${UNSUBSCRIBE_PATH}?t=${safe}`;
}

export function redemptionUrl(campaignId) {
  const suffix = campaignId ? `&ec=${encodeURIComponent(campaignId)}` : "";
  return `${APP_URL}/Subscription?appreciation=1&channel=email${suffix}`;
}

/** Flat variables handed to the branded template for one language. */
export function buildVariables(lang, options = {}) {
  const copy = copyFor(lang);
  const mailingAddress = String(options.mailingAddress || DEFAULT_MAILING_ADDRESS || "").trim();
  const ctaUrl = options.ctaUrl || redemptionUrl(options.campaignId);
  const vars = {
    subject_line: options.subjectOverride || copy.subject,
    preview: copy.preview,
    headline: copy.headline,
    intro: copy.intro,
    gift: copy.gift,
    features_intro: copy.featuresIntro,
    deadline: copy.deadline,
    timing: copy.timing,
    promise: copy.promise,
    cta: copy.cta,
    cta_url: ctaUrl,
    thanks: copy.thanks,
    signoff: copy.signoff,
    tagline: copy.tagline,
    built_by: copy.builtBy,
    follow: copy.follow,
    follow_url: FACEBOOK_URL,
    footer_why: copy.footerWhy,
    unsubscribe_label: copy.unsubscribe,
    mailing_address: mailingAddress,
    brand: BRAND_NAME,
    logo_url: LOGO_URL,
    hero_url: HERO_URL,
    module_1: MODULES[0],
    module_2: MODULES[1],
    module_3: MODULES[2],
    module_4: MODULES[3],
  };
  copy.features.forEach((feature, index) => {
    vars[`feature_${index + 1}`] = feature;
  });
  return vars;
}

/** Plain-text alternative, built from the same copy as the HTML email. */
export function buildPlainText(lang, options = {}) {
  const copy = copyFor(lang);
  const mailingAddress = String(options.mailingAddress || "").trim();
  const ctaUrl = options.ctaUrl || redemptionUrl(options.campaignId);
  const unsubscribeUrl = options.unsubscribeUrl || unsubscribeUrlFor("test");
  const lines = [
    copy.headline,
    "",
    copy.intro,
    "",
    copy.gift,
    ...MODULES.map((module) => `  - ${module}`),
    "",
    copy.featuresIntro,
    ...copy.features.map((feature) => `  - ${feature}`),
    "",
    copy.deadline,
    copy.timing,
    "",
    copy.promise,
    "",
    `${copy.cta}: ${ctaUrl}`,
    "",
    copy.thanks,
    copy.signoff,
    "",
    `${copy.tagline} ${copy.builtBy}`,
    `${copy.follow}: ${FACEBOOK_URL}`,
    "",
    copy.footerWhy,
    mailingAddress ? `${BRAND_NAME}, ${mailingAddress}` : BRAND_NAME,
    `${copy.unsubscribe}: ${unsubscribeUrl}`,
  ];
  return lines.join("\n");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function isValidEmail(value) {
  const email = normEmail(value);
  return EMAIL_RE.test(email) && !email.includes("..") && email.length <= 254;
}

/**
 * One collector, one verdict. Order matters: identity problems first, then
 * consent, then the campaign's own eligibility rules, then email-specific
 * exclusions. A reason is always returned so the dashboard can show exactly
 * why somebody is not receiving the email.
 */
export function classifyRecipient({
  user,
  grants = [],
  subscriptions = [],
  suppression = null,
  alreadyEmailed = false,
  config = null,
  languages = [],
  nowMs = Date.now(),
}) {
  const email = normEmail(user?.email);
  if (!email) return { eligible: false, reason: "no_email" };
  if (!isValidEmail(email)) return { eligible: false, reason: "invalid_email" };
  if (user?.is_disabled === true || user?.merged_into_user_id) {
    return { eligible: false, reason: "deactivated_account" };
  }
  if (suppression) {
    const reason = String(suppression.reason || "unsubscribed").toLowerCase();
    return { eligible: false, reason: reason === "bounce" ? "bounced" : reason };
  }

  const verdict = evaluateEligibility({ config, user, grants, subscriptions, nowMs });
  if (!verdict.eligible) return { eligible: false, reason: verdict.code };

  const language = languageForUser(user);
  const allowed = Array.isArray(languages) ? languages.filter(Boolean) : [];
  if (allowed.length > 0 && !allowed.includes(language)) {
    return { eligible: false, reason: "language_excluded" };
  }

  if (alreadyEmailed) return { eligible: false, reason: "already_emailed" };

  return { eligible: true, reason: "eligible", email, language };
}

export function recipientKey(email) {
  return `${EMAIL_TEMPLATE_KEY}:${normEmail(email)}`;
}

/** Campaign can only run while the redemption window is open. */
export function canDeliverCampaign(config, nowMs = Date.now()) {
  const window = resolveRedemptionWindow(config, nowMs);
  return { ...window, deliverable: !window.closed };
}

export const EXCLUSION_LABELS = {
  eligible: "Eligible",
  no_email: "No email address",
  invalid_email: "Invalid email address",
  deactivated_account: "Deactivated or merged account",
  unsubscribed: "Unsubscribed",
  bounced: "Bounced / suppressed",
  complaint: "Marked as spam",
  manual: "Suppressed by admin",
  invalid: "Invalid address (suppressed)",
  paid_subscriber: "Active paid subscriber",
  grandfathered_access: "Grandfathered Pro access",
  already_active: "Already has complimentary access",
  already_redeemed: "Already redeemed the offer",
  welcome_trial_active: "Active welcome trial",
  account_created_after_cutoff: "Account created after the cutoff",
  redemption_deadline_passed: "Redemption deadline passed",
  campaign_disabled: "Campaign disabled",
  language_excluded: "Outside the selected languages",
  already_emailed: "Already received this campaign email",
};

export function summarizeAudience(results = []) {
  const excluded = {};
  const byLanguage = {};
  let eligible = 0;
  for (const row of results) {
    if (row.eligible) {
      eligible += 1;
      byLanguage[row.language] = (byLanguage[row.language] || 0) + 1;
    } else {
      excluded[row.reason] = (excluded[row.reason] || 0) + 1;
    }
  }
  return { eligible, excluded, byLanguage };
}

export function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const EMAIL_FONT = "'Wix Madefor Text', Helvetica, Arial, sans-serif";
const EMAIL_SERIF = "'Dazzed', Georgia, 'Times New Roman', serif";
const ORANGE = "#ff773c";
const CREAM = "#f8f6f4";
const PAGE_BG = "#f4f1ec";
const INK = "#0f0e0e";
const MUTED = "#5d5d5d";
const LINE = "#e5e7eb";

/**
 * The campaign email, built in code so the text, logo, hero image and branding
 * are always present — nothing depends on a separate template compiling.
 * Table-based with inline styles so Outlook, Gmail and phones all render it.
 */
export function buildHtml(lang, options = {}) {
  const copy = copyFor(lang);
  const code = normalizeEmailLang(lang);
  const mailingAddress = String(options.mailingAddress || "").trim();
  const ctaUrl = options.ctaUrl || redemptionUrl(options.campaignId);
  const unsubscribeUrl = options.unsubscribeUrl || unsubscribeUrlFor("test");
  const subject = options.subject || copy.subject;
  const footerAddress = mailingAddress ? `${BRAND_NAME} &middot; ${esc(mailingAddress)}` : BRAND_NAME;

  const chip = (name) =>
    `<td width="50%" style="padding:4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td style="background:${CREAM};border:1px solid ${LINE};border-radius:6px;padding:11px 13px;font-family:${EMAIL_FONT};font-size:14px;font-weight:700;color:${INK};">${esc(name)}</td></tr></table></td>`;

  const featureRows = copy.features
    .map(
      (feature) =>
        `<tr><td valign="top" style="padding:0 0 9px 0;font-family:${EMAIL_FONT};font-size:14px;line-height:1.6;color:${INK};"><span style="color:${ORANGE};font-weight:700;">&#8226;</span>&nbsp;&nbsp;${esc(feature)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${code}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(copy.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAGE_BG};">
<tr><td align="center" style="padding:0;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#ffffff;">

<tr><td style="background-color:${ORANGE};padding:20px 30px;">
<img src="${LOGO_URL}" width="170" alt="${BRAND_NAME}" style="display:block;width:170px;max-width:170px;height:auto;border:0;outline:none;text-decoration:none;" />
<div style="font-family:${EMAIL_FONT};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#000000;padding-top:9px;">${BRAND_NAME}</div>
</td></tr>

<tr><td style="padding:0;line-height:0;">
<img src="${HERO_URL}" width="600" alt="${esc(copy.headline)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;" />
</td></tr>

<tr><td style="background-color:${CREAM};padding:30px 32px 10px 32px;">
<div style="font-family:${EMAIL_FONT};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${ORANGE};padding-bottom:10px;">A thank-you from ${BRAND_NAME}</div>
<h1 style="margin:0;font-family:${EMAIL_SERIF};font-size:27px;line-height:1.22;font-weight:700;color:${INK};">${esc(copy.headline)}</h1>
<p style="margin:14px 0 0 0;font-family:${EMAIL_FONT};font-size:16px;line-height:1.6;color:${MUTED};">${esc(copy.intro)}</p>
</td></tr>

<tr><td style="background-color:#ffffff;padding:22px 32px 6px 32px;">
<p style="margin:0 0 12px 0;font-family:${EMAIL_FONT};font-size:15px;line-height:1.6;color:${INK};">${esc(copy.gift)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>${chip(MODULES[0])}${chip(MODULES[1])}</tr>
<tr>${chip(MODULES[2])}${chip(MODULES[3])}</tr>
</table>
</td></tr>

<tr><td style="background-color:#ffffff;padding:16px 32px 24px 32px;">
<p style="margin:0 0 10px 0;font-family:${EMAIL_FONT};font-size:15px;line-height:1.6;font-weight:700;color:${INK};">${esc(copy.featuresIntro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${featureRows}</table>
</td></tr>

<tr><td style="background-color:${CREAM};padding:26px 32px 30px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:4px solid ${ORANGE};">
<tr><td style="padding:2px 0 2px 14px;">
<p style="margin:0;font-family:${EMAIL_FONT};font-size:16px;line-height:1.55;font-weight:700;color:${INK};">${esc(copy.deadline)}</p>
<p style="margin:8px 0 0 0;font-family:${EMAIL_FONT};font-size:14px;line-height:1.6;color:${MUTED};">${esc(copy.timing)}</p>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:22px auto 0 auto;">
<tr><td align="center" bgcolor="${ORANGE}" style="border-radius:6px;">
<a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:${EMAIL_FONT};font-size:16px;font-weight:700;line-height:1;color:#000000;text-decoration:none;border-radius:6px;">${esc(copy.cta)}</a>
</td></tr>
</table>
<p style="margin:16px 0 0 0;text-align:center;font-family:${EMAIL_FONT};font-size:13px;line-height:1.6;color:${MUTED};">${esc(copy.promise)}</p>
</td></tr>

<tr><td style="background-color:#ffffff;padding:26px 32px 24px 32px;">
<p style="margin:0 0 6px 0;font-family:${EMAIL_FONT};font-size:15px;line-height:1.6;color:${INK};">${esc(copy.thanks)}</p>
<p style="margin:0 0 16px 0;font-family:${EMAIL_FONT};font-size:15px;line-height:1.6;color:${INK};">${esc(copy.signoff)}</p>
<p style="margin:0;font-family:${EMAIL_SERIF};font-size:19px;line-height:1.4;font-weight:700;color:${INK};">${esc(copy.tagline)}</p>
<p style="margin:4px 0 12px 0;font-family:${EMAIL_FONT};font-size:13px;line-height:1.6;color:${MUTED};">${esc(copy.builtBy)}</p>
<p style="margin:0;font-family:${EMAIL_FONT};font-size:13px;line-height:1.6;"><a href="${FACEBOOK_URL}" target="_blank" style="color:${ORANGE};text-decoration:underline;">${esc(copy.follow)}</a></p>
</td></tr>

<tr><td style="background-color:${PAGE_BG};border-top:1px solid ${LINE};padding:20px 32px 26px 32px;">
<p style="margin:0 0 6px 0;font-family:${EMAIL_FONT};font-size:11px;line-height:1.6;color:${MUTED};">${esc(copy.footerWhy)}</p>
<p style="margin:0 0 8px 0;font-family:${EMAIL_FONT};font-size:11px;line-height:1.6;color:${MUTED};">${footerAddress}</p>
<p style="margin:0;font-family:${EMAIL_FONT};font-size:11px;line-height:1.6;"><a href="${unsubscribeUrl}" target="_blank" style="color:${MUTED};text-decoration:underline;">${esc(copy.unsubscribe)}</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}