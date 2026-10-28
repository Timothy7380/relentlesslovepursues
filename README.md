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

## Editing the podcast

Open `episodes.js`. Each episode is one block with a title, date, description,
an optional picture, and links to YouTube / Spotify / Apple Podcasts. Clicking an
episode on the site opens a "Listen on" box with the links you filled in (or goes
straight to the link if there is only one). Add new episodes at the top.
Pictures go in the `assets` folder.

## Editing the blog

Each post is its own file in `posts/`. To add one: copy any file in `posts/`,
rename it, change the text, then add a matching line in the `<div class="posts">`
list in `index.html`.

## Publishing changes

The site is hosted by GitHub Pages from the `main` branch of
github.com/Timothy7380/relentlesslovepursues. Saving a change in the GitHub
website (or pushing it) updates the live site in a minute or two.
