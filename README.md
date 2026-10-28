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

## Admin page (blog + podcast)

Go to `/admin.html` on the live site and log in. From there you can write, edit
and delete blog posts and podcast episodes, upload pictures, add YouTube videos,
and save things as drafts. Nothing in the code needs to be touched.

How it works: posts and episodes are stored in a free Supabase database. The
public pages (`index.html`, `post.html`, `podcast.html`) read from it, and
`admin.html` writes to it. The connection details are in `config.js`
(these two values are public by design; the database's security rules decide who
can change anything). The database setup is in `supabase-setup.sql`.

The admin password can be changed inside the admin (top menu > Password).

## Publishing code changes

The site is hosted by GitHub Pages from the `main` branch of
github.com/Timothy7380/relentlesslovepursues. Pushing a change updates the live
site in a minute or two.
