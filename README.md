# Wordwise English Learning Studio

A lightweight English reading and vocabulary-learning web app built with HTML, CSS and vanilla JavaScript.

## Run locally
1. Extract the ZIP.
2. Open the folder in VS Code.
3. Run `index.html` with Live Server (recommended), or open it directly in a modern browser.

## Features
- Responsive reading library with offline sample articles across multiple categories.
- Article images, summaries, publisher/date metadata and estimated reading time.
- Per-sentence Bengali translation buttons (online MyMemory translation API).
- Click any English word in the reading to open a dictionary panel with available pronunciation, part of speech, definitions, examples and a Bengali explanation.
- Listen to a word or article using browser text-to-speech.
- Save vocabulary and reading notes to localStorage; review vocabulary and export a JSON backup.
- Text highlighting, search, category filters and dark mode.

## Notes
- Word dictionary: `dictionaryapi.dev`; sentence translation: `api.mymemory.translated.net`. Internet is required for these online lookups. Availability, quality and rate limits depend on the providers.
- Online article feeds may only provide headlines and links, not full copyrighted article text. Offline samples are included so the app remains usable without a feed.
- Data in localStorage is stored in the current browser/device and is not automatically synced between devices.

## Reading Dashboard
The dashboard records unique articles opened per local calendar day in browser `localStorage`. It shows today's count, the last seven days, total unique articles, current consecutive-day reading streak, and a seven-day bar chart. Reopening the same article on the same day does not increase the count. This is browser-local tracking; it is not synced across devices or browsers.
