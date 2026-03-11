// ── state.js — Mutable state, timezone data, target definitions ─────────────

// ── Available conversion targets (all supported destinations) ────────────────
export const AVAILABLE_TARGETS = [
    { tz: 'UTC',                            flag: '🌐', country: 'UTC / GMT',     city: 'Universal Time',        region: 'UTC / GMT'    },
    { tz: 'America/New_York',               flag: '🇺🇸', country: 'United States', city: 'New York · Eastern',    region: 'Americas'     },
    { tz: 'America/Chicago',                flag: '🇺🇸', country: 'United States', city: 'Chicago · Central',     region: 'Americas'     },
    { tz: 'America/Denver',                 flag: '🇺🇸', country: 'United States', city: 'Denver · Mountain',     region: 'Americas'     },
    { tz: 'America/Los_Angeles',            flag: '🇺🇸', country: 'United States', city: 'Los Angeles · Pacific', region: 'Americas'     },
    { tz: 'America/Phoenix',                flag: '🇺🇸', country: 'United States', city: 'Phoenix · Arizona',     region: 'Americas'     },
    { tz: 'America/Anchorage',              flag: '🇺🇸', country: 'United States', city: 'Anchorage · Alaska',    region: 'Americas'     },
    { tz: 'Pacific/Honolulu',               flag: '🇺🇸', country: 'United States', city: 'Honolulu · Hawaii',     region: 'Americas'     },
    { tz: 'America/Toronto',                flag: '🇨🇦', country: 'Canada',         city: 'Toronto',               region: 'Americas'     },
    { tz: 'America/Vancouver',              flag: '🇨🇦', country: 'Canada',         city: 'Vancouver',             region: 'Americas'     },
    { tz: 'America/Argentina/Buenos_Aires', flag: '🇦🇷', country: 'Argentina',      city: 'Buenos Aires',          region: 'Americas'     },
    { tz: 'America/Sao_Paulo',              flag: '🇧🇷', country: 'Brazil',         city: 'São Paulo',             region: 'Americas'     },
    { tz: 'America/Santiago',               flag: '🇨🇱', country: 'Chile',          city: 'Santiago',              region: 'Americas'     },
    { tz: 'America/Bogota',                 flag: '🇨🇴', country: 'Colombia',       city: 'Bogotá',                region: 'Americas'     },
    { tz: 'America/Lima',                   flag: '🇵🇪', country: 'Peru',           city: 'Lima',                  region: 'Americas'     },
    { tz: 'America/Caracas',                flag: '🇻🇪', country: 'Venezuela',      city: 'Caracas',               region: 'Americas'     },
    { tz: 'America/Mexico_City',            flag: '🇲🇽', country: 'Mexico',         city: 'Mexico City',           region: 'Americas'     },
    { tz: 'Europe/London',                  flag: '🇬🇧', country: 'United Kingdom', city: 'London',                region: 'Europe'       },
    { tz: 'Europe/Lisbon',                  flag: '🇵🇹', country: 'Portugal',       city: 'Lisbon',                region: 'Europe'       },
    { tz: 'Europe/Paris',                   flag: '🇫🇷', country: 'France',         city: 'Paris',                 region: 'Europe'       },
    { tz: 'Europe/Madrid',                  flag: '🇪🇸', country: 'Spain',          city: 'Madrid',                region: 'Europe'       },
    { tz: 'Europe/Berlin',                  flag: '🇩🇪', country: 'Germany',        city: 'Berlin',                region: 'Europe'       },
    { tz: 'Europe/Amsterdam',               flag: '🇳🇱', country: 'Netherlands',    city: 'Amsterdam',             region: 'Europe'       },
    { tz: 'Europe/Moscow',                  flag: '🇷🇺', country: 'Russia',         city: 'Moscow',                region: 'Europe'       },
    { tz: 'Asia/Dubai',                     flag: '🇦🇪', country: 'UAE',            city: 'Dubai',                 region: 'Asia & Pacific'},
    { tz: 'Asia/Kolkata',                   flag: '🇮🇳', country: 'India',          city: 'Mumbai',                region: 'Asia & Pacific'},
    { tz: 'Asia/Singapore',                 flag: '🇸🇬', country: 'Singapore',      city: 'Singapore',             region: 'Asia & Pacific'},
    { tz: 'Asia/Tokyo',                     flag: '🇯🇵', country: 'Japan',          city: 'Tokyo',                 region: 'Asia & Pacific'},
    { tz: 'Australia/Sydney',               flag: '🇦🇺', country: 'Australia',      city: 'Sydney',                region: 'Asia & Pacific'},
    { tz: 'Pacific/Auckland',               flag: '🇳🇿', country: 'New Zealand',    city: 'Auckland',              region: 'Asia & Pacific'},
];

export const LS_KEY_TARGETS = 'clientsays-targets-v1';

function _loadSavedTargets() {
    try {
        const s = JSON.parse(localStorage.getItem('clientsays-targets-v1'));
        if (Array.isArray(s) && s.length > 0) return s;
    } catch {}
    return ['America/Santiago', 'America/Bogota', 'America/Mexico_City'];
}

// ── Mutable state (exported as object so mutations are shared) ───────────────
export const state = {
    use24h:     false,
    selectedTZ: 'America/New_York',
    savedTimer: null,
    targets:    _loadSavedTargets(),
};

// ── Randomised quotes ────────────────────────────────────────────────────────
export const QUOTES = [
    'the meeting will be at',
    "let's schedule it for",
    'the call is at',
    'can we do',
    'they want to connect at',
    'the sync starts at',
    "they said",
    'the standup is at',
    'the deadline is at',
    "let's hop on at",
    'the interview is at',
    'the demo is scheduled for',
    "they mentioned",
    'the kickoff is at',
];

// ── Timezone list ────────────────────────────────────────────────────────────
export const TZ_GROUPS = [
    { label: 'UTC / GMT', zones: [
        ['UTC', 'UTC – Coordinated Universal Time'],
    ]},
    { label: 'United States & Canada', zones: [
        ['America/New_York',    'Eastern Time – New York, Miami, Toronto'],
        ['America/Chicago',     'Central Time – Chicago, Houston, Dallas'],
        ['America/Denver',      'Mountain Time – Denver, Calgary'],
        ['America/Los_Angeles', 'Pacific Time – Los Angeles, Vancouver'],
        ['America/Phoenix',     'Arizona – Phoenix (no DST)'],
        ['America/Anchorage',   'Alaska – Anchorage'],
        ['Pacific/Honolulu',    'Hawaii – Honolulu (no DST)'],
    ]},
    { label: 'Latin America', zones: [
        ['America/Argentina/Buenos_Aires', 'Argentina – Buenos Aires'],
        ['America/Sao_Paulo',   'Brazil – São Paulo'],
        ['America/Santiago',    'Chile – Santiago'],
        ['America/Bogota',      'Colombia – Bogotá'],
        ['America/Lima',        'Peru / Ecuador – Lima'],
        ['America/Caracas',     'Venezuela – Caracas'],
        ['America/Mexico_City', 'Mexico – Mexico City, CDMX'],
        ['America/Monterrey',   'Mexico – Monterrey'],
        ['America/Tijuana',     'Mexico – Tijuana (Pacific)'],
    ]},
    { label: 'Europe', zones: [
        ['Europe/London',    'United Kingdom – London'],
        ['Europe/Lisbon',    'Portugal – Lisbon'],
        ['Europe/Paris',     'France – Paris'],
        ['Europe/Madrid',    'Spain – Madrid'],
        ['Europe/Berlin',    'Germany – Berlin'],
        ['Europe/Amsterdam', 'Netherlands – Amsterdam'],
        ['Europe/Moscow',    'Russia – Moscow'],
    ]},
    { label: 'Asia & Pacific', zones: [
        ['Asia/Dubai',       'UAE – Dubai (UTC+4)'],
        ['Asia/Kolkata',     'India – Mumbai (UTC+5:30)'],
        ['Asia/Singapore',   'Singapore (UTC+8)'],
        ['Asia/Tokyo',       'Japan – Tokyo (UTC+9)'],
        ['Australia/Sydney', 'Australia – Sydney'],
        ['Pacific/Auckland', 'New Zealand – Auckland'],
    ]},
];

// Common informal aliases — covers short forms clients actually say
// (ET/CT/PT, seasonal pairs like EST/EDT, regional nicknames, etc.)
export const TZ_ALIASES = {
    'America/New_York':               'et est edt eastern east coast ny nyc',
    'America/Chicago':                'ct cst cdt central midwest chicago',
    'America/Denver':                 'mt mst mdt mountain denver',
    'America/Los_Angeles':            'pt pst pdt pacific west coast la los angeles',
    'America/Phoenix':                'mst arizona az phoenix no dst',
    'America/Anchorage':              'akst akdt alaska ak',
    'Pacific/Honolulu':               'hst hawaii hi',
    'America/Toronto':                'et est edt eastern canada toronto',
    'America/Vancouver':              'pt pst pdt pacific canada vancouver',
    'America/Santiago':               'clt clst chile',
    'America/Bogota':                 'cot colombia bogota',
    'America/Lima':                   'pet peru ecuador lima',
    'America/Caracas':                'vet venezuela',
    'America/Mexico_City':            'cst cdt mx mexico cdmx',
    'America/Monterrey':              'cst cdt mx mexico monterrey',
    'America/Tijuana':                'pst pdt mx mexico tijuana baja',
    'America/Sao_Paulo':              'brt brst brazil brasil sao paulo',
    'America/Argentina/Buenos_Aires': 'art argentina bsas ba',
    'UTC':                            'utc gmt universal zulu z',
    'Europe/London':                  'gmt bst uk gb england britain london',
    'Europe/Lisbon':                  'wet west portugal lisbon',
    'Europe/Paris':                   'cet cest france paris',
    'Europe/Madrid':                  'cet cest spain madrid',
    'Europe/Berlin':                  'cet cest germany berlin',
    'Europe/Amsterdam':               'cet cest netherlands amsterdam holland',
    'Europe/Moscow':                  'msk russia moscow',
    'Asia/Dubai':                     'gst gulf uae dubai',
    'Asia/Kolkata':                   'ist india mumbai delhi',
    'Asia/Singapore':                 'sgt singapore',
    'Asia/Tokyo':                     'jst japan tokyo',
    'Australia/Sydney':               'aest aedt australia sydney aus',
    'Pacific/Auckland':               'nzst nzdt nz new zealand auckland',
};

// Compute current abbreviation for a TZ (e.g. "EST", "CLST")
export function getTZAbbr(tz) {
    try {
        return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
            .formatToParts(new Date())
            .find(p => p.type === 'timeZoneName')?.value ?? '';
    } catch { return ''; }
}

// Flat list with pre-computed abbreviations and search string
export const TZ_FLAT = TZ_GROUPS.flatMap(g =>
    g.zones.map(([id, label]) => {
        const abbr    = getTZAbbr(id);
        const aliases = TZ_ALIASES[id] ?? '';
        return { id, label, abbr, group: g.label,
                 search: `${id} ${label} ${abbr} ${aliases}`.toLowerCase() };
    })
);

// ── LocalStorage key ─────────────────────────────────────────────────────────
export const LS_KEY = 'clientsays-v1';
