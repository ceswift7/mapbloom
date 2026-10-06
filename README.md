# Mapbloom

A quiet geography game: turn a watercolour globe, find countries, and watch each one bloom into a small painting.

**Play it:** open `index.html` in a browser (or the GitHub Pages link, if enabled). It needs an internet connection for fonts and map libraries.

## Modes
- **Explore**: just the globe. Tap any country to read about it.
- **Quiz**: locate countries by name, flag, capital or silhouette; a daily challenge; practice for weak spots.
- **Race**: find every country in a region against the clock.

## Building
`src/` holds the parts (`head.html`, `data.html`, `flags.js`, `learn.js`, `main.html`). On Windows, `src/build.ps1` joins them into `index.html`.

## Credits and licences
- Code: MIT (see `LICENSE`).
- Country reading pages (`src/learn.js`): text adapted from Wikipedia, licensed CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/); facts such as population from Wikidata (CC0). The adapted text stays under CC BY-SA 4.0.
- Flag images: flagcdn.com.
- Map data: Natural Earth (public domain) via the `world-atlas` package.
- Libraries: d3, topojson-client, topojson-simplify (ISC), loaded from public CDNs.
- Fonts: Newsreader, Figtree, JetBrains Mono (SIL Open Font License) via Google Fonts.
