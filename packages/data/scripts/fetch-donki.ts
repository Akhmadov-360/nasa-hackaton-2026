/**
 * Downloads real NASA DONKI solar flare events into data-raw/donki/.
 *   put NASA_API_KEY=<your key> in the .env file at the repository root (git-ignored), then
 *   pnpm --filter @astro/data fetch:donki
 * (an NASA_API_KEY already set in the shell also works and wins over the file)
 * The shared DEMO_KEY is rate-limited (HTTP 429/503); a free personal key from https://api.nasa.gov works reliably.
 * Afterwards run `pnpm --filter @astro/data build:pack` to write events/donki-flares.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const jobs = [
  { file: 'flr-2024-05.json', url: `https://api.nasa.gov/DONKI/FLR?startDate=2024-05-01&endDate=2024-05-31&api_key=${key}` },
  { file: 'sep-2024.json', url: `https://api.nasa.gov/DONKI/SEP?startDate=2024-01-01&endDate=2024-12-31&api_key=${key}` },
];

for (const j of jobs) {
  const res = await fetch(j.url);
  if (!res.ok) throw new Error(`${j.file}: HTTP ${res.status}${key === 'DEMO_KEY' ? ' (DEMO_KEY is rate-limited, set NASA_API_KEY)' : ''}`);
  writeFileSync(join(root, j.file), JSON.stringify(await res.json(), null, 2));
  console.log('saved', j.file);
}
