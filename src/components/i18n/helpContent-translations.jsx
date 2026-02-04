/**
 * Help Center Translations for IT, PT-BR, NL, PL, JA, ZH-HANS
 * Full parity with EN structure: 34 FAQ questions + How-To + Troubleshooting
 */

export const helpContentTranslations = {
  it: {
    faqFull: {
      pageTitle: "Domande frequenti di PipeKeeper",
      pageSubtitle: "Definizioni, informazioni generali e avvisi",
      navHowTo: "Guide pratiche",
      navTroubleshooting: "Risoluzione dei problemi",
      verificationHelp: {
        q: "🔒 Non riesco ad accedere / Il mio codice di verifica è scaduto - Cosa faccio?",
        intro: "Se hai problemi con la verifica e-mail o l'accesso:",
        steps: [
          "Prova ad accedere di nuovo - il sistema invierà automaticamente un nuovo codice di verifica",
          "Controlla la cartella spam/posta indesiderata per l'e-mail di verifica",
          "Visita la nostra pagina di aiuto per la verifica per istruzioni dettagliate",
          "Contatta il supporto direttamente su admin@pipekeeperapp.com"
        ],
        note: "Includi il tuo indirizzo e-mail quando contatti il supporto in modo che possiamo aiutarti rapidamente."
      },
      sections: {
        general: { title: "Generale", items: [
          { id: "what-is", q: "Cos'è PipeKeeper?", a: "PipeKeeper è un'applicazione di gestione della collezione e informazioni progettata per gli appassionati di pipe. Ti aiuta a tracciare pipe, miscele di tabacco, lattine invecchiate e note correlate, e fornisce approfondimenti assistiti da IA opzionali e stime di valore." },
          { id: "tobacco-sales", q: "PipeKeeper vende o promuove il tabacco?", a: "No. PipeKeeper è un'applicazione solo per hobby e gestione della collezione. Non vende, non promuove e non facilita l'acquisto di prodotti del tabacco." },
          { id: "data-privacy", q: "I miei dati sono privati?", a: "Sì. I tuoi dati della collezione ti appartengono. PipeKeeper utilizza i tuoi dati solo per operare l'applicazione e fornire funzioni. Non vendiamo dati personali." },
          { id: "first-launch", q: "Perché vedo i Termini di servizio al primo avvio dell'app?", a: "Al primo utilizzo, PipeKeeper ti richiede di accettare i Termini di servizio e l'Informativa sulla privacy prima di accedere all'app. Questo è un requisito una tantum. Una volta accettati, andrai direttamente alla tua pagina iniziale nelle visite future. Puoi consultare questi documenti in qualsiasi momento dal menu Aiuto o dai link a piè di pagina." }
        ]},
        gettingStarted: { title: "Guida introduttiva", items: [
          { id: "tutorial", q: "C'è un tutorial o una procedura guidata?", a: "Sì! Quando crei il tuo account per la prima volta, PipeKeeper offre un flusso di onboarding guidato che ti guida attraverso la configurazione del profilo, l'aggiunta della tua prima pipe e tabacco e l'accesso alle funzioni di IA. Puoi riavviare il tutorial in qualsiasi momento dalla pagina iniziale.", cta: "Riavvia tutorial" },
          { id: "what-cellaring", q: "Cos'è l'invecchiamento in cantina?", a: "L'invecchiamento in cantina si riferisce all'immagazzinamento di lattine sigillate o tabacco sfuso per l'invecchiamento. PipeKeeper include un sistema dettagliato di registrazione della cantina che tiene traccia di quando il tabacco viene aggiunto o rimosso dalla tua cantina, delle quantità in once, dei tipi di contenitore e delle note. Questa funzione è disponibile per gli abbonati Premium." },
          { id: "smoking-log", q: "Cos'è il diario del fumo?", a: "Il diario del fumo tiene traccia di quali pipe hai fumato con quale tabacco. Ti aiuta a ricordare cosa funziona bene insieme e contribuisce alle raccomandazioni di abbinamento di IA. Gli abbonati Premium beneficiano della riduzione automatica dell'inventario in base alle sessioni registrate." }
        ]},
        fieldDefinitions: { title: "Definizioni dei campi", items: [
          { id: "pipe-shape", q: "Cos'è la forma della pipe?", a: "La classificazione della forma descrive la forma generale della pipe (Billiard, Dublin, Curva, ecc.). PipeKeeper include oltre 30 forme comuni. La forma influenza le caratteristiche del fumo come il comfort della morsa e il raffreddamento del fumo." },
          { id: "chamber-volume", q: "Cos'è il volume della camera?", a: "Il volume della camera (Piccolo/Medio/Grande/Extra Grande) indica la capacità della ciotola e la durata del fumo. Le camere piccole sono buone per fumare 15-30 minuti, mentre Extra Grande può fornire 90+ minuti." },
          { id: "stem-material", q: "Quali sono le opzioni di materiale del gambo?", a: "I materiali comuni del gambo includono Vulcanite (tradizionale, morso morbido), Acrilico/Lucite (durevole, più duro), Cumberland (aspetto marmorizzato) e materiali speciali come Ambra o Corno." },
          { id: "bowl-material", q: "Quali sono i materiali della ciotola?", a: "La maggior parte delle pipe è in Radica (legno resistente al calore), ma altri materiali includono Schiuma di mare (minerale, si colora con l'uso), Spiga di mais (economica, monouso), Morta (quercia torbiera) e vari altri legni." },
          { id: "finish-types", q: "Quali sono i tipi di finitura?", a: "La finitura si riferisce al trattamento della superficie della ciotola: Liscia (lucida, mostra la venatura), Sabbiastra (texturizzata, nasconde i riempimenti), Rusticata (texture scolpita) o Naturale (non rifinita). La finitura è principalmente estetica ma può influenzare la presa." },
          { id: "blend-type", q: "Quali sono i tipi di miscela di tabacco?", a: "I tipi di miscela categorizzano il tabacco per composizione primaria delle foglie: Virginia (dolce, erbaceo), English (con Latakia, affumicato), Aromatico (aromatizzante aggiunto), Burley (nocciola), VaPer (Virginia/Perique), ecc." },
          { id: "tobacco-cut", q: "Quali sono i tipi di taglio del tabacco?", a: "Il taglio descrive come viene preparato il tabacco: Nastro (strisce sottili, facile da pressare), Fiocco (fogli pressati, richiede sfregamento), Plug (blocco solido), Moneta (plug affettato), Shag (molto fine), ecc." },
          { id: "tobacco-strength", q: "Cos'è la forza del tabacco?", a: "La forza si riferisce al contenuto di nicotina che va da Mite a Forte. I principianti in genere iniziano con miscele Mite-Medie. Le miscele di piena forza possono causare malattia da nicotina se non sei abituato." }
        ]},
        tobaccoValuation: { title: "Valutazione del tabacco", items: [
          { id: "valuation-calc", q: "Come viene calcolato il valore del tabacco?", a: "Il valore del tabacco può essere tracciato in due modi: (1) Valore di mercato manuale - inserisci il prezzo di mercato attuale (Premium), oppure (2) Valutazione assistita da IA - l'IA analizza gli annunci pubblici per stimare valore, intervallo e confidenza (Pro)." },
          { id: "manual-vs-ai", q: "Qual è la differenza tra valutazione manuale e IA?", a: "La valutazione manuale ti consente di tracciare le tue ricerche (Premium). La valutazione IA utilizza l'apprendimento automatico per analizzare i dati di mercato e fornire stime, intervalli, livelli di confidenza e proiezioni (Pro)." },
          { id: "estimated-label", q: "Perché il valore è etichettato come 'stimato'?", a: "I valori generati dall'IA sono previsioni basate sui dati di mercato disponibili. I prezzi reali variano in base alla condizione, all'età, al venditore e alla domanda di mercato. Le stime sono strumenti educativi, non consulenza di investimento." },
          { id: "confidence-meaning", q: "Cosa significa confidenza?", a: "La confidenza indica quanti dati di mercato supportano la stima. Alta = dati forti. Media = dati moderati. Bassa = dati limitati. La bassa confidenza significa che la stima è meno affidabile." },
          { id: "locked-valuation", q: "Perché alcune funzioni di valutazione sono bloccate?", a: "La valutazione assistita da IA e le proiezioni predittive richiedono Pro. Gli utenti Premium possono tracciare i valori di mercato manuali e la base di costo. Gli utenti gratuiti possono tracciare solo inventario e invecchiamento." }
        ]},
        featuresAndTools: { title: "Funzioni e strumenti", items: [
          { id: "interchangeable-bowls", q: "Cosa sono le ciotole intercambiabili?", intro: "Alcuni sistemi di pipe (Falcon, Gabotherm, Yello-Bole, Viking, ecc.) ti permettono di scambiare diverse ciotole sullo stesso assieme gambo/tubo. PipeKeeper tratta ogni ciotola come una 'variante di pipe' distinta con la sua:", points: ["Etichette di focus (dedicare una ciotola alle Virginia, un'altra agli Aromatici, ecc.)", "Dimensioni della camera e caratteristiche", "Raccomandazioni di abbinamento del tabacco", "Programmi di rodaggio e diari di fumo"], conclusion: "Questo consente la specializzazione ottimale: utilizzare lo stesso gambo con più ciotole per diversi tipi di tabacco senza fantasma." },
          { id: "pipe-focus", q: "Cosa sono le etichette di focus della pipe?", intro: "Le etichette di focus ti permettono di specializzare le pipe per specifici tipi di tabacco. Le etichette comuni includono:", points: ["Aromatico: Dedica la pipe solo a miscele aromatiche (intensità forte/media/leggera supportata)", "Non aromatico: Esclude miscele aromatiche", "Virginia, VaPer, English, Balkan, Latakia: Vengono trattate automaticamente come famiglie non aromatiche", "Utilità/Versatile: Consente uso misto senza restrizioni"], conclusion: "Il sistema di abbinamento rispetta queste etichette: le pipe solo aromatiche non consiglieranno miscele non aromatiche e viceversa." },
          { id: "pairing-matrix", q: "Cos'è la matrice di abbinamento?", a: "La Matrice di abbinamento genera punteggi di compatibilità (0-10) tra ogni pipe e miscela di tabacco nella tua collezione. Considera le caratteristiche della pipe (forma, volume della camera, materiale della ciotola), i profili della miscela (tipo, forza, intensità aromatica), le etichette di focus della pipe (Virginia, English, Aromatico, ecc.) e le tue preferenze personali." },
          { id: "pipe-identification", q: "Come funziona l'identificazione della pipe?", a: "Carica foto della tua pipe e l'IA analizzerà i segni, la forma e altre caratteristiche visive per identificare il produttore, il modello e il valore approssimativo. Puoi anche cercare manualmente in un database dei produttori di pipe noti." },
          { id: "geometry-analysis", q: "Cos'è l'analisi della geometria della pipe?", a: "Questo strumento di IA analizza le tue foto di pipe e dimensioni memorizzate per classificare gli attributi di geometria: forma (Billiard, Dublin, ecc.), stile della ciotola (cilindrico, conico, ecc.), forma del tubo (rotondo, diamante, ecc.), curva (dritta, 1/4 curva, ecc.) e classe di dimensione (piccola, standard, grande, ecc.)." },
          { id: "verified-measurements", q: "Posso trovare specifiche del produttore verificate?", a: "Sì, come opzione secondaria. Vai a Aggiornamenti IA → 'Trova specifiche del produttore verificate'. Questo ricerca nei cataloghi e database del produttore ma funziona solo per alcune pipe di produzione. Molte pipe artigianali e d'epoca non avranno specifiche verificate disponibili." },
          { id: "value-lookup", q: "PipeKeeper può stimare i valori della pipe?", a: "Sì. L'IA può fornire valori di mercato stimati in base al produttore, alle condizioni e alle tendenze attuali del mercato. Questi sono solo stime e non devono essere utilizzati per scopi assicurativi o di vendita." },
          { id: "export-tools", q: "Posso esportare i dati della mia collezione?", a: "Sì. Gli strumenti di esportazione ti consentono di scaricare l'inventario delle tue pipe e del tabacco come file CSV per il backup o l'uso in altre applicazioni. Cerca i pulsanti di esportazione nelle pagine Pipe e Tabacco." }
        ]},
        accountsAndData: { title: "Account e dati", items: [
          { id: "need-account", q: "Ho bisogno di un account?", a: "Sì. La creazione di un account ti consente di salvare e sincronizzare la tua collezione e le impostazioni su tutti i dispositivi." },
          { id: "export-data", q: "Posso esportare i miei dati?", a: "Sì. Gli strumenti di esportazione ti consentono di generare report CSV/PDF delle tue pipe, inventario di tabacco e diari di fumo. Cerca i pulsanti di esportazione nelle pagine Pipe e Tabacco." },
          { id: "bulk-import", q: "Posso importare dati in massa?", a: "Sì. Vai alla pagina Importa dalla schermata iniziale. Puoi incollare dati CSV o caricare un file per aggiungere rapidamente più pipe o miscele di tabacco alla volta." }
        ]},
        ai: { title: "Funzioni e precisione dell'IA", items: [
          { id: "ai-accuracy", q: "Le raccomandazioni dell'IA sono garantite corrette?", a: "No. Le funzioni di IA forniscono suggerimenti al meglio dello sforzo e possono essere incomplete o imprecise. Dovresti usare il tuo giudizio e verificare le informazioni importanti da fonti affidabili." },
          { id: "medical-advice", q: "PipeKeeper fornisce consulenza medica o professionale?", a: "No. PipeKeeper fornisce strumenti informativi solo per la gestione di hobby e collezioni." }
        ]},
        support: { title: "Supporto", contactQ: "Come contatto il supporto?", contactIntro: "Usa il link di supporto all'interno dell'app o visita", contactLinks: "Puoi anche consultare le nostre politiche qui:" }
      }
    },
    howTo: {
      pageTitle: "Guide pratiche",
      pageSubtitle: "Risposte rapide con percorsi di navigazione chiari",
      navFAQ: "Domande frequenti",
      navTroubleshooting: "Risoluzione dei problemi",
      footerTitle: "Hai ancora bisogno di aiuto?",
      footerDesc: "Visita le nostre domande frequenti complete o contatta il supporto per ulteriore assistenza.",
      footerFAQ: "Visualizza domande frequenti complete",
      footerSupport: "Contatta supporto",
      sections: {
        gettingStarted: { title: "Guida introduttiva", items: [
          { id: "add-pipe", q: "Come aggiungo una pipe?", path: "Home → Pipe → Aggiungi pipe", a: "Aggiungi le tue pipe manualmente o usa l'identificazione IA dalle foto. Includi dettagli come produttore, forma, dimensioni e condizione per sbloccare approfondimenti e raccomandazioni." },
          { id: "add-tobacco", q: "Come aggiungo una miscela di tabacco?", path: "Home → Tabacco → Aggiungi tabacco", a: "Traccia le tue miscele di tabacco con dettagli come produttore, tipo di miscela, quantità e date di immagazzinamento. Usa il diario della cantina per registrare i progressi dell'invecchiamento." },
          { id: "add-note", q: "Come aggiungo note a un elemento?", path: "Pipe/Tabacco → Seleziona elemento → Modifica → Aggiungi note", a: "Fai clic su qualsiasi pipe o tabacco per aprire la sua pagina di dettaglio. Tocca 'Modifica' e aggiungi note nel campo designato. Le note ti aiutano a ricordare preferenze e osservazioni personali." },
          { id: "view-insights", q: "Come visualizzo gli approfondimenti?", path: "Home → Approfondimenti della collezione", a: "Gli approfondimenti appaiono sulla tua pagina iniziale dopo aver aggiunto elementi. Visualizza statistiche, griglie di abbinamento, dashboard di invecchiamento e report. Fai clic sulle schede per esplorare diversi approfondimenti." }
        ]},
        managingCollection: { title: "Gestisci la tua collezione", items: [
          { id: "organize", q: "Come organizzo la mia collezione?", path: "Pipe/Tabacco → Filtri e Ordina", a: "Usa i filtri per restringere per forma, tipo di miscela o focus. Ordina per data aggiunta, valore o valutazione. Salva i filtri preferiti per un accesso rapido." },
          { id: "export", q: "Come esporto i miei dati?", path: "Home → Approfondimenti → Scheda Report", badge: "Premium", a: "Gli utenti Premium e Pro possono esportare i dati della collezione come CSV o PDF. Trova i pulsanti di esportazione nella scheda Report sotto Approfondimenti della collezione." },
          { id: "cellar-log", q: "Come traccia la mia cantina?", path: "Tabacco → Seleziona miscela → Diario cantina", badge: "Premium", a: "Registra quando il tabacco viene aggiunto o rimosso dalla tua cantina. Traccia quantità, date e tipi di contenitore. Visualizza i progressi dell'invecchiamento sulla Dashboard di invecchiamento." },
          { id: "smoking-log", q: "Come registro una sessione di fumo?", path: "Home → Approfondimenti → Scheda Registro", badge: "Premium", a: "Traccia quale pipe hai fumato con quale tabacco. Registra data, numero di ciotole e note. Questi dati alimentano le raccomandazioni di abbinamento." }
        ]},
        aiTools: { title: "Strumenti di IA", items: [
          { id: "identify-pipe", q: "Come identifico una pipe da una foto?", path: "Home → Esperto tabaccaio → Identifica", badge: "Pro", a: "Carica foto della tua pipe e l'IA analizza i segni, la forma e le caratteristiche per identificare il produttore, il modello e il valore approssimativo." },
          { id: "pairing-suggestions", q: "Come ottengo suggerimenti di abbinamento?", path: "Home → Approfondimenti → Griglia di abbinamento", badge: "Pro", a: "La Matrice di abbinamento genera punteggi di compatibilità per ogni combinazione pipe-tabacco. Visualizza i consigli sulle pagine di dettaglio della pipe o nella Griglia di abbinamento." },
          { id: "optimize-collection", q: "Come ottimizzare la mia collezione?", path: "Home → Esperto tabaccaio → Ottimizza", badge: "Pro", a: "Lo Strumento di ottimizzazione della collezione analizza le tue pipe e i tuoi tabacchi per consigliare specializzazioni, identificare lacune e suggerire il tuo prossimo acquisto." }
        ]},
        subscriptions: { title: "Abbonamenti", items: [
          { id: "subscribe", q: "Come funzionano gli abbonamenti?", path: "Profilo → Abbonamento", a: "PipeKeeper offre livelli Gratuito, Premium e Pro. Iscriviti per sbloccare elementi illimitati, strumenti avanzati e funzioni di IA. Visualizza i prezzi e gestisci gli abbonamenti nel tuo Profilo." },
          { id: "manage-subscription", q: "Come gestisco il mio abbonamento?", path: "Profilo → Gestisci abbonamento", iosPart: "iOS: Gestisci tramite Impostazioni iOS → [Il tuo nome] → Abbonamenti → PipeKeeper", webPart: "Web/Android: Vai a Profilo → Gestisci abbonamento per aggiornare il pagamento, visualizzare le fatture o annullare" },
          { id: "cancel", q: "Come annullo il mio abbonamento?", path: "Profilo → Gestisci abbonamento", iosPart: "iOS: Apri Impostazioni iOS → [Il tuo nome] → Abbonamenti → PipeKeeper → Annulla abbonamento", webPart: "Web/Android: Vai a Profilo → Gestisci abbonamento → Annulla abbonamento", note: "Manterrai l'accesso fino alla fine del tuo periodo di fatturazione." }
        ]},
        troubleshooting: { title: "Risoluzione dei problemi", items: [
          { id: "cant-login", q: "Non riesco ad accedere o il mio codice è scaduto", path: "Schermata di accesso → Richiedi nuovo codice", a: "Prova ad accedere di nuovo: il sistema invia automaticamente un nuovo codice di verifica. Controlla la cartella spam o visita la pagina di aiuto per la verifica per istruzioni dettagliate." },
          { id: "missing-features", q: "Perché non riesco a vedere determinate funzioni?", path: "Profilo → Abbonamento", a: "Alcune funzioni richiedono accesso Premium o Pro. Controlla lo stato del tuo abbonamento nel Profilo. Gli utenti gratuiti hanno accesso alla gestione della collezione principale per un massimo di 5 pipe e 10 miscele di tabacco." },
          { id: "sync-issues", q: "I miei dati non si stanno sincronizzando", path: "Profilo → Aggiorna / Esci e accedi", a: "Prova ad aggiornare il browser o ad uscire e accedere di nuovo. La tua collezione si sincronizza automaticamente con il cloud quando apporti modifiche." }
        ]
      }
    },
    troubleshooting: {
      pageTitle: "Risoluzione dei problemi",
      pageSubtitle: "Problemi comuni e soluzioni",
      navFAQ: "Domande frequenti",
      navHowTo: "Guide pratiche",
      sections: {
        tobaccoValuation: {
          title: "Valutazione del tabacco",
          items: [
            { id: "missing-value", q: "Perché manca il valore del mio tabacco?", intro: "Il valore richiede l'inserimento manuale (Premium) o la stima dell'IA (Pro).", points: ["Gli utenti gratuiti vedono solo l'inventario", "Assicurati di avere il livello di abbonamento corretto", "Esegui la valutazione dopo l'aggiornamento"] },
            { id: "low-confidence", q: "Perché la mia stima mostra bassa confidenza?", intro: "La bassa confidenza significa che sono stati trovati dati di mercato limitati per questa miscela.", points: ["Potrebbe essere rara, discontinuata o regionalmente esclusiva", "Le stime con bassa confidenza devono essere trattate come approssimazioni approssimative", "Considera l'uso della valutazione manuale per miscele rare"] },
            { id: "locked-ai", q: "Perché la valutazione dell'IA è bloccata?", intro: "La valutazione assistita da IA richiede Pro.", points: ["Se sei un abbonato Premium che si è iscritto prima del 1 febbraio 2026, hai accesso legacy", "Altrimenti, passa a Pro per sbloccare le funzioni di IA"] },
            { id: "no-auto-update", q: "Perché il valore non si aggiorna automaticamente?", intro: "Le valutazioni dell'IA vengono generate su richiesta per preservare crediti e prestazioni.", points: ["Fai clic su 'Esegui valutazione IA' per aggiornare le stime", "L'aggiornamento automatico pianificato potrebbe essere aggiunto negli aggiornamenti Pro futuri"] }
          ]
        }
      }
    }
  },
  "pt-BR": {
    faqFull: {
      pageTitle: "Perguntas frequentes do PipeKeeper",
      pageSubtitle: "Definições, informações gerais e aviso de isenção de responsabilidade",
      navHowTo: "Guias práticos",
      navTroubleshooting: "Solução de problemas",
      verificationHelp: {
        q: "🔒 Não consigo fazer login / Meu código de verificação expirou - O que faço?",
        intro: "Se você estiver tendo problemas com verificação de e-mail ou login:",
        steps: [
          "Tente fazer login novamente - o sistema enviará automaticamente um novo código de verificação",
          "Verifique sua pasta de spam/lixo eletrônico para o e-mail de verificação",
          "Visite nossa página de ajuda de verificação para instruções detalhadas",
          "Contate o suporte diretamente em admin@pipekeeperapp.com"
        ],
        note: "Inclua seu endereço de e-mail ao contatar o suporte para que possamos ajudá-lo rapidamente."
      },
      sections: {
        general: { title: "Geral", items: [
          { id: "what-is", q: "O que é PipeKeeper?", a: "PipeKeeper é um aplicativo de gerenciamento de coleção e informações projetado para entusiastas de cachimbos. Ele ajuda você a rastrear cachimbos, misturas de tabaco, latas envelhecidas e notas relacionadas, e fornece insights assistidos por IA opcionais e estimativas de valor." },
          { id: "tobacco-sales", q: "PipeKeeper está vendendo ou promovendo tabaco?", a: "Não. PipeKeeper é apenas um aplicativo de hobby e gerenciamento de coleção. Não vende, promove ou facilita a compra de produtos de tabaco." },
          { id: "data-privacy", q: "Meus dados são privados?", a: "Sim. Seus dados de coleção são seus. PipeKeeper usa seus dados apenas para operar o aplicativo e fornecer recursos. Não vendemos dados pessoais." },
          { id: "first-launch", q: "Por que vejo os Termos de Serviço quando abro o aplicativo pela primeira vez?", a: "No seu primeiro uso, PipeKeeper exige que você aceite os Termos de Serviço e a Política de Privacidade antes de acessar o aplicativo. Este é um requisito único. Depois de aceitar, você irá diretamente para sua página inicial em visitas futuras. Você pode revisar esses documentos a qualquer momento no menu Ajuda ou links de rodapé." }
        ]},
        gettingStarted: { title: "Iniciando", items: [
          { id: "tutorial", q: "Existe um tutorial ou passo a passo?", a: "Sim! Quando você cria sua conta pela primeira vez, o PipeKeeper oferece um fluxo de integração guiado que o orienta através da configuração do perfil, adição de seu primeiro cachimbo e tabaco e acesso aos recursos de IA. Você pode reiniciar o tutorial a qualquer momento a partir da página inicial.", cta: "Reiniciar tutorial" },
          { id: "what-cellaring", q: "O que é envelhecimento em adega?", a: "O envelhecimento em adega refere-se ao armazenamento de latas seladas ou tabaco a granel para envelhecimento. PipeKeeper inclui um sistema detalhado de registro de adega que rastreia quando o tabaco é adicionado ou removido de sua adega, quantidades em onças, tipos de recipiente e notas. Este recurso está disponível para assinantes Premium." },
          { id: "smoking-log", q: "O que é o diário de fumo?", a: "O diário de fumo rastreia quais cachimbos você fumou com qual tabaco. Ajuda você a se lembrar do que funciona bem junto e contribui para recomendações de emparelhamento de IA. Os assinantes Premium se beneficiam da redução automática de inventário com base nas sessões registradas." }
        ]},
        fieldDefinitions: { title: "Definições de campo", items: [
          { id: "pipe-shape", q: "O que é a forma do cachimbo?", a: "A classificação de forma descreve a forma geral do cachimbo (Billiard, Dublin, Curvo, etc.). PipeKeeper inclui mais de 30 formas comuns. A forma afeta características de fumo como conforto de aperto e resfriamento da fumaça." },
          { id: "chamber-volume", q: "O que é o volume da câmara?", a: "O volume da câmara (Pequeno/Médio/Grande/Extra Grande) indica a capacidade do pote e a duração da fumaça. Câmaras pequenas são boas para 15-30 minutos de fumo, enquanto Extra Grande pode fornecer 90+ minutos." },
          { id: "stem-material", q: "Quais são as opções de material do talo?", a: "Os materiais de talo comuns incluem Vulcanite (tradicional, mordida macia), Acrílico/Lucite (durável, mais duro), Cumberland (aparência marmôrea) e materiais especializados como Âmbar ou Chifre." },
          { id: "bowl-material", q: "Quais são os materiais da tigela?", a: "A maioria dos cachimbos é feita de Briar (madeira resistente ao calor), mas outros materiais incluem Espuma do mar (mineral, muda de cor com o uso), Sabugo de milho (econômico, descartável), Morta (carvalho turfoso) e vários outros tipos de madeira." },
          { id: "finish-types", q: "Quais são os tipos de acabamento?", a: "O acabamento refere-se ao tratamento da superfície da tigela: Liso (polido, mostra grã), Jateado com areia (texturizado, oculta preenchimentos), Rusticado (textura esculpida) ou Natural (não acabado). O acabamento é principalmente estético, mas pode afetar o grip." },
          { id: "blend-type", q: "Quais são os tipos de mistura de tabaco?", a: "Os tipos de mistura categorizam o tabaco por composição primária de folhas: Virgínia (doce, herbáceo), English (com Latakia, defumado), Aromático (sabor adicionado), Burley (avelã), VaPer (Virgínia/Perique), etc." },
          { id: "tobacco-cut", q: "Quais são os tipos de corte de tabaco?", a: "O corte descreve como o tabaco é preparado: Fita (finas tiras, fácil de embalar), Flocos (folhas prensadas, requer fricção), Plug (bloco sólido), Moeda (plug fatiado), Shag (muito fino), etc." },
          { id: "tobacco-strength", q: "O que é força do tabaco?", a: "A força refere-se ao teor de nicotina, variando de Suave a Forte. Os iniciantes normalmente começam com misturas Suave-Média. Misturas de força completa podem causar doença de nicotina se você não estiver acostumado." }
        ]},
        tobaccoValuation: { title: "Avaliação do tabaco", items: [
          { id: "valuation-calc", q: "Como é calculado o valor do tabaco?", a: "O valor do tabaco pode ser rastreado de duas maneiras: (1) Valor de mercado manual - você insere o preço de mercado atual (Premium), ou (2) Avaliação assistida por IA - a IA analisa anúncios públicos para estimar valor, intervalo e confiança (Pro)." },
          { id: "manual-vs-ai", q: "Qual é a diferença entre avaliação manual e IA?", a: "A avaliação manual permite rastrear sua própria pesquisa (Premium). A avaliação por IA usa aprendizado de máquina para analisar dados de mercado e fornecer estimativas, intervalos, níveis de confiança e projeções (Pro)." },
          { id: "estimated-label", q: "Por que o valor é rotulado como 'estimado'?", a: "Os valores gerados por IA são previsões baseadas em dados de mercado disponíveis. Os preços reais variam de acordo com a condição, idade, vendedor e demanda de mercado. As estimativas são ferramentas educacionais, não conselhos de investimento." },
          { id: "confidence-meaning", q: "O que significa confiança?", a: "A confiança indica quanto dados de mercado apoiam a estimativa. Alta = dados fortes. Média = dados moderados. Baixa = dados limitados. Baixa confiança significa que a estimativa é menos confiável." },
          { id: "locked-valuation", q: "Por que alguns recursos de avaliação estão bloqueados?", a: "A avaliação assistida por IA e projeções preditivas exigem Pro. Usuários Premium podem rastrear valores de mercado manuais e base de custo. Usuários gratuitos podem rastrear apenas inventário e envelhecimento." }
        ]},
        featuresAndTools: { title: "Recursos e ferramentas", items: [
          { id: "interchangeable-bowls", q: "O que são tigelas intercambiáveis?", intro: "Alguns sistemas de cachimbo (Falcon, Gabotherm, Yello-Bole, Viking, etc.) permitem que você troque diferentes tigelas no mesmo conjunto talo/câmara. PipeKeeper trata cada tigela como uma 'variante de cachimbo' distinta com sua própria:", points: ["Rótulos de foco (dedicar uma tigela a Virgínias, outra a Aromáticos, etc.)", "Dimensões da câmara e características", "Recomendações de emparelhamento de tabaco", "Cronogramas de rodagem e diários de fumo"], conclusion: "Isso permite especialização ideal: use o mesmo talo com várias tigelas para diferentes tipos de tabaco sem fantasma." },
          { id: "pipe-focus", q: "O que são rótulos de foco de cachimbo?", intro: "Os rótulos de foco permitem que você especialize cachimbos para tipos de tabaco específicos. Os rótulos comuns incluem:", points: ["Aromático: Dedica o cachimbo apenas a misturas aromáticas (intensidade Forte/Média/Leve suportada)", "Não aromático: Exclui misturas aromáticas", "Virgínia, VaPer, English, Balkan, Latakia: Tratadas automaticamente como famílias não aromáticas", "Utilidade/Versátil: Permite uso misto sem restrições"], conclusion: "O sistema de emparelhamento respeita esses rótulos: cachimbos apenas aromáticos não recomendarão misturas não aromáticas e vice-versa." },
          { id: "pairing-matrix", q: "O que é a matriz de emparelhamento?", a: "A Matriz de Emparelhamento gera pontuações de compatibilidade (0-10) entre cada cachimbo e mistura de tabaco em sua coleção. Considera características do cachimbo (forma, volume da câmara, material da tigela), perfis de mistura (tipo, força, intensidade aromática), rótulos de foco do cachimbo (Virgínia, English, Aromático, etc.) e suas preferências pessoais." },
          { id: "pipe-identification", q: "Como funciona a identificação de cachimbo?", a: "Carregue fotos de seu cachimbo e a IA analisará marcas, forma e outras características visuais para identificar o fabricante, modelo e valor aproximado. Você também pode procurar manualmente em um banco de dados de fabricantes de cachimbo conhecidos." },
          { id: "geometry-analysis", q: "O que é análise de geometria de cachimbo?", a: "Esta ferramenta de IA analisa suas fotos de cachimbo e dimensões armazenadas para classificar atributos de geometria: forma (Billiard, Dublin, etc.), estilo de tigela (cilíndrico, cônico, etc.), forma de talo (redondo, diamante, etc.), curva (reta, 1/4 curva, etc.) e classe de tamanho (pequeno, padrão, grande, etc.)." },
          { id: "verified-measurements", q: "Posso encontrar especificações verificadas do fabricante?", a: "Sim, como opção secundária. Acesse Atualizações de IA → 'Encontre especificações de fabricante verificadas'. Isso pesquisa catálogos e bancos de dados do fabricante, mas funciona apenas para alguns cachimbos de produção. Muitos cachimbos artesanais e antigos não terão especificações verificadas disponíveis." },
          { id: "value-lookup", q: "PipeKeeper pode estimar valores de cachimbo?", a: "Sim. A IA pode fornecer valores de mercado estimados com base no fabricante, condição e tendências atuais de mercado. Estas são apenas estimativas e não devem ser usadas para fins de seguro ou venda." },
          { id: "export-tools", q: "Posso exportar meus dados de coleção?", a: "Sim. As ferramentas de exportação permitem que você baixe seu inventário de cachimbos e tabaco como arquivos CSV para backup ou uso em outros aplicativos. Procure pelos botões de exportação nas páginas Cachimbos e Tabaco." }
        ]},
        accountsAndData: { title: "Contas e dados", items: [
          { id: "need-account", q: "Preciso de uma conta?", a: "Sim. Criar uma conta permite que você salve e sincronize sua coleção e configurações em todos os dispositivos." },
          { id: "export-data", q: "Posso exportar meus dados?", a: "Sim. As ferramentas de exportação permitem que você gere relatórios CSV/PDF de seus cachimbos, inventário de tabaco e diários de fumo. Procure pelos botões de exportação nas páginas Cachimbos e Tabaco." },
          { id: "bulk-import", q: "Posso importar dados em massa?", a: "Sim. Acesse a página Importar na tela inicial. Você pode colar dados CSV ou carregar um arquivo para adicionar rapidamente vários cachimbos ou misturas de tabaco de uma vez." }
        ]},
        ai: { title: "Recursos e precisão da IA", items: [
          { id: "ai-accuracy", q: "As recomendações de IA são garantidas corretamente?", a: "Não. Os recursos de IA fornecem sugestões de melhor esforço e podem ser incompletos ou imprecisos. Você deve usar seu próprio julgamento e verificar informações importantes de fontes confiáveis." },
          { id: "medical-advice", q: "PipeKeeper fornece aconselhamento médico ou profissional?", a: "Não. PipeKeeper fornece ferramentas informativas apenas para gerenciamento de hobbies e coleções." }
        ]},
        support: { title: "Suporte", contactQ: "Como entro em contato com o suporte?", contactIntro: "Use o link de suporte dentro do aplicativo ou visite", contactLinks: "Você também pode revisar nossas políticas aqui:" }
      }
    },
    howTo: {
      pageTitle: "Guias práticos",
      pageSubtitle: "Respostas rápidas com caminhos de navegação claros",
      navFAQ: "Perguntas frequentes",
      navTroubleshooting: "Solução de problemas",
      footerTitle: "Ainda precisa de ajuda?",
      footerDesc: "Visite nossas perguntas frequentes completas ou entre em contato com o suporte para obter mais assistência.",
      footerFAQ: "Ver perguntas frequentes completas",
      footerSupport: "Contatar suporte",
      sections: {
        gettingStarted: { title: "Iniciando", items: [
          { id: "add-pipe", q: "Como adiciono um cachimbo?", path: "Início → Cachimbos → Adicionar cachimbo", a: "Adicione seus cachimbos manualmente ou use identificação de IA a partir de fotos. Inclua detalhes como fabricante, forma, dimensões e condição para desbloquear insights e recomendações." },
          { id: "add-tobacco", q: "Como adiciono uma mistura de tabaco?", path: "Início → Tabaco → Adicionar tabaco", a: "Rastreie suas misturas de tabaco com detalhes como fabricante, tipo de mistura, quantidade e datas de armazenamento. Use o diário de adega para registrar o progresso do envelhecimento." },
          { id: "add-note", q: "Como adiciono notas a um item?", path: "Cachimbos/Tabaco → Selecionar item → Editar → Adicionar notas", a: "Clique em qualquer cachimbo ou tabaco para abrir sua página de detalhes. Toque em 'Editar' e adicione notas no campo designado. As notas ajudam você a se lembrar de preferências e observações pessoais." },
          { id: "view-insights", q: "Como visualizo insights?", path: "Início → Insights de coleção", a: "Os insights aparecem em sua página inicial depois que você adiciona itens. Visualize estatísticas, grades de emparelhamento, painéis de envelhecimento e relatórios. Clique nas abas para explorar diferentes insights." }
        ]},
        managingCollection: { title: "Gerencie sua coleção", items: [
          { id: "organize", q: "Como organizo minha coleção?", path: "Cachimbos/Tabaco → Filtros e Ordenar", a: "Use filtros para restringir por forma, tipo de mistura ou foco. Classifique por data adicionada, valor ou classificação. Salve filtros favoritos para acesso rápido." },
          { id: "export", q: "Como exporto meus dados?", path: "Início → Insights → Aba Relatórios", badge: "Premium", a: "Usuários Premium e Pro podem exportar dados de coleção como CSV ou PDF. Encontre botões de exportação na aba Relatórios em Insights de coleção." },
          { id: "cellar-log", q: "Como rastreio minha adega?", path: "Tabaco → Selecionar mistura → Diário de adega", badge: "Premium", a: "Registre quando o tabaco é adicionado ou removido de sua adega. Rastreie quantidades, datas e tipos de recipiente. Visualize o progresso do envelhecimento no Painel de Envelhecimento." },
          { id: "smoking-log", q: "Como registro uma sessão de fumo?", path: "Início → Insights → Aba Registro", badge: "Premium", a: "Rastreie qual cachimbo você fumou com qual tabaco. Registre data, número de tigelas e notas. Esses dados alimentam as recomendações de emparelhamento." }
        ]},
        aiTools: { title: "Ferramentas de IA", items: [
          { id: "identify-pipe", q: "Como identifico um cachimbo a partir de uma foto?", path: "Início → Especialista em tabaco → Identificar", badge: "Pro", a: "Carregue fotos de seu cachimbo e a IA analisa marcas, forma e características para identificar fabricante, modelo e valor aproximado." },
          { id: "pairing-suggestions", q: "Como obtenho sugestões de emparelhamento?", path: "Início → Insights → Grade de emparelhamento", badge: "Pro", a: "A Matriz de Emparelhamento gera pontuações de compatibilidade para cada combinação cachimbo-tabaco. Visualize recomendações em páginas de detalhes de cachimbo ou na Grade de Emparelhamento." },
          { id: "optimize-collection", q: "Como otimizo minha coleção?", path: "Início → Especialista em tabaco → Otimizar", badge: "Pro", a: "O Otimizador de Coleção analisa seus cachimbos e tabacos para recomendar especializações, identificar lacunas e sugerir sua próxima compra." }
        ]},
        subscriptions: { title: "Assinaturas", items: [
          { id: "subscribe", q: "Como funcionam as assinaturas?", path: "Perfil → Assinatura", a: "PipeKeeper oferece níveis Grátis, Premium e Pro. Inscreva-se para desbloquear itens ilimitados, ferramentas avançadas e recursos de IA. Visualize preços e gerencie assinaturas em seu Perfil." },
          { id: "manage-subscription", q: "Como gerencio minha assinatura?", path: "Perfil → Gerenciar assinatura", iosPart: "iOS: Gerencie através de Configurações do iOS → [Seu nome] → Assinaturas → PipeKeeper", webPart: "Web/Android: Vá para Perfil → Gerenciar assinatura para atualizar o pagamento, visualizar faturas ou cancelar" },
          { id: "cancel", q: "Como cancelo minha assinatura?", path: "Perfil → Gerenciar assinatura", iosPart: "iOS: Abra Configurações do iOS → [Seu nome] → Assinaturas → PipeKeeper → Cancelar assinatura", webPart: "Web/Android: Vá para Perfil → Gerenciar assinatura → Cancelar assinatura", note: "Você manterá o acesso até o final do seu período de cobrança." }
        ]},
        troubleshooting: { title: "Solução de problemas", items: [
          { id: "cant-login", q: "Não consigo fazer login ou meu código expirou", path: "Tela de login → Solicitar novo código", a: "Tente fazer login novamente: o sistema envia um novo código de verificação automaticamente. Verifique sua pasta de spam ou visite a página de ajuda de verificação para instruções detalhadas." },
          { id: "missing-features", q: "Por que não posso ver determinados recursos?", path: "Perfil → Assinatura", a: "Alguns recursos exigem acesso Premium ou Pro. Verifique seu status de assinatura no Perfil. Usuários gratuitos têm acesso à gestão de coleção principal para até 5 cachimbos e 10 misturas de tabaco." },
          { id: "sync-issues", q: "Meus dados não estão sincronizando", path: "Perfil → Atualizar / Sair e fazer login", a: "Tente atualizar seu navegador ou sair e fazer login novamente. Sua coleção sincroniza automaticamente com a nuvem quando você faz alterações." }
        ]
      }
    },
    troubleshooting: {
      pageTitle: "Solução de problemas",
      pageSubtitle: "Problemas comuns e soluções",
      navFAQ: "Perguntas frequentes",
      navHowTo: "Guias práticos",
      sections: {
        tobaccoValuation: {
          title: "Avaliação do tabaco",
          items: [
            { id: "missing-value", q: "Por que falta o valor do meu tabaco?", intro: "O valor requer entrada manual (Premium) ou estimativa de IA (Pro).", points: ["Usuários gratuitos veem apenas inventário", "Certifique-se de ter o nível de assinatura correto", "Execute a avaliação após a atualização"] },
            { id: "low-confidence", q: "Por que minha estimativa mostra baixa confiança?", intro: "Baixa confiança significa que foram encontrados dados de mercado limitados para esta mistura.", points: ["Pode ser raro, descontinuado ou regionalmente exclusivo", "Estimativas com baixa confiança devem ser tratadas como aproximações", "Considere usar avaliação manual para misturas raras"] },
            { id: "locked-ai", q: "Por que a avaliação de IA está bloqueada?", intro: "A avaliação assistida por IA requer Pro.", points: ["Se você for assinante Premium que aderiu antes de 1º de fevereiro de 2026, terá acesso antigo", "Caso contrário, atualize para Pro para desbloquear recursos de IA"] },
            { id: "no-auto-update", q: "Por que o valor não é atualizado automaticamente?", intro: "Avaliações de IA são geradas sob demanda para preservar créditos e desempenho.", points: ["Clique em 'Executar avaliação de IA' para atualizar estimativas", "A atualização automática agendada pode ser adicionada em futuras atualizações Pro"] }
          ]
        }
      }
    }
  },
  nl: {
    faqFull: {
      pageTitle: "Veelgestelde vragen over PipeKeeper",
      pageSubtitle: "Definities, algemene informatie en disclaimer",
      navHowTo: "Handleidingen",
      navTroubleshooting: "Probleemoplossing",
      verificationHelp: {
        q: "🔒 Ik kan niet inloggen / Mijn verificatiecode is verlopen - Wat moet ik doen?",
        intro: "Als u problemen hebt met e-mailverificatie of inloggen:",
        steps: [
          "Probeer opnieuw in te loggen - het systeem stuurt automatisch een nieuwe verificatiecode",
          "Controleer uw spam-/junk-map op de verificatie-e-mail",
          "Bezoek onze verificatiehulppagina voor gedetailleerde instructies",
          "Neem rechtstreeks contact op met ondersteuning op admin@pipekeeperapp.com"
        ],
        note: "Voeg uw e-mailadres toe wanneer u contact opneemt met ondersteuning, zodat we u snel kunnen helpen."
      },
      sections: {
        general: { title: "Algemeen", items: [
          { id: "what-is", q: "Wat is PipeKeeper?", a: "PipeKeeper is een verzamelingsbeheer- en informatietoepassing ontworpen voor pijpenrokers. Het helpt u pijpen, tabaksmengsels, verouderde blikken en gerelateerde notities bij te houden, en biedt optionele AI-ondersteunde inzichten en waarderingschattingen." },
          { id: "tobacco-sales", q: "Verkoopt of promoot PipeKeeper tabak?", a: "Nee. PipeKeeper is alleen een hobby- en verzamelingsbeheertoepassing. Het verkoopt, promoot of vergemakkelijkt de aankoop van tabaksproducten niet." },
          { id: "data-privacy", q: "Zijn mijn gegevens privé?", a: "Ja. Uw verzamelingsgegevens zijn van u. PipeKeeper gebruikt uw gegevens alleen om de toepassing te exploiteren en functies te bieden. We verkopen geen persoonlijke gegevens." },
          { id: "first-launch", q: "Waarom zie ik de Servicevoorwaarden wanneer ik de app voor het eerst open?", a: "Bij uw eerste gebruik vereist PipeKeeper dat u de Servicevoorwaarden en het Privacybeleid accepteert voordat u de app kunt openen. Dit is een eenmalige vereiste. Na acceptatie gaat u rechtstreeks naar uw startpagina bij toekomstige bezoeken. U kunt deze documenten op elk moment bekijken via het menu Help of de voettekstkoppelingen." }
        ]},
        gettingStarted: { title: "Aan de slag", items: [
          { id: "tutorial", q: "Is er een zelfstudie of walkthrough?", a: "Ja! Wanneer u voor het eerst uw account maakt, biedt PipeKeeper een geleide onboarding-flow die u door de profielconfiguratie, het toevoegen van uw eerste pijp en tabak en de toegang tot AI-functies begeleidt. U kunt de zelfstudie op elk moment opnieuw starten vanaf de startpagina.", cta: "Zelfstudie herstarten" },
          { id: "what-cellaring", q: "Wat is veroudering in de kelder?", a: "Veroudering in de kelder verwijst naar het opslaan van verzegelde blikken of tabak in bulk voor veroudering. PipeKeeper bevat een gedetailleerd keldervolgingssysteem dat bijhoudt wanneer tabak aan of uit uw kelder wordt toegevoegd, hoeveelheden in grammen, containertypen en opmerkingen. Deze functie is beschikbaar voor Premium-abonnees." },
          { id: "smoking-log", q: "Wat is het rooklogboek?", a: "Het rooklogboek houdt bij welke pijpen u met welk tabak hebt gerookt. Het helpt u te onthouden wat goed bij elkaar past en draagt bij aan AI-aanbevelingen voor koppeling. Premium-abonnees profiteren van automatische inventarisverlaging op basis van geregistreerde sessies." }
        ]},
        fieldDefinitions: { title: "Velddefinities", items: [
          { id: "pipe-shape", q: "Wat is pijpvorm?", a: "De vormclassificatie beschrijft de algemene vorm van de pijp (Billiard, Dublin, gebogen, enz.). PipeKeeper bevat meer dan 30 veelgebruikte vormen. Vorm beïnvloedt rookeigenschappen zoals greepcomfort en rookskoeling." },
          { id: "chamber-volume", q: "Wat is kamervolume?", a: "Het kamervolume (Klein/Gemiddeld/Groot/Extra Groot) geeft de schaalcapaciteit en rookduur aan. Kleine kamers zijn geschikt voor 15-30 minuten roken, terwijl Extra Groot 90+ minuten kan bieden." },
          { id: "stem-material", q: "Wat zijn de opties voor steelmaterialen?", a: "Veelgebruikte steelmaterialen zijn Vulkaniet (traditioneel, zachte beet), Acryl/Lucite (duurzaam, harder), Cumberland (gemarmerd uiterlijk) en speciale materialen zoals Barnsteen of Hoorn." },
          { id: "bowl-material", q: "Wat zijn schaalmaterielen?", a: "De meeste pijpen zijn van Briar (hittebestendig hout), maar andere materialen zijn Schuimkruid (mineraal, verkleurt bij gebruik), Maïskolf (voordelig, wegwerpbaar), Morta (veenmoeras) en ander hout." },
          { id: "finish-types", q: "Wat zijn afwerkingstypes?", a: "Afwerking verwijst naar oppervlaktebehandeling van de schaal: Glad (gepolijst, toont nerf), zandgestraald (getextureerd, verbergt vullingen), gerustificeerd (gesneden textuur) of natuurlijk (onafgewerkt). Afwerking is vooral esthetisch maar kan grip beïnvloeden." },
          { id: "blend-type", q: "Wat zijn tabaksblendtypes?", a: "Blendtypen categoriseren tabak per primaire bladsamenstelling: Virginia (zoet, kruidig), English (met Latakia, gerookt), Aromatisch (extra smaak), Burley (nootachtig), VaPer (Virginia/Perique), enz." },
          { id: "tobacco-cut", q: "Wat zijn tabakssnijdingstypes?", a: "Snit beschrijft hoe tabak wordt bereid: Lint (dunne stroken, gemakkelijk in te pakken), Vlok (geperste vellen, vereist wrijving), Plug (vast blok), Munt (gesneden plug), Shag (zeer fijn), enz." },
          { id: "tobacco-strength", q: "Wat is tabakssterkte?", a: "Sterkte verwijst naar nicotinegehalte variërend van Mild tot Sterk. Beginners beginnen meestal met Mild-Gemiddelde mengsels. Volledig sterke mengsels kunnen nicotineziekten veroorzaken als u er niet aan gewend bent." }
        ]},
        tobaccoValuation: { title: "Tabakswaardering", items: [
          { id: "valuation-calc", q: "Hoe wordt tabakswaarde berekend?", a: "Tabakswaarde kan op twee manieren worden bijgehouden: (1) Handmatige marktwaarde - u voert de huidige marktprijs in (Premium), of (2) AI-ondersteunde waardering - AI analyseert openbare aanbiedingen om waarde, bereik en vertrouwen in te schatten (Pro)." },
          { id: "manual-vs-ai", q: "Wat is het verschil tussen handmatige en AI-waardering?", a: "Handmatige waardering stelt u in staat uw eigen onderzoek bij te houden (Premium). AI-waardering gebruikt machine learning om marktgegevens te analyseren en schattingen, bereiken, vertrouwensniveaus en projecties te bieden (Pro)." },
          { id: "estimated-label", q: "Waarom is waarde gelabeld als 'geschat'?", a: "Door AI gegenereerde waarden zijn voorspellingen op basis van beschikbare marktgegevens. Werkelijke prijzen variëren naar gelang van aantasting, leeftijd, verkoper en marktvoraag. Schattingen zijn educatieve hulpmiddelen, geen beleggingsadvies." },
          { id: "confidence-meaning", q: "Wat betekent vertrouwen?", a: "Vertrouwen geeft aan hoeveel marktgegevens de schatting ondersteunen. Hoog = sterke gegevens. Gemiddeld = matige gegevens. Laag = beperkte gegevens. Laag vertrouwen betekent dat de schatting minder betrouwbaar is." },
          { id: "locked-valuation", q: "Waarom zijn bepaalde waarderingsfuncties vergrendeld?", a: "AI-ondersteunde waardering en predictieve projecties vereisen Pro. Premium-gebruikers kunnen handmatige marktwaarden en kostenbasis bijhouden. Gratis gebruikers kunnen alleen inventaris en veroudering bijhouden." }
        ]},
        featuresAndTools: { title: "Functies en gereedschappen", items: [
          { id: "interchangeable-bowls", q: "Wat zijn verwisselbare schalen?", intro: "Sommige pijpsystemen (Falcon, Gabotherm, Yello-Bole, Viking, enz.) stellen u in staat verschillende schalen op dezelfde stam-/kamersamenstelling uit te wisselen. PipeKeeper behandelt elke schaal als een aparte 'pijpvariant' met zijn eigen:", points: ["Focuslabels (één schaal aan Virginia's toewijzen, een ander aan Aromatische stoffen, enz.)", "Kamerafmetingen en kenmerken", "Tabaksaanbevelingen voor koppeling", "Rodeoschema's en rooklogboeken"], conclusion: "Dit biedt optimale specialisatie: gebruik dezelfde stam met meerdere schalen voor verschillende tabaktypen zonder spook." },
          { id: "pipe-focus", q: "Wat zijn pijpfocuslabels?", intro: "Focuslabels stellen u in staat pijpen voor specifieke tabaktypen te specialiseren. Veelgebruikte labels zijn:", points: ["Aromatisch: Wijdt de pijp alleen in aan aromatische mengsels (Sterk/Gemiddeld/Licht intensiteit ondersteund)", "Niet-aromatisch: Sluit aromatische mengsels uit", "Virginia, VaPer, English, Balkan, Latakia: Automatisch als niet-aromatische families behandeld", "Hulpprogramma/Veelzijdig: Maakt gemengd gebruik zonder beperkingen mogelijk"], conclusion: "Het koppelingssysteem respecteert deze labels: pijpen met alleen aroma zullen niet-aromatische mengsels niet aanbevelen en vice versa." },
          { id: "pairing-matrix", q: "Wat is de koppelingen-matrix?", a: "De koppelingmatrix genereert compatibiliteitsscores (0-10) tussen elke pijp en tabaksblending in uw verzameling. Rekening houdend met pijpkenmerken (vorm, kamervolume, schaalmaterialen), blendprofielen (type, sterkte, aromatische intensiteit), pijpfocuslabels (Virginia, English, Aromatisch, enz.) en uw persoonlijke voorkeuren." },
          { id: "pipe-identification", q: "Hoe werkt pijpidentificatie?", a: "Upload foto's van uw pijp en de AI analyseert markeringen, vorm en andere visuele kenmerken om de fabrikant, model en geschatte waarde te identificeren. U kunt ook handmatig zoeken in een database van bekende pijpfabrikanten." },
          { id: "geometry-analysis", q: "Wat is pijpgeometrieanalyse?", a: "Dit AI-gereedschap analyzeert uw pijpfoto's en opgeslagen afmetingen om geometriekenmerken te classificeren: vorm (Billiard, Dublin, enz.), schaalstyness (cilindrisch, conisch, enz.), steelVorm (rond, diamant, enz.), bocht (recht, 1/4 gebogen, enz.) en maat klasse (klein, standaard, groot, enz.)." },
          { id: "verified-measurements", q: "Kan ik geverificeerde fabrikantspecificaties vinden?", a: "Ja, als secundaire optie. Ga naar AI-updates → 'Geverificeerde fabrikantspecificaties zoeken'. Hiermee worden fabrikantcatalogussen en databases doorzocht, maar dit werkt alleen voor bepaalde productiepijpen. Veel ambachtelijke en antieke pijpen hebben geen geverificeerde specificaties beschikbaar." },
          { id: "value-lookup", q: "Kan PipeKeeper pijpwaarden schatten?", a: "Ja. De AI kan geschatte marktwaarden geven op basis van fabrikant, toestand en huidige markttrends. Dit zijn alleen schattingen en mogen niet voor verzekerings- of verkoopdoeleinden worden gebruikt." },
          { id: "export-tools", q: "Kan ik mijn verzamelingsgegevens exporteren?", a: "Ja. Exportgereedschappen stellen u in staat uw pijpen- en tabaksinventaris als CSV-bestanden te downloaden voor back-up of gebruik in andere toepassingen. Zoek naar exportknoppen op de pagina's Pijpen en Tabak." }
        ]},
        accountsAndData: { title: "Accounts en gegevens", items: [
          { id: "need-account", q: "Heb ik een account nodig?", a: "Ja. Het maken van een account stelt u in staat uw verzameling en instellingen op alle apparaten op te slaan en te synchroniseren." },
          { id: "export-data", q: "Kan ik mijn gegevens exporteren?", a: "Ja. Exportgereedschappen stellen u in staat CSV/PDF-rapporten van uw pijpen, tabaksinventaris en rooklogboeken te genereren. Zoek naar exportknoppen op de pagina's Pijpen en Tabak." },
          { id: "bulk-import", q: "Kan ik gegevens in bulk importeren?", a: "Ja. Ga naar de pagina Importeren op het startscherm. U kunt CSV-gegevens plakken of een bestand uploaden om snel meerdere pijpen of tabaksblendsels tegelijk toe te voegen." }
        ]},
        ai: { title: "AI-functies en nauwkeurigheid", items: [
          { id: "ai-accuracy", q: "Zijn AI-aanbevelingen gegarandeerd juist?", a: "Nee. AI-functies bieden aanbevelingen naar beste vermogen en kunnen onvolledig of onnauwkeurig zijn. U kunt uw eigen oordeel gebruiken en belangrijke informatie uit betrouwbare bronnen verifiëren." },
          { id: "medical-advice", q: "Biedt PipeKeeper medisch of professioneel advies?", a: "Nee. PipeKeeper biedt informatietools alleen voor hobby- en verzamelingsbeheer." }
        ]},
        support: { title: "Ondersteuning", contactQ: "Hoe neem ik contact op met ondersteuning?", contactIntro: "Gebruik de ondersteuningslink in de app of bezoek", contactLinks: "U kunt ook onze beleidsregels hier bekijken:" }
      }
    },
    howTo: {
      pageTitle: "Handleidingen",
      pageSubtitle: "Snelle antwoorden met duidelijke navigatiepaden",
      navFAQ: "Veelgestelde vragen",
      navTroubleshooting: "Probleemoplossing",
      footerTitle: "Nog hulp nodig?",
      footerDesc: "Bezoek onze volledige veelgestelde vragen of neem contact op met ondersteuning voor verdere hulp.",
      footerFAQ: "Volledige veelgestelde vragen weergeven",
      footerSupport: "Ondersteuning opnemen",
      sections: {
        gettingStarted: { title: "Aan de slag", items: [
          { id: "add-pipe", q: "Hoe voeg ik een pijp toe?", path: "Start → Pijpen → Pijp toevoegen", a: "Voeg uw pijpen handmatig toe of gebruik AI-identificatie via foto's. Voeg details als fabrikant, vorm, afmetingen en toestand toe om inzichten en aanbevelingen te ontgrendelen." },
          { id: "add-tobacco", q: "Hoe voeg ik een tabaksblending toe?", path: "Start → Tabak → Tabak toevoegen", a: "Houd uw tabaksblending bij met details zoals fabrikant, blendingstype, hoeveelheid en opslagdatums. Gebruik het kelderlogboek om de verouderingsvorderingen vast te leggen." },
          { id: "add-note", q: "Hoe voeg ik aantekeningen toe aan een item?", path: "Pijpen/Tabak → Item selecteren → Bewerken → Aantekeningen toevoegen", a: "Klik op een pijp of tabak om de detailpagina te openen. Tik op 'Bewerken' en voeg aantekeningen in het aangewezen veld in. Aantekeningen helpen u persoonlijke voorkeur en waarnemingen te onthouden." },
          { id: "view-insights", q: "Hoe bekijk ik inzichten?", path: "Start → Verzamelingsinzichten", a: "Inzichten verschijnen op uw startpagina nadat u items hebt toegevoegd. Bekijk statistieken, koppelingsrasters, verouderingsdashboards en rapporten. Klik op tabbladen om verschillende inzichten te verkennen." }
        ]},
        managingCollection: { title: "Beheer uw verzameling", items: [
          { id: "organize", q: "Hoe organiseer ik mijn verzameling?", path: "Pijpen/Tabak → Filters en Sortering", a: "Gebruik filters om in te perken op vorm, blendingstype of focus. Sorteer op toegevoegde datum, waarde of beoordeling. Sla favoriete filters op voor snelle toegang." },
          { id: "export", q: "Hoe exporteer ik mijn gegevens?", path: "Start → Inzichten → Tabblad Rapporten", badge: "Premium", a: "Premium- en Pro-gebruikers kunnen verzamelingsgegevens als CSV of PDF exporteren. Zoek exportknoppen op het tabblad Rapporten onder Verzamelingsinzichten." },
          { id: "cellar-log", q: "Hoe volg ik mijn kelder?", path: "Tabak → Blending selecteren → Kelderlogboek", badge: "Premium", a: "Registreer wanneer tabak aan of uit uw kelder wordt toegevoegd. Houd hoeveelheden, datums en containertypen bij. Bekijk de verouderingsvorderingen op het Verouderingsdashboard." },
          { id: "smoking-log", q: "Hoe registreer ik een rooksessie?", path: "Start → Inzichten → Tabblad Register", badge: "Premium", a: "Volg welke pijp u met welk tabak hebt gerookt. Registreer datum, aantal schalen en aantekeningen. Deze gegevens ondersteunen aanbevelingen voor koppeling." }
        ]},
        aiTools: { title: "AI-gereedschappen", items: [
          { id: "identify-pipe", q: "Hoe identificeer ik een pijp via een foto?", path: "Start → Tabakexpert → Identificatie", badge: "Pro", a: "Upload foto's van uw pijp en de AI analyzeert markeringen, vorm en kenmerken om fabrikant, model en geschatte waarde te identificeren." },
          { id: "pairing-suggestions", q: "Hoe krijg ik koppelingssuggesties?", path: "Start → Inzichten → Koppelinggrid", badge: "Pro", a: "De koppelingmatrix genereert compatibiliteitsscores voor elke pijp-tabakcombinatie. Bekijk aanbevelingen op pijpdetailpagina's of in het Koppelinggrid." },
          { id: "optimize-collection", q: "Hoe optimaliseer ik mijn verzameling?", path: "Start → Tabakexpert → Optimalisering", badge: "Pro", a: "De Verzamelingsoptimizer analyzeert uw pijpen en tabak om specialisaties aan te bevelen, hiaten te identificeren en uw volgende aankoop voor te stellen." }
        ]},
        subscriptions: { title: "Abonnementen", items: [
          { id: "subscribe", q: "Hoe werken abonnementen?", path: "Profiel → Abonnement", a: "PipeKeeper biedt gratis, Premium en Pro-niveaus. Abonneer u om onbeperkte items, geavanceerde tools en AI-functies te ontgrendelen. Bekijk prijzen en beheer abonnementen in uw Profiel." },
          { id: "manage-subscription", q: "Hoe beheer ik mijn abonnement?", path: "Profiel → Abonnement beheren", iosPart: "iOS: Beheer via iOS-instellingen → [Uw naam] → Abonnementen → PipeKeeper", webPart: "Web/Android: Ga naar Profiel → Abonnement beheren om betaling bij te werken, facturen te bekijken of te annuleren" },
          { id: "cancel", q: "Hoe annuleer ik mijn abonnement?", path: "Profiel → Abonnement beheren", iosPart: "iOS: Open iOS-instellingen → [Uw naam] → Abonnementen → PipeKeeper → Abonnement annuleren", webPart: "Web/Android: Ga naar Profiel → Abonnement beheren → Abonnement annuleren", note: "U behoud toegang tot het einde van uw factureringsperiode." }
        ]},
        troubleshooting: { title: "Probleemoplossing", items: [
          { id: "cant-login", q: "Ik kan niet inloggen of mijn code is verlopen", path: "Aanmeldingsscherm → Nieuwe code aanvragen", a: "Probeer opnieuw in te loggen: het systeem stuurt automatisch een nieuwe verificatiecode. Controleer uw spam-map of bezoek de verificatiehulppagina voor gedetailleerde instructies." },
          { id: "missing-features", q: "Waarom kan ik bepaalde functies niet zien?", path: "Profiel → Abonnement", a: "Bepaalde functies vereisen Premium- of Pro-toegang. Controleer uw abonnementsstatus in Profiel. Gratis gebruikers hebben toegang tot kernverzameling voor maximaal 5 pijpen en 10 tabaksblending." },
          { id: "sync-issues", q: "Mijn gegevens worden niet gesynchroniseerd", path: "Profiel → Vernieuwen / Afmelden en aanmelden", a: "Probeer uw browser te vernieuwen of u af te melden en opnieuw aan te melden. Uw verzameling wordt automatisch gesynchroniseerd met de cloud wanneer u wijzigingen maakt." }
        ]
      }
    },
    troubleshooting: {
      pageTitle: "Probleemoplossing",
      pageSubtitle: "Veelgestelde problemen en oplossingen",
      navFAQ: "Veelgestelde vragen",
      navHowTo: "Handleidingen",
      sections: {
        tobaccoValuation: {
          title: "Tabakswaardering",
          items: [
            { id: "missing-value", q: "Waarom ontbreekt de waarde van mijn tabak?", intro: "Waarde vereist handmatige invoer (Premium) of AI-schatting (Pro).", points: ["Gratis gebruikers zien alleen inventaris", "Zorg ervoor dat u het juiste abonnementsniveau heeft", "Voer waardering uit na upgrade"] },
            { id: "low-confidence", q: "Waarom toont mijn schatting laag vertrouwen?", intro: "Laag vertrouwen betekent dat beperkte marktgegevens voor deze blending zijn gevonden.", points: ["Het kan zeldzaam, stopgezet of regionaal exclusief zijn", "Schattingen met laag vertrouwen moeten als geschatte benaderingen worden behandeld", "Overweeg handmatige waardering voor zeldzame blending"] },
            { id: "locked-ai", q: "Waarom is AI-waardering vergrendeld?", intro: "AI-ondersteunde waardering vereist Pro.", points: ["Als u een Premium-abonnee bent die voor 1 februari 2026 is bijgetreden, hebt u legacy-toegang", "Voer anders een upgrade naar Pro uit om AI-functies te ontgrendelen"] },
            { id: "no-auto-update", q: "Waarom wordt waarde niet automatisch bijgewerkt?", intro: "AI-waarderingen worden on-demand gegenereerd om tegoed en prestaties te behouden.", points: ["Klik op 'AI-waardering uitvoeren' om schattingen bij te werken", "Automatische geplande vernieuwing kan in toekomstige Pro-updates worden toegevoegd"] }
          ]
        }
      }
    }
  },
};

export { helpContentTranslations };