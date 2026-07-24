# CLAUDE.md — discover-armenia

Context handoff for an interactive map of Armenian hiking/heritage destinations.
Live: https://hamletpoghosyan94.github.io/discover-armenia/ · Repo: HamletPoghosyan94/discover-armenia (public).

## What this repo is
A single-page, static Leaflet map deployed on GitHub Pages. **No build step, no backend, no npm.**
- `index.html` — the whole app: HTML, CSS, JS, map logic. Loads Leaflet + osmtogeojson from unpkg (CDN).
- `destinations.js` — the data, as `var DESTINATIONS = [...]` (312 entries). Loaded via `<script src="destinations.js">` *before* the inline app script (classic scripts share global scope, so `DESTINATIONS` is visible). **Auto-generated — do not hand-edit.**
- `.nojekyll` — serves files as-is on Pages.

## Data architecture (important)
Destination data used to be hardcoded inline in `index.html` (94 points). It was moved into external `destinations.js` (312 points) so the data can be regenerated from a spreadsheet without touching app logic, and so counts are dynamic.

Each destination object:
```js
{ name, nameHy, category, province, lat, lon, elevation, difficulty, season, notes, source, popularity, clubs }
```
- `category` — one of 11: Mountains & Peaks, Lakes & Rivers, Waterfalls, Castles & Fortresses, Caves, Archaeological Sites, Camping Spots, Viewpoints, **Monasteries**, **Canyons & Gorges**, **Water sports**. Each has a color/emoji in `CAT_COLORS`/`CAT_ICONS`/`CAT_BADGE_BG`, a filter button, and a legend row in `index.html`. `makeIcon()` falls back to a grey 📍 for unknown categories.
- `province` — a marz name, or a `"X / Y"` combo (the filter splits on `/`). `PROV_BOUNDS` in index.html has zoom boxes per marz.
- `popularity` / `clubs` — how many hiking clubs run the destination and which; surfaced in the popup as "Run by N hiking club(s): …". This is a cross-club popularity signal.
- Counts (`#dest-count`, `#total-count`, `#vis-count`) are set from `DESTINATIONS.length` at load — never hardcode them again.

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
