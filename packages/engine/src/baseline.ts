import type { Track } from './schemas';

const mod = (n: number, m: number) => ((n % m) + m) % m;

function lerpAt(arr: number[], pos: number): number {
  const n = arr.length;
  const i = Math.floor(pos);
  const f = pos - i;
  return arr[mod(i, n)] * (1 - f) + arr[mod(i + 1, n)] * f;
}

export function trackMeanHr(track: Track): number {
  return track.hr.reduce((a, b) => a + b, 0) / Math.max(1, track.hr.length);
}

/** Looping, linearly interpolated per-second vitals. */
export function sampleVitals(track: Track, t: number): { hr: number; spo2: number; resp: number } {
  const pos = t * track.vitalsHz;
  return { hr: lerpAt(track.hr, pos), spo2: lerpAt(track.spo2, pos), resp: lerpAt(track.resp, pos) };
}

/** About 0.1 s of ECG starting at warped time `tw`; `speed` above 1 plays the waveform faster. */
export function sampleEcg(track: Track, tw: number, speed: number): number[] {
  const n = Math.round(track.ecgHz / 10);
  const start = tw * track.ecgHz;
  const out: number[] = new Array(n);
  for (let k = 0; k < n; k++) out[k] = track.ecg[mod(Math.floor(start + k * speed), track.ecg.length)];
  return out;
}
