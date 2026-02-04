/**
 * Complete Help Content for PL, JA, ZH-HANS
 * Full parity with EN: 34 FAQ + How-To + Troubleshooting per locale
 */

export const helpContentFinal = {
  pl: {
    faqFull: {
      pageTitle: "Często zadawane pytania PipeKeeper",
      pageSubtitle: "Definicje, informacje ogólne i zastrzeżenia",
      navHowTo: "Przewodniki praktyczne",
      navTroubleshooting: "Rozwiązywanie problemów",
      verificationHelp: {
        q: "🔒 Nie mogę się zalogować / Mój kod weryfikacyjny wygasł - Co robić?",
        intro: "Jeśli masz problemy z weryfikacją e-mail lub logowaniem:",
        steps: ["Spróbuj zalogować się ponownie - system automatycznie wyśle nowy kod weryfikacyjny", "Sprawdź folder spam/niechcianych wiadomości pod kątem e-maila weryfikacyjnego", "Odwiedź naszą stronę pomocy weryfikacji, aby uzyskać szczegółowe instrukcje", "Skontaktuj się bezpośrednio z pomocą techniczną pod adresem admin@pipekeeperapp.com"],
        note: "Podaj swój adres e-mail, aby skontaktować się z pomocą techniczną, abyśmy mogli Ci szybko pomóc."
      },
      sections: {
        general: { title: "Ogólne", items: [
          { id: "what-is", q: "Co to jest PipeKeeper?", a: "PipeKeeper to aplikacja do zarządzania kolekcją i informacjami zaprojektowana dla entuzjastów palaczy fajek. Pomaga śledzić fajki, mieszanki tytoniowe, puszki do starzenia się i powiązane notatki oraz zapewnia opcjonalne spostrzeżenia wspierane sztuczną inteligencją i szacunki wartości." },
          { id: "tobacco-sales", q: "Czy PipeKeeper sprzedaje lub promuje tytoń?", a: "Nie. PipeKeeper to tylko aplikacja do zarządzania hobby i kolekcją. Nie sprzedaje, nie promuje ani nie ułatwia zakupu produktów tytoniowych." },
          { id: "data-privacy", q: "Czy moje dane są prywatne?", a: "Tak. Twoje dane kolekcji należą do Ciebie. PipeKeeper wykorzystuje Twoje dane tylko do obsługi aplikacji i dostarczania funkcji. Nie sprzedajemy danych osobowych." },
          { id: "first-launch", q: "Dlaczego widzę Warunki korzystania z usługi przy pierwszym otwarciu aplikacji?", a: "Przy pierwszym użyciu PipeKeeper wymaga zaakceptowania Warunków korzystania z usługi i Polityki prywatności przed uzyskaniem dostępu do aplikacji. To wymóg jednorazowy. Po zaakceptowaniu przejdziesz bezpośrednio do strony głównej w przyszłych odwiedzinach. Możesz przejrzeć te dokumenty w dowolnym momencie z menu Pomoc lub linków stopki." }
        ]},
        gettingStarted: { title: "Pierwsze kroki", items: [
          { id: "tutorial", q: "Czy jest tutorial lub przewodnik?", a: "Tak! Podczas tworzenia konta PipeKeeper oferuje przeprowadzony przepływ wdrażania, który przeprowadzi Cię przez konfigurację profilu, dodanie pierwszej fajki i tytoniu oraz dostęp do funkcji AI. Możesz ponownie uruchomić tutorial w dowolnym momencie ze strony głównej.", cta: "Uruchom ponownie tutorial" },
          { id: "what-cellaring", q: "Co to jest starzenie się w piwnicy?", a: "Starzenie się w piwnicy odnosi się do przechowywania zapieczętowanych puszek lub tytoniu luzem do starzenia się. PipeKeeper zawiera szczegółowy system rejestracji piwnicy, który śledzi, kiedy tytoń jest dodawany lub usuwany z Twojej piwnicy, ilości w uncjach, typy pojemników i notatki. Ta funkcja jest dostępna dla subskrybentów Premium." },
          { id: "smoking-log", q: "Co to jest dziennik palenia?", a: "Dziennik palenia śledzi, które fajki paliłeś z jakim tytoniem. Pomaga Ci zapamiętać, co dobrze do siebie pasuje i przyczynia się do rekomendacji parowania AI. Abonenci Premium korzystają z automatycznego zmniejszenia zapasów na podstawie zarejestrowanych sesji." }
        ]},
        fieldDefinitions: { title: "Definicje pól", items: [
          { id: "pipe-shape", q: "Co to jest kształt fajki?", a: "Klasyfikacja kształtu opisuje ogólny kształt fajki (Billiard, Dublin, zakrzywiona itp.). PipeKeeper zawiera ponad 30 popularnych kształtów. Kształt wpływa na charakterystykę palenia, takie jak wygoda zacisku i chłodzenie dymu." },
          { id: "chamber-volume", q: "Co to jest pojemność komory?", a: "Pojemność komory (Mała/Średnia/Duża/Bardzo duża) wskazuje na pojemność miski i czas trwania dymu. Małe komory są dobre na 15-30 minut palenia, podczas gdy Bardzo duża może zapewnić 90+ minut." },
          { id: "stem-material", q: "Jakie są opcje materiału trzonu?", a: "Typowe materiały trzonu obejmują Wulkanit (tradycyjny, miękki gryzak), Akryl/Lucyt (trwały, twardszy), Cumberland (marmurowy wygląd) i specjalne materiały, takie jak Bursztyn czy Róg." },
          { id: "bowl-material", q: "Jakie są materiały muszli?", a: "Większość fajek jest z Wrzosa (drewna odpornego na ciepło), ale inne materiały obejmują Piankę morską (minerał, zmienia kolor w użyciu), Kolbę kukurydzianą (ekonomiczną, jednorazową), Mortę (torfowe drewno dębu) i różne inne drewna." },
          { id: "finish-types", q: "Jakie są typy wykończeń?", a: "Wykończenie odnosi się do powierzchniowego traktowania muszli: Gładkie (polerowane, pokazuje słoje), Piaskowane (teksturowane, ukrywa wypełnienia), Rustykalny (rzeźbiona tekstura) lub Naturalny (niekończony). Wykończenie jest głównie estetyczne, ale może wpłynąć na chwytak." },
          { id: "blend-type", q: "Jakie są typy mieszanek tytoniowych?", a: "Typy mieszanek kategoryzują tytoń według pierwotnego składu liści: Virginia (słodka, ziołowa), English (z Latakią, wędzony), Aromatyczne (dodany smak), Burley (orzechowy), VaPer (Virginia/Perique), itp." },
          { id: "tobacco-cut", q: "Jakie są typy cięcia tytoniu?", a: "Cięcie opisuje, jak tytoń jest przygotowywany: Wstążka (cienkie paski, łatwe do upakowania), Płatek (prasy liście, wymaga tarcia), Plug (stały blok), Moneta (pokrojony plug), Shag (bardzo drobny), itp." },
          { id: "tobacco-strength", q: "Co to jest siła tytoniu?", a: "Siła odnosi się do zawartości nikotyny od Łagodnej do Mocnej. Początkujący zazwyczaj zaczynają od mieszanek Łagodne-Średnie. Mieszanki pełnej siły mogą powodować chorobę z nikotyny, jeśli nie jesteś do nich przyzwyczajony." }
        ]},
        tobaccoValuation: { title: "Wycena tytoniu", items: [
          { id: "valuation-calc", q: "Jak obliczana jest wartość tytoniu?", a: "Wartość tytoniu można śledzić na dwa sposoby: (1) Ręczna wartość rynkowa - wpisujesz aktualną cenę rynkową (Premium), lub (2) Wycena wspierana przez AI - AI analizuje publiczne ogłoszenia, aby oszacować wartość, zakres i pewność (Pro)." },
          { id: "manual-vs-ai", q: "Jaka jest różnica między wyceną ręczną a AI?", a: "Wycena ręczna pozwala śledzić własne badania (Premium). Wycena AI wykorzystuje uczenie maszynowe do analizy danych rynkowych i zapewnia szacunki, zakresy, poziomy pewności i prognozy (Pro)." },
          { id: "estimated-label", q: "Dlaczego wartość jest oznaczona jako 'szacunkowa'?", a: "Wartości generowane przez AI to prognozy oparte na dostępnych danych rynkowych. Rzeczywiste ceny różnią się w zależności od stanu, wieku, sprzedawcy i popytu rynkowego. Szacunki to narzędzia edukacyjne, a nie porady inwestycyjne." },
          { id: "confidence-meaning", q: "Co oznacza pewność?", a: "Pewność wskazuje, ile danych rynkowych wspiera oszacowanie. Wysoka = silne dane. Średnia = umiarkowane dane. Niska = ograniczone dane. Niska pewność oznacza, że szacunek jest mniej niezawodny." },
          { id: "locked-valuation", q: "Dlaczego niektóre funkcje wyceny są zablokowane?", a: "Wycena wspierana przez AI i projekcje predykcyjne wymagają Pro. Użytkownicy Premium mogą śledzić ręczne wartości rynkowe i podstawę kosztów. Bezpłatni użytkownicy mogą śledzić tylko inwentarz i starzenie się." }
        ]},
        featuresAndTools: { title: "Funkcje i narzędzia", items: [
          { id: "interchangeable-bowls", q: "Co to są wymienne miski?", intro: "Niektóre systemy fajek (Falcon, Gabotherm, Yello-Bole, Viking itp.) pozwalają zamieniać różne miski na tym samym zestawie trzonu/komory. PipeKeeper traktuje każdą miskę jako odrębny 'wariant fajki' z własnym:", points: ["Etykiety fokus (dedykuj jedną miskę do Virgini, drugą do Aromatycznych itp.)", "Wymiary komory i charakterystyka", "Rekomendacje parowania tytoniu", "Harmonogramy sażenia i dzienniki palenia"], conclusion: "To umożliwia optymalną specjalizację: użyj tego samego trzonu z wieloma miskami do różnych typów tytoniu bez ducha." },
          { id: "pipe-focus", q: "Co to są etykiety fokus fajki?", intro: "Etykiety fokus pozwalają specjalizować fajki dla określonych typów tytoniu. Popularne etykiety obejmują:", points: ["Aromatyczne: Dedykuje fajkę tylko mieszankom aromatycznym (obsługiwana intensywność Mocna/Średnia/Lekka)", "Nie aromatyczne: Wyklucza mieszanki aromatyczne", "Virginia, VaPer, English, Balkan, Latakia: Automatycznie traktowane jako rodziny nie aromatyczne", "Narzędziowy/Wszechstronny: Umożliwia mieszane użycie bez ograniczeń"], conclusion: "System parowania szanuje te etykiety: fajki tylko aromatyczne nie będą polecać mieszanek nie aromatycznych i odwrotnie." },
          { id: "pairing-matrix", q: "Co to jest macierz parowania?", a: "Macierz parowania generuje wyniki zgodności (0-10) między każdą fajką i mieszanką tytoniu w Twojej kolekcji. Bierze pod uwagę charakterystykę fajki (kształt, pojemność komory, materiał muszli), profile mieszanki (typ, siła, intensywność aromatyczna), etykiety fokus fajki (Virginia, English, Aromatyczne itp.) i Twoje osobiste preferencje." },
          { id: "pipe-identification", q: "Jak działa identyfikacja fajki?", a: "Prześlij zdjęcia swojej fajki, a AI przeanalizuje znaki, kształt i inne cechy wizualne, aby zidentyfikować producenta, model i przybliżoną wartość. Możesz również ręcznie wyszukiwać w bazie danych znanych producentów fajek." },
          { id: "geometry-analysis", q: "Co to jest analiza geometrii fajki?", a: "To narzędzie AI analizuje Twoje zdjęcia fajki i przechowywane wymiary, aby klasyfikować atrybuty geometrii: kształt (Billiard, Dublin itp.), styl muszli (cylindryczny, stożkowy itp.), kształt trzonu (okrągły, diament itp.), zakrzywienie (proste, 1/4 zakrzywione itp.) i klasa rozmiaru (mała, standardowa, duża itp.)." },
          { id: "verified-measurements", q: "Czy mogę znaleźć zweryfikowane specyfikacje producenta?", a: "Tak, jako opcja pomocnicza. Przejdź do Aktualizacji AI → 'Znajdź zweryfikowane specyfikacje producenta'. Przeszukuje katalogi i bazy danych producenta, ale działa tylko w przypadku niektórych fajek produkcyjnych. Wiele fajek rzemieślniczych i starych nie będzie miało dostępnych zweryfikowanych specyfikacji." },
          { id: "value-lookup", q: "Czy PipeKeeper może szacować wartości fajek?", a: "Tak. AI może zapewnić szacunkowe wartości rynkowe na podstawie producenta, stanu i obecnych trendów rynkowych. To tylko szacunki i nie powinny być używane do celów ubezpieczenia lub sprzedaży." },
          { id: "export-tools", q: "Czy mogę wyeksportować moje dane kolekcji?", a: "Tak. Narzędzia eksportu pozwalają pobrać inwentarz fajek i tytoniu jako pliki CSV dla kopii zapasowej lub użytku w innych aplikacjach. Poszukaj przycisków eksportu na stronach Fajki i Tytoń." }
        ]},
        accountsAndData: { title: "Konta i dane", items: [
          { id: "need-account", q: "Czy potrzebuję konta?", a: "Tak. Utworzenie konta pozwala zapisać i zsynchronizować kolekcję i ustawienia na wszystkich urządzeniach." },
          { id: "export-data", q: "Czy mogę wyeksportować moje dane?", a: "Tak. Narzędzia eksportu pozwalają generować raporty CSV/PDF Twoich fajek, inwentarzu tytoniu i dzienników palenia. Poszukaj przycisków eksportu na stronach Fajki i Tytoń." },
          { id: "bulk-import", q: "Czy mogę importować dane zbiorczo?", a: "Tak. Przejdź do strony Importuj z ekranu głównego. Możesz wkleić dane CSV lub wgrać plik, aby szybko dodać wiele fajek lub mieszanek tytoniu na raz." }
        ]},
        ai: { title: "Funkcje i dokładność AI", items: [
          { id: "ai-accuracy", q: "Czy rekomendacje AI są gwarantowane poprawne?", a: "Nie. Funkcje AI zapewniają sugestie najlepszego wysiłku i mogą być niekompletne lub niedokładne. Powinieneś używać własnego osądu i weryfikować ważne informacje z wiarygodnych źródeł." },
          { id: "medical-advice", q: "Czy PipeKeeper zapewnia poradę medyczną lub zawodową?", a: "Nie. PipeKeeper zapewnia narzędzia informacyjne tylko do zarządzania hobby i kolekcją." }
        ]},
        support: { title: "Wsparcie", contactQ: "Jak się skontaktować z obsługą?", contactIntro: "Użyj linku wsparcia w aplikacji lub odwiedź", contactLinks: "Możesz również przejrzeć nasze zasady tutaj:" }
      }
    },
    howTo: {
      pageTitle: "Przewodniki praktyczne",
      pageSubtitle: "Szybkie odpowiedzi z jasnymi ścieżkami nawigacji",
      navFAQ: "Często zadawane pytania",
      navTroubleshooting: "Rozwiązywanie problemów",
      footerTitle: "Nadal potrzebujesz pomocy?",
      footerDesc: "Odwiedź nasze pełne pytania lub skontaktuj się z obsługą, aby uzyskać dalszą pomoc.",
      footerFAQ: "Wyświetl pełne pytania",
      footerSupport: "Kontakt do obsługi",
      sections: {
        gettingStarted: { title: "Pierwsze kroki", items: [
          { id: "add-pipe", q: "Jak dodać fajkę?", path: "Dom → Fajki → Dodaj fajkę", a: "Dodaj swoje fajki ręcznie lub użyj identyfikacji AI ze zdjęć. Dołącz szczegóły, takie jak producent, kształt, wymiary i stan, aby odblokować spostrzeżenia i rekomendacje." },
          { id: "add-tobacco", q: "Jak dodać mieszankę tytoniu?", path: "Dom → Tytoń → Dodaj tytoń", a: "Śledź swoje mieszanki tytoniu ze szczegółami, takimi jak producent, typ mieszanki, ilość i daty przechowywania. Użyj dziennika piwnicy, aby rejestrować postęp starzenia się." },
          { id: "add-note", q: "Jak dodać notatki do elementu?", path: "Fajki/Tytoń → Wybierz element → Edytuj → Dodaj notatki", a: "Kliknij na dowolną fajkę lub tytoń, aby otworzyć stronę szczegółów. Stuknij 'Edytuj' i dodaj notatki w wyznaczonym polu. Notatki pomagają zapamiętać osobiste preferencje i obserwacje." },
          { id: "view-insights", q: "Jak wyświetlić spostrzeżenia?", path: "Dom → Spostrzeżenia kolekcji", a: "Spostrzeżenia pojawiają się na Twojej stronie głównej po dodaniu elementów. Wyświetl statystyki, siatki parowania, pulpity starzenia się i raporty. Kliknij kartach, aby zbadać różne spostrzeżenia." }
        ]},
        managingCollection: { title: "Zarządzanie kolekcją", items: [
          { id: "organize", q: "Jak zorganizować kolekcję?", path: "Fajki/Tytoń → Filtry i sortowanie", a: "Użyj filtrów, aby zawęzić po kształcie, typie mieszanki lub fokusie. Sortuj po dacie dodania, wartości lub ocenie. Zapisz ulubione filtry dla szybkiego dostępu." },
          { id: "export", q: "Jak wyeksportować moje dane?", path: "Dom → Spostrzeżenia → Karta raporty", badge: "Premium", a: "Użytkownicy Premium i Pro mogą eksportować dane kolekcji jako CSV lub PDF. Znajdź przyciski eksportu na karcie Raporty w obszarze Spostrzeżenia kolekcji." },
          { id: "cellar-log", q: "Jak śledzić moją piwnicę?", path: "Tytoń → Wybierz mieszankę → Dziennik piwnicy", badge: "Premium", a: "Zapisz, kiedy tytoń jest dodawany lub usuwany z Twojej piwnicy. Śledź ilości, daty i typy pojemników. Wyświetl postęp starzenia się na Pulpicie starzenia się." },
          { id: "smoking-log", q: "Jak zarejestrować sesję palenia?", path: "Dom → Spostrzeżenia → Karta dziennika", badge: "Premium", a: "Śledź, którą fajkę paliłeś z jakim tytoniem. Zapisz datę, liczbę misek i notatki. Te dane zasilają rekomendacje parowania." }
        ]},
        aiTools: { title: "Narzędzia AI", items: [
          { id: "identify-pipe", q: "Jak zidentyfikować fajkę ze zdjęcia?", path: "Dom → Ekspert tytoniowy → Identyfikuj", badge: "Pro", a: "Prześlij zdjęcia fajki, a AI przeanalizuje znaki, kształt i charakterystykę, aby zidentyfikować producenta, model i przybliżoną wartość." },
          { id: "pairing-suggestions", q: "Jak uzyskać sugestie parowania?", path: "Dom → Spostrzeżenia → Siatka parowania", badge: "Pro", a: "Macierz parowania generuje wyniki zgodności dla każdej kombinacji fajki-tytoniu. Wyświetl rekomendacje na stronach szczegółów fajki lub w siatce parowania." },
          { id: "optimize-collection", q: "Jak zoptymalizować moją kolekcję?", path: "Dom → Ekspert tytoniowy → Optymalizuj", badge: "Pro", a: "Optymalizator kolekcji analizuje Twoje fajki i tytoń, aby polecić specjalizacje, zidentyfikować luki i zasugerować następny zakup." }
        ]},
        subscriptions: { title: "Subskrypcje", items: [
          { id: "subscribe", q: "Jak działają subskrypcje?", path: "Profil → Subskrypcja", a: "PipeKeeper oferuje poziomy Bezpłatny, Premium i Pro. Subskrybuj, aby odblokować nieograniczone elementy, zaawansowane narzędzia i funkcje AI. Wyświetl ceny i zarządzaj subskrypcjami w swoim profilu." },
          { id: "manage-subscription", q: "Jak zarządzać moją subskrypcją?", path: "Profil → Zarządzaj subskrypcją", iosPart: "iOS: Zarządzaj poprzez ustawienia iOS → [Twoja nazwa] → Subskrypcje → PipeKeeper", webPart: "Web/Android: Przejdź do Profil → Zarządzaj subskrypcją, aby zaktualizować płatność, wyświetlić faktury lub anulować" },
          { id: "cancel", q: "Jak anulować moją subskrypcję?", path: "Profil → Zarządzaj subskrypcją", iosPart: "iOS: Otwórz Ustawienia iOS → [Twoja nazwa] → Subskrypcje → PipeKeeper → Anuluj subskrypcję", webPart: "Web/Android: Przejdź do Profil → Zarządzaj subskrypcją → Anuluj subskrypcję", note: "Zachowasz dostęp do końca okresu rozliczeniowego." }
        ]},
        troubleshooting: { title: "Rozwiązywanie problemów", items: [
          { id: "cant-login", q: "Nie mogę się zalogować lub mój kod wygasł", path: "Ekran logowania → Poproś o nowy kod", a: "Spróbuj zalogować się ponownie: system automatycznie wysyła nowy kod weryfikacyjny. Sprawdź folder spam lub odwiedź stronę pomocy weryfikacji, aby uzyskać szczegółowe instrukcje." },
          { id: "missing-features", q: "Dlaczego nie widzę określonych funkcji?", path: "Profil → Subskrypcja", a: "Niektóre funkcje wymagają dostępu Premium lub Pro. Sprawdź status subskrypcji w Profilu. Bezpłatni użytkownicy mają dostęp do zarządzania kolekcją dla maksymalnie 5 fajek i 10 mieszanek tytoniu." },
          { id: "sync-issues", q: "Moje dane się nie synchronizują", path: "Profil → Odśwież / Wyloguj się i zaloguj", a: "Spróbuj odświeżyć przeglądarkę lub wyloguj się i zaloguj ponownie. Twoja kolekcja automatycznie synchronizuje się z chmurą po wprowadzeniu zmian." }
        ]
      }
    },
    troubleshooting: {
      pageTitle: "Rozwiązywanie problemów",
      pageSubtitle: "Typowe problemy i rozwiązania",
      navFAQ: "Często zadawane pytania",
      navHowTo: "Przewodniki praktyczne",
      sections: {
        tobaccoValuation: {
          title: "Wycena tytoniu",
          items: [
            { id: "missing-value", q: "Dlaczego brakuje wartości mojego tytoniu?", intro: "Wartość wymaga ręcznego wprowadzenia (Premium) lub szacowania AI (Pro).", points: ["Bezpłatni użytkownicy widzą tylko inwentarz", "Upewnij się, że masz właściwy poziom subskrypcji", "Uruchom wycenę po uaktualnieniu"] },
            { id: "low-confidence", q: "Dlaczego moje szacowanie pokazuje niską pewność?", intro: "Niska pewność oznacza, że znaleziono ograniczone dane rynkowe dla tej mieszanki.", points: ["Może być rzadka, wycofana lub regionalna", "Szacunki o niskiej pewności należy traktować jako przybliżenia", "Rozważ ręczną wycenę dla rzadkich mieszanek"] },
            { id: "locked-ai", q: "Dlaczego wycena AI jest zablokowana?", intro: "Wycena wspierana przez AI wymaga Pro.", points: ["Jeśli jesteś subskrybentem Premium, który dołączył przed 1 lutego 2026, masz dostęp legacy", "W innym razie uaktualnij do Pro, aby odblokować funkcje AI"] },
            { id: "no-auto-update", q: "Dlaczego wartość nie jest aktualizowana automatycznie?", intro: "Wyceny AI są generowane na żądanie, aby zachować kredyty i wydajność.", points: ["Kliknij 'Uruchom wycenę AI', aby zaktualizować szacunki", "Automatyczne zaplanowane odświeżanie może zostać dodane w przyszłych aktualizacjach Pro"] }
          ]
        }
      }
    }
  },
  ja: {
    faqFull: {
      pageTitle: "PipeKeeperについてのよくある質問",
      pageSubtitle: "定義、一般情報、免責事項",
      navHowTo: "実用ガイド",
      navTroubleshooting: "トラブルシューティング",
      verificationHelp: {
        q: "🔒 ログインできません/確認コードの有効期限が切れました-どうしたらいいですか?",
        intro: "メール確認またはログインに問題がある場合:",
        steps: ["もう一度ログインしてください-システムは自動的に新しい確認コードを送信します", "確認メールについては、スパム/迷惑メールフォルダを確認してください", "詳細な指示については、確認ヘルプページにアクセスしてください", "admin@pipekeeperapp.comのサポートに直接お問い合わせください"],
        note: "サポートにお問い合わせする際はメールアドレスを含めてください。迅速にお手伝いできるようにします。"
      },
      sections: {
        general: { title: "一般", items: [
          { id: "what-is", q: "PipeKeeperとは何ですか?", a: "PipeKeeperはパイプ喫煙者向けに設計されたコレクション管理および情報アプリケーションです。パイプ、タバコブレンド、熟成缶、関連メモを追跡し、オプションのAI支援インサイト and価値評価を提供します。" },
          { id: "tobacco-sales", q: "PipeKeeperはタバコを販売または宣伝していますか?", a: "いいえ。PipeKeeperはホビーとコレクション管理のみのアプリケーションです。タバコ製品の販売、宣伝、または購入を促進することはありません。" },
          { id: "data-privacy", q: "私のデータはプライベートですか?", a: "はい。コレクションデータはあなたのものです。PipeKeeperはアプリケーションを操作し、機能を提供するためにのみデータを使用します。個人データは販売しません。" },
          { id: "first-launch", q: "アプリを初めて開いたときに利用規約が表示されるのはなぜですか?", a: "初回使用時、PipeKeeperはアプリにアクセスする前に利用規約とプライバシーポリシーの受け入れを要求します。これは1回限りの要件です。承認後、将来の訪問時にホームページに直接移動します。ヘルプメニューまたはフッターリンクからいつでもこれらのドキュメントを確認できます。" }
        ]},
        gettingStarted: { title: "はじめに", items: [
          { id: "tutorial", q: "チュートリアルまたはウォークスルーはありますか?", a: "はい!アカウントを初めて作成するとき、PipeKeeperはガイド付きオンボーディングフローを提供し、プロファイル設定、最初のパイプとタバコの追加、AI機能へのアクセスをガイドします。ホームページからいつでもチュートリアルを再開できます。", cta: "チュートリアルを再開" },
          { id: "what-cellaring", q: "セラーでの熟成とは何ですか?", a: "セラーでの熟成とは、密閉缶またはバルクタバコを熟成のために保管することを指します。PipeKeeperには詳細なセラー追跡システムが含まれており、タバコがセラーに追加または削除された時期、オンスの数量、コンテナタイプ、メモを追跡します。この機能はプレミアムサブスクライバーが利用できます。" },
          { id: "smoking-log", q: "喫煙ログとは何ですか?", a: "喫煙ログは、どのパイプでどのタバコを吸ったかを追跡します。何が一緒に効果的に機能するかを思い出すのに役立ち、AIペアリング推奨事項に貢献します。プレミアムサブスクライバーは、ログに記録されたセッションに基づいて自動在庫削減の恩恵を受けます。" }
        ]},
        fieldDefinitions: { title: "フィールド定義", items: [
          { id: "pipe-shape", q: "パイプシェイプとは何ですか?", a: "シェイプ分類は、パイプの全体的な形状(ビリヤード、ダブリン、曲がった等)を説明しています。PipeKeeperには30以上の一般的な形状が含まれています。形状は喫煙の特性(握りやすさと煙の冷却)に影響します。" },
          { id: "chamber-volume", q: "チャンバーボリュームとは何ですか?", a: "チャンバーボリューム(小/中/大/特大)は、ボウル容量と喫煙継続時間を示します。小さなチャンバーは15-30分の喫煙に適していますが、特大は90+分を提供できます。" },
          { id: "stem-material", q: "ステムマテリアルのオプションは何ですか?", a: "一般的なステムマテリアルには、バルカナイト(伝統的、柔らかい咬み心地)、アクリル/ルサイト(耐久性、より硬い)、カンバーランド(大理石模様)、琥珀やホーンなどの特殊素材が含まれます。" },
          { id: "bowl-material", q: "ボウルマテリアルは何ですか?", a: "ほとんどのパイプはブライア(耐熱木材)製ですが、他のマテリアルには海の泡(ミネラル、使用に伴い色が変わる)、トウモロコシの芯(経済的、使い捨て)、モルタ(泥炭オーク)、その他多くの木材が含まれます。" },
          { id: "finish-types", q: "フィニッシュタイプは何ですか?", a: "フィニッシュはボウル表面の処理を指しています: スムース(磨かれた、グレインを示す)、サンドブラスト(テクスチャー、フィラーを隠す)、ラスティケーション(彫刻されたテクスチャー)、またはナチュラル(未加工)。フィニッシュは主に美的ですが、グリップに影響を与える可能性があります。" },
          { id: "blend-type", q: "タバコブレンドタイプは何ですか?", a: "ブレンドタイプは、葉の一次成分でタバコを分類します: バージニア(甘い、草本的)、イングリッシュ(ラタキア付き、薫製)、アロマティック(フレーバー添加)、バーレー(ナッツ)、VaPer(バージニア/ぺりク)など。" },
          { id: "tobacco-cut", q: "タバコカットタイプは何ですか?", a: "カットはタバコの準備方法を説明しています: リボン(薄いストリップ、詰めやすい)、フレーク(プレス葉、摩擦が必要)、プラグ(固いブロック)、コイン(スライスプラグ)、シャグ(非常に細かい)など。" },
          { id: "tobacco-strength", q: "タバコストレングスとは何ですか?", a: "ストレングスはマイルドからストロングまでのニコチン含有量を指しています。初心者は通常、マイル-ミディアムのブレンドから始めます。フルストレングスのブレンドは、慣れていない場合、ニコチン病を引き起こす可能性があります。" }
        ]},
        tobaccoValuation: { title: "タバコ評価", items: [
          { id: "valuation-calc", q: "タバコ価値はどのように計算されますか?", a: "タバコ価値は2つの方法で追跡できます: (1)手動市場価値-現在の市場価格を入力(プレミアム)、または(2)AI支援評価-AIが公開リストを分析して価値、範囲、信頼度を推定(Pro)。" },
          { id: "manual-vs-ai", q: "手動評価とAI評価の違いは何ですか?", a: "手動評価により、独自の研究を追跡できます(プレミアム)。AI評価は機械学習を使用して市場データを分析し、推定、範囲、信頼レベル、および予測を提供します(Pro)。" },
          { id: "estimated-label", q: "値が「推定」としてラベル付けされているのはなぜですか?", a: "AI生成の値は利用可能な市場データに基づいた予測です。実際の価格は状態、年齢、売り手、市場需要によって異なります。推定は教育ツールであり、投資アドバイスではありません。" },
          { id: "confidence-meaning", q: "信頼度は何を意味しますか?", a: "信頼度は、推定をサポートする市場データの量を示しています。高=強いデータ。中=適度なデータ。低=限定データ。低信頼度は推定の信頼性が低いことを意味しています。" },
          { id: "locked-valuation", q: "一部の評価機能がロックされているのはなぜですか?", a: "AI支援評価と予測予測はProが必要です。プレミアムユーザーは手動市場値とコスト基準を追跡できます。無料ユーザーは在庫と熟成のみを追跡できます。" }
        ]},
        featuresAndTools: { title: "機能とツール", items: [
          { id: "interchangeable-bowls", q: "交換可能なボウルとは何ですか?", intro: "一部のパイプシステム(Falcon、Gabotherm、Yello-Bole、Viking等)では、同じステム/チャンバーアセンブリ上の異なるボウルを交換できます。PipeKeeperは各ボウルを独自の「パイプバリアント」として扱い:", points: ["フォーカスタグ(あるボウルをバージニア、別のボウルをアロマティック等に割り当てる)", "チャンバー寸法と特性", "タバコペアリング推奨事項", "ブレークイン・スケジュール and喫煙ログ"], conclusion: "これは最適な専門化を可能にします:異なるタバコタイプに複数のボウルで同じステムを使用し、幽霊を防ぎます。" },
          { id: "pipe-focus", q: "パイプフォーカスタグとは何ですか?", intro: "フォーカスタグにより、特定のタバコタイプ用のパイプを専門化できます。一般的なタグは次のとおりです:", points: ["アロマティック: パイプをアロマティックブレンド専用に指定(強い/中/軽い強度サポート)", "非アロマティック: アロマティックブレンドを除外", "バージニア、VaPer、イングリッシュ、バルカン、ラタキア: 自動的に非アロマティックファミリーとして処理", "ユーティリティ/多目的: 制限なしの混合使用を可能にする"], conclusion: "ペアリングシステムはこれらのタグを尊重しています: アロマティック専用パイプは非アロマティックブレンドを推奨せず、その逆も同様です。" },
          { id: "pairing-matrix", q: "ペアリングマトリックスとは何ですか?", a: "ペアリングマトリックスは、コレクション内の各パイプとタバコブレンド間の互換性スコア(0-10)を生成します。パイプの特性(形状、チャンバーボリューム、ボウルマテリアル)、ブレンドプロファイル(タイプ、強度、アロマティック強度)、パイプフォーカスタグ(バージニア、イングリッシュ、アロマティック等)、および個人的な好みを考慮しています。" },
          { id: "pipe-identification", q: "パイプ識別はどのように機能しますか?", a: "パイプの写真をアップロードすると、AIはマーク、形状、その他の視覚的特性を分析して、メーカー、モデル、および概算値を特定します。既知のパイプメーカーのデータベースで手動検索することもできます。" },
          { id: "geometry-analysis", q: "パイプジオメトリ分析とは何ですか?", a: "このAIツールはパイプ写真と保存寸法を分析して、ジオメトリ属性を分類します: 形状(ビリヤード、ダブリン等)、ボウルスタイル(円筒形、円錐形等)、ステムシェイプ(円形、ダイヤモンド等)、曲率(直線、1/4曲線等)、サイズクラス(小、標準、大等)。" },
          { id: "verified-measurements", q: "検証済みメーカー仕様を見つけることはできますか?", a: "はい、セカンダリオプションとして。AI更新に移動→「検証済みメーカー仕様を検索」。メーカーカタログとデータベースを検索していますが、一部の製造パイプでのみ機能します。多くの工業用とビンテージパイプには、検証済み仕様が利用できません。" },
          { id: "value-lookup", q: "PipeKeeperはパイプ値を推定できますか?", a: "はい。AIはメーカー、状態、および現在の市場トレンドに基づいて推定市場値を提供できます。これらは推定値のみであり、保険または販売目的で使用しないでください。" },
          { id: "export-tools", q: "コレクションデータをエクスポートできますか?", a: "はい。エクスポートツールにより、パイプとタバコのインベントリをCSVファイルとしてダウンロードでき、バックアップまたは他のアプリケーションでの使用に使用できます。パイプとタバコページのエクスポートボタンを探してください。" }
        ]},
        accountsAndData: { title: "アカウントとデータ", items: [
          { id: "need-account", q: "アカウントは必要ですか?", a: "はい。アカウントを作成することで、すべてのデバイスでコレクションと設定を保存および同期できます。" },
          { id: "export-data", q: "データをエクスポートできますか?", a: "はい。エクスポートツールにより、パイプ、タバコインベントリ、喫煙ログのCSV/PDFレポートを生成できます。パイプとタバコページのエクスポートボタンを探してください。" },
          { id: "bulk-import", q: "データを一括インポートできますか?", a: "はい。ホーム画面からインポートページに移動します。您可以粘贴CSV数据或上传文件,以快速一次添加多个烟斗或烟草混合物。" }
        ]},
        ai: { title: "AI機能と精度", items: [
          { id: "ai-accuracy", q: "AI推奨事項は正確性が保証されていますか?", a: "いいえ。AI機能はベストエフォートの提案を提供し、不完全または不正確な可能性があります。独自の判断を使用し、信頼できるソースから重要な情報を検証する必要があります。" },
          { id: "medical-advice", q: "PipeKeeperは医学的または専門的なアドバイスを提供していますか?", a: "いいえ。PipeKeeperはホビーとコレクション管理のみの情報ツールを提供しています。" }
        ]},
        support: { title: "サポート", contactQ: "サポートにアクセスするにはどうすればいいですか?", contactIntro: "アプリ内のサポートリンクを使用するか、訪問してください", contactLinks: "こちらでも当社のポリシーを確認できます:" }
      }
    },
    howTo: {
      pageTitle: "実用ガイド",
      pageSubtitle: "クリアなナビゲーションパスを含む迅速な回答",
      navFAQ: "よくある質問",
      navTroubleshooting: "トラブルシューティング",
      footerTitle: "まだサポートが必要ですか?",
      footerDesc: "完全なFAQにアクセスするか、サポートに連絡して追加の支援を得てください。",
      footerFAQ: "完全なFAQを表示",
      footerSupport: "サポートに連絡",
      sections: {
        gettingStarted: { title: "はじめに", items: [
          { id: "add-pipe", q: "パイプを追加するにはどうしたらいいですか?", path: "ホーム → パイプ → パイプを追加", a: "パイプを手動で追加するか、写真からAI識別を使用します。メーカー、形状、寸法、状態などの詳細を含めると、インサイトと推奨事項が得られます。" },
          { id: "add-tobacco", q: "タバコブレンドを追加するにはどうしたらいいですか?", path: "ホーム → タバコ → タバコを追加", a: "メーカー、ブレンドタイプ、数量、保管日などの詳細でタバコブレンドを追跡します。セラーログを使用して熟成進捗を記録します。" },
          { id: "add-note", q: "アイテムにメモを追加するにはどうしたらいいですか?", path: "パイプ/タバコ → アイテムを選択 → 編集 → メモを追加", a: "任意のパイプまたはタバコをクリックして詳細ページを開きます。「編集」をタップし、指定されたフィールドにメモを追加します。メモは個人的な好みと観察を思い出すのに役立ちます。" },
          { id: "view-insights", q: "インサイトを表示するにはどうしたらいいですか?", path: "ホーム → コレクションインサイト", a: "アイテムを追加した後、インサイトがホームページに表示されます。統計、ペアリンググリッド、熟成ダッシュボード、レポートを表示します。タブをクリックしてさまざまなインサイトを探索します。" }
        ]},
        managingCollection: { title: "コレクションの管理", items: [
          { id: "organize", q: "コレクションを整理するにはどうしたらいいですか?", path: "パイプ/タバコ → フィルタと並べ替え", a: "フィルタを使用して、形状、ブレンドタイプ、またはフォーカスで絞り込みます。追加日、値、または評価で並べ替えます。クイックアクセスのためにお気に入りフィルタを保存します。" },
          { id: "export", q: "データをエクスポートするにはどうしたらいいですか?", path: "ホーム → インサイト → レポートタブ", badge: "Premium", a: "プレミアムおよびプロユーザーは、コレクションデータをCSVまたはPDFでエクスポートできます。コレクションインサイト下のレポートタブのエクスポートボタンを見つけてください。" },
          { id: "cellar-log", q: "セラーを追跡するにはどうしたらいいですか?", path: "タバコ → ブレンドを選択 → セラーログ", badge: "Premium", a: "タバコがセラーに追加または削除された時期を記録します。数量、日付、コンテナタイプを追跡します。熟成ダッシュボードで熟成進捗を表示します。" },
          { id: "smoking-log", q: "喫煙セッションを記録するにはどうしたらいいですか?", path: "ホーム → インサイト → ログタブ", badge: "Premium", a: "どのパイプでどのタバコを吸ったか追跡します。日付、ボウル数、メモを記録します。このデータはペアリング推奨事項を提供しています。" }
        ]},
        aiTools: { title: "AIツール", items: [
          { id: "identify-pipe", q: "写真からパイプを識別するにはどうしたらいいですか?", path: "ホーム → タバコエキスパート → 識別", badge: "Pro", a: "パイプの写真をアップロードして、AIがマーク、形状、特性を分析して、メーカー、モデル、概算値を特定します。" },
          { id: "pairing-suggestions", q: "ペアリング提案を取得するにはどうしたらいいですか?", path: "ホーム → インサイト → ペアリンググリッド", badge: "Pro", a: "ペアリングマトリックスは、各パイプとタバコの組み合わせの互換性スコアを生成します。パイプの詳細ページまたはペアリンググリッドで推奨事項を表示します。" },
          { id: "optimize-collection", q: "コレクションを最適化するにはどうしたらいいですか?", path: "ホーム → タバコエキスパート → 最適化", badge: "Pro", a: "コレクション最適化ツールはパイプとタバコを分析して、専門化を提案し、ギャップを特定し、次の購入を提案します。" }
        ]},
        subscriptions: { title: "サブスクリプション", items: [
          { id: "subscribe", q: "サブスクリプションはどのように機能しますか?", path: "プロフィール → サブスクリプション", a: "PipeKeeperは、無料、プレミアム、プロレベルを提供しています。購読して、無制限アイテム、高度なツール、AI機能をアンロックします。プロフィールで価格を確認し、サブスクリプションを管理します。" },
          { id: "manage-subscription", q: "サブスクリプションを管理するにはどうしたらいいですか?", path: "プロフィール → サブスクリプションを管理", iosPart: "iOS: iOS設定を通じて管理 → [名前] → サブスクリプション → PipeKeeper", webPart: "Web/Android: プロフィール → サブスクリプションを管理に移動して、支払いを更新し、請求書を表示するか、キャンセルします" },
          { id: "cancel", q: "サブスクリプションをキャンセルするにはどうしたらいいですか?", path: "プロフィール → サブスクリプションを管理", iosPart: "iOS: iOS設定を開く → [名前] → サブスクリプション → PipeKeeper → サブスクリプションをキャンセル", webPart: "Web/Android: プロフィール → サブスクリプションを管理 → サブスクリプションをキャンセルに移動", note: "請求期間の終了まで、アクセスを保持します。" }
        ]},
        troubleshooting: { title: "トラブルシューティング", items: [
          { id: "cant-login", q: "ログインできないか、コードが期限切れです", path: "ログイン画面 → 新しいコードをリクエスト", a: "もう一度ログインしてください: システムは自動的に新しい確認コードを送信します。スパムフォルダを確認するか、詳細な指示については確認ヘルプページにアクセスしてください。" },
          { id: "missing-features", q: "特定の機能が見えないのはなぜですか?", path: "プロフィール → サブスクリプション", a: "一部の機能にはプレミアムまたはプロアクセスが必要です。プロフィールでサブスクリプションステータスを確認します。無料ユーザーは、最大5つのパイプと10のタバコブレンドのコア管理にアクセスできます。" },
          { id: "sync-issues", q: "データが同期されていません", path: "プロフィール → 更新 / ログアウトしてログイン", a: "ブラウザを更新するか、ログアウトしてもう一度ログインしてください。変更を加えると、コレクションはクラウドと自動的に同期されます。" }
        ]
      }
    },
    troubleshooting: {
      pageTitle: "トラブルシューティング",
      pageSubtitle: "一般的な問題と解決策",
      navFAQ: "よくある質問",
      navHowTo: "実用ガイド",
      sections: {
        tobaccoValuation: {
          title: "タバコ評価",
          items: [
            { id: "missing-value", q: "タバコの価値が失われているのはなぜですか?", intro: "値には手動入力(プレミアム)またはAI推定(Pro)が必要です。", points: ["無料ユーザーは在庫のみを表示します", "適切なサブスクリプションレベルがあることを確認してください", "アップグレード後に評価を実行します"] },
            { id: "low-confidence", q: "推定値が低い信頼度を示しているのはなぜですか?", intro: "低い信頼度は、このブレンドについて限定的な市場データが見つかったことを意味しています。", points: ["希少性、廃止、または地域限定の可能性があります", "低い信頼度の推定値は粗い近似として扱う必要があります", "レアブレンドについては手動評価の使用を検討してください"] },
            { id: "locked-ai", q: "AI評価がロックされているのはなぜですか?", intro: "AI支援評価にはProが必要です。", points: ["プレミアムサブスクライバーが2026年2月1日前に参加した場合、レガシーアクセスがあります", "それ以外の場合は、AI機能をアンロックするためにProにアップグレードしてください"] },
            { id: "no-auto-update", q: "値が自動的に更新されないのはなぜですか?", intro: "AI評価はオンデマンドで生成されて、クレジットとパフォーマンスを保持します。", points: ["「AI評価を実行」をクリックして推定値を更新します", "スケジュール自動更新は、将来のプロ更新で追加される可能性があります"] }
          ]
        }
      }
    }
  },
  "zh-Hans": {
    faqFull: {
      pageTitle: "PipeKeeper常见问题",
      pageSubtitle: "定义、一般信息和免责声明",
      navHowTo: "操作指南",
      navTroubleshooting: "故障排除",
      verificationHelp: {
        q: "🔒 我无法登录/我的验证代码已过期-我该怎么办?",
        intro: "如果您遇到电子邮件验证或登录问题:",
        steps: ["尝试再次登录-系统将自动发送新的验证码", "检查您的垃圾邮件/垃圾邮件文件夹中的验证电子邮件", "访问我们的验证帮助页面以获取详细说明", "直接在admin@pipekeeperapp.com与支持部门联系"],
        note: "与支持部门联系时请包括您的电子邮件地址,以便我们迅速为您提供帮助。"
      },
      sections: {
        general: { title: "一般", items: [
          { id: "what-is", q: "PipeKeeper是什么?", a: "PipeKeeper是为烟斗爱好者设计的系列管理和信息应用程序。它帮助您跟踪烟斗、烟草混合物、陈年罐和相关笔记,并提供可选的AI支持的见解和估值。" },
          { id: "tobacco-sales", q: "PipeKeeper在销售或推广烟草吗?", a: "否。PipeKeeper仅是一个爱好和集合管理应用程序。它不销售、不推广、不便于烟草产品的购买。" },
          { id: "data-privacy", q: "我的数据是私密的吗?", a: "是。您的集合数据属于您。PipeKeeper仅使用您的数据来运营应用程序和提供功能。我们不出售个人数据。" },
          { id: "first-launch", q: "为什么我第一次打开应用时看到服务条款?", a: "在您第一次使用时,PipeKeeper要求您在访问应用之前接受《服务条款》和《隐私政策》。这是一次性要求。接受后,您将在以后的访问中直接进入主页。您可以随时通过帮助菜单或页脚链接查看这些文档。" }
        ]},
        gettingStarted: { title: "入门", items: [
          { id: "tutorial", q: "有教程或演练吗?", a: "是! 当您第一次创建帐户时,PipeKeeper会提供一个指导性入职流程,该流程会指导您完成个人资料设置、添加第一个烟斗和烟草以及访问AI功能。您可以随时从主页重新启动教程。", cta: "重启教程" },
          { id: "what-cellaring", q: "什么是陈年贮藏?", a: "陈年贮藏是指将密封罐或散装烟草储存以进行老化。PipeKeeper包括一个详细的地窖跟踪系统,可跟踪何时将烟草添加到或从地窖中移除、数量(盎司)、容器类型和笔记。此功能可供高级版订阅者使用。" },
          { id: "smoking-log", q: "什么是吸烟日志?", a: "吸烟日志跟踪您用哪个烟草吸过哪根烟斗。它可帮助您记住什么搭配得很好,并有助于AI配对建议。高级版订阅者受益于基于已记录会话的自动库存削减。" }
        ]},
        fieldDefinitions: { title: "字段定义", items: [
          { id: "pipe-shape", q: "烟斗形状是什么?", a: "形状分类描述了烟斗的总体形状(Billiard、Dublin、弯曲等)。PipeKeeper包括30多种常见形状。形状影响吸烟特性,例如夹紧舒适度和烟雾冷却。" },
          { id: "chamber-volume", q: "什么是腔室体积?", a: "腔室体积(小/中/大/特大)指示碗的容量和吸烟持续时间。小腔室适合15-30分钟的吸烟,而特大腔室可提供90+分钟。" },
          { id: "stem-material", q: "杆材料选项是什么?", a: "常见的杆材料包括硫化橡胶(传统,软咬)、丙烯酸/勒塞特(耐用,更硬)、坎伯兰(大理石外观)和琥珀或角质等专业材料。" },
          { id: "bowl-material", q: "碗材料是什么?", a: "大多数烟斗由石南木(耐热木材)制成,但其他材料包括海泡沫(矿物,随使用而改变颜色)、玉米芯(经济,一次性)、Morta(泥炭橡树)和各种其他木材。" },
          { id: "finish-types", q: "饰面类型是什么?", a: "饰面是指碗表面处理:光滑(抛光,显示纹理)、喷砂(纹理,隐藏填充)、仿古(雕刻纹理)或天然(未完成)。饰面主要是美观的,但可能影响握感。" },
          { id: "blend-type", q: "烟草混合物类型是什么?", a: "混合物类型按主要叶子成分对烟草进行分类:弗吉尼亚(甜味,草本味)、英文(带拉塔基亚,烟熏味)、香料味(添加香精)、大麦(坚果味)、VaPer(弗吉尼亚/白鼠皮)等。" },
          { id: "tobacco-cut", q: "烟草切割类型是什么?", a: "切割描述了烟草的准备方式:丝带(细条,易于包装)、薄片(压制叶子,需要摩擦)、堵塞(实心块)、硬币(切割堵塞)、莎草(非常细)等。" },
          { id: "tobacco-strength", q: "什么是烟草强度?", a: "强度是指尼古丁含量,从温和到浓烈不等。初学者通常从温和到中等混合物开始。全强度混合物如果您不习惯,可能会引起尼古丁病。" }
        ]},
        tobaccoValuation: { title: "烟草估值", items: [
          { id: "valuation-calc", q: "烟草价值如何计算?", a: "烟草价值可以通过两种方式追踪:(1)手动市场价值-您输入当前市场价格(高级版),或(2)AI支持的估值-AI分析公开列表以估计价值、范围和置信度(Pro)。" },
          { id: "manual-vs-ai", q: "手动估值和AI估值有什么区别?", a: "手动估值使您可以追踪自己的研究(高级版)。AI估值使用机器学习来分析市场数据并提供估计、范围、置信度和预测(Pro)。" },
          { id: "estimated-label", q: "为什么价值被标记为'估计的'?", a: "AI生成的值是基于可用市场数据的预测。实际价格因条件、年龄、卖家和市场需求而异。估计是教育工具,而不是投资建议。" },
          { id: "confidence-meaning", q: "置信度是什么意思?", a: "置信度表示有多少市场数据支持估计。高=强数据。中=中等数据。低=有限数据。低置信度意味着估计的可靠性较低。" },
          { id: "locked-valuation", q: "为什么某些估值功能被锁定?", a: "AI支持的估值和预测预测需要Pro。高级版用户可以追踪手动市场价值和成本基础。免费用户只能追踪库存和老化。" }
        ]},
        featuresAndTools: { title: "功能和工具", items: [
          { id: "interchangeable-bowls", q: "什么是可互换的碗?", intro: "某些烟斗系统(Falcon、Gabotherm、Yello-Bole、Viking等)允许您在同一杆/腔室组件上交换不同的碗。PipeKeeper将每个碗视为具有其自身的不同'烟斗变体':", points: ["焦点标签(将一个碗专用于弗吉尼亚烟,另一个专用于香料烟等)", "腔室尺寸和特性", "烟草配对建议", "磨合时间表and吸烟日志"], conclusion: "这可实现最优专业化:将同一杆与多个碗一起用于不同的烟草类型,而无需幽灵。" },
          { id: "pipe-focus", q: "什么是烟斗焦点标签?", intro: "焦点标签使您可以为特定烟草类型专业化烟斗。常见标签包括:", points: ["香料味:仅将烟斗专用于香料混合物(支持强/中/轻强度)", "非香料味:排除香料混合物", "弗吉尼亚、VaPer、英文、巴尔干、拉塔基亚:自动视为非香料族", "实用/多功能:允许混合使用而无限制"], conclusion: "配对系统尊重这些标签:仅香料烟斗不会推荐非香料混合物,反之亦然。" },
          { id: "pairing-matrix", q: "什么是配对矩阵?", a: "配对矩阵在您的集合中的每根烟斗和烟草混合物之间生成兼容性评分(0-10)。它考虑烟斗特性(形状、腔室体积、碗材料)、混合物轮廓(类型、强度、香料强度)、烟斗焦点标签(弗吉尼亚、英文、香料等)和您的个人偏好。" },
          { id: "pipe-identification", q: "烟斗识别如何工作?", a: "上传您烟斗的照片,AI将分析标记、形状和其他视觉特征以识别制造商、型号和大约价值。您也可以在已知烟斗制造商的数据库中手动搜索。" },
          { id: "geometry-analysis", q: "什么是烟斗几何分析?", a: "此AI工具分析您的烟斗照片和存储的尺寸以对几何属性进行分类:形状(Billiard、Dublin等)、碗式(圆柱形、圆锥形等)、杆形(圆形、钻石形等)、弯曲(直、1/4弯等)和尺寸等级(小、标准、大等)。" },
          { id: "verified-measurements", q: "我可以找到经验证的制造商规格吗?", a: "是的,作为二级选项。转到AI更新→'查找经验证的制造商规格'。这搜索制造商目录和数据库,但仅适用于某些生产烟斗。许多手工制作和古董烟斗没有可用的经验证规格。" },
          { id: "value-lookup", q: "PipeKeeper可以估计烟斗价值吗?", a: "可以。AI可以根据制造商、状况和当前市场趋势提供估计的市场价值。这些仅是估计,不应用于保险或销售目的。" },
          { id: "export-tools", q: "我可以导出我的集合数据吗?", a: "可以。导出工具允许您将烟斗和烟草库存下载为CSV文件以进行备份或在其他应用程序中使用。在烟斗和烟草页面上寻找导出按钮。" }
        ]},
        accountsAndData: { title: "帐户和数据", items: [
          { id: "need-account", q: "我需要帐户吗?", a: "是。创建帐户可以在所有设备上保存和同步您的集合和设置。" },
          { id: "export-data", q: "我可以导出我的数据吗?", a: "可以。导出工具允许您生成烟斗、烟草库存和吸烟日志的CSV/PDF报告。在烟斗和烟草页面上寻找导出按钮。" },
          { id: "bulk-import", q: "我可以批量导入数据吗?", a: "可以。从主屏幕进入导入页面。您可以粘贴CSV数据或上传文件,以快速一次添加多个烟斗或烟草混合物。" }
        ]},
        ai: { title: "AI功能和准确性", items: [
          { id: "ai-accuracy", q: "AI建议是否保证准确?", a: "否。AI功能提供尽力建议,可能不完整或不准确。您应该使用自己的判断并从可信来源验证重要信息。" },
          { id: "medical-advice", q: "PipeKeeper提供医学或专业建议吗?", a: "否。PipeKeeper仅为爱好和集合管理提供信息工具。" }
        ]},
        support: { title: "支持", contactQ: "我如何联系支持?", contactIntro: "使用应用中的支持链接或访问", contactLinks: "您也可以在此处查看我们的政策:" }
      }
    },
    howTo: {
      pageTitle: "操作指南",
      pageSubtitle: "带有清晰导航路径的快速答案",
      navFAQ: "常见问题",
      navTroubleshooting: "故障排除",
      footerTitle: "还需要帮助吗?",
      footerDesc: "访问我们的完整常见问题或联系支持获取更多帮助。",
      footerFAQ: "查看完整常见问题",
      footerSupport: "联系支持",
      sections: {
        gettingStarted: { title: "入门", items: [
          { id: "add-pipe", q: "如何添加烟斗?", path: "主页 → 烟斗 → 添加烟斗", a: "手动添加烟斗或使用照片中的AI识别。包括制造商、形状、尺寸和条件等详细信息以解锁见解和建议。" },
          { id: "add-tobacco", q: "如何添加烟草混合物?", path: "主页 → 烟草 → 添加烟草", a: "使用制造商、混合物类型、数量和储存日期等详细信息追踪烟草混合物。使用地窖日志记录老化进度。" },
          { id: "add-note", q: "如何向项目添加笔记?", path: "烟斗/烟草 → 选择项目 → 编辑 → 添加笔记", a: "点击任何烟斗或烟草打开其详细信息页面。点击编辑并在指定字段中添加笔记。笔记可帮助您记住个人偏好和观察。" },
          { id: "view-insights", q: "如何查看见解?", path: "主页 → 集合见解", a: "添加项目后,见解将显示在您的主页上。查看统计信息、配对网格、老化仪表板和报告。点击选项卡以探索不同的见解。" }
        ]},
        managingCollection: { title: "管理您的集合", items: [
          { id: "organize", q: "如何整理我的集合?", path: "烟斗/烟草 → 筛选和排序", a: "使用筛选器按形状、混合物类型或焦点进行缩小。按添加日期、价值或评分排序。保存喜爱的筛选器以快速访问。" },
          { id: "export", q: "如何导出我的数据?", path: "主页 → 见解 → 报告选项卡", badge: "Premium", a: "高级版和专业版用户可以将集合数据导出为CSV或PDF。在集合见解下的\"报告\"选项卡中找到导出按钮。" },
          { id: "cellar-log", q: "如何追踪我的地窖?", path: "烟草 → 选择混合物 → 地窖日志", badge: "Premium", a: "记录何时将烟草添加到或从地窖中移除。追踪数量、日期和容器类型。在老化仪表板上查看老化进度。" },
          { id: "smoking-log", q: "如何记录吸烟会话?", path: "主页 → 见解 → 日志选项卡", badge: "Premium", a: "追踪您用哪个烟草吸了哪根烟斗。记录日期、碗数和笔记。此数据可提供配对建议。" }
        ]},
        aiTools: { title: "AI工具", items: [
          { id: "identify-pipe", q: "如何从照片中识别烟斗?", path: "主页 → 烟草专家 → 识别", badge: "Pro", a: "上传烟斗照片,AI分析标记、形状和特征以识别制造商、型号和大约价值。" },
          { id: "pairing-suggestions", q: "如何获得配对建议?", path: "主页 → 见解 → 配对网格", badge: "Pro", a: "配对矩阵为每个烟斗-烟草组合生成兼容性评分。在烟斗详细信息页面或配对网格中查看建议。" },
          { id: "optimize-collection", q: "如何优化我的集合?", path: "主页 → 烟草专家 → 优化", badge: "Pro", a: "集合优化器分析您的烟斗和烟草以推荐专业化、识别差距并建议您的下一步购买。" }
        ]},
        subscriptions: { title: "订阅", items: [
          { id: "subscribe", q: "订阅如何工作?", path: "个人资料 → 订阅", a: "PipeKeeper提供免费、高级版和专业版级别。订阅可解锁无限项目、高级工具和AI功能。在您的个人资料中查看价格并管理订阅。" },
          { id: "manage-subscription", q: "如何管理我的订阅?", path: "个人资料 → 管理订阅", iosPart: "iOS: 通过iOS设置管理 → [您的名称] → 订阅 → PipeKeeper", webPart: "网络/安卓: 转到个人资料 → 管理订阅以更新付款、查看发票或取消" },
          { id: "cancel", q: "如何取消我的订阅?", path: "个人资料 → 管理订阅", iosPart: "iOS: 打开iOS设置 → [您的名称] → 订阅 → PipeKeeper → 取消订阅", webPart: "网络/安卓: 转到个人资料 → 管理订阅 → 取消订阅", note: "您将保持访问权限至计费期结束。" }
        ]},
        troubleshooting: { title: "故障排除", items: [
          { id: "cant-login", q: "我无法登录或我的代码已过期", path: "登录屏幕 → 请求新代码", a: "尝试再次登录: 系统自动发送新验证码。检查垃圾邮件文件夹或访问验证帮助页面以获取详细说明。" },
          { id: "missing-features", q: "为什么我看不到某些功能?", path: "个人资料 → 订阅", a: "某些功能需要高级版或专业版访问权限。检查个人资料中的订阅状态。免费用户可以访问最多5个烟斗和10个烟草混合物的核心管理。" },
          { id: "sync-issues", q: "我的数据未同步", path: "个人资料 → 刷新 / 注销并登录", a: "尝试刷新浏览器或注销并重新登录。当您进行更改时,您的集合会自动与云同步。" }
        ]
      }
    },
    troubleshooting: {
      pageTitle: "故障排除",
      pageSubtitle: "常见问题和解决方案",
      navFAQ: "常见问题",
      navHowTo: "操作指南",
      sections: {
        tobaccoValuation: {
          title: "烟草估值",
          items: [
            { id: "missing-value", q: "为什么我的烟草价值缺失?", intro: "价值需要手动输入(高级版)或AI估计(专业版)。", points: ["免费用户仅看到库存", "确保您有正确的订阅级别", "升级后运行估值"] },
            { id: "low-confidence", q: "为什么我的估计显示低置信度?", intro: "低置信度意味着为此混合物找到的市场数据有限。", points: ["它可能很少见、已停用或地域专属", "低置信度估计应视为粗略估计", "考虑对稀有混合物使用手动估值"] },
            { id: "locked-ai", q: "为什么AI估值被锁定?", intro: "AI支持的估值需要专业版。", points: ["如果您是在2026年2月1日前加入的高级版订阅者,则拥有旧版访问权限", "否则,升级到专业版以解锁AI功能"] },
            { id: "no-auto-update", q: "为什么价值不自动更新?", intro: "AI估值按需生成以保留积分和性能。", points: ["点击'运行AI估值'以更新估计", "计划自动刷新可能会在将来的专业版更新中添加"] }
          ]
        }
      }
    }
  },
  "zh-Hans": {}
};

export { helpContentFinal };