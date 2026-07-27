# CLAUDE.md — discover-armenia

Context handoff for an interactive map of Armenian hiking/heritage destinations.
Live: https://hamletpoghosyan94.github.io/discover-armenia/ · Repo: HamletPoghosyan94/discover-armenia (public).

## What this repo is
A single-page, static Leaflet app deployed on GitHub Pages. **No build step, no backend, no npm, no framework.**
- `index.html` — the whole app: HTML, CSS, JS, map logic. In-page view switching (SPA) across four screens — **Map**, **Journey** (achievements), **Challenges** (stub) and **Profile** (stub) — sharing one bottom nav. Loads Leaflet + osmtogeojson from unpkg (CDN).
- `destinations.js` — the data, as `var DESTINATIONS = [...]` (312 entries). Loaded via `<script src="destinations.js">` *before* the inline app script (classic scripts share global scope, so `DESTINATIONS` is visible). **Auto-generated — do not hand-edit** (except the `id` note below).
- `state.js` — per-user check-in state (visited / wishlist / date / note / photos), persisted in `localStorage` behind `window.UserState`. This is the **only** persistence layer; swap it for a backend later without touching UI code. Loaded after `destinations.js`.
- `.nojekyll` — serves files as-is on Pages.
- `design/` (git-ignored) — Claude Design export used as the visual reference; never shipped.

## Data architecture (important)
Destination data used to be hardcoded inline in `index.html` (94 points). It was moved into external `destinations.js` (312 points) so the data can be regenerated from a spreadsheet without touching app logic, and so counts are dynamic.

Each destination object:
```js
{ id, name, nameHy, category, province, lat, lon, elevation, difficulty, season, notes, source, popularity, clubs }
```
- `id` — a stable slug derived from `name` (e.g. `mount-khustup`), the first key of every object. Check-ins in `state.js` reference this id, so it must stay stable across regenerations. If you regenerate `destinations.js` from the master spreadsheet, re-apply the same slugify (lowercase, `&`→`and`, non-alphanumeric→`-`, de-duplicate with a numeric suffix) so existing check-ins keep resolving.
- `category` — one of 11: Mountains & Peaks, Lakes & Rivers, Waterfalls, Castles & Fortresses, Caves, Archaeological Sites, Camping Spots, Viewpoints, **Monasteries**, **Canyons & Gorges**, **Water sports**. Each has a color/emoji in `CAT_COLORS`/`CAT_ICONS`/`CAT_BADGE_BG`, a filter button, and a legend row in `index.html`. `makeIcon()` falls back to a grey 📍 for unknown categories.
- `province` — a marz name, or a `"X / Y"` combo (the filter splits on `/`). `PROV_BOUNDS` in index.html has zoom boxes per marz.
- `popularity` / `clubs` — how many hiking clubs run the destination and which; surfaced in the destination bottom-sheet as "Run by N hiking club(s)". This is a cross-club popularity signal, and also drives the "off the beaten path" highlight.
- Counts (progress strip, `#total-count`, `#vis-count`, and every Journey figure) are computed live from `DESTINATIONS` + `UserState` — never hardcode them.

## Check-ins & derived views (Map + Journey)
- Tapping a pin opens a bottom-sheet mini-card (Wikipedia photo, EN/HY name, elevation·difficulty·season, clubs, notes) with one-tap **✓ Visited** / **☆ Wishlist** and an optional "Add details" (date / note / one downscaled photo). Marking visited clears wishlist.
- Pins are personalised: visited (filled + ✓), wishlist (outlined + ★), unvisited (muted, category colour kept). The map also has a state toggle (All / Visited / Wishlist / New) alongside the category chips, province `<select>`, and search.
- **Everything downstream is derived** from `DESTINATIONS` + `UserState`: progress %, per-category and per-province bars, highlights, badges and challenges. `computeStats()` in index.html is the single aggregation; badge/challenge rules live in `BADGE_DEFS` / `computeChallenges()`. Badge unlocks are detected centrally in the `UserState.onChange` handler (diff of earned set) and shown via a modal + confetti, so they fire no matter what triggered the check-in.
- Province stats use each destination's **primary** province (`primaryProvince()` = normalized first `/`-segment) against the canonical 11 (10 marzes + Yerevan), so per-province totals reconcile to 312.

## The source of truth for data
The map data is generated FROM a master spreadsheet that lives OUTSIDE this repo:
- `~/Documents/discover-armenia-docs/Armenia_Unique_Destinations_MASTER.xlsx` — 326 unique destinations (312 geocoded). Columns: Destination, Armenian, Category/Type, Province/Region, Latitude, Longitude, Elevation, Difficulty, Best season, Popularity (# clubs), Clubs running it, Origin, Notes, Coord source.
- Other context in that folder: `05-map-technical-docs.md` (architecture), `_coord_status.md` (geocoding status), `Armenia_Hiking_Destinations_ourpath.hiking.xlsx` (per-club raw rows, one row per destination per club).

To regenerate `destinations.js`: read the master, keep rows that have Latitude, map the free-text `Category / Type` → the 11 categories (keyword priority on the first `/`-segment; monasteries/canyons detected by name), clean `Province/Region` to marz name(s), strip internal geocode tags (`[OSM: …]`, `[Wikiloc: …]`, `club name variants: …`) from notes, and for the ~90 rows that match `map_destinations_source.json` by name reuse their richer notes. Then emit one object per line.

## Geocoding provenance (per row, in the spreadsheet's Coord source column)
- `Map DB` (90) — original hand-researched coordinates.
- `Wikiloc (GPS)` / `OSM (Nominatim)` — precise matches for named peaks/lakes/monasteries.
- `Wikiloc (village-approx)` / `OSM (… trailhead)` / `… approx-area` — approximate (village or trailhead near the feature).
- Sources ending in **`— verify`** (~10) = a confident match whose province disagreed with the club's stated region; check before treating as exact.
- **14 destinations remain uncoordinated** (Artsakh sites, unnamed alpine lakes, the Ijevan "Falcons trail", and a few obscure peaks/waterfalls: Qaghqar, Sharai, Mazra, Akhnabat). They aren't in OSM/GeoNames/Wikiloc under a searchable name — need a GPS track from the club's own trip page or a manual pin.

## Deploy
GitHub Pages, `main` branch root. Deploy = commit + `git push`. Pages rebuilds in ~1 min.
- Pushes use a fine-grained PAT for HamletPoghosyan94 (passed inline in the push URL; not in the keychain — the Mac's stored git creds are a different, no-access account).
- This clone's remote-tracking ref may be stale (`git status` can show "ahead" by extra commits origin already has); `git fetch origin` first if `git push` complains — history matches, so it fast-forwards.

## Current state
- Latest commit `2acf787`: moved data to `destinations.js`, 312 points, 3 new categories, dynamic counts.
- Verify locally by opening `index.html` in a browser (the file:// preview works because the data is a plain script include).

## Runtime external services (the live map calls these)
unpkg (Leaflet/osmtogeojson) · overpass-api.de + mirrors (province borders) · raw.githubusercontent.com (country outline) · en.wikipedia.org REST (popup images) · Esri/OpenTopoMap/CartoDB (basemap tiles).
