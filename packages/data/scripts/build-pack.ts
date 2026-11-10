/**
 * Builds packs/demo.pack.json and events/donki-flares.json from the raw downloads in data-raw/.
 *   BIDMC numerics  -> per-second HR / SpO2 / respiration variation (real ICU recordings)
 *   MIT-BIH ECG     -> 360 Hz waveform, cut between two R-peaks so the loop is seamless
 *   DONKI FLR       -> real solar flare events (class, begin, peak, end)
 * The reported HR is the measured beat rate of the ECG excerpt plus the real BIDMC variation, so ECG and HR agree.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { decode212, readHeader } from './wfdb212';
import type { ScenarioPack, Track } from '@astro/engine';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = (p: string) => join(root, 'data-raw', p);

const CREW = [
  { id: 'A1', name: 'Lina Voss', role: 'Commander', mit: '100' },
  { id: 'A2', name: 'Arman Tashev', role: 'Flight Engineer', mit: '101' },
  { id: 'A3', name: 'Mei Okafor', role: 'Mission Specialist', mit: '103' },
  { id: 'A4', name: 'Dario Lindqvist', role: 'Medical Officer', mit: '105' },
];
const LOOP_SEC = 60;
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

interface Win { id: string; start: number; hr: number[]; spo2: number[]; resp: number[]; score: number }

/** BIDMC patients are ICU patients, so pick the recordings with the healthiest stable 60 s window. */
function pickBidmcWindows(count: number): Win[] {
  const ids = readdirSync(raw('bidmc'))
    .map((f) => /bidmc_(\d+)_Numerics/.exec(f)?.[1])
    .filter((x): x is string => !!x);
  const found: Win[] = [];
  for (const id of ids) {
    const rows = parse(readFileSync(raw(`bidmc/bidmc_${id}_Numerics.csv`), 'utf8'), {
      columns: (h: string[]) => h.map((x) => x.trim()), skip_empty_lines: true, cast: true,
    }) as Array<Record<string, number>>;
    for (let i = 0; i + LOOP_SEC <= rows.length; i += 5) {
      const w = rows.slice(i, i + LOOP_SEC);
      const healthy = w.every((r) => r.SpO2 >= 96 && r.HR >= 55 && r.HR <= 95 && r.RESP >= 12 && r.RESP <= 19);
      if (!healthy) continue;
      const mean = (k: string) => w.reduce((a, r) => a + r[k], 0) / w.length;
      const sd = (k: string) => Math.sqrt(w.reduce((a, r) => a + (r[k] - mean(k)) ** 2, 0) / w.length);
      // a little real variability is good (not a flat line), SpO2 noise is not
      found.push({
        id, start: i, hr: w.map((r) => r.HR), spo2: w.map((r) => r.SpO2), resp: w.map((r) => r.RESP),
        score: Math.abs(sd('HR') - 2) + sd('SpO2'),
      });
      break;
    }
  }
  if (found.length < count) throw new Error(`only ${found.length} healthy BIDMC windows found, need ${count}`);
  return found.sort((a, b) => a.score - b.score).slice(0, count);
}

function detectPeaks(sig: number[], fs: number): number[] {
  // robust to spikes: threshold from the 99.5th percentile instead of the absolute maximum
  const sorted = [...sig].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const p995 = sorted[Math.floor(sorted.length * 0.995)];
  const thr = median + 0.55 * (p995 - median);
  const refractory = Math.floor(0.25 * fs);
  const peaks: number[] = [];
  for (let i = 1; i < sig.length - 1; i++) {
    if (sig[i] > thr && sig[i] >= sig[i - 1] && sig[i] > sig[i + 1]) {
      if (!peaks.length || i - peaks[peaks.length - 1] > refractory) peaks.push(i);
    }
  }
  return peaks;
}

function mitEcg(rec: string) {
  const hdr = readHeader(readFileSync(raw(`mitdb/${rec}.hea`), 'utf8'));
  const frames = decode212(new Uint8Array(readFileSync(raw(`mitdb/${rec}.dat`))), hdr.nsig);
  const s = hdr.signals[0];
  const from = Math.floor(30 * hdr.fs); // skip the record start
  const seg = frames.slice(from, from + Math.floor((LOOP_SEC + 5) * hdr.fs)).map((f) => (f[0] - s.baseline) / s.gain);
  const peaks = detectPeaks(seg, hdr.fs);
  if (peaks.length < 20) throw new Error(`record ${rec}: too few R-peaks (${peaks.length})`);
  const first = peaks[0];
  const last = peaks.filter((p) => p - first <= LOOP_SEC * hdr.fs).pop()!;
  const beats = peaks.filter((p) => p >= first && p <= last).length - 1;
  const seconds = (last - first) / hdr.fs;
  return { fs: hdr.fs, ecg: seg.slice(first, last).map((v) => round(v, 3)), bpm: (beats / seconds) * 60 };
}

const windows = pickBidmcWindows(CREW.length);
const baselines: Record<string, Track> = {};
for (const [ci, c] of CREW.entries()) {
  const v = windows[ci];
  const e = mitEcg(c.mit);
  const meanHr = v.hr.reduce((a, b) => a + b, 0) / v.hr.length;
  baselines[c.id] = {
    ecgHz: e.fs,
    vitalsHz: 1,
    ecg: e.ecg,
    // real BIDMC variation re-centred on the ECG's measured rate
    hr: v.hr.map((h) => round(e.bpm + (h - meanHr), 1)),
    spo2: v.spo2,
    resp: v.resp,
  };
  console.log(c.id, `ECG ${c.mit}: ${e.bpm.toFixed(1)} bpm, ${(e.ecg.length / e.fs).toFixed(1)} s loop; BIDMC ${v.id} window @${v.start}s`);
}

const donkiLoaded = existsSync(raw('donki/flr-2024-05.json'));
const pack: ScenarioPack = {
  meta: {
    id: 'demo',
    title: donkiLoaded ? 'Demo crew: PhysioNet baselines + NASA DONKI flares' : 'Demo crew: PhysioNet baselines',
    sources: [
      'PhysioNet BIDMC PPG and Respiration Dataset (HR, SpO2, respiration) — https://physionet.org/content/bidmc/1.0.0/',
      'PhysioNet MIT-BIH Arrhythmia Database (ECG waveform) — https://physionet.org/content/mitdb/1.0.0/',
      ...(donkiLoaded ? ['NASA DONKI solar flare catalogue — https://kauai.ccmc.gsfc.nasa.gov/DONKI/'] : []),
    ],
    licenses: ['PhysioNet datasets: Open Data Commons Attribution License v1.0 (verify on each dataset page)', ...(donkiLoaded ? ['NASA DONKI: public domain, NASA Open APIs'] : [])],
    provisional: true,
  },
  crew: CREW.map(({ id, name, role }) => ({ id, name, role })),
  baselines,
  events: [],
};
mkdirSync(join(root, 'packs'), { recursive: true });
writeFileSync(join(root, 'packs', 'demo.pack.json'), JSON.stringify(pack));

// ---- DONKI flares ----
interface Flr { flrID: string; classType: string; beginTime: string; peakTime: string; endTime: string | null; sourceLocation?: string; linkedEvents?: unknown; link: string }
if (!existsSync(raw('donki/flr-2024-05.json'))) {
  console.warn('DONKI flares not downloaded yet (api.nasa.gov DEMO_KEY is rate-limited): skipping events/donki-flares.json');
  process.exit(0);
}
const flr = JSON.parse(readFileSync(raw('donki/flr-2024-05.json'), 'utf8')) as Flr[];
const weight = (c: string) => ({ X: 3, M: 2, C: 1 }[c[0] as 'X' | 'M' | 'C'] ?? 0) * 1000 + parseFloat(c.slice(1));
const events = flr
  .filter((f) => /^[XM]/.test(f.classType))
  .sort((a, b) => weight(b.classType) - weight(a.classType))
  .slice(0, 12)
  .map((f) => ({
    id: f.flrID, classType: f.classType, beginTime: f.beginTime, peakTime: f.peakTime, endTime: f.endTime,
    sourceLocation: f.sourceLocation ?? null, link: f.link,
  }));
mkdirSync(join(root, 'events'), { recursive: true });
writeFileSync(join(root, 'events', 'donki-flares.json'), JSON.stringify(events, null, 2));
console.log(`pack written; ${events.length} DONKI flares (top: ${events[0]?.classType} ${events[0]?.peakTime})`);
