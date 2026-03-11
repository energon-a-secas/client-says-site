// ── state.js — Mutable state, timezone data, target definitions ─────────────

// ── Available conversion targets (all supported destinations) ────────────────
// `aliases` is extra search fodder — cities/terms that resolve to this entry
export const AVAILABLE_TARGETS = [
    // ── UTC ──────────────────────────────────────────────────────────────────
    { tz: 'UTC',                            flag: '🌐', country: 'UTC / GMT',     city: 'Universal Time',        region: 'UTC / GMT',      aliases: 'gmt universal zulu z' },

    // ── Americas ─────────────────────────────────────────────────────────────
    { tz: 'America/New_York',               flag: '🇺🇸', country: 'United States', city: 'New York · Eastern',    region: 'Americas',       aliases: 'nyc boston dc washington philadelphia miami atlanta charlotte detroit' },
    { tz: 'America/Chicago',                flag: '🇺🇸', country: 'United States', city: 'Chicago · Central',     region: 'Americas',       aliases: 'nashville minneapolis kansas city milwaukee st louis new orleans indiana' },
    { tz: 'America/Denver',                 flag: '🇺🇸', country: 'United States', city: 'Denver · Mountain',     region: 'Americas',       aliases: 'salt lake city albuquerque boise' },
    { tz: 'America/Los_Angeles',            flag: '🇺🇸', country: 'United States', city: 'Los Angeles · Pacific', region: 'Americas',       aliases: 'la seattle portland san francisco bay area sf san diego las vegas silicon valley' },
    { tz: 'America/Phoenix',                flag: '🇺🇸', country: 'United States', city: 'Phoenix · Arizona',     region: 'Americas',       aliases: 'tucson mesa scottsdale arizona' },
    { tz: 'America/Anchorage',              flag: '🇺🇸', country: 'United States', city: 'Anchorage · Alaska',    region: 'Americas',       aliases: '' },
    { tz: 'Pacific/Honolulu',               flag: '🇺🇸', country: 'United States', city: 'Honolulu · Hawaii',     region: 'Americas',       aliases: 'maui oahu hawaii' },
    { tz: 'America/Toronto',                flag: '🇨🇦', country: 'Canada',         city: 'Toronto',               region: 'Americas',       aliases: 'ottawa montreal quebec eastern canada' },
    { tz: 'America/Vancouver',              flag: '🇨🇦', country: 'Canada',         city: 'Vancouver',             region: 'Americas',       aliases: 'calgary edmonton western canada' },
    { tz: 'America/Argentina/Buenos_Aires', flag: '🇦🇷', country: 'Argentina',      city: 'Buenos Aires',          region: 'Americas',       aliases: 'cordoba rosario mendoza argentina bsas' },
    { tz: 'America/Sao_Paulo',              flag: '🇧🇷', country: 'Brazil',         city: 'São Paulo',             region: 'Americas',       aliases: 'rio de janeiro brasilia belo horizonte brazil brasil' },
    { tz: 'America/Santiago',               flag: '🇨🇱', country: 'Chile',          city: 'Santiago',              region: 'Americas',       aliases: 'valparaiso concepcion chile' },
    { tz: 'America/Bogota',                 flag: '🇨🇴', country: 'Colombia',       city: 'Bogotá',                region: 'Americas',       aliases: 'medellin cali barranquilla colombia' },
    { tz: 'America/Lima',                   flag: '🇵🇪', country: 'Peru',           city: 'Lima',                  region: 'Americas',       aliases: 'quito ecuador peru' },
    { tz: 'America/Caracas',                flag: '🇻🇪', country: 'Venezuela',      city: 'Caracas',               region: 'Americas',       aliases: 'venezuela' },
    { tz: 'America/Mexico_City',            flag: '🇲🇽', country: 'Mexico',         city: 'Mexico City',           region: 'Americas',       aliases: 'cdmx guadalajara puebla monterrey mexico' },

    // ── Europe ───────────────────────────────────────────────────────────────
    { tz: 'Europe/London',                  flag: '🇬🇧', country: 'United Kingdom', city: 'London',                region: 'Europe',         aliases: 'manchester birmingham edinburgh glasgow leeds sheffield bristol liverpool newcastle belfast cardiff wales scotland england ireland uk britain' },
    { tz: 'Europe/Lisbon',                  flag: '🇵🇹', country: 'Portugal',       city: 'Lisbon',                region: 'Europe',         aliases: 'porto portugal' },
    { tz: 'Europe/Paris',                   flag: '🇫🇷', country: 'France',         city: 'Paris',                 region: 'Europe',         aliases: 'lyon marseille nice toulouse france brussels belgium luxembourg' },
    { tz: 'Europe/Madrid',                  flag: '🇪🇸', country: 'Spain',          city: 'Madrid',                region: 'Europe',         aliases: 'barcelona valencia seville bilbao malaga spain' },
    { tz: 'Europe/Berlin',                  flag: '🇩🇪', country: 'Germany',        city: 'Berlin',                region: 'Europe',         aliases: 'munich frankfurt hamburg cologne dusseldorf stuttgart germany' },
    { tz: 'Europe/Rome',                    flag: '🇮🇹', country: 'Italy',          city: 'Rome',                  region: 'Europe',         aliases: 'milan florence naples venice turin bologna genoa italy' },
    { tz: 'Europe/Zurich',                  flag: '🇨🇭', country: 'Switzerland',    city: 'Zurich',                region: 'Europe',         aliases: 'geneva bern basel swiss switzerland' },
    { tz: 'Europe/Amsterdam',               flag: '🇳🇱', country: 'Netherlands',    city: 'Amsterdam',             region: 'Europe',         aliases: 'rotterdam the hague antwerp netherlands' },
    { tz: 'Europe/Stockholm',               flag: '🇸🇪', country: 'Sweden',         city: 'Stockholm',             region: 'Europe',         aliases: 'gothenburg malmo oslo norway copenhagen denmark helsinki finland nordic scandinavia' },
    { tz: 'Europe/Warsaw',                  flag: '🇵🇱', country: 'Poland',         city: 'Warsaw',                region: 'Europe',         aliases: 'krakow wroclaw gdansk prague czech budapest hungary austria wien vienna' },
    { tz: 'Europe/Istanbul',                flag: '🇹🇷', country: 'Turkey',         city: 'Istanbul',              region: 'Europe',         aliases: 'ankara izmir turkey' },
    { tz: 'Europe/Moscow',                  flag: '🇷🇺', country: 'Russia',         city: 'Moscow',                region: 'Europe',         aliases: 'saint petersburg russia' },

    // ── Africa ───────────────────────────────────────────────────────────────
    { tz: 'Africa/Cairo',                   flag: '🇪🇬', country: 'Egypt',          city: 'Cairo',                 region: 'Africa',         aliases: 'alexandria egypt' },
    { tz: 'Africa/Nairobi',                 flag: '🇰🇪', country: 'Kenya',          city: 'Nairobi',               region: 'Africa',         aliases: 'ethiopia addis ababa tanzania dar es salaam east africa uganda' },
    { tz: 'Africa/Lagos',                   flag: '🇳🇬', country: 'Nigeria',        city: 'Lagos',                 region: 'Africa',         aliases: 'abuja accra ghana senegal dakar west africa' },
    { tz: 'Africa/Johannesburg',            flag: '🇿🇦', country: 'South Africa',   city: 'Johannesburg',          region: 'Africa',         aliases: 'cape town durban pretoria south africa sa' },

    // ── Asia & Pacific ───────────────────────────────────────────────────────
    { tz: 'Asia/Dubai',                     flag: '🇦🇪', country: 'UAE',            city: 'Dubai',                 region: 'Asia & Pacific', aliases: 'abu dhabi sharjah emirates' },
    { tz: 'Asia/Riyadh',                    flag: '🇸🇦', country: 'Saudi Arabia',   city: 'Riyadh',                region: 'Asia & Pacific', aliases: 'jeddah mecca ksa kuwait bahrain qatar doha' },
    { tz: 'Asia/Kolkata',                   flag: '🇮🇳', country: 'India',          city: 'Mumbai',                region: 'Asia & Pacific', aliases: 'delhi new delhi bangalore hyderabad kolkata chennai pune india' },
    { tz: 'Asia/Bangkok',                   flag: '🇹🇭', country: 'Thailand',       city: 'Bangkok',               region: 'Asia & Pacific', aliases: 'phuket chiang mai thailand vietnam hanoi ho chi minh' },
    { tz: 'Asia/Singapore',                 flag: '🇸🇬', country: 'Singapore',      city: 'Singapore',             region: 'Asia & Pacific', aliases: 'kuala lumpur malaysia' },
    { tz: 'Asia/Shanghai',                  flag: '🇨🇳', country: 'China',          city: 'Shanghai',              region: 'Asia & Pacific', aliases: 'beijing guangzhou shenzhen chengdu china hong kong taipei taiwan' },
    { tz: 'Asia/Manila',                    flag: '🇵🇭', country: 'Philippines',    city: 'Manila',                region: 'Asia & Pacific', aliases: 'cebu davao philippines' },
    { tz: 'Asia/Seoul',                     flag: '🇰🇷', country: 'South Korea',    city: 'Seoul',                 region: 'Asia & Pacific', aliases: 'busan incheon korea' },
    { tz: 'Asia/Tokyo',                     flag: '🇯🇵', country: 'Japan',          city: 'Tokyo',                 region: 'Asia & Pacific', aliases: 'osaka kyoto nagoya japan' },
    { tz: 'Australia/Sydney',               flag: '🇦🇺', country: 'Australia',      city: 'Sydney',                region: 'Asia & Pacific', aliases: 'melbourne brisbane canberra perth australia' },
    { tz: 'Pacific/Auckland',               flag: '🇳🇿', country: 'New Zealand',    city: 'Auckland',              region: 'Asia & Pacific', aliases: 'wellington christchurch nz' },
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
