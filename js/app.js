// ── app.js — Entry point ─────────────────────────────────────────────────────

import { state, QUOTES, TZ_FLAT } from './state.js';
import { cbDisplayText, sizeTzInput, convert, loadSaved, loadFromURL } from './render.js';
import { bindEvents } from './events.js';

// ── Randomised quote ─────────────────────────────────────────────────────────
document.getElementById('client-quote').textContent =
    '\u201c' + QUOTES[Math.floor(Math.random() * QUOTES.length)] + '\u201d';

// ── Init ─────────────────────────────────────────────────────────────────────
const inpHour = document.getElementById('inp-hour');
const inpMin  = document.getElementById('inp-min');
const btnAmpm = document.getElementById('inp-ampm');
const btn12h  = document.getElementById('btn-12h');
const btn24h  = document.getElementById('btn-24h');
const tzInput = document.getElementById('tz-input');

// Priority: URL params > localStorage > local time / local TZ
const fromURL = loadFromURL();
if (!fromURL) {
    const saved = loadSaved();
    if (saved) {
        if (saved.hour)   inpHour.value       = saved.hour;
        if (saved.minute) inpMin.value        = saved.minute;
        if (saved.ampm)   btnAmpm.textContent = saved.ampm;
        if (saved.fmt)    state.use24h = saved.fmt === '24';
        if (saved.tz && TZ_FLAT.find(o => o.id === saved.tz)) state.selectedTZ = saved.tz;
    } else {
        // Default: current local time + detected timezone
        const n   = new Date();
        const h24 = n.getHours();
        inpHour.value       = String(h24 % 12 || 12);
        inpMin.value        = String(n.getMinutes()).padStart(2, '0');
        btnAmpm.textContent = h24 < 12 ? 'AM' : 'PM';
        const localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (TZ_FLAT.find(o => o.id === localTZ)) state.selectedTZ = localTZ;
    }
}

btn12h.classList.toggle('active', !state.use24h);
btn24h.classList.toggle('active',  state.use24h);
tzInput.value = cbDisplayText(state.selectedTZ);
sizeTzInput();
convert();

// ── Bind all event listeners ─────────────────────────────────────────────────
bindEvents();
