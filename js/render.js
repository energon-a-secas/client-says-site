// ── render.js: DOM rendering, combobox, timezone display ────────────────────

import { state, TZ_FLAT, AVAILABLE_TARGETS, LS_KEY, LS_KEY_TARGETS } from './state.js';
import { getH12, getMin, getAmpm, tzOffsetMin, fmtOffset, COPY_SVG } from './utils.js';
import { esc, highlight, cleanTime, timeFromQuery, homeZone, pickTeam, peopleInZone } from './model.js';
import { colorFor, inkOn, initials, withDefaults, readMe } from './neorgon-workspace-core.js';

const TONES = 4;            // .tone-0 to .tone-3 in style.css: one accent family
const FACES = 4;            // faces drawn on a card before "+N"
const TARGET_META = new Map(AVAILABLE_TARGETS.map(t => [t.tz, t]));
const SOURCE_IDS = TZ_FLAT.map(o => o.id);

// Stable CSS-safe ID from a timezone string
export function tzToId(tz) {
    return tz.toLowerCase().replace(/\//g, '-').replace(/_/g, '-');
}

/** The city a destination names ("Tokyo"), for copy. */
export function placeName(tz) {
    const meta = TARGET_META.get(tz);
    return meta ? meta.city.split(' \u00b7 ')[0] : tz;
}

const DRAG_HANDLE_SVG = `<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
    <circle cx="3" cy="2"  r="1.3"/><circle cx="7" cy="2"  r="1.3"/>
    <circle cx="3" cy="7"  r="1.3"/><circle cx="7" cy="7"  r="1.3"/>
    <circle cx="3" cy="12" r="1.3"/><circle cx="7" cy="12" r="1.3"/>
</svg>`;

const node = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
};

/** The visitor's home zone: neo_me's, else this device's, when Client Says shows it. */
export function currentHome() {
    let raw = null;
    try { raw = readMe(document.cookie); } catch {}
    return homeZone(withDefaults(raw || {}), TARGET_META.keys());
}

/** Faces of the workspace people in a zone: the kit's colour and initials, names for screen readers. */
function facesFor(tz) {
    if (!state.teamWs || !state.teamId) return null;
    const team = state.teamId === '*' ? null : pickTeam(state.teamWs, state.teamId);
    const people = peopleInZone(state.teamWs, team, tz);
    if (!people.length) return null;
    const box = node('div', 'result-people');
    const row = node('div', 'cs-faces');
    row.setAttribute('aria-hidden', 'true');
    for (const p of people.slice(0, FACES)) {
        const bg = colorFor(p);
        const f = node('span', 'cs-face', initials(p.name));
        f.style.setProperty('--face', bg);
        f.style.setProperty('--face-ink', inkOn(bg));
        f.title = p.name;
        row.append(f);
    }
    if (people.length > FACES) row.append(node('span', 'cs-face cs-face-more', `+${people.length - FACES}`));
    const names = people.slice(0, 12).map(p => p.name).join(', ') + (people.length > 12 ? `, and ${people.length - 12} more` : '');
    box.append(row, node('span', 'sr-only', `Here: ${names}`));
    return box;
}

// ── Render result cards from state.targets (DOM only, no markup from data) ──
export function renderResultCards() {
    const grid = document.getElementById('results-grid');
    const home = currentHome();
    const shown = state.targets.filter(tz => TARGET_META.has(tz));
    const cards = shown.map((tz, i) => {
        const meta = TARGET_META.get(tz);
        const id = tzToId(tz);
        const card = node('article', `result-card tone-${i % TONES}`);
        card.id = `card-${id}`;
        card.dataset.tz = tz;
        card.setAttribute('aria-label', `${meta.country}, ${meta.city}`);

        const handle = node('button', 'drag-handle');
        handle.type = 'button';
        handle.dataset.tz = tz;
        handle.setAttribute('aria-label', `Move ${placeName(tz)}: position ${i + 1} of ${shown.length}`);
        handle.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight');
        handle.title = 'Drag, or use the arrow keys, to reorder';
        handle.innerHTML = DRAG_HANDLE_SVG;

        const copy = node('button', 'copy-btn');
        copy.type = 'button';
        copy.dataset.timeId = `time-${id}`;
        copy.setAttribute('aria-label', `Copy the time in ${placeName(tz)}`);
        copy.title = 'Copy time';
        copy.innerHTML = COPY_SVG;

        const flag = node('div', 'result-flag', meta.flag);
        flag.setAttribute('aria-hidden', 'true');
        const time = node('div', 'result-time', '\u2014');
        time.id = `time-${id}`;
        const metaRow = node('div', 'result-meta');
        const off = node('span', 'result-offset');
        off.id = `off-${id}`;
        const day = node('span', 'day-badge day-same', ' ');
        day.id = `day-${id}`;
        metaRow.append(off, day);
        card.append(handle, copy, flag, node('div', 'result-country', meta.country), node('div', 'result-city', meta.city), time, metaRow);
        if (tz === home) card.append(node('div', 'result-home', 'Your zone'));
        const faces = facesFor(tz);
        if (faces) card.append(faces);
        return card;
    });
    grid.replaceChildren(...cards);
}

// ── Render the destination picker (optionally filtered by query) ─────────────
export function renderPicker(query = '') {
    const list = document.getElementById('picker-list');
    const raw = String(query).trim();
    const q = raw.toLowerCase();
    const regions = [...new Set(AVAILABLE_TARGETS.map(t => t.region))];
    const html = regions.map(region => {
        const items = AVAILABLE_TARGETS.filter(t => {
            if (t.region !== region) return false;
            if (!q) return true;
            return (t.country + ' ' + t.city + ' ' + t.tz + ' ' + t.flag + ' ' + t.region + ' ' + (t.aliases ?? ''))
                .toLowerCase().includes(q);
        });
        if (items.length === 0) return '';
        return `<div class="picker-region" role="presentation">${esc(region)}</div>`
            + items.map(meta => `
                <label class="picker-item">
                    <input type="checkbox" class="picker-checkbox" data-tz="${esc(meta.tz)}"
                           ${state.targets.includes(meta.tz) ? 'checked' : ''}>
                    <span class="picker-flag" aria-hidden="true">${esc(meta.flag)}</span>
                    <span class="picker-info">
                        <span class="picker-primary">${esc(meta.city)}</span>
                        <span class="picker-secondary">${esc(meta.country)}</span>
                    </span>
                </label>`).join('');
    }).join('');
    if (html) { list.innerHTML = html; return; }
    // The typed query reaches the page as text only.
    list.replaceChildren(node('p', 'picker-no-results',
        `No destination matches \u201c${raw}\u201d. Try a city, a country or a zone such as Tokyo, Brazil or CET.`));
}

// ── Save selected destinations to localStorage ───────────────────────────────
export function saveTargets() {
    try { localStorage.setItem(LS_KEY_TARGETS, JSON.stringify(state.targets)); } catch {}
}

// ── DOM refs (cached on first call via lazy getter) ──────────────────────────
let _els = null;
function els() {
    if (!_els) {
        _els = {
            tzCombobox: document.getElementById('tz-combobox'),
            tzInput:    document.getElementById('tz-input'),
            tzDropdown: document.getElementById('tz-dropdown'),
            tzSizer:    document.getElementById('tz-sizer'),
            savedInd:   document.getElementById('saved-indicator'),
            inpHour:    document.getElementById('inp-hour'),
            inpMin:     document.getElementById('inp-min'),
        };
    }
    return _els;
}

// ── Combobox internal state ──────────────────────────────────────────────────
export const cb = {
    open:     false,
    active:   -1,
    filtered: TZ_FLAT,
    query:    '',
};

// ── Combobox helpers ─────────────────────────────────────────────────────────
export function cbFindOpt(id) {
    return TZ_FLAT.find(o => o.id === id);
}

export function cbDisplayText(id) {
    const o = cbFindOpt(id);
    return o ? o.abbr : id;
}

// Size the input to its displayed text (abbreviation when closed, query when typing)
export function sizeTzInput() {
    const { tzInput, tzSizer } = els();
    tzSizer.textContent = tzInput.value || tzInput.placeholder;
    // left-pad(14) + right-pad(36 for arrow) + borders(3) + buffer(5) = 58
    tzInput.style.width = Math.max(70, tzSizer.scrollWidth + 58) + 'px';
}

// ── Combobox rendering ───────────────────────────────────────────────────────
export function cbRender() {
    const { tzDropdown } = els();
    tzDropdown.innerHTML = '';
    if (cb.filtered.length === 0) {
        // The typed query reaches the page as text only, never as markup.
        tzDropdown.append(node('div', 'tz-no-results',
            `No time zone matches \u201c${cb.query}\u201d. Try a city or an abbreviation such as Chicago or PST.`));
        return;
    }
    let lastGroup = null;
    cb.filtered.forEach((opt, i) => {
        if (opt.group !== lastGroup) {
            lastGroup = opt.group;
            const hdr = document.createElement('div');
            hdr.className = 'tz-group-header';
            hdr.textContent = opt.group;
            tzDropdown.appendChild(hdr);
        }
        const el = document.createElement('div');
        el.className = 'tz-option'
            + (i === cb.active        ? ' active'      : '')
            + (opt.id === state.selectedTZ ? ' is-selected' : '');
        el.setAttribute('role', 'option');
        el.setAttribute('aria-selected', opt.id === state.selectedTZ);
        el.id = `tz-opt-${i}`;
        el.innerHTML = `<span class="tz-abbr">${highlight(opt.abbr, cb.query)}</span>`
                     + `<span class="tz-label">${highlight(opt.label, cb.query)}</span>`;
        el.addEventListener('mousedown', e => { e.preventDefault(); cbSelect(opt.id); });
        el.addEventListener('mousemove', () => { cb.active = i; cbMarkActive(); });
        tzDropdown.appendChild(el);
    });
    cbMarkActive();
}

export function cbMarkActive() {
    const { tzDropdown, tzInput } = els();
    tzDropdown.querySelectorAll('.tz-option')
        .forEach((el, i) => el.classList.toggle('active', i === cb.active));
    if (cb.active >= 0) tzInput.setAttribute('aria-activedescendant', `tz-opt-${cb.active}`);
    else tzInput.removeAttribute('aria-activedescendant');
}

export function cbScrollActive() {
    const { tzDropdown } = els();
    tzDropdown.querySelectorAll('.tz-option')[cb.active]?.scrollIntoView({ block: 'nearest' });
}

export function cbOpen_() {
    if (cb.open) return;
    const { tzInput, tzDropdown, tzCombobox } = els();
    cb.open = true;
    tzInput.style.width = ''; // CSS .open takes over
    cb.filtered = TZ_FLAT;
    cb.active = -1;
    cb.query = '';
    cbRender();
    tzDropdown.style.display = 'block';
    tzInput.setAttribute('aria-expanded', 'true');
    tzCombobox.classList.add('open');
    // Scroll current selection into view
    const idx = cb.filtered.findIndex(o => o.id === state.selectedTZ);
    if (idx >= 0) { cb.active = idx; setTimeout(() => cbScrollActive(), 0); }
}

export function cbClose(restoreVal = true) {
    if (!cb.open) return;
    const { tzInput, tzDropdown, tzCombobox } = els();
    cb.open = false;
    tzDropdown.style.display = 'none';
    tzInput.setAttribute('aria-expanded', 'false');
    tzInput.removeAttribute('aria-activedescendant');
    tzCombobox.classList.remove('open');
    if (restoreVal) tzInput.value = cbDisplayText(state.selectedTZ);
    sizeTzInput();
}

export function cbSelect(id) {
    const { tzInput } = els();
    state.selectedTZ = id;
    tzInput.value = cbDisplayText(id);
    cbClose(false);
    convert();
    saveDefaults();
}

// ── Main convert ─────────────────────────────────────────────────────────────
export function convert() {
    const h12 = getH12();
    const min = String(getMin()).padStart(2, '0');
    const ap  = getAmpm();
    let h24   = h12;
    if (ap === 'PM' && h24 !== 12) h24 += 12;
    if (ap === 'AM' && h24 === 12) h24  = 0;

    const now    = new Date();
    const utcRef = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(),
                                     h24, parseInt(min), 0));
    const srcOff = tzOffsetMin(state.selectedTZ, utcRef);
    const actual = new Date(utcRef.getTime() + srcOff * 60000);

    // Source date for day-diff comparison (sv-SE gives YYYY-MM-DD)
    const srcDate = new Intl.DateTimeFormat('sv-SE', { timeZone: state.selectedTZ }).format(actual);

    state.targets.forEach(tz => {
        const id     = tzToId(tz);
        const timeId = `time-${id}`;
        const dayId  = `day-${id}`;

        const raw = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour:   state.use24h ? '2-digit' : 'numeric',
            minute: '2-digit',
            hour12: !state.use24h,
        }).format(actual);

        const timeEl = document.getElementById(timeId);
        if (!timeEl) return;
        timeEl.classList.remove('pop');
        void timeEl.offsetWidth; // force reflow for re-animation
        if (state.use24h) {
            timeEl.textContent = raw;
        } else {
            const [timePart, ampmPart = ''] = raw.split(/\s+/);
            timeEl.replaceChildren(timePart, node('span', 'result-ampm', ampmPart));
        }
        const offEl = document.getElementById(`off-${id}`);
        if (offEl) offEl.textContent = fmtOffset(tzOffsetMin(tz, actual));
        timeEl.classList.add('pop');

        // Day offset badge
        const tgtDate = new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(actual);
        const diff    = Math.round(
            (new Date(tgtDate + 'T12:00:00Z') - new Date(srcDate + 'T12:00:00Z')) / 86400000
        );
        const dayEl = document.getElementById(dayId);
        if (!dayEl) return;
        dayEl.className = 'day-badge';
        if (diff === 0) {
            dayEl.classList.add('day-same'); dayEl.textContent = 'same day';
        } else if (diff > 0) {
            dayEl.classList.add('day-next');
            dayEl.textContent = diff === 1 ? '+ next day' : `+${diff} days`;
        } else {
            dayEl.classList.add('day-prev');
            dayEl.textContent = diff === -1 ? '\u2212 prev day' : `${diff} days`;
        }
    });
}

// ── LocalStorage ─────────────────────────────────────────────────────────────
export function saveDefaults() {
    const { savedInd } = els();
    try {
        localStorage.setItem(LS_KEY, JSON.stringify({
            hour: document.getElementById('inp-hour').value,
            minute: document.getElementById('inp-min').value,
            ampm: getAmpm(),
            tz: state.selectedTZ,
            fmt: state.use24h ? '24' : '12',
        }));
    } catch (_) {}
    // Flash indicator
    if (state.savedTimer) clearTimeout(state.savedTimer);
    savedInd.classList.add('show');
    state.savedTimer = setTimeout(() => savedInd.classList.remove('show'), 1800);
}

export function loadSaved() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(LS_KEY)); } catch {}
    return raw ? cleanTime(raw, SOURCE_IDS) : null;
}

// ── URL share (?h=&m=&ap=&tz=&fmt=), each value checked ──────────────────────
export function loadFromURL() {
    const got = timeFromQuery(location.search, SOURCE_IDS);
    if (!got) return false;
    if (got.hour)   document.getElementById('inp-hour').value = got.hour;
    if (got.minute) document.getElementById('inp-min').value  = got.minute;
    if (got.ampm)   document.getElementById('inp-ampm').textContent = got.ampm;
    if (got.fmt)    state.use24h = got.fmt === '24';
    if (got.tz)     state.selectedTZ = got.tz;
    return true;
}
