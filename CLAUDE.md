# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
make serve      # Start dev server at http://localhost:8803
make kill       # Stop the server
```

The timezone converter (`index.html`) uses ES modules and requires an HTTP server, `file://` won't work. The jargon page (`jargon/index.html`) is a self-contained single file and can be opened directly.

## Architecture

This repo holds two independent tools under the same domain (`clientsays.neorgon.com`):

**1. Timezone Converter**: `index.html` + `css/style.css` + `js/*.js` (modular ES modules)

**2. Jargon Translator ("Decoded")**: `jargon/index.html` (fully self-contained single file; all CSS, JS, and data inline)

`jargon.html` at the root is just a redirect to `jargon/`.

---

### Timezone Converter: Module Responsibilities

| Module | Role |
|---|---|
| `js/state.js` | Mutable `state` object (`selectedTZ`, `use24h`, `savedTimer`, `targets`); all static data: `TZ_GROUPS` (30 source zones), `TZ_ALIASES`, `TZ_FLAT`, `AVAILABLE_TARGETS` (44 destinations), `LS_KEY`, `LS_KEY_TARGETS` |
| `js/render.js` | `convert()`: core conversion logic; `renderResultCards()` / `renderPicker()` / `saveTargets()`; combobox open/close/render/select; `saveDefaults()` / `loadSaved()` / `loadFromURL()` |
| `js/events.js` | All DOM event listeners via `bindEvents()` |
| `js/utils.js` | `getH12()`, `getMin()`, `getAmpm()`, `tzOffsetMin()`, `buildShareURL()`, `showToast()`, `flashBtn()`, `hl()` |
| `js/app.js` | Entry point only: reads URL params or localStorage, seeds DOM inputs, calls `convert()` and `bindEvents()` |

### State initialisation priority

`loadFromURL()` (query params `?h=&m=&ap=&tz=&fmt=`) → `loadSaved()` (localStorage key `clientsays-v1`) → current local time + detected timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.

### Conversion logic (`convert()` in `render.js`)

Uses today's date as the calendar anchor, so the offset is right for today and **not** for a meeting on a future date across a DST switch. Do not write copy that promises otherwise. Constructs a UTC `Date` from the hour/minute/ampm inputs and the source timezone offset (`tzOffsetMin()`), then formats it into each timezone in `state.targets` with `Intl.DateTimeFormat`. Day-offset badges compare `sv-SE` locale date strings (gives `YYYY-MM-DD`) between source and target.

### Destinations

`state.targets` is a user-editable array of IANA ids, seeded from `localStorage` key `clientsays-targets-v1` and defaulting to `['America/Santiago', 'America/Bogota', 'America/Mexico_City']`. The picker modal lists all 44 entries of `AVAILABLE_TARGETS` grouped by `region`; checking one pushes it, unchecking removes it (minimum 1). Cards are rendered from `state.targets` by `renderResultCards()` and reordered by pointer drag in `events.js`, and both paths call `saveTargets()`. The share URL (`buildShareURL()`) carries `h m ap tz fmt` only, never the destinations.

### Timezone combobox

State lives in `cb` object (exported from `render.js`): `{ open, active, filtered, query }`. `TZ_FLAT` is pre-computed at module load. Each entry has `{ id, label, abbr, group, search }` where `search` concatenates the IANA id, label, live abbreviation, and all alias strings from `TZ_ALIASES`. Filtering is a simple `String.includes()` on that pre-built search string.

The input auto-sizes itself to its content using a hidden `#tz-sizer` span.

### Jargon Translator

All data is a hardcoded `PHRASES` array in the script block (116 entries). Filter state is two module-level variables: `activeFilter` (category slug) and `searchQuery`. Both trigger a full `render()` on every change. No virtual DOM, just `innerHTML` replacement on `#phrase-list`.

---

## Design Tokens

| Token | Value |
|---|---|
| Background | `#040714` |
| Glass cards | `rgba(255,255,255,.03)` surface, `rgba(255,255,255,.1)` border |
| Accent blue | `#0063e5` / `#0080ff` |
| Header gradient | `135deg, #B015B0 0%, #3D0080 50%, #040714 100%` |
| Font | `'Avenir Next'` → system font stack |

## Known CSS Gotchas

- `backdrop-filter` on `.card` creates a stacking context: dropdowns that overlap it need `position: relative; z-index: 10` on the input card.
- `body { display: flex; flex-direction: column }` + `margin: 0 auto` on a child collapses its width: pair with explicit `width: 100%`.
- The `.tz-combobox` input width is controlled programmatically via `sizeTzInput()` when closed, and reverts to CSS when open (the `.open` class removes the inline width).
