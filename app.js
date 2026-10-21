
const $ = (selector, root = document) => root.querySelector(selector);

const API = {
  wikipedia: "https://en.wikipedia.org/w/api.php",
  dictionary: "https://api.dictionaryapi.dev/api/v2/entries/en/",
  translate: "https://api.mymemory.translated.net/get",
  hackerNews: "https://hacker-news.firebaseio.com/v0"
};

const state = {
  articles: [],
  currentArticle: null,
  savedWords: JSON.parse(localStorage.getItem("wordwise_words") || "[]"),
  dark: localStorage.getItem("wordwise_dark") === "true"
};

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Network request failed");
  return response.json();
}

async function translateText(text) {
  const url = new URL(API.translate);
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", "en|bn");

  const data = await fetchJSON(url);
  return data.responseData?.translatedText || "অনুবাদ পাওয়া যায়নি।";
}

async function getWordDetails(word) {
  const cleanWord = word.toLowerCase().replace(/[^a-z'-]/g, "");

  if (!cleanWord) return null;

  try {
    const data = await fetchJSON(
      API.dictionary + encodeURIComponent(cleanWord)
    );

    const entry = data[0];
    const meaning = entry?.meanings?.[0];
    const definition = meaning?.definitions?.[0];

    return {
      word: cleanWord,
      phonetic: entry?.phonetic || "",
      partOfSpeech: meaning?.partOfSpeech || "",
      meaning: definition?.definition || "অর্থ পাওয়া যায়নি।",
      example: definition?.example || ""
    };
  } catch {
    return {
      word: cleanWord,
      phonetic: "",
      partOfSpeech: "",
      meaning: "এই শব্দের অর্থ এখন পাওয়া যাচ্ছে না।",
      example: ""
    };
  }
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .match(/[^.!?]+(?:[.!?]+|$)/g)
    ?.map(sentence => sentence.trim())
    .filter(Boolean) || [];
}

/*
 * IMPORTANT:
 * প্রতিটি শব্দ inline element হিসেবে দেখানো হচ্ছে।
 * প্রতিটি শব্দের জন্য আলাদা block বা <p> তৈরি করা হচ্ছে না।
 */
function makeClickableWords(sentence) {
  const parts = sentence.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*|\d+(?:[.,]\d+)*|[^A-Za-z\d]+/g) || [];

  return parts.map(part => {
    if (/^[A-Za-z]/.test(part)) {
      return `<button type="button"
        class="word-chip"
        data-word="${escapeHTML(part)}"
        aria-label="${escapeHTML(part)}-এর অর্থ দেখুন">${escapeHTML(part)}</button>`;
    }

    return `<span class="word-punctuation">${escapeHTML(part)}</span>`;
  }).join("");
}

function renderReadableText(text) {
  return splitSentences(text).map((sentence, index) => `
    <div class="reading-sentence">
      <div class="sentence-text">${makeClickableWords(sentence)}</div>

      <button type="button"
        class="sentence-translate"
        data-sentence="${index}">
        বাংলা অনুবাদ
      </button>

      <div class="sentence-translation"
        id="translation-${index}"
        hidden></div>
    </div>
  `).join("");
}

async function loadWikipediaArticles(query = "English") {
  const url = new URL(API.wikipedia);

  Object.entries({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "15",
    gsrnamespace: "0",
    prop: "extracts|pageimages|info",
    exintro: "1",
    explaintext: "1",
    piprop: "thumbnail",
    pithumbsize: "500",
    inprop: "url",
    format: "json",
    origin: "*"
  }).forEach(([key, value]) => url.searchParams.set(key, value));

  const data = await fetchJSON(url);
  const pages = Object.values(data.query?.pages || {});

  return pages.map(page => ({
    id: String(page.pageid),
    title: page.title,
    summary: page.extract || "",
    image: page.thumbnail?.source || "",
    url: page.fullurl ||
      `https://en.wikipedia.org/?curid=${page.pageid}`,
    category: "Articles",
    source: "Wikipedia"
  }));
}

async function loadHackerNews() {
  const ids = await fetchJSON(`${API.hackerNews}/topstories.json`);

  const stories = await Promise.all(
    ids.slice(0, 12).map(async id => {
      try {
        const item = await fetchJSON(`${API.hackerNews}/item/${id}.json`);

        return {
          id: String(item.id),
          title: item.title || "Untitled",
          summary: item.text
            ? item.text.replace(/<[^>]*>/g, " ")
            : `Read the original story: ${item.title || ""}`,
          image: "",
          url: item.url ||
            `https://news.ycombinator.com/item?id=${item.id}`,
          category: "News",
          source: "Hacker News"
        };
      } catch {
        return null;
      }
    })
  );

  return stories.filter(Boolean);
}

function renderArticles(articles, container) {
  if (!container) return;

  if (!articles.length) {
    container.innerHTML = "<p>কোনো আর্টিকেল পাওয়া যায়নি।</p>";
    return;
  }

  container.innerHTML = articles.map(article => `
    <article class="article-card">
      ${article.image ? `
        <img class="article-image"
          src="${escapeHTML(article.image)}"
          alt="${escapeHTML(article.title)}"
          loading="lazy">
      ` : ""}

      <div class="article-card-content">
        <small>${escapeHTML(article.category)} · ${escapeHTML(article.source)}</small>
        <h3>${escapeHTML(article.title)}</h3>
        <p>${escapeHTML(article.summary.slice(0, 220))}</p>

        <button type="button"
          class="open-article"
          data-article-id="${escapeHTML(article.id)}">
          Read Article
        </button>

        <a href="${escapeHTML(article.url)}"
          target="_blank"
          rel="noopener noreferrer">Original source</a>
      </div>
    </article>
  `).join("");
}

async function openArticle(article) {
  state.currentArticle = article;

  const reader = $("#reading-area") ||
    $("#readingArea") ||
    $("#reader");

  if (!reader) {
    console.error("Reading container not found in HTML.");
    return;
  }

  reader.innerHTML = `
    <article class="reading-article">
      <h2>${escapeHTML(article.title)}</h2>

      ${article.image ? `
        <img class="reading-image"
          src="${escapeHTML(article.image)}"
          alt="${escapeHTML(article.title)}">
      ` : ""}

      <p class="reading-summary">${escapeHTML(article.summary)}</p>

      <div class="reading-content">
        <p>Loading full article...</p>
      </div>

      <a href="${escapeHTML(article.url)}"
        target="_blank"
        rel="noopener noreferrer">Read original article</a>
    </article>
  `;

  try {
    const url = new URL(API.wikipedia);

    Object.entries({
      action: "query",
      prop: "extracts|pageimages|info",
      pageids: article.id,
      explaintext: "1",
      explaintext: "1",
      inprop: "url",
      format: "json",
      origin: "*"
    }).forEach(([key, value]) => url.searchParams.set(key, value));

    const data = await fetchJSON(url);
    const page = Object.values(data.query?.pages || {})[0];

    const fullText = page?.extract || article.summary;
    const content = $(".reading-content", reader);

    if (content) {
      content.innerHTML = renderReadableText(fullText);
    }
  } catch {
    const content = $(".reading-content", reader);

    if (content) {
      content.innerHTML = `
        <p>অনলাইন আর্টিকেল লোড করা যায়নি।</p>
        ${renderReadableText(article.summary)}
      `;
    }
  }

  reader.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showWordDetails(details) {
  let panel = $("#word-details");

  if (!panel) {
    panel = document.createElement("aside");
    panel.id = "word-details";
    panel.className = "word-details";
    document.body.appendChild(panel);
  }

  if (!details) {
    panel.textContent = "শব্দের তথ্য পাওয়া যায়নি।";
    return;
  }

  panel.innerHTML = `
    <button type="button" class="close-word-details"
      aria-label="Close">✕</button>

    <h3>${escapeHTML(details.word)}</h3>
    <p>${escapeHTML(details.phonetic)}</p>
    <p><strong>Word type:</strong>
      ${escapeHTML(details.partOfSpeech)}</p>
    <p><strong>Definition:</strong>
      ${escapeHTML(details.meaning)}</p>

    ${details.example ? `
      <p><strong>Example:</strong>
        ${escapeHTML(details.example)}</p>
    ` : ""}

    <button type="button" class="translate-word">
      বাংলা অর্থ দেখুন
    </button>

    <div class="word-bangla-meaning" hidden></div>

    <button type="button" class="save-word">
      শব্দটি Notebook-এ রাখুন
    </button>
  `;

  panel.dataset.word = details.word;
  panel.hidden = false;
}

document.addEventListener("click", async event => {
  const wordButton = event.target.closest(".word-chip");

  if (wordButton) {
    const details = await getWordDetails(wordButton.dataset.word);
    showWordDetails(details);
    return;
  }

  if (event.target.closest(".close-word-details")) {
    $("#word-details").hidden = true;
    return;
  }

  const translateButton = event.target.closest(".sentence-translate");

  if (translateButton) {
    const sentenceBox = translateButton.closest(".reading-sentence");
    const sentence = $(".sentence-text", sentenceBox);
    const output = $(".sentence-translation", sentenceBox);

    if (!sentence || !output) return;

    translateButton.disabled = true;
    translateButton.textContent = "অনুবাদ হচ্ছে...";

    try {
      // Button text বাদ দিয়ে শুধু বাক্যের ইংরেজি লেখা সংগ্রহ।
      const text = sentence.innerText;
      output.textContent = await translateText(text);
      output.hidden = false;
      translateButton.textContent = "অনুবাদ লুকান";
    } catch {
      output.textContent = "অনুবাদ পাওয়া যায়নি। আবার চেষ্টা করো।";
      output.hidden = false;
      translateButton.textContent = "আবার অনুবাদ করুন";
    } finally {
      translateButton.disabled = false;
    }

    return;
  }

  if (translateButton === event.target) return;

  const meaningButton = event.target.closest(".translate-word");

  if (meaningButton) {
    const panel = $("#word-details");
    const output = $(".word-bangla-meaning", panel);

    meaningButton.disabled = true;

    try {
      output.textContent = await translateText(panel.dataset.word);
      output.hidden = false;
    } catch {
      output.textContent = "বাংলা অর্থ পাওয়া যায়নি।";
      output.hidden = false;
    } finally {
      meaningButton.disabled = false;
    }

    return;
  }

  const saveButton = event.target.closest(".save-word");

  if (saveButton) {
    const word = $("#word-details")?.dataset.word;

    if (word && !state.savedWords.includes(word)) {
      state.savedWords.push(word);
      localStorage.setItem(
        "wordwise_words",
        JSON.stringify(state.savedWords)
      );
    }

    saveButton.textContent = "Notebook-এ সংরক্ষিত ✓";
    return;
  }

  const articleButton = event.target.closest(".open-article");

  if (articleButton) {
    const article = state.articles.find(
      item => item.id === articleButton.dataset.articleId
    );

    if (article) await openArticle(article);
  }
});

async function loadHome() {
  const container = $("#article-list") ||
    $("#articles") ||
    $("#library-list");

  if (!container) {
    console.warn("Article list container was not found.");
    return;
  }

  container.innerHTML = "<p>অনলাইন কনটেন্ট লোড হচ্ছে...</p>";

  try {
    const [articles, news] = await Promise.all([
      loadWikipediaArticles("English language OR science OR history OR culture"),
      loadHackerNews()
    ]);

    state.articles = [...articles, ...news];
    renderArticles(state.articles, container);
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <p>অনলাইন কনটেন্ট লোড করা যায়নি।
      ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করো।</p>
      <button type="button" id="retry-load">Try again</button>
    `;
  }
}

document.addEventListener("click", event => {
  if (event.target.closest("#retry-load")) loadHome();
});

function applyTheme() {
  document.body.classList.toggle("dark-mode", state.dark);
  localStorage.setItem("wordwise_dark", String(state.dark));
}

document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  loadHome();
});
