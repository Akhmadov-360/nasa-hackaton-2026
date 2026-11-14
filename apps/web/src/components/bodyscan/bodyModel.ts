/**
 * Front-view anatomy model: the polygons of the anterior figure of `react-body-highlighter` (MIT licence,
 * Copyright (c) Giovanni Pozzati and contributors), on a 100 x 200 canvas. Each muscle group is a list of polygons
 * (point lists). BodyScan places this figure on its own canvas and draws the organs (brain, lungs, heart) over it.
 */
export const BODY_W = 100;
export const BODY_H = 200;

export const BODY_MODEL = {
  head: [
    '42.4,2.9 40,11.8 42,19.6 46.1,23.3 49.8,25.3 54.7,22.4 57.6,19.2 59.2,10.2 57.1,2.4 49.8,0',
  ],
  neck: [
    '55.5,23.7 50.6,33.5 50.6,39.2 61.6,40 70.6,44.9 69.4,36.7 63.3,35.1 58.4,30.6',
    '29,44.9 30.2,37.1 36.3,35.1 41.2,30.2 44.5,24.5 49,33.9 48.6,39.2 38,39.6',
  ],
  front_deltoids: [
    '78.4,53.1 79.6,47.8 79.2,41.2 75.9,38 71,36.3 72.2,42.9 71.4,47.3',
    '28.2,47.3 21.2,53.1 20,47.8 20.4,40.8 24.5,37.1 28.6,37.1 26.9,43.3',
  ],
  chest: [
    '51.8,41.6 51,55.1 58,58 67.8,55.5 70.6,47.3 62,41.6',
    '29.8,46.5 31.4,55.5 40.8,58 48.2,55.1 47.8,42 37.6,42',
  ],
  obliques: [
    '68.6,63.3 67.3,57.1 58.8,59.6 60,64.1 60.4,83.3 65.7,78.8 66.5,69.8',
    '33.9,78.4 33.1,71.8 31,63.3 32.2,57.1 40.8,59.2 39.2,63.3 39.2,83.7',
  ],
  abs: [
    '56.3,59.2 58,64.1 58.4,78 58.4,92.7 56.3,98.4 55.1,104.1 51.4,107.8 51,84.5 50.6,67.3 51,57.1',
    '43.7,58.8 48.6,57.1 49,67.3 48.6,84.5 48.2,107.3 44.5,103.7 40.8,91.4 40.8,78.4 41.2,64.5',
  ],
  biceps: [
    '16.7,68.2 18,71.4 22.9,66.1 29,53.9 27.8,49.4 20.4,55.9',
    '71.4,49.4 70.2,54.7 76.3,66.1 81.6,71.8 82.9,69 78.8,55.5',
  ],
  triceps: [
    '69.4,55.5 69.4,61.6 75.9,72.7 77.6,70.2 75.5,67.3',
    '22.4,69.4 29.8,55.5 29.8,60.8 22.9,73.1',
  ],
  forearm: [
    '6.1,88.6 10.2,75.1 14.7,70.2 16.3,74.3 19.2,73.5 4.5,97.6 0,100',
    '84.5,69.8 83.3,73.5 80,73.1 95.1,98.4 100,100.4 93.5,89.4 89.8,76.3',
    '77.6,72.2 77.6,77.6 80.4,84.1 85.3,89.8 92.2,101.2 94.7,99.6',
    '6.9,101.2 13.5,90.6 18.8,84.1 21.6,77.1 21.2,71.8 4.9,98.8',
  ],
  abductors: [
    '52.7,110.2 54.3,124.9 60,110.2 62,100 64.9,94.3 60,92.7 56.7,104.5',
    '47.8,110.6 44.9,125.3 42,115.9 40.4,113.1 39.6,107.3 38,102.4 34.7,93.9 39.6,92.2 41.6,99.2 43.7,105.3',
  ],
  quadriceps: [
    '34.7,98.8 37.1,108.2 37.1,127.8 34.3,137.1 31,132.7 29.4,120 28.2,111.4 29.4,100.8 32.2,94.7',
    '63.3,105.7 64.5,100 66.9,94.7 70.2,101.2 71,111.8 68.2,133.1 65.3,137.6 62.4,128.6 62,111.4',
    '38.8,129.4 38.4,112.2 41.2,118.4 44.5,129.4 42.9,135.1 40,146.1 36.3,146.5 35.5,140',
    '59.6,145.7 55.5,129 60.8,113.9 61.2,130.2 64.1,139.6 62.9,146.5',
    '32.7,138.4 26.5,145.7 25.7,136.7 25.7,127.3 26.9,114.3 29.4,133.5',
    '71.8,113.1 73.9,124.1 73.9,140.4 72.7,145.7 66.5,138.4 70.2,133.5',
  ],
  knees: [
    '33.9,140 34.7,143.3 35.5,147.3 36.3,151 35.1,156.7 29.8,156.7 27.3,152.7 27.3,147.3 30.2,144.1',
    '65.7,140 72.2,147.8 72.2,152.2 69.8,157.1 64.9,156.7 62.9,151',
  ],
  calves: [
    '71.4,160.4 73.5,153.5 76.7,161.2 79.6,167.8 78.4,187.8 79.6,195.5 74.7,195.5',
    '24.9,194.7 27.8,164.9 28.2,160.4 26.1,154.3 24.9,157.6 22.4,161.6 20.8,167.8 22,188.2 20.8,195.5',
    '72.7,195.1 69.8,159.2 65.3,158.4 64.1,162.4 64.1,165.3 65.7,177.1',
    '35.5,158.4 35.9,162.4 35.9,166.9 35.1,172.2 35.1,176.7 32.2,182 30.6,187.3 26.9,194.7 27.3,187.8 28.2,180.4 28.6,175.5 29,169.8 29.8,164.1 30.2,158.8',
  ],
} as const;

export type BodyPart = keyof typeof BODY_MODEL;
/** Parts that light up together when the muscle markers are selected. */
export const MUSCLE_PARTS: BodyPart[] = ['biceps', 'triceps', 'forearm', 'quadriceps', 'calves', 'front_deltoids'];
export const ALL_PARTS = Object.keys(BODY_MODEL) as BodyPart[];

/**
 * The female figure is the same model with a schematic change of proportions: narrower shoulders, a narrower waist and
 * wider hips (the width about the centre line is scaled by a factor that depends on the height). It is a drawing aid,
 * not an anatomical measurement; no limit or reading depends on it.
 */
const FEMALE_WIDTH: Array<[number, number]> = [[0, 0.94], [26, 0.94], [36, 0.88], [55, 0.88], [72, 0.9], [85, 0.92], [100, 1.08], [125, 1.08], [150, 1], [200, 1]];

/** Width factor at figure height `y` (0 to 200); 1 for the male figure. */
export function widthFactor(female: boolean, y: number): number {
  if (!female) return 1;
  const t = FEMALE_WIDTH;
  if (y <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (y <= t[i][0]) {
      const [y0, f0] = t[i - 1];
      const [y1, f1] = t[i];
      return f0 + ((f1 - f0) * (y - y0)) / (y1 - y0);
    }
  }
  return t[t.length - 1][1];
}

const cache: Partial<Record<'F' | 'M', Record<BodyPart, string[]>>> = {};

/** The polygons of the figure for one sex, built once. */
export function bodyParts(sex: 'F' | 'M' | undefined): Record<BodyPart, readonly string[]> {
  if (sex !== 'F') return BODY_MODEL;
  return (cache.F ??= Object.fromEntries(
    ALL_PARTS.map((k) => [
      k,
      BODY_MODEL[k].map((pts) =>
        pts.split(' ').map((pair) => {
          const [x, y] = pair.split(',').map(Number);
          return `${Math.round((50 + (x - 50) * widthFactor(true, y)) * 10) / 10},${y}`;
        }).join(' '),
      ),
    ]),
  ) as Record<BodyPart, string[]>);
}
