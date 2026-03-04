// ── events.js — Event handlers, user interactions ────────────────────────────

import { state, TZ_FLAT } from './state.js';
import { getH12, getMin, getAmpm, flashBtn, buildShareURL, showToast, COPY_SVG, CHECK_SVG } from './utils.js';
import {
    cb, cbOpen_, cbClose, cbSelect, cbRender, cbMarkActive, cbScrollActive,
    convert, saveDefaults, sizeTzInput,
} from './render.js';

// ── Bind all event listeners ─────────────────────────────────────────────────
export function bindEvents() {
    const inpHour  = document.getElementById('inp-hour');
    const inpMin   = document.getElementById('inp-min');
    const btnAmpm  = document.getElementById('inp-ampm');
    const btnNow   = document.getElementById('btn-now');
    const btnShare = document.getElementById('btn-share');
    const btn12h   = document.getElementById('btn-12h');
    const btn24h   = document.getElementById('btn-24h');
    const tzCombobox = document.getElementById('tz-combobox');
    const tzInput    = document.getElementById('tz-input');
    const navToggle  = document.getElementById('nav-toggle');
    const mainNav    = document.getElementById('main-nav');

    // ── Combobox events ──────────────────────────────────────────────────────
    tzInput.addEventListener('focus', () => {
        tzInput.select();
        cbOpen_();
    });

    tzInput.addEventListener('input', () => {
        cb.query    = tzInput.value.trim();
        cb.filtered = cb.query
            ? TZ_FLAT.filter(o => o.search.includes(cb.query.toLowerCase()))
            : TZ_FLAT;
        cb.active = cb.filtered.length > 0 ? 0 : -1;
        if (!cb.open) {
            cb.open = true;
            document.getElementById('tz-dropdown').style.display = 'block';
            tzCombobox.setAttribute('aria-expanded', 'true');
            tzCombobox.classList.add('open');
        }
        cbRender();
    });

    tzInput.addEventListener('keydown', e => {
        if (!cb.open && (e.key === 'ArrowDown' || e.key === 'Enter')) { cbOpen_(); return; }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                cb.active = Math.min(cb.active + 1, cb.filtered.length - 1);
                cbMarkActive(); cbScrollActive();
                break;
            case 'ArrowUp':
                e.preventDefault();
                cb.active = Math.max(cb.active - 1, 0);
                cbMarkActive(); cbScrollActive();
                break;
            case 'Enter':
                e.preventDefault();
                if (cb.active >= 0 && cb.filtered[cb.active]) cbSelect(cb.filtered[cb.active].id);
                break;
            case 'Tab':
                // Select highlighted item (if any) then let Tab move focus naturally
                if (cb.active >= 0 && cb.filtered[cb.active]) cbSelect(cb.filtered[cb.active].id);
                cbClose();
                break;
            case 'Escape':
                cbClose();
                tzInput.blur();
                break;
        }
    });

    // Click outside → close
    document.addEventListener('click', e => { if (!tzCombobox.contains(e.target)) cbClose(); });

    // ── Time input: blur ─────────────────────────────────────────────────────
    inpHour.addEventListener('blur', () => {
        inpHour.value = String(getH12());
        inpHour.classList.remove('invalid');
        convert(); saveDefaults();
    });
    inpMin.addEventListener('blur', () => {
        inpMin.value = String(getMin()).padStart(2, '0');
        inpMin.classList.remove('invalid');
        convert(); saveDefaults();
    });

    // ── Time input: live validation + auto-advance ───────────────────────────
    inpHour.addEventListener('input', () => {
        const raw = inpHour.value.replace(/\D/g, '');
        inpHour.value = raw;
        const n = parseInt(raw) || 0;
        inpHour.classList.toggle('invalid', raw.length > 0 && (n < 1 || n > 12));
        // Auto-advance: digit 2–9 can't be a valid 2-digit hour start → jump immediately;
        // two digits entered → jump
        if (raw.length === 2 || (raw.length === 1 && n >= 2 && n <= 9)) inpMin.focus();
        convert();
    });
    inpMin.addEventListener('input', () => {
        const raw = inpMin.value.replace(/\D/g, '');
        inpMin.value = raw;
        const n = parseInt(raw) || 0;
        inpMin.classList.toggle('invalid', raw.length === 2 && n > 59);
        if (raw.length === 2) btnAmpm.focus();
        convert();
    });

    // ── AM/PM toggle — click, Space/Enter, or press A / P ────────────────────
    btnAmpm.addEventListener('click', () => {
        btnAmpm.textContent = getAmpm() === 'AM' ? 'PM' : 'AM';
        convert(); saveDefaults();
    });
    btnAmpm.addEventListener('keydown', e => {
        if (e.key === 'a' || e.key === 'A') { btnAmpm.textContent = 'AM'; convert(); saveDefaults(); }
        if (e.key === 'p' || e.key === 'P') { btnAmpm.textContent = 'PM'; convert(); saveDefaults(); }
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            btnAmpm.textContent = getAmpm() === 'AM' ? 'PM' : 'AM';
            convert(); saveDefaults();
        }
    });

    // ── Hour stepper buttons ─────────────────────────────────────────────────
    document.getElementById('btn-hour-down').addEventListener('click', () => {
        const h = getH12();
        inpHour.value = String(h === 1 ? 12 : h - 1);
        convert(); saveDefaults();
    });
    document.getElementById('btn-hour-up').addEventListener('click', () => {
        const h = getH12();
        inpHour.value = String(h === 12 ? 1 : h + 1);
        convert(); saveDefaults();
    });

    // ── 12h / 24h toggle ─────────────────────────────────────────────────────
    [btn12h, btn24h].forEach(btn =>
        btn.addEventListener('click', () => {
            state.use24h = btn.dataset.fmt === '24';
            btn12h.classList.toggle('active', !state.use24h);
            btn24h.classList.toggle('active',  state.use24h);
            convert();
            saveDefaults();
        })
    );

    // ── Copy result buttons ──────────────────────────────────────────────────
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const timeEl = document.getElementById('time-' + btn.dataset.target);
            navigator.clipboard?.writeText(timeEl.textContent.trim()).then(() => {
                btn.classList.add('copied');
                flashBtn(btn, CHECK_SVG);
                setTimeout(() => btn.classList.remove('copied'), 1800);
                showToast('Time copied!');
            });
        });
    });

    // ── Share button ─────────────────────────────────────────────────────────
    btnShare.addEventListener('click', () => {
        navigator.clipboard?.writeText(buildShareURL(state)).then(() => {
            btnShare.classList.add('copied');
            flashBtn(btnShare,
                `${CHECK_SVG} <span>Link copied!</span>`, 2000);
            setTimeout(() => btnShare.classList.remove('copied'), 2000);
            showToast('Share link copied!');
        });
    });

    // ── Now button ───────────────────────────────────────────────────────────
    btnNow.addEventListener('click', () => {
        const n   = new Date();
        const h24 = n.getHours();
        inpHour.value       = String(h24 % 12 || 12);
        inpMin.value        = String(n.getMinutes()).padStart(2, '0');
        btnAmpm.textContent = h24 < 12 ? 'AM' : 'PM';
        convert();
        saveDefaults();
        // fire flash
        const orig = btnNow.innerHTML;
        btnNow.innerHTML = '\uD83D\uDD25';
        btnNow.classList.add('fired');
        setTimeout(() => {
            btnNow.innerHTML = orig;
            btnNow.classList.remove('fired');
        }, 950);
    });

    // ── Mobile nav hamburger ─────────────────────────────────────────────────
    navToggle.addEventListener('click', e => {
        e.stopPropagation();
        const open = mainNav.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', open);
    });

    // Close when tapping outside
    document.addEventListener('click', e => {
        if (mainNav.classList.contains('open') &&
            !mainNav.contains(e.target) &&
            !navToggle.contains(e.target)) {
            mainNav.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
        }
    });

    // Close when a nav link is followed
    mainNav.querySelectorAll('a').forEach(a =>
        a.addEventListener('click', () => {
            mainNav.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
        })
    );
}
