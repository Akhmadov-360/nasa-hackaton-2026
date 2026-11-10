import { parsePackage, type TelemetryPackage } from '@astro/engine';

/** What the reader needs from a file; a real `File` satisfies it. */
export interface FileLike {
  name: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 20 * 1024 * 1024;

export type ReadResult =
  | { ok: true; pkg: TelemetryPackage; name: string; bytes: number }
  | { ok: false; code: 'not-a-package' | 'unsupported-version' | 'invalid' | 'size' | 'gzip' };

const isGzip = (b: Uint8Array) => b.length > 2 && b[0] === 0x1f && b[1] === 0x8b;

async function gunzip(buf: ArrayBuffer): Promise<Uint8Array | 'size' | null> {
  if (typeof DecompressionStream === 'undefined' || typeof Blob === 'undefined' || !('stream' in Blob.prototype)) return null;
  try {
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_UNPACKED_BYTES) {
        await reader.cancel();
        return 'size';
      }
      chunks.push(value);
    }
    const out = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) { out.set(c, at); at += c.byteLength; }
    return out;
  } catch {
    return null;
  }
}

/** Reads, unpacks, parses and validates an untrusted file. Never throws. */
export async function readPackageFile(file: FileLike): Promise<ReadResult> {
  if (file.size > MAX_FILE_BYTES) return { ok: false, code: 'size' };
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { ok: false, code: 'not-a-package' };
  }
  if (isGzip(bytes) || file.name.toLowerCase().endsWith('.gz')) {
    const out = await gunzip(bytes.slice().buffer as ArrayBuffer);
    if (out === 'size') return { ok: false, code: 'size' };
    if (!out) return { ok: false, code: 'gzip' };
    bytes = out;
  }
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, ''));
  } catch {
    return { ok: false, code: 'not-a-package' };
  }
  const r = parsePackage(json);
  return r.ok ? { ok: true, pkg: r.pkg, name: file.name, bytes: file.size } : { ok: false, code: r.code };
}

export const formatBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`);

async function gzipText(text: string): Promise<Blob> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

/** Saves the package as a file. Falls back to plain JSON when the browser cannot compress. */
export async function downloadPackage(pkg: TelemetryPackage, gzip: boolean): Promise<{ name: string; bytes: number }> {
  const text = JSON.stringify(pkg);
  const canGzip = gzip && typeof CompressionStream !== 'undefined';
  const blob = canGzip ? await gzipText(text) : new Blob([text], { type: 'application/json' });
  const name = `astro-telemetry_MET${Math.round(pkg.exportedAtT)}${canGzip ? '.json.gz' : '.json'}`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return { name, bytes: blob.size };
}
