/**
 * Browser check for Client Says with the Neorgon Workspace, in Chromium, Firefox
 * and WebKit. Not a node --test file: it needs Playwright (the monorepo root's)
 * and two local servers, which it starts itself:
 *   this site on CS_TOOL_PORT (9380), the tool;
 *   neorgon-site on CS_FRAME_PORT (9381), serving workspace/vault.html.
 *
 *   node tests/browser.mjs [chromium,firefox,webkit]
 *
 * The page's CSP allows the frame from https://neorgon.com and any
 * http://localhost port, so the frame on 9381 is reached through the real CSP
 * (a separate check reads the CSP itself). Playwright turns Chromium's storage
 * partitioning off and sets Firefox's cookieBehavior to 4; both are put back to
 * the browsers' defaults here, or the sharing check passes for the wrong reason.
 * CS_SHOTS names a folder for the after screenshots (Chromium only).
 */
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = fileURLToPath(new URL('../', import.meta.url))
const ROOT = join(SITE, '../../')
const require = createRequire(join(ROOT, 'package.json'))
const { chromium, firefox, webkit } = require('playwright')
const W = await import('../js/neorgon-workspace-core.js')

const TOOL_PORT = Number(process.env.CS_TOOL_PORT || 9380)
const FRAME_PORT = Number(process.env.CS_FRAME_PORT || 9381)
const servers = [[TOOL_PORT, SITE], [FRAME_PORT, join(ROOT, 'projects/neorgon-site')]]
  .map(([port, dir]) => spawn('python3', [join(ROOT, 'scripts/serve.py'), String(port), dir], { stdio: 'ignore' }))
process.on('exit', () => servers.forEach((s) => s.kill()))
await new Promise((r) => setTimeout(r, 900))

const TOOL = `http://localhost:${TOOL_PORT}/`
const FRAME = `http://localhost:${FRAME_PORT}`
const SHOTS = process.env.CS_SHOTS || ''
const engines = (process.argv[2] || 'chromium,firefox,webkit').split(',')
let v = Date.now() % 100000
const results = []
const check = (eng, name, ok, extra = '') => { results.push({ ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${eng}: ${name}${ok || !extra ? '' : ' ' + extra}`) }

const TEAM = {
  v: 1,
  me: { person: 'kenji' },
  people: [
    { id: 'ana', name: 'Ana Rojas', tz: 'America/Santiago' },
    { id: 'kenji', name: 'Kenji Sato', tz: 'Asia/Tokyo' },
    { id: 'lea', name: 'Léa Müller', tz: 'Europe/Berlin' },
    { id: 'mia', name: 'Mia <img src=x onerror="window.__pwned=1">', tz: 'Asia/Taipei' },
    { id: 'priya', name: 'Priya Nair', tz: '+5:30' },
    { id: 'sam', name: 'Sam Okafor' },
    { id: 'tomas', name: 'Tomás Díaz', tz: 'America/Santiago' },
  ],
  teams: [
    { id: 'payments', name: 'Payments', members: [{ person: 'ana' }, { person: 'lea' }] },
    { id: 'platform', name: 'Platform <b>x</b>', members: ['kenji', 'mia', 'priya', 'sam', 'tomas', 'ana'].map((person) => ({ person })) },
  ],
}

async function launch(eng) {
  if (eng === 'chromium') {
    const probe = await chromium.launch({ args: ['--enable-automation'] })
    const cdp = await probe.newBrowserCDPSession()
    const cmd = (await cdp.send('Browser.getBrowserCommandLine')).arguments.join(' ')
    await probe.close()
    const arg = (cmd.match(/--disable-features=\S+/) || [])[0]
    if (!arg) return chromium.launch()
    const kept = arg.replace(/(,)?ThirdPartyStoragePartitioning/, '').replace('=,', '=')
    return chromium.launch({ ignoreDefaultArgs: [arg], args: [kept] })
  }
  if (eng === 'firefox') return firefox.launch({ firefoxUserPrefs: { 'network.cookie.cookieBehavior': 5 } })
  return webkit.launch()
}

async function go(page, url) {
  for (let i = 0; ; i++) {
    try { return await page.goto(url) } catch (err) {
      if (i >= 3 || !/connect|CONNECTION_REFUSED|NS_ERROR_NET|reset/i.test(String(err))) throw err
      await page.waitForTimeout(400)
    }
  }
}

const smallText = (page) => page.evaluate(() => {
  const out = []
  for (const el of document.querySelectorAll('main *, dialog *')) {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!own || el.closest('.sr-only, [aria-hidden="true"]')) continue
    const px = parseFloat(getComputedStyle(el).fontSize)
    if (px < 12) out.push(`${el.className || el.tagName} ${px}px`)
  }
  return out
})

const smallTargets = (page, scope) => page.evaluate((scope) => {
  const out = []
  for (const el of document.querySelectorAll(`${scope} button, ${scope} input, ${scope} label.picker-item`)) {
    const r = el.getBoundingClientRect()
    if (!r.width || el.type === 'checkbox' || el.closest('#tz-sizer')) continue
    if (r.width < 44 - 0.5 || r.height < 44 - 0.5) out.push(`${el.id || el.className} ${Math.round(r.width)}x${Math.round(r.height)}`)
  }
  return out
}, scope)

for (const eng of engines) {
  const browser = await launch(eng)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const errors = []
  const requests = []
  ctx.on('request', (r) => requests.push(r.url()))
  ctx.on('page', (p) => {
    p.on('pageerror', (e) => errors.push(String(e)))
    p.on('console', (m) => { if (m.type() === 'error' && !/stylesheet|Content Security Policy|Content-Security-Policy|favicon/i.test(m.text())) errors.push(m.text()) })
  })
  try {
    // Seed neorgon.com's storage (the frame's origin) with a team.
    const stamp = W.makeStamp()
    const frameTab = await ctx.newPage()
    await go(frameTab, `${FRAME}/workspace/vault.html?v=${++v}`)
    await frameTab.evaluate(([rec, cookie]) => { localStorage.setItem('neo-ws:workspace', JSON.stringify(rec)); document.cookie = cookie },
      [{ __v: W.STORE_VERSION, data: { stamp, ws: W.normalizeWorkspace(TEAM).ws } }, W.stampCookie(stamp, { protocol: 'http:', hostname: 'localhost' })])

    const page = await ctx.newPage()
    await go(page, `${TOOL}robots.txt`)   // the tool's origin, before the page first looks for a frame
    await page.evaluate((o) => { localStorage.clear(); localStorage.setItem('neo-ws:dev-origin', o) }, FRAME)

    // 1. Home zone and time format from neo_me (no saved values, no link).
    await page.evaluate((c) => { document.cookie = c }, W.meCookie({ tz: 'Asia/Tokyo', c: 'h23' }, { protocol: 'http:', hostname: 'localhost' }))
    await go(page, `${TOOL}?v=${++v}`)
    const home = await page.evaluate(() => ({ tz: document.getElementById('tz-input').value, h24: document.getElementById('btn-24h').getAttribute('aria-pressed') }))
    check(eng, 'home zone and 24-hour clock from neo_me', /^(JST|GMT\+9)$/.test(home.tz) && home.h24 === 'true', JSON.stringify(home))

    // 2. The frame shares the team; the sheet's use action adds its distinct zones.
    let shared = false
    for (let i = 0; i < 60 && !shared; i++) { shared = await page.evaluate(() => !!document.querySelector('.neo-ws-gear')) && await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('neo-ws:cache')).data.ws.people.length === 7 } catch { return false } }); if (!shared) await page.waitForTimeout(100) }
    check(eng, 'frame shares the team (cached)', shared)
    await page.locator('body').click({ position: { x: 5, y: 880 } })
    await page.keyboard.press(',')
    check(eng, ', opens the Settings sheet', (await page.locator('dialog.neo-ws-sheet[open]').count()) === 1)
    const sectionText = await page.locator('dialog.neo-ws-sheet').innerText()
    check(eng, 'the sheet carries the Client Says section', /Your destinations: Santiago, Bogot/.test(sectionText) && /Add the zones of/.test(sectionText))
    await page.getByRole('button', { name: 'Add my team’s zones' }).click()
    const cards = await page.$$eval('.result-card', (els) => els.map((e) => e.dataset.tz))
    check(eng, 'my team (Platform, mine) adds Tokyo once', JSON.stringify(cards) === JSON.stringify(['America/Santiago', 'America/Bogota', 'America/Mexico_City', 'Asia/Tokyo']), JSON.stringify(cards))
    const note = await page.locator('#team-note').innerText()
    check(eng, 'zones it cannot show are listed, by name, as text', /Added 1 zone from Platform <b>x<\/b>: Tokyo/.test(note) && /Asia\/Taipei \(Mia <img/.test(note) && /UTC\+5:30 \(Priya Nair\)/.test(note) && /Sam Okafor/.test(note), note)
    const injected = await page.evaluate(() => ({ img: document.querySelectorAll('#team-note img, .result-card img, dialog b').length, pwned: window.__pwned === 1 }))
    check(eng, 'no workspace value becomes markup', injected.img === 0 && !injected.pwned, JSON.stringify(injected))
    const faces = await page.$$eval('#card-america-santiago .cs-face', (els) => els.map((e) => [e.textContent, e.style.getPropertyValue('--face')]))
    const want = [W.normalizeWorkspace(TEAM).ws.people.find((p) => p.id === 'tomas'), W.normalizeWorkspace(TEAM).ws.people.find((p) => p.id === 'ana')]
      .map((p) => [W.initials(p.name), W.colorFor(p)])
    check(eng, 'faces use the kit\'s initials and colour', JSON.stringify(faces) === JSON.stringify(want), JSON.stringify(faces))
    check(eng, 'Tokyo card says Your zone', (await page.locator('#card-asia-tokyo .result-home').count()) === 1)

    // 3. Pick another team in the section: adds Berlin; adding the same team again adds nothing.
    await page.locator('.neo-ws-gear').click()
    await page.locator('#cs-team-pick').selectOption('payments')
    await page.getByRole('button', { name: 'Add these zones' }).click()
    await page.locator('.neo-ws-gear').click()
    await page.locator('#cs-team-pick').selectOption('payments')
    await page.getByRole('button', { name: 'Add these zones' }).click()
    const after = await page.$$eval('.result-card', (els) => els.map((e) => e.dataset.tz))
    check(eng, 'another team adds only its new zones, once', after.filter((t) => t === 'Europe/Berlin').length === 1 && after.length === 5 && /already here/.test(await page.locator('#team-note').innerText()), JSON.stringify(after))
    const focusAfterSheet = await page.evaluate(() => document.activeElement && document.activeElement.className)
    check(eng, 'focus returns to the gear', focusAfterSheet === 'neo-ws-gear', focusAfterSheet)

    // 4. UTC offset on every card.
    const offs = await page.$$eval('.result-offset', (els) => els.map((e) => e.textContent))
    check(eng, 'every card shows its UTC offset', offs.length === 5 && offs.every((t) => /^UTC[+−]\d{1,2}(:\d{2})?$/.test(t)) && offs.includes('UTC+9'), JSON.stringify(offs))

    // 5. The typed query is text, in the combobox and the picker.
    const evil = '<img src=x onerror="window.__pwned=2">'
    await page.locator('#tz-input').fill(evil)
    const tzEmpty = await page.locator('.tz-no-results').innerText()
    check(eng, 'combobox: a query with markup shows as text', tzEmpty.includes(evil) && (await page.locator('#tz-dropdown img').count()) === 0)
    await page.keyboard.press('Escape')
    await page.locator('#tz-input').fill('&amp')
    check(eng, 'combobox: & highlights without splitting an entity', (await page.locator('#tz-dropdown mark').count()) === 0)
    await page.keyboard.press('Escape')

    // 6. The closed picker is out of the tab order; open, Escape, focus back.
    await page.locator('#btn-share').focus()
    const stops = []
    for (let i = 0; i < 25; i++) { await page.keyboard.press('Shift+Tab'); stops.push(await page.evaluate(() => !!document.activeElement.closest('#country-picker-modal'))) }
    check(eng, 'closed picker: nothing in it takes focus', stops.every((x) => !x))
    await page.locator('#btn-add-destinations').click()
    const pickerOpen = await page.evaluate(() => document.getElementById('country-picker-modal').open && document.activeElement.id)
    await page.locator('#picker-search').fill(evil)
    const pickEmpty = await page.locator('.picker-no-results').innerText()
    check(eng, 'picker: opens on its search; a query with markup shows as text', pickerOpen === 'picker-search' && pickEmpty.includes(evil) && (await page.locator('#picker-list img').count()) === 0)
    await page.keyboard.press('Escape')
    const back = await page.evaluate(() => [document.getElementById('country-picker-modal').open, document.activeElement.id])
    check(eng, 'picker: Escape closes, focus back on Edit destinations', back[0] === false && back[1] === 'btn-add-destinations', JSON.stringify(back))
    check(eng, 'nothing set window.__pwned', !(await page.evaluate(() => window.__pwned)))

    // 7. Reorder from the keyboard.
    await page.locator('.drag-handle').first().focus()
    await page.keyboard.press('ArrowRight')
    const moved = await page.$$eval('.result-card', (els) => els.map((e) => e.dataset.tz).slice(0, 2))
    const handleFocus = await page.evaluate(() => document.activeElement.dataset.tz)
    check(eng, 'arrow keys move a card and keep focus on it', moved[1] === 'America/Santiago' && handleFocus === 'America/Santiago', JSON.stringify(moved) + ' ' + handleFocus + ' ' + await page.evaluate(() => document.activeElement.outerHTML.slice(0, 120)))

    // 8. Reading text is 12px or larger; one accent.
    await page.locator('#btn-add-destinations').click()
    const small = await smallText(page)
    await page.keyboard.press('Escape')
    await page.locator('#tz-input').focus()
    const smallDrop = await smallText(page)
    await page.keyboard.press('Escape')
    check(eng, 'no reading text under 12px', !small.length && !smallDrop.length, JSON.stringify(small.concat(smallDrop).slice(0, 6)))
    const accent = await page.evaluate(() => getComputedStyle(document.querySelector('.toggle-btn.active')).backgroundColor)
    check(eng, 'the active toggle is the accent family', accent === 'rgb(190, 24, 93)', accent)

    // 9. Stored garbage is read through the checks.
    await page.evaluate(() => {
      localStorage.setItem('clientsays-targets-v1', JSON.stringify(['<img src=x onerror="window.__pwned=3">', 'Asia/Tokyo', 'Asia/Tokyo']))
      localStorage.setItem('clientsays-v1', JSON.stringify({ hour: '99', minute: 'x', ampm: '<b>x</b>', tz: 'Mars/Base', fmt: '12' }))
    })
    await go(page, `${TOOL}?v=${++v}`)
    const g = await page.evaluate(() => ({ cards: [...document.querySelectorAll('.result-card')].map((e) => e.dataset.tz), ampm: document.getElementById('inp-ampm').textContent, hour: document.getElementById('inp-hour').value, pwned: window.__pwned }))
    check(eng, 'stored garbage is ignored', JSON.stringify(g.cards) === '["Asia/Tokyo"]' && /^(AM|PM)$/.test(g.ampm) && +g.hour >= 1 && +g.hour <= 12 && !g.pwned, JSON.stringify(g))
    await go(page, `${TOOL}?h=%3Cb%3E&ap=%3Cimg%3E&tz=Mars&v=${++v}`)
    check(eng, 'a share link with garbage changes nothing it should not', /^(AM|PM)$/.test(await page.locator('#inp-ampm').innerText()))

    // 10. The CSP names the frame; no request carries an answer.
    const csp = await page.evaluate(() => document.querySelector('meta[http-equiv="Content-Security-Policy"]').content)
    check(eng, 'CSP frame-src allows neorgon.com and any local port', /frame-src https:\/\/neorgon\.com http:\/\/localhost:\*(;|$)/.test(csp))
    check(eng, 'no request carries neo-ws=', !requests.some((u) => /neo-ws=/.test(u)))

    // 11. A phone: every control 44px.
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, `${TOOL}?v=${++v}`)
    const tiny = await smallTargets(page, 'main')
    await page.locator('#btn-add-destinations').click()
    const tinyPicker = await smallTargets(page, '#country-picker-modal')
    await page.keyboard.press('Escape')
    check(eng, '44px controls on a phone', !tiny.length && !tinyPicker.length, JSON.stringify(tiny.concat(tinyPicker)))
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    check(eng, 'no sideways scroll at 390', overflow <= 0, String(overflow))

    if (SHOTS && eng === 'chromium') {
      await page.evaluate(() => localStorage.removeItem('clientsays-targets-v1'))
      for (const w of [1440, 390]) {
        await page.setViewportSize({ width: w, height: w > 500 ? 900 : 844 })
        await go(page, `${TOOL}?h=3&m=30&ap=PM&tz=America/New_York&fmt=12&v=${++v}`)
        await page.evaluate(() => document.activeElement && document.activeElement.blur())
        await page.locator('.neo-ws-gear').click()
        await page.locator('#cs-team-pick').selectOption('platform')
        await page.getByRole('button', { name: 'Add these zones' }).click()
        await page.evaluate(() => document.activeElement && document.activeElement.blur())
        await page.waitForTimeout(400)
        await page.screenshot({ path: `${SHOTS}/clientsays-after-${w}.png`, fullPage: true })
        await page.locator('.neo-ws-gear').click()
        await page.waitForTimeout(300)
        await page.screenshot({ path: `${SHOTS}/clientsays-after-sheet-${w}.png` })
        await page.keyboard.press('Escape')
      }
    }

    // 12. Analytics on the production host (Chromium): no beacon runs while the address holds a pick's answer.
    // On localhost the Header Kit starts no analytics, so this serves the page as clientsays.neorgon.com from disk.
    if (eng === 'chromium') {
      const prod = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const local = (base) => async (route) => {
        const u = new URL(route.request().url())
        try {
          const res = await fetch(base + u.pathname + u.search)
          await route.fulfill({ status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'text/html' }, body: Buffer.from(await res.arrayBuffer()) })
        } catch { await route.abort().catch(() => {}) }   // a server stopped, or the page already gone
      }
      await prod.route(/^https:\/\/clientsays\.neorgon\.com\//, local(TOOL.replace(/\/$/, '')))
      await prod.route(/^https:\/\/(www\.)?neorgon\.com\//, local(FRAME))
      await prod.route(/^https:\/\/(cdn\.neorgon\.org|clerk\.neorgon\.com|challenges\.cloudflare\.com)\//, (route) => route.fulfill({ status: 200, body: '' }))
      await prod.addInitScript(() => {
        window.__beacons = []
        const append = Node.prototype.appendChild
        Node.prototype.appendChild = function (el) {
          if (el && el.tagName === 'SCRIPT' && /goatcounter|zgo\.at|cloudflareinsights/.test(el.src || '')) {
            const note = () => window.__beacons.push(location.href)
            el.addEventListener('load', note); el.addEventListener('error', note)
          }
          return append.call(this, el)
        }
      })
      const sent = []
      prod.on('request', (r) => { if (/zgo\.at|goatcounter|cloudflareinsights/.test(r.url())) sent.push(r.url()) })
      await prod.route(/zgo\.at|goatcounter\.com|cloudflareinsights\.com/, (route) => setTimeout(() => route.abort(), 50))
      const page = await prod.newPage()
      await page.goto('https://clientsays.neorgon.com/')
      await page.evaluate(() => sessionStorage.setItem('neo-ws:return-hash', JSON.stringify({ h: '', t: Date.now(), k: 'pick' })))
      const payload = await W.encodePayload(W.normalizeWorkspace({ people: [{ id: 'zed', name: 'Zed Answer' }] }).ws)
      await page.goto('about:blank')
      await page.goto(W.answerLink('https://clientsays.neorgon.com/', { payload, stamp: W.makeStamp() }, { selfHostname: 'neorgon.com' }))
      await page.waitForTimeout(2000)
      const runs = await page.evaluate(() => window.__beacons)
      const cached = await page.evaluate(() => localStorage.getItem('neo-ws:cache') || '')
      check(eng, 'production host: analytics run and the answer is taken', runs.length > 0 && !page.url().includes('neo-ws=') && cached.includes('Zed Answer'), JSON.stringify(runs))
      check(eng, 'production host: no beacon runs or sends while the address carries neo-ws=', runs.every((h) => !h.includes('neo-ws=')) && sent.every((u) => !u.includes('neo-ws=')), JSON.stringify(runs))
      await prod.close()
    }
    check(eng, 'no page errors', errors.length === 0, JSON.stringify(errors.slice(0, 4)))
  } catch (err) {
    check(eng, 'run', false, String(err && err.stack || err))
  } finally {
    await browser.close()
  }
}

const failed = results.filter((r) => !r.ok).length
console.log(`${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
