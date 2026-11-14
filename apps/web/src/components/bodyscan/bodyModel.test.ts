import { describe, expect, it } from 'vitest';
import { ALL_PARTS, BODY_MODEL, bodyParts, widthFactor } from './bodyModel';

describe('body figure by sex', () => {
  it('keeps the male figure as the model and narrows the female shoulders and widens the hips', () => {
    expect(bodyParts('M')).toBe(BODY_MODEL);
    expect(bodyParts(undefined)).toBe(BODY_MODEL);
    expect(widthFactor(false, 110)).toBe(1);
    expect(widthFactor(true, 45)).toBeLessThan(1);
    expect(widthFactor(true, 110)).toBeGreaterThan(1);
  });

  it('builds the same polygons for the female figure, with the same number of points and heights', () => {
    const f = bodyParts('F');
    for (const k of ALL_PARTS) {
      expect(f[k].length).toBe(BODY_MODEL[k].length);
      f[k].forEach((pts, i) => {
        const a = pts.split(' ').map((p) => p.split(',').map(Number));
        const b = BODY_MODEL[k][i].split(' ').map((p) => p.split(',').map(Number));
        expect(a.length).toBe(b.length);
        a.forEach((p, j) => { expect(p[1]).toBe(b[j][1]); expect(Number.isFinite(p[0])).toBe(true); });
      });
    }
  });
});
