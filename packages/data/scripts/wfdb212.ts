export interface WfdbSignal {
  file: string;
  format: number;
  gain: number;
  baseline: number;
  desc: string;
}
export interface WfdbHeader {
  record: string;
  nsig: number;
  fs: number;
  nsamples: number;
  signals: WfdbSignal[];
}

/** Parses a PhysioNet .hea file (record line + one line per signal). */
export function readHeader(text: string): WfdbHeader {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  const [record, nsig, fs, nsamples] = lines[0].trim().split(/\s+/);
  const signals = lines.slice(1, 1 + Number(nsig)).map((l) => {
    const f = l.trim().split(/\s+/);
    const g = /^([\d.]+)(?:\(([-\d]+)\))?/.exec(f[2]) ?? [];
    return {
      file: f[0],
      format: Number(f[1]),
      gain: Number(g[1] ?? 200),
      baseline: g[2] !== undefined ? Number(g[2]) : Number(f[4] ?? 0),
      desc: f[8] ?? '',
    };
  });
  return { record, nsig: Number(nsig), fs: Number(fs), nsamples: Number(nsamples), signals };
}

const signed12 = (v: number) => (v >= 2048 ? v - 4096 : v);

/** Format 212: two 12-bit samples per 3 bytes. Returns frames of `nsig` samples (nsig must be 2). */
export function decode212(buf: Uint8Array, nsig: number): number[][] {
  if (nsig !== 2) throw new Error('decode212 supports 2-signal records only');
  const frames: number[][] = [];
  for (let i = 0; i + 2 < buf.length; i += 3) {
    const s0 = ((buf[i + 1] & 0x0f) << 8) | buf[i];
    const s1 = ((buf[i + 1] & 0xf0) << 4) | buf[i + 2];
    frames.push([signed12(s0), signed12(s1)]);
  }
  return frames;
}
