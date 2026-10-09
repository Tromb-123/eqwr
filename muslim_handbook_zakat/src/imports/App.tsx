import {
  CSSProperties,
  Dispatch,
  SetStateAction,
  FormEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import {
  BISMILLAH,
  prepareVerses,
  surahMeaningsEn,
  surahMeaningsRu,
  surahShowsBismillah,
  surahs,
} from "./surahs"
import translationSource from "./translations.json"
import {
  PRICE_SNAPSHOT,
  calculateZakat,
  loadMetalPrices,
  type MetalPrices,
  type NisabStandard,
} from "./zakat"
import mosqueHero from "./assets/mosque-hero.png"
import mosqueHeroNight from "./assets/mosque-hero-night.jpg"
import quranCardImage from "./assets/quran-card.jpg"
import hadithCardImage from "./assets/hadith-card.png"

type Page = "home" | "quran" | "hadith" | "ai" | "keyword" | "zakat" | "date-converter" | "ramadan-calendar" | "event-countdown"
type NavSection = "reference" | "search" | "tools"
type Language = "en" | "ru"
type Theme = "dark" | "light"
type IconName = "arrow" | "book" | "chevron" | "close" | "feather" | "home" | "layers" | "menu" | "search" | "settings" | "sparkles"

const navItems: { section: NavSection, icon: IconName }[] = [
  { section: "reference", icon: "book" },
  { section: "search", icon: "search" },
  { section: "tools", icon: "sparkles" },
]

const MOBILE_ORBIT_SLOT_ANGLES = [12, 36, 70] as const
const SEARCH_SUBMENU_ANGLE_STEP = 21
const PRIMARY_ORBIT_ANGLE = 15
const ORBIT_SELECTION_DURATION = 420
const MOBILE_EDGE_MARGIN = 12

function wrapIndex(index: number, count: number) {
  return ((index % count) + count) % count
}

function mobileOrbitAngleForIndex(index: number, cycleOffset: number) {
  const submenuSlot = wrapIndex(
    navItems.length - 1 - cycleOffset,
    navItems.length,
  )

  if (index < navItems.length) {
    const slot = wrapIndex(index - cycleOffset, navItems.length)
    return MOBILE_ORBIT_SLOT_ANGLES[slot]
  }

  return (
    MOBILE_ORBIT_SLOT_ANGLES[submenuSlot] +
    (index - navItems.length + 1) * SEARCH_SUBMENU_ANGLE_STEP
  )
}

function orbitItemStyle(
  index: number,
  cycleOffset: number,
  cycleDirection: -1 | 0 | 1,
): CSSProperties {
  const currentAngle = mobileOrbitAngleForIndex(index, cycleOffset)
  let angle = currentAngle

  if (cycleDirection !== 0 && index < navItems.length) {
    angle = mobileOrbitAngleForIndex(
      index,
      wrapIndex(cycleOffset + cycleDirection, navItems.length),
    )

    if (cycleDirection === 1 && angle > currentAngle) angle -= 360
    if (cycleDirection === -1 && angle < currentAngle) angle += 360
  }

  const normalizedAngle = wrapIndex(angle, 360)
  const isLowestMainSlot =
    index < navItems.length &&
    normalizedAngle === MOBILE_ORBIT_SLOT_ANGLES[navItems.length - 1]

  const isMiddleMainSlot =
    index < navItems.length &&
    normalizedAngle === MOBILE_ORBIT_SLOT_ANGLES[1]

  return {
    "--mobile-item-angle": `${angle}deg`,
    "--mobile-item-counter-angle": `${-angle}deg`,
    "--mobile-slot-y-offset": isLowestMainSlot
      ? "-2px"
      : isMiddleMainSlot
        ? "-3px"
        : "0px",
  } as CSSProperties
}

const translations = {
  en: {
    about: "About this project",
    openNav: "Open navigation",
    closeNav: "Close navigation",
    quran: "Quran",
    hadith: "Hadith",
    search: "Search",
    aiSearch: "AI Search",
    keyword: "Keyword",
    referenceSection: "Reference",
    islamicTools: "Islamic Tools",
    zakatCalculator: "Zakat Calculator",
    dateConverter: "Hijri ↔ Gregorian Converter",
    ramadanCalendar: "Ramadan Calendar",
    eventCountdown: "Islamic Event Countdown",
    toolsIntro:
      "Practical interfaces prepared for connection to verified calculation and calendar data sources.",
    zakatIntro:
      "Enter your wealth. The calculator compares it with the nisab, using the current gold and silver price, and shows the zakat if it is due.",
    zkCash: "Cash and savings (₽)",
    zkGold: "Gold (grams of pure gold)",
    zkSilver: "Silver (grams of pure silver)",
    zkOther: "Trade goods and investments (₽)",
    zkDebts: "Debts you must repay (₽)",
    zkDeductions: "Other deductions (₽)",
    zkWeightHint: "Enter the weight of pure metal: for 585 gold multiply the weight by 0.585.",
    zkPricesTitle: "Metal prices, ₽ per gram",
    zkGoldPrice: "Gold price",
    zkSilverPrice: "Silver price",
    zkPriceLive: "Bank of Russia price on {date}.",
    zkPriceSnapshot: "Bank of Russia price on {date} (saved in the site; live update is unavailable). You can enter your own prices.",
    zkPriceEdited: "Prices entered by you.",
    zkStandardLegend: "Measure the nisab by",
    zkStdGold: "Gold — 85 g",
    zkStdSilver: "Silver — 595 g (Hanafi school)",
    zkHawlLegend: "Has your wealth stayed above the nisab for a full lunar year?",
    zkHawlYes: "Yes",
    zkHawlNo: "Not yet",
    zkTotalAssets: "Total assets",
    zkDeductionsTotal: "Deductions",
    zkNetWealth: "Wealth after deductions",
    zkNisab: "Nisab",
    zkNisabHintGold: "85 g of gold at the price above",
    zkNisabHintSilver: "595 g of silver at the price above",
    zkAbove: "Above the nisab by {amount}",
    zkBelow: "Below the nisab by {amount}",
    zkZakat: "Zakat (2.5%)",
    zkStatusBelow: "Your wealth is below the nisab, so zakat is not obligatory.",
    zkStatusWaiting: "Your wealth is above the nisab, but zakat becomes due only after a full lunar year. If it stays above, you will owe {amount}.",
    zkStatusDue: "Zakat is due: 2.5% of your wealth after deductions.",
    zkNotice: "Estimate only. Rules: nisab of 85 g of gold or 595 g of silver, rate 2.5%, one full lunar year (Abu Dawud 1573; al-Bukhari 1454; see IslamQA and Islamic Relief). Prices: Bank of Russia. Scholars differ on details, for example on gold or silver as the measure and on jewellery, so consult a scholar of your school before paying.",
    assets: "Assets",
    cashSavings: "Cash / savings",
    gold: "Gold",
    silver: "Silver",
    otherAssets: "Other applicable assets",
    debtsLiabilities: "Debts / liabilities",
    amountPlaceholder: "Enter amount",
    totalAssets: "Total assets",
    applicableDeductions: "Applicable deductions",
    nisabComparison: "Nisab comparison",
    estimatedZakat: "Estimated Zakat",
    calculationPending: "Awaiting verified calculation logic",
    dataSourceNotice:
      "No religious ruling or calculation assumption is applied in this prototype.",
    converterIntro:
      "Choose a direction and enter a date. A verified date source is required before a conversion can be returned.",
    conversionDirection: "Conversion direction",
    hijriToGregorian: "Hijri → Gregorian",
    gregorianToHijri: "Gregorian → Hijri",
    day: "Day",
    month: "Month",
    year: "Year",
    convert: "Convert",
    conversionResult: "Conversion result",
    conversionPending: "Awaiting a verified date service",
    ramadanIntro:
      "Ramadan calendar rows will appear when verified location-aware calendar data is available.",
    ramadanDay: "Ramadan day",
    gregorianDate: "Gregorian date",
    hijriDateLabel: "Hijri date",
    notes: "Notes",
    calendarPending: "No verified Ramadan calendar data connected",
    countdownIntro:
      "Event dates and countdowns will be calculated from a verified, location-aware calendar source.",
    eventDate: "Event date",
    countdown: "Countdown",
    ramadan: "Ramadan",
    eidFitr: "Eid al-Fitr",
    eidAdha: "Eid al-Adha",
    eventPending: "Awaiting verified event data",
    homeEyebrow: "An Islamic reference prototype",
    homeTitle: "Knowledge, gathered with clarity.",
    homeCopy:
      "A calm place to browse and search the Quran and Hadith. Designed to make reference simple, thoughtful, and accessible.",
    explore: "Start exploring",
    searchSources: "Search the sources",
    quranCard: "Browse Surahs and read verses in a focused, spacious layout.",
    hadithCard: "Explore collections, categories, and narration metadata.",
    prototypeNote:
      "This is an interface prototype. No religious source text or scholarly interpretation is presented as authentic.",
    islamicDate: "Islamic date",
    weekday: "Monday",
    hijriMonth: "Sha'ban",
    hijriEra: "AH",
    dailyReflection: "Daily Reflection",
    todaysReference: "Today's reference",
    source: "Source",
    meaning: "Meaning / Translation",
    reflectionMain:
      "[Verified religious source text will appear here. This is an intentionally empty placeholder.]",
    reflectionMeaning:
      "[Placeholder meaning or translation — to be reviewed and verified before publication.]",
    prototypeContent: "Prototype content",
    placeholderNotice:
      "Religious passages shown here are marked placeholders, not source text.",
    quranNotice:
      "Arabic text: Tanzil Project, Uthmani script (tanzil.net). English translation: Saheeh International.",
    quranNoticeMark: "S",
    browseSurahs: "Browse Surahs",
    quranIntro:
      "Select a Surah to open a clear, distraction-free reading view. Names and counts are provided for navigation.",
    surah: "Surah",
    verses: "Verses",
    allSurahs: "All Surahs",
    surahListMode: "Surah list",
    readingMode: "Reading mode",
    readingModeIntro: "All 114 surahs are arranged continuously, as in the Quran. Click an ayah to show its Russian translation.",
    readingModeTitle: "Quran reading",
    arabicPlaceholder: "[Arabic verse placeholder]",
    translationPlaceholder: "Click an ayah to show its Russian translation.",
    translateVerse: "Show English translation",
    translationLoading: "Loading translation…",
    translationError: "Could not load the translation. Try again.",
    collections: "Collections & narrations",
    hadithIntro:
      "Browse demonstration collections and inspect how individual narrations will be presented with their source metadata.",
    sampleEntries: "sample entries",
    searchOptions: "Search options",
    inDevelopment: "In development",
    aiTitle: "Search by meaning, not only by words.",
    aiCopy:
      "A future semantic search experience will help people explore sources by concept and meaning—even when they do not know the exact wording.",
    aiNote:
      "AI search is not active in this prototype. Future results will require careful source attribution, verification, and scholarly review.",
    keywordSearch: "Keyword search",
    keywordTitle: "Search the sources",
    keywordIntro:
      "Find exact words and phrases across one or more source sections. Results below are realistic interface placeholders only.",
    searchTerm: "Search term or phrase",
    searchPlaceholder: "e.g. mercy, patience, intention",
    searchWithin: "Search within",
    demoResults: "Demonstration results",
    resultsFor: "Results for",
    placeholders: "placeholders",
    footer: "Islamic reference, thoughtfully organized.",
    theme: "Theme",
    language: "Language",
    primaryNavigation: "Primary navigation",
    dark: "Dark",
    light: "Light",
    prototypeMark: "P",
    defaultQuery: "mercy",
    goHome: "Go to home",
    rotateNavigation: "Rotate navigation",
    rotateCounterclockwise: "Rotate navigation counterclockwise",
    rotateClockwise: "Rotate navigation clockwise",
    openSettings: "Open settings",
    prototype: "Prototype",
    sampleIndex: "Sample index",
    individualEntries: "Individual entries",
    sampleNarration: "Sample narration",
    placeholderCollection: "Placeholder Collection",
    book: "Book",
    demo: "Demo",
    backTo: "Back to",
    placeholder: "Placeholder",
    detailIntro:
      "A detailed reference view with source context and attribution.",
    entryText: "Entry text",
    detailPassage:
      "[Verified content will appear here. This passage is intentionally omitted in the prototype.]",
    detailNote:
      "[A plain-language summary and relevant cross-references may be provided here after appropriate verification.]",
    sourceDetails: "Source details",
    openResult: "Open result",
    collection: "Collection",
    sampleChapter: "Sample chapter",
    reference: "Reference",
    grade: "Grade",
    notAssessed: "Not assessed — placeholder",
    entry: "Entry",
    prototypePlaceholder: "Prototype placeholder",
    versePlaceholder: "Verse placeholder",
    surahMeanings: surahMeaningsEn,
    sourceFilters: ["Quran", "Hadith", "Quran + Hadith"],
    hadithCollections: [
      {
        name: "Collection One",
        type: "Placeholder collection",
        count: "97 chapters",
        description:
          "A demonstration collection organized by books and subject areas.",
      },
      {
        name: "Collection Two",
        type: "Placeholder collection",
        count: "56 chapters",
        description: "Sample navigation for a second hadith compilation.",
      },
      {
        name: "Forty Narrations",
        type: "Placeholder collection",
        count: "40 entries",
        description:
          "A compact sample collection for exploring individual entries.",
      },
    ],
    searchResults: [
      {
        source: "Quran",
        meta: "Surah example · Verse 00",
        copy: "A placeholder result showing where a verified translation containing the searched phrase would appear.",
      },
      {
        source: "Hadith",
        meta: "Placeholder Collection · Demo 1:1",
        copy: "A sample narration excerpt would be displayed here, alongside complete and verified source information.",
      },
    ],
  },
  ru: {
    about: "О проекте",
    openNav: "Открыть навигацию",
    closeNav: "Закрыть навигацию",
    quran: "Коран",
    hadith: "Хадисы",
    search: "Поиск",
    aiSearch: "ИИ-поиск",
    keyword: "По словам",
    referenceSection: "Справочник",
    islamicTools: "Инструменты",
    zakatCalculator: "Калькулятор закята",
    dateConverter: "Конвертер хиджры и григорианской даты",
    ramadanCalendar: "Календарь Рамадана",
    eventCountdown: "Отсчёт до исламских событий",
    toolsIntro:
      "Практические интерфейсы, подготовленные для подключения проверенных расчётов и календарных данных.",
    zakatIntro:
      "Введите своё имущество. Калькулятор сравнит его с нисабом по актуальной цене золота и серебра и покажет сумму закята, если он обязателен.",
    zkCash: "Деньги и сбережения (₽)",
    zkGold: "Золото (граммы чистого золота)",
    zkSilver: "Серебро (граммы чистого серебра)",
    zkOther: "Товары для торговли и вложения (₽)",
    zkDebts: "Долги, которые нужно вернуть (₽)",
    zkDeductions: "Прочие вычеты (₽)",
    zkWeightHint: "Указывайте вес чистого металла: для золота 585 пробы умножьте вес на 0,585.",
    zkPricesTitle: "Цены на металлы, ₽ за грамм",
    zkGoldPrice: "Цена золота",
    zkSilverPrice: "Цена серебра",
    zkPriceLive: "Цена Банка России на {date}.",
    zkPriceSnapshot: "Цена Банка России на {date} (сохранена на сайте, автообновление недоступно). Можно ввести свои цены.",
    zkPriceEdited: "Цены введены вами.",
    zkStandardLegend: "Считать нисаб по",
    zkStdGold: "Золоту — 85 г",
    zkStdSilver: "Серебру — 595 г (ханафитский мазхаб)",
    zkHawlLegend: "Находилось ли имущество выше нисаба полный лунный год?",
    zkHawlYes: "Да",
    zkHawlNo: "Ещё нет",
    zkTotalAssets: "Всего имущества",
    zkDeductionsTotal: "Вычеты",
    zkNetWealth: "Имущество после вычетов",
    zkNisab: "Нисаб",
    zkNisabHintGold: "85 г золота по цене выше",
    zkNisabHintSilver: "595 г серебра по цене выше",
    zkAbove: "Выше нисаба на {amount}",
    zkBelow: "Ниже нисаба на {amount}",
    zkZakat: "Закят (2,5%)",
    zkStatusBelow: "Ваше имущество ниже нисаба, поэтому закят не обязателен.",
    zkStatusWaiting: "Имущество выше нисаба, но закят становится обязательным только после полного лунного года. Если оно останется выше нисаба, вы будете должны {amount}.",
    zkStatusDue: "Закят обязателен: 2,5% от имущества после вычетов.",
    zkNotice: "Расчёт ориентировочный. Нормы: нисаб 85 г золота или 595 г серебра, ставка 2,5%, полный лунный год (Абу Дауд 1573; аль-Бухари 1454; см. IslamQA и Islamic Relief). Цены: Банк России. Учёные расходятся в деталях, например в выборе золота или серебра и в вопросе об украшениях, поэтому перед выплатой посоветуйтесь с учёным своего мазхаба.",
    assets: "Активы",
    cashSavings: "Деньги / сбережения",
    gold: "Золото",
    silver: "Серебро",
    otherAssets: "Другие применимые активы",
    debtsLiabilities: "Долги / обязательства",
    amountPlaceholder: "Введите сумму",
    totalAssets: "Общие активы",
    applicableDeductions: "Применимые вычеты",
    nisabComparison: "Сравнение с нисабом",
    estimatedZakat: "Расчётный закят",
    calculationPending: "Ожидается проверенная логика расчёта",
    dataSourceNotice:
      "В этом прототипе не применяются религиозные постановления или допущения расчёта.",
    converterIntro:
      "Выберите направление и введите дату. Для получения результата требуется проверенный источник дат.",
    conversionDirection: "Направление конвертации",
    hijriToGregorian: "Хиджра → Григорианский",
    gregorianToHijri: "Григорианский → Хиджра",
    day: "День",
    month: "Месяц",
    year: "Год",
    convert: "Конвертировать",
    conversionResult: "Результат конвертации",
    conversionPending: "Ожидается проверенный сервис дат",
    ramadanIntro:
      "Строки календаря появятся после подключения проверенных календарных данных с учётом местоположения.",
    ramadanDay: "День Рамадана",
    gregorianDate: "Григорианская дата",
    hijriDateLabel: "Дата по хиджре",
    notes: "Примечания",
    calendarPending: "Проверенные данные календаря Рамадана не подключены",
    countdownIntro:
      "Даты событий и обратный отсчёт будут рассчитаны по проверенному календарному источнику с учётом местоположения.",
    eventDate: "Дата события",
    countdown: "Обратный отсчёт",
    ramadan: "Рамадан",
    eidFitr: "Ид аль-Фитр",
    eidAdha: "Ид аль-Адха",
    eventPending: "Ожидаются проверенные данные события",
    homeEyebrow: "Прототип исламского справочника",
    homeTitle: "Знания, собранные с ясностью.",
    homeCopy:
      "Спокойное пространство для просмотра и поиска по Корану и хадисам. Простой, вдумчивый и доступный справочник.",
    explore: "Начать изучение",
    searchSources: "Поиск по источникам",
    quranCard: "Просматривайте суры в ясном и просторном формате.",
    hadithCard: "Изучайте сборники, категории и сведения о хадисах.",
    prototypeNote:
      "Это прототип интерфейса. Религиозные тексты и богословские толкования не представлены как достоверные.",
    islamicDate: "Исламская дата",
    weekday: "Понедельник",
    hijriMonth: "Шаабан",
    hijriEra: "г. х.",
    dailyReflection: "Размышление дня",
    todaysReference: "Источник дня",
    source: "Источник",
    meaning: "Смысл / Перевод",
    reflectionMain:
      "[Здесь будет проверенный религиозный текст. Это намеренно пустой заполнитель.]",
    reflectionMeaning:
      "[Заполнитель смысла или перевода — требуется проверка перед публикацией.]",
    prototypeContent: "Материалы прототипа",
    placeholderNotice:
      "Религиозные отрывки отмечены как заполнители и не являются текстами источников.",
    quranNotice:
      "Арабский текст: проект Tanzil, османическое написание (tanzil.net). Русский перевод: Эльмир Кулиев, источник — Tanzil.net.",
    quranNoticeMark: "И",
    browseSurahs: "Обзор сур",
    quranIntro:
      "Выберите суру для чтения без отвлекающих элементов. Названия и количество аятов даны для навигации.",
    surah: "Сура",
    verses: "Аяты",
    allSurahs: "Все суры",
    surahListMode: "Список сур",
    readingMode: "Режим чтения",
    readingModeIntro: "Все 114 сур расположены последовательно, как в Коране. Нажмите ЛКМ по аяту, чтобы открыть его русский перевод.",
    readingModeTitle: "Чтение Корана",
    arabicPlaceholder: "[Заполнитель арабского текста аята]",
    translationPlaceholder: "Нажмите на аят, чтобы показать русский перевод.",
    translateVerse: "Показать русский перевод",
    translationLoading: "Загрузка перевода…",
    translationError: "Не удалось загрузить перевод. Попробуйте ещё раз.",
    collections: "Сборники и предания",
    hadithIntro:
      "Просматривайте демонстрационные сборники и формат представления преданий с метаданными источника.",
    sampleEntries: "примеров",
    searchOptions: "Варианты поиска",
    inDevelopment: "В разработке",
    aiTitle: "Поиск по смыслу, а не только по словам.",
    aiCopy:
      "Будущий семантический поиск поможет находить источники по идее и смыслу, даже если точная формулировка неизвестна.",
    aiNote:
      "ИИ-поиск не активен в этом прототипе. Будущие результаты потребуют атрибуции, проверки и научной рецензии.",
    keywordSearch: "Поиск по словам",
    keywordTitle: "Поиск по источникам",
    keywordIntro:
      "Ищите точные слова и фразы в одном или нескольких разделах. Результаты ниже являются заполнителями интерфейса.",
    searchTerm: "Слово или фраза",
    searchPlaceholder: "например: милость, терпение, намерение",
    searchWithin: "Искать в",
    demoResults: "Демонстрационные результаты",
    resultsFor: "Результаты для",
    placeholders: "заполнителя",
    footer: "Исламский справочник, продуманно организованный.",
    theme: "Тема",
    language: "Язык",
    primaryNavigation: "Основная навигация",
    dark: "Тёмная",
    light: "Светлая",
    prototypeMark: "П",
    defaultQuery: "милость",
    goHome: "На главную",
    rotateNavigation: "Вращение навигации",
    rotateCounterclockwise: "Повернуть навигацию против часовой стрелки",
    rotateClockwise: "Повернуть навигацию по часовой стрелке",
    openSettings: "Открыть настройки",
    prototype: "Прототип",
    sampleIndex: "Пример указателя",
    individualEntries: "Отдельные записи",
    sampleNarration: "Пример повествования",
    placeholderCollection: "Демонстрационная коллекция",
    book: "Книга",
    demo: "Пример",
    backTo: "Назад к разделу",
    placeholder: "Заполнитель",
    detailIntro:
      "Подробный справочный вид с контекстом источника и атрибуцией.",
    entryText: "Текст записи",
    detailPassage:
      "[Здесь появится проверенный материал. Этот фрагмент намеренно опущен в прототипе.]",
    detailNote:
      "[После надлежащей проверки здесь могут появиться краткое объяснение и связанные ссылки.]",
    sourceDetails: "Сведения об источнике",
    openResult: "Открыть результат",
    collection: "Коллекция",
    sampleChapter: "Пример главы",
    reference: "Ссылка",
    grade: "Оценка",
    notAssessed: "Не оценено — заполнитель",
    entry: "Запись",
    prototypePlaceholder: "Заполнитель прототипа",
    versePlaceholder: "Заполнитель аята",
    surahMeanings: surahMeaningsRu,
    sourceFilters: ["Коран", "Хадисы", "Коран + Хадисы"],
    hadithCollections: [
      {
        name: "Коллекция один",
        type: "Демонстрационная коллекция",
        count: "97 глав",
        description:
          "Демонстрационная коллекция, организованная по книгам и темам.",
      },
      {
        name: "Коллекция два",
        type: "Демонстрационная коллекция",
        count: "56 глав",
        description: "Пример навигации по второй подборке хадисов.",
      },
      {
        name: "Сорок повествований",
        type: "Демонстрационная коллекция",
        count: "40 записей",
        description:
          "Компактная примерная коллекция для просмотра отдельных записей.",
      },
    ],
    searchResults: [
      {
        source: "Коран",
        meta: "Пример суры · Аят 00",
        copy: "Здесь появится пример проверенного перевода, содержащего искомую фразу.",
      },
      {
        source: "Хадисы",
        meta: "Демонстрационная коллекция · Пример 1:1",
        copy: "Здесь появится пример повествования с полными и проверенными сведениями об источнике.",
      },
    ],
  },
} as const

const dailyReflections = [{ category: "quran" }, { category: "hadith" }] as const

function Icon({ name, size = 20 }: { name: IconName, size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    feather: (
      <>
        <path d="M20.2 4.8c-3.8-3.8-10.8.5-13.8 3.5-2.3 2.3-2.8 5.4-.8 7.4 2 2 5.1 1.5 7.4-.8 3-3 7.3-10 3.5-13.8" />
        <path d="m2 22 9-9" />
        <path d="M7.5 17H3v-4.5" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </>
    ),
    layers: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5" />
        <path d="m3 17 9 5 9-5" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3-1.2 3.5L7 8l3.8 1.5L12 13l1.2-3.5L17 8l-3.8-1.5L12 3Z" />
        <path d="m5 14-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8L5 14Z" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      {paths[name]}
    </svg>
  )
}

function Crescent() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6">
      <path
        d="M22.9 24.7A11.5 11.5 0 0 1 13.5 5.2a11.5 11.5 0 1 0 9.4 19.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>
}

function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <header className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="intro-copy">{children}</p>
    </header>
  )
}

function QuranSourceNotice({ language = "en" }: { language?: Language }) {
  const t = translations[language]
  return (
    <div className="placeholder-notice">
      <span className="notice-mark">{t.quranNoticeMark}</span>
      <p>{t.quranNotice}</p>
    </div>
  )
}

// The Arabic text is large, so it is loaded only when the Quran view needs it.
let versesPromise: Promise<string[][]> | null = null
function loadVerses() {
  versesPromise ??= import("./ayahs.json").then((module) => module.default as string[][])
  return versesPromise
}

type TranslationVerse = {
  id: number
  text: string
  translation: string
}

type TranslationSurah = {
  id: number
  name: string
  translation: string
  type: string
  total_verses: number
  verses: TranslationVerse[]
}

function verseTranslationKey(surahNumber: number, verseNumber: number) {
  return `${surahNumber}:${verseNumber}`
}

let russianTranslationPromise: Promise<Map<string, string>> | null = null

function normalizeTranslationData(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Russian translation JSON has an invalid format")
  }

  const map = new Map<string, string>()

  for (const surah of value as TranslationSurah[]) {
    if (!surah || typeof surah.id !== "number" || !Array.isArray(surah.verses)) {
      continue
    }

    for (const verse of surah.verses) {
      if (
        typeof verse?.id === "number" &&
        typeof verse.translation === "string" &&
        verse.translation.trim()
      ) {
        map.set(verseTranslationKey(surah.id, verse.id), verse.translation.trim())
      }
    }
  }

  if (map.size !== 6236) {
    throw new Error(`Russian translation JSON is incomplete: ${map.size} of 6236 verses found`)
  }

  return map
}

function loadRussianTranslation() {
  russianTranslationPromise ??= fetch(translationSource.translation.fileUrl, {
    headers: { Accept: "application/json" },
    cache: "force-cache",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Translation file request failed: ${response.status}`)
      }
      return normalizeTranslationData(await response.json())
    })
    .catch((error) => {
      russianTranslationPromise = null
      throw error
    })

  return russianTranslationPromise
}

// English: Saheeh International, bundled with the app and loaded only when needed.
let englishTranslationPromise: Promise<Map<string, string>> | null = null

function loadEnglishTranslation() {
  englishTranslationPromise ??= import("./quran-en.json")
    .then((module) => {
      const surahsData = module.default as string[][]
      const map = new Map<string, string>()

      surahsData.forEach((verses, surahIndex) => {
        verses.forEach((text, verseIndex) => {
          if (typeof text === "string" && text.trim()) {
            map.set(verseTranslationKey(surahIndex + 1, verseIndex + 1), text.trim())
          }
        })
      })

      if (map.size !== 6236) {
        throw new Error(`English translation is incomplete: ${map.size} of 6236 verses found`)
      }

      return map
    })
    .catch((error) => {
      englishTranslationPromise = null
      throw error
    })

  return englishTranslationPromise
}

function fetchVerseTranslation(
  language: Language,
  surahNumber: number,
  verseNumber: number,
) {
  const load = language === "en" ? loadEnglishTranslation : loadRussianTranslation
  return load().then((translations) => {
    const translation = translations.get(verseTranslationKey(surahNumber, verseNumber))

    if (!translation) {
      throw new Error(`Translation not found for ${surahNumber}:${verseNumber}`)
    }

    return translation
  })
}

function VerseButton({
  surahNumber,
  verseNumber,
  text,
  language,
  translationsByKey,
  setTranslationsByKey,
  selectedKey,
  setSelectedKey,
  loadingKey,
  setLoadingKey,
  errorKey,
  setErrorKey,
  continuous = false,
}: {
  surahNumber: number
  verseNumber: number
  text: string
  language: Language
  translationsByKey: Record<string, string>
  setTranslationsByKey: Dispatch<SetStateAction<Record<string, string>>>
  selectedKey: string | null
  setSelectedKey: (key: string | null) => void
  loadingKey: string | null
  setLoadingKey: (key: string | null) => void
  errorKey: string | null
  setErrorKey: (key: string | null) => void
  continuous?: boolean
}) {
  const t = translations[language]
  const key = verseTranslationKey(surahNumber, verseNumber)
  const isSelected = selectedKey === key
  // Cached per language, so switching EN <-> RU never shows the other language's text.
  const cacheKey = `${language}:${key}`
  const translation = translationsByKey[cacheKey]
  const isLoading = loadingKey === key
  const hasError = errorKey === key

  const translate = async () => {
    setSelectedKey(key)
    setErrorKey(null)
    if (translation) return

    setLoadingKey(key)
    try {
      const result = await fetchVerseTranslation(language, surahNumber, verseNumber)
      setTranslationsByKey((current) => ({ ...current, [cacheKey]: result }))
    } catch {
      setErrorKey(key)
    } finally {
      setLoadingKey(null)
    }
  }

  // If the site language changes while a verse is open, load that verse in the new language.
  useEffect(() => {
    if (isSelected && !translation) void translate()
  }, [language])

  return (
    <button
      className={`verse verse-button${continuous ? " continuous-verse" : ""}${isSelected ? " selected" : ""}`}
      type="button"
      onClick={() => void translate()}
      aria-expanded={isSelected}
      title={t.translateVerse}
    >
      <span>{verseNumber}</span>
      <div className="verse-content">
        <p className="arabic-placeholder arabic-text" dir="rtl" lang="ar">
          {text}
        </p>
        {isSelected && (
          <p
            className={`translation-placeholder verse-translation${
              isLoading ? " is-loading" : ""
            }${hasError ? " is-error" : ""}`}
            dir="auto"
          >
            {isLoading
              ? t.translationLoading
              : hasError
                ? t.translationError
                : translation}
          </p>
        )}
      </div>
    </button>
  )
}

function SurahVerses({
  surahNumber,
  language,
}: {
  surahNumber: number
  language: Language
}) {
  const [allVerses, setAllVerses] = useState<string[][] | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [translationsByKey, setTranslationsByKey] = useState<Record<string, string>>({})
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setSelectedKey(null)
    setErrorKey(null)

    loadVerses().then((loaded) => {
      if (!cancelled) setAllVerses(loaded)
    })

    return () => {
      cancelled = true
    }
  }, [surahNumber])

  if (!allVerses) return <div className="verses" />

  const verses = prepareVerses(surahNumber, allVerses[surahNumber - 1])

  return (
    <div className="verses">
      {surahShowsBismillah(surahNumber) && (
        <div className="verse bismillah-row">
          <p className="arabic-placeholder arabic-text" dir="rtl" lang="ar">
            {BISMILLAH}
          </p>
        </div>
      )}

      {verses.map((text, index) => (
        <VerseButton
          key={verseTranslationKey(surahNumber, index + 1)}
          surahNumber={surahNumber}
          verseNumber={index + 1}
          text={text}
          language={language}
          translationsByKey={translationsByKey}
          setTranslationsByKey={setTranslationsByKey}
          selectedKey={selectedKey}
          setSelectedKey={setSelectedKey}
          loadingKey={loadingKey}
          setLoadingKey={setLoadingKey}
          errorKey={errorKey}
          setErrorKey={setErrorKey}
        />
      ))}
    </div>
  )
}

function QuranReadingMode({ language }: { language: Language }) {
  const [allVerses, setAllVerses] = useState<string[][] | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [translationsByKey, setTranslationsByKey] = useState<Record<string, string>>({})
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const t = translations[language]

  useEffect(() => {
    loadVerses().then(setAllVerses)
  }, [])

  if (!allVerses) {
    return <div className="full-quran-reader loading-reader">{t.translationLoading}</div>
  }

  return (
    <div className="full-quran-reader">
      {surahs.map((surah) => {
        const verses = prepareVerses(surah.number, allVerses[surah.number - 1])

        return (
          <section className="full-surah continuous-surah" key={surah.number} id={`surah-${surah.number}`}>
            <header className="full-surah-header compact-surah-header">
              <span className="surah-number-mark">{surah.number}</span>
              <h2>{surah.name}</h2>
              <p>{t.surahMeanings[surah.number - 1]}</p>
            </header>

            {surahShowsBismillah(surah.number) && (
              <div className="continuous-bismillah">
                <p className="arabic-placeholder arabic-text" dir="rtl" lang="ar">
                  {BISMILLAH}
                </p>
              </div>
            )}

            <p className="quran-continuous-text" dir="rtl" lang="ar">
              {verses.map((text, index) => (
                <VerseButton
                  key={verseTranslationKey(surah.number, index + 1)}
                  surahNumber={surah.number}
                  verseNumber={index + 1}
                  text={text}
                  language={language}
                  translationsByKey={translationsByKey}
                  setTranslationsByKey={setTranslationsByKey}
                  selectedKey={selectedKey}
                  setSelectedKey={setSelectedKey}
                  loadingKey={loadingKey}
                  setLoadingKey={setLoadingKey}
                  errorKey={errorKey}
                  setErrorKey={setErrorKey}
                  continuous
                />
              ))}
            </p>
          </section>
        )
      })}
    </div>
  )
}

function PlaceholderNotice({ language = "en" }: { language?: Language }) {
  const t = translations[language]
  return (
    <div className="placeholder-notice">
      <span className="notice-mark">{t.prototypeMark}</span>
      <p>
        <strong>{t.prototypeContent}</strong>
        {t.placeholderNotice}
      </p>
    </div>
  )
}

function HijriDate({
  day,
  month,
  year,
  weekday,
  era,
  label,
}: {
  day: number
  month: string
  year: number
  weekday?: string
  era: string
  label: string
}) {
  return (
    <section className="hijri-date" aria-label={label}>
      <div className="hijri-heading">
        <p className="eyebrow">{label}</p>
        {weekday && <span>{weekday}</span>}
      </div>
      <div className="hijri-value">
        <strong>{day}</strong>
        <span>{month}</span>
        <small>
          {year} {era}
        </small>
      </div>
    </section>
  )
}

function DailyReflection({
  language,
  reflection,
}: {
  language: Language
  reflection: typeof dailyReflections[number]
}) {
  const t = translations[language]
  const category = t[reflection.category]
  const source = {
    quran: `${surahs[0].name} · ${t.versePlaceholder}`,
    hadith: `${t.hadithCollections[0].name} · ${t.demo} 1:1`,
  }[reflection.category]
  return (
    <section className="daily-reflection">
      <div className="reflection-heading">
        <div>
          <p className="eyebrow">{t.todaysReference}</p>
          <h2>{t.dailyReflection}</h2>
        </div>
        <Tag>{category}</Tag>
      </div>
      <div className="reflection-source">
        <span>{t.source}</span>
        <strong>{source}</strong>
      </div>
      <blockquote>{t.reflectionMain}</blockquote>
      <div className="reflection-meaning">
        <p>{t.meaning}</p>
        <span>{t.reflectionMeaning}</span>
      </div>
    </section>
  )
}

function App() {
  const [page, setPage] = useState<Page>("home")
  const [language, setLanguage] = useState<Language>(() =>
    window.localStorage.getItem("marja-language") === "ru" ? "ru" : "en",
  )
  const [theme, setTheme] = useState<Theme>(() =>
    window.localStorage.getItem("marja-theme") === "light" ? "light" : "dark",
  )
  const [dailyIndex, setDailyIndex] = useState(() =>
    Math.floor(Math.random() * dailyReflections.length),
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState<NavSection | null>(null)
  const [orbitRotation, setOrbitRotation] = useState(0)
  const [orbitDragRotation, setOrbitDragRotation] = useState(0)
  const [orbitDragging, setOrbitDragging] = useState(false)
  const [mobileCycleOffset, setMobileCycleOffset] = useState(0)
  const [orbitCycleDirection, setOrbitCycleDirection] = useState<-1 | 0 | 1>(0)
  const [orbitSnapping, setOrbitSnapping] = useState(false)
  const [orbitRotating, setOrbitRotating] = useState(false)
  const [viewportVersion, setViewportVersion] = useState(0)
  const pendingNavigation = useRef<number | null>(null)
  const pendingOrbitRotation = useRef<number | null>(null)
  const orbitDrag = useRef<{
    pointerId: number
    startX: number
    startY: number
    lastX: number
    lastY: number
    swiping: boolean
  } | null>(null)
  const suppressOptionClickUntil = useRef(0)
  const orbitItemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const radialNavRef = useRef<HTMLDivElement | null>(null)
  const searchSubmenuRef = useRef<HTMLDivElement | null>(null)
  const settingsRef = useRef<HTMLDivElement | null>(null)
  const [selectedSurah, setSelectedSurah] =
    useState<typeof surahs[number] | null>(null)
  const [quranViewMode, setQuranViewMode] = useState<"surahs" | "reading">("surahs")
  const [selectedHadith, setSelectedHadith] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [filterIndex, setFilterIndex] = useState(2)
  const t = translations[language]
  const submenuItems: { page: Page, label: string, icon: IconName }[] =
    openSubmenu === "reference"
      ? [
          { page: "quran", label: t.quran, icon: "book" },
          { page: "hadith", label: t.hadith, icon: "layers" },
        ]
      : openSubmenu === "search"
        ? [
            { page: "keyword", label: t.keyword, icon: "search" },
            { page: "ai", label: t.aiSearch, icon: "sparkles" },
          ]
        : openSubmenu === "tools"
          ? [
              { page: "zakat", label: t.zakatCalculator, icon: "layers" },
              {
                page: "date-converter",
                label: t.dateConverter,
                icon: "arrow",
              },
              {
                page: "ramadan-calendar",
                label: t.ramadanCalendar,
                icon: "book",
              },
              {
                page: "event-countdown",
                label: t.eventCountdown,
                icon: "sparkles",
              },
            ]
          : []
  const submenuAnchorIndex = openSubmenu
    ? navItems.findIndex((item) => item.section === openSubmenu)
    : -1

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [page, selectedSurah, selectedHadith])

  useEffect(() => {
    document.documentElement.lang = language
    document.title = "Muslim's handbook"
    document.documentElement.dir = "ltr"
    window.localStorage.setItem("marja-language", language)
  }, [language])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem("marja-theme", theme)
  }, [theme])

  useEffect(() => {
    if (page === "home") {
      setDailyIndex(Math.floor(Math.random() * dailyReflections.length))
    }
  }, [page])

  useEffect(() => {
    return () => {
      if (pendingNavigation.current !== null) {
        window.clearTimeout(pendingNavigation.current)
      }
      if (pendingOrbitRotation.current !== null) {
        window.clearTimeout(pendingOrbitRotation.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleResize = () => setViewportVersion((version) => version + 1)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (!settingsOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setSettingsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [settingsOpen])

  // Keep every main orbit button on screen. Instead of hiding a button that
  // would fall outside the viewport (e.g. when "Search" is rotated to the top),
  // nudge it back inside, which moves it down/up/sideways just enough to fit.
  useLayoutEffect(() => {
    const nudgeTargets = orbitItemRefs.current.slice(0, navItems.length)
    const clearNudges = () => {
      nudgeTargets.forEach((item) => item?.style.removeProperty("translate"))
    }

    if (!menuOpen || !window.matchMedia("(max-width: 800px)").matches) {
      clearNudges()
      return
    }

    let animationFrame = 0
    const startedAt = performance.now()
    const applied = new Map<number, { x: number, y: number }>()
    const safeAreaTop =
      Number.parseFloat(
        window
          .getComputedStyle(radialNavRef.current!)
          .getPropertyValue("--mobile-safe-area-top"),
      ) || 0

    const fitItems = () => {
      nudgeTargets.forEach((item, index) => {
        if (!item) return

        const previous = applied.get(index) ?? { x: 0, y: 0 }
        const bounds = item.getBoundingClientRect()
        // position the button would have without any nudge
        const top = bounds.top - previous.y
        const bottom = bounds.bottom - previous.y
        const left = bounds.left - previous.x
        const right = bounds.right - previous.x

        const minTop = MOBILE_EDGE_MARGIN + safeAreaTop
        const maxBottom = window.innerHeight - MOBILE_EDGE_MARGIN
        const minLeft = MOBILE_EDGE_MARGIN
        const maxRight = window.innerWidth - MOBILE_EDGE_MARGIN

        let dy = 0
        if (bottom > maxBottom) dy = maxBottom - bottom
        if (top + dy < minTop) dy = minTop - top
        let dx = 0
        if (right > maxRight) dx = maxRight - right
        if (left + dx < minLeft) dx = minLeft - left

        applied.set(index, { x: dx, y: dy })

        // convert the screen-space nudge into the rotated orbit frame
        const orbitPosition = item.parentElement
        const matrix = orbitPosition
          ? new DOMMatrixReadOnly(
              window.getComputedStyle(orbitPosition).transform,
            )
          : new DOMMatrixReadOnly()
        const length = Math.hypot(matrix.a, matrix.b) || 1
        const cos = matrix.a / length
        const sin = matrix.b / length
        const localX = dx * cos + dy * sin
        const localY = -dx * sin + dy * cos

        if (dx === 0 && dy === 0) {
          item.style.removeProperty("translate")
        } else {
          item.style.setProperty("translate", `${localX}px ${localY}px`)
        }
      })

      if (performance.now() - startedAt <= ORBIT_SELECTION_DURATION + 150) {
        animationFrame = window.requestAnimationFrame(fitItems)
      }
    }

    fitItems()
    return () => window.cancelAnimationFrame(animationFrame)
  }, [
    language,
    menuOpen,
    mobileCycleOffset,
    orbitCycleDirection,
    orbitRotation,
    orbitDragRotation,
    openSubmenu,
    viewportVersion,
  ])

  useLayoutEffect(() => {
    if (!openSubmenu) {
      return
    }

    let animationFrame = 0
    const startedAt = performance.now()

    const positionSearchSubmenu = () => {
      const searchButton = orbitItemRefs.current[submenuAnchorIndex]
      const radialNav = radialNavRef.current
      const submenu = searchSubmenuRef.current
      if (!searchButton || !radialNav || !submenu) return

      const searchBounds = searchButton.getBoundingClientRect()
      const radialBounds = radialNav.getBoundingClientRect()
      const submenuBounds = submenu.getBoundingClientRect()
      const edgeMargin = 12
      const connectorGap = 14
      const desiredLeft = searchBounds.right - radialBounds.left + connectorGap
      const maximumLeft =
        window.innerWidth - radialBounds.left - submenuBounds.width - edgeMargin
      const minimumLeft = edgeMargin - radialBounds.left
      const left = Math.max(minimumLeft, Math.min(desiredLeft, maximumLeft))
      const fitsBesideSearch = left >= searchBounds.right - radialBounds.left
      const desiredTop = fitsBesideSearch
        ? searchBounds.top - radialBounds.top
        : searchBounds.bottom - radialBounds.top + 8
      const maximumTop =
        window.innerHeight -
        radialBounds.top -
        submenuBounds.height -
        edgeMargin
      const top = Math.max(
        edgeMargin - radialBounds.top,
        Math.min(desiredTop, maximumTop),
      )

      submenu.style.setProperty("--search-submenu-left", `${left}px`)
      submenu.style.setProperty("--search-submenu-top", `${top}px`)

      if (performance.now() - startedAt <= ORBIT_SELECTION_DURATION + 100) {
        animationFrame = window.requestAnimationFrame(positionSearchSubmenu)
      }
    }

    positionSearchSubmenu()
    return () => window.cancelAnimationFrame(animationFrame)
  }, [
    language,
    mobileCycleOffset,
    openSubmenu,
    submenuAnchorIndex,
    viewportVersion,
  ])

  const clearPendingNavigation = () => {
    if (pendingNavigation.current !== null) {
      window.clearTimeout(pendingNavigation.current)
      pendingNavigation.current = null
    }
  }

  const clearPendingOrbitRotation = () => {
    if (pendingOrbitRotation.current !== null) {
      window.clearTimeout(pendingOrbitRotation.current)
      pendingOrbitRotation.current = null
    }
    setOrbitRotating(false)
    setOrbitSnapping(false)
    setOrbitCycleDirection(0)
  }

  const navigate = (nextPage: Page) => {
    clearPendingNavigation()
    clearPendingOrbitRotation()
    setPage(nextPage)
    setSelectedSurah(null)
    setSelectedHadith(null)
    setMenuOpen(false)
    setOpenSubmenu(null)
    setOrbitRotation(0)
    setMobileCycleOffset(0)
    setOrbitCycleDirection(0)
  }

  const chooseNav = (section: NavSection) => {
    clearPendingNavigation()
    clearPendingOrbitRotation()
    setOrbitRotation(0)
    setOpenSubmenu((current) => (current === section ? null : section))
  }

  const runSearch = (event: FormEvent) => {
    event.preventDefault()
    setSubmittedQuery(query.trim())
  }

  const rotateOrbit = (direction: -1 | 1) => {
    if (orbitRotating) return

    setOpenSubmenu(null)
    setOrbitRotating(true)
    setOrbitCycleDirection(direction)

    pendingOrbitRotation.current = window.setTimeout(() => {
      setOrbitSnapping(true)
      setMobileCycleOffset((currentOffset) =>
        wrapIndex(currentOffset + direction, navItems.length),
      )
      setOrbitCycleDirection(0)
      setOrbitRotation(0)
      pendingOrbitRotation.current = null

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setOrbitSnapping(false)
          setOrbitRotating(false)
        })
      })
    }, ORBIT_SELECTION_DURATION)
  }

  const startOrbitSwipe = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (
      orbitRotating ||
      !menuOpen ||
      !window.matchMedia("(max-width: 800px)").matches
    ) {
      return
    }

    orbitDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      swiping: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setOrbitDragging(true)
  }

  const updateOrbitSwipe = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = orbitDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return

    drag.lastX = event.clientX
    drag.lastY = event.clientY
    const deltaX = drag.lastX - drag.startX
    const deltaY = drag.lastY - drag.startY

    if (!drag.swiping) {
      if (Math.abs(deltaX) < 8 || Math.abs(deltaX) <= Math.abs(deltaY)) return
      drag.swiping = true
    }

    event.preventDefault()
    setOrbitDragRotation(Math.max(-18, Math.min(18, deltaX * 0.18)))
  }

  const finishOrbitSwipe = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = orbitDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaX = drag.lastX - drag.startX
    const deltaY = drag.lastY - drag.startY
    const shouldRotate =
      drag.swiping &&
      Math.abs(deltaX) >= 36 &&
      Math.abs(deltaX) > Math.abs(deltaY)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    orbitDrag.current = null
    setOrbitDragRotation(0)
    setOrbitDragging(false)

    if (shouldRotate) {
      suppressOptionClickUntil.current = performance.now() + 500
      rotateOrbit(deltaX < 0 ? 1 : -1)
    }
  }

  const cancelOrbitSwipe = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (orbitDrag.current?.pointerId !== event.pointerId) return
    orbitDrag.current = null
    setOrbitDragRotation(0)
    setOrbitDragging(false)
  }

  const suppressOptionClickAfterSwipe = (
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    if (performance.now() > suppressOptionClickUntil.current) return
    suppressOptionClickUntil.current = 0
    event.preventDefault()
    event.stopPropagation()
  }

  const orbitSwipeHandlers = {
    onPointerDown: startOrbitSwipe,
    onPointerMove: updateOrbitSwipe,
    onPointerUp: finishOrbitSwipe,
    onPointerCancel: cancelOrbitSwipe,
    onClickCapture: suppressOptionClickAfterSwipe,
  }

  const orbitStyle = {
    "--orbit-rotation": `${orbitRotation + orbitDragRotation}deg`,
    "--orbit-counter-rotation": `${-(orbitRotation + orbitDragRotation)}deg`,
  } as CSSProperties

  const sectionIsActive = (section: NavSection) =>
    openSubmenu === section ||
    (section === "reference" && ["quran", "hadith"].includes(page)) ||
    (section === "search" && ["keyword", "ai"].includes(page)) ||
    (section === "tools" &&
      [
        "zakat",
        "date-converter",
        "ramadan-calendar",
        "event-countdown",
      ].includes(page))

  const toggleMainMenu = () => {
    setSettingsOpen(false)
    setMenuOpen((isOpen) => {
      if (isOpen) {
        clearPendingNavigation()
        clearPendingOrbitRotation()
        setOpenSubmenu(null)
        setOrbitRotation(0)
        setMobileCycleOffset(0)
      }
      return !isOpen
    })
  }

  const toggleSettings = () => {
    setSettingsOpen((isOpen) => {
      if (!isOpen) {
        clearPendingNavigation()
        clearPendingOrbitRotation()
        setMenuOpen(false)
        setOpenSubmenu(null)
        setOrbitRotation(0)
        setMobileCycleOffset(0)
      }
      return !isOpen
    })
  }

  return (
    <div className="app-shell" dir="ltr">
      <nav className="topbar" aria-label={t.primaryNavigation}>
        <button
          className="wordmark"
          onClick={() => navigate("home")}
          aria-label={t.goHome}
        >
          <span>MI</span>
          <strong>MH</strong>
        </button>
        <div className="topbar-actions">
          <button className="about-link" onClick={() => navigate("home")}>
            {t.about}
          </button>
        </div>
      </nav>

      <div
        ref={settingsRef}
        className={`settings-menu ${settingsOpen ? "is-open" : ""}`}
      >
        <button
          className="settings-trigger"
          onClick={toggleSettings}
          aria-expanded={settingsOpen}
          aria-label={t.openSettings}
          tabIndex={settingsOpen ? -1 : 0}
        >
          <Icon name="settings" size={19} />
        </button>
        <div
          className="settings-panel"
          onClick={(event) => {
            if (event.target === event.currentTarget) toggleSettings()
          }}
          role="group"
          aria-label={t.openSettings}
          aria-hidden={!settingsOpen}
        >
          <button
            className={`compact-toggle theme-toggle ${theme === "light" ? "is-on" : ""}`}
            type="button"
            role="switch"
            aria-checked={theme === "light"}
            aria-label={`${t.theme}: ${theme === "dark" ? t.light : t.dark}`}
            tabIndex={settingsOpen ? 0 : -1}
            onClick={() => {
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }}
          >
            <span>Dark</span>
            <span>Light</span>
          </button>
          <button
            className={`compact-toggle language-toggle ${language === "ru" ? "is-on" : ""}`}
            type="button"
            role="switch"
            aria-checked={language === "ru"}
            aria-label={`${t.language}: ${language === "en" ? "Русский" : "English"}`}
            tabIndex={settingsOpen ? 0 : -1}
            onClick={() => {
              setLanguage((current) => (current === "en" ? "ru" : "en"))
            }}
          >
            <span>EN</span>
            <span>RU</span>
          </button>
        </div>
      </div>

      <div
        className={`desktop-main-menu ${menuOpen ? "is-open" : ""}`}
      >
        <button
          className="moon-button"
          onClick={toggleMainMenu}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? t.closeNav : t.openNav}
        >
          {menuOpen ? <Icon name="close" size={22} /> : <Crescent />}
        </button>
        <div className="desktop-menu-options">
          <div className="desktop-menu-group desktop-nav-reference">
            <button
              className={sectionIsActive("reference") ? "active" : ""}
              onClick={() => chooseNav("reference")}
              aria-expanded={openSubmenu === "reference"}
              tabIndex={menuOpen ? 0 : -1}
            >
              <Icon name="book" size={17} />
              <span>{t.referenceSection}</span>
            </button>
            {openSubmenu === "reference" && (
              <div className="desktop-submenu">
                {submenuItems.map((submenuItem) => (
                  <button
                    key={submenuItem.page}
                    className={page === submenuItem.page ? "active" : ""}
                    onClick={() => navigate(submenuItem.page)}
                  >
                    <Icon name={submenuItem.icon} size={17} />
                    <span>
                      {submenuItem.page === "hadith" && language === "en"
                        ? "Hadiths"
                        : submenuItem.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="desktop-menu-group desktop-nav-search">
            <button
              className={sectionIsActive("search") ? "active" : ""}
              onClick={() => chooseNav("search")}
              aria-expanded={openSubmenu === "search"}
              tabIndex={menuOpen ? 0 : -1}
            >
              <Icon name="search" size={17} />
              <span>{t.search}</span>
            </button>
            {openSubmenu === "search" && (
              <div className="desktop-submenu">
                {submenuItems.map((submenuItem) => (
                  <button
                    key={submenuItem.page}
                    onClick={() => navigate(submenuItem.page)}
                  >
                    <Icon name={submenuItem.icon} size={17} />
                    <span>{submenuItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="desktop-menu-group desktop-nav-tools">
            <button
              className={sectionIsActive("tools") ? "active" : ""}
              onClick={() => chooseNav("tools")}
              aria-expanded={openSubmenu === "tools"}
              tabIndex={menuOpen ? 0 : -1}
            >
              <Icon name="sparkles" size={17} />
              <span>{t.islamicTools}</span>
            </button>
            {openSubmenu === "tools" && (
              <div className="desktop-submenu">
                {submenuItems.map((submenuItem) => (
                  <button
                    key={submenuItem.page}
                    onClick={() => navigate(submenuItem.page)}
                  >
                    <Icon name={submenuItem.icon} size={17} />
                    <span>{submenuItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        ref={radialNavRef}
        className={`radial-nav mobile-radial-nav ${menuOpen ? "is-open" : ""} ${
          openSubmenu ? "search-open" : ""
        } ${orbitSnapping ? "is-snapping" : ""} ${
          orbitDragging ? "is-dragging" : ""
        } ${orbitRotating ? "is-rotating" : ""}`}
        style={orbitStyle}
      >
        <button
          className="moon-button"
          onClick={toggleMainMenu}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? t.closeNav : t.openNav}
        >
          {menuOpen ? <Icon name="close" size={22} /> : <Crescent />}
        </button>
        <div className="nav-bubbles">
          {navItems.map((item, index) => (
            <div
              className="orbit-position"
              key={item.section}
              style={orbitItemStyle(
                index,
                mobileCycleOffset,
                orbitCycleDirection,
              )}
            >
              <button
                {...orbitSwipeHandlers}
                className={`nav-bubble bubble-${index + 1} ${
                  sectionIsActive(item.section) ? "active" : ""
                }`}
                onClick={() => chooseNav(item.section)}
                ref={(node) => {
                  orbitItemRefs.current[index] = node
                }}
                tabIndex={menuOpen ? 0 : -1}
              >
                <Icon name={item.icon} size={18} />
                <span>
                  {
                    ({
                      reference: t.referenceSection,
                      search: t.search,
                      tools: t.islamicTools,
                    } as Record<NavSection, string>)[item.section]
                  }
                </span>
              </button>
            </div>
          ))}
        </div>
        {openSubmenu && (
          <div className="search-bubbles" ref={searchSubmenuRef}>
            {submenuItems.map((item, index) => {
              const itemIndex = navItems.length + index
              return (
                <div className="orbit-position" key={item.page}>
                  <button
                    {...orbitSwipeHandlers}
                    onClick={() => navigate(item.page)}
                    ref={(node) => {
                      orbitItemRefs.current[itemIndex] = node
                    }}
                    tabIndex={0}
                  >
                    <Icon name={item.icon} size={18} />
                    <span>{item.label}</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <div className="orbit-controls" aria-label={t.rotateNavigation}>
          <button
            className="orbit-control counterclockwise"
            onClick={() => rotateOrbit(-1)}
            aria-label={t.rotateCounterclockwise}
            tabIndex={menuOpen ? 0 : -1}
          >
            <Icon name="arrow" size={16} />
          </button>
          <button
            className="orbit-control clockwise"
            onClick={() => rotateOrbit(1)}
            aria-label={t.rotateClockwise}
            tabIndex={menuOpen ? 0 : -1}
          >
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </div>

      <main>
        {page === "home" && (
          <section className="home-page page">
            <div className="mosque-hero" aria-hidden="true">
              <img className="hero-img-day" src={mosqueHero} alt="" />
              <img className="hero-img-night" src={mosqueHeroNight} alt="" />
            </div>
            <div className="hero-ornament" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="hero">
              <p className="eyebrow">{t.homeEyebrow}</p>
              <h1>{t.homeTitle}</h1>
              <p className="hero-copy">{t.homeCopy}</p>
              <div className="hero-actions">
                <button
                  className="primary-button"
                  onClick={() => navigate("quran")}
                >
                  {t.explore} <Icon name="chevron" size={17} />
                </button>
                <button
                  className="text-button"
                  onClick={() => navigate("keyword")}
                >
                  {t.searchSources}
                </button>
              </div>
            </div>

            <div className="home-daily">
              <HijriDate
                day={18}
                month={t.hijriMonth}
                year={1447}
                weekday={t.weekday}
                era={t.hijriEra}
                label={t.islamicDate}
              />
              <DailyReflection
                language={language}
                reflection={dailyReflections[dailyIndex]}
              />
            </div>

            <div className="source-grid">
              {[
                ["01", t.quran, t.quranCard, "quran", quranCardImage],
                ["02", t.hadith, t.hadithCard, "hadith", hadithCardImage],
              ].map(([number, title, copy, target, image]) => (
                <button
                  className="source-card"
                  key={title}
                  onClick={() => navigate(target as Page)}
                >
                  <span className="source-card-image" aria-hidden="true">
                    <img src={image} alt="" />
                  </span>
                  <span className="card-number">{number}</span>
                  <span className="source-card-copy">
                    <strong>{title}</strong>
                    <small>{copy}</small>
                  </span>
                  <span className="card-arrow">
                    <Icon name="chevron" size={19} />
                  </span>
                </button>
              ))}
            </div>
            <div className="home-footnote">
              <span />
              <p>{t.prototypeNote}</p>
            </div>
          </section>
        )}

        {page === "quran" && (
          <section className="page quran-page">
            <PageIntro eyebrow={t.quran} title={quranViewMode === "reading" ? t.readingModeTitle : t.browseSurahs}>
              {quranViewMode === "reading" ? t.readingModeIntro : t.quranIntro}
            </PageIntro>

            <div
              className={`quran-view-switch ${quranViewMode === "reading" ? "reading" : "surahs"}`}
              role="group"
              aria-label={t.quran}
            >
              <span className="quran-view-thumb" aria-hidden="true" />
              <button
                type="button"
                className="quran-view-option"
                aria-pressed={quranViewMode === "surahs"}
                onClick={() => { setSelectedSurah(null); setQuranViewMode("surahs") }}
              >
                {t.surahListMode}
              </button>
              <button
                type="button"
                className="quran-view-option"
                aria-pressed={quranViewMode === "reading"}
                onClick={() => { setSelectedSurah(null); setQuranViewMode("reading") }}
              >
                {t.readingMode}
              </button>
            </div>

            <QuranSourceNotice language={language} />

            {quranViewMode === "reading" ? (
              <QuranReadingMode language={language} />
            ) : !selectedSurah ? (
              <>
                <div className="list-header">
                  <span>{t.surah}</span>
                  <span>{t.verses}</span>
                </div>
                <div className="reference-list">
                  {surahs.map((surah, index) => (
                    <button
                      key={surah.number}
                      onClick={() => setSelectedSurah(surah)}
                    >
                      <span className="number-lozenge">
                        {String(surah.number).padStart(2, "0")}
                      </span>
                      <span className="item-main">
                        <strong>{surah.name}</strong>
                        <small>{t.surahMeanings[index]}</small>
                      </span>
                      <span className="item-count">{surah.verses}</span>
                      <Icon name="chevron" size={18} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <article className="reading-view">
                <button
                  className="back-button"
                  onClick={() => setSelectedSurah(null)}
                >
                  <Icon name="arrow" size={18} /> {t.allSurahs}
                </button>
                <header>
                  <Tag>
                    {t.surah} {selectedSurah.number}
                  </Tag>
                  <h1>{selectedSurah.name}</h1>
                  <p>
                    {t.surahMeanings[selectedSurah.number - 1]} · {" "}
                    {selectedSurah.verses} {t.verses.toLowerCase()}
                  </p>
                </header>
                <SurahVerses
                  key={selectedSurah.number}
                  surahNumber={selectedSurah.number}
                  language={language}
                />
              </article>
            )}
          </section>
        )}

        {page === "hadith" && (
          <section className="page">
            {!selectedHadith ? (
              <>
                <PageIntro eyebrow={t.hadith} title={t.collections}>
                  {t.hadithIntro}
                </PageIntro>
                <PlaceholderNotice language={language} />
                <div className="collection-grid">
                  {t.hadithCollections.map((collection) => (
                    <button
                      key={collection.name}
                      onClick={() => setSelectedHadith(collection.name)}
                    >
                      <Icon name="layers" size={24} />
                      <Tag>{collection.type}</Tag>
                      <h2>{collection.name}</h2>
                      <p>{collection.description}</p>
                      <span>
                        {collection.count} <Icon name="chevron" size={17} />
                      </span>
                    </button>
                  ))}
                </div>
                <SectionEntries
                  language={language}
                  type={t.hadith}
                  onSelect={(name) => setSelectedHadith(name)}
                />
              </>
            ) : (
              <DetailView
                type={t.hadith}
                title={selectedHadith}
                onBack={() => setSelectedHadith(null)}
                language={language}
                metadata={[
                  [t.collection, t.placeholderCollection],
                  [t.book, t.sampleChapter],
                  [t.reference, `${t.demo} 1:1`],
                  [t.grade, t.notAssessed],
                ]}
              />
            )}
          </section>
        )}

        {page === "ai" && (
          <section className="page narrow-page">
            <button className="back-button" onClick={() => navigate("keyword")}>
              <Icon name="arrow" size={18} /> {t.searchOptions}
            </button>
            <div className="development-card">
              <span className="development-icon">
                <Icon name="sparkles" size={28} />
              </span>
              <Tag>{t.inDevelopment}</Tag>
              <h1>{t.aiTitle}</h1>
              <p>{t.aiCopy}</p>
              <div className="development-rule" />
              <small>{t.aiNote}</small>
            </div>
          </section>
        )}

        {page === "keyword" && (
          <section className="page">
            <PageIntro eyebrow={t.keywordSearch} title={t.keywordTitle}>
              {t.keywordIntro}
            </PageIntro>
            <form className="search-panel" onSubmit={runSearch}>
              <label htmlFor="reference-search">{t.searchTerm}</label>
              <div className="search-row">
                <Icon name="search" size={21} />
                <input
                  id="reference-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.searchPlaceholder}
                />
                <button type="submit">{t.search}</button>
              </div>
              <fieldset>
                <legend>{t.searchWithin}</legend>
                <div className="filter-list">
                  {t.sourceFilters.map((option, index) => (
                    <label
                      className={filterIndex === index ? "selected" : ""}
                      key={option}
                    >
                      <input
                        type="radio"
                        name="source-filter"
                        checked={filterIndex === index}
                        onChange={() => setFilterIndex(index)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </fieldset>
            </form>
            <div className="results-heading">
              <div>
                <p className="eyebrow">{t.demoResults}</p>
                <h2>
                  {t.resultsFor} “{submittedQuery || t.defaultQuery}”
                </h2>
              </div>
              <span>
                {t.searchResults.length} {t.placeholders} · {t.sourceFilters[filterIndex]}
              </span>
            </div>
            <div className="results-list">
              {t.searchResults.map(({ source, meta, copy }) => (
                <article key={source}>
                  <Tag>{source}</Tag>
                  <div>
                    <small>{meta}</small>
                    <p>[{copy}]</p>
                  </div>
                  <button aria-label={`${t.openResult}: ${source}`}>
                    <Icon name="chevron" size={19} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {page === "zakat" && (
          <ZakatCalculator copy={t} language={language} onBack={() => navigate("home")} />
        )}

        {page === "date-converter" && (
          <DateConverter copy={t} onBack={() => navigate("home")} />
        )}

        {page === "ramadan-calendar" && (
          <RamadanCalendar copy={t} onBack={() => navigate("home")} />
        )}

        {page === "event-countdown" && (
          <EventCountdown copy={t} onBack={() => navigate("home")} />
        )}
      </main>

      <footer>
        <button onClick={() => navigate("home")}>MH</button>
        <p>{t.footer}</p>
        <span>{t.prototype} · 2025</span>
      </footer>
    </div>
  )
}

function SectionEntries({
  type,
  language,
  onSelect,
}: {
  type: string
  language: Language
  onSelect: (name: string) => void
}) {
  const t = translations[language]

  return (
    <section className="recent-section">
      <div className="section-title">
        <p className="eyebrow">{t.sampleIndex}</p>
        <h2>{t.individualEntries}</h2>
      </div>
      <div className="entry-list">
        {[1, 2, 3].map((number) => (
          <button
            key={number}
            onClick={() =>
              onSelect(
                `${t.sampleNarration} ${String(number).padStart(2, "0")}`,
              )
            }
          >
            <Tag>{type}</Tag>
            <span>
              <strong>
                {t.sampleNarration} {String(number).padStart(2, "0")}
              </strong>
              <small>
                {t.placeholderCollection} · {t.book} {number} · {t.demo}{" "}
                {number}:1
              </small>
            </span>
            <Icon name="chevron" size={18} />
          </button>
        ))}
      </div>
    </section>
  )
}

function DetailView({
  type,
  title,
  onBack,
  metadata,
  language,
}: {
  type: string
  title: string
  onBack: () => void
  metadata: string[][]
  language: Language
}) {
  const t = translations[language]

  return (
    <article className="detail-view">
      <button className="back-button" onClick={onBack}>
        <Icon name="arrow" size={18} /> {t.backTo} {type}
      </button>
      <header>
        <Tag>
          {type} · {t.placeholder}
        </Tag>
        <h1>{title}</h1>
        <p>{t.detailIntro}</p>
      </header>
      <PlaceholderNotice language={language} />
      <div className="detail-layout">
        <div className="detail-passage">
          <p className="eyebrow">{t.entryText}</p>
          <blockquote>{t.detailPassage}</blockquote>
          <p className="detail-note">{t.detailNote}</p>
        </div>
        <aside>
          <p className="eyebrow">{t.sourceDetails}</p>
          <dl>
            {metadata.map(([term, description]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </article>
  )
}

type SupportedCopy = typeof translations[Language]

function ToolHeader({
  copy,
  title,
  intro,
  onBack,
}: {
  copy: SupportedCopy
  title: string
  intro: string
  onBack: () => void
}) {
  return (
    <>
      <button className="back-button" onClick={onBack}>
        <Icon name="arrow" size={18} /> {copy.islamicTools}
      </button>
      <PageIntro eyebrow={copy.islamicTools} title={title}>
        {intro}
      </PageIntro>
    </>
  )
}

function PendingValue({ label, copy }: { label: string, copy: SupportedCopy }) {
  return (
    <div className="tool-result">
      <span>{label}</span>
      <strong>{copy.calculationPending}</strong>
    </div>
  )
}

function ZakatValue({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="tool-result">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  )
}

function ZakatCalculator({
  copy,
  language,
  onBack,
}: {
  copy: SupportedCopy
  language: Language
  onBack: () => void
}) {
  const locale = language === "ru" ? "ru-RU" : "en-US"
  const money = (value: number) =>
    `${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)} ₽`
  const formatDate = (iso: string) => {
    const [year, month, day] = iso.split("-")
    return `${day}.${month}.${year}`
  }

  const [fields, setFields] = useState({
    cash: "",
    goldGrams: "",
    silverGrams: "",
    otherAssets: "",
    debts: "",
    deductions: "",
  })
  const [prices, setPrices] = useState({
    gold: String(PRICE_SNAPSHOT.goldPerGram),
    silver: String(PRICE_SNAPSHOT.silverPerGram),
  })
  const [priceInfo, setPriceInfo] = useState<MetalPrices>(PRICE_SNAPSHOT)
  const [pricesEdited, setPricesEdited] = useState(false)
  const pricesEditedRef = useRef(false)
  const [standard, setStandard] = useState<NisabStandard>("gold")
  const [hawlComplete, setHawlComplete] = useState(true)

  // Try to refresh the prices from the Bank of Russia; never overwrite prices the user typed.
  useEffect(() => {
    let cancelled = false
    loadMetalPrices().then((loaded) => {
      if (cancelled) return
      setPriceInfo(loaded)
      if (!pricesEditedRef.current) {
        setPrices({
          gold: String(loaded.goldPerGram),
          silver: String(loaded.silverPerGram),
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const toNumber = (value: string) => {
    const parsed = Number(value.replace(",", "."))
    return Number.isFinite(parsed) ? parsed : 0
  }

  const result = calculateZakat({
    cash: toNumber(fields.cash),
    goldGrams: toNumber(fields.goldGrams),
    silverGrams: toNumber(fields.silverGrams),
    otherAssets: toNumber(fields.otherAssets),
    debts: toNumber(fields.debts),
    deductions: toNumber(fields.deductions),
    goldPerGram: toNumber(prices.gold),
    silverPerGram: toNumber(prices.silver),
    standard,
    hawlComplete,
  })

  const updateField = (field: keyof typeof fields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }))
  }

  const updatePrice = (metal: "gold" | "silver", value: string) => {
    pricesEditedRef.current = true
    setPricesEdited(true)
    setPrices((current) => ({ ...current, [metal]: value }))
  }

  const priceNote = pricesEdited
    ? copy.zkPriceEdited
    : (priceInfo.source === "cbr-live" ? copy.zkPriceLive : copy.zkPriceSnapshot).replace(
        "{date}",
        formatDate(priceInfo.date),
      )

  const status =
    result.status === "below-nisab"
      ? copy.zkStatusBelow
      : result.status === "waiting-hawl"
        ? copy.zkStatusWaiting.replace("{amount}", money(result.zakatIfHawlComplete))
        : copy.zkStatusDue

  const comparison =
    result.nisabValue > 0
      ? (result.difference >= 0 ? copy.zkAbove : copy.zkBelow).replace(
          "{amount}",
          money(Math.abs(result.difference)),
        )
      : undefined

  return (
    <section className="page tool-page">
      <ToolHeader
        copy={copy}
        title={copy.zakatCalculator}
        intro={copy.zakatIntro}
        onBack={onBack}
      />
      <div className="tool-layout">
        <div className="tool-panel">
          <p className="eyebrow">{copy.assets}</p>
          <div className="tool-field-grid">
            {([
              ["cash", copy.zkCash],
              ["goldGrams", copy.zkGold],
              ["silverGrams", copy.zkSilver],
              ["otherAssets", copy.zkOther],
              ["debts", copy.zkDebts],
              ["deductions", copy.zkDeductions],
            ] as [keyof typeof fields, string][]).map(([field, label]) => (
              <label className="tool-field" key={field}>
                <span>{label}</span>
                <input
                  inputMode="decimal"
                  min="0"
                  placeholder={copy.amountPlaceholder}
                  type="number"
                  value={fields[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                />
              </label>
            ))}
          </div>
          <p className="zakat-hint">{copy.zkWeightHint}</p>

          <div className="zakat-section">
            <p className="eyebrow">{copy.zkPricesTitle}</p>
            <div className="tool-field-grid">
              {([
                ["gold", copy.zkGoldPrice],
                ["silver", copy.zkSilverPrice],
              ] as ["gold" | "silver", string][]).map(([metal, label]) => (
                <label className="tool-field" key={metal}>
                  <span>{label}</span>
                  <input
                    inputMode="decimal"
                    min="0"
                    type="number"
                    value={prices[metal]}
                    onChange={(event) => updatePrice(metal, event.target.value)}
                  />
                </label>
              ))}
            </div>
            <p className="zakat-hint">{priceNote}</p>
          </div>

          <div className="zakat-section">
            <fieldset className="tool-choice-fieldset">
              <legend>{copy.zkStandardLegend}</legend>
              <div className="tool-choice-list">
                {([
                  ["gold", copy.zkStdGold],
                  ["silver", copy.zkStdSilver],
                ] as [NisabStandard, string][]).map(([value, label]) => (
                  <label className={standard === value ? "selected" : ""} key={value}>
                    <input
                      checked={standard === value}
                      name="zakat-standard"
                      onChange={() => setStandard(value)}
                      type="radio"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="zakat-section">
            <fieldset className="tool-choice-fieldset">
              <legend>{copy.zkHawlLegend}</legend>
              <div className="tool-choice-list">
                {([
                  [true, copy.zkHawlYes],
                  [false, copy.zkHawlNo],
                ] as [boolean, string][]).map(([value, label]) => (
                  <label className={hawlComplete === value ? "selected" : ""} key={String(value)}>
                    <input
                      checked={hawlComplete === value}
                      name="zakat-hawl"
                      onChange={() => setHawlComplete(value)}
                      type="radio"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
        <aside className="tool-summary">
          <ZakatValue label={copy.zkTotalAssets} value={money(result.totalAssets)} />
          <ZakatValue label={copy.zkDeductionsTotal} value={money(result.totalDeductions)} />
          <ZakatValue label={copy.zkNetWealth} value={money(result.netWealth)} />
          <ZakatValue
            label={`${copy.zkNisab} · ${result.nisabGrams} ${language === "ru" ? "г" : "g"}`}
            value={money(result.nisabValue)}
            hint={comparison ?? (standard === "gold" ? copy.zkNisabHintGold : copy.zkNisabHintSilver)}
          />
          <ZakatValue label={copy.zkZakat} value={money(result.zakatDue)} hint={status} />
          <p>{copy.zkNotice}</p>
        </aside>
      </div>
    </section>
  )
}

function DateConverter({
  copy,
  onBack,
}: {
  copy: SupportedCopy
  onBack: () => void
}) {
  const [direction, setDirection] = useState<"hijri" | "gregorian">("hijri")
  const [date, setDate] = useState({ day: "", month: "", year: "" })

  return (
    <section className="page tool-page narrow-tool-page">
      <ToolHeader
        copy={copy}
        title={copy.dateConverter}
        intro={copy.converterIntro}
        onBack={onBack}
      />
      <form
        className="tool-panel converter-panel"
        onSubmit={(event) => event.preventDefault()}
      >
        <fieldset className="tool-choice-fieldset">
          <legend>{copy.conversionDirection}</legend>
          <div className="tool-choice-list">
            {[
              ["hijri", copy.hijriToGregorian],
              ["gregorian", copy.gregorianToHijri],
            ].map(([value, label]) => (
              <label
                className={direction === value ? "selected" : ""}
                key={value}
              >
                <input
                  checked={direction === value}
                  name="conversion-direction"
                  onChange={() => setDirection(value as "hijri" | "gregorian")}
                  type="radio"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="date-field-grid">
          {(["day", "month", "year"] as const).map((field) => (
            <label className="tool-field" key={field}>
              <span>{copy[field]}</span>
              <input
                inputMode="numeric"
                min="1"
                type="number"
                value={date[field]}
                onChange={(event) =>
                  setDate((current) => ({
                    ...current,
                    [field]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>
        <button className="primary-button tool-submit" type="submit">
          {copy.convert} <Icon name="chevron" size={17} />
        </button>
      </form>
      <div className="conversion-result">
        <span>{copy.conversionResult}</span>
        <strong>{copy.conversionPending}</strong>
        <p>{copy.dataSourceNotice}</p>
      </div>
    </section>
  )
}

function RamadanCalendar({
  copy,
  onBack,
}: {
  copy: SupportedCopy
  onBack: () => void
}) {
  const calendarRows: {
    ramadanDay: number
    gregorianDate: string
    hijriDate: string
    notes?: string
  }[] = []

  return (
    <section className="page tool-page">
      <ToolHeader
        copy={copy}
        title={copy.ramadanCalendar}
        intro={copy.ramadanIntro}
        onBack={onBack}
      />
      <div className="calendar-table">
        <div className="calendar-row calendar-header">
          <span>{copy.ramadanDay}</span>
          <span>{copy.gregorianDate}</span>
          <span>{copy.hijriDateLabel}</span>
          <span>{copy.notes}</span>
        </div>
        {calendarRows.length > 0 ? (
          calendarRows.map((row) => (
            <div className="calendar-row" key={row.ramadanDay}>
              <span>{row.ramadanDay}</span>
              <span>{row.gregorianDate}</span>
              <span>{row.hijriDate}</span>
              <span>{row.notes || "—"}</span>
            </div>
          ))
        ) : (
          <div className="tool-empty-state">
            <Icon name="book" size={25} />
            <strong>{copy.calendarPending}</strong>
            <p>{copy.dataSourceNotice}</p>
          </div>
        )}
      </div>
    </section>
  )
}

function EventCountdown({
  copy,
  onBack,
}: {
  copy: SupportedCopy
  onBack: () => void
}) {
  const events = [
    { id: "ramadan", name: copy.ramadan, date: null, countdown: null },
    { id: "eid-fitr", name: copy.eidFitr, date: null, countdown: null },
    { id: "eid-adha", name: copy.eidAdha, date: null, countdown: null },
  ]

  return (
    <section className="page tool-page">
      <ToolHeader
        copy={copy}
        title={copy.eventCountdown}
        intro={copy.countdownIntro}
        onBack={onBack}
      />
      <div className="event-grid">
        {events.map((event) => (
          <article className="event-card" key={event.id}>
            <Tag>{copy.eventPending}</Tag>
            <h2>{event.name}</h2>
            <dl>
              <div>
                <dt>{copy.eventDate}</dt>
                <dd>{event.date || copy.eventPending}</dd>
              </div>
              <div>
                <dt>{copy.countdown}</dt>
                <dd>{event.countdown || copy.eventPending}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <p className="tool-data-note">{copy.dataSourceNotice}</p>
    </section>
  )
}

export default App
