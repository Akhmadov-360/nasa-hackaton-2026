#!/usr/bin/env node
/**
 * Golden-path smoke test: the 3-minute pitch in a real browser, with assertions.
 *
 *   pnpm --filter @astro/api start                                  # :3001
 *   NEXT_DIST_DIR=.next-prod pnpm --filter @astro/web build         # production build, next to a running `dev`
 *   NEXT_DIST_DIR=.next-prod pnpm --filter @astro/web exec next start -p 3100
 *   pnpm smoke -- --url http://localhost:3100 --size 1366x768 --shots shots
 *
 * Options: --url (default http://localhost:3000)  --api (default http://localhost:3001)  --size WxH (default 1440x900)
 *          --shots <dir> save a screenshot per step  --browser chrome|msedge  --headed
 * It resets the scenario first and last. Exit code 1 if any step fails.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? (process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? true : process.argv[i + 1]) : fallback;
};
const URL_ = arg('url', 'http://localhost:3000');
const API = arg('api', 'http://localhost:3001');
const [W, H] = String(arg('size', '1440x900')).split('x').map(Number);
const SHOTS = arg('shots', null);
const HEADED = process.argv.includes('--headed');
if (SHOTS && SHOTS !== true) mkdirSync(SHOTS, { recursive: true });

const results = [];
let page;
let shotN = 0;
const shot = async (name) => {
  if (!SHOTS || SHOTS === true) return;
  await page.screenshot({ path: join(SHOTS, `${String(++shotN).padStart(2, '0')}-${name.replace(/\W+/g, '-')}-${W}x${H}.png`) });
};
const step = async (name, fn) => {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`  ok   ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e.message ?? e).split('\n')[0] });
    console.log(`  FAIL ${name}: ${String(e.message ?? e).split('\n').slice(0, 7).map((l) => l.trim()).join(' | ')}`);
  }
  await shot(name).catch(() => {});
};
const api = (path, init) => fetch(`${API}${path}`, init).then((r) => r.ok);

/** Anything that is not a network or favicon complaint is a real console error. */
const IGNORED = /favicon|ERR_INTERNET_DISCONNECTED|ERR_NETWORK|WebSocket|net::|Failed to load resource|Failed to fetch|NetworkError/i;

async function launch() {
  const wanted = arg('browser', null);
  const channels = wanted && wanted !== true ? [wanted] : ['chrome', 'msedge'];
  let last;
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel, headless: !HEADED });
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`no Chrome or Edge found (${String(last?.message).split('\n')[0]})`);
}

const browser = await launch();
const context = await browser.newContext({ viewport: { width: W, height: H }, acceptDownloads: true });
// English UI, first crew member, so the selectors below do not depend on a translation
await context.addInitScript(() => {
  localStorage.setItem('astro-monitor', JSON.stringify({ state: { locale: 'en', selectedCrewId: 'A1' }, version: 1 }));
});
page = await context.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error' && !IGNORED.test(m.text())) consoleErrors.push(m.text().split('\n')[0]); });
page.on('pageerror', (e) => consoleErrors.push(`uncaught: ${String(e.message).split('\n')[0]}`));

console.log(`Smoke test: ${URL_} at ${W}x${H}`);
await api('/reset', { method: 'POST' }).catch(() => {});

await step('page loads and Enter opens Mission Control', async () => {
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Enter Mission Control/i }).click({ timeout: 20000 });
  await page.waitForFunction(() => /MET\s+(?!000:00:00:00)\d+:\d+:\d+:\d+/.test(document.body.innerText), null, { timeout: 20000 });
});

await step('four crew, three telemetry tabs, five hold buttons', async () => {
  const crew = await page.locator('nav button, nav [role=button]').count();
  const tabs = await page.locator('[role=radiogroup] [role=radio]').allInnerTexts();
  const holds = await page.locator('.hb-root').count();
  if (crew < 4) throw new Error(`crew buttons: ${crew}`);
  if (!/Vitals/.test(tabs.join()) || !/Cabin/.test(tabs.join()) || !/Radiation/.test(tabs.join())) throw new Error(`tabs: ${tabs.join('|')}`);
  if (holds !== 5) throw new Error(`hold buttons: ${holds}`);
});

await step('layout: no horizontal overflow, time bar inside the viewport', async () => {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, bar: document.querySelector('section[aria-label="Time travel"]')?.getBoundingClientRect().bottom, ih: innerHeight }));
  if (o.sw > o.iw + 1) throw new Error(`page is ${o.sw}px wide in a ${o.iw}px window`);
  if (o.bar === undefined || o.bar > o.ih + 1) throw new Error(`time travel bar bottom ${o.bar} is below the window (${o.ih})`);
});

await step('a short press does nothing, a 0.8 s hold sends O2 supply fault', async () => {
  const btn = page.locator('.hb-root').nth(2);
  const box = await btn.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const sent = () => page.locator('section[aria-label="Flight log"]').innerText().then((t) => /supply fault started/i.test(t));
  if (await sent()) throw new Error('a short press already sent the command');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.up();
  await page.waitForFunction(() => /supply fault started/i.test(document.querySelector('section[aria-label="Flight log"]')?.innerText ?? ''), null, { timeout: 5000 });
});

await step('the island forecasts the limit before it is crossed', async () => {
  await page.waitForSelector('[role=status] [role=button]', { timeout: 45000 });
});

await step('island list opens and a row jumps to the reading', async () => {
  await page.locator('[role=status] [role=button]').first().click();
  const option = page.locator('[role=option]').first();
  await option.waitFor({ timeout: 5000 });
  await option.click();
  await page.waitForFunction(() => !document.querySelector('[data-radix-popper-content-wrapper] [role=option]'), null, { timeout: 5000 });
});

await step('warning pins the active alarm in the flight log', async () => {
  await page.locator('ul[aria-label="Active alarms"] li').first().waitFor({ timeout: 60000 });
});

await step('self-check: glucose 52 raises a warning with a do-now line', async () => {
  await page.getByRole('radio', { name: /Self-check/ }).click();
  await page.getByRole('button', { name: /Record Glucose/i }).click();
  await page.getByLabel('Glucose', { exact: true }).fill('52');
  await page.getByRole('button', { name: 'Save' }).first().click();
  await page.locator('ul[aria-label="Active alarms"] li', { hasText: /glucose/i }).first().waitFor({ timeout: 15000 });
  const row = await page.locator('ul[aria-label="Active alarms"] li', { hasText: /glucose/i }).first().innerText();
  if (!/Do now/i.test(row)) throw new Error('no do-now line under the glucose alarm');
  // a wrong water entry can be corrected: add 0.5 L, edit it to 0.25 L
  await page.getByRole('button', { name: '+0.5 L' }).click();
  await page.getByRole('button', { name: /^Edit: Water/ }).first().click();
  await page.getByLabel('Other amount, L').fill('0.25');
  await page.getByRole('button', { name: 'Update' }).click();
  await page.waitForFunction(() => { const t = document.querySelector('#sc-entries')?.parentElement?.innerText ?? ''; return /0\.25 L/.test(t) && !/0\.50 L/.test(t); }, null, { timeout: 5000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
});

await step('report lists incidents and the limits table, exports Excel', async () => {
  await page.locator('header button', { hasText: /Report/ }).first().click();
  await page.locator('.report-scroll').waitFor({ timeout: 10000 });
  await page.getByText(/Limits and where they come from/).waitFor({ timeout: 10000 });
  const tables = await page.locator('.report-scroll table').count();
  if (tables < 3) throw new Error(`report tables: ${tables}`);
  await page.getByRole('button', { name: /Export package/ }).click();
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.getByRole('menuitem', { name: /Excel/ }).click()]);
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  const bytes = readFileSync(path);
  if (!download.suggestedFilename().endsWith('.xlsx')) throw new Error(`file name ${download.suggestedFilename()}`);
  if (bytes.length < 2500 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error(`not a zip/xlsx (${bytes.length} bytes)`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
});

await step('time travel: a click replays towards the present, T returns to live', async () => {
  await page.locator('[role=slider]').click({ position: { x: 40, y: 8 } });
  await page.waitForFunction(() => /Replay\s+\d+:\d+:\d+:\d+/.test(document.body.innerText), null, { timeout: 5000 });
  await page.waitForTimeout(1500);
  await page.keyboard.press('t');
  await page.waitForFunction(() => !/Replay\s+\d+:\d+:\d+:\d+/.test(document.body.innerText), null, { timeout: 5000 });
});

await step('NOAA feed unreachable: the Radiation tab says so instead of showing a stale number', async () => {
  const p2 = await context.newPage();
  await p2.route('**/spaceweather', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false }) }));
  await p2.goto(URL_, { waitUntil: 'domcontentloaded' });
  await p2.getByRole('button', { name: /Enter Mission Control/i }).click({ timeout: 20000 });
  await p2.getByRole('radio', { name: /Radiation/ }).click({ timeout: 15000 });
  await p2.getByText(/GOES data is not available/).first().waitFor({ timeout: 15000 });
  await p2.close();
});

await step('no network: SIGNAL LOST banner, the browser engine keeps running', async () => {
  await context.setOffline(true);
  await page.getByText(/SIGNAL LOST/).first().waitFor({ timeout: 20000 });
  const t1 = await page.evaluate(() => document.body.innerText.match(/MET\s+(\S+)/)?.[1]);
  await page.waitForTimeout(2500);
  const t2 = await page.evaluate(() => document.body.innerText.match(/MET\s+(\S+)/)?.[1]);
  if (t1 === t2) throw new Error(`mission clock stopped at ${t1} while offline`);
});

await step('network back: the link returns to live', async () => {
  await context.setOffline(false);
  await page.waitForFunction(() => !/SIGNAL LOST/.test(document.body.innerText), null, { timeout: 30000 });
});

await step('no console errors or uncaught exceptions', async () => {
  if (consoleErrors.length) throw new Error(`${consoleErrors.length}: ${consoleErrors[0]}`);
});

await api('/reset', { method: 'POST' }).catch(() => {});
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
process.exit(failed.length ? 1 : 0);
