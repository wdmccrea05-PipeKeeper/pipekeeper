import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const en = {"common":{"loading":"Loading...","refresh":"Refresh","cancel":"Cancel","save":"Save","delete":"Delete","close":"Close","unknown":"Unknown","of":"of"},"pipes":{"search":"Search pipes","filter":"Filter","shape":"Shape","material":"Material","allShapes":"All shapes","allMaterials":"All materials"},"tobacco":{"type":"Type","strength":"Strength","search":"Search tobacco"},"units":{"tin_singular":"tin","tin_plural":"tins"},"nav":{"home":"Home","pipes":"Pipes","tobacco":"Tobacco","cellar":"Cellar","community":"Community","profile":"Profile","help":"Help","faq":"FAQ","support":"Support","terms":"Terms","privacy":"Privacy","quickAccess":"Quick Access","syncing":"Syncing..."},"auth":{"login":"Login","logout":"Logout","loginPrompt":"Please log in to continue"},"subscription":{"subscribe":"Subscribe","upgrade":"Upgrade","continueFree":"Continue Free","trialEndedTitle":"Trial Period Ended","trialEndedBody":"Subscribe to continue using all features"}};
const es = {"common":{"loading":"Cargando...","refresh":"Actualizar","cancel":"Cancelar","save":"Guardar","delete":"Eliminar","close":"Cerrar","unknown":"Desconocido","of":"de"},"pipes":{"search":"Buscar pipas","filter":"Filtrar","shape":"Forma","material":"Material","allShapes":"Todas las formas","allMaterials":"Todos los materiales"},"tobacco":{"type":"Tipo","strength":"Fortaleza","search":"Buscar tabaco"},"units":{"tin_singular":"lata","tin_plural":"latas"},"nav":{"home":"Inicio","pipes":"Pipas","tobacco":"Tabaco","cellar":"Bodega","community":"Comunidad","profile":"Perfil","help":"Ayuda","faq":"Preguntas frecuentes","support":"Soporte","terms":"Términos","privacy":"Privacidad","quickAccess":"Acceso rápido","syncing":"Sincronizando..."},"auth":{"login":"Iniciar sesión","logout":"Cerrar sesión","loginPrompt":"Por favor, inicia sesión para continuar"},"subscription":{"subscribe":"Suscribirse","upgrade":"Actualizar","continueFree":"Continuar gratis","trialEndedTitle":"Período de prueba finalizado","trialEndedBody":"Suscríbete para continuar usando todas las funciones"}};
const fr = {"common":{"loading":"Chargement...","refresh":"Actualiser","cancel":"Annuler","save":"Enregistrer","delete":"Supprimer","close":"Fermer","unknown":"Inconnu","of":"de"},"pipes":{"search":"Rechercher des pipes","filter":"Filtrer","shape":"Forme","material":"Matériau","allShapes":"Toutes les formes","allMaterials":"Tous les matériaux"},"tobacco":{"type":"Type","strength":"Force","search":"Rechercher du tabac"},"units":{"tin_singular":"boîte","tin_plural":"boîtes"},"nav":{"home":"Accueil","pipes":"Pipes","tobacco":"Tabac","cellar":"Cave","community":"Communauté","profile":"Profil","help":"Aide","faq":"FAQ","support":"Support","terms":"Conditions","privacy":"Confidentialité","quickAccess":"Accès rapide","syncing":"Synchronisation..."},"auth":{"login":"Connexion","logout":"Déconnexion","loginPrompt":"Veuillez vous connecter pour continuer"},"subscription":{"subscribe":"S'abonner","upgrade":"Mettre à niveau","continueFree":"Continuer gratuitement","trialEndedTitle":"Période d'essai terminée","trialEndedBody":"Abonnez-vous pour continuer à utiliser toutes les fonctionnalités"}};
const de = {"common":{"loading":"Lädt...","refresh":"Aktualisieren","cancel":"Abbrechen","save":"Speichern","delete":"Löschen","close":"Schließen","unknown":"Unbekannt","of":"von"},"pipes":{"search":"Pfeifen suchen","filter":"Filtern","shape":"Form","material":"Material","allShapes":"Alle Formen","allMaterials":"Alle Materialien"},"tobacco":{"type":"Typ","strength":"Stärke","search":"Tabak suchen"},"units":{"tin_singular":"Dose","tin_plural":"Dosen"},"nav":{"home":"Startseite","pipes":"Pfeifen","tobacco":"Tabak","cellar":"Keller","community":"Gemeinschaft","profile":"Profil","help":"Hilfe","faq":"Häufig gestellte Fragen","support":"Unterstützung","terms":"Bedingungen","privacy":"Datenschutz","quickAccess":"Schnellzugriff","syncing":"Wird synchronisiert..."},"auth":{"login":"Anmelden","logout":"Abmelden","loginPrompt":"Bitte melden Sie sich an, um fortzufahren"},"subscription":{"subscribe":"Abonnieren","upgrade":"Upgraden","continueFree":"Kostenlos fortfahren","trialEndedTitle":"Testphase beendet","trialEndedBody":"Abonnieren Sie, um alle Funktionen zu nutzen"}};
const it = {"common":{"loading":"Caricamento...","refresh":"Aggiorna","cancel":"Annulla","save":"Salva","delete":"Elimina","close":"Chiudi","unknown":"Sconosciuto","of":"di"},"pipes":{"search":"Cerca pipe","filter":"Filtra","shape":"Forma","material":"Materiale","allShapes":"Tutte le forme","allMaterials":"Tutti i materiali"},"tobacco":{"type":"Tipo","strength":"Forza","search":"Cerca tabacco"},"units":{"tin_singular":"lattina","tin_plural":"lattine"},"nav":{"home":"Home","pipes":"Pipe","tobacco":"Tabacco","cellar":"Cantina","community":"Comunità","profile":"Profilo","help":"Aiuto","faq":"Domande frequenti","support":"Supporto","terms":"Termini","privacy":"Privacy","quickAccess":"Accesso rapido","syncing":"Sincronizzazione..."},"auth":{"login":"Accedi","logout":"Esci","loginPrompt":"Per favore accedi per continuare"},"subscription":{"subscribe":"Iscriviti","upgrade":"Aggiorna","continueFree":"Continua gratuitamente","trialEndedTitle":"Periodo di prova terminato","trialEndedBody":"Iscriviti per continuare a utilizzare tutte le funzioni"}};
const ptBR = {"common":{"loading":"Carregando...","refresh":"Atualizar","cancel":"Cancelar","save":"Salvar","delete":"Deletar","close":"Fechar","unknown":"Desconhecido","of":"de"},"pipes":{"search":"Buscar cachimbos","filter":"Filtrar","shape":"Forma","material":"Material","allShapes":"Todas as formas","allMaterials":"Todos os materiais"},"tobacco":{"type":"Tipo","strength":"Força","search":"Buscar tabaco"},"units":{"tin_singular":"lata","tin_plural":"latas"},"nav":{"home":"Início","pipes":"Cachimbos","tobacco":"Tabaco","cellar":"Adega","community":"Comunidade","profile":"Perfil","help":"Ajuda","faq":"Perguntas frequentes","support":"Suporte","terms":"Termos","privacy":"Privacidade","quickAccess":"Acesso rápido","syncing":"Sincronizando..."},"auth":{"login":"Entrar","logout":"Sair","loginPrompt":"Por favor, faça login para continuar"},"subscription":{"subscribe":"Inscrever","upgrade":"Atualizar","continueFree":"Continuar gratuitamente","trialEndedTitle":"Período de avaliação finalizado","trialEndedBody":"Inscreva-se para continuar usando todos os recursos"}};
const nl = {"common":{"loading":"Laden...","refresh":"Vernieuwen","cancel":"Annuleren","save":"Opslaan","delete":"Verwijderen","close":"Sluiten","unknown":"Onbekend","of":"van"},"pipes":{"search":"Zoeken naar pijpen","filter":"Filteren","shape":"Vorm","material":"Materiaal","allShapes":"Alle vormen","allMaterials":"Alle materialen"},"tobacco":{"type":"Type","strength":"Sterkte","search":"Zoeken naar tabak"},"units":{"tin_singular":"blik","tin_plural":"bliken"},"nav":{"home":"Thuis","pipes":"Pijpen","tobacco":"Tabak","cellar":"Kelder","community":"Gemeenschap","profile":"Profiel","help":"Hulp","faq":"Veelgestelde vragen","support":"Ondersteuning","terms":"Voorwaarden","privacy":"Privacyverklaring","quickAccess":"Snelle toegang","syncing":"Synchroniseren..."},"auth":{"login":"Inloggen","logout":"Uitloggen","loginPrompt":"Meld u aan om door te gaan"},"subscription":{"subscribe":"Abonneren","upgrade":"Upgraden","continueFree":"Gratis doorgaan","trialEndedTitle":"Proefperiode beëindigd","trialEndedBody":"Abonneer u om alle functies te gebruiken"}};
const pl = {"common":{"loading":"Ładowanie...","refresh":"Odśwież","cancel":"Anuluj","save":"Zapisz","delete":"Usuń","close":"Zamknij","unknown":"Nieznany","of":"z"},"pipes":{"search":"Szukaj fajek","filter":"Filtruj","shape":"Kształt","material":"Materiał","allShapes":"Wszystkie kształty","allMaterials":"Wszystkie materiały"},"tobacco":{"type":"Typ","strength":"Siła","search":"Szukaj tytoniu"},"units":{"tin_singular":"puszka","tin_plural":"puszki"},"nav":{"home":"Strona główna","pipes":"Fajki","tobacco":"Tytoń","cellar":"Piwnica","community":"Społeczność","profile":"Profil","help":"Pomoc","faq":"Najczęściej zadawane pytania","support":"Wsparcie","terms":"Warunki","privacy":"Prywatność","quickAccess":"Szybki dostęp","syncing":"Synchronizowanie..."},"auth":{"login":"Zaloguj się","logout":"Wyloguj się","loginPrompt":"Zaloguj się, aby kontynuować"},"subscription":{"subscribe":"Subskrybuj","upgrade":"Uaktualnij","continueFree":"Kontynuuj bezpłatnie","trialEndedTitle":"Okres próbny zakończony","trialEndedBody":"Subskrybuj, aby korzystać ze wszystkich funkcji"}};
const ja = {"common":{"loading":"読み込み中...","refresh":"更新","cancel":"キャンセル","save":"保存","delete":"削除","close":"閉じる","unknown":"不明","of":"の"},"pipes":{"search":"パイプを検索","filter":"フィルター","shape":"形状","material":"材料","allShapes":"すべての形状","allMaterials":"すべての材料"},"tobacco":{"type":"種類","strength":"強度","search":"タバコを検索"},"units":{"tin_singular":"缶","tin_plural":"缶"},"nav":{"home":"ホーム","pipes":"パイプ","tobacco":"タバコ","cellar":"セラー","community":"コミュニティ","profile":"プロフィール","help":"ヘルプ","faq":"よくある質問","support":"サポート","terms":"利用規約","privacy":"プライバシー","quickAccess":"クイックアクセス","syncing":"同期中..."},"auth":{"login":"ログイン","logout":"ログアウト","loginPrompt":"続行するにはログインしてください"},"subscription":{"subscribe":"購読","upgrade":"アップグレード","continueFree":"無料で継続","trialEndedTitle":"試用期間が終了しました","trialEndedBody":"すべての機能を使用するには購読してください"}};
const zhHans = {"common":{"loading":"加载中...","refresh":"刷新","cancel":"取消","save":"保存","delete":"删除","close":"关闭","unknown":"未知","of":"的"},"pipes":{"search":"搜索烟斗","filter":"筛选","shape":"形状","material":"材料","allShapes":"所有形状","allMaterials":"所有材料"},"tobacco":{"type":"类型","strength":"强度","search":"搜索烟草"},"units":{"tin_singular":"罐","tin_plural":"罐"},"nav":{"home":"首页","pipes":"烟斗","tobacco":"烟草","cellar":"酒窖","community":"社区","profile":"个人资料","help":"帮助","faq":"常见问题","support":"支持","terms":"条款","privacy":"隐私","quickAccess":"快速访问","syncing":"同步中..."},"auth":{"login":"登录","logout":"登出","loginPrompt":"请登录以继续"},"subscription":{"subscribe":"订阅","upgrade":"升级","continueFree":"继续免费使用","trialEndedTitle":"试用期已结束","trialEndedBody":"订阅以继续使用所有功能"}};
const sv = {"common":{"loading":"Laddar...","refresh":"Uppdatera","cancel":"Avbryt","save":"Spara","delete":"Ta bort","close":"Stäng","unknown":"Okänd","of":"av"},"pipes":{"search":"Sök pipor","filter":"Filtrera","shape":"Form","material":"Material","allShapes":"Alla former","allMaterials":"Alla material"},"tobacco":{"type":"Typ","strength":"Styrka","search":"Sök tobak"},"units":{"tin_singular":"lada","tin_plural":"lador"},"nav":{"home":"Hem","pipes":"Pipor","tobacco":"Tobak","cellar":"Källare","community":"Gemenskap","profile":"Profil","help":"Hjälp","faq":"FAQ","support":"Support","terms":"Villkor","privacy":"Sekretess","quickAccess":"Snabbtillgång","syncing":"Synkar..."},"auth":{"login":"Logga in","logout":"Logga ut","loginPrompt":"Vänligen logga in för att fortsätta"},"subscription":{"subscribe":"Prenumerera","upgrade":"Uppgradera","continueFree":"Fortsätt gratis","trialEndedTitle":"Testperioden har slutat","trialEndedBody":"Prenumerera för att fortsätta använda alla funktioner"}};

function normalizeLang(raw) {
  const v = (raw || "").toString().trim();
  if (!v) return "en";
  if (v === "pt") return "pt-BR";
  if (v === "zh") return "zh-Hans";
  if (v.toLowerCase() === "zh-cn") return "zh-Hans";
  if (v.toLowerCase() === "pt-br") return "pt-BR";
  return v;
}

function flatten(obj, prefix = "") {
  const out = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  });
  return out;
}

function parityCheck(resources) {
  const base = flatten(resources.en.translation);
  const baseKeys = new Set(Object.keys(base));
  Object.entries(resources).forEach(([lng, pack]) => {
    if (lng === "en") return;
    const flat = flatten(pack.translation);
    const missing = [...baseKeys].filter((k) => !(k in flat));
    if (missing.length) {
      console.error(`[i18n] Locale "${lng}" missing ${missing.length} keys vs en`, missing.slice(0, 50));
    }
  });
}

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  "pt-BR": { translation: ptBR },
  nl: { translation: nl },
  pl: { translation: pl },
  ja: { translation: ja },
  "zh-Hans": { translation: zhHans },
  sv: { translation: sv },

  // aliases
  pt: { translation: ptBR },
  zh: { translation: zhHans },
};

if (typeof window !== "undefined" && import.meta?.env?.DEV) {
  parityCheck(resources);
}

const stored = normalizeLang(typeof window !== "undefined" ? window.localStorage.getItem("pk_lang") : "en");

i18n.use(initReactI18next).init({
  resources,
  lng: stored,
  fallbackLng: "en",
  returnNull: false,
  returnEmptyString: false,
  returnObjects: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on("languageChanged", (lng) => {
  try {
    const normalized = normalizeLang(lng);
    window.localStorage.setItem("pk_lang", normalized);
    if (lng !== normalized) i18n.changeLanguage(normalized);
  } catch {}
});

export default i18n;