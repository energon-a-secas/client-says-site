# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
make serve         # Start dev server at http://localhost:8803
make kill          # Stop the server
make test          # node --test tests/*.test.mjs (model.js: checks and the Workspace adapter)
make test-browser  # Playwright, three engines; starts this site on 9380 and neorgon-site (the frame) on 9381
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
| `js/state.js` | Mutable `state` object (`selectedTZ`, `use24h`, `savedTimer`, `targets`, `teamWs`, `teamId`); all static data: `TZ_GROUPS` (30 source zones), `TZ_ALIASES`, `TZ_FLAT`, `AVAILABLE_TARGETS` (44 destinations), `LS_KEY`, `LS_KEY_TARGETS`, `LS_KEY_TEAM` |
| `js/render.js` | `convert()`: core conversion logic; `renderResultCards()` / `renderPicker()` / `saveTargets()`; combobox open/close/render/select; `saveDefaults()` / `loadSaved()` / `loadFromURL()` |
| `js/events.js` | All DOM event listeners via `bindEvents()` |
| `js/utils.js` | `getH12()`, `getMin()`, `getAmpm()`, `tzOffsetMin()`, `fmtOffset()`, `buildShareURL()`, `showToast()`, `flashBtn()` |
| `js/model.js` | Pure, no DOM, Node-tested: `esc()`, `highlight()`, `cleanTargets()`, `cleanTime()`, `timeFromQuery()`, and the Workspace adapter (`pickTeam`, `teamZones`, `mergeTargets`, `peopleInZone`, `describeAdd`, `homeZone`, `prefers24h`) |
| `js/team.js` | The Neorgon Workspace: `NeoWorkspace.init({ tool: 'clientsays' })`, the gear, the use action ("Add my team's zones"), the Client Says section of the Settings sheet, the `#team-note` |
| `js/app.js` | Entry point only: starts the Workspace client first, reads URL params, localStorage or your settings, seeds DOM inputs, calls `convert()` and `bindEvents()` |
| `js/neorgon-workspace*.js`, `js/neorgon-persist.js`, `css/neorgon-workspace.css` | Vendored kits. Never edit: change `packages/neorgon-ui/workspace/` and run `sync-workspace.sh` |

### State initialisation priority

`loadFromURL()` (query params `?h=&m=&ap=&tz=&fmt=`), then `loadSaved()` (localStorage key `clientsays-v1`), then your Workspace settings (`neo_me`: the home zone as the source zone when the combobox lists it, the time format), then the device. Every value from the query and from localStorage goes through `cleanTime()` / `cleanTargets()` in `model.js`; nothing unchecked reaches the page.

### The Neorgon Workspace (read only)

The contract is `docs/plans/2026-11-03-neorgon-workspace.md` in the monorepo; the kit is `packages/neorgon-ui/workspace/`. Client Says reads and never writes:

- **Settings** (`neo_me`): the home zone (default source zone, and the "Your zone" line on that destination's card) and the time format.
- **The team**: "Add my team's zones" (the sheet's use action) adds the distinct zones of your team (the first team your `me.person` is in, else the first team) as cards; the section offers any other team or everyone. Zones not in `AVAILABLE_TARGETS` (another IANA zone, an offset) and people with no zone are listed in `#team-note`, never dropped. The team last used is `clientsays-team-v1` (`'*'` for everyone); its people show as faces on the cards with the kit's `colorFor` / `inkOn` / `initials`.
- The CSP's `frame-src` is `https://neorgon.com http://localhost:*` (any local port, the plan's Floorplan amendment: the client honours `localStorage['neo-ws:dev-origin']`, and with only `:8800` a frame on any other port was refused silently, so Settings said "No workspace yet" with a full workspace saved). The client frames localhost only when the page itself is served from localhost. The browser test runs against the real CSP.

### Conversion logic (`convert()` in `render.js`)

Uses today's date as the calendar anchor, so the offset is right for today and **not** for a meeting on a future date across a DST switch. Do not write copy that promises otherwise. Constructs a UTC `Date` from the hour/minute/ampm inputs and the source timezone offset (`tzOffsetMin()`), then formats it into each timezone in `state.targets` with `Intl.DateTimeFormat`. Day-offset badges compare `sv-SE` locale date strings (gives `YYYY-MM-DD`) between source and target.

### Destinations

`state.targets` is a user-editable array of IANA ids, seeded from `localStorage` key `clientsays-targets-v1` and defaulting to `['America/Santiago', 'America/Bogota', 'America/Mexico_City']`. The picker (a native `<dialog>`, so it is out of the tab order while closed and Escape closes it) lists all 44 entries of `AVAILABLE_TARGETS` grouped by `region`; checking one pushes it, unchecking removes it (minimum 1). Cards are built with DOM calls (no markup from data) from `state.targets` by `renderResultCards()`, each with its UTC offset, and reordered by pointer drag or by the arrow keys on a card's handle (`moveTarget()` in `events.js`); every path calls `saveTargets()`. The share URL (`buildShareURL()`) carries `h m ap tz fmt` only, never the destinations.

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
| Accent | One pink family, the hub card's: `--accent #f472b6`, `--accent-bright #f9a8d4`, `--accent-strong #be185d` (filled controls, white text), `--accent-deep #831843`; cards use `--tone-0..3`, all in `:root` of `css/style.css` |
| Header gradient | `135deg, #B015B0 0%, #3D0080 50%, #040714 100%` |
| Font | `'Avenir Next'` → system font stack |

Reading text is 12px or larger and every control is at least 44px; `tests/browser.mjs` checks both.

## Known CSS Gotchas

- `backdrop-filter` on `.card` creates a stacking context: dropdowns that overlap it need `position: relative; z-index: 10` on the input card.
- `body { display: flex; flex-direction: column }` + `margin: 0 auto` on a child collapses its width: pair with explicit `width: 100%`.
- The `.tz-combobox` input width is controlled programmatically via `sizeTzInput()` when closed, and reverts to CSS when open (the `.open` class removes the inline width).
- A native `<dialog>`'s `close` event is queued, so it can land after focus has moved on (the Settings sheet's "Edit destinations" closes the sheet and opens the picker in one click). The picker's close handler returns focus to its opener only when focus is still on `body` or inside the picker; the kit's sheet does the same.
- Escape inside the picker's `type="search"` field only clears the field in Chromium; the dialog's own `keydown` closes it at once.
