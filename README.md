# Joshua Agbede — Portfolio Template (plain HTML/CSS/JS)

No build step, no npm install, no framework. Just open `index.html` in a
browser, or serve the folder with any static file server.

## Files

- `index.html` — all page markup and content
- `styles.css` — the full design-token system (colors, fluid type scale,
  spacing, grain texture, dark/light theme) plus every component's styles
- `script.js` — vanilla JS for the theme toggle (saved to localStorage) and
  the talks carousel (click + keyboard: arrow keys, Home/End, Page Up/Down,
  Enter to "play", Escape to stop)
- `favicon.svg` — small placeholder mark

Fonts (Jost, Instrument Serif, Inter, Geist Mono) load from Google Fonts via
the `<link>` tags in `index.html` — an internet connection is needed for
those, everything else works fully offline.

All content is placeholder — swap the text directly in `index.html`, and
replace the "Portrait placeholder" / "Cover placeholder" boxes in
`index.html`/`styles.css` (`.hero__portrait`, `.book-cover`) with real
`<img>` tags.
