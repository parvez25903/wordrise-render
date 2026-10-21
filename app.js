
/* =========================================================
   WORDROSI ENGLISH LEARNING
   Complete app.js
   HTML + CSS + Vanilla JavaScript
   Online sources: Wikimedia + Hacker News
   No API key required
========================================================= */

"use strict";

const $ = (s, root = document) => root.querySelector(s);

const SAMPLE_ARTICLES = [
  {
    id: "s1",
    title: "The Little Seed",
    category: "Stories",
    publisher: "WordRosi Original",
    date: "2026-10-01",
    minutes: 3,
    image: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1000&q=80",
    summary: "A story about patience, growth and small beginnings.",
    body: "A little seed rested beneath the soil. It could not see the sun, and it wondered whether it would ever become anything more than a seed.\n\nRain came softly. The earth grew warm. Slowly, the seed opened and sent a tiny root down and a green shoot up. It met stones and strong winds, but it continued to grow.\n\nOne morning, a small plant stood in the sunlight. The seed understood that growth often happens quietly, long before anyone can see it.\n\nLesson: Small, steady steps can lead to wonderful changes."
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
    body: "Sleep is not simply a break from the day. While we sleep, the brain works on organising information gathered during waking hours. This process can help people remember new words, facts and skills.\n\nA regular sleep schedule may also support attention and mood. Students often learn better when they combine focused practice with enough rest.\n\nTry reviewing new vocabulary, taking a break, and returning to it the next day."
  },
  {
    id: "s3",
    title: "A Community Garden",
    category: "Lifestyle",
    publisher: "WordRosi Original",
    date: "2026-10-03",
    minutes: 3,
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1000&q=80",
    summary: "Neighbours share space, skills and fresh vegetables.",
    body: "Neighbours created a small community garden on an unused piece of land. Some brought seeds, others shared tools, and children helped water the plants.\n\nThe garden became more than a place to grow vegetables. People exchanged recipes, practised new skills and got to know their neighbours.\n\nA small idea can grow when many people contribute."
  }
];

const CATEGORIES = [
  "All", "Stories", "News", "Technology", "Education",
  "Health", "Lifestyle", "Science", "Travel",
  "Business", "Culture", "Learning"
];

let articles = [...SAMPLE_ARTICLES];
let currentArticle = null;
let activeCategory = "All";
let searchTerm = "";
let onlineLoaded = false;

const $all = (s, root = document) => [...root.querySelectorAll(s)];

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[ch]);
}

function safeURL(value) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}

function readStore(key, fallback = []) {
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
    console.warn("Could not save data:", error);
  }
}

function dateLabel(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en", {
    year: "numeric", month: "short", day: "numeric"
  });
}

function readingTime(text = "") {
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
}

function setStatus(message) {
  const el = $("#status");
  if (el) el.textContent = message;
}

function setVisible(selector, visible) {
  const el = $(selector);
  if (el) el.classList.toggle("hidden", !visible);
}

/* =========================================================
   ONLINE ARTICLE SOURCES
========================================================= */

// Wikimedia provides encyclopedia pages, summaries and thumbnails.
// These are educational reference articles, not breaking news.

const WIKI_TOPICS = [
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

async function fetchWikipedia(topic, query) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "0",
    gsrlimit: "8",
    prop: "extracts|pageimages|info",
    exintro: "1",
    explaintext: "1",
    exsentences: "8",
    piprop: "thumbnail",
    pithumbsize: "800",
    inprop: "url"
  });

  const response = await fetch(
    "https://en.wikipedia.org/w/api.php?" + params
  );

  if (!response.ok) throw new Error("Wikipedia request failed");

  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});

  return pages
    .filter(page => page.title && page.extract)
    .map(page => ({
      id: "wiki-" + page.pageid,
      title: page.title,
      category: topic,
      publisher: "Wikipedia",
      date: "",
      minutes: readingTime(page.extract),
      image: safeURL(page.thumbnail?.source || ""),
      summary: page.extract.slice(0, 240),
      body: page.extract,
      sourceUrl: safeURL(page.fullurl) ||
        "https://en.wikipedia.org/?curid=" + page.pageid,
      contentType: "reference"
    }));
}

// Hacker News provides online community-shared article links.
// Its results are mainly technology/startup-related.

async function fetchHackerNews(query = "technology") {
  const params = new URLSearchParams({
    query,
    tags: "story",
    hitsPerPage: "20"
  });

  const response = await fetch(
    "https://hn.algolia.com/api/v1/search_by_date?" + params
  );

  if (!response.ok) throw new Error("Hacker News request failed");

  const data = await response.json();

  return (data.hits || [])
    .filter(item => item.title && item.url)
    .map(item => ({
      id: "hn-" + item.objectID,
      title: item.title,
      category: "Technology",
      publisher: item.author
        ? "Hacker News · " + item.author
        : "Hacker News",
      date: item.created_at || "",
      minutes: 3,
      image: "",
      summary: "Online article shared by the technology community.",
      body: "This article is hosted by its original publisher.\n\nOpen the original source to read the full article.",
      sourceUrl: safeURL(item.url),
      contentType: "external"
    }));
}

/* =========================================================
   LOAD ONLINE CONTENT
========================================================= */

async function loadOnlineArticles() {
  const refresh = $("#refreshBtn");

  if (refresh) refresh.disabled = true;
  setStatus("Connecting to online article sources...");

  const results = await Promise.allSettled([
    ...WIKI_TOPICS.map(topic =>
      fetchWikipedia(topic.category, topic.query)
    ),
    fetchHackerNews("technology"),
    fetchHackerNews("science"),
    fetchHackerNews("education")
  ]);

  const onlineArticles = results
    .filter(result => result.status === "fulfilled")
    .flatMap(result => result.value);

  // Remove duplicate links and duplicate titles.
  const unique = new Map();

  for (const article of onlineArticles) {
    const key = (
      article.sourceUrl || article.title
    ).toLowerCase();

    if (key && !unique.has(key)) unique.set(key, article);
  }

  if (unique.size) {
    articles = [...unique.values(), ...SAMPLE_ARTICLES];
    onlineLoaded = true;
    setStatus(
      `${unique.size} online articles loaded. Sample stories are also available.`
    );
  } else {
    articles = [...SAMPLE_ARTICLES];
    onlineLoaded = false;
    setStatus(
      "Online sources are unavailable. Showing saved sample readings. Check your internet connection."
    );
  }

  renderCards();

  if (refresh) refresh.disabled = false;
}

/* =========================================================
   CATEGORY FILTER AND SEARCH
========================================================= */

function initialiseCategories() {
  const select = $("#category");
  if (!select) return;

  if (!select.options.length) {
    select.innerHTML = CATEGORIES.map(category => {
      const value = category === "All"
        ? "all"
        : category.toLowerCase();

      return `<option value="${value}">${esc(category)}</option>`;
    }).join("");
  }
}

function getFilteredArticles() {
  const query = searchTerm.trim().toLowerCase();

  return articles.filter(article => {
    const categoryMatch =
      activeCategory === "all" ||
      activeCategory === "All" ||
      article.category.toLowerCase() === activeCategory.toLowerCase();

    const text = [
      article.title,
      article.summary,
      article.category,
      article.publisher
    ].join(" ").toLowerCase();

    return categoryMatch && (!query || text.includes(query));
  });
}

function renderCards() {
  const grid = $("#articleGrid");
  if (!grid) return;

  const filtered = getFilteredArticles();

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty">
        No articles found. Try another search or category.
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(article => `
    <article class="article-card">
      ${
        article.image
          ? `<img
              src="${esc(article.image)}"
              alt="${esc(article.title)}"
              loading="lazy"
              onerror="this.style.display='none'"
            >`
          : ""
      }

      <div class="card-content">
        <span class="tag">${esc(article.category)}</span>
        <h3>${esc(article.title)}</h3>
        <p>${esc(article.summary || "Open this article to learn more.")}</p>

        <div class="meta">
          <span>${esc(article.publisher || "Online source")}</span>
          <span>${esc(dateLabel(article.date))}</span>
          <span>${article.minutes || 3} min read</span>
        </div>

        <div class="card-actions">
          <button type="button" data-open="${esc(article.id)}">
            Read article
          </button>

          <button type="button" class="secondary"
            data-bookmark="${esc(article.id)}">
            ${isBookmarked(article.id) ? "★ Saved" : "☆ Save"}
          </button>
        </div>
      </div>
    </article>
  `).join("");

  const status = $("#status");
  if (status) {
    status.textContent =
      `${filtered.length} readings shown · ${onlineLoaded ? "Online feed connected" : "Sample mode"}`;
  }
}

function isBookmarked(id) {
  return readStore("wordwise_bookmarks", [])
    .some(item => String(item.id) === String(id));
}

/* =========================================================
   ARTICLE READING PAGE
========================================================= */

function renderArticleBody(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map(paragraph => `<p>${esc(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function openArticle(id) {
  const article = articles.find(
    item => String(item.id) === String(id)
  );

  if (!article) return;

  currentArticle = article;

  const body = $("#articleBody");
  if (!body) {
    if (article.sourceUrl) window.open(article.sourceUrl, "_blank", "noopener");
    return;
  }

  const history = readStore("wordwise_reading_history", {});
  const today = new Date().toLocaleDateString("en-CA");
  if (!history[today]) history[today] = [];

  if (!history[today].some(item => String(item.id) === String(article.id))) {
    history[today].push({
      id: String(article.id),
      title: article.title,
      readAt: new Date().toISOString()
    });
  }

  saveStore("wordwise_reading_history", history);

  body.innerHTML = `
    ${article.image ? `
      <img class="cover"
        src="${esc(article.image)}"
        alt="${esc(article.title)}"
        onerror="this.style.display='none'"
      >
    ` : ""}

    <span class="tag">${esc(article.category)}</span>
    <h1>${esc(article.title)}</h1>

    <div class="article-meta">
      Publisher: ${esc(article.publisher || "Unknown")}
      · Published: ${esc(dateLabel(article.date))}
      · ${article.minutes || 3} min read
    </div>

    <p><strong>${esc(article.summary || "")}</strong></p>

    <div class="article-text">
      ${renderArticleBody(article.body || article.summary)}
    </div>

    ${article.sourceUrl ? `
      <p class="source-link">
        <a href="${esc(article.sourceUrl)}"
           target="_blank"
           rel="noopener noreferrer">
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

  const saveButton = $("#saveCurrentBtn");
  if (saveButton) saveButton.onclick = () => toggleBookmark(article);

  const speakButton = $("#speakBtn");
  if (speakButton) speakButton.onclick = () => speakArticle(article);

  const stopButton = $("#stopSpeakBtn");
  if (stopButton) {
    stopButton.onclick = () => {
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    };
  }

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
   BOOKMARKS
========================================================= */

function toggleBookmark(article) {
  let bookmarks = readStore("wordwise_bookmarks", []);

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

  saveStore("wordwise_bookmarks", bookmarks);
  renderCards();
  renderBookmarks();
}

function renderBookmarks() {
  const container = $("#bookmarkList");
  if (!container) return;

  const bookmarks = readStore("wordwise_bookmarks", []);

  container.innerHTML = bookmarks.length
    ? bookmarks.map(item => `
        <div class="item">
          <strong>${esc(item.title)}</strong>
          <p>${esc(item.category)}</p>
          <button type="button" data-remove-bookmark="${esc(item.id)}">
            Remove
          </button>
          ${item.sourceUrl ? `
            <a href="${esc(item.sourceUrl)}"
               target="_blank" rel="noopener noreferrer">Open source</a>
          ` : ""}
        </div>
      `).join("")
    : '<p class="empty">No bookmarks saved yet.</p>';
}

/* =========================================================
   READING DASHBOARD
========================================================= */

function renderDashboard() {
  const history = readStore("wordwise_reading_history", {});
  const today = new Date().toLocaleDateString("en-CA");
  const todayItems = history[today] || [];

  const dates = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);

    const key = d.toLocaleDateString("en-CA");

    dates.push({
      key,
      label: d.toLocaleDateString("en", { weekday: "short" }),
      count: (history[key] || []).length
    });
  }

  const allIds = new Set(
    Object.values(history).flat().map(item => String(item.id))
  );

  let streak = 0;

  for (let i = 0; i < 366; i++) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);

    const key = d.toLocaleDateString("en-CA");

    if ((history[key] || []).length) {
      streak++;
    } else if (i > 0 || !todayItems.length) {
      break;
    } else {
      break;
    }
  }

  const setText = (id, value) => {
    const el = $("#" + id);
    if (el) el.textContent = value;
  };

  setText("dashboardDate", new Date().toLocaleDateString("en", {
    day: "numeric", month: "short", year: "numeric"
  }));
  setText("todayReads", todayItems.length);
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
   VOCABULARY NOTEBOOK AND NOTES
========================================================= */

function renderNotebook() {
  const words = readStore("wordwise_words", []);
  const notes = readStore("wordwise_notes", []);

  const vocabList = $("#vocabList");
  if (vocabList) {
    vocabList.innerHTML = words.length
      ? words.map((item, index) => `
          <div class="item">
            <strong>${esc(item.word)}</strong>
            <p>${esc(item.meaning || "No meaning saved")}</p>
            <small>${esc(item.article || "")}</small>
            <button type="button" data-delete-word="${index}">Delete</button>
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
            <button type="button" data-delete-note="${index}">Delete</button>
          </div>
        `).join("")
      : '<p class="empty">No notes saved yet.</p>';
  }

  renderBookmarks();
}

/* =========================================================
   DICTIONARY AND BANGLA TRANSLATION
========================================================= */

async function translateText(text) {
  const params = new URLSearchParams({
    q: text,
    langpair: "en|bn"
  });

  const response = await fetch(
    "https://api.mymemory.translated.net/get?" + params
  );

  if (!response.ok) throw new Error("Translation unavailable");

  const data = await response.json();
  const result = data.responseData?.translatedText;

  if (!result) throw new Error("No translation returned");

  return result;
}

async function lookupWord(word) {
  const panel = $("#wordResult");

  if (!panel) {
    // No dictionary panel exists in the current HTML.
    const url =
      "https://api.dictionaryapi.dev/api/v2/entries/en/" +
      encodeURIComponent(word);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Word not found");

      const data = await response.json();
      const meaning = data[0]?.meanings?.[0]?.definitions?.[0]?.definition;

      alert(`${word}\n${meaning || "Meaning unavailable"}`);
    } catch {
      alert("Could not find this word. Please check your connection.");
    }

    return;
  }

  panel.textContent = "Looking up " + word + "...";

  try {
    const response = await fetch(
      "https://api.dictionaryapi.dev/api/v2/entries/en/" +
      encodeURIComponent(word)
    );

    if (!response.ok) throw new Error("Dictionary request failed");

    const data = await response.json();
    const entry = data[0];
    const definitions = (entry.meanings || [])
      .slice(0, 3)
      .map(meaning => `
        <p><strong>${esc(meaning.partOfSpeech)}</strong></p>
        ${(meaning.definitions || []).slice(0, 2)
          .map(item => `<p>${esc(item.definition)}</p>`).join("")}
      `).join("");

    let bengali = "বাংলা অর্থ পাওয়া যায়নি";

    try {
      bengali = await translateText(
        entry.meanings?.[0]?.definitions?.[0]?.definition || word
      );
    } catch {}

    panel.innerHTML = `
      <h3>${esc(entry.word)}</h3>
      <p>${esc(entry.phonetic || "")}</p>
      <p><strong>বাংলা অর্থ:</strong> ${esc(bengali)}</p>
      ${definitions}
      <button type="button" data-save-lookup="${esc(word)}">
        Save word
      </button>
    `;
  } catch {
    panel.textContent =
      "Dictionary unavailable. Check your internet connection.";
  }
}

/* =========================================================
   EVENT LISTENERS
========================================================= */

function initialiseApp() {
  initialiseCategories();

  const search = $("#search");
  if (search) {
    search.addEventListener("input", event => {
      searchTerm = event.target.value;
      renderCards();
    });
  }

  const category = $("#category");
  if (category) {
    category.addEventListener("change", event => {
      activeCategory = event.target.value;
      renderCards();
    });
  }

  const refresh = $("#refreshBtn");
  if (refresh) refresh.addEventListener("click", loadOnlineArticles);

  const back = $("#backBtn");
  if (back) back.addEventListener("click", closeArticle);

  document.addEventListener("click", async event => {
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
        "wordwise_bookmarks",
        readStore("wordwise_bookmarks", [])
          .filter(item => String(item.id) !== String(id))
      );

      renderCards();
      renderBookmarks();
      return;
    }

    const deleteWord = event.target.closest("[data-delete-word]");
    if (deleteWord) {
      const words = readStore("wordwise_words", []);
      words.splice(Number(deleteWord.dataset.deleteWord), 1);
      saveStore("wordwise_words", words);
      renderNotebook();
      return;
    }

    const deleteNote = event.target.closest("[data-delete-note]");
    if (deleteNote) {
      const notes = readStore("wordwise_notes", []);
      notes.splice(Number(deleteNote.dataset.deleteNote), 1);
      saveStore("wordwise_notes", notes);
      renderNotebook();
      return;
    }

    const saveLookup = event.target.closest("[data-save-lookup]");
    if (saveLookup) {
      const word = saveLookup.dataset.saveLookup;
      const words = readStore("wordwise_words", []);

      if (!words.some(item => item.word.toLowerCase() === word.toLowerCase())) {
        words.unshift({
          word,
          meaning: "",
          article: currentArticle?.title || "",
          created: new Date().toISOString()
        });

        saveStore("wordwise_words", words);
        renderNotebook();
        saveLookup.textContent = "Saved";
      }
      return;
    }

    const wordButton = event.target.closest("[data-word]");
    if (wordButton) {
      lookupWord(wordButton.dataset.word);
    }
  });

  const saveWord = $("#saveWordBtn");
  if (saveWord) {
    saveWord.addEventListener("click", () => {
      const word = $("#wordInput")?.value.trim();
      const meaning = $("#meaningInput")?.value.trim() || "";

      if (!word) return alert("Enter a word first.");

      const words = readStore("wordwise_words", []);
      words.unshift({
        word,
        meaning,
        article: currentArticle?.title || "",
        created: new Date().toISOString()
      });

      saveStore("wordwise_words", words);

      if ($("#wordInput")) $("#wordInput").value = "";
      if ($("#meaningInput")) $("#meaningInput").value = "";

      renderNotebook();
    });
  }

  const saveNote = $("#saveNoteBtn");
  if (saveNote) {
    saveNote.addEventListener("click", () => {
      const input = $("#noteInput");
      const text = input?.value.trim();

      if (!text) return;

      const notes = readStore("wordwise_notes", []);

      notes.unshift({
        text,
        article: currentArticle?.title || "General note",
        created: new Date().toISOString()
      });

      saveStore("wordwise_notes", notes);
      input.value = "";
      renderNotebook();
    });
  }

  const translateButton = $("#translateBtn");
  if (translateButton) {
    translateButton.addEventListener("click", async () => {
      const input = $("#translateInput");
      const output = $("#translationOutput");

      if (!input?.value.trim() || !output) return;

      output.textContent = "Translating...";

      try {
        output.textContent = await translateText(input.value.trim());
      } catch {
        output.textContent = "Translation unavailable. Try again later.";
      }
    });
  }

  const exportButton = $("#exportBtn");
  if (exportButton) {
    exportButton.addEventListener("click", () => {
      const data = {
        vocabulary: readStore("wordwise_words", []),
        notes: readStore("wordwise_notes", []),
        bookmarks: readStore("wordwise_bookmarks", []),
        readingHistory: readStore("wordwise_reading_history", {})
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
  }

  const themeButton = $("#themeBtn");
  if (themeButton) {
    themeButton.addEventListener("click", () => {
      document.body.classList.toggle("dark");

      themeButton.textContent =
        document.body.classList.contains("dark")
          ? "Light mode"
          : "Dark mode";
    });
  }

  const practiceButton = $("#practiceBtn");
  if (practiceButton) {
    practiceButton.addEventListener("click", () => {
      const words = readStore("wordwise_words", []);
      const box = $("#practiceBox");

      if (!box) return;

      if (!words.length) {
        box.textContent = "Save some vocabulary before practising.";
        return;
      }

      const item = words[Math.floor(Math.random() * words.length)];

      box.innerHTML = `
        <h3>${esc(item.word)}</h3>
        <button type="button" id="revealMeaning">Reveal meaning</button>
        <p id="practiceAnswer"></p>
      `;

      $("#revealMeaning").onclick = () => {
        $("#practiceAnswer").textContent =
          item.meaning || "No meaning saved yet.";
      };
    });
  }

  renderCards();
  renderNotebook();
  renderDashboard();

  // Load online content automatically when the app starts.
  loadOnlineArticles();
}

/* =========================================================
   START APPLICATION
========================================================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialiseApp);
} else {
  initialiseApp();
}
