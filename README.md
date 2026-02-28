# Client Says

A single-page timezone converter for remote teams. Type the time your client mentioned and instantly see it in Chile, Colombia, and Mexico — Daylight Saving Time handled automatically.

**Live:** [ehq.cl](https://ehq.cl/) · runs entirely in the browser, no build step, no backend.

---

## What it does

Enter the time and timezone a client used (e.g. *"3 PM ET"*) and the page converts it to:

| Target | Timezone |
|--------|----------|
| 🇨🇱 Chile | `America/Santiago` |
| 🇨🇴 Colombia | `America/Bogota` |
| 🇲🇽 Mexico | `America/Mexico_City` |

---

## Features

- **Searchable timezone picker** — type to filter by name, city, abbreviation, or alias (see table below). Arrow keys, Enter, and Tab all work.
- **Abbreviation aliases** — clients say things like "ET" instead of "EST". The search understands both.
- **Settings remembered** — your last-used time and timezone are saved in `localStorage` and restored on the next visit.
- **Share link** — copies a URL with the current selection encoded as query params, so anyone opening it sees the same conversion.
- **Copy per card** — clipboard button on each result card.
- **Now button** — resets the inputs to your current local time in one click.
- **12h / 24h toggle** — switch output format across all three cards.
- **DST-aware** — uses the browser's built-in IANA timezone database, so offsets are always correct for today's date.

---

## Timezone search aliases

The picker matches on timezone ID, city name, full name, live abbreviation (e.g. `EDT` in summer, `EST` in winter), and these common informal terms:

| Timezone | Aliases you can type |
|----------|----------------------|
| Eastern Time (New York) | `ET` `EST` `EDT` `eastern` `east coast` |
| Central Time (Chicago) | `CT` `CST` `CDT` `central` |
| Mountain Time (Denver) | `MT` `MST` `MDT` `mountain` |
| Pacific Time (Los Angeles) | `PT` `PST` `PDT` `pacific` `west coast` |
| Arizona (no DST) | `MST` `arizona` `az` |
| Alaska | `AKST` `AKDT` `alaska` |
| Hawaii | `HST` `hawaii` |
| UTC / GMT | `UTC` `GMT` `zulu` `z` `universal` |
| United Kingdom | `GMT` `BST` `uk` `gb` `britain` |
| Central Europe (Paris, Madrid, Berlin) | `CET` `CEST` |
| Russia (Moscow) | `MSK` |
| UAE (Dubai) | `GST` `gulf` |
| India | `IST` `india` `mumbai` |
| Japan | `JST` `japan` |
| Singapore | `SGT` |
| Australia (Sydney) | `AEST` `AEDT` `aus` |
| New Zealand | `NZST` `NZDT` `nz` |
| Chile | `CLT` `CLST` |
| Colombia | `COT` |
| Peru / Ecuador | `PET` |
| Venezuela | `VET` |
| Mexico (CDMX) | `CST` `CDT` `mx` `cdmx` |
| Brazil (São Paulo) | `BRT` `BRST` `brasil` |
| Argentina | `ART` `bsas` `ba` |

---

## Running locally

```bash
cd "Client Says"
python3 -m http.server 8080
# open http://localhost:8080
```

Or just open `index.html` directly in a browser — no dependencies, no install.

---

## Tech

Pure HTML + CSS + JavaScript. Conversion uses the [ECMAScript Internationalization API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl) (`Intl.DateTimeFormat`) which ships with every modern browser and is backed by the IANA timezone database.
