import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SUPPORTED_LANGUAGES = new Set([
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt-BR',
  'nl',
  'pl',
  'ja',
  'zh-Hans',
]);

function normalizeLanguage(input?: string | null) {
  const raw = String(input || '').trim().toLowerCase().replace('_', '-');
  if (!raw) return 'en';
  if (raw === 'pt' || raw === 'pt-br') return 'pt-BR';
  if (raw === 'zh' || raw === 'zh-cn' || raw === 'zh-hans') return 'zh-Hans';
  if (raw.startsWith('en')) return 'en';
  if (raw.startsWith('es')) return 'es';
  if (raw.startsWith('fr')) return 'fr';
  if (raw.startsWith('de')) return 'de';
  if (raw.startsWith('it')) return 'it';
  if (raw.startsWith('nl')) return 'nl';
  if (raw.startsWith('pl')) return 'pl';
  if (raw.startsWith('ja')) return 'ja';
  return 'en';
}

function resolveLanguage(language?: string | null) {
  const normalized = normalizeLanguage(language);
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : 'en';
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function interpolate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(vars[key] ?? ''));
}

const STORY_TEXT = {
  en: {
    empty: 'Your collection is just getting started. Add your first pipe, blend, bottle, cigar, or wine to see your story take shape.',
    introAll: 'Your collection spans {{pipes}} pipes, {{blends}} blends, {{bottleTypes}} whiskey labels, {{wineBottleTypes}} wines in the cellar, and {{cigarTypes}} cigar types.',
    introPipeWhiskeyCigar: 'Your collection balances {{pipes}} pipes, {{blends}} blends, {{bottleTypes}} whiskey labels, and {{cigarTypes}} cigar types.',
    introPipeWhiskey: 'Your collection pairs {{pipes}} pipes and {{blends}} blends with {{bottleTypes}} carefully chosen whiskey labels.',
    introPipeCigar: 'Your collection brings together {{pipes}} pipes, {{blends}} blends, and {{cigarTypes}} cigar types.',
    introPipe: 'Your collection centers on {{pipes}} pipes and {{blends}} blends with a clear personal rhythm.',
    introWhiskeyCigar: 'Your collection brings together {{bottleTypes}} whiskey labels and {{cigarTypes}} cigar types.',
    introWhiskey: 'Your collection features {{bottleTypes}} distinct whiskey labels.',
    introCigar: 'Your collection features {{cigarTypes}} cigar types.',
    introWine: 'Your cellar currently holds {{wineBottleTypes}} wines.',
    introPipeOnly: 'Your collection is focused on {{pipes}} pipes.',
    blendPreference: 'Your tobacco rotation leans toward {{type}} blends.',
    whiskeyPreference: 'Your whiskey shelf leans toward {{type}}.',
    mostUsedPipe: '{{name}} is the pipe you reach for most often.',
    mostTastedBottle: '{{name}} is the bottle you revisit most often.',
    mostSmokedCigar: '{{name}} is the cigar you return to most often.',
    cigarProfile: 'Your cigar profile trends toward {{profile}}.',
    topRatedCigar: '{{name}} is your top-rated cigar{{rating}}.',
    highestValueCigar: '{{name}} currently leads your humidor value at {{value}}.',
    restockCigarCount: '{{count}} cigar entries are flagged for restock.',
    topWineProducer: 'Your wine selection is led by {{producer}}{{varietal}}{{region}}.',
    readyToDrinkWineCount: 'You currently have {{count}} wines in their ideal drinking window.',
    crownJewel: 'The crown jewel of your collection is {{name}}, valued at {{value}}.',
    underusedCount: '{{count}} pipes are still waiting for more time in the rotation.',
    regionPrefix: ' from {{region}}',
    varietalPrefix: ', with {{varietal}} as a standout varietal',
  },
  es: {
    empty: 'Tu colección apenas está comenzando. Añade tu primera pipa, mezcla, botella, cigarro o vino para ver cómo toma forma tu historia.',
    introAll: 'Tu colección reúne {{pipes}} pipas, {{blends}} mezclas, {{bottleTypes}} etiquetas de whiskey, {{wineBottleTypes}} vinos en la cava y {{cigarTypes}} tipos de cigarros.',
    introPipeWhiskeyCigar: 'Tu colección equilibra {{pipes}} pipas, {{blends}} mezclas, {{bottleTypes}} etiquetas de whiskey y {{cigarTypes}} tipos de cigarros.',
    introPipeWhiskey: 'Tu colección combina {{pipes}} pipas, {{blends}} mezclas y {{bottleTypes}} etiquetas de whiskey elegidas con cuidado.',
    introPipeCigar: 'Tu colección reúne {{pipes}} pipas, {{blends}} mezclas y {{cigarTypes}} tipos de cigarros.',
    introPipe: 'Tu colección gira alrededor de {{pipes}} pipas y {{blends}} mezclas con un gusto muy claro.',
    introWhiskeyCigar: 'Tu colección reúne {{bottleTypes}} etiquetas de whiskey y {{cigarTypes}} tipos de cigarros.',
    introWhiskey: 'Tu colección incluye {{bottleTypes}} etiquetas de whiskey distintas.',
    introCigar: 'Tu colección incluye {{cigarTypes}} tipos de cigarros.',
    introWine: 'Tu cava guarda actualmente {{wineBottleTypes}} vinos.',
    introPipeOnly: 'Tu colección está centrada en {{pipes}} pipas.',
    blendPreference: 'Tu rotación de tabaco se inclina por las mezclas {{type}}.',
    whiskeyPreference: 'Tu estante de whiskey se inclina por {{type}}.',
    mostUsedPipe: '{{name}} es la pipa a la que más vuelves.',
    mostTastedBottle: '{{name}} es la botella que más repites.',
    mostSmokedCigar: '{{name}} es el cigarro al que más vuelves.',
    cigarProfile: 'Tu perfil de cigarros se inclina hacia {{profile}}.',
    topRatedCigar: '{{name}} es tu cigarro mejor valorado{{rating}}.',
    highestValueCigar: '{{name}} encabeza actualmente el valor de tu humidor con {{value}}.',
    restockCigarCount: '{{count}} entradas de cigarros están marcadas para reposición.',
    topWineProducer: 'Tu selección de vinos está liderada por {{producer}}{{varietal}}{{region}}.',
    readyToDrinkWineCount: 'Ahora mismo tienes {{count}} vinos en su mejor ventana de consumo.',
    crownJewel: 'La joya de tu colección es {{name}}, valorada en {{value}}.',
    underusedCount: 'Todavía tienes {{count}} pipas esperando más tiempo en la rotación.',
    regionPrefix: ' de {{region}}',
    varietalPrefix: ', con {{varietal}} como varietal destacado',
  },
  fr: {
    empty: 'Votre collection ne fait que commencer. Ajoutez votre première pipe, mélange, bouteille, cigare ou vin pour voir votre histoire prendre forme.',
    introAll: 'Votre collection réunit {{pipes}} pipes, {{blends}} mélanges, {{bottleTypes}} références de whiskey, {{wineBottleTypes}} vins en cave et {{cigarTypes}} types de cigares.',
    introPipeWhiskeyCigar: 'Votre collection équilibre {{pipes}} pipes, {{blends}} mélanges, {{bottleTypes}} références de whiskey et {{cigarTypes}} types de cigares.',
    introPipeWhiskey: 'Votre collection associe {{pipes}} pipes, {{blends}} mélanges et {{bottleTypes}} références de whiskey choisies avec soin.',
    introPipeCigar: 'Votre collection rassemble {{pipes}} pipes, {{blends}} mélanges et {{cigarTypes}} types de cigares.',
    introPipe: 'Votre collection s’articule autour de {{pipes}} pipes et {{blends}} mélanges avec une vraie ligne directrice.',
    introWhiskeyCigar: 'Votre collection réunit {{bottleTypes}} références de whiskey et {{cigarTypes}} types de cigares.',
    introWhiskey: 'Votre collection compte {{bottleTypes}} références de whiskey distinctes.',
    introCigar: 'Votre collection compte {{cigarTypes}} types de cigares.',
    introWine: 'Votre cave abrite actuellement {{wineBottleTypes}} vins.',
    introPipeOnly: 'Votre collection reste centrée sur {{pipes}} pipes.',
    blendPreference: 'Votre rotation tabac penche vers les mélanges {{type}}.',
    whiskeyPreference: 'Votre sélection de whiskey penche vers {{type}}.',
    mostUsedPipe: '{{name}} est la pipe vers laquelle vous revenez le plus souvent.',
    mostTastedBottle: '{{name}} est la bouteille que vous revisitez le plus.',
    mostSmokedCigar: '{{name}} est le cigare auquel vous revenez le plus souvent.',
    cigarProfile: 'Votre profil cigare tend vers {{profile}}.',
    topRatedCigar: '{{name}} est votre cigare le mieux noté{{rating}}.',
    highestValueCigar: '{{name}} mène actuellement la valeur de votre humidor avec {{value}}.',
    restockCigarCount: '{{count}} entrées cigare sont marquées pour réassort.',
    topWineProducer: 'Votre sélection de vins est menée par {{producer}}{{varietal}}{{region}}.',
    readyToDrinkWineCount: 'Vous avez actuellement {{count}} vins dans leur meilleure fenêtre de dégustation.',
    crownJewel: 'Le joyau de votre collection est {{name}}, estimé à {{value}}.',
    underusedCount: '{{count}} pipes attendent encore davantage de temps en rotation.',
    regionPrefix: ' de {{region}}',
    varietalPrefix: ', avec {{varietal}} comme cépage marquant',
  },
  de: {
    empty: 'Deine Sammlung steht noch ganz am Anfang. Füge deine erste Pfeife, Mischung, Flasche, Zigarre oder deinen ersten Wein hinzu, damit deine Geschichte Form annimmt.',
    introAll: 'Deine Sammlung umfasst {{pipes}} Pfeifen, {{blends}} Mischungen, {{bottleTypes}} Whiskey-Abfüllungen, {{wineBottleTypes}} Weine im Keller und {{cigarTypes}} Zigarrentypen.',
    introPipeWhiskeyCigar: 'Deine Sammlung verbindet {{pipes}} Pfeifen, {{blends}} Mischungen, {{bottleTypes}} Whiskey-Abfüllungen und {{cigarTypes}} Zigarrentypen.',
    introPipeWhiskey: 'Deine Sammlung kombiniert {{pipes}} Pfeifen, {{blends}} Mischungen und {{bottleTypes}} sorgfältig ausgewählte Whiskey-Abfüllungen.',
    introPipeCigar: 'Deine Sammlung bringt {{pipes}} Pfeifen, {{blends}} Mischungen und {{cigarTypes}} Zigarrentypen zusammen.',
    introPipe: 'Deine Sammlung konzentriert sich auf {{pipes}} Pfeifen und {{blends}} Mischungen mit klarer Handschrift.',
    introWhiskeyCigar: 'Deine Sammlung vereint {{bottleTypes}} Whiskey-Abfüllungen und {{cigarTypes}} Zigarrentypen.',
    introWhiskey: 'Deine Sammlung umfasst {{bottleTypes}} unterschiedliche Whiskey-Abfüllungen.',
    introCigar: 'Deine Sammlung umfasst {{cigarTypes}} Zigarrentypen.',
    introWine: 'Dein Keller enthält aktuell {{wineBottleTypes}} Weine.',
    introPipeOnly: 'Deine Sammlung bleibt auf {{pipes}} Pfeifen fokussiert.',
    blendPreference: 'Deine Tabakrotation tendiert zu {{type}}-Mischungen.',
    whiskeyPreference: 'Dein Whiskey-Regal tendiert zu {{type}}.',
    mostUsedPipe: '{{name}} ist die Pfeife, zu der du am häufigsten greifst.',
    mostTastedBottle: '{{name}} ist die Flasche, die du am häufigsten erneut verkostest.',
    mostSmokedCigar: '{{name}} ist die Zigarre, zu der du am häufigsten zurückkehrst.',
    cigarProfile: 'Dein Zigarrenprofil tendiert zu {{profile}}.',
    topRatedCigar: '{{name}} ist deine bestbewertete Zigarre{{rating}}.',
    highestValueCigar: '{{name}} führt aktuell den Wert deines Humidors mit {{value}} an.',
    restockCigarCount: '{{count}} Zigarreneinträge sind zum Nachkauf markiert.',
    topWineProducer: 'Deine Weinauswahl wird von {{producer}}{{varietal}}{{region}} geprägt.',
    readyToDrinkWineCount: 'Aktuell hast du {{count}} Weine im idealen Trinkfenster.',
    crownJewel: 'Das Glanzstück deiner Sammlung ist {{name}} mit einem Wert von {{value}}.',
    underusedCount: '{{count}} Pfeifen warten noch auf mehr Zeit in der Rotation.',
    regionPrefix: ' aus {{region}}',
    varietalPrefix: ', mit {{varietal}} als prägender Rebsorte',
  },
  it: {
    empty: 'La tua collezione è solo all’inizio. Aggiungi la prima pipa, blend, bottiglia, sigaro o vino per vedere prendere forma la tua storia.',
    introAll: 'La tua collezione riunisce {{pipes}} pipe, {{blends}} blend, {{bottleTypes}} etichette di whiskey, {{wineBottleTypes}} vini in cantina e {{cigarTypes}} tipi di sigaro.',
    introPipeWhiskeyCigar: 'La tua collezione bilancia {{pipes}} pipe, {{blends}} blend, {{bottleTypes}} etichette di whiskey e {{cigarTypes}} tipi di sigaro.',
    introPipeWhiskey: 'La tua collezione abbina {{pipes}} pipe, {{blends}} blend e {{bottleTypes}} etichette di whiskey scelte con cura.',
    introPipeCigar: 'La tua collezione unisce {{pipes}} pipe, {{blends}} blend e {{cigarTypes}} tipi di sigaro.',
    introPipe: 'La tua collezione ruota attorno a {{pipes}} pipe e {{blends}} blend con un gusto molto preciso.',
    introWhiskeyCigar: 'La tua collezione riunisce {{bottleTypes}} etichette di whiskey e {{cigarTypes}} tipi di sigaro.',
    introWhiskey: 'La tua collezione include {{bottleTypes}} etichette di whiskey distinte.',
    introCigar: 'La tua collezione include {{cigarTypes}} tipi di sigaro.',
    introWine: 'La tua cantina oggi ospita {{wineBottleTypes}} vini.',
    introPipeOnly: 'La tua collezione resta concentrata su {{pipes}} pipe.',
    blendPreference: 'La tua rotazione di tabacchi tende verso i blend {{type}}.',
    whiskeyPreference: 'La tua selezione di whiskey tende verso {{type}}.',
    mostUsedPipe: '{{name}} è la pipa che usi più spesso.',
    mostTastedBottle: '{{name}} è la bottiglia che torni a degustare più spesso.',
    mostSmokedCigar: '{{name}} è il sigaro a cui torni più spesso.',
    cigarProfile: 'Il tuo profilo sigari tende verso {{profile}}.',
    topRatedCigar: '{{name}} è il tuo sigaro più apprezzato{{rating}}.',
    highestValueCigar: '{{name}} guida oggi il valore del tuo humidor con {{value}}.',
    restockCigarCount: '{{count}} voci sigaro sono segnate per il riassortimento.',
    topWineProducer: 'La tua selezione di vini è guidata da {{producer}}{{varietal}}{{region}}.',
    readyToDrinkWineCount: 'Hai attualmente {{count}} vini nella finestra ideale di bevuta.',
    crownJewel: 'Il gioiello della tua collezione è {{name}}, valutato {{value}}.',
    underusedCount: '{{count}} pipe stanno ancora aspettando più tempo nella rotazione.',
    regionPrefix: ' da {{region}}',
    varietalPrefix: ', con {{varietal}} come vitigno di spicco',
  },
  'pt-BR': {
    empty: 'Sua coleção está só começando. Adicione seu primeiro pipe, blend, garrafa, charuto ou vinho para ver sua história ganhar forma.',
    introAll: 'Sua coleção reúne {{pipes}} pipes, {{blends}} blends, {{bottleTypes}} rótulos de whiskey, {{wineBottleTypes}} vinhos na adega e {{cigarTypes}} tipos de charuto.',
    introPipeWhiskeyCigar: 'Sua coleção equilibra {{pipes}} pipes, {{blends}} blends, {{bottleTypes}} rótulos de whiskey e {{cigarTypes}} tipos de charuto.',
    introPipeWhiskey: 'Sua coleção combina {{pipes}} pipes, {{blends}} blends e {{bottleTypes}} rótulos de whiskey escolhidos com cuidado.',
    introPipeCigar: 'Sua coleção junta {{pipes}} pipes, {{blends}} blends e {{cigarTypes}} tipos de charuto.',
    introPipe: 'Sua coleção gira em torno de {{pipes}} pipes e {{blends}} blends com identidade própria.',
    introWhiskeyCigar: 'Sua coleção reúne {{bottleTypes}} rótulos de whiskey e {{cigarTypes}} tipos de charuto.',
    introWhiskey: 'Sua coleção inclui {{bottleTypes}} rótulos de whiskey distintos.',
    introCigar: 'Sua coleção inclui {{cigarTypes}} tipos de charuto.',
    introWine: 'Sua adega hoje guarda {{wineBottleTypes}} vinhos.',
    introPipeOnly: 'Sua coleção segue focada em {{pipes}} pipes.',
    blendPreference: 'Sua rotação de tabacos pende para blends {{type}}.',
    whiskeyPreference: 'Sua prateleira de whiskey pende para {{type}}.',
    mostUsedPipe: '{{name}} é o pipe que você mais usa.',
    mostTastedBottle: '{{name}} é a garrafa à qual você mais volta.',
    mostSmokedCigar: '{{name}} é o charuto ao qual você mais volta.',
    cigarProfile: 'Seu perfil de charutos tende para {{profile}}.',
    topRatedCigar: '{{name}} é o seu charuto mais bem avaliado{{rating}}.',
    highestValueCigar: '{{name}} lidera hoje o valor do seu humidor com {{value}}.',
    restockCigarCount: '{{count}} itens de charuto estão marcados para reposição.',
    topWineProducer: 'Sua seleção de vinhos é liderada por {{producer}}{{varietal}}{{region}}.',
    readyToDrinkWineCount: 'Você tem {{count}} vinhos na janela ideal de consumo.',
    crownJewel: 'A joia da sua coleção é {{name}}, avaliada em {{value}}.',
    underusedCount: '{{count}} pipes ainda esperam mais tempo na rotação.',
    regionPrefix: ' de {{region}}',
    varietalPrefix: ', com {{varietal}} como varietal de destaque',
  },
  nl: {
    empty: 'Je collectie staat nog aan het begin. Voeg je eerste pijp, blend, fles, sigaar of wijn toe om je verhaal vorm te geven.',
    introAll: 'Je collectie omvat {{pipes}} pijpen, {{blends}} blends, {{bottleTypes}} whiskeylabels, {{wineBottleTypes}} wijnen in de kelder en {{cigarTypes}} sigaarsoorten.',
    introPipeWhiskeyCigar: 'Je collectie brengt {{pipes}} pijpen, {{blends}} blends, {{bottleTypes}} whiskeylabels en {{cigarTypes}} sigaarsoorten samen.',
    introPipeWhiskey: 'Je collectie combineert {{pipes}} pijpen, {{blends}} blends en {{bottleTypes}} zorgvuldig gekozen whiskeylabels.',
    introPipeCigar: 'Je collectie verbindt {{pipes}} pijpen, {{blends}} blends en {{cigarTypes}} sigaarsoorten.',
    introPipe: 'Je collectie draait om {{pipes}} pijpen en {{blends}} blends met een duidelijke eigen smaak.',
    introWhiskeyCigar: 'Je collectie bestaat uit {{bottleTypes}} whiskeylabels en {{cigarTypes}} sigaarsoorten.',
    introWhiskey: 'Je collectie bevat {{bottleTypes}} verschillende whiskeylabels.',
    introCigar: 'Je collectie bevat {{cigarTypes}} sigaarsoorten.',
    introWine: 'Je kelder bevat op dit moment {{wineBottleTypes}} wijnen.',
    introPipeOnly: 'Je collectie blijft gericht op {{pipes}} pijpen.',
    blendPreference: 'Je tabaksrotatie neigt naar {{type}}-blends.',
    whiskeyPreference: 'Je whiskeyschap neigt naar {{type}}.',
    mostUsedPipe: '{{name}} is de pijp waar je het vaakst naar grijpt.',
    mostTastedBottle: '{{name}} is de fles die je het vaakst opnieuw proeft.',
    mostSmokedCigar: '{{name}} is de sigaar waar je het vaakst naar teruggrijpt.',
    cigarProfile: 'Je sigaarprofiel neigt naar {{profile}}.',
    topRatedCigar: '{{name}} is je hoogst gewaardeerde sigaar{{rating}}.',
    highestValueCigar: '{{name}} voert momenteel de waarde van je humidor aan met {{value}}.',
    restockCigarCount: '{{count}} sigaaritems zijn gemarkeerd voor aanvulling.',
    topWineProducer: 'Je wijnselectie wordt aangevoerd door {{producer}}{{varietal}}{{region}}.',
    readyToDrinkWineCount: 'Je hebt momenteel {{count}} wijnen in hun ideale drinkvenster.',
    crownJewel: 'Het pronkstuk van je collectie is {{name}}, gewaardeerd op {{value}}.',
    underusedCount: '{{count}} pijpen wachten nog op meer tijd in de rotatie.',
    regionPrefix: ' uit {{region}}',
    varietalPrefix: ', met {{varietal}} als opvallende druif',
  },
  pl: {
    empty: 'Twoja kolekcja dopiero się rozkręca. Dodaj pierwszą fajkę, mieszankę, butelkę, cygaro albo wino, a historia zacznie nabierać kształtu.',
    introAll: 'Twoja kolekcja obejmuje {{pipes}} fajek, {{blends}} mieszanek, {{bottleTypes}} etykiet whiskey, {{wineBottleTypes}} win w piwniczce i {{cigarTypes}} typów cygar.',
    introPipeWhiskeyCigar: 'Twoja kolekcja łączy {{pipes}} fajek, {{blends}} mieszanek, {{bottleTypes}} etykiet whiskey i {{cigarTypes}} typów cygar.',
    introPipeWhiskey: 'Twoja kolekcja łączy {{pipes}} fajek, {{blends}} mieszanek i {{bottleTypes}} starannie dobranych etykiet whiskey.',
    introPipeCigar: 'Twoja kolekcja zestawia {{pipes}} fajek, {{blends}} mieszanek i {{cigarTypes}} typów cygar.',
    introPipe: 'Twoja kolekcja opiera się na {{pipes}} fajkach i {{blends}} mieszankach z wyraźnym własnym stylem.',
    introWhiskeyCigar: 'Twoja kolekcja obejmuje {{bottleTypes}} etykiet whiskey i {{cigarTypes}} typów cygar.',
    introWhiskey: 'Twoja kolekcja obejmuje {{bottleTypes}} różnych etykiet whiskey.',
    introCigar: 'Twoja kolekcja obejmuje {{cigarTypes}} typów cygar.',
    introWine: 'Twoja piwniczka mieści obecnie {{wineBottleTypes}} win.',
    introPipeOnly: 'Twoja kolekcja pozostaje skupiona na {{pipes}} fajkach.',
    blendPreference: 'Twoja rotacja tytoni skłania się ku mieszankom {{type}}.',
    whiskeyPreference: 'Twoja półka z whiskey skłania się ku {{type}}.',
    mostUsedPipe: '{{name}} to fajka, po którą sięgasz najczęściej.',
    mostTastedBottle: '{{name}} to butelka, do której najczęściej wracasz.',
    mostSmokedCigar: '{{name}} to cygaro, do którego wracasz najczęściej.',
    cigarProfile: 'Twój profil cygar skłania się ku {{profile}}.',
    topRatedCigar: '{{name}} to najwyżej oceniane cygaro{{rating}}.',
    highestValueCigar: '{{name}} prowadzi dziś w wartości humidoru z kwotą {{value}}.',
    restockCigarCount: '{{count}} pozycji cygar wymaga uzupełnienia.',
    topWineProducer: 'Twoją selekcję win prowadzi {{producer}}{{varietal}}{{region}}.',
    readyToDrinkWineCount: 'Masz obecnie {{count}} win w idealnym oknie picia.',
    crownJewel: 'Klejnotem Twojej kolekcji jest {{name}}, wyceniony na {{value}}.',
    underusedCount: '{{count}} fajek wciąż czeka na więcej czasu w rotacji.',
    regionPrefix: ' z {{region}}',
    varietalPrefix: ', z {{varietal}} jako wyróżniającym się szczepem',
  },
  ja: {
    empty: 'コレクションはまだ始まったばかりです。最初のパイプ、ブレンド、ボトル、シガー、またはワインを追加すると、あなたのストーリーが見えてきます。',
    introAll: 'あなたのコレクションには、パイプ {{pipes}} 本、ブレンド {{blends}} 種、ウイスキー {{bottleTypes}} 種、セラーのワイン {{wineBottleTypes}} 本、シガー {{cigarTypes}} 種があります。',
    introPipeWhiskeyCigar: 'あなたのコレクションは、パイプ {{pipes}} 本、ブレンド {{blends}} 種、ウイスキー {{bottleTypes}} 種、シガー {{cigarTypes}} 種をバランスよく揃えています。',
    introPipeWhiskey: 'あなたのコレクションは、パイプ {{pipes}} 本、ブレンド {{blends}} 種、そして丁寧に選んだウイスキー {{bottleTypes}} 種で構成されています。',
    introPipeCigar: 'あなたのコレクションは、パイプ {{pipes}} 本、ブレンド {{blends}} 種、シガー {{cigarTypes}} 種を自然につなげています。',
    introPipe: 'あなたのコレクションは、パイプ {{pipes}} 本とブレンド {{blends}} 種を軸に、しっかりした個性が出ています。',
    introWhiskeyCigar: 'あなたのコレクションには、ウイスキー {{bottleTypes}} 種とシガー {{cigarTypes}} 種があります。',
    introWhiskey: 'あなたのコレクションには、異なるウイスキーが {{bottleTypes}} 種あります。',
    introCigar: 'あなたのコレクションには、シガーが {{cigarTypes}} 種あります。',
    introWine: '今のセラーには、ワインが {{wineBottleTypes}} 本あります。',
    introPipeOnly: 'あなたのコレクションは、{{pipes}} 本のパイプを中心に育っています。',
    blendPreference: 'タバコのローテーションは {{type}} 系のブレンドに寄っています。',
    whiskeyPreference: 'ウイスキー棚は {{type}} に寄った傾向があります。',
    mostUsedPipe: '{{name}} がいちばん手に取っているパイプです。',
    mostTastedBottle: '{{name}} がいちばん繰り返しテイスティングしているボトルです。',
    mostSmokedCigar: '{{name}} がいちばんよく吸っているシガーです。',
    cigarProfile: 'シガーの好みは {{profile}} に寄っています。',
    topRatedCigar: '{{name}} があなたの高評価シガーです{{rating}}。',
    highestValueCigar: '{{name}} は現在 {{value}} で、ヒュミドールの中でも特に価値が高い1本です。',
    restockCigarCount: '{{count}} 件のシガーが補充候補になっています。',
    topWineProducer: 'ワインの好みは {{producer}}{{varietal}}{{region}} が軸になっています。',
    readyToDrinkWineCount: '今ちょうど飲み頃に入っているワインが {{count}} 本あります。',
    crownJewel: 'コレクションの主役は {{name}}。評価額は {{value}} です。',
    underusedCount: 'まだローテーションでもっと出番がありそうなパイプが {{count}} 本あります。',
    regionPrefix: '（{{region}}）',
    varietalPrefix: '、特に {{varietal}} が目立ちます',
  },
  'zh-Hans': {
    empty: '你的收藏才刚刚开始。加入第一支烟斗、第一款混合烟草、第一瓶酒、第一支雪茄或第一瓶葡萄酒后，属于你的故事就会慢慢展开。',
    introAll: '你的收藏目前包含 {{pipes}} 只烟斗、{{blends}} 种混合烟草、{{bottleTypes}} 种威士忌酒款、酒窖中的 {{wineBottleTypes}} 款葡萄酒，以及 {{cigarTypes}} 种雪茄。',
    introPipeWhiskeyCigar: '你的收藏在 {{pipes}} 只烟斗、{{blends}} 种混合烟草、{{bottleTypes}} 种威士忌酒款和 {{cigarTypes}} 种雪茄之间保持了很好的平衡。',
    introPipeWhiskey: '你的收藏把 {{pipes}} 只烟斗、{{blends}} 种混合烟草和 {{bottleTypes}} 种精心挑选的威士忌酒款组合在一起。',
    introPipeCigar: '你的收藏把 {{pipes}} 只烟斗、{{blends}} 种混合烟草和 {{cigarTypes}} 种雪茄自然地串联起来。',
    introPipe: '你的收藏以 {{pipes}} 只烟斗和 {{blends}} 种混合烟草为核心，个人风格很鲜明。',
    introWhiskeyCigar: '你的收藏包含 {{bottleTypes}} 种威士忌酒款和 {{cigarTypes}} 种雪茄。',
    introWhiskey: '你的收藏里有 {{bottleTypes}} 种不同的威士忌酒款。',
    introCigar: '你的收藏里有 {{cigarTypes}} 种雪茄。',
    introWine: '你的酒窖目前存有 {{wineBottleTypes}} 款葡萄酒。',
    introPipeOnly: '你的收藏目前主要围绕 {{pipes}} 只烟斗展开。',
    blendPreference: '你的烟草轮换明显更偏向 {{type}} 风格的混合烟草。',
    whiskeyPreference: '你的威士忌收藏明显更偏向 {{type}}。',
    mostUsedPipe: '{{name}} 是你拿起次数最多的烟斗。',
    mostTastedBottle: '{{name}} 是你回头品鉴次数最多的酒瓶。',
    mostSmokedCigar: '{{name}} 是你最常回到的一支雪茄。',
    cigarProfile: '你的雪茄偏好整体倾向于 {{profile}}。',
    topRatedCigar: '{{name}} 是你评分最高的雪茄{{rating}}。',
    highestValueCigar: '{{name}} 目前以 {{value}} 领跑你的雪茄柜价值。',
    restockCigarCount: '有 {{count}} 条雪茄记录已被标记为需要补货。',
    topWineProducer: '你的葡萄酒选择以 {{producer}}{{varietal}}{{region}} 为主线。',
    readyToDrinkWineCount: '目前有 {{count}} 款葡萄酒正处在理想适饮期。',
    crownJewel: '你收藏中的镇柜之宝是 {{name}}，估值为 {{value}}。',
    underusedCount: '还有 {{count}} 只烟斗值得在轮换中得到更多出场机会。',
    regionPrefix: '，来自 {{region}}',
    varietalPrefix: '，其中 {{varietal}} 尤其突出',
  },
} as const;

function getBottleValue(bottle) {
  return (
    Number(bottle.collector_value) ||
    Number(bottle.aftermarket_price) ||
    Number(bottle.retail_price) ||
    Number(bottle.purchase_price) ||
    0
  );
}

function getPipeValue(pipe) {
  return Number(pipe.estimated_value) || Number(pipe.purchase_price) || 0;
}

function getTobaccoValue(blend) {
  return Number(blend.manual_market_value) || Number(blend.ai_estimated_value) || 0;
}

function getCigarValue(cigar) {
  return Number(cigar.estimated_value) || Number(cigar.purchase_price) || 0;
}

function getCigarSticks(cigar) {
  return Math.max(0, Number(cigar.singles_equivalent ?? cigar.quantity ?? 0));
}

function getWineQuantity(wine) {
  return Math.max(0, Number(wine.quantity ?? 1));
}

function getWineTotalValue(wine) {
  if (!wine) return 0;
  const qty = getWineQuantity(wine);
  if (wine.manual_valuation_enabled && Number(wine.manual_estimated_value) > 0) {
    return Number(wine.manual_estimated_value) * qty;
  }
  if (Number(wine.estimated_total_value) > 0) return Number(wine.estimated_total_value);
  if (Number(wine.market_estimated_total_value) > 0) return Number(wine.market_estimated_total_value);
  if (Number(wine.estimated_unit_value) > 0) return Number(wine.estimated_unit_value) * qty;
  if (Number(wine.market_estimated_unit_value) > 0) return Number(wine.market_estimated_unit_value) * qty;
  if (Number(wine.estimated_value) > 0) return Number(wine.estimated_value) * qty;
  if (Number(wine.purchase_price) > 0) return Number(wine.purchase_price) * qty;
  return 0;
}

function getWinePrimaryImage(wine) {
  if (!wine) return null;
  const photos = Array.isArray(wine.photos) ? wine.photos : [];
  return photos[0] || wine.photo || wine.image || wine.label_image || wine.image_url || null;
}

function getStoryText(language: string) {
  return STORY_TEXT[resolveLanguage(language)] || STORY_TEXT.en;
}

function formatValue(v, locale = 'en-US', currency = 'USD') {
  if (!v) return '$0';
  const rounded = Math.round(v);
  try {
    if (v >= 1000) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(v);
    }
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(rounded);
  } catch {
    return rounded >= 1000
      ? `$${(rounded / 1000).toFixed(1)}k`
      : `$${rounded.toLocaleString()}`;
  }
}

function getBottleUsageKeyFromLog(log) {
  if (log?.bottle_id) return `id:${log.bottle_id}`;
  if (log?.bottle_name) return `name:${log.bottle_name}`;
  return null;
}

function getBottleUsageKeyFromBottle(bottle) {
  if (bottle?.id) return `id:${bottle.id}`;
  if (bottle?.name) return `name:${bottle.name}`;
  return null;
}

function buildNarrative({
  pipes,
  blends,
  bottleTypes,
  mostUsedPipe,
  mostTastedBottle,
  dominantBlendType,
  dominantWhiskyType,
  underusedCount,
  mostValuable,
  cigarTypes,
  mostSmokedCigar,
  dominantCigarStrength,
  dominantCigarWrapper,
  dominantCigarCountry,
  topRatedCigar,
  highestValueCigar,
  restockCigarCount,
  wineBottleTypes,
  topWineProducer,
  topWineVarietal,
  topWineRegion,
  readyToDrinkWineCount,
  language = 'en',
  locale = 'en-US',
  currency = 'USD',
}) {
  const text = getStoryText(language);
  const hasPipes = pipes > 0;
  const hasBlends = blends > 0;
  const hasBottles = bottleTypes > 0;
  const hasCigars = cigarTypes > 0;
  const hasWines = wineBottleTypes > 0;
  const totalItems = pipes + blends + bottleTypes + cigarTypes + wineBottleTypes;

  if (totalItems === 0) {
    return text.empty;
  }

  const parts = [];

  if (hasPipes && hasBlends && hasBottles && hasCigars && hasWines) {
    parts.push(interpolate(text.introAll, { pipes, blends, bottleTypes, wineBottleTypes, cigarTypes }));
  } else if (hasPipes && hasBlends && hasBottles && hasCigars) {
    parts.push(interpolate(text.introPipeWhiskeyCigar, { pipes, blends, bottleTypes, cigarTypes }));
  } else if (hasPipes && hasBlends && hasBottles) {
    parts.push(interpolate(text.introPipeWhiskey, { pipes, blends, bottleTypes }));
  } else if (hasPipes && hasBlends && hasCigars) {
    parts.push(interpolate(text.introPipeCigar, { pipes, blends, cigarTypes }));
  } else if (hasPipes && hasBlends) {
    parts.push(interpolate(text.introPipe, { pipes, blends }));
  } else if (hasBottles && hasCigars) {
    parts.push(interpolate(text.introWhiskeyCigar, { bottleTypes, cigarTypes }));
  } else if (hasBottles) {
    parts.push(interpolate(text.introWhiskey, { bottleTypes }));
  } else if (hasCigars) {
    parts.push(interpolate(text.introCigar, { cigarTypes }));
  } else if (hasWines) {
    parts.push(interpolate(text.introWine, { wineBottleTypes }));
  } else if (hasPipes) {
    parts.push(interpolate(text.introPipeOnly, { pipes }));
  }

  if (dominantBlendType && hasBlends) {
    parts.push(interpolate(text.blendPreference, { type: dominantBlendType }));
  }

  if (dominantWhiskyType && hasBottles) {
    parts.push(interpolate(text.whiskeyPreference, { type: dominantWhiskyType }));
  }

  if (mostUsedPipe) {
    parts.push(interpolate(text.mostUsedPipe, { name: mostUsedPipe.name }));
  }

  if (mostTastedBottle) {
    parts.push(interpolate(text.mostTastedBottle, { name: mostTastedBottle.name }));
  }

  if (mostSmokedCigar) {
    parts.push(interpolate(text.mostSmokedCigar, { name: mostSmokedCigar.name }));
  }

  if (dominantCigarStrength || dominantCigarWrapper || dominantCigarCountry) {
    const cigarProfileBits = [
      dominantCigarStrength || null,
      dominantCigarWrapper || null,
      dominantCigarCountry || null,
    ].filter(Boolean);
    if (cigarProfileBits.length) {
      parts.push(interpolate(text.cigarProfile, { profile: cigarProfileBits.join(' / ') }));
    }
  }

  if (topRatedCigar) {
    parts.push(interpolate(text.topRatedCigar, {
      name: topRatedCigar.name,
      rating: topRatedCigar.rating ? ` (${topRatedCigar.rating}/5)` : '',
    }));
  }

  if (highestValueCigar && highestValueCigar.value > 0) {
    parts.push(interpolate(text.highestValueCigar, {
      name: highestValueCigar.name,
      value: formatValue(highestValueCigar.value, locale, currency),
    }));
  }

  if (restockCigarCount > 0) {
    parts.push(interpolate(text.restockCigarCount, { count: restockCigarCount }));
  }

  if (topWineProducer && hasWines) {
    parts.push(interpolate(text.topWineProducer, {
      producer: topWineProducer,
      varietal: topWineVarietal ? interpolate(text.varietalPrefix, { varietal: topWineVarietal }) : '',
      region: topWineRegion ? interpolate(text.regionPrefix, { region: topWineRegion }) : '',
    }));
  }

  if (readyToDrinkWineCount > 0) {
    parts.push(interpolate(text.readyToDrinkWineCount, { count: readyToDrinkWineCount }));
  }

  if (mostValuable && mostValuable.value > 0) {
    parts.push(interpolate(text.crownJewel, {
      name: mostValuable.name,
      value: formatValue(mostValuable.value, locale, currency),
    }));
  }

  if (underusedCount > 0) {
    parts.push(interpolate(text.underusedCount, { count: underusedCount }));
  }

  return parts.join(' ');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Accept optional module eligibility filter from caller.
    // If not provided, fall back to fetching user profile to determine enabled modules.
    let bodyEnabledModules = null;
    let requestedLanguage = 'en';
    let requestedLocale = 'en-US';
    let requestedCurrency = 'USD';
    try {
      const body = await req.json().catch(() => ({}));
      bodyEnabledModules = body?.enabledModules || null; // e.g. ['pipekeeper', 'whiskeykeeper']
      requestedLanguage = resolveLanguage(body?.language || body?.lang || 'en');
      requestedLocale = String(body?.locale || 'en-US');
      requestedCurrency = String(body?.currency || 'USD');
    } catch {}

    // Determine which modules are AI-eligible
    // If caller didn't pass enabledModules, check user profile
    let enabledModules = bodyEnabledModules;
    if (!enabledModules) {
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
        const profile = profiles?.[0] || null;
        const prefsSet = profile?.module_preferences_set === true;
        enabledModules = [
          'pipekeeper', // always include
          ...(prefsSet
            ? (profile?.whiskeykeeper_enabled !== false ? ['whiskeykeeper'] : [])
            : ['whiskeykeeper']), // default on for existing users
        ];
      } catch {
        enabledModules = ['pipekeeper', 'whiskeykeeper'];
      }
    }

    const includePipes = enabledModules.includes('pipekeeper');
    const includeWhiskey = enabledModules.includes('whiskeykeeper');
    const includeCigar = enabledModules.includes('cigarkeeper');
    const includeWine = enabledModules.includes('winekeeper');

    // Fetch only AI-eligible module data in parallel
    const [pipes, blends, bottles, logs, tastingLogs, inventoryUnits, cigars, cigarSessionsList, humidors, wines, wineTastings] = await Promise.all([
      includePipes ? base44.entities.Pipe.filter({ created_by: user.email }, '-created_date', 500) : Promise.resolve([]),
      includePipes ? base44.entities.TobaccoBlend.filter({ created_by: user.email }, '-created_date', 500) : Promise.resolve([]),
      includeWhiskey ? base44.entities.Bottle.filter({ created_by: user.email }, '-created_date', 500) : Promise.resolve([]),
      includePipes ? base44.entities.SmokingLog.filter({ created_by: user.email }, '-date', 500) : Promise.resolve([]),
      includeWhiskey ? base44.entities.TastingLog.filter({ created_by: user.email }, '-tasting_date', 500) : Promise.resolve([]),
      includeWhiskey ? base44.entities.WhiskeyInventoryUnit.filter({ created_by: user.email }) : Promise.resolve([]),
      includeCigar ? base44.entities.Cigar.filter({ created_by: user.email }, '-created_date', 500) : Promise.resolve([]),
      includeCigar ? base44.entities.CigarSession.filter({ created_by: user.email }, '-date', 500) : Promise.resolve([]),
      includeCigar ? base44.entities.HumidorLocation.filter({ created_by: user.email }, '-updated_date', 200) : Promise.resolve([]),
      includeWine ? base44.entities.Wine.filter({ created_by: user.email }, '-created_date', 500) : Promise.resolve([]),
      includeWine ? base44.entities.WineTasting.filter({ created_by: user.email }, '-date', 500) : Promise.resolve([]),
    ]);

    const pipesList = Array.isArray(pipes) ? pipes : [];
    const blendsList = Array.isArray(blends) ? blends : [];
    const bottlesList = Array.isArray(bottles) ? bottles : [];
    const logsList = Array.isArray(logs) ? logs : [];
    const tastingLogsList = Array.isArray(tastingLogs) ? tastingLogs : [];
    const inventoryUnitsList = Array.isArray(inventoryUnits) ? inventoryUnits : [];
    const cigarsList = Array.isArray(cigars) ? cigars : [];
    const cigarSessionsData = Array.isArray(cigarSessionsList) ? cigarSessionsList : [];
    const humidorsList = Array.isArray(humidors) ? humidors : [];
    const winesList = Array.isArray(wines) ? wines : [];
    const wineTastingsList = Array.isArray(wineTastings) ? wineTastings : [];

    // Dual bottle metrics
    const bottleTypes = bottlesList.length; // distinct labels
    const totalBottles = inventoryUnitsList.length > 0
      ? inventoryUnitsList.length
      : bottlesList.reduce((s, b) => s + (Number(b.bottle_count) || 1), 0);

    // Cigar metrics
    const totalCigarSticks = cigarsList.reduce((s, c) => s + getCigarSticks(c), 0);
    const cigarTypes = cigarsList.length;

    // Most smoked cigar
    const cigarUsage = {};
    cigarSessionsData.forEach(s => {
      if (s.cigar_id && !s.is_out_of_collection) {
        cigarUsage[s.cigar_id] = (cigarUsage[s.cigar_id] || 0) + 1;
      }
    });
    const maxCigarUses = Math.max(...Object.values(cigarUsage), 0);
    const mostSmokedCigar = maxCigarUses > 0
      ? cigarsList.find(c => cigarUsage[c.id] === maxCigarUses)
      : null;

    // Favorite cigar
    const favoriteCigar = cigarsList.filter(c => c.is_favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
      || cigarsList.filter(c => c.rating >= 4).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
      || null;

    const topRatedCigar = cigarsList.filter(c => c.rating != null).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;
    const highestValueCigar = cigarsList
      .map((c) => ({ ...c, __value: getCigarValue(c) * getCigarSticks(c) }))
      .sort((a, b) => (b.__value || 0) - (a.__value || 0))[0] || null;

    const cigarStrengthCounts = {};
    const cigarWrapperCounts = {};
    const cigarCountryCounts = {};
    cigarsList.forEach(c => {
      if (c.strength) cigarStrengthCounts[c.strength] = (cigarStrengthCounts[c.strength] || 0) + 1;
      if (c.wrapper) cigarWrapperCounts[c.wrapper] = (cigarWrapperCounts[c.wrapper] || 0) + 1;
      if (c.country) cigarCountryCounts[c.country] = (cigarCountryCounts[c.country] || 0) + 1;
    });
    const dominantCigarStrength = Object.entries(cigarStrengthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const dominantCigarWrapper = Object.entries(cigarWrapperCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const dominantCigarCountry = Object.entries(cigarCountryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const restockCigarCount = cigarsList.filter(c => {
      const status = String(c.status || '').toLowerCase();
      return status === 'restock' || getCigarSticks(c) <= 2;
    }).length;

    // Wine metrics
    const wineBottleTypes = winesList.length;
    const totalWineBottles = winesList.reduce((s, w) => s + getWineQuantity(w), 0);
    const wineCollectionValue = winesList.reduce((s, w) => s + getWineTotalValue(w), 0);
    
    const wineProducers = {};
    const wineVarietals = {};
    const wineRegions = {};
    winesList.forEach(w => {
      if (w.producer) wineProducers[w.producer] = (wineProducers[w.producer] || 0) + 1;
      if (w.varietal) wineVarietals[w.varietal] = (wineVarietals[w.varietal] || 0) + 1;
      const region = w.region || w.appellation || w.country_of_origin;
      if (region) wineRegions[region] = (wineRegions[region] || 0) + 1;
    });
    const topWineProducer = Object.entries(wineProducers).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const topWineVarietal = Object.entries(wineVarietals).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const topWineRegion = Object.entries(wineRegions).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    
    const readyToDrinkWineCount = winesList.filter(w => {
      const start = w.drink_window_start || w.drinking_window_start;
      const end = w.drink_window_end || w.drinking_window_end;
      if (!start || !end) return false;
      const now = new Date();
      return new Date(start) <= now && new Date(end) >= now;
    }).length;

    // Value totals
    const totalValue =
      pipesList.reduce((s, p) => s + getPipeValue(p), 0) +
      blendsList.reduce((s, b) => s + getTobaccoValue(b), 0) +
      bottlesList.reduce((s, b) => s + getBottleValue(b), 0) +
      cigarsList.reduce((s, c) => s + getCigarValue(c), 0) +
      wineCollectionValue;

    // Favorites
    const favorites = {
      pipe: pipesList.filter(p => p.is_favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0],
      blend: blendsList.filter(b => b.is_favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0],
      bottle: bottlesList.filter(b => b.favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0],
    };

    // Most used pipe
    const pipeUsage = {};
    logsList.forEach(log => {
      if (log.pipe_id) pipeUsage[log.pipe_id] = (pipeUsage[log.pipe_id] || 0) + 1;
    });
    const maxPipeUses = Math.max(...Object.values(pipeUsage), 0);
    const mostUsedPipe = maxPipeUses > 0 ? pipesList.find(p => pipeUsage[p.id] === maxPipeUses) : null;

    // Underused pipes
    const avgPipeUsage = logsList.length / Math.max(pipesList.length, 1);
    const underusedPipes = pipesList.filter(p => (pipeUsage[p.id] || 0) < avgPipeUsage * 0.3);

    // Blend type dominance
    const blendTypes = {};
    blendsList.forEach(b => {
      if (b.blend_type) blendTypes[b.blend_type] = (blendTypes[b.blend_type] || 0) + 1;
    });
    const dominantBlendType = Object.entries(blendTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Whiskey type dominance
    const whiskyTypes = {};
    bottlesList.forEach(b => {
      if (b.type) whiskyTypes[b.type] = (whiskyTypes[b.type] || 0) + 1;
    });
    const dominantWhiskyType = Object.entries(whiskyTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Most tasted bottle — key by bottle_id (primary), fallback to name for legacy logs
    const bottleUsage = {};
    tastingLogsList.forEach(log => {
      const key = getBottleUsageKeyFromLog(log);
      if (key) bottleUsage[key] = (bottleUsage[key] || 0) + 1;
    });
    const maxBottleUses = Math.max(...Object.values(bottleUsage), 0);
    const mostTastedBottle = maxBottleUses > 0
      ? bottlesList.find(b => {
          const key = getBottleUsageKeyFromBottle(b);
          return key ? (bottleUsage[key] || 0) === maxBottleUses : false;
        })
      : null;

    // Most valuable item across all collections
    const allItems = [
      ...pipesList.map(p => ({ name: p.name, id: p.id, type: 'pipe', value: getPipeValue(p) })),
      ...blendsList.map(b => ({ name: b.name, id: b.id, type: 'blend', value: getTobaccoValue(b) })),
      ...bottlesList.map(b => ({ name: b.name, id: b.id, type: 'bottle', value: getBottleValue(b) })),
      ...cigarsList.map(c => ({ name: c.name, id: c.id, type: 'cigar', value: getCigarValue(c) })),
      ...winesList.map(w => ({ name: w.name, id: w.id, type: 'wine', value: getWineTotalValue(w) })),
    ];
    const mostValuable = allItems.filter(i => i.value > 0).sort((a, b) => b.value - a.value)[0] || null;
    
    // Wine highlights
    const mostValuableWine = winesList.length > 0
      ? [...winesList]
          .map(w => ({ ...w, value: getWineTotalValue(w) }))
          .sort((a, b) => b.value - a.value)
          .find(w => w.value > 0)
      : null;
    const topRatedWine = winesList.length > 0
      ? [...winesList]
          .filter(w => Number(w.rating) > 0)
          .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0]
      : null;
    const readyToDrinkWine = winesList.find(w => {
      const start = w.drink_window_start || w.drinking_window_start;
      const end = w.drink_window_end || w.drinking_window_end;
      if (!start || !end) return false;
      const now = new Date();
      return new Date(start) <= now && new Date(end) >= now;
    });

    const narrative = buildNarrative({
      pipes: pipesList.length,
      blends: blendsList.length,
      bottleTypes,
      totalBottles,
      mostUsedPipe,
      mostTastedBottle,
      dominantBlendType,
      dominantWhiskyType,
      underusedCount: underusedPipes.length,
      mostValuable,
      totalSessions: logsList.length,
      cigarTypes,
      totalCigarSticks,
      mostSmokedCigar,
      cigarSessions: cigarSessionsData.length,
      humidorCount: humidorsList.length,
      dominantCigarStrength,
      dominantCigarWrapper,
      dominantCigarCountry,
      topRatedCigar,
      highestValueCigar: highestValueCigar ? { ...highestValueCigar, value: highestValueCigar.__value || 0 } : null,
      restockCigarCount,
      wineBottleTypes,
      totalWineBottles,
      topWineProducer,
      topWineVarietal,
      topWineRegion,
      readyToDrinkWineCount,
      mostValuableWine,
      language: requestedLanguage,
      locale: requestedLocale,
      currency: requestedCurrency,
    });

    const story = {
      narrative,
      metrics: {
        totalValue: Math.round(totalValue),
        pipes: pipesList.length,
        blends: blendsList.length,
        bottleTypes,
        totalBottles,
        bottles: bottleTypes,
        sessions: logsList.length,
        totalSessions: logsList.length,
        tastings: tastingLogsList.length,
        cigars: cigarTypes,
        cigarTypes,
        totalCigarSticks,
        cigarSticks: totalCigarSticks,
        cigarSessions: cigarSessionsData.length,
        humidorCount: humidorsList.length,
        dominantCigarStrength,
        dominantCigarWrapper,
        dominantCigarCountry,
        restockCigarCount,
        wineBottleTypes,
        totalWineBottles,
        wineValue: Math.round(wineCollectionValue),
        wineTastings: wineTastingsList.length,
        readyToDrinkWineCount,
      },
      highlights: {
        mostUsedPipe: mostUsedPipe
          ? {
              id: mostUsedPipe.id,
              name: mostUsedPipe.name,
              recordType: 'pipe',
              photos: mostUsedPipe.photos || [],
              photo: mostUsedPipe.photo,
              image: mostUsedPipe.image,
              image_url: mostUsedPipe.image_url,
              thumbnail: mostUsedPipe.thumbnail,
              uses: pipeUsage[mostUsedPipe.id] || 0,
            }
          : null,
        favoritePipe: favorites.pipe
          ? {
              id: favorites.pipe.id,
              name: favorites.pipe.name,
              recordType: 'pipe',
              photos: favorites.pipe.photos || [],
              photo: favorites.pipe.photo,
              image: favorites.pipe.image,
              image_url: favorites.pipe.image_url,
              thumbnail: favorites.pipe.thumbnail,
              rating: favorites.pipe.rating,
            }
          : null,
        favoriteBlend: favorites.blend
          ? {
              id: favorites.blend.id,
              name: favorites.blend.name,
              recordType: 'blend',
              photos: favorites.blend.photos || [],
              photo: favorites.blend.photo,
              logo: favorites.blend.logo,
              image: favorites.blend.image,
              image_url: favorites.blend.image_url,
              thumbnail: favorites.blend.thumbnail,
              rating: favorites.blend.rating,
            }
          : null,
        favoriteBottle: favorites.bottle
          ? {
              id: favorites.bottle.id,
              name: favorites.bottle.name,
              recordType: 'bottle',
              photo: favorites.bottle.photo,
              image: favorites.bottle.image,
              image_url: favorites.bottle.image_url,
              thumbnail: favorites.bottle.thumbnail,
              rating: favorites.bottle.rating,
            }
          : null,
        mostTastedBottle: mostTastedBottle
          ? {
              id: mostTastedBottle.id,
              name: mostTastedBottle.name,
              recordType: 'bottle',
              photo: mostTastedBottle.photo,
              image: mostTastedBottle.image,
              image_url: mostTastedBottle.image_url,
              thumbnail: mostTastedBottle.thumbnail,
              tastings: bottleUsage[getBottleUsageKeyFromBottle(mostTastedBottle) || ''] || 0,
            }
          : null,
        mostSmokedCigar: mostSmokedCigar
          ? {
              id: mostSmokedCigar.id,
              name: mostSmokedCigar.name,
              recordType: 'cigar',
              photos: mostSmokedCigar.photos || [],
              photo: mostSmokedCigar.photo,
              sessions: cigarUsage[mostSmokedCigar.id] || 0,
            }
          : null,
        favoriteCigar: favoriteCigar
          ? {
              id: favoriteCigar.id,
              name: favoriteCigar.name,
              recordType: 'cigar',
              photos: favoriteCigar.photos || [],
              photo: favoriteCigar.photo,
              rating: favoriteCigar.rating,
            }
          : null,
        topRatedCigar: topRatedCigar
          ? {
              id: topRatedCigar.id,
              name: topRatedCigar.name,
              recordType: 'cigar',
              photos: topRatedCigar.photos || [],
              photo: topRatedCigar.photo,
              rating: topRatedCigar.rating,
            }
          : null,
        highestValueCigar: highestValueCigar
          ? {
              id: highestValueCigar.id,
              name: highestValueCigar.name,
              recordType: 'cigar',
              photos: highestValueCigar.photos || [],
              photo: highestValueCigar.photo,
              value: Math.round(highestValueCigar.__value || 0),
            }
          : null,
        mostValuableItem: mostValuable
          ? (() => {
              let fullRecord = null;
              if (mostValuable.type === 'pipe') {
                fullRecord = pipesList.find(p => p.id === mostValuable.id);
              } else if (mostValuable.type === 'blend') {
                fullRecord = blendsList.find(b => b.id === mostValuable.id);
              } else if (mostValuable.type === 'bottle') {
                fullRecord = bottlesList.find(b => b.id === mostValuable.id);
              } else if (mostValuable.type === 'cigar') {
                fullRecord = cigarsList.find(c => c.id === mostValuable.id);
              }
              return fullRecord ? {
                id: mostValuable.id,
                name: mostValuable.name,
                recordType: mostValuable.type,
                photos: fullRecord.photos || [],
                photo: fullRecord.photo || fullRecord.logo,
                logo: fullRecord.logo,
                image: fullRecord.image,
                image_url: fullRecord.image_url,
                thumbnail: fullRecord.thumbnail,
                value: Math.round(mostValuable.value),
              } : null;
            })()
          : null,
        underusedCount: underusedPipes.length,
        dominantBlendType,
        dominantWhiskyType,
        mostValuableWine: mostValuableWine
          ? {
              id: mostValuableWine.id,
              name: mostValuableWine.name,
              recordType: 'wine',
              photos: mostValuableWine.photos || [],
              photo: getWinePrimaryImage(mostValuableWine),
              value: Math.round(mostValuableWine.value || 0),
            }
          : null,
        topRatedWine: topRatedWine
          ? {
              id: topRatedWine.id,
              name: topRatedWine.name,
              recordType: 'wine',
              photos: topRatedWine.photos || [],
              photo: getWinePrimaryImage(topRatedWine),
              rating: Number(topRatedWine.rating || 0),
            }
          : null,
        readyToDrinkWine: readyToDrinkWine
          ? {
              id: readyToDrinkWine.id,
              name: readyToDrinkWine.name,
              recordType: 'wine',
              photos: readyToDrinkWine.photos || [],
              photo: getWinePrimaryImage(readyToDrinkWine),
            }
          : null,
      },
    };

    return Response.json(story);
  } catch (error) {
    console.error('Story generation error:', error);
    return Response.json({ error: error.message || 'Failed to generate story' }, { status: 500 });
  }
});