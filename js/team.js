// ── team.js: the Neorgon Workspace in Client Says ───────────────────────────
//
// Reads: the home zone and the time format from your settings (neo_me), and
// your team, whose distinct zones "My team's zones" adds as cards. Writes:
// nothing, Client Says keeps no people of its own. The kit (js/neorgon-workspace.js,
// vendored) owns the Settings sheet, the frame and the round trips; every DOM
// node built here takes text through textContent.

import { NeoWorkspace } from './neorgon-workspace.js';
import { state, AVAILABLE_TARGETS, LS_KEY_TEAM } from './state.js';
import { pickTeam, teamZones, mergeTargets, describeAdd, cleanTargets, DEFAULT_TARGETS } from './model.js';
import { renderResultCards, convert, saveTargets, placeName } from './render.js';

export const KNOWN = new Set(AVAILABLE_TARGETS.map((t) => t.tz));
let ws = null;
let openPicker = () => {};

const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'text') n.textContent = String(v);
        else n.setAttribute(k, v === true ? '' : String(v));
    }
    n.append(...kids.filter(Boolean));
    return n;
};

function readTeamId() {
    try { const v = localStorage.getItem(LS_KEY_TEAM); return typeof v === 'string' && /^[a-z0-9-]{1,48}$|^\*$/.test(v) ? v : ''; } catch { return ''; }
}
function writeTeamId(id) {
    try { localStorage.setItem(LS_KEY_TEAM, id); } catch { /* storage blocked: the faces last this visit */ }
}

/**
 * index.html moves a pick's answer (#neo-ws=...) out of the address before the
 * Header Kit's analytics can read it. Put it back for the one synchronous
 * moment the client needs: NeoWorkspace.init reads it, checks it against this
 * tab's pick marker and strips it again before any other script runs. As in
 * Reparto and Floorplan.
 */
function holdBackAnswer() {
    const held = window.__neoWsAnswer;
    try { delete window.__neoWsAnswer; } catch { window.__neoWsAnswer = undefined; }
    if (typeof held !== 'string' || !/^#neo-ws=[^\s]*$/.test(held) || held.length > 410000) return;
    try {
        if (location.hash === '' || location.hash === '#') history.replaceState(history.state, '', location.pathname + location.search + held);
    } catch { /* sandboxed: the answer is lost, the team still comes from the frame */ }
}

/** Starts the client. Call before anything reads location.hash (Client Says reads none of its own). */
export function startWorkspace({ onOpenPicker } = {}) {
    holdBackAnswer();
    if (typeof onOpenPicker === 'function') openPicker = onOpenPicker;
    state.teamId = readTeamId();
    ws = NeoWorkspace.init({
        tool: 'clientsays',
        name: 'Client Says',
        onTeam(workspace) { state.teamWs = workspace; renderResultCards(); convert(); },
        actions: {
            use: { label: 'Add my team’s zones', run(workspace) { addTeamZones(workspace, ''); } },
        },
        section: { title: 'Client Says', render: renderSection },
    });
    state.teamWs = ws.team().ws;
    ws.mountGear({ keepMobile: true });
    ws.on('prefs', () => { renderResultCards(); convert(); });
    return ws;
}

export const prefs = () => (ws ? ws.prefs() : {});

/** Adds the distinct zones of a team as cards and says what it could not show. */
export function addTeamZones(workspace, teamId) {
    if (!workspace) return null;
    const team = teamId === '*' ? null : pickTeam(workspace, teamId);
    const got = teamZones(workspace, team, KNOWN);
    const merged = mergeTargets(state.targets, got.zones.map((z) => z.tz));
    state.targets = cleanTargets(merged.targets, KNOWN);
    state.teamWs = workspace;
    state.teamId = team ? team.id : '*';
    writeTeamId(state.teamId);
    saveTargets();
    renderResultCards();
    convert();
    showNote(describeAdd({ teamName: team ? team.name : '', added: merged.added, already: merged.already, missing: got.missing, noZone: got.noZone }, placeName));
    return { team, ...got, ...merged };
}

// ── The note under the cards: what was added, what could not be shown ──────
function showNote(lines) {
    const box = document.getElementById('team-note');
    if (!box) return;
    const close = el('button', { type: 'button', class: 'team-note-close', 'aria-label': 'Dismiss this note' });
    close.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    close.addEventListener('click', () => {
        box.replaceChildren();
        document.getElementById('btn-add-destinations')?.focus();
    });
    box.replaceChildren(el('div', { class: 'team-note-text' }, ...lines.map((t) => el('p', { text: t }))), close);
}

// ── The tool's own section in the Settings sheet ────────────────────────────
function renderSection(box) {
    const dialog = () => box.closest('dialog');
    const places = state.targets.map(placeName).join(', ');
    box.append(el('p', { class: 'neo-ws-note', text: `Your destinations: ${places}.` }));

    const edit = el('button', { type: 'button', class: 'neo-ws-btn', text: 'Edit destinations' });
    edit.addEventListener('click', () => { dialog()?.close(); openPicker(document.querySelector('.neo-ws-gear')); });
    const reset = el('button', { type: 'button', class: 'neo-ws-btn', text: 'Reset destinations' });
    reset.addEventListener('click', () => {
        state.targets = [...DEFAULT_TARGETS];
        saveTargets(); renderResultCards(); convert();
        box.querySelector('.neo-ws-note').textContent = `Your destinations: ${state.targets.map(placeName).join(', ')}.`;
    });
    box.append(el('div', { class: 'neo-ws-actions' }, edit, reset));

    const workspace = ws ? ws.team().ws : null;
    if (!workspace || !workspace.people.length) {
        box.append(el('p', { class: 'neo-ws-hint', text: 'Once your team is here, add the zones its people work in as cards. Load your team above, or open your workspace to add people.' }));
        return;
    }
    const field = el('div', { class: 'neo-ws-field' });
    const id = 'cs-team-pick';
    const pick = el('select', { class: 'neo-ws-input', id });
    const current = pickTeam(workspace, state.teamId === '*' ? '' : state.teamId);
    for (const t of workspace.teams.slice(0, 100)) {
        const o = el('option', { value: t.id, text: `${t.name} (${t.members.length})` });
        if (current && t.id === current.id && state.teamId !== '*') o.selected = true;
        pick.append(o);
    }
    const all = el('option', { value: '*', text: `Everyone in your workspace (${workspace.people.length})` });
    if (!workspace.teams.length || state.teamId === '*') all.selected = true;
    pick.append(all);
    field.append(el('label', { for: id, text: 'Add the zones of' }), pick);
    const add = el('button', { type: 'button', class: 'neo-ws-btn neo-ws-primary', text: 'Add these zones' });
    add.addEventListener('click', () => { addTeamZones(workspace, pick.value); dialog()?.close(); });
    box.append(field, el('div', { class: 'neo-ws-actions' }, add));
}
