# Wordwise — English Learning Studio

A lightweight, no-build web app for learning English by reading real articles. Read full articles, tap any word for its dictionary entry, get a Bengali translation sentence by sentence, and keep your own vocabulary notebook — all in the browser.

Built with plain **HTML, CSS and vanilla JavaScript**. No framework, no bundler, no backend.

---

## Features

**Reading**
- Article library with category filters (News, Stories, Science, Culture, Lifestyle, Technology, Learning) and search
- Full article text, not just summaries, with section headings preserved
- Adjustable text size in the reader (A− / A+ / Reset, 14–34 px), remembered between visits
- Highlight text, read aloud (browser text-to-speech), dark mode
- Press **Enter** in the search box to search Wikipedia for any topic

**Learning tools**
- Tap any English word to open a dictionary panel: phonetics, part of speech, definitions, examples
- Per-sentence Bengali translation, toggled on demand
- Save words and notes to a personal notebook; export everything as JSON
- Vocabulary practice (flip-card style review of saved words)
- Reading dashboard: articles read today, last 7 days, total, streak, and a weekly chart

---

## Content sources

No dummy or bundled sample text. Everything is fetched live:

| Purpose | Source |
| --- | --- |
| Articles (Stories, Science, Culture, Lifestyle, Technology, Learning) | [Wikipedia API](https://www.mediawiki.org/wiki/API:Main_page) |
| News | [Wikinews API](https://en.wikinews.org/w/api.php) |
| Word definitions | [dictionaryapi.dev](https://dictionaryapi.dev/) |
| Sentence/word translation (EN → BN) | [MyMemory](https://mymemory.translated.net/doc/spec.php) |

Only sources that return the **full article text** are used. Headline-only feeds were intentionally left out.

---

## Getting started

No install step is needed.

```bash
git clone <your-repo-url>
cd wordrise-render-main
```

Then run it with any static server, for example:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Open `http://localhost:8000`. In VS Code, the **Live Server** extension works too. Opening `index.html` directly also works in most modern browsers.

An internet connection is required to load articles, definitions and translations.

---

## Project structure

```
.
├── index.html   # Page layout: library, reader, notebook, practice, dashboard
├── styles.css   # Styling, responsive layout, dark mode, reader text size
├── app.js       # All logic: API calls, rendering, storage, events
└── README.md
```

### How `app.js` is organised

- **Config:** API endpoints, category → search-query map, storage keys, font-size limits
- **Data layer:** `fetchJSON` (with timeout), Wikipedia/Wikinews loaders, `fetchFullText`, dictionary and translation helpers
- **Text processing:** `splitSentences` (handles abbreviations like *Dr.*, *U.S.* and decimals) and `renderReadableText` (headings + clickable words; skips References / See also / External links)
- **UI:** library rendering, reader, word dialog, notebook, practice, dashboard
- **Init:** `bindEvents()` uses a single delegated click handler for dynamic elements

---

## Data and privacy

There is no server and no account. All user data stays in the browser's `localStorage`:

| Key | Contents |
| --- | --- |
| `wordwise_words_v2` | Saved vocabulary |
| `wordwise_notes_v2` | Reading notes |
| `wordwise_reading_progress_v2` | Articles opened per day (dashboard) |
| `wordwise_reader_font_px` | Reader text size |
| `wordwise_dark` | Theme |

Data is per browser and per device. Use **Export notebook as JSON** to back it up.

---

## Deployment

It is a static site, so any static host works (GitHub Pages, Render Static Site, Netlify, Vercel). Point the host at the repository root; there is no build command and the publish directory is `.`.

---

## Known limitations

- **API limits:** MyMemory has a free daily quota and the translation is machine-generated, so quality varies. Translation requests are trimmed to 450 characters.
- **Dictionary coverage:** dictionaryapi.dev does not contain every word (names, rare inflections). A fallback message is shown when no entry exists.
- **Long articles:** very long Wikipedia pages render thousands of word buttons, which can feel slower on low-end phones.
- **Dashboard dates:** daily progress is keyed by the UTC date (`toISOString`), so the "day" can roll over at a different hour than your local midnight.
- **Highlights are not saved.** They exist only until the article is reopened.
- **Text-to-speech** quality depends on the voices installed in the browser/OS.

---

## Roadmap ideas

- Local-time dashboard dates
- Persist highlights per article
- Spaced-repetition scheduling for saved words
- Offline cache for articles already opened
- Import notebook from the exported JSON
- Lazy rendering for very long articles

---

## Contributing

Issues and pull requests are welcome. Keep changes dependency-free where possible, since the project is meant to stay a simple static site. Before opening a PR, load the app in a browser and check the console for errors.

---

## Acknowledgements

Article text comes from Wikipedia and Wikinews, which are available under [Creative Commons](https://creativecommons.org/licenses/by-sa/4.0/) licences. Please keep the "Read original source" link visible when reusing content.

## Author

Md Parvez Ali
