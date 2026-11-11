// node --test tests/   (the adapter between Client Says and the Neorgon Workspace)
import test from 'node:test'
import assert from 'node:assert/strict'
import * as M from '../js/model.js'
import { normalizeWorkspace, decodePayload, encodePayload } from '../js/neorgon-workspace-core.js'

const KNOWN = ['UTC', 'America/Santiago', 'America/Bogota', 'America/Mexico_City', 'Asia/Tokyo', 'Europe/Berlin', 'Asia/Kolkata']
const ws = normalizeWorkspace({
  v: 1,
  me: { person: 'kenji' },
  people: [
    { id: 'ana', name: 'Ana Rojas', tz: 'America/Santiago' },
    { id: 'kenji', name: 'Kenji Sato', tz: 'asia/tokyo' },          // any case: the kit spells it Asia/Tokyo
    { id: 'lea', name: 'Léa Müller', tz: 'Europe/Berlin' },
    { id: 'mia', name: 'Mia Chen', tz: 'Asia/Taipei' },              // a zone Client Says cannot show
    { id: 'priya', name: 'Priya Nair', tz: '+5:30' },                 // an offset: cannot show either
    { id: 'sam', name: 'Sam <b>Okafor</b>' },                         // no zone
    { id: 'tomas', name: 'Tomás Díaz', tz: 'America/Santiago' },
    { id: 'raj', name: 'Raj', tz: 'Asia/Calcutta' },                  // the old name: the kit reads Asia/Kolkata
  ],
  teams: [
    { id: 'payments', name: 'Payments', members: [{ person: 'ana' }, { person: 'lea' }] },
    { id: 'platform', name: 'Platform', members: [{ person: 'kenji' }, { person: 'mia' }, { person: 'priya' }, { person: 'sam' }, { person: 'tomas' }, { person: 'ana' }, { person: 'raj' }] },
  ],
}).ws

test('pickTeam: asked id, else the visitor\'s team, else the first, else everyone', () => {
  assert.equal(M.pickTeam(ws, 'payments').id, 'payments')
  assert.equal(M.pickTeam(ws, '').id, 'platform')               // Kenji (me) is in Platform
  assert.equal(M.pickTeam(ws, 'nope').id, 'platform')
  assert.equal(M.pickTeam({ ...ws, me: {} }, '').id, 'payments')
  assert.equal(M.pickTeam({ ...ws, teams: [] }, ''), null)
  assert.equal(M.pickTeam(null, ''), null)
  assert.equal(M.pickTeam({ teams: 'x' }, ''), null)
})

test('teamZones: distinct shown zones in member order; unshown and zoneless listed, never dropped', () => {
  const got = M.teamZones(ws, M.pickTeam(ws, 'platform'), KNOWN)
  assert.deepEqual(got.zones.map((z) => z.tz), ['Asia/Tokyo', 'America/Santiago', 'Asia/Kolkata'])
  assert.deepEqual(got.zones[1].people.map((p) => p.id), ['tomas', 'ana'])
  assert.deepEqual(got.missing.map((m) => [m.tz, m.label, m.people.map((p) => p.id)]), [
    ['Asia/Taipei', 'Asia/Taipei', ['mia']],
    ['+5:30', 'UTC+5:30', ['priya']],
  ])
  assert.deepEqual(got.noZone.map((p) => p.id), ['sam'])
  const shown = got.zones.reduce((n, z) => n + z.people.length, 0)
  const unshown = got.missing.reduce((n, z) => n + z.people.length, 0)
  assert.equal(shown + unshown + got.noZone.length, M.teamPeople(ws, M.pickTeam(ws, 'platform')).length)
})

test('teamZones: no team means everyone; a member listed twice counts once', () => {
  const all = M.teamZones(ws, null, KNOWN)
  assert.equal(all.zones.length + all.missing.length, 6)
  const twice = { ...ws, teams: [{ id: 't', name: 'T', members: [{ person: 'ana' }, { person: 'ana' }] }] }
  assert.equal(M.teamZones(twice, twice.teams[0], KNOWN).zones[0].people.length, 1)
})

test('mergeTargets appends only new zones and says which were already there', () => {
  const r = M.mergeTargets(['America/Santiago', 'America/Bogota'], ['Asia/Tokyo', 'America/Santiago', 'Asia/Tokyo'])
  assert.deepEqual(r.targets, ['America/Santiago', 'America/Bogota', 'Asia/Tokyo'])
  assert.deepEqual(r.added, ['Asia/Tokyo'])
  assert.deepEqual(r.already, ['America/Santiago'])
})

test('describeAdd lists what it added and every zone it could not show', () => {
  const team = M.pickTeam(ws, 'platform')
  const got = M.teamZones(ws, team, KNOWN)
  const merged = M.mergeTargets(['America/Santiago'], got.zones.map((z) => z.tz))
  const lines = M.describeAdd({ teamName: team.name, ...merged, ...got }, (tz) => tz.split('/')[1])
  assert.equal(lines[0], 'Added 2 zones from Platform: Tokyo, Kolkata.')
  assert.match(lines[1], /Asia\/Taipei \(Mia Chen\); UTC\+5:30 \(Priya Nair\)/)
  assert.match(lines[2], /Sam <b>Okafor<\/b>/)          // plain text: the caller sets it with textContent
  const again = M.describeAdd({ teamName: 'Payments', added: [], already: ['Europe/Berlin'], missing: [], noZone: [] })
  assert.equal(again.length, 1)
  assert.match(again[0], /already here/)
  const many = Array.from({ length: 5 }, (_, i) => ({ name: `P${i}` }))
  assert.match(M.describeAdd({ teamName: '', added: [], already: [], missing: [], noZone: many })[1], /P0, P1, P2 and 2 more/)
})

test('peopleInZone gives the faces for one card', () => {
  assert.deepEqual(M.peopleInZone(ws, M.pickTeam(ws, 'platform'), 'America/Santiago').map((p) => p.id), ['tomas', 'ana'])
  assert.deepEqual(M.peopleInZone(ws, null, 'Europe/Berlin').map((p) => p.id), ['lea'])
})

test('the adapter reads a payload the Workspace page would answer with', async () => {
  const text = await encodePayload({ v: 1, people: [{ name: 'X', tz: 'America/Bogota' }, { name: 'Y', tz: 'Mars/Base' }], teams: [{ name: 'Crew', members: [{ person: 'x' }, { person: 'y' }] }] })
  const back = decodePayload(text).ws
  const got = M.teamZones(back, M.pickTeam(back, ''), KNOWN)
  assert.deepEqual(got.zones.map((z) => z.tz), ['America/Bogota'])
  assert.deepEqual(got.noZone.map((p) => p.name), ['Y'])     // the kit dropped the impossible zone; the person is still listed
})

test('esc and highlight never let typed text become markup', () => {
  assert.equal(M.esc('<img src=x onerror=alert(1)>"\''), '&lt;img src=x onerror=alert(1)&gt;&quot;&#39;')
  assert.equal(M.highlight('A & B', '&'), 'A <mark>&amp;</mark> B')
  assert.equal(M.highlight('Tom & Jerry', 'amp;'), 'Tom &amp; Jerry')     // no match inside an entity
  assert.equal(M.highlight('<b>', '<b'), '<mark>&lt;b</mark>&gt;')
  assert.equal(M.highlight('Eastern', ''), 'Eastern')
})

test('cleanTargets keeps known zones once, in order; garbage gives the defaults', () => {
  assert.deepEqual(M.cleanTargets(['Asia/Tokyo', 'Asia/Tokyo', '<x>', 7, 'UTC'], KNOWN), ['Asia/Tokyo', 'UTC'])
  for (const bad of [null, {}, 'Asia/Tokyo', [], ['nope'], [{ toString: () => 'UTC' }]]) {
    assert.deepEqual(M.cleanTargets(bad, KNOWN), M.DEFAULT_TARGETS)
  }
  assert.notEqual(M.cleanTargets(null, KNOWN), M.DEFAULT_TARGETS)       // a copy, never the shared array
})

test('cleanTime and timeFromQuery keep only valid fields', () => {
  assert.deepEqual(M.cleanTime({ hour: '03', minute: '7', ampm: 'pm', tz: 'UTC', fmt: '24' }, KNOWN), { hour: '3', minute: '07', ampm: 'PM', tz: 'UTC', fmt: '24' })
  assert.deepEqual(M.cleanTime({ hour: '13', minute: '60', ampm: '<b>', tz: 'Mars/Base', fmt: '7' }, KNOWN), {})
  assert.deepEqual(M.cleanTime(Object.create({ hour: '3' }), KNOWN), {})
  assert.deepEqual(M.cleanTime(null, KNOWN), {})
  assert.equal(M.timeFromQuery('?tz=UTC', KNOWN), null)
  assert.deepEqual(M.timeFromQuery('?h=9&m=30&ap=AM&tz=Asia%2FTokyo&fmt=12', KNOWN), { hour: '9', minute: '30', ampm: 'AM', tz: 'Asia/Tokyo', fmt: '12' })
  assert.deepEqual(M.timeFromQuery('?h=<script>&ap=%3Cimg%3E', KNOWN), {})
})

test('homeZone and prefers24h read neo_me', () => {
  assert.equal(M.homeZone({ tz: 'Asia/Tokyo' }, KNOWN), 'Asia/Tokyo')
  assert.equal(M.homeZone({ tz: 'Asia/Taipei' }, KNOWN), '')
  assert.equal(M.homeZone(null, KNOWN), '')
  assert.equal(M.prefers24h({ c: 'h23' }), true)
  assert.equal(M.prefers24h({ c: 'h12' }, 'h23'), false)
  assert.equal(M.prefers24h({ c: '' }, 'h23'), true)
  assert.equal(M.prefers24h({ c: '' }, 'h12'), false)
  assert.equal(M.prefers24h({}, ''), false)
})

test('zoneLabel writes offsets as UTC with a real minus', () => {
  assert.equal(M.zoneLabel('-3'), 'UTC−3')
  assert.equal(M.zoneLabel('Asia/Tokyo'), 'Asia/Tokyo')
})
