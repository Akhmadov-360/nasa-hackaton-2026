/**
 * Downloads real NASA DONKI solar flare events into data-raw/donki/.
 *   put NASA_API_KEY=<your key> in the .env file at the repository root (git-ignored), then
 *   pnpm --filter @astro/data fetch:donki
 * (an NASA_API_KEY already set in the shell also works and wins over the file)
 * The shared DEMO_KEY is rate-limited (HTTP 429/503); a free personal key from https://api.nasa.gov works reliably.
 * Afterwards run `pnpm --filter @astro/data build:pack` to write events/donki-flares.json.
 *
 * Flares come from the DONKI /FLR endpoint. When that endpoint is down (it has returned 404 on api.nasa.gov),
 * the same flares are read from DONKI's flare notifications instead.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flaresFromNotifications, type Notification } from './donki';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'data-raw', 'donki');
// load the repository-root .env if it exists; values already in the environment are kept
try {
  process.loadEnvFile(join(here, '..', '..', '..', '.env'));
} catch {
  /* no .env file: fall back to the shell environment or DEMO_KEY */
}
const key = process.env.NASA_API_KEY || 'DEMO_KEY'; // an empty value counts as missing
mkdirSync(root, { recursive: true });

const BASE = 'https://api.nasa.gov/DONKI';
const hint = key === 'DEMO_KEY' ? ' (DEMO_KEY is rate-limited, set NASA_API_KEY in .env)' : '';

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}/${path}${path.includes('?') ? '&' : '?'}api_key=${key}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}${hint}`); // the URL is never printed: it contains the key
  return res.json();
}

async function fetchFlares(): Promise<{ flares: unknown[]; via: string }> {
  try {
    return { flares: (await getJson('FLR?startDate=2024-05-01&endDate=2024-05-31')) as unknown[], via: 'FLR endpoint' };
  } catch (e) {
    console.warn(`FLR endpoint failed (${e instanceof Error ? e.message : e}); reading DONKI flare notifications instead`);
    const msgs = (await getJson('notifications?startDate=2024-05-01&endDate=2024-05-31&type=FLR')) as Notification[];
    return { flares: flaresFromNotifications(msgs), via: 'flare notifications' };
  }
}

async function main(): Promise<void> {
  let failed = 0;

  try {
    const { flares, via } = await fetchFlares();
    if (!flares.length) throw new Error('no flares found');
    writeFileSync(join(root, 'flr-2024-05.json'), JSON.stringify(flares, null, 2));
    console.log(`saved flr-2024-05.json: ${flares.length} flares (via ${via})`);
  } catch (e) {
    failed++;
    console.error(`flares: ${e instanceof Error ? e.message : e}`);
  }

  try {
    const sep = (await getJson('SEP?startDate=2024-05-01&endDate=2024-05-31')) as unknown[];
    writeFileSync(join(root, 'sep-2024-05.json'), JSON.stringify(sep, null, 2));
    console.log(`saved sep-2024-05.json: ${sep.length} solar energetic particle events`);
  } catch (e) {
    console.warn(`SEP events skipped: ${e instanceof Error ? e.message : e}`); // optional data
  }

  if (failed) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
