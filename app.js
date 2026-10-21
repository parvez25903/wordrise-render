/* =========================================================
   WORDWISE ENGLISH LEARNING — FIXED APP.JS
   Works with the supplied index.html and styles.css.
   ========================================================= */

(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const API = {
    wikipedia: "https://en.wikipedia.org/w/api.php",
    wikinews: "https://en.wikinews.org/w/api.php",
    dictionary: "https://api.dictionaryapi.dev/api/v2/entries/en/",
    translate: "https://api.mymemory.translated.net/get"
  };

  const STORAGE = {
    words: "wordwise_words_v2",
    notes: "wordwise_notes_v2",
    theme: "wordwise_dark",
    progress: "wordwise_reading_progress_v2",
    fontSize: "wordwise_reader_font_px"
  };

  // Reader text size (px). Saved in the browser so it stays the same next time.
  const FONT = { min: 14, max: 34, step: 2, normal: 18 };

  // Real article sources only (no dummy/sample text).
  // Each category is filled from a Wikipedia search; News comes from Wikinews.
  const CATEGORY_QUERIES = {
    Stories: "fairy tale OR fable OR folk tale OR legend",
    Science: "science OR biology OR physics OR astronomy OR ocean",
    Culture: "culture OR tradition OR festival OR language OR art",
    Lifestyle: "health OR food OR sleep OR travel OR exercise",
    Technology: "technology OR internet OR computer OR robot",
    Learning: "education OR learning OR vocabulary OR reading OR writing"
  };

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("Could not read saved Wordwise data:", error);
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Could not save Wordwise data:", error);
      setStatus("Browser storage is unavailable. Your changes may not be saved.");
    }
  }

  function clampFont(value) {
    if (!Number.isFinite(value)) return FONT.normal;
    return Math.min(FONT.max, Math.max(FONT.min, Math.round(value)));
  }

  const state = {
    articles: [],
    currentArticle: null,
    words: readStorage(STORAGE.words, []),
    notes: readStorage(STORAGE.notes, []),
    progress: readStorage(STORAGE.progress, {}),
    dark: localStorage.getItem(STORAGE.theme) === "true",
    practiceIndex: 0,
    fontSize: clampFont(Number(readStorage(STORAGE.fontSize, FONT.normal)))
  };

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function setStatus(message) {
    const status = $("#status");
    if (status) status.textContent = message;
  }

  async function fetchJSON(url, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function translateText(text) {
    const cleanText = String(text || "").trim();
    if (!cleanText) return "অনুবাদের জন্য কোনো লেখা পাওয়া যায়নি।";
    const url = new URL(API.translate);
    url.searchParams.set("q", cleanText.slice(0, 450));
    url.searchParams.set("langpair", "en|bn");
    const data = await fetchJSON(url.toString());
    if (data.responseStatus && Number(data.responseStatus) !== 200) {
      throw new Error("Translation service returned an error");
    }
    return data.responseData?.translatedText || "বাংলা অনুবাদ পাওয়া যায়নি।";
  }

  async function getWordDetails(word) {
    const cleanWord = String(word || "").toLowerCase().replace(/[^a-z'-]/g, "");
    if (!cleanWord) return null;
    try {
      const data = await fetchJSON(API.dictionary + encodeURIComponent(cleanWord));
      const entry = data[0];
      const meanings = (entry?.meanings || []).slice(0, 4).map(meaning => ({
        partOfSpeech: meaning.partOfSpeech || "",
        definitions: (meaning.definitions || []).slice(0, 2).map(def => ({
          definition: def.definition || "",
          example: def.example || ""
        }))
      }));
      return {
        word: cleanWord,
        phonetic: entry?.phonetic || entry?.phonetics?.find(p => p.text)?.text || "",
        meanings
      };
    } catch (error) {
      return {
        word: cleanWord,
        phonetic: "",
        meanings: [{
          partOfSpeech: "",
          definitions: [{ definition: "এই মুহূর্তে ইংরেজি অভিধানের তথ্য পাওয়া যায়নি। বাংলা অর্থ দেখতে নিচের অনুবাদ বাটন ব্যবহার করো।", example: "" }]
        }]
      };
    }
  }

  const ABBREVIATIONS = /(?:\b(?:Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr|vs|etc|No|Inc|Ltd|Co|Mt|Gen|Col|Lt|Sgt|Rev|Hon|approx|ca|e\.g|i\.e|a\.m|p\.m)|\b[A-Z])\.$/;

  function splitSentences(text) {
    const pieces = String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .match(/[^.!?]+(?:[.!?]+["”’')\]]*|$)\s*/g) || [];
    const sentences = [];
    let buffer = "";
    pieces.forEach((piece, index) => {
      buffer += piece;
      const trimmed = buffer.trim();
      const next = pieces[index + 1];
      const insideToken = !/\s$/.test(piece) && next !== undefined;      // 3.5, U.S.A
      const abbreviation = ABBREVIATIONS.test(trimmed) && next !== undefined; // Dr. Smith
      const lowerNext = next !== undefined && /^[a-z]/.test(next.trim());
      if (insideToken || abbreviation || lowerNext) return;
      if (trimmed) sentences.push(trimmed);
      buffer = "";
    });
    if (buffer.trim()) sentences.push(buffer.trim());
    return sentences;
  }

  function makeClickableWords(sentence) {
    const parts = String(sentence).match(/[A-Za-z]+(?:['’\-][A-Za-z]+)*|\d+(?:[.,]\d+)*|[^A-Za-z\d]+/g) || [];
    return parts.map(part => {
      if (/^[A-Za-z]/.test(part)) {
        return `<button type="button" class="word-chip" data-word="${escapeHTML(part)}" aria-label="${escapeHTML(part)} শব্দের অর্থ দেখুন">${escapeHTML(part)}</button>`;
      }
      return `<span class="word-punctuation">${escapeHTML(part)}</span>`;
    }).join("");
  }

  const SKIP_SECTIONS = /^(references|external links|see also|further reading|notes|footnotes|bibliography|sources|citations|gallery)$/i;

  // Turns the plain text from the API into headings + sentences (all of it, nothing cut).
  function renderReadableText(text) {
    const lines = String(text || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const html = [];
    let sentenceCount = 0;
    for (const line of lines) {
      const heading = line.match(/^(={2,6})\s*(.+?)\s*\1$/);
      if (heading) {
        if (SKIP_SECTIONS.test(heading[2])) break;
        const level = Math.min(heading[1].length, 4);
        html.push(`<h${level} class="article-heading">${escapeHTML(heading[2])}</h${level}>`);
        continue;
      }
      splitSentences(line).forEach(sentence => {
        html.push(`
      <p class="article-sentence">
        <span class="sentence-unit" data-sentence-text>${makeClickableWords(sentence)}</span>
        <button type="button" class="translate-btn" data-translate-index="${sentenceCount}">বাংলা অনুবাদ</button>
        <span class="translation-result" data-translation-result hidden></span>
      </p>`);
        sentenceCount++;
      });
    }
    return sentenceCount ? html.join("") : "";
  }

  function isUsableSummary(text) {
    const value = String(text || "").trim();
    return value.length >= 120 && !/may refer to:?$/i.test(value) && !/may also refer to/i.test(value);
  }

  async function loadWikipediaArticles(query, category = "", offset = 0) {
    const url = new URL(API.wikipedia);
    const params = {
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrlimit: "10",
      gsroffset: String(offset),
      gsrnamespace: "0",
      prop: "extracts|pageimages|info",
      exintro: "1",
      explaintext: "1",
      exlimit: "max",
      piprop: "thumbnail",
      pithumbsize: "600",
      inprop: "url",
      format: "json",
      origin: "*"
    };
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const data = await fetchJSON(url.toString());
    return Object.values(data.query?.pages || {})
      .filter(page => isUsableSummary(page.extract))
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map(page => ({
        id: `wiki-${page.pageid}`,
        pageId: String(page.pageid),
        title: page.title || "Untitled article",
        summary: page.extract,
        image: page.thumbnail?.source || "",
        url: page.fullurl || `https://en.wikipedia.org/?curid=${page.pageid}`,
        category: category || guessCategory(page.title + " " + page.extract),
        source: "Wikipedia",
        api: API.wikipedia,
        type: "wikipedia"
      }));
  }

  function guessCategory(text) {
    const value = String(text).toLowerCase();
    if (/story|fairy tale|fiction|novel|fable/.test(value)) return "Stories";
    if (/science|biology|physics|chemistry|space|ocean|climate/.test(value)) return "Science";
    if (/technology|computer|internet|software|artificial intelligence/.test(value)) return "Technology";
    if (/culture|language|history|tradition|art/.test(value)) return "Culture";
    if (/health|food|travel|lifestyle|sleep/.test(value)) return "Lifestyle";
    return "Learning";
  }

  // Latest published news with full text (Wikinews, free licence).
  async function loadWikinews() {
    const url = new URL(API.wikinews);
    const params = {
      action: "query",
      generator: "categorymembers",
      gcmtitle: "Category:Published",
      gcmnamespace: "0",
      gcmsort: "timestamp",
      gcmdir: "desc",
      gcmlimit: "12",
      prop: "extracts|pageimages|info",
      exintro: "1",
      explaintext: "1",
      exlimit: "max",
      piprop: "thumbnail",
      pithumbsize: "600",
      inprop: "url",
      format: "json",
      origin: "*"
    };
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const data = await fetchJSON(url.toString());
    return Object.values(data.query?.pages || {})
      .filter(page => String(page.extract || "").trim().length >= 80)
      .map(page => ({
        id: `wikinews-${page.pageid}`,
        pageId: String(page.pageid),
        title: page.title || "Untitled news",
        summary: page.extract,
        image: page.thumbnail?.source || "",
        url: page.fullurl || `https://en.wikinews.org/?curid=${page.pageid}`,
        category: "News",
        source: "Wikinews",
        api: API.wikinews,
        type: "wikinews"
      }));
  }

  // Full article text (not just the intro).
  async function fetchFullText(article) {
    const url = new URL(article.api || API.wikipedia);
    Object.entries({
      action: "query", prop: "extracts", pageids: article.pageId,
      explaintext: "1", format: "json", origin: "*"
    }).forEach(([key, value]) => url.searchParams.set(key, value));
    const data = await fetchJSON(url.toString(), 25000);
    const text = data.query?.pages?.[article.pageId]?.extract || "";
    if (!renderReadableText(text)) throw new Error("Empty article text");
    return text;
  }

  function renderArticles(articles) {
    const grid = $("#articleGrid");
    if (!grid) {
      console.error("Wordwise: #articleGrid not found in index.html");
      setStatus("Article list container is missing. Please check index.html.");
      return;
    }
    if (!articles.length) {
      grid.innerHTML = '<p class="empty">কোনো আর্টিকেল পাওয়া যায়নি। অন্য শব্দ দিয়ে সার্চ করো।</p>';
      return;
    }
    grid.innerHTML = articles.map(article => `
      <article class="article-card">
        ${article.image ? `<img class="article-image" src="${escapeHTML(article.image)}" alt="${escapeHTML(article.title)}" loading="lazy" referrerpolicy="no-referrer">` : `<div class="article-placeholder" aria-hidden="true">📚</div>`}
        <div class="card-content">
          <span class="tag">${escapeHTML(article.category || "Learning")}</span>
          <h3>${escapeHTML(article.title)}</h3>
          <p>${escapeHTML((article.summary || "").slice(0, 220))}${(article.summary || "").length > 220 ? "…" : ""}</p>
          <div class="meta"><span>${escapeHTML(article.source || "Wordwise")}</span></div>
          <button type="button" class="open-article" data-article-id="${escapeHTML(article.id)}">Read Article</button>
          <a href="${escapeHTML(article.url)}" target="_blank" rel="noopener noreferrer">Original source ↗</a>
        </div>
      </article>
    `).join("");
  }

  function getFilteredArticles() {
    const search = ($("#search")?.value || "").trim().toLowerCase();
    const category = $("#category")?.value || "all";
    return state.articles.filter(article => {
      const matchesSearch = !search || `${article.title} ${article.summary} ${article.category}`.toLowerCase().includes(search);
      const matchesCategory = category === "all" || article.category.toLowerCase() === category.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }

  function refreshArticleList() {
    renderArticles(getFilteredArticles());
  }

  async function loadArticles(fresh = false) {
    const refreshButton = $("#refreshBtn");
    if (refreshButton) refreshButton.disabled = true;
    setStatus("অনলাইন আর্টিকেল লোড হচ্ছে…");
    // "Load fresh articles" jumps to a different page of search results each time.
    const offset = fresh ? Math.floor(Math.random() * 5) * 10 : 0;
    try {
      const jobs = [
        loadWikinews(),
        ...Object.entries(CATEGORY_QUERIES).map(([category, query]) => loadWikipediaArticles(query, category, offset))
      ];
      const results = await Promise.allSettled(jobs);
      const unique = new Map();
      results.forEach(result => {
        if (result.status !== "fulfilled") return;
        result.value.forEach(item => { if (!unique.has(item.id)) unique.set(item.id, item); });
      });
      state.articles = [...unique.values()];
      refreshArticleList();
      if (state.articles.length) setStatus(`মোট ${state.articles.length}টি আর্টিকেল পাওয়া গেছে।`);
      else setStatus("আর্টিকেল লোড হয়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার “Load fresh articles” চাপো।");
    } catch (error) {
      console.error("Wordwise article loading error:", error);
      setStatus("আর্টিকেল লোড হয়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করো।");
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  // Search box: press Enter to search Wikipedia online for any topic.
  async function searchOnline() {
    const query = ($("#search")?.value || "").trim();
    if (!query) return;
    setStatus(`“${query}” অনলাইনে খোঁজা হচ্ছে…`);
    try {
      const found = await loadWikipediaArticles(query);
      const known = new Set(state.articles.map(item => item.id));
      const fresh = found.filter(item => !known.has(item.id));
      state.articles = [...fresh, ...state.articles];
      const categorySelect = $("#category");
      if (categorySelect) categorySelect.value = "all";
      refreshArticleList();
      setStatus(found.length ? `“${query}” নিয়ে ${found.length}টি আর্টিকেল পাওয়া গেছে।` : `“${query}” নিয়ে কোনো আর্টিকেল পাওয়া যায়নি।`);
    } catch (error) {
      console.warn("Online search failed:", error);
      setStatus("অনলাইন সার্চ কাজ করেনি। ইন্টারনেট সংযোগ পরীক্ষা করো।");
    }
  }

  function setReaderVisible(visible) {
    const reader = $("#reader");
    const library = $("#library");
    if (reader) reader.classList.toggle("hidden", !visible);
    if (library) library.classList.toggle("hidden", visible);
    if (visible) reader?.scrollIntoView({ behavior: "smooth", block: "start" });
    else library?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function trackRead(article) {
    const day = new Date().toISOString().slice(0, 10);
    if (!state.progress[day]) state.progress[day] = [];
    if (!state.progress[day].includes(article.id)) state.progress[day].push(article.id);
    writeStorage(STORAGE.progress, state.progress);
    renderDashboard();
  }

  async function openArticle(article) {
    if (!article) return;
    state.currentArticle = article;
    const body = $("#articleBody");
    if (!body) return;

    setReaderVisible(true);
    window.speechSynthesis?.cancel();
    body.innerHTML = `
      <h1>${escapeHTML(article.title)}</h1>
      <p class="article-meta">${escapeHTML(article.category || "Learning")} · ${escapeHTML(article.source || "Wordwise")}</p>
      ${article.image ? `<img class="cover" src="${escapeHTML(article.image)}" alt="${escapeHTML(article.title)}" loading="lazy">` : ""}
      <div class="article-text"><p class="reader-loading">সম্পূর্ণ আর্টিকেল লোড হচ্ছে…</p></div>
      <p class="source-link"><a href="${escapeHTML(article.url)}" target="_blank" rel="noopener noreferrer">Read original source ↗</a></p>
    `;
    trackRead(article);
    const textContainer = $(".article-text", body);

    try {
      const fullText = article.fullText || await fetchFullText(article);
      article.fullText = fullText;
      if (state.currentArticle !== article) return; // user opened another article meanwhile
      textContainer.innerHTML = renderReadableText(fullText);
    } catch (error) {
      console.warn("Could not load full article text:", error);
      if (state.currentArticle !== article) return;
      textContainer.innerHTML = `
        <div class="reader-error">
          <p>সম্পূর্ণ আর্টিকেল এই মুহূর্তে লোড করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করো।</p>
          <button type="button" class="retry-article">আবার চেষ্টা করুন</button>
        </div>`;
    }
    ["#wordInput", "#meaningInput", "#noteInput"].forEach(selector => {
      const input = $(selector);
      if (input) input.value = "";
    });
  }

  function applyFontSize() {
    document.documentElement.style.setProperty("--reader-font-size", `${state.fontSize}px`);
    const label = $("#fontSizeLabel");
    if (label) label.textContent = `${state.fontSize}px`;
    const down = $("#fontDownBtn");
    const up = $("#fontUpBtn");
    if (down) down.disabled = state.fontSize <= FONT.min;
    if (up) up.disabled = state.fontSize >= FONT.max;
  }

  function changeFontSize(delta) {
    state.fontSize = delta === 0 ? FONT.normal : clampFont(state.fontSize + delta);
    writeStorage(STORAGE.fontSize, state.fontSize);
    applyFontSize();
  }

  async function showWordDialog(word) {
    const details = await getWordDetails(word);
    if (!details) return;
    let dialog = $("#wordDialog");
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.id = "wordDialog";
      dialog.className = "word-dialog";
      dialog.innerHTML = '<section class="word-dialog-card" role="dialog" aria-modal="true" aria-labelledby="dictWord"></section>';
      document.body.appendChild(dialog);
      dialog.addEventListener("click", event => {
        if (event.target === dialog || event.target.closest(".dialog-close")) dialog.remove();
      });
    }
    const card = $(".word-dialog-card", dialog);
    card.innerHTML = `
      <button type="button" class="dialog-close" aria-label="Close dictionary">×</button>
      <span class="dict-eyebrow">WORDWISE DICTIONARY</span>
      <h2 id="dictWord">${escapeHTML(details.word)}</h2>
      <p class="dict-pronunciation">${escapeHTML(details.phonetic || "Pronunciation unavailable")}</p>
      <div class="dict-bangla"><span>বাংলা অর্থ</span><p class="word-bangla-meaning">অনুবাদ লোড করতে নিচের বাটনে চাপ দাও।</p>
        <button type="button" class="translate-word" data-word="${escapeHTML(details.word)}">বাংলা অর্থ দেখুন</button>
      </div>
      ${details.meanings.map(meaning => `
        <div class="dict-meaning">
          ${meaning.partOfSpeech ? `<span class="part-speech">${escapeHTML(meaning.partOfSpeech)}</span>` : ""}
          ${meaning.definitions.map(def => `<p>${escapeHTML(def.definition)}</p>${def.example ? `<p class="dict-example">“${escapeHTML(def.example)}”</p>` : ""}`).join("")}
        </div>
      `).join("")}
      <button type="button" class="save-dialog-word" data-word="${escapeHTML(details.word)}">Notebook-এ সংরক্ষণ করুন</button>
      <p class="dict-footnote">Dictionary definitions are provided by a public dictionary API. Availability may vary.</p>
    `;
    dialog.hidden = false;
    dialog.querySelector(".dialog-close")?.focus();
  }

  function saveWord(word, meaning = "") {
    const cleanWord = String(word || "").trim();
    if (!cleanWord) {
      setStatus("আগে একটি শব্দ লিখুন বা Reading থেকে শব্দ নির্বাচন করুন।");
      return;
    }
    const existing = state.words.find(item => item.word.toLowerCase() === cleanWord.toLowerCase());
    if (existing) {
      if (meaning) existing.meaning = meaning;
      existing.updatedAt = new Date().toISOString();
    } else {
      state.words.unshift({ word: cleanWord, meaning: meaning || "", createdAt: new Date().toISOString() });
    }
    writeStorage(STORAGE.words, state.words);
    renderNotebook();
    renderPractice();
    setStatus(`“${cleanWord}” Notebook-এ সংরক্ষণ করা হয়েছে।`);
  }

  function saveNote() {
    const text = $("#noteInput")?.value.trim();
    if (!text) {
      setStatus("নোট লেখার পর Save note চাপুন।");
      return;
    }
    state.notes.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      articleId: state.currentArticle?.id || "",
      articleTitle: state.currentArticle?.title || "Quick note",
      text,
      createdAt: new Date().toISOString()
    });
    writeStorage(STORAGE.notes, state.notes);
    renderNotebook();
    $("#noteInput").value = "";
    setStatus("নোট সংরক্ষণ করা হয়েছে।");
  }

  function renderNotebook() {
    const vocabList = $("#vocabList");
    const notesList = $("#notesList");
    if (vocabList) {
      vocabList.innerHTML = state.words.length ? state.words.map((item, index) => `
        <div class="item">
          <strong>${escapeHTML(item.word)}</strong>
          ${item.meaning ? `<p>${escapeHTML(item.meaning)}</p>` : "<small>Meaning not added yet</small>"}
          <button type="button" class="review-word" data-index="${index}">Review</button>
          <button type="button" class="delete-word secondary" data-index="${index}">Delete</button>
        </div>
      `).join("") : '<p class="empty">এখনো কোনো শব্দ সংরক্ষণ করা হয়নি। Reading থেকে শব্দ বেছে Notebook-এ রাখো।</p>';
    }
    if (notesList) {
      notesList.innerHTML = state.notes.length ? state.notes.map(note => `
        <div class="item">
          <strong>${escapeHTML(note.articleTitle || "Reading note")}</strong>
          <small>${escapeHTML(new Date(note.createdAt).toLocaleString())}</small>
          <p>${escapeHTML(note.text)}</p>
          <button type="button" class="delete-note secondary" data-id="${escapeHTML(note.id)}">Delete note</button>
        </div>
      `).join("") : '<p class="empty">এখনো কোনো নোট নেই। আর্টিকেল পড়ে নিজের ভাবনা লিখে রাখো।</p>';
    }
  }

  function renderPractice() {
    const box = $("#practiceBox");
    if (!box) return;
    if (!state.words.length) {
      box.innerHTML = "<p>Practice শুরু করতে আগে Notebook-এ কিছু শব্দ সংরক্ষণ করো।</p>";
      return;
    }
    const index = state.practiceIndex % state.words.length;
    const item = state.words[index];
    box.innerHTML = `
      <div class="item">
        <small>Word ${index + 1} of ${state.words.length}</small>
        <h3>${escapeHTML(item.word)}</h3>
        <p class="practice-answer hidden" id="practiceAnswer">${escapeHTML(item.meaning || "এই শব্দের অর্থ এখনো যোগ করা হয়নি।")}</p>
        <button type="button" class="show-practice-answer">অর্থ দেখুন</button>
        <button type="button" class="next-practice secondary">পরের শব্দ</button>
      </div>
    `;
  }

  function renderDashboard() {
    const dateEl = $("#dashboardDate");
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString("bn-BD", { year: "numeric", month: "short", day: "numeric" });
    const dates = Object.keys(state.progress).sort();
    const today = new Date().toISOString().slice(0, 10);
    const todayIds = state.progress[today] || [];
    const lastSeven = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      return { key, label: d.toLocaleDateString("en", { weekday: "short" }), count: (state.progress[key] || []).length };
    });
    const total = new Set(Object.values(state.progress).flat()).size;
    const week = new Set(lastSeven.flatMap(day => state.progress[day.key] || [])).size;
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if ((state.progress[key] || []).length) streak++;
      else if (i !== 0) break;
    }
    if ($("#todayReads")) $("#todayReads").textContent = todayIds.length;
    if ($("#weekReads")) $("#weekReads").textContent = week;
    if ($("#totalReads")) $("#totalReads").textContent = total;
    if ($("#readStreak")) $("#readStreak").textContent = streak;
    const chart = $("#weeklyChart");
    if (chart) {
      const max = Math.max(1, ...lastSeven.map(day => day.count));
      chart.innerHTML = lastSeven.map(day => `
        <div class="chart-day" title="${day.key}: ${day.count} article(s)">
          <strong>${day.count}</strong>
          <div class="bar-track"><div class="bar-fill" style="height:${Math.max(day.count ? 8 : 2, day.count / max * 94)}px"></div></div>
          <span>${day.label}</span>
        </div>
      `).join("");
    }
  }

  function applyTheme() {
    document.body.classList.toggle("dark", state.dark);
    localStorage.setItem(STORAGE.theme, String(state.dark));
    const button = $("#themeBtn");
    if (button) button.textContent = state.dark ? "Light mode" : "Dark mode";
  }

  function highlightSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setStatus("আগে Reading-এর কোনো লেখা select করো, তারপর Highlight selection চাপো।");
      return;
    }
    const range = selection.getRangeAt(0);
    if (!$("#articleBody")?.contains(range.commonAncestorContainer)) {
      setStatus("শুধু Reading-এর ভেতরের লেখা highlight করা যাবে।");
      return;
    }
    try {
      const mark = document.createElement("mark");
      range.surroundContents(mark);
      selection.removeAllRanges();
    } catch {
      setStatus("এই selection-টি highlight করা যায়নি। ছোট অংশ select করে চেষ্টা করো।");
    }
  }

  function speakArticle() {
    if (!("speechSynthesis" in window)) {
      setStatus("এই browser-এ Read aloud সমর্থিত নয়।");
      return;
    }
    const parts = $$("#articleBody .article-heading, #articleBody [data-sentence-text]").map(el => el.innerText.trim());
    const text = parts.filter(Boolean).join(". ");
    if (!text.trim()) {
      setStatus("আগে একটি আর্টিকেল খুলুন।");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 30000));
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  function exportNotebook() {
    const data = {
      exportedAt: new Date().toISOString(),
      words: state.words,
      notes: state.notes,
      readingProgress: state.progress
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "wordwise-notebook.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    $("#themeBtn")?.addEventListener("click", () => { state.dark = !state.dark; applyTheme(); });
    $("#refreshBtn")?.addEventListener("click", () => loadArticles(true));
    $("#search")?.addEventListener("input", refreshArticleList);
    $("#search")?.addEventListener("keydown", event => { if (event.key === "Enter") searchOnline(); });
    $("#fontDownBtn")?.addEventListener("click", () => changeFontSize(-FONT.step));
    $("#fontUpBtn")?.addEventListener("click", () => changeFontSize(FONT.step));
    $("#fontResetBtn")?.addEventListener("click", () => changeFontSize(0));
    $("#category")?.addEventListener("change", refreshArticleList);
    $("#backBtn")?.addEventListener("click", () => setReaderVisible(false));
    $("#highlightBtn")?.addEventListener("click", highlightSelection);
    $("#speakBtn")?.addEventListener("click", speakArticle);
    $("#stopSpeakBtn")?.addEventListener("click", () => window.speechSynthesis?.cancel());
    $("#saveWordBtn")?.addEventListener("click", () => saveWord($("#wordInput")?.value, $("#meaningInput")?.value));
    $("#saveNoteBtn")?.addEventListener("click", saveNote);
    $("#exportBtn")?.addEventListener("click", exportNotebook);
    $("#practiceBtn")?.addEventListener("click", () => {
      if (!state.words.length) { setStatus("Practice-এর আগে Notebook-এ শব্দ সংরক্ষণ করো।"); return; }
      state.practiceIndex = 0;
      renderPractice();
      $("#practice")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.addEventListener("click", async event => {
      const target = event.target;
      const articleButton = target.closest(".open-article");
      if (articleButton) {
        const article = state.articles.find(item => item.id === articleButton.dataset.articleId);
        if (article) await openArticle(article);
        return;
      }

      if (target.closest(".retry-article")) {
        await openArticle(state.currentArticle);
        return;
      }

      const wordButton = target.closest(".word-chip");
      if (wordButton) {
        wordButton.disabled = true;
        try { await showWordDialog(wordButton.dataset.word); }
        finally { wordButton.disabled = false; }
        return;
      }

      const translateButton = target.closest(".translate-btn");
      if (translateButton) {
        const sentence = translateButton.closest(".article-sentence")?.querySelector("[data-sentence-text]");
        const output = translateButton.closest(".article-sentence")?.querySelector("[data-translation-result]");
        if (!sentence || !output) return;
        if (!output.hidden && output.textContent) {
          output.hidden = true;
          translateButton.textContent = "বাংলা অনুবাদ";
          return;
        }
        translateButton.disabled = true;
        translateButton.textContent = "অনুবাদ হচ্ছে…";
        try {
          output.textContent = await translateText(sentence.innerText);
          output.hidden = false;
          translateButton.textContent = "অনুবাদ লুকান";
        } catch (error) {
          output.textContent = "অনুবাদ পাওয়া যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করো।";
          output.hidden = false;
          translateButton.textContent = "আবার চেষ্টা করুন";
        } finally {
          translateButton.disabled = false;
        }
        return;
      }

      const translateWordButton = target.closest(".translate-word");
      if (translateWordButton) {
        const dialog = translateWordButton.closest(".word-dialog-card");
        const output = $(".word-bangla-meaning", dialog);
        translateWordButton.disabled = true;
        try {
          output.textContent = await translateText(translateWordButton.dataset.word);
        } catch {
          output.textContent = "বাংলা অর্থ পাওয়া যায়নি। পরে আবার চেষ্টা করো।";
        }
        translateWordButton.disabled = false;
        return;
      }

      const saveDialogWord = target.closest(".save-dialog-word");
      if (saveDialogWord) {
        const dialog = saveDialogWord.closest(".word-dialog-card");
        const meaning = $(".word-bangla-meaning", dialog)?.textContent || "";
        saveWord(saveDialogWord.dataset.word, meaning);
        saveDialogWord.textContent = "সংরক্ষণ করা হয়েছে ✓";
        return;
      }

      const reviewWord = target.closest(".review-word");
      if (reviewWord) {
        const item = state.words[Number(reviewWord.dataset.index)];
        if (item) showWordDialog(item.word);
        return;
      }

      const deleteWord = target.closest(".delete-word");
      if (deleteWord) {
        state.words.splice(Number(deleteWord.dataset.index), 1);
        writeStorage(STORAGE.words, state.words);
        renderNotebook(); renderPractice();
        return;
      }

      const deleteNote = target.closest(".delete-note");
      if (deleteNote) {
        state.notes = state.notes.filter(note => note.id !== deleteNote.dataset.id);
        writeStorage(STORAGE.notes, state.notes);
        renderNotebook();
        return;
      }

      if (target.closest(".show-practice-answer")) {
        $("#practiceAnswer")?.classList.remove("hidden");
        return;
      }

      if (target.closest(".next-practice")) {
        state.practiceIndex = (state.practiceIndex + 1) % Math.max(1, state.words.length);
        renderPractice();
      }
    });
  }

  function init() {
    applyTheme();
    bindEvents();
    renderNotebook();
    renderPractice();
    renderDashboard();
    applyFontSize();
    renderArticles([]);
    loadArticles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
