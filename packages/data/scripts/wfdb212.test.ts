import { describe, expect, it } from 'vitest';
import { decode212, readHeader } from './wfdb212';

describe('wfdb212', () => {
  it('decodes two 12-bit samples packed in 3 bytes', () => {
    expect(decode212(new Uint8Array([0x12, 0x34, 0x56]), 2)).toEqual([[0x412, 0x356]]);
  });
  it('treats 12-bit values >= 2048 as negative (two\'s complement)', () => {
    // b0=0xFF, b1=0x0F -> s0 = 0xFFF = -1 ; s1 = 0x000 | b2(0x00) = 0
    expect(decode212(new Uint8Array([0xff, 0x0f, 0x00]), 2)).toEqual([[-1, 0]]);
  });
  it('reads fs, gain and baseline from a header', () => {
    const h = readHeader('100 2 360 650000\n100.dat 212 200(1024)/mV 11 1024 995 -22131 0 MLII\n100.dat 212 200 11 1024 1011 20052 0 V5\n');
    expect(h.fs).toBe(360);
    expect(h.signals[0]).toMatchObject({ file: '100.dat', format: 212, gain: 200, baseline: 1024, desc: 'MLII' });
  });
});
