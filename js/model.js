// ── model.js: pure checks and the Workspace adapter (no DOM, Node-testable) ──
//
// Everything that arrives from the address bar, localStorage, the neo_me cookie
// or the workspace passes through here before the page uses it. The workspace
// itself has already been through the kit's normalizeWorkspace (the client does
// that); this module turns it into Client Says' own model: a list of zones.

export const DEFAULT_TARGETS = ['America/Santiago', 'America/Bogota', 'America/Mexico_City'];
const OFFSET = /^[+-]\d{1,2}(?::\d{2})?$/;

const own = (o, k) => (o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const asSet = (known) => (known instanceof Set ? known : new Set(known || []));

/** Escapes text for HTML, text and attribute values alike. */
export function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** The query highlighted in the text, both escaped. Matching runs on the raw text, so an entity is never split. */
export function highlight(text, query) {
    const t = String(text ?? '');
    const q = String(query ?? '');
    if (!q) return esc(t);
    const i = t.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(t);
    return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
}

/** Stored destinations: known zones only, each once, in order. Anything else gives the defaults. */
export function cleanTargets(raw, known) {
    const k = asSet(known);
    if (!Array.isArray(raw)) return [...DEFAULT_TARGETS];
    const out = [];
    for (const tz of raw.slice(0, 200)) {
        if (typeof tz === 'string' && k.has(tz) && !out.includes(tz)) out.push(tz);
    }
    return out.length ? out : [...DEFAULT_TARGETS];
}

/**
 * The time and source zone from a saved record or the share link's query.
 * Returns only the fields that are valid: hour 1..12, minute 00..59, AM or PM,
 * a source zone the combobox knows, a format of 12 or 24.
 */
export function cleanTime(raw, sources) {
    const k = asSet(sources);
    const out = {};
    const hour = String(own(raw, 'hour') ?? '').trim();
    if (/^\d{1,2}$/.test(hour) && +hour >= 1 && +hour <= 12) out.hour = String(+hour);
    const minute = String(own(raw, 'minute') ?? '').trim();
    if (/^\d{1,2}$/.test(minute) && +minute <= 59) out.minute = String(+minute).padStart(2, '0');
    const ampm = String(own(raw, 'ampm') ?? '').trim().toUpperCase();
    if (ampm === 'AM' || ampm === 'PM') out.ampm = ampm;
    const tz = own(raw, 'tz');
    if (typeof tz === 'string' && k.has(tz)) out.tz = tz;
    const fmt = String(own(raw, 'fmt') ?? '');
    if (fmt === '12' || fmt === '24') out.fmt = fmt;
    return out;
}

/** The share link's query, read through cleanTime. Null when the link carries no hour. */
export function timeFromQuery(search, sources) {
    let p;
    try { p = new URLSearchParams(search); } catch { return null; }
    if (!p.has('h')) return null;
    return cleanTime({ hour: p.get('h'), minute: p.get('m'), ampm: p.get('ap'), tz: p.get('tz'), fmt: p.get('fmt') }, sources);
}

/** The visitor's home zone (neo_me, else the device) when Client Says can show it, else ''. */
export function homeZone(prefs, known) {
    const tz = own(prefs, 'tz');
    return typeof tz === 'string' && asSet(known).has(tz) ? tz : '';
}

/** neo_me's time format as 24-hour or not; '' (this device's) asks the device. */
export function prefers24h(prefs, deviceCycle = '') {
    const c = own(prefs, 'c');
    if (c === 'h23') return true;
    if (c === 'h12') return false;
    return deviceCycle === 'h23' || deviceCycle === 'h24';
}

// ── The team ────────────────────────────────────────────────────────────────

/**
 * Which team "My team's zones" means: the one asked for by id, else the first
 * team the visitor (ws.me.person) belongs to, else the first team. Null when
 * the workspace has no teams, which means everyone in it.
 */
export function pickTeam(ws, teamId = '') {
    const teams = Array.isArray(own(ws, 'teams')) ? ws.teams : [];
    if (!teams.length) return null;
    if (teamId) {
        const asked = teams.find((t) => t.id === teamId);
        if (asked) return asked;
    }
    const me = own(own(ws, 'me'), 'person');
    if (me) {
        const mine = teams.find((t) => Array.isArray(t.members) && t.members.some((m) => m.person === me));
        if (mine) return mine;
    }
    return teams[0];
}

/** The people of a team (or the whole workspace when team is null), in member order. */
export function teamPeople(ws, team) {
    const people = Array.isArray(own(ws, 'people')) ? ws.people : [];
    if (!team) return people.slice();
    const byId = new Map(people.map((p) => [p.id, p]));
    const out = [];
    for (const m of Array.isArray(team.members) ? team.members : []) {
        const p = byId.get(m.person);
        if (p && !out.includes(p)) out.push(p);
    }
    return out;
}

/**
 * The distinct zones of a team, split into the ones Client Says can show (in
 * the order members first appear) and the ones it cannot, which are listed by
 * zone with the people in them, never dropped. People with no zone are listed too.
 */
export function teamZones(ws, team, known) {
    const k = asSet(known);
    const shown = new Map();
    const unshown = new Map();
    const noZone = [];
    for (const p of teamPeople(ws, team)) {
        const tz = typeof p.tz === 'string' ? p.tz : '';
        if (!tz) { noZone.push(p); continue; }
        const into = k.has(tz) ? shown : unshown;
        if (!into.has(tz)) into.set(tz, []);
        into.get(tz).push(p);
    }
    return {
        zones: [...shown].map(([tz, people]) => ({ tz, people })),
        missing: [...unshown].map(([tz, people]) => ({ tz, label: zoneLabel(tz), people })),
        noZone,
    };
}

/** An IANA zone as written, an offset as UTC+5:30. */
export function zoneLabel(tz) {
    const s = String(tz ?? '');
    return OFFSET.test(s) ? 'UTC' + s.replace('-', '−') : s;
}

/** The destinations with new zones appended, each once. */
export function mergeTargets(targets, zones) {
    const next = Array.isArray(targets) ? targets.slice() : [];
    const added = [];
    const already = [];
    for (const tz of zones) {
        if (added.includes(tz) || already.includes(tz)) continue;
        if (next.includes(tz)) { already.push(tz); continue; }
        next.push(tz);
        added.push(tz);
    }
    return { targets: next, added, already };
}

/** The workspace people in one zone, for the faces on that zone's card. */
export function peopleInZone(ws, team, tz) {
    return teamPeople(ws, team).filter((p) => p.tz === tz);
}

const names = (people, max = 3) => {
    const list = people.map((p) => p.name).filter(Boolean);
    if (list.length <= max) return list.join(', ');
    return `${list.slice(0, max).join(', ')} and ${list.length - max} more`;
};

/**
 * What adding a team's zones did, as plain lines (the caller sets them with
 * textContent). `place(tz)` names a zone Client Says shows ("Tokyo").
 */
export function describeAdd({ teamName, added, already, missing, noZone }, place = (tz) => tz) {
    const lines = [];
    const from = teamName ? ` from ${teamName}` : ' from your workspace';
    if (added.length) lines.push(`Added ${added.length} ${added.length === 1 ? 'zone' : 'zones'}${from}: ${added.map(place).join(', ')}.`);
    else if (already.length) lines.push(`Every zone${from} that Client Says can show is already here.`);
    else lines.push(`No zones to add${from}.`);
    if (missing.length) {
        lines.push(`Client Says cannot show ${missing.length === 1 ? 'this zone' : 'these zones'} yet: `
            + missing.map((m) => `${m.label} (${names(m.people)})`).join('; ') + '.');
    }
    if (noZone.length) lines.push(`No zone in your workspace for ${names(noZone)}. Add one on your workspace page.`);
    return lines;
}
