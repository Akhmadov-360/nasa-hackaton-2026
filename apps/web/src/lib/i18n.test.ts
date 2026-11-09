import { describe, expect, it } from 'vitest';
import { dictionaries } from './i18n';

describe('i18n', () => {
  it('Russian is complete and no dictionary has keys that English lacks', () => {
    const en = Object.keys(dictionaries.en);
    expect(en.filter((k) => !(k in dictionaries.ru))).toEqual([]);
    for (const l of ['ru', 'uz'] as const) {
      expect(Object.keys(dictionaries[l]).filter((k) => !(k in dictionaries.en))).toEqual([]);
    }
  });
});
