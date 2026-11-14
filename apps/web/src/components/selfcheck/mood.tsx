import { Annoyed, Frown, Laugh, Meh, Smile, type LucideIcon } from 'lucide-react';

/** The five mood ratings as faces, from very poor to very good. Colour grows from red to teal; the face and the word carry the meaning too. */
export const MOOD_FACES: Array<{ value: number; Icon: LucideIcon; color: string }> = [
  { value: 1, Icon: Frown, color: 'var(--color-crimson)' },
  { value: 2, Icon: Annoyed, color: 'var(--color-coral)' },
  { value: 3, Icon: Meh, color: 'var(--color-amber)' },
  { value: 4, Icon: Smile, color: 'var(--color-teal)' },
  { value: 5, Icon: Laugh, color: 'var(--color-teal)' },
];

export const moodFace = (value: number) => MOOD_FACES.find((f) => f.value === Math.round(value)) ?? MOOD_FACES[2];
