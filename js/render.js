// ── render.js — DOM rendering, combobox, timezone display ────────────────────

import { state, TZ_FLAT, TARGETS, LS_KEY } from './state.js';
import { getH12, getMin, getAmpm, tzOffsetMin, hl } from './utils.js';

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
        tzDropdown.innerHTML = '<div class="tz-no-results">No timezones match "' + cb.query + '"</div>';
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
        el.innerHTML = `<span class="tz-abbr">${hl(opt.abbr, cb.query)}</span>`
                     + `<span class="tz-label">${hl(opt.label, cb.query)}</span>`;
        el.addEventListener('mousedown', e => { e.preventDefault(); cbSelect(opt.id); });
        el.addEventListener('mousemove', () => { cb.active = i; cbMarkActive(); });
        tzDropdown.appendChild(el);
    });
}

export function cbMarkActive() {
    const { tzDropdown } = els();
    tzDropdown.querySelectorAll('.tz-option')
        .forEach((el, i) => el.classList.toggle('active', i === cb.active));
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
    tzCombobox.setAttribute('aria-expanded', 'true');
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
    tzCombobox.setAttribute('aria-expanded', 'false');
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

    TARGETS.forEach(({ tz, timeId, dayId }) => {
        const raw = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour:   state.use24h ? '2-digit' : 'numeric',
            minute: '2-digit',
            hour12: !state.use24h,
        }).format(actual);

        const timeEl = document.getElementById(timeId);
        timeEl.classList.remove('pop');
        void timeEl.offsetWidth; // force reflow for re-animation
        if (state.use24h) {
            timeEl.textContent = raw;
        } else {
            const [timePart, ampmPart] = raw.split(' ');
            timeEl.innerHTML = timePart
                + `<span class="result-ampm">${ampmPart}</span>`;
        }
        timeEl.classList.add('pop');

        // Day offset badge
        const tgtDate = new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(actual);
        const diff    = Math.round(
            (new Date(tgtDate + 'T12:00:00Z') - new Date(srcDate + 'T12:00:00Z')) / 86400000
        );
        const dayEl = document.getElementById(dayId);
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
    try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch { return null; }
}

// ── URL share ────────────────────────────────────────────────────────────────
export function loadFromURL() {
    const inpHour = document.getElementById('inp-hour');
    const inpMin  = document.getElementById('inp-min');
    const btnAmpm = document.getElementById('inp-ampm');
    const p = new URLSearchParams(location.search);
    if (!p.has('h')) return false;
    if (p.has('h'))  inpHour.value       = p.get('h');
    if (p.has('m'))  inpMin.value        = p.get('m');
    if (p.has('ap')) btnAmpm.textContent = p.get('ap');
    if (p.has('fmt')) state.use24h = p.get('fmt') === '24';
    if (p.has('tz')) {
        const id = p.get('tz');
        if (TZ_FLAT.find(o => o.id === id)) state.selectedTZ = id;
    }
    return true;
}
