// ── utils.js — Small shared helpers ──────────────────────────────────────────

// ── SVG templates ────────────────────────────────────────────────────────────
export const COPY_SVG  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
export const CHECK_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

// ── Time input helpers ───────────────────────────────────────────────────────
export function getH12() {
    return Math.max(1, Math.min(12, parseInt(document.getElementById('inp-hour').value) || 12));
}

export function getMin() {
    return Math.max(0, Math.min(59, parseInt(document.getElementById('inp-min').value) || 0));
}

export function getAmpm() {
    return document.getElementById('inp-ampm').textContent.trim();
}

// ── Timezone offset helpers ──────────────────────────────────────────────────
// Minutes UTC is ahead of `tz` (positive = tz is west of UTC, e.g. EST = +300)
export function tzOffsetMin(tz, date) {
    const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const loc = new Date(date.toLocaleString('en-US', { timeZone: tz   }));
    return (utc - loc) / 60000;
}

export function fmtOffset(m) {
    const sign = m <= 0 ? '+' : '\u2212';
    const a    = Math.abs(m);
    return `UTC${sign}${String(Math.floor(a / 60)).padStart(2,'0')}:${String(a % 60).padStart(2,'0')}`;
}

// ── HTML-escape + highlight matched query ────────────────────────────────────
export function hl(text, q) {
    const safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    if (!q) return safe;
    const idx = safe.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return safe;
    return safe.slice(0, idx)
        + '<mark>' + safe.slice(idx, idx + q.length) + '</mark>'
        + safe.slice(idx + q.length);
}

// ── Toast notification ───────────────────────────────────────────────────────
let _toastTimer = null;
export function showToast(msg) {
    let el = document.getElementById('app-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'app-toast';
        el.className = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('visible'), 2000);
}

// ── Flash a button's inner HTML temporarily ──────────────────────────────────
export function flashBtn(btn, successHTML, duration = 1800) {
    const orig = btn.innerHTML;
    btn.innerHTML = successHTML;
    setTimeout(() => { btn.innerHTML = orig; }, duration);
}

// ── Share URL builder ────────────────────────────────────────────────────────
export function buildShareURL(state) {
    const inpHour = document.getElementById('inp-hour');
    const inpMin  = document.getElementById('inp-min');
    const p = new URLSearchParams({
        h: inpHour.value, m: inpMin.value, ap: getAmpm(),
        tz: state.selectedTZ, fmt: state.use24h ? '24' : '12',
    });
    return `${location.origin}${location.pathname}?${p}`;
}
