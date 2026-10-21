
/* =========================================================
   WORDROSI ENGLISH LEARNING — COMPLETE APP.JS
   Online Articles + Word Dictionary + Sentence Translation
   Vanilla JavaScript | Free public APIs
========================================================= */

"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const KEYS = {
  bookmarks: "wordwise_bookmarks",
  history: "wordwise_reading_history",
  words: "wordwise_words",
  notes: "wordwise_notes",
  highlights: "wordwise_highlights"
};

const CATEGORIES = [
  "All", "Stories", "News", "Technology", "Education",
  "Health", "Lifestyle", "Science", "Travel",
  "Business", "Culture", "Learning"
];

const samples = [
  {
    id: "s1",
    title: "The Little Seed",
    category: "Stories",
    publisher: "WordRosi Original",
    date: "2026-10-01",
    minutes: 3,
    image: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1000&q=80",
    summary: "A story about patience, growth and small beginnings.",
    body: `A little seed rested beneath the soil. It could not see the sun, and it wondered whether it would ever become anything more than a seed.

Rain came softly. The earth grew warm. Slowly, the seed opened and sent a tiny root down and a green shoot up. It met stones and strong winds, but it continued to grow.

One morning, a small plant stood in the sunlight. The seed understood that growth often happens quietly, long before anyone can see it.

Lesson: Small, steady steps can lead to wonderful changes.`
  },
  {
    id: "s2",
    title: "Why Sleep Helps Us Learn",
    category: "Science",
    publisher: "WordRosi Original",
    date: "2026-10-02",
    minutes: 3,
    image: "https://images.unsplash.com/photo-1511295742362-92c96b8d3d3b?auto=format&fit=crop&w=1000&q=80",
    summary: "Discover how sleep supports memory and concentration.",
    body: `Sleep is not simply a break from the day. While we sleep, the brain works on organising information gathered during waking hours. This process can help people remember new words, facts and skills.

A regular sleep schedule may also support attention and mood. Students often learn better when they combine focused practice with enough rest.

Try reviewing new vocabulary, taking a break, and returning to it the next day.`
  },
  {
    id: "s3",
    title: "A Community Garden Brings People Together",
    category: "Lifestyle",
    publisher: "WordRosi Original",
    date: "2026-10-03",
    minutes: 3,
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1000&q=80",
    summary: "Neighbours share space, skills and fresh vegetables.",
    body: `Neighbours created a small community garden on an unused piece of land. Some brought seeds, others shared tools, and children helped water the plants.

The garden became more than a place to grow vegetables. People exchanged recipes, practised new skills and got to know their neighbours.

A small idea can grow when many people contribute.`
  },
  {
    id: "s4",
    title: "How the Internet Helps People Share Ideas",
    category: "Technology",
    publisher: "WordRosi Original",
    date: "2026-10-04",
    minutes: 3,
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80",
    summary: "Online tools help people learn and collaborate.",
    body: `The internet allows people to share information almost instantly. Students can attend online lessons, teams can work on shared documents, and communities can publish local updates.

However, not every online claim is accurate. Readers should check the source, compare reliable reports and look for the date of publication.

Used thoughtfully, digital tools can make learning and communication easier.`
  }
];

let articles = [...samples];
let currentArticle = null;
let activeCategory = "All";
let searchTerm = "";
let onlineLoaded = false;

const dictionaryCache = new Map();
const translationCache = new Map();
const pendingTranslations = new Map();

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeURL(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol)
      ? url.href : "";
  } catch {
    return "";
  }
}

function getStore(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Unable to save local data:", error);
  }
}

function dateLabel(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function estimateMinutes(text = "") {
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
}

function setStatus(message) {
  const element = $("#status");
  if (element) element.textContent = message;
}

function setVisible(selector, visible) {
  const element = $(selector);
  if (element) element.classList.toggle("hidden", !visible);
}

/* =========================================================
   1. ONLINE ARTICLES
========================================================= */

const wikiTopics = [
  { category: "Science", query: "science discovery" },
  { category: "Education", query: "education learning" },
  { category: "Health", query: "human health" },
  { category: "Lifestyle", query: "healthy lifestyle" },
  { category: "Travel", query: "world travel destinations" },
  { category: "Business", query: "business economics" },
  { category: "Culture", query: "world culture" },
  { category: "Learning", query: "English language learning" },
  { category: "Stories", query: "folklore short stories" }
];

async function fetchWikipedia(topic) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: topic.query,
    gsrnamespace: "0",
    gsrlimit: "8",
    prop: "extracts|pageimages|info",
    exintro: "1",
    explaintext: "1",
    exsentences: "10",
    piprop: "thumbnail",
    pithumbsize: "900",
    inprop: "url"
  });

  const response = await fetch(
    "https://en.wikipedia.org/w/api.php?" + params
  );

  if (!response.ok) throw new Error("Wikipedia unavailable");

  const data = await response.json();

  return Object.values(data.query?.pages || {})
    .filter(page => page.title && page.extract)
    .map(page => ({
      id: "wiki-" + page.pageid,
      title: page.title,
      category: topic.category,
      publisher: "Wikipedia",
      date: "",
      minutes: estimateMinutes(page.extract),
      image: safeURL(page.thumbnail?.source || ""),
      summary: page.extract.slice(0, 240),
      body: page.extract,
      sourceUrl: safeURL(page.fullurl) ||
        "https://en.wikipedia.org/?curid=" + page.pageid,
      contentType: "reference"
    }));
}

async function fetchHackerNews(query = "technology") {
  const params = new URLSearchParams({
    query,
    tags: "story",
    hitsPerPage: "15"
  });

  const response = await fetch(
    "https://hn.algolia.com/api/v1/search_by_date?" + params
  );

  if (!response.ok) throw new Error("Hacker News unavailable");

  const data = await response.json();

  return (data.hits || [])
    .filter(item => item.title && item.url)
    .map(item => ({
      id: "hn-" + item.objectID,
      title: item.title,
      category: "Technology",
      publisher: "Hacker News",
      date: item.created_at || "",
      minutes: 3,
      image: "",
      summary: "Open the original publisher to read this article.",
      body: "This article is hosted by its original publisher.\n\nUse the original source link to read the complete article.",
      sourceUrl: safeURL(item.url),
      contentType: "external"
    }));
}

async function loadOnlineArticles() {
  const button = $("#refreshBtn");

  if (button) button.disabled = true;
  setStatus("Loading articles from online sources...");

  try {
    const tasks = [
      ...wikiTopics.map(topic => fetchWikipedia(topic)),
      fetchHackerNews("technology"),
      fetchHackerNews("science"),
      fetchHackerNews("education")
    ];

    const results = await Promise.allSettled(tasks);

    const online = results
      .filter(result => result.status === "fulfilled")
      .flatMap(result => result.value);

    const unique = new Map();

    for (const article of online) {
      const key = (article.sourceUrl || article.title).toLowerCase();
      if (key && !unique.has(key)) unique.set(key, article);
    }

    if (unique.size) {
      articles = [...unique.values(), ...samples];
      onlineLoaded = true;
      setStatus(`${unique.size} online articles loaded.`);
    } else {
      articles = [...samples];
      onlineLoaded = false;
      setStatus("Online sources unavailable. Showing sample articles.");
    }
  } catch (error) {
    console.error(error);
    articles = [...samples];
    onlineLoaded = false;
    setStatus("Connection failed. Showing sample articles.");
  } finally {
    if (button) button.disabled = false;
    renderCards();
  }
}

/* =========================================================
   2. SEARCH AND CATEGORY FILTER
========================================================= */

function initialiseCategories() {
  const select = $("#category");
  if (!select) return;

  if (!select.options.length) {
    select.innerHTML = CATEGORIES.map(category => `
      <option value="${category === "All" ? "all" : esc(category)}">
        ${esc(category)}
      </option>
    `).join("");
  }
}

function filteredArticles() {
  const query = searchTerm.trim().toLowerCase();

  return articles.filter(article => {
    const categoryMatch =
      activeCategory === "All" ||
      activeCategory.toLowerCase() === "all" ||
      article.category.toLowerCase() === activeCategory.toLowerCase();

    const content = [
      article.title,
      article.summary,
      article.category,
      article.publisher
    ].join(" ").toLowerCase();

    return categoryMatch && (!query || content.includes(query));
  });
}

function isBookmarked(id) {
  return getStore(KEYS.bookmarks, [])
    .some(item => String(item.id) === String(id));
}

function renderCards() {
  const grid = $("#articleGrid");
  if (!grid) return;

  const list = filteredArticles();

  if (!list.length) {
    grid.innerHTML = '<p class="empty">No matching articles found.</p>';
    return;
  }

  grid.innerHTML = list.map(article => `
    <article class="article-card">
      ${article.image ? `
        <img src="${esc(article.image)}"
          alt="${esc(article.title)}"
          loading="lazy"
          onerror="this.style.display='none'">
      ` : ""}

      <div class="card-content">
        <span class="tag">${esc(article.category)}</span>
        <h3>${esc(article.title)}</h3>
        <p>${esc(article.summary || "")}</p>

        <div class="meta">
          <span>${esc(article.publisher || "Online source")}</span>
          <span>${esc(dateLabel(article.date))}</span>
          <span>${article.minutes || 3} min read</span>
        </div>

        <button type="button" data-open="${esc(article.id)}">
          Read article
        </button>

        <button type="button" class="secondary"
          data-bookmark="${esc(article.id)}">
          ${isBookmarked(article.id) ? "★ Saved" : "☆ Bookmark"}
        </button>
      </div>
    </article>
  `).join("");
}

/* =========================================================
   3. SENTENCE SPLITTER
========================================================= */

function splitSentences(text) {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("en", {
      granularity: "sentence"
    });

    return [...segmenter.segment(text)]
      .map(item => item.segment.trim())
      .filter(Boolean);
  }

  return (text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) || [text])
    .map(item => item.trim())
    .filter(Boolean);
}

/* =========================================================
   4. CLICKABLE WORDS + TRANSLATE BUTTON PER SENTENCE
========================================================= */

function renderClickableSentence(sentence, sentenceIndex) {
  const tokens = sentence.match(
    /[A-Za-z]+(?:['’][A-Za-z]+)*|\d+(?:[.,]\d+)*|[^\w\s]+|\s+/g
  ) || [sentence];

  const wordsHTML = tokens.map(token => {
    if (/^[A-Za-z]+(?:['’][A-Za-z]+)*$/.test(token)) {
      return `
        <button type="button"
          class="word-chip"
          data-word="${esc(token)}"
          title="Click to see word details"
          aria-label="Look up ${esc(token)}">
          ${esc(token)}
        </button>`;
    }

    return esc(token);
  }).join("");

  const safeSentence = esc(sentence);

  return `
    <span class="sentence-unit" data-sentence-index="${sentenceIndex}">
      <span class="sentence-text">${wordsHTML}</span>
      <button type="button"
        class="translate-btn secondary"
        data-translate="${sentenceIndex}"
        aria-expanded="false">
        বাংলা অনুবাদ
      </button>
      <span class="translation-result hidden"
        aria-live="polite"></span>
    </span>
  `;
}

function renderReadingText(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .filter(paragraph => paragraph.trim())
    .map(paragraph => {
      const sentences = splitSentences(paragraph);

      return `
        <p class="reading-paragraph">
          ${sentences.map((sentence, index) =>
            renderClickableSentence(sentence, index)
          ).join(" ")}
        </p>`;
    }).join("");
}

/* =========================================================
   5. TRANSLATE EACH SENTENCE TO BANGLA
========================================================= */

async function translateSentence(sentence) {
  if (translationCache.has(sentence)) {
    return translationCache.get(sentence);
  }

  if (pendingTranslations.has(sentence)) {
    return pendingTranslations.get(sentence);
  }

  const request = (async () => {
    const params = new URLSearchParams({
      q: sentence,
      langpair: "en|bn"
    });

    const response = await fetch(
      "https://api.mymemory.translated.net/get?" + params
    );

    if (!response.ok) {
      throw new Error("Translation service unavailable");
    }

    const data = await response.json();
    const translated = data.responseData?.translatedText;

    if (!translated ||
        (data.responseStatus && data.responseStatus !== 200)) {
      throw new Error("No translation returned");
    }

    translationCache.set(sentence, translated);
    return translated;
  })();

  pendingTranslations.set(sentence, request);

  try {
    return await request;
  } finally {
    pendingTranslations.delete(sentence);
  }
}

/* =========================================================
   6. ONLINE DICTIONARY
========================================================= */

async function getDictionaryEntry(word) {
  const key = word.toLowerCase();

  if (dictionaryCache.has(key)) {
    return dictionaryCache.get(key);
  }

  const response = await fetch(
    "https://api.dictionaryapi.dev/api/v2/entries/en/" +
    encodeURIComponent(word)
  );

  if (!response.ok) {
    throw new Error("Dictionary entry unavailable");
  }

  const data = await response.json();
  const entry = data[0];

  if (!entry) throw new Error("No entry found");

  dictionaryCache.set(key, entry);
  return entry;
}

function ensureDictionaryDialog() {
  if ($("#wordDialog")) return;

  document.body.insertAdjacentHTML("beforeend", `
    <div id="wordDialog" class="word-dialog hidden"
      role="dialog" aria-modal="true" aria-labelledby="dictWord">

      <div class="word-dialog-card">
        <button type="button" id="closeWordDialog"
          class="dialog-close" aria-label="Close">×</button>

        <div class="dict-eyebrow">WORDROSI DICTIONARY</div>
        <h2 id="dictWord">Word</h2>
        <p id="dictPronunciation"></p>

        <section class="dict-bangla">
          <strong>বাংলা অর্থ</strong>
          <p id="dictBangla">অর্থ খোঁজা হচ্ছে...</p>
        </section>

        <section id="dictDefinitions">
          English definitions will appear here.
        </section>

        <button type="button" id="dictSpeak">🔊 উচ্চারণ শুনুন</button>
        <button type="button" id="dictSave">＋ Notebook-এ রাখুন</button>

        <p class="dict-footnote">
          Dictionary: dictionaryapi.dev. বাংলা অর্থের জন্য অনলাইন
          অনুবাদ ব্যবহৃত হয়।
        </p>
      </div>
    </div>
  `);

  $("#closeWordDialog").onclick = () => {
    $("#wordDialog").classList.add("hidden");
  };

  $("#wordDialog").addEventListener("click", event => {
    if (event.target.id === "wordDialog") {
      $("#wordDialog").classList.add("hidden");
    }
  });

  $("#dictSpeak").onclick = () => {
    const word = $("#dictWord").textContent;

    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      speechSynthesis.speak(new SpeechSynthesisUtterance(word));
    }
  };

  $("#dictSave").onclick = saveCurrentDictionaryWord;
}

async function lookupWord(word) {
  ensureDictionaryDialog();

  const dialog = $("#wordDialog");
  dialog.classList.remove("hidden");

  $("#dictWord").textContent = word;
  $("#dictPronunciation").textContent = "উচ্চারণ খোঁজা হচ্ছে...";
  $("#dictBangla").textContent = "বাংলা অর্থ খোঁজা হচ্ছে...";
  $("#dictDefinitions").textContent = "English definition loading...";
  $("#dictSave").textContent = "＋ Notebook-এ রাখুন";

  try {
    const entry = await getDictionaryEntry(word);

    const phonetic =
      entry.phonetic ||
      entry.phonetics?.find(item => item.text)?.text ||
      "উচ্চারণের তথ্য পাওয়া যায়নি";

    $("#dictPronunciation").textContent = "Pronunciation: " + phonetic;

    const meanings = (entry.meanings || []).slice(0, 5);

    const definitionText = meanings.map(meaning =>
      `${meaning.partOfSpeech}: ${(meaning.definitions || [])
        .slice(0, 2)
        .map(definition => definition.definition)
        .join("; ")}`
    ).join("\n");

    let bangla = "বাংলা অর্থ পাওয়া যায়নি";

    try {
      bangla = await translateSentence(
        definitionText || word
      );
    } catch {}

    $("#dictBangla").textContent = bangla;

    $("#dictDefinitions").innerHTML = meanings.map(meaning => `
      <section class="dict-meaning">
        <strong>${esc(meaning.partOfSpeech)}</strong>
        ${(meaning.definitions || []).slice(0, 3).map(definition => `
          <p>${esc(definition.definition)}</p>
          ${definition.example ? `
            <p class="dict-example">
              Example: “${esc(definition.example)}”
            </p>
          ` : ""}
        `).join("")}
      </section>
    `).join("") || "<p>কোনো সংজ্ঞা পাওয়া যায়নি।</p>";

  } catch (error) {
    console.error(error);

    $("#dictPronunciation").textContent = "";
    $("#dictBangla").textContent =
      "ইন্টারনেট সংযোগ বা অভিধানের তথ্য পাওয়া যায়নি।";
    $("#dictDefinitions").textContent =
      "এই শব্দের বিস্তারিত পরে আবার চেষ্টা করো।";
  }
}

function saveCurrentDictionaryWord() {
  const word = $("#dictWord")?.textContent;
  const meaning = $("#dictBangla")?.textContent || "";

  if (!word) return;

  const words = getStore(KEYS.words, []);

  if (!words.some(item =>
    item.word.toLowerCase() === word.toLowerCase()
  )) {
    words.unshift({
      word,
      meaning,
      article: currentArticle?.title || "",
      created: new Date().toISOString()
    });

    saveStore(KEYS.words, words);
    renderNotebook();
  }

  $("#dictSave").textContent = "✓ Notebook-এ সংরক্ষিত";
}

/* =========================================================
   7. ARTICLE READER
========================================================= */

function trackArticleRead(article) {
  const history = getStore(KEYS.history, {});
  const today = new Date().toLocaleDateString("en-CA");

  if (!history[today]) history[today] = [];

  if (!history[today].some(item =>
    String(item.id) === String(article.id)
  )) {
    history[today].push({
      id: String(article.id),
      title: article.title,
      readAt: new Date().toISOString()
    });
  }

  saveStore(KEYS.history, history);
}

function openArticle(id) {
  const article = articles.find(
    item => String(item.id) === String(id)
  );

  if (!article) return;

  currentArticle = article;
  trackArticleRead(article);

  const body = $("#articleBody");

  if (!body) {
    if (article.sourceUrl) {
      window.open(article.sourceUrl, "_blank", "noopener");
    }
    return;
  }

  body.innerHTML = `
    ${article.image ? `
      <img class="cover"
        src="${esc(article.image)}"
        alt="${esc(article.title)}"
        onerror="this.style.display='none'">
    ` : ""}

    <span class="tag">${esc(article.category)}</span>
    <h1>${esc(article.title)}</h1>

    <div class="article-meta">
      Publisher: ${esc(article.publisher || "Unknown")}
      · Published: ${esc(dateLabel(article.date))}
      · ${article.minutes || 3} min read
    </div>

    <p class="article-summary">
      <strong>${esc(article.summary || "")}</strong>
    </p>

    <div class="article-text">
      ${renderReadingText(article.body || article.summary || "")}
    </div>

    ${article.sourceUrl ? `
      <p class="source-link">
        <a href="${esc(article.sourceUrl)}"
          target="_blank" rel="noopener noreferrer">
          Read original source ↗
        </a>
      </p>
    ` : ""}

    <div class="reading-tools">
      <button type="button" id="saveCurrentBtn">☆ Bookmark</button>
      <button type="button" id="speakBtn">🔊 Read aloud</button>
      <button type="button" id="stopSpeakBtn">Stop audio</button>
    </div>
  `;

  setVisible("#library", false);
  setVisible("#reader", true);

  $("#saveCurrentBtn")?.addEventListener("click", () => {
    toggleBookmark(article);
  });

  $("#speakBtn")?.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) return;

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      article.title + ". " + (article.body || article.summary || "")
    );

    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  });

  $("#stopSpeakBtn")?.addEventListener("click", () => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  });

  renderDashboard();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeArticle() {
  setVisible("#reader", false);
  setVisible("#library", true);

  if ("speechSynthesis" in window) speechSynthesis.cancel();

  currentArticle = null;
}

/* =========================================================
   8. READING CLICK HANDLER
========================================================= */

document.addEventListener("click", async event => {
  // Click any English word to open dictionary.
  const wordButton = event.target.closest("[data-word]");

  if (wordButton) {
    lookupWord(wordButton.dataset.word);
    return;
  }

  // Click sentence translation button.
  const translateButton = event.target.closest("[data-translate]");

  if (translateButton) {
    const unit = translateButton.closest(".sentence-unit");
    const result = unit?.querySelector(".translation-result");

    if (!unit || !result) return;

    // Toggle already-loaded translation.
    if (result.dataset.loaded === "true") {
      const willShow = result.classList.contains("hidden");

      result.classList.toggle("hidden", !willShow);
      translateButton.setAttribute("aria-expanded", String(willShow));
      translateButton.textContent =
        willShow ? "অনুবাদ লুকাও" : "বাংলা অনুবাদ";

      return;
    }

    if (translateButton.disabled) return;

    const sentence = unit.querySelector(".sentence-text")?.textContent;

    if (!sentence) return;

    translateButton.disabled = true;
    translateButton.textContent = "অনুবাদ হচ্ছে...";
    result.classList.remove("hidden");
    result.textContent = "বাংলা অনুবাদ আনা হচ্ছে...";

    try {
      const translated = await translateSentence(sentence);

      result.textContent = translated;
      result.dataset.loaded = "true";

      translateButton.textContent = "অনুবাদ লুকাও";
      translateButton.setAttribute("aria-expanded", "true");

    } catch (error) {
      result.textContent =
        "অনুবাদ পাওয়া যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করো.";

      translateButton.textContent = "আবার চেষ্টা করো";
      translateButton.setAttribute("aria-expanded", "true");
    } finally {
      translateButton.disabled = false;
    }

    return;
  }

  const openButton = event.target.closest("[data-open]");

  if (openButton) {
    openArticle(openButton.dataset.open);
    return;
  }

  const bookmarkButton = event.target.closest("[data-bookmark]");

  if (bookmarkButton) {
    const article = articles.find(
      item => String(item.id) === bookmarkButton.dataset.bookmark
    );

    if (article) toggleBookmark(article);
    return;
  }

  const removeBookmark = event.target.closest("[data-remove-bookmark]");

  if (removeBookmark) {
    const id = removeBookmark.dataset.removeBookmark;

    saveStore(
      KEYS.bookmarks,
      getStore(KEYS.bookmarks, [])
        .filter(item => String(item.id) !== String(id))
    );

    renderCards();
    renderBookmarks();
    return;
  }

  const deleteWord = event.target.closest("[data-delete-word]");

  if (deleteWord) {
    const words = getStore(KEYS.words, []);
    words.splice(Number(deleteWord.dataset.deleteWord), 1);
    saveStore(KEYS.words, words);
    renderNotebook();
    return;
  }

  const deleteNote = event.target.closest("[data-delete-note]");

  if (deleteNote) {
    const notes = getStore(KEYS.notes, []);
    notes.splice(Number(deleteNote.dataset.deleteNote), 1);
    saveStore(KEYS.notes, notes);
    renderNotebook();
    return;
  }

  const saveLookup = event.target.closest("[data-save-lookup]");

  if (saveLookup) {
    const word = saveLookup.dataset.saveLookup;
    const words = getStore(KEYS.words, []);

    if (!words.some(item => item.word.toLowerCase() === word.toLowerCase())) {
      words.unshift({
        word,
        meaning: $("#dictBangla")?.textContent || "",
        article: currentArticle?.title || "",
        created: new Date().toISOString()
      });

      saveStore(KEYS.words, words);
      renderNotebook();
    }
  }
});

/* =========================================================
   9. BOOKMARKS
========================================================= */

function toggleBookmark(article) {
  let bookmarks = getStore(KEYS.bookmarks, []);

  if (bookmarks.some(item => String(item.id) === String(article.id))) {
    bookmarks = bookmarks.filter(
      item => String(item.id) !== String(article.id)
    );
  } else {
    bookmarks.unshift({
      id: article.id,
      title: article.title,
      category: article.category,
      sourceUrl: article.sourceUrl || "",
      savedAt: new Date().toISOString()
    });
  }

  saveStore(KEYS.bookmarks, bookmarks);
  renderCards();
  renderBookmarks();
}

function renderBookmarks() {
  const container = $("#bookmarkList");
  if (!container) return;

  const bookmarks = getStore(KEYS.bookmarks, []);

  container.innerHTML = bookmarks.length
    ? bookmarks.map(item => `
        <div class="item">
          <strong>${esc(item.title)}</strong>
          <p>${esc(item.category)}</p>
          <button type="button"
            data-remove-bookmark="${esc(item.id)}">Remove</button>
          ${item.sourceUrl ? `
            <a href="${esc(item.sourceUrl)}"
              target="_blank" rel="noopener noreferrer">
              Original source
            </a>
          ` : ""}
        </div>
      `).join("")
    : '<p class="empty">No bookmarks saved yet.</p>';
}

/* =========================================================
   10. NOTEBOOK
========================================================= */

function renderNotebook() {
  const words = getStore(KEYS.words, []);
  const notes = getStore(KEYS.notes, []);

  const vocabList = $("#vocabList");

  if (vocabList) {
    vocabList.innerHTML = words.length
      ? words.map((item, index) => `
          <div class="item">
            <strong>${esc(item.word)}</strong>
            <p>${esc(item.meaning || "No meaning saved")}</p>
            <small>${esc(item.article || "")}</small>
            <button type="button" data-delete-word="${index}">
              Delete
            </button>
          </div>
        `).join("")
      : '<p class="empty">No vocabulary saved yet.</p>';
  }

  const notesList = $("#notesList");

  if (notesList) {
    notesList.innerHTML = notes.length
      ? notes.map((item, index) => `
          <div class="item">
            <strong>${esc(item.article || "Note")}</strong>
            <p>${esc(item.text)}</p>
            <button type="button" data-delete-note="${index}">
              Delete
            </button>
          </div>
        `).join("")
      : '<p class="empty">No notes saved yet.</p>';
  }

  renderBookmarks();
}

/* =========================================================
   11. READING DASHBOARD
========================================================= */

function renderDashboard() {
  const history = getStore(KEYS.history, {});
  const today = new Date().toLocaleDateString("en-CA");
  const todayReads = history[today] || [];

  const dates = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - i);

    const key = date.toLocaleDateString("en-CA");

    dates.push({
      key,
      label: date.toLocaleDateString("en", { weekday: "short" }),
      count: (history[key] || []).length
    });
  }

  const allIds = new Set(
    Object.values(history).flat().map(item => String(item.id))
  );

  let streak = 0;

  for (let i = 0; i < 366; i++) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - i);

    const key = date.toLocaleDateString("en-CA");

    if ((history[key] || []).length) {
      streak++;
    } else {
      break;
    }
  }

  const setText = (id, value) => {
    const element = $("#" + id);
    if (element) element.textContent = value;
  };

  setText("dashboardDate", new Date().toLocaleDateString("en", {
    day: "numeric", month: "short", year: "numeric"
  }));

  setText("todayReads", todayReads.length);
  setText("weekReads", dates.reduce((sum, item) => sum + item.count, 0));
  setText("totalReads", allIds.size);
  setText("readStreak", streak);

  const chart = $("#weeklyChart");

  if (chart) {
    const max = Math.max(1, ...dates.map(item => item.count));

    chart.innerHTML = dates.map(item => `
      <div class="chart-day">
        <div class="bar-track">
          <div class="bar-fill"
            style="height:${item.count ? Math.max(8, item.count / max * 100) : 2}%">
          </div>
        </div>
        <strong>${item.count}</strong>
        <span>${esc(item.label)}</span>
      </div>
    `).join("");
  }
}

/* =========================================================
   12. NOTES AND VOCABULARY FORM
========================================================= */

$("#saveWordBtn")?.addEventListener("click", () => {
  const word = $("#wordInput")?.value.trim();
  const meaning = $("#meaningInput")?.value.trim() || "";

  if (!word) {
    alert("Enter a word first.");
    return;
  }

  const words = getStore(KEYS.words, []);

  words.unshift({
    word,
    meaning,
    article: currentArticle?.title || "",
    created: new Date().toISOString()
  });

  saveStore(KEYS.words, words);

  if ($("#wordInput")) $("#wordInput").value = "";
  if ($("#meaningInput")) $("#meaningInput").value = "";

  renderNotebook();
});

$("#saveNoteBtn")?.addEventListener("click", () => {
  const input = $("#noteInput");
  const text = input?.value.trim();

  if (!text) return;

  const notes = getStore(KEYS.notes, []);

  notes.unshift({
    text,
    article: currentArticle?.title || "General note",
    created: new Date().toISOString()
  });

  saveStore(KEYS.notes, notes);
  input.value = "";
  renderNotebook();
});

$("#backBtn")?.addEventListener("click", closeArticle);
$("#refreshBtn")?.addEventListener("click", loadOnlineArticles);

$("#search")?.addEventListener("input", event => {
  searchTerm = event.target.value;
  renderCards();
});

$("#category")?.addEventListener("change", event => {
  activeCategory = event.target.value;
  renderCards();
});

/* =========================================================
   13. TEXT TRANSLATION TOOL
========================================================= */

$("#translateBtn")?.addEventListener("click", async () => {
  const input = $("#translateInput");
  const output = $("#translationOutput");

  if (!input?.value.trim() || !output) return;

  output.textContent = "অনুবাদ হচ্ছে...";

  try {
    output.textContent = await translateSentence(input.value.trim());
  } catch {
    output.textContent = "অনুবাদ পাওয়া যায়নি। পরে আবার চেষ্টা করো।";
  }
});

/* =========================================================
   14. READ ALOUD, THEME, EXPORT AND PRACTICE
========================================================= */

$("#themeBtn")?.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const button = $("#themeBtn");

  if (button) {
    button.textContent = document.body.classList.contains("dark")
      ? "Light mode"
      : "Dark mode";
  }
});

$("#exportBtn")?.addEventListener("click", () => {
  const data = {
    vocabulary: getStore(KEYS.words, []),
    notes: getStore(KEYS.notes, []),
    bookmarks: getStore(KEYS.bookmarks, []),
    readingHistory: getStore(KEYS.history, {})
  };

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "wordrosi-learning-data.json";
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$("#practiceBtn")?.addEventListener("click", () => {
  const words = getStore(KEYS.words, []);
  const box = $("#practiceBox");

  if (!box) return;

  if (!words.length) {
    box.textContent = "প্রথমে Notebook-এ কিছু শব্দ সংরক্ষণ করো।";
    return;
  }

  const item = words[Math.floor(Math.random() * words.length)];

  box.innerHTML = `
    <h3>${esc(item.word)}</h3>
    <button type="button" id="revealMeaning">অর্থ দেখুন</button>
    <p id="practiceAnswer"></p>
  `;

  $("#revealMeaning").onclick = () => {
    $("#practiceAnswer").textContent =
      item.meaning || "এই শব্দের অর্থ সংরক্ষণ করা হয়নি।";
  };
});

/* =========================================================
   15. START APP
========================================================= */

function initApp() {
  initialiseCategories();
  renderCards();
  renderNotebook();
  renderDashboard();
  loadOnlineArticles();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp, { once: true });
} else {
  initApp();
}
