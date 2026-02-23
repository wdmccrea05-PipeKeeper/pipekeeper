// src/components/i18n/translations-supplement.jsx
/**
 * SUPPLEMENTAL TRANSLATIONS
 * Purpose:
 * - Provide critical app-wide keys that must NEVER render as [MISSING]
 * - Keep this file small and focused on "global" UI strings
 *
 * NOTE: These are deep-merged into each locale in translations-complete.jsx.
 */

export const translationsSupplement = {
  en: {
    ageGate: {
      title: "Adults Only",
      intendedForAdults: "PipeKeeper is intended for adult users only.",
      disclaimer:
        "This app is a collection management tool for pipe smoking enthusiasts. It does not sell or facilitate the purchase of tobacco products.",
      confirmAge: "I confirm I am of legal age",
    },

    termsGate: {
      beforeContinue: "Before you continue",
      reviewAccept: "Please review and accept the Terms of Service and Privacy Policy.",
      termsOfService: "Terms of Service",
      privacyPolicy: "Privacy Policy",
      agreeCheckbox: "I have read and agree to the Terms of Service and Privacy Policy.",
      acceptContinue: "Accept and Continue",
      saving: "Saving…",
      savedContinuing: "Saved. Continuing…",
      rateLimitedTemporary: "Rate-limited right now. Continuing temporarily…",
      couldntSave: "We couldn't save your acceptance. Please try again.",
      rateLimitNote: "If requests are rate-limited, the app may temporarily allow access to avoid loops.",
    },

    userNotRegistered: {
      title: "Access Restricted",
      description:
        "You are not registered to use this application. Please contact the app administrator to request access.",
      ifError: "If you believe this is an error, you can:",
      verifyAccount: "Verify you are logged in with the correct account",
      contactAdmin: "Contact the app administrator for access",
      tryRelogin: "Try logging out and back in again",
    },

    search: {
      trigger: "Search...",
      openAria: "Open search",
      hintTitle: "Start typing to search",
      hintSubtitle: "Search pipes, tobacco, makers, shapes, and more",
      kbdNavigate: "Navigate",
      kbdSelect: "Select",
      kbdClose: "Close",
      commandDialogTitle: "Search",
      commandInputPlaceholder: "Type to search pipes, tobacco, makers...",
      noResultsFound: "No results found",
      noResultsMessage: "Try searching for a pipe name, maker, tobacco blend, or shape",
      sectionPipes: "Pipes",
      sectionTobacco: "Tobacco",
      sectionQuickActions: "Quick Actions",
      actionAddPipe: "Add New Pipe",
      actionAddBlend: "Add New Blend",
      actionViewStats: "View Collection Stats",
      actionExportData: "Export Collection Data",
    },
  },

  es: {
    ageGate: {
      title: "Solo adultos",
      intendedForAdults: "PipeKeeper está destinado únicamente a usuarios adultos.",
      disclaimer:
        "Esta app es una herramienta de gestión de colecciones para aficionados a las pipas. No vende ni facilita la compra de productos de tabaco.",
      confirmAge: "Confirmo que tengo la edad legal",
    },

    termsGate: {
      beforeContinue: "Antes de continuar",
      reviewAccept: "Revisa y acepta los Términos de servicio y la Política de privacidad.",
      termsOfService: "Términos de servicio",
      privacyPolicy: "Política de privacidad",
      agreeCheckbox: "He leído y acepto los Términos de servicio y la Política de privacidad.",
      acceptContinue: "Aceptar y continuar",
      saving: "Guardando…",
      savedContinuing: "Guardado. Continuando…",
      rateLimitedTemporary: "Limitado temporalmente. Continuando provisionalmente…",
      couldntSave: "No pudimos guardar tu aceptación. Inténtalo de nuevo.",
      rateLimitNote:
        "Si las solicitudes se limitan, la app puede permitir acceso temporal para evitar bucles.",
    },

    userNotRegistered: {
      title: "Acceso restringido",
      description:
        "No estás registrado para usar esta aplicación. Contacta al administrador para solicitar acceso.",
      ifError: "Si crees que es un error, puedes:",
      verifyAccount: "Verificar que iniciaste sesión con la cuenta correcta",
      contactAdmin: "Contactar al administrador para obtener acceso",
      tryRelogin: "Cerrar sesión y volver a iniciar sesión",
    },

    search: {
      trigger: "Buscar...",
      openAria: "Abrir búsqueda",
      hintTitle: "Empieza a escribir para buscar",
      hintSubtitle: "Busca pipas, tabacos, marcas, formas y más",
      kbdNavigate: "Navegar",
      kbdSelect: "Seleccionar",
      kbdClose: "Cerrar",
      commandDialogTitle: "Buscar",
      commandInputPlaceholder: "Escribe para buscar pipas, tabacos, marcas...",
      noResultsFound: "No se encontraron resultados",
      noResultsMessage: "Prueba con un nombre de pipa, marca, mezcla o forma",
      sectionPipes: "Pipas",
      sectionTobacco: "Tabaco",
      sectionQuickActions: "Acciones rápidas",
      actionAddPipe: "Agregar nueva pipa",
      actionAddBlend: "Agregar nueva mezcla",
      actionViewStats: "Ver estadísticas",
      actionExportData: "Exportar datos",
    },
  },

  de: {
    ageGate: {
      title: "Nur für Erwachsene",
      intendedForAdults: "PipeKeeper ist nur für erwachsene Nutzer bestimmt.",
      disclaimer:
        "Diese App ist ein Sammlungs- und Verwaltungswerkzeug für Pfeifen-Enthusiasten. Sie verkauft keine Tabakprodukte und erleichtert deren Kauf nicht.",
      confirmAge: "Ich bestätige, dass ich volljährig bin",
    },

    termsGate: {
      beforeContinue: "Bevor du fortfährst",
      reviewAccept: "Bitte lies und akzeptiere die Nutzungsbedingungen und die Datenschutzerklärung.",
      termsOfService: "Nutzungsbedingungen",
      privacyPolicy: "Datenschutzerklärung",
      agreeCheckbox: "Ich habe die Nutzungsbedingungen und die Datenschutzerklärung gelesen und stimme zu.",
      acceptContinue: "Akzeptieren und fortfahren",
      saving: "Speichern…",
      savedContinuing: "Gespeichert. Fortfahren…",
      rateLimitedTemporary: "Gerade rate-limitiert. Vorübergehend fortfahren…",
      couldntSave: "Wir konnten deine Zustimmung nicht speichern. Bitte erneut versuchen.",
      rateLimitNote:
        "Wenn Anfragen rate-limitiert sind, kann die App vorübergehend Zugriff erlauben, um Schleifen zu vermeiden.",
    },

    userNotRegistered: {
      title: "Zugriff eingeschränkt",
      description:
        "Du bist nicht registriert, um diese Anwendung zu nutzen. Bitte kontaktiere den Administrator, um Zugriff anzufordern.",
      ifError: "Wenn du glaubst, dass dies ein Fehler ist, kannst du:",
      verifyAccount: "Prüfen, ob du mit dem richtigen Konto angemeldet bist",
      contactAdmin: "Den Administrator für Zugriff kontaktieren",
      tryRelogin: "Abmelden und erneut anmelden",
    },

    search: {
      trigger: "Suchen...",
      openAria: "Suche öffnen",
      hintTitle: "Zum Suchen tippen",
      hintSubtitle: "Suche nach Pfeifen, Tabak, Herstellern, Formen und mehr",
      kbdNavigate: "Navigieren",
      kbdSelect: "Auswählen",
      kbdClose: "Schließen",
      commandDialogTitle: "Suche",
      commandInputPlaceholder: "Tippe, um Pfeifen, Tabak, Hersteller zu suchen...",
      noResultsFound: "Keine Ergebnisse gefunden",
      noResultsMessage: "Versuche einen Pfeifennamen, Hersteller, Tabakmischung oder Form zu suchen",
      sectionPipes: "Pfeifen",
      sectionTobacco: "Tabak",
      sectionQuickActions: "Schnellaktionen",
      actionAddPipe: "Neue Pfeife hinzufügen",
      actionAddBlend: "Neue Mischung hinzufügen",
      actionViewStats: "Statistiken anzeigen",
      actionExportData: "Daten exportieren",
    },
  },

  ja: {
    ageGate: {
      title: "成人のみ",
      intendedForAdults: "PipeKeeper は成人ユーザー向けのアプリです。",
      disclaimer:
        "このアプリはパイプ愛好家のためのコレクション管理ツールです。タバコ製品の販売や購入の仲介は行いません。",
      confirmAge: "法定年齢に達していることを確認します",
    },

    termsGate: {
      beforeContinue: "続行する前に",
      reviewAccept: "利用規約とプライバシーポリシーを確認し、同意してください。",
      termsOfService: "利用規約",
      privacyPolicy: "プライバシーポリシー",
      agreeCheckbox: "利用規約とプライバシーポリシーを読み、同意します。",
      acceptContinue: "同意して続行",
      saving: "保存中…",
      savedContinuing: "保存しました。続行します…",
      rateLimitedTemporary: "現在制限中です。一時的に続行します…",
      couldntSave: "同意を保存できませんでした。もう一度お試しください。",
      rateLimitNote: "リクエストが制限されている場合、ループ回避のため一時的に許可することがあります。",
    },

    userNotRegistered: {
      title: "アクセス制限",
      description: "このアプリを利用するための登録がありません。管理者に連絡してアクセスを申請してください。",
      ifError: "誤りだと思われる場合:",
      verifyAccount: "正しいアカウントでログインしているか確認する",
      contactAdmin: "管理者にアクセスを依頼する",
      tryRelogin: "ログアウトして再ログインする",
    },

    search: {
      trigger: "検索...",
      openAria: "検索を開く",
      hintTitle: "入力して検索",
      hintSubtitle: "パイプ、タバコ、メーカー、形状などを検索",
      kbdNavigate: "移動",
      kbdSelect: "選択",
      kbdClose: "閉じる",
      commandDialogTitle: "検索",
      commandInputPlaceholder: "パイプ、タバコ、メーカーを検索...",
      noResultsFound: "結果が見つかりません",
      noResultsMessage: "パイプ名、メーカー、ブレンド名、形状で試してください",
      sectionPipes: "パイプ",
      sectionTobacco: "タバコ",
      sectionQuickActions: "クイック操作",
      actionAddPipe: "新しいパイプを追加",
      actionAddBlend: "新しいブレンドを追加",
      actionViewStats: "統計を見る",
      actionExportData: "データを書き出す",
    },
  },
};
