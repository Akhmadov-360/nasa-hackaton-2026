import { describe, expect, it } from 'vitest';
import { buildPackage, buildReport } from '@astro/engine';
import { baseCfg } from './engineConfig';
import { readPackageFile, type FileLike } from './packageIO';

const file = (name: string, content: string | Uint8Array, size?: number): FileLike => {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  return { name, size: size ?? bytes.byteLength, arrayBuffer: async () => bytes.slice().buffer as ArrayBuffer };
};

const report = buildReport({ ...baseCfg, log: [{ t: 302400, type: 'o2fault', crewId: 'A2' }] }, { fromT: 302300, toT: 302600 });
const good = JSON.stringify(buildPackage(report, { sessionId: 's1', exportedAtT: 302600 }));

describe('readPackageFile', () => {
  it('opens a valid package', async () => {
    const r = await readPackageFile(file('a.json', good));
    expect(r.ok).toBe(true);
  });

  it('explains every way a file can be wrong, without throwing', async () => {
    const cases: Array<[FileLike, string]> = [
      [file('x.json', 'this is not json'), 'not-a-package'],
      [file('x.json', '{"hello":1}'), 'not-a-package'],
      [file('x.json', good.replace('astro-telemetry-package/1', 'astro-telemetry-package/9')), 'unsupported-version'],
      [file('x.json', JSON.stringify({ ...JSON.parse(good), report: { ...JSON.parse(good).report, crew: 'nope' } })), 'invalid'],
      [file('big.json', 'x', 50 * 1024 * 1024), 'size'],
      [file('x.json.gz', new Uint8Array([0x1f, 0x8b, 1, 2, 3])), 'gzip'],
    ];
    for (const [f, code] of cases) {
      const r = await readPackageFile(f);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe(code);
    }
  });
});
