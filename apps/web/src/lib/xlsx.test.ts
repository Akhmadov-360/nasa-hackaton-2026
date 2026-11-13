import { describe, expect, it } from 'vitest';
import { buildXlsx, colName, crc32 } from './xlsx';

describe('xlsx writer', () => {
  it('crc32 matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('names columns like a spreadsheet', () => {
    expect([0, 25, 26, 27, 701, 702].map(colName)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
  });

  it('gives a row with long wrapped text an explicit height so it is never cut off', () => {
    const long = 'x'.repeat(150);
    const text = new TextDecoder().decode(buildXlsx([{ name: 'S', rows: [['A', 'B'], ['short', long]], widths: [10, 40] }]));
    // 150 characters in a 40-wide column: 4 lines of 15 points
    expect(text).toContain('<row r="2" ht="60" customHeight="1">');
    expect(text).toContain('<row r="1">');
  });

  it('produces a zip with the workbook parts and escapes XML', () => {
    const bytes = buildXlsx([{ name: 'A/B:C', rows: [['MET', 'Text'], ['001', 'a < b & "c"'], ['002', 5]] }]);
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('xl/workbook.xml');
    expect(text).toContain('xl/worksheets/sheet1.xml');
    expect(text).toContain('a &lt; b &amp; &quot;c&quot;');
    expect(text).toContain('name="A B C"');
    expect(text).toContain('<v>5</v>');
  });
});
