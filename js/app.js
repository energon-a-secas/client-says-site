// ── app.js: entry point ─────────────────────────────────────────────────────

import { state, QUOTES, TZ_FLAT } from './state.js';
import { cbDisplayText, sizeTzInput, convert, loadSaved, loadFromURL, renderResultCards } from './render.js';
import { bindEvents, openPicker } from './events.js';
import { startWorkspace, prefs } from './team.js';
import { prefers24h } from './model.js';

// The Workspace client first: it reads (and strips) a pick's answer from the address bar.
startWorkspace({ onOpenPicker: openPicker });

document.getElementById('client-quote').textContent =
    '“' + QUOTES[Math.floor(Math.random() * QUOTES.length)] + '”';

const inpHour = document.getElementById('inp-hour');
const inpMin  = document.getElementById('inp-min');
const btnAmpm = document.getElementById('inp-ampm');
const btn12h  = document.getElementById('btn-12h');
const btn24h  = document.getElementById('btn-24h');
const tzInput = document.getElementById('tz-input');

// Priority: the share link > this browser's last values > your settings (neo_me) > the device.
const deviceCycle = (() => { try { return Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle || ''; } catch { return ''; } })();
if (!loadFromURL()) {
    const saved = loadSaved() || {};
    const n = new Date();
    inpHour.value       = saved.hour   || String(n.getHours() % 12 || 12);
    inpMin.value        = saved.minute || String(n.getMinutes()).padStart(2, '0');
    btnAmpm.textContent = saved.ampm   || (n.getHours() < 12 ? 'AM' : 'PM');
    state.use24h = saved.fmt ? saved.fmt === '24' : prefers24h(prefs(), deviceCycle);
    const home = prefs().tz;
    state.selectedTZ = saved.tz || (TZ_FLAT.some(o => o.id === home) ? home : state.selectedTZ);
}

btn12h.classList.toggle('active', !state.use24h);
btn24h.classList.toggle('active',  state.use24h);
btn12h.setAttribute('aria-pressed', String(!state.use24h));
btn24h.setAttribute('aria-pressed', String(state.use24h));
tzInput.value = cbDisplayText(state.selectedTZ);
sizeTzInput();
renderResultCards();
convert();
bindEvents();
